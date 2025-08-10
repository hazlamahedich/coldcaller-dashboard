import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

const OAuthConfiguration = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const { settings, updateSetting } = useSettings();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [oauthConfig, setOAuthConfig] = useState({
    google: {
      clientId: '',
      clientSecret: '',
      redirectUri: `${window.location.origin}/oauth/callback`,
      scopes: ['email', 'profile', 'calendar.events', 'gmail.send']
    },
    microsoft: {
      clientId: '',
      clientSecret: '',
      redirectUri: `${window.location.origin}/oauth/callback`,
      scopes: ['User.Read', 'Mail.Send', 'Calendars.ReadWrite']
    }
  });
  
  const [validationStatus, setValidationStatus] = useState({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [manualTokens, setManualTokens] = useState({
    google: { accessToken: '', refreshToken: '', expiresIn: '' },
    microsoft: { accessToken: '', refreshToken: '', expiresIn: '' }
  });

  // OAuth providers configuration
  const providers = [
    {
      id: 'google',
      name: 'Google',
      icon: '🔵',
      color: 'bg-blue-600',
      description: 'Connect Google Calendar, Gmail, and Google services',
      consoleUrl: 'https://console.developers.google.com/',
      documentationUrl: 'https://developers.google.com/identity/protocols/oauth2',
      requiredScopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.send'
      ],
      setupSteps: [
        'Go to Google Cloud Console',
        'Create a new project or select existing one',
        'Enable Google Calendar API and Gmail API',
        'Create OAuth 2.0 credentials',
        'Add authorized redirect URIs',
        'Copy Client ID and Client Secret'
      ]
    },
    {
      id: 'microsoft',
      name: 'Microsoft',
      icon: '🔷',
      color: 'bg-blue-500',
      description: 'Connect Outlook, Microsoft Calendar, and Office 365',
      consoleUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps',
      documentationUrl: 'https://docs.microsoft.com/en-us/azure/active-directory/develop/',
      requiredScopes: [
        'User.Read',
        'Mail.Send',
        'Calendars.ReadWrite',
        'offline_access'
      ],
      setupSteps: [
        'Go to Azure Portal App Registrations',
        'Create a new registration',
        'Configure platform settings for web app',
        'Add redirect URIs',
        'Create client secret in Certificates & secrets',
        'Configure API permissions'
      ]
    }
  ];

  const steps = [
    { id: 'provider', title: 'Select Provider', description: 'Choose your OAuth provider' },
    { id: 'setup', title: 'Provider Setup', description: 'Create OAuth application' },
    { id: 'configure', title: 'Configuration', description: 'Enter credentials' },
    { id: 'validate', title: 'Validation', description: 'Test connection' },
    { id: 'complete', title: 'Complete', description: 'Save and activate' }
  ];

  useEffect(() => {
    // Load existing OAuth configuration
    const existingConfig = settings.oauth || {};
    if (existingConfig.google || existingConfig.microsoft) {
      setOAuthConfig(prev => ({ ...prev, ...existingConfig }));
    }
  }, [settings]);

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setCurrentStep(1);
  };

  const handleConfigChange = (provider, field, value) => {
    setOAuthConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const handleScopeToggle = (provider, scope) => {
    setOAuthConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        scopes: prev[provider].scopes.includes(scope)
          ? prev[provider].scopes.filter(s => s !== scope)
          : [...prev[provider].scopes, scope]
      }
    }));
  };

  const validateConfiguration = async (provider) => {
    setIsTestingConnection(true);
    setValidationStatus(prev => ({ ...prev, [provider.id]: 'testing' }));

    try {
      const config = oauthConfig[provider.id];
      
      // Basic validation
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Client ID and Client Secret are required');
      }

      // Test OAuth authorization URL generation
      const authUrl = generateAuthUrl(provider.id, config);
      console.log(`Generated OAuth URL for ${provider.name}:`, authUrl);

      // In a real implementation, you would:
      // 1. Test the OAuth endpoint availability
      // 2. Validate the client credentials
      // 3. Check redirect URI configuration
      
      // Simulate validation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setValidationStatus(prev => ({ ...prev, [provider.id]: 'valid' }));
      return true;
      
    } catch (error) {
      console.error(`Validation failed for ${provider.name}:`, error);
      setValidationStatus(prev => ({ 
        ...prev, 
        [provider.id]: 'error',
        [`${provider.id}_error`]: error.message
      }));
      return false;
    } finally {
      setIsTestingConnection(false);
    }
  };

  const generateAuthUrl = (providerId, config) => {
    const baseUrls = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
    };

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: `coldcaller_${Date.now()}`
    });

    return `${baseUrls[providerId]}?${params.toString()}`;
  };

  const initiateOAuthFlow = (provider) => {
    const config = oauthConfig[provider.id];
    const authUrl = generateAuthUrl(provider.id, config);
    
    // Open OAuth window
    const oauthWindow = window.open(
      authUrl,
      'oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Listen for OAuth callback
    const checkClosed = setInterval(() => {
      if (oauthWindow.closed) {
        clearInterval(checkClosed);
        // Check for stored tokens or handle callback
        handleOAuthCallback(provider.id);
      }
    }, 1000);
  };

  const handleOAuthCallback = (providerId) => {
    // In a real implementation, this would:
    // 1. Extract authorization code from callback URL
    // 2. Exchange code for access token
    // 3. Store tokens securely
    // 4. Update connection status
    
    console.log(`OAuth callback received for ${providerId}`);
    // For now, simulate successful connection
    setTimeout(() => {
      updateSetting('oauth', providerId, {
        ...oauthConfig[providerId],
        connected: true,
        connectedAt: new Date().toISOString()
      });
      setCurrentStep(4);
    }, 1000);
  };

  const handleManualTokenSubmit = (provider) => {
    const tokens = manualTokens[provider.id];
    
    if (!tokens.accessToken) {
      alert('Access token is required');
      return;
    }

    // Save manual tokens
    updateSetting('oauth', provider.id, {
      ...oauthConfig[provider.id],
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      connected: true,
      connectedAt: new Date().toISOString(),
      manuallyConfigured: true
    });

    setCurrentStep(4);
  };

  const saveConfiguration = () => {
    updateSetting('oauth', selectedProvider.id, oauthConfig[selectedProvider.id]);
    alert('OAuth configuration saved successfully!');
    setCurrentStep(0);
    setSelectedProvider(null);
  };

  const renderProviderSelection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
          Choose OAuth Provider
        </h3>
        <p className={`text-sm ${themeClasses.textSecondary} mt-2`}>
          Select the service you want to integrate with
        </p>
      </div>

      <div className="grid gap-4">
        {providers.map((provider) => (
          <div
            key={provider.id}
            onClick={() => handleProviderSelect(provider)}
            className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200`}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${provider.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                {provider.icon}
              </div>
              <div className="flex-1">
                <h4 className={`font-medium ${themeClasses.textPrimary}`}>{provider.name}</h4>
                <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>{provider.description}</p>
                
                {settings.oauth?.[provider.id]?.connected && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
                  </div>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProviderSetup = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
          Setup {selectedProvider.name} OAuth Application
        </h3>
        <p className={`text-sm ${themeClasses.textSecondary} mt-2`}>
          Follow these steps to create your OAuth application
        </p>
      </div>

      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
        <h4 className={`font-medium ${themeClasses.textPrimary} mb-3`}>Step-by-Step Guide</h4>
        
        <ol className="space-y-3">
          {selectedProvider.setupSteps.map((step, index) => (
            <li key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {index + 1}
              </div>
              <span className={`text-sm ${themeClasses.textPrimary}`}>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h5 className={`font-medium ${themeClasses.textPrimary} mb-2`}>Important Information</h5>
          <div className="space-y-2 text-sm">
            <p className={themeClasses.textSecondary}>
              <strong>Redirect URI:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                {oauthConfig[selectedProvider.id].redirectUri}
              </code>
            </p>
            <p className={themeClasses.textSecondary}>
              <strong>Required Scopes:</strong>
            </p>
            <ul className="ml-4 space-y-1">
              {selectedProvider.requiredScopes.map((scope) => (
                <li key={scope} className={`text-xs ${themeClasses.textSecondary}`}>
                  • {scope}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 flex space-x-3">
          <a
            href={selectedProvider.consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Open {selectedProvider.name} Console
          </a>
          <a
            href={selectedProvider.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isDarkMode
                ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            View Documentation
          </a>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(0)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isDarkMode
              ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep(2)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          I've Created the OAuth App
        </button>
      </div>
    </div>
  );

  const renderConfiguration = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
          Configure {selectedProvider.name} OAuth
        </h3>
        <p className={`text-sm ${themeClasses.textSecondary} mt-2`}>
          Enter your OAuth application credentials
        </p>
      </div>

      {/* Basic Configuration */}
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
        <h4 className={`font-medium ${themeClasses.textPrimary} mb-4`}>OAuth Credentials</h4>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-2`}>
              Client ID *
            </label>
            <input
              type="text"
              value={oauthConfig[selectedProvider.id].clientId}
              onChange={(e) => handleConfigChange(selectedProvider.id, 'clientId', e.target.value)}
              placeholder={`Your ${selectedProvider.name} Client ID`}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-2`}>
              Client Secret *
            </label>
            <input
              type="password"
              value={oauthConfig[selectedProvider.id].clientSecret}
              onChange={(e) => handleConfigChange(selectedProvider.id, 'clientSecret', e.target.value)}
              placeholder={`Your ${selectedProvider.name} Client Secret`}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-2`}>
              Redirect URI
            </label>
            <input
              type="text"
              value={oauthConfig[selectedProvider.id].redirectUri}
              onChange={(e) => handleConfigChange(selectedProvider.id, 'redirectUri', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
              Make sure this matches the redirect URI in your OAuth application
            </p>
          </div>
        </div>
      </div>

      {/* Scope Configuration */}
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
        <h4 className={`font-medium ${themeClasses.textPrimary} mb-4`}>Permissions (Scopes)</h4>
        
        <div className="space-y-2">
          {selectedProvider.requiredScopes.map((scope) => (
            <label key={scope} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={oauthConfig[selectedProvider.id].scopes.includes(scope)}
                onChange={() => handleScopeToggle(selectedProvider.id, scope)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className={`text-sm ${themeClasses.textPrimary}`}>{scope}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Configuration Toggle */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
          className={`text-sm ${themeClasses.textSecondary} hover:${themeClasses.textPrimary} transition-colors`}
        >
          {showAdvancedConfig ? 'Hide' : 'Show'} Advanced Configuration
        </button>
      </div>

      {/* Advanced Configuration */}
      {showAdvancedConfig && (
        <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
          <h4 className={`font-medium ${themeClasses.textPrimary} mb-4`}>Manual Token Configuration</h4>
          <p className={`text-sm ${themeClasses.textSecondary} mb-4`}>
            For advanced users: manually enter tokens if you have them
          </p>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-2`}>
                Access Token
              </label>
              <textarea
                value={manualTokens[selectedProvider.id].accessToken}
                onChange={(e) => setManualTokens(prev => ({
                  ...prev,
                  [selectedProvider.id]: { ...prev[selectedProvider.id], accessToken: e.target.value }
                }))}
                rows="3"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-2`}>
                Refresh Token
              </label>
              <textarea
                value={manualTokens[selectedProvider.id].refreshToken}
                onChange={(e) => setManualTokens(prev => ({
                  ...prev,
                  [selectedProvider.id]: { ...prev[selectedProvider.id], refreshToken: e.target.value }
                }))}
                rows="3"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <button
              onClick={() => handleManualTokenSubmit(selectedProvider)}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
            >
              Save Manual Tokens
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(1)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isDarkMode
              ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          disabled={!oauthConfig[selectedProvider.id].clientId || !oauthConfig[selectedProvider.id].clientSecret}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Test Configuration
        </button>
      </div>
    </div>
  );

  const renderValidation = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
          Validate {selectedProvider.name} Configuration
        </h3>
        <p className={`text-sm ${themeClasses.textSecondary} mt-2`}>
          Test your OAuth configuration before saving
        </p>
      </div>

      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
        <h4 className={`font-medium ${themeClasses.textPrimary} mb-4`}>Configuration Summary</h4>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className={themeClasses.textSecondary}>Provider:</span>
            <span className={themeClasses.textPrimary}>{selectedProvider.name}</span>
          </div>
          <div className="flex justify-between">
            <span className={themeClasses.textSecondary}>Client ID:</span>
            <span className={`${themeClasses.textPrimary} font-mono text-xs`}>
              {oauthConfig[selectedProvider.id].clientId.substring(0, 20)}...
            </span>
          </div>
          <div className="flex justify-between">
            <span className={themeClasses.textSecondary}>Redirect URI:</span>
            <span className={`${themeClasses.textPrimary} font-mono text-xs`}>
              {oauthConfig[selectedProvider.id].redirectUri}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={themeClasses.textSecondary}>Scopes:</span>
            <span className={themeClasses.textPrimary}>
              {oauthConfig[selectedProvider.id].scopes.length} permissions
            </span>
          </div>
        </div>
      </div>

      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
        <h4 className={`font-medium ${themeClasses.textPrimary} mb-4`}>Validation Tests</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-sm ${themeClasses.textPrimary}`}>Configuration Validation</span>
            {validationStatus[selectedProvider.id] === 'testing' && (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-blue-600">Testing...</span>
              </div>
            )}
            {validationStatus[selectedProvider.id] === 'valid' && (
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-600">Valid</span>
              </div>
            )}
            {validationStatus[selectedProvider.id] === 'error' && (
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-600">Failed</span>
              </div>
            )}
          </div>

          {validationStatus[`${selectedProvider.id}_error`] && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {validationStatus[`${selectedProvider.id}_error`]}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 space-x-3">
          <button
            onClick={() => validateConfiguration(selectedProvider)}
            disabled={isTestingConnection}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {isTestingConnection ? 'Testing...' : 'Test Configuration'}
          </button>
          
          {validationStatus[selectedProvider.id] === 'valid' && (
            <button
              onClick={() => initiateOAuthFlow(selectedProvider)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
            >
              Start OAuth Flow
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(2)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isDarkMode
              ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Back to Configuration
        </button>
        
        {validationStatus[selectedProvider.id] === 'valid' && (
          <button
            onClick={() => setCurrentStep(4)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Complete Setup
          </button>
        )}
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      
      <div>
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
          {selectedProvider.name} OAuth Setup Complete!
        </h3>
        <p className={`text-sm ${themeClasses.textSecondary} mt-2`}>
          Your OAuth configuration has been saved and is ready to use
        </p>
      </div>

      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
        <h4 className={`font-medium ${themeClasses.textPrimary} mb-3`}>Next Steps</h4>
        <ul className={`text-sm ${themeClasses.textSecondary} space-y-2 text-left`}>
          <li className="flex items-start space-x-2">
            <span>•</span>
            <span>Your {selectedProvider.name} integration is now active</span>
          </li>
          <li className="flex items-start space-x-2">
            <span>•</span>
            <span>You can now use calendar and email features</span>
          </li>
          <li className="flex items-start space-x-2">
            <span>•</span>
            <span>Monitor token expiration and refresh as needed</span>
          </li>
          <li className="flex items-start space-x-2">
            <span>•</span>
            <span>Configure additional settings in the integration panels</span>
          </li>
        </ul>
      </div>

      <div className="space-x-3">
        <button
          onClick={saveConfiguration}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Save & Finish
        </button>
        <button
          onClick={() => {
            setCurrentStep(0);
            setSelectedProvider(null);
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isDarkMode
              ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Configure Another Provider
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {index + 1}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    index <= currentStep ? themeClasses.textPrimary : themeClasses.textSecondary
                  }`}>
                    {step.title}
                  </p>
                  <p className={`text-xs ${themeClasses.textSecondary}`}>
                    {step.description}
                  </p>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`flex-1 h-px mx-4 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-6`}>
        {currentStep === 0 && renderProviderSelection()}
        {currentStep === 1 && renderProviderSetup()}
        {currentStep === 2 && renderConfiguration()}
        {currentStep === 3 && renderValidation()}
        {currentStep === 4 && renderComplete()}
      </div>
    </div>
  );
};

export default OAuthConfiguration;