/**
 * Database Performance Monitor - Query performance tracking and optimization analysis
 */

const { sequelize } = require('../config/database');
const { performance } = require('perf_hooks');

// Performance metrics collection
const metrics = {
  queries: {
    total: 0,
    totalTime: 0,
    slowQueries: [],
    byModel: {},
    byType: {
      SELECT: { count: 0, totalTime: 0 },
      INSERT: { count: 0, totalTime: 0 },
      UPDATE: { count: 0, totalTime: 0 },
      DELETE: { count: 0, totalTime: 0 }
    }
  },
  connections: {
    active: 0,
    peak: 0,
    total: 0
  },
  startTime: Date.now(),
  lastReset: Date.now()
};

// Configuration
const SLOW_QUERY_THRESHOLD = 1000; // 1 second
const MAX_SLOW_QUERIES = 100;

// Query interception for monitoring
const setupQueryMonitoring = () => {
  // Hook into Sequelize query logging
  const originalQuery = sequelize.query;
  
  sequelize.query = function(...args) {
    const startTime = performance.now();
    const sql = args[0];
    const queryType = detectQueryType(sql);
    
    // Execute original query
    const result = originalQuery.apply(this, args);
    
    // Track performance for promises
    if (result && typeof result.then === 'function') {
      return result.then(
        (queryResult) => {
          recordQueryMetrics(sql, queryType, startTime, false);
          return queryResult;
        },
        (error) => {
          recordQueryMetrics(sql, queryType, startTime, true, error);
          throw error;
        }
      );
    }
    
    return result;
  };
  
  console.log('📊 Query performance monitoring enabled');
};

// Detect SQL query type
const detectQueryType = (sql) => {
  const sqlUpper = sql.toUpperCase().trim();
  
  if (sqlUpper.startsWith('SELECT')) return 'SELECT';
  if (sqlUpper.startsWith('INSERT')) return 'INSERT';
  if (sqlUpper.startsWith('UPDATE')) return 'UPDATE';
  if (sqlUpper.startsWith('DELETE')) return 'DELETE';
  if (sqlUpper.startsWith('CREATE')) return 'CREATE';
  if (sqlUpper.startsWith('DROP')) return 'DROP';
  if (sqlUpper.startsWith('ALTER')) return 'ALTER';
  
  return 'OTHER';
};

// Record query performance metrics
const recordQueryMetrics = (sql, queryType, startTime, hasError = false, error = null) => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Update global metrics
  metrics.queries.total++;
  metrics.queries.totalTime += duration;
  
  // Update by type metrics
  if (metrics.queries.byType[queryType]) {
    metrics.queries.byType[queryType].count++;
    metrics.queries.byType[queryType].totalTime += duration;
  }
  
  // Track slow queries
  if (duration > SLOW_QUERY_THRESHOLD) {
    const slowQuery = {
      sql: sql.length > 200 ? sql.substring(0, 200) + '...' : sql,
      duration: Math.round(duration),
      timestamp: new Date().toISOString(),
      type: queryType,
      hasError,
      error: error ? error.message : null
    };
    
    metrics.queries.slowQueries.push(slowQuery);
    
    // Keep only recent slow queries
    if (metrics.queries.slowQueries.length > MAX_SLOW_QUERIES) {
      metrics.queries.slowQueries.shift();
    }
    
    console.warn(`🐌 Slow query detected (${duration.toFixed(2)}ms): ${slowQuery.sql}`);
  }
  
  // Extract model name for model-specific metrics
  const modelMatch = sql.match(/FROM `?(\w+)`?/i) || sql.match(/INTO `?(\w+)`?/i) || sql.match(/UPDATE `?(\w+)`?/i);
  if (modelMatch) {
    const modelName = modelMatch[1];
    if (!metrics.queries.byModel[modelName]) {
      metrics.queries.byModel[modelName] = { count: 0, totalTime: 0, slowQueries: 0 };
    }
    
    metrics.queries.byModel[modelName].count++;
    metrics.queries.byModel[modelName].totalTime += duration;
    
    if (duration > SLOW_QUERY_THRESHOLD) {
      metrics.queries.byModel[modelName].slowQueries++;
    }
  }
};

