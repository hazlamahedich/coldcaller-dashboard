# ⚡ Quick Start: Adding Your Twilio Demo Account

Get your Twilio demo account working with ColdCaller in under 10 minutes!

## 🚀 Super Quick Setup (5 minutes)

### 1. Get Your Twilio Credentials (2 minutes)

1. **Go to Twilio Console**: https://console.twilio.com/
2. **Copy these from the main dashboard**:
   - Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Auth Token: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. **Get a phone number**:
   - Go to **Phone Numbers** → **Manage** → **Buy a number**
   - Choose any US number with **Voice** capability
   - Note the number: `+1234567890`

### 2. Configure Environment (2 minutes)

**Option A: Interactive Setup (Recommended)**
```bash
cd /Users/sherwingorechomante/coldcaller
node scripts/setup-twilio.js
```

**Option B: Manual Setup**
```bash
# Create/edit your .env file
nano .env

# Add these lines:
TWILIO_ACCOUNT_SID=your-account-sid-here
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VOICE_WEBHOOK_URL=https://your-domain.com/api/twilio/voice
TWILIO_STATUS_WEBHOOK_URL=https://your-domain.com/api/twilio/status
ENABLE_TWILIO_VOICE=true

# Frontend settings
REACT_APP_ENABLE_TWILIO_VOICE=true
```

### 3. Install Dependencies (1 minute)

```bash
# Backend
npm install twilio

# Frontend
cd frontend
npm install @twilio/voice-sdk
cd ..
```

### 4. Start and Test (1 minute)

```bash
# Start backend
npm run dev

# In another terminal, start frontend
cd frontend && npm start
```

**Test**: Open http://localhost:3000 and look for the Twilio Voice panel!

## 🎯 Quick Demo Test

1. **Open ColdCaller Dashboard** in your browser
2. **Find the "Voice Communication" section**
3. **Select "Twilio" tab**
4. **Enter your own phone number**
5. **Click "Call"** - your phone should ring!

## 🔧 For Development: Webhook Setup with Ngrok

If you want to test webhooks (call events, recording, etc.):

```bash
# Install ngrok (one-time setup)
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start ngrok (keep this running)
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update your .env file:
TWILIO_VOICE_WEBHOOK_URL=https://abc123.ngrok.io/api/twilio/voice
TWILIO_STATUS_WEBHOOK_URL=https://abc123.ngrok.io/api/twilio/status
TWILIO_RECORDING_WEBHOOK_URL=https://abc123.ngrok.io/api/twilio/recording

# Restart your backend server
npm run dev
```

### Update Twilio Phone Number Webhooks

1. Go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click your phone number
3. Under **Voice Configuration**:
   - **A call comes in**: Webhook
   - **URL**: `https://abc123.ngrok.io/api/twilio/voice`
   - **HTTP Method**: POST
4. Click **Save**

## ✅ Verification Checklist

- [ ] Twilio credentials in `.env` file
- [ ] Dependencies installed (`twilio` and `@twilio/voice-sdk`)
- [ ] Backend server running on port 3001
- [ ] Frontend running on port 3000
- [ ] Can see Twilio Voice panel in dashboard
- [ ] Device shows "registered" status
- [ ] Can make a test call to your own phone

## 🚨 Quick Troubleshooting

**"Device not registered"**
```bash
# Check health endpoint
curl http://localhost:3001/api/twilio/health
```

**"Call failed"**
- Check your Account SID and Auth Token
- Verify phone number format: `+1234567890`
- Check browser console for errors

**"No audio"**
- Allow microphone permissions in browser
- Use HTTPS in production (required for WebRTC)

**"Webhook errors"**
- Make sure ngrok is running
- Verify webhook URLs are accessible
- Check Twilio Debugger in console

## 🎉 You're Done!

Your Twilio demo account is now integrated with ColdCaller! 

**Next Steps**:
- Try different call features (mute, hold, DTMF)
- Enable call recording
- Check call logs and analytics
- Explore advanced Twilio features

**Need Help?**
- Check `TWILIO_SETUP_GUIDE.md` for detailed instructions
- Look at browser console and server logs for errors
- Use Twilio Debugger in the console for call issues

Happy calling! 📞✨