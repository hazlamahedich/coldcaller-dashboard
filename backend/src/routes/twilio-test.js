const express = require('express');
const router = express.Router();
const TwilioService = require('../services/twilioService');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

/**
 * TEST ENDPOINTS - NO AUTHENTICATION REQUIRED
 * These endpoints bypass authentication for call testing
 */

/**
 * Get test Twilio access token - NO AUTH REQUIRED
 * POST /api/twilio-test/token
 */
router.post('/token', async (req, res) => {
  try {
    const { identity } = req.body;
    const testIdentity = identity || `test-user-${Date.now()}`;

    console.log('🧪 Generating test token for:', testIdentity);

    const tokenData = TwilioService.getClientConfig(testIdentity);
    
    res.json({
      success: true,
      data: tokenData,
      message: 'Test token generated successfully - no authentication required'
    });
  } catch (error) {
    console.error('❌ Test token generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate test access token',
      error: error.message
    });
  }
});

/**
 * Make test outbound call - NO AUTH REQUIRED
 * POST /api/twilio-test/call
 */
router.post('/call', async (req, res) => {
  try {
    const { to, from, record = false, identity = 'test-caller' } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    console.log('🧪 Initiating test call:', { to, from, identity });

    // Format phone number
    const formattedTo = TwilioService.formatPhoneNumber ? 
      TwilioService.formatPhoneNumber(to) : 
      (to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const callResult = await TwilioService.makeCall(from, formattedTo, {
      record: record,
      twimlUrl: `${baseUrl}/api/twilio-test/voice?identity=${identity}`,
      statusCallback: `${baseUrl}/api/twilio-test/status?identity=${identity}`,
      recordingStatusCallback: `${baseUrl}/api/twilio-test/recording?identity=${identity}`
    });

    if (callResult.success) {
      console.log('📞 Test call initiated successfully:', {
        callSid: callResult.callSid,
        from: callResult.from,
        to: callResult.to,
        status: callResult.status
      });
    }

    res.json({
      ...callResult,
      testMode: true,
      webhookUrls: {
        voice: `${baseUrl}/api/twilio-test/voice?identity=${identity}`,
        status: `${baseUrl}/api/twilio-test/status?identity=${identity}`,
        recording: `${baseUrl}/api/twilio-test/recording?identity=${identity}`
      }
    });
  } catch (error) {
    console.error('❌ Test outbound call failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate test call',
      error: error.message,
      testMode: true
    });
  }
});

/**
 * Test Voice webhook - handles TwiML generation
 * POST /api/twilio-test/voice
 */
router.post('/voice', (req, res) => {
  try {
    const { CallSid, From, To, Direction } = req.body;
    const identity = req.query.identity || 'test-user';
    
    console.log('🎵 Test Voice Webhook:', {
      callSid: CallSid,
      from: From,
      to: To,
      direction: Direction,
      identity: identity
    });

    const twiml = new VoiceResponse();

    if (Direction === 'inbound') {
      // Handle incoming calls
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Hello! This is a test call to ColdCaller. You are connected to the test system.');
      
      // Connect to the test client
      const dial = twiml.dial({
        timeout: 30,
        record: 'record-from-ringing'
      });
      dial.client(identity);
    } else {
      // Handle outbound calls - this is what connects the call
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Test call connecting. Please wait.');
      
      const dial = twiml.dial({
        timeout: 60,
        record: 'record-from-answer',
        callerId: From
      });
      
      // For outbound calls, dial the actual number
      dial.number(To);
    }

    const twimlResponse = twiml.toString();
    console.log('📋 Generated TwiML:', twimlResponse);
    
    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('❌ Test Voice webhook error:', error);
    
    // Return fallback TwiML
    const errorTwiml = new VoiceResponse();
    errorTwiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Test system error. Call will end now.');
    errorTwiml.hangup();
    
    res.type('text/xml');
    res.send(errorTwiml.toString());
  }
});

/**
 * Test Status webhook - handles call status updates
 * POST /api/twilio-test/status
 */
