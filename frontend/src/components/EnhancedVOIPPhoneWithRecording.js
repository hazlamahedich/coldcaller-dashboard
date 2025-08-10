import React, { useState, useEffect, useRef } from 'react';
import CallControls from './CallControls';
import CallStatus from './CallStatus';
import DTMFKeypad from './DTMFKeypad';
import CallHistory from './CallHistory';
import RecordingSettings, { useRecordingSettings } from './RecordingSettings';
import SIPManager from '../services/SIPManager';
import SIPProviderManager from '../services/SIPProviderManager';
import AudioFeedbackService from '../services/AudioFeedbackService';
import callService from '../services/callService';

/**
 * Enhanced VOIPPhone with Recording Controls
 * Complete VOIP phone interface with recording preference management
 */

const EnhancedVOIPPhoneWithRecording = ({ 
  leadInfo = null,
  onCallLogged,
  sipConfig = null 
}) => {
  // SIP Manager, Provider Manager, and Audio Feedback instances
  const sipManagerRef = useRef(null);
  const sipProviderManagerRef = useRef(null);
  const audioFeedbackRef = useRef(null);
  
  // Recording settings hook
  const recordingSettings = useRecordingSettings();
  
  // SIP provider state
  const [sipProvider, setSipProvider] = useState('generic');
  const [dtmfMethod, setDtmfMethod] = useState('rfc4733');
  
  // Phone state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callState, setCallState] = useState('idle');
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
  const [showRecordingSettings, setShowRecordingSettings] = useState(false);
  const [error, setError] = useState(null);
  const [callHistoryTrigger, setCallHistoryTrigger] = useState(0);

  // Initialize SIP Manager, Provider Manager, and Audio Feedback
  useEffect(() => {
    sipManagerRef.current = new SIPManager();
    sipProviderManagerRef.current = new SIPProviderManager();
    audioFeedbackRef.current = new AudioFeedbackService();
    
    const sip = sipManagerRef.current;
    const sipProvider = sipProviderManagerRef.current;
    const audioFeedback = audioFeedbackRef.current;

    // Initialize SIP provider configuration
    let providerConfig;
    
    if (sipConfig) {
      sip.configure(sipConfig);
      providerConfig = sipConfig;
    } else {
      try {
        providerConfig = sipProvider.initializeFromEnvironment();
        const sipConfiguration = sipProvider.getSIPConfiguration();
        
        sip.configure(sipConfiguration);
        
        setSipProvider(sipProvider.activeProvider);
        const dtmfConfig = sipProvider.getDTMFConfig();
        setDtmfMethod(dtmfConfig.preferredMethod);
        
        console.log(`🔧 SIP provider initialized: ${providerConfig.name}`);
        console.log(`🔢 DTMF method: ${dtmfConfig.preferredMethod}`);
        
      } catch (error) {
        console.error('❌ Failed to initialize SIP provider:', error);
        
        // Fallback configuration
        sip.configure({
          uri: 'demo@voip.example.com',
          wsServers: 'wss://voip.example.com:7443',
          displayName: 'Demo User',
          authUser: 'demo',
          password: 'demo123',
          provider: 'generic',
          dtmfType: 'rfc4733'
        });
      }
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
    sip.on('audioFeedback', handleAudioFeedback);

    // Auto-register
    setTimeout(() => {
      sip.register();
    }, 1000);

    // Quality monitoring
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
      audioFeedback.destroy();
    };
  }, [sipConfig]);

  // SIP Event Handlers
  const handleSipRegistered = (data) => {
    console.log('✅ SIP registered:', data);
    setSipRegistered(true);
    setError(null);
    audioFeedbackRef.current?.onCallStateChange('idle', { sipRegistered: true });
  };

  const handleSipRegistrationFailed = (data) => {
    console.error('❌ SIP registration failed:', data);
    setSipRegistered(false);
    setError(`SIP Registration Failed: ${data.error}`);
    audioFeedbackRef.current?.playFeedback('error', 'SIP registration failed', { priority: 'critical' });
  };

  const handleCallProgress = ({ callSession, state }) => {
    console.log(`📞 Call progress: ${state}`);
    setCallState(state);
    setCurrentCall(callSession);
    
    audioFeedbackRef.current?.onCallStateChange(state, { 
      phoneNumber: callSession?.number,
      duration: callSession?.duration || 0 
    });
    
    if (state === 'connecting') {
      setError(null);
      
      // Auto-start recording if enabled in settings
      if (recordingSettings.autoRecord) {
        setIsRecording(true);
        console.log('🎙️ Auto-recording enabled for call');
      }
    }
  };

  const handleCallConnected = ({ callSession }) => {
    console.log('✅ Call connected');
    setCallState('active');
    setCurrentCall(callSession);
    setError(null);
    
    audioFeedbackRef.current?.onCallStateChange('connected', { 
      phoneNumber: callSession?.number,
      priority: 'critical',
      vibrate: true 
    });
  };

  const handleCallEnded = ({ callSession, reason }) => {
    console.log(`📵 Call ended: ${reason}`);
    setCallState('ended');
    setCurrentCall(callSession);
    
    audioFeedbackRef.current?.onCallStateChange('ended', { 
      reason,
      duration: callSession?.duration || 0,
      priority: 'high' 
    });
    
    // Log the call with recording info
    logCall(callSession, reason);
    
    // Reset state
    setTimeout(() => {
      setCallState('idle');
      setCurrentCall(null);
      setIsMuted(false);
      setIsOnHold(false);
      setIsRecording(false);
      setShowDTMFKeypad(false);
      audioFeedbackRef.current?.onCallStateChange('idle');
    }, 2000);
  };

  const handleCallFailed = ({ error, number }) => {
    console.error('❌ Call failed:', error);
    setCallState('ended');
    setError(`Call Failed: ${error}`);
    
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

  const handleDTMFSent = ({ tones, timestamp }) => {
    console.log(`📟 DTMF sent: ${tones} at ${timestamp}`);
    audioFeedbackRef.current?.playDTMFConfirmation(tones);
  };

  const handleAudioFeedback = ({ type, message }) => {
    console.log(`🔊 Audio feedback: ${type} - ${message}`);
    audioFeedbackRef.current?.playFeedback(type, message);
  };

  // Phone number input handling
  const handleNumberClick = (digit) => {
    if (callState === 'idle') {
      setPhoneNumber(prev => prev + digit);
    } else if (callState === 'active') {
      sipManagerRef.current?.sendDTMF(digit);
    }
  };

  const handleDelete = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const clearNumber = () => {
    setPhoneNumber('');
  };

  // Enhanced call handler that includes recording preferences
  const handleCall = async () => {
    if (!phoneNumber.trim() || !sipRegistered) {
      setError(sipRegistered ? 'Please enter a phone number' : 'Not connected to SIP server');
      return;
    }

    try {
      setError(null);
      
      // Make both SIP call (for real-time audio) and backend call (for recording)
      console.log('📞 Initiating dual call approach:', {
        phoneNumber,
        recordingSettings,
        leadId: leadInfo?.id
      });

      // 1. Start backend Twilio call with recording
      const backendCallPromise = callService.makeCall(
        phoneNumber,
        { 
          leadId: leadInfo?.id || null,
          from: null // Let backend use default
        },
        recordingSettings
      );

      // 2. Start SIP call for real-time audio
      const sipCallPromise = sipManagerRef.current.makeCall(phoneNumber, {
        record: recordingSettings.autoRecord
      });

      // Wait for both calls to initiate
      const [backendResult, sipResult] = await Promise.allSettled([
        backendCallPromise,
        sipCallPromise
      ]);

      // Log results
      if (backendResult.status === 'fulfilled') {
        console.log('✅ Backend call initiated:', backendResult.value);
      } else {
        console.error('❌ Backend call failed:', backendResult.reason);
      }

      if (sipResult.status === 'fulfilled') {
        console.log('✅ SIP call initiated');
      } else {
        console.error('❌ SIP call failed:', sipResult.reason);
        // If SIP fails but backend succeeds, that's still okay
      }

      // Auto-start recording UI if enabled in settings
      if (recordingSettings.autoRecord) {
        setIsRecording(true);
        console.log('🎙️ Auto-recording enabled for call');
      }
      
    } catch (error) {
      console.error('❌ Call initiation error:', error);
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
    const newMuteState = !isMuted;
    sipManagerRef.current?.setMute(newMuteState);
    
    audioFeedbackRef.current?.playFeedback(
      newMuteState ? 'muted' : 'unmuted', 
      null, 
      { priority: 'normal', vibrate: true }
    );
  };

  const handleHoldToggle = () => {
    const newHoldState = !isOnHold;
    setIsOnHold(newHoldState);
    
    if (newHoldState) {
      setCallState('hold');
      sipManagerRef.current?.holdCall();
      audioFeedbackRef.current?.onCallStateChange('hold', { wasActive: callState === 'active' });
    } else {
      setCallState('active');
      sipManagerRef.current?.resumeCall();
      audioFeedbackRef.current?.onCallStateChange('resume', { previouslyOnHold: true });
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    audioFeedbackRef.current?.setVolume(newVolume / 100);
    
    if (newVolume > 0) {
      audioFeedbackRef.current?.playFeedback('qualityGood', `Volume ${newVolume}%`, { 
        priority: 'low',
        vibrate: false 
      });
    }
  };

  const handleTransfer = (transferNumber) => {
    console.log(`📞 Transferring call to: ${transferNumber}`);
    setError('Call transfer feature coming soon');
    setTimeout(() => setError(null), 3000);
  };

  const handleConference = () => {
    console.log('👥 Starting conference call');
    setError('Conference call feature coming soon');
    setTimeout(() => setError(null), 3000);
  };

  const handleRecord = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    audioFeedbackRef.current?.playFeedback(
      newRecordingState ? 'recordingStarted' : 'recordingStopped',
      null,
      { priority: 'normal', vibrate: true }
    );
    
    console.log(`🔴 Recording: ${newRecordingState ? 'started' : 'stopped'}`);
  };

  const handleDTMFKeyPress = (key, transmissionInfo = {}) => {
    console.log(`🔢 DTMF key pressed: ${key}`, transmissionInfo);
    
    let success = transmissionInfo.transmitted;
    
    if (!transmissionInfo.transmitted) {
      success = sipManagerRef.current?.sendDTMF(key);
      
      if (!success) {
        setError('Failed to send DTMF tone - call may not be active');
        audioFeedbackRef.current?.playFeedback('error', 'DTMF failed', { priority: 'normal' });
        setTimeout(() => setError(null), 3000);
        return;
      }
    }
    
    if (success) {
      audioFeedbackRef.current?.playDTMFConfirmation(key);
    }
  };

  const handleShowDTMF = () => {
    if (callState === 'active') {
      setShowDTMFKeypad(true);
    }
  };

  const handleQuickDial = (number, callInfo) => {
    setPhoneNumber(number);
    if (leadInfo && callInfo) {
      // Could pre-populate lead info here
    }
  };

  // Enhanced call logging with recording information
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
        leadId: leadInfo?.id || null,
        recordingInfo: {
          wasRecorded: isRecording,
          recordingSettings: recordingSettings,
          autoTranscribeEnabled: recordingSettings.autoTranscribe
        }
      };

      if (onCallLogged) {
        await onCallLogged(callData);
      }

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
      {/* Header with Recording Settings Toggle */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
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
          
          {/* Recording Settings Button */}
          <button
            onClick={() => setShowRecordingSettings(!showRecordingSettings)}
            className={`p-2 rounded-lg transition-colors ${
              recordingSettings.autoRecord
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Recording Settings"
          >
            <span className="text-lg">
              {recordingSettings.autoRecord ? '🔴' : '⚪'}
            </span>
          </button>
        </div>

        {/* Recording Settings Panel */}
        {showRecordingSettings && (
          <div className="mb-4">
            <RecordingSettings 
              compact={true}
              onSettingsChange={(settings) => {
                console.log('Recording settings updated:', settings);
              }}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Recording Status Indicator */}
        {recordingSettings.autoRecord && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-700">🎙️ Auto-recording enabled</span>
              <div className="flex items-center space-x-2 text-xs text-red-600">
                {recordingSettings.autoTranscribe && <span>📝 Transcription</span>}
                {recordingSettings.speechAnalytics && <span>📊 Analytics</span>}
              </div>
            </div>
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
            {recordingSettings.autoRecord && <span className="ml-2 text-sm">🔴</span>}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button 
                onClick={handleShowDTMF}
                disabled={callState !== 'active'}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                  callState === 'active'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                🔢 DTMF Keypad
              </button>
              <button 
                onClick={handleHangup}
                className="flex-1 py-3 text-lg bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
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
        isInCall={callState === 'active' || callState === 'hold'}
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
        callState={callState}
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
        sipManager={sipManagerRef.current}
        dtmfMethod={dtmfMethod}
      />
    </div>
  );
};

export default EnhancedVOIPPhoneWithRecording;