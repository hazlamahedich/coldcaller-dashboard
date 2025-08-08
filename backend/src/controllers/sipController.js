const { sipConfig, generateId } = require('../data/dataStore');
const ResponseFormatter = require('../utils/responseFormatter');
const SIPManager = require('../services/sipManager');

/**
 * Configure SIP server settings
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

module.exports = {
  configureSIP,
  getSIPSettings,
  testSIPConnection,
  getSIPStatus,
  updateSIPCredentials,
  getSIPProviders,
  registerSIPAccount,
  unregisterSIPAccount
};