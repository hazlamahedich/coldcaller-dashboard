import React, { useState, useEffect } from 'react';
import { useCall } from '../contexts/CallContext';
import { callStateAnnouncer } from '../services/CallStateAnnouncer';

/**
 * CallControlsDemo - Demo component for testing call functionality
 * Shows current call state and provides test buttons
 */
const CallControlsDemo = () => {
  const { 
    isCallActive, 
    callState, 
    isMuted, 
    isOnHold, 
    callDuration,
    voiceAnnouncements,
    setVoiceAnnouncements,
    toggleMute,
    toggleHold,
    testAudio,
    initiateCall,
    endCall
  } = useCall();

  const [testPhoneNumber, setTestPhoneNumber] = useState('555-123-4567');
  const [announcerConfig, setAnnouncerConfig] = useState(callStateAnnouncer.getConfig());

  // Update announcer config display
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncerConfig(callStateAnnouncer.getConfig());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleTestCall = async () => {
    if (isCallActive) {
      await endCall();
    } else {
      await initiateCall({
        phoneNumber: testPhoneNumber,
        leadData: { id: 1, name: 'Test Contact', company: 'Demo Company' },
        source: 'demo'
      });
    }
  };

  const handleTestAnnouncement = async (state, context = {}) => {
    const success = callStateAnnouncer.announceCallState(state, {
      phoneNumber: testPhoneNumber,
      ...context
    });
    
    if (success) {
      console.log(`✅ Announced: ${state}`);
    } else {
      console.log(`❌ Failed to announce: ${state}`);
    }
  };

  const formatCallState = (state) => {
    const states = {
      'idle': '💤 Idle',
      'connecting': '📞 Connecting',
      'ringing': '🔔 Ringing',
      'active': '✅ Active',
      'hold': '⏸️ On Hold',
      'ending': '📵 Ending',
      'ended': '❌ Ended'
    };
    return states[state] || state;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        📞 Call Controls Demo
      </h3>

      {/* Current Call Status */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Current Status:</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Call State:</span>
            <span className="font-mono">{formatCallState(callState)}</span>
          </div>
          
          {isCallActive && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Duration:</span>
              <span className="font-mono">{formatDuration(callDuration)}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Muted:</span>
            <span className={isMuted ? 'text-red-600' : 'text-green-600'}>
              {isMuted ? '🔇 Yes' : '🎤 No'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">On Hold:</span>
            <span className={isOnHold ? 'text-yellow-600' : 'text-green-600'}>
              {isOnHold ? '⏸️ Yes' : '▶️ No'}
            </span>
          </div>
        </div>
      </div>

      {/* Test Phone Number */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Test Phone Number:
        </label>
        <input
          type="text"
          value={testPhoneNumber}
          onChange={(e) => setTestPhoneNumber(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="555-123-4567"
        />
      </div>

      {/* Call Controls */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={handleTestCall}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isCallActive 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isCallActive ? '📵 End Call' : '📞 Start Call'}
        </button>

        <button
          onClick={toggleMute}
          disabled={!isCallActive}
          className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isMuted 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          {isMuted ? '🔇 Unmute' : '🎤 Mute'}
        </button>

        <button
          onClick={toggleHold}
          disabled={!isCallActive && !isOnHold}
          className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isOnHold 
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isOnHold ? '▶️ Resume' : '⏸️ Hold'}
        </button>

        <button
          onClick={testAudio}
          className="px-4 py-2 rounded-lg font-medium transition-colors bg-purple-600 hover:bg-purple-700 text-white"
        >
          🎵 Test Audio
        </button>
      </div>

      {/* Voice Announcements Settings */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-3">
          🗣️ Voice Announcements
        </h4>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-blue-700 dark:text-blue-300">Enabled:</span>
          <button
            onClick={() => {
              setVoiceAnnouncements(!voiceAnnouncements);
              callStateAnnouncer.setEnabled(!voiceAnnouncements);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              voiceAnnouncements && announcerConfig.enabled
                ? 'bg-green-600 text-white' 
                : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {voiceAnnouncements && announcerConfig.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
          <div>Volume: {Math.round(announcerConfig.volume * 100)}%</div>
          <div>Voice: {announcerConfig.voiceName || 'System Default'}</div>
          <div>Queue: {announcerConfig.queueLength} items</div>
        </div>

        <button
          onClick={() => callStateAnnouncer.testAnnouncement()}
          className="w-full mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
        >
          Test Announcement
        </button>
      </div>

      {/* Test Announcements */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        {['connecting', 'ringing', 'active', 'hold', 'resumed', 'muted', 'unmuted', 'ended'].map(state => (
          <button
            key={state}
            onClick={() => handleTestAnnouncement(state, { duration: 30, reason: 'test' })}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 
                     text-gray-700 dark:text-gray-300 rounded text-xs transition-colors"
          >
            🗣️ {state}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
          ✅ Test Instructions:
        </h4>
        <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <li>• Start a call to test hold functionality</li>
          <li>• Hold button toggles on/off properly</li>
          <li>• Mute works while call is on hold</li>
          <li>• All controls remain active on hold</li>
          <li>• Voice announcements for all states</li>
        </ul>
      </div>
    </div>
  );
};

export default CallControlsDemo;