/**
 * Performance Cache Utility - Advanced Caching Strategies
 * 
 * Features:
 * - Multi-tier caching (Memory, LocalStorage, SessionStorage)
 * - TTL (Time To Live) support
 * - LRU (Least Recently Used) eviction
 * - Compression support
 * - Analytics data optimization
 * - Stale-while-revalidate pattern
 */

class PerformanceCache {
  constructor(options = {}) {
    this.maxMemorySize = options.maxMemorySize || 50; // Maximum items in memory
    this.maxStorageSize = options.maxStorageSize || 100; // Maximum items in storage
    this.compressionThreshold = options.compressionThreshold || 10000; // Bytes
    this.enableCompression = options.enableCompression !== false;
    this.enableStorage = options.enableStorage !== false;
    
    // Memory cache with LRU
    this.memoryCache = new Map();
    this.accessOrder = new Map(); // Track access order for LRU
    
    // Performance metrics
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      compressionSaved: 0
    };
    
    this.init();
  }
  
  init() {
    // Clear expired items on initialization
    this.clearExpired();
    
    // Setup periodic cleanup
    if (typeof window !== 'undefined') {
      setInterval(() => this.clearExpired(), 60000); // Every minute
    }
  }
  
  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @param {Object} options - Options
   * @returns {*} Cached value or null
   */
  get(key, options = {}) {
    const { fallback = null, maxAge = null } = options;
    
    // Try memory cache first
    const memoryItem = this.getFromMemory(key, maxAge);
    if (memoryItem !== null) {
      this.stats.hits++;
      return memoryItem;
    }
    
    // Try storage cache
    if (this.enableStorage) {
      const storageItem = this.getFromStorage(key, maxAge);
      if (storageItem !== null) {
        // Promote to memory cache
        this.setInMemory(key, storageItem, maxAge);
        this.stats.hits++;
        return storageItem;
      }
    }
    
    this.stats.misses++;
    return fallback;
  }
  
  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   * @param {Object} options - Options
   */
  set(key, value, ttl = 3600000, options = {}) { // Default 1 hour TTL
    const { tier = 'auto', compress = 'auto' } = options;
    
    // Determine caching strategy
    const shouldCompress = this.shouldCompress(value, compress);
    const processedValue = shouldCompress ? this.compress(value) : value;
    
    // Always set in memory for fastest access
    this.setInMemory(key, processedValue, ttl);
    
    // Optionally persist to storage
    if (this.enableStorage && (tier === 'storage' || tier === 'auto')) {
      this.setInStorage(key, processedValue, ttl, shouldCompress);
    }
  }
  
  /**
   * Get from memory cache
   */
  getFromMemory(key, maxAge) {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    
    const now = Date.now();
    const isExpired = maxAge ? (now - item.timestamp) > maxAge : (now > item.expires);
    
    if (isExpired) {
      this.memoryCache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }
    
    // Update access order for LRU
    this.accessOrder.set(key, now);
    
    return item.compressed ? this.decompress(item.data) : item.data;
  }
  
  /**
   * Set in memory cache with LRU eviction
   */
  setInMemory(key, value, ttl) {
    const now = Date.now();
    const item = {
      data: value,
      timestamp: now,
      expires: now + ttl,
      compressed: this.isCompressed(value)
    };
    
    // Evict if cache is full
    if (this.memoryCache.size >= this.maxMemorySize && !this.memoryCache.has(key)) {
      this.evictLRU();
    }
    
    this.memoryCache.set(key, item);
    this.accessOrder.set(key, now);
  }
  
  /**
   * Get from storage (localStorage/sessionStorage)
   */
  getFromStorage(key, maxAge) {
    try {
      const stored = localStorage.getItem(`perf_cache_${key}`);
      if (!stored) return null;
      
      const item = JSON.parse(stored);
      const now = Date.now();
      const isExpired = maxAge ? (now - item.timestamp) > maxAge : (now > item.expires);
      
      if (isExpired) {
        localStorage.removeItem(`perf_cache_${key}`);
        return null;
      }
      
      return item.compressed ? this.decompress(item.data) : item.data;
    } catch (error) {
      console.warn('Cache storage read error:', error);
      return null;
    }
  }
  
  /**
   * Set in storage
   */
  setInStorage(key, value, ttl, compressed) {
    try {
      const now = Date.now();
      const item = {
        data: value,
        timestamp: now,
        expires: now + ttl,
        compressed
      };
      
      // Check storage size and evict if necessary
      this.evictStorageIfFull();
      
      localStorage.setItem(`perf_cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Cache storage write error:', error);
      // Try to free up space and retry
      this.clearExpiredFromStorage();
      try {
        localStorage.setItem(`perf_cache_${key}`, JSON.stringify(item));
      } catch (retryError) {
        console.warn('Cache storage retry failed:', retryError);
      }
    }
  }
  
  /**
   * Should compress data
   */
  shouldCompress(value, compressOption) {
    if (!this.enableCompression) return false;
    if (compressOption === true) return true;
    if (compressOption === false) return false;
    
    // Auto-decide based on size
    const size = this.estimateSize(value);
    return size > this.compressionThreshold;
  }
  
  /**
   * Compress data using simple JSON compression
   */
  compress(data) {
    try {
      const jsonString = JSON.stringify(data);
      // Simple compression: remove unnecessary whitespace and use shorter keys
      const compressed = {
        _compressed: true,
        _data: this.simpleCompress(jsonString)
      };
      
      const originalSize = jsonString.length;
      const compressedSize = JSON.stringify(compressed).length;
      this.stats.compressionSaved += originalSize - compressedSize;
      
      return compressed;
    } catch (error) {
      console.warn('Compression failed:', error);
      return data;
    }
  }
  
  /**
   * Decompress data
   */
  decompress(data) {
    if (!this.isCompressed(data)) return data;
    
    try {
      const decompressed = this.simpleDecompress(data._data);
      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return data;
    }
  }
  
  /**
   * Check if data is compressed
   */
  isCompressed(data) {
    return data && typeof data === 'object' && data._compressed === true;
  }
  
  /**
   * Simple compression algorithm (placeholder for real compression)
   */
  simpleCompress(str) {
    // This is a simplified compression - in production, use a library like pako
    return str
      .replace(/\s+/g, ' ')
      .replace(/,\s*/g, ',')
      .replace(/:\s*/g, ':')
      .replace(/{\s*/g, '{')
      .replace(/\s*}/g, '}')
      .replace(/\[\s*/g, '[')
      .replace(/\s*\]/g, ']');
  }
  
  /**
   * Simple decompression
   */
  simpleDecompress(str) {
    return str; // Since we only removed whitespace, no need to restore it
  }
  
  /**
   * Estimate object size in bytes
   */
  estimateSize(obj) {
    return JSON.stringify(obj).length * 2; // Rough estimate (UTF-16)
  }
  
  /**
   * Evict least recently used item from memory
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  /**
   * Evict from storage if full
   */
  evictStorageIfFull() {
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('perf_cache_'));
    
    if (keys.length >= this.maxStorageSize) {
      // Remove oldest items
      const items = keys.map(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          return { key, timestamp: item.timestamp };
        } catch {
          return { key, timestamp: 0 };
        }
      }).sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest 20%
      const toRemove = Math.ceil(items.length * 0.2);
      items.slice(0, toRemove).forEach(item => {
        localStorage.removeItem(item.key);
      });
    }
  }
  
  /**
   * Clear expired items from memory
   */
  clearExpired() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expires) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.memoryCache.delete(key);
      this.accessOrder.delete(key);
    });
    
    if (this.enableStorage) {
      this.clearExpiredFromStorage();
    }
  }
  
  /**
   * Clear expired items from storage
   */
  clearExpiredFromStorage() {
    const now = Date.now();
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('perf_cache_'));
    
    keys.forEach(key => {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        if (now > item.expires) {
          localStorage.removeItem(key);
        }
      } catch {
        // Remove corrupted items
        localStorage.removeItem(key);
      }
    });
  }
  
  /**
   * Remove item from cache
   */
  delete(key) {
    this.memoryCache.delete(key);
    this.accessOrder.delete(key);
    
    if (this.enableStorage) {
      localStorage.removeItem(`perf_cache_${key}`);
    }
  }
  
  /**
   * Clear all cache
   */
  clear() {
    this.memoryCache.clear();
    this.accessOrder.clear();
    
    if (this.enableStorage) {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('perf_cache_'));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) * 100 || 0,
      memorySize: this.memoryCache.size,
      storageSize: this.getStorageSize()
    };
  }
  
  /**
   * Get storage size
   */
  getStorageSize() {
    if (!this.enableStorage) return 0;
    
    return Object.keys(localStorage)
      .filter(key => key.startsWith('perf_cache_'))
      .length;
  }
  
  /**
   * Preload data with stale-while-revalidate pattern
   */
  async staleWhileRevalidate(key, fetchFn, options = {}) {
    const { ttl = 3600000, maxAge = ttl * 2 } = options;
    
    // Try to get cached data (including stale)
    const cachedData = this.get(key, { maxAge });
    
    // If we have cached data, return it immediately
    if (cachedData !== null) {
      // Check if data is stale (older than TTL but within maxAge)
      const item = this.memoryCache.get(key) || 
                   this.getStorageItem(key);
      
      if (item && (Date.now() - item.timestamp) > ttl) {
        // Data is stale, fetch fresh data in background
        this.backgroundRefresh(key, fetchFn, ttl).catch(error => {
          console.warn('Background refresh failed:', error);
        });
      }
      
      return cachedData;
    }
    
    // No cached data, fetch fresh
    try {
      const freshData = await fetchFn();
      this.set(key, freshData, ttl);
      return freshData;
    } catch (error) {
      console.error('Data fetch failed:', error);
      throw error;
    }
  }
  
  /**
   * Background refresh for stale-while-revalidate
   */
  async backgroundRefresh(key, fetchFn, ttl) {
    try {
      const freshData = await fetchFn();
      this.set(key, freshData, ttl);
    } catch (error) {
      // Silently fail background refresh
      console.warn('Background refresh failed:', error);
    }
  }
  
  /**
   * Get storage item metadata
   */
  getStorageItem(key) {
    if (!this.enableStorage) return null;
    
    try {
      const stored = localStorage.getItem(`perf_cache_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}

// Analytics-specific cache optimizations
export class AnalyticsCache extends PerformanceCache {
  constructor(options = {}) {
    super({
      maxMemorySize: 20, // Fewer items but larger data
      compressionThreshold: 5000, // Lower threshold for analytics data
      ...options
    });
  }
  
  /**
   * Cache analytics data with smart key generation
   */
  cacheAnalytics(filters, data, ttl = 300000) { // 5 minute default
    const key = this.generateAnalyticsKey(filters);
    this.set(key, data, ttl, { compress: true });
    return key;
  }
  
  /**
   * Get cached analytics data
   */
  getAnalytics(filters) {
    const key = this.generateAnalyticsKey(filters);
    return this.get(key);
  }
  
  /**
   * Generate consistent key for analytics filters
   */
  generateAnalyticsKey(filters) {
    const normalized = {
      dateRange: filters.dateRange || '30',
      ...filters
    };
    
    return `analytics_${JSON.stringify(normalized)}`;
  }
  
  /**
   * Invalidate analytics cache when data changes
   */
  invalidateAnalytics(prefix = 'analytics_') {
    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
        this.accessOrder.delete(key);
      }
    }
    
    // Clear from storage
    if (this.enableStorage) {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith(`perf_cache_${prefix}`));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
}

// Global instances
export const performanceCache = new PerformanceCache();
export const analyticsCache = new AnalyticsCache();

// React hooks for cache integration
export const useCachedData = (key, fetchFn, options = {}) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try stale-while-revalidate pattern
        const result = await performanceCache.staleWhileRevalidate(
          key, 
          fetchFn, 
          options
        );
        
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [key, fetchFn, options]);
  
  return { data, loading, error };
};

export default PerformanceCache;