// Monitor database connections
const monitorConnections = () => {
  const pool = sequelize.connectionManager.pool;
  
  if (pool) {
    metrics.connections.active = pool.used?.length || 0;
    metrics.connections.peak = Math.max(metrics.connections.peak, metrics.connections.active);
  }
};

// Get performance statistics
const getPerformanceStats = () => {
  monitorConnections();
  
  const uptime = Date.now() - metrics.startTime;
  const avgQueryTime = metrics.queries.total > 0 ? metrics.queries.totalTime / metrics.queries.total : 0;
  
  return {
    uptime: Math.floor(uptime / 1000), // seconds
    queries: {
      total: metrics.queries.total,
      averageTime: parseFloat(avgQueryTime.toFixed(2)),
      totalTime: parseFloat(metrics.queries.totalTime.toFixed(2)),
      slowQueries: metrics.queries.slowQueries.length,
      queryRate: parseFloat((metrics.queries.total / (uptime / 1000)).toFixed(2)), // queries per second
      
      byType: Object.keys(metrics.queries.byType).reduce((stats, type) => {
        const typeMetrics = metrics.queries.byType[type];
        stats[type] = {
          count: typeMetrics.count,
          percentage: metrics.queries.total > 0 ? 
            parseFloat((typeMetrics.count / metrics.queries.total * 100).toFixed(1)) : 0,
          averageTime: typeMetrics.count > 0 ? 
            parseFloat((typeMetrics.totalTime / typeMetrics.count).toFixed(2)) : 0
        };
        return stats;
      }, {}),
      
      byModel: Object.keys(metrics.queries.byModel).reduce((stats, model) => {
        const modelMetrics = metrics.queries.byModel[model];
        stats[model] = {
          count: modelMetrics.count,
          averageTime: parseFloat((modelMetrics.totalTime / modelMetrics.count).toFixed(2)),
          slowQueries: modelMetrics.slowQueries
        };
        return stats;
      }, {})
    },
    
    connections: {
      active: metrics.connections.active,
      peak: metrics.connections.peak,
      total: metrics.connections.total
    },
    
    recentSlowQueries: metrics.queries.slowQueries.slice(-10) // Last 10 slow queries
  };
};

// Analyze query patterns for optimization suggestions
const analyzeQueryPatterns = () => {
  const analysis = {
    issues: [],
    suggestions: [],
    optimizations: []
  };
  
  const stats = getPerformanceStats();
  
  // Check for performance issues
  if (stats.queries.averageTime > 100) {
    analysis.issues.push({
      type: 'high_average_query_time',
      severity: 'medium',
      description: `Average query time is ${stats.queries.averageTime}ms (threshold: 100ms)`,
      impact: 'Performance degradation'
    });
    
    analysis.suggestions.push('Consider adding database indexes for frequently queried fields');
    analysis.suggestions.push('Review and optimize slow queries');
  }
  
  if (stats.queries.slowQueries > 10) {
    analysis.issues.push({
      type: 'many_slow_queries',
      severity: 'high', 
      description: `${stats.queries.slowQueries} slow queries detected`,
      impact: 'Poor user experience'
    });
    
    analysis.suggestions.push('Analyze slow query patterns and add appropriate indexes');
    analysis.suggestions.push('Consider query optimization or data restructuring');
  }
  
  // Check connection usage
  if (stats.connections.active > 15) {
    analysis.issues.push({
      type: 'high_connection_usage',
      severity: 'medium',
      description: `${stats.connections.active} active connections`,
      impact: 'Resource consumption'
    });
    
    analysis.suggestions.push('Review connection pooling configuration');
    analysis.suggestions.push('Implement connection optimization strategies');
  }
  
  // Analyze query distribution
  const selectPercentage = stats.queries.byType.SELECT?.percentage || 0;
  if (selectPercentage < 70) {
    analysis.issues.push({
      type: 'low_read_ratio',
      severity: 'low',
      description: `Only ${selectPercentage}% of queries are SELECT statements`,
      impact: 'Possible inefficient data access patterns'
    });
    
    analysis.suggestions.push('Consider caching frequently accessed data');
  }
  
  // Model-specific analysis
  Object.entries(stats.queries.byModel).forEach(([model, modelStats]) => {
    if (modelStats.averageTime > 200) {
      analysis.issues.push({
        type: 'slow_model_queries',
        severity: 'medium',
        description: `${model} queries average ${modelStats.averageTime}ms`,
        impact: `Slow performance for ${model} operations`,
        model
      });
      
      analysis.optimizations.push({
        model,
        suggestion: `Add indexes for commonly queried ${model} fields`,
        priority: 'high'
      });
    }
    
    if (modelStats.slowQueries > 5) {
      analysis.optimizations.push({
        model,
        suggestion: `Optimize ${model} queries - ${modelStats.slowQueries} slow queries detected`,
        priority: 'medium'
      });
    }
  });
  
  return analysis;
};

