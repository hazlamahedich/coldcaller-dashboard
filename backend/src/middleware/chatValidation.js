/**
 * Chat Validation Middleware
 * Input validation for chat API endpoints
 */

const { body, param, query } = require('express-validator');

/**
 * Validation for chat query endpoint
 */
const validateChatQuery = [
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
    .custom((value) => {
      // Check for potentially harmful patterns
      const harmfulPatterns = [
        /system\s*:/gi,
        /assistant\s*:/gi,
        /ignore\s+(previous|above|instructions)/gi,
        /pretend\s+to\s+be/gi,
        /jailbreak/gi,
        /act\s+as\s+(?!.*customer|.*user)/gi // Allow "act as customer" but not "act as admin"
      ];
      
      if (harmfulPatterns.some(pattern => pattern.test(value))) {
        throw new Error('Message contains invalid content');
      }
      
      return true;
    }),

  body('conversationId')
    .optional()
    .isUUID(4)
    .withMessage('Conversation ID must be a valid UUID'),

  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be an object')
    .custom((value) => {
      // Limit context object size
      if (JSON.stringify(value).length > 5000) {
        throw new Error('Context data too large (max 5KB)');
      }
      return true;
    }),

  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

/**
 * Validation for document indexing endpoint
 */
const validateDocumentIndexing = [
  body('documents')
    .isArray({ min: 1, max: 100 })
    .withMessage('Documents must be an array with 1-100 items'),

  body('documents.*.content')
    .isString()
    .trim()
    .isLength({ min: 10, max: 10000 })
    .withMessage('Document content must be between 10 and 10000 characters'),

  body('documents.*.title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Document title must be between 1 and 200 characters'),

  body('documents.*.source')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Document source must be less than 100 characters'),

  body('documents.*.section')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Document section must be less than 100 characters'),

  body('documents.*.tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with max 10 items'),

  body('documents.*.tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must be less than 50 characters'),

  body('documents.*.keywords')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Keywords must be an array with max 20 items'),

  body('documents.*.keywords.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each keyword must be less than 50 characters'),

  body('documents.*.intent')
    .optional()
    .isIn(['how-to', 'troubleshooting', 'reference', 'explanation'])
    .withMessage('Intent must be one of: how-to, troubleshooting, reference, explanation'),

  body('documents.*.metadata')
    .optional()
    .isObject()
    .withMessage('Document metadata must be an object')
    .custom((value) => {
      if (JSON.stringify(value).length > 2000) {
        throw new Error('Document metadata too large (max 2KB)');
      }
      return true;
    }),

  body('source')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source must be less than 100 characters'),

  body('overwrite')
    .optional()
    .isBoolean()
    .withMessage('Overwrite must be a boolean')
];

/**
 * Validation for feedback submission endpoint
 */
const validateFeedback = [
  body('conversationId')
    .isUUID(4)
    .withMessage('Conversation ID must be a valid UUID'),

  body('messageId')
    .optional()
    .isUUID(4)
    .withMessage('Message ID must be a valid UUID'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),

  body('feedback')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must be less than 1000 characters')
    .custom((value) => {
      // Basic profanity and inappropriate content check
      const inappropriatePatterns = [
        /\b(spam|scam|fraud)\b/gi,
        /\b(hate|attack|threat)\b/gi
      ];
      
      if (inappropriatePatterns.some(pattern => pattern.test(value))) {
        console.warn('Inappropriate feedback content detected:', value);
      }
      
      return true;
    }),

  body('category')
    .optional()
    .isIn(['helpful', 'not-helpful', 'incorrect', 'incomplete', 'unclear', 'bug-report', 'feature-request'])
    .withMessage('Category must be one of: helpful, not-helpful, incorrect, incomplete, unclear, bug-report, feature-request'),

  // At least one of rating or feedback must be provided
  body()
    .custom((body) => {
      if (!body.rating && !body.feedback) {
        throw new Error('Either rating or feedback must be provided');
      }
      return true;
    })
];

/**
 * Validation for conversation ID parameter
 */
const validateConversationId = [
  param('id')
    .isUUID(4)
    .withMessage('Conversation ID must be a valid UUID')
];

/**
 * Validation for analytics query parameters
 */
const validateAnalyticsQuery = [
  query('period')
    .optional()
    .isIn(['1d', '7d', '30d', '90d'])
    .withMessage('Period must be one of: 1d, 7d, 30d, 90d'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  query('metric')
    .optional()
    .isIn(['conversations', 'messages', 'feedback', 'confidence', 'sources'])
    .withMessage('Metric must be one of: conversations, messages, feedback, confidence, sources')
];

/**
 * Validation for conversation history query parameters
 */
const validateConversationQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100')
    .toInt(),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
    .toInt(),

  query('includeMetadata')
    .optional()
    .isBoolean()
    .withMessage('Include metadata must be a boolean')
    .toBoolean()
];

/**
 * Rate limiting configuration for chat endpoints
 */
const chatRateLimitConfig = {
  // General chat queries - 50 requests per minute per user
  query: {
    windowMs: 60 * 1000, // 1 minute
    max: 50,
    message: 'Too many chat requests. Please slow down.',
    skipSuccessfulRequests: false
  },
  
  // Document indexing - 5 requests per hour (admin only)
  indexing: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Document indexing rate limit exceeded.',
    skipSuccessfulRequests: true
  },
  
  // Feedback submission - 20 requests per hour per user
  feedback: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Too many feedback submissions.',
    skipSuccessfulRequests: true
  },
  
  // Conversation history - 100 requests per hour per user
  history: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    message: 'Too many conversation history requests.',
    skipSuccessfulRequests: true
  }
};

/**
 * Content safety middleware for chat messages
 */
const validateContentSafety = (req, res, next) => {
  if (!req.body.message) {
    return next();
  }

  const message = req.body.message.toLowerCase();
  
  // Check for attempts to extract sensitive information
  const sensitivePatterms = [
    /password/gi,
    /api\s*key/gi,
    /secret/gi,
    /token/gi,
    /credentials/gi,
    /database/gi,
    /connection\s*string/gi,
    /environment\s*variable/gi
  ];

  const containsSensitive = sensitivePatterms.some(pattern => pattern.test(message));
  
  if (containsSensitive) {
    console.warn('Sensitive information request detected:', {
      userId: req.user?.id,
      message: message.substring(0, 100),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // Log security event but don't block (for monitoring)
    req.securityFlags = req.securityFlags || [];
    req.securityFlags.push('SENSITIVE_INFO_REQUEST');
  }

  next();
};

/**
 * Request context middleware
 */
const enrichRequestContext = (req, res, next) => {
  // Add request context for logging and monitoring
  req.chatContext = {
    requestId: require('uuid').v4(),
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    userRole: req.user?.role
  };

  next();
};

module.exports = {
  validateChatQuery,
  validateDocumentIndexing,
  validateFeedback,
  validateConversationId,
  validateAnalyticsQuery,
  validateConversationQuery,
  chatRateLimitConfig,
  validateContentSafety,
  enrichRequestContext
};