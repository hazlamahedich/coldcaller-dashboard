import { Device } from '@twilio/voice-sdk';

class TwilioTestManager {
  constructor() {
    this.device = null;
    this.activeCall = null;
    this.isInitialized = false;
    this.accessToken = null;
    this.identity = null;
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.eventCallbacks = {
      ready: [],
      error: [],
      incoming: [],
      disconnect: [],
      connect: [],
      cancel: [],
      reject: [],
      ringing: []
    };
  }

  /**
   * Initialize Twilio Voice SDK with test endpoints (no auth required)
   */
  async initialize(options = {}) {
    try {
      console.log('🧪 Initializing Twilio Test Manager...');
      
      // Get test access token (no auth required)
      const tokenResponse = await fetch(`${this.baseUrl}/api/twilio-test/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity: options.identity || `test-user-${Date.now()}`
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.message || 'Failed to get test Twilio access token');
      }

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.success) {
        throw new Error(tokenData.message || 'Failed to get test access token');
      }

      this.accessToken = tokenData.data.accessToken;
      this.identity = tokenData.data.identity;

      console.log('🎯 Test token received for identity:', this.identity);

      // Initialize Twilio Device
      this.device = new Device(this.accessToken, {
        ...tokenData.data.config,
        allowIncomingWhileBusy: false,
        ...options.config
      });

      // Set up event listeners
      this.setupEventListeners();

      // Register device
      await this.device.register();
      
      this.isInitialized = true;
      console.log('✅ Twilio Test Manager initialized successfully');
      
      this.emit('ready', { 
        device: this.device, 
        identity: this.identity,
        testMode: true 
      });
      
      return {
        success: true,
        device: this.device,
        identity: this.identity,
        testMode: true
      };
    } catch (error) {
      console.error('❌ Twilio Test Manager initialization failed:', error);
      this.emit('error', { error, type: 'initialization', testMode: true });
      return {
        success: false,
        error: error.message,
        testMode: true
      };
    }
  }

  /**
   * Set up device event listeners
   */
  setupEventListeners() {
    if (!this.device) return;

    this.device.on('ready', (device) => {
      console.log('📱 Test Device ready:', device.identity || 'unknown');
      this.emit('ready', { device, testMode: true });
    });

    this.device.on('error', (error) => {
      console.error('📱 Test Device error:', error);
      this.emit('error', { error, type: 'device', testMode: true });
    });

    this.device.on('incoming', (call) => {
      console.log('📞 Test incoming call:', {
        from: call.parameters.From,
        callSid: call.parameters.CallSid
      });
      this.activeCall = call;
      this.setupCallEventListeners(call);
      this.emit('incoming', { call, testMode: true });
    });

    this.device.on('registrationFailed', (error) => {
      console.error('📱 Test registration failed:', error);
      this.emit('error', { error, type: 'registration', testMode: true });
    });

    this.device.on('tokenWillExpire', async () => {
      console.log('🔑 Test token will expire, refreshing...');
      await this.refreshToken();
    });
  }

  /**
   * Set up call event listeners
   */
  setupCallEventListeners(call) {
    call.on('accept', () => {
      console.log('📞 Test call accepted');
      this.emit('connect', { call, testMode: true });
    });

    call.on('disconnect', (call) => {
      console.log('📞 Test call disconnected');
      this.activeCall = null;
      this.emit('disconnect', { call, testMode: true });
    });

    call.on('cancel', () => {
      console.log('📞 Test call cancelled');
      this.activeCall = null;
      this.emit('cancel', { call, testMode: true });
    });

    call.on('reject', () => {
      console.log('📞 Test call rejected');
      this.activeCall = null;
      this.emit('reject', { call, testMode: true });
    });

    call.on('ringing', (hasEarlyMedia) => {
      console.log('📞 Test call ringing, early media:', hasEarlyMedia);
      this.emit('ringing', { call, hasEarlyMedia, testMode: true });
    });

    call.on('error', (error) => {
      console.error('📞 Test call error:', error);
      this.emit('error', { error, type: 'call', call, testMode: true });
    });
  }

  /**
   * Make test outbound call (no auth required)
   */
  async makeCall(phoneNumber, options = {}) {
    try {
      console.log('🧪 Making test call to:', phoneNumber);

      if (!this.isInitialized || !this.device) {
        throw new Error('Twilio Test Manager not initialized');
      }

      // Format phone number
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      console.log('📞 Formatted phone number:', formattedNumber);

      // Make call via backend test endpoint
      const callResponse = await fetch(`${this.baseUrl}/api/twilio-test/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: formattedNumber,
          from: options.from,
          record: options.record || false,
          identity: this.identity
        })
      });

      const callResult = await callResponse.json();

      if (!callResult.success) {
        throw new Error(callResult.message || 'Test call failed');
      }

      console.log('✅ Test call initiated:', {
        callSid: callResult.callSid,
        to: formattedNumber,
        webhooks: callResult.webhookUrls
      });

      // Also initiate from the device for real-time events
      const deviceCallParams = {
        To: formattedNumber,
        From: this.identity,
        ...options.params
      };

      const deviceCall = await this.device.connect({ params: deviceCallParams });
      this.activeCall = deviceCall;
      this.setupCallEventListeners(deviceCall);

      return {
        success: true,
        call: deviceCall,
        callSid: callResult.callSid || deviceCall.parameters.CallSid,
        backendCall: callResult,
        testMode: true
      };
    } catch (error) {
      console.error('❌ Test outbound call failed:', error);
      return {
        success: false,
        error: error.message,
        testMode: true
      };
    }
  }

  /**
   * Get test call status (no auth required)
   */
  async getCallStatus(callSid) {
    try {
      const response = await fetch(`${this.baseUrl}/api/twilio-test/call/${callSid}/status`);
      const result = await response.json();
      
      return {
        ...result,
        testMode: true
      };
    } catch (error) {
      console.error('❌ Failed to get test call status:', error);
      return {
        success: false,
        error: error.message,
        testMode: true
      };
    }
  }

  /**
   * List all test calls (no auth required)
   */
  async listTestCalls() {
    try {
      const response = await fetch(`${this.baseUrl}/api/twilio-test/calls`);
      const result = await response.json();
      
      return {
        ...result,
        testMode: true
      };
    } catch (error) {
      console.error('❌ Failed to list test calls:', error);
      return {
        success: false,
        error: error.message,
        testMode: true
      };
    }
  }

  /**
   * Validate phone number (no auth required)
   */
  async validatePhoneNumber(phoneNumber, countryCode = 'US') {
    try {
      const response = await fetch(`${this.baseUrl}/api/twilio-test/validate-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber, countryCode })
      });

      const result = await response.json();
      return {
        ...result,
        testMode: true
      };
    } catch (error) {
      console.error('❌ Phone validation failed:', error);
      return {
        success: false,
        error: error.message,
        testMode: true
      };
    }
  }

  /**
   * Accept incoming call
   */
  acceptCall() {
    if (this.activeCall && this.activeCall.status() === 'pending') {
      console.log('✅ Accepting test call');
      this.activeCall.accept();
      return true;
    }
    console.warn('⚠️ No pending test call to accept');
    return false;
  }

  /**
   * Reject incoming call
   */
  rejectCall() {
    if (this.activeCall && this.activeCall.status() === 'pending') {
      console.log('❌ Rejecting test call');
      this.activeCall.reject();
      return true;
    }
    console.warn('⚠️ No pending test call to reject');
    return false;
  }

  /**
   * Disconnect active call
   */
  disconnectCall() {
    if (this.activeCall) {
      console.log('🔚 Disconnecting test call');
      this.activeCall.disconnect();
      return true;
    }
    console.warn('⚠️ No active test call to disconnect');
    return false;
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this.activeCall) {
      const isMuted = this.activeCall.isMuted();
      this.activeCall.mute(!isMuted);
      console.log(`🔇 Test call ${!isMuted ? 'muted' : 'unmuted'}`);
      return !isMuted;
    }
    return false;
  }

  /**
   * Send DTMF tones
   */
  sendDTMF(digit) {
    if (this.activeCall) {
      console.log(`📞 Sending DTMF: ${digit}`);
      this.activeCall.sendDigits(digit);
      return true;
    }
    return false;
  }

  /**
   * Get device status
   */
  getDeviceStatus() {
    if (!this.device) {
      return { 
        status: 'uninitialized', 
        testMode: true 
      };
    }

    return {
      status: this.device.state,
      identity: this.identity,
      isRegistered: this.device.state === 'registered',
      hasActiveCall: !!this.activeCall,
      callStatus: this.getCallStatus(),
      testMode: true
    };
  }

  /**
   * Format phone number for US calls
   */
  formatPhoneNumber(phoneNumber, countryCode = 'US') {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle US numbers
    if (countryCode === 'US') {
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
      }
    }
    
    // Already formatted
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // Default: US format
    return `+1${cleaned}`;
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    try {
      const tokenResponse = await fetch(`${this.baseUrl}/api/twilio-test/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity: this.identity
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh test Twilio access token');
      }

      const tokenData = await tokenResponse.json();
      
      if (tokenData.success) {
        this.accessToken = tokenData.data.accessToken;
        this.device.updateToken(this.accessToken);
        console.log('🔑 Test Twilio token refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Test token refresh failed:', error);
      this.emit('error', { error, type: 'token_refresh', testMode: true });
    }
  }

  /**
   * Test health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/twilio-test/health`);
      const result = await response.json();
      
      return {
        ...result,
        testMode: true
      };
    } catch (error) {
      console.error('❌ Test health check failed:', error);
      return {
        success: false,
        error: error.message,
        testMode: true
      };
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
      this.eventCallbacks[event].forEach(callback => {
        try {
          callback({ ...data, testMode: true });
        } catch (error) {
          console.error(`❌ Event callback error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    console.log('🧹 Destroying Twilio Test Manager...');
    
    if (this.activeCall) {
      this.activeCall.disconnect();
    }
    
    if (this.device) {
      this.device.destroy();
    }

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
      reject: [],
      ringing: []
    };

    console.log('✅ Twilio Test Manager destroyed');
  }
}

export default TwilioTestManager;