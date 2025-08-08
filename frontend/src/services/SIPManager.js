/**
 * SIPManager - WebRTC SIP Client for VOIP functionality
 * Handles SIP registration, call management, and real-time communication
 * Note: This is a foundation for real SIP integration - requires SIP server configuration
 */

class SIPManager {
  constructor() {
    this.sipUser = null;
    this.currentCall = null;
    this.isRegistered = false;
    this.registrationRetries = 0;
    this.maxRetries = 3;
    this.eventCallbacks = {};
    
    // WebRTC configuration
    this.pcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    // SIP configuration (to be configured by application)
    this.sipConfig = {
      uri: null,
      password: null,
      wsServers: null,
      registrar: null,
      authUser: null,
      displayName: null
    };

    // Audio elements for call handling
    this.remoteAudio = null;
    this.localStream = null;
    
    this.initializeAudioElements();
  }

  /**
   * Initialize audio elements for call handling
   */
  initializeAudioElements() {
    // Create remote audio element
    this.remoteAudio = document.createElement('audio');
    this.remoteAudio.autoplay = true;
    this.remoteAudio.controls = false;
    this.remoteAudio.style.display = 'none';
    document.body.appendChild(this.remoteAudio);
  }

  /**
   * Configure SIP settings
   * @param {Object} config - SIP configuration object
   */
  configure(config) {
    this.sipConfig = {
      ...this.sipConfig,
      ...config
    };
  }

  /**
   * Register event callback
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }

  /**
   * Remove event callback
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to registered callbacks
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => callback(data));
    }
  }

  /**
   * Initialize SIP connection and register
   * @returns {Promise<boolean>} Registration success
   */
  async register() {
    try {
      // For now, simulate successful registration
      // In a real implementation, this would use a SIP library like JsSIP
      console.log('🔌 Initializing SIP registration...');
      
      if (!this.sipConfig.uri || !this.sipConfig.wsServers) {
        throw new Error('SIP configuration incomplete');
      }

      // Simulate registration delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.isRegistered = true;
      this.registrationRetries = 0;
      
      this.emit('registered', {
        uri: this.sipConfig.uri,
        displayName: this.sipConfig.displayName
      });
      
      console.log('✅ SIP registration successful');
      return true;
      
    } catch (error) {
      console.error('❌ SIP registration failed:', error);
      this.isRegistered = false;
      
      this.emit('registrationFailed', {
        error: error.message,
        retries: this.registrationRetries
      });

      // Auto-retry registration
      if (this.registrationRetries < this.maxRetries) {
        this.registrationRetries++;
        console.log(`🔄 Retrying registration (${this.registrationRetries}/${this.maxRetries})...`);
        setTimeout(() => this.register(), 5000);
      }
      
      return false;
    }
  }

  /**
   * Unregister from SIP server
   */
  async unregister() {
    try {
      if (this.currentCall) {
        await this.hangup();
      }

      this.isRegistered = false;
      this.emit('unregistered');
      console.log('📴 SIP unregistration successful');
      
    } catch (error) {
      console.error('❌ SIP unregistration failed:', error);
    }
  }

  /**
   * Make outgoing call
   * @param {string} number - Phone number to call
   * @param {Object} options - Call options
   * @returns {Promise<Object>} Call session
   */
  async makeCall(number, options = {}) {
    try {
      if (!this.isRegistered) {
        throw new Error('Not registered to SIP server');
      }

      if (this.currentCall) {
        throw new Error('Call already in progress');
      }

      console.log(`📞 Making call to ${number}...`);

      // Get user media for the call
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      // Create call session object
      const callSession = {
        id: `call-${Date.now()}`,
        number: number,
        direction: 'outgoing',
        state: 'connecting',
        startTime: new Date(),
        localStream: this.localStream,
        remoteStream: null
      };

      this.currentCall = callSession;

      // Simulate call progression
      this.emit('callProgress', { callSession, state: 'connecting' });
      
      // Simulate ringing
      setTimeout(() => {
        if (this.currentCall?.id === callSession.id) {
          callSession.state = 'ringing';
          this.emit('callProgress', { callSession, state: 'ringing' });
        }
      }, 1000);

      // Simulate call establishment (or failure)
      setTimeout(() => {
        if (this.currentCall?.id === callSession.id) {
          // 80% success rate for demo
          if (Math.random() > 0.2) {
            callSession.state = 'connected';
            callSession.answerTime = new Date();
            this.emit('callConnected', { callSession });
          } else {
            this.handleCallEnded(callSession, 'failed');
          }
        }
      }, 3000 + Math.random() * 2000);

      return callSession;

    } catch (error) {
      console.error('❌ Failed to make call:', error);
      this.emit('callFailed', { error: error.message, number });
      throw error;
    }
  }

