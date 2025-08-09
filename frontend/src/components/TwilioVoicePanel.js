import React, { useState, useEffect, useRef } from 'react';
import TwilioVoiceManager from '../services/TwilioVoiceManager';

const TwilioVoicePanel = ({ onCallStateChange, leadData }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('uninitialized');
  const [callStatus, setCallStatus] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDialpadVisible, setIsDialpadVisible] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const twilioManager = useRef(null);
  const durationInterval = useRef(null);

  useEffect(() => {
    initializeTwilio();
    
    return () => {
      if (twilioManager.current) {
        twilioManager.current.destroy();
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    // Auto-fill phone number from lead data
    if (leadData?.phone && !phoneNumber) {
      setPhoneNumber(leadData.phone);
    }
  }, [leadData, phoneNumber]);

  const initializeTwilio = async () => {
    try {
      addLog('Initializing Twilio Voice...');
      twilioManager.current = new TwilioVoiceManager();
      
      // Set up event listeners
      twilioManager.current.on('ready', (data) => {
        setIsInitialized(true);
        setDeviceStatus('registered');
        addLog(`Device ready: ${data.identity}`);
      });

      twilioManager.current.on('error', (data) => {
        setError(`${data.type}: ${data.error.message}`);
        addLog(`Error - ${data.type}: ${data.error.message}`, 'error');
      });

      twilioManager.current.on('incoming', (data) => {
        setCallStatus('incoming');
        addLog(`Incoming call from ${data.call.parameters.From}`, 'info');
      });

      twilioManager.current.on('connect', (data) => {
        setCallStatus('connected');
        startCallTimer();
        addLog('Call connected', 'success');
        if (onCallStateChange) {
          onCallStateChange('connected', data.call);
        }
      });

      twilioManager.current.on('disconnect', (data) => {
        setCallStatus('disconnected');
        stopCallTimer();
        addLog('Call disconnected', 'info');
        if (onCallStateChange) {
          onCallStateChange('disconnected', data.call);
        }
        
        // Reset state after disconnect
        setTimeout(() => {
          setCallStatus(null);
          setIsMuted(false);
          setIsOnHold(false);
        }, 2000);
      });

      twilioManager.current.on('cancel', () => {
        setCallStatus('cancelled');
        addLog('Call cancelled', 'warning');
        setTimeout(() => setCallStatus(null), 2000);
      });

      twilioManager.current.on('reject', () => {
        setCallStatus('rejected');
        addLog('Call rejected', 'warning');
        setTimeout(() => setCallStatus(null), 2000);
      });

      // Initialize the device
      const result = await twilioManager.current.initialize({
        identity: `user-${Date.now()}`, // You can customize this
        config: {
          debug: process.env.NODE_ENV === 'development'
        }
      });

      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      setError(`Initialization failed: ${error.message}`);
      addLog(`Initialization failed: ${error.message}`, 'error');
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), { timestamp, message, type }]);
  };

  const startCallTimer = () => {
    setCallDuration(0);
    durationInterval.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  const makeCall = async () => {
    if (!twilioManager.current || !phoneNumber.trim()) {
      addLog('Please enter a valid phone number', 'error');
      return;
    }

    try {
      setError(null);
      addLog(`Calling ${phoneNumber}...`);
      setCallStatus('calling');

      const result = await twilioManager.current.makeCall(phoneNumber, {
        from: 'ColdCaller App'
      });

      if (result.success) {
        addLog('Call initiated successfully', 'success');
      } else {
        setError(result.error);
        addLog(`Call failed: ${result.error}`, 'error');
        setCallStatus(null);
      }
    } catch (error) {
      setError(error.message);
      addLog(`Call error: ${error.message}`, 'error');
      setCallStatus(null);
    }
  };

  const acceptCall = () => {
    if (twilioManager.current?.acceptCall()) {
      addLog('Call accepted', 'success');
    }
  };

  const rejectCall = () => {
    if (twilioManager.current?.rejectCall()) {
      addLog('Call rejected', 'warning');
    }
  };

  const hangUp = () => {
    if (twilioManager.current?.disconnectCall()) {
      addLog('Call ended', 'info');
    }
  };

  const toggleMute = () => {
    if (twilioManager.current) {
      const muted = twilioManager.current.toggleMute();
      setIsMuted(muted);
      addLog(muted ? 'Call muted' : 'Call unmuted', 'info');
    }
  };

  const toggleHold = () => {
    if (twilioManager.current) {
      const onHold = twilioManager.current.toggleHold();
      setIsOnHold(onHold);
      addLog(onHold ? 'Call on hold' : 'Call resumed', 'info');
    }
  };

  const sendDTMF = (digit) => {
    if (twilioManager.current?.sendDTMF(digit)) {
      addLog(`DTMF sent: ${digit}`, 'info');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return number;
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'calling': return 'text-yellow-600';
      case 'connected': return 'text-green-600';
      case 'incoming': return 'text-blue-600';
      case 'disconnected': return 'text-gray-600';
      case 'rejected': case 'cancelled': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (callStatus) {
      case 'calling': return '📞';
      case 'connected': return '🟢';
      case 'incoming': return '📲';
      case 'disconnected': return '📴';
      case 'rejected': case 'cancelled': return '❌';
      default: return '📱';
    }
  };

  const dialpadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
          📞 Twilio Voice
          <span className={`ml-2 text-sm font-medium ${isInitialized ? 'text-green-600' : 'text-red-600'}`}>
            {isInitialized ? '●' : '○'} {deviceStatus}
          </span>
        </h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Call Status Display */}
      {callStatus && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
          <div className={`text-2xl ${getStatusColor()}`}>
            {getStatusIcon()} {callStatus.charAt(0).toUpperCase() + callStatus.slice(1)}
          </div>
          {callStatus === 'connected' && (
            <div className="text-lg font-mono text-gray-700 mt-2">
              {formatDuration(callDuration)}
            </div>
          )}
          {phoneNumber && (
            <div className="text-sm text-gray-600 mt-1">
              {formatPhoneNumber(phoneNumber)}
            </div>
          )}
        </div>
      )}

      {/* Phone Number Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>
        <div className="flex">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter phone number"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={callStatus === 'connected' || callStatus === 'calling'}
          />
          <button
            onClick={() => setIsDialpadVisible(!isDialpadVisible)}
            className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
            disabled={callStatus === 'connected' || callStatus === 'calling'}
          >
            📋
          </button>
        </div>
      </div>

      {/* Call Controls */}
      <div className="mb-6">
        {!callStatus || callStatus === 'disconnected' || callStatus === 'rejected' || callStatus === 'cancelled' ? (
          <button
            onClick={makeCall}
            disabled={!isInitialized || !phoneNumber.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
          >
            📞 Call
          </button>
        ) : callStatus === 'incoming' ? (
          <div className="flex space-x-3">
            <button
              onClick={acceptCall}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              ✅ Accept
            </button>
            <button
              onClick={rejectCall}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              ❌ Reject
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex space-x-3">
              <button
                onClick={toggleMute}
                className={`flex-1 ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} text-white font-semibold py-2 px-4 rounded-lg transition-colors`}
              >
                {isMuted ? '🔇 Unmute' : '🎤 Mute'}
              </button>
              <button
                onClick={toggleHold}
                className={`flex-1 ${isOnHold ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 hover:bg-gray-700'} text-white font-semibold py-2 px-4 rounded-lg transition-colors`}
              >
                {isOnHold ? '▶️ Resume' : '⏸️ Hold'}
              </button>
            </div>
            <button
              onClick={hangUp}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              📴 Hang Up
            </button>
          </div>
        )}
      </div>

      {/* Dialpad */}
      {isDialpadVisible && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Dialpad</h3>
          <div className="grid grid-cols-3 gap-2">
            {dialpadNumbers.flat().map((digit) => (
              <button
                key={digit}
                onClick={() => {
                  if (callStatus === 'connected') {
                    sendDTMF(digit);
                  } else {
                    setPhoneNumber(prev => prev + digit);
                  }
                }}
                className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded-lg border border-gray-300 transition-colors"
              >
                {digit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Call Logs */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Call Log</h3>
        <div className="space-y-1 text-xs">
          {logs.length === 0 ? (
            <p className="text-gray-500">No recent activity</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`flex justify-between ${
                  log.type === 'error' ? 'text-red-600' :
                  log.type === 'success' ? 'text-green-600' :
                  log.type === 'warning' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}
              >
                <span className="truncate">{log.message}</span>
                <span className="text-gray-400 ml-2">{log.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TwilioVoicePanel;