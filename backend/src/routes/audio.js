const express = require('express');
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  getAllAudioClips,
  getAudioClipsByCategory,
  getAudioClipById,
  createAudioClip,
  updateAudioClip,
  deleteAudioClip,
  getAudioCategories,
  searchAudioClips
} = require('../controllers/audioController');

const router = express.Router();

// Validation rules for audio clip creation
const createAudioClipValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required and must be between 1-100 characters'),
  body('category')
    .trim()
    .isIn(['greetings', 'objections', 'closing', 'general'])
    .withMessage('Category must be one of: greetings, objections, closing, general'),
  body('duration')
    .optional()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('Duration must be in MM:SS format (e.g., 1:30)'),
  body('url')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: false })
    .withMessage('URL must be a valid URL')
];

// Validation rules for audio clip updates
const updateAudioClipValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1-100 characters'),
  body('category')
    .optional()
    .trim()
    .isIn(['greetings', 'objections', 'closing', 'general'])
    .withMessage('Category must be one of: greetings, objections, closing, general'),
  body('duration')
    .optional()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('Duration must be in MM:SS format (e.g., 1:30)'),
  body('url')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: false })
    .withMessage('URL must be a valid URL')
];

// Validation for search
const searchValidation = [
  query('query')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query is required and must be between 1-100 characters')
];

// Routes
/**
 * @route   GET /api/audio
 * @desc    Get all audio clips with optional filtering and pagination
 * @query   category, page, limit
 * @access  Public
 */
router.get('/', getAllAudioClips);

/**
 * @route   GET /api/audio/categories
 * @desc    Get all audio categories with statistics
 * @access  Public
 */
router.get('/categories', getAudioCategories);

/**
 * @route   GET /api/audio/search
 * @desc    Search audio clips by name
 * @query   query (required)
 * @access  Public
 */
router.get('/search', searchValidation, handleValidationErrors, searchAudioClips);

/**
 * @route   GET /api/audio/:category
 * @desc    Get audio clips by category
 * @access  Public
 */
router.get('/:category', getAudioClipsByCategory);

/**
 * @route   POST /api/audio
 * @desc    Create a new audio clip
 * @access  Public
 */
router.post('/', createAudioClipValidation, handleValidationErrors, createAudioClip);

/**
 * @route   PUT /api/audio/:id
 * @desc    Update an audio clip
 * @access  Public
 */
router.put('/:id', updateAudioClipValidation, handleValidationErrors, updateAudioClip);

/**
 * @route   DELETE /api/audio/:id
 * @desc    Delete an audio clip
 * @access  Public
 */
router.delete('/:id', deleteAudioClip);

module.exports = router;