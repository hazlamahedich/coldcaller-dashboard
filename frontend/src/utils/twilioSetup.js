/**
 * Twilio Setup Utilities
 * Helper functions for Twilio integration configuration and validation
 */

export const validateTwilioConfiguration = () => {
  const errors = [];
  const warnings = [];
  
  // Check environment variables
  const requiredEnvVars = [
    'REACT_APP_API_URL'
  ];
  
  const optionalEnvVars = [
    'REACT_APP_ENABLE_TWILIO_VOICE',
    'REACT_APP_TWILIO_DEBUG'
  ];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Check optional variables and provide recommendations
  if (process.env.REACT_APP_ENABLE_TWILIO_VOICE !== 'true') {
    warnings.push('Twilio Voice is not enabled. Set REACT_APP_ENABLE_TWILIO_VOICE=true to enable.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    configuration: {
      apiUrl: process.env.REACT_APP_API_URL,
      twilioEnabled: process.env.REACT_APP_ENABLE_TWILIO_VOICE === 'true',
      debugEnabled: process.env.REACT_APP_TWILIO_DEBUG === 'true'
    }
  };
};

export const checkTwilioBackendHealth = async () => {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/twilio/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const health = await response.json();
    
    return {
      success: true,
      health,
      message: 'Twilio backend is healthy'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to connect to Twilio backend'
    };
  }
};

export const testTwilioToken = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/twilio/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        identity: `test-user-${Date.now()}`
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const tokenData = await response.json();
    
    if (!tokenData.success) {
      throw new Error(tokenData.message || 'Failed to generate token');
    }

    return {
      success: true,
      tokenData,
      message: 'Twilio token generated successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to generate Twilio token'
    };
  }
};

export const formatPhoneNumber = (phoneNumber, countryCode = 'US') => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format based on country code
  if (countryCode === 'US') {
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
  }
  
  // For international numbers, ensure it starts with +
  if (!cleaned.startsWith('+') && cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  return phoneNumber; // Return original if can't format
};

export const validatePhoneNumber = (phoneNumber, countryCode = 'US') => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (countryCode === 'US') {
    // US numbers should be 10 digits (without country code) or 11 digits (with country code)
    return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
  }
  
  // International numbers should be between 7 and 15 digits
  return cleaned.length >= 7 && cleaned.length <= 15;
};

export const getTwilioErrorMessage = (error) => {
  // Common Twilio error codes and user-friendly messages
  const errorMessages = {
    '11200': 'Invalid phone number format. Please check the number and try again.',
    '13224': 'Unable to create call. Please check your account balance and try again.',
    '13225': 'Phone number is not reachable. Please try a different number.',
    '20003': 'Authentication failed. Please check your credentials.',
    '20404': 'The phone number was not found or is invalid.',
    '21211': 'Invalid phone number format.',
    '21212': 'Phone number is not a valid mobile number.',
    '21601': 'Phone number is not verified for trial account.',
    '21602': 'Message body is required.',
    '21603': 'The message cannot be sent to this number.',
    '21604': 'Max send rate exceeded.',
    '30001': 'Queue overflow. Please try again later.',
    '30002': 'Account suspended.',
    '30003': 'Unreachable destination.',
    '30004': 'Message blocked.',
    '30005': 'Unknown destination.',
    '30006': 'Landline or unreachable carrier.',
    '30007': 'Carrier violation.',
    '30008': 'Unknown error.',
    '53000': 'Capability token auth failed.',
    '53001': 'Invalid capability token.',
    '53002': 'Expired capability token.',
    '53003': 'Invalid signature.',
    '53004': 'Invalid capability token.',
    '53005': 'Invalid capability token.'
  };

  // Extract error code if present
  const errorCode = error.code || (error.message && error.message.match(/\d+/)?.[0]);
  
  if (errorCode && errorMessages[errorCode]) {
    return {
      message: errorMessages[errorCode],
      code: errorCode,
      originalMessage: error.message
    };
  }

  // Return generic error message with original details
  return {
    message: error.message || 'An unexpected error occurred. Please try again.',
    code: errorCode || 'unknown',
    originalMessage: error.message
  };
};

export const generateSetupInstructions = (validationResult) => {
  const instructions = [];
  
  if (!validationResult.isValid) {
    instructions.push({
      type: 'error',
      title: 'Configuration Issues',
      items: validationResult.errors
    });
  }

  if (validationResult.warnings.length > 0) {
    instructions.push({
      type: 'warning',
      title: 'Recommendations',
      items: validationResult.warnings
    });
  }

  // Add setup steps
  instructions.push({
    type: 'info',
    title: 'Quick Setup Steps',
    items: [
      '1. Sign up for a Twilio account at https://www.twilio.com/',
      '2. Get your Account SID and Auth Token from the Twilio Console',
      '3. Create API credentials (recommended for production)',
      '4. Purchase a Twilio phone number with Voice capabilities',
      '5. Configure your .env file with Twilio credentials',
      '6. Set up ngrok for development webhook testing',
      '7. Create a TwiML application in the Twilio Console',
      '8. Update webhook URLs in your Twilio configuration',
      '9. Test your setup using the health check endpoint',
      '10. Start making calls!'
    ]
  });

  return instructions;
};

export const copyToClipboard = (text, callback) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      callback && callback(true);
    }).catch(() => {
      callback && callback(false);
    });
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      callback && callback(successful);
    } catch (err) {
      callback && callback(false);
    }
    document.body.removeChild(textArea);
  }
};

// Development helpers
export const developmentHelpers = {
  // Generate sample environment configuration
  generateEnvTemplate: () => {
    return `# Twilio Configuration for ColdCaller Dashboard
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_API_KEY=your-twilio-api-key
TWILIO_API_SECRET=your-twilio-api-secret
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_TWIML_APP_SID=your-twiml-app-sid

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENABLE_TWILIO_VOICE=true
REACT_APP_TWILIO_DEBUG=true

# Webhook URLs (update with your domain or ngrok URL)
TWILIO_VOICE_WEBHOOK_URL=https://your-domain.com/api/twilio/voice
TWILIO_STATUS_WEBHOOK_URL=https://your-domain.com/api/twilio/status
TWILIO_RECORDING_WEBHOOK_URL=https://your-domain.com/api/twilio/recording`;
  },

  // Generate ngrok command
  generateNgrokCommand: (port = 3001) => {
    return `ngrok http ${port}`;
  },

  // Generate webhook URLs for ngrok
  generateWebhookUrls: (ngrokUrl) => {
    return {
      voice: `${ngrokUrl}/api/twilio/voice`,
      status: `${ngrokUrl}/api/twilio/status`,
      recording: `${ngrokUrl}/api/twilio/recording`
    };
  }
};