router.post('/status', (req, res) => {
  try {
    const { CallSid, CallStatus, Direction, From, To, Duration } = req.body;
    const identity = req.query.identity || 'test-user';

    const statusUpdate = {
      callSid: CallSid,
      status: CallStatus,
      direction: Direction,
      from: From,
      to: To,
      duration: Duration ? parseInt(Duration) : null,
      identity: identity,
      timestamp: new Date().toISOString(),
      testMode: true
    };

    console.log('📊 Test Status Update:', statusUpdate);

    // Store in simple memory for real-time updates
    if (!global.testCallStatus) {
      global.testCallStatus = new Map();
    }
    global.testCallStatus.set(CallSid, statusUpdate);

    // Broadcast to any listening WebSocket connections
    if (global.wsManager) {
      global.wsManager.broadcast('test-call-status', statusUpdate);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Test Status webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
});

/**
 * Test Recording webhook
 * POST /api/twilio-test/recording
 */
router.post('/recording', (req, res) => {
  try {
    const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;
    const identity = req.query.identity || 'test-user';
    
    const recordingData = {
      callSid: CallSid,
      recordingSid: RecordingSid,
      url: RecordingUrl,
      duration: parseInt(RecordingDuration),
      identity: identity,
      provider: 'twilio',
      testMode: true,
      timestamp: new Date().toISOString()
    };

    console.log('🎙️ Test Recording completed:', recordingData);

    // Store recording info
    if (!global.testCallRecordings) {
      global.testCallRecordings = new Map();
    }
    global.testCallRecordings.set(RecordingSid, recordingData);

    // Broadcast to WebSocket connections
    if (global.wsManager) {
      global.wsManager.broadcast('test-recording-ready', recordingData);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Test Recording webhook error:', error);
    res.status(200).send('OK');
  }
});

/**
 * Get test call status - NO AUTH REQUIRED
 * GET /api/twilio-test/call/:callSid/status
 */
router.get('/call/:callSid/status', (req, res) => {
  try {
    const { callSid } = req.params;
    
    // Check local memory first
    if (global.testCallStatus && global.testCallStatus.has(callSid)) {
      const status = global.testCallStatus.get(callSid);
      return res.json({
        success: true,
        data: status,
        source: 'webhook_memory'
      });
    }

    // Fallback to Twilio API
    TwilioService.getCall(callSid)
      .then(result => {
        res.json({
          ...result,
          testMode: true,
          source: 'twilio_api'
        });
      })
      .catch(error => {
        res.status(500).json({
          success: false,
          message: 'Failed to get call status',
          error: error.message,
          testMode: true
        });
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get test call status',
      error: error.message,
      testMode: true
    });
  }
});

/**
 * Test phone number validation - NO AUTH REQUIRED
 * POST /api/twilio-test/validate-phone
 */
router.post('/validate-phone', async (req, res) => {
  try {
    const { phoneNumber, countryCode = 'US' } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    console.log('🧪 Validating test phone number:', phoneNumber);

    const validation = await TwilioService.validatePhoneNumber(phoneNumber, countryCode);
    res.json({
      ...validation,
      testMode: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate phone number',
      error: error.message,
      testMode: true
    });
  }
});

/**
 * Test health check - NO AUTH REQUIRED
 * GET /api/twilio-test/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await TwilioService.healthCheck();
    res.json({
      service: 'Twilio Voice Test API',
      ...health,
      testMode: true,
      endpoints: {
        token: '/api/twilio-test/token',
        call: '/api/twilio-test/call',
        voice: '/api/twilio-test/voice',
        status: '/api/twilio-test/status',
        recording: '/api/twilio-test/recording'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      service: 'Twilio Voice Test API',
      status: 'error',
      message: error.message,
      testMode: true,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * List all test call statuses - NO AUTH REQUIRED
 * GET /api/twilio-test/calls
 */
router.get('/calls', (req, res) => {
  try {
    const calls = [];
    
    if (global.testCallStatus) {
      global.testCallStatus.forEach((status, callSid) => {
        calls.push({ callSid, ...status });
      });
    }
    
    res.json({
      success: true,
      data: calls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      count: calls.length,
      testMode: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get test calls',
      error: error.message,
      testMode: true
    });
  }
});

module.exports = router;