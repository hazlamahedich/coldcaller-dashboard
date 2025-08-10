/**
 * Chat Controller for RAG Chatbot functionality
 * Handles chat queries, conversation history, document indexing, and feedback
 */

const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');

// Mock database - In production, this would use your actual database
const mockDatabase = {
  conversations: new Map(),
  documents: new Map(),
  feedback: [],
  userSessions: new Map()
};

// Mock vector similarity search function
const mockVectorSearch = (query, threshold = 0.7, limit = 5) => {
  // In production, this would be replaced with actual vector search
  const mockDocuments = [
    {
      id: '1',
      content: 'ColdCaller Dashboard allows you to manage leads, make calls, and track analytics. To get started, first set up your Twilio integration in the settings panel.',
      title: 'Getting Started Guide',
      source: 'documentation',
      section: 'Getting Started',
      similarity: 0.95,
      metadata: {
        category: 'how-to',
        tags: ['getting-started', 'setup'],
        last_updated: '2024-01-15'
      }
    },
    {
      id: '2',
      content: 'To set up Twilio integration: 1. Go to Settings > Integrations 2. Enter your Twilio Account SID and Auth Token 3. Configure your phone number 4. Test the connection',
      title: 'Twilio Setup Instructions',
      source: 'documentation',
      section: 'Integrations',
      similarity: 0.92,
      metadata: {
        category: 'how-to',
        tags: ['twilio', 'setup', 'integration'],
        last_updated: '2024-01-15'
      }
    },
    {
      id: '3',
      content: 'Lead management features include: adding leads manually or via CSV import, organizing leads by status (New, Contacted, Qualified, etc.), setting follow-up reminders, and tracking lead history.',
      title: 'Lead Management Overview',
      source: 'documentation',
      section: 'Lead Management',
      similarity: 0.88,
      metadata: {
        category: 'explanation',
        tags: ['leads', 'management', 'features'],
        last_updated: '2024-01-15'
      }
    }
  ];

  // Simple keyword matching for demo
  const keywords = query.toLowerCase().split(' ');
  return mockDocuments.filter(doc => {
    const docText = doc.content.toLowerCase();
    return keywords.some(keyword => docText.includes(keyword));
  }).slice(0, limit);
};

// Helper function to generate document URLs
const generateDocumentUrl = (source, title) => {
  // Map source types to document IDs
  const sourceToDocumentId = {
    'documentation': 'readme',
    'getting-started': 'start-guide',
    'twilio-setup': 'twilio-setup',
    'twilio-integration': 'twilio-integration',
    'twilio-quickstart': 'quick-twilio-start',
    'chatbot-docs': 'chatbot-spec'
  };

  // Map title-based patterns to document IDs
  const titlePatterns = {
    'Getting Started Guide': 'start-guide',
    'Twilio Setup Instructions': 'twilio-setup',
    'Lead Management Overview': 'readme'
  };

  // Try to match by source first
  let documentId = sourceToDocumentId[source];
  
  // If no match by source, try by title
  if (!documentId) {
    documentId = titlePatterns[title];
  }

  // Default fallback
  if (!documentId) {
    documentId = 'readme';
  }

  return `/api/documents/${documentId}`;
};

// Mock AI response generation
const generateAIResponse = (query, relevantDocs) => {
  if (relevantDocs.length === 0) {
    return {
      text: "I couldn't find specific information about that in the ColdCaller documentation. Could you rephrase your question or try asking about features like Twilio setup, lead management, or call analytics?",
      confidence: 0,
      model: 'mock-ai'
    };
  }

  // Create a response based on the most relevant document
  const topDoc = relevantDocs[0];
  const response = {
    text: `Based on the documentation, ${topDoc.content}\n\nThis information comes from the ${topDoc.title} section of our documentation.`,
    confidence: topDoc.similarity,
    model: 'mock-ai',
    sources: relevantDocs.map(doc => ({
      title: doc.title,
      source: doc.source,
      section: doc.section,
      similarity: doc.similarity,
      url: generateDocumentUrl(doc.source, doc.title),
      snippet: doc.content.substring(0, 150) + (doc.content.length > 150 ? '...' : '')
    }))
  };

  return response;
};

/**
 * Process chat query and return AI response
 * POST /api/chat/query
 */
