import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import OAuthConfiguration from './OAuthConfiguration';

const CalendarIntegration = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const { settings, updateSetting } = useSettings();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastSync, setLastSync] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [showOAuthConfig, setShowOAuthConfig] = useState(false);

  // Mock calendar providers
  const calendarProviders = [
    {
      id: 'google',
      name: 'Google Calendar',
      icon: '📅',
      description: 'Sync with Google Calendar for appointment scheduling',
      color: 'bg-blue-600',
      connected: settings.oauth?.google?.connected || false
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      icon: '📆',
      description: 'Connect with Outlook calendar for meetings',
      color: 'bg-blue-500',
      connected: settings.oauth?.microsoft?.connected || false
    },
    {
      id: 'apple',
      name: 'Apple Calendar',
      icon: '🍎',
      description: 'Sync with iCloud calendar',
      color: 'bg-gray-800',
      connected: settings.integrations?.calendar?.apple?.connected || false
    }
  ];

  const handleOAuthConnect = async (provider) => {
    // Check if OAuth is configured
    const oauthProvider = provider.id === 'outlook' ? 'microsoft' : provider.id;
    if (!settings.oauth?.[oauthProvider]?.connected) {
      setShowOAuthConfig(true);
      return;
    }

    setIsConnecting(true);
    
    try {
      console.log(`Using existing OAuth configuration for ${provider.name}...`);
      
      // Use existing OAuth tokens for calendar API calls
      const oauthConfig = settings.oauth[oauthProvider];
      
      // Simulate connection process using existing OAuth tokens
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update connection status
      const calendarSettings = {
        ...settings.integrations?.calendar,
        [provider.id]: {
          connected: true,
          oauthProvider: oauthProvider,
          connectedAt: new Date().toISOString(),
          userEmail: oauthConfig.userEmail || `user@${provider.id}.com`,
          calendarName: `${provider.name} - Primary`
        }
      };

      updateSetting('integrations', 'calendar', calendarSettings);
      setConnectionStatus('connected');
      setLastSync(new Date());
      
    } catch (error) {
      console.error(`Failed to connect to ${provider.name}:`, error);
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = (provider) => {
    const calendarSettings = {
      ...settings.integrations?.calendar,
      [provider.id]: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        connectedAt: null
      }
    };

    updateSetting('integrations', 'calendar', calendarSettings);
    setConnectionStatus('disconnected');
  };

  const handleSyncNow = async () => {
    setSyncStatus('syncing');
    
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 3000));
      setLastSync(new Date());
      setSyncStatus('success');
      
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
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

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Syncing...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Sync complete</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Sync failed</span>
          </div>
        );
      default:
        return null;
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-medium ${themeClasses.textPrimary}`}>Calendar Integration</h3>
          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
            Connect your calendar to schedule follow-ups and sync call appointments
          </p>
        </div>
        
        {lastSync && (
          <div className={`text-xs ${themeClasses.textSecondary} flex items-center space-x-2`}>
            <span>Last sync: {lastSync.toLocaleString()}</span>
            {getSyncStatusIcon()}
          </div>
        )}
      </div>

      {/* Calendar Providers */}
      <div className="grid gap-4">
        {calendarProviders.map((provider) => (
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
                      Connected as: {settings.integrations?.calendar?.[provider.id]?.userEmail || 'Unknown'}
                    </div>
                  )}
                  
                  {!provider.connected && provider.id !== 'apple' && (
                    <div className={`mt-2 text-xs ${themeClasses.textSecondary}`}>
                      {settings.oauth?.[provider.id === 'outlook' ? 'microsoft' : provider.id]?.connected 
                        ? 'OAuth configured - ready to connect' 
                        : 'OAuth configuration required'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {provider.connected ? (
                  <>
                    <button
                      onClick={handleSyncNow}
                      disabled={syncStatus === 'syncing'}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600'
                          : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400'
                      }`}
                    >
                      {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
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
                ) : provider.id === 'apple' ? (
                  <button
                    disabled={true}
                    className="px-4 py-2 bg-gray-400 text-white text-sm font-medium rounded-md cursor-not-allowed"
                    title="Apple Calendar integration coming soon"
                  >
                    Coming Soon
                  </button>
                ) : (
                  <button
                    onClick={() => handleOAuthConnect(provider)}
                    disabled={isConnecting}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      settings.oauth?.[provider.id === 'outlook' ? 'microsoft' : provider.id]?.connected
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                  >
                    {isConnecting ? 'Connecting...' : 
                     settings.oauth?.[provider.id === 'outlook' ? 'microsoft' : provider.id]?.connected 
                       ? 'Connect' 
                       : 'Setup OAuth'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sync Settings */}
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg p-4`}>
        <h4 className={`font-medium ${themeClasses.textPrimary} mb-3`}>Sync Settings</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>Auto-sync frequency</p>
              <p className={`text-xs ${themeClasses.textSecondary}`}>How often to sync calendar events</p>
            </div>
            <select
              value={settings.integrations?.calendar?.syncFrequency || '15'}
              onChange={(e) => updateSetting('integrations', 'calendar', {
                ...settings.integrations?.calendar,
                syncFrequency: e.target.value
              })}
              className={`px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="5">Every 5 minutes</option>
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every hour</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>Create events for calls</p>
              <p className={`text-xs ${themeClasses.textSecondary}`}>Automatically create calendar events for scheduled calls</p>
            </div>
            <input
              type="checkbox"
              checked={settings.integrations?.calendar?.autoCreateEvents || false}
              onChange={(e) => updateSetting('integrations', 'calendar', {
                ...settings.integrations?.calendar,
                autoCreateEvents: e.target.checked
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>Two-way sync</p>
              <p className={`text-xs ${themeClasses.textSecondary}`}>Sync changes both ways between calendar and CRM</p>
            </div>
            <input
              type="checkbox"
              checked={settings.integrations?.calendar?.twoWaySync || false}
              onChange={(e) => updateSetting('integrations', 'calendar', {
                ...settings.integrations?.calendar,
                twoWaySync: e.target.checked
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarIntegration;