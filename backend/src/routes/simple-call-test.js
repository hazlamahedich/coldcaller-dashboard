/**
 * Simple Call Test Route - No Authentication Required
 * Quick testing endpoint to verify Twilio connectivity and call functionality
 */

const express = require('express');
const twilio = require('twilio');
const router = express.Router();

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Test Twilio Connectivity
 */
router.get('/health', async (req, res) => {
  try {
    // Test basic Twilio API connectivity
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    
    res.json({
      success: true,
      message: 'Twilio connection successful',
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type
      },
      config: {
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        twimlAppSid: process.env.TWILIO_TWIML_APP_SID,
        webhookUrl: process.env.TWILIO_VOICE_WEBHOOK_URL
      }
    });
  } catch (error) {
    console.error('Twilio health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Twilio connection failed',
      details: error.message
    });
  }
});

/**
 * Generate Access Token for Testing (No Auth)
 */
router.post('/token', async (req, res) => {
  try {
    const { identity = 'test-user' } = req.body;
    
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create access token
    const accessToken = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity }
    );

    // Create voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true
    });

    accessToken.addGrant(voiceGrant);

    res.json({
      success: true,
      token: accessToken.toJwt(),
      identity,
      config: {
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        twimlAppSid: process.env.TWILIO_TWIML_APP_SID
      }
    });
  } catch (error) {
    console.error('Token generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Token generation failed',
      details: error.message
    });
  }
});

/**
 * Make Test Call (No Auth Required)
 */
router.post('/call', async (req, res) => {
  try {
    const { to, from = process.env.TWILIO_PHONE_NUMBER, identity = 'test-user' } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number (to) is required'
      });
    }

    // Format phone number for E.164
    let formattedTo = to.replace(/[\s\-\(\)]/g, '');
    if (formattedTo.length === 10) {
      formattedTo = `+1${formattedTo}`;
    } else if (!formattedTo.startsWith('+')) {
      formattedTo = `+${formattedTo}`;
    }

    console.log(`🔄 Initiating test call from ${from} to ${formattedTo} for ${identity}`);

    // Create TwiML for the call
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Hello! This is a test call from your cold calling application. The call is working correctly.', {
      voice: 'alice',
      language: 'en-US'
    });
    
    // Add a pause and another message
    twiml.pause({ length: 1 });
    twiml.say('If you can hear this message, your Twilio integration is working properly.', {
      voice: 'alice',
      language: 'en-US'
    });

    // Create the call
    const call = await client.calls.create({
      to: formattedTo,
      from: from,
      twiml: twiml.toString(),
      record: true,
      recordingStatusCallback: `${process.env.TWILIO_RECORDING_WEBHOOK_URL || ''}/test`,
      statusCallback: `${process.env.TWILIO_STATUS_WEBHOOK_URL || ''}/test`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    console.log(`✅ Test call created successfully:`, {
      callSid: call.sid,
      to: formattedTo,
      from: from,
      status: call.status
    });

    res.json({
      success: true,
      message: 'Test call initiated successfully',
      call: {
        sid: call.sid,
        to: formattedTo,
        from: from,
        status: call.status,
        dateCreated: call.dateCreated
      },
      instructions: 'You should receive a call shortly with a test message. If you hear the message, your Twilio integration is working!'
    });

  } catch (error) {
    console.error('Test call failed:', error);
    res.status(500).json({
      success: false,
      error: 'Test call failed',
      details: error.message,
      twilioError: error.code ? {
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status
      } : null
    });
  }
});

/**
 * Get Call Status
 */
router.get('/call/:callSid', async (req, res) => {
  try {
    const { callSid } = req.params;
    
    const call = await client.calls(callSid).fetch();
    
    res.json({
      success: true,
      call: {
        sid: call.sid,
        to: call.to,
        from: call.from,
        status: call.status,
        duration: call.duration,
        dateCreated: call.dateCreated,
        dateUpdated: call.dateUpdated,
        price: call.price,
        priceUnit: call.priceUnit
      }
    });
  } catch (error) {
    console.error('Failed to fetch call status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call status',
      details: error.message
    });
  }
});

/**
 * List Recent Test Calls
 */
router.get('/calls', async (req, res) => {
  try {
    const calls = await client.calls.list({
      limit: 20,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    res.json({
      success: true,
      calls: calls.map(call => ({
        sid: call.sid,
        to: call.to,
        from: call.from,
        status: call.status,
        duration: call.duration,
        dateCreated: call.dateCreated,
        price: call.price
      }))
    });
  } catch (error) {
    console.error('Failed to fetch call list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call list',
      details: error.message
    });
  }
});

/**
 * Webhook Handlers for Test Calls
 */

// Voice webhook for TwiML App calls (if using device-to-device calling)
router.post('/voice', (req, res) => {
  console.log('📞 Voice webhook called:', req.body);
  
  const { To, From, Direction } = req.body;
  
  const twiml = new twilio.twiml.VoiceResponse();
  
  if (Direction === 'outbound') {
    // For outbound calls from the client, dial the destination
    twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      record: 'record-from-answer',
      recordingStatusCallback: `${process.env.TWILIO_RECORDING_WEBHOOK_URL || ''}/test`
    }, To);
  } else {
    // For inbound calls
    twiml.say('Hello! You have reached the cold calling application test line.', {
      voice: 'alice',
      language: 'en-US'
    });
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Status webhook
router.post('/status', (req, res) => {
  console.log('📊 Call status update:', req.body);
  
  const { CallSid, CallStatus, Duration, To, From } = req.body;
  
  // Log the status update
  console.log(`Call ${CallSid}: ${CallStatus}${Duration ? ` (${Duration}s)` : ''} - ${From} → ${To}`);
  
  res.status(200).send('OK');
});

// Recording webhook
router.post('/recording', (req, res) => {
  console.log('🎙️ Recording webhook:', req.body);
  
  const { RecordingSid, RecordingUrl, CallSid, Duration } = req.body;
  
  console.log(`Recording available for call ${CallSid}: ${RecordingUrl} (${Duration}s)`);
  
  res.status(200).send('OK');
});

// Test the updated startCall controller directly (bypassing authentication)
router.post('/start-call-test', async (req, res) => {
  try {
    console.log('🧪 Testing updated startCall controller...');
    
    const { phoneNumber, leadId } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber is required'
      });
    }

    // Import and use the startCall controller directly
    const { startCall } = require('../controllers/callsController');
    
    // Mock request/response for testing
    const mockReq = {
      body: {
        phoneNumber: phoneNumber,
        leadId: leadId || null,
        agentId: 'test-agent',
        campaignId: 'test-campaign'
      },
      ip: req.ip,
      get: (header) => req.get(header)
    };

    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      })
    };

    await startCall(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Test startCall failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;