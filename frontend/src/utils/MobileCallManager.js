/**
 * MobileCallManager - Mobile-optimized WebRTC call management
 * Features: Battery optimization, mobile network adaptation, background handling
 * Specialized for mobile device performance and resource constraints
 */

class MobileCallManager {
  constructor() {
    this.isMobile = this.detectMobile();
    this.deviceMetrics = {
      batteryLevel: 1.0,
      isCharging: false,
      connectionType: 'unknown',
      memoryInfo: null,
      devicePixelRatio: window.devicePixelRatio || 1
    };
    
    // Mobile-specific configuration
    this.mobileConfig = {
      maxConcurrentStreams: 1,
      audioQualityLevels: {
        high: { bitrate: 128, sampleRate: 48000 },
        medium: { bitrate: 96, sampleRate: 24000 },
        low: { bitrate: 64, sampleRate: 16000 },
        minimal: { bitrate: 32, sampleRate: 8000 }
      },
      batteryThresholds: {
        critical: 0.15,
        low: 0.30,
        medium: 0.50
      }
    };
    
    // Power management
    this.powerSaveMode = 'none';
    this.wakeLock = null;
    this.isBackgrounded = false;
    this.backgroundStartTime = null;
    
    // Audio routing
    this.audioRouting = {
      currentOutput: 'default',
      availableOutputs: [],
      isBluetoothConnected: false,
      isHeadphonesConnected: false
    };
    
    // Memory management
    this.memoryPressure = 'normal';
    this.gcTimer = null;
    
    // Network adaptation
    this.networkQuality = 'unknown';
    this.adaptiveQuality = true;
    
    this.listeners = new Map();
    this.monitoringIntervals = new Map();
    
    this.bindMethods();
    this.initializeMobileFeatures();
  }
  
  bindMethods() {
    this.onBatteryChange = this.onBatteryChange.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onMemoryPressure = this.onMemoryPressure.bind(this);
    this.onAudioOutputChange = this.onAudioOutputChange.bind(this);
    this.onConnectionChange = this.onConnectionChange.bind(this);
  }
  
  /**
   * Detect if running on mobile device
   */
  detectMobile() {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    
    return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
           ('ontouchstart' in window) ||
           (window.innerWidth <= 768);
  }
  
  /**
   * Initialize mobile-specific features
   */
  async initializeMobileFeatures() {
    if (!this.isMobile) {
      console.log('📱 Non-mobile device detected, mobile optimizations disabled');
      return;
    }
    
    console.log('📱 Initializing mobile call optimizations...');
    
    // Initialize battery monitoring
    await this.initializeBatteryMonitoring();
    
    // Initialize visibility monitoring
    this.initializeVisibilityMonitoring();
    
    // Initialize memory monitoring
    this.initializeMemoryMonitoring();
    
    // Initialize audio output monitoring
    this.initializeAudioOutputMonitoring();
    
    // Initialize network monitoring
    this.initializeNetworkMonitoring();
    
    // Setup wake lock
    await this.setupWakeLock();
    
    // Start device monitoring
    this.startDeviceMonitoring();
    
    console.log('✅ Mobile call optimizations initialized');
  }
  
  /**
   * Initialize battery monitoring
   */
  async initializeBatteryMonitoring() {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        
        this.deviceMetrics.batteryLevel = battery.level;
        this.deviceMetrics.isCharging = battery.charging;
        
        // Listen for battery changes
        battery.addEventListener('levelchange', this.onBatteryChange);
        battery.addEventListener('chargingchange', this.onBatteryChange);
        
        // Set initial power save mode
        this.updatePowerSaveMode();
        
        console.log('🔋 Battery monitoring initialized:', {
          level: Math.round(battery.level * 100) + '%',
          charging: battery.charging
        });
        
      } else {
        console.log('🔋 Battery API not available');
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize battery monitoring:', error);
    }
  }
  
  /**
   * Initialize visibility monitoring for background handling
   */
  initializeVisibilityMonitoring() {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    
    // iOS-specific events
    window.addEventListener('pageshow', this.onVisibilityChange);
    window.addEventListener('pagehide', this.onVisibilityChange);
    
    console.log('👁️ Visibility monitoring initialized');
  }
  
  /**
   * Initialize memory monitoring
   */
  initializeMemoryMonitoring() {
    if ('memory' in performance) {
      this.deviceMetrics.memoryInfo = performance.memory;
      
      // Monitor memory pressure
      setInterval(() => {
        this.checkMemoryPressure();
      }, 10000); // Check every 10 seconds
      
      console.log('🧠 Memory monitoring initialized');
    }
    
    // Setup periodic garbage collection hint
    this.gcTimer = setInterval(() => {
      this.suggestGarbageCollection();
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Initialize audio output monitoring
   */
  initializeAudioOutputMonitoring() {
    if ('mediaDevices' in navigator && 'enumerateDevices' in navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', this.onAudioOutputChange);
      
      // Initial device enumeration
      this.updateAudioOutputs();
      
      console.log('🎧 Audio output monitoring initialized');
    }
  }
  
  /**
   * Initialize network monitoring for mobile
   */
  initializeNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      this.deviceMetrics.connectionType = connection.effectiveType || 'unknown';
      
      connection.addEventListener('change', this.onConnectionChange);
      
      console.log('📡 Mobile network monitoring initialized:', connection.effectiveType);
    }
  }
  
  /**
   * Setup wake lock to prevent screen from sleeping during calls
   */
  async setupWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        // Wake lock will be acquired during active calls
        console.log('⏰ Wake lock API available');
      } else {
        console.log('⏰ Wake lock API not available');
      }
    } catch (error) {
      console.warn('⚠️ Wake lock setup failed:', error);
    }
  }
  
  /**
   * Start device monitoring
   */
  startDeviceMonitoring() {
    // Monitor battery every minute
    this.monitoringIntervals.set('battery', setInterval(() => {
      this.checkBatteryStatus();
    }, 60000));
    
    // Monitor performance every 30 seconds
    this.monitoringIntervals.set('performance', setInterval(() => {
      this.monitorPerformance();
    }, 30000));
    
    console.log('📊 Device monitoring started');
  }
  
  /**
   * Handle battery changes
   */
  onBatteryChange(event) {
    if (event.target) {
      this.deviceMetrics.batteryLevel = event.target.level;
      this.deviceMetrics.isCharging = event.target.charging;
    }
    
    this.updatePowerSaveMode();
    
    this.emit('batteryChange', {
      level: this.deviceMetrics.batteryLevel,
      charging: this.deviceMetrics.isCharging,
      powerSaveMode: this.powerSaveMode,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle visibility changes (background/foreground)
   */
  onVisibilityChange() {
    const isHidden = document.hidden;
    
    if (isHidden && !this.isBackgrounded) {
      // App went to background
      this.isBackgrounded = true;
      this.backgroundStartTime = Date.now();
      this.handleBackgroundTransition();
      
    } else if (!isHidden && this.isBackgrounded) {
      // App came to foreground
      this.isBackgrounded = false;
      const backgroundDuration = Date.now() - this.backgroundStartTime;
      this.handleForegroundTransition(backgroundDuration);
    }
  }
  
  /**
   * Handle memory pressure
   */
  onMemoryPressure() {
    console.log('🧠 Memory pressure detected, optimizing...');
    
    this.memoryPressure = 'high';
    this.optimizeForMemoryPressure();
    
    this.emit('memoryPressure', {
      pressure: this.memoryPressure,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle audio output changes
   */
  async onAudioOutputChange() {
    await this.updateAudioOutputs();
    
    this.emit('audioOutputChange', {
      routing: { ...this.audioRouting },
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle network connection changes
   */
  onConnectionChange(event) {
    const connection = event.target;
    this.deviceMetrics.connectionType = connection.effectiveType || 'unknown';
    
    this.updateNetworkQuality();
    this.adaptToNetworkConditions();
    
    this.emit('networkChange', {
      connectionType: this.deviceMetrics.connectionType,
      quality: this.networkQuality,
      timestamp: Date.now()
    });
  }
  
  /**
   * Update power save mode based on battery level
   */
  updatePowerSaveMode() {
    const level = this.deviceMetrics.batteryLevel;
    const isCharging = this.deviceMetrics.isCharging;
    
    if (isCharging) {
      this.powerSaveMode = 'none';
    } else if (level <= this.mobileConfig.batteryThresholds.critical) {
      this.powerSaveMode = 'critical';
    } else if (level <= this.mobileConfig.batteryThresholds.low) {
      this.powerSaveMode = 'low';
    } else if (level <= this.mobileConfig.batteryThresholds.medium) {
      this.powerSaveMode = 'medium';
    } else {
      this.powerSaveMode = 'none';
    }
    
    console.log(`🔋 Power save mode: ${this.powerSaveMode} (${Math.round(level * 100)}%)`);
  }
  
  /**
   * Handle background transition
   */
  async handleBackgroundTransition() {
    console.log('📱 App backgrounded, optimizing for battery...');
    
    // Release wake lock
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
    
    // Reduce quality for background operation
    if (this.adaptiveQuality) {
      this.setCallQuality('low');
    }
    
    // Reduce monitoring frequency
    this.reduceMonitoringFrequency();
    
    this.emit('backgrounded', {
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle foreground transition
   */
  async handleForegroundTransition(backgroundDuration) {
    console.log(`📱 App foregrounded after ${Math.round(backgroundDuration / 1000)}s`);
    
    // Restore wake lock if in call
    await this.acquireWakeLock();
    
    // Restore quality
    if (this.adaptiveQuality) {
      this.adaptCallQuality();
    }
    
    // Restore monitoring frequency
    this.restoreMonitoringFrequency();
    
    this.emit('foregrounded', {
      backgroundDuration,
      timestamp: Date.now()
    });
  }
  
  /**
   * Acquire wake lock during calls
   */
  async acquireWakeLock() {
    try {
      if ('wakeLock' in navigator && !this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('⏰ Wake lock acquired');
      }
    } catch (error) {
      console.warn('⚠️ Failed to acquire wake lock:', error);
    }
  }
  
  /**
   * Release wake lock
   */
  async releaseWakeLock() {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
      console.log('⏰ Wake lock released');
    }
  }
  
  /**
   * Update audio outputs
   */
  async updateAudioOutputs() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      this.audioRouting.availableOutputs = audioOutputs;
      this.audioRouting.isBluetoothConnected = audioOutputs.some(device => 
        device.label.toLowerCase().includes('bluetooth')
      );
      this.audioRouting.isHeadphonesConnected = audioOutputs.some(device => 
        device.label.toLowerCase().includes('headphone') || 
        device.label.toLowerCase().includes('earphone')
      );
      
    } catch (error) {
      console.warn('⚠️ Failed to update audio outputs:', error);
    }
  }
  
  /**
   * Set call quality based on mode
   */
  setCallQuality(qualityLevel) {
    const quality = this.mobileConfig.audioQualityLevels[qualityLevel];
    if (!quality) return;
    
    console.log(`🎵 Setting call quality to ${qualityLevel}:`, quality);
    
    this.emit('qualityChange', {
      level: qualityLevel,
      settings: quality,
      timestamp: Date.now()
    });
  }
  
  /**
   * Adapt call quality based on current conditions
   */
  adaptCallQuality() {
    let qualityLevel = 'high';
    
    // Adapt based on power save mode
    switch (this.powerSaveMode) {
      case 'critical':
        qualityLevel = 'minimal';
        break;
      case 'low':
        qualityLevel = 'low';
        break;
      case 'medium':
        qualityLevel = 'medium';
        break;
    }
    
    // Adapt based on network quality
    if (this.networkQuality === 'poor' && qualityLevel === 'high') {
      qualityLevel = 'medium';
    } else if (this.networkQuality === 'poor') {
      qualityLevel = 'low';
    }
    
    // Adapt based on memory pressure
    if (this.memoryPressure === 'high' && qualityLevel === 'high') {
      qualityLevel = 'medium';
    }
    
    this.setCallQuality(qualityLevel);
  }
  
  /**
   * Update network quality assessment
   */
  updateNetworkQuality() {
    const connectionType = this.deviceMetrics.connectionType;
    
    switch (connectionType) {
      case '4g':
      case 'wifi':
        this.networkQuality = 'excellent';
        break;
      case '3g':
        this.networkQuality = 'good';
        break;
      case '2g':
      case 'slow-2g':
        this.networkQuality = 'poor';
        break;
      default:
        this.networkQuality = 'unknown';
    }
  }
  
  /**
   * Adapt to network conditions
   */
  adaptToNetworkConditions() {
    if (this.adaptiveQuality) {
      this.adaptCallQuality();
    }
    
    console.log(`📡 Adapted to ${this.deviceMetrics.connectionType} network (${this.networkQuality})`);
  }
  
  /**
   * Check memory pressure
   */
  checkMemoryPressure() {
    if ('memory' in performance) {
      const memory = performance.memory;
      const usedPercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
      
      if (usedPercent > 85) {
        this.memoryPressure = 'high';
        this.onMemoryPressure();
      } else if (usedPercent > 70) {
        this.memoryPressure = 'medium';
      } else {
        this.memoryPressure = 'normal';
      }
    }
  }
  
  /**
   * Optimize for memory pressure
   */
  optimizeForMemoryPressure() {
    // Reduce call quality
    this.setCallQuality('low');
    
    // Trigger garbage collection hint
    this.suggestGarbageCollection();
    
    // Reduce monitoring frequency
    this.reduceMonitoringFrequency();
    
    console.log('🧠 Memory optimizations applied');
  }
  
  /**
   * Suggest garbage collection
   */
  suggestGarbageCollection() {
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }
  }
  
  /**
   * Reduce monitoring frequency
   */
  reduceMonitoringFrequency() {
    // Clear existing intervals and create slower ones
    this.monitoringIntervals.forEach((interval, key) => {
      clearInterval(interval);
      
      const slowInterval = key === 'battery' ? 120000 : 60000; // Double the intervals
      this.monitoringIntervals.set(key, setInterval(() => {
        if (key === 'battery') {
          this.checkBatteryStatus();
        } else if (key === 'performance') {
          this.monitorPerformance();
        }
      }, slowInterval));
    });
  }
  
  /**
   * Restore normal monitoring frequency
   */
  restoreMonitoringFrequency() {
    // Clear slow intervals and restore normal ones
    this.monitoringIntervals.forEach((interval, key) => {
      clearInterval(interval);
    });
    
    this.startDeviceMonitoring();
  }
  
  /**
   * Check battery status
   */
  checkBatteryStatus() {
    this.emit('batteryStatus', {
      level: this.deviceMetrics.batteryLevel,
      charging: this.deviceMetrics.isCharging,
      powerSaveMode: this.powerSaveMode,
      timestamp: Date.now()
    });
  }
  
  /**
   * Monitor performance metrics
   */
  monitorPerformance() {
    const metrics = {
      memory: 'memory' in performance ? performance.memory : null,
      timing: performance.timing,
      navigation: performance.navigation,
      timestamp: Date.now()
    };
    
    this.emit('performanceMetrics', metrics);
  }
  
  /**
   * Get mobile optimization recommendations
   */
  getMobileRecommendations() {
    const recommendations = [];
    
    if (this.deviceMetrics.batteryLevel < 0.2 && !this.deviceMetrics.isCharging) {
      recommendations.push({
        type: 'battery',
        severity: 'high',
        message: 'Low battery detected',
        suggestions: [
          'Connect device to charger',
          'Enable power save mode',
          'Reduce call quality if necessary'
        ]
      });
    }
    
    if (this.networkQuality === 'poor') {
      recommendations.push({
        type: 'network',
        severity: 'medium',
        message: 'Poor network quality',
        suggestions: [
          'Switch to WiFi if available',
          'Move to area with better signal',
          'Consider ending call and trying again'
        ]
      });
    }
    
    if (this.memoryPressure === 'high') {
      recommendations.push({
        type: 'memory',
        severity: 'medium',
        message: 'High memory usage',
        suggestions: [
          'Close other applications',
          'Restart browser if possible',
          'Reduced call quality automatically applied'
        ]
      });
    }
    
    return recommendations;
  }
  
  /**
   * Get device status
   */
  getDeviceStatus() {
    return {
      isMobile: this.isMobile,
      deviceMetrics: { ...this.deviceMetrics },
      powerSaveMode: this.powerSaveMode,
      networkQuality: this.networkQuality,
      memoryPressure: this.memoryPressure,
      isBackgrounded: this.isBackgrounded,
      audioRouting: { ...this.audioRouting },
      wakeLockActive: !!this.wakeLock,
      timestamp: Date.now()
    };
  }
  
  /**
   * Event system
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event listener:`, error);
        }
      });
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    console.log('🗑️ Destroying Mobile Call Manager...');
    
    // Release wake lock
    this.releaseWakeLock();
    
    // Clear monitoring intervals
    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals.clear();
    
    // Clear garbage collection timer
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pageshow', this.onVisibilityChange);
    window.removeEventListener('pagehide', this.onVisibilityChange);
    
    if ('connection' in navigator) {
      navigator.connection.removeEventListener('change', this.onConnectionChange);
    }
    
    if ('mediaDevices' in navigator) {
      navigator.mediaDevices.removeEventListener('devicechange', this.onAudioOutputChange);
    }
    
    this.listeners.clear();
    
    console.log('🗑️ Mobile Call Manager destroyed');
  }
}

export default MobileCallManager;