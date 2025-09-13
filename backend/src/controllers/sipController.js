const { sipConfig, generateId } = require('../data/dataStore');
const ResponseFormatter = require('../utils/responseFormatter');

// SIPManager is optional due to ES module compatibility
let SIPManager = null;
try {
  SIPManager = require('../services/sipManager');
} catch (error) {
  console.log('⚠️  SIP Manager not available in controller:', error.message);
  // Create a stub SIPManager for graceful degradation
  SIPManager = {
    testConfiguration: async () => ({ success: false, error: 'SIP Manager unavailable' }),
    getRegistrationStatus: async () => ({ registered: false, status: 'unavailable' }),
    getActiveCalls: () => []
  };
}
const SipConfiguration = require('../database/models/SipConfiguration');
const SipCallLog = require('../database/models/SipCallLog');
const sipAnalytics = require('../services/sipAnalytics');
const sipMonitoring = require('../services/sipMonitoring');
const { Op } = require('sequelize');

/**
 * Enhanced SIP server configuration with database storage
 */
const configureSIP = async (req, res) => {
  try {
    const {
      provider,
      server,
      port,
      username,
      password,
      domain,
      transport = 'UDP',
      enableRecording = true,
      recordingPath = './recordings'
    } = req.body;

    const config = {
      id: generateId(),
      provider,
      server,
      port,
      username,
      password,
      domain: domain || server,
      transport,
      enableRecording,
      recordingPath,
      registrationTimeout: 60000,
      sessionTimeout: 30000,
      retryAttempts: 3,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store configuration (password will be encrypted in production)
    sipConfig.current = config;

    // Test the configuration
    const testResult = await SIPManager.testConfiguration(config);
    
    if (testResult.success) {
      return ResponseFormatter.success(
        res,
        {
          id: config.id,
          provider: config.provider,
          server: config.server,
          port: config.port,
          username: config.username,
          domain: config.domain,
          transport: config.transport,
          enableRecording: config.enableRecording,
          testResult
        },
        'SIP configuration saved and tested successfully',
        201
      );
    } else {
      return ResponseFormatter.error(
        res,
        `SIP configuration saved but test failed: ${testResult.error}`,
        422,
        { testResult }
      );
    }
  } catch (error) {
    console.error('Error configuring SIP:', error);
    return ResponseFormatter.error(res, 'Failed to configure SIP settings');
  }
};

/**
 * Get current SIP configuration (sanitized)
 */
const getSIPSettings = (req, res) => {
  try {
    if (!sipConfig.current) {
      return ResponseFormatter.success(res, null, 'No SIP configuration found');
    }

    // Return sanitized configuration (no password)
    const sanitized = {
      id: sipConfig.current.id,
      provider: sipConfig.current.provider,
      server: sipConfig.current.server,
      port: sipConfig.current.port,
      username: sipConfig.current.username,
      domain: sipConfig.current.domain,
      transport: sipConfig.current.transport,
      enableRecording: sipConfig.current.enableRecording,
      recordingPath: sipConfig.current.recordingPath,
      active: sipConfig.current.active,
      createdAt: sipConfig.current.createdAt,
      updatedAt: sipConfig.current.updatedAt
    };

    return ResponseFormatter.success(res, sanitized, 'SIP settings retrieved successfully');
  } catch (error) {
    console.error('Error getting SIP settings:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP settings');
  }
};

/**
 * Test SIP connection and registration
 */
const testSIPConnection = async (req, res) => {
  try {
    if (!sipConfig.current) {
      return ResponseFormatter.error(res, 'No SIP configuration found', 404);
    }

    const testResult = await SIPManager.testConfiguration(sipConfig.current);
    
    const status = testResult.success ? 200 : 422;
    const message = testResult.success 
      ? 'SIP connection test successful'
      : `SIP connection test failed: ${testResult.error}`;

    return ResponseFormatter.success(res, testResult, message, status);
  } catch (error) {
    console.error('Error testing SIP connection:', error);
    return ResponseFormatter.error(res, 'Failed to test SIP connection');
  }
};

/**
 * Get current SIP registration status
 */
const getSIPStatus = async (req, res) => {
  try {
    const status = await SIPManager.getRegistrationStatus();
    
    return ResponseFormatter.success(res, status, 'SIP status retrieved successfully');
  } catch (error) {
    console.error('Error getting SIP status:', error);
    return ResponseFormatter.error(res, 'Failed to get SIP status');
  }
};

/**
 * Update SIP authentication credentials
 */
const updateSIPCredentials = async (req, res) => {
  try {
    if (!sipConfig.current) {
      return ResponseFormatter.error(res, 'No SIP configuration found', 404);
    }

    const { username, password, displayName } = req.body;
    
    if (username) sipConfig.current.username = username;
    if (password) sipConfig.current.password = password;
    if (displayName) sipConfig.current.displayName = displayName;
    
    sipConfig.current.updatedAt = new Date().toISOString();

    // Test updated credentials
    const testResult = await SIPManager.testConfiguration(sipConfig.current);
    
    return ResponseFormatter.success(
      res,
      {
        username: sipConfig.current.username,
        displayName: sipConfig.current.displayName,
        testResult
      },
      'SIP credentials updated successfully'
    );
  } catch (error) {
    console.error('Error updating SIP credentials:', error);
    return ResponseFormatter.error(res, 'Failed to update SIP credentials');
  }
};

/**
 * Get supported SIP providers with default configurations
 */
const getSIPProviders = (req, res) => {
  try {
    const providers = [
      {
        name: 'Twilio',
        domain: 'your-account.pstn.twilio.com',
        transport: 'UDP',
        defaultPort: 5060,
        features: ['recording', 'analytics', 'global'],
        pricing: 'Pay-per-use'
      },
      {
        name: 'RingCentral',
        domain: 'sip.ringcentral.com',
        transport: 'TLS',
        defaultPort: 5061,
        features: ['recording', 'conferencing', 'mobile'],
        pricing: 'Subscription'
      },
      {
        name: 'Vonage',
        domain: 'sip.vonage.net',
        transport: 'UDP',
        defaultPort: 5060,
        features: ['recording', 'sms', 'video'],
        pricing: 'Pay-per-use'
      },
      {
        name: 'Asterisk',
        domain: 'your-server.com',
        transport: 'UDP',
        defaultPort: 5060,
        features: ['self-hosted', 'recording', 'customizable'],
        pricing: 'Self-hosted'
      },
      {
        name: 'FreePBX',
        domain: 'your-freepbx.com',
        transport: 'UDP',
        defaultPort: 5060,
        features: ['open-source', 'recording', 'pbx'],
        pricing: 'Free/Commercial'
      }
    ];

    return ResponseFormatter.success(res, providers, 'SIP providers retrieved successfully');
  } catch (error) {
    console.error('Error getting SIP providers:', error);
    return ResponseFormatter.error(res, 'Failed to get SIP providers');
  }
};

/**
 * Register SIP account with current configuration
 */
const registerSIPAccount = async (req, res) => {
  try {
    if (!sipConfig.current) {
      return ResponseFormatter.error(res, 'No SIP configuration found', 404);
    }

    const result = await SIPManager.register(sipConfig.current);
    
    if (result.success) {
      sipConfig.current.registrationStatus = 'registered';
      sipConfig.current.lastRegistration = new Date().toISOString();
      
      return ResponseFormatter.success(res, result, 'SIP account registered successfully');
    } else {
      return ResponseFormatter.error(res, `Registration failed: ${result.error}`, 422);
    }
  } catch (error) {
    console.error('Error registering SIP account:', error);
    return ResponseFormatter.error(res, 'Failed to register SIP account');
  }
};

/**
 * Unregister SIP account
 */
const unregisterSIPAccount = async (req, res) => {
  try {
    const result = await SIPManager.unregister();
    
    if (sipConfig.current) {
      sipConfig.current.registrationStatus = 'unregistered';
      sipConfig.current.lastUnregistration = new Date().toISOString();
    }
    
    return ResponseFormatter.success(res, result, 'SIP account unregistered successfully');
  } catch (error) {
    console.error('Error unregistering SIP account:', error);
    return ResponseFormatter.error(res, 'Failed to unregister SIP account');
  }
};

/**
 * Get comprehensive SIP analytics
 */
const getSIPAnalytics = async (req, res) => {
  try {
    const { configurationId, timeRange = '7d' } = req.query;
    
    const analytics = await sipAnalytics.getCallStatistics(configurationId, timeRange);
    
    return ResponseFormatter.success(
      res,
      analytics,
      'SIP analytics retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP analytics:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP analytics');
  }
};

/**
 * Get SIP quality metrics and analysis
 */
const getSIPQualityMetrics = async (req, res) => {
  try {
    const { configurationId, timeRange = '7d' } = req.query;
    
    const qualityMetrics = await sipAnalytics.getQualityMetrics(configurationId, timeRange);
    
    return ResponseFormatter.success(
      res,
      qualityMetrics,
      'SIP quality metrics retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP quality metrics:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP quality metrics');
  }
};

/**
 * Get real-time SIP metrics
 */
const getRealTimeSIPMetrics = (req, res) => {
  try {
    const realTimeMetrics = sipAnalytics.getRealTimeMetrics();
    
    return ResponseFormatter.success(
      res,
      realTimeMetrics,
      'Real-time SIP metrics retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting real-time SIP metrics:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve real-time SIP metrics');
  }
};

/**
 * Get SIP configuration performance comparison
 */
const getSIPConfigComparison = async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    const comparison = await sipAnalytics.getConfigurationComparison(timeRange);
    
    return ResponseFormatter.success(
      res,
      comparison,
      'SIP configuration comparison retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP configuration comparison:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP configuration comparison');
  }
};

