import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { leadsService } from '../services';

/**
 * LeadTimeline - Interactive timeline component for lead activities
 * Features: Meeting history, call logs, status changes, notes
 */
const LeadTimeline = ({ leadId, refreshTrigger }) => {
  const { isDarkMode, themeClasses } = useTheme();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Load timeline data
  useEffect(() => {
    if (leadId) {
      loadTimeline();
    }
  }, [leadId, refreshTrigger]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/leads/${leadId}/timeline`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTimeline(data.data?.timeline || []);
      } else {
        setError('Failed to load timeline');
      }
    } catch (err) {
      console.error('Failed to load timeline:', err);
      setError('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  // Get icon for timeline entry
  const getIcon = (type) => {
    const iconMap = {
      call: '📞',
      call_made: '📞',
      call_received: '📞',
      email: '📧',
      email_sent: '📧',
      email_opened: '📧',
      meeting_scheduled: '📅',
      meeting_completed: '✅',
      meeting_cancelled: '❌',
      meeting_updated: '📝',
      note_added: '📝',
      status_changed: '🔄',
      follow_up_scheduled: '⏰',
      follow_up_completed: '✅',
      document_shared: '📄',
      proposal_sent: '📊',
      contract_signed: '📋',
      payment_received: '💰',
      lead_created: '👤',
      lead_updated: '✏️',
      opportunity_created: '🎯',
      task_created: '📋',
      task_completed: '✅',
      reminder_set: '🔔',
      tag_added: '🏷️',
      tag_removed: '🏷️',
      custom: '📌'
    };
    return iconMap[type] || '📌';
  };

  // Get color for timeline entry
  const getColor = (type) => {
    const colorMap = {
      call: 'blue',
      call_made: 'blue',
      call_received: 'blue',
      email: 'purple',
      email_sent: 'purple',
      email_opened: 'purple',
      meeting_scheduled: 'green',
      meeting_completed: 'green',
      meeting_cancelled: 'red',
      meeting_updated: 'orange',
      note_added: 'gray',
      status_changed: 'blue',
      follow_up_scheduled: 'yellow',
      follow_up_completed: 'green',
      document_shared: 'indigo',
      proposal_sent: 'purple',
      contract_signed: 'green',
      payment_received: 'green',
      lead_created: 'blue',
      lead_updated: 'blue',
      opportunity_created: 'purple',
      task_created: 'orange',
      task_completed: 'green',
      reminder_set: 'yellow',
      tag_added: 'teal',
      tag_removed: 'red',
      custom: 'gray'
    };
    return colorMap[type] || 'gray';
  };

  // Format relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  // Toggle expanded item
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Filter timeline
  const filteredTimeline = timeline.filter(item => {
    const activityType = item.activity_type || item.type;
    if (filter === 'all') return true;
    if (filter === 'meetings') {
      return activityType.startsWith('meeting_') || activityType === 'follow_up_scheduled';
    }
    if (filter === 'communications') {
      return ['call_made', 'call_received', 'email_sent', 'email_opened', 'note_added'].includes(activityType);
    }
    if (filter === 'status') {
      return ['status_changed', 'lead_updated', 'tag_added', 'tag_removed'].includes(activityType);
    }
    return activityType === filter;
  });

  // Group timeline by date
  const groupedTimeline = filteredTimeline.reduce((groups, item) => {
    const date = new Date(item.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className={`p-6 ${themeClasses.cardBg} rounded-lg border ${themeClasses.border}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-8 h-8 rounded-full ${
              isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
            }`}></div>
            <div className="flex-1">
              <div className={`h-4 rounded w-3/4 mb-2 ${
                isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}></div>
              <div className={`h-3 rounded w-1/2 ${
                isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}></div>
            </div>
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-8 h-8 rounded-full ${
              isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
            }`}></div>
            <div className="flex-1">
              <div className={`h-4 rounded w-2/3 mb-2 ${
                isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}></div>
              <div className={`h-3 rounded w-1/3 ${
                isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${themeClasses.cardBg} rounded-lg border ${themeClasses.border}`}>
        <div className="text-center">
          <p className={`mb-4 ${
            isDarkMode ? 'text-red-400' : 'text-red-600'
          }`}>⚠️ {error}</p>
          <button
            onClick={loadTimeline}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
            Activity Timeline
          </h3>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`px-3 py-1 text-sm border rounded ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-gray-200' 
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              <option value="all">All Activity</option>
              <option value="meetings">Meetings</option>
              <option value="communications">Communications</option>
              <option value="status">Status Changes</option>
            </select>
            <button
              onClick={loadTimeline}
              className={`p-1 transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className={`p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {Object.keys(groupedTimeline).length === 0 ? (
          <div className="text-center py-8">
            <p className={`${themeClasses.textSecondary}`}>
              No activity recorded yet
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTimeline)
              .sort(([a], [b]) => new Date(b) - new Date(a))
              .map(([date, items]) => (
                <div key={date} className="relative">
                  {/* Date Header */}
                  <div className="flex items-center mb-4">
                    <div className={`px-3 py-1 text-sm font-medium rounded-full ${
                      isDarkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  {/* Timeline Items */}
                  <div className="relative">
                    {/* Vertical Line */}
                    <div className={`absolute left-4 top-0 bottom-0 w-0.5 ${
                      isDarkMode ? 'bg-gray-500' : 'bg-gray-300'
                    }`}></div>

                    <div className="space-y-4">
                      {items
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .map((item, index) => {
                          const isExpanded = expandedItems.has(item.id);
                          const activityType = item.activity_type || item.type;
                          const color = getColor(activityType);

                          return (
                            <div key={item.id} className="relative flex items-start space-x-3">
                              {/* Timeline Dot */}
                              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white text-sm ${
                                color === 'blue' ? 'bg-blue-500' :
                                color === 'green' ? 'bg-green-500' :
                                color === 'red' ? 'bg-red-500' :
                                color === 'orange' ? 'bg-orange-500' :
                                color === 'yellow' ? 'bg-yellow-500' :
                                color === 'purple' ? 'bg-purple-500' :
                                color === 'indigo' ? 'bg-indigo-500' :
                                color === 'teal' ? 'bg-teal-500' :
                                'bg-gray-500'
                              }`}>
                                {getIcon(activityType)}
                              </div>

                              {/* Content */}
                              <div className={`flex-1 min-w-0 p-4 rounded-lg ${
                                isDarkMode ? 'bg-gray-700 border border-gray-500' : 'bg-gray-50 border border-gray-200'
                              }`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className={`font-medium ${themeClasses.textPrimary}`}>
                                      {item.title || item.description || activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </h4>
                                    {item.data?.description && (
                                      <p className={`text-sm mt-1 ${themeClasses.textSecondary} ${
                                        !isExpanded && item.data.description.length > 100 ? 'line-clamp-2' : ''
                                      }`}>
                                        {isExpanded || item.data.description.length <= 100 
                                          ? item.data.description 
                                          : `${item.data.description.substring(0, 100)}...`
                                        }
                                      </p>
                                    )}

                                    {/* Meeting Data */}
                                    {activityType.startsWith('meeting_') && item.data && (
                                      <div className="mt-2 text-xs space-y-1">
                                        {item.data.duration && (
                                          <span className={`inline-block px-2 py-1 rounded ${
                                            isDarkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700'
                                          }`}>
                                            ⏱️ {item.data.duration} minutes
                                          </span>
                                        )}
                                        {item.data.meetingType && (
                                          <span className={`inline-block px-2 py-1 rounded ml-2 ${
                                            isDarkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700'
                                          }`}>
                                            {item.data.meetingType === 'video' ? '📹' : 
                                             item.data.meetingType === 'phone' ? '📞' : '🏢'} 
                                            {item.data.meetingType}
                                          </span>
                                        )}
                                        {item.data.attendees > 0 && (
                                          <span className={`inline-block px-2 py-1 rounded ml-2 ${
                                            isDarkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700'
                                          }`}>
                                            👥 {item.data.attendees} attendee{item.data.attendees > 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Attachments */}
                                    {item.attachments && item.attachments.length > 0 && (
                                      <div className="mt-2">
                                        <div className="flex flex-wrap gap-2">
                                          {item.attachments.map((attachment, idx) => (
                                            <a
                                              key={idx}
                                              href={attachment.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`inline-flex items-center px-2 py-1 text-xs rounded hover:underline ${
                                                isDarkMode ? 'bg-blue-900/50 text-blue-200 hover:bg-blue-800/50' : 'bg-blue-100 text-blue-800'
                                              }`}
                                            >
                                              📎 {attachment.name}
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Tags */}
                                    {item.tags && item.tags.length > 0 && (
                                      <div className="mt-2">
                                        <div className="flex flex-wrap gap-1">
                                          {item.tags.map((tag, idx) => (
                                            <span
                                              key={idx}
                                              className={`inline-block px-2 py-1 text-xs rounded-full ${
                                                isDarkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700'
                                              }`}
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-2 ml-4">
                                    <span className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>
                                      {formatRelativeTime(item.timestamp)}
                                    </span>
                                    {item.data?.description && item.data.description.length > 100 && (
                                      <button
                                        onClick={() => toggleExpanded(item.id)}
                                        className={`text-xs ${
                                          isDarkMode 
                                            ? 'text-blue-400 hover:text-blue-200' 
                                            : 'text-blue-600 hover:text-blue-800'
                                        }`}
                                      >
                                        {isExpanded ? 'Less' : 'More'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadTimeline;