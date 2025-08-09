import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import SIPProviderManager from '../services/SIPProviderManager';

/**
 * SIPConfiguration Component - SIP provider setup and testing interface
 * Allows users to configure and test SIP connections with various providers
 */

const SIPConfiguration = ({ 
  onConfigurationSave,
  initialConfig = null 
}) => {
  const { isDarkMode } = useTheme();
  const sipProviderManagerRef = useRef(null);
  
  // Configuration state
  const [selectedProvider, setSelectedProvider] = useState('generic');
  const [configuration, setConfiguration] = useState({
    authentication: {
      username: '',
      password: '',
      realm: '',
      displayName: 'ColdCaller User'
    },
    connection: {
      wsServers: [''],
      stunServers: ['stun:stun.l.google.com:19302']
    },
    dtmf: {
      method: 'rfc4733',
      duration: 200,
      interToneGap: 50
    }
  });
  
  // UI state
  const [testResults, setTestResults] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [providerCapabilities, setProviderCapabilities] = useState(null);

  // Initialize provider manager
  useEffect(() => {
    sipProviderManagerRef.current = new SIPProviderManager();
    
    // Load available providers
    const providers = sipProviderManagerRef.current.getAvailableProviders();
    setAvailableProviders(providers);
    
    // Load initial configuration
    if (initialConfig) {
      loadConfiguration(initialConfig);
    } else {
      // Auto-detect provider
      const detectedProvider = sipProviderManagerRef.current.autoDetectProvider();
      handleProviderChange(detectedProvider);
    }
  }, []);

  // Load configuration
  const loadConfiguration = (config) => {
    if (config.provider) {
      setSelectedProvider(config.provider);
      handleProviderChange(config.provider);
    }
    
    setConfiguration(prev => ({
      ...prev,
      ...config
    }));
  };

  // Handle provider selection
  const handleProviderChange = (providerType) => {
    setSelectedProvider(providerType);
    
    try {
      const providerConfig = sipProviderManagerRef.current.getProviderConfig(providerType);
      const capabilities = sipProviderManagerRef.current.getProviderCapabilities(providerType);
      
      setProviderCapabilities(capabilities);
      
      // Update configuration with provider defaults
      setConfiguration(prev => ({
        ...prev,
        dtmf: {
          ...prev.dtmf,
          method: capabilities.dtmf.preferred
        },
        connection: {
          ...prev.connection,
          stunServers: providerConfig.configuration.stunServers || prev.connection.stunServers
        }
      }));
      
    } catch (error) {
      console.error('Failed to load provider configuration:', error);
    }
  };

  // Handle configuration changes
  const handleConfigurationChange = (section, field, value) => {
    setConfiguration(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Handle array field changes (like servers)
  const handleArrayFieldChange = (section, field, index, value) => {
    setConfiguration(prev => {
      const newArray = [...prev[section][field]];
      newArray[index] = value;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: newArray
        }
      };
    });
  };

  // Add array item
  const addArrayItem = (section, field) => {
    setConfiguration(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: [...prev[section][field], '']
      }
    }));
  };

  // Remove array item
  const removeArrayItem = (section, field, index) => {
    setConfiguration(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: prev[section][field].filter((_, i) => i !== index)
      }
    }));
  };

  // Test configuration
  const testConfiguration = async () => {
    setIsTesting(true);
    setTestResults(null);
    
    try {
      // Configure provider with current settings
      const providerConfig = {
        wsServers: configuration.connection.wsServers.filter(s => s.trim()),
        authentication: configuration.authentication,
        configuration: {
          stunServers: configuration.connection.stunServers.filter(s => s.trim()),
          dtmfDuration: configuration.dtmf.duration,
          dtmfInterToneGap: configuration.dtmf.interToneGap
        }
      };
      
      sipProviderManagerRef.current.configureProvider(selectedProvider, providerConfig);
      
      // Run connectivity tests
      const results = await sipProviderManagerRef.current.testProviderConnectivity();
      setTestResults(results);
      
    } catch (error) {
      setTestResults({
        overall: false,
        error: error.message,
        tests: {}
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save configuration
  const saveConfiguration = () => {
    setIsConfiguring(true);
    
    try {
      const finalConfig = {
        provider: selectedProvider,
        ...configuration
      };
      
      if (onConfigurationSave) {
        onConfigurationSave(finalConfig);
      }
      
      // Also save to local storage
      localStorage.setItem('sip-configuration', JSON.stringify(finalConfig));
      
      console.log('✅ SIP configuration saved');
      
    } catch (error) {
      console.error('❌ Failed to save SIP configuration:', error);
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-600' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className={`text-xl font-semibold mb-2 ${
          isDarkMode ? 'text-gray-100' : 'text-gray-800'
        }`}>
          SIP Configuration
        </h2>
        <p className={`text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Configure your SIP provider for VOIP calls and DTMF functionality
        </p>
      </div>

      {/* Provider Selection */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          SIP Provider
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className={`w-full p-3 border rounded-lg ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-gray-100'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          {availableProviders.map((provider) => (
            <option key={provider.type} value={provider.type}>
              {provider.name} ({provider.category})
            </option>
          ))}
        </select>
        
        {/* Provider capabilities */}
        {providerCapabilities && (
          <div className={`mt-2 p-3 rounded-lg text-sm ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">DTMF Support:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(providerCapabilities.dtmf)
                    .filter(([key, value]) => value === true && key !== 'preferred')
                    .map(([method]) => (
                      <span 
                        key={method}
                        className={`px-2 py-1 rounded text-xs ${
                          method === providerCapabilities.dtmf.preferred
                            ? 'bg-blue-100 text-blue-800'
                            : isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {method.toUpperCase()}
                      </span>
                    ))}
                </div>
              </div>
              <div>
                <span className="font-medium">Features:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(providerCapabilities.features)
                    .filter(([, value]) => value === true)
                    .map(([feature]) => (
                      <span 
                        key={feature}
                        className={`px-2 py-1 rounded text-xs ${
                          isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {feature}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Authentication Configuration */}
      <div className="mb-6">
        <h3 className={`text-lg font-medium mb-3 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}>
          Authentication
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Username
            </label>
            <input
              type="text"
              value={configuration.authentication.username}
              onChange={(e) => handleConfigurationChange('authentication', 'username', e.target.value)}
              className={`w-full p-2 border rounded ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="SIP username"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Password
            </label>
            <input
              type="password"
              value={configuration.authentication.password}
              onChange={(e) => handleConfigurationChange('authentication', 'password', e.target.value)}
              className={`w-full p-2 border rounded ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="SIP password"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Domain/Realm
            </label>
            <input
              type="text"
              value={configuration.authentication.realm}
              onChange={(e) => handleConfigurationChange('authentication', 'realm', e.target.value)}
              className={`w-full p-2 border rounded ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="sip.provider.com"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Display Name
            </label>
            <input
              type="text"
              value={configuration.authentication.displayName}
              onChange={(e) => handleConfigurationChange('authentication', 'displayName', e.target.value)}
              className={`w-full p-2 border rounded ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Your Name"
            />
          </div>
        </div>
      </div>

      {/* Connection Configuration */}
      <div className="mb-6">
        <h3 className={`text-lg font-medium mb-3 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}>
          Connection
        </h3>
        
        {/* WebSocket Servers */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            WebSocket Servers
          </label>
          {configuration.connection.wsServers.map((server, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={server}
                onChange={(e) => handleArrayFieldChange('connection', 'wsServers', index, e.target.value)}
                className={`flex-1 p-2 border rounded ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="wss://sip.provider.com:7443/ws"
              />
              <button
                onClick={() => removeArrayItem('connection', 'wsServers', index)}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => addArrayItem('connection', 'wsServers')}
            className={`mt-2 px-4 py-2 rounded text-sm ${
              isDarkMode
                ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Add WebSocket Server
          </button>
        </div>

        {/* STUN Servers */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            STUN Servers
          </label>
          {configuration.connection.stunServers.map((server, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={server}
                onChange={(e) => handleArrayFieldChange('connection', 'stunServers', index, e.target.value)}
                className={`flex-1 p-2 border rounded ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="stun:stun.l.google.com:19302"
              />
              <button
                onClick={() => removeArrayItem('connection', 'stunServers', index)}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => addArrayItem('connection', 'stunServers')}
            className={`mt-2 px-4 py-2 rounded text-sm ${
              isDarkMode
                ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Add STUN Server
          </button>
        </div>
      </div>

      {/* DTMF Configuration */}
      <div className="mb-6">
        <h3 className={`text-lg font-medium mb-3 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}>
          DTMF Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              DTMF Method
            </label>
            <select
              value={configuration.dtmf.method}
              onChange={(e) => handleConfigurationChange('dtmf', 'method', e.target.value)}
              className={`w-full p-2 border rounded ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="rfc4733">RFC 4733 (RTP Events)</option>
              <option value="info">SIP INFO</option>
              <option value="inband">In-band Audio</option>
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Duration (ms)
            </label>
            <input
              type="number"
              value={configuration.dtmf.duration}
              onChange={(e) => handleConfigurationChange('dtmf', 'duration', parseInt(e.target.value))}
              className={`w-full p-2 border rounded ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              min="100"
              max="500"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Inter-tone Gap (ms)
            </label>
            <input
              type="number"
              value={configuration.dtmf.interToneGap}
              onChange={(e) => handleConfigurationChange('dtmf', 'interToneGap', parseInt(e.target.value))}
              className={`w-full p-2 border rounded ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              min="25"
              max="200"
            />
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="mb-6">
          <h3 className={`text-lg font-medium mb-3 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-800'
          }`}>
            Connection Test Results
          </h3>
          
          <div className={`p-4 rounded-lg border ${
            testResults.overall
              ? isDarkMode
                ? 'bg-green-900/30 border-green-700'
                : 'bg-green-50 border-green-200'
              : isDarkMode
                ? 'bg-red-900/30 border-red-700'
                : 'bg-red-50 border-red-200'
          }`}>
            <div className={`flex items-center mb-3 ${
              testResults.overall
                ? isDarkMode ? 'text-green-400' : 'text-green-700'
                : isDarkMode ? 'text-red-400' : 'text-red-700'
            }`}>
              <span className="mr-2">
                {testResults.overall ? '✅' : '❌'}
              </span>
              <span className="font-medium">
                {testResults.overall ? 'Connection Successful' : 'Connection Failed'}
              </span>
            </div>
            
            {testResults.error && (
              <div className={`mb-3 text-sm ${
                isDarkMode ? 'text-red-400' : 'text-red-700'
              }`}>
                Error: {testResults.error}
              </div>
            )}
            
            <div className="space-y-2">
              {Object.entries(testResults.tests).map(([testName, result]) => (
                <div key={testName} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {testName.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className={`text-sm ${
                    result.success
                      ? isDarkMode ? 'text-green-400' : 'text-green-600'
                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {result.success ? '✅ Pass' : '❌ Fail'}
                    {result.error && ` (${result.error})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={testConfiguration}
          disabled={isTesting}
          className={`px-6 py-2 rounded font-medium transition-colors ${
            isTesting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        
        <button
          onClick={saveConfiguration}
          disabled={isConfiguring || !testResults?.overall}
          className={`px-6 py-2 rounded font-medium transition-colors ${
            isConfiguring || !testResults?.overall
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {isConfiguring ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default SIPConfiguration;