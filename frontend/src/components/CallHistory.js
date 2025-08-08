import React, { useState, useEffect } from 'react';
import { callsService } from '../services';

/**
 * CallHistory Component - Recent calls and quick-dial functionality
 * Shows call history with quick redial and contact information
 */

const CallHistory = ({ 
  maxItems = 10,
  showQuickDial = true,
  onQuickDial,
  refreshTrigger = 0 // Prop to trigger refresh from parent
}) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCall, setExpandedCall] = useState(null);

  // Load call history
  useEffect(() => {
    loadCallHistory();
  }, [maxItems, refreshTrigger]);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await callsService.getRecentCalls(maxItems);
      
      if (response.success && response.data) {
        // Sort by timestamp, most recent first
        const sortedCalls = response.data.sort((a, b) => 
          new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
        );
        setCalls(sortedCalls);
      } else {
        // Use demo data if API fails
        setCalls([
          {
            id: 'demo-1',
            phone: '5551234567',
            leadName: 'John Smith',
            outcome: 'Connected',
            duration: '03:45',
            notes: 'Interested in premium package',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            time: '10:30 AM'
          },
          {
            id: 'demo-2',
            phone: '5559876543',
            leadName: 'Sarah Johnson',
            outcome: 'Voicemail',
            duration: '00:00',
            notes: 'Left detailed message about our services',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            time: '9:15 AM'
          },
          {
            id: 'demo-3',
            phone: '5555555555',
            leadName: 'Mike Chen',
            outcome: 'No Answer',
            duration: '00:00',
            notes: 'Will try again later',
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            time: '8:45 AM'
          }
        ]);
      }
    } catch (err) {
      console.error('❌ Failed to load call history:', err);
      setError('Failed to load call history');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  // Format phone number
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // Get outcome styling
  const getOutcomeStyle = (outcome) => {
    const styles = {
      'Connected': 'bg-green-100 text-green-700 border-green-200',
      'Voicemail': 'bg-blue-100 text-blue-700 border-blue-200',
      'No Answer': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Busy': 'bg-orange-100 text-orange-700 border-orange-200',
      'Failed': 'bg-red-100 text-red-700 border-red-200',
      'Callback Requested': 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return styles[outcome] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Get outcome icon
  const getOutcomeIcon = (outcome) => {
    const icons = {
      'Connected': '✅',
      'Voicemail': '📧',
      'No Answer': '🔕',
      'Busy': '📞',
      'Failed': '❌',
      'Callback Requested': '📞'
    };
    return icons[outcome] || '📞';
  };

  // Format relative time
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const callTime = new Date(timestamp);
    const diffMs = now - callTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return callTime.toLocaleDateString();
  };

  // Handle quick dial
  const handleQuickDial = (call) => {
    if (onQuickDial) {
      onQuickDial(call.phone, call);
    }
  };

  // Toggle call details
  const toggleCallDetails = (callId) => {
    setExpandedCall(expandedCall === callId ? null : callId);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Call History</h3>
          <div className="flex items-center justify-center py-8 text-gray-500">
            <span className="animate-spin mr-2">🔄</span>
            Loading call history...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Recent Calls</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCallHistory}
            disabled={loading}
            className="p-1 hover:bg-gray-100 rounded text-sm transition-colors disabled:opacity-50"
            title="Refresh call history"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
          </button>
          <span className="text-xs text-gray-500">
            {calls.length} call{calls.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 mb-3 bg-red-50 p-2 rounded">
          ⚠️ {error}
        </div>
      )}

      {calls.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📞</div>
          <p>No recent calls</p>
          <p className="text-sm mt-1">Your call history will appear here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {calls.map((call) => (
            <div
              key={call.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              {/* Main call info */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {/* Contact Name & Phone */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800 truncate">
                      {call.leadName || 'Unknown Contact'}
                    </span>
                    {showQuickDial && (
                      <button
                        onClick={() => handleQuickDial(call)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="Quick dial this number"
                      >
                        📞
                      </button>
                    )}
                  </div>
                  
                  {/* Phone number */}
                  <div className="text-sm text-gray-600 font-mono">
                    {formatPhoneNumber(call.phone)}
                  </div>

                  {/* Outcome and duration */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getOutcomeStyle(call.outcome)}`}>
                      {getOutcomeIcon(call.outcome)} {call.outcome}
                    </span>
                    {call.duration && call.duration !== '00:00' && (
                      <span className="text-xs text-gray-500 font-mono">
                        ⏱️ {call.duration}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time and expand button */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-500">
                    {getRelativeTime(call.timestamp)}
                  </span>
                  {call.notes && (
                    <button
                      onClick={() => toggleCallDetails(call.id)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {expandedCall === call.id ? '▼' : '▶'} Details
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedCall === call.id && call.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    <strong>Notes:</strong>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                    {call.notes}
                  </div>
                  {call.scheduledFollowup && (
                    <div className="text-xs text-blue-600 mt-2">
                      📅 Follow-up: {new Date(call.scheduledFollowup).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      {calls.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Connected: {calls.filter(c => c.outcome === 'Connected').length}</span>
            <span>Voicemail: {calls.filter(c => c.outcome === 'Voicemail').length}</span>
            <span>No Answer: {calls.filter(c => c.outcome === 'No Answer').length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallHistory;