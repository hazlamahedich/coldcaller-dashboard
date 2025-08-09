/**
 * SIPProviderManager - Unified SIP provider configuration and management
 * Supports multiple SIP providers with provider-specific optimizations
 * Handles DTMF transmission methods and SIP-specific configurations
 */

class SIPProviderManager {
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.setupProviders();
  }

  /**
   * Setup supported SIP providers
   */
  setupProviders() {
    // Twilio SIP Configuration
    this.providers.set('twilio', {
      name: 'Twilio',
      type: 'cloud',
      wsServers: ['wss://chunder.twilio.com/v1/wsserver'],
      dtmfSupport: {
        rfc4733: true,
        info: true,
        inband: false,
        preferred: 'rfc4733'
      },
      audioCodecs: ['opus', 'pcmu', 'pcma'],
      features: {
        recording: true,
        conferencing: true,
        transcription: true,
        sipTrunking: true
      },
      authentication: {
        method: 'token',
        tokenEndpoint: '/api/twilio/token'
      },
      configuration: {
        stunServers: [
          'stun:global.stun.twilio.com:3478',
          'stun:stun.l.google.com:19302'
        ],
        turnServers: [], // Twilio provides TURN automatically
        rtpEventPayloadType: 101,
        dtmfDuration: 200,
        dtmfInterToneGap: 50
      }
    });

    // Generic SIP Provider Template
    this.providers.set('generic', {
      name: 'Generic SIP',
      type: 'generic',
      wsServers: null, // To be configured
      dtmfSupport: {
        rfc4733: true,
        info: true,
        inband: false,
        preferred: 'rfc4733'
      },
      audioCodecs: ['opus', 'g722', 'pcmu', 'pcma'],
      features: {
        recording: false,
        conferencing: false,
        transcription: false,
        sipTrunking: true
      },
      authentication: {
        method: 'digest',
        realm: null,
        username: null,
        password: null
      },
      configuration: {
        stunServers: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302'
        ],
        turnServers: [],
        rtpEventPayloadType: 101,
        dtmfDuration: 200,
        dtmfInterToneGap: 50
      }
    });

    // Asterisk/FreePBX Configuration
    this.providers.set('asterisk', {
      name: 'Asterisk/FreePBX',
      type: 'pbx',
      wsServers: null, // To be configured based on PBX
      dtmfSupport: {
        rfc4733: true,
        info: true,
        inband: true,
        preferred: 'rfc4733'
      },
      audioCodecs: ['opus', 'g722', 'pcmu', 'pcma', 'g729'],
      features: {
        recording: true,
        conferencing: true,
        transcription: false,
        sipTrunking: true
      },
      authentication: {
        method: 'digest',
        realm: null,
        username: null,
        password: null
      },
      configuration: {
        stunServers: [
          'stun:stun.l.google.com:19302'
        ],
        turnServers: [],
        rtpEventPayloadType: 101,
        dtmfDuration: 160,
        dtmfInterToneGap: 40
      }
    });

    // 3CX Configuration
    this.providers.set('3cx', {
      name: '3CX',
      type: 'pbx',
      wsServers: null, // 3CX WebRTC gateway
      dtmfSupport: {
        rfc4733: true,
        info: true,
        inband: false,
        preferred: 'rfc4733'
      },
      audioCodecs: ['opus', 'g722', 'pcmu', 'pcma'],
      features: {
        recording: true,
        conferencing: true,
        transcription: false,
        sipTrunking: true
      },
      authentication: {
        method: 'digest',
        realm: null,
        username: null,
        password: null
      },
      configuration: {
        stunServers: [
          'stun:stun.l.google.com:19302'
        ],
        turnServers: [],
        rtpEventPayloadType: 101,
        dtmfDuration: 200,
        dtmfInterToneGap: 50
      }
    });
  }

  /**
   * Configure SIP provider
   * @param {string} providerType - Provider type ('twilio', 'generic', etc.)
   * @param {Object} config - Provider-specific configuration
   */
  configureProvider(providerType, config) {
    if (!this.providers.has(providerType)) {
      throw new Error(`Unsupported SIP provider: ${providerType}`);
    }

    const provider = this.providers.get(providerType);
    
    // Merge configurations
    const mergedConfig = {
      ...provider,
      ...config,
      configuration: {
        ...provider.configuration,
        ...config.configuration
      },
      authentication: {
        ...provider.authentication,
        ...config.authentication
      }
    };

    this.providers.set(providerType, mergedConfig);
    this.activeProvider = providerType;

    console.log(`🔧 SIP provider configured: ${provider.name}`);
    return mergedConfig;
  }

  /**
   * Get provider configuration
   * @param {string} providerType - Provider type
   * @returns {Object} Provider configuration
   */
  getProviderConfig(providerType = null) {
    const type = providerType || this.activeProvider;
    
    if (!type || !this.providers.has(type)) {
      throw new Error(`Provider not configured: ${type}`);
    }

    return this.providers.get(type);
  }

  /**
   * Get DTMF configuration for provider
   * @param {string} providerType - Provider type
   * @returns {Object} DTMF configuration
   */
  getDTMFConfig(providerType = null) {
    const config = this.getProviderConfig(providerType);
    
    return {
      supportedMethods: Object.keys(config.dtmfSupport).filter(
        method => config.dtmfSupport[method] && method !== 'preferred'
      ),
      preferredMethod: config.dtmfSupport.preferred,
      duration: config.configuration.dtmfDuration,
      interToneGap: config.configuration.dtmfInterToneGap,
      rtpEventPayloadType: config.configuration.rtpEventPayloadType
    };
  }

  /**
   * Validate DTMF transmission method for provider
   * @param {string} method - DTMF method ('rfc4733', 'info', 'inband')
   * @param {string} providerType - Provider type
   * @returns {boolean} Method supported
   */
  validateDTMFMethod(method, providerType = null) {
    const config = this.getProviderConfig(providerType);
    return config.dtmfSupport[method] === true;
  }

  /**
   * Get optimal DTMF method for provider
   * @param {string} providerType - Provider type
   * @returns {string} Optimal DTMF method
   */
  getOptimalDTMFMethod(providerType = null) {
    const config = this.getProviderConfig(providerType);
    return config.dtmfSupport.preferred;
  }

  /**
   * Get SIP configuration for WebRTC
   * @param {string} providerType - Provider type
   * @returns {Object} SIP configuration
   */
  getSIPConfiguration(providerType = null) {
    const config = this.getProviderConfig(providerType);
    
    return {
      uri: config.authentication.username ? 
        `sip:${config.authentication.username}@${config.authentication.realm}` : null,
      wsServers: config.wsServers,
      displayName: config.authentication.displayName,
      authUser: config.authentication.username,
      password: config.authentication.password,
      registrar: config.authentication.realm,
      realm: config.authentication.realm,
      // WebRTC configuration
      pcConfig: {
        iceServers: [
          ...config.configuration.stunServers.map(url => ({ urls: url })),
          ...config.configuration.turnServers
        ]
      },
      // Media configuration
      mediaConstraints: {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      },
      // DTMF configuration
      dtmfOptions: this.getDTMFConfig(providerType)
    };
  }

  /**
   * Auto-detect optimal provider based on environment
   * @returns {string} Recommended provider type
   */
  autoDetectProvider() {
    // Check for Twilio configuration
    if (process.env.REACT_APP_TWILIO_ACCOUNT_SID || 
        window.TWILIO_CONFIG) {
      return 'twilio';
    }

    // Check for generic SIP configuration
    if (process.env.REACT_APP_SIP_SERVER ||
        process.env.REACT_APP_SIP_DOMAIN) {
      return 'generic';
    }

    // Default fallback
    return 'generic';
  }

  /**
   * Initialize provider from environment
   * @returns {Object} Initialized provider configuration
   */
  initializeFromEnvironment() {
    const providerType = this.autoDetectProvider();
    
    let config = {};

    switch (providerType) {
      case 'twilio':
        config = {
          authentication: {
            accountSid: process.env.REACT_APP_TWILIO_ACCOUNT_SID,
            apiKey: process.env.REACT_APP_TWILIO_API_KEY,
            apiSecret: process.env.REACT_APP_TWILIO_API_SECRET,
            twimlAppSid: process.env.REACT_APP_TWILIO_TWIML_APP_SID
          }
        };
        break;

      case 'generic':
        config = {
          wsServers: process.env.REACT_APP_SIP_WS_SERVER ? 
            [process.env.REACT_APP_SIP_WS_SERVER] : null,
          authentication: {
            realm: process.env.REACT_APP_SIP_DOMAIN,
            username: process.env.REACT_APP_SIP_USERNAME,
            password: process.env.REACT_APP_SIP_PASSWORD,
            displayName: process.env.REACT_APP_SIP_DISPLAY_NAME
          }
        };
        break;
    }

    return this.configureProvider(providerType, config);
  }

  /**
   * Test provider connectivity
   * @param {string} providerType - Provider type
   * @returns {Promise<Object>} Connection test result
   */
  async testProviderConnectivity(providerType = null) {
    const config = this.getProviderConfig(providerType);
    
    const testResult = {
      provider: config.name,
      type: config.type,
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test WebSocket connectivity
    if (config.wsServers && config.wsServers.length > 0) {
      testResult.tests.websocket = await this.testWebSocketConnection(config.wsServers[0]);
    }

    // Test STUN server connectivity
    if (config.configuration.stunServers.length > 0) {
      testResult.tests.stun = await this.testSTUNConnectivity(config.configuration.stunServers);
    }

    // Test authentication endpoint (for cloud providers)
    if (config.authentication.tokenEndpoint) {
      testResult.tests.authentication = await this.testAuthenticationEndpoint(config.authentication.tokenEndpoint);
    }

    testResult.overall = Object.values(testResult.tests).every(test => test.success);
    
    return testResult;
  }

  /**
   * Test WebSocket connection
   */
  async testWebSocketConnection(wsUrl) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Connection timeout' });
      }, 5000);

      try {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({ success: true, latency: Date.now() });
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          resolve({ success: false, error: error.message });
        };
      } catch (error) {
        clearTimeout(timeout);
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Test STUN server connectivity
   */
  async testSTUNConnectivity(stunServers) {
    // Simplified STUN connectivity test
    try {
      const pc = new RTCPeerConnection({
        iceServers: stunServers.map(url => ({ urls: url }))
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pc.close();
          resolve({ success: false, error: 'STUN test timeout' });
        }, 5000);

        pc.onicecandidate = (event) => {
          if (event.candidate && event.candidate.candidate.includes('srflx')) {
            clearTimeout(timeout);
            pc.close();
            resolve({ success: true, candidateType: 'srflx' });
          }
        };

        // Create a dummy data channel to trigger ICE gathering
        pc.createDataChannel('test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test authentication endpoint
   */
  async testAuthenticationEndpoint(endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'HEAD',
        mode: 'cors'
      });
      
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get provider capabilities
   * @param {string} providerType - Provider type
   * @returns {Object} Provider capabilities
   */
  getProviderCapabilities(providerType = null) {
    const config = this.getProviderConfig(providerType);
    
    return {
      provider: config.name,
      type: config.type,
      dtmf: config.dtmfSupport,
      audioCodecs: config.audioCodecs,
      features: config.features,
      authentication: {
        method: config.authentication.method,
        supportsToken: config.authentication.method === 'token'
      }
    };
  }

  /**
   * Get all available providers
   * @returns {Array} Available provider types
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys()).map(key => ({
      type: key,
      name: this.providers.get(key).name,
      category: this.providers.get(key).type
    }));
  }

  /**
   * Reset to default configuration
   */
  reset() {
    this.activeProvider = null;
    this.setupProviders();
    console.log('🔄 SIP provider configuration reset');
  }
}

export default SIPProviderManager;