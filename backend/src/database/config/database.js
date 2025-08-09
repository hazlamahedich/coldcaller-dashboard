/**
 * Database Configuration and Connection Management
 * Supports SQLite for development and PostgreSQL for production
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

// Environment configuration
const env = process.env.NODE_ENV || 'development';
const isDev = env === 'development';
const isTest = env === 'test';
const isProd = env === 'production';

// Database configuration
const config = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../../data/coldcaller_dev.sqlite'),
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'coldcaller_prod',
    username: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || ''),
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
};

// Initialize Sequelize with current environment config
const dbConfig = config[env];
const sequelize = new Sequelize(dbConfig);

// Connection pooling and retry logic
const connectWithRetry = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log(`✅ Database connected successfully (${env} environment)`);
      
      // Additional connection info for production
      if (isProd) {
        console.log(`📊 Pool config: max=${dbConfig.pool.max}, min=${dbConfig.pool.min}`);
      }
      
      return sequelize;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        console.error('🚨 All database connection attempts failed');
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, i) * 1000;
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    console.log('🔄 Closing database connections...');
    await sequelize.close();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};

// Performance monitoring
const getConnectionStats = () => {
  const pool = sequelize.connectionManager.pool;
  return {
    environment: env,
    dialect: dbConfig.dialect,
    pool: {
      size: pool?.size || 0,
      available: pool?.available || 0,
      using: pool?.using || 0,
      waiting: pool?.waiting || 0
    },
    config: {
      maxConnections: dbConfig.pool.max,
      minConnections: dbConfig.pool.min,
      acquireTimeout: dbConfig.pool.acquire,
      idleTimeout: dbConfig.pool.idle
    }
  };
};

// Health check
const healthCheck = async () => {
  try {
    await sequelize.authenticate();
    const stats = getConnectionStats();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ...stats
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Export configuration and utilities
module.exports = {
  sequelize,
  config,
  connectWithRetry,
  gracefulShutdown,
  getConnectionStats,
  healthCheck,
  isDev,
  isTest,
  isProd
};