import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * CallControls Component - Professional VOIP call control panel
 * Provides mute, hold, volume, transfer, and conference call controls
 */

const CallControls = ({ 
  isInCall = false, 
  isMuted = false, 
  isOnHold = false, 
  volume = 50,
  onMuteToggle,
  onHoldToggle,
  onVolumeChange,
  onTransfer,
  onConference,
  onRecord,
  isRecording = false,
  connectionQuality = 'excellent',
  callDuration = 0,
  callState = 'idle' // Added call state for better button control
}) => {
  const { themeClasses, isDarkMode } = useTheme();
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferNumber, setTransferNumber] = useState('');

  // Format call duration into MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get connection quality color and icon
  const getConnectionStatus = () => {
    switch (connectionQuality) {
      case 'excellent':
        return { color: 'text-green-500', icon: '📶', bars: 4 };
      case 'good':
        return { color: 'text-green-400', icon: '📶', bars: 3 };
      case 'fair':
        return { color: 'text-yellow-500', icon: '📶', bars: 2 };
      case 'poor':
        return { color: 'text-red-500', icon: '📶', bars: 1 };
      default:
        return { color: 'text-gray-400', icon: '📵', bars: 0 };
    }
  };

  const connectionStatus = getConnectionStatus();

  const handleTransfer = () => {
    if (transferNumber.trim()) {
      onTransfer?.(transferNumber);
      setTransferNumber('');
      setShowTransferDialog(false);
    }
  };

  // Show controls when in call or on hold
  if (!isInCall && !isOnHold) {
    return null;
  }

  return (
    <div className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-lg shadow-lg p-4`}>
      <div className="text-center mb-4">
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Call Controls</h3>
        
        {/* Call Duration & Status */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className={`text-2xl font-mono ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {formatDuration(callDuration)}
          </div>
          <div className={`flex items-center ${connectionStatus.color}`}>
            <span className="text-xs mr-1">Signal:</span>
            <div className="flex gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 ${
                    i < connectionStatus.bars 
                      ? 'bg-current' 
                      : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                  } rounded-sm`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Controls Row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {/* Mute Toggle - Always active during call */}
        <button
          onClick={onMuteToggle}
          disabled={false} // Mute should always work during active call or hold
          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isMuted 
              ? `bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md focus:ring-red-500 ${
                  isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'
                }` 
              : `bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-md focus:ring-green-500 ${
                  isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'
                }`
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <span className="text-xl mb-1">
            {isMuted ? '🔇' : '🎤'}
          </span>
          <span className="text-xs font-medium">
            {isMuted ? 'Muted' : 'Mute'}
          </span>
        </button>

        {/* Hold Toggle */}
        <button
          onClick={onHoldToggle}
          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isOnHold 
              ? `bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 shadow-md focus:ring-yellow-500 ${
                  isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'
                }` 
              : `${themeClasses.buttonSecondary} focus:ring-gray-500 ${
                  isDarkMode ? 'hover:bg-gray-700 focus:ring-offset-gray-900' : 'hover:bg-gray-100 focus:ring-offset-white'
                }`
          }`}
          title={isOnHold ? 'Resume call' : 'Put call on hold'}
        >
          <span className="text-xl mb-1">
            {isOnHold ? '▶️' : '⏸️'}
          </span>
          <span className="text-xs font-medium">
            {isOnHold ? 'Resume' : 'Hold'}
          </span>
        </button>

        {/* Volume Control - Always active */}
        <div className="relative">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            disabled={false} // Volume control should always be available
            className={`flex flex-col items-center p-3 w-full rounded-lg border-2 transition-all duration-200 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              `${themeClasses.buttonSecondary} focus:ring-blue-500 ${
                isDarkMode ? 'hover:bg-gray-700 focus:ring-offset-gray-900' : 'hover:bg-gray-100 focus:ring-offset-white'
              }`
            }`}
            title="Adjust volume"
          >
            <span className="text-xl mb-1">
              {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
            </span>
            <span className="text-xs font-medium">Volume</span>
          </button>
          
          {/* Volume Slider */}
          {showVolumeSlider && (
            <div className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 ${themeClasses.cardBg} ${themeClasses.border} border rounded-lg shadow-lg p-3 z-10`}>
              <div className="flex flex-col items-center">
                <span className={`text-xs ${themeClasses.textSecondary} mb-2`}>{volume}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => onVolumeChange?.(parseInt(e.target.value))}
                  className="h-20 w-6 slider vertical-slider"
                  orient="vertical"
                  style={{ writingMode: 'bt-lr', transform: 'rotate(-90deg)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Record Toggle - Always active during call */}
        <button
          onClick={onRecord}
          disabled={false} // Recording should work even on hold
          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isRecording 
              ? `bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md animate-pulse focus:ring-red-500 ${
                  isDarkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'
                }` 
              : `${themeClasses.buttonSecondary} focus:ring-blue-500 ${
                  isDarkMode ? 'hover:bg-gray-700 focus:ring-offset-gray-900' : 'hover:bg-gray-100 focus:ring-offset-white'
                }`
          }`}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <span className="text-xl mb-1">
            {isRecording ? '⏹️' : '🔴'}
          </span>
          <span className="text-xs font-medium">
            {isRecording ? 'Recording' : 'Record'}
          </span>
        </button>
      </div>

      {/* Secondary Controls Row */}
      <div className="grid grid-cols-2 gap-1">
        {/* Transfer - Works during call or hold */}
        <button
          onClick={() => setShowTransferDialog(true)}
          disabled={false} // Transfer should be available during hold
          className={`flex items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            `${themeClasses.buttonSecondary} focus:ring-blue-500 ${
              isDarkMode ? 'hover:bg-gray-700 focus:ring-offset-gray-900' : 'hover:bg-gray-100 focus:ring-offset-white'
            }`
          }`}
          title="Transfer call"
        >
          <span className="mr-2">📞</span>
          <span className="text-sm font-medium">Transfer</span>
        </button>

        {/* Conference - Works during call or hold */}
        <button
          onClick={onConference}
          disabled={false} // Conference should be available during hold
          className={`flex items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            `${themeClasses.buttonSecondary} focus:ring-blue-500 ${
              isDarkMode ? 'hover:bg-gray-700 focus:ring-offset-gray-900' : 'hover:bg-gray-100 focus:ring-offset-white'
            }`
          }`}
          title="Start conference call"
        >
          <span className="mr-2">👥</span>
          <span className="text-sm font-medium">Conference</span>
        </button>
      </div>

      {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${themeClasses.cardBg} rounded-lg p-6 max-w-sm mx-4 shadow-2xl`}>
            <h4 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Transfer Call</h4>
            <div className="mb-4">
              <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>
                Transfer to number:
              </label>
              <input
                type="tel"
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
                placeholder="(555) 123-4567"
                className={`w-full ${themeClasses.input} p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowTransferDialog(false)}
                className={`px-4 py-2 ${themeClasses.textSecondary} hover:${themeClasses.textPrimary} transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
                  isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferNumber.trim()}
                className={`${themeClasses.buttonPrimary} px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'
                }`}
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      {(isMuted || isOnHold || isRecording) && (
        <div className={`mt-3 pt-3 border-t ${themeClasses.border}`}>
          <div className="flex flex-wrap gap-2 justify-center">
            {isMuted && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                isDarkMode 
                  ? 'bg-red-900/40 text-red-200 border border-red-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                🔇 Muted
              </span>
            )}
            {isOnHold && (
              <span className={`text-xs px-2 py-1 rounded-full animate-pulse ${
                isDarkMode 
                  ? 'bg-yellow-900/40 text-yellow-200 border border-yellow-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                ⏸️ On Hold - All Controls Active
              </span>
            )}
            {isRecording && (
              <span className={`text-xs px-2 py-1 rounded-full animate-pulse ${
                isDarkMode 
                  ? 'bg-red-900/40 text-red-200 border border-red-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                🔴 Recording
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CallControls;