import React, { useState } from 'react';
import { dummyLeads } from '../data/dummyData';

// LeadPanel Component - Displays information about the person you're calling
// Shows their name, company, phone number, and notes

const LeadPanel = () => {
  // Track which lead is currently selected (starts with the first one)
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  // Track if we're editing notes
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  // Track the notes being edited
  const [tempNotes, setTempNotes] = useState('');

  // Get the current lead
  const currentLead = dummyLeads[currentLeadIndex];

  // Function to go to the next lead
  const nextLead = () => {
    if (currentLeadIndex < dummyLeads.length - 1) {
      setCurrentLeadIndex(currentLeadIndex + 1);
      setIsEditingNotes(false);
    }
  };

  // Function to go to the previous lead
  const previousLead = () => {
    if (currentLeadIndex > 0) {
      setCurrentLeadIndex(currentLeadIndex - 1);
      setIsEditingNotes(false);
    }
  };

  // Function to start editing notes
  const startEditingNotes = () => {
    setTempNotes(currentLead.notes);
    setIsEditingNotes(true);
  };

  // Function to save notes
  const saveNotes = () => {
    // In Week 6, we'll save this to a real database
    console.log('Saving notes:', tempNotes);
    currentLead.notes = tempNotes;
    setIsEditingNotes(false);
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
      <h2 className="text-center text-xl font-semibold text-gray-800 mb-4">Current Lead</h2>
      
      {/* Lead navigation */}
      <div className="flex justify-between items-center mb-5 p-3 bg-white rounded-lg shadow-sm">
        <button 
          onClick={previousLead}
          disabled={currentLeadIndex === 0}
          className={`btn-primary text-sm py-2 px-4 ${
            currentLeadIndex === 0 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-600'
          } transition-colors`}
        >
          ⬅️ Previous
        </button>
        <span className="text-sm font-semibold text-gray-600">
          Lead {currentLeadIndex + 1} of {dummyLeads.length}
        </span>
        <button 
          onClick={nextLead}
          disabled={currentLeadIndex === dummyLeads.length - 1}
          className={`btn-primary text-sm py-2 px-4 ${
            currentLeadIndex === dummyLeads.length - 1 
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
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  ✅ Save
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
      <div className="flex flex-wrap gap-3">
        <button className="flex-1 min-w-[120px] p-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md text-sm font-medium transition-all hover:shadow-sm">
          📧 Send Email
        </button>
        <button className="flex-1 min-w-[120px] p-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md text-sm font-medium transition-all hover:shadow-sm">
          📅 Schedule Follow-up
        </button>
        <button className="flex-1 min-w-[120px] p-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md text-sm font-medium transition-all hover:shadow-sm">
          ✔️ Mark as Contacted
        </button>
      </div>
    </div>
  );
};

export default LeadPanel;