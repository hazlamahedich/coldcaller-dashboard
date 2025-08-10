/**
 * OAuth Admin Controller
 * Enhanced OAuth configuration management and administrative endpoints
 */

const { body, param, query, validationResult } = require('express-validator');
const integrationService = require('../services/integrationService');
const { IntegrationSettings } = require('../database/models');
const { encrypt, decrypt } = require('../utils/encryption');
const { Op } = require('sequelize');
const axios = require('axios');

class OAuthAdminController {
  /**
   * Get OAuth configuration status
   */
  async getOAuthConfig(req, res) {
    try {
      const providers = ['google_calendar', 'microsoft_calendar', 'gmail', 'outlook_email'];
      const config = {};

      providers.forEach(provider => {
        const clientId = integrationService.getClientId(provider);
        const clientSecret = integrationService.getClientSecret(provider);
        
        config[provider] = {
          clientIdConfigured: !!clientId,
          clientSecretConfigured: !!clientSecret,
          clientIdPreview: clientId ? `${clientId.substring(0, 8)}...` : null,
          scopes: integrationService.providers[provider]?.scopes || []
        };
      });

      res.json({
        success: true,
        data: {
          providers: config,
          webhooksConfigured: {
            microsoft: !!process.env.MICROSOFT_WEBHOOK_SECRET,
            gmail: !!process.env.GMAIL_PUBSUB_TOPIC
          },
          frontendUrl: process.env.FRONTEND_URL,
          backendUrl: process.env.BACKEND_URL
        }
      });
    } catch (error) {
      console.error('Get OAuth config error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get OAuth configuration',
          details: error.message
        }
      });
    }
  }

  /**
   * Validate OAuth configuration
   */
  async validateOAuthConfig(req, res) {
    try {
      const { provider } = req.params;
      
      if (!integrationService.providers[provider]) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid provider',
            code: 'INVALID_PROVIDER'
          }
        });
      }

      const clientId = integrationService.getClientId(provider);
      const clientSecret = integrationService.getClientSecret(provider);

      const validation = {
        provider,
        clientIdValid: !!clientId && clientId.length > 10,
        clientSecretValid: !!clientSecret && clientSecret.length > 10,
        scopesValid: integrationService.providers[provider].scopes.length > 0,
        urlsValid: {
          authUrl: !!integrationService.providers[provider].authUrl,
          tokenUrl: !!integrationService.providers[provider].tokenUrl
        }
      };

      // Test OAuth endpoints connectivity
      try {
        const authUrl = integrationService.providers[provider].authUrl;
        await axios.get(authUrl.split('?')[0], { timeout: 5000 });
        validation.authUrlAccessible = true;
      } catch (error) {
        validation.authUrlAccessible = false;
        validation.authUrlError = error.message;
      }

      validation.overallValid = (
        validation.clientIdValid &&
        validation.clientSecretValid &&
        validation.scopesValid &&
        validation.urlsValid.authUrl &&
        validation.urlsValid.tokenUrl &&
        validation.authUrlAccessible
      );

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Validate OAuth config error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to validate OAuth configuration',
          details: error.message
        }
      });
    }
  }

  /**
   * Test OAuth flow end-to-end
   */
  async testOAuthFlow(req, res) {
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

      const { provider } = req.params;
      const { mode = 'auth_url_only' } = req.body;

      if (!integrationService.providers[provider]) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid provider',
            code: 'INVALID_PROVIDER'
          }
        });
      }

      const testResults = {
        provider,
        mode,
        tests: {},
        overallStatus: 'success'
      };

      // Test 1: Generate auth URL
      try {
        const testUserId = 'test-user-' + Date.now();
        const redirectUri = `${process.env.FRONTEND_URL}/integrations/callback`;
        const authUrl = await integrationService.generateAuthUrl(provider, testUserId, redirectUri);
        
        testResults.tests.authUrlGeneration = {
          status: 'success',
          authUrl: authUrl.substring(0, 100) + '...',
          urlValid: authUrl.includes(integrationService.providers[provider].authUrl)
        };
      } catch (error) {
        testResults.tests.authUrlGeneration = {
          status: 'failed',
          error: error.message
        };
        testResults.overallStatus = 'failed';
      }

      // Test 2: Validate OAuth endpoints
      try {
        const providerConfig = integrationService.providers[provider];
        const endpointTests = {};

        // Test auth URL accessibility
        try {
          const authResponse = await axios.head(providerConfig.authUrl.split('?')[0], { 
            timeout: 5000,
            validateStatus: (status) => status < 500 // Accept redirects as valid
          });
          endpointTests.authEndpoint = { status: 'accessible', httpStatus: authResponse.status };
        } catch (error) {
          endpointTests.authEndpoint = { status: 'failed', error: error.message };
        }

        // Test token URL accessibility
        try {
          // Just test that the endpoint exists (POST will fail without proper payload, but that's expected)
          await axios.head(providerConfig.tokenUrl, { 
            timeout: 5000,
            validateStatus: (status) => status < 500
          });
          endpointTests.tokenEndpoint = { status: 'accessible' };
        } catch (error) {
          if (error.response?.status === 405) {
            // Method not allowed is expected for HEAD on token endpoint
            endpointTests.tokenEndpoint = { status: 'accessible', note: 'POST-only endpoint' };
          } else {
            endpointTests.tokenEndpoint = { status: 'failed', error: error.message };
          }
        }

        testResults.tests.endpointAccessibility = endpointTests;
      } catch (error) {
        testResults.tests.endpointAccessibility = {
          status: 'failed',
          error: error.message
        };
      }

      res.json({
        success: true,
        data: testResults
      });
    } catch (error) {
      console.error('Test OAuth flow error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test OAuth flow',
          details: error.message
        }
      });
    }
  }

  /**
   * Get OAuth integration health check
   */
  async getIntegrationHealth(req, res) {
    try {
      const { userId } = req.query;
      
      let where = { status: 'connected' };
      if (userId) where.userId = userId;

      const integrations = await IntegrationSettings.findAll({ where });
      
      const healthCheck = {
        timestamp: new Date(),
        totalIntegrations: integrations.length,
        healthyIntegrations: 0,
        expiredTokens: 0,
        failedIntegrations: 0,
        providerBreakdown: {},
        recommendations: []
      };

      const now = new Date();
      
      for (const integration of integrations) {
        const provider = integration.provider;
        
        if (!healthCheck.providerBreakdown[provider]) {
          healthCheck.providerBreakdown[provider] = {
            total: 0,
            healthy: 0,
            expired: 0,
            failed: 0
          };
        }
        
        healthCheck.providerBreakdown[provider].total++;
        
        if (integration.isTokenExpired()) {
          healthCheck.expiredTokens++;
          healthCheck.providerBreakdown[provider].expired++;
        } else if (integration.status === 'connected') {
          healthCheck.healthyIntegrations++;
          healthCheck.providerBreakdown[provider].healthy++;
        } else {
          healthCheck.failedIntegrations++;
          healthCheck.providerBreakdown[provider].failed++;
        }
      }

      // Generate recommendations
      if (healthCheck.expiredTokens > 0) {
        healthCheck.recommendations.push({
          type: 'expired_tokens',
          message: `${healthCheck.expiredTokens} integration(s) have expired tokens and need re-authentication`,
          priority: 'high'
        });
      }

      if (healthCheck.failedIntegrations > 0) {
        healthCheck.recommendations.push({
          type: 'failed_integrations',
          message: `${healthCheck.failedIntegrations} integration(s) have failed and need attention`,
          priority: 'medium'
        });
      }

      const healthScore = healthCheck.totalIntegrations > 0 
        ? Math.round((healthCheck.healthyIntegrations / healthCheck.totalIntegrations) * 100)
        : 100;

      healthCheck.overallHealth = {
        score: healthScore,
        status: healthScore >= 80 ? 'good' : healthScore >= 60 ? 'fair' : 'poor'
      };

      res.json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      console.error('Get integration health error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get integration health',
          details: error.message
        }
      });
    }
  }

  /**
   * Batch token refresh
   */
  async batchTokenRefresh(req, res) {
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

      const { provider, userId, forceRefresh = false } = req.body;
      
      let where = { status: 'connected' };
      if (provider) where.provider = provider;
      if (userId) where.userId = userId;
      
      if (!forceRefresh) {
        // Only refresh tokens that are expired or near expiration
        where[Op.or] = [
          { tokenExpiresAt: { [Op.lt]: new Date() } }, // Expired
          { tokenExpiresAt: { [Op.lt]: new Date(Date.now() + 5 * 60 * 1000) } } // Expires in 5 minutes
        ];
      }

      const integrations = await IntegrationSettings.findAll({ where });
      
      const refreshResults = {
        total: integrations.length,
        successful: 0,
        failed: 0,
        results: []
      };

      for (const integration of integrations) {
        try {
          await integrationService.refreshToken(integration.id);
          refreshResults.successful++;
          refreshResults.results.push({
            integrationId: integration.id,
            provider: integration.provider,
            status: 'success'
          });
        } catch (error) {
          refreshResults.failed++;
          refreshResults.results.push({
            integrationId: integration.id,
            provider: integration.provider,
            status: 'failed',
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: refreshResults
      });
    } catch (error) {
      console.error('Batch token refresh error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to perform batch token refresh',
          details: error.message
        }
      });
    }
  }

  /**
   * Get OAuth flow statistics
   */
  async getOAuthStats(req, res) {
    try {
      const { timeframe = '7d' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      const stats = {
        timeframe,
        period: {
          start: startDate,
          end: endDate
        },
        integrations: {
          total: 0,
          byProvider: {},
          byStatus: {}
        },
        recentActivity: {
          newIntegrations: 0,
          tokenRefreshes: 0,
          failedConnections: 0
        }
      };

      // Get all integrations
      const allIntegrations = await IntegrationSettings.findAll();
      stats.integrations.total = allIntegrations.length;

      // Group by provider and status
      allIntegrations.forEach(integration => {
        // By provider
        if (!stats.integrations.byProvider[integration.provider]) {
          stats.integrations.byProvider[integration.provider] = 0;
        }
        stats.integrations.byProvider[integration.provider]++;

        // By status
        if (!stats.integrations.byStatus[integration.status]) {
          stats.integrations.byStatus[integration.status] = 0;
        }
        stats.integrations.byStatus[integration.status]++;

        // Recent activity
        if (integration.createdAt >= startDate) {
          stats.recentActivity.newIntegrations++;
        }

        if (integration.lastSyncAt >= startDate) {
          stats.recentActivity.tokenRefreshes++;
        }

        if (integration.status === 'error' && integration.updatedAt >= startDate) {
          stats.recentActivity.failedConnections++;
        }
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get OAuth stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get OAuth statistics',
          details: error.message
        }
      });
    }
  }
}

