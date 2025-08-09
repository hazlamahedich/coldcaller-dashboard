import React, { createContext, useContext, useState, useEffect } from 'react';
import { callsService } from '../services';

// Create Call Context
const CallContext = createContext();

// Custom hook to use Call Context
export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

// Call Provider Component
export const CallProvider = ({ children }) => {
  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [callState, setCallState] = useState('idle'); // idle, connecting, ringing, active, hold, ending, ended
  const [currentCall, setCurrentCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  
  // Call controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [volume, setVolume] = useState(50);
  const [connectionQuality, setConnectionQuality] = useState('excellent');

  // Call session management
  const [callSessionId, setCallSessionId] = useState(null);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (callState === 'active' && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((new Date() - callStartTime) / 1000));
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState, callStartTime]);

  // Initialize call - main function called from anywhere in the app
  const initiateCall = async (callData) => {
    console.log('🚀 CallContext: Initiating call', callData);
    
    try {
      setIsCallActive(true);
      setCallState('connecting');
      setCurrentCall({
        phoneNumber: callData.phoneNumber,
        leadData: callData.leadData,
        source: callData.source || 'unknown'
      });

      const startTime = new Date();
      setCallStartTime(startTime);

      // Start call session tracking
      const sessionResponse = await callsService.startCallSession({
        phone: callData.phoneNumber,
        timestamp: startTime.toISOString(),
        ...(callData.leadData && {
          leadId: callData.leadData.id,
          leadName: callData.leadData.name,
          company: callData.leadData.company,
          notes: callData.leadData.notes,
          priority: callData.leadData.priority
        })
      });

      if (sessionResponse.success) {
        setCallSessionId(sessionResponse.data.sessionId);
        console.log('✅ Call session started:', sessionResponse.data.sessionId);
      }

      // Simulate call progression
      setTimeout(() => {
        setCallState('ringing');
      }, 1000);

      // Simulate call connection (80% success rate)
      setTimeout(() => {
        if (Math.random() > 0.2) {
          setCallState('active');
          console.log('✅ Call connected');
        } else {
          handleCallFailure('Connection failed');
        }
      }, 3000 + Math.random() * 2000);

    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      handleCallFailure(error.message);
    }
  };

  // End call
  const endCall = async () => {
    console.log('📵 CallContext: Ending call');
    
    setCallState('ending');
    
    try {
      // End call session if exists
      if (callSessionId) {
        await callsService.endCallSession(callSessionId, {
          endTime: new Date().toISOString(),
          duration: callDuration
        });
      }
    } catch (error) {
      console.error('❌ Error ending call session:', error);
    }

    // Reset all call state
    setTimeout(() => {
      setIsCallActive(false);
      setCallState('idle');
      setCurrentCall(null);
      setCallDuration(0);
      setCallStartTime(null);
      setCallSessionId(null);
      setIsMuted(false);
      setIsOnHold(false);
    }, 1000);
  };

  // Handle call failure
  const handleCallFailure = (reason) => {
    console.error('📵 CallContext: Call failed:', reason);
    setCallState('ended');
    
    setTimeout(() => {
      setIsCallActive(false);
      setCallState('idle');
      setCurrentCall(null);
      setCallStartTime(null);
      setCallSessionId(null);
    }, 3000);
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log(`🎤 ${!isMuted ? 'Muted' : 'Unmuted'}`);
  };

  // Toggle hold
  const toggleHold = () => {
    if (callState === 'active') {
      setIsOnHold(!isOnHold);
      setCallState(isOnHold ? 'active' : 'hold');
      console.log(`⏸️ ${!isOnHold ? 'On Hold' : 'Resumed'}`);
    }
  };

  // Change volume
  const changeVolume = (newVolume) => {
    setVolume(newVolume);
    console.log(`🔊 Volume: ${newVolume}%`);
  };

  // Transfer call (placeholder)
  const transferCall = (number) => {
    console.log(`📞 Transferring to: ${number}`);
    // Implement transfer logic here
  };

  const contextValue = {
    // Call state
    isCallActive,
    callState,
    currentCall,
    callDuration,
    callStartTime,
    
    // Controls state
    isMuted,
    isOnHold,
    volume,
    connectionQuality,
    
    // Call actions
    initiateCall,
    endCall,
    toggleMute,
    toggleHold,
    changeVolume,
    transferCall,
    
    // Session info
    callSessionId
  };

  return (
    <CallContext.Provider value={contextValue}>
      {children}
    </CallContext.Provider>
  );
};

export default CallContext;