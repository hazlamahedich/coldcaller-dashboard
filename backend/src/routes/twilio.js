const express = require('express');
const router = express.Router();
const TwilioService = require('../services/twilioService');
const { authenticate } = require('../middleware/auth');

/**
 * Get Twilio access token for voice calls
 * POST /api/twilio/token
 */
router.post('/token', authenticate, async (req, res) => {
  try {
    const { identity } = req.body;
    const userId = req.user.id;
    const userIdentity = identity || `user-${userId}`;

    const tokenData = TwilioService.getClientConfig(userIdentity);
    
    res.json({
      success: true,
      data: tokenData
    });
  } catch (error) {
    console.error('Twilio token generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate access token',
      error: error.message
    });
  }
});

/**
 * Make outbound call
 * POST /api/twilio/call
 */
router.post('/call', authenticate, async (req, res) => {
  try {
    const { to, from, record = false } = req.body;
    const userId = req.user.id;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format
    const phoneValidation = await TwilioService.validatePhoneNumber(to);
    if (!phoneValidation.success || !phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        details: phoneValidation.error
      });
    }

    const callResult = await TwilioService.makeCall(from, to, {
      record: record,
      statusCallback: `${process.env.TWILIO_STATUS_WEBHOOK_URL}?userId=${userId}`,
      recordingStatusCallback: process.env.TWILIO_RECORDING_WEBHOOK_URL
    });

    if (callResult.success) {
      // Log call initiation (integrate with existing call logging)
      const callLogData = {
        userId: userId,
        leadId: req.body.leadId,
        callSid: callResult.callSid,
        direction: 'outbound',
        from: callResult.from,
        to: callResult.to,
        status: callResult.status,
        provider: 'twilio',
        initiatedAt: new Date().toISOString()
      };

      // You can integrate this with your existing call logging service
      console.log('📞 Call initiated:', callLogData);
    }

    res.json(callResult);
  } catch (error) {
    console.error('Outbound call failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate call',
      error: error.message
    });
  }
});

/**
 * Get call details
 * GET /api/twilio/call/:callSid
 */
router.get('/call/:callSid', authenticate, async (req, res) => {
  try {
    const { callSid } = req.params;
    const callDetails = await TwilioService.getCall(callSid);
    res.json(callDetails);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call details',
      error: error.message
    });
  }
});

/**
 * Update call (hang up, mute, etc.)
 * PUT /api/twilio/call/:callSid
 */
router.put('/call/:callSid', authenticate, async (req, res) => {
  try {
    const { callSid } = req.params;
    const updateOptions = req.body;
    
    const updateResult = await TwilioService.updateCall(callSid, updateOptions);
    res.json(updateResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update call',
      error: error.message
    });
  }
});

/**
 * Get call recordings
 * GET /api/twilio/call/:callSid/recordings
 */
router.get('/call/:callSid/recordings', authenticate, async (req, res) => {
  try {
    const { callSid } = req.params;
    const recordings = await TwilioService.getRecordings(callSid);
    res.json(recordings);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recordings',
      error: error.message
    });
  }
});

/**
 * Validate phone number
 * POST /api/twilio/validate-phone
 */
router.post('/validate-phone', authenticate, async (req, res) => {
  try {
    const { phoneNumber, countryCode = 'US' } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const validation = await TwilioService.validatePhoneNumber(phoneNumber, countryCode);
    res.json(validation);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate phone number',
      error: error.message
    });
  }
});

/**
 * Search available phone numbers
 * GET /api/twilio/numbers/search
 */
router.get('/numbers/search', authenticate, async (req, res) => {
  try {
    const { countryCode = 'US', areaCode, contains, limit = 20 } = req.query;
    
    const searchResults = await TwilioService.searchPhoneNumbers(countryCode, {
      areaCode,
      contains,
      limit: parseInt(limit)
    });
    
    res.json(searchResults);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search phone numbers',
      error: error.message
    });
  }
});

