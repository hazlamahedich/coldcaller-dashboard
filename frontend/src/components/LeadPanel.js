import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLead } from '../contexts/LeadContext';
import MeetingScheduleModal from './MeetingScheduleModal';
import EmailComposerModal from './EmailComposerModal';
import LeadTimeline from './LeadTimeline';

// LeadPanel Component - Displays information about the person you're calling
// Shows their name, company, phone number, and notes
// Now integrated with shared Lead Context for data synchronization

const LeadPanel = () => {
  const { isDarkMode, themeClasses } = useTheme();
  const {
    getCurrentLead,
    loading,
    error,
    apiConnected,
    currentLeadIndex,
    totalLeads,
    hasNextLead,
    hasPreviousLead,
    nextLead,
    previousLead,
    updateLeadStatus,
    updateLeadNotes,
    refreshLeads
  } = useLead();
  
  // Local component state for notes editing
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Meeting scheduling state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  
  // Email composer state
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Timeline modal state
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineRefreshTrigger, setTimelineRefreshTrigger] = useState(0);

  // Get the current lead
  const currentLead = getCurrentLead();

  // Function to handle lead navigation with notes editing cleanup
  const handleNextLead = () => {
    nextLead();
    setIsEditingNotes(false);
  };

  const handlePreviousLead = () => {
    previousLead();
    setIsEditingNotes(false);
  };

  // Function to update lead status with loading state
  const handleUpdateStatus = async (newStatus) => {
    if (!currentLead?.id || !apiConnected) {
      console.warn('Cannot update status: no lead ID or API unavailable');
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const result = await updateLeadStatus(currentLead.id, newStatus);
      
      if (!result.success) {
        console.error('Failed to update status:', result.message);
      }
    } catch (err) {
      console.error('❌ Failed to update lead status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Function to start editing notes
  const startEditingNotes = () => {
    setTempNotes(currentLead.notes || '');
    setIsEditingNotes(true);
  };

  // Function to save notes with shared context
  const saveNotes = async () => {
    if (!currentLead?.id) {
      console.warn('No lead ID available for saving notes');
      return;
    }

    try {
      setIsUpdatingNotes(true);
      const result = await updateLeadNotes(currentLead.id, tempNotes);
      
      if (result.success) {
        setIsEditingNotes(false);
        console.log('✅ Notes saved successfully');
      } else {
        console.error('Failed to save notes:', result.message);
      }
    } catch (err) {
      console.error('❌ Failed to save notes:', err);
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  // Function to cancel editing
  const cancelEdit = () => {
    setIsEditingNotes(false);
    setTempNotes('');
  };

  // Function to handle sending email - now opens email composer modal
  const handleSendEmail = () => {
    if (!currentLead?.email) {
      alert('No email address available for this lead');
      return;
    }
    
    setShowEmailModal(true);
  };

  // Function to show timeline
  const handleShowTimeline = () => {
    if (!currentLead?.id) {
      alert('No lead selected');
      return;
    }
    
    setShowTimelineModal(true);
  };

  // Function to handle meeting scheduling completion
  const handleMeetingScheduled = async (meetingData) => {
    try {
      // Update lead status to Follow-up after scheduling meeting
      if (currentLead?.id && apiConnected) {
        await updateLeadStatus(currentLead.id, 'Follow-up');
      }
      
      // Close the modal
      setShowMeetingModal(false);
      
      // Show success message
      console.log('✅ Meeting scheduled successfully:', meetingData);
      
      // Refresh leads to get updated timeline
      refreshLeads();
      
      // Refresh timeline display
      setTimelineRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('❌ Error after meeting scheduling:', error);
    }
  };

  // Function to handle email sent completion
  const handleEmailSent = async (emailData) => {
    try {
      // Close the modal
      setShowEmailModal(false);
      
      // Show success message
      console.log('✅ Email sent successfully:', emailData);
      
      // Create timeline entry for email activity
      if (currentLead?.id && apiConnected) {
        try {
          const response = await fetch('/api/leads/' + currentLead.id + '/timeline', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}` // TODO: Get token from context
            },
            body: JSON.stringify({
              activityType: 'email_sent',
              description: `Email sent: ${emailData.subject}`,
              metadata: {
                to: emailData.to,
                cc: emailData.cc,
                bcc: emailData.bcc,
                subject: emailData.subject,
                messageId: emailData.messageId,
                provider: emailData.provider,
                wordCount: emailData.body ? emailData.body.split(' ').length : 0,
                priority: emailData.priority,
                trackOpens: emailData.trackOpens,
                trackClicks: emailData.trackClicks
              }
            })
          });

          if (!response.ok) {
            console.warn('Failed to create email timeline entry');
          }
        } catch (timelineError) {
          console.warn('Error creating email timeline entry:', timelineError);
        }
      }
      
      // Refresh leads to get updated timeline
      refreshLeads();
      
      // Refresh timeline display
      setTimelineRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('❌ Error after email sending:', error);
    }
  };

  // Get status badge classes based on status
  const getStatusBadgeClasses = (status) => {
    const baseClasses = 'inline-block px-3 py-1 text-white text-xs font-bold rounded-full transition-colors ml-2';
    
    switch (status) {
      case 'New':
        return `${baseClasses} bg-blue-500`;
      case 'Follow-up':
        return `${baseClasses} bg-orange-500`;
      case 'Qualified':
        return `${baseClasses} bg-green-500`;
      case 'Not Interested':
        return `${baseClasses} bg-red-500`;
      default:
        return `${baseClasses} bg-gray-500`;
    }
  };

  return (
    <div className="card max-w-md m-3">
      <div className="text-center mb-4">
        <h2 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>Current Lead</h2>
        {loading && (
          <div className="text-sm text-blue-600 mt-1">
            🔄 Loading leads...
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
            ⚠️ {error}
            <button 
              onClick={refreshLeads} 
              className="ml-2 text-blue-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
      
      {/* Lead navigation */}
      <div className={`flex justify-between items-center mb-5 p-3 rounded-lg shadow-sm ${themeClasses.cardBg} ${themeClasses.border} border`}>
        <button 
          onClick={handlePreviousLead}
          disabled={!hasPreviousLead || loading}
          className={`btn-primary text-sm py-2 px-3 ${
            !hasPreviousLead || loading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-600'
          } transition-colors`}
          title="Previous Lead"
        >
          ⬅️
        </button>
        <span className="text-sm font-semibold text-gray-600">
          Lead {currentLeadIndex + 1} of {totalLeads}
          {!apiConnected && (
            <span className="ml-2 text-xs text-orange-600">(Offline)</span>
          )}
        </span>
        <button 
          onClick={handleNextLead}
          disabled={!hasNextLead || loading}
          className={`btn-primary text-sm py-2 px-3 ${
            !hasNextLead || loading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-600'
          } transition-colors`}
          title="Next Lead"
        >
          ➡️
        </button>
      </div>

      {/* Lead information card */}
      <div className={`rounded-lg shadow-soft p-6 mb-5 ${themeClasses.cardBg} ${themeClasses.border} border`}>
        {/* Lead details */}
        <div className="mb-5">
          <div className="flex items-center mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">👤 Name:</span>
            <span className={`flex-1 ${themeClasses.textPrimary} font-medium`}>
              {currentLead.name}
              <span className={getStatusBadgeClasses(currentLead.status)}>
                {currentLead.status}
              </span>
            </span>
          </div>
          
          <div className="flex mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">🏢 Company:</span>
            <span className={`flex-1 ${themeClasses.textPrimary}`}>{currentLead.company}</span>
          </div>
          
          <div className="flex mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">📞 Phone:</span>
            <span className={`flex-1 ${themeClasses.textPrimary}`}>{currentLead.phone}</span>
          </div>
          
          <div className="flex mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">✉️ Email:</span>
            <span className={`flex-1 ${themeClasses.textPrimary}`}>{currentLead.email}</span>
          </div>
          
          <div className="flex mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">📅 Last Contact:</span>
            <span className={`flex-1 ${themeClasses.textPrimary}`}>{currentLead.lastContact}</span>
          </div>
        </div>

        {/* Notes section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-sm text-gray-600">📝 Notes:</span>
            {!isEditingNotes && (
              <button 
                onClick={startEditingNotes} 
                className="btn-secondary text-xs py-1 px-3 hover:bg-blue-600 transition-colors"
              >
                ✏️ Edit
              </button>
            )}
          </div>
          
          {isEditingNotes ? (
            <div>
              <textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                className="input-field text-sm resize-y"
                rows="4"
                placeholder="Enter your notes about this lead..."
              />
              <div className="flex gap-3 mt-3">
                <button 
                  onClick={saveNotes} 
                  disabled={isUpdatingNotes}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {isUpdatingNotes ? '🔄 Saving...' : '✅ Save'}
                </button>
                <button 
                  onClick={cancelEdit} 
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={`p-3 rounded-md text-sm leading-relaxed ${
              isDarkMode 
                ? 'bg-gray-800 text-gray-200 border border-gray-700'
                : 'bg-gray-50 text-gray-800'
            }`}>
              {currentLead.notes || 'No notes yet. Click Edit to add notes.'}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        {/* Status Update Buttons */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowMeetingModal(true)}
            disabled={!apiConnected || !currentLead?.id}
            className="flex-1 min-w-[100px] p-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition-colors"
            title="Schedule a follow-up meeting"
          >
            📅 Schedule Follow-up
          </button>
          <button 
            onClick={() => handleUpdateStatus('Qualified')}
            disabled={isUpdatingStatus || !apiConnected}
            className="flex-1 min-w-[100px] p-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition-colors"
          >
            ✅ Qualified
          </button>
          <button 
            onClick={() => handleUpdateStatus('Not Interested')}
            disabled={isUpdatingStatus || !apiConnected}
            className="flex-1 min-w-[100px] p-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition-colors"
          >
            ❌ Not Interested
          </button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleSendEmail}
            disabled={!apiConnected}
className={`flex-1 min-w-[120px] p-3 rounded-md text-sm font-medium transition-all hover:shadow-sm disabled:opacity-50 ${
              isDarkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600 border'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 border'
            }`}
          >
            📧 Send Email
          </button>
          <button 
            onClick={refreshLeads}
            disabled={loading}
className={`flex-1 min-w-[120px] p-3 rounded-md text-sm font-medium transition-all hover:shadow-sm disabled:opacity-50 ${
              isDarkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600 border'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 border'
            }`}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button 
            onClick={handleShowTimeline}
            disabled={!apiConnected}
className={`flex-1 min-w-[120px] p-3 rounded-md text-sm font-medium transition-all hover:shadow-sm disabled:opacity-50 ${
              isDarkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600 border'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 border'
            }`}
          >
            📅 Timeline
          </button>
        </div>
        
        {/* API Status Indicator */}
        <div className="text-center text-xs text-gray-500 mt-2">
          API Status: 
          <span className={`ml-1 font-semibold ${
            apiConnected ? 'text-green-600' : 'text-orange-600'
          }`}>
            {apiConnected ? '🟢 Connected' : '🟡 Offline Mode'}
          </span>
        </div>
      </div>

      {/* Meeting Schedule Modal */}
      <MeetingScheduleModal
        lead={currentLead}
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        onMeetingScheduled={handleMeetingScheduled}
      />

      {/* Email Composer Modal */}
      <EmailComposerModal
        lead={currentLead}
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onEmailSent={handleEmailSent}
      />

      {/* Timeline Modal */}
      {showTimelineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                📅 Timeline - {currentLead?.name}
              </h2>
              <button
                onClick={() => setShowTimelineModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <LeadTimeline 
                leadId={currentLead?.id} 
                refreshTrigger={timelineRefreshTrigger}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadPanel;