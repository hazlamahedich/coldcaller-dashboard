/**
 * Migration: Create RAG Chatbot Tables
 * Creates chatbot_documents and chatbot_conversations tables with pgvector support
 * Supports both SQLite (development) and PostgreSQL (production) with vector embeddings
 */

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    const isPostgres = dialect === 'postgres';
    
    console.log(`🔄 Creating RAG chatbot tables for ${dialect}...`);

    // Enable pgvector extension for PostgreSQL
    if (isPostgres) {
      console.log('🔄 Enabling pgvector extension...');
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✅ pgvector extension enabled');
    }

    // Create chatbot_documents table
    console.log('🔄 Creating chatbot_documents table...');
    await queryInterface.createTable('chatbot_documents', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      
      // Core content
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      
      // Vector embedding (768 dimensions for Gemini)
      // For SQLite, we'll store as JSON string, for PostgreSQL as VECTOR
      embedding: {
        type: isPostgres ? 'VECTOR(768)' : DataTypes.TEXT,
        allowNull: true,
        comment: 'Vector embedding for similarity search (768 dimensions for Gemini)'
      },
      
      // Metadata and classification
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
      },
      
      source: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Source file or document type'
      },
      
      title: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      
      section: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Section within the source document'
      },
      
      // Categorization
      tags: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: false
      },
      
      keywords: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: false
      },
      
      topics: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: false
      },
      
      intent: {
        type: DataTypes.ENUM('how-to', 'troubleshooting', 'reference', 'explanation'),
        allowNull: true,
        comment: 'Document intent classification'
      },
      
      // Content metrics
      content_hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        unique: true,
        comment: 'SHA-256 hash of content for deduplication'
      },
      
      word_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Word count of the content'
      },
      
      chunk_index: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Index if document was chunked'
      },
      
      parent_document_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'chatbot_documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to parent document if this is a chunk'
      },
      
      // Status and lifecycle
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      
      indexed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the document was indexed'
      },
      
      last_updated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
      },
      
      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Create chatbot_conversations table
    console.log('🔄 Creating chatbot_conversations table...');
    await queryInterface.createTable('chatbot_conversations', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      
      // User identification
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Reference to auth.users if using Supabase auth'
      },
      
      session_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Session identifier for grouping messages'
      },
      
      // Conversation data
      messages: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: false,
        comment: 'Array of conversation messages with metadata'
      },
      
      // Context and metadata
      conversation_title: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Auto-generated or user-provided title'
      },
      
      context_summary: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Summary of conversation context'
      },
      
      total_messages: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total number of messages in conversation'
      },
      
      user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Browser/client information'
      },
      
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'User IP address for analytics'
      },
      
      // Quality metrics
      satisfaction_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'User satisfaction rating 1-5'
      },
      
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User feedback about the conversation'
      },
      
      avg_response_time: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Average response time in milliseconds'
      },
      
      // Status
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      
      ended_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the conversation ended'
      },
      
      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Create indexes for optimal performance
    console.log('🔄 Creating indexes...');
    
    // chatbot_documents indexes
    await queryInterface.addIndex('chatbot_documents', ['source'], {
      name: 'idx_chatbot_documents_source'
    });
    
    await queryInterface.addIndex('chatbot_documents', ['intent'], {
      name: 'idx_chatbot_documents_intent'
    });
    
    await queryInterface.addIndex('chatbot_documents', ['is_active'], {
      name: 'idx_chatbot_documents_active'
    });
    
    await queryInterface.addIndex('chatbot_documents', ['content_hash'], {
      unique: true,
      name: 'idx_chatbot_documents_content_hash'
    });
    
    await queryInterface.addIndex('chatbot_documents', ['parent_document_id'], {
      name: 'idx_chatbot_documents_parent'
    });
    
    await queryInterface.addIndex('chatbot_documents', ['created_at'], {
      name: 'idx_chatbot_documents_created'
    });

    // PostgreSQL-specific vector indexes
    if (isPostgres) {
      console.log('🔄 Creating vector similarity indexes...');
      
      // Create IVFFLAT index for vector similarity search
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_chatbot_documents_embedding_cosine 
        ON chatbot_documents 
        USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
      `);
      
      // Create GIN index for metadata JSONB queries
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_chatbot_documents_metadata_gin 
        ON chatbot_documents 
        USING GIN (metadata);
      `);
      
      console.log('✅ Vector indexes created');
    }

    // chatbot_conversations indexes
    await queryInterface.addIndex('chatbot_conversations', ['session_id'], {
      name: 'idx_chatbot_conversations_session'
    });
    
    await queryInterface.addIndex('chatbot_conversations', ['user_id'], {
      name: 'idx_chatbot_conversations_user'
    });
    
    await queryInterface.addIndex('chatbot_conversations', ['is_active'], {
      name: 'idx_chatbot_conversations_active'
    });
    
    await queryInterface.addIndex('chatbot_conversations', ['created_at'], {
      name: 'idx_chatbot_conversations_created'
    });
    
    await queryInterface.addIndex('chatbot_conversations', ['updated_at'], {
      name: 'idx_chatbot_conversations_updated'
    });

    // Composite indexes for common queries
    await queryInterface.addIndex('chatbot_documents', ['source', 'is_active'], {
      name: 'idx_chatbot_documents_source_active'
    });
    
    await queryInterface.addIndex('chatbot_documents', ['intent', 'is_active'], {
      name: 'idx_chatbot_documents_intent_active'
    });
    
    await queryInterface.addIndex('chatbot_conversations', ['user_id', 'created_at'], {
      name: 'idx_chatbot_conversations_user_created'
    });

    // Create similarity search function for PostgreSQL
    if (isPostgres) {
      console.log('🔄 Creating match_documents function...');
      
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION match_documents(
          query_embedding VECTOR(768),
          match_threshold FLOAT DEFAULT 0.7,
          match_count INT DEFAULT 5,
          source_filter VARCHAR DEFAULT NULL,
          intent_filter VARCHAR DEFAULT NULL
        ) RETURNS TABLE (
          id UUID,
          content TEXT,
          metadata JSONB,
          source VARCHAR(255),
          title VARCHAR(500),
          section VARCHAR(500),
          intent VARCHAR,
          similarity FLOAT
        ) LANGUAGE plpgsql AS $$
        BEGIN
          RETURN QUERY
          SELECT
            d.id,
            d.content,
            d.metadata,
            d.source,
            d.title,
            d.section,
            d.intent,
            1 - (d.embedding <=> query_embedding) AS similarity
          FROM chatbot_documents d
          WHERE 
            d.is_active = true
            AND 1 - (d.embedding <=> query_embedding) > match_threshold
            AND (source_filter IS NULL OR d.source ILIKE '%' || source_filter || '%')
            AND (intent_filter IS NULL OR d.intent = intent_filter)
          ORDER BY d.embedding <=> query_embedding
          LIMIT match_count;
        END;
        $$;
      `);
      
      console.log('✅ match_documents function created');
    }

    // Create search statistics table for analytics
    console.log('🔄 Creating chatbot_search_analytics table...');
    await queryInterface.createTable('chatbot_search_analytics', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      
      query: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      
      results_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      
      avg_similarity: {
        type: DataTypes.DECIMAL(4, 3),
        allowNull: true
      },
      
      response_time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true
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
        defaultValue: []
      },
      
      created_at: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Indexes for analytics table
    await queryInterface.addIndex('chatbot_search_analytics', ['created_at'], {
      name: 'idx_chatbot_search_analytics_created'
    });
    
    await queryInterface.addIndex('chatbot_search_analytics', ['user_id'], {
      name: 'idx_chatbot_search_analytics_user'
    });

    console.log('✅ RAG chatbot tables created successfully');
    console.log('📊 Tables created:');
    console.log('   - chatbot_documents (with vector embeddings)');
    console.log('   - chatbot_conversations');
    console.log('   - chatbot_search_analytics');
    
    if (isPostgres) {
      console.log('🚀 PostgreSQL-specific features enabled:');
      console.log('   - pgvector extension');
      console.log('   - Vector similarity indexes (IVFFLAT)');
      console.log('   - match_documents function');
      console.log('   - JSONB metadata indexes');
    } else {
      console.log('📝 SQLite mode: Vector embeddings stored as TEXT (JSON)');
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    const isPostgres = dialect === 'postgres';
    
    console.log('🔄 Dropping RAG chatbot tables...');
    
    // Drop similarity search function for PostgreSQL
    if (isPostgres) {
      console.log('🔄 Dropping match_documents function...');
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS match_documents;');
    }
    
    // Drop tables in reverse order
    await queryInterface.dropTable('chatbot_search_analytics');
    await queryInterface.dropTable('chatbot_conversations');
    await queryInterface.dropTable('chatbot_documents');
    
    console.log('✅ RAG chatbot tables dropped');
  }
};