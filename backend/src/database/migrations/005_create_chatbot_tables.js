/**
 * Create chatbot tables for RAG system
 * Migration: 005_create_chatbot_tables
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Database migration for creating chatbot tables
 * 
 * This migration creates the necessary tables for the RAG chatbot system:
 * - chatbot_documents: Stores document chunks with vector embeddings
 * - chatbot_conversations: Stores conversation history
 * 
 * Note: This migration is designed for PostgreSQL with pgvector extension.
 * For SQLite (development), we'll create a simplified version without vector operations.
 */

async function up(queryInterface, DataTypes) {
  console.log('📚 Creating chatbot tables for RAG system...');

  try {
    // Detect database type
    const databaseType = queryInterface.sequelize.getDialect();
    console.log(`🔍 Detected database type: ${databaseType}`);

    if (databaseType === 'postgres') {
      // PostgreSQL with pgvector extension
      await createPostgreSQLTables(queryInterface, DataTypes);
    } else {
      // SQLite or other databases (development mode)
      await createSQLiteTables(queryInterface, DataTypes);
    }

    console.log('✅ Chatbot tables created successfully');
    return true;

  } catch (error) {
    console.error('❌ Error creating chatbot tables:', error);
    throw error;
  }
}

async function createPostgreSQLTables(queryInterface, DataTypes) {
  // Enable pgvector extension
  await queryInterface.sequelize.query(`
    CREATE EXTENSION IF NOT EXISTS vector;
  `);

  // Create chatbot_documents table with vector support
  await queryInterface.createTable('chatbot_documents', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    embedding: {
      type: 'VECTOR(768)', // 768-dimensional vectors for Gemini embeddings
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    source: {
      type: DataTypes.STRING(255),
      allowNull: false
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
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: []
    },
    keywords: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: []
    },
    topics: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: []
    },
    intent: {
      type: DataTypes.ENUM('how-to', 'troubleshooting', 'reference', 'explanation'),
      allowNull: true
    },
    last_updated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  // Create indexes for optimal performance
  await queryInterface.sequelize.query(`
    CREATE INDEX ON chatbot_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  `);

  await queryInterface.addIndex('chatbot_documents', ['source'], {
    name: 'chatbot_documents_source_idx'
  });

  await queryInterface.addIndex('chatbot_documents', ['intent'], {
    name: 'chatbot_documents_intent_idx'
  });

  await queryInterface.sequelize.query(`
    CREATE INDEX chatbot_documents_tags_idx ON chatbot_documents USING GIN (tags);
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX chatbot_documents_metadata_idx ON chatbot_documents USING GIN (metadata);
  `);

  // Create the similarity search function
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE FUNCTION match_documents(
      query_embedding VECTOR(768),
      match_threshold FLOAT DEFAULT 0.7,
      match_count INT DEFAULT 5
    ) RETURNS TABLE (
      id UUID,
      content TEXT,
      metadata JSONB,
      source VARCHAR(255),
      title VARCHAR(500),
      similarity FLOAT
    ) LANGUAGE plpgsql AS $$
    BEGIN
      RETURN QUERY
      SELECT
        chatbot_documents.id,
        chatbot_documents.content,
        chatbot_documents.metadata,
        chatbot_documents.source,
        chatbot_documents.title,
        1 - (chatbot_documents.embedding <=> query_embedding) AS similarity
      FROM chatbot_documents
      WHERE 1 - (chatbot_documents.embedding <=> query_embedding) > match_threshold
      ORDER BY chatbot_documents.embedding <=> query_embedding
      LIMIT match_count;
    END;
    $$;
  `);

  console.log('✅ PostgreSQL chatbot_documents table with vector support created');
}

async function createSQLiteTables(queryInterface, DataTypes) {
  // SQLite version without vector operations (for development)
  await queryInterface.createTable('chatbot_documents', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    embedding_json: {
      type: DataTypes.TEXT, // Store vector as JSON string in SQLite
      allowNull: true
    },
    metadata: {
      type: DataTypes.TEXT, // Store as JSON string in SQLite
      allowNull: false,
      defaultValue: '{}'
    },
    source: {
      type: DataTypes.STRING(255),
      allowNull: false
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
      type: DataTypes.TEXT, // Store as JSON array string
      allowNull: true
    },
    keywords: {
      type: DataTypes.TEXT, // Store as JSON array string
      allowNull: true
    },
    topics: {
      type: DataTypes.TEXT, // Store as JSON array string
      allowNull: true
    },
    intent: {
      type: DataTypes.ENUM('how-to', 'troubleshooting', 'reference', 'explanation'),
      allowNull: true
    },
    last_updated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  // Create indexes for SQLite
  await queryInterface.addIndex('chatbot_documents', ['source'], {
    name: 'chatbot_documents_source_idx'
  });

  await queryInterface.addIndex('chatbot_documents', ['intent'], {
    name: 'chatbot_documents_intent_idx'
  });

  console.log('✅ SQLite chatbot_documents table created (without vector support)');
}

async function createConversationsTable(queryInterface, DataTypes) {
  // Create chatbot_conversations table (same for both PostgreSQL and SQLite)
  await queryInterface.createTable('chatbot_conversations', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users', // Assuming you have a users table
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    session_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    messages: {
      type: DataTypes.TEXT, // Store as JSON string
      allowNull: false,
      defaultValue: '[]'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  // Add indexes
  await queryInterface.addIndex('chatbot_conversations', ['user_id'], {
    name: 'chatbot_conversations_user_id_idx'
  });

  await queryInterface.addIndex('chatbot_conversations', ['session_id'], {
    name: 'chatbot_conversations_session_id_idx'
  });

  console.log('✅ chatbot_conversations table created');
}

async function down(queryInterface, DataTypes) {
  console.log('🗑️  Dropping chatbot tables...');

  try {
    // Drop function first (PostgreSQL)
    const databaseType = queryInterface.sequelize.getDialect();
    if (databaseType === 'postgres') {
      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS match_documents(VECTOR(768), FLOAT, INT);
      `);
    }

    // Drop tables
    await queryInterface.dropTable('chatbot_conversations');
    await queryInterface.dropTable('chatbot_documents');

    console.log('✅ Chatbot tables dropped successfully');

  } catch (error) {
    console.error('❌ Error dropping chatbot tables:', error);
    throw error;
  }
}

// Common conversations table creation (called from both PostgreSQL and SQLite paths)
async function up(queryInterface, DataTypes) {
  console.log('📚 Creating chatbot tables for RAG system...');

  try {
    // Detect database type and create appropriate document table
    const databaseType = queryInterface.sequelize.getDialect();
    console.log(`🔍 Detected database type: ${databaseType}`);

    if (databaseType === 'postgres') {
      await createPostgreSQLTables(queryInterface, DataTypes);
    } else {
      await createSQLiteTables(queryInterface, DataTypes);
    }

    // Create conversations table (same for both)
    await createConversationsTable(queryInterface, DataTypes);

    console.log('✅ All chatbot tables created successfully');
    return true;

  } catch (error) {
    console.error('❌ Error creating chatbot tables:', error);
    throw error;
  }
}

module.exports = { up, down };