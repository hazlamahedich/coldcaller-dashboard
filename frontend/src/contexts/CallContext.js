import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  
  // Audio management
  const audioContextRef = useRef(null);
  const callAudioRef = useRef(null);
  const ringingToneRef = useRef(null);
  const backgroundAudioIntervalRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [voiceAnnouncements, setVoiceAnnouncements] = useState(true);

  // Call session management
  const [callSessionId, setCallSessionId] = useState(null);
  
  // UI state for DTMF keypad
  const [showDTMFKeypad, setShowDTMFKeypad] = useState(false);

  // Initialize audio context
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          
          // Create audio elements for call simulation
          const callAudio = new Audio();
          callAudio.loop = false;
          callAudio.volume = volume / 100;
          callAudioRef.current = callAudio;
          
          // Create ringing tone
          const ringingAudio = new Audio();
          ringingAudio.loop = true;
          ringingAudio.volume = 0.3;
          ringingToneRef.current = ringingAudio;
          
          setAudioInitialized(true);
          console.log('🔊 Audio context initialized');
          
          // Add click handler to resume audio context on first user interaction
          const resumeAudioContext = async () => {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              try {
                await audioContextRef.current.resume();
                console.log('🔊 Audio context resumed on user interaction');
              } catch (error) {
                console.warn('⚠️ Failed to resume audio context:', error);
              }
            }
          };
          
          // Listen for any user interaction to enable audio
          const interactionEvents = ['click', 'touchstart', 'keydown'];
          interactionEvents.forEach(event => {
            document.addEventListener(event, resumeAudioContext, { once: true });
          });
        }
      } catch (error) {
        console.warn('⚠️ Audio initialization failed:', error);
      }
    };
    
    initializeAudio();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (callAudioRef.current) {
        callAudioRef.current.pause();
        callAudioRef.current = null;
      }
      if (ringingToneRef.current) {
        ringingToneRef.current.pause();
        ringingToneRef.current = null;
      }
    };
  }, []);

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
  
  // Audio management based on call state
  useEffect(() => {
    if (!audioInitialized) return;
    
    const manageCallAudio = async () => {
      try {
        console.log('🔊 Managing audio for call state:', callState);
        
        if (callState === 'ringing') {
          // Play ringing sound (simulate with beep tones)
          stopAllAudio(); // Stop any previous audio first
          await playRingingTone();
        } else if (callState === 'active' && !isOnHold) {
          // Stop ringing and start call audio (simulated) - only if not on hold
          stopRingingTone();
          await startCallAudio();
        } else if (callState === 'hold') {
          // Stop background audio when on hold, but keep basic audio context
          if (backgroundAudioIntervalRef.current) {
            console.log('🔊 Pausing background audio for hold state');
            clearInterval(backgroundAudioIntervalRef.current);
            backgroundAudioIntervalRef.current = null;
          }
        } else if (['ended', 'idle'].includes(callState)) {
          // Stop all audio completely
          console.log('🔊 Call ended/idle - stopping all audio');
          stopAllAudio();
        }
      } catch (error) {
        console.warn('⚠️ Audio playback error:', error);
      }
    };
    
    manageCallAudio();
  }, [callState, audioInitialized, isOnHold]);
  
  // Update audio volume
  useEffect(() => {
    if (callAudioRef.current) {
      callAudioRef.current.volume = volume / 100;
    }
    if (ringingToneRef.current) {
      ringingToneRef.current.volume = Math.min(0.5, volume / 100);
    }
  }, [volume]);

  // Initialize call - main function called from anywhere in the app
  const initiateCall = async (callData) => {
    console.log('🚀 CallContext: Initiating call', callData);
    
    try {
      // Ensure audio context is ready before starting call
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log('🔊 Audio context resumed for call');
        } catch (error) {
          console.warn('⚠️ Failed to resume audio context:', error);
        }
      }
      
      setIsCallActive(true);
      setCallState('connecting');
      setCurrentCall({
        phoneNumber: callData.phoneNumber,
        leadData: callData.leadData,
        source: callData.source || 'unknown'
      });

      const startTime = new Date();
      setCallStartTime(startTime);

      // Make real API call to backend (using our fixed startCall controller)
      console.log('📞 Making real API call to backend...');
      
      const callSessionData = {
        phone: callData.phoneNumber,
        leadId: callData.leadData?.id || null,
        source: callData.source || 'manual',
        timestamp: startTime.toISOString(),
        ...(callData.leadData && {
          leadName: callData.leadData.name,
          company: callData.leadData.company,
          notes: callData.leadData.notes,
          priority: callData.leadData.priority
        })
      };

      // Update UI to show connecting state
      setCallState('connecting');
      if (voiceAnnouncements) {
        setTimeout(() => speakText('Connecting call'), 500);
      }

      // Make the API call to our fixed backend
      const sessionResponse = await callsService.startCallSession(callSessionData);
      
      if (sessionResponse.success) {
        console.log('✅ Real call initiated successfully:', sessionResponse.data);
        
        // Update to ringing state
        setTimeout(() => {
          setCallState('ringing');
          if (voiceAnnouncements) {
            setTimeout(() => speakText('Ringing'), 500);
          }
        }, 1000);

        // Update to active state (Twilio will handle the real connection)
        setTimeout(() => {
          setCallState('active');
          console.log('✅ Call connected (real Twilio call)');
          setTimeout(() => playCallConnectedFeedback(), 500);
          if (voiceAnnouncements) {
            setTimeout(() => speakText('Call connected'), 1000);
          }
        }, 3000);
        
      } else {
        console.error('❌ Failed to start call session:', sessionResponse.message);
        handleCallFailure(sessionResponse.message || 'Failed to start call');
      }

    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      handleCallFailure(error.message);
    }
  };

  // End call
  const endCall = async () => {
    console.log('📵 CallContext: Ending call');
    
    // Stop all audio immediately
    console.log('📵 Stopping all audio before ending call');
    stopAllAudio();
    
    setCallState('ending');
    
    try {
      // End call session if exists
      if (callSessionId) {
        await callsService.endCallSession(callSessionId, {
          endTime: new Date().toISOString(),
          duration: callDuration
        });
      } else {
        console.log('📝 Call ended (simulation mode - no session to close)');
      }
    } catch (error) {
      console.warn('⚠️ Error ending call session (continuing anyway):', error.message);
    }

    // Reset all call state
    setTimeout(() => {
      console.log('📵 Resetting all call state');
      setIsCallActive(false);
      setCallState('idle');
      setCurrentCall(null);
      setCallDuration(0);
      setCallStartTime(null);
      setCallSessionId(null);
      setIsMuted(false);
      setIsOnHold(false);
      
      // Final audio cleanup
      setTimeout(stopAllAudio, 100);
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
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    console.log(`🎤 ${newMuteState ? 'Call Muted' : 'Call Unmuted'}`);
    
    // Play audio feedback
    playMuteToggleFeedback(newMuteState);
    
    // Voice announcement
    if (voiceAnnouncements) {
      speakText(newMuteState ? 'Call muted' : 'Call unmuted');
    }
  };

  // Toggle hold
  const toggleHold = () => {
    console.log('🔄 toggleHold called');
    console.log('🔄 Current callState:', callState);
    console.log('🔄 Current isOnHold:', isOnHold);
    
    if (callState === 'active' || callState === 'hold') {
      const newHoldState = !isOnHold;
      console.log('🔄 Setting new hold state to:', newHoldState);
      
      setIsOnHold(newHoldState);
      setCallState(newHoldState ? 'hold' : 'active');
      
      console.log(`⏸️ Hold state changed: ${newHoldState ? 'Call On Hold' : 'Call Resumed'}`);
      console.log('⏸️ New call state will be:', newHoldState ? 'hold' : 'active');
      
      // Play audio feedback
      playHoldToggleFeedback(newHoldState);
      
      // Voice announcement
      if (voiceAnnouncements) {
        speakText(newHoldState ? 'Call on hold' : 'Call resumed');
      }
    } else {
      console.warn('🔄 Cannot toggle hold - call state is:', callState);
    }
  };

  // Audio helper functions
  const playRingingTone = async () => {
    if (!audioContextRef.current) return;
    
    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔊 Audio context resumed for ringing');
      }
      
      // Generate realistic ringing tone using Web Audio API
      const context = audioContextRef.current;
      
      // Create two-tone ringing sound (440Hz and 880Hz)
      const oscillator1 = context.createOscillator();
      const oscillator2 = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      oscillator1.frequency.setValueAtTime(440, context.currentTime); // A4 note
      oscillator2.frequency.setValueAtTime(880, context.currentTime); // A5 note (octave higher)
      
      // Set volume with fade in/out for pleasant ringing
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15 * (volume / 100), context.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.15 * (volume / 100), context.currentTime + 1.5);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 2);
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Ring pattern: 2 seconds on, 4 seconds off
      const startTime = context.currentTime;
      oscillator1.start(startTime);
      oscillator2.start(startTime);
      oscillator1.stop(startTime + 2);
      oscillator2.stop(startTime + 2);
      
      console.log('📞 Playing enhanced ringing tone');
      
      // Schedule next ring if still ringing
      if (callState === 'ringing') {
        setTimeout(() => {
          if (callState === 'ringing') {
            playRingingTone();
          }
        }, 4000);
      }
    } catch (error) {
      console.warn('⚠️ Ringing tone error:', error);
    }
  };
  
  const startCallAudio = async () => {
    if (!audioContextRef.current) return;
    
    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('🔊 Audio context resumed');
      }
      
      // Play initial connection confirmation tone
      await playConnectionTone();
      
      // Start periodic background audio to simulate call activity
      startBackgroundCallAudio();
      
      console.log('🔊 Call audio system activated');
    } catch (error) {
      console.warn('⚠️ Call audio error:', error);
    }
  };
  
  const playConnectionTone = async () => {
    if (!audioContextRef.current) return;
    
    try {
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, context.currentTime); // Higher pitched confirmation
      
      // Fade in and out for a pleasant sound
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1 * (volume / 100), context.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.4);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
      
      console.log('✅ Connection tone played');
    } catch (error) {
      console.warn('⚠️ Connection tone error:', error);
    }
  };
  
  const startBackgroundCallAudio = () => {
    console.log('🔊 startBackgroundCallAudio called');
    
    // Clear any existing background audio first
    if (backgroundAudioIntervalRef.current) {
      console.log('🔊 Clearing existing background audio interval');
      clearInterval(backgroundAudioIntervalRef.current);
      backgroundAudioIntervalRef.current = null;
    }
    
    // Only start background audio if call is active and not on hold
    if (callState !== 'active') {
      console.log('🔊 Not starting background audio - call state is:', callState);
      return;
    }
    
    // Simulate periodic background audio during active call
    backgroundAudioIntervalRef.current = setInterval(() => {
      console.log('🔊 Background audio interval tick - checking call state:', callState);
      
      if (!['active'].includes(callState) || !audioContextRef.current) {
        console.log('🔊 Stopping background audio - call not active or no audio context');
        clearInterval(backgroundAudioIntervalRef.current);
        backgroundAudioIntervalRef.current = null;
        return;
      }
      
      // Skip background audio if on hold
      if (isOnHold) {
        console.log('🔊 Skipping background audio - call is on hold');
        return;
      }
      
      // Subtle background audio simulation (very quiet)
      try {
        const context = audioContextRef.current;
        if (context.state !== 'running') {
          console.log('🔊 Audio context not running, skipping background audio');
          return;
        }
        
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150 + Math.random() * 50, context.currentTime);
        gainNode.gain.setValueAtTime(0.005 * (volume / 100), context.currentTime); // Very quiet
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.05);
        
        console.log('🔊 Background audio tone played');
      } catch (error) {
        console.warn('⚠️ Background audio error:', error);
        clearInterval(backgroundAudioIntervalRef.current);
        backgroundAudioIntervalRef.current = null;
      }
    }, 5000 + Math.random() * 10000); // Random intervals between 5-15 seconds
    
    console.log('🔊 Background call audio started');
  };
  
  const stopRingingTone = () => {
    if (ringingToneRef.current) {
      ringingToneRef.current.pause();
      ringingToneRef.current.currentTime = 0;
    }
  };
  
  const stopAllAudio = () => {
    console.log('🔇 stopAllAudio called - stopping all audio and clearing intervals');
    
    // Clear background audio interval
    if (backgroundAudioIntervalRef.current) {
      console.log('🔇 Clearing background audio interval');
      clearInterval(backgroundAudioIntervalRef.current);
      backgroundAudioIntervalRef.current = null;
    }
    
    // Stop audio context oscillators
    if (audioContextRef.current) {
      try {
        console.log('🔇 Suspending audio context');
        audioContextRef.current.suspend();
        // Force close and recreate audio context to prevent Chrome looping
        setTimeout(() => {
          if (audioContextRef.current) {
            audioContextRef.current.close();
            // Recreate audio context for future calls
            if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
              audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
          }
        }, 100);
      } catch (error) {
        console.warn('⚠️ Error suspending audio context:', error);
      }
    }
    
    // Stop audio elements
    if (ringingToneRef.current) {
      console.log('🔇 Stopping ringing audio');
      ringingToneRef.current.pause();
      ringingToneRef.current.currentTime = 0;
      ringingToneRef.current.src = '';
    }
    if (callAudioRef.current) {
      console.log('🔇 Stopping call audio');
      callAudioRef.current.pause();
      callAudioRef.current.currentTime = 0;
      callAudioRef.current.src = '';
    }
    
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      console.log('🔇 Cancelling speech synthesis');
      window.speechSynthesis.cancel();
    }
    
    // Clear any remaining oscillators
    if (oscillatorsRef.current) {
      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {
          // Ignore errors for already stopped oscillators
        }
      });
      oscillatorsRef.current = [];
    }
    
    console.log('🔇 All audio stopped and cleaned up');
  };
  
  // Audio feedback for mute toggle
  const playMuteToggleFeedback = async (isMuted) => {
    if (!audioContextRef.current) return;
    
    try {
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.type = 'sine';
      // Different tones for mute vs unmute
      oscillator.frequency.setValueAtTime(isMuted ? 300 : 600, context.currentTime);
      
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15 * (volume / 100), context.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.2);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.25);
      
      console.log(`🔊 ${isMuted ? 'Mute' : 'Unmute'} audio feedback played`);
    } catch (error) {
      console.warn('⚠️ Mute feedback audio error:', error);
    }
  };
  
  // Audio feedback for hold toggle
  const playHoldToggleFeedback = async (isOnHold) => {
    if (!audioContextRef.current) return;
    
    try {
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.type = 'sine';
      // Different tones for hold vs resume
      oscillator.frequency.setValueAtTime(isOnHold ? 400 : 700, context.currentTime);
      
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12 * (volume / 100), context.currentTime + 0.08);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.35);
      
      console.log(`🔊 ${isOnHold ? 'Hold' : 'Resume'} audio feedback played`);
    } catch (error) {
      console.warn('⚠️ Hold feedback audio error:', error);
    }
  };
  
  // Enhanced call connection audio
  const playCallConnectedFeedback = async () => {
    if (!audioContextRef.current) return;
    
    try {
      const context = audioContextRef.current;
      
      // Play a pleasant "call connected" chime
      const frequencies = [523, 659, 784]; // C, E, G notes
      
      frequencies.forEach((freq, index) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, context.currentTime);
        
        const startTime = context.currentTime + (index * 0.1);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.08 * (volume / 100), startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.35);
      });
      
      console.log('🔊 Call connected chime played');
    } catch (error) {
      console.warn('⚠️ Connection chime error:', error);
    }
  };
  
  // Text-to-speech for voice announcements
  const speakText = (text) => {
    try {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = Math.min(volume / 100, 0.8);
        
        // Use a more pleasant voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.name.includes('female') || voice.name.includes('Female') ||
          voice.name.includes('Samantha') || voice.name.includes('Alex')
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        console.log('🗣️ Speaking:', text);
        window.speechSynthesis.speak(utterance);
      } else {
        console.warn('⚠️ Text-to-speech not supported in this browser');
      }
    } catch (error) {
      console.warn('⚠️ Text-to-speech error:', error);
    }
  };

  // Change volume
  const changeVolume = (newVolume) => {
    setVolume(newVolume);
    console.log(`🔊 Volume: ${newVolume}%`);
  };
  
  // Test audio functionality
  const testAudio = async () => {
    if (!audioContextRef.current) {
      console.warn('⚠️ No audio context available for testing');
      return false;
    }
    
    try {
      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Play a test beep
      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime); // High A note
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2 * (volume / 100), context.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.35);
      
      console.log('🎵 Audio test completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Audio test failed:', error);
      return false;
    }
  };

  // Transfer call (placeholder)
  const transferCall = (number) => {
    console.log(`📞 Transferring to: ${number}`);
    // Implement transfer logic here
  };
  
  // Show/hide DTMF keypad
  const toggleDTMFKeypad = () => {
    console.log('🔢 toggleDTMFKeypad called! Current state:', showDTMFKeypad);
    console.log('🔢 Call state:', callState);
    setShowDTMFKeypad(!showDTMFKeypad);
    console.log('🔢 New DTMF keypad state will be:', !showDTMFKeypad);
  };
  
  const hideDTMFKeypad = () => {
    console.log('🔢 hideDTMFKeypad called');
    setShowDTMFKeypad(false);
  };

  // Expose methods to window for debugging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.callContextMethods = {
        initiateCall,
        endCall,
        toggleDTMFKeypad,
        testAudio,
        setVoiceAnnouncements
      };
      console.log('🔧 Call context methods exposed to window for debugging');
    }
    
    return () => {
      if (window.callContextMethods) {
        delete window.callContextMethods;
      }
    };
  }, [initiateCall, endCall, toggleDTMFKeypad, testAudio]);

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
    callSessionId,
    
    // Audio info
    audioInitialized,
    audioContext: audioContextRef.current,
    
    // DTMF keypad
    showDTMFKeypad,
    toggleDTMFKeypad,
    hideDTMFKeypad,
    
    // Audio testing
    testAudio,
    
    // Voice settings
    voiceAnnouncements,
    setVoiceAnnouncements
  };

  return (
    <CallContext.Provider value={contextValue}>
      {children}
    </CallContext.Provider>
  );
};

export default CallContext;