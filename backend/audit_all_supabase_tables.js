require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function auditAllSupabaseTables() {
  console.log('🔍 Comprehensive Supabase Tables Audit...\n');
  
  // All tables from our migration files
  const expectedTables = [
    // Core business tables
    'leads',
    'contacts', 
    'call_logs',
    'enhanced_call_logs',
    'notes',
    'note_templates',
    
    // Chatbot/Vector DB tables
    'chatbot_documents',
    'chatbot_conversations',
    'chatbot_search_analytics',
    
    // Integration tables
    'integrations',
    'integration_logs',
    'calendar_events',
    'calendar_sync_logs',
    'email_templates',
    'email_logs',
    
    // SIP/Telephony tables
    'sip_accounts',
    'sip_registrations',
    'sip_call_sessions',
    'sip_configurations',
    
    // LLM/AI tables
    'llm_configurations',
    'llm_usage_logs',
    'llm_model_performance',
    
    // System tables
    'migrations'
  ];
  
  const tableStatus = {};
  let existingTables = 0;
  let missingTables = 0;
  
  console.log('📊 Checking all expected tables...\n');
  
  for (const table of expectedTables) {
    try {
      console.log(`🔄 Checking ${table}...`);
      
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('Could not find')) {
          console.log(`❌ ${table}: Table not found`);
          tableStatus[table] = { exists: false, error: 'Table not found', records: 0 };
          missingTables++;
        } else {
          console.log(`⚠️ ${table}: ${error.message}`);
          tableStatus[table] = { exists: false, error: error.message, records: 0 };
          missingTables++;
        }
      } else {
        console.log(`✅ ${table}: Exists with ${count || 0} records`);
        tableStatus[table] = { exists: true, records: count || 0 };
        existingTables++;
      }
      
    } catch (e) {
      console.log(`❌ ${table}: Unexpected error - ${e.message}`);
      tableStatus[table] = { exists: false, error: e.message, records: 0 };
      missingTables++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(70));
  console.log(`📈 Total Expected Tables: ${expectedTables.length}`);
  console.log(`✅ Existing Tables: ${existingTables}`);
  console.log(`❌ Missing Tables: ${missingTables}`);
  console.log(`📊 Success Rate: ${Math.round((existingTables/expectedTables.length)*100)}%`);
  
  // Show existing tables with record counts
  console.log('\n✅ EXISTING TABLES:');
  console.log('-'.repeat(50));
  Object.entries(tableStatus)
    .filter(([table, status]) => status.exists)
    .sort(([,a], [,b]) => b.records - a.records)
    .forEach(([table, status]) => {
      const recordCount = status.records.toLocaleString();
      console.log(`   ${table.padEnd(25)} | ${recordCount.padStart(8)} records`);
    });
  
  // Show missing tables
  if (missingTables > 0) {
    console.log('\n❌ MISSING TABLES:');
    console.log('-'.repeat(50));
    Object.entries(tableStatus)
      .filter(([table, status]) => !status.exists)
      .forEach(([table, status]) => {
        console.log(`   ${table.padEnd(25)} | ${status.error}`);
      });
      
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Run production migrations to create missing tables');
    console.log('2. Check if tables exist under different names');
    console.log('3. Verify Supabase project configuration');
    console.log('4. Consider running individual table creation scripts');
  }
  
  // Check for any unexpected tables that might exist
  console.log('\n🔍 Checking for additional tables in Supabase...');
  try {
    // This is a bit of a hack - we'll try to query the information_schema through a simple query
    const { data: additionalCheck, error: additionalError } = await supabase
      .rpc('get_table_list') // Custom function if it exists
      .then(() => console.log('✅ Additional table information retrieved'))
      .catch(() => console.log('ℹ️ No additional table query function available'));
      
  } catch (e) {
    console.log('ℹ️ Could not query additional table information');
  }
  
  console.log('\n📝 RECOMMENDATIONS BASED ON RESULTS:');
  
  if (existingTables === 0) {
    console.log('🚨 CRITICAL: No tables found! This suggests:');
    console.log('   - Wrong Supabase project');
    console.log('   - Migrations never run on production');
    console.log('   - Database connection issues');
  } else if (missingTables > 0) {
    console.log('⚠️ PARTIAL: Some tables missing. This suggests:');
    console.log('   - Migrations partially completed');
    console.log('   - Some migrations failed silently');
    console.log('   - Manual table creation needed');
  } else {
    console.log('🎉 EXCELLENT: All tables exist!');
    console.log('   - Database fully migrated');
    console.log('   - System ready for production');
  }
  
  console.log(`\n📅 Audit completed: ${new Date().toISOString()}`);
  
  return {
    total: expectedTables.length,
    existing: existingTables,
    missing: missingTables,
    tableStatus: tableStatus
  };
}

auditAllSupabaseTables().catch(console.error);