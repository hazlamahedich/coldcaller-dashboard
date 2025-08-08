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

module.exports = router;