import { Device } from '@twilio/voice-sdk';

class TwilioVoiceManager {
  constructor() {
    this.device = null;
    this.activeCall = null;
    this.isInitialized = false;
    this.accessToken = null;
    this.identity = null;
    this.eventCallbacks = {
      ready: [],
      error: [],
      incoming: [],
      disconnect: [],
      connect: [],
      cancel: [],
      reject: []
    };
  }

  /**
   * Initialize Twilio Voice SDK
   */
  async initialize(options = {}) {
    try {
      // Get access token from backend
      const tokenResponse = await fetch('/api/twilio/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          identity: options.identity || 'default-user'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get Twilio access token');
      }

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.success) {
        throw new Error(tokenData.message || 'Failed to get access token');
      }

      this.accessToken = tokenData.data.accessToken;
      this.identity = tokenData.data.identity;

      // Initialize Twilio Device
      this.device = new Device(this.accessToken, {
        ...tokenData.data.config,
        ...options.config
      });

      // Set up event listeners
      this.setupEventListeners();

      // Register device
      await this.device.register();
      
      this.isInitialized = true;
      console.log('🎯 Twilio Voice initialized successfully');
      
      this.emit('ready', { device: this.device, identity: this.identity });
      
      return {
        success: true,
        device: this.device,
        identity: this.identity
      };
    } catch (error) {
      console.error('❌ Twilio Voice initialization failed:', error);
      this.emit('error', { error, type: 'initialization' });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set up device event listeners
   */
  setupEventListeners() {
    if (!this.device) return;

    this.device.on('ready', (device) => {
      console.log('📱 Twilio Device ready:', device);
      this.emit('ready', { device });
    });

    this.device.on('error', (error) => {
      console.error('📱 Twilio Device error:', error);
      this.emit('error', { error, type: 'device' });
    });

    this.device.on('incoming', (call) => {
      console.log('📞 Incoming call:', call);
      this.activeCall = call;
      this.setupCallEventListeners(call);
      this.emit('incoming', { call });
    });

    this.device.on('registrationFailed', (error) => {
      console.error('📱 Registration failed:', error);
      this.emit('error', { error, type: 'registration' });
    });

    this.device.on('tokenWillExpire', async () => {
      console.log('🔑 Token will expire, refreshing...');
      await this.refreshToken();
    });
  }

  /**
   * Set up call event listeners
   */
  setupCallEventListeners(call) {
    call.on('accept', () => {
      console.log('📞 Call accepted');
      this.emit('connect', { call });
    });

    call.on('disconnect', (call) => {
      console.log('📞 Call disconnected');
      this.activeCall = null;
      this.emit('disconnect', { call });
    });

    call.on('cancel', () => {
      console.log('📞 Call cancelled');
      this.activeCall = null;
      this.emit('cancel', { call });
    });

    call.on('reject', () => {
      console.log('📞 Call rejected');
      this.activeCall = null;
      this.emit('reject', { call });
    });

    call.on('error', (error) => {
      console.error('📞 Call error:', error);
      this.emit('error', { error, type: 'call', call });
    });
  }

  /**
   * Make outbound call
   */
  async makeCall(phoneNumber, options = {}) {
    if (!this.isInitialized || !this.device) {
      throw new Error('Twilio Voice not initialized');
    }

    try {
      const callParams = {
        To: phoneNumber,
        From: options.from || 'client',
        ...options.params
      };

      const call = await this.device.connect({ params: callParams });
      this.activeCall = call;
      this.setupCallEventListeners(call);

      console.log('📞 Outbound call initiated:', call);
      return {
        success: true,
        call: call,
        callSid: call.parameters.CallSid
      };
    } catch (error) {
      console.error('📞 Outbound call failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Accept incoming call
   */
  acceptCall() {
    if (this.activeCall && this.activeCall.status() === 'pending') {
      this.activeCall.accept();
      return true;
    }
    return false;
  }

  /**
   * Reject incoming call
   */
  rejectCall() {
    if (this.activeCall && this.activeCall.status() === 'pending') {
      this.activeCall.reject();
      return true;
    }
    return false;
  }

  /**
   * Disconnect active call
   */
  disconnectCall() {
    if (this.activeCall) {
      this.activeCall.disconnect();
      return true;
    }
    return false;
  }

  /**
   * Mute/unmute call
   */
  toggleMute() {
    if (this.activeCall) {
      const isMuted = this.activeCall.isMuted();
      this.activeCall.mute(!isMuted);
      return !isMuted;
    }
    return false;
  }

  /**
   * Hold/unhold call
   */
  toggleHold() {
    if (this.activeCall) {
      const isOnHold = this.activeCall.isOnHold();
      this.activeCall.hold(!isOnHold);
      return !isOnHold;
    }
    return false;
  }

  /**
   * Send DTMF tones
   */
  sendDTMF(digit) {
    if (this.activeCall) {
      this.activeCall.sendDigits(digit);
      return true;
    }
    return false;
  }

  /**
   * Get call status
   */
  getCallStatus() {
    if (this.activeCall) {
      return {
        status: this.activeCall.status(),
        direction: this.activeCall.direction,
        isMuted: this.activeCall.isMuted(),
        isOnHold: this.activeCall.isOnHold(),
        duration: this.activeCall.duration()
      };
    }
    return null;
  }

  /**
   * Get device status
   */
  getDeviceStatus() {
    if (!this.device) {
      return { status: 'uninitialized' };
    }

    return {
      status: this.device.state,
      identity: this.identity,
      isRegistered: this.device.state === 'registered',
      hasActiveCall: !!this.activeCall,
      callStatus: this.getCallStatus()
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    try {
      const tokenResponse = await fetch('/api/twilio/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          identity: this.identity
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh Twilio access token');
      }

      const tokenData = await tokenResponse.json();
      
      if (tokenData.success) {
        this.accessToken = tokenData.data.accessToken;
        this.device.updateToken(this.accessToken);
        console.log('🔑 Twilio token refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.emit('error', { error, type: 'token_refresh' });
    }
  }

  /**
   * Event management
   */
  on(event, callback) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => callback(data));
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    if (this.activeCall) {
      this.activeCall.disconnect();
    }
    
    if (this.device) {
      this.device.destroy();
    }

    this.device = null;
    this.activeCall = null;
    this.isInitialized = false;
    this.eventCallbacks = {
      ready: [],
      error: [],
      incoming: [],
      disconnect: [],
      connect: [],
      cancel: [],
      reject: []
    };

    console.log('🧹 Twilio Voice Manager destroyed');
  }

  /**
   * Static utility methods
   */
  static formatPhoneNumber(phoneNumber, countryCode = 'US') {
    // Basic phone number formatting
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (countryCode === 'US' && cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    return `+${cleaned}`;
  }

  static validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }
}

export default TwilioVoiceManager;