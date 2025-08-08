/**
 * Audio Analytics and Performance Monitoring
 * Tracks usage patterns, performance metrics, and user behavior
 */

class AudioAnalytics {
  constructor() {
    this.metrics = {
      // Usage tracking
      sessionStats: {
        startTime: Date.now(),
        totalClipsPlayed: 0,
        uniqueClipsPlayed: new Set(),
        totalPlaytime: 0,
        averageClipDuration: 0,
        categoryUsage: {}
      },
      
      // Performance tracking
      performance: {
        loadTimes: [],
        errorRate: 0,
        totalRequests: 0,
        failedRequests: 0,
        cacheHitRate: 0,
        memoryPeakUsage: 0,
        networkLatency: []
      },
      
      // User behavior
      userBehavior: {
        mostUsedClips: {},
        categoryPreferences: {},
        timeOfDayUsage: Array(24).fill(0),
        skipRate: 0,
        repeatRate: 0,
        sessionDuration: 0
      },
      
      // Technical metrics
      technical: {
        browserInfo: this.getBrowserInfo(),
        deviceInfo: this.getDeviceInfo(),
        connectionType: null,
        audioContextState: null,
        supportedFormats: this.getSupportedFormats()
      }
    };

    this.startSession();
    this.setupPerformanceObservers();
  }

