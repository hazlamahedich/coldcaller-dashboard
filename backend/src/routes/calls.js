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
  getCallLogsByLead
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

// Routes
/**
 * @route   GET /api/calls
 * @desc    Get all call logs with optional filtering and pagination
 * @query   outcome, leadId, date, page, limit
 * @access  Public
 */
router.get('/', getAllCallLogs);

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