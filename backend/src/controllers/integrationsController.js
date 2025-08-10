/**
 * Integrations Controller
 * Handles OAuth flows and integration management API endpoints
 */

const { body, param, query, validationResult } = require('express-validator');
const integrationService = require('../services/integrationService');
const calendarService = require('../services/calendarService');
const emailService = require('../services/emailService');
const { IntegrationSettings } = require('../database/models');
const { generateToken } = require('../utils/encryption');

class IntegrationsController {
  /**
   * Get available integration providers
   */
  async getProviders(req, res) {
    try {
      const providers = {
        calendar: [
          {
            id: 'google_calendar',
            name: 'Google Calendar',
            description: 'Sync with Google Calendar',
            icon: 'google',
            features: ['read_events', 'create_events', 'real_time_sync']
          },
          {
            id: 'microsoft_calendar',
            name: 'Microsoft Calendar',
            description: 'Sync with Outlook/Office 365 Calendar',
            icon: 'microsoft',
            features: ['read_events', 'create_events', 'real_time_sync']
          }
        ],
        email: [
          {
            id: 'gmail',
            name: 'Gmail',
            description: 'Sync with Gmail',
            icon: 'gmail',
            features: ['read_emails', 'send_emails', 'thread_tracking']
          },
          {
            id: 'outlook_email',
            name: 'Outlook Email',
            description: 'Sync with Outlook/Office 365 Email',
            icon: 'outlook',
            features: ['read_emails', 'send_emails', 'thread_tracking']
          }
        ]
      };

      res.json({
        success: true,
        data: providers
      });
    } catch (error) {
      console.error('Get providers error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get providers',
          details: error.message
        }
      });
    }
  }

  /**
   * Get user's integrations
   */
  async getUserIntegrations(req, res) {
    try {
      const userId = req.user.id;
      const { provider } = req.query;

      const integrations = await integrationService.getUserIntegrations(userId, provider);
      
      // Don't expose sensitive data
      const sanitizedIntegrations = integrations.map(integration => ({
        id: integration.id,
        provider: integration.provider,
        status: integration.status,
        isActive: integration.isActive,
        lastSyncAt: integration.lastSyncAt,
        lastSyncStatus: integration.lastSyncStatus,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
        syncSettings: integration.syncSettings,
        hasTokenExpired: integration.isTokenExpired()
      }));

      res.json({
        success: true,
        data: sanitizedIntegrations
      });
    } catch (error) {
      console.error('Get user integrations error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get integrations',
          details: error.message
        }
      });
    }
  }

  /**
   * Initiate OAuth flow
   */
  async initiateAuth(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { provider } = req.body;
      const userId = req.user.id;
      const redirectUri = `${process.env.FRONTEND_URL}/integrations/callback`;

      const authUrl = await integrationService.generateAuthUrl(provider, userId, redirectUri);

      res.json({
        success: true,
        data: {
          authUrl,
          provider,
          redirectUri
        }
      });
    } catch (error) {
      console.error('Initiate auth error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to initiate authentication',
          details: error.message
        }
      });
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { provider, code, state } = req.body;
      const redirectUri = `${process.env.FRONTEND_URL}/integrations/callback`;

      const result = await integrationService.exchangeCodeForTokens(
        provider,
        code,
        redirectUri,
        state
      );

      res.json({
        success: true,
        data: {
          integration: {
            id: result.integration.id,
            provider: result.integration.provider,
            status: result.integration.status,
            createdAt: result.integration.createdAt
          }
        },
        message: 'Integration connected successfully'
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(400).json({
        success: false,
        error: {
          message: 'Authentication failed',
          details: error.message
        }
      });
    }
  }

  /**
   * Test integration connection
   */
  async testConnection(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { integrationId } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const integration = await IntegrationSettings.findOne({
        where: { id: integrationId, userId }
      });

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Integration not found',
            code: 'INTEGRATION_NOT_FOUND'
          }
        });
      }

      const result = await integrationService.testConnection(integrationId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Test connection error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test connection',
          details: error.message
        }
      });
    }
  }

  /**
   * Update integration settings
   */
  async updateSettings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { integrationId } = req.params;
      const userId = req.user.id;
      const { syncSettings, isActive } = req.body;

      const integration = await IntegrationSettings.findOne({
        where: { id: integrationId, userId }
      });

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Integration not found',
            code: 'INTEGRATION_NOT_FOUND'
          }
        });
      }

      // Update settings
      if (syncSettings) {
        integration.syncSettings = { ...integration.syncSettings, ...syncSettings };
      }
      if (typeof isActive === 'boolean') {
        integration.isActive = isActive;
      }

      await integration.save();

      res.json({
        success: true,
        data: {
          id: integration.id,
          provider: integration.provider,
          syncSettings: integration.syncSettings,
          isActive: integration.isActive,
          updatedAt: integration.updatedAt
        }
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update settings',
          details: error.message
        }
      });
    }
  }

  /**
   * Disconnect integration
   */
  async disconnect(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { integrationId } = req.params;
      const userId = req.user.id;

      const result = await integrationService.disconnectIntegration(userId, integrationId);

      res.json({
        success: true,
        data: {
          id: result.id,
          provider: result.provider,
          status: result.status,
          disconnectedAt: result.updatedAt
        },
        message: 'Integration disconnected successfully'
      });
    } catch (error) {
      console.error('Disconnect integration error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to disconnect integration',
          details: error.message
        }
      });
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { integrationId } = req.params;
      const userId = req.user.id;
      const { syncType = 'full' } = req.body;

      // Verify ownership
      const integration = await IntegrationSettings.findOne({
        where: { id: integrationId, userId }
      });

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Integration not found',
            code: 'INTEGRATION_NOT_FOUND'
          }
        });
      }

      let result;
      if (integration.provider.includes('calendar')) {
        result = await calendarService.syncCalendarEvents(integration);
      } else if (integration.provider.includes('email') || integration.provider === 'gmail') {
        result = await emailService.syncEmails(integration);
      } else {
        throw new Error(`Unsupported provider for sync: ${integration.provider}`);
      }

      res.json({
        success: true,
        data: result,
        message: 'Sync completed'
      });
    } catch (error) {
      console.error('Trigger sync error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to trigger sync',
          details: error.message
        }
      });
    }
  }

  /**
   * Get integration statistics
   */
  async getStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await integrationService.getIntegrationStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get statistics',
          details: error.message
        }
      });
    }
  }
}

