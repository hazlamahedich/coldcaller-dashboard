-- =====================================================
-- ColdCaller Vector Database: Missing Auxiliary Tables
-- =====================================================
-- This script creates the missing chatbot_conversations and 
-- chatbot_search_analytics tables in Supabase PostgreSQL
--
-- Execute this script in Supabase Dashboard > SQL Editor
-- =====================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE chatbot_conversations TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- User identification
    user_id UUID,
    session_id VARCHAR(255) NOT NULL,
    
    -- Conversation data  
    messages JSONB DEFAULT '[]'::jsonb NOT NULL,
    conversation_title VARCHAR(500),
    context_summary TEXT,
    total_messages INTEGER DEFAULT 0,
    
    -- Client information
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    
    -- Quality metrics
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    feedback TEXT,
    avg_response_time INTEGER,
    
    -- Status and lifecycle
    is_active BOOLEAN DEFAULT true NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE chatbot_conversations IS 'Stores chatbot conversation history and metadata';
COMMENT ON COLUMN chatbot_conversations.messages IS 'Array of conversation messages with metadata';
COMMENT ON COLUMN chatbot_conversations.session_id IS 'Session identifier for grouping messages';
COMMENT ON COLUMN chatbot_conversations.satisfaction_rating IS 'User satisfaction rating 1-5';
COMMENT ON COLUMN chatbot_conversations.avg_response_time IS 'Average response time in milliseconds';

-- =====================================================
-- 2. CREATE chatbot_search_analytics TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chatbot_search_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Search query data
    query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    avg_similarity DECIMAL(4, 3),
    response_time_ms INTEGER,
    
    -- User context
    user_id UUID,
    session_id VARCHAR(255),
    
    -- Result metadata
    sources_used JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE chatbot_search_analytics IS 'Analytics data for chatbot search queries and performance';
COMMENT ON COLUMN chatbot_search_analytics.query IS 'The search query text';
COMMENT ON COLUMN chatbot_search_analytics.avg_similarity IS 'Average similarity score of returned results';
COMMENT ON COLUMN chatbot_search_analytics.sources_used IS 'Array of document sources used in results';

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for chatbot_conversations
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session 
    ON chatbot_conversations (session_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user 
    ON chatbot_conversations (user_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_active 
    ON chatbot_conversations (is_active);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created 
    ON chatbot_conversations (created_at);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_updated 
    ON chatbot_conversations (updated_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_created 
    ON chatbot_conversations (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_active 
    ON chatbot_conversations (session_id, is_active);

-- Indexes for chatbot_search_analytics
CREATE INDEX IF NOT EXISTS idx_chatbot_search_analytics_created 
    ON chatbot_search_analytics (created_at);

CREATE INDEX IF NOT EXISTS idx_chatbot_search_analytics_user 
    ON chatbot_search_analytics (user_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_search_analytics_session 
    ON chatbot_search_analytics (session_id);

-- Performance index for analytics queries
CREATE INDEX IF NOT EXISTS idx_chatbot_search_analytics_query_time 
    ON chatbot_search_analytics (created_at, response_time_ms);

-- =====================================================
-- 4. CREATE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_search_analytics ENABLE ROW LEVEL SECURITY;

-- Allow public read access for chatbot functionality
-- (You can restrict this later based on your security requirements)
CREATE POLICY "Allow public read access to conversations" 
    ON chatbot_conversations FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert to conversations" 
    ON chatbot_conversations FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public update to conversations" 
    ON chatbot_conversations FOR UPDATE 
    USING (true);

CREATE POLICY "Allow public read access to analytics" 
    ON chatbot_search_analytics FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert to analytics" 
    ON chatbot_search_analytics FOR INSERT 
    WITH CHECK (true);

-- =====================================================
-- 5. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for chatbot_conversations
CREATE TRIGGER update_chatbot_conversations_updated_at 
    BEFORE UPDATE ON chatbot_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Verify tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN ('chatbot_conversations', 'chatbot_search_analytics');

-- Check indexes
SELECT 
    t.relname AS table_name,
    i.relname AS index_name,
    array_to_string(array_agg(a.attname), ', ') AS column_names
FROM 
    pg_class t,
    pg_class i,
    pg_index ix,
    pg_attribute a
WHERE 
    t.oid = ix.indrelid
    AND i.oid = ix.indexrelid
    AND a.attrelid = t.oid
    AND a.attnum = ANY(ix.indkey)
    AND t.relkind = 'r'
    AND t.relname IN ('chatbot_conversations', 'chatbot_search_analytics')
GROUP BY 
    t.relname,
    i.relname
ORDER BY 
    t.relname,
    i.relname;

-- =====================================================
-- 7. SAMPLE TEST DATA (OPTIONAL)
-- =====================================================

-- Insert a test conversation record
INSERT INTO chatbot_conversations (
    session_id,
    messages,
    conversation_title,
    total_messages,
    user_agent
) VALUES (
    'test_session_setup_' || extract(epoch from now()),
    '[{"role": "user", "message": "Test setup message", "timestamp": "2024-08-10T15:30:00Z"}]'::jsonb,
    'Table Setup Test Conversation',
    1,
    'Setup Script v1.0'
);

-- Insert a test analytics record
INSERT INTO chatbot_search_analytics (
    query,
    results_count,
    avg_similarity,
    response_time_ms,
    sources_used
) VALUES (
    'table setup test query',
    3,
    0.850,
    245,
    '["setup-guide", "database-migration"]'::jsonb
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 
    'SUCCESS: Missing auxiliary tables created successfully!' AS status,
    'chatbot_conversations and chatbot_search_analytics tables are now ready' AS message,
    NOW() AS timestamp;

-- =====================================================
-- END OF SCRIPT
-- =====================================================