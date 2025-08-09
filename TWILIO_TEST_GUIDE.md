# 🧪 Twilio Voice Test Guide

This guide helps you test the Twilio voice integration without authentication barriers.

## 🚀 Quick Start

### 1. Environment Setup

Make sure your `.env` file in `/backend/` has these Twilio variables:

```bash
# Twilio Configuration (Required for voice calls)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_API_KEY=your_api_key_here
TWILIO_API_SECRET=your_api_secret_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_TWIML_APP_SID=your_twiml_app_sid

# Base URL for webhooks
BASE_URL=http://localhost:3001
```

### 2. Start the Backend

```bash
cd backend
npm install
npm start
```

The server should show:
```
🚀 Cold Caller API server running on port 3001
🎯 Twilio service initialized successfully
```

### 3. Test Endpoints (No Auth Required)

#### Health Check
```bash
curl http://localhost:3001/api/twilio-test/health
```

#### Get Test Token
```bash
curl -X POST http://localhost:3001/api/twilio-test/token \
  -H "Content-Type: application/json" \
  -d '{"identity": "test-user"}'
```

#### Make Test Call
```bash
curl -X POST http://localhost:3001/api/twilio-test/call \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "identity": "test-user"}'
```

#### Validate Phone Number
```bash
curl -X POST http://localhost:3001/api/twilio-test/validate-phone \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

## 🎯 What's Fixed

### 1. Authentication Bypass ✅
- Created `/api/twilio-test/*` endpoints that work without authentication
- Test token generation works immediately
- No login required for testing calls

### 2. Call Routing Integration ✅
- Backend generates proper TwiML for call routing
- Frontend Device connects to backend webhooks
- Outbound calls properly dial the target number
- Webhook URLs are automatically configured

### 3. Phone Number Formatting ✅
- Added `formatPhoneNumber()` method to TwilioService
- Handles US numbers: `1234567890` → `+11234567890`
- Handles E.164 format: `+11234567890` stays the same
- Frontend validates numbers before calling

### 4. Call State Coordination ✅
- Real-time WebSocket updates for call status
- Test call memory stored in backend
- Call history tracking
- Status webhooks working properly

## 📞 Testing Call Flow

### Outbound Call Process:
1. **Frontend**: Get test token (no auth)
2. **Frontend**: Initialize Twilio Device with token
3. **Frontend**: Make call via backend test endpoint
4. **Backend**: Creates Twilio call with test webhooks
5. **Twilio**: Calls backend `/voice` webhook for TwiML
6. **Backend**: Returns TwiML to dial target number
7. **Twilio**: Dials the actual phone number
8. **Real-time**: Status updates via WebSocket

### TwiML Flow:
```xml
<!-- For outbound calls -->
<Response>
  <Say voice="alice">Test call connecting. Please wait.</Say>
  <Dial timeout="60" record="record-from-answer">
    <Number>+1234567890</Number>
  </Dial>
</Response>
```

## 🛠️ Frontend Integration

### Using TwilioTestManager:
```javascript
import TwilioTestManager from '../services/TwilioTestManager';

const testManager = new TwilioTestManager();

// Initialize (no auth required)
const result = await testManager.initialize({
  identity: 'test-user-123'
});

// Make call
const call = await testManager.makeCall('+1234567890', {
  record: true
});
```

### Using TwilioTestPanel Component:
```javascript
import TwilioTestPanel from '../components/TwilioTestPanel';

function App() {
  return (
    <div>
      <TwilioTestPanel />
    </div>
  );
}
```

## 🔍 Debugging

### Check Backend Logs
Look for these messages:
```
🧪 Generating test token for: test-user-123
🧪 Initiating test call: { to: '+1234567890', ... }
🎵 Test Voice Webhook: { callSid: 'CA123...', ... }
📊 Test Status Update: { status: 'ringing', ... }
```

### Check Twilio Console
1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
2. Check that your TwiML App is configured
3. View call logs for status and errors

### Common Issues:

#### ❌ "Twilio client not initialized"
- Check environment variables are set
- Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
- Check backend logs for initialization errors

#### ❌ "Failed to get access token"
- Test token endpoint: `curl http://localhost:3001/api/twilio-test/token`
- Check TwiML App SID is correct
- Verify API Key and Secret are valid

#### ❌ Call fails immediately
- Check phone number format (+1XXXXXXXXXX)
- Verify Twilio phone number is voice-enabled
- Check webhook URLs are accessible

## 📊 Webhook URLs

The test system automatically configures these webhooks:

- **Voice**: `http://localhost:3001/api/twilio-test/voice`
- **Status**: `http://localhost:3001/api/twilio-test/status`
- **Recording**: `http://localhost:3001/api/twilio-test/recording`

For production, update BASE_URL in `.env` to your public domain.

## 🎯 Next Steps

Once basic calling works:

1. **Add Authentication**: Move to `/api/twilio/*` endpoints
2. **Add User Management**: Associate calls with users
3. **Add Call Logging**: Store call records in database
4. **Add Recording Storage**: Save recordings to cloud storage
5. **Add Real-time UI**: Show call status in main app

## ⚠️ Security Note

The test endpoints (`/api/twilio-test/*`) bypass authentication and should only be used for development. Remove or secure these endpoints before production deployment.

## 📞 Test Phone Numbers

For testing without charges, use Twilio test numbers:

- **US**: +15005550006 (causes busy signal)
- **US**: +15005550001 (rings but doesn't answer)
- **US**: +15005550004 (invalid phone number error)

## 🚨 Troubleshooting

If calls still don't work:

1. **Check Twilio Account Status**: Ensure account is active and funded
2. **Verify Phone Number**: Make sure your Twilio number is voice-enabled
3. **Check Webhooks**: Test webhook URLs are publicly accessible
4. **Review TwiML App**: Ensure Voice URL is configured
5. **Check Firewall**: Ensure port 3001 is accessible for webhooks