/**
 * Get SIP monitoring status and alerts
 */
const getSIPMonitoring = (req, res) => {
  try {
    const monitoringStatus = sipMonitoring.getMonitoringStatus();
    const activeAlerts = sipMonitoring.getActiveAlerts();
    
    return ResponseFormatter.success(
      res,
      {
        status: monitoringStatus,
        alerts: activeAlerts
      },
      'SIP monitoring status retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP monitoring:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP monitoring status');
  }
};

/**
 * Get SIP system health assessment
 */
const getSIPSystemHealth = async (req, res) => {
  try {
    const systemHealth = await sipAnalytics.assessSystemHealth();
    
    return ResponseFormatter.success(
      res,
      systemHealth,
      'SIP system health retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP system health:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP system health');
  }
};

/**
 * Get SIP call logs with filtering and pagination
 */
const getSIPCallLogs = async (req, res) => {
  try {
    const {
      configurationId,
      status,
      direction,
      outcome,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
      sortBy = 'start_time',
      sortOrder = 'DESC'
    } = req.query;
    
    const whereClause = {};
    
    if (configurationId) whereClause.sipConfigurationId = configurationId;
    if (status) whereClause.status = status;
    if (direction) whereClause.direction = direction;
    if (outcome) whereClause.outcome = outcome;
    
    if (startDate || endDate) {
      whereClause.start_time = {};
      if (startDate) whereClause.start_time[Op.gte] = new Date(startDate);
      if (endDate) whereClause.start_time[Op.lte] = new Date(endDate);
    }
    
    const { rows: callLogs, count } = await SipCallLog.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [{
        model: SipConfiguration,
        as: 'sipConfiguration',
        attributes: ['id', 'name', 'provider']
      }]
    });
    
    return ResponseFormatter.success(
      res,
      {
        callLogs: callLogs.map(log => log.getCallSummary()),
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count > (parseInt(offset) + parseInt(limit))
        }
      },
      'SIP call logs retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP call logs:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP call logs');
  }
};

