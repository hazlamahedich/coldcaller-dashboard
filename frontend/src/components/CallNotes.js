import React, { useState, useEffect, useRef } from 'react';
import { callsService } from '../services';

/**
 * CallNotes Component - Rich text editor with templates and collaborative features
 * Advanced note-taking with real-time collaboration and structured templates
 */

const CallNotes = ({ 
  callId, 
  initialNotes = '', 
  readOnly = false,
  onNotesChange,
  showCollaboration = true,
  leadData = null,
  className = '' 
}) => {
  // Notes state
  const [notes, setNotes] = useState(initialNotes);
  const [formattedNotes, setFormattedNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Templates and formatting
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Collaboration
  const [collaborators, setCollaborators] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  
  // Auto-save
  const [autoSaving, setAutoSaving] = useState(false);
  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  
  // Structured note templates
  const templates = [
    {
      id: 'discovery_call',
      name: 'Discovery Call',
      structure: [
        '## Call Summary\n\n',
        '**Outcome:** [Connected/Voicemail/No Answer]\n',
        '**Duration:** [MM:SS]\n',
        '**Next Action:** [Follow-up/Appointment/No further action]\n\n',
        '## Key Points\n\n',
        '### Current Situation\n',
        '- \n\n',
        '### Pain Points\n',
        '- \n\n',
        '### Budget & Timeline\n',
        '- Budget: $\n',
        '- Timeline: \n\n',
        '### Decision Process\n',
        '- Decision maker: \n',
        '- Others involved: \n\n',
        '## Follow-up Actions\n',
        '- [ ] \n'
      ].join('')
    },
    {
      id: 'followup_call',
      name: 'Follow-up Call',
      structure: [
        '## Follow-up Call Summary\n\n',
        '**Previous call:** [Date]\n',
        '**Status update:** [Progress since last call]\n',
        '**Outcome:** [Connected/Voicemail/No Answer]\n\n',
        '## Discussion Points\n\n',
        '### Updates Since Last Call\n',
        '- \n\n',
        '### New Requirements\n',
        '- \n\n',
        '### Concerns Addressed\n',
        '- \n\n',
        '## Next Steps\n',
        '- [ ] \n'
      ].join('')
    },
    {
      id: 'appointment_set',
      name: 'Appointment Scheduled',
      structure: [
        '## Appointment Scheduled ✅\n\n',
        '**Date:** [Date]\n',
        '**Time:** [Time]\n',
        '**Type:** [Demo/Consultation/Presentation]\n',
        '**Attendees:** [Names and roles]\n\n',
        '## Meeting Preparation\n\n',
        '### Agenda Items\n',
        '- \n\n',
        '### Materials Needed\n',
        '- [ ] \n\n',
        '### Key Objectives\n',
        '- \n\n',
        '## Contact Expectations\n',
        '- \n'
      ].join('')
    },
    {
      id: 'objection_handling',
      name: 'Objection Handling',
      structure: [
        '## Objections & Responses\n\n',
        '### Price Concerns\n',
        '**Objection:** \n',
        '**Response:** \n',
        '**Result:** \n\n',
        '### Feature/Capability Questions\n',
        '**Question:** \n',
        '**Answer:** \n',
        '**Follow-up needed:** \n\n',
        '### Competitive Concerns\n',
        '**Current solution:** \n',
        '**Our advantages:** \n',
        '**Differentiation points:** \n\n',
        '## Resolution Status\n',
        '- [ ] Objection resolved\n',
        '- [ ] Need more information\n',
        '- [ ] Schedule follow-up\n'
      ].join('')
    }
  ];
  
  // Formatting options
  const formatOptions = [
    { id: 'bold', label: 'Bold', symbol: '**', shortcut: 'Ctrl+B' },
    { id: 'italic', label: 'Italic', symbol: '*', shortcut: 'Ctrl+I' },
    { id: 'heading', label: 'Heading', symbol: '## ', shortcut: 'Ctrl+H' },
    { id: 'bullet', label: 'Bullet', symbol: '- ', shortcut: 'Ctrl+L' },
    { id: 'checkbox', label: 'Checkbox', symbol: '- [ ] ', shortcut: 'Ctrl+K' },
    { id: 'quote', label: 'Quote', symbol: '> ', shortcut: 'Ctrl+Q' }
  ];
  
  // Team members for mentions
  const teamMembers = [
    { id: 1, name: 'Sarah Johnson', role: 'Sales Manager', avatar: '👩‍💼' },
    { id: 2, name: 'Mike Chen', role: 'Senior Rep', avatar: '👨‍💻' },
    { id: 3, name: 'Emma Davis', role: 'Sales Rep', avatar: '👩‍💻' },
    { id: 4, name: 'Alex Rodriguez', role: 'Team Lead', avatar: '👨‍💼' }
  ];
  
  // Auto-save functionality
  useEffect(() => {
    if (isDirty && notes.trim() && !readOnly) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        autoSaveNotes();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, isDirty]);
  
  // Handle notes change
  const handleNotesChange = (value) => {
    setNotes(value);
    setIsDirty(true);
    
    // Check for mentions
    const mentionMatches = value.match(/@\w+/g);
    if (mentionMatches) {
      setShowMentions(true);
    }
    
    if (onNotesChange) {
      onNotesChange(value);
    }
  };
  
  // Auto-save notes
  const autoSaveNotes = async () => {
    if (!callId || readOnly) return;
    
    setAutoSaving(true);
    
    try {
      await callsService.updateCall(callId, { notes });
      setIsDirty(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to auto-save notes:', error);
    } finally {
      setAutoSaving(false);
    }
  };
  
  // Insert template
  const insertTemplate = (template) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newNotes = notes.substring(0, start) + template.structure + notes.substring(end);
      handleNotesChange(newNotes);
      
      // Focus and position cursor
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + template.structure.length, start + template.structure.length);
      }, 0);
    }
    
    setShowTemplates(false);
  };
  
  // Apply formatting
  const applyFormatting = (format) => {
    if (!textareaRef.current || readOnly) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    
    let formattedText = '';
    
    switch (format.id) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'heading':
        formattedText = `## ${selectedText}`;
        break;
      case 'bullet':
        formattedText = `- ${selectedText}`;
        break;
      case 'checkbox':
        formattedText = `- [ ] ${selectedText}`;
        break;
      case 'quote':
        formattedText = `> ${selectedText}`;
        break;
      default:
        formattedText = selectedText;
    }
    
    const newNotes = notes.substring(0, start) + formattedText + notes.substring(end);
    handleNotesChange(newNotes);
    
    // Update selection
    setTimeout(() => {
      textarea.focus();
      const newEnd = start + formattedText.length;
      textarea.setSelectionRange(newEnd, newEnd);
    }, 0);
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          applyFormatting(formatOptions.find(f => f.id === 'bold'));
          break;
        case 'i':
          e.preventDefault();
          applyFormatting(formatOptions.find(f => f.id === 'italic'));
          break;
        case 'h':
          e.preventDefault();
          applyFormatting(formatOptions.find(f => f.id === 'heading'));
          break;
        case 'l':
          e.preventDefault();
          applyFormatting(formatOptions.find(f => f.id === 'bullet'));
          break;
        case 'k':
          e.preventDefault();
          applyFormatting(formatOptions.find(f => f.id === 'checkbox'));
          break;
        case 's':
          e.preventDefault();
          if (!readOnly) {
            autoSaveNotes();
          }
          break;
      }
    }
    
    // Handle @ mentions
    if (e.key === '@' && showCollaboration) {
      setShowMentions(true);
    }
  };
  
  // Insert mention
  const insertMention = (member) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const beforeCursor = notes.substring(0, start);
    const afterCursor = notes.substring(start);
    
    // Find the last @ symbol
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newNotes = beforeCursor.substring(0, lastAtIndex) + `@${member.name} ` + afterCursor;
      handleNotesChange(newNotes);
      
      setTimeout(() => {
        textarea.focus();
        const newPosition = lastAtIndex + member.name.length + 2;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
    
    setShowMentions(false);
  };
  
  // Render markdown preview
  const renderPreview = () => {
    let html = notes
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^- \[ \] (.*$)/gim, '<input type="checkbox" disabled> $1<br>')
      .replace(/^- \[x\] (.*$)/gim, '<input type="checkbox" checked disabled> $1<br>')
      .replace(/^- (.*$)/gim, '• $1<br>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\n/g, '<br>');
    
    return { __html: html };
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800">📝 Call Notes</h3>
          {leadData && (
            <span className="text-sm text-gray-600">
              {leadData.name} • {leadData.company}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {autoSaving && (
            <span className="flex items-center text-blue-600">
              <span className="animate-spin mr-1">🔄</span>
              Saving...
            </span>
          )}
          {lastSaved && !autoSaving && (
            <span>
              Saved {new Date(lastSaved).toLocaleTimeString()}
            </span>
          )}
          {isDirty && !autoSaving && (
            <span className="text-orange-600">Unsaved changes</span>
          )}
        </div>
      </div>
      
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
          {/* Templates */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              📋 Templates
            </button>
            
            {showTemplates && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => insertTemplate(template)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Formatting */}
          <div className="flex items-center gap-1">
            {formatOptions.slice(0, 3).map((format) => (
              <button
                key={format.id}
                onClick={() => applyFormatting(format)}
                className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
                title={`${format.label} (${format.shortcut})`}
              >
                {format.symbol}
              </button>
            ))}
          </div>
          
          {/* More formatting options */}
          <div className="relative">
            <button
              onClick={() => setShowFormatting(!showFormatting)}
              className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
            >
              ⋯
            </button>
            
            {showFormatting && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {formatOptions.slice(3).map((format) => (
                  <button
                    key={format.id}
                    onClick={() => applyFormatting(format)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>{format.label}</span>
                    <span className="text-xs text-gray-400">{format.shortcut}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Collaboration */}
          {showCollaboration && (
            <button
              onClick={() => setShowMentions(!showMentions)}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
            >
              @️ Mention
            </button>
          )}
        </div>
      )}
      
      {/* Notes Editor */}
      <div className="relative">
        {!isEditing && notes.trim() ? (
          /* Preview Mode */
          <div 
            className="p-4 prose prose-sm max-w-none cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => !readOnly && setIsEditing(true)}
            dangerouslySetInnerHTML={renderPreview()}
          />
        ) : (
          /* Edit Mode */
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setIsEditing(false)}
              placeholder={readOnly ? "No notes available" : "Start typing your call notes...\n\nTips:\n- Use **bold** and *italic* formatting\n- Create checklists with - [ ]\n- Mention teammates with @name\n- Use templates for structured notes"}
              className="w-full h-64 p-4 border-0 resize-none focus:outline-none"
              readOnly={readOnly}
              autoFocus={isEditing}
            />
            
            {/* Mentions dropdown */}
            {showMentions && !readOnly && (
              <div className="absolute bottom-4 left-4 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2 border-b border-gray-200 text-sm font-medium text-gray-700">
                  Team Members
                </div>
                {teamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => insertMention(member)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="text-lg">{member.avatar}</span>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Character count and tips */}
        <div className="flex justify-between items-center px-4 py-2 bg-gray-50 text-xs text-gray-500">
          <span>{notes.length} characters</span>
          {!readOnly && (
            <span>
              💡 Press Ctrl+S to save manually • Click outside to preview
            </span>
          )}
        </div>
      </div>
      
      {/* Collaboration sidebar (if active) */}
      {showCollaboration && collaborators.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Active Collaborators</div>
          <div className="flex items-center gap-2">
            {collaborators.map((collaborator) => (
              <div 
                key={collaborator.id}
                className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full"
              >
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {collaborator.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CallNotes;