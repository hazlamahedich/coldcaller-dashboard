/**
 * Enhanced Call Logging Routes
 * Advanced call documentation and coaching API endpoints
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
const rateLimit = require('express-rate-limit');

const {
  logCall,
  getCallHistory,
  updateCallNotes,
  scheduleFollowUp,
  getCallAnalytics,
  transcribeCall,
  addCoachingFeedback,
  getCoachingDashboard,
  bulkImportCalls,
  exportCalls
} = require('../controllers/enhancedCallsController');

const router = express.Router();

// Rate limiting for API endpoints
const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const bulkRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit bulk operations to 5 per hour
  message: 'Bulk operations are limited to 5 per hour.'
});

// Validation schemas

const callLogValidation = [
  body('leadId')
    .isUUID()
    .withMessage('Lead ID must be a valid UUID'),
  
  body('phoneNumber')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Phone number must be in valid international format'),
  
  body('direction')
    .isIn(['inbound', 'outbound'])
    .withMessage('Direction must be either inbound or outbound'),
  
  body('status')
    .isIn(['initiated', 'ringing', 'answered', 'busy', 'failed', 'voicemail', 'completed'])
    .withMessage('Status must be a valid call status'),
  
  body('outcome')
    .optional()
    .isIn(['connected', 'voicemail', 'no_answer', 'busy', 'failed', 'interested', 'not_interested', 'callback_requested', 'meeting_scheduled', 'qualified', 'disqualified', 'dnc', 'wrong_number'])
    .withMessage('Outcome must be a valid call outcome'),
  
  body('disposition')
    .optional()
    .isIn(['connected', 'voicemail_left', 'no_voicemail', 'busy_signal', 'no_answer', 'disconnected', 'wrong_number', 'fax_machine', 'do_not_call', 'callback_scheduled', 'meeting_scheduled', 'interested_nurture', 'qualified_handoff', 'not_interested_final'])
    .withMessage('Disposition must be a valid call disposition'),
  
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive integer in seconds'),
  
  body('callNotes')
    .optional()
    .isObject()
    .withMessage('Call notes must be an object'),
  
  body('callNotes.summary')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Call notes summary cannot exceed 500 characters'),
  
  body('callNotes.keyPoints')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Key points must be an array with maximum 10 items'),
  
  body('callNotes.keyPoints.*')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Each key point cannot exceed 200 characters'),
  
  body('callQuality')
    .optional()
    .isObject()
    .withMessage('Call quality must be an object'),
  
  body('callQuality.overallScore')
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage('Overall quality score must be between 1 and 10'),
  
  body('category')
    .optional()
    .isIn(['prospecting', 'qualification', 'demo', 'negotiation', 'closing', 'follow_up', 'support', 'renewal', 'upsell', 'retention'])
    .withMessage('Category must be a valid call category'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  
  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),
  
  body('agentId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Agent ID must be 1-100 characters'),
  
  body('agentName')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Agent name must be 1-255 characters')
];

const updateNotesValidation = [
  param('id')
    .isUUID()
    .withMessage('Call ID must be a valid UUID'),
  
  body('callNotes')
    .optional()
    .isObject()
    .withMessage('Call notes must be an object'),
  
  body('outcome')
    .optional()
    .isIn(['connected', 'voicemail', 'no_answer', 'busy', 'failed', 'interested', 'not_interested', 'callback_requested', 'meeting_scheduled', 'qualified', 'disqualified', 'dnc', 'wrong_number'])
    .withMessage('Outcome must be a valid call outcome'),
  
  body('disposition')
    .optional()
    .isIn(['connected', 'voicemail_left', 'no_voicemail', 'busy_signal', 'no_answer', 'disconnected', 'wrong_number', 'fax_machine', 'do_not_call', 'callback_scheduled', 'meeting_scheduled', 'interested_nurture', 'qualified_handoff', 'not_interested_final'])
    .withMessage('Disposition must be a valid call disposition'),
  
  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical')
];

const followUpValidation = [
  param('id')
    .isUUID()
    .withMessage('Call ID must be a valid UUID'),
  
  body('type')
    .isIn(['call', 'email', 'meeting', 'demo', 'proposal', 'contract', 'other'])
    .withMessage('Follow-up type must be valid'),
  
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('scheduledDate')
    .isISO8601()
    .toDate()
    .withMessage('Scheduled date must be a valid ISO8601 date'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  
  body('assignedTo')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Assigned to must be 1-100 characters')
];

const transcriptionValidation = [
  param('id')
    .isUUID()
    .withMessage('Call ID must be a valid UUID'),
  
  body('provider')
    .optional()
    .isIn(['whisper', 'google', 'aws', 'azure'])
    .withMessage('Provider must be whisper, google, aws, or azure'),
  
  body('language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be a valid language code'),
  
  body('includeAnalytics')
    .optional()
    .isBoolean()
    .withMessage('Include analytics must be a boolean')
];

const coachingValidation = [
  param('id')
    .isUUID()
    .withMessage('Call ID must be a valid UUID'),
  
  body('callQuality')
    .optional()
    .isObject()
    .withMessage('Call quality must be an object'),
  
  body('callQuality.overallScore')
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage('Overall score must be between 1 and 10'),
  
  body('callQuality.technicalQuality')
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage('Technical quality must be between 1 and 10'),
  
  body('coachingFeedback')
    .optional()
    .isObject()
    .withMessage('Coaching feedback must be an object'),
  
  body('coachingFeedback.strengths')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Strengths must be an array with maximum 10 items'),
  
  body('coachingFeedback.improvements')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Improvements must be an array with maximum 10 items'),
  
  body('coachingFeedback.coachNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Coach notes cannot exceed 1000 characters'),
  
  body('reviewerId')
    .isLength({ min: 1, max: 100 })
    .withMessage('Reviewer ID is required and must be 1-100 characters')
];

const historyValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('leadId')
    .optional()
    .isUUID()
    .withMessage('Lead ID must be a valid UUID'),
  
  query('agentId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Agent ID must be 1-100 characters'),
  
  query('outcome')
    .optional()
    .isIn(['connected', 'voicemail', 'no_answer', 'busy', 'failed', 'interested', 'not_interested', 'callback_requested', 'meeting_scheduled', 'qualified', 'disqualified', 'dnc', 'wrong_number'])
    .withMessage('Outcome must be a valid call outcome'),
  
  query('category')
    .optional()
    .isIn(['prospecting', 'qualification', 'demo', 'negotiation', 'closing', 'follow_up', 'support', 'renewal', 'upsell', 'retention'])
    .withMessage('Category must be a valid call category'),
  
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Date from must be a valid ISO8601 date'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Date to must be a valid ISO8601 date'),
  
  query('qualityMin')
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage('Quality minimum must be between 1 and 10'),
  
  query('qualityMax')
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage('Quality maximum must be between 1 and 10'),
  
  query('hasRecording')
    .optional()
    .isBoolean()
    .withMessage('Has recording must be a boolean'),
  
  query('hasTranscription')
    .optional()
    .isBoolean()
    .withMessage('Has transcription must be a boolean'),
  
  query('includeCoaching')
    .optional()
    .isBoolean()
    .withMessage('Include coaching must be a boolean'),
  
  query('sortBy')
    .optional()
    .isIn(['initiatedAt', 'duration', 'outcome', 'callQuality.overallScore', 'priority'])
    .withMessage('Sort by must be a valid field'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
];

const analyticsValidation = [
  query('period')
    .optional()
    .isIn(['today', 'week', 'month', 'quarter', 'year'])
    .withMessage('Period must be today, week, month, quarter, or year'),
  
  query('agentId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Agent ID must be 1-100 characters'),
  
  query('category')
    .optional()
    .isIn(['prospecting', 'qualification', 'demo', 'negotiation', 'closing', 'follow_up', 'support', 'renewal', 'upsell', 'retention'])
    .withMessage('Category must be a valid call category'),
  
  query('includeCoaching')
    .optional()
    .isBoolean()
    .withMessage('Include coaching must be a boolean'),
  
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Group by must be day, week, or month')
];

const bulkImportValidation = [
  body('calls')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Calls must be an array with 1-1000 items'),
  
  body('validateOnly')
    .optional()
    .isBoolean()
    .withMessage('Validate only must be a boolean')
];

const exportValidation = [
  query('format')
    .optional()
    .isIn(['json', 'csv', 'excel'])
    .withMessage('Format must be json, csv, or excel'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Date from must be a valid ISO8601 date'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Date to must be a valid ISO8601 date'),
  
  query('agentId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Agent ID must be 1-100 characters'),
  
  query('includeRecordings')
    .optional()
    .isBoolean()
    .withMessage('Include recordings must be a boolean'),
  
  query('includeTranscriptions')
    .optional()
    .isBoolean()
    .withMessage('Include transcriptions must be a boolean'),
  
  query('includeCoaching')
    .optional()
    .isBoolean()
    .withMessage('Include coaching must be a boolean')
];

// API Routes

/**
 * @route   POST /api/calls/enhanced/log
 * @desc    Comprehensive call logging with advanced documentation
 * @access  Private
 */
router.post('/log', 
  standardRateLimit,
  callLogValidation, 
  handleValidationErrors, 
  logCall
);

/**
 * @route   GET /api/calls/enhanced/history
 * @desc    Advanced call history with filtering and search
 * @access  Private
 */
router.get('/history',
  standardRateLimit,
  historyValidation,
  handleValidationErrors,
  getCallHistory
);

/**
 * @route   PUT /api/calls/enhanced/:id/notes
 * @desc    Update call notes and outcomes
 * @access  Private
 */
router.put('/:id/notes',
  standardRateLimit,
  updateNotesValidation,
  handleValidationErrors,
  updateCallNotes
);

/**
 * @route   POST /api/calls/enhanced/:id/follow-up
 * @desc    Schedule follow-up actions
 * @access  Private
 */
router.post('/:id/follow-up',
  standardRateLimit,
  followUpValidation,
  handleValidationErrors,
  scheduleFollowUp
);

/**
 * @route   GET /api/calls/enhanced/analytics
 * @desc    Call performance analytics
 * @access  Private
 */
router.get('/analytics',
  standardRateLimit,
  analyticsValidation,
  handleValidationErrors,
  getCallAnalytics
);

/**
 * @route   POST /api/calls/enhanced/:id/transcribe
 * @desc    Call transcription processing
 * @access  Private
 */
