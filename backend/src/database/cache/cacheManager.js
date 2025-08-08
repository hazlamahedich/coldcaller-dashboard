/**
 * Cache Manager - High-performance caching layer for database operations
 */

const NodeCache = require('node-cache');
const { performance } = require('perf_hooks');

// Cache configurations for different data types
const CACHE_CONFIGS = {
  leads: {
    stdTTL: 300,     // 5 minutes
    checkperiod: 60,  // Check for expired keys every minute
    useClones: false, // Don't clone objects for better performance
    maxKeys: 1000    // Maximum number of cached leads
  },
  contacts: {
    stdTTL: 600,     // 10 minutes
    checkperiod: 120,
    useClones: false,
    maxKeys: 2000
  },
  callLogs: {
    stdTTL: 180,     // 3 minutes
    checkperiod: 30,
    useClones: false,
    maxKeys: 500
  },
  stats: {
    stdTTL: 60,      // 1 minute
    checkperiod: 15,
    useClones: false,
    maxKeys: 100
  },
  queries: {
    stdTTL: 120,     // 2 minutes
    checkperiod: 30,
    useClones: false,
    maxKeys: 500
  }
};

// Initialize cache instances
const caches = {};
Object.keys(CACHE_CONFIGS).forEach(cacheType => {
  caches[cacheType] = new NodeCache(CACHE_CONFIGS[cacheType]);
});

// Performance metrics
const metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  totalQueryTime: 0,
  cacheQueryTime: 0,
  startTime: Date.now()
};

// Cache key generators
const generateKey = {
  lead: (id) => `lead:${id}`,
  leadList: (query) => `leads:${JSON.stringify(query)}`,
  leadStats: () => 'stats:leads',
  leadSearch: (searchTerm, filters) => `search:${searchTerm}:${JSON.stringify(filters)}`,
  
  contact: (leadId, type) => `contact:${leadId}:${type}`,
  contactList: (leadId) => `contacts:${leadId}`,
  
  callLog: (id) => `call:${id}`,
  callLogs: (leadId) => `calls:${leadId}`,
  callStats: (agentId, dateRange) => `callstats:${agentId}:${JSON.stringify(dateRange)}`,
  
  query: (sql, params) => `query:${require('crypto').createHash('md5').update(sql + JSON.stringify(params || [])).digest('hex')}`
};

// Cache wrapper for database operations
const cacheWrapper = (cacheType, key, operation, ttl = null) => {
  return async (...args) => {
    const cache = caches[cacheType];
    const cacheKey = typeof key === 'function' ? key(...args) : key;
    
    // Try to get from cache first
    const startTime = performance.now();
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult !== undefined) {
      metrics.hits++;
      metrics.cacheQueryTime += performance.now() - startTime;
      return cachedResult;
    }
    
    // Cache miss - execute operation
    metrics.misses++;
    const operationStartTime = performance.now();
    
    try {
      const result = await operation(...args);
      const operationTime = performance.now() - operationStartTime;
      metrics.totalQueryTime += operationTime;
      
      // Store in cache
      const cacheTTL = ttl || CACHE_CONFIGS[cacheType].stdTTL;
      cache.set(cacheKey, result, cacheTTL);
      metrics.sets++;
      
      return result;
    } catch (error) {
      console.error(`Cache operation failed for key ${cacheKey}:`, error);
      throw error;
    }
  };
};

// Cache invalidation strategies
const invalidateCache = {
  lead: (leadId) => {
    const leadCache = caches.leads;
    const contactCache = caches.contacts;
    const callLogCache = caches.callLogs;
    
    // Remove specific lead
    leadCache.del(generateKey.lead(leadId));
    
    // Remove lead lists (they might contain this lead)
    leadCache.flushAll(); // More aggressive - could be optimized
    
    // Remove related data
    contactCache.del(generateKey.contactList(leadId));
    callLogCache.del(generateKey.callLogs(leadId));
    
    // Clear stats cache
    caches.stats.flushAll();
    
    metrics.deletes++;
  },
  
  contact: (leadId, contactId) => {
    const contactCache = caches.contacts;
    contactCache.del(generateKey.contactList(leadId));
    metrics.deletes++;
  },
  
  callLog: (leadId, callId) => {
    const callLogCache = caches.callLogs;
    callLogCache.del(generateKey.callLogs(leadId));
    if (callId) {
      callLogCache.del(generateKey.callLog(callId));
    }
    
    // Clear related stats
    caches.stats.flushAll();
    
    metrics.deletes++;
  },
  
  all: () => {
    Object.values(caches).forEach(cache => cache.flushAll());
    console.log('🧹 All caches cleared');
  }
};

