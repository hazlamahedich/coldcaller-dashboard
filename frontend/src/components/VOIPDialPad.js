import React, { useState, useEffect, useCallback } from 'react';
import { voipService } from '../services';

// VOIPDialPad - Enhanced DialPad with SIP.js integration
// Real WebRTC calling functionality with comprehensive call management
// Integrates with existing call logging and provides VOIP status monitoring

const VOIPDialPad = () => {
  // VOIP Connection State
  const [isVoipInitialized, setIsVoipInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sipConfig, setSipConfig] = useState(null);
  
  // Call State Management
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected, held, ending
  const [callDuration, setCallDuration] = useState(0);
  const [callQuality, setCallQuality] = useState(null);
  
  // Audio State
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isOnHold, setIsOnHold] = useState(false);
  const [volumeLevels, setVolumeLevels] = useState({ local: 0, remote: 0 });
  
  // UI State
  const [error, setError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  
  // Initialize VOIP service on component mount
  useEffect(() => {
    initializeVOIP();
    return () => {
      // Cleanup on unmount
      if (currentCall) {
        endCall();
      }
    };
  }, []);
  
  // Set up VOIP event listeners
  useEffect(() => {
    if (!voipService) return;
    
    const eventHandlers = {
      initialized: handleVOIPInitialized,
      connected: handleVOIPConnected,
      disconnected: handleVOIPDisconnected,
      connectionFailed: handleConnectionFailed,
      callStarted: handleCallStarted,
      callAnswered: handleCallAnswered,
      callEnded: handleCallEnded,
      callFailed: handleCallFailed,
      incomingCall: handleIncomingCall,
      qualityUpdate: handleQualityUpdate,
      muteStatusChanged: handleMuteChanged,
      volumeChanged: handleVolumeChanged,
      holdStatusChanged: handleHoldChanged,
      sessionEvent: handleSessionEvent,
      mediaEvent: handleMediaEvent,
      error: handleVOIPError
    };
    
    // Register event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      voipService.on(event, handler);
    });
    
    // Cleanup listeners on unmount
    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        voipService.off(event, handler);
      });
    };
  }, []);
  
  // Call duration timer
  useEffect(() => {
    let interval = null;
    
    if (callState === 'connected' && currentCall) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callState, currentCall]);
  
  // Initialize VOIP service
  const initializeVOIP = async () => {
    try {
      setError(null);
      setConnectionStatus('initializing');
      
      await voipService.initialize();
      
      // Check if there's a saved active configuration
      const activeConfig = voipService.configManager.getActiveConfiguration();
      if (activeConfig) {
        setSipConfig(activeConfig);
        await connectToSIP();
      } else {
        setShowConfig(true);
      }
      
    } catch (error) {
      console.error('VOIP initialization failed:', error);
      setError(`Failed to initialize VOIP: ${error.message}`);
      setConnectionStatus('error');
    }
  };
  
  // Connect to SIP server
  const connectToSIP = async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');
      
      await voipService.connectWithConfiguration();
      
    } catch (error) {
      console.error('SIP connection failed:', error);
      setError(`Connection failed: ${error.message}`);
      setConnectionStatus('failed');
    }
  };
  
  // Event Handlers
  const handleVOIPInitialized = (data) => {
    console.log('VOIP initialized:', data);
    setIsVoipInitialized(true);
    setConnectionStatus('initialized');
  };
  
  const handleVOIPConnected = (data) => {
    console.log('VOIP connected:', data);
    setIsConnected(true);
    setConnectionStatus('connected');
    setError(null);
    setShowConfig(false);
    setSipConfig(data);
  };
  
  const handleVOIPDisconnected = (data) => {
    console.log('VOIP disconnected:', data);
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setCurrentCall(null);
    setCallState('idle');
    setCallDuration(0);
  };
  
  const handleConnectionFailed = (data) => {
    console.error('Connection failed:', data);
    setError(`Connection failed: ${data.message}`);
    setConnectionStatus('failed');
    setIsConnected(false);
  };
  
  const handleCallStarted = (data) => {
    console.log('Call started:', data);
    setCurrentCall(data);
    setCallState('calling');
    setCallDuration(0);
    setIsCalling(true);
  };
  
  const handleCallAnswered = (data) => {
    console.log('Call answered:', data);
    setCallState('connected');
  };
  
  const handleCallEnded = (data) => {
    console.log('Call ended:', data);
    
    // Add to call history
    if (currentCall) {
      const historyEntry = {
        id: data.sessionId,
        phone: phoneNumber,
        duration: formatDuration(data.duration || callDuration),
        outcome: 'Completed',
        timestamp: new Date().toISOString(),
        quality: callQuality?.qualityScore || 'Unknown'
      };
      
      setCallHistory(prev => [historyEntry, ...prev.slice(0, 4)]);
    }
    
    // Reset call state
    setCurrentCall(null);
    setCallState('idle');
    setIsCalling(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsOnHold(false);
    setCallQuality(null);
  };
  
  const handleCallFailed = (data) => {
    console.error('Call failed:', data);
    setError(`Call failed: ${data.error}`);
    setCurrentCall(null);
    setCallState('idle');
    setIsCalling(false);
    setCallDuration(0);
  };
  
  const handleIncomingCall = (data) => {
    console.log('Incoming call:', data);
    setIncomingCall(data);
  };
  
  const handleQualityUpdate = (data) => {
    setCallQuality(data.quality);
  };
  
  const handleMuteChanged = (data) => {
    setIsMuted(data.isMuted);
  };
  
  const handleVolumeChanged = (data) => {
    setVolume(data.level);
  };
  
  const handleHoldChanged = (data) => {
    setIsOnHold(data.isOnHold);
    setCallState(data.isOnHold ? 'held' : 'connected');
  };
  
  const handleSessionEvent = (data) => {
    console.log('Session event:', data);
    
    // Handle session state changes
    if (data.type === 'stateChanged') {
      const stateMap = {
        'initializing': 'calling',
        'ringing': 'calling',
        'connecting': 'connecting',
        'connected': 'connected',
        'held': 'held',
        'ending': 'ending',
        'ended': 'idle',
        'failed': 'idle'
      };
      
      const newState = stateMap[data.currentState] || callState;
      setCallState(newState);
    }
  };
  
  const handleMediaEvent = (data) => {
    console.log('Media event:', data);
    
    if (data.type === 'volumeLevels') {
      setVolumeLevels(data);
    }
  };
  
  const handleVOIPError = (data) => {
    console.error('VOIP error:', data);
    setError(data.message);
  };
  
  // Call Actions
  const makeCall = async () => {
    if (!phoneNumber.trim() || isCalling || !isConnected) return;
    
    try {
      setError(null);
      setIsCalling(true);
      
      await voipService.makeCall(phoneNumber, {
        leadId: null // TODO: Connect with current lead
      });
      
      console.log(`📞 Making VOIP call to: ${phoneNumber}`);
      
    } catch (error) {
      console.error('Failed to make call:', error);
      setError(`Failed to make call: ${error.message}`);
      setIsCalling(false);
    }
  };
  
  const endCall = async () => {
    if (!currentCall) return;
    
    try {
      setCallState('ending');
      await voipService.endCall(currentCall.sessionId);
      
    } catch (error) {
      console.error('Failed to end call:', error);
      setError(`Failed to end call: ${error.message}`);
    }
  };
  
  const answerCall = async () => {
    if (!incomingCall) return;
    
    try {
      setError(null);
      await voipService.answerCall(incomingCall.sessionId);
      setCurrentCall(incomingCall);
      setPhoneNumber(incomingCall.from);
      setIncomingCall(null);
      setIsCalling(true);
      
    } catch (error) {
      console.error('Failed to answer call:', error);
      setError(`Failed to answer call: ${error.message}`);
    }
  };
  
  const rejectCall = async () => {
    if (!incomingCall) return;
    
    try {
      await voipService.rejectCall(incomingCall.sessionId);
      setIncomingCall(null);
      
    } catch (error) {
      console.error('Failed to reject call:', error);
      setError(`Failed to reject call: ${error.message}`);
    }
  };
  
  const toggleMute = async () => {
    if (!currentCall) return;
    
    try {
      await voipService.toggleMute(currentCall.sessionId);
      
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      setError(`Failed to ${isMuted ? 'unmute' : 'mute'}: ${error.message}`);
    }
  };
  
  const toggleHold = async () => {
    if (!currentCall) return;
    
    try {
      await voipService.toggleHold(currentCall.sessionId);
      
    } catch (error) {
      console.error('Failed to toggle hold:', error);
      setError(`Failed to ${isOnHold ? 'unhold' : 'hold'}: ${error.message}`);
    }
  };
  
  const sendDTMF = async (tone) => {
    if (!currentCall) return;
    
    try {
      await voipService.sendDTMF(tone, currentCall.sessionId);
      console.log(`🔢 DTMF sent: ${tone}`);
      
    } catch (error) {
      console.error('Failed to send DTMF:', error);
      setError(`Failed to send DTMF: ${error.message}`);
    }
  };
  
  const adjustVolume = (newVolume) => {
    if (!currentCall) return;
    
    try {
      voipService.setVolume(newVolume, currentCall.sessionId);
      
    } catch (error) {
      console.error('Failed to adjust volume:', error);
    }
  };
  
  // UI Handlers
  const handleNumberClick = (number) => {
    if (isCalling && currentCall && callState === 'connected') {
      // Send as DTMF during active call
      sendDTMF(number);
    } else {
      // Add to phone number
      setPhoneNumber(phoneNumber + number);
    }
  };
  
  const handleDelete = () => {
    setPhoneNumber(phoneNumber.slice(0, -1));
  };
  
  const clearError = () => {
    setError(null);
  };
  
  // Utility functions
  const formatPhoneNumber = (num) => {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': 
      case 'initializing': return 'text-yellow-600';
      case 'failed':
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  const getCallQualityColor = () => {
    if (!callQuality) return 'text-gray-400';
    
    const score = callQuality.qualityScore;
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Button array
  const buttons = [
    '1', '2', '3',
    '4', '5', '6', 
    '7', '8', '9',
    '*', '0', '#'
  ];
  
  return (
    <div className="card max-w-md mx-2">
      {/* Header with VOIP status */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-700">VOIP Dial Pad</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-xs font-medium ${getConnectionStatusColor()}`}>
              {connectionStatus.toUpperCase()}
            </span>
          </div>
        </div>
        
        {/* Call Quality Indicator */}
        {callState === 'connected' && callQuality && (
          <div className="flex items-center justify-center space-x-2 text-xs">
            <span className="text-gray-600">Quality:</span>
            <span className={`font-medium ${getCallQualityColor()}`}>
              {'⭐'.repeat(Math.floor(callQuality.qualityScore))} ({callQuality.qualityScore}/5)
            </span>
          </div>
        )}
        
        {/* Volume Levels */}
        {callState === 'connected' && (
          <div className="flex justify-center space-x-4 mt-2">
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <span>🎤</span>
              <div className="w-12 bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                  style={{ width: `${volumeLevels.local * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <span>🔊</span>
              <div className="w-12 bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all duration-100"
                  style={{ width: `${volumeLevels.remote * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
            ⚠️ {error}
            <button 
              onClick={clearError} 
              className="ml-2 text-blue-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      
      {/* Phone Number Display */}
      <div className="flex mb-4 gap-1">
        <input
          type="text"
          value={formatPhoneNumber(phoneNumber)}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter phone number"
          className="input-field flex-1 text-center text-lg"
          disabled={isCalling && callState !== 'connected'}
        />
        <button 
          onClick={handleDelete}
          disabled={isCalling && callState !== 'connected'}
          className="px-4 py-3 text-xl bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
        >
          ⌫
        </button>
      </div>
      
      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {buttons.map((btn) => (
          <button
            key={btn}
            onClick={() => handleNumberClick(btn)}
            className="p-4 text-xl bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            {btn}
          </button>
        ))}
      </div>
      
      {/* Call Controls */}
      {!isConnected ? (
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <p className="text-yellow-700 mb-2">📡 Not connected to SIP server</p>
          <button
            onClick={() => setShowConfig(true)}
            className="btn-primary text-sm"
          >
            Configure SIP
          </button>
        </div>
      ) : !isCalling ? (
        <button 
          onClick={makeCall} 
          disabled={phoneNumber.length === 0}
          className="btn-primary w-full text-lg py-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          📞 Call {formatPhoneNumber(phoneNumber)}
        </button>
      ) : (
        <div className="space-y-2">
          {/* Call Status */}
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-medium text-blue-800">
              {callState === 'calling' && '📞 Calling...'}
              {callState === 'connecting' && '🔄 Connecting...'}
              {callState === 'connected' && `⏱️ Connected - ${formatDuration(callDuration)}`}
              {callState === 'held' && '⏸️ On Hold'}
              {callState === 'ending' && '📵 Ending call...'}
            </div>
            {callState === 'connected' && (
              <div className="text-xs text-blue-600 mt-1">
                {formatPhoneNumber(phoneNumber)}
              </div>
            )}
          </div>
          
          {/* Call Action Buttons */}
          {callState === 'connected' && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={toggleMute}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                {isMuted ? '🔇 Unmute' : '🎤 Mute'}
              </button>
              
              <button
                onClick={toggleHold}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isOnHold 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isOnHold ? '▶️ Resume' : '⏸️ Hold'}
              </button>
            </div>
          )}
          
          {/* Volume Control */}
          {callState === 'connected' && (
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-gray-600">🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => adjustVolume(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-600 w-8">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}
          
          {/* End Call Button */}
          <button 
            onClick={endCall}
            disabled={callState === 'ending'}
            className="btn-danger w-full text-lg py-4"
          >
            {callState === 'ending' ? '🔄 Ending...' : '📵 End Call'}
          </button>
        </div>
      )}
      
      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">📲 Incoming Call</h3>
              <p className="text-gray-600 mb-4">
                {incomingCall.displayName || formatPhoneNumber(incomingCall.from)}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={answerCall}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded font-medium"
                >
                  ✅ Answer
                </button>
                <button
                  onClick={rejectCall}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded font-medium"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Calls History */}
      {callHistory.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">📅 Recent VOIP Calls</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {callHistory.map((call) => (
              <div key={call.id} className="flex justify-between items-center text-xs text-gray-600">
                <span>{formatPhoneNumber(call.phone)}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-green-600">{call.outcome}</span>
                  <span>{call.duration}</span>
                  <span className="text-xs">⭐{call.quality}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">⚙️ SIP Configuration Required</h3>
              <p className="text-gray-600 mb-4">
                Please configure your SIP server settings to enable VOIP calling.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowConfig(false)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
                >
                  Configure Later
                </button>
                <p className="text-xs text-gray-500">
                  Note: This is a demo implementation. In production, you would integrate with your SIP provider's configuration interface.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VOIPDialPad;