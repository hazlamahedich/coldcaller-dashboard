/**
 * ChatbotConversation Model
 * Represents conversation history in the RAG chatbot system
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ChatbotConversation extends Model {
  /**
   * Add message to conversation
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {Object} metadata - Additional message metadata
   * @returns {Promise<ChatbotConversation>} Updated conversation
   */
  async addMessage(role, content, metadata = {}) {
    const newMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    const currentMessages = Array.isArray(this.messages) ? this.messages : [];
    const updatedMessages = [...currentMessages, newMessage];

    await this.update({
      messages: updatedMessages,
      total_messages: updatedMessages.length,
      updated_at: new Date()
    });

    return this;
  }

  /**
   * Get conversation summary
   * @returns {Object} Conversation summary
   */
  getSummary() {
    const messages = Array.isArray(this.messages) ? this.messages : [];
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    // Calculate average confidence from assistant messages
    const confidenceScores = assistantMessages
      .filter(m => m.confidence !== undefined)
      .map(m => m.confidence);
    const avgConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : null;

    // Get unique sources mentioned
    const sources = new Set();
    assistantMessages.forEach(m => {
      if (m.sources && Array.isArray(m.sources)) {
        m.sources.forEach(s => sources.add(s.title || s.source));
      }
    });

    // Calculate conversation duration
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const duration = firstMessage && lastMessage 
      ? new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp)
      : null;

    return {
      total_messages: this.total_messages,
      user_messages: userMessages.length,
      assistant_messages: assistantMessages.length,
      avg_confidence: avgConfidence,
      unique_sources: Array.from(sources),
      duration_ms: duration,
      first_message_at: firstMessage?.timestamp,
      last_message_at: lastMessage?.timestamp,
      is_active: this.is_active,
      satisfaction_rating: this.satisfaction_rating
    };
  }

  /**
   * Generate conversation title from first few messages
   * @returns {string} Generated title
   */
  generateTitle() {
    const messages = Array.isArray(this.messages) ? this.messages : [];
    const firstUserMessage = messages.find(m => m.role === 'user');
    
    if (!firstUserMessage) {
      return 'New Conversation';
    }

    // Take first 50 characters and add ellipsis if needed
    const content = firstUserMessage.content.trim();
    return content.length > 50 ? content.substring(0, 47) + '...' : content;
  }

  /**
   * End conversation and calculate final metrics
   * @returns {Promise<ChatbotConversation>} Updated conversation
   */
  async endConversation() {
    const messages = Array.isArray(this.messages) ? this.messages : [];
    
    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === 'assistant' && messages[i-1].role === 'user') {
        const responseTime = new Date(messages[i].timestamp) - new Date(messages[i-1].timestamp);
        totalResponseTime += responseTime;
        responseCount++;
      }
    }

    const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : null;

    await this.update({
      is_active: false,
      ended_at: new Date(),
      avg_response_time: avgResponseTime,
      conversation_title: this.conversation_title || this.generateTitle()
    });

    return this;
  }

  /**
   * Get conversation statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User conversation statistics
   */
  static async getUserStatistics(userId) {
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_conversations,
        AVG(total_messages) as avg_messages_per_conversation,
        AVG(satisfaction_rating) as avg_satisfaction,
        AVG(avg_response_time) as avg_response_time_ms,
        MIN(created_at) as first_conversation,
        MAX(updated_at) as last_activity
      FROM chatbot_conversations
      WHERE user_id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    return stats[0];
  }

  /**
   * Get global conversation statistics
   * @returns {Promise<Object>} Global statistics
   */
  static async getGlobalStatistics() {
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_conversations,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(total_messages) as avg_messages_per_conversation,
        AVG(satisfaction_rating) as avg_satisfaction,
        AVG(avg_response_time) as avg_response_time_ms,
        MIN(created_at) as first_conversation,
        MAX(updated_at) as last_activity
      FROM chatbot_conversations
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Get satisfaction rating distribution
    const satisfactionStats = await sequelize.query(`
      SELECT 
        satisfaction_rating,
        COUNT(*) as count
      FROM chatbot_conversations
      WHERE satisfaction_rating IS NOT NULL
      GROUP BY satisfaction_rating
      ORDER BY satisfaction_rating
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    return {
      overview: stats[0],
      satisfaction_distribution: satisfactionStats
    };
  }

  /**
   * Find active conversations for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of conversations to return
   * @returns {Promise<Array>} Active conversations
   */
  static async findActiveByUser(userId, limit = 10) {
    return await this.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      order: [['updated_at', 'DESC']],
      limit
    });
  }

  /**
   * Search conversations by content
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching conversations
   */
  static async searchByContent(searchTerm, options = {}) {
    const {
      userId = null,
      limit = 20,
      isActive = null
    } = options;

    const whereClause = {
      ...(userId && { user_id: userId }),
      ...(isActive !== null && { is_active: isActive })
    };

    const dialect = sequelize.getDialect();
    
    if (dialect === 'postgres') {
      // Use PostgreSQL full-text search
      whereClause[sequelize.Op.or] = [
        sequelize.where(
          sequelize.cast(sequelize.col('messages'), 'text'),
          { [sequelize.Op.iLike]: `%${searchTerm}%` }
        ),
        sequelize.where(
          sequelize.col('conversation_title'),
          { [sequelize.Op.iLike]: `%${searchTerm}%` }
        )
      ];
    } else {
      // SQLite fallback
      whereClause[sequelize.Op.or] = [
        sequelize.where(
          sequelize.cast(sequelize.col('messages'), 'text'),
          { [sequelize.Op.like]: `%${searchTerm}%` }
        ),
        {
          conversation_title: { [sequelize.Op.like]: `%${searchTerm}%` }
        }
      ];
    }

    return await this.findAll({
      where: whereClause,
      order: [['updated_at', 'DESC']],
      limit
    });
  }
}

// Define the model
ChatbotConversation.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  messages: {
    type: DataTypes.JSON,
    defaultValue: [],
    allowNull: false,
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error('Messages must be an array');
        }
      }
    }
  },
  conversation_title: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  context_summary: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  total_messages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    validate: {
      isIP: true
    }
  },
  satisfaction_rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avg_response_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  ended_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'ChatbotConversation',
  tableName: 'chatbot_conversations',
  timestamps: true,
  underscored: true,
  paranoid: false,
  hooks: {
    beforeUpdate: (conversation) => {
      // Update total_messages count when messages array changes
      if (conversation.changed('messages')) {
        const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
        conversation.total_messages = messages.length;
      }
    }
  }
});

module.exports = ChatbotConversation;