/**
 * Get detailed SIP call information
 */
const getSIPCallDetail = async (req, res) => {
  try {
    const { callId } = req.params;
    
    const callLog = await SipCallLog.findOne({
      where: { callId },
      include: [{
        model: SipConfiguration,
        as: 'sipConfiguration',
        attributes: ['id', 'name', 'provider', 'server']
      }]
    });
    
    if (!callLog) {
      return ResponseFormatter.error(res, 'Call log not found', 404);
    }
    
    return ResponseFormatter.success(
      res,
      callLog,
      'SIP call details retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP call detail:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP call details');
  }
};

/**
 * Get SIP network diagnostics
 */
const getSIPDiagnostics = (req, res) => {
  try {
    const diagnostics = sipMonitoring.getDiagnostics();
    
    return ResponseFormatter.success(
      res,
      diagnostics,
      'SIP diagnostics retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP diagnostics:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP diagnostics');
  }
};

/**
 * Run comprehensive SIP network test
 */
const runSIPNetworkTest = async (req, res) => {
  try {
    const { configurationId } = req.body;
    
    let config;
    if (configurationId) {
      config = await SipConfiguration.findByPk(configurationId);
      if (!config) {
        return ResponseFormatter.error(res, 'SIP configuration not found', 404);
      }
    } else {
      config = sipConfig.current;
      if (!config) {
        return ResponseFormatter.error(res, 'No SIP configuration available', 404);
      }
    }
    
    // Run comprehensive test
    const testResults = await SIPManager.testConfiguration(config);
    
    // Log test results for monitoring
    sipMonitoring.addTrace({
      type: 'network_test',
      configurationId: config.id,
      results: testResults
    });
    
    return ResponseFormatter.success(
      res,
      testResults,
      'SIP network test completed successfully'
    );
  } catch (error) {
    console.error('Error running SIP network test:', error);
    return ResponseFormatter.error(res, 'Failed to run SIP network test');
  }
};

/**
 * Update SIP monitoring configuration
 */
const updateSIPMonitoringConfig = (req, res) => {
  try {
    const { thresholds, interval } = req.body;
    
    if (thresholds) {
      sipMonitoring.updateThresholds(thresholds);
    }
    
    const status = sipMonitoring.getMonitoringStatus();
    
    return ResponseFormatter.success(
      res,
      status,
      'SIP monitoring configuration updated successfully'
    );
  } catch (error) {
    console.error('Error updating SIP monitoring config:', error);
    return ResponseFormatter.error(res, 'Failed to update SIP monitoring configuration');
  }
};

/**
 * Resolve SIP alert
 */
