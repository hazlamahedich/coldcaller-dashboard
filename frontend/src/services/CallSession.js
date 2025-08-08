import { SessionState } from 'sip.js';

// CallSession - Individual call session management
// Handles call lifecycle, media monitoring, call quality metrics, and state persistence
// Integrates with SIPManager for low-level SIP operations

class CallSession {
  constructor(sessionId, sipManager, options = {}) {
    this.sessionId = sessionId;
    this.sipManager = sipManager;
    
    // Call metadata
    this.phoneNumber = options.phoneNumber || null;
    this.displayName = options.displayName || null;
    this.direction = options.direction || 'outbound'; // outbound, inbound
    this.leadId = options.leadId || null;
    
    // Timestamps
    this.createdAt = new Date();
    this.startedAt = null;
    this.connectedAt = null;
    this.endedAt = null;
    
    // Call state
    this.state = 'initializing'; // initializing, ringing, connecting, connected, held, ending, ended, failed
    this.previousState = null;
    this.sipState = null;
    
    // Call quality metrics
    this.qualityMetrics = {
      audioLevel: 0,
      signalStrength: 0,
      packetLoss: 0,
      jitter: 0,
      roundTripTime: 0,
      qualityScore: 0, // 1-5 scale
      connectionType: 'unknown'
    };
    
    // Media state
    this.mediaState = {
      localAudio: false,
      remoteAudio: false,
      isOnHold: false,
      isMuted: false,
      volume: 1.0,
      audioDevices: {
        microphone: null,
        speaker: null
      }
    };
    
    // Call events log
    this.events = [];
    
    // Timers and intervals
    this.qualityMonitorInterval = null;
    this.callTimerInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    
    // Event listeners
    this.listeners = new Map();
    
    this.bindMethods();
    this.initializeSession();
  }
  
  // Bind methods to maintain context
  bindMethods() {
    this.handleSIPStateChange = this.handleSIPStateChange.bind(this);
    this.handleMediaUpdate = this.handleMediaUpdate.bind(this);
    this.handleQualityUpdate = this.handleQualityUpdate.bind(this);
    this.updateCallTimer = this.updateCallTimer.bind(this);
  }
  
  // Initialize session
  initializeSession() {
    this.logEvent('session_created', { 
      sessionId: this.sessionId,
      direction: this.direction,
      phoneNumber: this.phoneNumber
    });
    
    // Set up SIP event listeners
    if (this.sipManager) {
      this.sipManager.on('sessionStateChange', this.handleSIPStateChange);
      this.sipManager.on('callEstablished', this.handleCallEstablished.bind(this));
      this.sipManager.on('callTerminated', this.handleCallTerminated.bind(this));
      this.sipManager.on('remoteStreamReceived', this.handleRemoteStream.bind(this));
      this.sipManager.on('iceConnectionStateChange', this.handleICEStateChange.bind(this));
    }
    
    this.setState('initialized');
  }
  
  // Start outbound call
  async startCall(phoneNumber, options = {}) {
    try {
      this.phoneNumber = phoneNumber;
      this.setState('calling');
      this.startedAt = new Date();
      
      this.logEvent('call_initiated', { 
        phoneNumber,
        timestamp: this.startedAt.toISOString(),
        options 
      });
      
      // Use SIPManager to make the call
      const result = await this.sipManager.makeCall(phoneNumber, options);
      
      if (result.success) {
        this.setState('ringing');
        this.startCallTimer();
        this.emit('callStarted', { 
          sessionId: this.sessionId, 
          phoneNumber,
          timestamp: this.startedAt.toISOString()
        });
        
        return { success: true, sessionId: this.sessionId };
      } else {
        throw new Error(result.error || 'Failed to initiate call');
      }
      
    } catch (error) {
      this.setState('failed');
      this.logEvent('call_failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.emit('callFailed', { 
        sessionId: this.sessionId,
        error: error.message,
        phoneNumber 
      });
      
      throw error;
    }
  }
  
  // Answer inbound call
  async answerCall() {
    try {
      this.setState('connecting');
      
      const result = await this.sipManager.answerCall();
      
      if (result.success) {
        this.logEvent('call_answered', { 
          timestamp: new Date().toISOString()
        });
        
        this.emit('callAnswered', { 
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        });
        
        return { success: true };
      } else {
        throw new Error('Failed to answer call');
      }
      
    } catch (error) {
      this.setState('failed');
      this.logEvent('answer_failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // Reject inbound call
  async rejectCall(reason = 'declined') {
    try {
      const result = await this.sipManager.rejectCall();
      
      if (result.success) {
        this.setState('rejected');
        this.endedAt = new Date();
        
        this.logEvent('call_rejected', { 
          reason,
          timestamp: this.endedAt.toISOString()
        });
        
        this.emit('callRejected', { 
          sessionId: this.sessionId,
          reason,
          timestamp: this.endedAt.toISOString()
        });
        
        this.cleanup();
        return { success: true };
      } else {
        throw new Error('Failed to reject call');
      }
      
    } catch (error) {
      this.setState('failed');
      this.logEvent('reject_failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // End active call
  async endCall(reason = 'hangup') {
    try {
      this.setState('ending');
      
      const result = await this.sipManager.endCall();
      
      if (result.success) {
        this.endedAt = new Date();
        
        this.logEvent('call_ended', { 
          reason,
          duration: this.getDuration(),
          timestamp: this.endedAt.toISOString()
        });
        
        this.emit('callEnded', { 
          sessionId: this.sessionId,
          reason,
          duration: this.getDuration(),
          qualityMetrics: this.getQualityReport(),
          timestamp: this.endedAt.toISOString()
        });
        
        this.setState('ended');
        this.cleanup();
        return { success: true, duration: this.getDuration() };
      } else {
        throw new Error('Failed to end call');
      }
      
    } catch (error) {
      this.setState('failed');
      this.logEvent('end_failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // Hold call
  async holdCall() {
    try {
      const result = await this.sipManager.holdCall();
      
      if (result.success) {
        this.mediaState.isOnHold = true;
        this.setState('held');
        
        this.logEvent('call_held', { 
          timestamp: new Date().toISOString()
        });
        
        this.emit('callHeld', { 
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        });
        
        return { success: true };
      } else {
        throw new Error('Failed to hold call');
      }
      
    } catch (error) {
      this.logEvent('hold_failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // Unhold call
  async unholdCall() {
    try {
      const result = await this.sipManager.unholdCall();
      
      if (result.success) {
        this.mediaState.isOnHold = false;
        this.setState('connected');
        
        this.logEvent('call_unheld', { 
          timestamp: new Date().toISOString()
        });
        
        this.emit('callUnheld', { 
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        });
        
        return { success: true };
      } else {
        throw new Error('Failed to unhold call');
      }
      
    } catch (error) {
      this.logEvent('unhold_failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // Send DTMF tone
  async sendDTMF(tone) {
    try {
      const result = await this.sipManager.sendDTMF(tone);
      
      if (result.success) {
        this.logEvent('dtmf_sent', { 
          tone,
          timestamp: new Date().toISOString()
        });
        
        this.emit('dtmfSent', { 
          sessionId: this.sessionId,
          tone,
          timestamp: new Date().toISOString()
        });
        
        return { success: true };
      } else {
        throw new Error(`Failed to send DTMF: ${tone}`);
      }
      
    } catch (error) {
      this.logEvent('dtmf_failed', { 
        tone,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // Mute/unmute microphone
  async setMute(muted) {
    try {
      // Get local stream and mute audio tracks
      const stream = this.sipManager.localStream;
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = !muted;
        });
        
        this.mediaState.isMuted = muted;
        
        this.logEvent('mute_changed', { 
          muted,
          timestamp: new Date().toISOString()
        });
        
        this.emit('muteChanged', { 
          sessionId: this.sessionId,
          muted,
          timestamp: new Date().toISOString()
        });
        
        return { success: true };
      } else {
        throw new Error('No local media stream available');
      }
      
    } catch (error) {
      this.logEvent('mute_failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // Set call volume
  setVolume(level) {
    try {
      this.mediaState.volume = Math.max(0, Math.min(1, level));
      
      // Apply to remote audio element if available
      if (this.sipManager.remoteAudio) {
        this.sipManager.remoteAudio.volume = this.mediaState.volume;
      }
      
      this.logEvent('volume_changed', { 
        level: this.mediaState.volume,
        timestamp: new Date().toISOString()
      });
      
      this.emit('volumeChanged', { 
        sessionId: this.sessionId,
        level: this.mediaState.volume,
        timestamp: new Date().toISOString()
      });
      
      return { success: true };
      
    } catch (error) {
      this.logEvent('volume_failed', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  // Handle SIP state changes
  handleSIPStateChange(data) {
    this.sipState = data.state;
    
    switch (data.state) {
      case SessionState.Establishing:
        if (this.state !== 'connecting') {
          this.setState('connecting');
        }
        break;
        
      case SessionState.Established:
        if (this.state !== 'connected') {
          this.connectedAt = new Date();
          this.setState('connected');
          this.startQualityMonitoring();
        }
        break;
        
      case SessionState.Terminated:
        if (!this.endedAt) {
          this.endedAt = new Date();
        }
        this.setState('ended');
        this.cleanup();
        break;
    }
  }
  
  // Handle call established
  handleCallEstablished(data) {
    this.connectedAt = new Date();
    this.setState('connected');
    this.startQualityMonitoring();
    
    this.logEvent('call_established', { 
      timestamp: this.connectedAt.toISOString()
    });
  }
  
  // Handle call terminated
  handleCallTerminated(data) {
    if (!this.endedAt) {
      this.endedAt = new Date();
    }
    
    this.setState('ended');
    this.cleanup();
    
    this.logEvent('call_terminated', { 
      duration: data.duration,
      timestamp: this.endedAt.toISOString()
    });
  }
  
  // Handle remote stream
  handleRemoteStream(data) {
    this.mediaState.remoteAudio = true;
    
    this.logEvent('remote_stream_received', { 
      audioTracks: data.audioTracks,
      videoTracks: data.videoTracks,
      timestamp: new Date().toISOString()
    });
    
    this.emit('mediaUpdate', { 
      sessionId: this.sessionId,
      mediaState: this.mediaState 
    });
  }
  
  // Handle ICE connection state changes
  handleICEStateChange(data) {
    this.qualityMetrics.connectionType = data.state;
    
    this.logEvent('ice_state_change', { 
      state: data.state,
      timestamp: new Date().toISOString()
    });
    
    // Update connection quality based on ICE state
    switch (data.state) {
      case 'connected':
        this.qualityMetrics.qualityScore = Math.max(3, this.qualityMetrics.qualityScore);
        break;
      case 'disconnected':
      case 'failed':
        this.qualityMetrics.qualityScore = Math.min(2, this.qualityMetrics.qualityScore);
        this.attemptReconnection();
        break;
    }
  }
  
  // Start quality monitoring
  startQualityMonitoring() {
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
    }
    
    this.qualityMonitorInterval = setInterval(() => {
      this.updateQualityMetrics();
    }, 2000); // Update every 2 seconds
  }
  
  // Update quality metrics
  async updateQualityMetrics() {
    try {
      // Get WebRTC statistics
      const stats = await this.getWebRTCStats();
      
      if (stats) {
        this.qualityMetrics = {
          ...this.qualityMetrics,
          ...stats
        };
        
        // Calculate overall quality score (1-5)
        this.qualityMetrics.qualityScore = this.calculateQualityScore(stats);
        
        this.emit('qualityUpdate', { 
          sessionId: this.sessionId,
          metrics: this.qualityMetrics 
        });
      }
      
    } catch (error) {
      console.warn('Failed to update quality metrics:', error);
    }
  }
  
  // Get WebRTC statistics
  async getWebRTCStats() {
    if (!this.sipManager.currentSession?.sessionDescriptionHandler?.peerConnection) {
      return null;
    }
    
    const pc = this.sipManager.currentSession.sessionDescriptionHandler.peerConnection;
    const stats = await pc.getStats();
    
    let audioStats = {
      packetLoss: 0,
      jitter: 0,
      roundTripTime: 0,
      audioLevel: 0
    };
    
    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
        audioStats.packetLoss = report.packetsLost || 0;
        audioStats.jitter = report.jitter || 0;
        audioStats.audioLevel = report.audioLevel || 0;
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        audioStats.roundTripTime = report.currentRoundTripTime || 0;
      }
    });
    
    return audioStats;
  }
  
  // Calculate quality score (1-5 scale)
  calculateQualityScore(stats) {
    let score = 5;
    
    // Packet loss penalty
    if (stats.packetLoss > 5) score -= 2;
    else if (stats.packetLoss > 1) score -= 1;
    
    // Jitter penalty  
    if (stats.jitter > 0.1) score -= 1;
    else if (stats.jitter > 0.05) score -= 0.5;
    
    // RTT penalty
    if (stats.roundTripTime > 0.3) score -= 1;
    else if (stats.roundTripTime > 0.15) score -= 0.5;
    
    // Audio level check
    if (stats.audioLevel < 0.1) score -= 0.5;
    
    return Math.max(1, Math.min(5, Math.round(score * 2) / 2));
  }
  
  // Attempt reconnection
  async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logEvent('reconnection_failed', { 
        attempts: this.reconnectAttempts,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    this.reconnectAttempts++;
    
    this.logEvent('reconnection_attempt', { 
      attempt: this.reconnectAttempts,
      timestamp: new Date().toISOString()
    });
    
    // Implement reconnection logic here
    // This would depend on the specific SIP provider and requirements
  }
  
  // Start call timer
  startCallTimer() {
    if (this.callTimerInterval) {
      clearInterval(this.callTimerInterval);
    }
    
    this.callTimerInterval = setInterval(this.updateCallTimer, 1000);
  }
  
  // Update call timer
  updateCallTimer() {
    const duration = this.getDuration();
    
    this.emit('timerUpdate', { 
      sessionId: this.sessionId,
      duration,
      formattedDuration: this.formatDuration(duration)
    });
  }
  
  // Set session state
  setState(newState) {
    if (this.state !== newState) {
      this.previousState = this.state;
      this.state = newState;
      
      this.logEvent('state_change', { 
        from: this.previousState,
        to: newState,
        timestamp: new Date().toISOString()
      });
      
      this.emit('stateChanged', { 
        sessionId: this.sessionId,
        previousState: this.previousState,
        currentState: newState,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Log session event
  logEvent(type, data) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      ...data
    };
    
    this.events.push(event);
    console.log(`📝 Call Event [${this.sessionId}]:`, type, data);
  }
  
  // Get call duration in seconds
  getDuration() {
    if (!this.connectedAt) return 0;
    
    const endTime = this.endedAt || new Date();
    return Math.floor((endTime - this.connectedAt) / 1000);
  }
  
  // Format duration as MM:SS
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Get session summary
  getSummary() {
    return {
      sessionId: this.sessionId,
      phoneNumber: this.phoneNumber,
      displayName: this.displayName,
      direction: this.direction,
      leadId: this.leadId,
      state: this.state,
      sipState: this.sipState,
      
      // Timestamps
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      connectedAt: this.connectedAt,
      endedAt: this.endedAt,
      duration: this.getDuration(),
      formattedDuration: this.formatDuration(this.getDuration()),
      
      // Quality metrics
      qualityMetrics: { ...this.qualityMetrics },
      qualityScore: this.qualityMetrics.qualityScore,
      
      // Media state
      mediaState: { ...this.mediaState },
      
      // Statistics
      eventCount: this.events.length,
      reconnectAttempts: this.reconnectAttempts,
      
      // Call outcome
      isSuccessful: this.state === 'ended' && this.connectedAt !== null,
      failureReason: this.state === 'failed' ? this.events.find(e => e.type.includes('failed'))?.error : null
    };
  }
  
  // Get quality report
  getQualityReport() {
    return {
      qualityScore: this.qualityMetrics.qualityScore,
      connectionType: this.qualityMetrics.connectionType,
      averagePacketLoss: this.qualityMetrics.packetLoss,
      averageJitter: this.qualityMetrics.jitter,
      averageRTT: this.qualityMetrics.roundTripTime,
      audioQuality: this.qualityMetrics.audioLevel,
      reconnectionAttempts: this.reconnectAttempts,
      callDuration: this.getDuration()
    };
  }
  
  // Cleanup resources
  cleanup() {
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
      this.qualityMonitorInterval = null;
    }
    
    if (this.callTimerInterval) {
      clearInterval(this.callTimerInterval);
      this.callTimerInterval = null;
    }
    
    // Remove SIP event listeners
    if (this.sipManager) {
      this.sipManager.off('sessionStateChange', this.handleSIPStateChange);
    }
  }
  
  // Event system
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
  
  // Destroy session
  destroy() {
    this.cleanup();
    this.listeners.clear();
    
    this.logEvent('session_destroyed', { 
      timestamp: new Date().toISOString()
    });
  }
}

export default CallSession;