const express = require('express');
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  configureSIP,
  getSIPSettings,
  testSIPConnection,
  getSIPStatus,
  updateSIPCredentials,
  getSIPProviders,
  registerSIPAccount,
  unregisterSIPAccount
} = require('../controllers/sipController');

const router = express.Router();

// Validation rules for SIP configuration
const sipConfigValidation = [
  body('provider')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Provider name is required (1-100 characters)'),
  body('server')
    .isURL({ require_protocol: false })
    .withMessage('Valid SIP server address is required'),
  body('port')
    .isInt({ min: 1, max: 65535 })
    .withMessage('Valid port number is required (1-65535)'),
  body('username')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('SIP username is required (1-100 characters)'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('SIP password is required'),
  body('domain')
    .optional()
    .isURL({ require_protocol: false })
    .withMessage('Valid domain is required'),
  body('transport')
    .optional()
    .isIn(['UDP', 'TCP', 'TLS', 'WS', 'WSS'])
    .withMessage('Transport must be one of: UDP, TCP, TLS, WS, WSS'),
  body('enableRecording')
    .optional()
    .isBoolean()
    .withMessage('enableRecording must be a boolean'),
  body('recordingPath')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Recording path cannot exceed 500 characters')
];

// Validation for credential updates
const sipCredentialValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Username must be 1-100 characters'),
  body('password')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name cannot exceed 100 characters')
];

/**
 * @route   POST /api/sip/configure
 * @desc    Configure SIP server settings
 * @access  Private
 */
router.post('/configure', sipConfigValidation, handleValidationErrors, configureSIP);

/**
 * @route   GET /api/sip/settings
 * @desc    Get current SIP configuration (sanitized)
 * @access  Private
 */
router.get('/settings', getSIPSettings);

/**
 * @route   POST /api/sip/test
 * @desc    Test SIP connection and registration
 * @access  Private
 */
router.post('/test', testSIPConnection);

/**
 * @route   GET /api/sip/status
 * @desc    Get current SIP registration status
 * @access  Public
 */
router.get('/status', getSIPStatus);

/**
 * @route   PUT /api/sip/credentials
 * @desc    Update SIP authentication credentials
 * @access  Private
 */
router.put('/credentials', sipCredentialValidation, handleValidationErrors, updateSIPCredentials);

/**
 * @route   GET /api/sip/providers
 * @desc    Get list of supported SIP providers with default configurations
 * @access  Public
 */
router.get('/providers', getSIPProviders);

/**
 * @route   POST /api/sip/register
 * @desc    Register SIP account with current configuration
 * @access  Private
 */
router.post('/register', registerSIPAccount);

/**
 * @route   POST /api/sip/unregister
 * @desc    Unregister SIP account
 * @access  Private
 */
router.post('/unregister', unregisterSIPAccount);

module.exports = router;