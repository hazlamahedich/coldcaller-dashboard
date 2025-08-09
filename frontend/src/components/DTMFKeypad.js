import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * DTMFKeypad Component - In-call DTMF tone generation
 * Provides keypad overlay during active calls for menu navigation and tone sending
 */

const DTMFKeypad = ({ 
  isVisible = false, 
  onKeyPress,
  onClose,
  isInCall = false,
  showToneAnimation = true,
  sipManager = null,
  dtmfMethod = 'rfc4733'
}) => {
  const { isDarkMode } = useTheme();
  const [pressedKey, setPressedKey] = useState(null);
  const [toneHistory, setToneHistory] = useState('');
  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);

  // DTMF frequency mapping for dual-tone multi-frequency
  const dtmfFrequencies = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
  };

  const keypadLayout = [
    ['1', '2', '3'],
    ['4', '5', '6'], 
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  // Initialize audio context for DTMF tone generation
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play DTMF tone
  const playDTMFTone = (key) => {
    if (!audioContextRef.current || !dtmfFrequencies[key]) return;

    const context = audioContextRef.current;
    const [lowFreq, highFreq] = dtmfFrequencies[key];
    
    // Create two oscillators for dual-tone
    const oscillator1 = context.createOscillator();
    const oscillator2 = context.createOscillator();
    const gainNode = context.createGain();
    
    // Configure oscillators
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    oscillator1.frequency.value = lowFreq;
    oscillator2.frequency.value = highFreq;
    
    // Configure gain (volume)
    gainNode.gain.value = 0.1; // Reduced volume for comfort
    
    // Connect audio nodes
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Play tone for 200ms
    const startTime = context.currentTime;
    oscillator1.start(startTime);
    oscillator2.start(startTime);
    oscillator1.stop(startTime + 0.2);
    oscillator2.stop(startTime + 0.2);
    
    // Store references for cleanup
    oscillatorsRef.current.push(oscillator1, oscillator2);
    
    // Clean up after tone ends
    setTimeout(() => {
      oscillatorsRef.current = oscillatorsRef.current.filter(
        osc => osc !== oscillator1 && osc !== oscillator2
      );
    }, 250);
  };

  // Handle key press
  const handleKeyPress = (key) => {
    if (!isInCall) return;

    // Visual feedback
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 150);

    // Add to tone history with transmission method
    setToneHistory(prev => {
      const newHistory = prev + key;
      // Keep only last 20 characters
      return newHistory.length > 20 ? newHistory.slice(-20) : newHistory;
    });

    // Send DTMF via SIP if manager available
    let transmissionSuccess = false;
    if (sipManager && typeof sipManager.sendDTMF === 'function') {
      transmissionSuccess = sipManager.sendDTMF(key);
      console.log(`📟 DTMF key ${key} transmitted via SIP: ${transmissionSuccess ? 'success' : 'failed'}`);
    }

    // Always play local DTMF tone for user feedback
    playDTMFTone(key);

    // Notify parent component with transmission status
    onKeyPress?.(key, {
      transmitted: transmissionSuccess,
      method: dtmfMethod,
      timestamp: new Date()
    });
  };

  // Handle keyboard input
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event) => {
      const key = event.key;
      if (dtmfFrequencies[key]) {
        event.preventDefault();
        event.stopPropagation();
        handleKeyPress(key);
      } else if (key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        console.log('🔢 ESC key pressed - closing DTMF keypad');
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isVisible, isInCall, onClose]);

  // Clear tone history
  const clearHistory = () => {
    setToneHistory('');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded-lg shadow-2xl p-6 max-w-sm mx-4 ${
        isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${
            isDarkMode ? 'text-gray-100' : 'text-gray-700'
          }`}>DTMF Keypad</h3>
          <button
            onClick={onClose}
            className={`text-xl transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-200' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Close keypad"
          >
            ✕
          </button>
        </div>

        {/* Status */}
        <div className="text-center mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            isInCall 
              ? isDarkMode 
                ? 'bg-green-900/30 text-green-400 border border-green-700'
                : 'bg-green-100 text-green-700'
              : isDarkMode
                ? 'bg-gray-700 text-gray-300 border border-gray-600'
                : 'bg-gray-100 text-gray-600'
          }`}>
            <span className="mr-2">
              {isInCall ? '🟢' : '⭕'}
            </span>
            {isInCall ? `In Call - ${dtmfMethod.toUpperCase()} Tones` : 'No Active Call'}
          </div>
          
          {/* DTMF Method Indicator */}
          {isInCall && sipManager && (
            <div className={`mt-1 text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Method: {dtmfMethod.toUpperCase()}
              {sipManager.isRegistered ? ' • SIP Connected' : ' • SIP Disconnected'}
            </div>
          )}
        </div>

        {/* Tone History Display */}
        <div className={`rounded-lg p-3 mb-4 ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>Tones Sent:</span>
            {toneHistory && (
              <button
                onClick={clearHistory}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            )}
          </div>
          <div className="text-center">
            <code className={`text-lg font-mono px-3 py-2 rounded border min-h-[2.5rem] inline-block min-w-[200px] ${
              isDarkMode 
                ? 'text-gray-200 bg-gray-800 border-gray-600'
                : 'text-gray-800 bg-white border-gray-300'
            }`}>
              {toneHistory || '─'}
            </code>
          </div>
        </div>

        {/* DTMF Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {keypadLayout.flat().map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              disabled={!isInCall}
              className={`
                relative p-4 text-xl font-bold rounded-lg border-2 transition-all duration-150
                ${pressedKey === key && showToneAnimation
                  ? 'bg-blue-500 text-white border-blue-500 transform scale-95 shadow-inner'
                  : isInCall
                    ? isDarkMode
                      ? 'bg-gray-600 hover:bg-blue-600 text-gray-100 border-gray-500 hover:border-blue-400 shadow-sm hover:shadow-md'
                      : 'bg-white hover:bg-blue-50 text-gray-800 border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }
                ${pressedKey === key && showToneAnimation ? 'animate-pulse' : ''}
              `}
              title={`Send DTMF tone: ${key}`}
            >
              {key}
              
              {/* Tone visualization */}
              {pressedKey === key && showToneAnimation && (
                <div className="absolute inset-0 rounded-lg border-2 border-blue-400 animate-ping" />
              )}
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className={`text-center text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {isInCall ? (
            <div>
              <p className="mb-1">Click buttons or use keyboard</p>
              <p>Press <kbd className={`px-1 rounded text-xs ${
                isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'
              }`}>Esc</kbd> to close</p>
            </div>
          ) : (
            <p>Start a call to use DTMF tones</p>
          )}
        </div>

        {/* Audio Context Warning */}
        {isInCall && !audioContextRef.current && (
          <div className={`mt-3 p-2 border rounded text-xs ${
            isDarkMode 
              ? 'bg-yellow-900/30 border-yellow-700 text-yellow-400'
              : 'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}>
            ⚠️ Audio tones not available in this browser
          </div>
        )}
        
        {/* SIP Connection Warning */}
        {isInCall && sipManager && !sipManager.getRegistrationStatus() && (
          <div className={`mt-3 p-2 border rounded text-xs ${
            isDarkMode 
              ? 'bg-red-900/30 border-red-700 text-red-400'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            ⚠️ SIP not connected - DTMF may not transmit properly
          </div>
        )}
      </div>
    </div>
  );
};

export default DTMFKeypad;