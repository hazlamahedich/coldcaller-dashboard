/**
 * NetworkMonitor - Real-time network performance monitoring for WebRTC calls
 * Features: RTT measurement, bandwidth testing, connection quality assessment
 * Provides network insights for optimal call routing and quality adjustments
 */

class NetworkMonitor {
  constructor() {
    this.networkMetrics = {
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      uplink: 0,
      rtt: 0,
      bandwidth: {
        download: 0,
        upload: 0
      },
      quality: 'unknown',
      timestamp: null
    };
    
    this.monitoringActive = false;
    this.monitoringInterval = null;
    this.listeners = new Map();
    this.history = [];
    this.maxHistoryLength = 200;
    
    // Test servers for RTT and bandwidth testing
    this.testServers = [
      'https://www.google.com/generate_204',
      'https://www.cloudflare.com/cdn-cgi/trace',
      'https://httpbin.org/delay/0'
    ];
    
    // Connection quality thresholds
    this.qualityThresholds = {
      excellent: { rtt: 50, bandwidth: 10000 },   // <50ms RTT, >10Mbps
      good: { rtt: 150, bandwidth: 5000 },        // <150ms RTT, >5Mbps
      fair: { rtt: 300, bandwidth: 1000 },        // <300ms RTT, >1Mbps
      poor: { rtt: 500, bandwidth: 500 }          // <500ms RTT, >500Kbps
    };
    
    this.bindMethods();
    this.initializeNetworkAPI();
  }
  
  bindMethods() {
    this.onConnectionChange = this.onConnectionChange.bind(this);
    this.measureRTT = this.measureRTT.bind(this);
    this.testBandwidth = this.testBandwidth.bind(this);
  }
  
