const express = require('express');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { upload, uploadRateLimit, validateAudioUpload, trackUploadProgress } = require('../middleware/audio/uploadMiddleware');

// Import both old and new controllers
const oldController = require('../controllers/audioController');
const newController = require('../controllers/enhancedAudioController');

const router = express.Router();

// Validation rules for audio file uploads
const uploadValidation = [
  body('category')
    .optional()
    .trim()
    .isIn(['greetings', 'objections', 'closing', 'general', 'training', 'music', 'sfx'])
    .withMessage('Category must be one of: greetings, objections, closing, general, training, music, sfx'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const tags = JSON.parse(value);
          if (!Array.isArray(tags)) return false;
          if (tags.length > 20) return false;
          return tags.every(tag => typeof tag === 'string' && tag.length <= 50);
        } catch {
          return false;
        }
      }
      return true;
    })
    .withMessage('Tags must be a valid JSON array with max 20 tags, each max 50 characters')
];

// Validation for metadata updates
const updateMetadataValidation = [
  body('category')
    .optional()
    .trim()
    .isIn(['greetings', 'objections', 'closing', 'general', 'training', 'music', 'sfx'])
    .withMessage('Category must be one of: greetings, objections, closing, general, training, music, sfx'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with max 20 tags')
    .custom((tags) => {
      return tags.every(tag => typeof tag === 'string' && tag.length <= 50);
    })
    .withMessage('Each tag must be a string with max 50 characters')
];

// Validation for audio processing
const processAudioValidation = [
  body('operation')
    .isIn(['convert_mp3', 'compress', 'normalize', 'trim', 'waveform'])
    .withMessage('Operation must be one of: convert_mp3, compress, normalize, trim, waveform'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  body('options.quality')
    .optional()
    .isIn(['high', 'medium', 'low'])
    .withMessage('Quality must be one of: high, medium, low'),
  body('options.startTime')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Start time must be a positive number'),
  body('options.duration')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Duration must be a positive number'),
  body('options.targetDb')
    .optional()
    .isFloat({ min: -50, max: 0 })
    .withMessage('Target dB must be between -50 and 0'),
  body('options.samples')
    .optional()
    .isInt({ min: 100, max: 5000 })
    .withMessage('Samples must be between 100 and 5000')
];

// Search validation
const searchValidation = [
  query('query')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query is required and must be between 1-100 characters'),
  query('category')
    .optional()
    .trim()
    .isIn(['greetings', 'objections', 'closing', 'general', 'training', 'music', 'sfx'])
    .withMessage('Category must be one of: greetings, objections, closing, general, training, music, sfx'),
  query('minDuration')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min duration must be a positive number'),
  query('maxDuration')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max duration must be a positive number')
];

// Parameter validation
const idValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid audio file ID format')
];

// =============================================================================
// NEW ENHANCED ROUTES (File Upload & Management)
// =============================================================================

/**
 * @route   POST /api/audio/upload
 * @desc    Upload multiple audio files with metadata extraction
 * @access  Public
 */
router.post('/upload',
  uploadRateLimit,
  upload.array('audioFiles', 10),
  trackUploadProgress,
  validateAudioUpload,
  uploadValidation,
  handleValidationErrors,
  newController.uploadAudioFiles
);

/**
 * @route   GET /api/audio/files
 * @desc    Get all audio files with advanced filtering and pagination
 * @query   category, tags, search, processed, page, limit, sortBy, sortOrder
 * @access  Public
 */
router.get('/files', newController.getAllAudioFiles);

/**
 * @route   GET /api/audio/file/:id
 * @desc    Stream specific audio file with range support
 * @access  Public
 */
router.get('/file/:id', idValidation, handleValidationErrors, newController.streamAudioFile);

/**
 * @route   GET /api/audio/metadata/:id
 * @desc    Get detailed metadata for specific audio file
 * @access  Public
 */
router.get('/metadata/:id', idValidation, handleValidationErrors, newController.getAudioFileMetadata);

/**
 * @route   PUT /api/audio/file/:id
 * @desc    Update audio file metadata (category, description, tags)
 * @access  Public
 */
router.put('/file/:id', 
  idValidation,
  updateMetadataValidation,
  handleValidationErrors,
  newController.updateAudioFileMetadata
);

/**
 * @route   DELETE /api/audio/file/:id
 * @desc    Delete audio file and its metadata
 * @access  Public
 */
router.delete('/file/:id', idValidation, handleValidationErrors, newController.deleteAudioFile);

/**
 * @route   POST /api/audio/process/:id
 * @desc    Process audio file (convert, compress, normalize, trim, waveform)
 * @access  Public
 */
router.post('/process/:id',
  idValidation,
  processAudioValidation,
  handleValidationErrors,
  newController.processAudioFile
);

/**
 * @route   GET /api/audio/statistics
 * @desc    Get comprehensive audio library statistics
 * @access  Public
 */
router.get('/statistics', newController.getAudioStatistics);

/**
 * @route   GET /api/audio/search
 * @desc    Advanced search for audio files
 * @query   query (required), category, tags, minDuration, maxDuration
 * @access  Public
 */
router.get('/search', searchValidation, handleValidationErrors, newController.searchAudioFiles);

// =============================================================================
// BACKWARD COMPATIBILITY ROUTES (Legacy support)
// =============================================================================

/**
 * @route   GET /api/audio
 * @desc    Get all audio clips with optional filtering and pagination (legacy)
 * @query   category, page, limit
 * @access  Public
 */
router.get('/', oldController.getAllAudioClips);

/**
 * @route   GET /api/audio/categories
 * @desc    Get all audio categories with statistics (legacy)
 * @access  Public
 */
router.get('/categories', oldController.getAudioCategories);

/**
 * @route   GET /api/audio/:category
 * @desc    Get audio clips by category (legacy)
 * @access  Public
 */
router.get('/:category', oldController.getAudioClipsByCategory);

/**
 * @route   POST /api/audio
 * @desc    Create a new audio clip (legacy)
 * @access  Public
 */
router.post('/', 
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('category').trim().isIn(['greetings', 'objections', 'closing', 'general']),
    body('duration').optional().matches(/^\d{1,2}:\d{2}$/),
    body('url').optional().isURL({ require_protocol: false })
  ],
  handleValidationErrors,
  oldController.createAudioClip
);

/**
 * @route   PUT /api/audio/:id
 * @desc    Update an audio clip (legacy)
 * @access  Public
 */
router.put('/:id',
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('category').optional().trim().isIn(['greetings', 'objections', 'closing', 'general']),
    body('duration').optional().matches(/^\d{1,2}:\d{2}$/),
    body('url').optional().isURL({ require_protocol: false })
  ],
  handleValidationErrors,
  oldController.updateAudioClip
);

/**
 * @route   DELETE /api/audio/:id
 * @desc    Delete an audio clip (legacy)
 * @access  Public
 */
router.delete('/:id', oldController.deleteAudioClip);

module.exports = router;