/**
 * ChatbotSearchAnalytics Model
 * Tracks search queries and performance metrics for the RAG chatbot
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ChatbotSearchAnalytics extends Model {
  /**
   * Record a search query
   * @param {Object} searchData - Search data to record
   * @returns {Promise<ChatbotSearchAnalytics>} Created analytics record
   */
  static async recordSearch(searchData) {
    const {
      query,
      results = [],
      responseTimeMs = null,
      userId = null,
      sessionId = null
    } = searchData;

    // Calculate average similarity from results
    const similarities = results.filter(r => r.similarity !== undefined).map(r => r.similarity);
    const avgSimilarity = similarities.length > 0 
      ? similarities.reduce((a, b) => a + b, 0) / similarities.length 
      : null;

    // Extract unique sources used
    const sourcesUsed = results
      .map(r => r.source || r.title)
      .filter((source, index, arr) => source && arr.indexOf(source) === index);

    return await this.create({
      query: query.trim(),
      results_count: results.length,
      avg_similarity: avgSimilarity,
      response_time_ms: responseTimeMs,
      user_id: userId,
      session_id: sessionId,
      sources_used: sourcesUsed
    });
  }

  /**
   * Get search analytics for a specific time period
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Analytics data
   */
  static async getAnalytics(options = {}) {
    const {
      startDate = null,
      endDate = null,
      userId = null,
      limit = 100
    } = options;

    const whereClause = {};
    if (startDate) {
      whereClause.created_at = { [sequelize.Op.gte]: startDate };
    }
    if (endDate) {
      whereClause.created_at = {
        ...whereClause.created_at,
        [sequelize.Op.lte]: endDate
      };
    }
    if (userId) {
      whereClause.user_id = userId;
    }

    // Get basic statistics
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_searches,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions,
        AVG(results_count) as avg_results_per_search,
        AVG(avg_similarity) as avg_similarity_score,
        AVG(response_time_ms) as avg_response_time_ms,
        MIN(response_time_ms) as min_response_time_ms,
        MAX(response_time_ms) as max_response_time_ms,
        COUNT(CASE WHEN results_count = 0 THEN 1 END) as zero_result_searches
      FROM chatbot_search_analytics
      ${Object.keys(whereClause).length > 0 ? 'WHERE ' + Object.keys(whereClause).map(key => {
        if (key === 'created_at' && whereClause[key][sequelize.Op.gte] && whereClause[key][sequelize.Op.lte]) {
          return `${key} BETWEEN :startDate AND :endDate`;
        } else if (key === 'created_at' && whereClause[key][sequelize.Op.gte]) {
          return `${key} >= :startDate`;
        } else if (key === 'created_at' && whereClause[key][sequelize.Op.lte]) {
          return `${key} <= :endDate`;
        } else {
          return `${key} = :${key}`;
        }
      }).join(' AND ') : ''}
    `, {
      replacements: { startDate, endDate, userId },
      type: sequelize.QueryTypes.SELECT
    });

    // Get most popular queries
    const popularQueries = await this.findAll({
      attributes: [
        'query',
        [sequelize.fn('COUNT', sequelize.col('query')), 'count'],
        [sequelize.fn('AVG', sequelize.col('results_count')), 'avg_results'],
        [sequelize.fn('AVG', sequelize.col('avg_similarity')), 'avg_similarity']
      ],
      where: whereClause,
      group: ['query'],
      order: [[sequelize.fn('COUNT', sequelize.col('query')), 'DESC']],
      limit: 20,
      raw: true
    });

    // Get most used sources (simplified for SQLite compatibility)
    let sourceStats = [];
    try {
      if (sequelize.getDialect() === 'postgres') {
        // PostgreSQL version with JSON array functions
        sourceStats = await sequelize.query(`
          SELECT 
            source,
            COUNT(*) as usage_count
          FROM (
            SELECT json_array_elements_text(sources_used::json) as source
            FROM chatbot_search_analytics
            ${Object.keys(whereClause).length > 0 ? 'WHERE ' + Object.keys(whereClause).map(key => {
              if (key === 'created_at' && whereClause[key][sequelize.Op.gte] && whereClause[key][sequelize.Op.lte]) {
                return `${key} BETWEEN :startDate AND :endDate`;
              } else if (key === 'created_at' && whereClause[key][sequelize.Op.gte]) {
                return `${key} >= :startDate`;
              } else if (key === 'created_at' && whereClause[key][sequelize.Op.lte]) {
                return `${key} <= :endDate`;
              } else {
                return `${key} = :${key}`;
              }
            }).join(' AND ') : ''}
          ) sources
          WHERE source IS NOT NULL AND source != ''
          GROUP BY source
          ORDER BY usage_count DESC
          LIMIT 10
        `, {
          replacements: { startDate, endDate, userId },
          type: sequelize.QueryTypes.SELECT
        });
      } else {
        // SQLite fallback - get all records and process in JavaScript
        const allRecords = await this.findAll({
          where: whereClause,
          attributes: ['sources_used'],
          raw: true
        });
        
        const sourceCounts = {};
        allRecords.forEach(record => {
          try {
            const sources = Array.isArray(record.sources_used) ? record.sources_used : JSON.parse(record.sources_used || '[]');
            sources.forEach(source => {
              if (source && source !== '') {
                sourceCounts[source] = (sourceCounts[source] || 0) + 1;
              }
            });
          } catch (e) {
            // Skip malformed JSON
          }
        });
        
        sourceStats = Object.entries(sourceCounts)
          .map(([source, usage_count]) => ({ source, usage_count }))
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 10);
      }
    } catch (error) {
      console.warn('Source statistics query failed:', error.message);
      sourceStats = [];
    }

    // Get performance trends (daily aggregation) - simplified for SQLite
    let performanceTrends = [];
    try {
      const whereClauseStr = Object.keys(whereClause).length > 0 
        ? 'WHERE ' + Object.keys(whereClause).map(key => {
            if (key === 'created_at' && whereClause[key][sequelize.Op.gte] && whereClause[key][sequelize.Op.lte]) {
              return `${key} BETWEEN :startDate AND :endDate`;
            } else if (key === 'created_at' && whereClause[key][sequelize.Op.gte]) {
              return `${key} >= :startDate`;
            } else if (key === 'created_at' && whereClause[key][sequelize.Op.lte]) {
              return `${key} <= :endDate`;
            } else {
              return `${key} = :${key}`;
            }
          }).join(' AND ')
        : '';

      performanceTrends = await sequelize.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as search_count,
          AVG(results_count) as avg_results,
          AVG(avg_similarity) as avg_similarity,
          AVG(response_time_ms) as avg_response_time
        FROM chatbot_search_analytics
        ${whereClauseStr}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `, {
        replacements: { startDate, endDate, userId },
        type: sequelize.QueryTypes.SELECT
      });
    } catch (error) {
      console.warn('Performance trends query failed:', error.message);
      performanceTrends = [];
    }

    return {
      overview: stats[0],
      popular_queries: popularQueries,
      source_usage: sourceStats,
      performance_trends: performanceTrends
    };
  }

  /**
   * Find queries with poor performance
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Poor performing queries
   */
  static async findPoorPerformingQueries(options = {}) {
    const {
      minSearchCount = 3,
      maxAvgResults = 2,
      maxAvgSimilarity = 0.6,
      limit = 20
    } = options;

    return await this.findAll({
      attributes: [
        'query',
        [sequelize.fn('COUNT', sequelize.col('query')), 'search_count'],
        [sequelize.fn('AVG', sequelize.col('results_count')), 'avg_results'],
        [sequelize.fn('AVG', sequelize.col('avg_similarity')), 'avg_similarity'],
        [sequelize.fn('AVG', sequelize.col('response_time_ms')), 'avg_response_time']
      ],
      group: ['query'],
      having: sequelize.and(
        sequelize.where(sequelize.fn('COUNT', sequelize.col('query')), '>=', minSearchCount),
        sequelize.or(
          sequelize.where(sequelize.fn('AVG', sequelize.col('results_count')), '<=', maxAvgResults),
          sequelize.where(sequelize.fn('AVG', sequelize.col('avg_similarity')), '<=', maxAvgSimilarity)
        )
      ),
      order: [[sequelize.fn('COUNT', sequelize.col('query')), 'DESC']],
      limit,
      raw: true
    });
  }

  /**
   * Get search patterns for query optimization
   * @returns {Promise<Object>} Search patterns
   */
  static async getSearchPatterns() {
    // Get queries by word count
    const queryLengthDistribution = await sequelize.query(`
      SELECT 
        CASE 
          WHEN LENGTH(query) - LENGTH(REPLACE(query, ' ', '')) + 1 <= 3 THEN '1-3 words'
          WHEN LENGTH(query) - LENGTH(REPLACE(query, ' ', '')) + 1 <= 6 THEN '4-6 words'
          WHEN LENGTH(query) - LENGTH(REPLACE(query, ' ', '')) + 1 <= 10 THEN '7-10 words'
          ELSE '10+ words'
        END as word_count_range,
        COUNT(*) as query_count,
        AVG(results_count) as avg_results,
        AVG(avg_similarity) as avg_similarity
      FROM chatbot_search_analytics
      GROUP BY word_count_range
      ORDER BY 
        CASE word_count_range
          WHEN '1-3 words' THEN 1
          WHEN '4-6 words' THEN 2
          WHEN '7-10 words' THEN 3
          ELSE 4
        END
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Get common question words
    const questionPatterns = await sequelize.query(`
      SELECT 
        CASE 
          WHEN LOWER(query) LIKE 'how %' THEN 'How'
          WHEN LOWER(query) LIKE 'what %' THEN 'What'
          WHEN LOWER(query) LIKE 'when %' THEN 'When'
          WHEN LOWER(query) LIKE 'where %' THEN 'Where'
          WHEN LOWER(query) LIKE 'why %' THEN 'Why'
          WHEN LOWER(query) LIKE 'who %' THEN 'Who'
          WHEN LOWER(query) LIKE 'can %' OR LOWER(query) LIKE 'could %' THEN 'Can/Could'
          WHEN LOWER(query) LIKE 'should %' OR LOWER(query) LIKE 'would %' THEN 'Should/Would'
          ELSE 'Other'
        END as question_type,
        COUNT(*) as count,
        AVG(results_count) as avg_results,
        AVG(avg_similarity) as avg_similarity
      FROM chatbot_search_analytics
      WHERE query IS NOT NULL AND query != ''
      GROUP BY question_type
      ORDER BY count DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    return {
      query_length_distribution: queryLengthDistribution,
      question_patterns: questionPatterns
    };
  }

  /**
   * Clean old analytics data
   * @param {number} daysToKeep - Number of days to keep
   * @returns {Promise<number>} Number of deleted records
   */
  static async cleanOldData(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.destroy({
      where: {
        created_at: {
          [sequelize.Op.lt]: cutoffDate
        }
      }
    });

    return result;
  }
}

// Define the model
ChatbotSearchAnalytics.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  query: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 5000] // Reasonable query length limits
    }
  },
  results_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  avg_similarity: {
    type: DataTypes.DECIMAL(4, 3),
    allowNull: true,
    validate: {
      min: 0,
      max: 1
    }
  },
  response_time_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  sources_used: {
    type: DataTypes.JSON,
    defaultValue: [],
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error('Sources used must be an array');
        }
      }
    }
  }
}, {
  sequelize,
  modelName: 'ChatbotSearchAnalytics',
  tableName: 'chatbot_search_analytics',
  timestamps: true,
  underscored: true,
  paranoid: false,
  createdAt: 'created_at',
  updatedAt: false // Only track creation time
});

module.exports = ChatbotSearchAnalytics;