const processChatQuery = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { message, conversationId, context } = req.body;
    const userId = req.user?.id;
    
    // Generate conversation ID if not provided
    const currentConversationId = conversationId || uuidv4();
    
    // Track user session
    if (userId) {
      const sessionKey = `${userId}:${currentConversationId}`;
      if (!mockDatabase.userSessions.has(sessionKey)) {
        mockDatabase.userSessions.set(sessionKey, {
          userId,
          conversationId: currentConversationId,
          startTime: new Date(),
          messageCount: 0
        });
      }
      const session = mockDatabase.userSessions.get(sessionKey);
      session.messageCount += 1;
      session.lastActivity = new Date();
    }

    console.log(`Processing chat query: "${message}" for conversation: ${currentConversationId}`);

    // Perform vector similarity search
    const relevantDocs = mockVectorSearch(message, 0.6, 5);
    
    // Generate AI response
    const aiResponse = generateAIResponse(message, relevantDocs);
    
    // Store conversation message
    await storeConversationMessage(currentConversationId, userId, message, aiResponse);
    
    // Prepare response
    const response = {
      success: true,
      data: {
        response: aiResponse.text,
        conversationId: currentConversationId,
        confidence: aiResponse.confidence,
        sources: aiResponse.sources || [],
        model: aiResponse.model,
        timestamp: new Date().toISOString(),
        messageCount: mockDatabase.userSessions.get(`${userId}:${currentConversationId}`)?.messageCount || 1
      }
    };

    // Log successful query
    console.log('Chat query processed successfully:', {
      conversationId: currentConversationId,
      userId,
      confidence: aiResponse.confidence,
      sourcesCount: aiResponse.sources?.length || 0
    });

    res.json(response);

  } catch (error) {
    console.error('Error processing chat query:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'CHAT_QUERY_ERROR'
      }
    });
  }
};

/**
 * Get conversation history
 * GET /api/chat/conversations/:id
 */
const getConversationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    if (!mockDatabase.conversations.has(id)) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Conversation not found',
          code: 'CONVERSATION_NOT_FOUND'
        }
      });
    }

    const conversation = mockDatabase.conversations.get(id);
    
    // Check if user has access to this conversation
    if (userId && conversation.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied to conversation',
          code: 'CONVERSATION_ACCESS_DENIED'
        }
      });
    }

    // Paginate messages
    const messages = conversation.messages.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        conversationId: id,
        messages,
        total: conversation.messages.length,
        hasMore: offset + parseInt(limit) < conversation.messages.length,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    });

  } catch (error) {
    console.error('Error retrieving conversation history:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'CONVERSATION_HISTORY_ERROR'
      }
    });
  }
};

/**
 * Index documents for vector search (Admin only)
 * POST /api/chat/index-documents
 */
const indexDocuments = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { documents, source, overwrite = false } = req.body;
    const userId = req.user?.id;

    console.log(`Indexing ${documents.length} documents from source: ${source}`);

    let indexed = 0;
    let updated = 0;
    let indexingErrors = 0;

    for (const doc of documents) {
      try {
        const docId = doc.id || uuidv4();
        const documentData = {
          id: docId,
          content: doc.content,
          title: doc.title,
          source: source || doc.source || 'manual',
          section: doc.section || 'General',
          metadata: {
            ...doc.metadata,
            indexed_by: userId,
            indexed_at: new Date().toISOString()
          },
          tags: doc.tags || [],
          keywords: doc.keywords || [],
          topics: doc.topics || [],
          intent: doc.intent || 'explanation',
          embedding: Array(768).fill(0).map(() => Math.random()), // Mock embedding
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (mockDatabase.documents.has(docId) && !overwrite) {
          console.warn(`Document ${docId} already exists, skipping`);
          continue;
        }

        if (mockDatabase.documents.has(docId)) {
          updated++;
        } else {
          indexed++;
        }

        mockDatabase.documents.set(docId, documentData);
        
      } catch (docError) {
        console.error(`Error indexing document: ${doc.title}`, docError);
        indexingErrors++;
      }
    }

    console.log(`Document indexing completed: ${indexed} new, ${updated} updated, ${indexingErrors} errors`);

    res.json({
      success: true,
      data: {
        indexed,
        updated,
        errors: indexingErrors,
        total: documents.length,
        source,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error indexing documents:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to index documents',
        code: 'DOCUMENT_INDEXING_ERROR'
      }
    });
  }
};

