/**
 * Webhook Service
 * Manages webhook subscriptions and real-time sync notifications
 */

const axios = require('axios');
const { IntegrationSettings } = require('../database/models');
const { generateToken } = require('../utils/encryption');

class WebhookService {
  constructor() {
    this.baseWebhookUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    this.webhookPaths = {
      google_calendar: '/api/webhooks/google/calendar',
      microsoft_calendar: '/api/webhooks/microsoft/graph',
      gmail: '/api/webhooks/google/gmail',
      outlook_email: '/api/webhooks/microsoft/outlook'
    };
  }

  /**
   * Setup webhook subscription for an integration
   */
  async setupWebhook(integration) {
    try {
      const provider = integration.provider;
      const webhookUrl = `${this.baseWebhookUrl}${this.webhookPaths[provider]}`;

      let subscriptionResult;
      
      switch (provider) {
        case 'google_calendar':
          subscriptionResult = await this.setupGoogleCalendarWebhook(integration, webhookUrl);
          break;
        case 'microsoft_calendar':
          subscriptionResult = await this.setupMicrosoftCalendarWebhook(integration, webhookUrl);
          break;
        case 'gmail':
          subscriptionResult = await this.setupGmailWebhook(integration, webhookUrl);
          break;
        case 'outlook_email':
          subscriptionResult = await this.setupOutlookWebhook(integration, webhookUrl);
          break;
        default:
          throw new Error(`Webhook not supported for provider: ${provider}`);
      }

      // Update integration with webhook details
      await integration.update({
        webhookUrl: webhookUrl,
        webhookSecret: subscriptionResult.secret,
        syncSettings: {
          ...integration.syncSettings,
          ...subscriptionResult.settings
        }
      });

      return subscriptionResult;
    } catch (error) {
      console.error(`Webhook setup failed for ${integration.provider}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove webhook subscription for an integration
   */
  async removeWebhook(integration) {
    try {
      const provider = integration.provider;

      switch (provider) {
        case 'google_calendar':
          await this.removeGoogleCalendarWebhook(integration);
          break;
        case 'microsoft_calendar':
        case 'outlook_email':
          await this.removeMicrosoftWebhook(integration);
          break;
        case 'gmail':
          await this.removeGmailWebhook(integration);
          break;
      }

      // Clear webhook details from integration
      await integration.update({
        webhookUrl: null,
        webhookSecret: null,
        syncSettings: {
          ...integration.syncSettings,
          subscriptionId: null,
          webhookChannelId: null,
          resourceId: null
        }
      });

      return true;
    } catch (error) {
      console.error(`Webhook removal failed for ${integration.provider}:`, error.message);
      throw error;
    }
  }

  /**
   * Refresh webhook subscription before it expires
   */
  async refreshWebhook(integration) {
    try {
      const provider = integration.provider;

      switch (provider) {
        case 'google_calendar':
          // Google Calendar webhooks don't support refresh, need to recreate
          await this.removeGoogleCalendarWebhook(integration);
          return await this.setupGoogleCalendarWebhook(integration, integration.webhookUrl);
        case 'microsoft_calendar':
        case 'outlook_email':
          return await this.refreshMicrosoftWebhook(integration);
        case 'gmail':
          // Gmail webhooks don't expire, no refresh needed
          return { success: true };
      }
    } catch (error) {
      console.error(`Webhook refresh failed for ${integration.provider}:`, error.message);
      throw error;
    }
  }

  /**
   * Setup Google Calendar push notification
   */
  async setupGoogleCalendarWebhook(integration, webhookUrl) {
    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json'
    };

    const channelId = generateToken(16);
    const channelToken = generateToken(32);

    const payload = {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: channelToken,
      expiration: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    const response = await axios.post(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch',
      payload,
      { headers }
    );

    return {
      success: true,
      secret: channelToken,
      settings: {
        webhookChannelId: channelId,
        resourceId: response.data.resourceId,
        expiration: payload.expiration
      }
    };
  }

  /**
   * Setup Microsoft Calendar/Outlook webhook subscription
   */
  async setupMicrosoftCalendarWebhook(integration, webhookUrl) {
    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json'
    };

    const clientState = generateToken(32);
    const notificationUrl = webhookUrl;

    let resource;
    if (integration.provider === 'microsoft_calendar') {
      resource = '/me/events';
    } else {
      resource = '/me/mailFolders/inbox/messages';
    }

    const payload = {
      changeType: 'created,updated,deleted',
      notificationUrl,
      resource,
      expirationDateTime: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString(), // 3 days
      clientState
    };

    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/subscriptions',
      payload,
      { headers }
    );

    return {
      success: true,
      secret: clientState,
      settings: {
        subscriptionId: response.data.id,
        expiration: response.data.expirationDateTime
      }
    };
  }

  /**
   * Setup Gmail push notification via Cloud Pub/Sub
   */
  async setupGmailWebhook(integration, webhookUrl) {
    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json'
    };

    // Note: This requires Google Cloud Pub/Sub topic setup
    const topicName = process.env.GMAIL_PUBSUB_TOPIC || 'projects/your-project/topics/gmail-notifications';

    const payload = {
      labelIds: ['INBOX', 'SENT'],
      topicName
    };

    const response = await axios.post(
      'https://www.googleapis.com/gmail/v1/users/me/watch',
      payload,
      { headers }
    );

    return {
      success: true,
      secret: generateToken(32),
      settings: {
        historyId: response.data.historyId,
        expiration: response.data.expiration
      }
    };
  }

  /**
   * Setup Outlook email webhook
   */
  async setupOutlookWebhook(integration, webhookUrl) {
    // Same as Microsoft Calendar but for email resource
    return await this.setupMicrosoftCalendarWebhook(integration, webhookUrl);
  }

  /**
   * Remove Google Calendar webhook
   */
  async removeGoogleCalendarWebhook(integration) {
    if (!integration.syncSettings?.webhookChannelId) {
      return true; // Nothing to remove
    }

    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json'
    };

    const payload = {
      id: integration.syncSettings.webhookChannelId,
      resourceId: integration.syncSettings.resourceId
    };

    try {
      await axios.post(
        'https://www.googleapis.com/calendar/v3/channels/stop',
        payload,
        { headers }
      );
    } catch (error) {
      // Ignore errors if channel is already stopped or expired
      console.warn('Failed to stop Google Calendar channel:', error.message);
    }

    return true;
  }

  /**
   * Remove Microsoft webhook subscription
   */
  async removeMicrosoftWebhook(integration) {
    if (!integration.syncSettings?.subscriptionId) {
      return true; // Nothing to remove
    }

    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`
    };

    try {
      await axios.delete(
        `https://graph.microsoft.com/v1.0/subscriptions/${integration.syncSettings.subscriptionId}`,
        { headers }
      );
    } catch (error) {
      // Ignore errors if subscription is already deleted or expired
      console.warn('Failed to delete Microsoft subscription:', error.message);
    }

    return true;
  }

  /**
   * Remove Gmail webhook
   */
  async removeGmailWebhook(integration) {
    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`
    };

    try {
      await axios.post(
        'https://www.googleapis.com/gmail/v1/users/me/stop',
        {},
        { headers }
      );
    } catch (error) {
      // Ignore errors if watch is already stopped
      console.warn('Failed to stop Gmail watch:', error.message);
    }

    return true;
  }

  /**
   * Refresh Microsoft webhook subscription
   */
  async refreshMicrosoftWebhook(integration) {
    if (!integration.syncSettings?.subscriptionId) {
      throw new Error('No subscription ID found for refresh');
    }

    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json'
    };

    const payload = {
      expirationDateTime: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString() // 3 days
    };

    try {
      const response = await axios.patch(
        `https://graph.microsoft.com/v1.0/subscriptions/${integration.syncSettings.subscriptionId}`,
        payload,
        { headers }
      );

      return {
        success: true,
        settings: {
          expiration: response.data.expirationDateTime
        }
      };
    } catch (error) {
      // If refresh fails, try to recreate the subscription
      console.warn('Failed to refresh Microsoft subscription, recreating...');
      await this.removeMicrosoftWebhook(integration);
      return await this.setupMicrosoftCalendarWebhook(integration, integration.webhookUrl);
    }
  }

  /**
   * Get webhook status for integration
   */
  async getWebhookStatus(integration) {
    const status = {
      provider: integration.provider,
      webhookUrl: integration.webhookUrl,
      hasWebhook: !!integration.webhookUrl,
      isExpired: false,
      expiresAt: null
    };

    if (integration.syncSettings?.expiration) {
      status.expiresAt = new Date(integration.syncSettings.expiration);
      status.isExpired = status.expiresAt < new Date();
    }

    return status;
  }

  /**
   * Setup webhooks for all user integrations
   */
  async setupAllWebhooks(userId) {
    const integrations = await IntegrationSettings.findAll({
      where: {
        userId,
        status: 'connected',
        isActive: true
      }
    });

    const results = [];

    for (const integration of integrations) {
      try {
        if (!integration.webhookUrl) {
          const result = await this.setupWebhook(integration);
          results.push({ integration: integration.id, status: 'created', result });
        } else {
          const status = await this.getWebhookStatus(integration);
          if (status.isExpired) {
            const result = await this.refreshWebhook(integration);
            results.push({ integration: integration.id, status: 'refreshed', result });
          } else {
            results.push({ integration: integration.id, status: 'active' });
          }
        }
      } catch (error) {
        results.push({ 
          integration: integration.id, 
          status: 'error', 
          error: error.message 
        });
      }
    }

    return results;
  }
}

module.exports = new WebhookService();