/**
 * Multi-Level Caching Service with Redis and Memory Layers
 * Intelligent cache management with performance optimization
 */

const NodeCache = require('node-cache');
const { performance } = require('perf_hooks');
const performanceMonitor = require('./performanceMonitoringService');

class CacheService {
  constructor() {
    // Memory cache (Level 1) - fastest access
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check expired keys every 60 seconds
      useClones: false // Better performance, but be careful with object mutations
    });
    
    // Redis cache (Level 2) - would be initialized in production
    this.redisClient = null;
    this.redisEnabled = false;
    
    // Cache statistics
    this.stats = {
      hits: { memory: 0, redis: 0, total: 0 },
      misses: { memory: 0, redis: 0, total: 0 },
      writes: { memory: 0, redis: 0, total: 0 },
      deletes: { memory: 0, redis: 0, total: 0 },
      errors: { memory: 0, redis: 0, total: 0 },
      performance: {
        avgGetTime: 0,
        avgSetTime: 0,
        totalOperations: 0
      }
    };
    
    // Cache strategies
    this.strategies = {
      CACHE_ASIDE: 'cache_aside',
      WRITE_THROUGH: 'write_through',
      WRITE_BEHIND: 'write_behind',
      REFRESH_AHEAD: 'refresh_ahead'
    };
    
    // Configure cache partitions for different data types
    this.partitions = {
      api: { prefix: 'api:', ttl: 300 }, // 5 minutes for API responses
      database: { prefix: 'db:', ttl: 600 }, // 10 minutes for database queries
      audio: { prefix: 'audio:', ttl: 3600 }, // 1 hour for audio metadata
      voip: { prefix: 'voip:', ttl: 60 }, // 1 minute for VoIP session data
      static: { prefix: 'static:', ttl: 86400 }, // 24 hours for static content
      user: { prefix: 'user:', ttl: 1800 } // 30 minutes for user sessions
    };
    
    this.initializeCache();
  }
  
  initializeCache() {
    // Setup memory cache events
    this.memoryCache.on('set', (key, value) => {
      this.stats.writes.memory++;
      this.stats.writes.total++;
    });
    
    this.memoryCache.on('get', (key, value) => {
      if (value !== undefined) {
        this.stats.hits.memory++;
        this.stats.hits.total++;
      } else {
        this.stats.misses.memory++;
        this.stats.misses.total++;
      }
    });
    
    this.memoryCache.on('del', (key) => {
      this.stats.deletes.memory++;
      this.stats.deletes.total++;
    });
    
    this.memoryCache.on('expired', (key, value) => {
      console.log(`🗑️ Cache key expired: ${key}`);
    });
    
    // Initialize Redis in production environment
    if (process.env.REDIS_URL) {
      this.initializeRedis();
    }
    
    console.log('🚀 Cache service initialized');
  }
  
  initializeRedis() {
    try {
      // In production, you would initialize Redis client here
      // const redis = require('redis');
      // this.redisClient = redis.createClient(process.env.REDIS_URL);
      // this.redisEnabled = true;
      console.log('🔴 Redis cache would be enabled in production');
    } catch (error) {
      console.error('❌ Redis initialization failed:', error);
      this.redisEnabled = false;
    }
  }
  
  /**
   * Get value from cache with multi-level fallback
   * @param {string} key - Cache key
   * @param {string} partition - Cache partition (api, database, etc.)
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key, partition = 'api') {
    const startTime = performance.now();
    const fullKey = this.getPartitionedKey(key, partition);
    
    try {
      // Level 1: Memory cache (fastest)
      const memoryValue = this.memoryCache.get(fullKey);
      if (memoryValue !== undefined) {
        this.recordPerformance('get', startTime);
        return memoryValue;
      }
      
      // Level 2: Redis cache (if enabled)
      if (this.redisEnabled && this.redisClient) {
        const redisValue = await this.redisClient.get(fullKey);
        if (redisValue !== null) {
          const parsedValue = JSON.parse(redisValue);
          
          // Promote to memory cache
          const ttl = this.partitions[partition]?.ttl || 300;
          this.memoryCache.set(fullKey, parsedValue, ttl);
          
          this.stats.hits.redis++;
          this.stats.hits.total++;
          this.recordPerformance('get', startTime);
          return parsedValue;
        }
        
        this.stats.misses.redis++;
        this.stats.misses.total++;
      }
      
      // Cache miss
      this.recordPerformance('get', startTime);
      return null;
      
    } catch (error) {
      console.error(`❌ Cache get error for key ${fullKey}:`, error);
      this.stats.errors.memory++;
      this.stats.errors.total++;
      this.recordPerformance('get', startTime);
      return null;
    }
  }
  
  /**
   * Set value in cache with multi-level storage
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {string} partition - Cache partition
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, partition = 'api', ttl = null) {
    const startTime = performance.now();
    const fullKey = this.getPartitionedKey(key, partition);
    const cacheTTL = ttl || this.partitions[partition]?.ttl || 300;
    
    try {
      // Level 1: Memory cache
      const memorySuccess = this.memoryCache.set(fullKey, value, cacheTTL);
      
      // Level 2: Redis cache (if enabled)
      if (this.redisEnabled && this.redisClient) {
        await this.redisClient.setex(fullKey, cacheTTL, JSON.stringify(value));
      }
      
      this.recordPerformance('set', startTime);
      return memorySuccess;
      
    } catch (error) {
      console.error(`❌ Cache set error for key ${fullKey}:`, error);
      this.stats.errors.memory++;
      this.stats.errors.total++;
      this.recordPerformance('set', startTime);
      return false;
    }
  }
  
  /**
   * Delete key from all cache levels
   * @param {string} key - Cache key
   * @param {string} partition - Cache partition
   * @returns {Promise<boolean>} - Success status
   */
  async del(key, partition = 'api') {
    const fullKey = this.getPartitionedKey(key, partition);
    
    try {
      // Level 1: Memory cache
      const memoryDeleted = this.memoryCache.del(fullKey) > 0;
      
      // Level 2: Redis cache (if enabled)
      if (this.redisEnabled && this.redisClient) {
        await this.redisClient.del(fullKey);
      }
      
      return memoryDeleted;
      
    } catch (error) {
      console.error(`❌ Cache delete error for key ${fullKey}:`, error);
      this.stats.errors.memory++;
      this.stats.errors.total++;
      return false;
    }
  }
  
  /**
   * Clear all cache entries for a partition
   * @param {string} partition - Cache partition to clear
   */
  async clearPartition(partition) {
    const prefix = this.partitions[partition]?.prefix || `${partition}:`;
    
    try {
      // Clear memory cache
      const keys = this.memoryCache.keys();
      const partitionKeys = keys.filter(key => key.startsWith(prefix));
      
      partitionKeys.forEach(key => {
        this.memoryCache.del(key);
      });
      
      // Clear Redis cache (if enabled)
      if (this.redisEnabled && this.redisClient) {
        const redisKeys = await this.redisClient.keys(`${prefix}*`);
        if (redisKeys.length > 0) {
          await this.redisClient.del(...redisKeys);
        }
      }
      
      console.log(`🗑️ Cleared ${partitionKeys.length} keys from partition: ${partition}`);
      
    } catch (error) {
      console.error(`❌ Error clearing partition ${partition}:`, error);
    }
  }
  
  /**
   * Cache-aside pattern implementation
   * @param {string} key - Cache key
   * @param {Function} dataLoader - Function to load data on cache miss
   * @param {string} partition - Cache partition
   * @param {number} ttl - Time to live
   * @returns {Promise<any>} - Data from cache or loaded
   */
  async cacheAside(key, dataLoader, partition = 'api', ttl = null) {
    let data = await this.get(key, partition);
    
    if (data === null) {
      // Cache miss - load data
      data = await dataLoader();
      
      if (data !== null && data !== undefined) {
        await this.set(key, data, partition, ttl);
      }
    }
    
    return data;
  }
  
  /**
   * Write-through cache pattern
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {Function} persistenceWriter - Function to write to persistent storage
   * @param {string} partition - Cache partition
   * @param {number} ttl - Time to live
   */
  async writeThrough(key, value, persistenceWriter, partition = 'api', ttl = null) {
    try {
      // Write to persistent storage first
      await persistenceWriter(value);
      
      // Then update cache
      await this.set(key, value, partition, ttl);
      
      return true;
    } catch (error) {
      console.error('❌ Write-through cache error:', error);
      return false;
    }
  }
  
  /**
   * Intelligent cache warming for frequently accessed data
   * @param {string} partition - Partition to warm
   * @param {Array} keysToWarm - Array of keys to pre-load
   * @param {Function} dataLoader - Function to load data
   */
  async warmCache(partition, keysToWarm, dataLoader) {
    console.log(`🔥 Warming cache for partition: ${partition}`);
    
    const warmingPromises = keysToWarm.map(async (key) => {
      try {
        const cachedValue = await this.get(key, partition);
        if (cachedValue === null) {
          const data = await dataLoader(key);
          if (data !== null) {
            await this.set(key, data, partition);
          }
        }
      } catch (error) {
        console.error(`❌ Error warming cache for key ${key}:`, error);
      }
    });
    
    await Promise.allSettled(warmingPromises);
    console.log(`✅ Cache warming completed for ${keysToWarm.length} keys`);
  }
  
  /**
   * Refresh-ahead cache strategy
   * @param {string} key - Cache key
   * @param {Function} dataLoader - Function to refresh data
   * @param {string} partition - Cache partition
   * @param {number} refreshThreshold - Percentage of TTL when to refresh (0-1)
   */
  async refreshAhead(key, dataLoader, partition = 'api', refreshThreshold = 0.2) {
    const fullKey = this.getPartitionedKey(key, partition);
    const ttl = this.memoryCache.getTtl(fullKey);
    const now = Date.now();
    
    if (ttl && ttl > 0) {
      const remainingTime = ttl - now;
      const originalTTL = this.partitions[partition]?.ttl || 300;
      const refreshTime = originalTTL * refreshThreshold * 1000; // Convert to milliseconds
      
      // If remaining time is less than refresh threshold, refresh in background
      if (remainingTime < refreshTime) {
        console.log(`🔄 Refresh-ahead triggered for key: ${key}`);
        
        // Refresh in background without blocking current request
        setImmediate(async () => {
          try {
            const newData = await dataLoader();
            if (newData !== null) {
              await this.set(key, newData, partition);
            }
          } catch (error) {
            console.error(`❌ Refresh-ahead error for key ${key}:`, error);
          }
        });
      }
    }
  }
  
  /**
   * Cache compression for large values
   * @param {any} value - Value to compress
   * @returns {string} - Compressed value
   */
  compressValue(value) {
    const zlib = require('zlib');
    const jsonString = JSON.stringify(value);
    
    if (jsonString.length > 1024) { // Compress values larger than 1KB
      return zlib.gzipSync(jsonString).toString('base64');
    }
    
    return jsonString;
  }
  
  /**
   * Cache decompression
   * @param {string} compressedValue - Compressed value
   * @returns {any} - Decompressed value
   */
  decompressValue(compressedValue) {
    const zlib = require('zlib');
    
    try {
      // Try to decompress
      const decompressed = zlib.gunzipSync(Buffer.from(compressedValue, 'base64')).toString();
      return JSON.parse(decompressed);
    } catch {
      // If decompression fails, assume it's regular JSON
      return JSON.parse(compressedValue);
    }
  }
  
  /**
   * Get partitioned cache key
   * @param {string} key - Original key
   * @param {string} partition - Partition name
   * @returns {string} - Partitioned key
   */
  getPartitionedKey(key, partition) {
    const prefix = this.partitions[partition]?.prefix || `${partition}:`;
    return `${prefix}${key}`;
  }
  
  /**
   * Record performance metrics
   * @param {string} operation - Operation type (get/set)
   * @param {number} startTime - Operation start time
   */
  recordPerformance(operation, startTime) {
    const duration = performance.now() - startTime;
    this.stats.performance.totalOperations++;
    
    if (operation === 'get') {
      this.stats.performance.avgGetTime = 
        ((this.stats.performance.avgGetTime * (this.stats.performance.totalOperations - 1)) + duration) / 
        this.stats.performance.totalOperations;
    } else if (operation === 'set') {
      this.stats.performance.avgSetTime = 
        ((this.stats.performance.avgSetTime * (this.stats.performance.totalOperations - 1)) + duration) / 
        this.stats.performance.totalOperations;
    }
    
    // Alert on slow cache operations
    if (duration > 50) { // 50ms threshold
      console.warn(`🐌 Slow cache ${operation} operation: ${duration.toFixed(2)}ms`);
    }
  }
  
  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const memoryStats = this.memoryCache.getStats();
    
    return {
      ...this.stats,
      memory: {
        keys: memoryStats.keys,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        ksize: memoryStats.ksize,
        vsize: memoryStats.vsize
      },
      hitRatio: {
        memory: this.stats.hits.memory / (this.stats.hits.memory + this.stats.misses.memory) || 0,
        redis: this.stats.hits.redis / (this.stats.hits.redis + this.stats.misses.redis) || 0,
        total: this.stats.hits.total / (this.stats.hits.total + this.stats.misses.total) || 0
      },
      partitions: Object.keys(this.partitions),
      redisEnabled: this.redisEnabled
    };
  }
  
  /**
   * Optimize cache performance based on usage patterns
   */
  optimizeCache() {
    const stats = this.getStats();
    
    // If hit ratio is low, increase TTL for frequently accessed partitions
    if (stats.hitRatio.total < 0.7) {
      console.log('📊 Optimizing cache: Low hit ratio detected');
      
      // Increase TTL for API cache
      this.partitions.api.ttl = Math.min(this.partitions.api.ttl * 1.2, 1800); // Max 30 minutes
    }
    
    // If memory usage is high, implement LRU cleanup
    if (stats.memory.vsize > 100 * 1024 * 1024) { // 100MB
      console.log('🧹 Optimizing cache: High memory usage detected');
      
      // Clear least recently used items
      const keys = this.memoryCache.keys();
      const oldKeys = keys.slice(0, Math.floor(keys.length * 0.1)); // Remove 10% of keys
      
      oldKeys.forEach(key => {
        this.memoryCache.del(key);
      });
    }
  }
  
  /**
   * Health check for cache service
   * @returns {Object} - Health status
   */
  async healthCheck() {
    const startTime = performance.now();
    const testKey = 'health-check-test';
    const testValue = { timestamp: Date.now(), test: true };
    
    try {
      // Test set operation
      await this.set(testKey, testValue, 'api', 10);
      
      // Test get operation
      const retrieved = await this.get(testKey, 'api');
      
      // Test delete operation
      await this.del(testKey, 'api');
      
      const responseTime = performance.now() - startTime;
      const stats = this.getStats();
      
      return {
        status: 'healthy',
        responseTime: Math.round(responseTime),
        stats: {
          hitRatio: stats.hitRatio.total,
          totalOperations: stats.performance.totalOperations,
          avgGetTime: stats.performance.avgGetTime,
          avgSetTime: stats.performance.avgSetTime,
          memoryKeys: stats.memory.keys,
          redisEnabled: stats.redisEnabled
        },
        test: retrieved && retrieved.test === testValue.test
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: performance.now() - startTime
      };
    }
  }
  
  /**
   * Shutdown cache service gracefully
   */
  shutdown() {
    console.log('⏹️ Shutting down cache service...');
    
    // Close Redis connection
    if (this.redisClient) {
      this.redisClient.quit();
    }
    
    // Clear memory cache
    this.memoryCache.flushAll();
    
    console.log('✅ Cache service shutdown completed');
  }
}

module.exports = new CacheService();