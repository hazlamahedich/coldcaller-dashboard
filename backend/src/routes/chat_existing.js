/**
 * Chat Routes for RAG Chatbot
 * Handles all chat-related API endpoints with authentication, rate limiting, and validation
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize, requireRole, ROLES, PERMISSIONS } = require('../middleware/auth');
const {
  validateChatQuery,
  validateDocumentIndexing,
  validateFeedback,
  validateConversationId,
  validateAnalyticsQuery,
  validateConversationQuery,
  chatRateLimitConfig,
  validateContentSafety,
  enrichRequestContext
} = require('../middleware/chatValidation');

const {
  processChatQuery,
  getConversationHistory,
  indexDocuments,
  submitFeedback,
  getChatAnalytics,
  deleteConversation
} = require('../controllers/chatController');

const router = express.Router();

// Apply request context enrichment to all chat routes
router.use(enrichRequestContext);

// Rate limiters for different endpoints
const queryRateLimit = rateLimit({
  windowMs: chatRateLimitConfig.query.windowMs,
  max: chatRateLimitConfig.query.max,
  message: {
    success: false,
    error: {
      message: chatRateLimitConfig.query.message,
      code: 'CHAT_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(chatRateLimitConfig.query.windowMs / 1000)
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `chat_query_${req.user?.id || req.ip}`,
  handler: (req, res) => {
    console.log('Chat query rate limit exceeded:', {
      userId: req.user?.id,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(429).json({
      success: false,
      error: {
        message: chatRateLimitConfig.query.message,
        code: 'CHAT_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(chatRateLimitConfig.query.windowMs / 1000)
      }
    });
  }
});

const indexingRateLimit = rateLimit({
  windowMs: chatRateLimitConfig.indexing.windowMs,
  max: chatRateLimitConfig.indexing.max,
  message: {
    success: false,
    error: {
      message: chatRateLimitConfig.indexing.message,
      code: 'INDEXING_RATE_LIMIT_EXCEEDED'
    }
  },
  keyGenerator: (req) => `chat_indexing_${req.user?.id || req.ip}`,
  skipSuccessfulRequests: true
});

const feedbackRateLimit = rateLimit({
  windowMs: chatRateLimitConfig.feedback.windowMs,
  max: chatRateLimitConfig.feedback.max,
  message: {
    success: false,
    error: {
      message: chatRateLimitConfig.feedback.message,
      code: 'FEEDBACK_RATE_LIMIT_EXCEEDED'
    }
  },
  keyGenerator: (req) => `chat_feedback_${req.user?.id || req.ip}`,
  skipSuccessfulRequests: true
});

const historyRateLimit = rateLimit({
  windowMs: chatRateLimitConfig.history.windowMs,
  max: chatRateLimitConfig.history.max,
  message: {
    success: false,
    error: {
      message: chatRateLimitConfig.history.message,
      code: 'HISTORY_RATE_LIMIT_EXCEEDED'
    }
  },
  keyGenerator: (req) => `chat_history_${req.user?.id || req.ip}`,
  skipSuccessfulRequests: true
});

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: RAG Chatbot API endpoints
 */

/**
 * @swagger
 * /api/chat/query:
 *   post:
 *     tags: [Chat]
 *     summary: Process chat query and get AI response
 *     description: Send a message to the RAG chatbot and receive an AI-generated response
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: The user's message/query
 *               conversationId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional conversation ID to continue existing conversation
 *               context:
 *                 type: object
 *                 description: Optional context information
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     response:
 *                       type: string
 *                       description: AI-generated response
 *                     conversationId:
 *                       type: string
 *                       format: uuid
 *                     confidence:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 1
 *                     sources:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           source:
 *                             type: string
 *                           section:
 *                             type: string
 *                           similarity:
 *                             type: number
 *                     model:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/query',
  authenticate,
  queryRateLimit,
  validateContentSafety,
  validateChatQuery,
  processChatQuery
);

/**
 * @swagger
 * /api/chat/conversations/{id}:
 *   get:
 *     tags: [Chat]
 *     summary: Get conversation history
 *     description: Retrieve the message history for a specific conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of messages to return
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of messages to skip
 *     responses:
 *       200:
 *         description: Conversation history retrieved
 *       404:
 *         description: Conversation not found
 *       403:
 *         description: Access denied
 */
router.get('/conversations/:id',
  authenticate,
  historyRateLimit,
  validateConversationId,
  validateConversationQuery,
  getConversationHistory
);

/**
 * @swagger
 * /api/chat/conversations/{id}:
 *   delete:
 *     tags: [Chat]
 *     summary: Delete conversation
 *     description: Delete a conversation (admin or owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       404:
 *         description: Conversation not found
 *       403:
 *         description: Access denied
 */
router.delete('/conversations/:id',
  authenticate,
  validateConversationId,
  deleteConversation
);

/**
 * @swagger
 * /api/chat/index-documents:
 *   post:
 *     tags: [Chat]
 *     summary: Index documents for vector search
 *     description: Add documents to the vector database for RAG retrieval (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - content
 *                     - title
 *                   properties:
 *                     content:
 *                       type: string
 *                       minLength: 10
 *                       maxLength: 10000
 *                     title:
 *                       type: string
 *                       minLength: 1
 *                       maxLength: 200
 *                     source:
 *                       type: string
 *                       maxLength: 100
 *                     section:
 *                       type: string
 *                       maxLength: 100
 *                     tags:
 *                       type: array
 *                       maxItems: 10
 *                       items:
 *                         type: string
 *                         maxLength: 50
 *                     intent:
 *                       type: string
 *                       enum: [how-to, troubleshooting, reference, explanation]
 *               source:
 *                 type: string
 *                 maxLength: 100
 *                 description: Source identifier for the documents
 *               overwrite:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to overwrite existing documents
 *     responses:
 *       200:
 *         description: Documents indexed successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/index-documents',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  indexingRateLimit,
  validateDocumentIndexing,
  indexDocuments
);

/**
 * @swagger
 * /api/chat/feedback:
 *   post:
 *     tags: [Chat]
 *     summary: Submit user feedback
 *     description: Submit feedback about a chat response
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *             properties:
 *               conversationId:
 *                 type: string
 *                 format: uuid
 *               messageId:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *                 maxLength: 1000
 *               category:
 *                 type: string
 *                 enum: [helpful, not-helpful, incorrect, incomplete, unclear, bug-report, feature-request]
 *     responses:
 *       200:
 *         description: Feedback submitted successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/feedback',
  authenticate,
  feedbackRateLimit,
  validateFeedback,
  submitFeedback
);

/**
 * @swagger
 * /api/chat/analytics:
 *   get:
 *     tags: [Chat]
 *     summary: Get chat analytics
 *     description: Retrieve analytics data for chat usage (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Analytics data retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         totalConversations:
 *                           type: integer
 *                         totalMessages:
 *                           type: integer
 *                         averageMessagesPerConversation:
 *                           type: number
 *                         totalFeedback:
 *                           type: integer
 *                         averageRating:
 *                           type: number
 *       403:
 *         description: Admin access required
 */
router.get('/analytics',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validateAnalyticsQuery,
  getChatAnalytics
);

// Health check endpoint for chat service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'operational',
      timestamp: new Date().toISOString(),
      service: 'chat-api',
      version: '1.0.0',
      features: {
        queryProcessing: true,
        conversationHistory: true,
        documentIndexing: true,
        feedbackCollection: true,
        analytics: true
      }
    }
  });
});

// Error handling middleware specific to chat routes
router.use((error, req, res, next) => {
  console.error('Chat route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    requestId: req.chatContext?.requestId
  });

  // Log security-related errors differently
  if (req.securityFlags && req.securityFlags.length > 0) {
    console.warn('Security flags in chat request:', {
      flags: req.securityFlags,
      userId: req.user?.id,
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        message: 'Request payload too large',
        code: 'PAYLOAD_TOO_LARGE'
      }
    });
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'CHAT_INTERNAL_ERROR',
      requestId: req.chatContext?.requestId
    }
  });
});

module.exports = router;