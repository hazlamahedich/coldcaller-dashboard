const twilio = require('twilio');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const AccessToken = require('twilio').jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const { v4: uuidv4 } = require('uuid');

class TwilioService {
  constructor() {
    this.client = null;
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.apiKey = process.env.TWILIO_API_KEY;
    this.apiSecret = process.env.TWILIO_API_SECRET;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
    
    this.initialize();
  }

  initialize() {
    if (!this.accountSid || !this.authToken) {
      console.warn('⚠️ Twilio credentials not configured. Twilio features will be disabled.');
      return;
    }

    try {
      this.client = twilio(this.accountSid, this.authToken);
      console.log('🎯 Twilio service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Twilio service:', error);
    }
  }

  /**
   * Generate access token for Twilio Voice SDK
   */
  generateAccessToken(identity, ttl = 3600) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Twilio API key and secret are required for access tokens');
    }

    const accessToken = new AccessToken(
      this.accountSid,
      this.apiKey,
      this.apiSecret,
      { ttl: ttl, identity: identity }
    );

    // Create Voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: this.twimlAppSid,
      incomingAllow: true
    });

    accessToken.addGrant(voiceGrant);
    
    return {
      accessToken: accessToken.toJwt(),
      identity: identity,
      expires: new Date(Date.now() + ttl * 1000).toISOString()
    };
  }

  /**
   * Make outbound call
   */
  async makeCall(from, to, options = {}) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const callOptions = {
        from: from || this.phoneNumber,
        to: to,
        url: options.twimlUrl || process.env.TWILIO_VOICE_WEBHOOK_URL,
        statusCallback: options.statusCallback || process.env.TWILIO_STATUS_WEBHOOK_URL,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: options.record || false,
        timeout: options.timeout || 60,
        ...options
      };

      const call = await this.client.calls.create(callOptions);
      
      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
        startTime: call.startTime,
        price: call.price,
        priceUnit: call.priceUnit
      };
    } catch (error) {
      console.error('❌ Twilio call failed:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Generate TwiML for voice response
   */
  generateTwiML(actions = []) {
    const twiml = new VoiceResponse();

    actions.forEach(action => {
      switch (action.type) {
        case 'say':
          twiml.say(action.options || {}, action.text);
          break;
        case 'play':
          twiml.play(action.options || {}, action.url);
          break;
        case 'dial':
          const dial = twiml.dial(action.options || {});
          if (action.number) {
            dial.number(action.number);
          } else if (action.client) {
            dial.client(action.client);
          }
          break;
        case 'record':
          twiml.record(action.options || {});
          break;
        case 'gather':
          const gather = twiml.gather(action.options || {});
          if (action.say) {
            gather.say(action.say);
          }
          break;
        case 'hangup':
          twiml.hangup();
          break;
        case 'redirect':
          twiml.redirect(action.url);
          break;
        default:
          console.warn(`Unknown TwiML action: ${action.type}`);
      }
    });

    return twiml.toString();
  }

  /**
   * Get call details
   */
  async getCall(callSid) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        success: true,
        call: {
          sid: call.sid,
          status: call.status,
          direction: call.direction,
          from: call.from,
          to: call.to,
          startTime: call.startTime,
          endTime: call.endTime,
          duration: call.duration,
          price: call.price,
          priceUnit: call.priceUnit
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update call in progress
   */
  async updateCall(callSid, options) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const call = await this.client.calls(callSid).update(options);
      return {
        success: true,
        call: {
          sid: call.sid,
          status: call.status
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get call recordings
   */
  async getRecordings(callSid) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const recordings = await this.client.recordings.list({ callSid: callSid });
      return {
        success: true,
        recordings: recordings.map(recording => ({
          sid: recording.sid,
          duration: recording.duration,
          status: recording.status,
          channels: recording.channels,
          uri: recording.uri,
          price: recording.price,
          priceUnit: recording.priceUnit
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get account usage and billing
   */
  async getUsage(startDate, endDate) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const usage = await this.client.usage.records.list({
        startDate: startDate,
        endDate: endDate,
        granularity: 'daily'
      });

      return {
        success: true,
        usage: usage.map(record => ({
          category: record.category,
          description: record.description,
          count: record.count,
          countUnit: record.countUnit,
          usage: record.usage,
          usageUnit: record.usageUnit,
          price: record.price,
          priceUnit: record.priceUnit,
          startDate: record.startDate,
          endDate: record.endDate
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate phone number
   */
  async validatePhoneNumber(phoneNumber, countryCode = 'US') {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const phoneNumberInfo = await this.client.lookups.v1
        .phoneNumbers(phoneNumber)
        .fetch({ countryCode: countryCode, type: ['carrier'] });

      return {
        success: true,
        phoneNumber: phoneNumberInfo.phoneNumber,
        nationalFormat: phoneNumberInfo.nationalFormat,
        countryCode: phoneNumberInfo.countryCode,
        valid: true,
        carrier: phoneNumberInfo.carrier
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get available phone numbers for purchase
   */
  async searchPhoneNumbers(countryCode = 'US', options = {}) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const numbers = await this.client.availablePhoneNumbers(countryCode)
        .local.list({
          limit: options.limit || 20,
          areaCode: options.areaCode,
          contains: options.contains,
          smsEnabled: options.smsEnabled !== false,
          voiceEnabled: options.voiceEnabled !== false,
          mmsEnabled: options.mmsEnabled
        });

      return {
        success: true,
        phoneNumbers: numbers.map(number => ({
          phoneNumber: number.phoneNumber,
          friendlyName: number.friendlyName,
          locality: number.locality,
          region: number.region,
          capabilities: {
            voice: number.capabilities.voice,
            sms: number.capabilities.sms,
            mms: number.capabilities.mms
          }
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check for Twilio service
   */
  async healthCheck() {
    if (!this.client) {
      return {
        status: 'unavailable',
        message: 'Twilio client not initialized'
      };
    }

    try {
      const account = await this.client.api.accounts(this.accountSid).fetch();
      return {
        status: 'healthy',
        accountSid: account.sid,
        accountStatus: account.status,
        type: account.type
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phoneNumber, countryCode = 'US') {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle US numbers
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

  /**
   * Generate client configuration for frontend
   */
  getClientConfig(identity) {
    const token = this.generateAccessToken(identity);
    
    return {
      accessToken: token.accessToken,
      identity: identity,
      expires: token.expires,
      config: {
        debug: process.env.NODE_ENV === 'development',
        codecPreferences: ['opus', 'pcmu'],
        fakeLocalDTMF: true,
        enableRingingState: true,
        logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
        closeProtection: true,
        enableImprovedSignalingErrorPrecision: true
      }
    };
  }
}

module.exports = new TwilioService();