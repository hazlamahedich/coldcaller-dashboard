import React, { useState, useEffect } from 'react';

/**
 * CallStatus Component - Real-time call status display
 * Shows call state, duration, caller info, and connection quality
 */

const CallStatus = ({ 
  callState = 'idle', // idle, connecting, ringing, active, hold, ended
  callerInfo = null,
  callDuration = 0,
  connectionQuality = 'excellent',
  sipStatus = 'registered',
  networkLatency = 0,
  audioQuality = 'good',
  phoneNumber = '',
  startTime = null
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second for live duration display
  useEffect(() => {
    if (callState === 'active' || callState === 'hold') {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callState]);

  // Calculate live call duration
  const getLiveDuration = () => {
    if (!startTime || (callState !== 'active' && callState !== 'hold')) {
      return formatDuration(callDuration);
    }
    
    const elapsed = Math.floor((currentTime - new Date(startTime)) / 1000);
    return formatDuration(elapsed);
  };

  // Format duration into HH:MM:SS or MM:SS
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get call state display info
  const getCallStateInfo = () => {
    switch (callState) {
      case 'connecting':
        return {
          text: 'Connecting...',
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          icon: '🔄',
          pulse: true
        };
      case 'ringing':
        return {
          text: 'Ringing...',
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          icon: '📞',
          pulse: true
        };
      case 'active':
        return {
          text: 'Call Active',
          color: 'text-green-600',
          bg: 'bg-green-50',
          icon: '🟢',
          pulse: false
        };
      case 'hold':
        return {
          text: 'On Hold',
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          icon: '⏸️',
          pulse: false
        };
      case 'ended':
        return {
          text: 'Call Ended',
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          icon: '📵',
          pulse: false
        };
      default:
        return {
          text: 'Ready',
          color: 'text-gray-500',
          bg: 'bg-gray-50',
          icon: '📞',
          pulse: false
        };
    }
  };

  // Get connection quality info
  const getConnectionQuality = () => {
    const qualityMap = {
      excellent: { text: 'Excellent', color: 'text-green-500', bars: 4 },
      good: { text: 'Good', color: 'text-green-400', bars: 3 },
      fair: { text: 'Fair', color: 'text-yellow-500', bars: 2 },
      poor: { text: 'Poor', color: 'text-red-500', bars: 1 },
      offline: { text: 'Offline', color: 'text-gray-400', bars: 0 }
    };
    return qualityMap[connectionQuality] || qualityMap.offline;
  };

  // Get SIP status info
  const getSipStatusInfo = () => {
    const statusMap = {
      registered: { text: 'Registered', color: 'text-green-500', icon: '✅' },
      registering: { text: 'Registering...', color: 'text-yellow-500', icon: '🔄' },
      failed: { text: 'Registration Failed', color: 'text-red-500', icon: '❌' },
      unregistered: { text: 'Not Registered', color: 'text-gray-500', icon: '⭕' }
    };
    return statusMap[sipStatus] || statusMap.unregistered;
  };

  // Get audio quality info
  const getAudioQualityInfo = () => {
    const qualityMap = {
      excellent: { text: 'Excellent', color: 'text-green-500' },
      good: { text: 'Good', color: 'text-green-400' },
      fair: { text: 'Fair', color: 'text-yellow-500' },
      poor: { text: 'Poor', color: 'text-red-500' }
    };
    return qualityMap[audioQuality] || qualityMap.good;
  };

  const callStateInfo = getCallStateInfo();
  const connectionInfo = getConnectionQuality();
  const sipInfo = getSipStatusInfo();
  const audioInfo = getAudioQualityInfo();

  // Format phone number display
  const formatPhoneNumber = (num) => {
    if (!num) return '';
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  if (callState === 'idle' && !sipStatus) {
    return null;
  }

  return (
    <div className="card">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Call Status</h3>
      </div>

      {/* Call State Display */}
      <div className={`text-center p-4 rounded-lg mb-4 ${callStateInfo.bg}`}>
        <div className={`inline-flex items-center ${callStateInfo.pulse ? 'animate-pulse' : ''}`}>
          <span className="text-2xl mr-2">{callStateInfo.icon}</span>
          <span className={`text-lg font-semibold ${callStateInfo.color}`}>
            {callStateInfo.text}
          </span>
        </div>

        {/* Call Duration */}
        {(callState === 'active' || callState === 'hold' || callState === 'ended') && (
          <div className="mt-2">
            <span className="text-2xl font-mono text-gray-700">
              {getLiveDuration()}
            </span>
          </div>
        )}
      </div>

      {/* Caller Information */}
      {(phoneNumber || callerInfo) && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="text-center">
            {callerInfo?.name && (
              <div className="text-lg font-semibold text-gray-800 mb-1">
                {callerInfo.name}
              </div>
            )}
            {callerInfo?.company && (
              <div className="text-sm text-gray-600 mb-1">
                {callerInfo.company}
              </div>
            )}
            <div className="text-lg font-mono text-blue-600">
              {formatPhoneNumber(phoneNumber || callerInfo?.phone)}
            </div>
            {callerInfo?.location && (
              <div className="text-sm text-gray-500 mt-1">
                📍 {callerInfo.location}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connection Quality Indicators */}
      <div className="space-y-3">
        {/* Signal Quality */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Signal Quality:</span>
          <div className="flex items-center">
            <div className="flex gap-0.5 mr-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-4 rounded-sm ${
                    i < connectionInfo.bars 
                      ? connectionInfo.color.replace('text-', 'bg-') 
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className={`text-sm font-medium ${connectionInfo.color}`}>
              {connectionInfo.text}
            </span>
          </div>
        </div>

        {/* Network Latency */}
        {networkLatency > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Latency:</span>
            <span className={`text-sm font-medium ${
              networkLatency < 100 ? 'text-green-500' :
              networkLatency < 200 ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {networkLatency}ms
            </span>
          </div>
        )}

        {/* Audio Quality */}
        {callState === 'active' && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Audio Quality:</span>
            <span className={`text-sm font-medium ${audioInfo.color}`}>
              {audioInfo.text}
            </span>
          </div>
        )}

        {/* SIP Registration Status */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-600">SIP Status:</span>
          <div className="flex items-center">
            <span className="mr-1">{sipInfo.icon}</span>
            <span className={`text-sm font-medium ${sipInfo.color}`}>
              {sipInfo.text}
            </span>
          </div>
        </div>
      </div>

      {/* Call Start Time */}
      {startTime && callState !== 'idle' && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-center">
          <div className="text-xs text-gray-500">
            Call started: {new Date(startTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CallStatus;