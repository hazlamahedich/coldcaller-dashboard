import React, { useState, useEffect, useRef } from 'react';
import CallControls from './CallControls';
import CallStatus from './CallStatus';
import DTMFKeypad from './DTMFKeypad';
import CallHistory from './CallHistory';
import SIPManager from '../services/SIPManager';

/**
 * VOIPPhone Component - Complete VOIP phone interface
 * Unified interface combining all VOIP functionality with professional features
 */

const VOIPPhone = ({ 
  leadInfo = null,
  onCallLogged,
  sipConfig = null 
}) => {
  // SIP Manager instance
  const sipManagerRef = useRef(null);
  
  // Phone state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callState, setCallState] = useState('idle'); // idle, connecting, ringing, active, hold, ended
  const [currentCall, setCurrentCall] = useState(null);
  
  // Call controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isRecording, setIsRecording] = useState(false);
  
  // Connection state
  const [sipRegistered, setSipRegistered] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('excellent');
  const [networkLatency, setNetworkLatency] = useState(0);
  
  // UI state
  const [showDTMFKeypad, setShowDTMFKeypad] = useState(false);
  const [error, setError] = useState(null);
  const [callHistoryTrigger, setCallHistoryTrigger] = useState(0);

  // Initialize SIP Manager
  useEffect(() => {
    sipManagerRef.current = new SIPManager();
    const sip = sipManagerRef.current;

    // Configure SIP if config provided
    if (sipConfig) {
      sip.configure(sipConfig);
    } else {
      // Demo configuration
      sip.configure({
        uri: 'demo@voip.example.com',
        wsServers: 'wss://voip.example.com:7443',
        displayName: 'Demo User',
        authUser: 'demo',
        password: 'demo123'
      });
    }

    // Set up event listeners
    sip.on('registered', handleSipRegistered);
    sip.on('registrationFailed', handleSipRegistrationFailed);
    sip.on('callProgress', handleCallProgress);
    sip.on('callConnected', handleCallConnected);
    sip.on('callEnded', handleCallEnded);
    sip.on('callFailed', handleCallFailed);
    sip.on('callHeld', handleCallHeld);
    sip.on('callResumed', handleCallResumed);
    sip.on('muteChanged', handleMuteChanged);
    sip.on('dtmfSent', handleDTMFSent);

    // Auto-register for demo
    setTimeout(() => {
      sip.register();
    }, 1000);

    // Set up quality monitoring
    const qualityInterval = setInterval(() => {
      if (callState === 'active') {
        const quality = sip.getConnectionQuality();
        setConnectionQuality(quality.signal);
        setNetworkLatency(Math.round(quality.latency));
      }
    }, 2000);

    return () => {
      clearInterval(qualityInterval);
      sip.destroy();
    };
  }, [sipConfig]);

  // SIP Event Handlers
  const handleSipRegistered = (data) => {
    console.log('✅ SIP registered:', data);
    setSipRegistered(true);
    setError(null);
  };

  const handleSipRegistrationFailed = (data) => {
    console.error('❌ SIP registration failed:', data);
    setSipRegistered(false);
    setError(`SIP Registration Failed: ${data.error}`);
  };

  const handleCallProgress = ({ callSession, state }) => {
    console.log(`📞 Call progress: ${state}`);
    setCallState(state);
    setCurrentCall(callSession);
    
    if (state === 'connecting') {
      setError(null);
    }
  };

  const handleCallConnected = ({ callSession }) => {
    console.log('✅ Call connected');
    setCallState('active');
    setCurrentCall(callSession);
    setError(null);
  };

  const handleCallEnded = ({ callSession, reason }) => {
    console.log(`📵 Call ended: ${reason}`);
    setCallState('ended');
    setCurrentCall(callSession);
    
    // Log the call
    logCall(callSession, reason);
    
    // Reset state after 2 seconds
    setTimeout(() => {
      setCallState('idle');
      setCurrentCall(null);
      setIsMuted(false);
      setIsOnHold(false);
      setIsRecording(false);
      setShowDTMFKeypad(false);
    }, 2000);
  };

  const handleCallFailed = ({ error, number }) => {
    console.error('❌ Call failed:', error);
    setCallState('ended');
    setError(`Call Failed: ${error}`);
    
    // Reset state after 3 seconds
    setTimeout(() => {
      setCallState('idle');
      setCurrentCall(null);
      setError(null);
    }, 3000);
  };

  const handleCallHeld = ({ callSession }) => {
    setIsOnHold(true);
    setCurrentCall(callSession);
  };

  const handleCallResumed = ({ callSession }) => {
    setIsOnHold(false);
    setCurrentCall(callSession);
  };

  const handleMuteChanged = ({ muted }) => {
    setIsMuted(muted);
  };

  const handleDTMFSent = ({ tones }) => {
    console.log(`📟 DTMF sent: ${tones}`);
  };

  // Phone number input handling
  const handleNumberClick = (digit) => {
    if (callState === 'idle') {
      setPhoneNumber(prev => prev + digit);
    } else if (callState === 'active') {
      // Send DTMF during call
      sipManagerRef.current?.sendDTMF(digit);
    }
  };

  const handleDelete = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const clearNumber = () => {
    setPhoneNumber('');
  };

  // Call control handlers
  const handleCall = async () => {
    if (!phoneNumber.trim() || !sipRegistered) {
      setError(sipRegistered ? 'Please enter a phone number' : 'Not connected to SIP server');
      return;
    }

    try {
      setError(null);
      await sipManagerRef.current.makeCall(phoneNumber);
    } catch (error) {
      setError(`Failed to make call: ${error.message}`);
    }
  };

  const handleHangup = async () => {
    try {
      await sipManagerRef.current.hangup();
    } catch (error) {
      console.error('Failed to hang up:', error);
    }
  };

  const handleMuteToggle = () => {
    sipManagerRef.current?.setMute(!isMuted);
  };

  const handleHoldToggle = () => {
    if (isOnHold) {
      sipManagerRef.current?.resumeCall();
    } else {
      sipManagerRef.current?.holdCall();
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    // In a real implementation, this would adjust audio levels
  };

  const handleTransfer = (transferNumber) => {
    console.log(`📞 Transferring call to: ${transferNumber}`);
    // In a real implementation, this would perform call transfer
    setError('Call transfer feature coming soon');
    setTimeout(() => setError(null), 3000);
  };

  const handleConference = () => {
    console.log('👥 Starting conference call');
    // In a real implementation, this would start conference
    setError('Conference call feature coming soon');
    setTimeout(() => setError(null), 3000);
  };

  const handleRecord = () => {
    setIsRecording(!isRecording);
    // In a real implementation, this would start/stop recording
    console.log(`🔴 Recording: ${!isRecording ? 'started' : 'stopped'}`);
  };

  // DTMF keypad handlers
  const handleDTMFKeyPress = (key) => {
    sipManagerRef.current?.sendDTMF(key);
  };

  const handleShowDTMF = () => {
    if (callState === 'active') {
      setShowDTMFKeypad(true);
    }
  };

  // Quick dial from call history
  const handleQuickDial = (number, callInfo) => {
    setPhoneNumber(number);
    if (leadInfo && callInfo) {
      // Could pre-populate lead info here
    }
  };

  // Log call to backend
  const logCall = async (callSession, reason) => {
    if (!callSession) return;

    try {
      const callData = {
        phone: callSession.number,
        outcome: reason === 'user_hangup' ? 'Connected' : 'Failed',
        duration: formatDuration(callSession.duration || 0),
        notes: `VOIP call ${reason}`,
        timestamp: callSession.startTime?.toISOString(),
        endTime: callSession.endTime?.toISOString(),
        leadId: leadInfo?.id || null
      };

      if (onCallLogged) {
        await onCallLogged(callData);
      }

      // Refresh call history
      setCallHistoryTrigger(prev => prev + 1);

    } catch (error) {
      console.error('Failed to log call:', error);
    }
  };

  // Format phone number
  const formatPhoneNumber = (num) => {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get caller info for display
  const getCallerInfo = () => {
    if (leadInfo) {
      return {
        name: leadInfo.name || leadInfo.company,
        company: leadInfo.company !== leadInfo.name ? leadInfo.company : null,
        phone: phoneNumber || leadInfo.phone,
        location: leadInfo.location
      };
    }
    return null;
  };

  // Keypad layout
  const keypadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <div className="flex flex-col space-y-4 max-w-md mx-auto">
      {/* Header */}
      <div className="card">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">VOIP Phone</h2>
          
          {/* SIP Status */}
          <div className={`inline-flex items-center mt-2 px-3 py-1 rounded-full text-sm ${
            sipRegistered 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            <span className="mr-2">
              {sipRegistered ? '🟢' : '🔴'}
            </span>
            {sipRegistered ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Phone Number Input */}
        <div className="flex mb-4 gap-2">
          <input
            type="text"
            value={formatPhoneNumber(phoneNumber)}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter phone number"
            className="input-field flex-1 text-center text-lg font-mono"
            disabled={callState !== 'idle'}
          />
          <button 
            onClick={handleDelete} 
            disabled={callState !== 'idle'}
            className="px-4 py-3 text-xl bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-lg transition-colors duration-200"
          >
            ⌫
          </button>
          <button 
            onClick={clearNumber} 
            disabled={callState !== 'idle'}
            className="px-4 py-3 text-sm bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition-colors duration-200"
          >
            Clear
          </button>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {keypadButtons.flat().map((btn) => (
            <button
              key={btn}
              onClick={() => handleNumberClick(btn)}
              className="p-4 text-xl bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              {btn}
            </button>
          ))}
        </div>

        {/* Main Call Button */}
        {callState === 'idle' ? (
          <button 
            onClick={handleCall} 
            disabled={!phoneNumber.trim() || !sipRegistered}
            className="btn-primary w-full text-lg py-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            📞 Call {phoneNumber ? formatPhoneNumber(phoneNumber) : ''}
          </button>
        ) : (
          <div className="space-y-2">
            {/* DTMF and Hang up buttons */}
            <div className="flex gap-2">
              <button 
                onClick={handleShowDTMF}
                disabled={callState !== 'active'}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🔢 DTMF
              </button>
              <button 
                onClick={handleHangup}
                className="flex-1 btn-danger py-3 text-lg"
              >
                📵 Hang Up
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Status */}
      <CallStatus
        callState={callState}
        callerInfo={getCallerInfo()}
        callDuration={currentCall?.duration || 0}
        connectionQuality={connectionQuality}
        sipStatus={sipRegistered ? 'registered' : 'unregistered'}
        networkLatency={networkLatency}
        phoneNumber={phoneNumber}
        startTime={currentCall?.answerTime || currentCall?.startTime}
      />

      {/* Call Controls */}
      <CallControls
        isInCall={callState === 'active'}
        isMuted={isMuted}
        isOnHold={isOnHold}
        volume={volume}
        onMuteToggle={handleMuteToggle}
        onHoldToggle={handleHoldToggle}
        onVolumeChange={handleVolumeChange}
        onTransfer={handleTransfer}
        onConference={handleConference}
        onRecord={handleRecord}
        isRecording={isRecording}
        connectionQuality={connectionQuality}
        callDuration={currentCall?.duration || 0}
      />

      {/* Call History */}
      <CallHistory
        maxItems={5}
        showQuickDial={true}
        onQuickDial={handleQuickDial}
        refreshTrigger={callHistoryTrigger}
      />

      {/* DTMF Keypad Overlay */}
      <DTMFKeypad
        isVisible={showDTMFKeypad}
        onKeyPress={handleDTMFKeyPress}
        onClose={() => setShowDTMFKeypad(false)}
        isInCall={callState === 'active'}
        showToneAnimation={true}
      />
    </div>
  );
};

export default VOIPPhone;