require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkTables() {
  try {
    console.log('🔍 Checking Supabase tables for ColdCaller project...\n');
    
    const tablesToCheck = [
      'chatbot_documents',
      'chatbot_conversations', 
      'chatbot_search_analytics'
    ];
    
    let allTablesExist = true;
    const tableStatus = {};
    
    for (const table of tablesToCheck) {
      try {
        console.log(`🔄 Checking ${table}...`);
        
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
          
        if (error) {
          console.log(`❌ ${table}: ${error.message} (Code: ${error.code})`);
          tableStatus[table] = { exists: false, error: error.message, code: error.code };
          allTablesExist = false;
        } else {
          // Get record count
          const { count, error: countError } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
            
          const recordCount = countError ? 'unknown' : (count || 0);
          console.log(`✅ ${table}: Exists and accessible (${recordCount} records)`);
          tableStatus[table] = { exists: true, records: recordCount };
        }
      } catch (e) {
        console.log(`❌ ${table}: ${e.message}`);
        tableStatus[table] = { exists: false, error: e.message };
        allTablesExist = false;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('=' .repeat(50));
    
    if (allTablesExist) {
      console.log('✅ All required tables exist and are accessible!');
      console.log('\n🎯 Table Details:');
      for (const [table, status] of Object.entries(tableStatus)) {
        if (status.exists) {
          console.log(`   ${table}: ${status.records} records`);
        }
      }
      
      console.log('\n🚀 Vector database is ready for use!');
      
    } else {
      console.log('❌ Some tables are missing or inaccessible!');
      console.log('\n🔧 Missing/Problematic Tables:');
      for (const [table, status] of Object.entries(tableStatus)) {
        if (!status.exists) {
          console.log(`   ${table}: ${status.error} (Code: ${status.code || 'N/A'})`);
        }
      }
      
      console.log('\n💡 Recommendations:');
      console.log('1. Check if Supabase project was overwritten by another project');
      console.log('2. Run database migrations to recreate tables');
      console.log('3. Verify Supabase configuration in .env file');
      console.log('4. Check if pgvector extension is enabled');
      
      console.log('\n🔧 To recreate tables:');
      console.log('cd backend && node src/database/migrations/runMigrations.js up');
    }
    
  } catch (error) {
    console.error('💥 Script error:', error.message);
  }
}

checkTables();