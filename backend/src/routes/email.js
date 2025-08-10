/**
 * Email Routes
 * API endpoints for email synchronization and management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const emailController = require('../controllers/emailController');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/email/messages
 * @desc Get user's synchronized emails
 * @access Private
 * @query {number} limit - Number of emails to return (default: 50, max: 200)
 * @query {number} page - Page number for pagination (default: 1)
 * @query {string} provider - Provider filter (gmail, outlook_email)
 * @query {number} leadId - Lead ID filter
 * @query {string} direction - Direction filter (inbound, outbound)
 * @query {string} startDate - Start date filter (ISO string)
 * @query {string} endDate - End date filter (ISO string)
 * @query {string} search - Search term for subject, sender, or content
 */
router.get('/messages', emailController.getEmails);

/**
 * @route GET /api/email/messages/:emailId
 * @desc Get single email with full content
 * @access Private
 */
router.get('/messages/:emailId', emailController.getEmail);

/**
 * @route GET /api/email/threads/:threadId
 * @desc Get email thread
 * @access Private
 */
router.get('/threads/:threadId', emailController.getThread);

/**
 * @route POST /api/email/send
 * @desc Send email through integrated provider
 * @access Private
 * @body {number} integrationId - Integration to use for sending
 * @body {array} to - Recipient email addresses
 * @body {array} cc - CC email addresses (optional)
 * @body {array} bcc - BCC email addresses (optional)
 * @body {string} subject - Email subject
 * @body {string} body - Email body (HTML)
 * @body {number} leadId - Associated lead ID (optional)
 */
router.post('/send', emailController.sendEmail);

/**
 * @route POST /api/email/sync
 * @desc Sync emails for user
 * @access Private
 * @body {string} provider - Optional provider to sync (gmail, outlook_email)
 */
router.post('/sync', emailController.syncEmails);

/**
 * @route PUT /api/email/messages/:emailId/lead
 * @desc Link email to lead
 * @access Private
 * @body {number} leadId - Lead ID to link (null to unlink)
 */
router.put('/messages/:emailId/lead', emailController.linkToLead);

/**
 * @route GET /api/email/stats
 * @desc Get email statistics
 * @access Private
 * @query {string} timeframe - Timeframe for stats (7d, 30d, 90d)
 */
router.get('/stats', emailController.getStats);

module.exports = router;