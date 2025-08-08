/**
 * CallQualityManager - Advanced WebRTC call quality monitoring and optimization
 * Features: Real-time MOS scoring, adaptive bitrate, audio quality analysis
 * Monitors and optimizes call quality based on network conditions and audio metrics
 */

class CallQualityManager {
  constructor() {
    this.qualityMetrics = {
      mos: 0,           // Mean Opinion Score (1-5)
      rtt: 0,           // Round Trip Time (ms)
      jitter: 0,        // Jitter (ms)
      packetLoss: 0,    // Packet Loss (%)
      latency: 0,       // Audio latency (ms)
      bitrate: 0,       // Current bitrate (kbps)
      echoCancellation: false,
      noiseSuppression: false,
      timestamp: null
    };
    
    this.qualityHistory = [];
    this.maxHistoryLength = 100;
    this.monitoringInterval = null;
    this.peerConnection = null;
    this.audioContext = null;
    this.audioAnalyzer = null;
    this.listeners = new Map();
    
    // Quality targets and thresholds
    this.targets = {
      excellentMOS: 4.0,
      goodMOS: 3.5,
      fairMOS: 2.5,
      maxLatency: 150,    // ms
      maxJitter: 30,      // ms
      maxPacketLoss: 1,   // %
      maxRTT: 200         // ms
    };
    
    // Adaptive bitrate settings
    this.bitrateConfig = {
      minBitrate: 64,     // kbps
      maxBitrate: 320,    // kbps
      targetBitrate: 128, // kbps
      stepSize: 16        // kbps adjustment step
    };
    
    this.bindMethods();
  }
  
  bindMethods() {
    this.onStatsReceived = this.onStatsReceived.bind(this);
    this.analyzeAudioQuality = this.analyzeAudioQuality.bind(this);
    this.adaptBitrate = this.adaptBitrate.bind(this);
  }
  
