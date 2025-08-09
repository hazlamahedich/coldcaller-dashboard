import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * EmailComposer - Enhanced email composition modal with Windows integration
 * Features: Templates, auto-fill, Windows email client integration, rich composition
 */
const EmailComposer = ({ isVisible, leadData, onClose, onSend }) => {
  const { isDarkMode } = useTheme();
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Email templates for different scenarios
  const emailTemplates = {
    followup: {
      name: 'Follow-up',
      subject: 'Following up on our conversation - {company}',
      body: `Hi {firstName},

I hope this email finds you well. I wanted to follow up on our previous conversation regarding your needs at {company}.

I believe our solution could help you achieve your goals, and I'd love to schedule a brief 15-minute call to discuss how we can support your business objectives.

Would you be available for a quick call this week? I'm happy to work around your schedule.

Best regards,
[Your Name]
[Your Title]
[Your Company]
[Your Phone]`
    },
    introduction: {
      name: 'Introduction',
      subject: 'Introduction - Solutions for {company}',
      body: `Hi {firstName},

I hope you're having a great day. I'm reaching out because I noticed {company} might benefit from our solutions.

We've helped similar companies in your industry achieve:
• Increased efficiency
• Cost reduction
• Better customer satisfaction

I'd love to share how we can help {company} achieve similar results. Would you be open to a brief 15-minute conversation this week?

Best regards,
[Your Name]
[Your Title]
[Your Company]
[Your Phone]`
    },
    thankyou: {
      name: 'Thank You',
      subject: 'Thank you for your time - {company}',
      body: `Hi {firstName},

Thank you for taking the time to speak with me today about {company}'s needs. I really appreciate your insights and the opportunity to learn more about your challenges.

As discussed, I'll follow up with:
• [Specific item 1]
• [Specific item 2]
• [Next steps]

I'll be in touch within [timeframe] with the information we discussed.

Best regards,
[Your Name]
[Your Title]
[Your Company]
[Your Phone]`
    },
    proposal: {
      name: 'Proposal Follow-up',
      subject: 'Proposal for {company} - Next Steps',
      body: `Hi {firstName},

I've attached the proposal we discussed for {company}. This outlines how we can help you achieve your goals with:

• [Key benefit 1]
• [Key benefit 2]
• [Key benefit 3]

I'm confident this solution will deliver the results you're looking for. I'd love to schedule a call to discuss any questions you might have.

When would be a good time for you this week?

Best regards,
[Your Name]
[Your Title]
[Your Company]
[Your Phone]`
    },
    custom: {
      name: 'Custom',
      subject: '',
      body: ''
    }
  };

  // Initialize email data when component becomes visible
  useEffect(() => {
    if (isVisible && leadData) {
      setEmailData({
        to: leadData.email || '',
        subject: '',
        body: ''
      });
      setSelectedTemplate('followup');
      setError(null);
    }
  }, [isVisible, leadData]);

  // Apply selected template
  useEffect(() => {
    if (leadData && selectedTemplate !== 'custom') {
      const template = emailTemplates[selectedTemplate];
      const firstName = leadData.name ? leadData.name.split(' ')[0] : 'there';
      const company = leadData.company || 'your company';

      setEmailData(prev => ({
        ...prev,
        subject: template.subject
          .replace('{company}', company)
          .replace('{firstName}', firstName),
        body: template.body
          .replace(/{firstName}/g, firstName)
          .replace(/{company}/g, company)
      }));
    } else if (selectedTemplate === 'custom') {
      setEmailData(prev => ({
        ...prev,
        subject: '',
        body: ''
      }));
    }
  }, [selectedTemplate, leadData]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setEmailData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Switch to custom template if user modifies content
    if ((field === 'subject' || field === 'body') && selectedTemplate !== 'custom') {
      setSelectedTemplate('custom');
    }
  };

  // Send via Windows default email client
  const handleSendViaWindows = () => {
    try {
      const subject = encodeURIComponent(emailData.subject);
      const body = encodeURIComponent(emailData.body);
      const to = encodeURIComponent(emailData.to);
      
      const mailtoURL = `mailto:${to}?subject=${subject}&body=${body}`;
      
      // Open default email client
      window.location.href = mailtoURL;
      
      // Log the email interaction
      console.log('📧 Email opened in Windows email client:', {
        to: emailData.to,
        subject: emailData.subject,
        leadData: leadData
      });

      // Call onSend callback if provided
      if (onSend) {
        onSend({
          ...emailData,
          method: 'windows_client',
          timestamp: new Date().toISOString(),
          leadId: leadData?.id
        });
      }

      // Close modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('❌ Error opening Windows email client:', error);
      setError('Failed to open email client. Please check your default email application.');
    }
  };

  // Copy email to clipboard
  const handleCopyToClipboard = async () => {
    try {
      const emailText = `To: ${emailData.to}
Subject: ${emailData.subject}

${emailData.body}`;

      await navigator.clipboard.writeText(emailText);
      alert('Email copied to clipboard!');
    } catch (error) {
      console.error('❌ Error copying to clipboard:', error);
      setError('Failed to copy to clipboard.');
    }
  };

  // Handle template selection
  const handleTemplateChange = (templateKey) => {
    setSelectedTemplate(templateKey);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl ${
        isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📧</div>
            <div>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
                Compose Email
              </h2>
              {leadData && (
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  To: {leadData.name} {leadData.company && `at ${leadData.company}`}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-600">⚠️</span>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Template Selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Email Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className={`w-full p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-200' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            >
              {Object.entries(emailTemplates).map(([key, template]) => (
                <option key={key} value={key}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Email Form */}
          <div className="grid grid-cols-1 gap-4">
            {/* To Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                To
              </label>
              <input
                type="email"
                value={emailData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="recipient@example.com"
                className={`w-full p-3 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required
              />
            </div>

            {/* Subject Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Subject
              </label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Email subject..."
                className={`w-full p-3 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required
              />
            </div>

            {/* Body Field */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Message
              </label>
              <textarea
                value={emailData.body}
                onChange={(e) => handleInputChange('body', e.target.value)}
                placeholder="Write your email message..."
                rows={12}
                className={`w-full p-3 rounded-lg border resize-none ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSendViaWindows}
              disabled={!emailData.to || !emailData.subject || !emailData.body || isLoading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg"
            >
              <span>🖥️</span>
              <span>Open in Windows Email</span>
            </button>

            <button
              onClick={handleCopyToClipboard}
              disabled={!emailData.body}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg border transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>📋</span>
              <span>Copy to Clipboard</span>
            </button>

            <button
              onClick={onClose}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                isDarkMode 
                  ? 'border-gray-600 text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>Cancel</span>
            </button>
          </div>

          {/* Tips */}
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">💡</span>
              <div className={`text-sm ${
                isDarkMode ? 'text-blue-200' : 'text-blue-800'
              }`}>
                <strong>Tips:</strong>
                <ul className="mt-2 space-y-1 ml-4">
                  <li>• Use templates to save time and maintain consistency</li>
                  <li>• Personalization fields are automatically filled from lead data</li>
                  <li>• "Open in Windows Email" will launch your default email client (Outlook, Mail, etc.)</li>
                  <li>• Copy to clipboard if you prefer to paste into another application</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;