// Generate optimization recommendations
const generateOptimizationRecommendations = async () => {
  const recommendations = [];
  
  try {
    // Check for missing indexes
    const tables = ['leads', 'contacts', 'call_logs'];
    
    for (const table of tables) {
      const indexes = await sequelize.query(
        `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='${table}'`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      const indexNames = indexes.map(idx => idx.name);
      
      // Common optimization recommendations
      const commonIndexes = {
        leads: ['email', 'phone', 'status', 'priority', 'assignedTo', 'nextFollowUpDate'],
        contacts: ['leadId', 'type', 'isPrimary'],
        call_logs: ['leadId', 'initiatedAt', 'status', 'agentId']
      };
      
      const missingIndexes = commonIndexes[table]?.filter(field => 
        !indexNames.some(idx => idx.includes(field))
      ) || [];
      
      missingIndexes.forEach(field => {
        recommendations.push({
          type: 'create_index',
          table,
          field,
          priority: 'high',
          sql: `CREATE INDEX idx_${table}_${field} ON ${table}(${field})`,
          benefit: 'Faster queries on frequently accessed field'
        });
      });
    }
    
    // Check for query optimization opportunities
    const analysis = analyzeQueryPatterns();
    
    analysis.optimizations.forEach(opt => {
      recommendations.push({
        type: 'query_optimization',
        model: opt.model,
        suggestion: opt.suggestion,
        priority: opt.priority
      });
    });
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
  }
  
  return recommendations;
};

// Reset metrics
const resetMetrics = () => {
  metrics.queries = {
    total: 0,
    totalTime: 0,
    slowQueries: [],
    byModel: {},
    byType: {
      SELECT: { count: 0, totalTime: 0 },
      INSERT: { count: 0, totalTime: 0 },
      UPDATE: { count: 0, totalTime: 0 },
      DELETE: { count: 0, totalTime: 0 }
    }
  };
  
  metrics.lastReset = Date.now();
  console.log('📊 Performance metrics reset');
};

// Health check
const healthCheck = async () => {
  try {
    const startTime = performance.now();
    await sequelize.authenticate();
    const connectionTime = performance.now() - startTime;
    
    const stats = getPerformanceStats();
    const analysis = analyzeQueryPatterns();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connectionTime: parseFloat(connectionTime.toFixed(2)),
      performance: {
        averageQueryTime: stats.queries.averageTime,
        slowQueries: stats.queries.slowQueries,
        activeConnections: stats.connections.active
      },
      issues: analysis.issues.length,
      criticalIssues: analysis.issues.filter(i => i.severity === 'high').length
    };
    
    // Determine overall health
    if (connectionTime > 1000 || analysis.issues.filter(i => i.severity === 'high').length > 0) {
      healthStatus.status = 'unhealthy';
    } else if (connectionTime > 500 || analysis.issues.length > 3) {
      healthStatus.status = 'degraded';
    }
    
    return healthStatus;
    
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Start monitoring
const startMonitoring = () => {
  setupQueryMonitoring();
  
  // Periodic connection monitoring
  setInterval(monitorConnections, 30000); // Every 30 seconds
  
  console.log('🚀 Database performance monitoring started');
};

module.exports = {
  startMonitoring,
  getPerformanceStats,
  analyzeQueryPatterns,
  generateOptimizationRecommendations,
  resetMetrics,
  healthCheck,
  metrics
};