/**
 * Submit user feedback
 * POST /api/chat/feedback
 */
const submitFeedback = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { conversationId, messageId, rating, feedback, category } = req.body;
    const userId = req.user?.id;

    const feedbackData = {
      id: uuidv4(),
      conversationId,
      messageId,
      userId,
      rating,
      feedback,
      category,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    mockDatabase.feedback.push(feedbackData);

    console.log('User feedback submitted:', {
      conversationId,
      rating,
      category,
      userId
    });

    res.json({
      success: true,
      data: {
        feedbackId: feedbackData.id,
        message: 'Feedback submitted successfully'
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to submit feedback',
        code: 'FEEDBACK_SUBMISSION_ERROR'
      }
    });
  }
};

/**
 * Get chat analytics (Admin only)
 * GET /api/chat/analytics
 */
const getChatAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate period start date
    const now = new Date();
    let periodStart;
    switch (period) {
      case '1d':
        periodStart = new Date(now.setDate(now.getDate() - 1));
        break;
      case '7d':
        periodStart = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30d':
      default:
        periodStart = new Date(now.setDate(now.getDate() - 30));
        break;
    }

    const analytics = {
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: new Date().toISOString(),
      metrics: {
        totalConversations: mockDatabase.conversations.size,
        totalMessages: Array.from(mockDatabase.conversations.values())
          .reduce((total, conv) => total + conv.messages.length, 0),
        averageMessagesPerConversation: mockDatabase.conversations.size > 0 
          ? Array.from(mockDatabase.conversations.values())
              .reduce((total, conv) => total + conv.messages.length, 0) / mockDatabase.conversations.size
          : 0,
        totalFeedback: mockDatabase.feedback.length,
        averageRating: mockDatabase.feedback.length > 0
          ? mockDatabase.feedback
              .filter(f => f.rating)
              .reduce((sum, f) => sum + f.rating, 0) / mockDatabase.feedback.filter(f => f.rating).length
          : 0,
        topQueries: [
          { query: 'How to set up Twilio', count: 15 },
          { query: 'Getting started guide', count: 12 },
          { query: 'Lead management help', count: 8 }
        ],
        responseConfidence: {
          high: 0.75, // >0.8
          medium: 0.20, // 0.5-0.8
          low: 0.05 // <0.5
        }
      }
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error retrieving chat analytics:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve analytics',
        code: 'ANALYTICS_ERROR'
      }
    });
  }
};

/**
 * Helper function to store conversation messages
 */
const storeConversationMessage = async (conversationId, userId, userMessage, aiResponse) => {
  try {
    if (!mockDatabase.conversations.has(conversationId)) {
      mockDatabase.conversations.set(conversationId, {
        id: conversationId,
        userId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const conversation = mockDatabase.conversations.get(conversationId);
    
    // Add user message
    conversation.messages.push({
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    // Add AI response
    conversation.messages.push({
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse.text,
      sources: aiResponse.sources || [],
      confidence: aiResponse.confidence,
      model: aiResponse.model,
      timestamp: new Date().toISOString()
    });

    conversation.updatedAt = new Date().toISOString();

  } catch (error) {
    console.error('Error storing conversation message:', error);
    throw error;
  }
};

/**
 * Delete conversation (Admin or owner only)
 * DELETE /api/chat/conversations/:id
 */
const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!mockDatabase.conversations.has(id)) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Conversation not found',
          code: 'CONVERSATION_NOT_FOUND'
        }
      });
    }

    const conversation = mockDatabase.conversations.get(id);
    
    // Check if user has permission to delete
    if (conversation.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'CONVERSATION_DELETE_DENIED'
        }
      });
    }

    mockDatabase.conversations.delete(id);
    
    console.log(`Conversation ${id} deleted by user ${userId}`);

    res.json({
      success: true,
      data: {
        message: 'Conversation deleted successfully'
      }
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete conversation',
        code: 'CONVERSATION_DELETE_ERROR'
      }
    });
  }
};

module.exports = {
  processChatQuery,
  getConversationHistory,
  indexDocuments,
  submitFeedback,
  getChatAnalytics,
  deleteConversation
};