router.post('/:id/transcribe',
  standardRateLimit,
  transcriptionValidation,
  handleValidationErrors,
  transcribeCall
);

/**
 * @route   POST /api/calls/enhanced/:id/coaching
 * @desc    Add coaching feedback and quality scores
 * @access  Private
 */
router.post('/:id/coaching',
  standardRateLimit,
  coachingValidation,
  handleValidationErrors,
  addCoachingFeedback
);

/**
 * @route   GET /api/calls/enhanced/coaching/:agentId
 * @desc    Get coaching dashboard for agent
 * @access  Private
 */
router.get('/coaching/:agentId',
  standardRateLimit,
  param('agentId').isLength({ min: 1, max: 100 }).withMessage('Agent ID must be 1-100 characters'),
  query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']).withMessage('Period must be valid'),
  handleValidationErrors,
  getCoachingDashboard
);

/**
 * @route   POST /api/calls/enhanced/bulk-import
 * @desc    Bulk call import with validation
 * @access  Private
 */
router.post('/bulk-import',
  bulkRateLimit,
  bulkImportValidation,
  handleValidationErrors,
  bulkImportCalls
);

/**
 * @route   GET /api/calls/enhanced/export
 * @desc    Export calls data in various formats
 * @access  Private
 */
router.get('/export',
  standardRateLimit,
  exportValidation,
  handleValidationErrors,
  exportCalls
);

// Health check endpoint
/**
 * @route   GET /api/calls/enhanced/health
 * @desc    Enhanced call logging service health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Enhanced Call Logging',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'Advanced call documentation',
      'Coaching feedback system',
      'Call transcription & analytics',
      'Follow-up action tracking',
      'Bulk import/export',
      'Real-time performance metrics'
    ]
  });
});

module.exports = router;