/**
 * Authentication and Authorization Middleware
 * Implements JWT-based authentication with role-based access control
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Environment variables with secure defaults
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Rate limiting for authentication attempts
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for successful authentications
    return req.skipRateLimit === true;
  }
});

// User roles and permissions
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  AGENT: 'agent',
  VIEWER: 'viewer'
};

const PERMISSIONS = {
  // User management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Lead management
  LEAD_CREATE: 'lead:create',
  LEAD_READ: 'lead:read',
  LEAD_UPDATE: 'lead:update',
  LEAD_DELETE: 'lead:delete',
  
  // Call management
  CALL_CREATE: 'call:create',
  CALL_READ: 'call:read',
  CALL_UPDATE: 'call:update',
  CALL_DELETE: 'call:delete',
  
  // Analytics and reporting
  ANALYTICS_READ: 'analytics:read',
  REPORTS_CREATE: 'reports:create',
  
  // System administration
  SYSTEM_CONFIG: 'system:config',
  AUDIT_LOGS: 'audit:read'
};

// Role-permission mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE,
    PERMISSIONS.LEAD_CREATE, PERMISSIONS.LEAD_READ, PERMISSIONS.LEAD_UPDATE, PERMISSIONS.LEAD_DELETE,
    PERMISSIONS.CALL_CREATE, PERMISSIONS.CALL_READ, PERMISSIONS.CALL_UPDATE, PERMISSIONS.CALL_DELETE,
    PERMISSIONS.ANALYTICS_READ, PERMISSIONS.REPORTS_CREATE,
    PERMISSIONS.AUDIT_LOGS
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.LEAD_READ, PERMISSIONS.LEAD_UPDATE,
    PERMISSIONS.CALL_CREATE, PERMISSIONS.CALL_READ, PERMISSIONS.CALL_UPDATE,
    PERMISSIONS.ANALYTICS_READ, PERMISSIONS.REPORTS_CREATE
  ],
  [ROLES.AGENT]: [
    PERMISSIONS.LEAD_READ, PERMISSIONS.LEAD_UPDATE,
    PERMISSIONS.CALL_CREATE, PERMISSIONS.CALL_READ, PERMISSIONS.CALL_UPDATE
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.LEAD_READ,
    PERMISSIONS.CALL_READ,
    PERMISSIONS.ANALYTICS_READ
  ]
};

/**
 * Password hashing utilities
 */
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    throw new Error('Password hashing failed');
  }
};

const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * JWT token utilities
 */
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role] || []
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'coldcaller-api',
    subject: user.id.toString()
  });

  const refreshToken = jwt.sign(
    { id: user.id, tokenVersion: user.tokenVersion || 1 },
    JWT_REFRESH_SECRET,
    {
      expiresIn: '7d',
      issuer: 'coldcaller-api',
      subject: user.id.toString()
    }
  );

  return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'coldcaller-api'
    });
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'coldcaller-api'
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Authentication middleware
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access token required',
          status: 401,
          code: 'MISSING_TOKEN'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyAccessToken(token);
    
    // Add user information to request
    req.user = decoded;
    req.skipRateLimit = true; // Skip rate limiting for authenticated requests
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired token',
        status: 401,
        code: 'INVALID_TOKEN'
      }
    });
  }
};

/**
 * Authorization middleware factory
 */
const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          status: 401,
          code: 'NOT_AUTHENTICATED'
        }
      });
    }

    const userPermissions = req.user.permissions || [];
    
    // Check if user has all required permissions
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          status: 403,
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredPermissions,
          current: userPermissions
        }
      });
    }

    next();
  };
};

/**
 * Role-based authorization middleware
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          status: 401,
          code: 'NOT_AUTHENTICATED'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          status: 403,
          code: 'INSUFFICIENT_ROLE',
          required: allowedRoles,
          current: req.user.role
        }
      });
    }

    next();
  };
};

/**
 * Resource ownership verification
 */
const requireOwnership = (resourceIdParam = 'id', userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          status: 401,
          code: 'NOT_AUTHENTICATED'
        }
      });
    }

    // Super admins can access any resource
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;

    // For POST requests, check the body
    if (req.method === 'POST' && req.body[userIdField] && req.body[userIdField] !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Cannot create resources for other users',
          status: 403,
          code: 'OWNERSHIP_VIOLATION'
        }
      });
    }

    // For other requests, we'll need to validate ownership at the controller level
    // This middleware just sets up the ownership context
    req.ownershipCheck = {
      resourceId,
      userId,
      userIdField
    };

    next();
  };
};

/**
 * Input validation for authentication
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          status: 400,
          code: 'VALIDATION_ERROR',
          details: errors.array()
        }
      });
    }
    next();
  }
];

const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least 8 characters with uppercase, lowercase, number, and special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage('Invalid role specified'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          status: 400,
          code: 'VALIDATION_ERROR',
          details: errors.array()
        }
      });
    }
    next();
  }
];

/**
 * Multi-factor authentication setup (placeholder)
 * TODO: Implement actual MFA with TOTP/SMS
 */
const requireMFA = (req, res, next) => {
  // For now, just log MFA requirement
  console.log('MFA check required for user:', req.user?.id);
  
  // TODO: Implement actual MFA verification
  // if (!req.headers['x-mfa-token']) {
  //   return res.status(401).json({
  //     success: false,
  //     error: {
  //       message: 'Multi-factor authentication required',
  //       status: 401,
  //       code: 'MFA_REQUIRED'
  //     }
  //   });
  // }
  
  next();
};

/**
 * Security logging middleware
 */
const securityLogger = (event, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown'
  };
  
  // TODO: Implement proper security logging to database/external service
  console.log('SECURITY_LOG:', JSON.stringify(logEntry));
  
  // TODO: Implement alerting for critical security events
  if (event.includes('FAILED') || event.includes('VIOLATION')) {
    console.warn('SECURITY_ALERT:', logEntry);
  }
};

module.exports = {
  // Constants
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  
  // Password utilities
  hashPassword,
  comparePassword,
  
  // JWT utilities
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  
  // Middleware
  authRateLimit,
  authenticate,
  authorize,
  requireRole,
  requireOwnership,
  requireMFA,
  
  // Validation
  validateLogin,
  validateRegister,
  
  // Security logging
  securityLogger
};