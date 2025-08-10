/**
 * Integration Testing Routes
 * Comprehensive testing endpoints for OAuth integrations
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole, ROLES } = require('../middleware/auth');
const integrationTestingController = require('../controllers/integrationTestingController');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route POST /api/integrations/test/:integrationId/calendar
 * @desc Test calendar access with stored tokens
 * @access Private
 * @param {number} integrationId - Integration ID
 */
router.post('/:integrationId/calendar', integrationTestingController.testCalendarAccess);

/**
 * @route POST /api/integrations/test/:integrationId/email
 * @desc Test email access with stored tokens
 * @access Private
 * @param {number} integrationId - Integration ID
 */
router.post('/:integrationId/email', integrationTestingController.testEmailAccess);

/**
 * @route GET /api/integrations/test/:integrationId/health
 * @desc Get connection health check for integration
 * @access Private
 * @param {number} integrationId - Integration ID
 */
router.get('/:integrationId/health', integrationTestingController.connectionHealthCheck);

/**
 * @route GET /api/integrations/test/:integrationId/validate
 * @desc Validate OAuth flow for integration
 * @access Private
 * @param {number} integrationId - Integration ID
 */
router.get('/:integrationId/validate', integrationTestingController.validateOAuthFlow);

module.exports = router;