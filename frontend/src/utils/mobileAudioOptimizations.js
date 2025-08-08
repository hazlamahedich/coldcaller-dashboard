/**
 * Mobile Audio Optimizations
 * Battery-efficient audio handling for mobile devices
 */

class MobileAudioOptimizer {
  constructor() {
    this.isMobile = this.detectMobile();
    this.batteryManager = null;
    this.connectionManager = null;
    this.powerSaveMode = false;
    this.audioContextSuspended = false;
    
    // Mobile-specific settings
    this.mobileConfig = {
      maxConcurrentStreams: this.isMobile ? 2 : 5,
      preloadLimit: this.isMobile ? 3 : 10,
      qualityReduction: this.isMobile ? 0.7 : 1.0,
      bufferSize: this.isMobile ? 1024 : 4096,
      updateInterval: this.isMobile ? 1000 : 500,
      
      // Battery thresholds
      batteryThresholds: {
        critical: 0.15,  // 15%
        low: 0.30,       // 30%
        medium: 0.50     // 50%
      }
    };

    this.initialize();
  }

  /**
   * Initialize mobile optimizations
   */
  async initialize() {
    if (!this.isMobile) return;

    console.log('📱 Initializing mobile audio optimizations');

    try {
      // Initialize battery monitoring
      await this.initBatteryMonitoring();
      
      // Initialize connection monitoring
      this.initConnectionMonitoring();
      
      // Setup visibility change handling
      this.initVisibilityHandling();
      
      // Setup memory pressure handling
      this.initMemoryPressureHandling();

      console.log('✅ Mobile optimizations initialized');
    } catch (error) {
      console.warn('⚠️ Mobile optimization init failed:', error);
    }
  }

  /**
   * Detect mobile device
   */
  detectMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  /**
   * Initialize battery monitoring
   */
  async initBatteryMonitoring() {
    if (!('getBattery' in navigator)) return;

    try {
      this.batteryManager = await navigator.getBattery();
      
      const updateBatteryStatus = () => {
        const level = this.batteryManager.level;
        const charging = this.batteryManager.charging;
        
        console.log(`🔋 Battery: ${(level * 100).toFixed(0)}% ${charging ? '⚡' : '🔻'}`);
        
        // Adjust power save mode based on battery
        if (level < this.mobileConfig.batteryThresholds.critical) {
          this.enablePowerSaveMode('critical');
        } else if (level < this.mobileConfig.batteryThresholds.low && !charging) {
          this.enablePowerSaveMode('low');
        } else if (level < this.mobileConfig.batteryThresholds.medium && !charging) {
          this.enablePowerSaveMode('medium');
        } else if (charging || level > this.mobileConfig.batteryThresholds.medium) {
          this.disablePowerSaveMode();
        }
      };

      // Initial check
      updateBatteryStatus();

      // Listen for changes
      this.batteryManager.addEventListener('levelchange', updateBatteryStatus);
      this.batteryManager.addEventListener('chargingchange', updateBatteryStatus);

    } catch (error) {
      console.warn('⚠️ Battery API not available:', error);
    }
  }

  /**
   * Initialize connection monitoring
   */
  initConnectionMonitoring() {
    if (!('connection' in navigator)) return;

    this.connectionManager = navigator.connection;
    
    const updateConnectionStatus = () => {
      const effectiveType = this.connectionManager.effectiveType;
      const downlink = this.connectionManager.downlink;
      const rtt = this.connectionManager.rtt;
      
      console.log(`🌐 Connection: ${effectiveType} (${downlink}Mbps, ${rtt}ms RTT)`);
      
      // Adjust quality based on connection
      this.adjustQualityForConnection(effectiveType, downlink);
    };

    updateConnectionStatus();
    this.connectionManager.addEventListener('change', updateConnectionStatus);
  }

