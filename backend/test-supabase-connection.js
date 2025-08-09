/**
 * Test Supabase Connection Script
 * Run this after updating the connection details
 */

const { Sequelize } = require('sequelize');

// Test connection function
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  // Get connection details from environment
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME || 'postgres';
  const username = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD;

  console.log(`📊 Connection details:
  Host: ${host}
  Port: ${port}
  Database: ${database}
  Username: ${username}
  Password: ${password ? '***' + password.slice(-4) : 'NOT SET'}
  `);

  try {
    const sequelize = new Sequelize({
      dialect: 'postgres',
      host,
      port,
      database,
      username,
      password,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });

    // Test authentication
    await sequelize.authenticate();
    console.log('✅ Successfully connected to Supabase PostgreSQL!');

    // Test basic query
    const [results] = await sequelize.query('SELECT version(), current_database(), current_user;');
    console.log('📋 Database info:', results[0]);

    // List existing tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📝 Existing tables:', tables.map(t => t.table_name));
    
    await sequelize.close();
    console.log('🎉 Connection test completed successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config({ path: '../.env' });
  testSupabaseConnection();
}

module.exports = { testSupabaseConnection };