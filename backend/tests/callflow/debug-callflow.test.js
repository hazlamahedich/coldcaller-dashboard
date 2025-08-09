const request = require('supertest');
const app = require('../../src/server.js');
const TwilioService = require('../../src/services/twilioService');
const SIPManager = require('../../src/services/sipManager');

describe('Debug Call Flow - Step by Step Analysis', () => {
  const testPhoneNumber = '+1234567890';
  let originalConsoleLog;
  let capturedLogs = [];

  beforeAll(() => {
    // Capture console logs for analysis
    originalConsoleLog = console.log;
    console.log = (...args) => {
      capturedLogs.push(args.join(' '));
      originalConsoleLog(...args);
    };
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    capturedLogs = [];
  });

  describe('Step 1: Environment Variable Validation', () => {
    it('should check all required Twilio environment variables', () => {
      const requiredEnvVars = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_PHONE_NUMBER',
        'TWILIO_API_KEY',
        'TWILIO_API_SECRET',
        'TWILIO_TWIML_APP_SID'
      ];

      const missingVars = [];
      requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
          missingVars.push(varName);
        }
        console.log(`${varName}: ${process.env[varName] ? '✓ SET' : '✗ MISSING'}`);
      });

      console.log(`Environment Check: ${missingVars.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
      if (missingVars.length > 0) {
        console.log(`Missing variables: ${missingVars.join(', ')}`);
      }
    });

    it('should validate webhook URLs', () => {
      const webhookUrls = [
        'TWILIO_VOICE_WEBHOOK_URL',
        'TWILIO_STATUS_WEBHOOK_URL',
        'TWILIO_RECORDING_WEBHOOK_URL'
      ];

      webhookUrls.forEach(urlVar => {
        const url = process.env[urlVar];
        console.log(`${urlVar}: ${url || 'NOT SET'}`);
        
        if (url) {
          try {
            new URL(url);
            console.log(`  ✓ Valid URL format`);
          } catch (e) {
            console.log(`  ✗ Invalid URL format: ${e.message}`);
          }
        }
      });
    });
  });

  describe('Step 2: Twilio Service Initialization', () => {
    it('should test Twilio service initialization', async () => {
      console.log('🔍 Testing Twilio Service Initialization...');
      
      try {
        const healthCheck = await TwilioService.healthCheck();
        console.log('Twilio Health Check Result:', JSON.stringify(healthCheck, null, 2));
        
        if (healthCheck.status === 'healthy') {
          console.log('✅ Twilio service initialized successfully');
        } else {
          console.log('❌ Twilio service initialization failed:', healthCheck.error);
        }
      } catch (error) {
        console.log('❌ Twilio health check failed:', error.message);
      }
    });

    it('should test access token generation', async () => {
      console.log('🔍 Testing Access Token Generation...');
      
      try {
        const tokenData = TwilioService.getClientConfig('test-user-123');
        console.log('Access Token Generated:', {
          hasAccessToken: !!tokenData.accessToken,
          identity: tokenData.identity,
          expires: tokenData.expires,
          config: tokenData.config
        });
        
        if (tokenData.accessToken) {
          console.log('✅ Access token generation successful');
        } else {
          console.log('❌ Access token generation failed');
        }
      } catch (error) {
        console.log('❌ Access token generation error:', error.message);
      }
    });
  });

  describe('Step 3: Phone Number Validation Pipeline', () => {
    const testNumbers = [
      '+1234567890',
      '1234567890', 
      '+44207123456789',
      '(555) 123-4567',
      'invalid123'
    ];

    testNumbers.forEach(phoneNumber => {
      it(`should validate phone number: ${phoneNumber}`, async () => {
        console.log(`🔍 Testing phone number validation for: ${phoneNumber}`);
        
        try {
          const validation = await TwilioService.validatePhoneNumber(phoneNumber);
          console.log(`Validation result:`, JSON.stringify(validation, null, 2));
          
          if (validation.success && validation.valid) {
            console.log(`✅ Phone number ${phoneNumber} is valid`);
          } else {
            console.log(`❌ Phone number ${phoneNumber} is invalid: ${validation.error}`);
          }
        } catch (error) {
          console.log(`❌ Validation error for ${phoneNumber}:`, error.message);
        }
      });
    });
  });

  describe('Step 4: API Endpoint Testing with Detailed Logging', () => {
    it('should test /api/calls/start endpoint with detailed logging', async () => {
      console.log('🔍 Testing /api/calls/start endpoint...');
      
      const payload = {
        phoneNumber: testPhoneNumber,
        leadId: 1,
        agentId: 'test-agent',
        campaignId: 'test-campaign'
      };

      console.log('Request payload:', JSON.stringify(payload, null, 2));

      try {
        const response = await request(app)
          .post('/api/calls/start')
          .send(payload);

        console.log('Response status:', response.status);
        console.log('Response headers:', JSON.stringify(response.headers, null, 2));
        console.log('Response body:', JSON.stringify(response.body, null, 2));

        if (response.status === 201) {
          console.log('✅ Call start endpoint successful');
          
          // Log call details
          const callData = response.body.data.call;
          console.log('Created call details:', {
            id: callData.id,
            status: callData.status,
            phone: callData.phone,
            sipResult: response.body.data.sip
          });
        } else {
          console.log('❌ Call start endpoint failed');
          console.log('Error details:', response.body.error);
        }
      } catch (error) {
        console.log('❌ Request failed:', error.message);
      }
    });

    it('should test SIP manager call flow', async () => {
      console.log('🔍 Testing SIP Manager call initiation...');
      
      try {
        const callData = {
          id: 'test-call-123',
          phoneNumber: testPhoneNumber
        };

        const sipResult = await SIPManager.initiateCall(callData);
        console.log('SIP Manager result:', JSON.stringify(sipResult, null, 2));

        if (sipResult.success) {
          console.log('✅ SIP call initiation successful');
          
          // Check call session
          const activeCalls = SIPManager.getActiveCalls();
          console.log('Active calls:', activeCalls.length);
          
          // Test ending the call
          setTimeout(async () => {
            const endResult = await SIPManager.endCall(callData.id);
            console.log('SIP call end result:', JSON.stringify(endResult, null, 2));
          }, 1000);
        } else {
          console.log('❌ SIP call initiation failed:', sipResult.error);
        }
      } catch (error) {
        console.log('❌ SIP Manager error:', error.message);
      }
    });
  });

  describe('Step 5: Twilio API Call Testing', () => {
    it('should test direct Twilio API call', async () => {
      console.log('🔍 Testing direct Twilio API call...');
      
      // Skip if no Twilio credentials
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log('⚠️ Skipping Twilio API test - credentials not configured');
        return;
      }

      try {
        const callOptions = {
          from: process.env.TWILIO_PHONE_NUMBER,
          to: testPhoneNumber,
          record: false,
          timeout: 30
        };

        console.log('Making Twilio call with options:', JSON.stringify(callOptions, null, 2));

        const callResult = await TwilioService.makeCall(
          callOptions.from,
          callOptions.to,
          { 
            record: callOptions.record,
            timeout: callOptions.timeout,
            // Add webhook URL for testing
            url: process.env.TWILIO_VOICE_WEBHOOK_URL,
            statusCallback: process.env.TWILIO_STATUS_WEBHOOK_URL
          }
        );

        console.log('Twilio call result:', JSON.stringify(callResult, null, 2));

        if (callResult.success) {
          console.log('✅ Twilio API call successful');
          console.log('Call SID:', callResult.callSid);
          console.log('Call status:', callResult.status);
          
          // Monitor call status for a few seconds
          if (callResult.callSid) {
            setTimeout(async () => {
              try {
                const callDetails = await TwilioService.getCall(callResult.callSid);
                console.log('Call status update:', JSON.stringify(callDetails, null, 2));
              } catch (e) {
                console.log('Error getting call details:', e.message);
              }
            }, 3000);
          }
        } else {
          console.log('❌ Twilio API call failed');
          console.log('Error:', callResult.error);
          console.log('Code:', callResult.code);
        }
      } catch (error) {
        console.log('❌ Twilio API call exception:', error.message);
        console.log('Stack:', error.stack);
      }
    });
  });

  describe('Step 6: Webhook Testing', () => {
    it('should test TwiML generation for voice webhook', async () => {
      console.log('🔍 Testing TwiML generation...');
      
      const webhookPayload = {
        CallSid: 'CA123456789',
        From: testPhoneNumber,
        To: process.env.TWILIO_PHONE_NUMBER,
        Direction: 'outbound'
      };

      console.log('Webhook payload:', JSON.stringify(webhookPayload, null, 2));

      try {
        const response = await request(app)
          .post('/api/twilio/voice')
          .send(webhookPayload);

        console.log('TwiML response status:', response.status);
        console.log('TwiML response headers:', JSON.stringify(response.headers, null, 2));
        console.log('TwiML response body:');
        console.log(response.text);

        if (response.status === 200 && response.text.includes('<Response>')) {
          console.log('✅ TwiML generation successful');
        } else {
          console.log('❌ TwiML generation failed');
        }
      } catch (error) {
        console.log('❌ TwiML generation error:', error.message);
      }
    });
  });

  describe('Step 7: Integration Flow Test', () => {
    it('should test complete call flow integration', async () => {
      console.log('🔍 Testing complete call flow integration...');
      
      let callId;
      
      try {
        // Step 1: Start call via API
        console.log('Step 1: Starting call via API...');
        const startResponse = await request(app)
          .post('/api/calls/start')
          .send({
            phoneNumber: testPhoneNumber,
            leadId: 1,
            agentId: 'integration-test'
          });

        if (startResponse.status !== 201) {
          throw new Error(`Call start failed: ${JSON.stringify(startResponse.body)}`);
        }

        callId = startResponse.body.data.call.id;
        console.log('✅ Call started successfully, ID:', callId);

        // Step 2: Update call status
        console.log('Step 2: Updating call status...');
        const updateResponse = await request(app)
          .put(`/api/calls/${callId}/update`)
          .send({
            status: 'connected',
            quality: { latency: 45, jitter: 8, packetLoss: 0.2 }
          });

        if (updateResponse.status !== 200) {
          throw new Error(`Call update failed: ${JSON.stringify(updateResponse.body)}`);
        }
        console.log('✅ Call status updated successfully');

        // Step 3: End call
        console.log('Step 3: Ending call...');
        const endResponse = await request(app)
          .post(`/api/calls/${callId}/end`)
          .send({
            outcome: 'Interested',
            disposition: 'completed',
            notes: 'Integration test completed successfully'
          });

        if (endResponse.status !== 200) {
          throw new Error(`Call end failed: ${JSON.stringify(endResponse.body)}`);
        }
        console.log('✅ Call ended successfully');

        console.log('🎉 Complete call flow integration test PASSED');

      } catch (error) {
        console.log('❌ Integration test failed:', error.message);
        throw error;
      }
    });
  });

  describe('Step 8: Error Scenarios and Edge Cases', () => {
    it('should identify potential failure points', async () => {
      console.log('🔍 Testing potential failure points...');
      
      const failureTests = [
        {
          name: 'Missing environment variables',
          test: () => {
            const originalSid = process.env.TWILIO_ACCOUNT_SID;
            delete process.env.TWILIO_ACCOUNT_SID;
            
            try {
              const service = require('../../src/services/twilioService');
              console.log('Service status without credentials:', service.client ? 'initialized' : 'not initialized');
            } finally {
              process.env.TWILIO_ACCOUNT_SID = originalSid;
            }
          }
        },
        {
          name: 'Invalid phone number formats',
          test: async () => {
            const invalidNumbers = ['abc', '123', '+', '12345678901234567890'];
            for (const num of invalidNumbers) {
              try {
                const response = await request(app)
                  .post('/api/calls/start')
                  .send({ phoneNumber: num });
                console.log(`Invalid number ${num} - Status: ${response.status}`);
              } catch (e) {
                console.log(`Invalid number ${num} - Error: ${e.message}`);
              }
            }
          }
        },
        {
          name: 'Network connectivity issues',
          test: () => {
            console.log('Network connectivity test would require actual network mocking');
            // This would test ECONNREFUSED, ENOTFOUND, timeout scenarios
          }
        }
      ];

      for (const failureTest of failureTests) {
        try {
          console.log(`Testing: ${failureTest.name}`);
          await failureTest.test();
          console.log(`✅ ${failureTest.name} test completed`);
        } catch (error) {
          console.log(`❌ ${failureTest.name} test failed:`, error.message);
        }
      }
    });
  });

  afterEach(() => {
    console.log('📋 Captured logs for this test:');
    capturedLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`);
    });
    console.log('---');
  });
});