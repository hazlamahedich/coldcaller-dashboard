/**
 * Audio Performance Manager
 * Comprehensive audio optimization and performance monitoring system
 * 
 * Features:
 * - Progressive audio loading with priority queuing
 * - Multi-tier caching (memory + IndexedDB)
 * - Audio preloading and streaming
 * - Performance monitoring and analytics
 * - Bandwidth-adaptive loading
 * - Mobile battery optimization
 * - Memory leak prevention
 */

class AudioPerformanceManager {
  constructor() {
    // Performance configuration
    this.config = {
      // Memory management
      maxMemoryCacheMB: 50, // 50MB memory cache limit
      maxConcurrentStreams: 5, // Maximum concurrent audio streams
      preloadThreshold: 3, // Number of clips to preload ahead
      
      // Quality profiles based on connection
      qualityProfiles: {
        'slow-2g': { bitrate: 64, format: 'mp3', buffer: 10 },
        '2g': { bitrate: 96, format: 'mp3', buffer: 8 },
        '3g': { bitrate: 128, format: 'mp3', buffer: 5 },
        '4g': { bitrate: 192, format: 'mp3', buffer: 3 },
        'wifi': { bitrate: 256, format: 'mp3', buffer: 2 }
      },
      
      // Performance targets
      targets: {
        loadTimeMs: 2000, // < 2 seconds for standard clips
        maxMemoryMB: 100, // < 100MB total memory usage
        batteryImpactPercent: 5, // < 5% per hour on mobile
        crossfadeMs: 150 // Smooth transitions
      }
    };

    // Internal state
    this.memoryCache = new Map();
    this.audioElements = new Map();
    this.loadQueue = new Set();
    this.activeStreams = new Set();
    this.preloadQueue = [];
    this.currentProfile = 'wifi';
    
    // Performance metrics
    this.metrics = {
      totalLoaded: 0,
      totalPlaytime: 0,
      averageLoadTime: 0,
      cacheHitRate: 0,
      memoryUsageMB: 0,
      loadErrors: 0,
      concurrentPeak: 0,
      batteryLevel: null,
      networkSpeed: null
    };

    // Initialize performance monitoring
    this.initializePerformanceMonitoring();
    this.initializeNetworkDetection();
    this.initializeBatteryMonitoring();
    this.initializeIndexedDB();
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring() {
    // Performance observer for audio loading
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name.includes('audio') || entry.initiatorType === 'audio') {
              this.updateLoadTimeMetrics(entry.duration);
            }
          }
        });
        observer.observe({ entryTypes: ['resource', 'measure'] });
      } catch (e) {
        console.warn('⚠️ Performance Observer not fully supported');
      }
    }

    // Memory usage monitoring
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 5000);

    // Cleanup inactive streams
    setInterval(() => {
      this.cleanupInactiveStreams();
    }, 30000);
  }

  /**
   * Initialize network detection for adaptive streaming
   */
  initializeNetworkDetection() {
    // Network Information API
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const updateProfile = () => {
        const effectiveType = connection.effectiveType || '4g';
        this.currentProfile = effectiveType;
        this.metrics.networkSpeed = connection.downlink || null;
        console.log(`🌐 Network profile updated: ${this.currentProfile}`);
      };

      updateProfile();
      connection.addEventListener('change', updateProfile);
    }

    // Manual speed test fallback
    this.performNetworkSpeedTest();
  }

  /**
   * Initialize battery monitoring for mobile optimization
   */
  initializeBatteryMonitoring() {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        this.metrics.batteryLevel = battery.level;
        
        battery.addEventListener('levelchange', () => {
          this.metrics.batteryLevel = battery.level;
          
          // Enable power saving mode when battery < 20%
          if (battery.level < 0.2) {
            console.log('🔋 Low battery detected, enabling power saving mode');
            this.enablePowerSavingMode();
          }
        });
      }).catch(() => {
        console.log('🔋 Battery API not available');
      });
    }
  }

  /**
   * Initialize IndexedDB for persistent audio caching
   */
  async initializeIndexedDB() {
    try {
      const request = indexedDB.open('AudioCache', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('audioClips')) {
          const store = db.createObjectStore('audioClips', { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('💾 IndexedDB initialized for audio caching');
        this.cleanupOldCacheEntries();
      };

      request.onerror = () => {
        console.warn('⚠️ IndexedDB not available, using memory cache only');
      };
    } catch (error) {
      console.warn('⚠️ IndexedDB initialization failed:', error);
    }
  }

  /**
   * Preload audio clips with intelligent prioritization
   */
  async preloadAudioClips(audioClips, priorityIds = []) {
    console.log(`⚡ Preloading ${Object.keys(audioClips).length} audio categories...`);
    
    // Create priority queue
    const allClips = [];
    Object.values(audioClips).flat().forEach(clip => {
      const priority = priorityIds.includes(clip.id) ? 1 : 
                     clip.category === 'greetings' ? 2 :
                     clip.category === 'objections' ? 3 : 4;
      allClips.push({ ...clip, priority });
    });

    // Sort by priority and usage frequency
    allClips.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (b.use_count || 0) - (a.use_count || 0);
    });

    // Preload based on network profile
    const profile = this.config.qualityProfiles[this.currentProfile];
    const maxPreload = this.currentProfile === 'wifi' ? 10 : 
                      this.currentProfile === '4g' ? 6 : 3;

    const preloadPromises = allClips
      .slice(0, maxPreload)
      .map(clip => this.preloadAudioClip(clip, profile));

    const results = await Promise.allSettled(preloadPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ Preloaded ${successful}/${maxPreload} audio clips`);
    return successful;
  }

  /**
   * Preload a single audio clip with caching
   */
  async preloadAudioClip(clip, profile) {
    const startTime = performance.now();
    
    try {
      // Check memory cache first
      if (this.memoryCache.has(clip.id)) {
        console.log(`💾 Cache hit: ${clip.name}`);
        this.metrics.cacheHitRate++;
        return this.memoryCache.get(clip.id);
      }

      // Check IndexedDB cache
      const cachedData = await this.getFromIndexedDB(clip.id);
      if (cachedData) {
        console.log(`💿 Disk cache hit: ${clip.name}`);
        this.memoryCache.set(clip.id, cachedData);
        return cachedData;
      }

      // Load from network with quality adjustment
      const audioUrl = await this.getOptimizedAudioUrl(clip, profile);
      const audioData = await this.loadAudioWithProgress(audioUrl, clip.name);
      
      // Cache in memory and IndexedDB
      this.cacheAudioData(clip.id, audioData, clip);
      
      const loadTime = performance.now() - startTime;
      this.updateLoadTimeMetrics(loadTime);
      
      console.log(`⬇️ Loaded: ${clip.name} (${loadTime.toFixed(0)}ms)`);
      return audioData;
      
    } catch (error) {
      console.error(`❌ Failed to preload ${clip.name}:`, error);
      this.metrics.loadErrors++;
      throw error;
    }
  }

  /**
   * Get optimized audio URL based on current profile
   */
  async getOptimizedAudioUrl(clip, profile) {
    // For demo purposes, return the original URL
    // In production, this would request different quality versions
    return clip.file_path || `/audio/${clip.category}/${clip.name.toLowerCase().replace(/\s+/g, '_')}.mp3`;
  }

  /**
   * Load audio with progress tracking and timeout
   */
  async loadAudioWithProgress(url, name) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const timeout = setTimeout(() => {
        reject(new Error(`Audio load timeout: ${name}`));
      }, this.config.targets.loadTimeMs);

      audio.addEventListener('canplaythrough', () => {
        clearTimeout(timeout);
        resolve(audio);
      }, { once: true });

      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error(`Audio load error: ${name}`));
      }, { once: true });

      audio.preload = 'auto';
      audio.src = url;
    });
  }

  /**
   * Cache audio data in memory and IndexedDB
   */
  async cacheAudioData(clipId, audioData, clip) {
    // Memory cache with size limit
    if (this.getMemoryUsageMB() < this.config.maxMemoryCacheMB) {
      this.memoryCache.set(clipId, audioData);
    }

    // IndexedDB cache
    if (this.db) {
      try {
        const transaction = this.db.transaction(['audioClips'], 'readwrite');
        const store = transaction.objectStore('audioClips');
        
        await store.put({
          id: clipId,
          data: audioData,
          metadata: clip,
          lastAccessed: Date.now(),
          size: this.estimateAudioSize(audioData)
        });
      } catch (error) {
        console.warn('⚠️ IndexedDB cache failed:', error);
      }
    }
  }

  /**
   * Play audio with advanced features
   */
  async playAudioClip(clipId, options = {}) {
    const startTime = performance.now();
    
    try {
      // Check concurrent stream limit
      if (this.activeStreams.size >= this.config.maxConcurrentStreams) {
        console.warn('⚠️ Concurrent stream limit reached, stopping oldest stream');
        this.stopOldestStream();
      }

      // Get cached audio or load
      let audio = this.memoryCache.get(clipId);
      if (!audio) {
        audio = await this.loadAudioClip(clipId);
      }

      // Apply crossfade if requested
      if (options.crossfade && this.activeStreams.size > 0) {
        await this.crossfadeTransition(audio, options.crossfadeMs || this.config.targets.crossfadeMs);
      }

      // Configure audio element
      audio.currentTime = 0;
      audio.volume = options.volume || 1.0;
      
      // Add to active streams
      this.activeStreams.add(audio);
      this.metrics.concurrentPeak = Math.max(this.metrics.concurrentPeak, this.activeStreams.size);

      // Setup cleanup on end
      audio.addEventListener('ended', () => {
        this.activeStreams.delete(audio);
      }, { once: true });

      // Play audio
      await audio.play();
      
      const playTime = performance.now() - startTime;
      console.log(`▶️ Playing audio (${playTime.toFixed(0)}ms to start)`);
      
      this.metrics.totalPlaytime++;
      return audio;
      
    } catch (error) {
      console.error('❌ Audio playback failed:', error);
      throw error;
    }
  }

  /**
   * Implement smooth crossfade between audio clips
   */
  async crossfadeTransition(newAudio, durationMs = 150) {
    const activeAudios = Array.from(this.activeStreams);
    if (activeAudios.length === 0) return;

    const fadeSteps = 10;
    const stepMs = durationMs / fadeSteps;
    
    // Start new audio at low volume
    newAudio.volume = 0;
    await newAudio.play();
    
    // Crossfade
    for (let step = 0; step <= fadeSteps; step++) {
      const progress = step / fadeSteps;
      
      // Fade in new audio
      newAudio.volume = progress;
      
      // Fade out active audios
      activeAudios.forEach(audio => {
        if (audio !== newAudio) {
          audio.volume = 1 - progress;
        }
      });
      
      if (step < fadeSteps) {
        await new Promise(resolve => setTimeout(resolve, stepMs));
      }
    }
    
    // Stop faded out audios
    activeAudios.forEach(audio => {
      if (audio !== newAudio) {
        audio.pause();
        this.activeStreams.delete(audio);
      }
    });
  }

  /**
   * Load audio clip with fallback strategies
   */
  async loadAudioClip(clipId) {
    // Try memory cache
    if (this.memoryCache.has(clipId)) {
      return this.memoryCache.get(clipId);
    }

    // Try IndexedDB cache
    const cachedData = await this.getFromIndexedDB(clipId);
    if (cachedData) {
      this.memoryCache.set(clipId, cachedData);
      return cachedData;
    }

    // Load from network (should not happen if preloading works)
    console.warn(`⚠️ Loading ${clipId} from network (not preloaded)`);
    throw new Error('Audio not preloaded - implement network loading');
  }

  /**
   * Get audio data from IndexedDB
   */
  async getFromIndexedDB(clipId) {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['audioClips'], 'readonly');
      const store = transaction.objectStore('audioClips');
      const request = store.get(clipId);
      
      request.onsuccess = () => {
        if (request.result) {
          // Update last accessed time
          this.updateLastAccessed(clipId);
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Update last accessed time in IndexedDB
   */
  async updateLastAccessed(clipId) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['audioClips'], 'readwrite');
      const store = transaction.objectStore('audioClips');
      const request = store.get(clipId);
      
      request.onsuccess = () => {
        if (request.result) {
          request.result.lastAccessed = Date.now();
          store.put(request.result);
        }
      };
    } catch (error) {
      console.warn('⚠️ Failed to update last accessed:', error);
    }
  }

  /**
   * Perform network speed test for profile selection
   */
  async performNetworkSpeedTest() {
    try {
      const startTime = performance.now();
      const testImage = new Image();
      const imageUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      
      testImage.onload = () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Rough network classification based on load time
        if (duration > 2000) this.currentProfile = 'slow-2g';
        else if (duration > 1000) this.currentProfile = '2g';
        else if (duration > 300) this.currentProfile = '3g';
        else if (duration > 100) this.currentProfile = '4g';
        else this.currentProfile = 'wifi';
        
        console.log(`🌐 Network speed test: ${duration.toFixed(0)}ms -> ${this.currentProfile}`);
      };
      
      testImage.src = imageUrl + '?t=' + Date.now();
    } catch (error) {
      console.warn('⚠️ Network speed test failed:', error);
    }
  }

  /**
   * Enable power saving mode for mobile devices
   */
  enablePowerSavingMode() {
    console.log('🔋 Enabling power saving mode');
    
    // Reduce audio quality
    this.currentProfile = '2g';
    
    // Limit concurrent streams
    this.config.maxConcurrentStreams = 2;
    
    // Reduce preload amount
    this.config.preloadThreshold = 1;
    
    // Stop all non-essential streams
    Array.from(this.activeStreams).forEach((audio, index) => {
      if (index > 0) { // Keep only the first stream
        audio.pause();
        this.activeStreams.delete(audio);
      }
    });
  }

  /**
   * Stop the oldest active stream to free resources
   */
  stopOldestStream() {
    const oldest = Array.from(this.activeStreams)[0];
    if (oldest) {
      oldest.pause();
      this.activeStreams.delete(oldest);
      console.log('⏹️ Stopped oldest stream to free resources');
    }
  }

  /**
   * Clean up inactive audio elements and cache
   */
  cleanupInactiveStreams() {
    // Remove ended/paused streams
    Array.from(this.activeStreams).forEach(audio => {
      if (audio.ended || audio.paused) {
        this.activeStreams.delete(audio);
      }
    });

    // Memory cache cleanup if over limit
    if (this.getMemoryUsageMB() > this.config.maxMemoryCacheMB) {
      const oldestEntries = Array.from(this.memoryCache.entries())
        .slice(0, Math.floor(this.memoryCache.size * 0.3));
      
      oldestEntries.forEach(([key]) => {
        this.memoryCache.delete(key);
      });
      
      console.log(`🧹 Cleaned up ${oldestEntries.length} cached audio entries`);
    }
  }

  /**
   * Clean up old IndexedDB cache entries
   */
  async cleanupOldCacheEntries() {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['audioClips'], 'readwrite');
      const store = transaction.objectStore('audioClips');
      const index = store.index('lastAccessed');
      
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const range = IDBKeyRange.upperBound(oneWeekAgo);
      
      const request = index.openCursor(range);
      let deletedCount = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} old cache entries`);
          }
        }
      };
    } catch (error) {
      console.warn('⚠️ Cache cleanup failed:', error);
    }
  }

  /**
   * Estimate memory usage
   */
  getMemoryUsageMB() {
    // Rough estimate: assume each cached audio is ~200KB
    return (this.memoryCache.size * 0.2) + (this.activeStreams.size * 0.1);
  }

  /**
   * Estimate audio data size
   */
  estimateAudioSize(audioData) {
    // Rough estimate based on duration and quality
    return 200000; // ~200KB average
  }

  /**
   * Update load time metrics
   */
  updateLoadTimeMetrics(loadTime) {
    this.metrics.totalLoaded++;
    this.metrics.averageLoadTime = 
      (this.metrics.averageLoadTime * (this.metrics.totalLoaded - 1) + loadTime) / this.metrics.totalLoaded;
  }

  /**
   * Update memory usage metrics
   */
  updateMemoryMetrics() {
    this.metrics.memoryUsageMB = this.getMemoryUsageMB();
    
    // Log warning if approaching limits
    if (this.metrics.memoryUsageMB > this.config.maxMemoryCacheMB * 0.8) {
      console.warn(`⚠️ Memory usage high: ${this.metrics.memoryUsageMB.toFixed(1)}MB`);
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.memoryCache.size,
      activeStreams: this.activeStreams.size,
      networkProfile: this.currentProfile,
      targets: this.config.targets,
      timestamp: Date.now()
    };
  }

  /**
   * Get performance dashboard data
   */
  getPerformanceDashboard() {
    const metrics = this.getPerformanceMetrics();
    
    return {
      summary: {
        status: this.getOverallStatus(),
        loadTime: `${metrics.averageLoadTime.toFixed(0)}ms`,
        memoryUsage: `${metrics.memoryUsageMB.toFixed(1)}MB`,
        cacheHitRate: `${((metrics.cacheHitRate / Math.max(metrics.totalLoaded, 1)) * 100).toFixed(1)}%`,
        networkProfile: metrics.networkProfile
      },
      details: metrics,
      recommendations: this.getPerformanceRecommendations(metrics)
    };
  }

  /**
   * Get overall performance status
   */
  getOverallStatus() {
    const metrics = this.getPerformanceMetrics();
    
    if (metrics.averageLoadTime > this.config.targets.loadTimeMs * 1.5) return 'poor';
    if (metrics.memoryUsageMB > this.config.targets.maxMemoryMB) return 'warning';
    if (metrics.loadErrors > metrics.totalLoaded * 0.1) return 'warning';
    
    return 'good';
  }

  /**
   * Generate performance recommendations
   */
  getPerformanceRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.averageLoadTime > this.config.targets.loadTimeMs) {
      recommendations.push('Consider preloading more frequently used audio clips');
    }
    
    if (metrics.memoryUsageMB > this.config.targets.maxMemoryMB * 0.8) {
      recommendations.push('Memory usage high - increase cache cleanup frequency');
    }
    
    if (metrics.loadErrors > 0) {
      recommendations.push('Audio load errors detected - check network connectivity');
    }
    
    if (this.currentProfile === 'slow-2g' || this.currentProfile === '2g') {
      recommendations.push('Slow network detected - consider reducing audio quality');
    }
    
    if (metrics.batteryLevel && metrics.batteryLevel < 0.3) {
      recommendations.push('Low battery - enable power saving mode');
    }
    
    return recommendations;
  }
}

// Export singleton instance
const audioPerformanceManager = new AudioPerformanceManager();
export default audioPerformanceManager;