/**
 * Get Twilio usage statistics
 * GET /api/twilio/usage
 */
router.get('/usage', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const usage = await TwilioService.getUsage(
      startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate) : new Date()
    );
    res.json(usage);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage data',
      error: error.message
    });
  }
});

/**
 * Twilio Voice webhook - handles incoming calls and TwiML generation
 * POST /api/twilio/voice
 */
router.post('/voice', async (req, res) => {
  try {
    const { CallSid, From, To, Direction } = req.body;
    
    console.log('📞 Twilio Voice Webhook:', {
      callSid: CallSid,
      from: From,
      to: To,
      direction: Direction
    });

    // Generate TwiML response based on call requirements
    const twimlActions = [];

    if (Direction === 'inbound') {
      // Handle incoming calls
      twimlActions.push({
        type: 'say',
        text: 'Thank you for calling ColdCaller. Please hold while we connect you to an available agent.',
        options: { voice: 'alice', language: 'en-US' }
      });
      
      twimlActions.push({
        type: 'dial',
        options: { timeout: 30, record: 'record-from-ringing' },
        client: `user-${req.query.userId || 'default'}`
      });
    } else {
      // Handle outbound calls
      twimlActions.push({
        type: 'say',
        text: 'Connecting your call. Please wait.',
        options: { voice: 'alice', language: 'en-US' }
      });
      
      twimlActions.push({
        type: 'dial',
        options: { timeout: 60, record: 'record-from-answer' },
        number: To
      });
    }

    const twiml = TwilioService.generateTwiML(twimlActions);
    
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Twilio Voice webhook error:', error);
    
    // Return fallback TwiML
    const errorTwiml = TwilioService.generateTwiML([
      {
        type: 'say',
        text: 'We are experiencing technical difficulties. Please try again later.',
        options: { voice: 'alice', language: 'en-US' }
      },
      { type: 'hangup' }
    ]);
    
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

/**
 * Twilio Status webhook - handles call status updates
 * POST /api/twilio/status
 */
router.post('/status', async (req, res) => {
  try {
    const { CallSid, CallStatus, Direction, From, To, Duration } = req.body;
    const userId = req.query.userId;

    console.log('📊 Twilio Status Update:', {
      callSid: CallSid,
      status: CallStatus,
      direction: Direction,
      from: From,
      to: To,
      duration: Duration,
      userId: userId
    });

    // Update call log in your database
    const callUpdate = {
      callSid: CallSid,
      status: CallStatus,
      duration: Duration ? parseInt(Duration) : null,
      completedAt: ['completed', 'failed', 'canceled', 'busy', 'no-answer'].includes(CallStatus) ? new Date().toISOString() : null
    };

    // Integrate with your existing call logging system here
    console.log('📝 Call status update:', callUpdate);

    // Send real-time update via WebSocket if available
    if (global.wsManager) {
      global.wsManager.sendCallUpdate(userId, callUpdate);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Twilio Status webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
});

/**
 * Twilio Recording webhook - handles recording completion
 * POST /api/twilio/recording
 */
router.post('/recording', async (req, res) => {
  try {
    const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;
    
    console.log('🎙️ Recording completed:', {
      callSid: CallSid,
      recordingSid: RecordingSid,
      duration: RecordingDuration,
      url: RecordingUrl
    });

    // Save recording information to database
    const recordingData = {
      callSid: CallSid,
      recordingSid: RecordingSid,
      url: RecordingUrl,
      duration: parseInt(RecordingDuration),
      provider: 'twilio',
      createdAt: new Date().toISOString()
    };

    // Integrate with your existing audio storage system
    console.log('💾 Recording saved:', recordingData);

    res.status(200).send('OK');
  } catch (error) {
    console.error('Twilio Recording webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
});

/**
 * Health check for Twilio integration
 * GET /api/twilio/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await TwilioService.healthCheck();
    res.json({
      service: 'Twilio Voice',
      ...health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      service: 'Twilio Voice',
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;