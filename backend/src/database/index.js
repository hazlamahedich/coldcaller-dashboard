/**
 * Database Main Entry Point - Centralized database initialization and management
 */

const { connectWithRetry, gracefulShutdown, healthCheck } = require('./config/database');
const { initializeDatabase } = require('./models');
const { runMigrations } = require('./migrations/runMigrations');
const { startMonitoring } = require('./monitoring/performanceMonitor');
const { preloadCache, optimize: optimizeCache } = require('./cache/cacheManager');

// Database initialization options
const DEFAULT_OPTIONS = {
  runMigrations: true,
  enableMonitoring: true,
  preloadCache: true,
  logLevel: 'info'
};

/**
 * Initialize the complete database system
 */
const initializeCompleteDatabase = async (options = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('🚀 Initializing Cold Caller Database System...');
  const startTime = Date.now();
  
  try {
    // Step 1: Establish database connection
    console.log('🔗 Connecting to database...');
    await connectWithRetry();
    
    // Step 2: Run migrations if requested
    if (config.runMigrations) {
      console.log('🏗️  Running database migrations...');
      await runMigrations();
    }
    
    // Step 3: Initialize models and associations
    console.log('📋 Initializing database models...');
    const models = await initializeDatabase();
    
    // Step 4: Start performance monitoring
    if (config.enableMonitoring) {
      console.log('📊 Starting performance monitoring...');
      startMonitoring();
    }
    
    // Step 5: Preload cache with common data
    if (config.preloadCache) {
      console.log('💾 Preloading cache...');
      await preloadCache.popularLeads(models.Lead);
      await preloadCache.commonStats(models);
    }
    
    // Step 6: Verify system health
    console.log('🔍 Verifying database health...');
    const health = await healthCheck();
    
    if (health.status !== 'healthy') {
      console.warn('⚠️  Database health check shows issues:', health);
    }
    
    const duration = Date.now() - startTime;
    
    console.log('✅ Database system initialization complete!');
    console.log('📊 Initialization Summary:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Models: ${Object.keys(models).filter(k => k !== 'sequelize' && k !== 'Sequelize').length}`);
    console.log(`   Health Status: ${health.status}`);
    console.log(`   Performance Monitoring: ${config.enableMonitoring ? 'Enabled' : 'Disabled'}`);
    console.log(`   Cache Preloading: ${config.preloadCache ? 'Enabled' : 'Disabled'}`);
    
    return {
      models,
      health,
      duration,
      initialized: true
    };
    
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    throw new Error(`Database initialization failed: ${error.message}`);
  }
};

/**
 * Perform database health check with detailed diagnostics
 */
const performHealthCheck = async () => {
  try {
    console.log('🔍 Performing comprehensive database health check...');
    
    const results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      components: {}
    };
    
    // Check database connection
    try {
      const dbHealth = await healthCheck();
      results.components.database = dbHealth;
    } catch (error) {
      results.components.database = { status: 'unhealthy', error: error.message };
      results.status = 'unhealthy';
    }
    
    // Check models
    try {
      const models = require('./models');
      const modelHealth = await models.checkDatabaseHealth();
      results.components.models = modelHealth;
      
      if (modelHealth.status !== 'healthy') {
        results.status = 'degraded';
      }
    } catch (error) {
      results.components.models = { status: 'unhealthy', error: error.message };
      results.status = 'unhealthy';
    }
    
    // Check performance monitoring
    try {
      const { healthCheck: perfHealthCheck } = require('./monitoring/performanceMonitor');
      const perfHealth = await perfHealthCheck();
      results.components.performance = perfHealth;
      
      if (perfHealth.status === 'unhealthy') {
        results.status = 'unhealthy';
      } else if (perfHealth.status === 'degraded' && results.status === 'healthy') {
        results.status = 'degraded';
      }
    } catch (error) {
      results.components.performance = { status: 'unhealthy', error: error.message };
    }
    
    // Check cache system
    try {
      const { healthCheck: cacheHealthCheck } = require('./cache/cacheManager');
      const cacheHealth = cacheHealthCheck();
      results.components.cache = cacheHealth;
      
      if (cacheHealth.status !== 'healthy' && results.status === 'healthy') {
        results.status = 'degraded';
      }
    } catch (error) {
      results.components.cache = { status: 'unhealthy', error: error.message };
    }
    
    console.log(`🏥 Health check completed - Status: ${results.status}`);
    return results;
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return {
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Optimize database performance
 */
const optimizeDatabase = async () => {
  console.log('⚡ Starting database optimization...');
  
  try {
    // Optimize cache
    optimizeCache();
    
    // Generate performance recommendations
    const { generateOptimizationRecommendations } = require('./monitoring/performanceMonitor');
    const recommendations = await generateOptimizationRecommendations();
    
    if (recommendations.length > 0) {
      console.log('💡 Performance Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.suggestion || rec.sql}`);
        if (rec.priority === 'high') {
          console.log(`      Priority: HIGH - ${rec.benefit || 'Significant performance impact'}`);
        }
      });
    } else {
      console.log('✅ No immediate optimization recommendations');
    }
    
    console.log('⚡ Database optimization complete');
    return recommendations;
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  }
};

/**
 * Gracefully shutdown database connections
 */
const shutdownDatabase = async () => {
  console.log('🔄 Shutting down database system...');
  
  try {
    // Shutdown cache
    const { shutdown: shutdownCache } = require('./cache/cacheManager');
    shutdownCache();
    
    // Close database connections
    await gracefulShutdown();
    
    console.log('✅ Database system shutdown complete');
    
  } catch (error) {
    console.error('❌ Database shutdown error:', error);
    throw error;
  }
};

/**
 * Get database system statistics
 */
const getDatabaseStats = async () => {
  try {
    const { getPerformanceStats } = require('./monitoring/performanceMonitor');
    const { getPerformanceMetrics } = require('./cache/cacheManager');
    const { getConnectionStats } = require('./config/database');
    
    return {
      timestamp: new Date().toISOString(),
      performance: getPerformanceStats(),
      cache: getPerformanceMetrics(),
      connections: getConnectionStats()
    };
    
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Process event handlers
process.on('SIGINT', async () => {
  console.log('📶 Received SIGINT, shutting down database gracefully...');
  await shutdownDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📶 Received SIGTERM, shutting down database gracefully...');
  await shutdownDatabase();
  process.exit(0);
});

module.exports = {
  initializeCompleteDatabase,
  performHealthCheck,
  optimizeDatabase,
  shutdownDatabase,
  getDatabaseStats
};