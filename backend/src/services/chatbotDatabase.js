/**
 * Chatbot Database Service
 * Centralized service for RAG chatbot database operations
 * Handles vector storage, conversations, and analytics
 */

const { Op } = require('sequelize');
const { sequelize } = require('../database/config/database');
const ChatbotDocument = require('../database/models/ChatbotDocument');
const ChatbotConversation = require('../database/models/ChatbotConversation');
const ChatbotSearchAnalytics = require('../database/models/ChatbotSearchAnalytics');
const crypto = require('crypto');

class ChatbotDatabaseService {
  constructor() {
    this.isPostgres = sequelize.getDialect() === 'postgres';
    this.models = {
      Document: ChatbotDocument,
      Conversation: ChatbotConversation,
      Analytics: ChatbotSearchAnalytics
    };
  }

  /**
   * Initialize the service and verify database connectivity
   * @returns {Promise<Object>} Service status
   */
  async initialize() {
    try {
      await sequelize.authenticate();
      
      // Check if tables exist
      const tableNames = await sequelize.getQueryInterface().showAllTables();
      const requiredTables = ['chatbot_documents', 'chatbot_conversations', 'chatbot_search_analytics'];
      const missingTables = requiredTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
      }

      return {
        status: 'initialized',
        database: this.isPostgres ? 'PostgreSQL with pgvector' : 'SQLite with JSON vectors',
        tables: tableNames.filter(table => table.startsWith('chatbot_')),
        vectorSupport: this.isPostgres ? 'native' : 'json'
      };
    } catch (error) {
      throw new Error(`Failed to initialize chatbot database service: ${error.message}`);
    }
  }

  /**
   * Add document(s) to the vector database
   * @param {Array|Object} documents - Document(s) to add
   * @returns {Promise<Array>} Added documents
   */
  async addDocuments(documents) {
    const docsArray = Array.isArray(documents) ? documents : [documents];
    
    // Validate and format documents
    const formattedDocs = docsArray.map(doc => {
      if (!doc.content || !doc.source) {
        throw new Error('Document must have content and source');
      }

      return {
        ...doc,
        content_hash: doc.content_hash || ChatbotDocument.generateContentHash(doc.content),
        word_count: doc.word_count || ChatbotDocument.calculateWordCount(doc.content),
        embedding: doc.embedding ? ChatbotDocument.formatEmbeddingForStorage(doc.embedding) : null,
        metadata: doc.metadata || {},
        tags: doc.tags || [],
        keywords: doc.keywords || [],
        topics: doc.topics || [],
        indexed_at: new Date()
      };
    });

    try {
      const results = await ChatbotDocument.bulkCreateDocuments(formattedDocs);
      console.log(`✅ Added ${results.length} documents to vector database`);
      return results;
    } catch (error) {
      console.error('❌ Failed to add documents:', error.message);
      throw error;
    }
  }

  /**
   * Search for similar documents using vector similarity
   * @param {Array<number>} queryEmbedding - Query vector embedding
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Similar documents
   */
  async searchSimilarDocuments(queryEmbedding, options = {}) {
    const {
      threshold = 0.7,
      limit = 5,
      sourceFilter = null,
      intentFilter = null,
      includeMetadata = true
    } = options;

    try {
      const startTime = Date.now();
      const results = await ChatbotDocument.findSimilar(queryEmbedding, {
        threshold,
        limit,
        sourceFilter,
        intentFilter
      });

      const responseTime = Date.now() - startTime;
      
      // Format results
      const formattedResults = results.map(doc => ({
        id: doc.id,
        content: doc.content,
        title: doc.title,
        source: doc.source,
        section: doc.section,
        similarity: doc.similarity,
        ...(includeMetadata && {
          metadata: doc.metadata,
          intent: doc.intent,
          tags: doc.tags,
          keywords: doc.keywords,
          word_count: doc.word_count
        })
      }));

      console.log(`🔍 Found ${results.length} similar documents in ${responseTime}ms`);
      return {
        results: formattedResults,
        totalFound: results.length,
        responseTime,
        searchOptions: options
      };
    } catch (error) {
      console.error('❌ Failed to search documents:', error.message);
      throw error;
    }
  }

  /**
   * Create or update a conversation
   * @param {Object} conversationData - Conversation data
   * @returns {Promise<ChatbotConversation>} Conversation object
   */
  async createConversation(conversationData) {
    const {
      userId = null,
      sessionId = null,
      userAgent = null,
      ipAddress = null
    } = conversationData;

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    try {
      // Check if conversation already exists
      let conversation = await ChatbotConversation.findOne({
        where: { session_id: sessionId }
      });

      if (conversation) {
        return conversation;
      }

      // Create new conversation
      conversation = await ChatbotConversation.create({
        user_id: userId,
        session_id: sessionId,
        user_agent: userAgent,
        ip_address: ipAddress,
        messages: [],
        total_messages: 0
      });

      console.log(`💬 Created new conversation: ${sessionId}`);
      return conversation;
    } catch (error) {
      console.error('❌ Failed to create conversation:', error.message);
      throw error;
    }
  }

  /**
   * Add message to conversation
   * @param {string} sessionId - Session ID
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {Object} metadata - Additional message data
   * @returns {Promise<ChatbotConversation>} Updated conversation
   */
  async addMessageToConversation(sessionId, role, content, metadata = {}) {
    try {
      const conversation = await ChatbotConversation.findOne({
        where: { session_id: sessionId }
      });

      if (!conversation) {
        throw new Error(`Conversation not found: ${sessionId}`);
      }

      await conversation.addMessage(role, content, metadata);
      console.log(`💬 Added ${role} message to conversation ${sessionId}`);
      return conversation;
    } catch (error) {
      console.error('❌ Failed to add message:', error.message);
      throw error;
    }
  }

  /**
   * Record search analytics
   * @param {Object} searchData - Search data to record
   * @returns {Promise<ChatbotSearchAnalytics>} Analytics record
   */
  async recordSearch(searchData) {
    try {
      const analytics = await ChatbotSearchAnalytics.recordSearch(searchData);
      return analytics;
    } catch (error) {
      console.error('❌ Failed to record search analytics:', error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getStatistics() {
    try {
      const [
        documentStats,
        conversationStats,
        analyticsStats
      ] = await Promise.all([
        ChatbotDocument.getStatistics(),
        ChatbotConversation.getGlobalStatistics(),
        ChatbotSearchAnalytics.getAnalytics()
      ]);

      // Get database size info
      const dbInfo = await this.getDatabaseInfo();

      return {
        documents: documentStats,
        conversations: conversationStats,
        analytics: analyticsStats,
        database: dbInfo,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error.message);
      throw error;
    }
  }

  /**
   * Get database information
   * @returns {Promise<Object>} Database info
   */
  async getDatabaseInfo() {
    try {
      const tableStats = await Promise.all([
        this.getTableStats('chatbot_documents'),
        this.getTableStats('chatbot_conversations'),
        this.getTableStats('chatbot_search_analytics')
      ]);

      return {
        dialect: sequelize.getDialect(),
        vectorSupport: this.isPostgres ? 'pgvector' : 'json',
        tables: tableStats,
        connectionInfo: {
          host: sequelize.config.host || 'local',
          database: sequelize.config.database || 'file',
          pool: sequelize.connectionManager.pool?.config || {}
        }
      };
    } catch (error) {
      console.error('❌ Failed to get database info:', error.message);
      return {
        error: error.message,
        dialect: sequelize.getDialect()
      };
    }
  }

  /**
   * Get statistics for a specific table
   * @param {string} tableName - Table name
   * @returns {Promise<Object>} Table statistics
   */
  async getTableStats(tableName) {
    try {
      const [results] = await sequelize.query(`
        SELECT COUNT(*) as row_count
        FROM ${tableName}
      `);

      return {
        name: tableName,
        rows: parseInt(results[0].row_count),
        size: 'N/A' // Size calculation depends on database type
      };
    } catch (error) {
      return {
        name: tableName,
        error: error.message
      };
    }
  }

  /**
   * Health check for the service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      // Test database connectivity
      await sequelize.authenticate();

      // Test each model
      const modelTests = await Promise.all([
        ChatbotDocument.count(),
        ChatbotConversation.count(),
        ChatbotSearchAnalytics.count()
      ]);

      // Test vector search (if PostgreSQL)
      let vectorSearchTest = null;
      if (this.isPostgres) {
        try {
          const testVector = Array(768).fill(0.1);
          await sequelize.query(
            'SELECT * FROM match_documents($1, 0.5, 1)',
            { bind: [testVector], type: sequelize.QueryTypes.SELECT }
          );
          vectorSearchTest = 'passed';
        } catch (error) {
          vectorSearchTest = `failed: ${error.message}`;
        }
      }

      return {
        status: 'healthy',
        database: {
          connected: true,
          dialect: sequelize.getDialect(),
          models: {
            documents: modelTests[0],
            conversations: modelTests[1],
            analytics: modelTests[2]
          }
        },
        vectorSearch: this.isPostgres ? vectorSearchTest : 'json-based',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean up old data
   * @param {Object} options - Cleanup options
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanup(options = {}) {
    const {
      analyticsDays = 90,
      inactiveConversationDays = 30,
      removeInactiveDocuments = false
    } = options;

    const results = {
      analytics: 0,
      conversations: 0,
      documents: 0
    };

    try {
      // Clean old analytics data
      results.analytics = await ChatbotSearchAnalytics.cleanOldData(analyticsDays);

      // Clean inactive conversations
      const inactiveCutoff = new Date();
      inactiveCutoff.setDate(inactiveCutoff.getDate() - inactiveConversationDays);
      
      results.conversations = await ChatbotConversation.destroy({
        where: {
          is_active: false,
          updated_at: { [Op.lt]: inactiveCutoff }
        }
      });

      // Optionally remove inactive documents
      if (removeInactiveDocuments) {
        results.documents = await ChatbotDocument.destroy({
          where: {
            is_active: false,
            updated_at: { [Op.lt]: inactiveCutoff }
          }
        });
      }

      console.log(`🧹 Cleanup completed: ${JSON.stringify(results)}`);
      return results;
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      throw error;
    }
  }

  /**
   * Export data for backup
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data
   */
  async exportData(options = {}) {
    const {
      includeDocuments = true,
      includeConversations = true,
      includeAnalytics = false,
      dateRange = null
    } = options;

    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        database: sequelize.getDialect(),
        version: '1.0.0'
      }
    };

    try {
      if (includeDocuments) {
        exportData.documents = await ChatbotDocument.findAll({
          where: dateRange ? {
            created_at: { [Op.between]: dateRange }
          } : {}
        });
      }

      if (includeConversations) {
        exportData.conversations = await ChatbotConversation.findAll({
          where: dateRange ? {
            created_at: { [Op.between]: dateRange }
          } : {}
        });
      }

      if (includeAnalytics) {
        exportData.analytics = await ChatbotSearchAnalytics.findAll({
          where: dateRange ? {
            created_at: { [Op.between]: dateRange }
          } : {}
        });
      }

      return exportData;
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const chatbotDatabase = new ChatbotDatabaseService();

module.exports = {
  ChatbotDatabaseService,
  chatbotDatabase,
  // Export models for direct access if needed
  ChatbotDocument,
  ChatbotConversation,
  ChatbotSearchAnalytics
};