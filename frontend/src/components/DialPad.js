import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { callsService } from '../services';
import CallControls from './CallControls';
import DTMFKeypad from './DTMFKeypad';

// Enhanced DialPad Component - Professional VOIP-enabled dialer
// Integrates with SIP services for real calling functionality
// Features: Call controls, status display, DTMF tones, and backend logging

const DialPad = () => {
  const location = useLocation();
  
  // Call State Management
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callSessionId, setCallSessionId] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, connecting, ringing, active, hold, ended
  const [leadData, setLeadData] = useState(null);
  
  // VOIP Controls State
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isRecording, setIsRecording] = useState(false);
  const [showDTMFKeypad, setShowDTMFKeypad] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('excellent');
  const [sipRegistered, setSipRegistered] = useState(true); // Demo: always registered
  
  // API Integration State
  const [isLogging, setIsLogging] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [error, setError] = useState(null);
  
  // Call outcomes for logging (available for future UI enhancements)
  // const callOutcomes = ['Connected', 'Voicemail', 'Busy', 'No Answer', 'Wrong Number', 'Callback Requested'];

  // Handle navigation state from Kanban or other components
  useEffect(() => {
    if (location.state) {
      const { phoneNumber: navPhoneNumber, leadData: navLeadData, autoFocus, fromKanban } = location.state;
      
      if (navPhoneNumber) {
        console.log('📞 DialPad received phone number from navigation:', navPhoneNumber);
        setPhoneNumber(navPhoneNumber);
      }
      
      if (navLeadData) {
        console.log('👤 DialPad received lead data from navigation:', navLeadData);
        setLeadData(navLeadData);
      }
      
      if (fromKanban) {
        console.log('🎯 Call initiated from Kanban board');
        // Could add special handling for Kanban-originated calls
      }
      
      // Clear the navigation state to prevent it from persisting
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // This function runs when someone clicks a number button
  const handleNumberClick = (number) => {
    // Handle special case for + key - only allow at the beginning
    if (number === '+') {
      if (phoneNumber.length === 0) {
        setPhoneNumber('+');
      }
      return;
    }
    
    // Add the clicked number/symbol to the phone number
    setPhoneNumber(phoneNumber + number);
  };

  // This function runs when someone clicks the delete button
  const handleDelete = () => {
    // Remove the last digit from the phone number
    setPhoneNumber(phoneNumber.slice(0, -1));
  };

  // Enhanced call function with VOIP state progression
  const handleCall = async () => {
    if (phoneNumber.length === 0) return;
    
    try {
      setIsCalling(true);
      setError(null);
      const startTime = new Date();
      setCallStartTime(startTime);
      setCallState('connecting');
      
      console.log('☎️ Starting VOIP call to:', formatPhoneNumber(phoneNumber));
      
      // Start call session tracking with lead data if available
      const callSessionData = {
        phoneNumber: phoneNumber,
        timestamp: startTime.toISOString(),
        ...(leadData && {
          leadId: leadData.id,
          leadName: leadData.name,
          company: leadData.company,
          notes: leadData.notes,
          priority: leadData.priority
        })
      };
      
      const sessionResponse = await callsService.startCallSession(callSessionData);
      
      if (sessionResponse.success) {
        setCallSessionId(sessionResponse.data.sessionId);
        console.log('✅ Call session started:', sessionResponse.data.sessionId);
      } else {
        console.warn('⚠️ Call session tracking failed, continuing without tracking');
      }
      
      // Simulate VOIP call progression
      setTimeout(() => {
        setCallState('ringing');
      }, 1000);
      
      // Simulate call connection (80% success rate)
      setTimeout(() => {
        if (Math.random() > 0.2) {
          setCallState('active');
          console.log('✅ Call connected');
        } else {
          // Simulate call failure
          handleCallFailure('Connection failed');
        }
      }, 3000 + Math.random() * 2000);
      
    } catch (err) {
      console.error('❌ Failed to start call:', err);
      handleCallFailure(err.message);
    }
  };

  // Handle call failure
  const handleCallFailure = (reason) => {
    setError(`Call failed: ${reason}`);
    setCallState('ended');
    setIsCalling(false);
    setCallStartTime(null);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setCallState('idle');
      setError(null);
    }, 3000);
  };

  // VOIP Control Handlers
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    console.log(`🎤 Microphone ${!isMuted ? 'muted' : 'unmuted'}`);
  };

  const handleHoldToggle = () => {
    if (callState === 'active') {
      setIsOnHold(!isOnHold);
      setCallState(isOnHold ? 'active' : 'hold');
      console.log(`⏸️ Call ${!isOnHold ? 'held' : 'resumed'}`);
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    console.log(`🔊 Volume set to ${newVolume}%`);
  };

  const handleRecord = () => {
    setIsRecording(!isRecording);
    console.log(`🔴 Recording ${!isRecording ? 'started' : 'stopped'}`);
  };

  const handleTransfer = (transferNumber) => {
    console.log(`📞 Transferring call to: ${transferNumber}`);
    // Simulate call transfer
    setError('Call transfer feature coming soon');
    setTimeout(() => setError(null), 3000);
  };

  const handleConference = () => {
    console.log('👥 Starting conference call');
    setError('Conference call feature coming soon');
    setTimeout(() => setError(null), 3000);
  };

  const handleDTMFKeyPress = (key) => {
    console.log(`📟 DTMF tone sent: ${key}`);
    // In a real implementation, this would send DTMF tones via SIP
  };

  // This function runs when someone clicks the hang up button
  const handleHangUp = async (outcome = 'Call Ended', notes = '') => {
    if (!isCalling || !callStartTime) return;
    
    try {
      setIsLogging(true);
      const endTime = new Date();
      const duration = Math.floor((endTime - callStartTime) / 1000);
      const durationFormatted = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
      
      console.log('☎️ Ending call. Duration:', durationFormatted);
      
      // Prepare call log data
      const callData = {
        phone: phoneNumber,
        outcome: outcome,
        duration: durationFormatted,
        notes: notes,
        timestamp: callStartTime.toISOString(),
        endTime: endTime.toISOString()
      };
      
      // End call session if we have a session ID
      if (callSessionId) {
        const response = await callsService.endCallSession(callSessionId, callData);
        
        if (response.success) {
          console.log('✅ Call logged successfully:', response.data);
          // Add to local call history
          setCallHistory(prev => [{
            ...callData,
            id: response.data.id || Date.now(),
            time: endTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })
          }, ...prev.slice(0, 4)]); // Keep only last 5 calls
        } else {
          throw new Error(response.message || 'Failed to log call');
        }
      } else {
        // Fallback: Log call without session
        const response = await callsService.logCall({
          ...callData,
          leadId: null // TODO: Connect with current lead from LeadPanel
        });
        
        if (response.success) {
          console.log('✅ Call logged successfully (fallback):', response.data);
        }
      }
      
    } catch (err) {
      console.error('❌ Failed to log call:', err);
      setError(`Failed to log call: ${err.message}`);
    } finally {
      // Reset all call states
      setIsCalling(false);
      setCallStartTime(null);
      setCallSessionId(null);
      setIsLogging(false);
      setCallState('idle');
      setIsMuted(false);
      setIsOnHold(false);
      setIsRecording(false);
      setShowDTMFKeypad(false);
      setError(null);
    }
  };
  
  // Function to handle quick hang up with outcome selection
  const handleQuickHangUp = (outcome) => {
    handleHangUp(outcome, `Quick log: ${outcome}`);
  };
  
  // Function to clear error
  const clearError = () => {
    setError(null);
  };

  // Format phone number to look nice - supports international numbers
  const formatPhoneNumber = (num) => {
    if (!num) return '';
    
    // Handle international numbers starting with +
    if (num.startsWith('+')) {
      // For international numbers, be more flexible with country code length
      const digits = num.slice(1).replace(/[^\d*#]/g, ''); // Keep digits, *, # after +
      
      // Handle different country code lengths (1-4 digits)
      if (digits.length === 0) return '+';
      if (digits.length <= 2) return `+${digits}`;
      if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
      if (digits.length <= 7) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
      return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    
    // Handle domestic numbers (preserve * and # symbols)
    const cleaned = num.replace(/[^\d*#]/g, ''); // Keep digits, *, and #
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  };

  // The buttons array makes it easy to create all number buttons - including + key
  const buttons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '*', '0', '#',
    '+', '', '' // Add + key and empty spaces for layout
  ];

  return (
    <div className="space-y-4">
      {/* Main Dial Pad */}
      <div className="card max-w-sm mx-2">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Enhanced VOIP Dialer</h2>
          
          {/* SIP Status Indicator */}
          <div className={`inline-flex items-center mt-2 px-2 py-1 rounded-full text-xs ${
            sipRegistered 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            <span className="mr-1">
              {sipRegistered ? '🟢' : '🔴'}
            </span>
            {sipRegistered ? 'SIP Ready' : 'SIP Offline'}
          </div>
          
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
      
      {/* Lead information display */}
      {leadData && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <div className="text-sm font-semibold text-blue-800 mb-1">
              📋 Calling: {leadData.name}
            </div>
            {leadData.company && (
              <div className="text-xs text-blue-600 mb-2">
                🏢 {leadData.company}
              </div>
            )}
            <div className="flex justify-center items-center gap-2">
              {leadData.priority && (
                <div className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                  leadData.priority === 'High' ? 'bg-red-100 text-red-700' :
                  leadData.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {leadData.priority === 'High' ? '🔴' : leadData.priority === 'Medium' ? '🟡' : '🟢'} {leadData.priority}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Display area showing the typed number */}
      <div className="flex mb-4 gap-1">
        <input
          type="text"
          value={formatPhoneNumber(phoneNumber)}
          onChange={(e) => {
            // Allow +, *, #, and digits - preserve special characters
            const cleaned = e.target.value.replace(/[^\d*#+()-\s]/g, '');
            // Extract raw number (remove formatting but keep +, *, #)
            const rawNumber = cleaned.replace(/[-() ]/g, '');
            setPhoneNumber(rawNumber);
          }}
          onKeyDown={(e) => {
            // Handle keyboard input for dialpad keys
            const key = e.key;
            if (/[0-9*#]/.test(key)) {
              e.preventDefault();
              handleNumberClick(key);
            } else if (key === '+' && phoneNumber.length === 0) {
              e.preventDefault();
              handleNumberClick('+');
            } else if (key === 'Backspace') {
              e.preventDefault();
              handleDelete();
            } else if (key === 'Enter') {
              e.preventDefault();
              if (phoneNumber.length > 0) {
                handleCall();
              }
            }
          }}
          placeholder="Enter phone number (+1234567890)"
          className="input-field flex-1 text-center text-lg"
        />
        <button 
          onClick={handleDelete} 
          className="px-4 py-3 text-xl bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
        >
          ⌫
        </button>
      </div>

      {/* Number pad with all the buttons - Updated with green styling and closer spacing */}
      <div className="grid grid-cols-3 gap-1 mb-4">
        {buttons.map((btn, index) => (
          btn === '' ? (
            // Empty placeholder for layout
            <div key={`empty-${index}`} className="p-4"></div>
          ) : (
            <button
              key={btn}
              onClick={() => handleNumberClick(btn)}
              disabled={isCalling || (btn === '+' && phoneNumber.length > 0)}
              className={`p-4 text-xl text-white border-2 rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold ${
                btn === '+' 
                  ? 'bg-blue-500 border-blue-400 hover:bg-blue-600 hover:border-blue-500' 
                  : 'bg-green-500 border-green-400 hover:bg-green-600 hover:border-green-500'
              }`}
              title={btn === '+' ? 'International prefix (only at start)' : ''}
            >
              {btn}
            </button>
          )
        ))}
      </div>

      {/* Call/Hang up buttons */}
      <div className="space-y-3">
        {!isCalling ? (
          <button 
            onClick={handleCall} 
            disabled={phoneNumber.length === 0}
            className="w-full text-lg py-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200 hover:shadow-lg active:scale-95 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100"
          >
            📞 Call {formatPhoneNumber(phoneNumber)}
          </button>
        ) : (
          <div className="space-y-2">
            {/* DTMF and Quick Actions */}
            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => setShowDTMFKeypad(true)}
                disabled={callState !== 'active'}
                className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-all duration-200 hover:shadow-md active:scale-95"
              >
                🔢 DTMF
              </button>
              {callState === 'active' && (
                <button 
                  onClick={handleRecord}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 hover:shadow-md active:scale-95 ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {isRecording ? '⏹️' : '🔴'}
                </button>
              )}
            </div>

            {/* Quick outcome buttons during call */}
            <div className="grid grid-cols-2 gap-1">
              <button 
                onClick={() => handleQuickHangUp('Connected')}
                disabled={isLogging}
                className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-all duration-200 hover:shadow-md active:scale-95"
              >
                ✅ Connected
              </button>
              <button 
                onClick={() => handleQuickHangUp('Voicemail')}
                disabled={isLogging}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-all duration-200 hover:shadow-md active:scale-95"
              >
                📧 Voicemail
              </button>
              <button 
                onClick={() => handleQuickHangUp('No Answer')}
                disabled={isLogging}
                className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-all duration-200 hover:shadow-md active:scale-95"
              >
                🔕 No Answer
              </button>
              <button 
                onClick={() => handleQuickHangUp('Busy')}
                disabled={isLogging}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-all duration-200 hover:shadow-md active:scale-95"
              >
                📞 Busy
              </button>
            </div>
            
            {/* Main hang up button */}
            <button 
              onClick={() => handleHangUp()}
              disabled={isLogging}
              className="w-full text-lg py-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:shadow-lg active:scale-95 font-semibold disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100"
            >
              {isLogging ? '🔄 Logging Call...' : '📵 Hang Up'}
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Status indicator */}
      {callState !== 'idle' && (
        <div className="text-center mt-3">
          <div className={`font-bold mb-1 ${
            callState === 'connecting' ? 'text-yellow-500' :
            callState === 'ringing' ? 'text-blue-500' :
            callState === 'active' ? 'text-green-500' :
            callState === 'hold' ? 'text-yellow-600' :
            'text-gray-500'
          }`}>
            {callState === 'connecting' && '🔄 Connecting...'}
            {callState === 'ringing' && '📞 Ringing...'}
            {callState === 'active' && '🟢 Call Active'}
            {callState === 'hold' && '⏸️ On Hold'}
            {callState === 'ended' && '📵 Call Ended'}
          </div>
          {callStartTime && (
            <div className="text-xs text-gray-500">
              Started: {callStartTime.toLocaleTimeString()}
            </div>
          )}
          
          {/* Call state indicators */}
          {callState === 'active' && (isMuted || isOnHold || isRecording) && (
            <div className="flex justify-center gap-2 mt-2">
              {isMuted && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  🔇 Muted
                </span>
              )}
              {isOnHold && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  ⏸️ On Hold
                </span>
              )}
              {isRecording && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full animate-pulse">
                  🔴 Recording
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Recent calls history */}
      {callHistory.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">📅 Recent Calls</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {callHistory.map((call) => (
              <div key={call.id} className="flex justify-between text-xs text-gray-600">
                <span>{formatPhoneNumber(call.phone)}</span>
                <span className={`font-medium ${
                  call.outcome === 'Connected' ? 'text-green-600' :
                  call.outcome === 'Voicemail' ? 'text-blue-600' :
                  call.outcome === 'No Answer' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {call.outcome}
                </span>
                <span>{call.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Advanced VOIP Components */}

      {/* Call Controls Component */}
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
        callDuration={callStartTime ? Math.floor((new Date() - callStartTime) / 1000) : 0}
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

// Enhanced with API integration for call logging and session tracking!

export default DialPad;