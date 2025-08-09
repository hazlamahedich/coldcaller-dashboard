const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const SupabaseVectorStore = require('../services/supabaseVectorStore');
const GeminiResponseGenerator = require('../services/geminiResponseGenerator');
const DocumentProcessor = require('../services/documentProcessor');
const WebSearchService = require('../services/webSearchService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Initialize services
let vectorStore;
let responseGenerator;
let documentProcessor;
let webSearchService;

// Initialize services on first request instead of module load
let initializationPromise = null;

// Initialize services asynchronously
const initializeServices = async () => {
  try {
    vectorStore = new SupabaseVectorStore();
    responseGenerator = new GeminiResponseGenerator();
    documentProcessor = new DocumentProcessor();
    webSearchService = new WebSearchService();
    
    logger.info('RAG Chat services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize RAG chat services:', error);
    throw error;
  }
};

// Rate limiting for chat endpoints
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many chat requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const indexLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit indexing requests
  message: {
    success: false,
    error: 'Too many indexing requests. Please try again later.'
  }
});

// Middleware to ensure services are ready
const ensureServicesReady = async (req, res, next) => {
  try {
    // Initialize services if not already done
    if (!initializationPromise) {
      initializationPromise = initializeServices();
    }
    
    // Wait for initialization to complete
    await initializationPromise;
    
    if (!vectorStore || !responseGenerator) {
      return res.status(503).json({
        success: false,
        error: 'RAG chat services failed to initialize. Please check configuration.'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Service initialization error:', error);
    return res.status(503).json({
      success: false,
      error: 'RAG chat services are currently unavailable. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Chat query endpoint
router.post('/query', 
  chatLimiter,
  ensureServicesReady,
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters'),
    body('conversationId')
      .optional()
      .isUUID()
      .withMessage('Conversation ID must be a valid UUID'),
    body('userId')
      .optional()
      .isUUID()
      .withMessage('User ID must be a valid UUID')
  ],
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: errors.array()
        });
      }

      const { message, conversationId, userId } = req.body;
      
      logger.info(`RAG Chat query received: "${message}" (conversation: ${conversationId || 'new'})`);

      // Search for relevant documents in internal knowledge base
      const relevantDocs = await vectorStore.similaritySearch(message, {
        matchCount: parseInt(process.env.CHAT_MAX_SOURCES) || 5,
        matchThreshold: parseFloat(process.env.CHAT_SIMILARITY_THRESHOLD) || 0.6
      });

      logger.debug(`Found ${relevantDocs.length} internal documents`, {
        similarities: relevantDocs.map(doc => ({ 
          title: doc.title, 
          similarity: doc.similarity 
        }))
      });

      // Check if we need external web search
      let allSources = [...relevantDocs];
      let searchMetadata = { webSearchPerformed: false };
      
      if (webSearchService?.needsWebSearch(message, relevantDocs)) {
        try {
          logger.info('Performing web search for enhanced results');
          const webResults = await webSearchService.search(message, {
            maxResults: 2, // Limit to 2 external sources
            includeContent: true
          });
          
          if (webResults.length > 0) {
            // Convert web results to our document format
            const webDocs = webResults.map(result => ({
              id: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: result.title,
              source: result.source || result.url,
              content: result.content || result.snippet,
              similarity: result.similarity || 0.8,
              type: 'external',
              url: result.url,
              searchType: result.type
            }));
            
            allSources = [...relevantDocs, ...webDocs];
            searchMetadata.webSearchPerformed = true;
            searchMetadata.webResultsCount = webResults.length;
            
            logger.info(`Added ${webResults.length} external sources from web search`);
          }
        } catch (webSearchError) {
          logger.warn('Web search failed, continuing with internal sources only:', webSearchError.message);
        }
      }

      // Handle case with no relevant documents at all
      if (allSources.length === 0) {
        const responseTime = Date.now() - startTime;
        logger.info(`No relevant documents found for query: "${message}"`);
        
        return res.json({
          success: true,
          response: "I couldn't find specific information about that in the ColdCaller documentation or available external sources. Could you rephrase your question or try asking about features like Twilio setup, lead management, call analytics, or getting started with the platform?",
          sources: [],
          conversationId: conversationId || uuidv4(),
          confidence: 0,
          responseTime,
          fallback: true,
          searchMetadata
        });
      }

      // Generate response using Gemini AI with all available sources
      const aiResponse = await responseGenerator.generateResponse(message, allSources, {
        includeDisclaimer: searchMetadata.webSearchPerformed
      });

      // Store conversation if ID provided
      if (conversationId && userId) {
        try {
          await storeConversationMessage(conversationId, userId, message, aiResponse);
        } catch (error) {
          logger.warn('Failed to store conversation:', error);
          // Don't fail the request if conversation storage fails
        }
      }

      const responseTime = Date.now() - startTime;
      
      logger.info(`RAG Chat response generated successfully`, {
        responseTime,
        confidence: aiResponse.confidence,
        sourcesUsed: aiResponse.sources.length
      });

      res.json({
        success: true,
        response: aiResponse.text,
        sources: aiResponse.sources,
        conversationId: conversationId || uuidv4(),
        confidence: aiResponse.confidence,
        responseTime,
        model: aiResponse.model,
        contextUsed: aiResponse.contextUsed,
        searchMetadata
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('RAG Chat query error:', error);
      
      res.status(500).json({
        success: false,
        error: 'I encountered an error while processing your question. Please try again.',
        responseTime,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Document indexing endpoint (admin only)
router.post('/index-documents', 
  indexLimiter,
  ensureServicesReady,
  async (req, res) => {
    const startTime = Date.now();
    
    try {
      logger.info('Starting RAG document indexing process');

      // Process all documentation files
      const documents = await documentProcessor.processAllDocuments();
      
      if (documents.length === 0) {
        logger.warn('No documents found to index');
        return res.status(404).json({
          success: false,
          error: 'No documents found to index'
        });
      }

      logger.info(`Found ${documents.length} document chunks to index`);

      // Clear existing documents (optional - could be made configurable)
      const clearExisting = req.body.clearExisting === true;
      if (clearExisting) {
        const clearedCount = await vectorStore.clearDocuments();
        logger.info(`Cleared ${clearedCount} existing documents`);
      }

      // Add documents to vector store
      const indexResult = await vectorStore.batchAddDocuments(documents);

      const responseTime = Date.now() - startTime;

      logger.info('RAG document indexing completed', {
        totalDocuments: documents.length,
        successful: indexResult.successCount,
        errors: indexResult.errorCount,
        responseTime
      });

      res.json({
        success: true,
        message: `Indexed ${indexResult.successCount} documents successfully`,
        results: {
          totalProcessed: indexResult.totalProcessed,
          successful: indexResult.successCount,
          errors: indexResult.errorCount,
          errorDetails: indexResult.errors
        },
        responseTime
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('RAG document indexing error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to index documents',
        responseTime,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get RAG chat health status
router.get('/health', async (req, res) => {
  try {
    // Try to initialize services if not done yet
    if (!initializationPromise) {
      initializationPromise = initializeServices();
    }
    
    let vectorStoreHealth, responseGenHealth;
    
    try {
      await initializationPromise;
      vectorStoreHealth = vectorStore ? await vectorStore.getHealth() : { status: 'not_initialized' };
      responseGenHealth = responseGenerator ? await responseGenerator.getHealth() : { status: 'not_initialized' };
    } catch (initError) {
      logger.warn('RAG services not fully initialized for health check:', initError.message);
      vectorStoreHealth = { status: 'initialization_failed', error: initError.message };
      responseGenHealth = { status: 'initialization_failed', error: initError.message };
    }
    
    const overallStatus = (
      vectorStoreHealth.status === 'healthy' && 
      responseGenHealth.status === 'healthy'
    ) ? 'healthy' : 'unhealthy';

    res.json({
      success: true,
      status: overallStatus,
      service: 'rag-chatbot',
      services: {
        vectorStore: vectorStoreHealth,
        responseGenerator: responseGenHealth,
        documentProcessor: { 
          status: documentProcessor ? 'ready' : 'not_initialized',
          supportedExtensions: documentProcessor ? documentProcessor.supportedExtensions : []
        },
        webSearchService: {
          status: webSearchService ? 'ready' : 'not_initialized',
          searchEngines: webSearchService ? webSearchService.searchEngines?.filter(e => e.enabled).map(e => e.name) : []
        }
      },
      configuration: {
        hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
        hasSupabaseConfig: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
        environment: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('RAG Chat health check error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get document statistics
router.get('/stats', ensureServicesReady, async (req, res) => {
  try {
    const documentCount = await vectorStore.getDocumentCount();
    const processingStats = await documentProcessor.getProcessingStats();
    
    res.json({
      success: true,
      statistics: {
        indexedDocuments: documentCount,
        processing: processingStats
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('RAG statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search documents directly (for debugging)
router.post('/search', 
  chatLimiter,
  ensureServicesReady,
  [
    body('query')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Query must be between 1 and 1000 characters'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: errors.array()
        });
      }

      const { query, limit = 5 } = req.body;

      const results = await vectorStore.similaritySearch(query, {
        matchCount: limit,
        matchThreshold: 0.5
      });

      res.json({
        success: true,
        query,
        results: results.map(doc => ({
          id: doc.id,
          title: doc.title,
          source: doc.source,
          similarity: doc.similarity,
          content: doc.content.substring(0, 200) + '...'
        })),
        count: results.length
      });

    } catch (error) {
      logger.error('RAG search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * Store conversation message in database
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @param {string} userMessage - User's message
 * @param {Object} aiResponse - AI response object
 */
async function storeConversationMessage(conversationId, userId, userMessage, aiResponse) {
  try {
    // This would integrate with your conversation storage system
    // For now, we'll just log it
    logger.debug('Storing RAG conversation message', {
      conversationId,
      userId,
      messageLength: userMessage.length,
      responseLength: aiResponse.text.length,
      confidence: aiResponse.confidence
    });

    // TODO: Implement actual storage to database/Supabase
    // const { data: conversation } = await supabase
    //   .from('chatbot_conversations')
    //   .select('messages')
    //   .eq('session_id', conversationId)
    //   .single();
    
  } catch (error) {
    logger.error('Error storing RAG conversation:', error);
    throw error;
  }
}

module.exports = router;