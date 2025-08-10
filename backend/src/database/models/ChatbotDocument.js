/**
 * ChatbotDocument Model
 * Represents documents in the RAG chatbot vector database
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

class ChatbotDocument extends Model {
  /**
   * Generate content hash for deduplication
   * @param {string} content - Document content
   * @returns {string} SHA-256 hash
   */
  static generateContentHash(content) {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Calculate word count
   * @param {string} content - Document content
   * @returns {number} Word count
   */
  static calculateWordCount(content) {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Parse embedding for database storage
   * For PostgreSQL: return as array
   * For SQLite: return as JSON string
   * @param {Array<number>} embedding - Vector embedding
   * @returns {Array|string} Formatted embedding
   */
  static formatEmbeddingForStorage(embedding) {
    const dialect = sequelize.getDialect();
    if (dialect === 'postgres') {
      return embedding; // PostgreSQL handles VECTOR type natively
    } else {
      return JSON.stringify(embedding); // SQLite stores as TEXT
    }
  }

  /**
   * Parse embedding from database
   * @param {Array|string} storedEmbedding - Stored embedding
   * @returns {Array<number>} Vector embedding
   */
  static parseEmbeddingFromStorage(storedEmbedding) {
    const dialect = sequelize.getDialect();
    if (dialect === 'postgres') {
      return Array.isArray(storedEmbedding) ? storedEmbedding : JSON.parse(storedEmbedding);
    } else {
      return typeof storedEmbedding === 'string' ? JSON.parse(storedEmbedding) : storedEmbedding;
    }
  }

  /**
   * Find similar documents using vector similarity
   * @param {Array<number>} queryEmbedding - Query vector
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Similar documents
   */
  static async findSimilar(queryEmbedding, options = {}) {
    const {
      threshold = 0.7,
      limit = 5,
      sourceFilter = null,
      intentFilter = null,
      isActive = true
    } = options;

    const dialect = sequelize.getDialect();

    if (dialect === 'postgres') {
      // Use PostgreSQL function for vector similarity search
      const results = await sequelize.query(
        'SELECT * FROM match_documents($1, $2, $3, $4, $5)',
        {
          bind: [queryEmbedding, threshold, limit, sourceFilter, intentFilter],
          type: sequelize.QueryTypes.SELECT
        }
      );
      return results;
    } else {
      // For SQLite, implement basic similarity search
      // Note: This is less efficient and should be used only for development
      const documents = await ChatbotDocument.findAll({
        where: {
          is_active: isActive,
          ...(sourceFilter && { source: { [sequelize.Op.like]: `%${sourceFilter}%` } }),
          ...(intentFilter && { intent: intentFilter })
        },
        order: [['created_at', 'DESC']],
        limit: limit * 2 // Get more to filter by similarity
      });

      // Calculate cosine similarity manually for SQLite
      const similarities = documents.map(doc => {
        const docEmbedding = this.parseEmbeddingFromStorage(doc.embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
        return {
          ...doc.toJSON(),
          similarity
        };
      });

      // Filter by threshold and sort by similarity
      return similarities
        .filter(doc => doc.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vectorA - First vector
   * @param {Array<number>} vectorB - Second vector
   * @returns {number} Similarity score (0-1)
   */
  static cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Bulk create documents with proper formatting
   * @param {Array<Object>} documents - Documents to create
   * @returns {Promise<Array>} Created documents
   */
  static async bulkCreateDocuments(documents) {
    const formattedDocs = documents.map(doc => ({
      ...doc,
      content_hash: this.generateContentHash(doc.content),
      word_count: this.calculateWordCount(doc.content),
      embedding: doc.embedding ? this.formatEmbeddingForStorage(doc.embedding) : null,
      indexed_at: new Date()
    }));

    return await this.bulkCreate(formattedDocs, {
      ignoreDuplicates: true, // Skip duplicates based on content_hash
      updateOnDuplicate: ['content', 'embedding', 'metadata', 'last_updated', 'indexed_at']
    });
  }

  /**
   * Get document statistics
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics() {
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_documents,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as embedded_documents,
        COUNT(DISTINCT source) as unique_sources,
        AVG(word_count) as avg_word_count,
        MIN(created_at) as oldest_document,
        MAX(created_at) as newest_document
      FROM chatbot_documents
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    const intentStats = await sequelize.query(`
      SELECT 
        intent,
        COUNT(*) as count
      FROM chatbot_documents
      WHERE is_active = true AND intent IS NOT NULL
      GROUP BY intent
      ORDER BY count DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    const sourceStats = await sequelize.query(`
      SELECT 
        source,
        COUNT(*) as count
      FROM chatbot_documents
      WHERE is_active = true
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    return {
      overview: stats[0],
      by_intent: intentStats,
      by_source: sourceStats
    };
  }
}

// Define the model
ChatbotDocument.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 100000] // Content should be between 10 and 100k characters
    }
  },
  embedding: {
    type: sequelize.getDialect() === 'postgres' ? 'VECTOR(768)' : DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    allowNull: false
  },
  source: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  section: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  keywords: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  topics: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  intent: {
    type: DataTypes.ENUM('how-to', 'troubleshooting', 'reference', 'explanation'),
    allowNull: true
  },
  content_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    unique: true
  },
  word_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  chunk_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  parent_document_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'chatbot_documents',
      key: 'id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  indexed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_updated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'ChatbotDocument',
  tableName: 'chatbot_documents',
  timestamps: true,
  underscored: true,
  paranoid: false,
  hooks: {
    beforeCreate: (document) => {
      if (!document.content_hash) {
        document.content_hash = ChatbotDocument.generateContentHash(document.content);
      }
      if (!document.word_count) {
        document.word_count = ChatbotDocument.calculateWordCount(document.content);
      }
      if (!document.indexed_at) {
        document.indexed_at = new Date();
      }
    },
    beforeUpdate: (document) => {
      if (document.changed('content')) {
        document.content_hash = ChatbotDocument.generateContentHash(document.content);
        document.word_count = ChatbotDocument.calculateWordCount(document.content);
        document.last_updated = new Date();
      }
    }
  }
});

// Define associations
ChatbotDocument.belongsTo(ChatbotDocument, {
  as: 'parentDocument',
  foreignKey: 'parent_document_id'
});

ChatbotDocument.hasMany(ChatbotDocument, {
  as: 'chunks',
  foreignKey: 'parent_document_id'
});

module.exports = ChatbotDocument;