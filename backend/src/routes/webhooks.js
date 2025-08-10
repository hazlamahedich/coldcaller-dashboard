/**
 * Webhook Routes
 * Endpoints for receiving real-time notifications from integrated providers
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { IntegrationSettings, CalendarEvent, EmailSync } = require('../database/models');
const calendarService = require('../services/calendarService');
const emailService = require('../services/emailService');
const { validateRequestSignature } = require('../middleware/security');

/**
 * Google Calendar Webhook Handler
 * Handles push notifications from Google Calendar API
 */
router.post('/google/calendar', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    console.log('Google Calendar webhook received:', {
      headers: req.headers,
      body: req.body?.toString()
    });

    // Verify webhook authenticity
    const channelId = req.headers['x-goog-channel-id'];
    const channelToken = req.headers['x-goog-channel-token'];
    const resourceId = req.headers['x-goog-resource-id'];
    const resourceState = req.headers['x-goog-resource-state'];

    if (!channelId || !resourceId) {
      return res.status(400).json({ error: 'Missing required headers' });
    }

    // Find the integration associated with this webhook
    const integration = await IntegrationSettings.findOne({
      where: {
        provider: 'google_calendar',
        status: 'connected',
        // Match based on webhook configuration stored in syncSettings
        syncSettings: {
          webhookChannelId: channelId
        }
      }
    });

    if (!integration) {
      console.warn(`No integration found for Google Calendar webhook channel: ${channelId}`);
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        // Initial sync notification - acknowledge but don't process
        console.log('Google Calendar initial sync notification');
        break;
        
      case 'exists':
        // Calendar has changes - trigger sync
        console.log(`Google Calendar change detected for user ${integration.userId}`);
        
        // Trigger background sync (don't await to avoid timeout)
        calendarService.syncCalendarEvents(integration)
          .then(result => {
            console.log(`Google Calendar sync completed for user ${integration.userId}:`, result);
          })
          .catch(error => {
            console.error(`Google Calendar sync failed for user ${integration.userId}:`, error);
          });
        break;
        
      default:
        console.log(`Unknown Google Calendar resource state: ${resourceState}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Google Calendar webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Microsoft Graph Webhook Handler
 * Handles push notifications from Microsoft Graph API
 */
router.post('/microsoft/graph', express.json(), validateRequestSignature(process.env.MICROSOFT_WEBHOOK_SECRET), async (req, res) => {
  try {
    console.log('Microsoft Graph webhook received:', {
      headers: req.headers,
      body: req.body
    });

    // Microsoft Graph sends validation requests
    if (req.query.validationToken) {
      return res.status(200).send(req.query.validationToken);
    }

    const notifications = req.body.value || [];

    for (const notification of notifications) {
      try {
        await processMicrosoftNotification(notification);
      } catch (error) {
        console.error('Failed to process Microsoft notification:', error);
      }
    }

    res.status(202).send('Accepted');
  } catch (error) {
    console.error('Microsoft Graph webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Gmail Push Notification Handler
 * Handles push notifications from Gmail API via Google Cloud Pub/Sub
 */
router.post('/google/gmail', express.json(), async (req, res) => {
  try {
    console.log('Gmail webhook received:', {
      headers: req.headers,
      body: req.body
    });

    // Decode Pub/Sub message
    const pubsubMessage = req.body?.message;
    if (!pubsubMessage?.data) {
      return res.status(400).json({ error: 'Invalid Pub/Sub message' });
    }

    const messageData = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString());
    const { emailAddress, historyId } = messageData;

    if (!emailAddress || !historyId) {
      return res.status(400).json({ error: 'Missing required message data' });
    }

    // Find integration by email address or other identifier
    const integration = await IntegrationSettings.findOne({
      where: {
        provider: 'gmail',
        status: 'connected',
        // You might need to store the user's email in configuration
        configuration: {
          emailAddress: emailAddress
        }
      }
    });

    if (!integration) {
      console.warn(`No Gmail integration found for email: ${emailAddress}`);
      return res.status(404).json({ error: 'Integration not found' });
    }

    console.log(`Gmail change detected for user ${integration.userId}, historyId: ${historyId}`);

    // Trigger background sync
    emailService.syncEmails(integration)
      .then(result => {
        console.log(`Gmail sync completed for user ${integration.userId}:`, result);
      })
      .catch(error => {
        console.error(`Gmail sync failed for user ${integration.userId}:`, error);
      });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Gmail webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Outlook Email Webhook Handler
 * Handles push notifications from Microsoft Graph for Outlook email
 */
router.post('/microsoft/outlook', express.json(), validateRequestSignature(process.env.MICROSOFT_WEBHOOK_SECRET), async (req, res) => {
  try {
    console.log('Outlook webhook received:', {
      headers: req.headers,
      body: req.body
    });

    // Microsoft Graph sends validation requests
    if (req.query.validationToken) {
      return res.status(200).send(req.query.validationToken);
    }

    const notifications = req.body.value || [];

    for (const notification of notifications) {
      try {
        if (notification.resource?.includes('/messages')) {
          await processMicrosoftEmailNotification(notification);
        }
      } catch (error) {
        console.error('Failed to process Outlook notification:', error);
      }
    }

    res.status(202).send('Accepted');
  } catch (error) {
    console.error('Outlook webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generic webhook status endpoint
 */
router.get('/status', async (req, res) => {
  try {
    const activeWebhooks = await IntegrationSettings.count({
      where: {
        status: 'connected',
        webhookUrl: { [require('sequelize').Op.not]: null }
      }
    });

    res.json({
      success: true,
      data: {
        status: 'operational',
        activeWebhooks,
        supportedProviders: [
          'google_calendar',
          'microsoft_calendar',
          'gmail',
          'outlook_email'
        ],
        lastCheck: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Webhook status error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get webhook status',
        details: error.message
      }
    });
  }
});

// Helper functions

async function processMicrosoftNotification(notification) {
  const { subscriptionId, clientState, resource, changeType } = notification;

  // Find integration by subscription ID
  const integration = await IntegrationSettings.findOne({
    where: {
      provider: ['microsoft_calendar', 'outlook_email'],
      status: 'connected',
      syncSettings: {
        subscriptionId: subscriptionId
      }
    }
  });

  if (!integration) {
    console.warn(`No integration found for Microsoft subscription: ${subscriptionId}`);
    return;
  }

  console.log(`Microsoft ${integration.provider} change detected:`, {
    userId: integration.userId,
    resource,
    changeType
  });

  // Trigger appropriate sync based on provider
  if (integration.provider === 'microsoft_calendar') {
    await calendarService.syncCalendarEvents(integration);
  } else if (integration.provider === 'outlook_email') {
    await emailService.syncEmails(integration);
  }
}

async function processMicrosoftEmailNotification(notification) {
  // Similar to processMicrosoftNotification but specific to email
  await processMicrosoftNotification(notification);
}

module.exports = router;