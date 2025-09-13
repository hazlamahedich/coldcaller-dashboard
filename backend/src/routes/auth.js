/**
 * Authentication Routes
 * Handles authentication, registration, and user management endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const {
  authRateLimit,
  authenticate,
  validateLogin,
  validateRegister
} = require('../middleware/auth');
const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  getSecurityInfo,
  updateSecurityPreferences,
  deactivateAccount
} = require('../controllers/authController');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  validateRegister,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post('/login',
  authRateLimit,
  validateLogin,
  login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ],
  refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate tokens
 * @access  Private
 */
router.post('/logout',
  authenticate,
  logout
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  authenticate,
  getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile',
  authenticate,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1-50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1-50 characters'),
    body('phone')
      .optional()
      .trim()
      .isMobilePhone()
      .withMessage('Invalid phone number format'),
    body('company')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Company name must be less than 100 characters'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),
    body('timezone')
      .optional()
      .isIn(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC'])
      .withMessage('Invalid timezone'),
    body('avatarUrl')
      .optional()
      .isURL()
      .withMessage('Invalid avatar URL')
  ],
  updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least 8 characters with uppercase, lowercase, number, and special character'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match');
        }
        return true;
      })
  ],
  changePassword
);

/**
 * @route   GET /api/auth/security
 * @desc    Get security information (login history, sessions)
 * @access  Private
 */
router.get('/security',
  authenticate,
  getSecurityInfo
);

/**
 * @route   PUT /api/auth/security
 * @desc    Update security preferences
 * @access  Private
 */
router.put('/security',
  authenticate,
  [
    body('twoFactorEnabled')
      .optional()
      .isBoolean()
      .withMessage('Two-factor enabled must be a boolean'),
    body('notificationSettings')
      .optional()
      .isObject()
      .withMessage('Notification settings must be an object')
  ],
  updateSecurityPreferences
);

/**
 * @route   POST /api/auth/deactivate
 * @desc    Deactivate user account
 * @access  Private
 */
router.post('/deactivate',
  authenticate,
  [
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Reason must be less than 200 characters'),
    body('feedback')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Feedback must be less than 1000 characters')
  ],
  deactivateAccount
);

module.exports = router;
