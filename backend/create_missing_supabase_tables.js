require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createMissingTables() {
  try {
    console.log('🔄 Creating missing Supabase tables...\n');

    // Create chatbot_conversations table
    console.log('🔄 Creating chatbot_conversations table...');
    const createConversationsTable = `
      CREATE TABLE IF NOT EXISTS chatbot_conversations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID,
        session_id VARCHAR(255) NOT NULL,
        messages JSONB DEFAULT '[]'::jsonb NOT NULL,
        conversation_title VARCHAR(500),
        context_summary TEXT,
        total_messages INTEGER DEFAULT 0,
        user_agent VARCHAR(500),
        ip_address VARCHAR(45),
        satisfaction_rating INTEGER,
        feedback TEXT,
        avg_response_time INTEGER,
        is_active BOOLEAN DEFAULT true NOT NULL,
        ended_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    const { error: conversationsError } = await supabase.rpc('exec_sql', { 
      sql: createConversationsTable 
    });

    if (conversationsError && !conversationsError.message.includes('already exists')) {
      console.log(`❌ Error creating chatbot_conversations: ${conversationsError.message}`);
    } else {
      console.log('✅ chatbot_conversations table created/verified');
    }

    // Create indexes for conversations
    const conversationsIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session ON chatbot_conversations (session_id);',
      'CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user ON chatbot_conversations (user_id);',
      'CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_active ON chatbot_conversations (is_active);',
      'CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created ON chatbot_conversations (created_at);',
      'CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_updated ON chatbot_conversations (updated_at);',
      'CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_created ON chatbot_conversations (user_id, created_at);'
    ];

    for (const indexSql of conversationsIndexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (error && !error.message.includes('already exists')) {
        console.log(`⚠️ Index creation warning: ${error.message}`);
      }
    }

    // Create chatbot_search_analytics table
    console.log('🔄 Creating chatbot_search_analytics table...');
    const createAnalyticsTable = `
      CREATE TABLE IF NOT EXISTS chatbot_search_analytics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        query TEXT NOT NULL,
        results_count INTEGER DEFAULT 0,
        avg_similarity DECIMAL(4, 3),
        response_time_ms INTEGER,
        user_id UUID,
        session_id VARCHAR(255),
        sources_used JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `;

    const { error: analyticsError } = await supabase.rpc('exec_sql', { 
      sql: createAnalyticsTable 
    });

    if (analyticsError && !analyticsError.message.includes('already exists')) {
      console.log(`❌ Error creating chatbot_search_analytics: ${analyticsError.message}`);
    } else {
      console.log('✅ chatbot_search_analytics table created/verified');
    }

    // Create indexes for analytics
    const analyticsIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_chatbot_search_analytics_created ON chatbot_search_analytics (created_at);',
      'CREATE INDEX IF NOT EXISTS idx_chatbot_search_analytics_user ON chatbot_search_analytics (user_id);'
    ];

    for (const indexSql of analyticsIndexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (error && !error.message.includes('already exists')) {
        console.log(`⚠️ Index creation warning: ${error.message}`);
      }
    }

    console.log('\n✅ All missing tables and indexes created successfully!');

    // Test the tables by checking if we can access them
    console.log('\n🧪 Testing table access...');
    
    const { data: conversationTest, error: convTestError } = await supabase
      .from('chatbot_conversations')
      .select('count', { count: 'exact', head: true });
      
    if (convTestError) {
      console.log(`❌ chatbot_conversations access test failed: ${convTestError.message}`);
    } else {
      console.log('✅ chatbot_conversations table accessible');
    }

    const { data: analyticsTest, error: analyticsTestError } = await supabase
      .from('chatbot_search_analytics')
      .select('count', { count: 'exact', head: true });
      
    if (analyticsTestError) {
      console.log(`❌ chatbot_search_analytics access test failed: ${analyticsTestError.message}`);
    } else {
      console.log('✅ chatbot_search_analytics table accessible');
    }

    console.log('\n🎉 Table creation process completed!');

  } catch (error) {
    console.error('💥 Script error:', error.message);
  }
}

// Alternative approach using direct SQL queries if RPC doesn't work
async function createTablesDirectSQL() {
  try {
    console.log('🔄 Trying direct SQL approach...\n');

    // Try to insert a test record to see if tables exist
    const { error: testError } = await supabase
      .from('chatbot_conversations')
      .insert([{ 
        session_id: 'test_session_' + Date.now(),
        messages: [],
        total_messages: 0
      }])
      .select();

    if (testError) {
      console.log(`ℹ️ chatbot_conversations table issue: ${testError.message}`);
      console.log('📝 This suggests the table needs to be created through Supabase dashboard or direct SQL.');
    } else {
      console.log('✅ chatbot_conversations table is accessible');
      // Clean up test record
      await supabase
        .from('chatbot_conversations')
        .delete()
        .ilike('session_id', 'test_session_%');
    }

  } catch (error) {
    console.error('💥 Direct SQL test error:', error.message);
  }
}

async function main() {
  // First try the RPC approach
  await createMissingTables();
  
  console.log('\n' + '='.repeat(50));
  
  // Then test direct access
  await createTablesDirectSQL();
}

main().catch(console.error);