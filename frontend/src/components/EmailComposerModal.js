import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Email Composer Modal Component
 * Provides a full-featured email composition interface
 * - Rich text editing with HTML support
 * - Email templates and personalization
 * - Attachment support (future)
 * - Send tracking and delivery status
 * - Integration with email providers
 */
const EmailComposerModal = ({ lead, isOpen, onClose, onEmailSent }) => {
  const { isDarkMode, themeClasses } = useTheme();

  // Form state
  const [formData, setFormData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    template: 'custom',
    priority: 'normal',
    sendAt: '', // For scheduling emails
    trackOpens: true,
    trackClicks: true,
    isHtml: true
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScheduling, setShowScheduling] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Email templates
  const defaultTemplates = {
    followup: {
      name: 'Follow-up Email',
      subject: 'Following up on our conversation - {{leadName}}',
      body: `Hi {{leadName}},

I hope this email finds you well. I wanted to follow up on our recent conversation about {{leadCompany}}'s needs.

{{customMessage}}

I'd love to schedule a brief call to discuss how we can help {{leadCompany}} achieve its goals. Would you have 15-20 minutes available this week?

Looking forward to hearing from you.

Best regards,
{{senderName}}`
    },
    introduction: {
      name: 'Introduction Email',
      subject: 'Introduction - {{senderName}} from {{senderCompany}}',
      body: `Hello {{leadName}},

I hope this message finds you well. My name is {{senderName}}, and I work with {{senderCompany}}.

I noticed that {{leadCompany}} might benefit from our solutions in {{industry}}. We've helped similar companies:
• {{benefit1}}
• {{benefit2}}
• {{benefit3}}

Would you be open to a brief 15-minute conversation to explore how we might help {{leadCompany}}?

Best regards,
{{senderName}}`
    },
    thankyou: {
      name: 'Thank You Email',
      subject: 'Thank you for your time - {{leadName}}',
      body: `Dear {{leadName}},

Thank you for taking the time to speak with me today about {{leadCompany}}'s objectives.

As discussed, I'll be following up with:
{{nextSteps}}

Please don't hesitate to reach out if you have any questions in the meantime.

Best regards,
{{senderName}}`
    },
    proposal: {
      name: 'Proposal Follow-up',
      subject: 'Proposal for {{leadCompany}} - Next Steps',
      body: `Hi {{leadName}},

I hope you've had a chance to review the proposal we discussed for {{leadCompany}}.

Key highlights of our solution:
• {{highlight1}}
• {{highlight2}}
• {{highlight3}}

I'd be happy to address any questions or discuss next steps. Would you be available for a brief call this week?

Looking forward to moving forward together.

Best regards,
{{senderName}}`
    }
  };

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && lead) {
      setFormData(prev => ({
        ...prev,
        to: lead.email || '',
        subject: `Following up - ${lead.name}`,
        body: ''
      }));
      setError('');
      setWordCount(0);
      setShowPreview(false);
    }
  }, [isOpen, lead]);

  // Update word count when body changes
  useEffect(() => {
    const words = formData.body.trim() ? formData.body.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [formData.body]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle template selection
  const handleTemplateSelect = (templateKey) => {
    const template = defaultTemplates[templateKey];
    if (!template) return;

    const personalizedSubject = personalizeTemplate(template.subject);
    const personalizedBody = personalizeTemplate(template.body);

    setFormData(prev => ({
      ...prev,
      subject: personalizedSubject,
      body: personalizedBody,
      template: templateKey
    }));
    setShowTemplates(false);
  };

  // Personalize template with lead data
  const personalizeTemplate = (template) => {
    if (!lead) return template;

    return template
      .replace(/\{\{leadName\}\}/g, lead.name || '[Name]')
      .replace(/\{\{leadCompany\}\}/g, lead.company || '[Company]')
      .replace(/\{\{leadEmail\}\}/g, lead.email || '[Email]')
      .replace(/\{\{senderName\}\}/g, 'Your Name') // TODO: Get from user context
      .replace(/\{\{senderCompany\}\}/g, 'Your Company') // TODO: Get from user context
      .replace(/\{\{customMessage\}\}/g, '')
      .replace(/\{\{nextSteps\}\}/g, '• Action item 1\n• Action item 2')
      .replace(/\{\{industry\}\}/g, lead.industry || 'your industry')
      .replace(/\{\{benefit1\}\}/g, 'Increase efficiency')
      .replace(/\{\{benefit2\}\}/g, 'Reduce costs')
      .replace(/\{\{benefit3\}\}/g, 'Improve outcomes')
      .replace(/\{\{highlight1\}\}/g, 'Tailored solution for your needs')
      .replace(/\{\{highlight2\}\}/g, 'Proven track record of success')
      .replace(/\{\{highlight3\}\}/g, 'Competitive pricing and ROI');
  };

  // Validate form
  const validateForm = () => {
    if (!formData.to.trim()) {
      setError('Recipient email address is required');
      return false;
    }
    if (!formData.subject.trim()) {
      setError('Email subject is required');
      return false;
    }
    if (!formData.body.trim()) {
      setError('Email body is required');
      return false;
    }
    
    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const toEmails = formData.to.split(',').map(e => e.trim()).filter(Boolean);
    for (const email of toEmails) {
      if (!emailRegex.test(email)) {
        setError(`Invalid email address: ${email}`);
        return false;
      }
    }

    if (formData.cc) {
      const ccEmails = formData.cc.split(',').map(e => e.trim()).filter(Boolean);
      for (const email of ccEmails) {
        if (!emailRegex.test(email)) {
          setError(`Invalid CC email address: ${email}`);
          return false;
        }
      }
    }

    if (formData.bcc) {
      const bccEmails = formData.bcc.split(',').map(e => e.trim()).filter(Boolean);
      for (const email of bccEmails) {
        if (!emailRegex.test(email)) {
          setError(`Invalid BCC email address: ${email}`);
          return false;
        }
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Prepare email data
      const emailData = {
        to: formData.to.split(',').map(e => e.trim()).filter(Boolean),
        cc: formData.cc ? formData.cc.split(',').map(e => e.trim()).filter(Boolean) : [],
        bcc: formData.bcc ? formData.bcc.split(',').map(e => e.trim()).filter(Boolean) : [],
        subject: formData.subject.trim(),
        body: formData.body.trim(),
        leadId: lead?.id,
        priority: formData.priority,
        trackOpens: formData.trackOpens,
        trackClicks: formData.trackClicks,
        isHtml: formData.isHtml,
        template: formData.template,
        sendAt: formData.sendAt || null
      };

      // Call send email API
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // TODO: Get token from context
        },
        body: JSON.stringify({
          integrationId: 1, // TODO: Get from user's email integrations
          ...emailData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to send email');
      }

      // Notify parent component
      if (onEmailSent) {
        onEmailSent({
          ...emailData,
          messageId: result.data.messageId,
          provider: result.data.provider,
          sentAt: result.data.sentAt
        });
      }

      // Reset form and close modal
      setFormData({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        template: 'custom',
        priority: 'normal',
        sendAt: '',
        trackOpens: true,
        trackClicks: true,
        isHtml: true
      });
      onClose();

    } catch (err) {
      console.error('Email send error:', err);
      setError(err.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      setError('');
      setShowPreview(false);
      onClose();
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${themeClasses.cardBg} ${themeClasses.border} border`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${themeClasses.border} flex items-center justify-between`}>
          <h2 className={`text-xl font-bold ${themeClasses.textPrimary}`}>
            📧 Compose Email
            {lead && <span className="text-sm font-normal ml-2">to {lead.name}</span>}
          </h2>
          <div className="flex items-center gap-2">
            {!showPreview && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="btn-secondary text-sm py-2 px-3 hover:bg-blue-600 transition-colors"
                disabled={loading}
              >
                👁️ Preview
              </button>
            )}
            {showPreview && (
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="btn-secondary text-sm py-2 px-3 hover:bg-blue-600 transition-colors"
              >
                ✏️ Edit
              </button>
            )}
            <button
              onClick={handleClose}
              disabled={loading}
              className={`p-2 rounded-md transition-colors hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-700' : ''}`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">⚠️ {error}</p>
            </div>
          )}

          {!showPreview ? (
            // Compose Form
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Template Selection */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="btn-secondary text-sm py-2 px-4 hover:bg-blue-600 transition-colors"
                >
                  📋 Use Template
                </button>

                {showTemplates && (
                  <div className="mt-2 p-3 border rounded-md bg-gray-50">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(defaultTemplates).map(([key, template]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleTemplateSelect(key)}
                          className="text-left p-2 rounded border hover:bg-white hover:border-blue-500 transition-colors"
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {template.subject.replace(/\{\{.*?\}\}/g, '...')}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Recipients */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="to"
                    value={formData.to}
                    onChange={handleInputChange}
                    className="input-field text-sm"
                    placeholder="recipient@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CC:</label>
                  <input
                    type="text"
                    name="cc"
                    value={formData.cc}
                    onChange={handleInputChange}
                    className="input-field text-sm"
                    placeholder="cc@example.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BCC:</label>
                  <input
                    type="text"
                    name="bcc"
                    value={formData.bcc}
                    onChange={handleInputChange}
                    className="input-field text-sm"
                    placeholder="bcc@example.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Email subject..."
                  required
                  disabled={loading}
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message: <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">({wordCount} words)</span>
                </label>
                <textarea
                  name="body"
                  value={formData.body}
                  onChange={handleInputChange}
                  className="input-field min-h-[200px] resize-y"
                  placeholder="Write your email message here..."
                  required
                  disabled={loading}
                />
              </div>

              {/* Email Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority:</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="input-field text-sm"
                    disabled={loading}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4 pt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="trackOpens"
                      checked={formData.trackOpens}
                      onChange={handleInputChange}
                      className="mr-2"
                      disabled={loading}
                    />
                    <span className="text-sm">Track Opens</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="trackClicks"
                      checked={formData.trackClicks}
                      onChange={handleInputChange}
                      className="mr-2"
                      disabled={loading}
                    />
                    <span className="text-sm">Track Clicks</span>
                  </label>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => setShowScheduling(!showScheduling)}
                    className="btn-secondary text-sm py-2 px-3 hover:bg-blue-600 transition-colors"
                    disabled={loading}
                  >
                    ⏰ Schedule Send
                  </button>
                </div>
              </div>

              {/* Schedule Send */}
              {showScheduling && (
                <div className="border rounded-md p-3 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send At:</label>
                  <input
                    type="datetime-local"
                    name="sendAt"
                    value={formData.sendAt}
                    onChange={handleInputChange}
                    className="input-field text-sm"
                    min={new Date().toISOString().slice(0, 16)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Leave empty to send immediately
                  </p>
                </div>
              )}
            </form>
          ) : (
            // Email Preview
            <div className="space-y-4">
              <div className="border rounded-md p-4 bg-white">
                <div className="mb-4 pb-4 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm">
                      <strong>From:</strong> Your Name &lt;your@email.com&gt;
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date().toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm mb-1">
                    <strong>To:</strong> {formData.to}
                  </div>
                  {formData.cc && (
                    <div className="text-sm mb-1">
                      <strong>CC:</strong> {formData.cc}
                    </div>
                  )}
                  {formData.bcc && (
                    <div className="text-sm mb-1">
                      <strong>BCC:</strong> {formData.bcc}
                    </div>
                  )}
                  <div className="text-sm">
                    <strong>Subject:</strong> {formData.subject}
                  </div>
                  {formData.priority !== 'normal' && (
                    <div className="text-sm">
                      <strong>Priority:</strong> 
                      <span className={`ml-1 inline-block px-2 py-1 rounded text-xs ${
                        formData.priority === 'high' 
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {formData.priority.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {formData.body}
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Preview - This is how your email will appear to the recipient
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${themeClasses.border} flex justify-between items-center`}>
          <div className="text-sm text-gray-500">
            {!showPreview && (
              <>
                {lead ? `Sending to ${lead.name} (${lead.email})` : 'Draft email'}
                {formData.sendAt && (
                  <span className="ml-2">• Scheduled for {new Date(formData.sendAt).toLocaleString()}</span>
                )}
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Cancel
            </button>

            {!showPreview ? (
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !formData.to || !formData.subject || !formData.body}
                className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '📤 Sending...' : formData.sendAt ? '⏰ Schedule Send' : '📤 Send Email'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="btn-primary px-6 py-2"
              >
                📝 Back to Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposerModal;