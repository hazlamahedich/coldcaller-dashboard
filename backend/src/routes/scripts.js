const express = require('express');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  getAllScripts,
  getScriptsByType,
  getScriptById,
  createScript,
  updateScript,
  deleteScript,
  personalizeScript,
  getScriptCategories
} = require('../controllers/scriptsController');

const router = express.Router();

// Validation rules for script creation
const createScriptValidation = [
  body('id')
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('ID is required, must be 1-50 characters, and contain only letters, numbers, underscores, and hyphens'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title is required and must be between 1-100 characters'),
  body('text')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Text is required and must be between 1-2000 characters'),
  body('color')
    .optional()
    .isIn(['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'orange'])
    .withMessage('Color must be one of: blue, green, red, yellow, purple, gray, orange'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1-50 characters')
];

// Validation rules for script updates
const updateScriptValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1-100 characters'),
  body('text')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Text must be between 1-2000 characters'),
  body('color')
    .optional()
    .isIn(['blue', 'green', 'red', 'yellow', 'purple', 'gray', 'orange'])
    .withMessage('Color must be one of: blue, green, red, yellow, purple, gray, orange'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1-50 characters')
];

// Routes
/**
 * @route   GET /api/scripts
 * @desc    Get all call scripts with optional filtering
 * @query   category
 * @access  Public
 */
router.get('/', getAllScripts);

/**
 * @route   GET /api/scripts/categories
 * @desc    Get all script categories with statistics
 * @access  Public
 */
router.get('/categories', getScriptCategories);

/**
 * @route   GET /api/scripts/:type
 * @desc    Get scripts by type/category or specific script by ID
 * @access  Public
 */
router.get('/:type', getScriptsByType);

/**
 * @route   POST /api/scripts
 * @desc    Create a new script
 * @access  Public
 */
router.post('/', createScriptValidation, handleValidationErrors, createScript);

/**
 * @route   PUT /api/scripts/:id
 * @desc    Update a script
 * @access  Public
 */
router.put('/:id', updateScriptValidation, handleValidationErrors, updateScript);

/**
 * @route   DELETE /api/scripts/:id
 * @desc    Delete a script
 * @access  Public
 */
router.delete('/:id', deleteScript);

/**
 * @route   POST /api/scripts/:id/personalize
 * @desc    Personalize a script with lead and agent data
 * @access  Public
 */
router.post('/:id/personalize', personalizeScript);

module.exports = router;