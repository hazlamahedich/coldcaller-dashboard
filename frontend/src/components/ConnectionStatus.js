import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

const ConnectionStatus = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const { settings } = useSettings();
  const [connectionStatuses, setConnectionStatuses] = useState({
    calendar: { status: 'checking', lastSync: null, errorCount: 0 },
    email: { status: 'checking', lastSync: null, errorCount: 0 },
    crm: { status: 'checking', lastSync: null, errorCount: 0 }
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Simulate connection status checking
    const checkConnections = async () => {
      const newStatuses = { ...connectionStatuses };

      // Check calendar connections
      const calendarConnected = Object.values(settings.integrations?.calendar || {})
        .some(provider => provider?.connected);
      newStatuses.calendar = {
        status: calendarConnected ? 'connected' : 'disconnected',
        lastSync: calendarConnected ? new Date(Date.now() - Math.random() * 300000) : null,
        errorCount: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0,
        connectedProviders: Object.entries(settings.integrations?.calendar || {})
          .filter(([key, provider]) => provider?.connected)
          .map(([key, provider]) => key)
      };

      // Check email connections
      const emailConnected = Object.values(settings.integrations?.email || {})
        .some(provider => provider?.connected);
      newStatuses.email = {
        status: emailConnected ? 'connected' : 'disconnected',
        lastSync: emailConnected ? new Date(Date.now() - Math.random() * 600000) : null,
        errorCount: Math.random() > 0.9 ? Math.floor(Math.random() * 2) : 0,
        connectedProviders: Object.entries(settings.integrations?.email || {})
          .filter(([key, provider]) => provider?.connected)
          .map(([key, provider]) => key)
      };

      // Check CRM connection
      const crmConnected = settings.integrations?.crmEnabled;
      newStatuses.crm = {
        status: crmConnected ? 'connected' : 'disconnected',
        lastSync: crmConnected ? new Date(Date.now() - Math.random() * 900000) : null,
        errorCount: Math.random() > 0.85 ? Math.floor(Math.random() * 5) : 0
      };

      setConnectionStatuses(newStatuses);
    };

    checkConnections();
    
    // Update every 30 seconds
    const interval = setInterval(checkConnections, 30000);
    return () => clearInterval(interval);
  }, [settings.integrations]);

  const getStatusIcon = (status, errorCount) => {
    if (errorCount > 0) {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <svg className="w-3 h-3 ml-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }

    switch (status) {
      case 'connected':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'connecting':
      case 'syncing':
        return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>;
      case 'disconnected':
        return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>;
    }
  };

  const getStatusText = (status, errorCount) => {
    if (errorCount > 0) {
      return `Warning (${errorCount} ${errorCount === 1 ? 'issue' : 'issues'})`;
    }
    
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'syncing': return 'Syncing...';
      case 'disconnected': return 'Not connected';
      case 'error': return 'Connection error';
      default: return 'Checking...';
    }
  };

  const getStatusColor = (status, errorCount) => {
    if (errorCount > 0) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    
    switch (status) {
      case 'connected': return 'text-green-600 dark:text-green-400';
      case 'connecting':
      case 'syncing': return 'text-blue-600 dark:text-blue-400';
      case 'disconnected': return 'text-gray-500';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatLastSync = (lastSync) => {
    if (!lastSync) return 'Never';
    
    const now = new Date();
    const diffMs = now - lastSync;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSync.toLocaleDateString();
  };

  const hasActiveConnections = Object.values(connectionStatuses)
    .some(conn => conn.status === 'connected');

  const totalErrors = Object.values(connectionStatuses)
    .reduce((sum, conn) => sum + conn.errorCount, 0);

  if (!hasActiveConnections && !isExpanded) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-auto'
    }`}>
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-lg shadow-lg overflow-hidden`}>
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {getStatusIcon(
                totalErrors > 0 ? 'warning' : 'connected',
                totalErrors
              )}
            </div>
            <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>
              Integration Status
            </span>
            {totalErrors > 0 && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
                {totalErrors} {totalErrors === 1 ? 'issue' : 'issues'}
              </span>
            )}
          </div>
          <svg 
            className={`w-4 h-4 ${themeClasses.textSecondary} transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-3 pb-3">
            <div className="space-y-3">
              {/* Calendar Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(connectionStatuses.calendar.status, connectionStatuses.calendar.errorCount)}
                    <span className={`text-sm ${themeClasses.textPrimary}`}>Calendar</span>
                  </div>
                  {connectionStatuses.calendar.connectedProviders?.length > 0 && (
                    <div className="flex space-x-1">
                      {connectionStatuses.calendar.connectedProviders.map(provider => (
                        <span
                          key={provider}
                          className={`px-1.5 py-0.5 text-xs rounded ${
                            isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {provider}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-xs ${getStatusColor(connectionStatuses.calendar.status, connectionStatuses.calendar.errorCount)}`}>
                    {getStatusText(connectionStatuses.calendar.status, connectionStatuses.calendar.errorCount)}
                  </div>
                  <div className={`text-xs ${themeClasses.textSecondary}`}>
                    {formatLastSync(connectionStatuses.calendar.lastSync)}
                  </div>
                </div>
              </div>

              {/* Email Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(connectionStatuses.email.status, connectionStatuses.email.errorCount)}
                    <span className={`text-sm ${themeClasses.textPrimary}`}>Email</span>
                  </div>
                  {connectionStatuses.email.connectedProviders?.length > 0 && (
                    <div className="flex space-x-1">
                      {connectionStatuses.email.connectedProviders.map(provider => (
                        <span
                          key={provider}
                          className={`px-1.5 py-0.5 text-xs rounded ${
                            isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {provider}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-xs ${getStatusColor(connectionStatuses.email.status, connectionStatuses.email.errorCount)}`}>
                    {getStatusText(connectionStatuses.email.status, connectionStatuses.email.errorCount)}
                  </div>
                  <div className={`text-xs ${themeClasses.textSecondary}`}>
                    {formatLastSync(connectionStatuses.email.lastSync)}
                  </div>
                </div>
              </div>

              {/* CRM Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(connectionStatuses.crm.status, connectionStatuses.crm.errorCount)}
                  <span className={`text-sm ${themeClasses.textPrimary}`}>CRM</span>
                </div>
                <div className="text-right">
                  <div className={`text-xs ${getStatusColor(connectionStatuses.crm.status, connectionStatuses.crm.errorCount)}`}>
                    {getStatusText(connectionStatuses.crm.status, connectionStatuses.crm.errorCount)}
                  </div>
                  <div className={`text-xs ${themeClasses.textSecondary}`}>
                    {formatLastSync(connectionStatuses.crm.lastSync)}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {totalErrors > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    // This would typically navigate to settings or trigger a reconnection
                    console.log('Opening settings to fix connection issues...');
                  }}
                  className="w-full px-3 py-2 text-xs bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 transition-colors"
                >
                  Fix Connection Issues
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;