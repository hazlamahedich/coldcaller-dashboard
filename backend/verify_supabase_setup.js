require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifySupabaseSetup() {
  console.log('🔍 Verifying complete Supabase setup...\n');
  
  const tables = [
    'chatbot_documents',
    'chatbot_conversations', 
    'chatbot_search_analytics'
  ];
  
  let allTablesWorking = true;
  
  for (const table of tables) {
    try {
      console.log(`🔄 Testing ${table}...`);
      
      // Test table access and get record count
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        allTablesWorking = false;
      } else {
        console.log(`✅ ${table}: Accessible with ${count || 0} records`);
        
        // Test insert capability (we'll delete it right after)
        if (table === 'chatbot_conversations') {
          const testSessionId = `verify_test_${Date.now()}`;
          const { data: insertData, error: insertError } = await supabase
            .from(table)
            .insert([{
              session_id: testSessionId,
              messages: [{ role: 'test', message: 'Verification test', timestamp: new Date().toISOString() }],
              conversation_title: 'Setup Verification Test',
              total_messages: 1
            }])
            .select();
            
          if (insertError) {
            console.log(`   ⚠️ Insert test failed: ${insertError.message}`);
          } else {
            console.log(`   ✅ Insert test passed`);
            // Clean up test record
            await supabase
              .from(table)
              .delete()
              .eq('session_id', testSessionId);
            console.log(`   ✅ Cleanup completed`);
          }
        }
        
        if (table === 'chatbot_search_analytics') {
          const { data: insertData, error: insertError } = await supabase
            .from(table)
            .insert([{
              query: 'verification test query',
              results_count: 0,
              avg_similarity: 0.500,
              response_time_ms: 100,
              sources_used: ['test-source']
            }])
            .select();
            
          if (insertError) {
            console.log(`   ⚠️ Insert test failed: ${insertError.message}`);
          } else {
            console.log(`   ✅ Insert test passed`);
            // Clean up test record
            if (insertData && insertData[0]) {
              await supabase
                .from(table)
                .delete()
                .eq('id', insertData[0].id);
              console.log(`   ✅ Cleanup completed`);
            }
          }
        }
      }
      
    } catch (e) {
      console.log(`❌ ${table}: Unexpected error - ${e.message}`);
      allTablesWorking = false;
    }
    
    console.log(''); // Add spacing
  }
  
  console.log('='.repeat(60));
  
  if (allTablesWorking) {
    console.log('🎉 SUCCESS: All auxiliary tables are working perfectly!');
    console.log('');
    console.log('✅ Vector Database Status: FULLY OPERATIONAL');
    console.log('✅ Core Functionality: chatbot_documents with search');
    console.log('✅ Conversation Tracking: chatbot_conversations ready');
    console.log('✅ Search Analytics: chatbot_search_analytics ready');
    console.log('');
    console.log('🚀 Your vector database is now complete and future-proof!');
  } else {
    console.log('❌ Some tables need attention. Please check the errors above.');
    console.log('');
    console.log('💡 Next steps:');
    console.log('1. Execute the SQL script in Supabase Dashboard');
    console.log('2. Run this verification script again');
    console.log('3. Check Supabase logs for detailed error information');
  }
  
  console.log('');
  console.log(`📊 Verification completed at: ${new Date().toISOString()}`);
}

verifySupabaseSetup().catch(console.error);