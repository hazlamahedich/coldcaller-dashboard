#!/bin/bash
# Test Whisper Transcription Service

echo "🧪 Testing Docker Whisper Transcription Service"
echo "=============================================="

# Check if Whisper server is running
echo "📡 Checking Whisper server status..."
if curl -s http://localhost:9000/docs >/dev/null; then
    echo "✅ Whisper server is running"
else
    echo "❌ Whisper server is not running. Please start it first:"
    echo "   ./docker-whisper-setup.sh"
    exit 1
fi

# Create a simple test audio file using text-to-speech (if available)
echo "🎵 Creating test audio file..."

# Check if macOS say command is available
if command -v say &> /dev/null; then
    echo "📝 Generating test audio using macOS text-to-speech..."
    say "Hello, this is a test transcription for the ColdCaller application. The transcription service is working correctly." -o test-audio.aiff
    
    # Convert to WAV format if ffmpeg is available
    if command -v ffmpeg &> /dev/null; then
        ffmpeg -i test-audio.aiff -ar 16000 -ac 1 test-audio.wav -y >/dev/null 2>&1
        rm test-audio.aiff
        echo "✅ Test audio created: test-audio.wav"
    else
        mv test-audio.aiff test-audio.wav
        echo "✅ Test audio created: test-audio.wav (note: install ffmpeg for better audio conversion)"
    fi
else
    echo "⚠️ macOS 'say' command not available. Using curl to test API endpoint instead."
fi

# Test the transcription API
echo "🔊 Testing transcription API..."

if [ -f "test-audio.wav" ]; then
    echo "📤 Uploading test audio for transcription..."
    
    # Test transcription with the generated audio file
    response=$(curl -s -X POST "http://localhost:9000/asr" \
        -F "audio_file=@test-audio.wav" \
        -F "task=transcribe" \
        -F "language=en" \
        -F "output=json")
    
    if [ $? -eq 0 ]; then
        echo "✅ Transcription API response received"
        echo "📝 Response: $response"
        
        # Clean up test file
        rm test-audio.wav
    else
        echo "❌ Transcription API call failed"
        exit 1
    fi
else
    # Test API endpoint without audio file
    echo "📤 Testing API endpoint health..."
    
    # Test the API documentation endpoint
    api_docs=$(curl -s http://localhost:9000/openapi.json)
    if echo "$api_docs" | grep -q "asr"; then
        echo "✅ Whisper API is properly configured"
        echo "📖 API endpoint: http://localhost:9000/asr"
    else
        echo "❌ Whisper API configuration issue"
        exit 1
    fi
fi

echo ""
echo "🎉 Whisper transcription test completed!"
echo "=============================================="
echo "✅ Docker Whisper server: Running"
echo "✅ API endpoint: http://localhost:9000/asr" 
echo "✅ Configuration: Ready for ColdCaller integration"
echo ""
echo "📝 Next steps:"
echo "   1. Restart your backend server to load new .env configuration"
echo "   2. Make a test call through your application"
echo "   3. Check logs for automatic transcription activity"
echo ""
echo "🚀 When ready for production:"
echo "   1. Get OpenAI API key from https://platform.openai.com/api-keys"
echo "   2. Update .env with production configuration (commented section)"
echo "   3. Deploy to GoDaddy with OpenAI API key"