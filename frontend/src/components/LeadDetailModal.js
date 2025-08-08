import React, { useState, useEffect } from 'react';
import { leadsService } from '../services';

/**
 * LeadDetailModal - Comprehensive lead management modal
 * Features: Complete lead information, timeline, editing capabilities
 */
const LeadDetailModal = ({ 
  lead, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  isNewLead = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    title: '',
    status: 'New',
    priority: 'Medium',
    industry: '',
    company_size: '',
    lead_source: '',
    tags: [],
    notes: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA'
    }
  });

  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('details');
  const [newTag, setNewTag] = useState('');

  // Initialize form data when lead changes
  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        name: lead.name || '',
        company: lead.company || '',
        phone: lead.phone || '',
        email: lead.email || '',
        title: lead.title || '',
        status: lead.status || 'New',
        priority: lead.priority || 'Medium',
        industry: lead.industry || '',
        company_size: lead.company_size || '',
        lead_source: lead.lead_source || '',
        tags: lead.tags || [],
        notes: lead.notes || '',
        address: {
          street: lead.address?.street || '',
          city: lead.address?.city || '',
          state: lead.address?.state || '',
          zip: lead.address?.zip || '',
          country: lead.address?.country || 'USA'
        }
      });

      // Load timeline if existing lead
      if (!isNewLead && lead.id) {
        loadTimeline(lead.id);
      }
    }
  }, [lead, isOpen, isNewLead]);

  // Load lead activity timeline
  const loadTimeline = async (leadId) => {
    try {
      setIsLoading(true);
      const response = await leadsService.getLeadActivity(leadId);
      if (response.success) {
        setTimeline(response.data);
      }
    } catch (error) {
      console.error('Failed to load timeline:', error);
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

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
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
      
      if (isNewLead) {
        const response = await leadsService.createLead(formData);
        if (response.success) {
          onSave(response.data);
          onClose();
        } else {
          setErrors({ general: response.message || 'Failed to create lead' });
        }
      } else {
        const response = await leadsService.updateLead(lead.id, formData);
        if (response.success) {
          onSave(response.data);
          onClose();
        } else {
          setErrors({ general: response.message || 'Failed to update lead' });
        }
      }
    } catch (error) {
      setErrors({ general: 'An error occurred while saving' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await leadsService.deleteLead(lead.id);
      if (response.success) {
        onDelete(lead.id);
        onClose();
      } else {
        setErrors({ general: response.message || 'Failed to delete lead' });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred while deleting' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {isNewLead ? 'Create New Lead' : `${formData.name || 'Lead Details'}`}
            </h2>
            {!isNewLead && (
              <p className="text-blue-100 text-sm mt-1">
                {formData.company} • {formData.status}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {['details', 'timeline', 'notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'timeline' && !isNewLead && timeline.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1 ml-2">
                    {timeline.length}
                  </span>
                )}
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error message */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{errors.general}</p>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full p-3 border rounded-lg ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter full name"
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full p-3 border rounded-lg ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="(555) 123-4567"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full p-3 border rounded-lg ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="email@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Job title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Technology, Healthcare, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Status and Priority */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Lead Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="New">New</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Not Interested">Not Interested</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Size
                    </label>
                    <select
                      value={formData.company_size}
                      onChange={(e) => handleInputChange('company_size', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => handleInputChange('address.street', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.address.zip}
                      onChange={(e) => handleInputChange('address.zip', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="ZIP code"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => handleInputChange('address.country', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Add a tag"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div>
              {isNewLead ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Timeline will be available after creating the lead</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading timeline...</p>
                    </div>
                  ) : timeline.length > 0 ? (
                    timeline.map((event, index) => (
                      <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                        <div className="bg-blue-500 text-white rounded-full p-2 text-xs">
                          {event.type === 'call' ? '📞' : 
                           event.type === 'email' ? '📧' : 
                           event.type === 'note' ? '📝' : '📅'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No activity recorded yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-y"
                placeholder="Add your notes about this lead..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-6 flex justify-between">
          <div>
            {!isNewLead && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Delete Lead
              </button>
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
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isNewLead ? 'Create Lead' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailModal;