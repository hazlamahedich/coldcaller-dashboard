import React, { useState, useEffect, useRef, useMemo } from 'react';
import { notesService } from '../services';

// Main Note-Taking System Component with Templates, Rich Editor, and Search
const NoteTakingSystem = ({ leadId, callId, initialMode = 'create' }) => {
  // State management
  const [currentNote, setCurrentNote] = useState({
    id: null,
    content: '',
    type: 'general',
    tags: [],
    quality: 0,
    followUpRequired: false,
    followUpDate: '',
    collaborators: [],
    version: 1
  });
  
  const [notes, setNotes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    dateRange: 'all',
    outcome: 'all',
    quality: 'all'
  });
  
  const [mode, setMode] = useState(initialMode); // create, edit, search, analytics
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Rich text editor state
  const [editorFocused, setEditorFocused] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  
  // Collaboration state
  const [onlineCollaborators, setOnlineCollaborators] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    qualityScore: 0,
    completeness: 0,
    keywords: [],
    sentiment: 'neutral',
    actionItems: []
  });
  
  // Voice dictation state
  const [isRecording, setIsRecording] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  
  // Refs
  const editorRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // Predefined note templates
  const defaultTemplates = [
    {
      id: 'cold-call',
      name: 'Cold Call',
      icon: '📞',
      fields: [
        { name: 'introduction', label: 'Introduction Response', type: 'textarea', placeholder: 'How did they respond to your introduction?' },
        { name: 'painPoints', label: 'Pain Points Discussed', type: 'textarea', placeholder: 'What challenges did they mention?' },
        { name: 'objections', label: 'Objections Raised', type: 'textarea', placeholder: 'What concerns or objections did they have?' },
        { name: 'interest', label: 'Interest Level', type: 'select', options: ['High', 'Medium', 'Low', 'None'] },
        { name: 'nextSteps', label: 'Next Steps', type: 'textarea', placeholder: 'What are the agreed next steps?' },
        { name: 'followUp', label: 'Follow-up Date', type: 'date' }
      ]
    },
    {
      id: 'follow-up',
      name: 'Follow-up Call',
      icon: '🔄',
      fields: [
        { name: 'previousContext', label: 'Previous Discussion Summary', type: 'textarea', placeholder: 'What was discussed in previous calls?' },
        { name: 'newInformation', label: 'New Information Gathered', type: 'textarea', placeholder: 'What new information did you learn?' },
        { name: 'progressStatus', label: 'Progress Status', type: 'select', options: ['On Track', 'Delayed', 'Accelerated', 'Stalled'] },
        { name: 'actionItems', label: 'Action Items Completed', type: 'textarea', placeholder: 'What actions were completed since last call?' },
        { name: 'newActionItems', label: 'New Action Items', type: 'textarea', placeholder: 'What new actions need to be taken?' },
        { name: 'nextFollowUp', label: 'Next Follow-up Date', type: 'date' }
      ]
    },
    {
      id: 'demo-presentation',
      name: 'Demo/Presentation',
      icon: '💻',
      fields: [
        { name: 'attendees', label: 'Attendees', type: 'textarea', placeholder: 'Who attended the demo?' },
        { name: 'featuresShown', label: 'Features Demonstrated', type: 'textarea', placeholder: 'What features were shown?' },
        { name: 'reactions', label: 'Audience Reactions', type: 'textarea', placeholder: 'How did they react to different features?' },
        { name: 'questions', label: 'Questions Asked', type: 'textarea', placeholder: 'What questions did they ask?' },
        { name: 'concerns', label: 'Concerns Raised', type: 'textarea', placeholder: 'What concerns or objections were raised?' },
        { name: 'interestLevel', label: 'Overall Interest Level', type: 'select', options: ['Very High', 'High', 'Medium', 'Low', 'Very Low'] },
        { name: 'nextSteps', label: 'Next Steps', type: 'textarea', placeholder: 'What happens next?' }
      ]
    },
    {
      id: 'closing-call',
      name: 'Closing Call',
      icon: '🤝',
      fields: [
        { name: 'proposalDetails', label: 'Proposal Details', type: 'textarea', placeholder: 'What was proposed?' },
        { name: 'pricing', label: 'Pricing Discussed', type: 'textarea', placeholder: 'What pricing was discussed?' },
        { name: 'decisionMakers', label: 'Decision Makers', type: 'textarea', placeholder: 'Who are the key decision makers?' },
        { name: 'timeline', label: 'Decision Timeline', type: 'textarea', placeholder: 'What is their decision timeline?' },
        { name: 'competitors', label: 'Competitors Mentioned', type: 'textarea', placeholder: 'What other solutions are they considering?' },
        { name: 'objections', label: 'Final Objections', type: 'textarea', placeholder: 'What final objections need to be addressed?' },
        { name: 'closeAttempt', label: 'Close Attempt Result', type: 'select', options: ['Closed Won', 'Closed Lost', 'Needs Follow-up', 'Postponed'] },
        { name: 'nextAction', label: 'Next Action Required', type: 'textarea', placeholder: 'What is the next required action?' }
      ]
    },
    {
      id: 'general',
      name: 'General Notes',
      icon: '📝',
      fields: [
        { name: 'summary', label: 'Call Summary', type: 'textarea', placeholder: 'Brief summary of the call...' },
        { name: 'keyPoints', label: 'Key Points', type: 'textarea', placeholder: 'Important points discussed...' },
        { name: 'outcome', label: 'Call Outcome', type: 'select', options: ['Successful', 'Neutral', 'Challenging', 'Follow-up Required'] },
        { name: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional notes or observations...' },
        { name: 'followUp', label: 'Follow-up Required', type: 'checkbox' }
      ]
    }
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        setCurrentNote(prev => ({
          ...prev,
          content: prev.content + ' ' + transcript
        }));
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      setSpeechRecognition(recognition);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadNotes();
    loadTemplates();
    loadCollaborators();
    
    // Set up auto-save
    const interval = setInterval(() => {
      if (currentNote.content && mode === 'create') {
        autoSaveNote();
      }
    }, 30000); // Auto-save every 30 seconds
    
    return () => {
      clearInterval(interval);
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [leadId, callId]);

  // Auto-save functionality
  const autoSaveNote = async () => {
    if (!currentNote.content.trim()) return;
    
    try {
      setAutoSaving(true);
      await notesService.autoSaveNote({
        ...currentNote,
        leadId,
        callId,
        lastModified: new Date().toISOString()
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  // Load functions
  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const response = await notesService.getNotesByLead(leadId);
      if (response.success) {
        setNotes(response.data);
      }
    } catch (error) {
      setError('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await notesService.getTemplates();
      if (response.success) {
        setTemplates([...defaultTemplates, ...response.data]);
      } else {
        setTemplates(defaultTemplates);
      }
    } catch (error) {
      setTemplates(defaultTemplates);
    }
  };

  const loadCollaborators = async () => {
    try {
      const response = await notesService.getTeamMembers();
      if (response.success) {
        setOnlineCollaborators(response.data);
      }
    } catch (error) {
      console.error('Failed to load collaborators:', error);
    }
  };

  // Template functions
  const applyTemplate = (template) => {
    setActiveTemplate(template);
    setCurrentNote(prev => ({
      ...prev,
      type: template.id,
      content: generateTemplateContent(template)
    }));
    setMode('create');
  };

  const generateTemplateContent = (template) => {
    let content = `# ${template.name} - ${new Date().toLocaleDateString()}\n\n`;
    
    template.fields.forEach(field => {
      content += `## ${field.label}\n`;
      content += `${field.placeholder || ''}\n\n`;
    });
    
    return content;
  };

  // Search and filter functions
  const filteredNotes = useMemo(() => {
    let filtered = [...notes];
    
    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query)) ||
        note.type.toLowerCase().includes(query)
      );
    }
    
    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note =>
        selectedTags.some(tag => note.tags.includes(tag))
      );
    }
    
    // Date filter
    if (filterOptions.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filterOptions.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(note => new Date(note.createdAt) >= filterDate);
    }
    
    // Quality filter
    if (filterOptions.quality !== 'all') {
      const minQuality = parseInt(filterOptions.quality);
      filtered = filtered.filter(note => note.quality >= minQuality);
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notes, searchQuery, selectedTags, filterOptions]);

  // Rich text editor functions
  const insertText = (text) => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const newContent = 
      currentNote.content.substring(0, start) + 
      text + 
      currentNote.content.substring(end);
    
    setCurrentNote(prev => ({ ...prev, content: newContent }));
    
    // Set cursor position after insertion
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const formatText = (format) => {
    const editor = editorRef.current;
    if (!editor || !selectedText) return;
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'highlight':
        formattedText = `==${selectedText}==`;
        break;
      case 'link':
        formattedText = `[${selectedText}](url)`;
        break;
    }
    
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const newContent = 
      currentNote.content.substring(0, start) + 
      formattedText + 
      currentNote.content.substring(end);
    
    setCurrentNote(prev => ({ ...prev, content: newContent }));
  };

  // Voice dictation functions
  const startVoiceRecording = () => {
    if (!speechRecognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }
    
    setIsRecording(true);
    speechRecognition.start();
  };

  const stopVoiceRecording = () => {
    if (speechRecognition) {
      speechRecognition.stop();
    }
    setIsRecording(false);
  };

  // Save note function
  const saveNote = async () => {
    try {
      setIsLoading(true);
      
      const noteData = {
        ...currentNote,
        leadId,
        callId,
        quality: calculateNoteQuality(currentNote.content),
        analytics: await analyzeNote(currentNote.content)
      };
      
      const response = currentNote.id 
        ? await notesService.updateNote(currentNote.id, noteData)
        : await notesService.createNote(noteData);
      
      if (response.success) {
        setLastSaved(new Date());
        if (!currentNote.id) {
          setCurrentNote(prev => ({ ...prev, id: response.data.id }));
        }
        await loadNotes(); // Refresh notes list
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setError(`Failed to save note: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Note analysis functions
  const calculateNoteQuality = (content) => {
    let score = 0;
    
    // Length check (10 points)
    if (content.length > 50) score += 10;
    if (content.length > 200) score += 10;
    if (content.length > 500) score += 10;
    
    // Structure check (20 points)
    if (content.includes('#')) score += 10; // Has headings
    if (content.includes('-') || content.includes('*')) score += 10; // Has lists
    
    // Content quality (60 points)
    const keywords = ['discussed', 'agreed', 'next steps', 'follow-up', 'action', 'decision', 'outcome'];
    keywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) score += 5;
    });
    
    return Math.min(score, 100);
  };

  const analyzeNote = async (content) => {
    // Extract action items
    const actionItems = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      if (line.toLowerCase().includes('todo') || 
          line.toLowerCase().includes('action') ||
          line.toLowerCase().includes('follow')) {
        actionItems.push(line.trim());
      }
    });
    
    // Extract keywords
    const keywords = content
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});
    
    const topKeywords = Object.entries(keywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
    
    return {
      actionItems,
      keywords: topKeywords,
      wordCount: content.split(/\s+/).length,
      completeness: calculateNoteQuality(content)
    };
  };

  // Export functions
  const exportNote = async (format) => {
    try {
      const response = await notesService.exportNote(currentNote.id, format);
      if (response.success) {
        // Download file
        const blob = new Blob([response.data], { type: response.mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `note-${currentNote.id}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      setError(`Failed to export note: ${error.message}`);
    }
  };

  return (
    <div className="note-taking-system bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-800">📝 Call Notes</h2>
          {autoSaving && (
            <div className="flex items-center text-sm text-blue-600">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
              Saving...
            </div>
          )}
          {lastSaved && !autoSaving && (
            <div className="text-sm text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMode(mode === 'create' ? 'search' : 'create')}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {mode === 'create' ? '🔍 Search' : '📝 Create'}
          </button>
          
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            📊 Analytics
          </button>
          
          <button
            onClick={() => setShowCollaboration(!showCollaboration)}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            👥 Collaborate
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          <div className="flex">
            <span className="mr-2">⚠️</span>
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex h-96">
        {/* Sidebar - Templates and Notes List */}
        <div className="w-1/4 border-r bg-gray-50">
          {mode === 'create' ? (
            // Templates section
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-700 mb-3">📋 Templates</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      activeTemplate?.id === template.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{template.icon}</span>
                      <div>
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-gray-500">
                          {template.fields.length} fields
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Search and filters section
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-700 mb-3">🔍 Search Notes</h3>
              
              {/* Search input */}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full p-2 border rounded-lg text-sm mb-3"
              />
              
              {/* Filters */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date Range</label>
                  <select
                    value={filterOptions.dateRange}
                    onChange={(e) => setFilterOptions(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full p-1 border rounded text-xs"
                  >
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quality</label>
                  <select
                    value={filterOptions.quality}
                    onChange={(e) => setFilterOptions(prev => ({ ...prev, quality: e.target.value }))}
                    className="w-full p-1 border rounded text-xs"
                  >
                    <option value="all">All quality</option>
                    <option value="80">Excellent (80+)</option>
                    <option value="60">Good (60+)</option>
                    <option value="40">Fair (40+)</option>
                  </select>
                </div>
              </div>
              
              {/* Notes list */}
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {filteredNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setCurrentNote(note);
                      setMode('create');
                    }}
                    className="w-full text-left p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-sm font-medium truncate">{note.type}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {note.content.substring(0, 50)}...
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-400 mr-1">Quality:</span>
                        <div className="w-8 h-1 bg-gray-200 rounded">
                          <div 
                            className="h-full bg-green-500 rounded"
                            style={{ width: `${note.quality}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main editor area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="flex items-center space-x-2">
              {/* Formatting buttons */}
              <button
                onClick={() => formatText('bold')}
                disabled={!selectedText}
                className="p-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
                title="Bold"
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => formatText('italic')}
                disabled={!selectedText}
                className="p-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
                title="Italic"
              >
                <em>I</em>
              </button>
              <button
                onClick={() => formatText('highlight')}
                disabled={!selectedText}
                className="p-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50"
                title="Highlight"
              >
                🖍️
              </button>
              
              <div className="border-l h-6 mx-2"></div>
              
              {/* Quick insert buttons */}
              <button
                onClick={() => insertText('\n## ')}
                className="p-1 text-sm border rounded hover:bg-gray-100"
                title="Add heading"
              >
                H
              </button>
              <button
                onClick={() => insertText('\n- ')}
                className="p-1 text-sm border rounded hover:bg-gray-100"
                title="Add bullet point"
              >
                •
              </button>
              <button
                onClick={() => insertText('\n[ ] ')}
                className="p-1 text-sm border rounded hover:bg-gray-100"
                title="Add checkbox"
              >
                ☑️
              </button>
              
              <div className="border-l h-6 mx-2"></div>
              
              {/* Voice dictation */}
              <button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`p-1 text-sm border rounded transition-colors ${
                  isRecording ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice dictation'}
              >
                {isRecording ? '⏹️' : '🎤'}
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500">
                Quality: {calculateNoteQuality(currentNote.content)}%
              </div>
              
              {/* Export dropdown */}
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      exportNote(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="">Export...</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word</option>
                  <option value="txt">Text</option>
                  <option value="md">Markdown</option>
                </select>
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 p-4">
            <textarea
              ref={editorRef}
              value={currentNote.content}
              onChange={(e) => {
                setCurrentNote(prev => ({ ...prev, content: e.target.value }));
                
                // Schedule auto-save
                if (autosaveTimerRef.current) {
                  clearTimeout(autosaveTimerRef.current);
                }
                autosaveTimerRef.current = setTimeout(autoSaveNote, 2000);
              }}
              onSelect={(e) => {
                const text = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd);
                setSelectedText(text);
                setCursorPosition(e.target.selectionStart);
              }}
              onFocus={() => setEditorFocused(true)}
              onBlur={() => setEditorFocused(false)}
              className="w-full h-full border-none outline-none resize-none text-sm leading-relaxed"
              placeholder={activeTemplate 
                ? "Start typing your notes using the template structure above..."
                : "Start typing your call notes here... Use ## for headings, - for lists, and [ ] for checkboxes."
              }
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 border-t bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {currentNote.content.split(/\s+/).filter(word => word.length > 0).length} words
              </div>
              
              {/* Tags input */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Tags:</span>
                <input
                  type="text"
                  placeholder="Add tags..."
                  className="text-sm border rounded px-2 py-1 w-32"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const newTag = e.target.value.trim();
                      if (!currentNote.tags.includes(newTag)) {
                        setCurrentNote(prev => ({
                          ...prev,
                          tags: [...prev.tags, newTag]
                        }));
                      }
                      e.target.value = '';
                    }
                  }}
                />
              </div>
              
              {/* Display tags */}
              <div className="flex flex-wrap gap-1">
                {currentNote.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200"
                    onClick={() => {
                      setCurrentNote(prev => ({
                        ...prev,
                        tags: prev.tags.filter(t => t !== tag)
                      }));
                    }}
                  >
                    {tag} ×
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={currentNote.followUpRequired}
                  onChange={(e) => setCurrentNote(prev => ({ 
                    ...prev, 
                    followUpRequired: e.target.checked 
                  }))}
                  className="mr-1"
                />
                Follow-up required
              </label>
              
              {currentNote.followUpRequired && (
                <input
                  type="date"
                  value={currentNote.followUpDate}
                  onChange={(e) => setCurrentNote(prev => ({ 
                    ...prev, 
                    followUpDate: e.target.value 
                  }))}
                  className="text-sm border rounded px-2 py-1"
                />
              )}
              
              <button
                onClick={saveNote}
                disabled={isLoading || !currentNote.content.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '⏳ Saving...' : '💾 Save Note'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="border-t p-4 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-700 mb-3">📊 Note Analytics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {calculateNoteQuality(currentNote.content)}%
              </div>
              <div className="text-sm text-gray-600">Quality Score</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {currentNote.content.split(/\s+/).filter(w => w.length > 0).length}
              </div>
              <div className="text-sm text-gray-600">Word Count</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {currentNote.tags.length}
              </div>
              <div className="text-sm text-gray-600">Tags</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(currentNote.content.length / 5)}s
              </div>
              <div className="text-sm text-gray-600">Read Time</div>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Panel */}
      {showCollaboration && (
        <div className="border-t p-4 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-700 mb-3">👥 Collaboration</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Online:</span>
              <div className="flex -space-x-2">
                {onlineCollaborators.slice(0, 5).map(collaborator => (
                  <div
                    key={collaborator.id}
                    className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                    title={collaborator.name}
                  >
                    {collaborator.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {onlineCollaborators.length > 5 && (
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                    +{onlineCollaborators.length - 5}
                  </div>
                )}
              </div>
            </div>
            
            <button className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
              📧 Share Note
            </button>
            
            <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
              💬 Add Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteTakingSystem;