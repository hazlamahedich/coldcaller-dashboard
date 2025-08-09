/**
 * Enhanced Security Middleware
 * Comprehensive security controls for input validation, XSS protection, and data sanitization
 */

const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

/**
 * Enhanced XSS Protection Middleware
 */
const xssProtection = (req, res, next) => {
  // Sanitize all string inputs recursively
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      // Use DOMPurify for HTML content sanitization
      let sanitized = DOMPurify.sanitize(obj, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [], // No attributes allowed
        KEEP_CONTENT: true // Keep text content
      });
      
      // Additional XSS pattern detection and removal
      sanitized = sanitized
        .replace(/javascript:/gi, 'blocked:')
        .replace(/on\w+\s*=/gi, 'blocked=')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/data:(?:text\/html|application\/javascript)/gi, 'blocked:')
        .replace(/vbscript:/gi, 'blocked:')
        .replace(/expression\s*\(/gi, 'blocked(');
      
      return sanitized.trim();
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj !== null && typeof obj === 'object') {
      const sanitizedObj = {};
      for (const [key, value] of Object.entries(obj)) {
        // Also sanitize keys
        const sanitizedKey = validator.escape(key);
        sanitizedObj[sanitizedKey] = sanitizeObject(value);
      }
      return sanitizedObj;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * SQL Injection Prevention Middleware
 */
const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /('(''|[^'])*')/gi,
    /(;|\||&|\$|\+|,|\(|\)|'|"|`)/gi,
    /(\b(SLEEP|BENCHMARK|WAITFOR)\s*\()/gi,
    /(\/\*[\s\S]*?\*\/)/gi,
    /(--[\s\S]*$)/gmi,
    /(\bINTO\s+(OUTFILE|DUMPFILE))/gi,
    /(\bLOAD_FILE\s*\()/gi,
    /(\bSYSTEM\s*\()/gi
  ];

  // Fields that should be exempt from certain SQL injection patterns
  const phoneNumberFields = ['phoneNumber', 'phone'];
  const specialCharacterPattern = /(;|\||&|\$|\+|,|\(|\)|'|"|`)/gi; // Pattern 4

  const isPhoneField = (path) => {
    const fieldName = path.split('.').pop();
    return phoneNumberFields.includes(fieldName);
  };

  const isValidPhoneNumber = (value) => {
    // Clean the phone number by removing spaces, dashes, parentheses
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
    
    // E.164 format: +1234567890 to +123456789012345 (after cleaning)
    return /^\+[1-9]\d{1,14}$/.test(cleaned);
  };

  const checkForSqlInjection = (obj, path = '') => {
    if (typeof obj === 'string') {
      for (let i = 0; i < sqlPatterns.length; i++) {
        const pattern = sqlPatterns[i];
        
        
        // Special handling for phone number fields and the special character pattern
        if (i === 3 && isPhoneField(path)) { // Pattern 4: special characters
          // If this is a phone field and contains a valid phone number, skip the + check
          if (isValidPhoneNumber(obj)) {
            continue; // Skip this pattern for valid phone numbers
          }
        }
        
        if (pattern.test(obj)) {
          console.warn(`Potential SQL injection detected at ${path}:`, obj);
          
          // Log security incident
          console.log('SECURITY_ALERT:', {
            type: 'SQL_INJECTION_ATTEMPT',
            path,
            value: obj,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            pattern: `Pattern ${i + 1}`,
            isPhoneField: isPhoneField(path)
          });
          
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid input detected',
              status: 400,
              code: 'SECURITY_VIOLATION'
            }
          });
        }
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const result = checkForSqlInjection(obj[i], `${path}[${i}]`);
        if (result) return result;
      }
    } else if (obj !== null && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const result = checkForSqlInjection(value, path ? `${path}.${key}` : key);
        if (result) return result;
      }
    }
    return null;
  };

  // Check body
  if (req.body) {
    const result = checkForSqlInjection(req.body, 'body');
    if (result) return result;
  }

  // Check query
  if (req.query) {
    const result = checkForSqlInjection(req.query, 'query');
    if (result) return result;
  }

  // Check params
  if (req.params) {
    const result = checkForSqlInjection(req.params, 'params');
    if (result) return result;
  }

  next();
};

/**
 * Input Size Limiting Middleware
 */
const inputSizeLimits = {
  // Field-specific size limits (in characters)
  email: 254,
  password: 128,
  firstName: 50,
  lastName: 50,
  phone: 20,
  company: 100,
  title: 100,
  notes: 2000,
  description: 1000,
  address: 500,
  url: 2048,
  
  // Default limits
  shortText: 255,
  mediumText: 1000,
  longText: 10000
};

const inputSizeValidation = (req, res, next) => {
  const checkSize = (obj, limits, path = '') => {
    if (typeof obj === 'string') {
      const limit = limits[path.split('.').pop()] || limits.mediumText;
      if (obj.length > limit) {
        return res.status(413).json({
          success: false,
          error: {
            message: `Input too large for field ${path}. Maximum ${limit} characters allowed.`,
            status: 413,
            code: 'INPUT_TOO_LARGE',
            field: path,
            maxLength: limit,
            actualLength: obj.length
          }
        });
      }
    } else if (Array.isArray(obj)) {
      // Limit array size
      if (obj.length > 100) {
        return res.status(413).json({
          success: false,
          error: {
            message: `Array too large at ${path}. Maximum 100 items allowed.`,
            status: 413,
            code: 'ARRAY_TOO_LARGE'
          }
        });
      }
      
      for (let i = 0; i < obj.length; i++) {
        const result = checkSize(obj[i], limits, `${path}[${i}]`);
        if (result) return result;
      }
    } else if (obj !== null && typeof obj === 'object') {
      // Limit object depth and keys
      if (Object.keys(obj).length > 50) {
        return res.status(413).json({
          success: false,
          error: {
            message: `Too many object keys at ${path}. Maximum 50 keys allowed.`,
            status: 413,
            code: 'OBJECT_TOO_LARGE'
          }
        });
      }
      
      for (const [key, value] of Object.entries(obj)) {
        const result = checkSize(value, limits, path ? `${path}.${key}` : key);
        if (result) return result;
      }
    }
    return null;
  };

  if (req.body) {
    const result = checkSize(req.body, inputSizeLimits);
    if (result) return result;
  }

  next();
};

/**
 * Advanced Rate Limiting with Progressive Delays
 */
const createAdvancedRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // requests per window
    slowDownAfter = 50, // start slowing down after this many requests
    delayAfter = 25, // start delaying after this many requests
    delayMs = 500, // delay increment in ms
    maxDelayMs = 20000, // maximum delay
    message = 'Too many requests',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  // Create rate limiter
  const limiter = rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message,
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res) => {
      console.log('SECURITY_ALERT:', {
        type: 'RATE_LIMIT_EXCEEDED',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        timestamp: new Date().toISOString()
      });
      
      res.status(429).json({
        success: false,
        error: {
          message,
          status: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(windowMs / 1000)
        }
      });
    }
  });

  // Create slow down middleware with fixed deprecation warning
  const slowDownLimiter = slowDown({
    windowMs,
    delayAfter,
    delayMs: () => delayMs, // Fixed deprecation warning
    maxDelayMs,
    skipSuccessfulRequests,
    skipFailedRequests,
    validate: { delayMs: false } // Disable deprecation warning
  });

  return [slowDownLimiter, limiter];
};

/**
 * File Upload Security Middleware
 */
const secureFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files || [req.file];
  
  // Allowed file types and their MIME types
  const allowedTypes = {
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/aac': ['.aac'],
    'audio/flac': ['.flac'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
  };

  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const maxFiles = 10;

  if (files.length > maxFiles) {
    return res.status(413).json({
      success: false,
      error: {
        message: `Too many files. Maximum ${maxFiles} files allowed.`,
        status: 413,
        code: 'TOO_MANY_FILES'
      }
    });
  }

  for (const file of files) {
    // Check file size
    if (file.size > maxFileSize) {
      return res.status(413).json({
        success: false,
        error: {
          message: `File too large: ${file.originalname}. Maximum size: ${maxFileSize / (1024 * 1024)}MB`,
          status: 413,
          code: 'FILE_TOO_LARGE'
        }
      });
    }

    // Check MIME type
    if (!allowedTypes[file.mimetype]) {
      console.log('SECURITY_ALERT:', {
        type: 'INVALID_FILE_TYPE',
        filename: file.originalname,
        mimetype: file.mimetype,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid file type: ${file.mimetype}. Allowed types: ${Object.keys(allowedTypes).join(', ')}`,
          status: 400,
          code: 'INVALID_FILE_TYPE'
        }
      });
    }

    // Check file extension matches MIME type
    const fileExtension = require('path').extname(file.originalname).toLowerCase();
    const allowedExtensions = allowedTypes[file.mimetype];
    
    if (!allowedExtensions.includes(fileExtension)) {
      console.log('SECURITY_ALERT:', {
        type: 'MIME_TYPE_MISMATCH',
        filename: file.originalname,
        extension: fileExtension,
        mimetype: file.mimetype,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        error: {
          message: `File extension ${fileExtension} does not match MIME type ${file.mimetype}`,
          status: 400,
          code: 'MIME_TYPE_MISMATCH'
        }
      });
    }

    // Sanitize filename
    file.originalname = validator.escape(file.originalname)
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100);
  }

  next();
};

/**
 * Request Signature Validation (for webhook security)
 */
const validateRequestSignature = (secret) => {
  return (req, res, next) => {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!signature || !timestamp) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Missing security headers',
          status: 401,
          code: 'MISSING_SECURITY_HEADERS'
        }
      });
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    
    if (Math.abs(now - requestTime) > 300) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Request timestamp invalid',
          status: 401,
          code: 'INVALID_TIMESTAMP'
        }
      });
    }

    // Verify signature
    const crypto = require('crypto');
    const payload = timestamp + req.rawBody;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.log('SECURITY_ALERT:', {
        type: 'INVALID_REQUEST_SIGNATURE',
        signature,
        expectedSignature,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid request signature',
          status: 401,
          code: 'INVALID_SIGNATURE'
        }
      });
    }

    next();
  };
};

/**
 * Content Security Policy Configuration
 */
const getCSPDirectives = () => {
  return {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:"],
    mediaSrc: ["'self'", "data:", "blob:"],
    connectSrc: ["'self'", "wss:", "ws:"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"]
  };
};

module.exports = {
  xssProtection,
  sqlInjectionProtection,
  inputSizeValidation,
  inputSizeLimits,
  createAdvancedRateLimit,
  secureFileUpload,
  validateRequestSignature,
  getCSPDirectives
};