  /**
   * Answer incoming call
   * @param {Object} callSession - Call session to answer
   * @returns {Promise<boolean>} Success status
   */
  async answerCall(callSession) {
    try {
      if (!callSession || callSession.state !== 'ringing') {
        throw new Error('Invalid call session or call not ringing');
      }

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      callSession.state = 'connected';
      callSession.answerTime = new Date();
      this.currentCall = callSession;

      this.emit('callConnected', { callSession });
      console.log('✅ Call answered successfully');
      
      return true;

    } catch (error) {
      console.error('❌ Failed to answer call:', error);
      this.emit('callFailed', { error: error.message });
      return false;
    }
  }

  /**
   * Hang up current call
   * @param {string} reason - Reason for hanging up
   * @returns {Promise<boolean>} Success status
   */
  async hangup(reason = 'user_hangup') {
    try {
      if (!this.currentCall) {
        return true;
      }

      const callSession = this.currentCall;
      this.handleCallEnded(callSession, reason);
      
      return true;

    } catch (error) {
      console.error('❌ Failed to hang up call:', error);
      return false;
    }
  }

  /**
   * Handle call ended cleanup
   * @param {Object} callSession - Call session that ended
   * @param {string} reason - End reason
   */
  handleCallEnded(callSession, reason) {
    if (callSession) {
      callSession.state = 'ended';
      callSession.endTime = new Date();
      callSession.endReason = reason;

      // Calculate duration
      const startTime = callSession.answerTime || callSession.startTime;
      if (startTime) {
        callSession.duration = Math.floor((callSession.endTime - startTime) / 1000);
      }
    }

    // Clean up media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.currentCall = null;
    
    this.emit('callEnded', { callSession, reason });
    console.log(`📵 Call ended: ${reason}`);
  }

  /**
   * Put current call on hold
   * @returns {Promise<boolean>} Success status
   */
  async holdCall() {
    try {
      if (!this.currentCall || this.currentCall.state !== 'connected') {
        return false;
      }

      this.currentCall.isOnHold = true;
      
      // Mute local stream
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }

      this.emit('callHeld', { callSession: this.currentCall });
      return true;

    } catch (error) {
      console.error('❌ Failed to hold call:', error);
      return false;
    }
  }

  /**
   * Resume call from hold
   * @returns {Promise<boolean>} Success status
   */
  async resumeCall() {
    try {
      if (!this.currentCall || !this.currentCall.isOnHold) {
        return false;
      }

      this.currentCall.isOnHold = false;
      
      // Unmute local stream
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
      }

      this.emit('callResumed', { callSession: this.currentCall });
      return true;

    } catch (error) {
      console.error('❌ Failed to resume call:', error);
      return false;
    }
  }

  /**
   * Mute/unmute microphone
   * @param {boolean} mute - Mute state
   * @returns {boolean} Success status
   */
  setMute(mute) {
    try {
      if (!this.localStream) {
        return false;
      }

      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !mute;
      });

      if (this.currentCall) {
        this.currentCall.isMuted = mute;
      }

      this.emit('muteChanged', { muted: mute });
      return true;

    } catch (error) {
      console.error('❌ Failed to change mute state:', error);
      return false;
    }
  }

  /**
   * Send DTMF tones
   * @param {string} tones - DTMF tones to send
   * @returns {boolean} Success status
   */
  sendDTMF(tones) {
    try {
      if (!this.currentCall || this.currentCall.state !== 'connected') {
        return false;
      }

      // In a real implementation, this would send DTMF via RTP
      console.log(`📟 Sending DTMF: ${tones}`);
      
      this.emit('dtmfSent', { tones, callSession: this.currentCall });
      return true;

    } catch (error) {
      console.error('❌ Failed to send DTMF:', error);
      return false;
    }
  }

  /**
   * Get current call information
   * @returns {Object|null} Current call session
   */
  getCurrentCall() {
    return this.currentCall;
  }

  /**
   * Get registration status
   * @returns {boolean} Registration status
   */
  getRegistrationStatus() {
    return this.isRegistered;
  }

  /**
   * Get connection quality metrics
   * @returns {Object} Quality metrics
   */
  getConnectionQuality() {
    // In a real implementation, this would analyze WebRTC stats
    return {
      signal: 'good',
      latency: 45 + Math.random() * 50, // Simulated latency
      packetLoss: Math.random() * 2,    // Simulated packet loss %
      jitter: Math.random() * 10        // Simulated jitter ms
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.unregister();
    
    if (this.remoteAudio) {
      this.remoteAudio.remove();
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    this.eventCallbacks = {};
  }
}

export default SIPManager;