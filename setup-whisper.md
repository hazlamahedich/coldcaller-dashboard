# Whisper API Setup Guide

## Option 1: Local Whisper Server (Recommended for Privacy)

### Step 1: Install Whisper Server
```bash
# Using Docker (easiest)
docker run -d -p 9000:9000 --name whisper-server \
  openai/whisper-api:latest

# Or using Python
pip install whisper-api-server
whisper-api-server --host 0.0.0.0 --port 9000
```

### Step 2: Test Whisper Server
```bash
curl -X POST "http://localhost:9000/asr" \
  -H "Content-Type: multipart/form-data" \
  -F "audio_file=@test.wav" \
  -F "task=transcribe" \
  -F "language=en" \
  -F "output=json"
```

### Step 3: Update .env file
```bash
WHISPER_API_URL=http://localhost:9000/asr
WHISPER_MODEL=base
ENABLE_CALL_TRANSCRIPTION=true
```

## Option 2: OpenAI Whisper API (Cloud)

### Step 1: Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new API key

### Step 2: Update .env file
```bash
WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions
WHISPER_API_KEY=your-openai-api-key
ENABLE_CALL_TRANSCRIPTION=true
```

## Option 3: Use Alternative Providers

Your system supports multiple transcription providers:

### Google Speech-to-Text
```bash
GOOGLE_SPEECH_API_KEY=your_google_speech_api_key
DEFAULT_TRANSCRIPTION_PROVIDER=google
```

### AWS Transcribe
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
DEFAULT_TRANSCRIPTION_PROVIDER=aws
```

### Azure Speech Services
```bash
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=eastus
DEFAULT_TRANSCRIPTION_PROVIDER=azure
```

## Verification

After setup, your system will:
1. ✅ Record all calls automatically
2. ✅ Start transcription for calls >5 seconds
3. ✅ Store transcription in EnhancedCallLog
4. ✅ Generate speech analytics (sentiment, talk ratio, etc.)
5. ✅ Log all activities to lead timeline

## Quick Test

1. Make a test call through your system
2. Check logs for: `🤖 Starting automatic transcription for call`
3. Wait for: `✅ Transcription completed for call`
4. Check lead timeline for call activity

## Troubleshooting

### Whisper Server Issues:
- Check if server is running: `curl http://localhost:9000/health`
- View Docker logs: `docker logs whisper-server`
- Ensure audio file is accessible

### OpenAI API Issues:
- Verify API key is valid
- Check rate limits
- Ensure sufficient credits

### Timeline Issues:
- Check leadId is passed in call request
- Verify leadTracking service is working
- Check logs for activity logging errors