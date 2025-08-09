#!/bin/bash

# ColdCaller Full-Stack Startup Script
# This script starts both backend and frontend servers concurrently

echo "🚀 Starting ColdCaller Full-Stack Application..."
echo "🔧 Backend Server: http://localhost:3001"
echo "🎨 Frontend Server: http://localhost:3000"
echo "📞 Twilio Webhooks: Using ngrok on port 3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

# Start both servers
npm run dev