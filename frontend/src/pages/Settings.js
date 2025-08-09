import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import ThemeToggle from '../components/ThemeToggle';

function Settings() {
  const { isDarkMode, themeClasses } = useTheme();
  const { settings, updateSetting, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('general');

  const handleSettingChange = (category, key, value) => {
    updateSetting(category, key, value);
  };

  const handleSaveSettings = () => {
    // Settings are automatically saved via context
    alert('Settings saved successfully!');
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '🏠' },
    { id: 'calling', name: 'Calling', icon: '📞' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'integrations', name: 'Integrations', icon: '🔗' }
  ];

  const InputField = ({ label, type = 'text', value, onChange, placeholder, disabled = false }) => (
    <div>
      <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          isDarkMode 
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  );

  const CheckboxField = ({ label, checked, onChange, description }) => (
    <div className="flex items-start space-x-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <div>
        <label className={`text-sm font-medium ${themeClasses.textPrimary} cursor-pointer`}>
          {label}
        </label>
        {description && (
          <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>{description}</p>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Full Name"
                  value={settings.general.userName}
                  onChange={(value) => handleSettingChange('general', 'userName', value)}
                  placeholder="Enter your full name"
                />
                <InputField
                  label="Email Address"
                  type="email"
                  value={settings.general.email}
                  onChange={(value) => handleSettingChange('general', 'email', value)}
                  placeholder="Enter your email"
                />
                <InputField
                  label="Company"
                  value={settings.general.company}
                  onChange={(value) => handleSettingChange('general', 'company', value)}
                  placeholder="Enter your company name"
                />
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                    Timezone
                  </label>
                  <select
                    value={settings.general.timezone}
                    onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>Application Settings</h3>
              
              {/* Mock Data Toggle */}
              <div className="space-y-4 mb-6">
                <CheckboxField
                  label="Use Demo Data"
                  checked={settings.general.useMockData}
                  onChange={(value) => handleSettingChange('general', 'useMockData', value)}
                  description="Show demo leads and data for testing purposes. Disable for production use with real data."
                />
              </div>
              
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${themeClasses.textPrimary}`}>Dark Mode</p>
                  <p className={`text-xs ${themeClasses.textSecondary}`}>Toggle between light and dark themes</p>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        );

      case 'calling':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>Call Behavior</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                    Auto-dial Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={settings.calling.autoDialDelay}
                    onChange={(e) => handleSettingChange('calling', 'autoDialDelay', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textPrimary} mb-1`}>
                    Max Call Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={settings.calling.maxCallDuration}
                    onChange={(e) => handleSettingChange('calling', 'maxCallDuration', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <InputField
                  label="Dial Prefix"
                  value={settings.calling.dialPrefix}
                  onChange={(value) => handleSettingChange('calling', 'dialPrefix', value)}
                  placeholder="+1"
                />
              </div>
            </div>

            <div>
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>SIP Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="SIP Server"
                  value={settings.calling.sipServer}
                  onChange={(value) => handleSettingChange('calling', 'sipServer', value)}
                  placeholder="sip.example.com"
                />
                <InputField
                  label="SIP Port"
                  value={settings.calling.sipPort}
                  onChange={(value) => handleSettingChange('calling', 'sipPort', value)}
                  placeholder="5060"
                />
              </div>
            </div>

            <div>
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>Recording & Privacy</h3>
              <CheckboxField
                label="Enable Call Recording"
                checked={settings.calling.enableCallRecording}
                onChange={(value) => handleSettingChange('calling', 'enableCallRecording', value)}
                description="Record calls for quality assurance and training purposes"
              />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>Notification Preferences</h3>
              <div className="space-y-4">
                <CheckboxField
                  label="Email Notifications"
                  checked={settings.notifications.emailNotifications}
                  onChange={(value) => handleSettingChange('notifications', 'emailNotifications', value)}
                  description="Receive important updates and summaries via email"
                />
                <CheckboxField
                  label="Desktop Notifications"
                  checked={settings.notifications.desktopNotifications}
                  onChange={(value) => handleSettingChange('notifications', 'desktopNotifications', value)}
                  description="Show browser notifications for incoming calls and updates"
                />
                <CheckboxField
                  label="Sound Alerts"
                  checked={settings.notifications.soundAlerts}
                  onChange={(value) => handleSettingChange('notifications', 'soundAlerts', value)}
                  description="Play audio alerts for calls and notifications"
                />
                <CheckboxField
                  label="Daily Reports"
                  checked={settings.notifications.dailyReports}
                  onChange={(value) => handleSettingChange('notifications', 'dailyReports', value)}
                  description="Receive daily performance reports via email"
                />
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>CRM Integration</h3>
              <div className="space-y-4">
                <CheckboxField
                  label="Enable CRM Integration"
                  checked={settings.integrations.crmEnabled}
                  onChange={(value) => handleSettingChange('integrations', 'crmEnabled', value)}
                  description="Connect to your CRM system for lead synchronization"
                />
                
                {settings.integrations.crmEnabled && (
                  <div className="grid grid-cols-1 gap-4 pl-7">
                    <InputField
                      label="CRM URL"
                      value={settings.integrations.crmUrl}
                      onChange={(value) => handleSettingChange('integrations', 'crmUrl', value)}
                      placeholder="https://your-crm.example.com"
                    />
                    <InputField
                      label="API Key"
                      type="password"
                      value={settings.integrations.apiKey}
                      onChange={(value) => handleSettingChange('integrations', 'apiKey', value)}
                      placeholder="Enter your CRM API key"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className={`text-lg font-medium ${themeClasses.textPrimary} mb-4`}>Webhook Configuration</h3>
              <InputField
                label="Webhook URL"
                value={settings.integrations.webhookUrl}
                onChange={(value) => handleSettingChange('integrations', 'webhookUrl', value)}
                placeholder="https://your-webhook.example.com/endpoint"
              />
              <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                Receive real-time updates about calls and lead activities
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>Settings</h1>
        <p className={`text-sm ${themeClasses.textSecondary}`}>Manage your account, calling preferences, and integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border}`}>
            <div className="p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : `${themeClasses.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-700/50`
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border}`}>
            <div className="p-6">
              {renderTabContent()}
            </div>

            {/* Action Buttons */}
            <div className={`px-6 py-4 border-t ${themeClasses.border} flex justify-end space-x-3`}>
              <button 
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;