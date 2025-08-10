/**
 * OAuth Admin Routes
 * Administrative endpoints for OAuth configuration management and monitoring
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole, ROLES } = require('../middleware/auth');
const oauthAdminController = require('../controllers/oauthAdminController');

// Apply authentication to all routes
router.use(authenticate);

// Apply admin role requirement to all routes
router.use(requireRole([ROLES.ADMIN]));

/**
 * @route GET /api/oauth/admin/config
 * @desc Get OAuth configuration status for all providers
 * @access Admin
 */
router.get('/config', oauthAdminController.getOAuthConfig);

/**
 * @route GET /api/oauth/admin/config/:provider/validate
 * @desc Validate OAuth configuration for a specific provider
 * @access Admin
 * @param {string} provider - Provider ID (google_calendar, microsoft_calendar, gmail, outlook_email)
 */
router.get('/config/:provider/validate', oauthAdminController.validateOAuthConfig);

/**
 * @route POST /api/oauth/admin/test/:provider
 * @desc Test OAuth flow end-to-end for a provider
 * @access Admin
 * @param {string} provider - Provider ID
 * @body {string} mode - Test mode ('auth_url_only', 'full_flow')
 */
router.post('/test/:provider', oauthAdminController.testOAuthFlow);

/**
 * @route GET /api/oauth/admin/health
 * @desc Get OAuth integration health check
 * @access Admin
 * @query {number} userId - Optional user ID filter
 */
router.get('/health', oauthAdminController.getIntegrationHealth);

/**
 * @route POST /api/oauth/admin/tokens/refresh
 * @desc Batch token refresh for expired or expiring tokens
 * @access Admin
 * @body {string} provider - Optional provider filter
 * @body {number} userId - Optional user ID filter
 * @body {boolean} forceRefresh - Force refresh all tokens
 */
router.post('/tokens/refresh', oauthAdminController.batchTokenRefresh);

/**
 * @route GET /api/oauth/admin/stats
 * @desc Get OAuth flow statistics and analytics
 * @access Admin
 * @query {string} timeframe - Time period ('24h', '7d', '30d')
 * @query {number} userId - Optional user ID filter
 */
router.get('/stats', oauthAdminController.getOAuthStats);

module.exports = router;