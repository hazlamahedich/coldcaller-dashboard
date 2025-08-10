/**
 * Integration Service
 * Core integration management and OAuth flow handling
 */

const { IntegrationSettings, CalendarEvent, EmailSync } = require('../database/models');
const { encrypt, decrypt, generateToken } = require('../utils/encryption');
const axios = require('axios');

class IntegrationService {
  constructor() {
    this.providers = {
      google_calendar: {
        name: 'Google Calendar',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/calendar.readonly']
      },
      microsoft_calendar: {
        name: 'Microsoft Calendar',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scopes: ['https://graph.microsoft.com/calendars.read']
      },
      gmail: {
        name: 'Gmail',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly']
      },
      outlook_email: {
        name: 'Outlook Email',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scopes: ['https://graph.microsoft.com/mail.read']
      }
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  async generateAuthUrl(provider, userId, redirectUri) {
    if (!this.providers[provider]) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const state = this.generateStateToken(provider, userId);
    const providerConfig = this.providers[provider];
    
    const params = new URLSearchParams({
      client_id: this.getClientId(provider),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: providerConfig.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${providerConfig.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(provider, code, redirectUri, state) {
    const { provider: stateProvider, userId } = this.verifyStateToken(state);
    
    if (stateProvider !== provider) {
      throw new Error('State token provider mismatch');
    }

    const providerConfig = this.providers[provider];
    const tokenData = {
      client_id: this.getClientId(provider),
      client_secret: this.getClientSecret(provider),
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    };

    try {
      const response = await axios.post(providerConfig.tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const tokens = response.data;
      
      // Save integration settings
      const integration = await this.saveIntegration(
        userId,
        provider,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in
      );

      return {
        integration,
        tokens
      };
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      throw new Error(`Failed to exchange code for tokens: ${error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(integrationId) {
    const integration = await IntegrationSettings.findByPk(integrationId);
    if (!integration || !integration.refreshToken) {
      throw new Error('Integration not found or no refresh token available');
    }

    const provider = integration.provider;
    const providerConfig = this.providers[provider];

    const refreshData = {
      client_id: this.getClientId(provider),
      client_secret: this.getClientSecret(provider),
      refresh_token: integration.refreshToken,
      grant_type: 'refresh_token'
    };

    try {
      const response = await axios.post(providerConfig.tokenUrl, refreshData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const tokens = response.data;
      
      await integration.updateTokens(
        tokens.access_token,
        tokens.refresh_token || integration.refreshToken, // Keep existing if not provided
        tokens.expires_in
      );

      return integration;
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      integration.status = 'error';
      integration.lastSyncError = `Token refresh failed: ${error.message}`;
      await integration.save();
      
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Get user integrations
   */
  async getUserIntegrations(userId, provider = null) {
    const where = { userId };
    if (provider) where.provider = provider;

    return await IntegrationSettings.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Disconnect integration
   */
  async disconnectIntegration(userId, integrationId) {
    const integration = await IntegrationSettings.findOne({
      where: { id: integrationId, userId }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Revoke tokens if possible
    try {
      await this.revokeTokens(integration);
    } catch (error) {
      console.warn('Failed to revoke tokens:', error.message);
    }

    // Update status instead of deleting to preserve history
    integration.status = 'disconnected';
    integration.accessToken = null;
    integration.refreshToken = null;
    integration.isActive = false;
    await integration.save();

    return integration;
  }

  /**
   * Test integration connection
   */
  async testConnection(integrationId) {
    const integration = await IntegrationSettings.findByPk(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    try {
      // Refresh token if needed
      if (integration.needsRefresh()) {
        await this.refreshToken(integrationId);
        await integration.reload();
      }

      // Test API call based on provider
      await this.makeTestApiCall(integration);

      integration.status = 'connected';
      integration.lastSyncError = null;
      await integration.save();

      return { status: 'connected', message: 'Connection successful' };
    } catch (error) {
      integration.status = 'error';
      integration.lastSyncError = error.message;
      await integration.save();

      return { status: 'error', message: error.message };
    }
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStats(userId) {
    const integrations = await IntegrationSettings.findAll({
      where: { userId },
      attributes: ['provider', 'status']
    });

    const stats = {
      total: integrations.length,
      connected: integrations.filter(i => i.status === 'connected').length,
      disconnected: integrations.filter(i => i.status === 'disconnected').length,
      error: integrations.filter(i => i.status === 'error').length,
      expired: integrations.filter(i => i.status === 'expired').length,
      byProvider: {}
    };

    // Group by provider
    integrations.forEach(integration => {
      if (!stats.byProvider[integration.provider]) {
        stats.byProvider[integration.provider] = {
          total: 0,
          connected: 0,
          error: 0
        };
      }
      stats.byProvider[integration.provider].total++;
      if (integration.status === 'connected') {
        stats.byProvider[integration.provider].connected++;
      } else if (integration.status === 'error') {
        stats.byProvider[integration.provider].error++;
      }
    });

    return stats;
  }

  // Private methods

  generateStateToken(provider, userId) {
    const payload = JSON.stringify({ provider, userId, timestamp: Date.now() });
    return Buffer.from(payload).toString('base64url');
  }

  verifyStateToken(state) {
    try {
      const payload = Buffer.from(state, 'base64url').toString();
      const data = JSON.parse(payload);
      
      // Verify timestamp (valid for 1 hour)
      if (Date.now() - data.timestamp > 3600000) {
        throw new Error('State token expired');
      }

      return data;
    } catch (error) {
      throw new Error('Invalid state token');
    }
  }

  async saveIntegration(userId, provider, accessToken, refreshToken, expiresIn) {
    const expiresAt = expiresIn ? new Date(Date.now() + (expiresIn * 1000)) : null;

    const [integration, created] = await IntegrationSettings.upsert({
      userId,
      provider,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresAt,
      status: 'connected',
      isActive: true,
      lastSyncAt: new Date()
    }, {
      returning: true
    });

    return Array.isArray(integration) ? integration[0] : integration;
  }

  getClientId(provider) {
    const envKey = `${provider.toUpperCase()}_CLIENT_ID`;
    return process.env[envKey];
  }

  getClientSecret(provider) {
    const envKey = `${provider.toUpperCase()}_CLIENT_SECRET`;
    return process.env[envKey];
  }

  async revokeTokens(integration) {
    // Implementation depends on provider
    const provider = integration.provider;
    
    if (provider.includes('google')) {
      await axios.post(`https://oauth2.googleapis.com/revoke?token=${integration.accessToken}`);
    } else if (provider.includes('microsoft') || provider.includes('outlook')) {
      // Microsoft Graph doesn't have a revoke endpoint, tokens expire naturally
    }
  }

  async makeTestApiCall(integration) {
    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Accept': 'application/json'
    };

    let testUrl;
    switch (integration.provider) {
      case 'google_calendar':
        testUrl = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
        break;
      case 'gmail':
        testUrl = 'https://www.googleapis.com/gmail/v1/users/me/profile';
        break;
      case 'microsoft_calendar':
        testUrl = 'https://graph.microsoft.com/v1.0/me/calendars';
        break;
      case 'outlook_email':
        testUrl = 'https://graph.microsoft.com/v1.0/me/mailFolders';
        break;
      default:
        throw new Error('Unknown provider for test API call');
    }

    const response = await axios.get(testUrl, { headers });
    return response.data;
  }
}

module.exports = new IntegrationService();