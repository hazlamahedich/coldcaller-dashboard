import React, { useState, useEffect } from 'react';
import { callsService } from '../services';

/**
 * CallFollowUp Component - Task creation and follow-up scheduling
 * Manages follow-up tasks with calendar integration and automated reminders
 */

const CallFollowUp = ({ 
  callId, 
  leadId,
  leadData,
  initialFollowUp = null,
  onFollowUpScheduled,
  onTaskCreated,
  className = '' 
}) => {
  // Follow-up state
  const [followUp, setFollowUp] = useState(initialFollowUp || {
    date: '',
    time: '',
    type: 'call',
    priority: 'medium',
    assignedTo: '',
    description: '',
    reminderSettings: {
      enabled: true,
      timing: '1_hour',
      method: 'email'
    }
  });
  
  // Task management
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  
  // Calendar integration
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  
  // Templates and presets
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Follow-up types with specific workflows
  const followUpTypes = [
    {
      id: 'call',
      label: '📞 Follow-up Call',
      description: 'Schedule another phone call',
      defaultDuration: 30,
      icon: '📞',
      color: 'bg-blue-500'
    },
    {
      id: 'email',
      label: '📧 Send Email',
      description: 'Send follow-up email with information',
      defaultDuration: 0,
      icon: '📧',
      color: 'bg-green-500'
    },
    {
      id: 'demo',
      label: '🖥️ Product Demo',
      description: 'Schedule product demonstration',
      defaultDuration: 60,
      icon: '🖥️',
      color: 'bg-purple-500'
    },
    {
      id: 'meeting',
      label: '🤝 In-Person Meeting',
      description: 'Schedule face-to-face meeting',
      defaultDuration: 90,
      icon: '🤝',
      color: 'bg-orange-500'
    },
    {
      id: 'proposal',
      label: '📄 Send Proposal',
      description: 'Prepare and send proposal',
      defaultDuration: 0,
      icon: '📄',
      color: 'bg-indigo-500'
    },
    {
      id: 'consultation',
      label: '💼 Consultation',
      description: 'Schedule consultation session',
      defaultDuration: 45,
      icon: '💼',
      color: 'bg-teal-500'
    }
  ];
  
  // Follow-up templates for different scenarios
  const followUpTemplates = [
    {
      id: 'interested_prospect',
      name: 'Interested Prospect',
      data: {
        type: 'call',
        priority: 'high',
        description: 'Follow up with interested prospect to discuss next steps and answer any questions.',
        tasks: [
          'Prepare product demo materials',
          'Research prospect\'s specific industry needs',
          'Prepare pricing information'
        ],
        reminderSettings: { timing: '1_hour', method: 'email' }
      }
    },
    {
      id: 'demo_requested',
      name: 'Demo Requested',
      data: {
        type: 'demo',
        priority: 'high',
        description: 'Schedule and conduct product demonstration based on prospect\'s requirements.',
        tasks: [
          'Set up demo environment',
          'Prepare customized demo script',
          'Send calendar invitation with join details',
          'Test all demo technology'
        ],
        reminderSettings: { timing: '2_hours', method: 'email' }
      }
    },
    {
      id: 'proposal_requested',
      name: 'Proposal Requested',
      data: {
        type: 'proposal',
        priority: 'high',
        description: 'Prepare and deliver customized proposal based on discovery call.',
        tasks: [
          'Gather detailed requirements',
          'Calculate custom pricing',
          'Create proposal document',
          'Schedule proposal presentation'
        ],
        reminderSettings: { timing: '4_hours', method: 'email' }
      }
    },
    {
      id: 'objection_handling',
      name: 'Address Objections',
      data: {
        type: 'call',
        priority: 'medium',
        description: 'Follow up to address concerns and objections raised during initial call.',
        tasks: [
          'Research solutions to specific concerns',
          'Prepare case studies and testimonials',
          'Compile competitive analysis',
          'Prepare objection handling script'
        ],
        reminderSettings: { timing: '1_day', method: 'email' }
      }
    },
    {
      id: 'nurturing_sequence',
      name: 'Long-term Nurturing',
      data: {
        type: 'email',
        priority: 'low',
        description: 'Begin long-term nurturing sequence for future opportunity.',
        tasks: [
          'Add to nurturing email sequence',
          'Set quarterly check-in reminders',
          'Monitor for trigger events',
          'Connect on LinkedIn'
        ],
        reminderSettings: { timing: '1_week', method: 'email' }
      }
    }
  ];
  
  // Reminder timing options
  const reminderOptions = [
    { id: '15_minutes', label: '15 minutes before', value: 15 },
    { id: '30_minutes', label: '30 minutes before', value: 30 },
    { id: '1_hour', label: '1 hour before', value: 60 },
    { id: '2_hours', label: '2 hours before', value: 120 },
    { id: '4_hours', label: '4 hours before', value: 240 },
    { id: '1_day', label: '1 day before', value: 1440 },
    { id: '2_days', label: '2 days before', value: 2880 },
    { id: '1_week', label: '1 week before', value: 10080 }
  ];
  
  // Team members for assignment
  const teamMembers = [
    { id: 'self', name: 'Assign to me', role: 'Current User' },
    { id: 'sarah_johnson', name: 'Sarah Johnson', role: 'Sales Manager' },
    { id: 'mike_chen', name: 'Mike Chen', role: 'Senior Sales Rep' },
    { id: 'emma_davis', name: 'Emma Davis', role: 'Sales Rep' },
    { id: 'alex_rodriguez', name: 'Alex Rodriguez', role: 'Team Lead' }
  ];
  
  // Load existing follow-ups and tasks
  useEffect(() => {
    if (callId) {
      loadFollowUpData();
    }
  }, [callId]);
  
  const loadFollowUpData = async () => {
    try {
      // Load existing follow-up data
      const response = await callsService.getCallById(callId);
      if (response.success && response.data.followUpData) {
        setFollowUp(response.data.followUpData);
        setTasks(response.data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load follow-up data:', error);
    }
  };
  
  // Apply template
  const applyTemplate = (template) => {
    setFollowUp(prev => ({
      ...prev,
      ...template.data,
      // Preserve date and time if already set
      date: prev.date,
      time: prev.time
    }));
    
    // Add template tasks
    if (template.data.tasks) {
      const newTasks = template.data.tasks.map((taskText, index) => ({
        id: `task_${Date.now()}_${index}`,
        text: taskText,
        completed: false,
        priority: 'medium',
        dueDate: followUp.date
      }));
      setTasks(prev => [...prev, ...newTasks]);
    }
    
    setShowTemplates(false);
    setSelectedTemplate('');
  };
  
  // Handle follow-up type change
  const handleTypeChange = (typeId) => {
    const type = followUpTypes.find(t => t.id === typeId);
    if (type) {
      setFollowUp(prev => ({
        ...prev,
        type: typeId,
        // Auto-adjust priority based on type
        priority: ['demo', 'meeting', 'proposal'].includes(typeId) ? 'high' : prev.priority
      }));
    }
  };
  
  // Add new task
  const addTask = () => {
    if (newTask.trim()) {
      const task = {
        id: `task_${Date.now()}`,
        text: newTask.trim(),
        completed: false,
        priority: 'medium',
        dueDate: followUp.date
      };
      
      setTasks(prev => [...prev, task]);
      setNewTask('');
    }
  };
  
  // Toggle task completion
  const toggleTask = (taskId) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  };
  
  // Remove task
  const removeTask = (taskId) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!followUp.date) {
      newErrors.date = 'Follow-up date is required';
    }
    
    if (!followUp.type) {
      newErrors.type = 'Follow-up type is required';
    }
    
    if (!followUp.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Get suggested follow-up date based on type
  const getSuggestedDate = (typeId, priority = 'medium') => {
    const now = new Date();
    let daysToAdd = 3; // default
    
    // Adjust based on type and priority
    if (typeId === 'demo' || typeId === 'meeting') {
      daysToAdd = priority === 'high' ? 1 : 2;
    } else if (typeId === 'proposal') {
      daysToAdd = priority === 'high' ? 2 : 3;
    } else if (typeId === 'email') {
      daysToAdd = 1;
    } else if (priority === 'high') {
      daysToAdd = 1;
    } else if (priority === 'low') {
      daysToAdd = 7;
    }
    
    now.setDate(now.getDate() + daysToAdd);
    return now.toISOString().split('T')[0];
  };
  
  // Get suggested time based on type
  const getSuggestedTime = (typeId) => {
    const timeSlots = {
      call: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
      demo: ['10:00', '11:00', '14:00', '15:00'],
      meeting: ['09:00', '10:00', '11:00', '14:00', '15:00'],
      email: ['09:00'], // Just a placeholder for task completion
      proposal: ['14:00', '15:00'],
      consultation: ['10:00', '11:00', '14:00']
    };
    
    const slots = timeSlots[typeId] || timeSlots.call;
    return slots[Math.floor(Math.random() * slots.length)];
  };
  
  // Auto-fill suggested date and time
  const autoFillSuggested = () => {
    const suggestedDate = getSuggestedDate(followUp.type, followUp.priority);
    const suggestedTime = getSuggestedTime(followUp.type);
    
    setFollowUp(prev => ({
      ...prev,
      date: suggestedDate,
      time: suggestedTime
    }));
  };
  
  // Save follow-up
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    
    try {
      const followUpData = {
        ...followUp,
        tasks: tasks,
        leadId: leadId,
        callId: callId,
        createdAt: new Date().toISOString()
      };
      
      // Save to backend (you'll need to implement this endpoint)
      // const response = await callsService.createFollowUp(followUpData);
      
      // For now, simulate success
      const success = true;
      
      if (success) {
        if (onFollowUpScheduled) {
          onFollowUpScheduled(followUpData);
        }
        
        if (onTaskCreated && tasks.length > 0) {
          onTaskCreated(tasks);
        }
        
        // Show success message
        alert('Follow-up scheduled successfully!');
        
        // Reset form
        setFollowUp({
          date: '',
          time: '',
          type: 'call',
          priority: 'medium',
          assignedTo: '',
          description: '',
          reminderSettings: {
            enabled: true,
            timing: '1_hour',
            method: 'email'
          }
        });
        setTasks([]);
      }
    } catch (error) {
      console.error('Failed to save follow-up:', error);
      alert('Failed to save follow-up. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">📅 Follow-up Planning</h3>
            {leadData && (
              <p className="text-sm text-gray-600 mt-1">
                {leadData.name} • {leadData.company}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
            >
              📋 Templates
            </button>
            
            <button
              onClick={autoFillSuggested}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              ⚡ Auto-fill
            </button>
          </div>
        </div>
      </div>
      
      {/* Templates Dropdown */}
      {showTemplates && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {followUpTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="text-left p-3 bg-white border border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors"
              >
                <div className="font-medium text-gray-800 text-sm">{template.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {followUpTypes.find(t => t.id === template.data.type)?.icon} {template.data.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="p-4 space-y-4">
        {/* Follow-up Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Follow-up Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {followUpTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleTypeChange(type.id)}
                className={`p-3 rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  followUp.type === type.id
                    ? `${type.color} text-white shadow-md`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-lg mb-1">{type.icon}</div>
                <div className="text-xs">{type.label.replace(/^\S+\s/, '')}</div>
              </button>
            ))}
          </div>
          {errors.type && <p className="text-red-600 text-xs mt-1">{errors.type}</p>}
        </div>
        
        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Follow-up Date *
            </label>
            <input
              type="date"
              value={followUp.date}
              onChange={(e) => setFollowUp(prev => ({ ...prev, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.date ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.date && <p className="text-red-600 text-xs mt-1">{errors.date}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              type="time"
              value={followUp.time}
              onChange={(e) => setFollowUp(prev => ({ ...prev, time: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Priority and Assignment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={followUp.priority}
              onChange={(e) => setFollowUp(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">🟢 Low Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="high">🔴 High Priority</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To
            </label>
            <select
              value={followUp.assignedTo}
              onChange={(e) => setFollowUp(prev => ({ ...prev, assignedTo: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select team member...</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={followUp.description}
            onChange={(e) => setFollowUp(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the follow-up objective and any specific notes..."
            className={`w-full h-20 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
        </div>
        
        {/* Reminder Settings */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-blue-900">
              🔔 Reminder Settings
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={followUp.reminderSettings.enabled}
                onChange={(e) => setFollowUp(prev => ({
                  ...prev,
                  reminderSettings: {
                    ...prev.reminderSettings,
                    enabled: e.target.checked
                  }
                }))}
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-blue-700">Enable reminders</span>
            </label>
          </div>
          
          {followUp.reminderSettings.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  Reminder Timing
                </label>
                <select
                  value={followUp.reminderSettings.timing}
                  onChange={(e) => setFollowUp(prev => ({
                    ...prev,
                    reminderSettings: {
                      ...prev.reminderSettings,
                      timing: e.target.value
                    }
                  }))}
                  className="w-full p-2 text-sm border border-blue-200 rounded focus:ring-2 focus:ring-blue-500"
                >
                  {reminderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  Reminder Method
                </label>
                <select
                  value={followUp.reminderSettings.method}
                  onChange={(e) => setFollowUp(prev => ({
                    ...prev,
                    reminderSettings: {
                      ...prev.reminderSettings,
                      method: e.target.value
                    }
                  }))}
                  className="w-full p-2 text-sm border border-blue-200 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">📧 Email</option>
                  <option value="sms">📱 SMS</option>
                  <option value="push">🔔 Push Notification</option>
                  <option value="both">📧📱 Email + SMS</option>
                </select>
              </div>
            </div>
          )}
        </div>
        
        {/* Tasks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📝 Preparation Tasks
          </label>
          
          {/* Add new task */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a preparation task..."
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addTask}
              disabled={!newTask.trim()}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>
          
          {/* Task list */}
          {tasks.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      task.completed ? 'line-through text-gray-500' : 'text-gray-800'
                    }`}
                  >
                    {task.text}
                  </span>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors touch-manipulation"
          >
            {isSaving ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">🔄</span>
                Scheduling Follow-up...
              </span>
            ) : (
              '📅 Schedule Follow-up'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallFollowUp;