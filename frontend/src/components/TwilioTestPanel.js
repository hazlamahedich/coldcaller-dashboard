import React, { useState, useEffect, useRef } from 'react';
import TwilioTestManager from '../services/TwilioTestManager';

const TwilioTestPanel = () => {
  const [testManager, setTestManager] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState('uninitialized');
  const [activeCall, setActiveCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [logs, setLogs] = useState([]);
  const [testIdentity, setTestIdentity] = useState(`test-user-${Date.now()}`);

  const logRef = useRef(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{
      timestamp,
      message,
      type
    }, ...prev.slice(0, 99)]); // Keep last 100 logs
  };

  useEffect(() => {
    // Auto-scroll logs to bottom
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [logs]);

  const initializeTwilio = async () => {
    setIsInitializing(true);
    addLog('🧪 Initializing Twilio Test Manager...', 'info');

    try {
      const manager = new TwilioTestManager();
      
      // Set up event listeners
      manager.on('ready', (data) => {
        addLog(`✅ Device ready: ${data.identity}`, 'success');
        setDeviceStatus('ready');
        setIsInitialized(true);
      });

      manager.on('error', (data) => {
        addLog(`❌ Error (${data.type}): ${data.error.message}`, 'error');
      });

      manager.on('incoming', (data) => {
        addLog(`📞 Incoming call: ${data.call.parameters.From}`, 'info');
        setActiveCall(data.call);
      });

      manager.on('connect', (data) => {
        addLog('📞 Call connected!', 'success');
        setActiveCall(data.call);
      });

      manager.on('disconnect', (data) => {
        addLog('📞 Call disconnected', 'info');
        setActiveCall(null);
      });

      manager.on('ringing', (data) => {
        addLog('📞 Call is ringing...', 'info');
      });

      manager.on('cancel', () => {
        addLog('📞 Call cancelled', 'info');
        setActiveCall(null);
      });

      manager.on('reject', () => {
        addLog('📞 Call rejected', 'info');
        setActiveCall(null);
      });

      const result = await manager.initialize({
        identity: testIdentity,
        config: {
          debug: true,
          logLevel: 'debug'
        }
      });

      if (result.success) {
        setTestManager(manager);
        addLog(`🎯 Twilio initialized successfully for ${result.identity}`, 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addLog(`❌ Initialization failed: ${error.message}`, 'error');
      setDeviceStatus('error');
    } finally {
      setIsInitializing(false);
    }
  };

  const makeTestCall = async () => {
    if (!testManager || !phoneNumber) {
      addLog('❌ Please initialize Twilio and enter a phone number', 'error');
      return;
    }

    addLog(`📞 Making test call to ${phoneNumber}...`, 'info');

    try {
      const result = await testManager.makeCall(phoneNumber, {
        record: true
      });

      if (result.success) {
        addLog(`✅ Test call initiated: ${result.callSid}`, 'success');
        setActiveCall(result.call);
        setCallHistory(prev => [{
          callSid: result.callSid,
          to: phoneNumber,
          timestamp: new Date().toISOString(),
          status: 'initiated'
        }, ...prev]);
      } else {
        addLog(`❌ Call failed: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Call error: ${error.message}`, 'error');
    }
  };

  const validatePhoneNumber = async () => {
    if (!testManager || !phoneNumber) return;

    addLog(`🔍 Validating phone number: ${phoneNumber}`, 'info');

    try {
      const result = await testManager.validatePhoneNumber(phoneNumber);
      if (result.success && result.valid) {
        addLog(`✅ Phone number is valid: ${result.nationalFormat}`, 'success');
      } else {
        addLog(`❌ Phone number is invalid: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Validation error: ${error.message}`, 'error');
    }
  };

  const disconnectCall = () => {
    if (testManager) {
      testManager.disconnectCall();
      addLog('🔚 Disconnecting call...', 'info');
    }
  };

  const acceptCall = () => {
    if (testManager) {
      testManager.acceptCall();
      addLog('✅ Accepting call...', 'info');
    }
  };

  const rejectCall = () => {
    if (testManager) {
      testManager.rejectCall();
      addLog('❌ Rejecting call...', 'info');
    }
  };

  const sendDTMF = (digit) => {
    if (testManager) {
      testManager.sendDTMF(digit);
      addLog(`📞 Sent DTMF: ${digit}`, 'info');
    }
  };

  const toggleMute = () => {
    if (testManager) {
      const muted = testManager.toggleMute();
      addLog(`🔇 Call ${muted ? 'muted' : 'unmuted'}`, 'info');
    }
  };

  const loadCallHistory = async () => {
    if (!testManager) return;

    try {
      const result = await testManager.listTestCalls();
      if (result.success) {
        setCallHistory(result.data);
        addLog(`📋 Loaded ${result.data.length} test calls`, 'info');
      }
    } catch (error) {
      addLog(`❌ Failed to load call history: ${error.message}`, 'error');
    }
  };

  const checkHealth = async () => {
    if (!testManager) return;

    try {
      const result = await testManager.healthCheck();
      if (result.status === 'healthy') {
        addLog(`✅ Health check passed: ${result.accountStatus}`, 'success');
      } else {
        addLog(`⚠️ Health check failed: ${result.message}`, 'warning');
      }
    } catch (error) {
      addLog(`❌ Health check error: ${error.message}`, 'error');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">
          🧪 Twilio Voice Test Panel
        </h2>
        <p className="text-gray-600">
          Test Twilio voice calls without authentication. This bypasses normal security for testing.
        </p>
      </div>

      {/* Initialize Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Identity:</span>
            <input
              type="text"
              value={testIdentity}
              onChange={(e) => setTestIdentity(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              disabled={isInitialized}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              deviceStatus === 'ready' ? 'bg-green-100 text-green-800' :
              deviceStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {deviceStatus}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={initializeTwilio}
            disabled={isInitializing || isInitialized}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isInitializing ? 'Initializing...' : isInitialized ? 'Initialized' : 'Initialize Twilio'}
          </button>
          <button
            onClick={checkHealth}
            disabled={!testManager}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Health Check
          </button>
          <button
            onClick={loadCallHistory}
            disabled={!testManager}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Load History
          </button>
        </div>
      </div>

      {/* Call Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">📞 Make Test Call</h3>
        
        <div className="flex items-center gap-2 mb-4">
          <input
            type="tel"
            placeholder="Enter phone number (e.g., +1234567890 or 234-567-8901)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded"
            disabled={!isInitialized}
          />
          <button
            onClick={validatePhoneNumber}
            disabled={!testManager || !phoneNumber}
            className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Validate
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={makeTestCall}
            disabled={!testManager || !phoneNumber || !!activeCall}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            📞 Call
          </button>
          <button
            onClick={acceptCall}
            disabled={!testManager || !activeCall}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            ✅ Accept
          </button>
          <button
            onClick={rejectCall}
            disabled={!testManager || !activeCall}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            ❌ Reject
          </button>
          <button
            onClick={disconnectCall}
            disabled={!testManager || !activeCall}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            🔚 Hang Up
          </button>
          <button
            onClick={toggleMute}
            disabled={!testManager || !activeCall}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            🔇 Mute
          </button>
        </div>

        {/* DTMF Keypad */}
        {activeCall && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">DTMF Keypad</h4>
            <div className="grid grid-cols-3 gap-2 max-w-xs">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => sendDTMF(digit)}
                  className="p-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  {digit}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Call Info */}
        {activeCall && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-800 mb-2">🔄 Active Call</h4>
            <div className="text-sm text-blue-700">
              <p>Status: {activeCall.status()}</p>
              <p>Direction: {activeCall.direction}</p>
              <p>Duration: {activeCall.duration()} seconds</p>
            </div>
          </div>
        )}
      </div>

      {/* Call History */}
      {callHistory.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">📋 Call History</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {callHistory.map((call, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                <div>
                  <span className="font-medium">{call.to}</span>
                  <span className="text-gray-500 ml-2">{call.status}</span>
                </div>
                <div className="text-gray-500">
                  {new Date(call.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">📝 Event Logs</h3>
        <div 
          ref={logRef}
          className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm h-64 overflow-y-auto"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`mb-1 ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' :
                log.type === 'warning' ? 'text-yellow-400' :
                'text-gray-300'
              }`}>
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Showing last {logs.length}/100 logs
        </div>
      </div>
    </div>
  );
};

export default TwilioTestPanel;