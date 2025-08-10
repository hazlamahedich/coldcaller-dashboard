/**
 * Meeting Routes
 * Handles all meeting-related API endpoints
 */

const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { authenticate } = require('../middleware/auth');

// All meeting routes require authentication
router.use(authenticate);

// Meeting CRUD operations
router.get('/', meetingController.getMeetings);
router.get('/:meetingId', meetingController.getMeeting);
router.post('/', meetingController.createMeeting);
router.patch('/:meetingId', meetingController.updateMeeting);
router.delete('/:meetingId', meetingController.cancelMeeting);

// Calendar availability
router.post('/availability', meetingController.getAvailability);

module.exports = router;