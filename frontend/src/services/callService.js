/**
 * Call Service - Handles VOIP calls with recording preferences
 * Integrates frontend recording settings with backend Twilio API
 */

import { api } from './api';

class CallService {
  constructor() {
    this.baseUrl = '/twilio';
  }

  /**
   * Make an outbound call with recording preferences
   * @param {string} phoneNumber - Target phone number
   * @param {Object} options - Call options
   * @param {Object} recordingSettings - User's recording preferences
   * @returns {Promise<Object>} Call result
   */
  async makeCall(phoneNumber, options = {}, recordingSettings = {}) {
    try {
      const {
        from = null,
        leadId = null
      } = options;

      console.log('📞 Making call with recording settings:', {
        phoneNumber,
        recordingSettings,
        leadId
      });

      const callData = {
        to: phoneNumber,
        from: from,
        record: recordingSettings.autoRecord !== false, // Default to true
        recordingSettings: {
          autoTranscribe: recordingSettings.autoTranscribe || false,
          speechAnalytics: recordingSettings.speechAnalytics || false,
          recordInbound: recordingSettings.recordInbound !== false,
          recordOutbound: recordingSettings.recordOutbound !== false,
          direction: 'outbound'
        },
        leadId: leadId
      };

      const response = await api.post(`${this.baseUrl}/call`, callData, {}, false);
      
      console.log('✅ Call initiated successfully:', {
        callSid: response.data?.callSid,
        status: response.data?.status,
        recordingEnabled: callData.record
      });

      return response;
    } catch (error) {
      console.error('❌ Call initiation failed:', error);
      throw new Error(
        error.response?.data?.message || 
        'Failed to initiate call. Please check your connection and try again.'
      );
    }
  }

  /**
   * Get call details
   * @param {string} callSid - Twilio call SID
   * @returns {Promise<Object>} Call details
   */
  async getCallDetails(callSid) {
    try {
      const response = await api.get(`${this.baseUrl}/call/${callSid}`);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch call details:', error);
      throw new Error('Failed to fetch call details');
    }
  }

  /**
   * Update call (hang up, mute, etc.)
   * @param {string} callSid - Twilio call SID
   * @param {Object} updateData - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateCall(callSid, updateData) {
    try {
      const response = await api.put(`${this.baseUrl}/call/${callSid}`, updateData);
      return response;
    } catch (error) {
      console.error('❌ Failed to update call:', error);
      throw new Error('Failed to update call');
    }
  }

  /**
   * Get call recordings
   * @param {string} callSid - Twilio call SID
   * @returns {Promise<Object>} Recordings list
   */
  async getRecordings(callSid) {
    try {
      const response = await api.get(`${this.baseUrl}/call/${callSid}/recordings`);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch recordings:', error);
      throw new Error('Failed to fetch recordings');
    }
  }

  /**
   * Validate phone number
   * @param {string} phoneNumber - Phone number to validate
   * @param {string} countryCode - Country code (default: 'US')
   * @returns {Promise<Object>} Validation result
   */
  async validatePhoneNumber(phoneNumber, countryCode = 'US') {
    try {
      const response = await api.post(`${this.baseUrl}/validate-phone`, {
        phoneNumber,
        countryCode
      });
      return response;
    } catch (error) {
      console.error('❌ Phone validation failed:', error);
      return {
        success: false,
        valid: false,
        error: 'Failed to validate phone number'
      };
    }
  }

  /**
   * Get Twilio access token for VOIP calls
   * @param {string} identity - User identity
   * @returns {Promise<Object>} Token data
   */
  async getAccessToken(identity = null) {
    try {
      const response = await api.post(`${this.baseUrl}/token`, {
        identity: identity
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      throw new Error('Failed to get Twilio access token');
    }
  }

  /**
   * Check Twilio service health
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      const response = await api.get(`${this.baseUrl}/health`);
      return response;
    } catch (error) {
      console.error('❌ Twilio health check failed:', error);
      return {
        status: 'unhealthy',
        service: 'Twilio Voice',
        message: 'Service unavailable'
      };
    }
  }

  /**
   * Format phone number for display
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return phoneNumber; // Return as-is if format is unclear
  }

  /**
   * Convert phone number to E.164 format
   * @param {string} phoneNumber - Raw phone number
   * @param {string} countryCode - Country code (default: 'US')
   * @returns {string} E.164 formatted number
   */
  toE164Format(phoneNumber, countryCode = 'US') {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (countryCode === 'US') {
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
      }
    }
    
    // Already in E.164 format
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // Default: prepend +1 for US numbers
    return `+1${cleaned}`;
  }
}

// Export singleton instance
const callService = new CallService();
export default callService;
export { CallService };