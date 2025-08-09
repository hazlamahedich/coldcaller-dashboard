import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useCall } from '../contexts/CallContext';
import { useLead } from '../contexts/LeadContext';
import EmailComposer from './EmailComposer';
import NotesEditor from './NotesEditor';

/**
 * LeadKanban - Kanban-style lead pipeline management
 * Features: Drag & drop, visual pipeline, quick actions, status transitions
 */
const LeadKanban = ({ onLeadSelect, refreshTrigger }) => {
  console.log('🔄 [LeadKanban] Component rendering with props:', { refreshTrigger });
  
  const { isDarkMode, themeClasses } = useTheme();
  const { initiateCall } = useCall();
  const navigate = useNavigate();
  
  // Use shared LeadContext instead of separate state
  const { 
    leads, 
    loading, 
    error, 
    apiConnected,
    updateLeadStatus,
    updateLead,
    refreshLeads 
  } = useLead();
  
  // Debug log for shared context data
  console.log('🔍 [LeadKanban] Shared context data:', {
    leadsCount: leads?.length,
    loading,
    error,
    apiConnected,
    leadsData: leads
  });
  
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [moveStatus, setMoveStatus] = useState(null); // 'success', 'error', null
  
  // Modal states for email and notes
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState(null);

  // Get theme-aware column styles
  const getColumnStyles = (colorName) => {
    const styles = {
      blue: {
        bgColor: isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50',
        borderColor: isDarkMode ? 'border-blue-700' : 'border-blue-200',
        titleColor: isDarkMode ? 'text-blue-200' : 'text-blue-800'
      },
      orange: {
        bgColor: isDarkMode ? 'bg-orange-900/20 border border-orange-700' : 'bg-orange-50',
        borderColor: isDarkMode ? 'border-orange-700' : 'border-orange-200',
        titleColor: isDarkMode ? 'text-orange-200' : 'text-orange-800'
      },
      green: {
        bgColor: isDarkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50',
        borderColor: isDarkMode ? 'border-green-700' : 'border-green-200',
        titleColor: isDarkMode ? 'text-green-200' : 'text-green-800'
      },
      purple: {
        bgColor: isDarkMode ? 'bg-purple-900/20 border border-purple-700' : 'bg-purple-50',
        borderColor: isDarkMode ? 'border-purple-700' : 'border-purple-200',
        titleColor: isDarkMode ? 'text-purple-200' : 'text-purple-800'
      },
      red: {
        bgColor: isDarkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50',
        borderColor: isDarkMode ? 'border-red-700' : 'border-red-200',
        titleColor: isDarkMode ? 'text-red-200' : 'text-red-800'
      }
    };
    return styles[colorName] || styles.blue;
  };

  // Pipeline columns configuration
  const columns = [
    {
      id: 'New',
      title: 'New Leads',
      icon: '🆕',
      color: 'blue'
    },
    {
      id: 'Follow-up',
      title: 'Follow-up',
      icon: '📞',
      color: 'orange'
    },
    {
      id: 'Qualified',
      title: 'Qualified',
      icon: '✅',
      color: 'green'
    },
    {
      id: 'Closed',
      title: 'Closed Won',
      icon: '🎉',
      color: 'purple'
    },
    {
      id: 'Not Interested',
      title: 'Not Interested',
      icon: '❌',
      color: 'red'
    }
  ];

  // Refresh leads when refreshTrigger changes (uses shared LeadContext)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 [LeadKanban] Refresh triggered, using shared context');
      refreshLeads();
    }
  }, [refreshTrigger, refreshLeads]);

  // Disable browser phone number auto-detection
  useEffect(() => {
    const disableAutoDetection = () => {
      // Disable phone detection on all phone display elements
      const phoneElements = document.querySelectorAll('[data-phone-display]');
      phoneElements.forEach(el => {
        el.style.pointerEvents = 'none';
        el.style.webkitUserSelect = 'none';
        el.style.userSelect = 'none';
        el.setAttribute('x-webkit-airplay', 'deny');
        
        // Remove any tel: links that might have been auto-generated
        if (el.tagName === 'A' && el.href && el.href.startsWith('tel:')) {
          const span = document.createElement('span');
          span.textContent = el.textContent;
          span.className = el.className;
          span.setAttribute('data-phone-display', 'true');
          span.style.pointerEvents = 'none';
          el.parentNode.replaceChild(span, el);
        }
      });
    };

    // Run on component mount and when leads change
    disableAutoDetection();
    
    // Also run after a short delay to catch any browser auto-linking
    const timeout = setTimeout(disableAutoDetection, 100);
    
    return () => clearTimeout(timeout);
  }, [leads]);

  // Removed separate loadLeads function - now uses shared LeadContext

  // Get leads by status with safety check
  const getLeadsByStatus = (status) => {
    if (!Array.isArray(leads)) {
      return [];
    }
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

    const oldStatus = draggedLead.status;
    console.log(`🔄 Moving lead ${draggedLead.name} from ${oldStatus} to ${columnId}`);
    setMoveStatus('pending');

    try {
      // Use shared LeadContext updateLeadStatus function
      const response = await updateLeadStatus(draggedLead.id, columnId);
      
      if (response && response.success) {
        console.log(`✅ Lead ${draggedLead.name} successfully moved to ${columnId} via shared context`);
        setMoveStatus('success');
      } else {
        // API failed - LeadContext handles the error, no local state to revert
        console.warn('⚠️ API update failed:', response?.message || 'No response');
        setMoveStatus('error');
      }
    } catch (error) {
      console.error('❌ Error when moving lead:', error);
      setMoveStatus('error');
    } finally {
      setDraggedLead(null);
      // Clear move status after 3 seconds
      setTimeout(() => setMoveStatus(null), 3000);
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

  // Calculate column stats with safety check
  const getColumnStats = (status) => {
    const columnLeads = getLeadsByStatus(status);
    if (!Array.isArray(columnLeads)) {
      return { total: 0, highPriority: 0 };
    }
    const highPriority = columnLeads.filter(l => l && l.priority === 'High').length;
    return { total: columnLeads.length, highPriority };
  };

  // Handle call lead action using CallContext
  const handleCallLead = async (lead) => {
    if (!lead.phone) {
      alert('No phone number available for this lead');
      return;
    }
    
    console.log(`📞 Initiating call to ${lead.name} at ${lead.phone}`);
    
    // Update call attempts counter using shared context
    const updatedLead = { 
      ...lead, 
      call_attempts: (lead.call_attempts || 0) + 1, 
      last_contact: new Date().toISOString() 
    };
    updateLead(updatedLead);
    
    // Use CallContext to initiate call - this will show the floating call bar
    try {
      await initiateCall({
        phoneNumber: lead.phone,
        leadData: {
          id: lead.id,
          name: lead.name,
          company: lead.company,
          email: lead.email,
          notes: lead.notes,
          priority: lead.priority
        },
        source: 'kanban'
      });
    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      alert('Failed to start call. Please try again.');
      
      // Revert the optimistic update on error using shared context
      const revertedLead = { 
        ...lead, 
        call_attempts: Math.max(0, (lead.call_attempts || 1) - 1) 
      };
      updateLead(revertedLead);
    }
  };

  // Handle email lead action with enhanced modal
  const handleEmailLead = (lead) => {
    if (!lead.email) {
      alert('No email address available for this lead');
      return;
    }
    
    console.log(`📧 Opening email composer for ${lead.name} at ${lead.email}`);
    setSelectedLeadForAction(lead);
    setEmailModalVisible(true);
  };
  
  // Handle email send
  const handleEmailSend = async (emailData) => {
    try {
      console.log('📧 Email sent:', emailData);
      
      // Update lead's last contact time using shared context
      const targetLead = leads.find(l => l.id === emailData.leadId);
      if (targetLead) {
        const updatedLead = { 
          ...targetLead, 
          last_contact: new Date().toISOString() 
        };
        updateLead(updatedLead);
      }
      
      // Here you could also save the email to your backend if needed
      // await leadsService.logEmail(emailData);
      
    } catch (error) {
      console.error('❌ Error logging email:', error);
    }
  };

  // Handle add note action with enhanced modal
  const handleAddNote = (lead) => {
    console.log(`📝 Opening notes editor for ${lead.name}`);
    setSelectedLeadForAction(lead);
    setNotesModalVisible(true);
  };
  
  // Handle notes save
  const handleNotesSave = async (notesData) => {
    try {
      console.log('📝 Notes saved:', notesData);
      
      // Update the lead with new notes using shared context
      const targetLead = leads.find(l => l.id === notesData.leadId);
      if (targetLead) {
        const updatedLead = {
          ...targetLead,
          notes: notesData.notes,
          last_contact: new Date().toISOString()
        };
        updateLead(updatedLead);
      }
      
      // If using API, save to server through LeadContext
      if (apiConnected) {
        console.log(`📝 Note updated for lead via API: ${notesData.notes}`);
        // The updateLead function handles API calls automatically
      }
      
    } catch (error) {
      console.error('❌ Error saving notes:', error);
      throw error; // Re-throw to show error in modal
    }
  };

  // Debug state values
  console.log('🔍 [LeadKanban] Current state check:', {
    loading,
    leadsType: typeof leads,
    isArray: Array.isArray(leads),
    leadsLength: Array.isArray(leads) ? leads.length : 'not an array',
    leads: leads
  });

  // Show loading state or if leads is not yet an array
  if (loading || !Array.isArray(leads)) {
    console.log('⏳ [LeadKanban] Showing loading state - loading:', loading, 'isArray:', Array.isArray(leads));
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>Loading pipeline...</p>
          <p className="text-xs text-gray-400 mt-2">
            Debug: loading={String(loading)}, isArray={String(Array.isArray(leads))}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className={`text-lg font-semibold mb-2 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>Error Loading Pipeline</h3>
          <p className={`mb-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>{error}</p>
          <button
            onClick={refreshLeads}
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
          <div className="flex items-center space-x-3">
            <h2 className={`text-2xl font-bold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>Lead Pipeline</h2>
            {!apiConnected && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                isDarkMode 
                  ? 'bg-red-900/40 text-red-200 border border-red-700' 
                  : 'bg-red-100 text-red-800'
              }`}>
                📡 Offline
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Move Status Indicator */}
            {moveStatus && (
              <div className={`px-2 py-1 text-xs rounded-full ${
                moveStatus === 'success' 
                  ? isDarkMode 
                    ? 'bg-green-900/40 text-green-200 border border-green-700'
                    : 'bg-green-100 text-green-800'
                  : moveStatus === 'warning'
                  ? isDarkMode
                    ? 'bg-yellow-900/40 text-yellow-200 border border-yellow-700'
                    : 'bg-yellow-100 text-yellow-800'
                  : moveStatus === 'error'
                  ? isDarkMode
                    ? 'bg-red-900/40 text-red-200 border border-red-700'
                    : 'bg-red-100 text-red-800'
                  : isDarkMode
                    ? 'bg-blue-900/40 text-blue-200 border border-blue-700'
                    : 'bg-blue-100 text-blue-800'
              }`}>
                {moveStatus === 'success' && '✅ Moved'}
                {moveStatus === 'warning' && '⚠️ Local Only'}
                {moveStatus === 'error' && '❌ Failed'}
                {moveStatus === 'pending' && '⏳ Moving...'}
              </div>
            )}
            
            <div className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Total: {leads.length} leads
            </div>
            <button
              onClick={refreshLeads}
              className={`px-3 py-1 text-sm border rounded-md ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
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
          const columnStyles = getColumnStyles(column.color);

          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 ${columnStyles.bgColor} rounded-lg transition-all duration-200 ${
                isDragOver ? 'border-blue-500 shadow-lg' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`p-4 border-b ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{column.icon}</span>
                    <h3 className={`font-semibold ${columnStyles.titleColor}`}>
                      {column.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {stats.total}
                    </span>
                    {stats.highPriority > 0 && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isDarkMode 
                          ? 'bg-red-900/40 text-red-200 border border-red-700' 
                          : 'bg-red-100 text-red-800'
                      }`}>
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
                    <div className={`text-4xl mb-2 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>📭</div>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>No leads in this stage</p>
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
                        className={`p-4 rounded-lg shadow-sm border cursor-move hover:shadow-md transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-600 hover:bg-gray-750' 
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        } ${
                          isDragging ? 'opacity-50 rotate-3 scale-105' : ''
                        }`}
                      >
                        {/* Lead Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold truncate ${
                              isDarkMode ? 'text-gray-100' : 'text-gray-900'
                            }`}>
                              {lead.name}
                            </h4>
                            <p className={`text-sm truncate ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
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
                            <span className={`${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Phone:</span>
                            <span 
                              className={`font-mono ${
                                isDarkMode ? 'text-gray-200' : 'text-gray-900'
                              }`}
                              style={{ userSelect: 'none', pointerEvents: 'none' }}
                              data-phone-display="true"
                            >
                              {lead.phone ? lead.phone.replace(/(\d)/g, '$1\u200B') : 'N/A'}
                            </span>
                          </div>
                          
                          {lead.email && (
                            <div className="flex items-center justify-between">
                              <span className={`${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>Email:</span>
                              <span className={`truncate max-w-32 ${
                                isDarkMode ? 'text-gray-200' : 'text-gray-900'
                              }`}>
                                {lead.email}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className={`${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Last Contact:</span>
                            <span className={`${
                              isDarkMode ? 'text-gray-200' : 'text-gray-900'
                            }`}>
                              {formatDate(lead.last_contact)}
                            </span>
                          </div>

                          {lead.conversion_probability && (
                            <div className="flex items-center justify-between">
                              <span className={`${ 
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>Score:</span>
                              <span className={`font-semibold ${
                                isDarkMode ? 'text-gray-200' : 'text-gray-900'
                              }`}>
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
                                className={`px-2 py-1 text-xs rounded ${
                                  isDarkMode 
                                    ? 'bg-gray-700 text-gray-300' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                            {lead.tags.length > 2 && (
                              <span className={`px-2 py-1 text-xs rounded ${
                                isDarkMode 
                                  ? 'bg-gray-700 text-gray-300' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                +{lead.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes Preview */}
                        {lead.notes && (
                          <div className={`mt-3 p-2 rounded text-xs ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                          }`}>
                            <p className={`${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
                                e.preventDefault(); // Prevent default tel: link behavior
                                handleCallLead(lead);
                              }}
                              onTouchStart={(e) => e.preventDefault()} // Prevent mobile touch handlers
                              className={`p-1 rounded transition-all duration-200 ${
                                !lead.phone 
                                  ? 'opacity-50 cursor-not-allowed'
                                  : isDarkMode 
                                    ? 'text-green-400 hover:bg-green-900/30 hover:text-green-300' 
                                    : 'text-green-600 hover:bg-green-100 hover:text-green-700'
                              }`}
                              style={{ 
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                touchAction: 'manipulation'
                              }}
                              title={lead.phone ? `Call ${lead.name} at ${lead.phone}` : 'No phone number available'}
                              disabled={!lead.phone}
                            >
                              📞
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEmailLead(lead);
                              }}
                              className={`p-1 rounded transition-all duration-200 ${
                                !lead.email 
                                  ? 'opacity-50 cursor-not-allowed'
                                  : isDarkMode 
                                    ? 'text-blue-400 hover:bg-blue-900/30 hover:text-blue-300' 
                                    : 'text-blue-600 hover:bg-blue-100 hover:text-blue-700'
                              }`}
                              title={lead.email ? `Email ${lead.name} at ${lead.email}` : 'No email address available'}
                              disabled={!lead.email}
                            >
                              📧
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddNote(lead);
                              }}
                              className={`p-1 rounded transition-all duration-200 ${
                                isDarkMode 
                                  ? 'text-amber-400 hover:bg-amber-900/30 hover:text-amber-300' 
                                  : 'text-amber-600 hover:bg-amber-100 hover:text-amber-700'
                              }`}
                              title={`${lead.notes ? 'Edit notes' : 'Add note'} for ${lead.name}`}
                            >
                              📝
                            </button>
                          </div>
                          <div className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}>
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
      <div className={`mt-6 rounded-lg shadow-sm border p-6 ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-600' 
          : 'bg-white border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          isDarkMode ? 'text-gray-100' : 'text-gray-900'
        }`}>Pipeline Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {columns.map((column) => {
            const stats = getColumnStats(column.id);
            const percentage = leads.length > 0 ? (stats.total / leads.length) * 100 : 0;
            
            return (
              <div key={column.id} className="text-center">
                <div className="text-2xl mb-1">{column.icon}</div>
                <div className={`font-semibold ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>{stats.total}</div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>{column.title}</div>
                <div className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>{percentage.toFixed(1)}%</div>
                {stats.highPriority > 0 && (
                  <div className={`text-xs font-medium mt-1 ${
                    isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {stats.highPriority} urgent
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag Instructions */}
      <div className={`mt-4 text-center text-sm ${
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        💡 Drag leads between columns to update their status
      </div>
      
      {/* Email Composer Modal */}
      <EmailComposer
        isVisible={emailModalVisible}
        leadData={selectedLeadForAction}
        onClose={() => {
          setEmailModalVisible(false);
          setSelectedLeadForAction(null);
        }}
        onSend={handleEmailSend}
      />
      
      {/* Notes Editor Modal */}
      <NotesEditor
        isVisible={notesModalVisible}
        leadData={selectedLeadForAction}
        onClose={() => {
          setNotesModalVisible(false);
          setSelectedLeadForAction(null);
        }}
        onSave={handleNotesSave}
      />
    </div>
  );
};

export default LeadKanban;