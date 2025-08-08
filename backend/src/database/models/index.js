/**
 * Database Models Index - Centralized model definitions and associations
 */

const { sequelize } = require('../config/database');
const { defineLeadModel } = require('./Lead');
const { defineContactModel } = require('./Contact');
const { defineCallLogModel } = require('./CallLog');

// Initialize all models
const models = {
  Lead: defineLeadModel(sequelize),
  Contact: defineContactModel(sequelize),
  CallLog: defineCallLogModel(sequelize)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Lead associations
models.Lead.hasMany(models.Contact, {
  foreignKey: 'leadId',
  as: 'contacts',
  onDelete: 'CASCADE'
});

models.Lead.hasMany(models.CallLog, {
  foreignKey: 'leadId',
  as: 'callLogs',
  onDelete: 'CASCADE'
});

// Add model utilities
models.sequelize = sequelize;
models.Sequelize = require('sequelize');

// Database initialization function
const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync models (create tables)
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized');
    
    return models;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    await sequelize.authenticate();
    
    // Check each table
    const tableChecks = await Promise.all([
      models.Lead.count(),
      models.Contact.count(),
      models.CallLog.count()
    ]);
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tables: {
        leads: tableChecks[0],
        contacts: tableChecks[1],
        callLogs: tableChecks[2]
      },
      totalRecords: tableChecks.reduce((sum, count) => sum + count, 0)
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Export all models and utilities
module.exports = {
  ...models,
  initializeDatabase,
  checkDatabaseHealth
};