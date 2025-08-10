import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { leadsService } from '../services';

/**
 * MeetingScheduleModal - Comprehensive meeting scheduling modal
 * Features: Calendar integration, availability checking, reminders, timezone handling
 */
const MeetingScheduleModal = ({ 
  lead, 
  isOpen, 
  onClose, 
  onMeetingScheduled 
}) => {
  const { isDarkMode, themeClasses } = useTheme();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: '30',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: '',
    meetingType: 'in-person', // in-person, video, phone
    attendees: [],
    reminders: [
      { method: 'email', minutes: 60 },
      { method: 'popup', minutes: 15 }
    ],
    calendarProvider: 'google' // google, outlook, apple
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);
  const [calendarIntegrations, setCalendarIntegrations] = useState([]);
  const [showAvailability, setShowAvailability] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && lead) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // Default to 10 AM tomorrow

      setFormData(prev => ({
        ...prev,
        title: `Follow-up with ${lead.name}`,
        description: `Follow-up meeting with ${lead.name} from ${lead.company || 'their company'}`,
        date: tomorrow.toISOString().split('T')[0],
        time: '10:00',
        attendees: lead.email ? [{ email: lead.email, name: lead.name }] : []
      }));

      // Load user's calendar integrations
      loadCalendarIntegrations();
    }
  }, [isOpen, lead]);

  // Load user's calendar integrations
  const loadCalendarIntegrations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/integrations/calendar', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalendarIntegrations(data.integrations || []);
        
        // Set default provider if available
        if (data.integrations?.length > 0) {
          setFormData(prev => ({
            ...prev,
            calendarProvider: data.integrations[0].provider
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load calendar integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check availability for selected date/time
  const checkAvailability = async () => {
    if (!formData.date || !formData.time) {
      setErrors({ general: 'Please select a date and time first' });
      return;
    }

    try {
      setIsLoading(true);
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days

      const response = await fetch('/api/calendar/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          duration: parseInt(formData.duration),
          provider: formData.calendarProvider
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);
        setShowAvailability(true);
      } else {
        setErrors({ general: 'Failed to check availability' });
      }
    } catch (error) {
      console.error('Failed to check availability:', error);
      setErrors({ general: 'Failed to check availability' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Add attendee
  const addAttendee = (email, name = '') => {
    if (email && !formData.attendees.find(a => a.email === email)) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, { email, name }]
      }));
    }
  };

  // Remove attendee
  const removeAttendee = (email) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a.email !== email)
    }));
  };

  // Select available slot
  const selectSlot = (slot) => {
    const startDate = new Date(slot.start);
    setFormData(prev => ({
      ...prev,
      date: startDate.toISOString().split('T')[0],
      time: startDate.toTimeString().slice(0, 5)
    }));
    setShowAvailability(false);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Meeting title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    // Check if meeting is in the past
    const meetingDateTime = new Date(`${formData.date}T${formData.time}`);
    if (meetingDateTime < new Date()) {
      newErrors.datetime = 'Meeting cannot be scheduled in the past';
    }

    if (!formData.duration || parseInt(formData.duration) < 15) {
      newErrors.duration = 'Duration must be at least 15 minutes';
    }

    if (calendarIntegrations.length === 0) {
      newErrors.calendar = 'Please connect a calendar provider first';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      
      const meetingDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(meetingDateTime.getTime() + parseInt(formData.duration) * 60 * 1000);

      const meetingData = {
        leadId: lead.id,
        title: formData.title,
        description: formData.description,
        startDateTime: meetingDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        timezone: formData.timezone,
        location: formData.location,
        meetingType: formData.meetingType,
        attendees: formData.attendees,
        reminders: formData.reminders,
        calendarProvider: formData.calendarProvider
      };

      // Create meeting in backend
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(meetingData)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update lead timeline
        if (onMeetingScheduled) {
          onMeetingScheduled(data.meeting);
        }

        // Show success message
        alert('Meeting scheduled successfully! Calendar event created and invitations sent.');
        onClose();
      } else {
        const errorData = await response.json();
        setErrors({ general: errorData.message || 'Failed to schedule meeting' });
      }
    } catch (error) {
      console.error('Failed to schedule meeting:', error);
      setErrors({ general: 'Failed to schedule meeting' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${themeClasses.cardBg} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border ${themeClasses.border}`}>
        {/* Header */}
        <div className={`${isDarkMode ? 'bg-green-700' : 'bg-green-600'} text-white p-6 flex justify-between items-center`}>
          <div>
            <h2 className="text-2xl font-bold">Schedule Follow-up Meeting</h2>
            {lead && (
              <p className={`${isDarkMode ? 'text-green-200' : 'text-green-100'} text-sm mt-1`}>
                With {lead.name} • {lead.company}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className={`text-white ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-200'} text-2xl font-bold`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Error message */}
          {errors.general && (
            <div className={`mb-6 p-4 ${isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border rounded-md`}>
              <p className={`${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>{errors.general}</p>
            </div>
          )}

          {/* Calendar Integration Status */}
          {calendarIntegrations.length === 0 && (
            <div className={`mb-6 p-4 ${isDarkMode ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-200'} border rounded-md`}>
              <p className={`${isDarkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                ⚠️ No calendar integrations found. Please connect Google Calendar or Outlook first.
              </p>
              <button 
                className="mt-2 text-blue-600 hover:underline text-sm"
                onClick={() => window.open('/settings/integrations', '_blank')}
              >
                Connect Calendar →
              </button>
            </div>
          )}

          <div className="space-y-6">
            {/* Meeting Details */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Meeting Details</h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Meeting Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${themeClasses.cardBg} ${themeClasses.textPrimary} ${
                      errors.title 
                        ? 'border-red-500' 
                        : isDarkMode ? 'border-gray-600 focus:border-green-500' : 'border-gray-300 focus:border-green-500'
                    } focus:ring-2 focus:ring-green-500/20`}
                    placeholder="Enter meeting title"
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`w-full p-3 border rounded-lg h-20 resize-none ${themeClasses.cardBg} ${themeClasses.textPrimary} ${
                      isDarkMode ? 'border-gray-600 focus:border-green-500' : 'border-gray-300 focus:border-green-500'
                    } focus:ring-2 focus:ring-green-500/20`}
                    placeholder="Add meeting description or agenda..."
                  />
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>Date & Time</h3>
                <button
                  type="button"
                  onClick={checkAvailability}
                  disabled={isLoading || !formData.date}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? '🔄' : '📅'} Check Availability
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full p-3 border rounded-lg ${themeClasses.cardBg} ${themeClasses.textPrimary} ${
                      errors.date 
                        ? 'border-red-500' 
                        : isDarkMode ? 'border-gray-600 focus:border-green-500' : 'border-gray-300 focus:border-green-500'
                    } focus:ring-2 focus:ring-green-500/20`}
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${themeClasses.cardBg} ${themeClasses.textPrimary} ${
                      errors.time 
                        ? 'border-red-500' 
                        : isDarkMode ? 'border-gray-600 focus:border-green-500' : 'border-gray-300 focus:border-green-500'
                    } focus:ring-2 focus:ring-green-500/20`}
                  />
                  {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Duration (minutes) *
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${themeClasses.cardBg} ${themeClasses.textPrimary} ${
                      isDarkMode ? 'border-gray-600 focus:border-green-500' : 'border-gray-300 focus:border-green-500'
                    } focus:ring-2 focus:ring-green-500/20`}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              {errors.datetime && <p className="text-red-500 text-xs mt-1">{errors.datetime}</p>}
            </div>

            {/* Available Slots */}
            {showAvailability && availableSlots.length > 0 && (
              <div>
                <h4 className={`text-md font-medium ${themeClasses.textPrimary} mb-3`}>
                  Suggested Available Times
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {availableSlots.slice(0, 12).map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => selectSlot(slot)}
                      className={`p-2 text-sm border rounded-lg hover:bg-green-50 hover:border-green-300 ${
                        isDarkMode ? 'border-gray-600 hover:bg-green-900/20' : 'border-gray-300'
                      }`}
                    >
                      {new Date(slot.start).toLocaleDateString()} at{' '}
                      {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Meeting Type & Location */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Meeting Format</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Meeting Type
                  </label>
                  <select
                    value={formData.meetingType}
                    onChange={(e) => handleInputChange('meetingType', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${themeClasses.cardBg} ${themeClasses.textPrimary} ${
                      isDarkMode ? 'border-gray-600 focus:border-green-500' : 'border-gray-300 focus:border-green-500'
                    } focus:ring-2 focus:ring-green-500/20`}
                  >
                    <option value="in-person">🏢 In-Person</option>
                    <option value="video">📹 Video Call</option>
                    <option value="phone">📞 Phone Call</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Location / Meeting Link
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${themeClasses.cardBg} ${themeClasses.textPrimary} ${
                      isDarkMode ? 'border-gray-600 focus:border-green-500' : 'border-gray-300 focus:border-green-500'
                    } focus:ring-2 focus:ring-green-500/20`}
                    placeholder={
                      formData.meetingType === 'in-person' ? 'Enter meeting location' :
                      formData.meetingType === 'video' ? 'Video call link (auto-generated)' :
                      'Phone number'
                    }
                  />
                </div>
              </div>
            </div>

            {/* Calendar Provider */}
            {calendarIntegrations.length > 0 && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Calendar Integration</h3>
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-1`}>
                    Calendar Provider
                  </label>
                  <select
                    value={formData.calendarProvider}
                    onChange={(e) => handleInputChange('calendarProvider', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${themeClasses.cardBg} ${themeClasses.textPrimary} ${
                      isDarkMode ? 'border-gray-600 focus:border-green-500' : 'border-gray-300 focus:border-green-500'
                    } focus:ring-2 focus:ring-green-500/20`}
                  >
                    {calendarIntegrations.map((integration) => (
                      <option key={integration.id} value={integration.provider}>
                        {integration.provider === 'google' ? '📅 Google Calendar' :
                         integration.provider === 'outlook' ? '📅 Outlook Calendar' :
                         integration.provider === 'apple' ? '📅 Apple Calendar' :
                         integration.provider}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Attendees */}
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${themeClasses.textPrimary}`}>Attendees</h3>
              <div className="space-y-3">
                {formData.attendees.map((attendee, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${
                    isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
                  }`}>
                    <div>
                      <p className={`font-medium ${themeClasses.textPrimary}`}>
                        {attendee.name || attendee.email}
                      </p>
                      {attendee.name && (
                        <p className={`text-sm ${themeClasses.textSecondary}`}>{attendee.email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeAttendee(attendee.email)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                
                <div className="text-sm text-gray-600">
                  <p>📧 Invitations will be sent automatically to all attendees</p>
                  <p>⏰ Reminders will be set for 1 hour and 15 minutes before the meeting</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t ${themeClasses.border} ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-6 flex justify-between`}>
          <div className="text-sm text-gray-600">
            {formData.date && formData.time && (
              <p>
                📅 {new Date(`${formData.date}T${formData.time}`).toLocaleDateString()} at{' '}
                {new Date(`${formData.date}T${formData.time}`).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} ({formData.duration} min)
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || calendarIntegrations.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Scheduling...' : '📅 Schedule Meeting'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingScheduleModal;