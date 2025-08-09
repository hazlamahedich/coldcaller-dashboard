# 🎯 Twilio Integration Setup Guide

Complete guide to configure your Twilio demo account with the ColdCaller Dashboard.

## 📋 Prerequisites

- Twilio Demo Account (free trial)
- ColdCaller Dashboard installed and running
- Ngrok or similar tunneling service for webhooks (development)

## 🚀 Step 1: Twilio Account Setup

### 1.1 Get Your Twilio Credentials

1. **Log in to Twilio Console**: https://console.twilio.com/
2. **Find your credentials** on the main dashboard:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 1.2 Create API Key (Recommended for Production)

1. Go to **Settings** → **API Keys & Tokens**
2. Click **Create API Key**
3. Choose **Standard** key type
4. Name it: `ColdCaller Dashboard`
5. Save the **SID** and **Secret** (you'll need both)

### 1.3 Get a Twilio Phone Number

1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a number with **Voice** capabilities
3. Note the number (format: `+1234567890`)

## 🔧 Step 2: ColdCaller Configuration

### 2.1 Environment Variables Setup

Copy `.env.example` to `.env` and configure:

```bash
# Copy environment template
cp .env.example .env

# Edit with your favorite editor
nano .env  # or vim, code, etc.
```

### 2.2 Add Twilio Configuration

Add these values to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your-api-secret-here
TWILIO_PHONE_NUMBER=+1234567890

# Twilio Voice Configuration (update with your domain)
TWILIO_VOICE_WEBHOOK_URL=https://your-domain.com/api/twilio/voice
TWILIO_STATUS_WEBHOOK_URL=https://your-domain.com/api/twilio/status
TWILIO_RECORDING_WEBHOOK_URL=https://your-domain.com/api/twilio/recording

# Feature Flags
ENABLE_TWILIO_VOICE=true
ENABLE_TWILIO_RECORDING=true
```

### 2.3 Development Webhook Setup (Using Ngrok)

For development, you'll need to expose your local server to the internet for webhooks:

```bash
# Install ngrok (if not already installed)
# macOS: brew install ngrok
# Windows/Linux: https://ngrok.com/download

# Start your ColdCaller backend
npm run dev  # or your start command

# In another terminal, expose port 3001
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update your .env file:
TWILIO_VOICE_WEBHOOK_URL=https://abc123.ngrok.io/api/twilio/voice
TWILIO_STATUS_WEBHOOK_URL=https://abc123.ngrok.io/api/twilio/status
TWILIO_RECORDING_WEBHOOK_URL=https://abc123.ngrok.io/api/twilio/recording
```

## 🎙️ Step 3: TwiML App Setup

### 3.1 Create TwiML Application

1. Go to **Develop** → **Voice** → **TwiML** → **TwiML Apps**
2. Click **Create new TwiML App**
3. Fill in:
   - **Friendly Name**: `ColdCaller Voice`
   - **Voice Request URL**: `https://your-domain.com/api/twilio/voice`
   - **Voice Request Method**: `POST`
   - **Status Callback URL**: `https://your-domain.com/api/twilio/status`
   - **Status Callback Method**: `POST`
4. Click **Save**
5. Copy the **SID** (starts with `AP`)

### 3.2 Update Environment Variables

Add the TwiML App SID to your `.env`:

```bash
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🔊 Step 4: Configure Phone Number Webhooks

### 4.1 Update Phone Number Configuration

1. Go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your Twilio phone number
3. In the **Voice Configuration** section:
   - **A call comes in**: Webhook
   - **URL**: `https://your-domain.com/api/twilio/voice`
   - **HTTP Method**: POST
   - **Primary Handler fails**: `https://your-domain.com/api/twilio/voice` (same URL)
4. Click **Save**

## ⚙️ Step 5: Install Dependencies

### 5.1 Backend Dependencies

```bash
# Navigate to project root
cd /path/to/coldcaller

# Install Twilio SDK
npm install twilio

# Restart backend server
npm run dev
```

### 5.2 Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install Twilio Voice SDK
npm install @twilio/voice-sdk

# Restart frontend development server
npm start
```

## 🧪 Step 6: Test Your Setup

### 6.1 Health Check

Test the Twilio integration:

```bash
# Test Twilio health endpoint
curl http://localhost:3001/api/twilio/health

# Expected response:
{
  "service": "Twilio Voice",
  "status": "healthy",
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "accountStatus": "active",
  "type": "Full",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 6.2 Test Voice Token Generation

```bash
# Test token generation (requires authentication)
curl -X POST http://localhost:3001/api/twilio/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"identity": "test-user"}'
```

### 6.3 Frontend Integration Test

1. Open your ColdCaller Dashboard
2. You should see the Twilio Voice Panel
3. Check the device status (should show "registered")
4. Try making a test call to your own phone number

## 📞 Step 7: Making Your First Call

### 7.1 Using the Frontend Interface

1. **Open ColdCaller Dashboard** in your browser
2. **Navigate to the Twilio Voice Panel**
3. **Enter a phone number** (start with your own for testing)
4. **Click "Call"** button
5. **Accept the call** when your phone rings

### 7.2 Testing Call Features

- **Mute/Unmute**: Test audio muting
- **Hold/Resume**: Test call hold functionality
- **DTMF Tones**: Use the dialpad during calls
- **Call Recording**: Enable recording in the call options

## 🔍 Step 8: Troubleshooting

### 8.1 Common Issues

**Issue**: "Twilio client not initialized"
- **Solution**: Check your API credentials in `.env`
- **Verify**: Account SID and Auth Token are correct

**Issue**: "Device registration failed"
- **Solution**: Check API Key and Secret configuration
- **Verify**: API Key has correct permissions

**Issue**: "Webhook not receiving calls"
- **Solution**: Verify webhook URLs are accessible
- **For Development**: Ensure ngrok is running and URLs are updated

**Issue**: "No audio during calls"
- **Solution**: Check browser microphone permissions
- **Verify**: HTTPS is enabled (required for WebRTC)

### 8.2 Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
REACT_APP_ENVIRONMENT=development
```

This will provide detailed logs in both browser console and server logs.

### 8.3 Test Webhook Connectivity

```bash
# Test if your webhook URL is accessible
curl -X POST https://your-domain.com/api/twilio/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CAtest123&From=%2B1234567890&To=%2B0987654321&Direction=outbound-api"
```

## 📊 Step 9: Monitor Usage

### 9.1 Twilio Console

Monitor your usage in the Twilio Console:
- **Usage & Billing** → **Usage Records**
- **Logs** → **Voice** for call logs
- **Debugger** → **Voice Insights** for call quality

### 9.2 ColdCaller Analytics

The dashboard includes Twilio-specific analytics:
- Call success rates
- Call duration statistics
- Cost tracking
- Quality metrics

## 🎯 Step 10: Production Deployment

### 10.1 Environment Setup

For production, ensure:

```bash
NODE_ENV=production
TWILIO_VOICE_WEBHOOK_URL=https://your-production-domain.com/api/twilio/voice
TWILIO_STATUS_WEBHOOK_URL=https://your-production-domain.com/api/twilio/status
TWILIO_RECORDING_WEBHOOK_URL=https://your-production-domain.com/api/twilio/recording
```

### 10.2 Security Considerations

- **Use HTTPS**: Always use HTTPS in production
- **Webhook Validation**: Implement Twilio signature validation
- **Rate Limiting**: Configure appropriate rate limits
- **Access Control**: Restrict API access to authorized users

### 10.3 Scaling Considerations

- **Connection Pooling**: Configure appropriate connection limits
- **Caching**: Implement token caching for better performance
- **Load Balancing**: Use load balancers for multiple server instances

## 🎉 Congratulations!

Your Twilio integration is now complete! You can:

- ✅ Make outbound calls from the dashboard
- ✅ Receive incoming calls
- ✅ Record calls automatically
- ✅ Monitor call quality and analytics
- ✅ Scale for production use

## 📞 Support

Need help with your Twilio integration?

- **Twilio Documentation**: https://www.twilio.com/docs/voice
- **ColdCaller Issues**: Check the project repository
- **Twilio Support**: Available through your Twilio Console

## 💡 Next Steps

Consider these enhancements:
- **Call Queuing**: Implement call queue management
- **Conference Calls**: Add multi-party calling
- **SMS Integration**: Add SMS capabilities
- **Advanced Analytics**: Custom call analytics
- **CRM Integration**: Sync with external CRM systems

Happy calling! 🚀