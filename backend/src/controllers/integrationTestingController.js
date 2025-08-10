/**
 * Integration Testing Controller
 * Comprehensive endpoints for testing OAuth integrations with real services
 */

const { body, param, query, validationResult } = require('express-validator');
const integrationService = require('../services/integrationService');
const tokenManagementService = require('../services/tokenManagementService');
const calendarService = require('../services/calendarService');
const emailService = require('../services/emailService');
const { IntegrationSettings } = require('../database/models');
const axios = require('axios');

class IntegrationTestingController {
  /**
   * Test calendar access with stored tokens
   */
  async testCalendarAccess(req, res) {
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

      if (!integration.provider.includes('calendar')) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Integration is not a calendar provider',
            code: 'INVALID_PROVIDER_TYPE'
          }
        });
      }

      const testResults = {
        integrationId: integration.id,
        provider: integration.provider,
        tests: {},
        overallStatus: 'success'
      };

      try {
        // Test 1: Token validation
        const tokenValidation = await tokenManagementService.validateTokenIntegrity(integrationId);
        testResults.tests.tokenValidation = tokenValidation;

        if (!tokenValidation.overallValid) {
          testResults.overallStatus = 'failed';
        }

        // Test 2: API connectivity
        if (tokenValidation.overallValid) {
          try {
            const connectionTest = await integrationService.testConnection(integrationId);
            testResults.tests.apiConnectivity = connectionTest;

            if (connectionTest.status !== 'connected') {
              testResults.overallStatus = 'failed';
            }
          } catch (error) {
            testResults.tests.apiConnectivity = {
              status: 'failed',
              error: error.message
            };
            testResults.overallStatus = 'failed';
          }

          // Test 3: Calendar list access
          try {
            await integration.reload(); // Refresh token if needed
            
            const headers = {
              'Authorization': `Bearer ${integration.accessToken}`,
              'Accept': 'application/json'
            };

            let calendarListUrl;
            if (integration.provider === 'google_calendar') {
              calendarListUrl = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
            } else if (integration.provider === 'microsoft_calendar') {
              calendarListUrl = 'https://graph.microsoft.com/v1.0/me/calendars';
            }

            const response = await axios.get(calendarListUrl, { headers, timeout: 10000 });
            
            testResults.tests.calendarListAccess = {
              status: 'success',
              calendarsFound: Array.isArray(response.data.items) 
                ? response.data.items.length 
                : response.data.value?.length || 0,
              sampleCalendar: response.data.items?.[0] || response.data.value?.[0] || null
            };
          } catch (error) {
            testResults.tests.calendarListAccess = {
              status: 'failed',
              error: error.message,
              httpStatus: error.response?.status
            };
            testResults.overallStatus = 'failed';
          }

          // Test 4: Recent events access
          if (testResults.tests.calendarListAccess?.status === 'success') {
            try {
              const now = new Date();
              const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
              const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

              let eventsUrl;
              const params = new URLSearchParams();

              if (integration.provider === 'google_calendar') {
                eventsUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
                params.set('timeMin', oneWeekAgo.toISOString());
                params.set('timeMax', oneWeekFromNow.toISOString());
                params.set('maxResults', '10');
                params.set('singleEvents', 'true');
                params.set('orderBy', 'startTime');
              } else if (integration.provider === 'microsoft_calendar') {
                eventsUrl = 'https://graph.microsoft.com/v1.0/me/events';
                params.set('$filter', `start/dateTime ge '${oneWeekAgo.toISOString()}' and start/dateTime le '${oneWeekFromNow.toISOString()}'`);
                params.set('$top', '10');
                params.set('$orderby', 'start/dateTime');
              }

              const response = await axios.get(`${eventsUrl}?${params}`, { 
                headers, 
                timeout: 10000 
              });

              testResults.tests.eventsAccess = {
                status: 'success',
                eventsFound: Array.isArray(response.data.items) 
                  ? response.data.items.length 
                  : response.data.value?.length || 0,
                timeRange: {
                  from: oneWeekAgo.toISOString(),
                  to: oneWeekFromNow.toISOString()
                }
              };
            } catch (error) {
              testResults.tests.eventsAccess = {
                status: 'failed',
                error: error.message,
                httpStatus: error.response?.status
              };
            }
          }
        }

      } catch (error) {
        testResults.tests.generalError = {
          status: 'failed',
          error: error.message
        };
        testResults.overallStatus = 'failed';
      }

      res.json({
        success: true,
        data: testResults
      });
    } catch (error) {
      console.error('Test calendar access error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test calendar access',
          details: error.message
        }
      });
    }
  }

  /**
   * Test email access with stored tokens
   */
  async testEmailAccess(req, res) {
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

      if (!integration.provider.includes('email') && integration.provider !== 'gmail') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Integration is not an email provider',
            code: 'INVALID_PROVIDER_TYPE'
          }
        });
      }

      const testResults = {
        integrationId: integration.id,
        provider: integration.provider,
        tests: {},
        overallStatus: 'success'
      };

      try {
        // Test 1: Token validation
        const tokenValidation = await tokenManagementService.validateTokenIntegrity(integrationId);
        testResults.tests.tokenValidation = tokenValidation;

        if (!tokenValidation.overallValid) {
          testResults.overallStatus = 'failed';
        }

        // Test 2: API connectivity
        if (tokenValidation.overallValid) {
          try {
            const connectionTest = await integrationService.testConnection(integrationId);
            testResults.tests.apiConnectivity = connectionTest;

            if (connectionTest.status !== 'connected') {
              testResults.overallStatus = 'failed';
            }
          } catch (error) {
            testResults.tests.apiConnectivity = {
              status: 'failed',
              error: error.message
            };
            testResults.overallStatus = 'failed';
          }

          // Test 3: Profile access
          try {
            await integration.reload(); // Refresh token if needed
            
            const headers = {
              'Authorization': `Bearer ${integration.accessToken}`,
              'Accept': 'application/json'
            };

            let profileUrl;
            if (integration.provider === 'gmail') {
              profileUrl = 'https://www.googleapis.com/gmail/v1/users/me/profile';
            } else if (integration.provider === 'outlook_email') {
              profileUrl = 'https://graph.microsoft.com/v1.0/me';
            }

            const response = await axios.get(profileUrl, { headers, timeout: 10000 });
            
            testResults.tests.profileAccess = {
              status: 'success',
              email: response.data.emailAddress || response.data.mail || response.data.userPrincipalName,
              messagesTotal: response.data.messagesTotal || 'N/A'
            };
          } catch (error) {
            testResults.tests.profileAccess = {
              status: 'failed',
              error: error.message,
              httpStatus: error.response?.status
            };
            testResults.overallStatus = 'failed';
          }

          // Test 4: Recent messages access
          if (testResults.tests.profileAccess?.status === 'success') {
            try {
              let messagesUrl;
              const params = new URLSearchParams();

              if (integration.provider === 'gmail') {
                messagesUrl = 'https://www.googleapis.com/gmail/v1/users/me/messages';
                params.set('maxResults', '5');
                params.set('q', 'is:unread OR in:inbox');
              } else if (integration.provider === 'outlook_email') {
                messagesUrl = 'https://graph.microsoft.com/v1.0/me/messages';
                params.set('$top', '5');
                params.set('$select', 'id,subject,from,receivedDateTime,isRead');
                params.set('$orderby', 'receivedDateTime desc');
              }

              const response = await axios.get(`${messagesUrl}?${params}`, { 
                headers, 
                timeout: 10000 
              });

              testResults.tests.messagesAccess = {
                status: 'success',
                messagesFound: Array.isArray(response.data.messages) 
                  ? response.data.messages.length 
                  : response.data.value?.length || 0,
                canListMessages: true
              };
            } catch (error) {
              testResults.tests.messagesAccess = {
                status: 'failed',
                error: error.message,
                httpStatus: error.response?.status
              };
            }
          }
        }

      } catch (error) {
        testResults.tests.generalError = {
          status: 'failed',
          error: error.message
        };
        testResults.overallStatus = 'failed';
      }

      res.json({
        success: true,
        data: testResults
      });
    } catch (error) {
      console.error('Test email access error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test email access',
          details: error.message
        }
      });
    }
  }

  /**
   * Connection health check for integration
   */
  async connectionHealthCheck(req, res) {
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

      const healthCheck = {
        integrationId: integration.id,
        provider: integration.provider,
        status: integration.status,
        lastChecked: new Date(),
        checks: {
          tokenExists: !!integration.accessToken,
          refreshTokenExists: !!integration.refreshToken,
          tokenExpired: integration.isTokenExpired(),
          needsRefresh: integration.needsRefresh(5),
          lastSync: integration.lastSyncAt,
          hasErrors: !!integration.errorDetails
        },
        recommendations: []
      };

      // Generate recommendations
      if (healthCheck.checks.tokenExpired) {
        healthCheck.recommendations.push({
          type: 'token_expired',
          message: 'Access token has expired, refresh required',
          priority: 'high',
          action: 'refresh_token'
        });
      } else if (healthCheck.checks.needsRefresh) {
        healthCheck.recommendations.push({
          type: 'token_expiring',
          message: 'Access token expires soon, consider refreshing',
          priority: 'medium',
          action: 'refresh_token'
        });
      }

      if (!healthCheck.checks.refreshTokenExists) {
        healthCheck.recommendations.push({
          type: 'no_refresh_token',
          message: 'No refresh token available, re-authentication required',
          priority: 'high',
          action: 'reauthenticate'
        });
      }

      if (healthCheck.checks.hasErrors) {
        healthCheck.recommendations.push({
          type: 'has_errors',
          message: 'Integration has recorded errors, check error details',
          priority: 'medium',
          action: 'check_errors'
        });
      }

      const daysSinceLastSync = healthCheck.checks.lastSync 
        ? Math.floor((new Date() - new Date(healthCheck.checks.lastSync)) / (1000 * 60 * 60 * 24))
        : null;

      if (daysSinceLastSync > 7) {
        healthCheck.recommendations.push({
          type: 'sync_overdue',
          message: `Last sync was ${daysSinceLastSync} days ago`,
          priority: 'low',
          action: 'trigger_sync'
        });
      }

      // Overall health score
      const totalChecks = 6;
      const passedChecks = Object.values(healthCheck.checks).filter(check => 
        typeof check === 'boolean' ? check : true
      ).length - (healthCheck.checks.tokenExpired ? 1 : 0) - (healthCheck.checks.hasErrors ? 1 : 0);

      healthCheck.healthScore = Math.round((passedChecks / totalChecks) * 100);
      healthCheck.overallHealth = healthCheck.healthScore >= 80 ? 'good' : 
                                 healthCheck.healthScore >= 60 ? 'fair' : 'poor';

      res.json({
        success: true,
        data: healthCheck
      });
    } catch (error) {
      console.error('Connection health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to perform health check',
          details: error.message
        }
      });
    }
  }

  /**
   * Validate OAuth flow for integration
   */
  async validateOAuthFlow(req, res) {
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

      const validation = {
        integrationId: integration.id,
        provider: integration.provider,
        validationTime: new Date(),
        steps: {},
        overallValid: true
      };

      // Step 1: Validate provider configuration
      try {
        const providerConfig = integrationService.providers[integration.provider];
        const clientId = integrationService.getClientId(integration.provider);
        const clientSecret = integrationService.getClientSecret(integration.provider);

        validation.steps.providerConfig = {
          status: 'success',
          hasAuthUrl: !!providerConfig.authUrl,
          hasTokenUrl: !!providerConfig.tokenUrl,
          hasScopes: providerConfig.scopes.length > 0,
          clientIdConfigured: !!clientId,
          clientSecretConfigured: !!clientSecret
        };

        if (!validation.steps.providerConfig.clientIdConfigured || 
            !validation.steps.providerConfig.clientSecretConfigured) {
          validation.overallValid = false;
        }
      } catch (error) {
        validation.steps.providerConfig = {
          status: 'failed',
          error: error.message
        };
        validation.overallValid = false;
      }

      // Step 2: Test auth URL generation
      try {
        const testUserId = `test-${Date.now()}`;
        const redirectUri = `${process.env.FRONTEND_URL}/integrations/callback`;
        const authUrl = await integrationService.generateAuthUrl(integration.provider, testUserId, redirectUri);
        
        validation.steps.authUrlGeneration = {
          status: 'success',
          urlGenerated: true,
          urlLength: authUrl.length,
          containsProvider: authUrl.includes(integrationService.providers[integration.provider].authUrl)
        };
      } catch (error) {
        validation.steps.authUrlGeneration = {
          status: 'failed',
          error: error.message
        };
        validation.overallValid = false;
      }

      // Step 3: Validate current tokens
      if (integration.accessToken) {
        try {
          const tokenValidation = await tokenManagementService.validateTokenIntegrity(integrationId);
          validation.steps.tokenValidation = tokenValidation;
          
          if (!tokenValidation.overallValid) {
            validation.overallValid = false;
          }
        } catch (error) {
          validation.steps.tokenValidation = {
            status: 'failed',
            error: error.message
          };
          validation.overallValid = false;
        }
      } else {
        validation.steps.tokenValidation = {
          status: 'skipped',
          reason: 'No access token available'
        };
      }

      // Step 4: Test API endpoints
      if (validation.steps.tokenValidation?.overallValid) {
        try {
          const connectionTest = await integrationService.testConnection(integrationId);
          validation.steps.apiTest = connectionTest;
          
          if (connectionTest.status !== 'connected') {
            validation.overallValid = false;
          }
        } catch (error) {
          validation.steps.apiTest = {
            status: 'failed',
            error: error.message
          };
          validation.overallValid = false;
        }
      } else {
        validation.steps.apiTest = {
          status: 'skipped',
          reason: 'Token validation failed or no tokens available'
        };
      }

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Validate OAuth flow error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to validate OAuth flow',
          details: error.message
        }
      });
    }
  }
}

// Validation rules
const validateIntegrationId = [
  param('integrationId').isInt({ min: 1 }).withMessage('Valid integration ID is required')
];

const controller = new IntegrationTestingController();

module.exports = {
  testCalendarAccess: [validateIntegrationId, controller.testCalendarAccess.bind(controller)],
  testEmailAccess: [validateIntegrationId, controller.testEmailAccess.bind(controller)],
  connectionHealthCheck: [validateIntegrationId, controller.connectionHealthCheck.bind(controller)],
  validateOAuthFlow: [validateIntegrationId, controller.validateOAuthFlow.bind(controller)]
};