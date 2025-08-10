-- Enable pgvector extension in Supabase
-- Run this in the Supabase SQL Editor

-- 1. Enable the vector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing chatbot_documents table if it exists (to recreate with vector support)
DROP TABLE IF EXISTS chatbot_documents CASCADE;

-- 3. Create the chatbot documents table with proper vector support
CREATE TABLE chatbot_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768), -- 768 dimensions for Google Gemini embeddings
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

-- 4. Create indexes for better performance
CREATE INDEX chatbot_documents_source_idx ON chatbot_documents (source);
CREATE INDEX chatbot_documents_intent_idx ON chatbot_documents (intent);
CREATE INDEX chatbot_documents_created_at_idx ON chatbot_documents (created_at);

-- 5. Create vector similarity search index (this is the important one!)
-- Note: This index will be created automatically when data is inserted
-- For better performance with large datasets, you can create it manually:
-- CREATE INDEX chatbot_documents_embedding_idx ON chatbot_documents 
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 6. Verify the setup
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'chatbot_documents';

-- Check if vector extension is enabled
SELECT extname FROM pg_extension WHERE extname = 'vector';