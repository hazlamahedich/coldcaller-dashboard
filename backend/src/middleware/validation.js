const { body, param, query } = require('express-validator');

/**
 * Common validation rules for IDs
 */
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
];

/**
 * Common validation rules for pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation for date parameters
 */
const validateDate = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)')
];

/**
 * Validation for search queries
 */
const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1-100 characters')
];

/**
 * Lead status validation
 */
const validateLeadStatus = [
  query('status')
    .optional()
    .isIn(['New', 'Follow-up', 'Qualified', 'Converted', 'Lost'])
    .withMessage('Status must be one of: New, Follow-up, Qualified, Converted, Lost')
];

/**
 * Call outcome validation
 */
const validateCallOutcome = [
  query('outcome')
    .optional()
    .isIn(['Interested', 'Not Interested', 'Voicemail', 'No Answer', 'Busy', 'Callback Requested'])
    .withMessage('Outcome must be one of: Interested, Not Interested, Voicemail, No Answer, Busy, Callback Requested')
];

/**
 * Audio category validation
 */
const validateAudioCategory = [
  query('category')
    .optional()
    .isIn(['greetings', 'objections', 'closing', 'general'])
    .withMessage('Category must be one of: greetings, objections, closing, general')
];

/**
 * Script category validation
 */
const validateScriptCategory = [
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1-50 characters')
];

/**
 * Phone number validation
 */
const validatePhoneNumber = [
  body('phone')
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Valid phone number is required')
];

/**
 * Email validation
 */
const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required')
];

/**
 * Duration validation (MM:SS format)
 */
const validateDuration = [
  body('duration')
    .optional()
    .matches(/^\d{1,2}:\d{2}$/)
    .withMessage('Duration must be in MM:SS format (e.g., 5:23)')
];

/**
 * URL validation
 */
const validateUrl = [
  body('url')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: false })
    .withMessage('URL must be a valid URL')
];

/**
 * Text length validation
 */
const validateTextLength = (field, min = 1, max = 1000) => [
  body(field)
    .trim()
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min}-${max} characters`)
];

/**
 * Optional text length validation
 */
const validateOptionalTextLength = (field, min = 1, max = 1000) => [
  body(field)
    .optional()
    .trim()
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min}-${max} characters`)
];

module.exports = {
  validateId,
  validatePagination,
  validateDate,
  validateSearch,
  validateLeadStatus,
  validateCallOutcome,
  validateAudioCategory,
  validateScriptCategory,
  validatePhoneNumber,
  validateEmail,
  validateDuration,
  validateUrl,
  validateTextLength,
  validateOptionalTextLength
};