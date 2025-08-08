import React, { useState, useEffect, useRef } from 'react';
import { callsService } from '../services';

/**
 * CallLogger Component - Real-time note-taking during active calls
 * Mobile-first design with voice-to-text integration and quick actions
 */

const CallLogger = ({ 
  leadId, 
  leadData, 
  isCallActive = false, 
  onCallLogged,
  onSaveTemporary,
  className = '' 
}) => {
  // Call logging state
  const [callData, setCallData] = useState({
    outcome: '',
    duration: '00:00',
    notes: '',
    scheduledFollowup: '',
    priority: 'medium',
    tags: []
  });
  
  // UI state
  const [isLogging, setIsLogging] = useState(false);
  const [tempSaved, setTempSaved] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  // Timer for call duration
  const [startTime, setStartTime] = useState(null);
  const [currentDuration, setCurrentDuration] = useState('00:00');
  const intervalRef = useRef(null);
  const notesRef = useRef(null);
  
  // Voice recognition setup
  const [speechRecognition, setSpeechRecognition] = useState(null);
  
  // Common call outcomes for quick selection
  const outcomes = [
    { id: 'connected', label: '✅ Connected', color: 'bg-green-500', textColor: 'text-white' },
    { id: 'voicemail', label: '📧 Voicemail', color: 'bg-blue-500', textColor: 'text-white' },
    { id: 'no_answer', label: '🔕 No Answer', color: 'bg-yellow-500', textColor: 'text-white' },
    { id: 'busy', label: '📞 Busy', color: 'bg-orange-500', textColor: 'text-white' },
    { id: 'callback', label: '📞 Callback', color: 'bg-purple-500', textColor: 'text-white' },
    { id: 'not_interested', label: '❌ Not Interested', color: 'bg-red-500', textColor: 'text-white' },
    { id: 'appointment', label: '📅 Appointment Set', color: 'bg-emerald-600', textColor: 'text-white' }
  ];
  
  // Note templates for quick insertion
  const noteTemplates = [
    { id: 'intro', label: 'Introduction', content: 'Introduced company and services. ' },
    { id: 'interested', label: 'Interested', content: 'Expressed interest in [PRODUCT/SERVICE]. ' },
    { id: 'pricing', label: 'Pricing Question', content: 'Asked about pricing for [SPECIFIC ITEM]. ' },
    { id: 'followup', label: 'Follow-up', content: 'Requested follow-up call on [DATE]. ' },
    { id: 'decision_maker', label: 'Decision Maker', content: 'Not the decision maker. Need to contact [NAME/ROLE]. ' },
    { id: 'competitor', label: 'Competitor', content: 'Currently using [COMPETITOR]. Contract expires [DATE]. ' },
    { id: 'budget', label: 'Budget', content: 'Budget range: $[AMOUNT]. Decision timeframe: [TIMEFRAME]. ' }
  ];
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setCallData(prev => ({
            ...prev,
            notes: prev.notes + finalTranscript + ' '
          }));
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      setSpeechRecognition(recognition);
    }
  }, []);
  
  // Start call timer when call becomes active
  useEffect(() => {
    if (isCallActive && !startTime) {
      setStartTime(Date.now());
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - Date.now();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setCurrentDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    } else if (!isCallActive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (startTime) {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const finalDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setCallData(prev => ({ ...prev, duration: finalDuration }));
        setCurrentDuration(finalDuration);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCallActive, startTime]);
  
  // Auto-save temporary notes every 30 seconds
  useEffect(() => {
    if (callData.notes.trim() && onSaveTemporary) {
      const timeout = setTimeout(() => {
        onSaveTemporary(callData);
        setTempSaved(true);
        setTimeout(() => setTempSaved(false), 2000);
      }, 30000);
      
      return () => clearTimeout(timeout);
    }
  }, [callData.notes, onSaveTemporary]);
  
  // Handle outcome selection
  const handleOutcomeSelect = (outcomeId) => {
    const outcome = outcomes.find(o => o.id === outcomeId);
    setCallData(prev => ({
      ...prev,
      outcome: outcome.label.replace(/[^\w\s]/gi, '').trim()
    }));
  };
  
  // Handle template insertion
  const insertTemplate = (templateId) => {
    const template = noteTemplates.find(t => t.id === templateId);
    if (template && notesRef.current) {
      const textarea = notesRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newNotes = callData.notes.substring(0, start) + template.content + callData.notes.substring(end);
      
      setCallData(prev => ({ ...prev, notes: newNotes }));
      
      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + template.content.length, start + template.content.length);
      }, 0);
    }
  };
  
  // Toggle voice recognition
  const toggleVoiceRecognition = () => {
    if (!speechRecognition) {
      alert('Voice recognition not supported in this browser');
      return;
    }
    
    if (isListening) {
      speechRecognition.stop();
      setIsListening(false);
    } else {
      speechRecognition.start();
      setIsListening(true);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!callData.outcome.trim()) {
      alert('Please select a call outcome');
      return;
    }
    
    setIsLogging(true);
    
    try {
      const logData = {
        leadId,
        phone: leadData?.phone || '',
        outcome: callData.outcome,
        duration: isCallActive ? currentDuration : callData.duration,
        notes: callData.notes.trim(),
        scheduledFollowup: callData.scheduledFollowup || null,
        priority: callData.priority,
        tags: callData.tags
      };
      
      const result = await callsService.logCall(logData);
      
      if (result.success) {
        // Reset form
        setCallData({
          outcome: '',
          duration: '00:00',
          notes: '',
          scheduledFollowup: '',
          priority: 'medium',
          tags: []
        });
        setStartTime(null);
        setCurrentDuration('00:00');
        
        if (onCallLogged) {
          onCallLogged(result.data);
        }
        
        // Show success feedback
        alert('Call logged successfully!');
      } else {
        alert(result.message || 'Failed to log call');
      }
    } catch (error) {
      console.error('Failed to log call:', error);
      alert('Failed to log call. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };
  
  // Handle quick save (temporary)
  const handleQuickSave = () => {
    if (onSaveTemporary) {
      onSaveTemporary(callData);
      setTempSaved(true);
      setTimeout(() => setTempSaved(false), 2000);
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          📝 Call Logger
          {isCallActive && <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full">Live Call</span>}
        </h3>
        <div className="flex items-center gap-2">
          {tempSaved && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              ✅ Auto-saved
            </span>
          )}
          <div className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
            ⏱️ {isCallActive ? currentDuration : callData.duration}
          </div>
        </div>
      </div>
      
      {/* Lead Context */}
      {leadData && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-900">{leadData.name}</div>
          <div className="text-xs text-blue-700">{leadData.phone} • {leadData.company}</div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Outcome Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Call Outcome</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {outcomes.map((outcome) => (
              <button
                key={outcome.id}
                type="button"
                onClick={() => handleOutcomeSelect(outcome.id)}
                className={`p-2 rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  callData.outcome === outcome.label.replace(/[^\w\s]/gi, '').trim()
                    ? `${outcome.color} ${outcome.textColor} shadow-md`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {outcome.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Notes with Templates and Voice Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Call Notes</label>
            <div className="flex items-center gap-2">
              {/* Template Dropdown */}
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  if (e.target.value) {
                    insertTemplate(e.target.value);
                    setSelectedTemplate('');
                  }
                }}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="">Insert Template...</option>
                {noteTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
              
              {/* Voice Input Button */}
              {speechRecognition && (
                <button
                  type="button"
                  onClick={toggleVoiceRecognition}
                  className={`p-2 rounded-lg text-sm transition-all touch-manipulation ${
                    isListening
                      ? 'bg-red-100 text-red-700 shadow-md animate-pulse'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                  title={isListening ? 'Stop voice input' : 'Start voice input'}
                >
                  {isListening ? '🛑' : '🎤'}
                </button>
              )}
            </div>
          </div>
          
          <textarea
            ref={notesRef}
            value={callData.notes}
            onChange={(e) => setCallData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Enter call notes... Use templates or voice input for faster logging."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
            <span>{callData.notes.length} characters</span>
            {isListening && (
              <span className="text-red-600 animate-pulse">🎤 Listening...</span>
            )}
          </div>
        </div>
        
        {/* Follow-up Scheduling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
            <input
              type="date"
              value={callData.scheduledFollowup}
              onChange={(e) => setCallData(prev => ({ ...prev, scheduledFollowup: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={callData.priority}
              onChange={(e) => setCallData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">🟢 Low Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="high">🔴 High Priority</option>
            </select>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={handleQuickSave}
            disabled={!callData.notes.trim()}
            className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
          >
            💾 Quick Save
          </button>
          
          <button
            type="submit"
            disabled={isLogging || !callData.outcome.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
          >
            {isLogging ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">🔄</span>
                Logging Call...
              </span>
            ) : (
              '📞 Log Call'
            )}
          </button>
        </div>
        
        {/* Mobile-specific quick actions */}
        <div className="md:hidden grid grid-cols-3 gap-2 mt-4">
          <button
            type="button"
            onClick={() => handleOutcomeSelect('connected')}
            className="bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium"
          >
            ✅ Connected
          </button>
          <button
            type="button"
            onClick={() => handleOutcomeSelect('voicemail')}
            className="bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium"
          >
            📧 Voicemail
          </button>
          <button
            type="button"
            onClick={() => handleOutcomeSelect('callback')}
            className="bg-purple-500 text-white py-2 px-3 rounded-lg text-sm font-medium"
          >
            📞 Callback
          </button>
        </div>
      </form>
    </div>
  );
};

export default CallLogger;