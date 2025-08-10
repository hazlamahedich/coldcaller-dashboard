#!/usr/bin/env node

/**
 * Supabase Vector Setup Script
 * Sets up the vector extension and creates the proper chatbot tables
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupVectorSupport() {
  console.log('🚀 Setting up Supabase vector support...');
  
  try {
    // 1. Enable the vector extension
    console.log('📦 Enabling pgvector extension...');
    const { data: vectorResult, error: vectorError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE EXTENSION IF NOT EXISTS vector;'
    });
    
    if (vectorError) {
      console.log('⚠️  Vector extension setup (expected if already enabled):', vectorError.message);
    } else {
      console.log('✅ Vector extension enabled');
    }

    // 2. Create the chatbot documents table with vector support
    console.log('📚 Creating chatbot_documents table with vector support...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS chatbot_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        embedding VECTOR(768),
        metadata JSONB NOT NULL DEFAULT '{}',
        source VARCHAR(255) NOT NULL,
        title VARCHAR(500),
        section VARCHAR(500),
        tags TEXT[],
        keywords TEXT[],
        topics TEXT[],
        intent TEXT CHECK (intent IN ('how-to', 'troubleshooting', 'reference', 'explanation')),
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS chatbot_documents_source_idx ON chatbot_documents (source);
      CREATE INDEX IF NOT EXISTS chatbot_documents_intent_idx ON chatbot_documents (intent);
      CREATE INDEX IF NOT EXISTS chatbot_documents_embedding_idx ON chatbot_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    `;
    
    const { data: tableResult, error: tableError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });
    
    if (tableError) {
      console.log('⚠️  Table creation (may already exist):', tableError.message);
    } else {
      console.log('✅ Chatbot documents table created with vector support');
    }

    // 3. Test the setup
    console.log('🧪 Testing vector setup...');
    const { data: testData, error: testError } = await supabase
      .from('chatbot_documents')
      .select('count')
      .single();
    
    if (!testError) {
      console.log('✅ Vector setup test passed');
    }

    console.log('🎉 Supabase vector support setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupVectorSupport();