const express = require('express');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadStats
} = require('../controllers/leadsController');

const {
  bulkImportLeads,
  bulkUpdateLeads,
  bulkDeleteLeads,
  findDuplicates,
  mergeLeadsEndpoint,
  getLeadScoreBreakdown,
  getLeadTimeline,
  exportLeads,
  batchEnrichLeads,
  getLeadAnalytics
} = require('../controllers/advancedLeadsController');

const router = express.Router();

// Validation rules for lead creation
const createLeadValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required and must be between 1-100 characters'),
  body('company')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company is required and must be between 1-100 characters'),
  body('phone')
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Valid phone number is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('status')
    .optional()
    .isIn(['New', 'Follow-up', 'Qualified', 'Converted', 'Lost'])
    .withMessage('Status must be one of: New, Follow-up, Qualified, Converted, Lost'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Validation rules for lead updates
const updateLeadValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1-100 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company must be between 1-100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Valid phone number is required'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('status')
    .optional()
    .isIn(['New', 'Follow-up', 'Qualified', 'Converted', 'Lost'])
    .withMessage('Status must be one of: New, Follow-up, Qualified, Converted, Lost'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Routes
/**
 * @route   GET /api/leads
 * @desc    Get all leads with optional filtering and pagination
 * @query   status, page, limit, search
 * @access  Public
 */
router.get('/', getAllLeads);

/**
 * @route   GET /api/leads/stats
 * @desc    Get lead statistics
 * @access  Public
 */
router.get('/stats', getLeadStats);

/**
 * @route   GET /api/leads/:id
 * @desc    Get a specific lead by ID
 * @access  Public
 */
router.get('/:id', getLeadById);

/**
 * @route   POST /api/leads
 * @desc    Create a new lead
 * @access  Public
 */
router.post('/', createLeadValidation, handleValidationErrors, createLead);

/**
 * @route   PUT /api/leads/:id
 * @desc    Update a lead
 * @access  Public
 */
router.put('/:id', updateLeadValidation, handleValidationErrors, updateLead);

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete a lead
 * @access  Public
 */
router.delete('/:id', deleteLead);

// Advanced Lead Management Routes

/**
 * @route   POST /api/leads/bulk/import
 * @desc    Bulk import leads with duplicate detection
 * @access  Public
 */
router.post('/bulk/import', bulkImportLeads);

/**
 * @route   PUT /api/leads/bulk/update
 * @desc    Bulk update multiple leads
 * @access  Public
 */
router.put('/bulk/update', bulkUpdateLeads);

/**
 * @route   DELETE /api/leads/bulk/delete
 * @desc    Bulk delete multiple leads
 * @access  Public
 */
router.delete('/bulk/delete', bulkDeleteLeads);

/**
 * @route   GET /api/leads/duplicates
 * @desc    Find duplicate leads with similarity analysis
 * @access  Public
 */
router.get('/duplicates', findDuplicates);

/**
 * @route   POST /api/leads/merge
 * @desc    Merge two leads with customizable rules
 * @access  Public
 */
router.post('/merge', mergeLeadsEndpoint);

/**
 * @route   GET /api/leads/:id/score
 * @desc    Get detailed lead score breakdown
 * @access  Public
 */
router.get('/:id/score', getLeadScoreBreakdown);

/**
 * @route   GET /api/leads/:id/timeline
 * @desc    Get lead activity timeline
 * @access  Public
 */
router.get('/:id/timeline', getLeadTimeline);

/**
 * @route   GET /api/leads/export
 * @desc    Export leads in various formats
 * @access  Public
 */
router.get('/export', exportLeads);

/**
 * @route   POST /api/leads/enrich
 * @desc    Batch enrich leads with external data
 * @access  Public
 */
router.post('/enrich', batchEnrichLeads);

/**
 * @route   GET /api/leads/analytics
 * @desc    Get comprehensive lead analytics
 * @access  Public
 */
router.get('/analytics', getLeadAnalytics);

module.exports = router;