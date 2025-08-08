import React, { useState } from 'react';
import { callsService } from '../services';

// DialPad Component - This creates a phone keypad like on your smartphone
// It lets users type phone numbers and shows a call/hang up button
// Now integrated with backend API services for call logging

const DialPad = () => {
  // Call State Management
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callSessionId, setCallSessionId] = useState(null);
  
  // API Integration State
  const [isLogging, setIsLogging] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [error, setError] = useState(null);
  
  // Call outcomes for logging (available for future UI enhancements)
  // const callOutcomes = ['Connected', 'Voicemail', 'Busy', 'No Answer', 'Wrong Number', 'Callback Requested'];

  // This function runs when someone clicks a number button
  const handleNumberClick = (number) => {
    // Add the clicked number to the phone number
    setPhoneNumber(phoneNumber + number);
  };

  // This function runs when someone clicks the delete button
  const handleDelete = () => {
    // Remove the last digit from the phone number
    setPhoneNumber(phoneNumber.slice(0, -1));
  };

  // This function runs when someone clicks the call button
  const handleCall = async () => {
    if (phoneNumber.length === 0) return;
    
    try {
      setIsCalling(true);
      setError(null);
      const startTime = new Date();
      setCallStartTime(startTime);
      
      console.log('☎️ Starting call to:', formatPhoneNumber(phoneNumber));
      
      // Start call session tracking
      const sessionResponse = await callsService.startCallSession({
        phone: phoneNumber,
        timestamp: startTime.toISOString()
      });
      
      if (sessionResponse.success) {
        setCallSessionId(sessionResponse.data.sessionId);
        console.log('✅ Call session started:', sessionResponse.data.sessionId);
      } else {
        console.warn('⚠️ Call session tracking failed, continuing without tracking');
      }
      
      // In a real application, this would initiate actual calling
      // For now, we simulate the calling state
      
    } catch (err) {
      console.error('❌ Failed to start call:', err);
      setError('Failed to initiate call');
      setIsCalling(false);
      setCallStartTime(null);
    }
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
      // Reset call state
      setIsCalling(false);
      setCallStartTime(null);
      setCallSessionId(null);
      setIsLogging(false);
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

  // Format phone number to look nice (555) 123-4567
  const formatPhoneNumber = (num) => {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // The buttons array makes it easy to create all number buttons
  const buttons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '*', '0', '#'
  ];

  return (
    <div className="card max-w-sm mx-2">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Dial Pad</h2>
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
      
      {/* Display area showing the typed number */}
      <div className="flex mb-4 gap-1">
        <input
          type="text"
          value={formatPhoneNumber(phoneNumber)}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter phone number"
          className="input-field flex-1 text-center text-lg"
        />
        <button 
          onClick={handleDelete} 
          className="px-4 py-3 text-xl bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
        >
          ⌫
        </button>
      </div>

      {/* Number pad with all the buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {buttons.map((btn) => (
          <button
            key={btn}
            onClick={() => handleNumberClick(btn)}
            disabled={isCalling}
            className="p-4 text-xl bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {btn}
          </button>
        ))}
      </div>

      {/* Call/Hang up buttons */}
      <div className="space-y-3">
        {!isCalling ? (
          <button 
            onClick={handleCall} 
            disabled={phoneNumber.length === 0}
            className="btn-primary w-full text-lg py-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            📞 Call {formatPhoneNumber(phoneNumber)}
          </button>
        ) : (
          <div className="space-y-2">
            {/* Quick outcome buttons during call */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleQuickHangUp('Connected')}
                disabled={isLogging}
                className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
              >
                ✅ Connected
              </button>
              <button 
                onClick={() => handleQuickHangUp('Voicemail')}
                disabled={isLogging}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
              >
                📧 Voicemail
              </button>
              <button 
                onClick={() => handleQuickHangUp('No Answer')}
                disabled={isLogging}
                className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
              >
                🔕 No Answer
              </button>
              <button 
                onClick={() => handleQuickHangUp('Busy')}
                disabled={isLogging}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
              >
                📞 Busy
              </button>
            </div>
            
            {/* Main hang up button */}
            <button 
              onClick={() => handleHangUp()}
              disabled={isLogging}
              className="btn-danger w-full text-lg py-4 disabled:opacity-50"
            >
              {isLogging ? '🔄 Logging Call...' : '📵 Hang Up'}
            </button>
          </div>
        )}
      </div>

      {/* Status indicator */}
      {isCalling && (
        <div className="text-center mt-3">
          <div className="text-red-500 font-bold mb-1">
            🔴 Call in progress...
          </div>
          {callStartTime && (
            <div className="text-xs text-gray-500">
              Started: {callStartTime.toLocaleTimeString()}
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
  );
};

// Enhanced with API integration for call logging and session tracking!

export default DialPad;