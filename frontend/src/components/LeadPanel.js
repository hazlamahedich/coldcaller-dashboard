import React, { useState, useEffect } from 'react';
import { leadsService } from '../services';
import { dummyLeads } from '../data/dummyData';

// LeadPanel Component - Displays information about the person you're calling
// Shows their name, company, phone number, and notes
// Now integrated with backend API services

const LeadPanel = () => {
  // API Integration State
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  
  // Lead Management State
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Load leads from API on component mount
  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await leadsService.getAllLeads();
      
      if (response.success && response.data.length > 0) {
        setLeads(response.data);
        setApiConnected(true);
        console.log('✅ Leads loaded from API:', response.data.length, 'leads');
      } else {
        // Fallback to dummy data if API fails or returns no data
        console.log('⚠️ API unavailable, using dummy data');
        setLeads(dummyLeads);
        setApiConnected(false);
      }
    } catch (err) {
      console.error('❌ Failed to load leads:', err);
      setError('Failed to load leads from server');
      // Fallback to dummy data
      setLeads(dummyLeads);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Get the current lead (fallback to first dummy lead if none available)
  const currentLead = leads[currentLeadIndex] || dummyLeads[0];

  // Function to go to the next lead
  const nextLead = () => {
    if (currentLeadIndex < leads.length - 1) {
      setCurrentLeadIndex(currentLeadIndex + 1);
      setIsEditingNotes(false);
      setError(null); // Clear any previous errors
    }
  };

  // Function to go to the previous lead
  const previousLead = () => {
    if (currentLeadIndex > 0) {
      setCurrentLeadIndex(currentLeadIndex - 1);
      setIsEditingNotes(false);
      setError(null); // Clear any previous errors
    }
  };

  // Function to update lead status
  const updateLeadStatus = async (newStatus) => {
    if (!currentLead?.id || !apiConnected) {
      console.warn('Cannot update status: no lead ID or API unavailable');
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setError(null);
      
      const response = await leadsService.updateLeadStatus(currentLead.id, newStatus);
      
      if (response.success) {
        // Update local state with new status
        const updatedLeads = [...leads];
        updatedLeads[currentLeadIndex] = { ...currentLead, status: newStatus };
        setLeads(updatedLeads);
        
        console.log(`✅ Lead status updated to: ${newStatus}`);
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
      
    } catch (err) {
      console.error('❌ Failed to update lead status:', err);
      setError(`Failed to update status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Function to refresh leads data
  const refreshLeads = () => {
    loadLeads();
  };

  // Function to start editing notes
  const startEditingNotes = () => {
    setTempNotes(currentLead.notes);
    setIsEditingNotes(true);
  };

  // Function to save notes (now with API integration)
  const saveNotes = async () => {
    if (!currentLead?.id) {
      console.warn('No lead ID available for saving notes');
      return;
    }

    try {
      setIsUpdatingNotes(true);
      setError(null);
      
      if (apiConnected) {
        // Save to API if connected
        const response = await leadsService.updateLeadNotes(currentLead.id, tempNotes);
        
        if (response.success) {
          // Update local state with API response
          const updatedLeads = [...leads];
          updatedLeads[currentLeadIndex] = { ...currentLead, notes: tempNotes };
          setLeads(updatedLeads);
          
          console.log('✅ Notes saved to API successfully');
        } else {
          throw new Error(response.message || 'Failed to save notes');
        }
      } else {
        // Update local dummy data as fallback
        const updatedLeads = [...leads];
        updatedLeads[currentLeadIndex] = { ...currentLead, notes: tempNotes };
        setLeads(updatedLeads);
        
        console.log('💾 Notes saved locally (API unavailable)');
      }
      
      setIsEditingNotes(false);
      
    } catch (err) {
      console.error('❌ Failed to save notes:', err);
      setError(`Failed to save notes: ${err.message}`);
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  // Function to cancel editing
  const cancelEdit = () => {
    setIsEditingNotes(false);
    setTempNotes('');
  };

  // Get status badge classes based on status
  const getStatusBadgeClasses = (status) => {
    const baseClasses = 'absolute top-3 right-3 px-3 py-1 text-white text-xs font-bold rounded-full transition-colors';
    
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
        <h2 className="text-xl font-semibold text-gray-800">Current Lead</h2>
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
      <div className="flex justify-between items-center mb-5 p-3 bg-white rounded-lg shadow-sm">
        <button 
          onClick={previousLead}
          disabled={currentLeadIndex === 0 || loading}
          className={`btn-primary text-sm py-2 px-4 ${
            currentLeadIndex === 0 || loading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-600'
          } transition-colors`}
        >
          ⬅️ Previous
        </button>
        <span className="text-sm font-semibold text-gray-600">
          Lead {currentLeadIndex + 1} of {leads.length}
          {!apiConnected && (
            <span className="ml-2 text-xs text-orange-600">(Offline)</span>
          )}
        </span>
        <button 
          onClick={nextLead}
          disabled={currentLeadIndex === leads.length - 1 || loading}
          className={`btn-primary text-sm py-2 px-4 ${
            currentLeadIndex === leads.length - 1 || loading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-600'
          } transition-colors`}
        >
          Next ➡️
        </button>
      </div>

      {/* Lead information card */}
      <div className="bg-white rounded-lg shadow-soft p-6 relative mb-5">
        {/* Status badge */}
        <div className={getStatusBadgeClasses(currentLead.status)}>
          {currentLead.status}
        </div>

        {/* Lead details */}
        <div className="mb-5">
          <div className="flex mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">👤 Name:</span>
            <span className="flex-1 text-gray-800">{currentLead.name}</span>
          </div>
          
          <div className="flex mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">🏢 Company:</span>
            <span className="flex-1 text-gray-800">{currentLead.company}</span>
          </div>
          
          <div className="flex mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">📞 Phone:</span>
            <span className="flex-1 text-gray-800">{currentLead.phone}</span>
          </div>
          
          <div className="flex mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">✉️ Email:</span>
            <span className="flex-1 text-gray-800">{currentLead.email}</span>
          </div>
          
          <div className="flex mb-3 text-sm">
            <span className="w-28 font-semibold text-gray-600">📅 Last Contact:</span>
            <span className="flex-1 text-gray-800">{currentLead.lastContact}</span>
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
            <div className="p-3 bg-gray-50 rounded-md text-sm leading-relaxed text-gray-800">
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
            onClick={() => updateLeadStatus('Follow-up')}
            disabled={isUpdatingStatus || !apiConnected}
            className="flex-1 min-w-[100px] p-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition-colors"
          >
            📅 Follow-up
          </button>
          <button 
            onClick={() => updateLeadStatus('Qualified')}
            disabled={isUpdatingStatus || !apiConnected}
            className="flex-1 min-w-[100px] p-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition-colors"
          >
            ✅ Qualified
          </button>
          <button 
            onClick={() => updateLeadStatus('Not Interested')}
            disabled={isUpdatingStatus || !apiConnected}
            className="flex-1 min-w-[100px] p-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition-colors"
          >
            ❌ Not Interested
          </button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button 
            disabled={!apiConnected}
            className="flex-1 min-w-[120px] p-3 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 border border-gray-300 rounded-md text-sm font-medium transition-all hover:shadow-sm"
          >
            📧 Send Email
          </button>
          <button 
            onClick={refreshLeads}
            disabled={loading}
            className="flex-1 min-w-[120px] p-3 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 border border-gray-300 rounded-md text-sm font-medium transition-all hover:shadow-sm"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button 
            disabled={!apiConnected}
            className="flex-1 min-w-[120px] p-3 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 border border-gray-300 rounded-md text-sm font-medium transition-all hover:shadow-sm"
          >
            📞 Call Log
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
    </div>
  );
};

export default LeadPanel;