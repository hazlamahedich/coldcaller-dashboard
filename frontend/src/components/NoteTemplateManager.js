import React, { useState, useEffect } from 'react';
import { notesService } from '../services';

// Note Template Management Component
const NoteTemplateManager = ({ onSelectTemplate, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    icon: '📝',
    category: 'custom',
    fields: [
      { name: 'summary', label: 'Summary', type: 'textarea', placeholder: 'Brief summary...', required: true }
    ],
    isPublic: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Predefined template categories
  const templateCategories = [
    { id: 'sales', name: 'Sales Calls', icon: '💼' },
    { id: 'support', name: 'Customer Support', icon: '🛠️' },
    { id: 'follow-up', name: 'Follow-ups', icon: '🔄' },
    { id: 'meeting', name: 'Meetings', icon: '👥' },
    { id: 'custom', name: 'Custom', icon: '⚙️' }
  ];

  // Field types available for template creation
  const fieldTypes = [
    { value: 'text', label: 'Single Line Text', icon: '📝' },
    { value: 'textarea', label: 'Multi-line Text', icon: '📄' },
    { value: 'select', label: 'Dropdown Selection', icon: '📋' },
    { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
    { value: 'date', label: 'Date Picker', icon: '📅' },
    { value: 'number', label: 'Number Input', icon: '🔢' },
    { value: 'rating', label: 'Rating Scale', icon: '⭐' },
    { value: 'tags', label: 'Tag Input', icon: '🏷️' }
  ];

  // Default system templates
  const systemTemplates = [
    {
      id: 'cold-call-advanced',
      name: 'Advanced Cold Call',
      description: 'Comprehensive cold call tracking with detailed sections',
      icon: '📞',
      category: 'sales',
      isSystem: true,
      fields: [
        { name: 'prospect_research', label: 'Pre-call Research', type: 'textarea', placeholder: 'What research was done before the call?' },
        { name: 'opening_response', label: 'Opening Response', type: 'select', options: ['Receptive', 'Neutral', 'Skeptical', 'Hostile'] },
        { name: 'pain_points', label: 'Pain Points Identified', type: 'textarea', placeholder: 'What challenges did they mention?' },
        { name: 'current_solution', label: 'Current Solution', type: 'textarea', placeholder: 'What are they using now?' },
        { name: 'budget_discussion', label: 'Budget Discussion', type: 'select', options: ['Not Discussed', 'Budget Available', 'Budget Constraints', 'Need Approval'] },
        { name: 'decision_process', label: 'Decision Making Process', type: 'textarea', placeholder: 'Who makes decisions? What is the process?' },
        { name: 'timeline', label: 'Implementation Timeline', type: 'select', options: ['Immediate', '1-3 months', '3-6 months', '6+ months', 'No timeline'] },
        { name: 'objections', label: 'Objections Raised', type: 'textarea', placeholder: 'What concerns or objections did they have?' },
        { name: 'objection_responses', label: 'How Objections Were Addressed', type: 'textarea', placeholder: 'How did you respond to their concerns?' },
        { name: 'interest_level', label: 'Interest Level', type: 'rating', max: 10, placeholder: 'Rate interest level 1-10' },
        { name: 'qualification_score', label: 'Qualification Score', type: 'rating', max: 100, placeholder: 'Overall qualification score' },
        { name: 'next_steps', label: 'Agreed Next Steps', type: 'textarea', placeholder: 'What specific actions were agreed upon?' },
        { name: 'follow_up_date', label: 'Follow-up Date', type: 'date' },
        { name: 'internal_notes', label: 'Internal Notes', type: 'textarea', placeholder: 'Notes for internal team use only' }
      ]
    },
    {
      id: 'discovery-call',
      name: 'Discovery Call',
      description: 'In-depth discovery call template for qualifying prospects',
      icon: '🔍',
      category: 'sales',
      isSystem: true,
      fields: [
        { name: 'company_overview', label: 'Company Overview', type: 'textarea', placeholder: 'Tell me about your company...' },
        { name: 'current_challenges', label: 'Current Challenges', type: 'textarea', placeholder: 'What challenges are you facing?' },
        { name: 'impact_of_challenges', label: 'Impact of Challenges', type: 'textarea', placeholder: 'How are these challenges affecting your business?' },
        { name: 'previous_solutions', label: 'Previous Solutions Tried', type: 'textarea', placeholder: 'What have you tried before?' },
        { name: 'decision_criteria', label: 'Decision Criteria', type: 'textarea', placeholder: 'What factors will influence your decision?' },
        { name: 'success_metrics', label: 'Success Metrics', type: 'textarea', placeholder: 'How will you measure success?' },
        { name: 'stakeholders', label: 'Key Stakeholders', type: 'textarea', placeholder: 'Who else is involved in this decision?' },
        { name: 'budget_range', label: 'Budget Range', type: 'select', options: ['Under $10K', '$10K-$50K', '$50K-$100K', '$100K+', 'Not Discussed'] },
        { name: 'urgency', label: 'Urgency Level', type: 'select', options: ['Urgent', 'High', 'Medium', 'Low', 'No Rush'] },
        { name: 'fit_assessment', label: 'Solution Fit Assessment', type: 'rating', max: 10, placeholder: 'How well do we fit their needs?' },
        { name: 'red_flags', label: 'Red Flags or Concerns', type: 'textarea', placeholder: 'Any concerns about this opportunity?' },
        { name: 'champion_identified', label: 'Champion Identified', type: 'checkbox' },
        { name: 'champion_notes', label: 'Champion Notes', type: 'textarea', placeholder: 'Notes about the champion...' }
      ]
    },
    {
      id: 'demo-feedback',
      name: 'Demo Feedback',
      description: 'Capture detailed feedback from product demonstrations',
      icon: '🖥️',
      category: 'sales',
      isSystem: true,
      fields: [
        { name: 'demo_type', label: 'Demo Type', type: 'select', options: ['Live Demo', 'Screen Share', 'In-Person', 'Self-Service'] },
        { name: 'attendees', label: 'Attendees', type: 'textarea', placeholder: 'Who attended the demo?' },
        { name: 'demo_flow', label: 'Demo Flow', type: 'textarea', placeholder: 'What features were shown and in what order?' },
        { name: 'positive_reactions', label: 'Positive Reactions', type: 'textarea', placeholder: 'What did they like or get excited about?' },
        { name: 'concerns_raised', label: 'Concerns or Questions', type: 'textarea', placeholder: 'What concerns or questions came up?' },
        { name: 'feature_requests', label: 'Feature Requests', type: 'textarea', placeholder: 'What additional features did they ask about?' },
        { name: 'competitor_comparisons', label: 'Competitor Comparisons', type: 'textarea', placeholder: 'How did they compare us to competitors?' },
        { name: 'technical_questions', label: 'Technical Questions', type: 'textarea', placeholder: 'What technical questions were asked?' },
        { name: 'integration_requirements', label: 'Integration Requirements', type: 'textarea', placeholder: 'What integrations do they need?' },
        { name: 'demo_effectiveness', label: 'Demo Effectiveness', type: 'rating', max: 10, placeholder: 'How effective was the demo?' },
        { name: 'next_demo_needed', label: 'Follow-up Demo Needed', type: 'checkbox' },
        { name: 'demo_customization', label: 'Demo Customization Notes', type: 'textarea', placeholder: 'How should future demos be customized?' }
      ]
    },
    {
      id: 'customer-support',
      name: 'Customer Support Call',
      description: 'Track customer support interactions and resolutions',
      icon: '🛠️',
      category: 'support',
      isSystem: true,
      fields: [
        { name: 'issue_description', label: 'Issue Description', type: 'textarea', placeholder: 'What is the customer reporting?', required: true },
        { name: 'issue_category', label: 'Issue Category', type: 'select', options: ['Technical', 'Account', 'Billing', 'Feature Request', 'Bug Report'] },
        { name: 'severity', label: 'Severity Level', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
        { name: 'customer_impact', label: 'Customer Impact', type: 'textarea', placeholder: 'How is this affecting the customer?' },
        { name: 'steps_to_reproduce', label: 'Steps to Reproduce', type: 'textarea', placeholder: 'How can this issue be reproduced?' },
        { name: 'troubleshooting_steps', label: 'Troubleshooting Steps Taken', type: 'textarea', placeholder: 'What troubleshooting was performed?' },
        { name: 'resolution', label: 'Resolution', type: 'textarea', placeholder: 'How was the issue resolved?' },
        { name: 'workaround', label: 'Temporary Workaround', type: 'textarea', placeholder: 'Any temporary solutions provided?' },
        { name: 'follow_up_required', label: 'Follow-up Required', type: 'checkbox' },
        { name: 'escalation_needed', label: 'Escalation Needed', type: 'checkbox' },
        { name: 'customer_satisfaction', label: 'Customer Satisfaction', type: 'rating', max: 5, placeholder: 'Rate customer satisfaction 1-5' },
        { name: 'internal_notes', label: 'Internal Notes', type: 'textarea', placeholder: 'Internal team notes...' }
      ]
    }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await notesService.getTemplates();
      if (response.success) {
        setCustomTemplates(response.data);
      }
      setTemplates([...systemTemplates, ...customTemplates]);
    } catch (error) {
      setError('Failed to load templates');
      setTemplates(systemTemplates);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    try {
      setLoading(true);
      
      if (!newTemplate.name.trim()) {
        throw new Error('Template name is required');
      }
      
      if (newTemplate.fields.length === 0) {
        throw new Error('At least one field is required');
      }

      const response = await notesService.createTemplate(newTemplate);
      
      if (response.success) {
        setCustomTemplates(prev => [...prev, response.data]);
        setNewTemplate({
          name: '',
          description: '',
          icon: '📝',
          category: 'custom',
          fields: [
            { name: 'summary', label: 'Summary', type: 'textarea', placeholder: 'Brief summary...', required: true }
          ],
          isPublic: false
        });
        setShowCreateForm(false);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (templateId, updates) => {
    try {
      setLoading(true);
      const response = await notesService.updateTemplate(templateId, updates);
      
      if (response.success) {
        setCustomTemplates(prev => 
          prev.map(template => 
            template.id === templateId ? { ...template, ...updates } : template
          )
        );
        setEditingTemplate(null);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      setLoading(true);
      const response = await notesService.deleteTemplate(templateId);
      
      if (response.success) {
        setCustomTemplates(prev => prev.filter(template => template.id !== templateId));
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    setNewTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, {
        name: `field_${prev.fields.length + 1}`,
        label: 'New Field',
        type: 'text',
        placeholder: '',
        required: false
      }]
    }));
  };

  const updateField = (index, updates) => {
    setNewTemplate(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      )
    }));
  };

  const removeField = (index) => {
    setNewTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const renderFieldEditor = (field, index) => (
    <div key={index} className="border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-medium text-gray-700">Field {index + 1}</h4>
        <button
          onClick={() => removeField(index)}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          ✕ Remove
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Field Name</label>
          <input
            type="text"
            value={field.name}
            onChange={(e) => updateField(index, { name: e.target.value })}
            className="w-full p-2 border rounded text-sm"
            placeholder="field_name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Display Label</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => updateField(index, { label: e.target.value })}
            className="w-full p-2 border rounded text-sm"
            placeholder="Field Label"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Field Type</label>
          <select
            value={field.type}
            onChange={(e) => updateField(index, { type: e.target.value })}
            className="w-full p-2 border rounded text-sm"
          >
            {fieldTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Placeholder</label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => updateField(index, { placeholder: e.target.value })}
            className="w-full p-2 border rounded text-sm"
            placeholder="Placeholder text..."
          />
        </div>
      </div>
      
      {field.type === 'select' && (
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-600 mb-1">Options (comma separated)</label>
          <input
            type="text"
            value={field.options?.join(', ') || ''}
            onChange={(e) => updateField(index, { 
              options: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt)
            })}
            className="w-full p-2 border rounded text-sm"
            placeholder="Option 1, Option 2, Option 3"
          />
        </div>
      )}
      
      <div className="mt-3 flex items-center">
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={field.required || false}
            onChange={(e) => updateField(index, { required: e.target.checked })}
            className="mr-2"
          />
          Required field
        </label>
      </div>
    </div>
  );

  return (
    <div className="note-template-manager max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📋 Note Templates</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            ✚ Create Template
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
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

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {templateCategories.map(category => {
          const categoryTemplates = [...systemTemplates, ...customTemplates]
            .filter(template => template.category === category.id);
          
          if (categoryTemplates.length === 0) return null;
          
          return (
            <div key={category.id} className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <span className="text-xl mr-2">{category.icon}</span>
                  {category.name}
                </h3>
              </div>
              
              <div className="p-4 space-y-3">
                {categoryTemplates.map(template => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onSelectTemplate && onSelectTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <span className="text-lg mr-2">{template.icon}</span>
                          <h4 className="font-medium text-gray-800">{template.name}</h4>
                          {template.isSystem && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <div className="text-xs text-gray-500">
                          {template.fields.length} fields
                        </div>
                      </div>
                      
                      {!template.isSystem && (
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTemplate(template);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit template"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate(template.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete template"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Template Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">Create New Template</h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Template Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Template Name</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border rounded-lg"
                    placeholder="My Custom Template"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Icon</label>
                  <input
                    type="text"
                    value={newTemplate.icon}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full p-3 border rounded-lg"
                    placeholder="📝"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Description</label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border rounded-lg"
                  rows="2"
                  placeholder="Brief description of this template..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Category</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border rounded-lg"
                >
                  {templateCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Template Fields */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-700">Template Fields</h4>
                  <button
                    onClick={addField}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    ✚ Add Field
                  </button>
                </div>
                
                <div className="space-y-4">
                  {newTemplate.fields.map((field, index) => renderFieldEditor(field, index))}
                </div>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTemplate.isPublic}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Make this template available to all team members</span>
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewTemplate({
                    name: '',
                    description: '',
                    icon: '📝',
                    category: 'custom',
                    fields: [
                      { name: 'summary', label: 'Summary', type: 'textarea', placeholder: 'Brief summary...', required: true }
                    ],
                    isPublic: false
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createTemplate}
                disabled={loading || !newTemplate.name.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '⏳ Creating...' : '✅ Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteTemplateManager;