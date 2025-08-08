/**
 * Seeder Runner - Execute database seeders to populate with sample data
 */

const { connectWithRetry } = require('../config/database');
const { initializeDatabase } = require('../models');
const { seedDatabase } = require('./seedLeads');

// Default seeding options
const DEFAULT_OPTIONS = {
  leadCount: process.env.SEED_LEAD_COUNT ? parseInt(process.env.SEED_LEAD_COUNT) : 100,
  contactsPerLead: 2,
  callLogsPerLead: 3,
  clearExisting: false
};

// Parse command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { ...DEFAULT_OPTIONS };
  
  args.forEach(arg => {
    if (arg.startsWith('--leads=')) {
      options.leadCount = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--contacts=')) {
      options.contactsPerLead = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--calls=')) {
      options.callLogsPerLead = parseInt(arg.split('=')[1]);
    } else if (arg === '--clear') {
      options.clearExisting = true;
    } else if (arg === '--help') {
      console.log(`
Database Seeder Usage:

  npm run db:seed [options]

Options:
  --leads=N         Number of leads to create (default: 100)
  --contacts=N      Contacts per lead (default: 2)  
  --calls=N         Call logs per lead (default: 3)
  --clear           Clear existing data before seeding
  --help            Show this help message

Examples:
  npm run db:seed
  npm run db:seed -- --leads=50 --clear
  npm run db:seed -- --leads=200 --contacts=3 --calls=5
      `);
      process.exit(0);
    }
  });
  
  return options;
};

// Validate database before seeding
const validateDatabase = async (models) => {
  console.log('🔍 Validating database structure...');
  
  try {
    // Check if tables exist
    const tables = ['leads', 'contacts', 'call_logs'];
    
    for (const table of tables) {
      const count = await models[table.charAt(0).toUpperCase() + table.slice(1).replace('_', '')].count();
      console.log(`   ✅ Table '${table}' exists (${count} records)`);
    }
    
    console.log('✅ Database validation passed');
    return true;
    
  } catch (error) {
    console.error('❌ Database validation failed:', error.message);
    console.log('💡 Hint: Run "npm run db:migrate" first to create the database structure');
    return false;
  }
};

// Display seeding statistics
const displayStatistics = async (models) => {
  console.log('📊 Current Database Statistics:');
  
  try {
    const stats = {
      leads: await models.Lead.count(),
      contacts: await models.Contact.count(),
      callLogs: await models.CallLog.count()
    };
    
    console.log(`   📋 Leads: ${stats.leads}`);
    console.log(`   📞 Contacts: ${stats.contacts}`);
    console.log(`   📱 Call Logs: ${stats.callLogs}`);
    
    // Lead status breakdown
    const leadStatusStats = await models.Lead.findAll({
      attributes: [
        'status',
        [models.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    console.log('   📊 Lead Status Breakdown:');
    leadStatusStats.forEach(stat => {
      console.log(`      ${stat.status}: ${stat.count}`);
    });
    
    // Recent activity
    const recentCalls = await models.CallLog.count({
      where: {
        initiatedAt: {
          [models.sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    
    console.log(`   📈 Calls in last 24h: ${recentCalls}`);
    
  } catch (error) {
    console.error('❌ Failed to display statistics:', error);
  }
};

// Main seeding function
const runSeeders = async (options = DEFAULT_OPTIONS) => {
  console.log('🌱 Starting database seeding process...');
  console.log('📋 Seeding Options:');
  console.log(`   Leads: ${options.leadCount}`);
  console.log(`   Contacts per lead: ${options.contactsPerLead}`);
  console.log(`   Call logs per lead: ${options.callLogsPerLead}`);
  console.log(`   Clear existing: ${options.clearExisting ? 'Yes' : 'No'}`);
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Connect to database
    console.log('🔗 Connecting to database...');
    await connectWithRetry();
    
    // Initialize models
    console.log('🏗️  Initializing database models...');
    const models = await initializeDatabase();
    
    // Validate database structure
    const isValid = await validateDatabase(models);
    if (!isValid) {
      throw new Error('Database validation failed');
    }
    
    // Display current statistics
    await displayStatistics(models);
    console.log('');
    
    // Confirm before clearing data
    if (options.clearExisting) {
      console.log('⚠️  Warning: This will DELETE ALL EXISTING DATA!');
      
      // In production, we'd want to prompt for confirmation
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Cannot clear data in production environment');
      }
      
      console.log('🧹 Proceeding with data clearing...');
    }
    
    // Run the seeding process
    const result = await seedDatabase(models, options);
    
    const duration = Date.now() - startTime;
    
    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('⏱️  Total Duration:', Math.round(duration / 1000), 'seconds');
    console.log('');
    
    // Display final statistics
    await displayStatistics(models);
    
    return result;
    
  } catch (error) {
    console.error('💥 Seeding process failed:', error);
    throw error;
  }
};

// Error handling wrapper
const safeRun = async () => {
  try {
    const options = parseArgs();
    await runSeeders(options);
    console.log('✅ Seeding process completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding process failed:', error.message);
    
    // Provide helpful hints based on error type
    if (error.message.includes('ENOENT') || error.message.includes('no such table')) {
      console.log('💡 Hint: Run "npm run db:migrate" first to create the database structure');
    } else if (error.message.includes('EACCES')) {
      console.log('💡 Hint: Check database file permissions');
    } else if (error.message.includes('connection')) {
      console.log('💡 Hint: Check database connection settings');
    }
    
    process.exit(1);
  }
};

// Export functions for programmatic use
module.exports = {
  runSeeders,
  validateDatabase,
  displayStatistics,
  DEFAULT_OPTIONS
};

// Run if called directly
if (require.main === module) {
  safeRun();
}