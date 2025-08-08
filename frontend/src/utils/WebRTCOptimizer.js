/**
 * WebRTCOptimizer - Advanced WebRTC connection optimization and management
 * Features: ICE optimization, codec selection, connection recovery, firewall traversal
 * Optimizes WebRTC peer connections for maximum reliability and performance
 */

class WebRTCOptimizer {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.connectionState = 'new';
    this.iceConnectionState = 'new';
    this.signalingState = 'stable';
    
    // Configuration options
    this.config = {
      iceServers: this.getOptimalICEServers(),
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all'
    };
    
    // Connection optimization settings
    this.optimization = {
      enableTrickleICE: true,
      enableBandwidthProbing: true,
      enableEchoCancellation: true,
      enableNoiseSuppression: true,
      enableAutoGainControl: true,
      preferredCodecs: ['opus', 'G722', 'PCMU', 'PCMA'],
      maxBitrate: 320, // kbps
      minBitrate: 64   // kbps
    };
    
    // Statistics and monitoring
    this.statistics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      reconnectionAttempts: 0,
      averageConnectionTime: 0,
      lastConnectionQuality: null
    };
    
    this.listeners = new Map();
    this.connectionTimeouts = new Map();
    this.reconnectionTimer = null;
    
    this.bindMethods();
  }
  
  bindMethods() {
    this.onIceCandidate = this.onIceCandidate.bind(this);
    this.onConnectionStateChange = this.onConnectionStateChange.bind(this);
    this.onIceConnectionStateChange = this.onIceConnectionStateChange.bind(this);
    this.onSignalingStateChange = this.onSignalingStateChange.bind(this);
    this.onTrack = this.onTrack.bind(this);
    this.onDataChannel = this.onDataChannel.bind(this);
  }
  
  /**
   * Get optimal ICE servers configuration
   */
  getOptimalICEServers() {
    return [
      // Public STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // Alternative STUN servers for redundancy
      { urls: 'stun:stun.services.mozilla.com:3478' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      
      // TURN servers would be added here for production
      // {
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'your-username',
      //   credential: 'your-password'
      // }
    ];
  }
  
  /**
   * Create optimized peer connection
   */
  async createPeerConnection(customConfig = {}) {
    try {
      this.statistics.connectionAttempts++;
      const startTime = performance.now();
      
      // Merge custom config with default config
      const finalConfig = {
        ...this.config,
        ...customConfig
      };
      
      console.log('🔧 Creating optimized peer connection...');
      this.peerConnection = new RTCPeerConnection(finalConfig);
      
      // Setup event listeners
      this.setupPeerConnectionEventListeners();
      
      // Configure optimal media constraints
      this.setupOptimalMediaConstraints();
      
      const connectionTime = performance.now() - startTime;
      this.updateAverageConnectionTime(connectionTime);
      
      console.log('✅ Peer connection created successfully');
      this.emit('peerConnectionCreated', {
        connectionTime,
        config: finalConfig,
        timestamp: Date.now()
      });
      
      return this.peerConnection;
      
    } catch (error) {
      this.statistics.failedConnections++;
      console.error('❌ Failed to create peer connection:', error);
      this.emit('peerConnectionError', {
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }
  
  /**
   * Setup peer connection event listeners
   */
  setupPeerConnectionEventListeners() {
    if (!this.peerConnection) return;
    
    this.peerConnection.onicecandidate = this.onIceCandidate;
    this.peerConnection.onconnectionstatechange = this.onConnectionStateChange;
    this.peerConnection.oniceconnectionstatechange = this.onIceConnectionStateChange;
    this.peerConnection.onsignalingstatechange = this.onSignalingStateChange;
    this.peerConnection.ontrack = this.onTrack;
    this.peerConnection.ondatachannel = this.onDataChannel;
    
    // Setup ICE gathering state change
    this.peerConnection.onicegatheringstatechange = () => {
      console.log(`🧊 ICE gathering state: ${this.peerConnection.iceGatheringState}`);
      this.emit('iceGatheringStateChange', {
        state: this.peerConnection.iceGatheringState,
        timestamp: Date.now()
      });
    };
  }
  
  /**
   * Handle ICE candidates with optimization
   */
  onIceCandidate(event) {
    if (event.candidate) {
      const candidate = event.candidate;
      
      // Optimize candidate selection
      const optimizedCandidate = this.optimizeICECandidate(candidate);
      
      console.log('🧊 ICE candidate:', optimizedCandidate.type, optimizedCandidate.protocol);
      
      this.emit('iceCandidate', {
        candidate: optimizedCandidate,
        timestamp: Date.now()
      });
    } else {
      console.log('🧊 ICE candidate gathering completed');
      this.emit('iceCandidateGatheringComplete', {
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Optimize ICE candidate selection
   */
  optimizeICECandidate(candidate) {
    // Prioritize certain candidate types for better performance
    const priorities = {
      'host': 10,      // Local network candidates (highest priority)
      'srflx': 8,      // Server reflexive (STUN)
      'prflx': 6,      // Peer reflexive
      'relay': 4       // Relay (TURN) - lowest priority but most reliable
    };
    
    return {
      ...candidate,
      priority: priorities[candidate.type] || 0,
      optimized: true
    };
  }
  
  /**
   * Handle connection state changes
   */
  onConnectionStateChange() {
    const newState = this.peerConnection.connectionState;
    const oldState = this.connectionState;
    this.connectionState = newState;
    
    console.log(`🔄 Connection state: ${oldState} → ${newState}`);
    
    switch (newState) {
      case 'connected':
        this.statistics.successfulConnections++;
        this.handleSuccessfulConnection();
        break;
        
      case 'disconnected':
        this.handleDisconnection();
        break;
        
      case 'failed':
        this.statistics.failedConnections++;
        this.handleConnectionFailure();
        break;
        
      case 'closed':
        this.handleConnectionClosed();
        break;
    }
    
    this.emit('connectionStateChange', {
      oldState,
      newState,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle ICE connection state changes
   */
  onIceConnectionStateChange() {
    const newState = this.peerConnection.iceConnectionState;
    const oldState = this.iceConnectionState;
    this.iceConnectionState = newState;
    
    console.log(`🧊 ICE connection state: ${oldState} → ${newState}`);
    
    switch (newState) {
      case 'checking':
        this.startConnectionTimeout();
        break;
        
      case 'connected':
      case 'completed':
        this.clearConnectionTimeout();
        break;
        
      case 'disconnected':
        this.scheduleReconnection();
        break;
        
      case 'failed':
        this.handleICEFailure();
        break;
    }
    
    this.emit('iceConnectionStateChange', {
      oldState,
      newState,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle signaling state changes
   */
  onSignalingStateChange() {
    const newState = this.peerConnection.signalingState;
    const oldState = this.signalingState;
    this.signalingState = newState;
    
    console.log(`📡 Signaling state: ${oldState} → ${newState}`);
    
    this.emit('signalingStateChange', {
      oldState,
      newState,
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle incoming media tracks
   */
  onTrack(event) {
    console.log('🎵 Received remote track:', event.track.kind);
    
    if (event.streams && event.streams[0]) {
      this.remoteStream = event.streams[0];
      
      this.emit('remoteStream', {
        stream: this.remoteStream,
        track: event.track,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Handle data channels
   */
  onDataChannel(event) {
    const dataChannel = event.channel;
    console.log('📡 Received data channel:', dataChannel.label);
    
    this.emit('dataChannel', {
      channel: dataChannel,
      timestamp: Date.now()
    });
  }
  
  /**
   * Add optimized local stream
   */
  async addOptimizedLocalStream(constraints = {}) {
    try {
      const optimizedConstraints = this.getOptimalMediaConstraints(constraints);
      
      console.log('🎤 Getting user media with optimized constraints...');
      this.localStream = await navigator.mediaDevices.getUserMedia(optimizedConstraints);
      
      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      // Apply codec optimization
      await this.optimizeAudioCodecs();
      
      console.log('✅ Local stream added with optimization');
      this.emit('localStreamAdded', {
        stream: this.localStream,
        constraints: optimizedConstraints,
        timestamp: Date.now()
      });
      
      return this.localStream;
      
    } catch (error) {
      console.error('❌ Failed to add optimized local stream:', error);
      this.emit('localStreamError', {
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }
  
  /**
   * Get optimal media constraints
   */
  getOptimalMediaConstraints(userConstraints = {}) {
    const defaultConstraints = {
      audio: {
        echoCancellation: this.optimization.enableEchoCancellation,
        noiseSuppression: this.optimization.enableNoiseSuppression,
        autoGainControl: this.optimization.enableAutoGainControl,
        sampleRate: 48000,
        sampleSize: 16,
        channelCount: 1, // Mono for better bandwidth usage
        latency: 0.02,   // 20ms latency
        volume: 1.0
      },
      video: false // Voice-only for cold calling
    };
    
    // Merge with user constraints
    return this.mergeConstraints(defaultConstraints, userConstraints);
  }
  
  /**
   * Merge constraints objects recursively
   */
  mergeConstraints(defaultConstraints, userConstraints) {
    const merged = { ...defaultConstraints };
    
    Object.keys(userConstraints).forEach(key => {
      if (typeof userConstraints[key] === 'object' && !Array.isArray(userConstraints[key])) {
        merged[key] = { ...merged[key], ...userConstraints[key] };
      } else {
        merged[key] = userConstraints[key];
      }
    });
    
    return merged;
  }
  
  /**
   * Optimize audio codecs
   */
  async optimizeAudioCodecs() {
    if (!this.peerConnection) return;
    
    try {
      const transceivers = this.peerConnection.getTransceivers();
      
      for (const transceiver of transceivers) {
        if (transceiver.sender && transceiver.sender.track && transceiver.sender.track.kind === 'audio') {
          const capabilities = RTCRtpSender.getCapabilities('audio');
          
          if (capabilities && capabilities.codecs) {
            const optimizedCodecs = this.selectOptimalCodecs(capabilities.codecs);
            
            // Set codec preferences
            transceiver.setCodecPreferences(optimizedCodecs);
            
            console.log('🎵 Audio codec preferences set:', optimizedCodecs.map(c => c.mimeType));
          }
        }
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to optimize audio codecs:', error);
    }
  }
  
  /**
   * Select optimal codecs based on preferences
   */
  selectOptimalCodecs(availableCodecs) {
    const preferredCodecs = this.optimization.preferredCodecs;
    const optimizedCodecs = [];
    
    // Add preferred codecs in order
    preferredCodecs.forEach(preferredCodec => {
      const matchingCodecs = availableCodecs.filter(codec =>
        codec.mimeType.toLowerCase().includes(preferredCodec.toLowerCase())
      );
      optimizedCodecs.push(...matchingCodecs);
    });
    
    // Add remaining codecs
    const remainingCodecs = availableCodecs.filter(codec =>
      !optimizedCodecs.some(oc => oc.mimeType === codec.mimeType)
    );
    optimizedCodecs.push(...remainingCodecs);
    
    return optimizedCodecs;
  }
  
  /**
   * Create optimized offer
   */
  async createOptimizedOffer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    
    try {
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
        voiceActivityDetection: true
      };
      
      console.log('📝 Creating optimized offer...');
      const offer = await this.peerConnection.createOffer(offerOptions);
      
      // Optimize SDP
      const optimizedOffer = this.optimizeSDP(offer);
      
      await this.peerConnection.setLocalDescription(optimizedOffer);
      
      console.log('✅ Optimized offer created and set');
      this.emit('offerCreated', {
        offer: optimizedOffer,
        timestamp: Date.now()
      });
      
      return optimizedOffer;
      
    } catch (error) {
      console.error('❌ Failed to create optimized offer:', error);
      this.emit('offerError', {
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }
  
  /**
   * Create optimized answer
   */
  async createOptimizedAnswer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    
    try {
      const answerOptions = {
        voiceActivityDetection: true
      };
      
      console.log('📝 Creating optimized answer...');
      const answer = await this.peerConnection.createAnswer(answerOptions);
      
      // Optimize SDP
      const optimizedAnswer = this.optimizeSDP(answer);
      
      await this.peerConnection.setLocalDescription(optimizedAnswer);
      
      console.log('✅ Optimized answer created and set');
      this.emit('answerCreated', {
        answer: optimizedAnswer,
        timestamp: Date.now()
      });
      
      return optimizedAnswer;
      
    } catch (error) {
      console.error('❌ Failed to create optimized answer:', error);
      this.emit('answerError', {
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }
  
  /**
   * Optimize SDP for better performance
   */
  optimizeSDP(sessionDescription) {
    let sdp = sessionDescription.sdp;
    
    // Enable bandwidth optimization
    if (this.optimization.enableBandwidthProbing) {
      sdp = this.addBandwidthLimits(sdp);
    }
    
    // Optimize for low latency
    sdp = this.optimizeForLowLatency(sdp);
    
    // Enable specific audio features
    sdp = this.enableAudioFeatures(sdp);
    
    return {
      type: sessionDescription.type,
      sdp: sdp
    };
  }
  
  /**
   * Add bandwidth limits to SDP
   */
  addBandwidthLimits(sdp) {
    // Add bandwidth constraints
    const lines = sdp.split('\r\n');
    const optimizedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      optimizedLines.push(line);
      
      // Add bandwidth limit after media line
      if (line.startsWith('m=audio')) {
        optimizedLines.push(`b=CT:${this.optimization.maxBitrate}`);
        optimizedLines.push(`b=AS:${this.optimization.maxBitrate}`);
      }
    }
    
    return optimizedLines.join('\r\n');
  }
  
  /**
   * Optimize SDP for low latency
   */
  optimizeForLowLatency(sdp) {
    // Reduce jitter buffer and enable various optimizations
    return sdp
      .replace(/a=ptime:\d+/g, 'a=ptime:20') // 20ms packet time
      .replace(/a=maxptime:\d+/g, 'a=maxptime:20');
  }
  
  /**
   * Enable audio features in SDP
   */
  enableAudioFeatures(sdp) {
    // Add audio optimization attributes
    return sdp + '\r\na=rtcp-fb:* nack\r\na=rtcp-fb:* transport-cc';
  }
  
  /**
   * Handle successful connection
   */
  handleSuccessfulConnection() {
    console.log('✅ WebRTC connection established successfully');
    
    // Clear any reconnection timers
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
    
    // Start quality monitoring
    this.startQualityMonitoring();
    
    this.emit('connectionEstablished', {
      timestamp: Date.now(),
      statistics: { ...this.statistics }
    });
  }
  
  /**
   * Handle disconnection
   */
  handleDisconnection() {
    console.log('⚠️ WebRTC connection disconnected');
    
    this.emit('connectionDisconnected', {
      timestamp: Date.now()
    });
  }
  
  /**
   * Handle connection failure
   */
  handleConnectionFailure() {
    console.error('❌ WebRTC connection failed');
    
    this.emit('connectionFailed', {
      timestamp: Date.now(),
      statistics: { ...this.statistics }
    });
  }
  
  /**
   * Handle connection closed
   */
  handleConnectionClosed() {
    console.log('🔌 WebRTC connection closed');
    
    this.stopQualityMonitoring();
    
    this.emit('connectionClosed', {
      timestamp: Date.now()
    });
  }
  
  /**
   * Schedule reconnection attempt
   */
  scheduleReconnection() {
    if (this.reconnectionTimer) return;
    
    this.statistics.reconnectionAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.statistics.reconnectionAttempts), 30000);
    
    console.log(`🔄 Scheduling reconnection in ${delay}ms (attempt ${this.statistics.reconnectionAttempts})`);
    
    this.reconnectionTimer = setTimeout(() => {
      this.attemptReconnection();
    }, delay);
  }
  
  /**
   * Attempt to reconnect
   */
  async attemptReconnection() {
    try {
      console.log('🔄 Attempting to reconnect...');
      
      // Restart ICE
      if (this.peerConnection) {
        this.peerConnection.restartIce();
      }
      
      this.emit('reconnectionAttempt', {
        attempt: this.statistics.reconnectionAttempts,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      this.scheduleReconnection();
    }
  }
  
  /**
   * Handle ICE failure
   */
  handleICEFailure() {
    console.error('❌ ICE connection failed');
    
    // Try to recover by restarting ICE
    this.scheduleReconnection();
    
    this.emit('iceConnectionFailed', {
      timestamp: Date.now()
    });
  }
  
  /**
   * Start connection timeout
   */
  startConnectionTimeout() {
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Connection timeout');
      this.emit('connectionTimeout', {
        timestamp: Date.now()
      });
    }, 30000); // 30 second timeout
    
    this.connectionTimeouts.set('connection', timeoutId);
  }
  
  /**
   * Clear connection timeout
   */
  clearConnectionTimeout() {
    const timeoutId = this.connectionTimeouts.get('connection');
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.connectionTimeouts.delete('connection');
    }
  }
  
  /**
   * Start quality monitoring
   */
  startQualityMonitoring() {
    if (this.qualityMonitoringInterval) return;
    
    this.qualityMonitoringInterval = setInterval(async () => {
      try {
        const stats = await this.getConnectionStats();
        this.statistics.lastConnectionQuality = stats;
        
        this.emit('qualityUpdate', {
          stats,
          timestamp: Date.now()
        });
        
      } catch (error) {
        console.warn('⚠️ Quality monitoring error:', error);
      }
    }, 5000); // Every 5 seconds
  }
  
  /**
   * Stop quality monitoring
   */
  stopQualityMonitoring() {
    if (this.qualityMonitoringInterval) {
      clearInterval(this.qualityMonitoringInterval);
      this.qualityMonitoringInterval = null;
    }
  }
  
  /**
   * Get connection statistics
   */
  async getConnectionStats() {
    if (!this.peerConnection) return null;
    
    try {
      const stats = await this.peerConnection.getStats();
      return this.processConnectionStats(stats);
    } catch (error) {
      console.error('❌ Failed to get connection stats:', error);
      return null;
    }
  }
  
  /**
   * Process connection statistics
   */
  processConnectionStats(stats) {
    let audioStats = {};
    let connectionStats = {};
    
    stats.forEach((stat) => {
      if (stat.type === 'inbound-rtp' && stat.mediaType === 'audio') {
        audioStats.inbound = stat;
      } else if (stat.type === 'outbound-rtp' && stat.mediaType === 'audio') {
        audioStats.outbound = stat;
      } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        connectionStats = stat;
      }
    });
    
    return {
      audio: audioStats,
      connection: connectionStats,
      timestamp: Date.now()
    };
  }
  
  /**
   * Update average connection time
   */
  updateAverageConnectionTime(connectionTime) {
    const total = this.statistics.averageConnectionTime * (this.statistics.connectionAttempts - 1) + connectionTime;
    this.statistics.averageConnectionTime = Math.round(total / this.statistics.connectionAttempts);
  }
  
  /**
   * Get optimization statistics
   */
  getStatistics() {
    return { ...this.statistics };
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connectionState: this.connectionState,
      iceConnectionState: this.iceConnectionState,
      signalingState: this.signalingState,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream,
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
   * Cleanup and destroy
   */
  destroy() {
    console.log('🗑️ Destroying WebRTC optimizer...');
    
    // Stop monitoring
    this.stopQualityMonitoring();
    
    // Clear timers
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
    }
    
    this.connectionTimeouts.forEach(timer => clearTimeout(timer));
    this.connectionTimeouts.clear();
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.remoteStream = null;
    this.listeners.clear();
    
    console.log('🗑️ WebRTC optimizer destroyed');
  }
}

export default WebRTCOptimizer;