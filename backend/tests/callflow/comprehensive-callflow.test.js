const request = require('supertest');
const app = require('../../src/server.js');
const TwilioService = require('../../src/services/twilioService');

describe('VOIP Call Flow Validation Tests', () => {
  let mockTwilioService;

  beforeEach(() => {
    // Mock Twilio service methods
    mockTwilioService = {
      makeCall: jest.fn(),
      validatePhoneNumber: jest.fn(),
      getCall: jest.fn(),
      healthCheck: jest.fn(),
      generateAccessToken: jest.fn(),
      getClientConfig: jest.fn()
    };

    // Replace TwilioService methods with mocks
    Object.keys(mockTwilioService).forEach(method => {
      TwilioService[method] = mockTwilioService[method];
    });
  });

  describe('1. API Endpoint /api/calls/start Validation', () => {
    const validCallPayload = {
      phoneNumber: '+1234567890',
      leadId: 1,
      agentId: 'agent-001',
      campaignId: 'campaign-001'
    };

    it('should accept valid phone number formats', async () => {
      const response = await request(app)
        .post('/api/calls/start')
        .send(validCallPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.call).toBeDefined();
      expect(response.body.data.call.status).toBe('connecting');
    });

    it('should reject invalid phone number formats', async () => {
      const invalidPhonePayload = {
        ...validCallPayload,
        phoneNumber: '123' // Too short
      };

      const response = await request(app)
        .post('/api/calls/start')
        .send(invalidPhonePayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle international phone numbers', async () => {
      const internationalNumbers = [
        '+44207123456789', // UK
        '+49301234567', // Germany
        '+33123456789', // France
        '+8613812345678' // China
      ];

      for (const phoneNumber of internationalNumbers) {
        const response = await request(app)
          .post('/api/calls/start')
          .send({ ...validCallPayload, phoneNumber })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.call.phone).toBe(phoneNumber);
      }
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/calls/start')
        .send({}) // Empty payload
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Phone number is required');
    });

    it('should validate lead existence', async () => {
      const invalidLeadPayload = {
        ...validCallPayload,
        leadId: 99999 // Non-existent lead
      };

      const response = await request(app)
        .post('/api/calls/start')
        .send(invalidLeadPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('2. SIP Manager Integration Tests', () => {
    it('should initialize SIP call properly', async () => {
      const response = await request(app)
        .post('/api/calls/start')
        .send(validCallPayload)
        .expect(201);

      expect(response.body.data.sip).toBeDefined();
      expect(response.body.data.sip.success).toBe(true);
      expect(response.body.data.sip.callId).toBeDefined();
    });

    it('should handle SIP registration failures', async () => {
      // Mock SIP registration failure
      const SIPManager = require('../../src/services/sipManager');
      const originalInitiate = SIPManager.initiateCall;
      
      SIPManager.initiateCall = jest.fn().mockResolvedValue({
        success: false,
        error: 'SIP not registered'
      });

      const response = await request(app)
        .post('/api/calls/start')
        .send(validCallPayload)
        .expect(201);

      expect(response.body.data.call.status).toBe('failed');
      expect(response.body.data.call.notes).toContain('SIP Error');

      // Restore original method
      SIPManager.initiateCall = originalInitiate;
    });
  });

  describe('3. Twilio Integration Validation', () => {
    beforeEach(() => {
      // Set up mock Twilio environment variables
      process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';
      process.env.TWILIO_API_KEY = 'SK123456789';
      process.env.TWILIO_API_SECRET = 'test_api_secret';
    });

    it('should validate Twilio service health', async () => {
      mockTwilioService.healthCheck.mockResolvedValue({
        status: 'healthy',
        accountSid: 'AC123456789'
      });

      const response = await request(app)
        .get('/api/twilio/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.accountSid).toBeDefined();
    });

    it('should make Twilio call with proper parameters', async () => {
      mockTwilioService.validatePhoneNumber.mockResolvedValue({
        success: true,
        valid: true,
        phoneNumber: '+1234567890'
      });

      mockTwilioService.makeCall.mockResolvedValue({
        success: true,
        callSid: 'CA123456789',
        status: 'queued',
        from: '+15551234567',
        to: '+1234567890'
      });

      const response = await request(app)
        .post('/api/twilio/call')
        .send({
          to: '+1234567890',
          record: true
        })
        .expect(200);

      expect(mockTwilioService.makeCall).toHaveBeenCalledWith(
        undefined, // from defaults to Twilio phone number
        '+1234567890',
        expect.objectContaining({
          record: true
        })
      );

      expect(response.body.success).toBe(true);
      expect(response.body.callSid).toBeDefined();
    });

    it('should handle Twilio API failures gracefully', async () => {
      mockTwilioService.validatePhoneNumber.mockResolvedValue({
        success: true,
        valid: true
      });

      mockTwilioService.makeCall.mockResolvedValue({
        success: false,
        error: 'Invalid phone number',
        code: 21211
      });

      const response = await request(app)
        .post('/api/twilio/call')
        .send({ to: '+1234567890' })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('4. Phone Number Format Validation', () => {
    const phoneFormats = [
      // Valid formats
      { number: '+1234567890', valid: true, description: 'US format with country code' },
      { number: '1234567890', valid: true, description: 'US format without country code' },
      { number: '+44207123456789', valid: true, description: 'UK format' },
      { number: '(123) 456-7890', valid: true, description: 'US format with formatting' },
      { number: '123-456-7890', valid: true, description: 'US format with dashes' },
      { number: '123.456.7890', valid: true, description: 'US format with dots' },
      
      // Invalid formats
      { number: '123', valid: false, description: 'Too short' },
      { number: '12345678901234567', valid: false, description: 'Too long' },
      { number: 'abc123456789', valid: false, description: 'Contains letters' },
      { number: '', valid: false, description: 'Empty string' },
      { number: '+', valid: false, description: 'Just plus sign' }
    ];

    phoneFormats.forEach(({ number, valid, description }) => {
      it(`should ${valid ? 'accept' : 'reject'} ${description}: "${number}"`, async () => {
        const payload = {
          phoneNumber: number,
          leadId: 1
        };

        const expectedStatus = valid ? 201 : 400;
        const response = await request(app)
          .post('/api/calls/start')
          .send(payload)
          .expect(expectedStatus);

        expect(response.body.success).toBe(valid);
        
        if (!valid) {
          expect(response.body.error).toBeDefined();
        }
      });
    });
  });

  describe('5. TwiML Generation Tests', () => {
    it('should generate valid TwiML for outbound calls', async () => {
      const response = await request(app)
        .post('/api/twilio/voice')
        .send({
          CallSid: 'CA123456789',
          From: '+15551234567',
          To: '+1234567890',
          Direction: 'outbound'
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/xml/);
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Say>');
      expect(response.text).toContain('<Dial>');
    });

    it('should generate valid TwiML for inbound calls', async () => {
      const response = await request(app)
        .post('/api/twilio/voice')
        .send({
          CallSid: 'CA123456789',
          From: '+1234567890',
          To: '+15551234567',
          Direction: 'inbound'
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/xml/);
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Say>');
      expect(response.text).toContain('<Dial>');
    });

    it('should handle TwiML generation errors', async () => {
      // Mock TwiML generation failure
      const originalGenerateTwiML = TwilioService.generateTwiML;
      TwilioService.generateTwiML = jest.fn().mockImplementation(() => {
        throw new Error('TwiML generation failed');
      });

      const response = await request(app)
        .post('/api/twilio/voice')
        .send({
          CallSid: 'CA123456789',
          From: '+15551234567',
          To: '+1234567890',
          Direction: 'outbound'
        })
        .expect(200);

      expect(response.text).toContain('technical difficulties');
      expect(response.text).toContain('<Hangup/>');

      // Restore original method
      TwilioService.generateTwiML = originalGenerateTwiML;
    });
  });

  describe('6. Webhook Response Validation', () => {
    it('should handle status webhook updates', async () => {
      const statusPayload = {
        CallSid: 'CA123456789',
        CallStatus: 'in-progress',
        Direction: 'outbound',
        From: '+15551234567',
        To: '+1234567890',
        Duration: '45'
      };

      const response = await request(app)
        .post('/api/twilio/status')
        .send(statusPayload)
        .expect(200);

      expect(response.text).toBe('OK');
    });

    it('should handle recording webhook updates', async () => {
      const recordingPayload = {
        CallSid: 'CA123456789',
        RecordingSid: 'RE123456789',
        RecordingUrl: 'https://api.twilio.com/recordings/RE123456789',
        RecordingDuration: '120'
      };

      const response = await request(app)
        .post('/api/twilio/recording')
        .send(recordingPayload)
        .expect(200);

      expect(response.text).toBe('OK');
    });
  });

  describe('7. Error Handling and Edge Cases', () => {
    it('should handle network timeouts gracefully', async () => {
      mockTwilioService.makeCall.mockImplementation(() => {
        throw new Error('ENOTFOUND api.twilio.com');
      });

      const response = await request(app)
        .post('/api/twilio/call')
        .send({ to: '+1234567890' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to initiate call');
    });

    it('should handle rate limiting', async () => {
      mockTwilioService.makeCall.mockResolvedValue({
        success: false,
        error: 'Too Many Requests',
        code: 20429
      });

      const response = await request(app)
        .post('/api/twilio/call')
        .send({ to: '+1234567890' })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Too Many Requests');
    });

    it('should handle authentication failures', async () => {
      mockTwilioService.makeCall.mockResolvedValue({
        success: false,
        error: 'Authentication Error',
        code: 20003
      });

      const response = await request(app)
        .post('/api/twilio/call')
        .send({ to: '+1234567890' })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication Error');
    });
  });

  describe('8. Call State Management', () => {
    it('should track call status updates', async () => {
      // Start a call
      const startResponse = await request(app)
        .post('/api/calls/start')
        .send(validCallPayload)
        .expect(201);

      const callId = startResponse.body.data.call.id;

      // Update call status
      const updateResponse = await request(app)
        .put(`/api/calls/${callId}/update`)
        .send({
          status: 'connected',
          quality: {
            latency: 50,
            jitter: 10,
            packetLoss: 0.1
          }
        })
        .expect(200);

      expect(updateResponse.body.data.status).toBe('connected');
      expect(updateResponse.body.data.quality.latency).toBe(50);
    });

    it('should end calls properly', async () => {
      // Start a call
      const startResponse = await request(app)
        .post('/api/calls/start')
        .send(validCallPayload)
        .expect(201);

      const callId = startResponse.body.data.call.id;

      // End the call
      const endResponse = await request(app)
        .post(`/api/calls/${callId}/end`)
        .send({
          outcome: 'Interested',
          disposition: 'completed',
          notes: 'Customer showed interest in product'
        })
        .expect(200);

      expect(endResponse.body.data.outcome).toBe('Interested');
      expect(endResponse.body.data.disposition).toBe('completed');
    });
  });

  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });
});