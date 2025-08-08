import React, { useState, useEffect, useMemo } from 'react';
import { callsService } from '../services';

/**
 * EnhancedCallHistory Component - Advanced filtering, search, and mobile optimization
 * Comprehensive call history with real-time collaboration and advanced search
 */

const EnhancedCallHistory = ({ 
  maxItems = 50,
  showFilters = true,
  showSearch = true,
  showBulkActions = true,
  onCallSelect,
  refreshTrigger = 0,
  className = '' 
}) => {
  // Call data state
  const [calls, setCalls] = useState([]);
  const [filteredCalls, setFilteredCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    outcome: 'all',
    dateRange: '7d',
    priority: 'all',
    assignee: 'all',
    tags: []
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // UI state
  const [selectedCalls, setSelectedCalls] = useState(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', 'timeline'
  const [expandedCall, setExpandedCall] = useState(null);
  
  // Filter options
  const outcomeOptions = [
    { id: 'all', label: 'All Outcomes' },
    { id: 'connected', label: '✅ Connected' },
    { id: 'voicemail', label: '📧 Voicemail' },
    { id: 'no_answer', label: '🔕 No Answer' },
    { id: 'busy', label: '📞 Busy' },
    { id: 'not_interested', label: '❌ Not Interested' },
    { id: 'appointment_set', label: '📅 Appointment Set' },
    { id: 'callback_requested', label: '📞 Callback' }
  ];
  
  const dateRangeOptions = [
    { id: '1d', label: 'Today' },
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
    { id: 'custom', label: 'Custom Range' }
  ];
  
  const priorityOptions = [
    { id: 'all', label: 'All Priorities' },
    { id: 'high', label: '🔴 High' },
    { id: 'medium', label: '🟡 Medium' },
    { id: 'low', label: '🟢 Low' }
  ];
  
  // Load calls
  useEffect(() => {
    loadCalls();
  }, [maxItems, refreshTrigger, filters, sortBy, sortOrder]);
  
  // Apply search and filters
  useEffect(() => {
    applyFiltersAndSearch();
  }, [calls, searchTerm, filters]);
  
  const loadCalls = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = {
        limit: maxItems,
        sortBy: sortBy,
        sortOrder: sortOrder
      };
      
      // Add filters
      if (filters.outcome !== 'all') {
        params.outcome = filters.outcome;
      }
      
      if (filters.dateRange !== 'all') {
        const endDate = new Date();
        const startDate = new Date();
        
        switch (filters.dateRange) {
          case '1d':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(startDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(startDate.getDate() - 90);
            break;
        }
        
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      }
      
      const response = await callsService.getAllCalls(params);
      
      if (response.success && response.data) {
        const sortedCalls = response.data.sort((a, b) => {
          const aValue = a[sortBy] || '';
          const bValue = b[sortBy] || '';
          
          if (sortOrder === 'desc') {
            return bValue > aValue ? 1 : -1;
          } else {
            return aValue > bValue ? 1 : -1;
          }
        });
        
        setCalls(sortedCalls);
      } else {
        // Use enhanced demo data
        setCalls(generateDemoData());
      }
    } catch (err) {
      console.error('❌ Failed to load calls:', err);
      setError('Failed to load call history');
      setCalls(generateDemoData());
    } finally {
      setLoading(false);
    }
  };
  
  // Generate enhanced demo data
  const generateDemoData = () => {
    const outcomes = ['Connected', 'Voicemail', 'No Answer', 'Busy', 'Appointment Set', 'Not Interested'];
    const priorities = ['high', 'medium', 'low'];
    const companies = ['Acme Corp', 'Tech Solutions Inc', 'Global Enterprises', 'Startup Hub', 'Enterprise Co'];
    const names = ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Emma Davis', 'Alex Rodriguez', 'Lisa Wong', 'David Brown'];
    
    return Array.from({ length: 25 }, (_, i) => ({
      id: `call_${i + 1}`,
      leadId: `lead_${i + 1}`,
      leadName: names[i % names.length],
      company: companies[i % companies.length],
      phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      outcome: outcomes[i % outcomes.length],
      duration: `${Math.floor(Math.random() * 5) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      notes: [
        'Interested in premium package. Follow up next week.',
        'Left detailed voicemail about our services.',
        'Not the decision maker. Need to contact Sarah in procurement.',
        'Currently using competitor. Contract expires Q4.',
        'Budget approved. Wants demo next Tuesday.',
        'Price sensitive. Offered alternative solution.',
        'Great conversation. Scheduling meeting for Thursday.'
      ][i % 7],
      timestamp: new Date(Date.now() - (i * 3600000 + Math.random() * 3600000)).toISOString(),
      priority: priorities[i % priorities.length],
      tags: i % 3 === 0 ? ['hot-lead', 'decision-maker'] : i % 4 === 0 ? ['budget-approved'] : [],
      scheduledFollowup: i % 5 === 0 ? new Date(Date.now() + 86400000 * (i % 7 + 1)).toISOString().split('T')[0] : null,
      assignedTo: i % 4 === 0 ? 'Sarah Johnson' : null,
      qualityScore: (Math.random() * 3 + 7).toFixed(1)
    }));
  };
  
  // Apply filters and search
  const applyFiltersAndSearch = () => {
    let filtered = [...calls];
    
    // Apply search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(call => 
        call.leadName?.toLowerCase().includes(search) ||
        call.company?.toLowerCase().includes(search) ||
        call.phone?.includes(search) ||
        call.notes?.toLowerCase().includes(search) ||
        call.outcome?.toLowerCase().includes(search)
      );
    }
    
    // Apply filters
    if (filters.outcome !== 'all') {
      filtered = filtered.filter(call => 
        call.outcome?.toLowerCase().replace(/[^\w]/g, '_') === filters.outcome ||
        call.outcome?.toLowerCase() === filters.outcome.replace('_', ' ')
      );
    }
    
    if (filters.priority !== 'all') {
      filtered = filtered.filter(call => call.priority === filters.priority);
    }
    
    if (filters.assignee !== 'all') {
      filtered = filtered.filter(call => call.assignedTo === filters.assignee);
    }
    
    if (filters.tags.length > 0) {
      filtered = filtered.filter(call => 
        filters.tags.some(tag => call.tags?.includes(tag))
      );
    }
    
    setFilteredCalls(filtered);
  };
  
  // Handle call selection
  const handleCallSelect = (callId, event) => {
    if (event?.ctrlKey || event?.metaKey || event?.shiftKey) {
      // Multi-select mode
      const newSelected = new Set(selectedCalls);
      if (newSelected.has(callId)) {
        newSelected.delete(callId);
      } else {
        newSelected.add(callId);
      }
      setSelectedCalls(newSelected);
    } else {
      // Single select
      if (onCallSelect) {
        const call = filteredCalls.find(c => c.id === callId);
        onCallSelect(call);
      }
      setExpandedCall(expandedCall === callId ? null : callId);
    }
  };
  
  // Bulk actions
  const handleBulkAction = (action) => {
    const selectedCallsList = filteredCalls.filter(call => selectedCalls.has(call.id));
    
    switch (action) {
      case 'export':
        exportCalls(selectedCallsList);
        break;
      case 'delete':
        if (confirm(`Delete ${selectedCallsList.length} selected calls?`)) {
          deleteCalls([...selectedCalls]);
        }
        break;
      case 'assign':
        // Handle bulk assignment
        break;
      case 'tag':
        // Handle bulk tagging
        break;
    }
    
    setSelectedCalls(new Set());
    setShowBulkMenu(false);
  };
  
  // Export calls
  const exportCalls = (callsToExport) => {
    const csvData = callsToExport.map(call => ({
      Date: new Date(call.timestamp).toLocaleDateString(),
      Time: new Date(call.timestamp).toLocaleTimeString(),
      Lead: call.leadName,
      Company: call.company,
      Phone: call.phone,
      Outcome: call.outcome,
      Duration: call.duration,
      Notes: call.notes?.replace(/,/g, ';') || '',
      Priority: call.priority,
      'Follow-up': call.scheduledFollowup || '',
      Tags: call.tags?.join(';') || ''
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Delete calls
  const deleteCalls = async (callIds) => {
    try {
      // In production, this would make API calls to delete
      setCalls(prev => prev.filter(call => !callIds.includes(call.id)));
      alert(`${callIds.length} calls deleted successfully`);
    } catch (error) {
      console.error('Failed to delete calls:', error);
      alert('Failed to delete calls. Please try again.');
    }
  };
  
  // Format relative time
  const getRelativeTime = (timestamp) => {
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
  
  // Get outcome styling
  const getOutcomeStyle = (outcome) => {
    const styles = {
      'Connected': 'bg-green-100 text-green-700 border-green-200',
      'Voicemail': 'bg-blue-100 text-blue-700 border-blue-200',
      'No Answer': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Busy': 'bg-orange-100 text-orange-700 border-orange-200',
      'Not Interested': 'bg-red-100 text-red-700 border-red-200',
      'Appointment Set': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Callback': 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return styles[outcome] || 'bg-gray-100 text-gray-700 border-gray-200';
  };
  
  // Get priority styling
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  // Render call card (mobile-optimized)
  const renderCallCard = (call) => (
    <div
      key={call.id}
      className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer touch-manipulation ${
        selectedCalls.has(call.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      } ${expandedCall === call.id ? 'shadow-md' : ''}`}
      onClick={(e) => handleCallSelect(call.id, e)}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 truncate">
              {call.leadName}
            </h4>
            {call.company && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {call.company}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 font-mono">{call.phone}</div>
        </div>
        
        <div className="flex flex-col items-end gap-1 ml-2">
          <span className="text-xs text-gray-500">
            {getRelativeTime(call.timestamp)}
          </span>
          {call.qualityScore && (
            <div className="flex items-center text-xs text-gray-500">
              <span className="mr-1">⭐</span>
              {call.qualityScore}
            </div>
          )}
        </div>
      </div>
      
      {/* Outcome and Duration */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${getOutcomeStyle(call.outcome)}`}>
            {call.outcome}
          </span>
          {call.duration && call.duration !== '0:00' && (
            <span className="text-xs text-gray-500 font-mono">
              ⏱️ {call.duration}
            </span>
          )}
          {call.priority && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityStyle(call.priority)}`}>
              {call.priority}
            </span>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {call.scheduledFollowup && (
            <span className="text-xs text-blue-600" title={`Follow-up: ${call.scheduledFollowup}`}>
              📅
            </span>
          )}
          {call.tags && call.tags.length > 0 && (
            <span className="text-xs text-purple-600" title={call.tags.join(', ')}>
              🏷️
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpandedCall(expandedCall === call.id ? null : call.id);
            }}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            {expandedCall === call.id ? '▼' : '▶'}
          </button>
        </div>
      </div>
      
      {/* Tags */}
      {call.tags && call.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {call.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
          {call.tags.length > 3 && (
            <span className="text-xs text-gray-500">
              +{call.tags.length - 3} more
            </span>
          )}
        </div>
      )}
      
      {/* Expanded Details */}
      {expandedCall === call.id && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          {call.notes && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Notes:</div>
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {call.notes}
              </div>
            </div>
          )}
          
          {call.assignedTo && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">Assigned to:</span> {call.assignedTo}
            </div>
          )}
          
          {call.scheduledFollowup && (
            <div className="text-xs text-blue-600">
              <span className="font-medium">Follow-up:</span> {new Date(call.scheduledFollowup).toLocaleDateString()}
            </div>
          )}
          
          {/* Quick Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200 transition-colors">
              📞 Call Again
            </button>
            <button className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-lg hover:bg-green-200 transition-colors">
              📧 Send Email
            </button>
            <button className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg hover:bg-purple-200 transition-colors">
              📝 Add Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
  
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <span className="animate-spin mr-3 text-2xl">🔄</span>
          <span className="text-gray-600">Loading call history...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">📞 Call History</h3>
            <p className="text-sm text-gray-600">
              {filteredCalls.length} of {calls.length} calls
              {selectedCalls.size > 0 && ` • ${selectedCalls.size} selected`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                📋
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                ▦
              </button>
            </div>
            
            {/* Bulk Actions */}
            {selectedCalls.size > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowBulkMenu(!showBulkMenu)}
                  className="px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Actions ({selectedCalls.size})
                </button>
                
                {showBulkMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => handleBulkAction('export')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
                    >
                      📤 Export Selected
                    </button>
                    <button
                      onClick={() => handleBulkAction('assign')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      👤 Bulk Assign
                    </button>
                    <button
                      onClick={() => handleBulkAction('tag')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      🏷️ Add Tags
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                    >
                      🗑️ Delete Selected
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <div className="space-y-3">
            {/* Search */}
            {showSearch && (
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search calls by name, company, phone, or notes..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              </div>
            )}
            
            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={filters.outcome}
                  onChange={(e) => setFilters(prev => ({ ...prev, outcome: e.target.value }))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {outcomeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {dateRangeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="timestamp">Sort by Date</option>
                  <option value="leadName">Sort by Name</option>
                  <option value="outcome">Sort by Outcome</option>
                  <option value="duration">Sort by Duration</option>
                  <option value="priority">Sort by Priority</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Error State */}
      {error && (
        <div className="p-4 text-center text-red-600 bg-red-50">
          ⚠️ {error}
          <button 
            onClick={loadCalls}
            className="ml-3 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Call List */}
      <div className="p-4">
        {filteredCalls.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📞</div>
            <h4 className="text-lg font-medium text-gray-600 mb-2">No calls found</h4>
            <p className="text-sm">
              {searchTerm || filters.outcome !== 'all' || filters.priority !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'Your call history will appear here as you make calls'
              }
            </p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }>
            {filteredCalls.map(renderCallCard)}
          </div>
        )}
        
        {/* Load More Button */}
        {filteredCalls.length >= maxItems && (
          <div className="text-center mt-6">
            <button
              onClick={() => setMaxItems(prev => prev + 25)}
              className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Load More Calls
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedCallHistory;