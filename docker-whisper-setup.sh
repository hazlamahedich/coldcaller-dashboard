#!/bin/bash
# Docker Whisper Server Setup Script for Local Testing

echo "🐳 Setting up Docker Whisper Server for Local Testing..."
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   macOS: brew install --cask docker"
    echo "   Windows: Download from https://www.docker.com/products/docker-desktop"
    echo "   Linux: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    exit 1
fi

echo "✅ Docker is installed"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"

# Stop existing whisper server if running
echo "🧹 Cleaning up existing whisper server..."
docker stop whisper-server 2>/dev/null || true
docker rm whisper-server 2>/dev/null || true

# Pull the latest whisper server image
echo "📥 Pulling Whisper server image..."
docker pull onerahmet/openai-whisper-asr-webservice:latest

# Run the whisper server
echo "🚀 Starting Whisper server..."
docker run -d \
    --name whisper-server \
    -p 9000:9000 \
    --restart unless-stopped \
    -e ASR_MODEL=base \
    -e ASR_ENGINE=openai_whisper \
    onerahmet/openai-whisper-asr-webservice:latest

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

# Test the server
echo "🧪 Testing Whisper server..."
if curl -s http://localhost:9000/docs >/dev/null; then
    echo "✅ Whisper server is running at http://localhost:9000"
    echo "📖 API documentation: http://localhost:9000/docs"
else
    echo "❌ Whisper server failed to start"
    echo "📝 Check Docker logs: docker logs whisper-server"
    exit 1
fi

echo ""
echo "🎉 Docker Whisper Setup Complete!"
echo "=================================================="
echo "✅ Server running at: http://localhost:9000"
echo "✅ API endpoint: http://localhost:9000/asr"
echo "✅ Documentation: http://localhost:9000/docs"
echo ""
echo "📝 Next steps:"
echo "   1. Update your .env file with local Whisper settings"
echo "   2. Test transcription with a sample call"
echo "   3. For production, switch to OpenAI API key"
echo ""
echo "🛠️  Docker commands:"
echo "   Stop server: docker stop whisper-server"
echo "   Start server: docker start whisper-server"
echo "   View logs: docker logs whisper-server"
echo "   Remove server: docker stop whisper-server && docker rm whisper-server"