  /**
   * Initialize Network Information API
   */
  initializeNetworkAPI() {
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        this.connection = connection;
        
        // Initial reading
        this.updateConnectionInfo();
        
        // Listen for changes
        connection.addEventListener('change', this.onConnectionChange);
        
        console.log('📡 Network Information API initialized');
      }
    } else {
      console.log('📡 Network Information API not available');
    }
  }
  
  /**
   * Handle connection changes
   */
  onConnectionChange() {
    this.updateConnectionInfo();
    this.emit('connectionChange', {
      metrics: { ...this.networkMetrics },
      timestamp: Date.now()
    });
  }
  
  /**
   * Update connection information from Network API
   */
  updateConnectionInfo() {
    if (!this.connection) return;
    
    this.networkMetrics.connectionType = this.connection.type || 'unknown';
    this.networkMetrics.effectiveType = this.connection.effectiveType || 'unknown';
    this.networkMetrics.downlink = this.connection.downlink || 0;
    this.networkMetrics.rtt = this.connection.rtt || 0;
    this.networkMetrics.timestamp = Date.now();
    
    // Estimate quality based on connection info
    this.updateConnectionQuality();
    
    console.log('📊 Connection info updated:', {
      type: this.networkMetrics.connectionType,
      effectiveType: this.networkMetrics.effectiveType,
      downlink: this.networkMetrics.downlink,
      rtt: this.networkMetrics.rtt
    });
  }
  
  /**
   * Start network monitoring
   */
  startMonitoring(interval = 5000) {
    if (this.monitoringActive) {
      this.stopMonitoring();
    }
    
    this.monitoringActive = true;
    
    // Initial measurements
    this.performNetworkTests();
    
    // Schedule regular monitoring
    this.monitoringInterval = setInterval(() => {
      this.performNetworkTests();
    }, interval);
    
    console.log('📊 Network monitoring started');
    this.emit('monitoringStarted', { interval, timestamp: Date.now() });
  }
  
  /**
   * Stop network monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.monitoringActive = false;
    
    console.log('📊 Network monitoring stopped');
    this.emit('monitoringStopped', { timestamp: Date.now() });
  }
  
  /**
   * Perform comprehensive network tests
   */
  async performNetworkTests() {
    try {
      // Run tests in parallel
      const [rttResults, bandwidthResults] = await Promise.all([
        this.measureRTTToMultipleServers(),
        this.testBandwidth()
      ]);
      
      // Update metrics
      this.networkMetrics.rtt = rttResults.averageRTT;
      this.networkMetrics.bandwidth = bandwidthResults;
      this.networkMetrics.timestamp = Date.now();
      
      // Update quality assessment
      this.updateConnectionQuality();
      
      // Store in history
      this.addToHistory({
        ...this.networkMetrics,
        timestamp: Date.now()
      });
      
      // Emit update
      this.emit('metricsUpdate', {
        metrics: { ...this.networkMetrics },
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Network test failed:', error);
      this.emit('testError', { error: error.message, timestamp: Date.now() });
    }
  }
  
  /**
   * Measure RTT to multiple servers
   */
  async measureRTTToMultipleServers() {
    const rttPromises = this.testServers.map(server => this.measureRTT(server));
    
    try {
      const results = await Promise.allSettled(rttPromises);
      const successfulResults = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      
      if (successfulResults.length === 0) {
        throw new Error('All RTT measurements failed');
      }
      
      const averageRTT = successfulResults.reduce((sum, rtt) => sum + rtt, 0) / successfulResults.length;
      const minRTT = Math.min(...successfulResults);
      const maxRTT = Math.max(...successfulResults);
      
      return {
        averageRTT: Math.round(averageRTT),
        minRTT: Math.round(minRTT),
        maxRTT: Math.round(maxRTT),
        successfulMeasurements: successfulResults.length,
        totalAttempts: this.testServers.length
      };
      
    } catch (error) {
      console.error('❌ RTT measurement failed:', error);
      return {
        averageRTT: this.networkMetrics.rtt || 0,
        minRTT: 0,
        maxRTT: 0,
        successfulMeasurements: 0,
        totalAttempts: this.testServers.length
      };
    }
  }
  
  /**
   * Measure RTT to a specific server
   */
  async measureRTT(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        img.ontimeout = null;
      };
      
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('RTT measurement timeout'));
      }, timeout);
      
      img.onload = () => {
        cleanup();
        clearTimeout(timer);
        const rtt = performance.now() - startTime;
        resolve(rtt);
      };
      
      img.onerror = () => {
        cleanup();
        clearTimeout(timer);
        
        // For CORS-blocked images, we can still measure the time to error
        const rtt = performance.now() - startTime;
        if (rtt < timeout) {
          resolve(rtt);
        } else {
          reject(new Error('RTT measurement failed'));
        }
      };
      
      // Add cache-busting parameter
      const testUrl = url.includes('?') 
        ? `${url}&_t=${Date.now()}` 
        : `${url}?_t=${Date.now()}`;
        
      img.src = testUrl;
    });
  }
  
  /**
   * Test bandwidth using download/upload tests
   */
  async testBandwidth() {
    try {
      // Simple download bandwidth test
      const downloadBandwidth = await this.measureDownloadBandwidth();
      
      // Note: Upload bandwidth testing is more complex and may require a server endpoint
      // For now, we'll estimate based on connection type
      const uploadBandwidth = this.estimateUploadBandwidth(downloadBandwidth);
      
      return {
        download: downloadBandwidth,
        upload: uploadBandwidth
      };
      
    } catch (error) {
      console.warn('⚠️ Bandwidth test failed:', error);
      return {
        download: this.networkMetrics.bandwidth.download || 0,
        upload: this.networkMetrics.bandwidth.upload || 0
      };
    }
  }
  
  /**
   * Measure download bandwidth
   */
  async measureDownloadBandwidth() {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const xhr = new XMLHttpRequest();
      
      // Use a small test file (could be a 1x1 pixel image or small JSON)
      const testUrl = 'https://httpbin.org/bytes/10240'; // 10KB test
      
      xhr.open('GET', testUrl + '?_t=' + Date.now(), true);
      xhr.responseType = 'arraybuffer';
      
      xhr.timeout = 10000; // 10 second timeout
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          const endTime = performance.now();
          const duration = (endTime - startTime) / 1000; // seconds
          const bytes = xhr.response.byteLength;
          const bandwidth = (bytes * 8) / duration; // bits per second
          const kbps = bandwidth / 1000; // convert to kbps
          
          resolve(Math.round(kbps));
        } else {
          reject(new Error('Bandwidth test request failed'));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Bandwidth test network error'));
      };
      
      xhr.ontimeout = () => {
        reject(new Error('Bandwidth test timeout'));
      };
      
      xhr.send();
    });
  }
  
  /**
   * Estimate upload bandwidth based on download and connection type
   */
  estimateUploadBandwidth(downloadBandwidth) {
    const connectionType = this.networkMetrics.connectionType;
    
    // Typical upload/download ratios by connection type
    const ratios = {
      'ethernet': 0.8,    // Usually symmetric or close
      'wifi': 0.7,        // Usually good upload
      'cellular': 0.3,    // Mobile networks often have poor upload
      '4g': 0.4,
      '3g': 0.2,
      '2g': 0.1,
      'unknown': 0.5
    };
    
    const ratio = ratios[connectionType] || ratios.unknown;
    return Math.round(downloadBandwidth * ratio);
  }
  
  /**
   * Update connection quality assessment
   */
  updateConnectionQuality() {
    const rtt = this.networkMetrics.rtt;
    const bandwidth = Math.max(
      this.networkMetrics.bandwidth.download,
      this.networkMetrics.downlink * 1000 // Convert Mbps to Kbps
    );
    
    if (rtt <= this.qualityThresholds.excellent.rtt && 
        bandwidth >= this.qualityThresholds.excellent.bandwidth) {
      this.networkMetrics.quality = 'excellent';
    } else if (rtt <= this.qualityThresholds.good.rtt && 
               bandwidth >= this.qualityThresholds.good.bandwidth) {
      this.networkMetrics.quality = 'good';
    } else if (rtt <= this.qualityThresholds.fair.rtt && 
               bandwidth >= this.qualityThresholds.fair.bandwidth) {
      this.networkMetrics.quality = 'fair';
    } else {
      this.networkMetrics.quality = 'poor';
    }
  }
  
  /**
   * Get optimal audio codec based on network conditions
   */
  getOptimalAudioCodec() {
    const quality = this.networkMetrics.quality;
    const bandwidth = this.networkMetrics.bandwidth.download;
    
    if (quality === 'excellent' && bandwidth > 100) {
      return {
        codec: 'opus',
        bitrate: 128,
        sampleRate: 48000,
        stereo: true
      };
    } else if (quality === 'good' && bandwidth > 50) {
      return {
        codec: 'opus',
        bitrate: 96,
        sampleRate: 48000,
        stereo: false
      };
    } else if (quality === 'fair' && bandwidth > 25) {
      return {
        codec: 'opus',
        bitrate: 64,
        sampleRate: 16000,
        stereo: false
      };
    } else {
      return {
        codec: 'PCMU', // G.711
        bitrate: 64,
        sampleRate: 8000,
        stereo: false
      };
    }
  }
  
  /**
   * Get network recommendations
   */
  getNetworkRecommendations() {
    const recommendations = [];
    const quality = this.networkMetrics.quality;
    
    if (quality === 'poor') {
      recommendations.push({
        type: 'connection',
        severity: 'high',
        message: 'Poor network connection detected',
        suggestions: [
          'Switch to a more stable internet connection',
          'Move closer to WiFi router',
          'Close other bandwidth-intensive applications',
          'Consider using wired ethernet connection'
        ]
      });
    }
    
    if (this.networkMetrics.rtt > 300) {
      recommendations.push({
        type: 'latency',
        severity: 'medium',
        message: `High latency detected (${this.networkMetrics.rtt}ms)`,
        suggestions: [
          'Check for background downloads or streaming',
          'Contact ISP if latency consistently high',
          'Consider using a VPN with better routing'
        ]
      });
    }
    
    if (this.networkMetrics.connectionType === 'cellular') {
      recommendations.push({
        type: 'connection_type',
        severity: 'low',
        message: 'Using cellular connection',
        suggestions: [
          'Switch to WiFi for better call quality',
          'Monitor data usage during calls',
          'Ensure strong cellular signal strength'
        ]
      });
    }
    
    return recommendations;
  }
  
  /**
   * Add metrics to history
   */
  addToHistory(metrics) {
    this.history.push({
      ...metrics,
      timestamp: Date.now()
    });
    
    // Trim history to max length
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }
  
  /**
   * Get current network metrics
   */
  getCurrentMetrics() {
    return { ...this.networkMetrics };
  }
  
  /**
   * Get network history
   */
  getNetworkHistory(limit = 50) {
    return this.history.slice(-limit);
  }
  
  /**
   * Check if network is suitable for VoIP
   */
  isNetworkSuitableForVoIP() {
    const quality = this.networkMetrics.quality;
    const rtt = this.networkMetrics.rtt;
    const bandwidth = Math.max(
      this.networkMetrics.bandwidth.download,
      this.networkMetrics.downlink * 1000
    );
    
    return {
      suitable: quality !== 'poor' && rtt < 400 && bandwidth > 50,
      quality: quality,
      details: {
        rtt: rtt,
        bandwidth: bandwidth,
        connectionType: this.networkMetrics.connectionType
      }
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
    this.stopMonitoring();
    
    if (this.connection) {
      this.connection.removeEventListener('change', this.onConnectionChange);
    }
    
    this.listeners.clear();
    this.history = [];
    
    console.log('🗑️ Network Monitor destroyed');
  }
}

export default NetworkMonitor;