import React, { useState, useEffect } from 'react';

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
  callDuration = 0
}) => {
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

  if (!isInCall) {
    return null;
  }

  return (
    <div className="card">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Call Controls</h3>
        
        {/* Call Duration & Status */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="text-2xl font-mono text-blue-600">
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
                      : 'bg-gray-300'
                  } rounded-sm`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Controls Row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {/* Mute Toggle */}
        <button
          onClick={onMuteToggle}
          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 ${
            isMuted 
              ? 'bg-red-500 text-white border-red-500 shadow-md' 
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
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
          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 ${
            isOnHold 
              ? 'bg-yellow-500 text-white border-yellow-500 shadow-md' 
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
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

        {/* Volume Control */}
        <div className="relative">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className="flex flex-col items-center p-3 w-full rounded-lg border-2 transition-all duration-200 bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
            title="Adjust volume"
          >
            <span className="text-xl mb-1">
              {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
            </span>
            <span className="text-xs font-medium">Volume</span>
          </button>
          
          {/* Volume Slider */}
          {showVolumeSlider && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-600 mb-2">{volume}%</span>
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

        {/* Record Toggle */}
        <button
          onClick={onRecord}
          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 ${
            isRecording 
              ? 'bg-red-500 text-white border-red-500 shadow-md animate-pulse' 
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
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
      <div className="grid grid-cols-2 gap-2">
        {/* Transfer */}
        <button
          onClick={() => setShowTransferDialog(true)}
          className="flex items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
          title="Transfer call"
        >
          <span className="mr-2">📞</span>
          <span className="text-sm font-medium">Transfer</span>
        </button>

        {/* Conference */}
        <button
          onClick={onConference}
          className="flex items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
          title="Start conference call"
        >
          <span className="mr-2">👥</span>
          <span className="text-sm font-medium">Conference</span>
        </button>
      </div>

      {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <h4 className="text-lg font-semibold mb-4">Transfer Call</h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer to number:
              </label>
              <input
                type="tel"
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full input-field"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowTransferDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferNumber.trim()}
                className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      {(isMuted || isOnHold || isRecording) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 justify-center">
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
        </div>
      )}
    </div>
  );
};

export default CallControls;