@echo off
echo 🚀 Starting ColdCaller Full-Stack Application...
echo 🔧 Backend Server: http://localhost:3001
echo 🎨 Frontend Server: http://localhost:3000
echo 📞 Twilio Webhooks: Using ngrok on port 3001
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Check if node_modules exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm run install:all
)

REM Start both servers
npm run dev