const resolveSIPAlert = (req, res) => {
  try {
    const { alertId } = req.params;
    
    const resolved = sipMonitoring.resolveAlert(alertId);
    
    if (!resolved) {
      return ResponseFormatter.error(res, 'Alert not found', 404);
    }
    
    return ResponseFormatter.success(
      res,
      { alertId, resolved: true },
      'SIP alert resolved successfully'
    );
  } catch (error) {
    console.error('Error resolving SIP alert:', error);
    return ResponseFormatter.error(res, 'Failed to resolve SIP alert');
  }
};

/**
 * Get SIP provider template configurations
 */
const getSIPProviderTemplates = (req, res) => {
  try {
    const templates = Array.from(SIPManager.sipProviders.values());
    
    return ResponseFormatter.success(
      res,
      templates,
      'SIP provider templates retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP provider templates:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP provider templates');
  }
};

/**
 * Create new SIP configuration from template
 */
const createSIPConfigFromTemplate = async (req, res) => {
  try {
    const {
      templateId,
      name,
      username,
      password,
      customSettings = {}
    } = req.body;
    
    const template = SIPManager.sipProviders.get(templateId);
    if (!template) {
      return ResponseFormatter.error(res, 'Provider template not found', 404);
    }
    
    // Create configuration from template
    const config = {
      name,
      provider: template.id,
      server: template.domain,
      port: template.defaultPort,
      username,
      password, // Will be encrypted by the model
      transport: template.transport,
      codecPreference: template.settings.codecPreference,
      stunServers: template.settings.stunServers,
      turnServers: template.settings.turnServers,
      encryptionMode: template.settings.encryption,
      dtmfMode: template.settings.dtmfMode,
      ...customSettings
    };
    
    const sipConfiguration = await SipConfiguration.create(config);
    
    // Test the new configuration
    const testResult = await SIPManager.testConfiguration(config);
    
    return ResponseFormatter.success(
      res,
      {
        configuration: sipConfiguration.getSanitized(),
        testResult
      },
      'SIP configuration created from template successfully',
      201
    );
  } catch (error) {
    console.error('Error creating SIP config from template:', error);
    return ResponseFormatter.error(res, 'Failed to create SIP configuration from template');
  }
};

/**
 * Get SIP configuration health status
 */
const getSIPConfigHealth = async (req, res) => {
  try {
    const { configId } = req.params;
    
    const config = await SipConfiguration.findByPk(configId);
    if (!config) {
      return ResponseFormatter.error(res, 'SIP configuration not found', 404);
    }
    
    // Get recent call statistics for health assessment
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCalls = await SipCallLog.findAll({
      where: {
        sipConfigurationId: configId,
        start_time: { [Op.gte]: oneHourAgo }
      },
      order: [['start_time', 'DESC']]
    });
    
    // Calculate health metrics
    const totalCalls = recentCalls.length;
    const successfulCalls = recentCalls.filter(call => 
      ['answered', 'connected', 'ended'].includes(call.status)
    ).length;
    const avgMos = recentCalls
      .filter(call => call.mosScore)
      .reduce((sum, call, _, arr) => sum + (call.mosScore / arr.length), 0) || 0;
    
    const health = {
      configurationId: configId,
      name: config.name,
      provider: config.provider,
      status: config.registrationStatus,
      connectionQuality: config.connectionQuality,
      metrics: {
        totalCalls,
        successfulCalls,
        successRate: totalCalls > 0 ? (successfulCalls / totalCalls * 100) : 0,
        averageMos: avgMos,
        lastRegistration: config.lastRegistration,
        lastError: config.lastError
      },
      recentCalls: recentCalls.slice(0, 10).map(call => call.getCallSummary())
    };
    
    return ResponseFormatter.success(
      res,
      health,
      'SIP configuration health retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting SIP config health:', error);
    return ResponseFormatter.error(res, 'Failed to retrieve SIP configuration health');
  }
};

module.exports = {
  // Original endpoints
  configureSIP,
  getSIPSettings,
  testSIPConnection,
  getSIPStatus,
  updateSIPCredentials,
  getSIPProviders,
  registerSIPAccount,
  unregisterSIPAccount,
  
  // Enhanced analytics endpoints
  getSIPAnalytics,
  getSIPQualityMetrics,
  getRealTimeSIPMetrics,
  getSIPConfigComparison,
  
  // Monitoring endpoints
  getSIPMonitoring,
  getSIPSystemHealth,
  getSIPDiagnostics,
  runSIPNetworkTest,
  updateSIPMonitoringConfig,
  resolveSIPAlert,
  
  // Call logs endpoints
  getSIPCallLogs,
  getSIPCallDetail,
  
  // Configuration management
  getSIPProviderTemplates,
  createSIPConfigFromTemplate,
  getSIPConfigHealth
};