  /**
   * Start analytics session
   */
  startSession() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📊 Analytics session started: ${this.sessionId}`);
    
    // Track session duration
    this.sessionStartTime = Date.now();
    
    // Setup session end tracking
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
    
    // Periodic metrics collection
    setInterval(() => {
      this.collectPeriodicMetrics();
    }, 30000); // Every 30 seconds
  }

  /**
   * Set up performance observers
   */
  setupPerformanceObservers() {
    // Resource timing for audio files
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.initiatorType === 'audio' || entry.name.includes('.mp3') || entry.name.includes('.wav')) {
              this.recordLoadTime(entry);
            }
          }
        });
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('⚠️ Performance Observer not available');
      }
    }

    // Memory usage tracking
    if ('memory' in performance) {
      setInterval(() => {
        this.recordMemoryUsage();
      }, 10000);
    }
  }

  /**
   * Record audio clip play event
   */
  recordPlay(clipId, clipName, category, duration) {
    const playEvent = {
      clipId,
      clipName,
      category,
      duration,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    // Update session stats
    this.metrics.sessionStats.totalClipsPlayed++;
    this.metrics.sessionStats.uniqueClipsPlayed.add(clipId);
    
    // Update category usage
    if (!this.metrics.sessionStats.categoryUsage[category]) {
      this.metrics.sessionStats.categoryUsage[category] = 0;
    }
    this.metrics.sessionStats.categoryUsage[category]++;

    // Update most used clips
    if (!this.metrics.userBehavior.mostUsedClips[clipId]) {
      this.metrics.userBehavior.mostUsedClips[clipId] = {
        name: clipName,
        count: 0,
        category: category
      };
    }
    this.metrics.userBehavior.mostUsedClips[clipId].count++;

    // Update time of day usage
    const hour = new Date().getHours();
    this.metrics.userBehavior.timeOfDayUsage[hour]++;

    // Calculate average duration
    this.updateAverageClipDuration(this.parseDuration(duration));

    console.log(`📊 Play recorded: ${clipName} (${category})`);
    return playEvent;
  }

  /**
   * Record load time for audio file
   */
  recordLoadTime(entry) {
    const loadTime = entry.responseEnd - entry.requestStart;
    this.metrics.performance.loadTimes.push(loadTime);
    this.metrics.performance.totalRequests++;

    // Keep only last 100 measurements
    if (this.metrics.performance.loadTimes.length > 100) {
      this.metrics.performance.loadTimes.shift();
    }

    console.log(`📊 Load time recorded: ${loadTime.toFixed(0)}ms for ${entry.name}`);
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage() {
    if ('memory' in performance) {
      const memUsage = performance.memory.usedJSHeapSize / (1024 * 1024); // MB
      this.metrics.technical.memoryUsage = memUsage;
      this.metrics.performance.memoryPeakUsage = Math.max(
        this.metrics.performance.memoryPeakUsage,
        memUsage
      );
    }
  }

  /**
   * Record error event
   */
  recordError(errorType, clipId, errorMessage) {
    this.metrics.performance.failedRequests++;
    this.metrics.performance.errorRate = 
      this.metrics.performance.failedRequests / this.metrics.performance.totalRequests;

    const errorEvent = {
      errorType,
      clipId,
      errorMessage,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userAgent: navigator.userAgent
    };

    console.warn(`📊 Error recorded: ${errorType} - ${errorMessage}`);
    return errorEvent;
  }

  /**
   * Record cache performance
   */
  recordCacheHit(hit) {
    const currentHitRate = this.metrics.performance.cacheHitRate;
    const totalCacheQueries = this.metrics.performance.totalRequests;
    
    if (hit) {
      this.metrics.performance.cacheHitRate = 
        (currentHitRate * totalCacheQueries + 1) / (totalCacheQueries + 1);
    } else {
      this.metrics.performance.cacheHitRate = 
        (currentHitRate * totalCacheQueries) / (totalCacheQueries + 1);
    }
  }

  /**
   * Collect periodic metrics
   */
  collectPeriodicMetrics() {
    // Update session duration
    this.metrics.userBehavior.sessionDuration = Date.now() - this.sessionStartTime;

    // Update connection type
    if ('connection' in navigator) {
      this.metrics.technical.connectionType = navigator.connection.effectiveType;
    }

    // Update audio context state
    if (window.AudioContext || window.webkitAudioContext) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.metrics.technical.audioContextState = audioContext.state;
        audioContext.close();
      } catch (e) {
        this.metrics.technical.audioContextState = 'unavailable';
      }
    }
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    if (ua.includes('Chrome')) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edge')) {
      browser = 'Edge';
      version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
    }

    return {
      name: browser,
      version: version,
      userAgent: ua,
      language: navigator.language,
      platform: navigator.platform
    };
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    return {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      availableWidth: window.screen.availWidth,
      availableHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      touchSupport: 'ontouchstart' in window
    };
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats() {
    const audio = document.createElement('audio');
    const formats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm'];
    const supported = [];

    formats.forEach(format => {
      const mimeType = this.getMimeType(format);
      if (audio.canPlayType(mimeType)) {
        supported.push(format);
      }
    });

    return supported;
  }

  /**
   * Get MIME type for audio format
   */
  getMimeType(format) {
    const mimeTypes = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      webm: 'audio/webm'
    };
    return mimeTypes[format] || '';
  }

  /**
   * Parse duration string to seconds
   */
  parseDuration(duration) {
    if (!duration || typeof duration !== 'string') return 0;
    
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
  }

  /**
   * Update average clip duration
   */
  updateAverageClipDuration(durationSeconds) {
    const currentAvg = this.metrics.sessionStats.averageClipDuration;
    const totalPlays = this.metrics.sessionStats.totalClipsPlayed;
    
    this.metrics.sessionStats.averageClipDuration = 
      (currentAvg * (totalPlays - 1) + durationSeconds) / totalPlays;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const loadTimes = this.metrics.performance.loadTimes;
    const averageLoadTime = loadTimes.length > 0 ? 
      loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0;

    return {
      averageLoadTime: Math.round(averageLoadTime),
      errorRate: Math.round(this.metrics.performance.errorRate * 100),
      cacheHitRate: Math.round(this.metrics.performance.cacheHitRate * 100),
      memoryPeakUsage: Math.round(this.metrics.performance.memoryPeakUsage),
      totalClipsPlayed: this.metrics.sessionStats.totalClipsPlayed,
      sessionDuration: Math.round(this.metrics.userBehavior.sessionDuration / 1000), // seconds
      uniqueClipsPlayed: this.metrics.sessionStats.uniqueClipsPlayed.size
    };
  }

  /**
   * Get usage patterns
   */
  getUsagePatterns() {
    // Top used clips
    const topClips = Object.entries(this.metrics.userBehavior.mostUsedClips)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5)
      .map(([id, data]) => ({ id, ...data }));

    // Category preferences
    const totalPlays = Object.values(this.metrics.sessionStats.categoryUsage)
      .reduce((a, b) => a + b, 0);
    
    const categoryPreferences = Object.entries(this.metrics.sessionStats.categoryUsage)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalPlays) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Peak usage hours
    const peakHour = this.metrics.userBehavior.timeOfDayUsage
      .indexOf(Math.max(...this.metrics.userBehavior.timeOfDayUsage));

    return {
      topClips,
      categoryPreferences,
      peakUsageHour: peakHour,
      sessionStats: this.metrics.sessionStats
    };
  }

  /**
   * Export analytics data
   */
  exportData() {
    const exportData = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
      patterns: this.getUsagePatterns()
    };

    return exportData;
  }

  /**
   * End analytics session
   */
  endSession() {
    this.metrics.userBehavior.sessionDuration = Date.now() - this.sessionStartTime;
    console.log(`📊 Analytics session ended: ${this.sessionId}`);
    console.log('📊 Session summary:', this.getPerformanceSummary());
    
    // Could send to analytics endpoint here
    const analyticsData = this.exportData();
    this.saveToLocalStorage(analyticsData);
    
    return analyticsData;
  }

  /**
   * Save analytics data to localStorage
   */
  saveToLocalStorage(data) {
    try {
      const key = `audio_analytics_${this.sessionId}`;
      localStorage.setItem(key, JSON.stringify(data));
      
      // Keep only last 5 sessions
      this.cleanupOldAnalytics();
    } catch (error) {
      console.warn('⚠️ Failed to save analytics to localStorage:', error);
    }
  }

  /**
   * Clean up old analytics data
   */
  cleanupOldAnalytics() {
    try {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('audio_analytics_'))
        .sort()
        .reverse();

      // Keep only the 5 most recent
      if (keys.length > 5) {
        keys.slice(5).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup old analytics:', error);
    }
  }

  /**
   * Get historical analytics data
   */
  getHistoricalData() {
    try {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('audio_analytics_'))
        .sort()
        .reverse()
        .slice(0, 5);

      return keys.map(key => {
        try {
          return JSON.parse(localStorage.getItem(key));
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.warn('⚠️ Failed to load historical analytics:', error);
      return [];
    }
  }
}

// Export singleton instance
const audioAnalytics = new AudioAnalytics();
export default audioAnalytics;