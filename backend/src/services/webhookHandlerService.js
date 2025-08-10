/**
 * Webhook Handler Service
 * Handles real-time webhook notifications from OAuth providers
 */

const { IntegrationSettings, CalendarEvent, EmailSync } = require('../database/models');
const calendarService = require('./calendarService');
const emailService = require('./emailService');
const integrationService = require('./integrationService');
const crypto = require('crypto');

class WebhookHandlerService {
  constructor() {
    this.supportedProviders = ['google_calendar', 'microsoft_calendar', 'gmail', 'outlook_email'];
  }

  /**
   * Handle Google Calendar webhook notifications
   */
  async handleGoogleCalendarWebhook(req, res) {
    try {
      const channelId = req.headers['x-goog-channel-id'];
      const resourceId = req.headers['x-goog-resource-id'];
      const resourceState = req.headers['x-goog-resource-state'];
      const resourceUri = req.headers['x-goog-resource-uri'];
      
      console.log('Google Calendar webhook received:', {
        channelId,
        resourceId,
        resourceState,
        resourceUri
      });

      // Find the integration by webhook configuration
      const integration = await IntegrationSettings.findOne({
        where: {
          provider: 'google_calendar',
          configuration: {
            webhookChannelId: channelId
          }
        }
      });

      if (!integration) {
        console.warn('No integration found for Google Calendar webhook:', channelId);
        return res.status(200).json({ message: 'Webhook received but no matching integration' });
      }

      // Handle different resource states
      switch (resourceState) {
        case 'exists':
          // Calendar data has changed, trigger sync
          await this.triggerIncrementalSync(integration);
          break;
        case 'not_exists':
          // Resource has been deleted
          console.log('Google Calendar resource deleted:', resourceId);
          break;
        case 'sync':
          // Initial sync notification
          console.log('Google Calendar sync notification:', resourceId);
          break;
        default:
          console.log('Unknown Google Calendar resource state:', resourceState);
      }

      res.status(200).json({ 
        success: true, 
        message: 'Google Calendar webhook processed',
        channelId,
        resourceState 
      });
    } catch (error) {
      console.error('Google Calendar webhook error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process Google Calendar webhook' 
      });
    }
  }

  /**
   * Handle Microsoft Graph webhook notifications
   */
  async handleMicrosoftWebhook(req, res) {
    try {
      const validationToken = req.query.validationToken;
      
      // Handle webhook validation
      if (validationToken) {
        console.log('Microsoft webhook validation:', validationToken);
        return res.status(200).send(validationToken);
      }

      const body = req.body;
      const signature = req.headers['x-ms-signature'];
      
      // Verify webhook signature
      if (!this.verifyMicrosoftWebhookSignature(body, signature)) {
        console.error('Microsoft webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      console.log('Microsoft webhook received:', body);

      // Process webhook notifications
      if (body.value && Array.isArray(body.value)) {
        for (const notification of body.value) {
          await this.processMicrosoftNotification(notification);
        }
      }

      res.status(202).json({ 
        success: true, 
        message: 'Microsoft webhook processed' 
      });
    } catch (error) {
      console.error('Microsoft webhook error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process Microsoft webhook' 
      });
    }
  }

  /**
   * Handle Gmail push notifications
   */
  async handleGmailPushNotification(req, res) {
    try {
      const message = req.body.message;
      
      if (!message || !message.data) {
        console.warn('Invalid Gmail push notification format');
        return res.status(400).json({ error: 'Invalid notification format' });
      }

      // Decode the push notification
      const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
      console.log('Gmail push notification:', data);

      const { emailAddress, historyId } = data;

      // Find the integration by email address
      const integration = await IntegrationSettings.findOne({
        where: {
          provider: 'gmail',
          configuration: {
            emailAddress: emailAddress
          }
        }
      });

      if (!integration) {
        console.warn('No integration found for Gmail notification:', emailAddress);
        return res.status(200).json({ message: 'Notification received but no matching integration' });
      }

      // Trigger incremental sync based on history ID
      await this.triggerGmailHistorySync(integration, historyId);

      res.status(200).json({ 
        success: true, 
        message: 'Gmail push notification processed',
        emailAddress,
        historyId 
      });
    } catch (error) {
      console.error('Gmail push notification error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process Gmail push notification' 
      });
    }
  }

  /**
   * Setup webhook subscriptions for an integration
   */
  async setupWebhookSubscription(integrationId) {
    try {
      const integration = await IntegrationSettings.findByPk(integrationId);
      
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Refresh token if needed
      if (integration.needsRefresh()) {
        await integrationService.refreshToken(integrationId);
        await integration.reload();
      }

      let subscriptionResult;

      switch (integration.provider) {
        case 'google_calendar':
          subscriptionResult = await this.setupGoogleCalendarWebhook(integration);
          break;
        case 'microsoft_calendar':
          subscriptionResult = await this.setupMicrosoftCalendarWebhook(integration);
          break;
        case 'gmail':
          subscriptionResult = await this.setupGmailPushNotification(integration);
          break;
        case 'outlook_email':
          subscriptionResult = await this.setupMicrosoftEmailWebhook(integration);
          break;
        default:
          throw new Error(`Webhook setup not supported for provider: ${integration.provider}`);
      }

      // Update integration with webhook configuration
      integration.configuration = {
        ...integration.configuration,
        webhook: subscriptionResult
      };
      await integration.save();

      return subscriptionResult;
    } catch (error) {
      console.error('Setup webhook subscription error:', error);
      throw error;
    }
  }

  /**
   * Remove webhook subscription for an integration
   */
  async removeWebhookSubscription(integrationId) {
    try {
      const integration = await IntegrationSettings.findByPk(integrationId);
      
      if (!integration || !integration.configuration?.webhook) {
        return { message: 'No webhook subscription found' };
      }

      let removalResult;

      switch (integration.provider) {
        case 'google_calendar':
          removalResult = await this.removeGoogleCalendarWebhook(integration);
          break;
        case 'microsoft_calendar':
        case 'outlook_email':
          removalResult = await this.removeMicrosoftWebhook(integration);
          break;
        case 'gmail':
          removalResult = await this.removeGmailPushNotification(integration);
          break;
        default:
          throw new Error(`Webhook removal not supported for provider: ${integration.provider}`);
      }

      // Clear webhook configuration
      integration.configuration = {
        ...integration.configuration,
        webhook: null
      };
      await integration.save();

      return removalResult;
    } catch (error) {
      console.error('Remove webhook subscription error:', error);
      throw error;
    }
  }

  // Private methods

  async triggerIncrementalSync(integration) {
    try {
      if (integration.provider.includes('calendar')) {
        await calendarService.syncCalendarEvents(integration);
      } else if (integration.provider.includes('email') || integration.provider === 'gmail') {
        await emailService.syncEmails(integration);
      }
    } catch (error) {
      console.error('Incremental sync error:', error);
    }
  }

  async processMicrosoftNotification(notification) {
    try {
      const { resource, changeType, clientState } = notification;
      
      // Find integration by client state or resource
      const integration = await IntegrationSettings.findOne({
        where: {
          provider: ['microsoft_calendar', 'outlook_email'],
          configuration: {
            webhookClientState: clientState
          }
        }
      });

      if (integration) {
        console.log('Processing Microsoft notification:', changeType, resource);
        await this.triggerIncrementalSync(integration);
      }
    } catch (error) {
      console.error('Process Microsoft notification error:', error);
    }
  }

  async triggerGmailHistorySync(integration, historyId) {
    try {
      // Store the history ID for incremental sync
      integration.configuration = {
        ...integration.configuration,
        lastHistoryId: historyId
      };
      await integration.save();

      // Trigger email sync
      await emailService.syncEmails(integration);
    } catch (error) {
      console.error('Gmail history sync error:', error);
    }
  }

  async setupGoogleCalendarWebhook(integration) {
    // Implementation would require Google Calendar API setup
    const channelId = `calendar_${integration.id}_${Date.now()}`;
    const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/google/calendar`;
    
    // This is a placeholder - actual implementation would use Google Calendar API
    return {
      type: 'google_calendar',
      channelId,
      webhookUrl,
      expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
    };
  }

  async setupMicrosoftCalendarWebhook(integration) {
    // Implementation would require Microsoft Graph API setup
    const subscriptionId = `calendar_${integration.id}_${Date.now()}`;
    const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/microsoft`;
    
    // This is a placeholder - actual implementation would use Microsoft Graph API
    return {
      type: 'microsoft_calendar',
      subscriptionId,
      webhookUrl,
      clientState: `client_${integration.id}`,
      expiresAt: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)) // 3 days
    };
  }

  async setupGmailPushNotification(integration) {
    // Implementation would require Gmail API setup
    const topicName = process.env.GMAIL_PUBSUB_TOPIC;
    
    if (!topicName) {
      throw new Error('Gmail Pub/Sub topic not configured');
    }

    // This is a placeholder - actual implementation would use Gmail API
    return {
      type: 'gmail_push',
      topicName,
      historyId: Date.now().toString()
    };
  }

  async setupMicrosoftEmailWebhook(integration) {
    // Similar to calendar webhook but for email
    const subscriptionId = `email_${integration.id}_${Date.now()}`;
    const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/microsoft`;
    
    return {
      type: 'microsoft_email',
      subscriptionId,
      webhookUrl,
      clientState: `email_client_${integration.id}`,
      expiresAt: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000))
    };
  }

  async removeGoogleCalendarWebhook(integration) {
    const webhook = integration.configuration?.webhook;
    if (!webhook || !webhook.channelId) {
      return { message: 'No Google Calendar webhook to remove' };
    }

    // This is a placeholder - actual implementation would use Google Calendar API
    return {
      type: 'google_calendar',
      channelId: webhook.channelId,
      status: 'stopped'
    };
  }

  async removeMicrosoftWebhook(integration) {
    const webhook = integration.configuration?.webhook;
    if (!webhook || !webhook.subscriptionId) {
      return { message: 'No Microsoft webhook to remove' };
    }

    // This is a placeholder - actual implementation would use Microsoft Graph API
    return {
      type: webhook.type,
      subscriptionId: webhook.subscriptionId,
      status: 'deleted'
    };
  }

  async removeGmailPushNotification(integration) {
    // Gmail push notifications don't need explicit removal
    return {
      type: 'gmail_push',
      status: 'stopped'
    };
  }

  verifyMicrosoftWebhookSignature(body, signature) {
    if (!signature || !process.env.MICROSOFT_WEBHOOK_SECRET) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.MICROSOFT_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  }
}

module.exports = new WebhookHandlerService();