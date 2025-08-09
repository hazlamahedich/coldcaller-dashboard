import React, { createContext, useContext, useState, useEffect } from 'react';

// Create Settings Context
const SettingsContext = createContext();

// Custom hook to use Settings Context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Settings Provider Component
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    general: {
      userName: 'John Doe',
      email: 'john.doe@example.com',
      company: 'Sales Pro Inc.',
      timezone: 'America/New_York',
      useMockData: true // Default to true for development
    },
    calling: {
      autoDialDelay: 2,
      maxCallDuration: 30,
      enableCallRecording: true,
      dialPrefix: '+1',
      sipServer: 'sip.example.com',
      sipPort: '5060'
    },
    notifications: {
      emailNotifications: true,
      desktopNotifications: true,
      soundAlerts: true,
      dailyReports: false
    },
    integrations: {
      crmEnabled: false,
      crmUrl: '',
      apiKey: '',
      webhookUrl: ''
    }
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('coldcaller-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
        console.log('✅ Settings loaded from localStorage');
      } catch (error) {
        console.error('❌ Failed to parse saved settings:', error);
      }
    }
  }, []);

  // Update a specific setting
  const updateSetting = (category, key, value) => {
    setSettings(prevSettings => {
      const newSettings = {
        ...prevSettings,
        [category]: {
          ...prevSettings[category],
          [key]: value
        }
      };

      // Save to localStorage
      localStorage.setItem('coldcaller-settings', JSON.stringify(newSettings));
      console.log(`✅ Setting updated: ${category}.${key} = ${value}`);

      return newSettings;
    });
  };

  // Bulk update settings
  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('coldcaller-settings', JSON.stringify(newSettings));
    console.log('✅ All settings saved');
  };

  // Reset to defaults
  const resetSettings = () => {
    const defaultSettings = {
      general: {
        userName: '',
        email: '',
        company: '',
        timezone: 'America/New_York',
        useMockData: false // Default to false for production
      },
      calling: {
        autoDialDelay: 2,
        maxCallDuration: 30,
        enableCallRecording: false,
        dialPrefix: '+1',
        sipServer: '',
        sipPort: '5060'
      },
      notifications: {
        emailNotifications: false,
        desktopNotifications: false,
        soundAlerts: false,
        dailyReports: false
      },
      integrations: {
        crmEnabled: false,
        crmUrl: '',
        apiKey: '',
        webhookUrl: ''
      }
    };

    setSettings(defaultSettings);
    localStorage.setItem('coldcaller-settings', JSON.stringify(defaultSettings));
    console.log('✅ Settings reset to defaults');
  };

  // Clear all settings
  const clearSettings = () => {
    localStorage.removeItem('coldcaller-settings');
    console.log('✅ Settings cleared from localStorage');
  };

  const contextValue = {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    clearSettings,
    
    // Convenience getters
    useMockData: settings.general.useMockData,
    isDemoMode: settings.general.useMockData, // Alternative name
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;