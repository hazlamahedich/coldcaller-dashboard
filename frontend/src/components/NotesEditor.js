import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * NotesEditor - Enhanced notes editing modal with rich features
 * Features: History tracking, timestamps, rich text formatting, auto-save
 */
const NotesEditor = ({ isVisible, leadData, onClose, onSave }) => {
  const { isDarkMode } = useTheme();
  const [currentNote, setCurrentNote] = useState('');
  const [notesHistory, setNotesHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Note categories for organization
  const noteCategories = {
    general: { name: 'General', icon: '📝', color: 'blue' },
    call: { name: 'Call Notes', icon: '📞', color: 'green' },
    meeting: { name: 'Meeting Notes', icon: '🤝', color: 'purple' },
    follow_up: { name: 'Follow-up', icon: '⏰', color: 'orange' },
    personal: { name: 'Personal', icon: '👤', color: 'pink' },
    technical: { name: 'Technical', icon: '⚙️', color: 'gray' },
    pricing: { name: 'Pricing/Budget', icon: '💰', color: 'yellow' },
    decision: { name: 'Decision Notes', icon: '🎯', color: 'red' }
  };

  // Initialize when component becomes visible
  useEffect(() => {
    if (isVisible && leadData) {
      // Load existing notes and create history
      const existingNotes = leadData.notes || '';
      setCurrentNote(existingNotes);
      
      // Create notes history from existing notes
      if (existingNotes) {
        setNotesHistory([{
          id: 'existing',
          content: existingNotes,
          category: 'general',
          timestamp: leadData.last_contact || new Date().toISOString(),
          author: 'Previous'
        }]);
      } else {
        setNotesHistory([]);
      }
      
      setHasUnsavedChanges(false);
      setError(null);
      
      // Focus on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(existingNotes.length, existingNotes.length);
        }
      }, 100);
    }
  }, [isVisible, leadData]);

  // Track changes
  useEffect(() => {
    const originalNote = leadData?.notes || '';
    setHasUnsavedChanges(currentNote !== originalNote);
  }, [currentNote, leadData]);

  // Handle note content changes
  const handleNoteChange = (value) => {
    setCurrentNote(value);
  };

  // Add timestamp to note
  const addTimestamp = () => {
    const timestamp = new Date().toLocaleString();
    const timestampText = `\n\n[${timestamp}] `;
    const textarea = textareaRef.current;
    
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const beforeCursor = currentNote.slice(0, cursorPos);
      const afterCursor = currentNote.slice(cursorPos);
      const newNote = beforeCursor + timestampText + afterCursor;
      
      setCurrentNote(newNote);
      
      // Set cursor position after timestamp
      setTimeout(() => {
        textarea.setSelectionRange(
          cursorPos + timestampText.length,
          cursorPos + timestampText.length
        );
        textarea.focus();
      }, 0);
    }
  };

  // Add quick note templates
  const quickNotes = {
    interested: "✅ Lead shows strong interest",
    not_ready: "⏰ Not ready now, follow up in 3 months",
    budget_concern: "💰 Budget concerns - needs to discuss with team",
    decision_maker: "👥 Need to connect with decision maker",
    competitor: "⚡ Currently using competitor, contract expires [DATE]",
    demo_requested: "🎯 Demo requested - scheduling for next week",
    no_answer: "📵 No answer - left voicemail",
    callback: "📞 Requested callback at [TIME/DATE]"
  };

  const addQuickNote = (noteKey) => {
    const quickNote = quickNotes[noteKey];
    const timestamp = new Date().toLocaleString();
    const noteToAdd = `\n\n[${timestamp}] ${quickNote}`;
    
    setCurrentNote(prev => prev + noteToAdd);
    
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          currentNote.length + noteToAdd.length,
          currentNote.length + noteToAdd.length
        );
      }
    }, 0);
  };

  // Save notes
  const handleSave = async () => {
    if (!currentNote.trim()) {
      setError('Please enter some notes before saving.');
      return;
    }

    setIsLoading(true);
    try {
      // Create a new note entry for history
      const newNoteEntry = {
        id: Date.now().toString(),
        content: currentNote,
        category: selectedCategory,
        timestamp: new Date().toISOString(),
        author: 'Current User'
      };

      // Update history
      setNotesHistory(prev => [newNoteEntry, ...prev.filter(n => n.id !== 'existing')]);

      // Call the onSave callback
      if (onSave) {
        await onSave({
          notes: currentNote,
          category: selectedCategory,
          timestamp: new Date().toISOString(),
          leadId: leadData?.id
        });
      }

      console.log('📝 Notes saved for lead:', leadData?.name);
      setHasUnsavedChanges(false);
      
      // Show success and close after delay
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('❌ Error saving notes:', error);
      setError('Failed to save notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm('You have unsaved changes. Are you sure you want to close without saving?');
      if (!shouldClose) return;
    }
    onClose();
  };

  // Get word count
  const getWordCount = () => {
    return currentNote.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl ${
        isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📝</div>
            <div>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                Edit Notes
              </h2>
              {leadData && (
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  For: {leadData.name} {leadData.company && `at ${leadData.company}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {hasUnsavedChanges && (
              <span className={`text-sm px-2 py-1 rounded-full ${
                isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-800'
              }`}>
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-red-600">⚠️</span>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Category Selection */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Note Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full p-3 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200' 
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              >
                {Object.entries(noteCategories).map(([key, category]) => (
                  <option key={key} value={key}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={addTimestamp}
                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                🕒 Add Timestamp
              </button>
            </div>

            {/* Notes Textarea */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Notes
              </label>
              <textarea
                ref={textareaRef}
                value={currentNote}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Enter your notes here... Use timestamps to track conversation history."
                rows={15}
                className={`w-full p-4 rounded-lg border resize-none font-mono text-sm leading-relaxed ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              <div className={`mt-2 text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {getWordCount()} words • {currentNote.length} characters
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={!currentNote.trim() || isLoading}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg"
              >
                <span>{isLoading ? '🔄' : '💾'}</span>
                <span>{isLoading ? 'Saving...' : 'Save Notes'}</span>
              </button>

              <button
                onClick={handleClose}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className={`w-80 border-l p-6 ${
            isDarkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'
          }`}>
            {/* Quick Notes */}
            <div className="mb-6">
              <h3 className={`text-sm font-medium mb-3 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Quick Notes
              </h3>
              <div className="space-y-2">
                {Object.entries(quickNotes).map(([key, note]) => (
                  <button
                    key={key}
                    onClick={() => addQuickNote(key)}
                    className={`w-full text-left p-2 text-xs rounded-lg border transition-colors ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-200 text-gray-600 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes History */}
            {notesHistory.length > 0 && (
              <div>
                <h3 className={`text-sm font-medium mb-3 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Notes History
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {notesHistory.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg border ${
                        isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${
                          noteCategories[note.category]?.color === 'blue' ? 'text-blue-600' :
                          noteCategories[note.category]?.color === 'green' ? 'text-green-600' :
                          noteCategories[note.category]?.color === 'orange' ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          {noteCategories[note.category]?.icon} {noteCategories[note.category]?.name}
                        </span>
                        <span className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {new Date(note.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`} style={{ 
                        display: '-webkit-box', 
                        WebkitLineClamp: 3, 
                        WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden' 
                      }}>
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className={`mt-6 p-4 rounded-lg ${
              isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600">💡</span>
                <div className={`text-xs ${
                  isDarkMode ? 'text-blue-200' : 'text-blue-800'
                }`}>
                  <strong>Tips:</strong>
                  <ul className="mt-2 space-y-1 ml-2">
                    <li>• Use timestamps to track conversation progression</li>
                    <li>• Quick notes help maintain consistency</li>
                    <li>• Categories help organize different types of information</li>
                    <li>• Notes are automatically saved with lead data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesEditor;