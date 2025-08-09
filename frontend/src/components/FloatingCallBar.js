import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

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
        return { icon: '⏸️', text: 'On Hold', color: 'text-yellow-600' };
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

            {/* Call Control Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {/* Mute Button */}
              <button
                onClick={onMute}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  isMuted
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>

              {/* Hold Button */}
              <button
                onClick={onHold}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  isOnHold
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                    : isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
                title={isOnHold ? 'Resume' : 'Hold'}
              >
                {isOnHold ? '▶️' : '⏸️'}
              </button>

              {/* Dialpad Button */}
              <button
                onClick={onShowDialpad}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
                title="Show Dialpad"
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
            {(isMuted || isOnHold) && (
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingCallBar;