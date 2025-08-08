import React, { useState, useEffect } from 'react';
import { callsService } from '../services';

/**
 * CallOutcome Component - Advanced disposition tracking and outcome management
 * Handles call outcomes with detailed categorization and follow-up actions
 */

const CallOutcome = ({ 
  callId, 
  leadId,
  onOutcomeSet, 
  initialOutcome = null,
  showAnalytics = true,
  readOnly = false,
  className = '' 
}) => {
  // Outcome state
  const [selectedOutcome, setSelectedOutcome] = useState(initialOutcome);
  const [subOutcome, setSubOutcome] = useState('');
  const [outcomeReason, setOutcomeReason] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [tags, setTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [outcomeAnalytics, setOutcomeAnalytics] = useState(null);
  
  // Comprehensive outcome definitions
  const outcomes = {
    connected: {
      id: 'connected',
      label: 'Connected',
      icon: '✅',
      color: 'bg-green-500',
      textColor: 'text-white',
      description: 'Successfully spoke with contact',
      subcategories: [
        { id: 'interested', label: 'Interested in Service', nextAction: 'schedule_demo' },
        { id: 'qualified_lead', label: 'Qualified Lead', nextAction: 'schedule_meeting' },
        { id: 'needs_assessment', label: 'Needs Assessment Required', nextAction: 'follow_up' },
        { id: 'pricing_discussion', label: 'Pricing Discussion', nextAction: 'send_proposal' },
        { id: 'decision_maker', label: 'Connected with Decision Maker', nextAction: 'present_solution' },
        { id: 'information_provided', label: 'Information Provided', nextAction: 'follow_up' },
        { id: 'referral_given', label: 'Referral Received', nextAction: 'contact_referral' }
      ]
    },
    voicemail: {
      id: 'voicemail',
      label: 'Voicemail',
      icon: '📧',
      color: 'bg-blue-500',
      textColor: 'text-white',
      description: 'Left voicemail message',
      subcategories: [
        { id: 'first_voicemail', label: 'First Voicemail', nextAction: 'follow_up' },
        { id: 'follow_up_voicemail', label: 'Follow-up Voicemail', nextAction: 'wait_callback' },
        { id: 'detailed_voicemail', label: 'Detailed Message Left', nextAction: 'monitor_response' },
        { id: 'callback_requested', label: 'Callback Requested', nextAction: 'wait_callback' }
      ]
    },
    no_answer: {
      id: 'no_answer',
      label: 'No Answer',
      icon: '🔕',
      color: 'bg-yellow-500',
      textColor: 'text-white',
      description: 'No one answered the call',
      subcategories: [
        { id: 'rings_no_vm', label: 'Rings but No Voicemail', nextAction: 'try_again' },
        { id: 'straight_vm', label: 'Straight to Voicemail', nextAction: 'leave_message' },
        { id: 'line_busy', label: 'Line Appears Busy', nextAction: 'try_later' },
        { id: 'multiple_attempts', label: 'Multiple Failed Attempts', nextAction: 'different_approach' }
      ]
    },
    busy: {
      id: 'busy',
      label: 'Busy',
      icon: '📞',
      color: 'bg-orange-500',
      textColor: 'text-white',
      description: 'Line was busy',
      subcategories: [
        { id: 'busy_signal', label: 'Busy Signal', nextAction: 'try_later' },
        { id: 'call_waiting', label: 'Call Waiting Active', nextAction: 'try_again' },
        { id: 'multiple_busy', label: 'Consistently Busy', nextAction: 'different_time' }
      ]
    },
    not_interested: {
      id: 'not_interested',
      label: 'Not Interested',
      icon: '❌',
      color: 'bg-red-500',
      textColor: 'text-white',
      description: 'Contact expressed no interest',
      subcategories: [
        { id: 'no_need', label: 'No Current Need', nextAction: 'long_term_nurture' },
        { id: 'budget_constraints', label: 'Budget Constraints', nextAction: 'future_follow_up' },
        { id: 'timing_bad', label: 'Bad Timing', nextAction: 'schedule_callback' },
        { id: 'competitive_solution', label: 'Using Competitor', nextAction: 'monitor_competitor' },
        { id: 'do_not_call', label: 'Do Not Call Request', nextAction: 'remove_from_list' },
        { id: 'hostile_response', label: 'Hostile Response', nextAction: 'mark_dnc' }
      ]
    },
    callback_requested: {
      id: 'callback_requested',
      label: 'Callback Requested',
      icon: '📞',
      color: 'bg-purple-500',
      textColor: 'text-white',
      description: 'Contact requested callback',
      subcategories: [
        { id: 'specific_time', label: 'Specific Time Requested', nextAction: 'schedule_callback' },
        { id: 'better_time', label: 'Asked for Better Time', nextAction: 'find_optimal_time' },
        { id: 'decision_maker_callback', label: 'Decision Maker Callback', nextAction: 'prepare_presentation' },
        { id: 'information_callback', label: 'Need More Information', nextAction: 'prepare_materials' }
      ]
    },
    appointment_set: {
      id: 'appointment_set',
      label: 'Appointment Set',
      icon: '📅',
      color: 'bg-emerald-600',
      textColor: 'text-white',
      description: 'Meeting or demo scheduled',
      subcategories: [
        { id: 'demo_scheduled', label: 'Product Demo', nextAction: 'prepare_demo' },
        { id: 'consultation_scheduled', label: 'Consultation Meeting', nextAction: 'prepare_consultation' },
        { id: 'proposal_presentation', label: 'Proposal Presentation', nextAction: 'prepare_proposal' },
        { id: 'discovery_meeting', label: 'Discovery Meeting', nextAction: 'prepare_questions' },
        { id: 'technical_demo', label: 'Technical Demonstration', nextAction: 'prepare_technical' }
      ]
    },
    wrong_number: {
      id: 'wrong_number',
      label: 'Wrong Number',
      icon: '🚫',
      color: 'bg-gray-500',
      textColor: 'text-white',
      description: 'Incorrect contact information',
      subcategories: [
        { id: 'disconnected', label: 'Number Disconnected', nextAction: 'find_new_contact' },
        { id: 'wrong_person', label: 'Wrong Person', nextAction: 'verify_contact_info' },
        { id: 'business_closed', label: 'Business Closed', nextAction: 'update_status' },
        { id: 'moved_relocated', label: 'Contact Relocated', nextAction: 'find_new_info' }
      ]
    }
  };
  
  // Next action templates
  const nextActions = {
    schedule_demo: { 
      label: 'Schedule Demo', 
      urgency: 'high',
      defaultDays: 2,
      description: 'Schedule product demonstration'
    },
    schedule_meeting: { 
      label: 'Schedule Meeting', 
      urgency: 'high',
      defaultDays: 3,
      description: 'Schedule discovery or consultation meeting'
    },
    follow_up: { 
      label: 'Follow Up', 
      urgency: 'medium',
      defaultDays: 7,
      description: 'General follow-up call'
    },
    send_proposal: { 
      label: 'Send Proposal', 
      urgency: 'high',
      defaultDays: 1,
      description: 'Send detailed proposal or quote'
    },
    try_again: { 
      label: 'Try Again', 
      urgency: 'medium',
      defaultDays: 2,
      description: 'Attempt to call again'
    },
    long_term_nurture: { 
      label: 'Long-term Nurture', 
      urgency: 'low',
      defaultDays: 90,
      description: 'Add to long-term nurturing campaign'
    }
  };
  
  // Common tags for outcomes
  const predefinedTags = [
    'hot-lead', 'warm-lead', 'cold-lead', 'decision-maker', 'gatekeeper',
    'budget-approved', 'budget-pending', 'competitor-user', 'price-sensitive',
    'technical-buyer', 'economic-buyer', 'influencer', 'champion'
  ];
  
  // Load outcome analytics
  useEffect(() => {
    if (showAnalytics) {
      loadOutcomeAnalytics();
    }
  }, [showAnalytics]);
  
  const loadOutcomeAnalytics = async () => {
    try {
      const response = await callsService.getOutcomeStats();
      if (response.success) {
        setOutcomeAnalytics(response.data);
      }
    } catch (error) {
      console.error('Failed to load outcome analytics:', error);
    }
  };
  
  // Handle outcome selection
  const handleOutcomeSelect = (outcomeKey) => {
    const outcome = outcomes[outcomeKey];
    setSelectedOutcome(outcome);
    setShowSubcategories(true);
    
    // Auto-set follow-up date based on outcome
    if (outcome.subcategories.length > 0) {
      const firstSub = outcome.subcategories[0];
      const action = nextActions[firstSub.nextAction];
      if (action) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + action.defaultDays);
        setFollowUpDate(defaultDate.toISOString().split('T')[0]);
        setPriority(action.urgency);
      }
    }
  };
  
  // Handle subcategory selection
  const handleSubcategorySelect = (subcategory) => {
    setSubOutcome(subcategory);
    
    // Update follow-up date and priority based on next action
    const action = nextActions[subcategory.nextAction];
    if (action) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + action.defaultDays);
      setFollowUpDate(defaultDate.toISOString().split('T')[0]);
      setPriority(action.urgency);
    }
  };
  
  // Add custom tag
  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
    }
  };
  
  // Remove tag
  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Add predefined tag
  const addPredefinedTag = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };
  
  // Submit outcome
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedOutcome) {
      alert('Please select a call outcome');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const outcomeData = {
        outcome: selectedOutcome.label,
        subOutcome: subOutcome?.label || '',
        reason: outcomeReason,
        nextAction: subOutcome?.nextAction || '',
        followUpDate: followUpDate || null,
        priority,
        tags
      };
      
      if (callId) {
        // Update existing call
        const result = await callsService.updateCall(callId, outcomeData);
        if (result.success && onOutcomeSet) {
          onOutcomeSet(result.data);
        }
      } else {
        // Create new call log
        const result = await callsService.logCall({
          leadId,
          ...outcomeData
        });
        if (result.success && onOutcomeSet) {
          onOutcomeSet(result.data);
        }
      }
      
      // Reset form
      setSelectedOutcome(null);
      setSubOutcome('');
      setOutcomeReason('');
      setShowSubcategories(false);
      
    } catch (error) {
      console.error('Failed to set outcome:', error);
      alert('Failed to save outcome. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">🎯 Call Outcome</h3>
        <p className="text-sm text-gray-600 mt-1">
          Select the outcome and set follow-up actions
        </p>
      </div>
      
      {/* Outcome Selection */}
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Primary Outcome
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.values(outcomes).map((outcome) => (
              <button
                key={outcome.id}
                type="button"
                onClick={() => handleOutcomeSelect(outcome.id)}
                disabled={readOnly}
                className={`p-3 rounded-lg text-sm font-medium transition-all transform hover:scale-105 touch-manipulation ${
                  selectedOutcome?.id === outcome.id
                    ? `${outcome.color} ${outcome.textColor} shadow-lg`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-lg mb-1">{outcome.icon}</div>
                <div className="text-xs">{outcome.label}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Subcategory Selection */}
        {selectedOutcome && showSubcategories && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specific Outcome for "{selectedOutcome.label}"
            </label>
            <div className="space-y-2">
              {selectedOutcome.subcategories.map((sub) => (
                <label
                  key={sub.id}
                  className="flex items-start gap-3 p-2 hover:bg-white rounded transition-colors cursor-pointer"
                >
                  <input
                    type="radio"
                    name="subcategory"
                    checked={subOutcome?.id === sub.id}
                    onChange={() => handleSubcategorySelect(sub)}
                    disabled={readOnly}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">
                      {sub.label}
                    </div>
                    {nextActions[sub.nextAction] && (
                      <div className="text-xs text-gray-600 mt-1">
                        Next: {nextActions[sub.nextAction].description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        
        {/* Outcome Reason */}
        {selectedOutcome && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={outcomeReason}
              onChange={(e) => setOutcomeReason(e.target.value)}
              placeholder="Provide additional context about this outcome..."
              disabled={readOnly}
              className="w-full h-20 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
        )}
        
        {/* Follow-up Planning */}
        {selectedOutcome && subOutcome && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-3">Follow-up Planning</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={readOnly}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={readOnly}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                </select>
              </div>
            </div>
            
            {subOutcome && nextActions[subOutcome.nextAction] && (
              <div className="mt-3 p-2 bg-white rounded border-l-4 border-blue-400">
                <div className="text-sm font-medium text-gray-800">
                  Recommended Next Action: {nextActions[subOutcome.nextAction].label}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {nextActions[subOutcome.nextAction].description}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Tags */}
        {selectedOutcome && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            
            {/* Selected Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full"
                  >
                    {tag}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-600"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            
            {/* Add Custom Tag */}
            {!readOnly && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Add custom tag..."
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                  className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
            )}
            
            {/* Predefined Tags */}
            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                {predefinedTags
                  .filter(tag => !tags.includes(tag))
                  .slice(0, 6)
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addPredefinedTag(tag)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
        
        {/* Submit Button */}
        {!readOnly && selectedOutcome && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">🔄</span>
                Saving Outcome...
              </span>
            ) : (
              '✅ Save Outcome & Set Follow-up'
            )}
          </button>
        )}
        
        {/* Analytics (if enabled) */}
        {showAnalytics && outcomeAnalytics && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800 mb-3">
              📊 Your Outcome Statistics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">
                  {outcomeAnalytics.connected || 0}
                </div>
                <div className="text-xs text-gray-600">Connected</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {outcomeAnalytics.voicemail || 0}
                </div>
                <div className="text-xs text-gray-600">Voicemail</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">
                  {outcomeAnalytics.appointments || 0}
                </div>
                <div className="text-xs text-gray-600">Appointments</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-600">
                  {outcomeAnalytics.total || 0}
                </div>
                <div className="text-xs text-gray-600">Total Calls</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallOutcome;