import React, { useState, useEffect } from 'react';
import TwilioVoicePanel from './TwilioVoicePanel';
import VOIPPhone from './VOIPPhone';

/**
 * Enhanced VOIP Phone Component
 * Unified interface supporting both Twilio Voice and SIP/WebRTC
 */
const EnhancedVOIPPhone = ({ lead, onCallStatusChange, sipConfig = null }) => {
  const [voipProvider, setVoipProvider] = useState('twilio'); // 'twilio' or 'sip'
  const [isProviderEnabled, setIsProviderEnabled] = useState(false);

  useEffect(() => {
    // Check which providers are available
    checkProviderAvailability();
  }, []);

  const checkProviderAvailability = () => {
    // Check if Twilio is enabled
    const twilioEnabled = process.env.REACT_APP_ENABLE_TWILIO_VOICE === 'true';
    
    // For now, default to Twilio if available, otherwise SIP
    if (twilioEnabled) {
      setVoipProvider('twilio');
      setIsProviderEnabled(true);
    } else if (sipConfig) {
      setVoipProvider('sip');
      setIsProviderEnabled(true);
    } else {
      setIsProviderEnabled(false);
    }
  };

  const handleProviderChange = (provider) => {
    setVoipProvider(provider);
  };

  const handleCallStateChange = (status, call) => {
    console.log(`Call state changed: ${status}`, call);
    if (onCallStatusChange) {
      onCallStatusChange(status, call, lead);
    }
  };

  if (!isProviderEnabled) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">📞</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">VOIP Not Configured</h3>
          <p className="text-gray-600 mb-4">
            No VOIP providers are currently configured. Please set up either Twilio Voice or SIP/WebRTC integration.
          </p>
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <strong>Setup Instructions:</strong>
            <ul className="list-disc list-inside mt-2 text-left">
              <li>For Twilio: Set <code>REACT_APP_ENABLE_TWILIO_VOICE=true</code></li>
              <li>For SIP: Configure SIP settings in your environment</li>
              <li>See <code>TWILIO_SETUP_GUIDE.md</code> for detailed instructions</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Provider Selection Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          📞 Voice Communication
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({voipProvider === 'twilio' ? 'Twilio Voice' : 'SIP/WebRTC'})
          </span>
        </h2>
        
        <div className="flex items-center space-x-4">
          {/* Provider Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleProviderChange('twilio')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                voipProvider === 'twilio'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🎯 Twilio
            </button>
            <button
              onClick={() => handleProviderChange('sip')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                voipProvider === 'sip'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🌐 SIP
            </button>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-600">Ready</span>
          </div>
        </div>
      </div>

      {/* Provider Content */}
      <div className="p-6">
        {voipProvider === 'twilio' ? (
          <div className="space-y-4">
            {/* Twilio Feature Highlights */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">🎯 Twilio Voice Features</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>HD Voice Quality</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Call Recording</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Global Connectivity</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Advanced Analytics</span>
                </div>
              </div>
            </div>
            
            <TwilioVoicePanel
              leadData={lead}
              onCallStateChange={handleCallStateChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* SIP Feature Highlights */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">🌐 SIP/WebRTC Features</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Direct SIP Integration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Low Latency</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Custom SIP Providers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Advanced Controls</span>
                </div>
              </div>
            </div>

            <VOIPPhone
              leadInfo={lead}
              onCallLogged={(callData) => {
                console.log('SIP Call logged:', callData);
                // Integrate with your call logging system
              }}
              sipConfig={sipConfig}
            />
          </div>
        )}
      </div>

      {/* Provider Comparison Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Need help choosing?</strong> 
          </p>
          <div className="text-xs text-gray-500 space-x-4">
            <span>💡 <strong>Twilio:</strong> Best for quick setup and reliability</span>
            <span>•</span>
            <span>🔧 <strong>SIP:</strong> Best for custom integrations and control</span>
            <span>•</span>
            <span>📖 See <code>TWILIO_SETUP_GUIDE.md</code> for setup instructions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedVOIPPhone;