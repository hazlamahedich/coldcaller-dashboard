/**
 * SIPProviderManager - Unified SIP provider configuration and management
 * Supports multiple SIP providers with provider-specific optimizations
 * Handles DTMF transmission methods and SIP-specific configurations
 */

import { SIP_PROVIDER_PRESETS, getProviderPreset, detectProviderFromURI } from './SIPProviderPresets';
import SIPDiagnostics from './SIPDiagnostics';

class SIPProviderManager {
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.diagnostics = new SIPDiagnostics();
    this.setupProviders();
    this.bindEvents();
  }

  /**
   * Setup supported SIP providers
   */
  setupProviders() {
    // Load providers from presets
    Object.entries(SIP_PROVIDER_PRESETS).forEach(([id, preset]) => {
      this.providers.set(id, {
        ...preset,
        id,
        // Convert preset format to legacy format for compatibility
        wsServers: preset.wsServers,
        dtmfSupport: {
          ...preset.dtmf.supportedMethods.reduce((acc, method) => {
            acc[method] = true;
            return acc;
          }, {}),
          preferred: preset.dtmf.preferred
        },
        audioCodecs: preset.media.supportedCodecs,
        configuration: {
          stunServers: preset.connection.stunServers,
          turnServers: preset.connection.turnServers || [],
          rtpEventPayloadType: preset.dtmf.payloadType,
          dtmfDuration: preset.dtmf.duration,
          dtmfInterToneGap: preset.dtmf.interToneGap,
          registerExpires: preset.connection.registerExpires,
          transport: preset.connection.transport,
          port: preset.connection.port
        }
      });
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

  /**
   * Bind diagnostic events
   */
  bindEvents() {
    this.diagnostics.on('diagnosticsCompleted', (results) => {
      console.log('📊 Diagnostics completed:', results);
    });

    this.diagnostics.on('monitoringUpdate', (update) => {
      console.log('📈 Monitoring update:', update);
    });
  }

  /**
   * Get comprehensive provider information
   */
  getProviderInfo(providerType = null) {
    const config = this.getProviderConfig(providerType);
    const preset = getProviderPreset(config.id || providerType);
    
    return {
      ...config,
      preset: {
        description: preset.description,
        category: preset.category,
        documentation: preset.documentation,
        limitations: preset.limitations
      }
    };
  }

  /**
   * Auto-detect provider from SIP URI
   */
  detectProviderFromSIPURI(sipUri) {
    const detectedProvider = detectProviderFromURI(sipUri);
    
    if (detectedProvider !== 'generic') {
      console.log(`🔍 Auto-detected provider: ${detectedProvider} from URI: ${sipUri}`);
    }
    
    return detectedProvider;
  }

  /**
   * Get codec recommendations for provider
   */
  getCodecRecommendations(providerType = null) {
    const config = this.getProviderConfig(providerType);
    const preset = getProviderPreset(config.id || providerType);
    
    return {
      preferred: preset.media.preferredCodecs,
      supported: preset.media.supportedCodecs,
      primary: preset.media.primaryCodec,
      bandwidth: {
        opus: { min: 24000, max: 64000, recommended: 32000 },
        g722: { min: 64000, max: 64000, recommended: 64000 },
        pcmu: { min: 80000, max: 80000, recommended: 80000 },
        pcma: { min: 80000, max: 80000, recommended: 80000 },
        g729: { min: 24000, max: 24000, recommended: 24000 }
      }
    };
  }

  /**
   * Get transport protocol recommendations
   */
  getTransportRecommendations(providerType = null) {
    const config = this.getProviderConfig(providerType);
    const preset = getProviderPreset(config.id || providerType);
    
    return {
      preferred: preset.connection.transport,
      supported: ['wss', 'ws', 'udp', 'tcp', 'tls'],
      security: {
        wss: 'Secure WebSocket (Recommended)',
        ws: 'WebSocket (Less secure)',
        tls: 'TLS over TCP (Secure)',
        tcp: 'TCP (Less secure)',
        udp: 'UDP (Fastest, less reliable)'
      },
      port: preset.connection.port
    };
  }

  /**
   * Run comprehensive diagnostics
   */
  async runDiagnostics(providerType = null) {
    const config = this.getSIPConfiguration(providerType);
    
    try {
      const results = await this.diagnostics.runComprehensiveDiagnostics({
        authentication: config,
        connection: {
          wsServers: config.wsServers,
          stunServers: config.pcConfig.iceServers.map(server => server.urls),
          turnServers: [],
          transport: 'wss',
          registerExpires: 300
        },
        media: {
          codecs: this.getCodecRecommendations(providerType).supported,
          primaryCodec: this.getCodecRecommendations(providerType).primary,
          echoCancellation: config.mediaConstraints.audio.echoCancellation,
          noiseSuppression: config.mediaConstraints.audio.noiseSuppression,
          autoGainControl: config.mediaConstraints.audio.autoGainControl
        },
        dtmf: config.dtmfOptions,
        network: {
          iceTimeout: 5000,
          natTraversal: 'auto'
        },
        security: {
          encryption: 'auto'
        }
      });
      
      return results;
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      throw error;
    }
  }

  /**
   * Start real-time monitoring
   */
  startConnectionMonitoring(providerType = null, interval = 30000) {
    const config = this.getSIPConfiguration(providerType);
    
    this.diagnostics.startMonitoring({
      authentication: config,
      connection: {
        wsServers: config.wsServers,
        stunServers: config.pcConfig.iceServers.map(server => server.urls)
      }
    }, interval);
    
    console.log('📊 Started SIP connection monitoring');
  }

  /**
   * Stop connection monitoring
   */
  stopConnectionMonitoring() {
    this.diagnostics.stopMonitoring();
    console.log('⏹️ Stopped SIP connection monitoring');
  }

  /**
   * Get connection health metrics
   */
  getConnectionMetrics() {
    return this.diagnostics.getConnectionMetrics();
  }

  /**
   * Export configuration profile
   */
  exportConfigurationProfile(providerType = null) {
    const config = this.getProviderConfig(providerType);
    const preset = getProviderPreset(config.id || providerType);
    
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      provider: {
        id: config.id || providerType,
        name: config.name,
        type: config.type
      },
      configuration: {
        authentication: {
          method: config.authentication.method,
          realm: config.authentication.realm,
          username: config.authentication.username,
          displayName: config.authentication.displayName
          // Note: Password excluded for security
        },
        connection: config.configuration,
        media: preset.media,
        dtmf: preset.dtmf,
        features: config.features
      }
    };
  }

  /**
   * Import configuration profile
   */
  importConfigurationProfile(profile) {
    try {
      if (profile.version !== '1.0') {
        throw new Error('Unsupported configuration profile version');
      }
      
      const providerType = profile.provider.id;
      const config = {
        ...profile.configuration.authentication,
        configuration: profile.configuration.connection
      };
      
      return this.configureProvider(providerType, config);
    } catch (error) {
      console.error('❌ Failed to import configuration profile:', error);
      throw error;
    }
  }

  /**
   * Get provider setup wizard steps
   */
  getProviderSetupSteps(providerType) {
    const preset = getProviderPreset(providerType);
    
    const commonSteps = [
      {
        id: 'provider',
        title: 'Select Provider',
        description: 'Choose your SIP service provider',
        fields: ['provider']
      },
      {
        id: 'authentication',
        title: 'Authentication',
        description: 'Enter your SIP credentials',
        fields: ['username', 'password', 'realm', 'displayName']
      },
      {
        id: 'connection',
        title: 'Connection Settings',
        description: 'Configure connection parameters',
        fields: ['wsServers', 'transport', 'port']
      },
      {
        id: 'media',
        title: 'Audio Settings',
        description: 'Configure audio codecs and quality',
        fields: ['primaryCodec', 'echoCancellation', 'noiseSuppression']
      },
      {
        id: 'test',
        title: 'Test Connection',
        description: 'Verify your configuration',
        fields: []
      }
    ];
    
    // Add provider-specific steps
    if (preset.type === 'cloud' && preset.authentication.method === 'token') {
      commonSteps.splice(2, 0, {
        id: 'token',
        title: 'API Token',
        description: 'Configure API authentication',
        fields: ['apiKey', 'apiSecret', 'accountSid']
      });
    }
    
    return commonSteps;
  }

  /**
   * Validate provider configuration
   */
  validateProviderConfiguration(providerType, config) {
    const errors = [];
    const warnings = [];
    const preset = getProviderPreset(providerType);
    
    // Required fields validation
    if (!config.authentication?.username) {
      errors.push('Username is required');
    }
    
    if (!config.authentication?.password && preset.authentication.method !== 'token') {
      errors.push('Password is required');
    }
    
    if (!config.authentication?.realm) {
      errors.push('SIP domain/realm is required');
    }
    
    // Provider-specific validation
    if (providerType === 'twilio' && !config.authentication?.apiKey) {
      warnings.push('API Key recommended for Twilio');
    }
    
    // Connection validation
    if (!config.connection?.wsServers || config.connection.wsServers.length === 0) {
      errors.push('WebSocket server URL is required');
    }
    
    // Media validation
    if (config.media?.primaryCodec && !preset.media.supportedCodecs.includes(config.media.primaryCodec)) {
      warnings.push(`Codec ${config.media.primaryCodec} may not be supported by ${preset.name}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, 100 - (errors.length * 25) - (warnings.length * 10))
    };
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this.diagnostics.destroy();
    this.providers.clear();
    console.log('🧹 SIP Provider Manager destroyed');
  }
}

export default SIPProviderManager;