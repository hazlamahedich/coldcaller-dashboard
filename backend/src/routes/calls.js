const express = require('express');
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  getAllCallLogs,
  getCallLogById,
  createCallLog,
  updateCallLog,
  deleteCallLog,
  getCallStats,
  getCallLogsByLead,
  startCall,
  updateCallStatus,
  endCall,
  startRecording,
  stopRecording,
  getRecording,
  getAllRecordings,
  deleteRecording,
  getCallAnalytics,
  getRealTimeMetrics
} = require('../controllers/callsController');

const router = express.Router();

// Validation rules for call log creation
const createCallLogValidation = [
  body('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer'),
  body('leadName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Lead name must be between 1-100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Valid phone number is required'),
  body('duration')
    .optional()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('Duration must be in MM:SS format (e.g., 5:23)'),
  body('outcome')
    .optional()
    .isIn(['Interested', 'Not Interested', 'Voicemail', 'No Answer', 'Busy', 'Callback Requested'])
    .withMessage('Outcome must be one of: Interested, Not Interested, Voicemail, No Answer, Busy, Callback Requested'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Validation rules for call log updates
const updateCallLogValidation = [
  body('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer'),
  body('leadName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Lead name must be between 1-100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Valid phone number is required'),
  body('duration')
    .optional()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('Duration must be in MM:SS format (e.g., 5:23)'),
  body('outcome')
    .optional()
    .isIn(['Interested', 'Not Interested', 'Voicemail', 'No Answer', 'Busy', 'Callback Requested'])
    .withMessage('Outcome must be one of: Interested, Not Interested, Voicemail, No Answer, Busy, Callback Requested'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Validation for stats query
const statsValidation = [
  query('period')
    .optional()
    .isIn(['all', 'today', 'week', 'month'])
    .withMessage('Period must be one of: all, today, week, month')
];

// Real-time call management validation
const startCallValidation = [
  body('leadId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Lead ID must be a positive integer'),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      // More flexible phone number validation for international numbers
      // Allow: +, digits, spaces, dashes, dots, parentheses
      const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{8,20}$/;
      const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
      
      // Must start with digit 1-9 after cleaning, and have appropriate length
      if (!phoneRegex.test(value) || !/^[\+]?[1-9]\d*$/.test(cleanPhone) || cleanPhone.length < 8 || cleanPhone.length > 16) {
        throw new Error('Invalid phone number format. Must be 8-16 digits, optionally starting with + and may contain spaces, dashes, dots, or parentheses');
      }
      return true;
    }),
  body('agentId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Agent ID must be 1-50 characters'),
  body('campaignId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Campaign ID must be 1-50 characters')
];

const updateCallStatusValidation = [
  body('status')
    .isIn(['connecting', 'ringing', 'connected', 'on-hold', 'ended', 'failed'])
    .withMessage('Status must be one of: connecting, ringing, connected, on-hold, ended, failed'),
  body('quality')
    .optional()
    .isObject()
    .withMessage('Quality must be an object'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Routes
/**
 * @route   POST /api/calls/start
 * @desc    Start a new call with SIP integration
 * @access  Private
 */
router.post('/start', startCallValidation, handleValidationErrors, startCall);

/**
 * @route   PUT /api/calls/:id/update
 * @desc    Update call status and metrics in real-time
 * @access  Private
 */
router.put('/:id/update', updateCallStatusValidation, handleValidationErrors, updateCallStatus);

/**
 * @route   POST /api/calls/:id/end
 * @desc    End active call and finalize logging
 * @access  Private
 */
router.post('/:id/end', endCall);

/**
 * @route   POST /api/calls/:id/recording/start
 * @desc    Start call recording
 * @access  Private
 */
router.post('/:id/recording/start', startRecording);

/**
 * @route   POST /api/calls/:id/recording/stop
 * @desc    Stop call recording
 * @access  Private
 */
router.post('/:id/recording/stop', stopRecording);

/**
 * @route   GET /api/calls/:id/recording
 * @desc    Stream or download call recording
 * @access  Private
 */
router.get('/:id/recording', getRecording);

/**
 * @route   GET /api/calls/recordings
 * @desc    Get all call recordings with metadata
 * @access  Private
 */
router.get('/recordings', getAllRecordings);

/**
 * @route   DELETE /api/calls/:id/recording
 * @desc    Delete call recording file
 * @access  Private
 */
router.delete('/:id/recording', deleteRecording);

/**
 * @route   GET /api/calls/analytics
 * @desc    Get comprehensive call analytics and reporting
 * @access  Private
 */
router.get('/analytics', getCallAnalytics);

/**
 * @route   GET /api/calls/metrics/realtime
 * @desc    Get real-time call metrics and system status
 * @access  Public
 */
router.get('/metrics/realtime', getRealTimeMetrics);

/**
 * @route   GET /api/calls
 * @desc    Get all call logs with optional filtering and pagination
 * @query   outcome, leadId, date, page, limit
 * @access  Public
 */
router.get('/', getAllCallLogs);

/**
 * @route   GET /api/calls/stats/today
 * @desc    Get today's call statistics
 * @access  Public
 */
router.get('/stats/today', (req, res) => {
  req.query.period = 'today';
  getCallStats(req, res);
});

/**
 * @route   GET /api/calls/recent
 * @desc    Get recent call logs
 * @query   limit (optional: number of calls to return, default 10)
 * @access  Public
 */
router.get('/recent', (req, res) => {
  const { limit = 10 } = req.query;
  req.query.limit = limit;
  req.query.page = 1;
  getAllCallLogs(req, res);
});

/**
 * @route   GET /api/calls/stats
 * @desc    Get call statistics
 * @query   period (optional: all, today, week, month)
 * @access  Public
 */
router.get('/stats', statsValidation, handleValidationErrors, getCallStats);

/**
 * @route   GET /api/calls/lead/:leadId
 * @desc    Get all call logs for a specific lead
 * @access  Public
 */
router.get('/lead/:leadId', getCallLogsByLead);

/**
 * @route   GET /api/calls/:id
 * @desc    Get a specific call log by ID
 * @access  Public
 */
router.get('/:id', getCallLogById);

/**
 * @route   POST /api/calls
 * @desc    Create a new call log
 * @access  Public
 */
router.post('/', createCallLogValidation, handleValidationErrors, createCallLog);

/**
 * @route   PUT /api/calls/:id
 * @desc    Update a call log
 * @access  Public
 */
router.put('/:id', updateCallLogValidation, handleValidationErrors, updateCallLog);

/**
 * @route   DELETE /api/calls/:id
 * @desc    Delete a call log
 * @access  Public
 */
router.delete('/:id', deleteCallLog);

module.exports = router;