// Smart cache preloading
const preloadCache = {
  popularLeads: async (LeadModel) => {
    try {
      // Preload high-priority and recently updated leads
      const popularLeads = await LeadModel.findAll({
        where: {
          $or: [
            { priority: 'high' },
            { priority: 'urgent' },
            {
              updatedAt: {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          ]
        },
        limit: 50
      });
      
      const leadCache = caches.leads;
      popularLeads.forEach(lead => {
        leadCache.set(generateKey.lead(lead.id), lead.toJSON(), 600); // 10 minutes
      });
      
      console.log(`📦 Preloaded ${popularLeads.length} popular leads`);
    } catch (error) {
      console.error('Cache preloading failed:', error);
    }
  },
  
  commonStats: async (models) => {
    try {
      const stats = {
        totalLeads: await models.Lead.count(),
        activeLeads: await models.Lead.count({ where: { isActive: true } }),
        todayCalls: await models.CallLog.count({
          where: {
            initiatedAt: {
              $gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      };
      
      caches.stats.set('dashboard:stats', stats, 300); // 5 minutes
      console.log('📊 Preloaded dashboard stats');
    } catch (error) {
      console.error('Stats preloading failed:', error);
    }
  }
};

// Cache performance monitoring
const getPerformanceMetrics = () => {
  const uptime = Date.now() - metrics.startTime;
  const hitRate = metrics.hits / (metrics.hits + metrics.misses) * 100 || 0;
  const avgCacheTime = metrics.cacheQueryTime / metrics.hits || 0;
  const avgQueryTime = metrics.totalQueryTime / metrics.misses || 0;
  
  return {
    uptime: Math.floor(uptime / 1000), // seconds
    hitRate: parseFloat(hitRate.toFixed(2)),
    totalRequests: metrics.hits + metrics.misses,
    hits: metrics.hits,
    misses: metrics.misses,
    sets: metrics.sets,
    deletes: metrics.deletes,
    avgCacheResponseTime: parseFloat(avgCacheTime.toFixed(2)),
    avgDatabaseResponseTime: parseFloat(avgQueryTime.toFixed(2)),
    performanceImprovement: avgQueryTime > 0 ? parseFloat((avgQueryTime / avgCacheTime).toFixed(2)) : 0,
    
    // Cache-specific stats
    cacheStats: Object.keys(caches).reduce((stats, cacheType) => {
      const cache = caches[cacheType];
      stats[cacheType] = {
        keys: cache.keys().length,
        hits: cache.getStats().hits,
        misses: cache.getStats().misses,
        ksize: cache.getStats().ksize,
        vsize: cache.getStats().vsize
      };
      return stats;
    }, {})
  };
};

// Cache health check
const healthCheck = () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    caches: {}
  };
  
  try {
    Object.keys(caches).forEach(cacheType => {
      const cache = caches[cacheType];
      const stats = cache.getStats();
      
      health.caches[cacheType] = {
        status: 'healthy',
        keyCount: cache.keys().length,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits + stats.misses > 0 ? 
          (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2) + '%' : '0%'
      };
    });
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
  }
  
  return health;
};

// Cleanup and optimization
const optimize = () => {
  console.log('🔧 Optimizing caches...');
  
  Object.keys(caches).forEach(cacheType => {
    const cache = caches[cacheType];
    
    // Force cleanup of expired keys
    cache.checkperiod = cache.options.checkperiod || 60;
    
    // Log cache statistics
    const stats = cache.getStats();
    console.log(`   ${cacheType}: ${cache.keys().length} keys, ${stats.hits} hits, ${stats.misses} misses`);
  });
  
  console.log('✅ Cache optimization complete');
};

// Graceful shutdown
const shutdown = () => {
  console.log('🔄 Shutting down cache manager...');
  
  Object.values(caches).forEach(cache => {
    cache.flushAll();
    cache.close();
  });
  
  console.log('✅ Cache manager shutdown complete');
};

module.exports = {
  caches,
  generateKey,
  cacheWrapper,
  invalidateCache,
  preloadCache,
  getPerformanceMetrics,
  healthCheck,
  optimize,
  shutdown,
  metrics
};