// Validation rules
const validateInitiateAuth = [
  body('provider')
    .isIn(['google_calendar', 'microsoft_calendar', 'gmail', 'outlook_email'])
    .withMessage('Invalid provider')
];

const validateCallback = [
  body('provider')
    .isIn(['google_calendar', 'microsoft_calendar', 'gmail', 'outlook_email'])
    .withMessage('Invalid provider'),
  body('code').notEmpty().withMessage('Authorization code is required'),
  body('state').notEmpty().withMessage('State parameter is required')
];

const validateIntegrationId = [
  param('integrationId').isInt({ min: 1 }).withMessage('Valid integration ID is required')
];

const validateUpdateSettings = [
  param('integrationId').isInt({ min: 1 }).withMessage('Valid integration ID is required'),
  body('syncSettings').optional().isObject().withMessage('Sync settings must be an object'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

const validateTriggerSync = [
  param('integrationId').isInt({ min: 1 }).withMessage('Valid integration ID is required'),
  body('syncType').optional().isIn(['full', 'incremental']).withMessage('Invalid sync type')
];

const controller = new IntegrationsController();

module.exports = {
  getProviders: controller.getProviders.bind(controller),
  getUserIntegrations: controller.getUserIntegrations.bind(controller),
  initiateAuth: [validateInitiateAuth, controller.initiateAuth.bind(controller)],
  handleCallback: [validateCallback, controller.handleCallback.bind(controller)],
  testConnection: [validateIntegrationId, controller.testConnection.bind(controller)],
  updateSettings: [validateUpdateSettings, controller.updateSettings.bind(controller)],
  disconnect: [validateIntegrationId, controller.disconnect.bind(controller)],
  triggerSync: [validateTriggerSync, controller.triggerSync.bind(controller)],
  getStats: controller.getStats.bind(controller)
};