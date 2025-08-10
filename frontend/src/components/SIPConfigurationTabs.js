import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import SIPProviderManager from '../services/SIPProviderManager';
import SIPConfigManager from '../services/SIPConfigManager';
import { getAllProviderPresets, getProviderPreset } from '../services/SIPProviderPresets';

/**
 * Enhanced SIP Configuration with Tabbed Interface
 * Comprehensive provider setup, diagnostics, and monitoring
 */
const SIPConfigurationTabs = ({ 
  onConfigurationSave,
  initialConfig = null 
}) => {
  const { isDarkMode } = useTheme();
  const sipProviderManagerRef = useRef(null);
  const sipConfigManagerRef = useRef(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('basic');
  
  // Configuration state with enhanced structure
  const [selectedProvider, setSelectedProvider] = useState('generic');
  const [configuration, setConfiguration] = useState({
    authentication: {
      username: '',
      password: '',
      realm: '',
      displayName: 'ColdCaller User',
      authMethod: 'digest',
      token: ''
    },
    connection: {
      wsServers: [''],
      stunServers: ['stun:stun.l.google.com:19302'],
      turnServers: [],
      transport: 'wss',
      port: 5060,
      registerExpires: 300
    },
    media: {
      codecs: ['opus', 'g722', 'pcmu', 'pcma'],
      primaryCodec: 'opus',
      sampleRate: 48000,
      bitrate: 64000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      jitterBuffer: 'adaptive'
    },
    dtmf: {
      method: 'rfc4733',
      duration: 200,
      interToneGap: 50,
      payloadType: 101
    },
    network: {
      iceTimeout: 5000,
      natTraversal: 'auto',
      keepAliveInterval: 30,
      heartbeatInterval: 25,
      maxReconnectAttempts: 5,
      reconnectTimeout: 4
    },
    security: {
      encryption: 'auto',
      certificateVerification: true,
      tlsVersion: '1.2',
      sipAuth: 'digest'
    }
  });
  
  // UI state
  const [testResults, setTestResults] = useState(null);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [providerInfo, setProviderInfo] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Initialize managers
  useEffect(() => {
    sipProviderManagerRef.current = new SIPProviderManager();
    sipConfigManagerRef.current = new SIPConfigManager();
    
    // Load available providers
    const presets = getAllProviderPresets();
    setAvailableProviders(presets);
    
    // Load initial configuration
    if (initialConfig) {
      loadConfiguration(initialConfig);
    } else {
      // Auto-detect provider
      const detectedProvider = sipProviderManagerRef.current.autoDetectProvider();
      handleProviderChange(detectedProvider);
    }

    // Set up diagnostic event listeners
    const diagnostics = sipProviderManagerRef.current.diagnostics;
    diagnostics.on('testStarted', (data) => {
      console.log(`🧪 Test started: ${data.name}`);
    });
    
    diagnostics.on('testCompleted', (data) => {
      console.log(`✅ Test completed: ${data.name}`);
    });
    
    diagnostics.on('monitoringUpdate', (data) => {
      setConnectionStatus(data);
    });

    return () => {
      if (sipProviderManagerRef.current) {
        sipProviderManagerRef.current.destroy();
      }
      if (sipConfigManagerRef.current) {
        sipConfigManagerRef.current.destroy();
      }
    };
  }, []);

  // Tab definitions
  const tabs = [
    { id: 'basic', label: 'Basic Setup', icon: '⚙️' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' },
    { id: 'media', label: 'Audio & Media', icon: '🎵' },
    { id: 'network', label: 'Network & Security', icon: '🌐' },
    { id: 'diagnostics', label: 'Diagnostics', icon: '🔍' },
    { id: 'monitoring', label: 'Monitoring', icon: '📊' }
  ];

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
      const preset = getProviderPreset(providerType);
      setProviderInfo(preset);
      
      // Update configuration with provider defaults
      setConfiguration(prev => ({
        ...prev,
        authentication: {
          ...prev.authentication,
          authMethod: preset.authentication.method
        },
        connection: {
          ...prev.connection,
          wsServers: preset.wsServers || prev.connection.wsServers,
          stunServers: preset.connection.stunServers || prev.connection.stunServers,
          transport: preset.connection.transport,
          port: preset.connection.port,
          registerExpires: preset.connection.registerExpires
        },
        media: {
          ...prev.media,
          codecs: preset.media.supportedCodecs,
          primaryCodec: preset.media.primaryCodec
        },
        dtmf: {
          ...prev.dtmf,
          method: preset.dtmf.preferred,
          duration: preset.dtmf.duration,
          interToneGap: preset.dtmf.interToneGap,
          payloadType: preset.dtmf.payloadType
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

  // Handle array field changes
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

  // Add/remove array items
  const addArrayItem = (section, field, defaultValue = '') => {
    setConfiguration(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: [...prev[section][field], defaultValue]
      }
    }));
  };

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

  // Run comprehensive diagnostics
  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticResults(null);
    
    try {
      const results = await sipProviderManagerRef.current.runDiagnostics(selectedProvider);
      setDiagnosticResults(results);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  // Toggle monitoring
  const toggleMonitoring = () => {
    if (isMonitoring) {
      sipProviderManagerRef.current.stopConnectionMonitoring();
      setIsMonitoring(false);
      setConnectionStatus(null);
    } else {
      sipProviderManagerRef.current.startConnectionMonitoring(selectedProvider);
      setIsMonitoring(true);
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
      
      // Save to local storage
      localStorage.setItem('sip-configuration', JSON.stringify(finalConfig));
      
      console.log('✅ SIP configuration saved');
      
    } catch (error) {
      console.error('❌ Failed to save SIP configuration:', error);
    } finally {
      setIsConfiguring(false);
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicTab();
      case 'advanced':
        return renderAdvancedTab();
      case 'media':
        return renderMediaTab();
      case 'network':
        return renderNetworkTab();
      case 'diagnostics':
        return renderDiagnosticsTab();
      case 'monitoring':
        return renderMonitoringTab();
      default:
        return renderBasicTab();
    }
  };

  // Basic configuration tab
  const renderBasicTab = () => (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div>
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
            <option key={provider.id} value={provider.id}>
              {provider.name} ({provider.category})
            </option>
          ))}
        </select>
        
        {/* Provider info */}
        {providerInfo && (
          <div className={`mt-2 p-3 rounded-lg text-sm ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <p className="text-gray-600">{providerInfo.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(providerInfo.features)
                .filter(([, enabled]) => enabled)
                .map(([feature]) => (
                  <span 
                    key={feature}
                    className={`px-2 py-1 rounded text-xs ${
                      isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {feature}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Authentication */}
      <div>
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

      {/* Connection */}
      <div>
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
              {configuration.connection.wsServers.length > 1 && (
                <button
                  onClick={() => removeArrayItem('connection', 'wsServers', index)}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove
                </button>
              )}
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
      </div>

      {/* Quick test */}
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
      </div>

      {/* Test results */}
      {testResults && (
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
            <div className={`text-sm ${
              isDarkMode ? 'text-red-400' : 'text-red-700'
            }`}>
              Error: {testResults.error}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Advanced configuration tab
  const renderAdvancedTab = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h3 className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Advanced Configuration Options
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          Transport protocols, DTMF settings, and connection parameters
        </p>
      </div>
    </div>
  );

  // Media configuration tab
  const renderMediaTab = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h3 className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Audio & Media Settings
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          Codec selection, audio quality, and processing options
        </p>
      </div>
    </div>
  );

  // Network and security tab
  const renderNetworkTab = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h3 className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Network & Security
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          STUN/TURN servers, encryption, and security settings
        </p>
      </div>
    </div>
  );

  // Diagnostics tab
  const renderDiagnosticsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-medium ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}>
          Connection Diagnostics
        </h3>
        <button
          onClick={runDiagnostics}
          disabled={isRunningDiagnostics}
          className={`px-6 py-2 rounded font-medium transition-colors ${
            isRunningDiagnostics
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white`}
        >
          {isRunningDiagnostics ? 'Running Diagnostics...' : 'Run Comprehensive Diagnostics'}
        </button>
      </div>

      {diagnosticResults && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className={`p-4 rounded-lg border ${
            diagnosticResults.overall?.success
              ? isDarkMode
                ? 'bg-green-900/30 border-green-700'
                : 'bg-green-50 border-green-200'
              : isDarkMode
                ? 'bg-red-900/30 border-red-700'
                : 'bg-red-50 border-red-200'
          }`}>
            <h4 className="font-medium mb-2">Overall Results</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Tests Passed:</span>
                <span className="ml-2 font-bold">{diagnosticResults.overall?.passed}/{diagnosticResults.overall?.total}</span>
              </div>
              <div>
                <span className="text-gray-500">Success Rate:</span>
                <span className="ml-2 font-bold">{diagnosticResults.overall?.percentage}%</span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-2 font-bold">{Math.round(diagnosticResults.duration / 1000)}s</span>
              </div>
            </div>
          </div>

          {/* Individual Test Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(diagnosticResults.tests).map(([testId, result]) => (
              <div key={testId} className={`p-3 rounded-lg border ${
                result.success
                  ? isDarkMode
                    ? 'bg-green-900/20 border-green-800'
                    : 'bg-green-50 border-green-200'
                  : isDarkMode
                    ? 'bg-red-900/20 border-red-800'
                    : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">{result.name}</h5>
                  <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                    {result.success ? '✅' : '❌'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{result.description}</p>
                {result.responseTime && (
                  <p className="text-xs text-gray-500">Response time: {result.responseTime}ms</p>
                )}
                {result.error && (
                  <p className="text-sm text-red-600">{result.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Monitoring tab
  const renderMonitoringTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-medium ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}>
          Real-time Connection Monitoring
        </h3>
        <button
          onClick={toggleMonitoring}
          className={`px-6 py-2 rounded font-medium transition-colors ${
            isMonitoring
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </div>

      {isMonitoring && (
        <div className={`p-4 rounded-lg border ${
          isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Monitoring active</span>
          </div>
        </div>
      )}

      {connectionStatus && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(connectionStatus.tests).map(([testId, result]) => (
              <div key={testId} className={`p-3 rounded-lg border text-center ${
                result.success
                  ? isDarkMode
                    ? 'bg-green-900/20 border-green-800'
                    : 'bg-green-50 border-green-200'
                  : isDarkMode
                    ? 'bg-red-900/20 border-red-800'
                    : 'bg-red-50 border-red-200'
              }`}>
                <div className={`text-2xl mb-1 ${
                  result.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.success ? '✅' : '❌'}
                </div>
                <div className="font-medium text-sm capitalize">{testId}</div>
                {result.responseTime && (
                  <div className="text-xs text-gray-500 mt-1">
                    {result.responseTime}ms
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-500">
            Last updated: {new Date(connectionStatus.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );

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
          Advanced SIP Configuration
        </h2>
        <p className={`text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Comprehensive SIP provider setup with diagnostics and monitoring
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? isDarkMode
                      ? 'border-blue-400 text-blue-400'
                      : 'border-blue-500 text-blue-600'
                    : isDarkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {renderTabContent()}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <button
            onClick={saveConfiguration}
            disabled={isConfiguring}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              isConfiguring
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isConfiguring ? 'Saving...' : 'Save Configuration'}
          </button>
          
          <button
            onClick={() => {
              const profile = sipProviderManagerRef.current?.exportConfigurationProfile(selectedProvider);
              if (profile) {
                const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `sip-config-${selectedProvider}-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isDarkMode
                ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Export Config
          </button>
        </div>
      </div>
    </div>
  );
};

export default SIPConfigurationTabs;