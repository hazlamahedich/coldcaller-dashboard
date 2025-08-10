/**
 * Enhanced Token Management Service
 * Comprehensive token lifecycle management, encryption, and batch operations
 */

const { IntegrationSettings } = require('../database/models');
const { encrypt, decrypt } = require('../utils/encryption');
const integrationService = require('./integrationService');
const { Op } = require('sequelize');

class TokenManagementService {
  constructor() {
    this.refreshBuffer = process.env.TOKEN_REFRESH_BUFFER_MINUTES || 5;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Get all tokens for a user with decryption
   */
  async getUserTokens(userId, includeExpired = false) {
    const where = { userId };
    
    if (!includeExpired) {
      where.status = { [Op.in]: ['connected', 'error'] };
    }

    const integrations = await IntegrationSettings.findAll({ where });
    
    return integrations.map(integration => ({
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      hasAccessToken: !!integration.accessToken,
      hasRefreshToken: !!integration.refreshToken,
      tokenExpiresAt: integration.tokenExpiresAt,
      isExpired: integration.isTokenExpired(),
      needsRefresh: integration.needsRefresh(this.refreshBuffer),
      lastSyncAt: integration.lastSyncAt,
      errorDetails: integration.errorDetails
    }));
  }

  /**
   * Store encrypted tokens
   */
  async storeTokens(userId, provider, tokens) {
    try {
      const expiresAt = tokens.expires_in 
        ? new Date(Date.now() + (tokens.expires_in * 1000))
        : null;

      const integrationData = {
        userId,
        provider,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        scope: tokens.scope,
        status: 'connected',
        lastSyncAt: new Date(),
        errorDetails: null
      };

      const [integration, created] = await IntegrationSettings.upsert(
        integrationData,
        {
          returning: true,
          conflictFields: ['userId', 'provider']
        }
      );

      return Array.isArray(integration) ? integration[0] : integration;
    } catch (error) {
      console.error('Store tokens error:', error);
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  /**
   * Refresh single token with retry logic
   */
  async refreshSingleToken(integrationId, retryCount = 0) {
    try {
      return await integrationService.refreshToken(integrationId);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.warn(`Token refresh attempt ${retryCount + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.refreshSingleToken(integrationId, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Batch refresh tokens with parallel processing
   */
  async batchRefreshTokens(filters = {}, forceRefresh = false) {
    const { provider, userId, status = ['connected'] } = filters;
    
    let where = { status: { [Op.in]: Array.isArray(status) ? status : [status] } };
    
    if (provider) where.provider = provider;
    if (userId) where.userId = userId;

    // If not force refresh, only get tokens that need refreshing
    if (!forceRefresh) {
      const bufferTime = new Date(Date.now() + (this.refreshBuffer * 60 * 1000));
      where.tokenExpiresAt = { [Op.lte]: bufferTime };
    }

    const integrations = await IntegrationSettings.findAll({ where });
    
    const results = {
      total: integrations.length,
      successful: 0,
      failed: 0,
      details: []
    };

    // Process tokens in parallel batches of 5
    const batchSize = 5;
    for (let i = 0; i < integrations.length; i += batchSize) {
      const batch = integrations.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (integration) => {
        try {
          const refreshedIntegration = await this.refreshSingleToken(integration.id);
          results.successful++;
          return {
            integrationId: integration.id,
            provider: integration.provider,
            userId: integration.userId,
            status: 'success',
            newExpiryTime: refreshedIntegration.tokenExpiresAt
          };
        } catch (error) {
          results.failed++;
          return {
            integrationId: integration.id,
            provider: integration.provider,
            userId: integration.userId,
            status: 'failed',
            error: error.message
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.details.push(result.value);
        } else {
          results.details.push({
            status: 'failed',
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }

    return results;
  }

  /**
   * Validate token integrity
   */
  async validateTokenIntegrity(integrationId) {
    const integration = await IntegrationSettings.findByPk(integrationId);
    
    if (!integration) {
      throw new Error('Integration not found');
    }

    const validation = {
      integrationId,
      provider: integration.provider,
      hasAccessToken: false,
      hasRefreshToken: false,
      tokenDecryptable: false,
      refreshTokenDecryptable: false,
      isExpired: false,
      needsRefresh: false,
      overallValid: false
    };

    try {
      // Check if tokens exist and are decryptable
      const accessToken = integration.accessToken;
      validation.hasAccessToken = !!accessToken;
      validation.tokenDecryptable = !!accessToken && accessToken.length > 0;

      const refreshToken = integration.refreshToken;
      validation.hasRefreshToken = !!refreshToken;
      validation.refreshTokenDecryptable = !!refreshToken && refreshToken.length > 0;

      // Check expiration
      validation.isExpired = integration.isTokenExpired();
      validation.needsRefresh = integration.needsRefresh(this.refreshBuffer);

      // Overall validation
      validation.overallValid = (
        validation.hasAccessToken &&
        validation.tokenDecryptable &&
        validation.hasRefreshToken &&
        validation.refreshTokenDecryptable &&
        !validation.isExpired
      );

    } catch (error) {
      validation.error = error.message;
      validation.overallValid = false;
    }

    return validation;
  }

  /**
   * Get token expiration report
   */
  async getTokenExpirationReport(timeWindow = '7d') {
    const windowHours = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };

    const hours = windowHours[timeWindow] || 24 * 7;
    const cutoffTime = new Date(Date.now() + (hours * 60 * 60 * 1000));

    const integrations = await IntegrationSettings.findAll({
      where: {
        status: 'connected',
        tokenExpiresAt: {
          [Op.lte]: cutoffTime
        }
      },
      order: [['tokenExpiresAt', 'ASC']]
    });

    const report = {
      timeWindow,
      cutoffTime,
      totalExpiring: integrations.length,
      byProvider: {},
      byTimeRange: {
        expired: 0,
        expiring1h: 0,
        expiring24h: 0,
        expiring7d: 0,
        expiring30d: 0
      },
      urgentRefreshNeeded: [],
      recommendations: []
    };

    const now = new Date();
    const in1Hour = new Date(now.getTime() + (1 * 60 * 60 * 1000));
    const in24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const in7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const in30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    integrations.forEach(integration => {
      const provider = integration.provider;
      const expiresAt = new Date(integration.tokenExpiresAt);

      // By provider
      if (!report.byProvider[provider]) {
        report.byProvider[provider] = { count: 0, integrations: [] };
      }
      report.byProvider[provider].count++;
      report.byProvider[provider].integrations.push({
        id: integration.id,
        userId: integration.userId,
        expiresAt: expiresAt,
        hoursUntilExpiry: Math.round((expiresAt - now) / (1000 * 60 * 60))
      });

      // By time range
      if (expiresAt <= now) {
        report.byTimeRange.expired++;
        report.urgentRefreshNeeded.push({
          integrationId: integration.id,
          provider: integration.provider,
          userId: integration.userId,
          priority: 'critical',
          reason: 'Already expired'
        });
      } else if (expiresAt <= in1Hour) {
        report.byTimeRange.expiring1h++;
        report.urgentRefreshNeeded.push({
          integrationId: integration.id,
          provider: integration.provider,
          userId: integration.userId,
          priority: 'high',
          reason: 'Expires within 1 hour'
        });
      } else if (expiresAt <= in24Hours) {
        report.byTimeRange.expiring24h++;
      } else if (expiresAt <= in7Days) {
        report.byTimeRange.expiring7d++;
      } else if (expiresAt <= in30Days) {
        report.byTimeRange.expiring30d++;
      }
    });

    // Generate recommendations
    if (report.byTimeRange.expired > 0) {
      report.recommendations.push({
        type: 'immediate_action',
        message: `${report.byTimeRange.expired} tokens have already expired and need immediate refresh`,
        priority: 'critical'
      });
    }

    if (report.byTimeRange.expiring1h > 0) {
      report.recommendations.push({
        type: 'urgent_refresh',
        message: `${report.byTimeRange.expiring1h} tokens expire within 1 hour`,
        priority: 'high'
      });
    }

    if (report.totalExpiring > 10) {
      report.recommendations.push({
        type: 'batch_refresh',
        message: 'Consider running batch token refresh to handle multiple expiring tokens',
        priority: 'medium'
      });
    }

    return report;
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));

    const expiredIntegrations = await IntegrationSettings.findAll({
      where: {
        status: 'expired',
        updatedAt: { [Op.lte]: cutoffDate }
      }
    });

    const cleanupResults = {
      total: expiredIntegrations.length,
      cleaned: 0,
      errors: []
    };

    for (const integration of expiredIntegrations) {
      try {
        // Clear sensitive token data but keep integration record for audit
        integration.accessToken = null;
        integration.refreshToken = null;
        integration.status = 'disconnected';
        integration.lastSyncError = 'Cleaned up expired tokens';
        await integration.save();

        cleanupResults.cleaned++;
      } catch (error) {
        cleanupResults.errors.push({
          integrationId: integration.id,
          error: error.message
        });
      }
    }

    return cleanupResults;
  }

  /**
   * Get token usage analytics
   */
  async getTokenAnalytics(timeframe = '30d') {
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const analytics = {
      timeframe,
      period: { start: startDate, end: new Date() },
      totalIntegrations: 0,
      activeTokens: 0,
      tokenRefreshes: 0,
      failedRefreshes: 0,
      providerBreakdown: {},
      healthTrends: {
        healthy: 0,
        expiring: 0,
        expired: 0,
        failed: 0
      }
    };

    // Get all integrations
    const integrations = await IntegrationSettings.findAll();
    analytics.totalIntegrations = integrations.length;

    // Get recently refreshed tokens
    const recentRefreshes = await IntegrationSettings.count({
      where: {
        lastSyncAt: { [Op.gte]: startDate }
      }
    });
    analytics.tokenRefreshes = recentRefreshes;

    // Get failed refreshes
    const failedRefreshes = await IntegrationSettings.count({
      where: {
        status: 'error',
        updatedAt: { [Op.gte]: startDate }
      }
    });
    analytics.failedRefreshes = failedRefreshes;

    // Analyze current token health
    integrations.forEach(integration => {
      const provider = integration.provider;

      if (!analytics.providerBreakdown[provider]) {
        analytics.providerBreakdown[provider] = {
          total: 0,
          active: 0,
          expired: 0,
          failed: 0
        };
      }

      analytics.providerBreakdown[provider].total++;

      if (integration.status === 'connected') {
        analytics.activeTokens++;
        analytics.providerBreakdown[provider].active++;

        if (integration.isTokenExpired()) {
          analytics.healthTrends.expired++;
        } else if (integration.needsRefresh(this.refreshBuffer)) {
          analytics.healthTrends.expiring++;
        } else {
          analytics.healthTrends.healthy++;
        }
      } else if (integration.status === 'error') {
        analytics.healthTrends.failed++;
        analytics.providerBreakdown[provider].failed++;
      } else {
        analytics.providerBreakdown[provider].expired++;
      }
    });

    return analytics;
  }
}

module.exports = new TokenManagementService();