import React, { useState, useEffect } from 'react';

/**
 * RecordingSettings Component - Controls automatic call recording preferences
 * Provides toggle switches for recording settings with persistence
 */

const RecordingSettings = ({ 
  className = "",
  compact = false,
  onSettingsChange = null 
}) => {
  // Recording preference states
  const [autoRecord, setAutoRecord] = useState(true);
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [recordInbound, setRecordInbound] = useState(true);
  const [recordOutbound, setRecordOutbound] = useState(true);
  const [speechAnalytics, setSpeechAnalytics] = useState(true);
  
  // UI states
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('callRecordingSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAutoRecord(settings.autoRecord ?? true);
        setAutoTranscribe(settings.autoTranscribe ?? true);
        setRecordInbound(settings.recordInbound ?? true);
        setRecordOutbound(settings.recordOutbound ?? true);
        setSpeechAnalytics(settings.speechAnalytics ?? true);
      } catch (error) {
        console.error('Failed to load recording settings:', error);
      }
    }
  }, []);

  // Save settings and trigger callback when changes occur
  const saveSettings = (newSettings) => {
    const settings = {
      autoRecord: newSettings.autoRecord ?? autoRecord,
      autoTranscribe: newSettings.autoTranscribe ?? autoTranscribe,
      recordInbound: newSettings.recordInbound ?? recordInbound,
      recordOutbound: newSettings.recordOutbound ?? recordOutbound,
      speechAnalytics: newSettings.speechAnalytics ?? speechAnalytics,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('callRecordingSettings', JSON.stringify(settings));
    
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
    
    setHasChanges(false);
    
    // Show confirmation
    console.log('✅ Recording settings saved:', settings);
  };

  // Handle main recording toggle
  const handleAutoRecordChange = (enabled) => {
    setAutoRecord(enabled);
    setHasChanges(true);
    
    const newSettings = { autoRecord: enabled };
    
    // If disabling recording, also disable transcription
    if (!enabled) {
      setAutoTranscribe(false);
      setSpeechAnalytics(false);
      newSettings.autoTranscribe = false;
      newSettings.speechAnalytics = false;
    }
    
    saveSettings(newSettings);
  };

  // Handle transcription toggle
  const handleAutoTranscribeChange = (enabled) => {
    setAutoTranscribe(enabled);
    setHasChanges(true);
    
    const newSettings = { autoTranscribe: enabled };
    
    // If enabling transcription, also enable recording
    if (enabled && !autoRecord) {
      setAutoRecord(true);
      newSettings.autoRecord = true;
    }
    
    // If disabling transcription, also disable speech analytics
    if (!enabled) {
      setSpeechAnalytics(false);
      newSettings.speechAnalytics = false;
    }
    
    saveSettings(newSettings);
  };

  // Handle speech analytics toggle
  const handleSpeechAnalyticsChange = (enabled) => {
    setSpeechAnalytics(enabled);
    setHasChanges(true);
    
    const newSettings = { speechAnalytics: enabled };
    
    // If enabling analytics, also enable transcription and recording
    if (enabled) {
      if (!autoTranscribe) {
        setAutoTranscribe(true);
        newSettings.autoTranscribe = true;
      }
      if (!autoRecord) {
        setAutoRecord(true);
        newSettings.autoRecord = true;
      }
    }
    
    saveSettings(newSettings);
  };

  // Handle direction toggles
  const handleDirectionChange = (direction, enabled) => {
    setHasChanges(true);
    
    if (direction === 'inbound') {
      setRecordInbound(enabled);
      saveSettings({ recordInbound: enabled });
    } else {
      setRecordOutbound(enabled);
      saveSettings({ recordOutbound: enabled });
    }
  };

  // Get current settings for API calls
  const getCurrentSettings = () => ({
    autoRecord,
    autoTranscribe,
    recordInbound,
    recordOutbound,
    speechAnalytics
  });

  // Expose getCurrentSettings to parent components
  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(getCurrentSettings());
    }
  }, [autoRecord, autoTranscribe, recordInbound, recordOutbound, speechAnalytics]);

  // Toggle component for reusability
  const Toggle = ({ enabled, onChange, label, description = null, disabled = false }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <div className="flex items-center">
          <span className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {label}
          </span>
        </div>
        {description && (
          <p className={`text-xs mt-1 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
            {description}
          </p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer ml-4">
        <input
          type="checkbox"
          className="sr-only"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
          enabled ? 'bg-green-500' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out ${
            enabled ? 'transform translate-x-5' : ''
          }`} />
        </div>
      </label>
    </div>
  );

  // Compact view for integration into other components
  if (compact && !isExpanded) {
    return (
      <div className={`inline-flex items-center space-x-3 ${className}`}>
        <Toggle
          enabled={autoRecord}
          onChange={handleAutoRecordChange}
          label="📹 Auto Record"
        />
        <button
          onClick={() => setIsExpanded(true)}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          More Options
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <span className="text-lg font-semibold text-gray-800">📹 Recording Settings</span>
          {hasChanges && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Changes Saved
            </span>
          )}
        </div>
        {compact && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        )}
      </div>

      {/* Main Settings */}
      <div className="p-4 space-y-1">
        <Toggle
          enabled={autoRecord}
          onChange={handleAutoRecordChange}
          label="🎙️ Automatic Call Recording"
          description="Automatically record all phone calls by default"
        />
        
        <Toggle
          enabled={autoTranscribe}
          onChange={handleAutoTranscribeChange}
          label="📝 Automatic Transcription"
          description="Convert recordings to text using AI transcription"
          disabled={!autoRecord}
        />
        
        <Toggle
          enabled={speechAnalytics}
          onChange={handleSpeechAnalyticsChange}
          label="📊 Speech Analytics"
          description="Analyze sentiment, talk ratio, and conversation insights"
          disabled={!autoTranscribe}
        />
      </div>

      {/* Advanced Settings */}
      <div className="border-t border-gray-200">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">⚙️ Advanced Settings</span>
          <span className={`text-gray-400 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        
        {showAdvanced && (
          <div className="px-4 pb-4 space-y-1 bg-gray-50">
            <Toggle
              enabled={recordInbound}
              onChange={(enabled) => handleDirectionChange('inbound', enabled)}
              label="📞 Record Inbound Calls"
              description="Record calls received by your system"
              disabled={!autoRecord}
            />
            
            <Toggle
              enabled={recordOutbound}
              onChange={(enabled) => handleDirectionChange('outbound', enabled)}
              label="📱 Record Outbound Calls"
              description="Record calls made from your system"
              disabled={!autoRecord}
            />
            
            <div className="pt-3 border-t border-gray-200 mt-3">
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Storage:</strong> Recordings are stored securely with Twilio</p>
                <p><strong>Transcription:</strong> {autoTranscribe ? (
                  process.env.REACT_APP_ENVIRONMENT === 'production' 
                    ? 'OpenAI Whisper API (production)'
                    : 'Docker Whisper (local testing)'
                ) : 'Disabled'}</p>
                <p><strong>Privacy:</strong> Call recording laws may require disclosure</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="px-4 py-3 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Recording Status:</span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            autoRecord 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            <span className="mr-1">
              {autoRecord ? '🟢' : '🔴'}
            </span>
            {autoRecord ? 'Active' : 'Disabled'}
          </span>
        </div>
        
        {autoRecord && (
          <div className="mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>📝 Transcription: {autoTranscribe ? 'On' : 'Off'}</span>
              <span>📊 Analytics: {speechAnalytics ? 'On' : 'Off'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export both the component and a hook for getting current settings
export const useRecordingSettings = () => {
  const [settings, setSettings] = useState({
    autoRecord: true,
    autoTranscribe: true,
    recordInbound: true,
    recordOutbound: true,
    speechAnalytics: true
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('callRecordingSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to load recording settings:', error);
      }
    }
  }, []);

  return settings;
};

export default RecordingSettings;