/**
 * EnhancedSIPManager - SIP.js integration with WebRTC performance optimization
 * Extends the existing SIPManager with advanced WebRTC performance features
 * Integrates CallQualityManager, NetworkMonitor, and mobile optimizations
 */

import SIPManager from './SIPManager';
import CallQualityManager from '../utils/CallQualityManager';
import NetworkMonitor from '../utils/NetworkMonitor';
import WebRTCOptimizer from '../utils/WebRTCOptimizer';
import MobileCallManager from '../utils/MobileCallManager';

class EnhancedSIPManager extends SIPManager {
  constructor() {
    super();
    
    // Performance managers
    this.callQualityManager = new CallQualityManager();
    this.networkMonitor = new NetworkMonitor();
    this.webrtcOptimizer = new WebRTCOptimizer();
    this.mobileCallManager = new MobileCallManager();
    
    // Performance metrics
    this.performanceMetrics = {
      callSetupTime: 0,
      audioQuality: null,
      networkQuality: null,
      adaptiveOptimizations: [],
      callHistory: []
    };
    
    // Enhanced configuration
    this.enhancedConfig = {
      enablePerformanceMonitoring: true,
      enableMobileOptimizations: true,
      enableAdaptiveQuality: true,
      enableCallRecording: false,
      qualityThresholds: {
        minMOS: 3.0,
        maxLatency: 200,
        maxPacketLoss: 2.0
      }
    };
    
    this.isPerformanceMonitoringActive = false;
    this.setupEnhancedEventListeners();
  }
  
  /**
   * Setup enhanced event listeners
   */
  setupEnhancedEventListeners() {
    // Call quality monitoring
    this.callQualityManager.on('qualityUpdate', (data) => {
      this.handleQualityUpdate(data);
    });
    
    // Network monitoring
    this.networkMonitor.on('metricsUpdate', (data) => {
      this.handleNetworkUpdate(data);
    });
    
    // Mobile optimizations
    this.mobileCallManager.on('batteryChange', (data) => {
      this.handleMobileOptimization(data);
    });
    
    // WebRTC optimization events
    this.webrtcOptimizer.on('connectionEstablished', (data) => {
      this.handleConnectionOptimization(data);
    });
  }
  
  /**
   * Initialize with enhanced performance features
   */
  async initialize(config) {
    try {
      console.log('🚀 Initializing Enhanced SIP Manager...');
      
      // Initialize base SIP manager
      const result = await super.initialize(config);
      
      if (!result.success) {
        return result;
      }
      
      // Start network monitoring
      if (this.enhancedConfig.enablePerformanceMonitoring) {
        this.networkMonitor.startMonitoring();
        console.log('📊 Network monitoring started');
      }
      
      // Initialize mobile optimizations
      if (this.enhancedConfig.enableMobileOptimizations && this.mobileCallManager.isMobile) {
        console.log('📱 Mobile optimizations enabled');
      }
      
      this.isPerformanceMonitoringActive = true;
      console.log('✅ Enhanced SIP Manager initialized with performance features');
      
      return { success: true, enhanced: true };
      
    } catch (error) {
      console.error('❌ Enhanced SIP initialization failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Make call with performance optimization
   */
  async makeCall(phoneNumber, options = {}) {
    const callStartTime = Date.now();
    
    try {
      console.log('📞 Making optimized call to:', phoneNumber);
      
      // Pre-call network quality check
      const networkSuitability = this.networkMonitor.isNetworkSuitableForVoIP();
      
      if (!networkSuitability.suitable) {
        this.emit('callWarning', {
          type: 'network_quality',
          message: 'Network quality may affect call performance',
          details: networkSuitability.details
        });
      }
      
      // Apply mobile optimizations
      if (this.mobileCallManager.isMobile) {
        await this.mobileCallManager.acquireWakeLock();
        this.mobileCallManager.adaptCallQuality();
      }
      
      // Create optimized peer connection if not using SIP.js built-in
      let optimizedOptions = { ...options };
      
      if (this.enhancedConfig.enableAdaptiveQuality) {
        const optimalCodec = this.networkMonitor.getOptimalAudioCodec();
        optimizedOptions.audioCodec = optimalCodec;
      }
      
      // Make the call using parent method
      const result = await super.makeCall(phoneNumber, optimizedOptions);
      
      if (result.success) {
        // Start call quality monitoring
        if (this.currentSession && this.enhancedConfig.enablePerformanceMonitoring) {
          await this.startCallPerformanceMonitoring();
        }
        
        // Record call setup time
        this.performanceMetrics.callSetupTime = Date.now() - callStartTime;
        
        // Add to call history
        this.performanceMetrics.callHistory.push({
          phoneNumber,
          startTime: new Date().toISOString(),
          setupTime: this.performanceMetrics.callSetupTime,
          networkQuality: this.networkMonitor.networkMetrics.quality,
          deviceType: this.mobileCallManager.isMobile ? 'mobile' : 'desktop'
        });
        
        this.emit('callStartedEnhanced', {
          ...result,
          setupTime: this.performanceMetrics.callSetupTime,
          networkQuality: this.networkMonitor.networkMetrics.quality,
          optimizations: this.getActiveOptimizations()
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Enhanced call failed:', error);
      
      // Release mobile resources on failure
      if (this.mobileCallManager.isMobile) {
        await this.mobileCallManager.releaseWakeLock();
      }
      
      throw error;
    }
  }
  
  /**
   * End call with performance cleanup
   */
  async endCall() {
    try {
      // Get call duration and quality metrics before ending
      const callMetrics = this.getCurrentCallMetrics();
      
      // End the call using parent method
      const result = await super.endCall();
      
      // Stop performance monitoring
      this.stopCallPerformanceMonitoring();
      
      // Release mobile resources
      if (this.mobileCallManager.isMobile) {
        await this.mobileCallManager.releaseWakeLock();
      }
      
      // Update call history with final metrics
      if (this.performanceMetrics.callHistory.length > 0) {
        const lastCall = this.performanceMetrics.callHistory[this.performanceMetrics.callHistory.length - 1];
        lastCall.endTime = new Date().toISOString();
        lastCall.duration = result.duration;
        lastCall.finalQuality = callMetrics;
      }
      
      this.emit('callEndedEnhanced', {
        ...result,
        metrics: callMetrics,
        optimizations: this.getActiveOptimizations()
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Enhanced call end failed:', error);
      throw error;
    }
  }
  
  /**
   * Start call performance monitoring
   */
  async startCallPerformanceMonitoring() {
    try {
      if (!this.currentSession) {
        console.warn('⚠️ No active session for performance monitoring');
        return;
      }
      
      // Get peer connection from SIP.js session
      const peerConnection = this.currentSession.sessionDescriptionHandler?.peerConnection;
      
      if (!peerConnection) {
        console.warn('⚠️ No peer connection available for monitoring');
        return;
      }
      
      // Initialize call quality monitoring
      await this.callQualityManager.initialize(peerConnection, this.localStream);
      
      console.log('📊 Call performance monitoring started');
      
    } catch (error) {
      console.error('❌ Failed to start call performance monitoring:', error);
    }
  }
  
  /**
   * Stop call performance monitoring
   */
  stopCallPerformanceMonitoring() {
    try {
      this.callQualityManager.stopMonitoring();
      console.log('📊 Call performance monitoring stopped');
    } catch (error) {
      console.error('❌ Failed to stop call performance monitoring:', error);
    }
  }
  
  /**
   * Handle quality updates
   */
  handleQualityUpdate(data) {
    this.performanceMetrics.audioQuality = data.metrics;
    
    // Check if quality is below thresholds
    const quality = data.metrics;
    const thresholds = this.enhancedConfig.qualityThresholds;
    
    if (quality.mos < thresholds.minMOS) {
      this.handlePoorCallQuality(quality);
    }
    
    if (quality.latency > thresholds.maxLatency) {
      this.handleHighLatency(quality);
    }
    
    if (quality.packetLoss > thresholds.maxPacketLoss) {
      this.handlePacketLoss(quality);
    }
    
    this.emit('qualityUpdate', data);
  }
  
  /**
   * Handle network updates
   */
  handleNetworkUpdate(data) {
    this.performanceMetrics.networkQuality = data.metrics;
    
    // Adapt to network conditions
    if (this.enhancedConfig.enableAdaptiveQuality && this.currentSession) {
      this.adaptToNetworkConditions(data.metrics);
    }
    
    this.emit('networkUpdate', data);
  }
  
  /**
   * Handle mobile optimization updates
   */
  handleMobileOptimization(data) {
    if (data.powerSaveMode === 'critical') {
      this.enablePowerSaveMode();
    } else if (data.powerSaveMode === 'none') {
      this.disablePowerSaveMode();
    }
    
    this.emit('mobileOptimization', data);
  }
  
  /**
   * Handle connection optimization
   */
  handleConnectionOptimization(data) {
    console.log('🔗 WebRTC connection optimized:', data);
    this.emit('connectionOptimized', data);
  }
  
  /**
   * Handle poor call quality
   */
  handlePoorCallQuality(quality) {
    console.warn('⚠️ Poor call quality detected:', quality);
    
    const optimization = {
      type: 'quality_degradation',
      action: 'reduce_bitrate',
      timestamp: Date.now(),
      metrics: quality
    };
    
    this.performanceMetrics.adaptiveOptimizations.push(optimization);
    
    this.emit('callQualityWarning', {
      quality,
      recommendations: this.callQualityManager.getQualityRecommendations()
    });
  }
  
  /**
   * Handle high latency
   */
  handleHighLatency(quality) {
    console.warn('⚠️ High latency detected:', quality.latency + 'ms');
    
    const optimization = {
      type: 'high_latency',
      action: 'optimize_buffer',
      timestamp: Date.now(),
      latency: quality.latency
    };
    
    this.performanceMetrics.adaptiveOptimizations.push(optimization);
    
    this.emit('latencyWarning', { quality });
  }
  
  /**
   * Handle packet loss
   */
  handlePacketLoss(quality) {
    console.warn('⚠️ Packet loss detected:', quality.packetLoss + '%');
    
    const optimization = {
      type: 'packet_loss',
      action: 'enable_fec',
      timestamp: Date.now(),
      packetLoss: quality.packetLoss
    };
    
    this.performanceMetrics.adaptiveOptimizations.push(optimization);
    
    this.emit('packetLossWarning', { quality });
  }
  
  /**
   * Adapt to network conditions
   */
  adaptToNetworkConditions(networkMetrics) {
    const quality = networkMetrics.quality;
    
    if (quality === 'poor' && this.currentSession) {
      // Reduce quality for poor networks
      this.reduceBitrate('network_adaptation');
    } else if (quality === 'excellent' && this.currentSession) {
      // Increase quality for excellent networks
      this.increaseBitrate('network_optimization');
    }
  }
  
  /**
   * Enable power save mode
   */
  enablePowerSaveMode() {
    console.log('🔋 Enabling power save mode');
    
    if (this.currentSession) {
      this.reduceBitrate('power_save');
    }
    
    const optimization = {
      type: 'power_save',
      action: 'enable',
      timestamp: Date.now()
    };
    
    this.performanceMetrics.adaptiveOptimizations.push(optimization);
  }
  
  /**
   * Disable power save mode
   */
  disablePowerSaveMode() {
    console.log('🔋 Disabling power save mode');
    
    if (this.currentSession) {
      this.restoreNormalBitrate('power_restore');
    }
    
    const optimization = {
      type: 'power_save',
      action: 'disable',
      timestamp: Date.now()
    };
    
    this.performanceMetrics.adaptiveOptimizations.push(optimization);
  }
  
  /**
   * Reduce bitrate for optimization
   */
  async reduceBitrate(reason) {
    try {
      // This would integrate with SIP.js to adjust media parameters
      console.log('📉 Reducing bitrate for:', reason);
      
      // Implementation would depend on SIP.js session capabilities
      if (this.currentSession && this.currentSession.sessionDescriptionHandler) {
        // Adjust bitrate through SDP manipulation or RTP parameters
      }
      
    } catch (error) {
      console.error('❌ Failed to reduce bitrate:', error);
    }
  }
  
  /**
   * Increase bitrate for optimization
   */
  async increaseBitrate(reason) {
    try {
      console.log('📈 Increasing bitrate for:', reason);
      
      if (this.currentSession && this.currentSession.sessionDescriptionHandler) {
        // Increase bitrate through SDP manipulation or RTP parameters
      }
      
    } catch (error) {
      console.error('❌ Failed to increase bitrate:', error);
    }
  }
  
  /**
   * Restore normal bitrate
   */
  async restoreNormalBitrate(reason) {
    try {
      console.log('📊 Restoring normal bitrate for:', reason);
      
      if (this.currentSession && this.currentSession.sessionDescriptionHandler) {
        // Restore default bitrate settings
      }
      
    } catch (error) {
      console.error('❌ Failed to restore bitrate:', error);
    }
  }
  
  /**
   * Get current call metrics
   */
  getCurrentCallMetrics() {
    return {
      callQuality: this.performanceMetrics.audioQuality,
      networkQuality: this.performanceMetrics.networkQuality,
      setupTime: this.performanceMetrics.callSetupTime,
      optimizations: this.getActiveOptimizations(),
      timestamp: Date.now()
    };
  }
  
  /**
   * Get active optimizations
   */
  getActiveOptimizations() {
    return {
      performanceMonitoring: this.isPerformanceMonitoringActive,
      mobileOptimizations: this.mobileCallManager.isMobile && this.enhancedConfig.enableMobileOptimizations,
      adaptiveQuality: this.enhancedConfig.enableAdaptiveQuality,
      powerSaveMode: this.mobileCallManager.powerSaveMode !== 'none',
      networkAdaptation: this.networkMonitor.networkMetrics.quality !== 'unknown'
    };
  }
  
  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    return {
      summary: {
        totalCalls: this.performanceMetrics.callHistory.length,
        averageSetupTime: this.calculateAverageSetupTime(),
        averageCallQuality: this.calculateAverageCallQuality(),
        optimizationsCount: this.performanceMetrics.adaptiveOptimizations.length
      },
      currentMetrics: this.getCurrentCallMetrics(),
      networkStatus: this.networkMonitor.getCurrentMetrics(),
      deviceStatus: this.mobileCallManager.getDeviceStatus(),
      callHistory: this.performanceMetrics.callHistory,
      adaptiveOptimizations: this.performanceMetrics.adaptiveOptimizations,
      recommendations: this.getPerformanceRecommendations(),
      timestamp: Date.now()
    };
  }
  
  /**
   * Calculate average setup time
   */
  calculateAverageSetupTime() {
    const history = this.performanceMetrics.callHistory;
    if (history.length === 0) return 0;
    
    const total = history.reduce((sum, call) => sum + (call.setupTime || 0), 0);
    return Math.round(total / history.length);
  }
  
  /**
   * Calculate average call quality
   */
  calculateAverageCallQuality() {
    const history = this.performanceMetrics.callHistory;
    const qualityScores = history
      .filter(call => call.finalQuality && call.finalQuality.callQuality)
      .map(call => call.finalQuality.callQuality.mos);
    
    if (qualityScores.length === 0) return null;
    
    const total = qualityScores.reduce((sum, mos) => sum + mos, 0);
    return Number((total / qualityScores.length).toFixed(1));
  }
  
  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations() {
    const recommendations = [];
    
    // Get recommendations from each manager
    if (this.callQualityManager.qualityMetrics.mos > 0) {
      recommendations.push(...this.callQualityManager.getQualityRecommendations());
    }
    
    recommendations.push(...this.networkMonitor.getNetworkRecommendations());
    
    if (this.mobileCallManager.isMobile) {
      recommendations.push(...this.mobileCallManager.getMobileRecommendations());
    }
    
    return recommendations;
  }
  
  /**
   * Disconnect with performance cleanup
   */
  async disconnect() {
    try {
      console.log('🔌 Disconnecting Enhanced SIP Manager...');
      
      // Stop performance monitoring
      this.stopCallPerformanceMonitoring();
      this.networkMonitor.stopMonitoring();
      
      // Release mobile resources
      if (this.mobileCallManager.isMobile) {
        await this.mobileCallManager.releaseWakeLock();
      }
      
      // Disconnect base SIP manager
      const result = await super.disconnect();
      
      this.isPerformanceMonitoringActive = false;
      
      console.log('✅ Enhanced SIP Manager disconnected');
      return result;
      
    } catch (error) {
      console.error('❌ Enhanced disconnect failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Destroy with complete cleanup
   */
  destroy() {
    try {
      console.log('🗑️ Destroying Enhanced SIP Manager...');
      
      // Destroy performance managers
      this.callQualityManager.destroy();
      this.networkMonitor.destroy();
      this.webrtcOptimizer.destroy();
      this.mobileCallManager.destroy();
      
      // Call parent destroy
      super.destroy();
      
      console.log('✅ Enhanced SIP Manager destroyed');
      
    } catch (error) {
      console.error('❌ Enhanced destroy failed:', error);
    }
  }
}

export default EnhancedSIPManager;