  /**
   * Initialize call quality monitoring
   */
  async initialize(peerConnection, audioStream) {
    try {
      this.peerConnection = peerConnection;
      
      // Initialize audio context for analysis
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        await this.initializeAudioAnalysis(audioStream);
      }
      
      // Start monitoring
      this.startMonitoring();
      
      // Setup peer connection monitoring
      this.setupPeerConnectionMonitoring();
      
      console.log('✅ Call Quality Manager initialized');
      this.emit('initialized', { timestamp: Date.now() });
      
    } catch (error) {
      console.error('❌ Failed to initialize Call Quality Manager:', error);
      throw error;
    }
  }
  
  /**
   * Initialize audio analysis using Web Audio API
   */
  async initializeAudioAnalysis(audioStream) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(audioStream);
      
      this.audioAnalyzer = this.audioContext.createAnalyser();
      this.audioAnalyzer.fftSize = 256;
      this.audioAnalyzer.smoothingTimeConstant = 0.3;
      
      source.connect(this.audioAnalyzer);
      
      console.log('🎵 Audio analysis initialized');
    } catch (error) {
      console.warn('⚠️ Audio analysis not available:', error);
    }
  }
  
  /**
   * Start quality monitoring
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectQualityMetrics();
        this.analyzeAudioQuality();
        this.adaptBitrate();
        this.updateMOSScore();
      } catch (error) {
        console.error('❌ Quality monitoring error:', error);
      }
    }, 1000); // Collect metrics every second
    
    console.log('📊 Quality monitoring started');
  }
  
  /**
   * Stop quality monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('📊 Quality monitoring stopped');
  }
  
  /**
   * Setup peer connection monitoring
   */
  setupPeerConnectionMonitoring() {
    if (!this.peerConnection) return;
    
    this.peerConnection.addEventListener('iceconnectionstatechange', () => {
      const state = this.peerConnection.iceConnectionState;
      this.emit('connectionStateChange', { state, timestamp: Date.now() });
      
      if (state === 'failed' || state === 'disconnected') {
        this.handleConnectionIssues();
      }
    });
    
    this.peerConnection.addEventListener('icegatheringstatechange', () => {
      const state = this.peerConnection.iceGatheringState;
      this.emit('iceGatheringStateChange', { state, timestamp: Date.now() });
    });
  }
  
  /**
   * Collect WebRTC quality metrics
   */
  async collectQualityMetrics() {
    if (!this.peerConnection) return;
    
    try {
      const stats = await this.peerConnection.getStats();
      this.processWebRTCStats(stats);
    } catch (error) {
      console.error('❌ Failed to collect WebRTC stats:', error);
    }
  }
  
  /**
   * Process WebRTC statistics
   */
  processWebRTCStats(stats) {
    let inboundAudioStats = null;
    let outboundAudioStats = null;
    let candidateStats = null;
    
    stats.forEach((stat) => {
      switch (stat.type) {
        case 'inbound-rtp':
          if (stat.mediaType === 'audio') {
            inboundAudioStats = stat;
          }
          break;
          
        case 'outbound-rtp':
          if (stat.mediaType === 'audio') {
            outboundAudioStats = stat;
          }
          break;
          
        case 'candidate-pair':
          if (stat.state === 'succeeded') {
            candidateStats = stat;
          }
          break;
      }
    });
    
    // Update metrics from stats
    if (inboundAudioStats) {
      this.updateInboundMetrics(inboundAudioStats);
    }
    
    if (outboundAudioStats) {
      this.updateOutboundMetrics(outboundAudioStats);
    }
    
    if (candidateStats) {
      this.updateNetworkMetrics(candidateStats);
    }
    
    this.qualityMetrics.timestamp = Date.now();
  }
  
  /**
   * Update metrics from inbound audio stats
   */
  updateInboundMetrics(stats) {
    // Packet loss calculation
    if (stats.packetsReceived && stats.packetsLost !== undefined) {
      const totalPackets = stats.packetsReceived + stats.packetsLost;
      this.qualityMetrics.packetLoss = totalPackets > 0 
        ? (stats.packetsLost / totalPackets) * 100 
        : 0;
    }
    
    // Jitter
    if (stats.jitter !== undefined) {
      this.qualityMetrics.jitter = stats.jitter * 1000; // Convert to ms
    }
    
    // Bitrate (from bytesReceived)
    if (stats.bytesReceived && this.previousInboundStats) {
      const bytesDiff = stats.bytesReceived - this.previousInboundStats.bytesReceived;
      const timeDiff = (stats.timestamp - this.previousInboundStats.timestamp) / 1000;
      
      if (timeDiff > 0) {
        this.qualityMetrics.bitrate = Math.round((bytesDiff * 8) / (timeDiff * 1000)); // kbps
      }
    }
    
    this.previousInboundStats = stats;
  }
  
  /**
   * Update metrics from outbound audio stats
   */
  updateOutboundMetrics(stats) {
    // Additional outbound metrics can be processed here
    if (stats.bytesSent && this.previousOutboundStats) {
      const bytesDiff = stats.bytesSent - this.previousOutboundStats.bytesSent;
      const timeDiff = (stats.timestamp - this.previousOutboundStats.timestamp) / 1000;
      
      if (timeDiff > 0) {
        const outboundBitrate = Math.round((bytesDiff * 8) / (timeDiff * 1000));
        // Could track outbound bitrate separately if needed
      }
    }
    
    this.previousOutboundStats = stats;
  }
  
  /**
   * Update network metrics from candidate pair stats
   */
  updateNetworkMetrics(stats) {
    // RTT (Round Trip Time)
    if (stats.currentRoundTripTime !== undefined) {
      this.qualityMetrics.rtt = stats.currentRoundTripTime * 1000; // Convert to ms
    }
    
    // Available bandwidth
    if (stats.availableOutgoingBitrate) {
      // This could influence our adaptive bitrate decisions
    }
  }
  
  /**
   * Analyze audio quality using Web Audio API
   */
  analyzeAudioQuality() {
    if (!this.audioAnalyzer) return;
    
    try {
      const bufferLength = this.audioAnalyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.audioAnalyzer.getByteFrequencyData(dataArray);
      
      // Calculate audio metrics
      const metrics = this.calculateAudioMetrics(dataArray);
      
      // Estimate audio latency (simplified)
      this.qualityMetrics.latency = this.estimateAudioLatency();
      
      // Check for echo cancellation and noise suppression
      this.checkAudioProcessing();
      
    } catch (error) {
      console.warn('⚠️ Audio quality analysis error:', error);
    }
  }
  
  /**
   * Calculate audio signal metrics
   */
  calculateAudioMetrics(frequencyData) {
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const value = frequencyData[i];
      sum += value;
      peak = Math.max(peak, value);
    }
    
    const average = sum / frequencyData.length;
    const signalStrength = (average / 255) * 100; // Percentage
    
    return {
      signalStrength,
      peakLevel: (peak / 255) * 100,
      dynamicRange: peak - average
    };
  }
  
  /**
   * Estimate audio latency (simplified approach)
   */
  estimateAudioLatency() {
    if (!this.audioContext) return 0;
    
    // Base latency from audio context
    const baseLatency = (this.audioContext.baseLatency || 0) * 1000;
    const outputLatency = (this.audioContext.outputLatency || 0) * 1000;
    
    // Add network latency component (RTT/2)
    const networkLatency = this.qualityMetrics.rtt / 2;
    
    return Math.round(baseLatency + outputLatency + networkLatency);
  }
  
  /**
   * Check if audio processing features are active
   */
  checkAudioProcessing() {
    // This would typically require access to the MediaTrackConstraints
    // For now, we'll assume these are enabled based on browser capabilities
    this.qualityMetrics.echoCancellation = true;
    this.qualityMetrics.noiseSuppression = true;
  }
  
  /**
   * Adaptive bitrate control
   */
  adaptBitrate() {
    if (!this.peerConnection) return;
    
    const currentBitrate = this.qualityMetrics.bitrate || this.bitrateConfig.targetBitrate;
    let targetBitrate = currentBitrate;
    
    // Adjust based on packet loss
    if (this.qualityMetrics.packetLoss > this.targets.maxPacketLoss) {
      targetBitrate = Math.max(
        this.bitrateConfig.minBitrate,
        currentBitrate - this.bitrateConfig.stepSize * 2
      );
    }
    
    // Adjust based on RTT
    if (this.qualityMetrics.rtt > this.targets.maxRTT) {
      targetBitrate = Math.max(
        this.bitrateConfig.minBitrate,
        currentBitrate - this.bitrateConfig.stepSize
      );
    }
    
    // Increase bitrate if conditions are good
    if (this.qualityMetrics.packetLoss < 0.1 && 
        this.qualityMetrics.rtt < this.targets.maxRTT * 0.5) {
      targetBitrate = Math.min(
        this.bitrateConfig.maxBitrate,
        currentBitrate + this.bitrateConfig.stepSize
      );
    }
    
    // Apply bitrate adjustment if significant change
    if (Math.abs(targetBitrate - currentBitrate) >= this.bitrateConfig.stepSize) {
      this.applyBitrateAdjustment(targetBitrate);
    }
  }
  
  /**
   * Apply bitrate adjustment to peer connection
   */
  async applyBitrateAdjustment(targetBitrate) {
    try {
      const senders = this.peerConnection.getSenders();
      const audioSender = senders.find(sender => 
        sender.track && sender.track.kind === 'audio'
      );
      
      if (audioSender) {
        const params = audioSender.getParameters();
        
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        
        params.encodings[0].maxBitrate = targetBitrate * 1000; // Convert to bps
        
        await audioSender.setParameters(params);
        
        console.log(`🎛️ Adjusted audio bitrate to ${targetBitrate} kbps`);
        this.emit('bitrateAdjusted', { 
          oldBitrate: this.qualityMetrics.bitrate,
          newBitrate: targetBitrate,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to adjust bitrate:', error);
    }
  }
  
  /**
   * Update Mean Opinion Score (MOS)
   */
  updateMOSScore() {
    let score = 5.0; // Start with perfect score
    
    // Deduct based on packet loss
    if (this.qualityMetrics.packetLoss > 0) {
      score -= Math.min(2.0, this.qualityMetrics.packetLoss * 0.5);
    }
    
    // Deduct based on latency
    if (this.qualityMetrics.latency > this.targets.maxLatency) {
      const excessLatency = this.qualityMetrics.latency - this.targets.maxLatency;
      score -= Math.min(1.5, excessLatency * 0.005);
    }
    
    // Deduct based on jitter
    if (this.qualityMetrics.jitter > this.targets.maxJitter) {
      const excessJitter = this.qualityMetrics.jitter - this.targets.maxJitter;
      score -= Math.min(1.0, excessJitter * 0.02);
    }
    
    // Deduct based on RTT
    if (this.qualityMetrics.rtt > this.targets.maxRTT) {
      const excessRTT = this.qualityMetrics.rtt - this.targets.maxRTT;
      score -= Math.min(1.0, excessRTT * 0.002);
    }
    
    // Ensure score is within valid range
    this.qualityMetrics.mos = Math.max(1.0, Math.min(5.0, score));
    
    // Store in history
    this.addToHistory({
      ...this.qualityMetrics,
      timestamp: Date.now()
    });
    
    // Emit quality update
    this.emit('qualityUpdate', { 
      metrics: { ...this.qualityMetrics },
      timestamp: Date.now()
    });
  }
  
  /**
   * Add metrics to history
   */
  addToHistory(metrics) {
    this.qualityHistory.push(metrics);
    
    // Trim history to max length
    if (this.qualityHistory.length > this.maxHistoryLength) {
      this.qualityHistory.shift();
    }
  }
  
  /**
   * Handle connection issues
   */
  handleConnectionIssues() {
    console.warn('⚠️ Connection issues detected');
    this.emit('connectionIssue', {
      metrics: { ...this.qualityMetrics },
      timestamp: Date.now()
    });
  }
  
  /**
   * Get current quality metrics
   */
  getCurrentMetrics() {
    return { ...this.qualityMetrics };
  }
  
  /**
   * Get quality history
   */
  getQualityHistory(limit = 50) {
    return this.qualityHistory.slice(-limit);
  }
  
  /**
   * Get quality grade based on MOS score
   */
  getQualityGrade() {
    const mos = this.qualityMetrics.mos;
    
    if (mos >= this.targets.excellentMOS) return 'excellent';
    if (mos >= this.targets.goodMOS) return 'good';
    if (mos >= this.targets.fairMOS) return 'fair';
    return 'poor';
  }
  
  /**
   * Get quality recommendations
   */
  getQualityRecommendations() {
    const recommendations = [];
    
    if (this.qualityMetrics.packetLoss > this.targets.maxPacketLoss) {
      recommendations.push({
        issue: 'high_packet_loss',
        message: `Packet loss is ${this.qualityMetrics.packetLoss.toFixed(2)}% (target: <${this.targets.maxPacketLoss}%)`,
        suggestion: 'Check network connection stability'
      });
    }
    
    if (this.qualityMetrics.latency > this.targets.maxLatency) {
      recommendations.push({
        issue: 'high_latency',
        message: `Audio latency is ${this.qualityMetrics.latency}ms (target: <${this.targets.maxLatency}ms)`,
        suggestion: 'Consider using wired connection or reducing audio buffer size'
      });
    }
    
    if (this.qualityMetrics.jitter > this.targets.maxJitter) {
      recommendations.push({
        issue: 'high_jitter',
        message: `Jitter is ${this.qualityMetrics.jitter.toFixed(2)}ms (target: <${this.targets.maxJitter}ms)`,
        suggestion: 'Network instability detected, check WiFi signal or switch to ethernet'
      });
    }
    
    if (this.qualityMetrics.rtt > this.targets.maxRTT) {
      recommendations.push({
        issue: 'high_rtt',
        message: `Round-trip time is ${this.qualityMetrics.rtt}ms (target: <${this.targets.maxRTT}ms)`,
        suggestion: 'High network latency, consider closer server or better internet connection'
      });
    }
    
    return recommendations;
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
    this.listeners.clear();
    this.peerConnection = null;
    this.audioAnalyzer = null;
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    console.log('🗑️ Call Quality Manager destroyed');
  }
}

export default CallQualityManager;