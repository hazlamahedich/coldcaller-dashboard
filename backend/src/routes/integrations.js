/**
 * Integration Routes
 * API endpoints for OAuth flows and integration management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole, ROLES } = require('../middleware/auth');
const integrationsController = require('../controllers/integrationsController');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/integrations/providers
 * @desc Get available integration providers
 * @access Private
 */
router.get('/providers', integrationsController.getProviders);

/**
 * @route GET /api/integrations
 * @desc Get user's integrations
 * @access Private
 * @query {string} provider - Optional provider filter
 */
router.get('/', integrationsController.getUserIntegrations);

/**
 * @route POST /api/integrations/auth/initiate
 * @desc Initiate OAuth flow
 * @access Private
 * @body {string} provider - Provider ID (google_calendar, microsoft_calendar, gmail, outlook_email)
 */
router.post('/auth/initiate', integrationsController.initiateAuth);

/**
 * @route POST /api/integrations/auth/callback
 * @desc Handle OAuth callback
 * @access Private
 * @body {string} provider - Provider ID
 * @body {string} code - Authorization code
 * @body {string} state - State parameter
 */
router.post('/auth/callback', integrationsController.handleCallback);

/**
 * @route GET /api/integrations/:integrationId/test
 * @desc Test integration connection
 * @access Private
 */
router.get('/:integrationId/test', integrationsController.testConnection);

/**
 * @route PUT /api/integrations/:integrationId/settings
 * @desc Update integration settings
 * @access Private
 * @body {object} syncSettings - Sync configuration
 * @body {boolean} isActive - Whether integration is active
 */
router.put('/:integrationId/settings', integrationsController.updateSettings);

/**
 * @route POST /api/integrations/:integrationId/sync
 * @desc Trigger manual sync
 * @access Private
 * @body {string} syncType - Sync type (full, incremental)
 */
router.post('/:integrationId/sync', integrationsController.triggerSync);

/**
 * @route DELETE /api/integrations/:integrationId
 * @desc Disconnect integration
 * @access Private
 */
router.delete('/:integrationId', integrationsController.disconnect);

/**
 * @route GET /api/integrations/stats
 * @desc Get integration statistics
 * @access Private
 */
router.get('/stats', integrationsController.getStats);

module.exports = router;