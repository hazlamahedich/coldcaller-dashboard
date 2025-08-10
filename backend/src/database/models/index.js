/**
 * Database Models Index - Centralized model definitions and associations
 */

const { sequelize } = require('../config/database');
const { defineLeadModel } = require('./Lead');
const { defineContactModel } = require('./Contact');
const { defineCallLogModel } = require('./CallLog');
const { defineIntegrationSettingsModel } = require('./IntegrationSettings');
const { defineCalendarEventModel } = require('./CalendarEvent');
const { defineEmailSyncModel } = require('./EmailSync');

// Initialize all models
const models = {
  Lead: defineLeadModel(sequelize),
  Contact: defineContactModel(sequelize),
  CallLog: defineCallLogModel(sequelize),
  IntegrationSettings: defineIntegrationSettingsModel(sequelize),
  CalendarEvent: defineCalendarEventModel(sequelize),
  EmailSync: defineEmailSyncModel(sequelize)
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

// Integration associations
models.IntegrationSettings.belongsTo(models.Lead, {
  foreignKey: 'userId', // Assuming userId corresponds to leadId for user identification
  as: 'user',
  onDelete: 'CASCADE'
});

models.CalendarEvent.belongsTo(models.IntegrationSettings, {
  foreignKey: 'integrationId',
  as: 'integration',
  onDelete: 'CASCADE'
});

models.CalendarEvent.belongsTo(models.Lead, {
  foreignKey: 'leadId',
  as: 'lead'
});

models.EmailSync.belongsTo(models.IntegrationSettings, {
  foreignKey: 'integrationId',
  as: 'integration',
  onDelete: 'CASCADE'
});

models.EmailSync.belongsTo(models.Lead, {
  foreignKey: 'leadId',
  as: 'lead'
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
      models.CallLog.count(),
      models.IntegrationSettings.count(),
      models.CalendarEvent.count(),
      models.EmailSync.count()
    ]);
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tables: {
        leads: tableChecks[0],
        contacts: tableChecks[1],
        callLogs: tableChecks[2],
        integrationSettings: tableChecks[3],
        calendarEvents: tableChecks[4],
        emailSyncs: tableChecks[5]
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