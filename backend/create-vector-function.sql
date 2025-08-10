-- Create the match_documents function for vector similarity search
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  metadata JSONB,
  source VARCHAR(255),
  title VARCHAR(500),
  section VARCHAR(500),
  tags TEXT[],
  keywords TEXT[],
  topics TEXT[],
  intent TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    chatbot_documents.id,
    chatbot_documents.content,
    chatbot_documents.metadata,
    chatbot_documents.source,
    chatbot_documents.title,
    chatbot_documents.section,
    chatbot_documents.tags,
    chatbot_documents.keywords,
    chatbot_documents.topics,
    chatbot_documents.intent,
    chatbot_documents.created_at,
    1 - (chatbot_documents.embedding <=> query_embedding) AS similarity
  FROM chatbot_documents
  WHERE chatbot_documents.embedding IS NOT NULL
    AND 1 - (chatbot_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY chatbot_documents.embedding <=> query_embedding
  LIMIT match_count;
$$;