import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import OAuthConfiguration from './OAuthConfiguration';

const EmailIntegration = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const { settings, updateSetting } = useSettings();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [testEmailStatus, setTestEmailStatus] = useState('idle');
  const [showOAuthConfig, setShowOAuthConfig] = useState(false);

  // Email providers
  const emailProviders = [
    {
      id: 'gmail',
      name: 'Gmail',
      icon: '✉️',
      description: 'Connect with Gmail for email communication',
      color: 'bg-red-600',
      connected: settings.oauth?.google?.connected || false,
      features: ['Send emails', 'Email templates', 'Auto-follow-up', 'Email tracking']
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      icon: '📧',
      description: 'Connect with Outlook for professional email',
      color: 'bg-blue-600',
      connected: settings.oauth?.microsoft?.connected || false,
      features: ['Send emails', 'Email templates', 'Auto-follow-up', 'Meeting requests']
    },
    {
      id: 'smtp',
      name: 'Custom SMTP',
      icon: '🔧',
      description: 'Use any email provider with SMTP settings',
      color: 'bg-gray-600',
      connected: settings.integrations?.email?.smtp?.connected || false,
      features: ['Send emails', 'Email templates', 'Custom configuration']
    }
  ];

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState([
    {
      id: 'follow-up',
      name: 'Follow-up Email',
      subject: 'Following up on our conversation',
      body: `Hi {{leadName}},\n\nI wanted to follow up on our conversation about {{topic}}.\n\n{{customMessage}}\n\nBest regards,\n{{agentName}}`,
      variables: ['leadName', 'topic', 'customMessage', 'agentName']
    },
    {
      id: 'appointment',
      name: 'Appointment Confirmation',
      subject: 'Appointment scheduled for {{date}}',
      body: `Hi {{leadName}},\n\nThis confirms our appointment on {{date}} at {{time}}.\n\nMeeting details:\n- Topic: {{topic}}\n- Duration: {{duration}}\n- Location/Link: {{location}}\n\nLooking forward to speaking with you.\n\nBest regards,\n{{agentName}}`,
      variables: ['leadName', 'date', 'time', 'topic', 'duration', 'location', 'agentName']
    },
    {
      id: 'no-answer',
      name: 'No Answer Follow-up',
      subject: 'Missed call - Let\'s connect',
      body: `Hi {{leadName}},\n\nI tried calling you earlier but wasn't able to reach you.\n\nI'd love to discuss {{topic}} and how we can help {{company}}.\n\nWhen would be a good time for a quick call?\n\nBest regards,\n{{agentName}}\n{{phone}}`,
      variables: ['leadName', 'topic', 'company', 'agentName', 'phone']
    }
  ]);

  const [editingTemplate, setEditingTemplate] = useState(null);

  const handleOAuthConnect = async (provider) => {
    // Check if OAuth is configured
    const oauthProvider = provider.id === 'outlook' ? 'microsoft' : provider.id;
    if (!settings.oauth?.[oauthProvider]?.connected) {
      setShowOAuthConfig(true);
      return;
    }

    setIsConnecting(true);
    setSelectedProvider(provider.id);
    
    try {
      console.log(`Using existing OAuth configuration for ${provider.name}...`);
      
      // Use existing OAuth tokens for email API calls
      const oauthConfig = settings.oauth[oauthProvider];
      
      // Simulate connection process using existing OAuth tokens
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update connection status
      const emailSettings = {
        ...settings.integrations?.email,
        [provider.id]: {
          connected: true,
          oauthProvider: oauthProvider,
          connectedAt: new Date().toISOString(),
          userEmail: oauthConfig.userEmail || `user@${provider.id === 'gmail' ? 'gmail.com' : provider.id === 'outlook' ? 'outlook.com' : 'example.com'}`,
          displayName: oauthConfig.displayName || 'User'
        }
      };

      updateSetting('integrations', 'email', emailSettings);
      
    } catch (error) {
      console.error(`Failed to connect to ${provider.name}:`, error);
    } finally {
      setIsConnecting(false);
      setSelectedProvider(null);
    }
  };

  const handleSMTPConnect = () => {
    const smtpSettings = {
      host: document.getElementById('smtp-host').value,
      port: document.getElementById('smtp-port').value,
      username: document.getElementById('smtp-username').value,
      password: document.getElementById('smtp-password').value,
      secure: document.getElementById('smtp-secure').checked
    };

    const emailSettings = {
      ...settings.integrations?.email,
      smtp: {
        connected: true,
        ...smtpSettings,
        connectedAt: new Date().toISOString(),
        userEmail: smtpSettings.username,
        displayName: 'SMTP User'
      }
    };

    updateSetting('integrations', 'email', emailSettings);
  };

  const handleDisconnect = (provider) => {
    const emailSettings = {
      ...settings.integrations?.email,
      [provider.id]: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        connectedAt: null
      }
    };

    updateSetting('integrations', 'email', emailSettings);
  };

  const handleTestEmail = async (provider) => {
    setTestEmailStatus('sending');
    
    try {
      // Simulate sending test email
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestEmailStatus('success');
      setTimeout(() => setTestEmailStatus('idle'), 3000);
    } catch (error) {
      setTestEmailStatus('error');
      setTimeout(() => setTestEmailStatus('idle'), 3000);
    }
  };

  const handleSaveTemplate = (template) => {
    const updatedTemplates = emailTemplates.map(t => 
      t.id === template.id ? template : t
    );
    setEmailTemplates(updatedTemplates);
    
    // Save to settings
    updateSetting('integrations', 'emailTemplates', updatedTemplates);
    setEditingTemplate(null);
  };

  const getStatusIndicator = (provider) => {
    if (provider.connected) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-500">Not connected</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* OAuth Configuration Modal */}
      {showOAuthConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${themeClasses.cardBg} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>
                  OAuth Configuration Required
                </h2>
                <button
                  onClick={() => setShowOAuthConfig(false)}
                  className={`p-2 rounded-md transition-colors ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <OAuthConfiguration />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h3 className={`text-lg font-medium ${themeClasses.textPrimary}`}>Email Integration</h3>
        <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
          Connect your email accounts to send follow-ups and automated messages
        </p>
      </div>

      {/* Email Providers */}
      <div className="grid gap-4">
        {emailProviders.map((provider) => (
          <div
            key={provider.id}
            className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4 transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className={`w-12 h-12 ${provider.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                  {provider.icon}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${themeClasses.textPrimary}`}>{provider.name}</h4>
                  <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>{provider.description}</p>
                  
                  <div className="mt-2">
                    {getStatusIndicator(provider)}
                  </div>

                  {provider.connected && (
                    <div className={`mt-2 text-xs ${themeClasses.textSecondary}`}>
                      Connected as: {settings.integrations?.email?.[provider.id]?.userEmail || 'Unknown'}
                    </div>
                  )}
                  
                  {!provider.connected && provider.id !== 'smtp' && (
                    <div className={`mt-2 text-xs ${themeClasses.textSecondary}`}>
                      {settings.oauth?.[provider.id === 'outlook' ? 'microsoft' : provider.id]?.connected 
                        ? 'OAuth configured - ready to connect' 
                        : 'OAuth configuration required'}
                    </div>
                  )}

                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {provider.features.map((feature) => (
                        <span
                          key={feature}
                          className={`px-2 py-1 text-xs rounded-full ${
                            isDarkMode 
                              ? 'bg-gray-700 text-gray-300' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {provider.connected ? (
                  <>
                    <button
                      onClick={() => handleTestEmail(provider)}
                      disabled={testEmailStatus === 'sending'}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        testEmailStatus === 'success' 
                          ? 'bg-green-600 text-white' 
                          : testEmailStatus === 'error'
                          ? 'bg-red-600 text-white'
                          : isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600'
                          : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400'
                      }`}
                    >
                      {testEmailStatus === 'sending' ? 'Testing...' : 
                       testEmailStatus === 'success' ? 'Test Sent!' : 
                       testEmailStatus === 'error' ? 'Test Failed' : 'Test Email'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(provider)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        isDarkMode
                          ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Disconnect
                    </button>
                  </>
                ) : provider.id === 'smtp' ? (
                  <button
                    onClick={() => setEditingTemplate('smtp-config')}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Configure SMTP
                  </button>
                ) : (
                  <button
                    onClick={() => handleOAuthConnect(provider)}
                    disabled={isConnecting && selectedProvider === provider.id}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      settings.oauth?.[provider.id === 'outlook' ? 'microsoft' : provider.id]?.connected
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                  >
                    {isConnecting && selectedProvider === provider.id ? 'Connecting...' : 
                     settings.oauth?.[provider.id === 'outlook' ? 'microsoft' : provider.id]?.connected 
                       ? 'Connect' 
                       : 'Setup OAuth'}
                  </button>
                )}
              </div>
            </div>

            {/* SMTP Configuration Form */}
            {editingTemplate === 'smtp-config' && provider.id === 'smtp' && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h5 className={`font-medium ${themeClasses.textPrimary} mb-3`}>SMTP Configuration</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                      SMTP Host
                    </label>
                    <input
                      id="smtp-host"
                      type="text"
                      placeholder="smtp.example.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                      Port
                    </label>
                    <input
                      id="smtp-port"
                      type="number"
                      placeholder="587"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                      Username
                    </label>
                    <input
                      id="smtp-username"
                      type="text"
                      placeholder="your-email@example.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                      Password
                    </label>
                    <input
                      id="smtp-password"
                      type="password"
                      placeholder="Your app password"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center">
                  <input
                    id="smtp-secure"
                    type="checkbox"
                    defaultChecked={true}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="smtp-secure" className={`ml-2 text-sm ${themeClasses.textPrimary}`}>
                    Use secure connection (TLS/SSL)
                  </label>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={handleSMTPConnect}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Configuration
                  </button>
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isDarkMode
                        ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Email Templates */}
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className={`font-medium ${themeClasses.textPrimary}`}>Email Templates</h4>
          <button
            onClick={() => setEditingTemplate('new')}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Template
          </button>
        </div>

        <div className="space-y-3">
          {emailTemplates.map((template) => (
            <div key={template.id} className={`border ${themeClasses.border} rounded-lg p-3`}>
              <div className="flex items-center justify-between">
                <div>
                  <h5 className={`font-medium ${themeClasses.textPrimary}`}>{template.name}</h5>
                  <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>{template.subject}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.variables.map((variable) => (
                      <span
                        key={variable}
                        className={`px-2 py-0.5 text-xs rounded ${
                          isDarkMode 
                            ? 'bg-blue-900/30 text-blue-300' 
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setEditingTemplate(template)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isDarkMode
                      ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-send Settings */}
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
        <h4 className={`font-medium ${themeClasses.textPrimary} mb-3`}>Auto-send Settings</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>Send follow-up after no answer</p>
              <p className={`text-xs ${themeClasses.textSecondary}`}>Automatically send email when call goes to voicemail</p>
            </div>
            <input
              type="checkbox"
              checked={settings.integrations?.email?.autoFollowUp || false}
              onChange={(e) => updateSetting('integrations', 'email', {
                ...settings.integrations?.email,
                autoFollowUp: e.target.checked
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>Send appointment confirmations</p>
              <p className={`text-xs ${themeClasses.textSecondary}`}>Auto-send email when appointments are scheduled</p>
            </div>
            <input
              type="checkbox"
              checked={settings.integrations?.email?.autoConfirmation || false}
              onChange={(e) => updateSetting('integrations', 'email', {
                ...settings.integrations?.email,
                autoConfirmation: e.target.checked
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailIntegration;