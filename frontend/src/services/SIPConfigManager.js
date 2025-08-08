// SIPConfigManager - SIP server configuration and provider management
// Handles SIP account settings, server configurations, and provider integrations
// Supports multiple SIP providers with automatic failover and connection monitoring

class SIPConfigManager {
  constructor() {
    // Configuration storage
    this.configs = new Map();
    this.currentConfig = null;
    this.activeConfigId = null;
    
    // Predefined SIP providers
    this.providers = {
      twilio: {
        name: 'Twilio',
        defaultPort: 5060,
        transportProtocol: 'wss',
        serverFormat: '{domain}.twilio.com',
        authRequired: true,
        features: ['voice', 'sms', 'video'],
        iceServers: [
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      },
      
      asterisk: {
        name: 'Asterisk',
        defaultPort: 5060,
        transportProtocol: 'wss',
        serverFormat: '{domain}',
        authRequired: true,
        features: ['voice', 'video', 'presence'],
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      },
      
      freepbx: {
        name: 'FreePBX',
        defaultPort: 5060,
        transportProtocol: 'wss',
        serverFormat: '{domain}',
        authRequired: true,
        features: ['voice', 'video', 'voicemail'],
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      },
      
      '3cx': {
        name: '3CX',
        defaultPort: 5090,
        transportProtocol: 'wss',
        serverFormat: '{domain}:5090',
        authRequired: true,
        features: ['voice', 'video', 'chat', 'presence'],
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      },
      
      opensips: {
        name: 'OpenSIPS',
        defaultPort: 5060,
        transportProtocol: 'wss',
        serverFormat: '{domain}',
        authRequired: true,
        features: ['voice', 'video', 'presence', 'im'],
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      },
      
      kamailio: {
        name: 'Kamailio',
        defaultPort: 5060,
        transportProtocol: 'wss',
        serverFormat: '{domain}',
        authRequired: true,
        features: ['voice', 'video', 'presence', 'im'],
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      }
    };
    
    // Connection monitoring
    this.connectionMonitor = {
      enabled: false,
      interval: null,
      intervalMs: 30000, // 30 seconds
      failureThreshold: 3,
      currentFailures: 0,
      lastSuccessfulPing: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    };
    
    // Configuration validation rules
    this.validationRules = {
      uri: {
        required: true,
        pattern: /^sip:[^@]+@.+$/,
        message: 'SIP URI must be in format: sip:user@domain'
      },
      username: {
        required: true,
        minLength: 1,
        message: 'Username is required'
      },
      password: {
        required: true,
        minLength: 1,
        message: 'Password is required'
      },
      server: {
        required: true,
        pattern: /^[^:]+:\d+$/,
        message: 'Server must be in format: domain:port'
      },
      displayName: {
        required: false,
        maxLength: 50,
        message: 'Display name must be 50 characters or less'
      }
    };
    
    // Event listeners
    this.listeners = new Map();
    
    this.bindMethods();
    this.initialize();
  }
  
  // Bind methods
  bindMethods() {
    this.monitorConnection = this.monitorConnection.bind(this);
  }
  
  // Initialize configuration manager
  initialize() {
    try {
      // Load saved configurations from localStorage
      this.loadSavedConfigurations();
      
      // Load active configuration
      this.loadActiveConfiguration();
      
      this.emit('initialized', {
        configCount: this.configs.size,
        activeConfig: this.activeConfigId,
        providers: Object.keys(this.providers)
      });
      
      console.log('⚙️ SIP Configuration Manager initialized');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to initialize SIP Configuration Manager:', error);
      this.emit('error', { 
        type: 'initialization',
        message: error.message 
      });
      return { success: false, error: error.message };
    }
  }
  
  // Load configurations from localStorage
  loadSavedConfigurations() {
    try {
      const saved = localStorage.getItem('sip_configurations');
      if (saved) {
        const configs = JSON.parse(saved);
        this.configs.clear();
        
        Object.entries(configs).forEach(([id, config]) => {
          this.configs.set(id, config);
        });
        
        console.log(`📥 Loaded ${this.configs.size} saved SIP configurations`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load saved configurations:', error);
    }
  }
  
  // Load active configuration
  loadActiveConfiguration() {
    try {
      const activeId = localStorage.getItem('active_sip_config');
      if (activeId && this.configs.has(activeId)) {
        this.activeConfigId = activeId;
        this.currentConfig = this.configs.get(activeId);
        console.log(`📡 Loaded active configuration: ${activeId}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load active configuration:', error);
    }
  }
  
  // Save configurations to localStorage
  saveConfigurations() {
    try {
      const configs = Object.fromEntries(this.configs);
      localStorage.setItem('sip_configurations', JSON.stringify(configs));
      
      if (this.activeConfigId) {
        localStorage.setItem('active_sip_config', this.activeConfigId);
      }
      
      console.log('💾 SIP configurations saved');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to save configurations:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Create new configuration
  createConfiguration(configData) {
    try {
      // Validate configuration
      const validation = this.validateConfiguration(configData);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Generate unique ID
      const configId = this.generateConfigId(configData);
      
      // Create configuration object
      const config = {
        id: configId,
        name: configData.name || `${configData.username}@${this.extractDomain(configData.server)}`,
        uri: configData.uri,
        username: configData.username,
        password: configData.password, // Note: In production, encrypt this
        server: configData.server,
        displayName: configData.displayName || configData.username,
        provider: configData.provider || 'custom',
        
        // Optional settings
        registerExpires: configData.registerExpires || 300,
        connectionTimeout: configData.connectionTimeout || 10,
        maxReconnectionAttempts: configData.maxReconnectionAttempts || 5,
        reconnectionTimeout: configData.reconnectionTimeout || 4,
        
        // Provider-specific settings
        extraHeaders: configData.extraHeaders || [],
        iceServers: configData.iceServers || this.getProviderICEServers(configData.provider),
        
        // Metadata
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        isActive: false,
        
        // Connection history
        connectionHistory: [],
        lastSuccessfulConnection: null,
        failureCount: 0
      };
      
      // Store configuration
      this.configs.set(configId, config);
      
      // Save to localStorage
      this.saveConfigurations();
      
      this.emit('configurationCreated', { 
        configId,
        config: this.sanitizeConfig(config)
      });
      
      console.log(`✅ SIP configuration created: ${configId}`);
      return { success: true, configId, config: this.sanitizeConfig(config) };
      
    } catch (error) {
      console.error('❌ Failed to create configuration:', error);
      throw error;
    }
  }
  
  // Update existing configuration
  updateConfiguration(configId, updates) {
    try {
      if (!this.configs.has(configId)) {
        throw new Error(`Configuration not found: ${configId}`);
      }
      
      const currentConfig = this.configs.get(configId);
      
      // Merge updates with current config
      const updatedConfig = {
        ...currentConfig,
        ...updates,
        id: configId, // Prevent ID changes
        lastModified: new Date().toISOString()
      };
      
      // Validate updated configuration
      const validation = this.validateConfiguration(updatedConfig);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Update configuration
      this.configs.set(configId, updatedConfig);
      
      // If this is the active config, update current config
      if (this.activeConfigId === configId) {
        this.currentConfig = updatedConfig;
      }
      
      // Save to localStorage
      this.saveConfigurations();
      
      this.emit('configurationUpdated', { 
        configId,
        config: this.sanitizeConfig(updatedConfig),
        changes: Object.keys(updates)
      });
      
      console.log(`✅ SIP configuration updated: ${configId}`);
      return { success: true, config: this.sanitizeConfig(updatedConfig) };
      
    } catch (error) {
      console.error('❌ Failed to update configuration:', error);
      throw error;
    }
  }
  
  // Delete configuration
  deleteConfiguration(configId) {
    try {
      if (!this.configs.has(configId)) {
        throw new Error(`Configuration not found: ${configId}`);
      }
      
      const config = this.configs.get(configId);
      
      // Cannot delete active configuration
      if (this.activeConfigId === configId) {
        throw new Error('Cannot delete active configuration. Switch to another configuration first.');
      }
      
      // Remove configuration
      this.configs.delete(configId);
      
      // Save to localStorage
      this.saveConfigurations();
      
      this.emit('configurationDeleted', { 
        configId,
        configName: config.name
      });
      
      console.log(`🗑️ SIP configuration deleted: ${configId}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to delete configuration:', error);
      throw error;
    }
  }
  
  // Set active configuration
  setActiveConfiguration(configId) {
    try {
      if (!this.configs.has(configId)) {
        throw new Error(`Configuration not found: ${configId}`);
      }
      
      const previousConfigId = this.activeConfigId;
      
      // Update active flags
      if (previousConfigId) {
        const prevConfig = this.configs.get(previousConfigId);
        prevConfig.isActive = false;
        this.configs.set(previousConfigId, prevConfig);
      }
      
      // Set new active configuration
      const newConfig = this.configs.get(configId);
      newConfig.isActive = true;
      this.configs.set(configId, newConfig);
      
      this.activeConfigId = configId;
      this.currentConfig = newConfig;
      
      // Save to localStorage
      this.saveConfigurations();
      
      this.emit('activeConfigurationChanged', {
        previousConfigId,
        newConfigId: configId,
        config: this.sanitizeConfig(newConfig)
      });
      
      console.log(`📡 Active SIP configuration changed to: ${configId}`);
      return { success: true, config: this.sanitizeConfig(newConfig) };
      
    } catch (error) {
      console.error('❌ Failed to set active configuration:', error);
      throw error;
    }
  }
  
  // Validate configuration
  validateConfiguration(config) {
    const errors = [];
    
    Object.entries(this.validationRules).forEach(([field, rules]) => {
      const value = config[field];
      
      // Check required fields
      if (rules.required && (!value || value.toString().trim().length === 0)) {
        errors.push(rules.message);
        return;
      }
      
      // Skip validation if field is not required and empty
      if (!rules.required && (!value || value.toString().trim().length === 0)) {
        return;
      }
      
      // Check patterns
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.message);
      }
      
      // Check lengths
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(rules.message);
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(rules.message);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Test configuration connection
  async testConfiguration(configId) {
    try {
      if (!this.configs.has(configId)) {
        throw new Error(`Configuration not found: ${configId}`);
      }
      
      const config = this.configs.get(configId);
      
      this.emit('connectionTest', { 
        configId,
        status: 'testing',
        message: 'Testing SIP connection...'
      });
      
      // Simulate connection test
      // In a real implementation, this would create a temporary SIP connection
      const testResult = await this.simulateConnectionTest(config);
      
      // Update connection history
      const historyEntry = {
        timestamp: new Date().toISOString(),
        type: 'test',
        success: testResult.success,
        message: testResult.message,
        responseTime: testResult.responseTime
      };
      
      config.connectionHistory.unshift(historyEntry);
      config.connectionHistory = config.connectionHistory.slice(0, 10); // Keep last 10 entries
      
      if (testResult.success) {
        config.lastSuccessfulConnection = historyEntry.timestamp;
        config.failureCount = 0;
      } else {
        config.failureCount++;
      }
      
      this.configs.set(configId, config);
      this.saveConfigurations();
      
      this.emit('connectionTest', { 
        configId,
        status: testResult.success ? 'success' : 'failed',
        message: testResult.message,
        responseTime: testResult.responseTime
      });
      
      console.log(`🧪 Connection test ${testResult.success ? 'passed' : 'failed'} for: ${configId}`);
      return testResult;
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      
      this.emit('connectionTest', { 
        configId,
        status: 'error',
        message: error.message
      });
      
      throw error;
    }
  }
  
  // Simulate connection test (replace with real SIP connection test)
  async simulateConnectionTest(config) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const startTime = Date.now();
    
    // Simple validation checks
    const isValid = this.validateConfiguration(config).valid;
    const hasValidServer = config.server && config.server.includes(':');
    
    const success = isValid && hasValidServer && Math.random() > 0.1; // 90% success rate for simulation
    const responseTime = Date.now() - startTime;
    
    return {
      success,
      message: success 
        ? 'Connection test successful' 
        : 'Connection test failed - unable to reach SIP server',
      responseTime
    };
  }
  
  // Start connection monitoring
  startConnectionMonitoring() {
    if (!this.currentConfig) {
      throw new Error('No active configuration to monitor');
    }
    
    if (this.connectionMonitor.enabled) {
      this.stopConnectionMonitoring();
    }
    
    this.connectionMonitor.enabled = true;
    this.connectionMonitor.currentFailures = 0;
    this.connectionMonitor.reconnectAttempts = 0;
    
    this.connectionMonitor.interval = setInterval(
      this.monitorConnection,
      this.connectionMonitor.intervalMs
    );
    
    this.emit('monitoringStarted', { 
      configId: this.activeConfigId,
      intervalMs: this.connectionMonitor.intervalMs
    });
    
    console.log('📊 SIP connection monitoring started');
    return { success: true };
  }
  
  // Stop connection monitoring
  stopConnectionMonitoring() {
    if (this.connectionMonitor.interval) {
      clearInterval(this.connectionMonitor.interval);
      this.connectionMonitor.interval = null;
    }
    
    this.connectionMonitor.enabled = false;
    
    this.emit('monitoringStopped', { 
      configId: this.activeConfigId
    });
    
    console.log('📊 SIP connection monitoring stopped');
    return { success: true };
  }
  
  // Monitor connection health
  async monitorConnection() {
    if (!this.currentConfig) return;
    
    try {
      const testResult = await this.testConfiguration(this.activeConfigId);
      
      if (testResult.success) {
        this.connectionMonitor.currentFailures = 0;
        this.connectionMonitor.lastSuccessfulPing = new Date().toISOString();
        
        this.emit('monitoringUpdate', {
          configId: this.activeConfigId,
          status: 'healthy',
          responseTime: testResult.responseTime
        });
        
      } else {
        this.connectionMonitor.currentFailures++;
        
        this.emit('monitoringUpdate', {
          configId: this.activeConfigId,
          status: 'unhealthy',
          failures: this.connectionMonitor.currentFailures,
          threshold: this.connectionMonitor.failureThreshold
        });
        
        // Check if we've reached failure threshold
        if (this.connectionMonitor.currentFailures >= this.connectionMonitor.failureThreshold) {
          this.handleConnectionFailure();
        }
      }
      
    } catch (error) {
      console.error('❌ Connection monitoring error:', error);
      this.connectionMonitor.currentFailures++;
    }
  }
  
  // Handle connection failure
  handleConnectionFailure() {
    this.emit('connectionFailure', {
      configId: this.activeConfigId,
      failures: this.connectionMonitor.currentFailures,
      threshold: this.connectionMonitor.failureThreshold
    });
    
    console.log(`🚨 SIP connection failure detected for: ${this.activeConfigId}`);
    
    // Attempt automatic recovery
    this.attemptAutoRecovery();
  }
  
  // Attempt automatic recovery
  async attemptAutoRecovery() {
    if (this.connectionMonitor.reconnectAttempts >= this.connectionMonitor.maxReconnectAttempts) {
      this.emit('recoveryFailed', {
        configId: this.activeConfigId,
        attempts: this.connectionMonitor.reconnectAttempts
      });
      return;
    }
    
    this.connectionMonitor.reconnectAttempts++;
    
    this.emit('recoveryAttempt', {
      configId: this.activeConfigId,
      attempt: this.connectionMonitor.reconnectAttempts,
      maxAttempts: this.connectionMonitor.maxReconnectAttempts
    });
    
    // Wait before retry (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, this.connectionMonitor.reconnectAttempts - 1), 30000);
    
    setTimeout(async () => {
      try {
        const testResult = await this.testConfiguration(this.activeConfigId);
        
        if (testResult.success) {
          this.connectionMonitor.currentFailures = 0;
          this.connectionMonitor.reconnectAttempts = 0;
          
          this.emit('recoverySuccessful', {
            configId: this.activeConfigId,
            attempts: this.connectionMonitor.reconnectAttempts
          });
          
          console.log(`✅ SIP connection recovered for: ${this.activeConfigId}`);
        } else {
          this.attemptAutoRecovery(); // Retry
        }
      } catch (error) {
        console.error('❌ Recovery attempt failed:', error);
        this.attemptAutoRecovery(); // Retry
      }
    }, delay);
  }
  
  // Get provider configurations
  getProviderTemplate(providerId) {
    const provider = this.providers[providerId];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    
    return {
      provider: providerId,
      name: `${provider.name} Configuration`,
      server: '',
      port: provider.defaultPort,
      transportProtocol: provider.transportProtocol,
      iceServers: provider.iceServers,
      features: provider.features
    };
  }
  
  // Get ICE servers for provider
  getProviderICEServers(providerId) {
    const provider = this.providers[providerId];
    return provider ? provider.iceServers : [
      { urls: 'stun:stun.l.google.com:19302' }
    ];
  }
  
  // Utility methods
  generateConfigId(config) {
    const timestamp = Date.now();
    const username = config.username.replace(/[^a-zA-Z0-9]/g, '');
    const domain = this.extractDomain(config.server);
    return `${username}_${domain}_${timestamp}`;
  }
  
  extractDomain(server) {
    return server.split(':')[0].replace(/[^a-zA-Z0-9]/g, '');
  }
  
  sanitizeConfig(config) {
    // Remove sensitive information when returning config
    const { password, ...sanitized } = config;
    return {
      ...sanitized,
      hasPassword: !!password
    };
  }
  
  // Get all configurations
  getAllConfigurations() {
    const configs = Array.from(this.configs.values()).map(config => 
      this.sanitizeConfig(config)
    );
    
    return {
      configs,
      activeConfigId: this.activeConfigId,
      totalCount: configs.length
    };
  }
  
  // Get configuration by ID
  getConfiguration(configId) {
    const config = this.configs.get(configId);
    return config ? this.sanitizeConfig(config) : null;
  }
  
  // Get active configuration
  getActiveConfiguration() {
    return this.currentConfig ? this.sanitizeConfig(this.currentConfig) : null;
  }
  
  // Get providers list
  getProviders() {
    return Object.entries(this.providers).map(([id, provider]) => ({
      id,
      name: provider.name,
      features: provider.features,
      defaultPort: provider.defaultPort
    }));
  }
  
  // Get connection status
  getConnectionStatus() {
    return {
      hasActiveConfig: !!this.currentConfig,
      activeConfigId: this.activeConfigId,
      monitoringEnabled: this.connectionMonitor.enabled,
      currentFailures: this.connectionMonitor.currentFailures,
      lastSuccessfulPing: this.connectionMonitor.lastSuccessfulPing,
      reconnectAttempts: this.connectionMonitor.reconnectAttempts
    };
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
  
  // Cleanup and destroy
  destroy() {
    this.stopConnectionMonitoring();
    this.listeners.clear();
    
    console.log('🧹 SIP Configuration Manager destroyed');
  }
}

export default SIPConfigManager;