// Validation rules
const validateProvider = [
  param('provider')
    .isIn(['google_calendar', 'microsoft_calendar', 'gmail', 'outlook_email'])
    .withMessage('Invalid provider')
];

const validateTestFlow = [
  ...validateProvider,
  body('mode')
    .optional()
    .isIn(['auth_url_only', 'full_flow'])
    .withMessage('Invalid test mode')
];

const validateBatchRefresh = [
  body('provider')
    .optional()
    .isIn(['google_calendar', 'microsoft_calendar', 'gmail', 'outlook_email'])
    .withMessage('Invalid provider'),
  body('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid user ID required'),
  body('forceRefresh')
    .optional()
    .isBoolean()
    .withMessage('forceRefresh must be a boolean')
];

const validateStatsQuery = [
  query('timeframe')
    .optional()
    .isIn(['24h', '7d', '30d'])
    .withMessage('Invalid timeframe'),
  query('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid user ID required')
];

const controller = new OAuthAdminController();

module.exports = {
  getOAuthConfig: controller.getOAuthConfig.bind(controller),
  validateOAuthConfig: [validateProvider, controller.validateOAuthConfig.bind(controller)],
  testOAuthFlow: [validateTestFlow, controller.testOAuthFlow.bind(controller)],
  getIntegrationHealth: [validateStatsQuery, controller.getIntegrationHealth.bind(controller)],
  batchTokenRefresh: [validateBatchRefresh, controller.batchTokenRefresh.bind(controller)],
  getOAuthStats: [validateStatsQuery, controller.getOAuthStats.bind(controller)]
};