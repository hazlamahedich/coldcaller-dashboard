import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useCall } from '../contexts/CallContext';

/**
 * FloatingCallBar - Floating call control interface
 * Appears as a floating bar when a call is active
 * Features: Call controls, lead info, call timer, professional styling
 */
const FloatingCallBar = ({ 
  isVisible, 
  callState, 
  leadData, 
  phoneNumber, 
  callDuration,
  isMuted,
  isOnHold,
  onMute,
  onHold,
  onHangup,
  onTransfer,
  onShowDialpad
}) => {
  const { isDarkMode } = useTheme();
  const { audioInitialized, audioContext, testAudio, volume, changeVolume, callStateAnnouncer, voiceAnnouncements } = useCall();
  const [isMinimized, setIsMinimized] = useState(false);

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get call state display info
  const getCallStateInfo = () => {
    switch (callState) {
      case 'connecting':
        return { icon: '📞', text: 'Connecting...', color: 'text-blue-600' };
      case 'ringing':
        return { icon: '🔔', text: 'Ringing...', color: 'text-blue-600' };
      case 'active':
        return { icon: '✅', text: formatDuration(callDuration), color: 'text-green-600' };
      case 'hold':
        return { icon: '⏸️', text: `On Hold • ${formatDuration(callDuration)}`, color: 'text-yellow-600' };
      case 'ending':
        return { icon: '📵', text: 'Ending...', color: 'text-red-600' };
      default:
        return { icon: '📞', text: 'Call', color: 'text-gray-600' };
    }
  };

  const stateInfo = getCallStateInfo();

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      isMinimized ? 'w-16 h-16' : 'w-96'
    }`}>
      {/* Floating Call Control Panel */}
      <div className={`rounded-lg shadow-2xl border-2 overflow-hidden ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-600' 
          : 'bg-white border-gray-300'
      }`}>
        
        {isMinimized ? (
          /* Minimized View */
          <div className="p-4 text-center">
            <button
              onClick={() => setIsMinimized(false)}
              className={`text-2xl ${stateInfo.color}`}
            >
              {stateInfo.icon}
            </button>
          </div>
        ) : (
          /* Full View */
          <div className="p-4">
            {/* Debug Info - Call State */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-2 text-xs text-gray-500 text-center">
                Debug: Call State = "{callState}"
              </div>
            )}
            
            {/* Header with Lead Info and Minimize */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className={`font-semibold truncate ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {leadData?.name || 'Unknown Contact'}
                </div>
                <div className={`text-sm truncate ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {phoneNumber}
                </div>
                {leadData?.company && (
                  <div className={`text-xs truncate ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    🏢 {leadData.company}
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className={`ml-2 p-1 rounded ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                ➖
              </button>
            </div>

            {/* Call Status */}
            <div className="flex items-center justify-center mb-3 py-2">
              <span className="text-lg mr-2">{stateInfo.icon}</span>
              <span className={`font-medium ${stateInfo.color}`}>
                {stateInfo.text}
              </span>
              {process.env.NODE_ENV === 'development' && (
                <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1 rounded">
                  {callState}
                </span>
              )}
              {leadData?.priority && (
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  leadData.priority === 'High' ? 'bg-red-100 text-red-700' :
                  leadData.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {leadData.priority === 'High' ? '🔴' : leadData.priority === 'Medium' ? '🟡' : '🟢'}
                </span>
              )}
            </div>

            {/* Volume Control (when active or on hold) */}
            {['active', 'hold'].includes(callState) && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Volume</span>
                  <span className={`text-xs ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => changeVolume(parseInt(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                  style={{
                    background: isDarkMode 
                      ? `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${volume}%, #374151 ${volume}%, #374151 100%)`
                      : `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${volume}%, #E5E7EB ${volume}%, #E5E7EB 100%)`
                  }}
                />
              </div>
            )}
            
            {/* Call Control Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {/* Mute Button */}
              <button
                onClick={onMute}
                disabled={!['active', 'hold'].includes(callState)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  isMuted
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : ['active', 'hold'].includes(callState)
                      ? isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      : isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={['active', 'hold'].includes(callState) ? (isMuted ? 'Unmute' : 'Mute') : 'Mute available during active calls'}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>

              {/* Hold Button */}
              <button
                onClick={() => {
                  console.log('🔘 Hold button clicked! Call state:', callState, 'Is on hold:', isOnHold);
                  onHold();
                }}
                disabled={!['active', 'hold'].includes(callState)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  isOnHold
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                    : ['active', 'hold'].includes(callState)
                      ? isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      : isDarkMode
                        ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={['active', 'hold'].includes(callState) ? (isOnHold ? 'Resume Call' : 'Hold Call') : 'Hold available during active calls'}
              >
                {isOnHold ? '▶️' : '⏸️'}
              </button>

              {/* Dialpad Button */}
              <button
                onClick={() => {
                  console.log('🔢 Dialpad button clicked! Call state:', callState);
                  console.log('🔢 onShowDialpad function:', typeof onShowDialpad);
                  if (onShowDialpad) {
                    onShowDialpad();
                  } else {
                    console.error('❌ onShowDialpad is not available');
                  }
                }}
                disabled={!['active', 'ringing', 'connecting', 'hold'].includes(callState)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  ['active', 'ringing', 'connecting', 'hold'].includes(callState)
                    ? isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    : isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={['active', 'ringing', 'connecting', 'hold'].includes(callState) ? "Show DTMF Dialpad" : `Dialpad not available (Call state: ${callState})`}
              >
                🔢
              </button>

              {/* Hangup Button */}
              <button
                onClick={onHangup}
                className="p-3 rounded-lg border-2 bg-red-500 border-red-400 text-white hover:bg-red-600 transition-all duration-200"
                title="Hang Up"
              >
                📵
              </button>
            </div>

            {/* Additional Status Indicators */}
            {(isMuted || isOnHold || !audioInitialized) && (
              <div className="mt-2 flex justify-center gap-2">
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
                {!audioInitialized && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isDarkMode 
                      ? 'bg-orange-900/30 text-orange-400 border border-orange-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    🔊 Audio Loading...
                  </span>
                )}
                {audioInitialized && audioContext?.state === 'suspended' && (
                  <button
                    onClick={() => testAudio()}
                    className={`text-xs px-2 py-1 rounded-full transition-colors ${
                      isDarkMode 
                        ? 'bg-blue-900/30 text-blue-400 border border-blue-700 hover:bg-blue-800/30'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    🎵 Test Audio
                  </button>
                )}
                {audioInitialized && audioContext?.state === 'running' && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isDarkMode 
                      ? 'bg-green-900/30 text-green-400 border border-green-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    🔊 Audio Ready
                  </span>
                )}
              </div>
            )}
            
            {/* Audio Test Button (when not in call) */}
            {callState === 'idle' && audioInitialized && (
              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => testAudio()}
                  className={`w-full py-2 px-3 text-sm rounded-lg border transition-colors ${
                    isDarkMode
                      ? 'bg-blue-900/20 border-blue-700 text-blue-400 hover:bg-blue-800/30'
                      : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  🎵 Test Audio System
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingCallBar;