/**
 * Calendar Routes
 * API endpoints for calendar events and synchronization
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const calendarController = require('../controllers/calendarController');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/calendar/events
 * @desc Get user's calendar events
 * @access Private
 * @query {string} startDate - Start date filter (ISO string)
 * @query {string} endDate - End date filter (ISO string)
 * @query {string} provider - Provider filter
 * @query {number} limit - Number of events to return (default: 100, max: 500)
 * @query {number} page - Page number for pagination (default: 1)
 */
router.get('/events', calendarController.getEvents);

/**
 * @route GET /api/calendar/events/:eventId
 * @desc Get single calendar event
 * @access Private
 */
router.get('/events/:eventId', calendarController.getEvent);

/**
 * @route POST /api/calendar/events
 * @desc Create calendar event in external provider
 * @access Private
 * @body {number} integrationId - Integration to use for creation
 * @body {string} title - Event title
 * @body {string} description - Event description
 * @body {string} startDateTime - Event start time (ISO string)
 * @body {string} endDateTime - Event end time (ISO string)
 * @body {string} timezone - Event timezone (default: UTC)
 * @body {string} location - Event location
 * @body {array} attendees - Event attendees
 * @body {number} leadId - Associated lead ID
 */
router.post('/events', calendarController.createEvent);

/**
 * @route POST /api/calendar/sync
 * @desc Sync calendar events for user
 * @access Private
 * @body {string} provider - Optional provider to sync (google_calendar, microsoft_calendar)
 */
router.post('/sync', calendarController.syncEvents);

/**
 * @route PUT /api/calendar/events/:eventId/lead
 * @desc Link calendar event to lead
 * @access Private
 * @body {number} leadId - Lead ID to link (null to unlink)
 */
router.put('/events/:eventId/lead', calendarController.linkToLead);

/**
 * @route GET /api/calendar/export
 * @desc Export events to ICS format
 * @access Private
 * @query {string} startDate - Start date filter (ISO string)
 * @query {string} endDate - End date filter (ISO string)
 * @query {string} provider - Provider filter
 */
router.get('/export', calendarController.exportEvents);

/**
 * @route GET /api/calendar/stats
 * @desc Get calendar statistics
 * @access Private
 * @query {string} timeframe - Timeframe for stats (7d, 30d, 90d)
 */
router.get('/stats', calendarController.getStats);

module.exports = router;