  /**
   * Initialize visibility change handling
   */
  initVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.onAppBackgrounded();
      } else {
        this.onAppForegrounded();
      }
    });

    // Handle page lifecycle events
    document.addEventListener('freeze', this.onAppFrozen.bind(this));
    document.addEventListener('resume', this.onAppResumed.bind(this));
  }

  /**
   * Initialize memory pressure handling
   */
  initMemoryPressureHandling() {
    // Listen for memory pressure warnings
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryPressure();
      }, 30000); // Check every 30 seconds
    }

    // Listen for low memory warnings (WebKit)
    window.addEventListener('webkitmemorywarning', () => {
      console.warn('⚠️ Low memory warning received');
      this.handleLowMemory();
    });
  }

  /**
   * Enable power save mode
   */
  enablePowerSaveMode(level = 'medium') {
    if (this.powerSaveMode === level) return;

    this.powerSaveMode = level;
    console.log(`🔋 Power save mode enabled: ${level}`);

    switch (level) {
      case 'critical':
        this.mobileConfig.maxConcurrentStreams = 1;
        this.mobileConfig.preloadLimit = 1;
        this.mobileConfig.qualityReduction = 0.5;
        this.mobileConfig.updateInterval = 2000;
        this.suspendAudioContext();
        break;
        
      case 'low':
        this.mobileConfig.maxConcurrentStreams = 2;
        this.mobileConfig.preloadLimit = 2;
        this.mobileConfig.qualityReduction = 0.6;
        this.mobileConfig.updateInterval = 1500;
        break;
        
      case 'medium':
        this.mobileConfig.maxConcurrentStreams = 2;
        this.mobileConfig.preloadLimit = 3;
        this.mobileConfig.qualityReduction = 0.7;
        this.mobileConfig.updateInterval = 1000;
        break;
    }

    // Emit event for other components
    window.dispatchEvent(new CustomEvent('powerSaveModeChanged', { 
      detail: { enabled: true, level } 
    }));
  }

  /**
   * Disable power save mode
   */
  disablePowerSaveMode() {
    if (!this.powerSaveMode) return;

    this.powerSaveMode = false;
    console.log('🔋 Power save mode disabled');

    // Restore normal settings
    this.mobileConfig.maxConcurrentStreams = this.isMobile ? 2 : 5;
    this.mobileConfig.preloadLimit = this.isMobile ? 3 : 10;
    this.mobileConfig.qualityReduction = this.isMobile ? 0.7 : 1.0;
    this.mobileConfig.updateInterval = this.isMobile ? 1000 : 500;

    this.resumeAudioContext();

    // Emit event for other components
    window.dispatchEvent(new CustomEvent('powerSaveModeChanged', { 
      detail: { enabled: false, level: null } 
    }));
  }

  /**
   * Adjust quality for connection type
   */
  adjustQualityForConnection(effectiveType, downlink) {
    let qualityMultiplier = 1.0;

    switch (effectiveType) {
      case 'slow-2g':
        qualityMultiplier = 0.3;
        break;
      case '2g':
        qualityMultiplier = 0.5;
        break;
      case '3g':
        qualityMultiplier = 0.7;
        break;
      case '4g':
        qualityMultiplier = 0.9;
        break;
      default:
        qualityMultiplier = 1.0;
    }

    // Further adjust based on actual downlink speed
    if (downlink < 1.0) qualityMultiplier *= 0.6;
    else if (downlink < 2.0) qualityMultiplier *= 0.8;

    this.mobileConfig.qualityReduction = Math.min(qualityMultiplier, this.mobileConfig.qualityReduction);

    console.log(`📶 Quality adjusted for ${effectiveType}: ${(qualityMultiplier * 100).toFixed(0)}%`);
  }

  /**
   * Handle app backgrounded
   */
  onAppBackgrounded() {
    console.log('📱 App backgrounded - reducing audio activity');
    
    // Suspend audio context to save battery
    this.suspendAudioContext();
    
    // Reduce update frequency
    this.mobileConfig.updateInterval *= 2;
    
    // Emit event
    window.dispatchEvent(new CustomEvent('appVisibilityChanged', { 
      detail: { visible: false } 
    }));
  }

  /**
   * Handle app foregrounded
   */
  onAppForegrounded() {
    console.log('📱 App foregrounded - resuming audio activity');
    
    // Resume audio context
    this.resumeAudioContext();
    
    // Restore update frequency
    this.mobileConfig.updateInterval = this.isMobile ? 1000 : 500;
    
    // Emit event
    window.dispatchEvent(new CustomEvent('appVisibilityChanged', { 
      detail: { visible: true } 
    }));
  }

  /**
   * Handle app frozen
   */
  onAppFrozen() {
    console.log('📱 App frozen - suspending all audio');
    this.suspendAudioContext();
  }

  /**
   * Handle app resumed
   */
  onAppResumed() {
    console.log('📱 App resumed - resuming audio');
    this.resumeAudioContext();
  }

  /**
   * Suspend audio context to save battery
   */
  suspendAudioContext() {
    if (this.audioContextSuspended) return;

    try {
      if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.suspend();
        this.audioContextSuspended = true;
        console.log('🔇 Audio context suspended for battery saving');
      }
    } catch (error) {
      console.warn('⚠️ Failed to suspend audio context:', error);
    }
  }

  /**
   * Resume audio context
   */
  resumeAudioContext() {
    if (!this.audioContextSuspended) return;

    try {
      if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.resume();
        this.audioContextSuspended = false;
        console.log('🔊 Audio context resumed');
      }
    } catch (error) {
      console.warn('⚠️ Failed to resume audio context:', error);
    }
  }

  /**
   * Check memory pressure
   */
  checkMemoryPressure() {
    if (!('memory' in performance)) return;

    const memory = performance.memory;
    const usedMB = memory.usedJSHeapSize / (1024 * 1024);
    const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
    const usagePercent = (usedMB / limitMB) * 100;

    console.log(`🧠 Memory usage: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);

    if (usagePercent > 80) {
      console.warn('⚠️ High memory usage detected');
      this.handleHighMemoryUsage();
    }
  }

  /**
   * Handle high memory usage
   */
  handleHighMemoryUsage() {
    console.log('🧠 Handling high memory usage');
    
    // Reduce preload limit
    this.mobileConfig.preloadLimit = Math.max(1, Math.floor(this.mobileConfig.preloadLimit * 0.5));
    
    // Reduce concurrent streams
    this.mobileConfig.maxConcurrentStreams = Math.max(1, Math.floor(this.mobileConfig.maxConcurrentStreams * 0.5));
    
    // Emit cleanup event
    window.dispatchEvent(new CustomEvent('memoryPressure', { 
      detail: { level: 'high' } 
    }));
  }

  /**
   * Handle low memory warning
   */
  handleLowMemory() {
    console.warn('🧠 Handling low memory warning');
    
    // More aggressive cleanup
    this.mobileConfig.preloadLimit = 1;
    this.mobileConfig.maxConcurrentStreams = 1;
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Emit cleanup event
    window.dispatchEvent(new CustomEvent('memoryPressure', { 
      detail: { level: 'critical' } 
    }));
  }

  /**
   * Get optimal audio quality for current conditions
   */
  getOptimalAudioQuality() {
    let bitrate = 128; // Default
    let format = 'mp3';
    
    // Adjust based on power save mode
    if (this.powerSaveMode === 'critical') {
      bitrate = 64;
    } else if (this.powerSaveMode === 'low') {
      bitrate = 96;
    } else if (this.powerSaveMode === 'medium') {
      bitrate = 112;
    }
    
    // Adjust based on connection
    if (this.connectionManager) {
      const effectiveType = this.connectionManager.effectiveType;
      switch (effectiveType) {
        case 'slow-2g':
          bitrate = Math.min(bitrate, 48);
          break;
        case '2g':
          bitrate = Math.min(bitrate, 64);
          break;
        case '3g':
          bitrate = Math.min(bitrate, 96);
          break;
      }
    }
    
    return {
      bitrate: Math.floor(bitrate * this.mobileConfig.qualityReduction),
      format,
      sampleRate: bitrate < 96 ? 22050 : 44100
    };
  }

  /**
   * Get current mobile configuration
   */
  getConfig() {
    return {
      ...this.mobileConfig,
      isMobile: this.isMobile,
      powerSaveMode: this.powerSaveMode,
      audioContextSuspended: this.audioContextSuspended,
      optimalQuality: this.getOptimalAudioQuality()
    };
  }

  /**
   * Check if feature should be enabled based on mobile optimization
   */
  shouldEnable(feature) {
    const config = this.getConfig();
    
    switch (feature) {
      case 'preloading':
        return !config.powerSaveMode || config.powerSaveMode === 'medium';
        
      case 'crossfade':
        return !config.powerSaveMode;
        
      case 'analytics':
        return config.powerSaveMode !== 'critical';
        
      case 'caching':
        return true; // Always enable caching for performance
        
      case 'compression':
        return config.isMobile; // Always compress on mobile
        
      default:
        return true;
    }
  }

  /**
   * Generate mobile performance report
   */
  getPerformanceReport() {
    const config = this.getConfig();
    const battery = this.batteryManager;
    const connection = this.connectionManager;
    
    return {
      device: {
        isMobile: config.isMobile,
        userAgent: navigator.userAgent
      },
      battery: battery ? {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      } : null,
      connection: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      } : null,
      powerSave: {
        enabled: !!config.powerSaveMode,
        level: config.powerSaveMode || null
      },
      audioContext: {
        suspended: config.audioContextSuspended
      },
      optimizations: {
        maxConcurrentStreams: config.maxConcurrentStreams,
        preloadLimit: config.preloadLimit,
        qualityReduction: config.qualityReduction,
        updateInterval: config.updateInterval
      },
      optimalQuality: config.optimalQuality
    };
  }
}

// Export singleton instance
const mobileAudioOptimizer = new MobileAudioOptimizer();
export default mobileAudioOptimizer;