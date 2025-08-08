import React, { useState, useEffect } from 'react';
import { leadsService } from '../services';

/**
 * LeadKanban - Kanban-style lead pipeline management
 * Features: Drag & drop, visual pipeline, quick actions, status transitions
 */
const LeadKanban = ({ onLeadSelect, refreshTrigger }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Pipeline columns configuration
  const columns = [
    {
      id: 'New',
      title: 'New Leads',
      icon: '🆕',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      titleColor: 'text-blue-800'
    },
    {
      id: 'Follow-up',
      title: 'Follow-up',
      icon: '📞',
      color: 'orange',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      titleColor: 'text-orange-800'
    },
    {
      id: 'Qualified',
      title: 'Qualified',
      icon: '✅',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      titleColor: 'text-green-800'
    },
    {
      id: 'Closed',
      title: 'Closed Won',
      icon: '🎉',
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      titleColor: 'text-purple-800'
    },
    {
      id: 'Not Interested',
      title: 'Not Interested',
      icon: '❌',
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      titleColor: 'text-red-800'
    }
  ];

  // Load leads
  useEffect(() => {
    loadLeads();
  }, [refreshTrigger]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await leadsService.getAllLeads({ limit: 200 });
      
      if (response.success) {
        setLeads(response.data);
      } else {
        throw new Error(response.message || 'Failed to load leads');
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get leads by status
  const getLeadsByStatus = (status) => {
    return leads.filter(lead => lead.status === status);
  };

  // Handle drag start
  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(columnId);
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  // Handle drop
  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedLead || draggedLead.status === columnId) {
      setDraggedLead(null);
      return;
    }

    try {
      // Update lead status
      const response = await leadsService.updateLeadStatus(draggedLead.id, columnId);
      
      if (response.success) {
        // Update local state
        setLeads(prevLeads =>
          prevLeads.map(lead =>
            lead.id === draggedLead.id ? { ...lead, status: columnId } : lead
          )
        );
        
        console.log(`✅ Lead ${draggedLead.name} moved to ${columnId}`);
      } else {
        throw new Error(response.message || 'Failed to update lead status');
      }
    } catch (error) {
      console.error('Failed to update lead status:', error);
      setError(`Failed to move lead: ${error.message}`);
    } finally {
      setDraggedLead(null);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  // Get priority indicator
  const getPriorityIndicator = (priority) => {
    switch (priority) {
      case 'High': return { icon: '🔴', color: 'text-red-600' };
      case 'Medium': return { icon: '🟡', color: 'text-orange-600' };
      case 'Low': return { icon: '🟢', color: 'text-green-600' };
      default: return { icon: '⚪', color: 'text-gray-600' };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate column stats
  const getColumnStats = (status) => {
    const columnLeads = getLeadsByStatus(status);
    const highPriority = columnLeads.filter(l => l.priority === 'High').length;
    return { total: columnLeads.length, highPriority };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Pipeline</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadLeads}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Lead Pipeline</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Total: {leads.length} leads
            </div>
            <button
              onClick={loadLeads}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex space-x-6 overflow-x-auto pb-6">
        {columns.map((column) => {
          const columnLeads = getLeadsByStatus(column.id);
          const stats = getColumnStats(column.id);
          const isDragOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 ${column.bgColor} rounded-lg ${column.borderColor} border-2 transition-all duration-200 ${
                isDragOver ? 'border-blue-500 shadow-lg' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{column.icon}</span>
                    <h3 className={`font-semibold ${column.titleColor}`}>
                      {column.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">
                      {stats.total}
                    </span>
                    {stats.highPriority > 0 && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        {stats.highPriority} urgent
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Column Content */}
              <div className="p-4 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {columnLeads.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📭</div>
                    <p className="text-gray-500 text-sm">No leads in this stage</p>
                  </div>
                ) : (
                  columnLeads.map((lead) => {
                    const priority = getPriorityIndicator(lead.priority);
                    const isDragging = draggedLead?.id === lead.id;

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onLeadSelect && onLeadSelect(lead)}
                        className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-all duration-200 ${
                          isDragging ? 'opacity-50 rotate-3 scale-105' : ''
                        }`}
                      >
                        {/* Lead Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {lead.name}
                            </h4>
                            <p className="text-sm text-gray-600 truncate">
                              {lead.company || 'No company'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <span className={`text-lg ${priority.color}`}>
                              {priority.icon}
                            </span>
                          </div>
                        </div>

                        {/* Lead Info */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Phone:</span>
                            <span className="text-gray-900 font-mono">
                              {lead.phone || 'N/A'}
                            </span>
                          </div>
                          
                          {lead.email && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Email:</span>
                              <span className="text-gray-900 truncate max-w-32">
                                {lead.email}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Last Contact:</span>
                            <span className="text-gray-900">
                              {formatDate(lead.last_contact)}
                            </span>
                          </div>

                          {lead.conversion_probability && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Score:</span>
                              <span className="text-gray-900 font-semibold">
                                {Math.round(lead.conversion_probability * 100)}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        {lead.tags && lead.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {lead.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {lead.tags.length > 2 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{lead.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes Preview */}
                        {lead.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                            <p className="text-gray-700 line-clamp-2">
                              {lead.notes.length > 80 
                                ? `${lead.notes.substring(0, 80)}...`
                                : lead.notes
                              }
                            </p>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="mt-3 flex justify-between items-center">
                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle call
                              }}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Call Lead"
                            >
                              📞
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle email
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Send Email"
                            >
                              📧
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle note
                              }}
                              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                              title="Add Note"
                            >
                              📝
                            </button>
                          </div>
                          <div className="text-xs text-gray-400">
                            {lead.call_attempts || 0} calls
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline Summary */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Pipeline Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {columns.map((column) => {
            const stats = getColumnStats(column.id);
            const percentage = leads.length > 0 ? (stats.total / leads.length) * 100 : 0;
            
            return (
              <div key={column.id} className="text-center">
                <div className="text-2xl mb-1">{column.icon}</div>
                <div className="font-semibold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">{column.title}</div>
                <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                {stats.highPriority > 0 && (
                  <div className="text-xs text-red-600 font-medium mt-1">
                    {stats.highPriority} urgent
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag Instructions */}
      <div className="mt-4 text-center text-sm text-gray-500">
        💡 Drag leads between columns to update their status
      </div>
    </div>
  );
};

export default LeadKanban;