# 🚀 ColdCaller Full-Stack Startup Guide

## Quick Start Options

### 1. **One-Command Startup (Recommended)**
```bash
# Start both backend and frontend servers together
npm run dev
```

### 2. **Shell Script (Alternative)**
```bash
# Make executable (first time only)
chmod +x start.sh

# Start both servers
./start.sh
```

### 3. **Manual Startup (Individual Control)**
```bash
# Terminal 1 - Backend Server
cd backend && npm run dev

# Terminal 2 - Frontend Server  
cd frontend && npm start
```

## 🌐 Server URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Twilio Webhooks**: https://your-ngrok-url.ngrok-free.app/api/twilio/*

## 📋 Available Scripts

### Development Scripts
- `npm run dev` - Start both servers in development mode
- `npm run dev:backend` - Start only backend server
- `npm run dev:frontend` - Start only frontend server

### Production Scripts
- `npm run start` - Start both servers in production mode
- `npm run build` - Build frontend for production

### Setup & Maintenance
- `npm run install:all` - Install dependencies for all packages
- `npm run setup` - Full setup (install + migrate database)
- `npm run db:migrate` - Run database migrations
- `npm run clean` - Remove all node_modules folders

### Testing Scripts
- `npm test` - Run all tests
- `npm run test:frontend` - Frontend tests only
- `npm run test:backend` - Backend tests only
- `npm run test:e2e` - End-to-end tests

## ⚙️ Environment Setup

### 1. **Database (Already Configured)**
✅ Supabase PostgreSQL connected
✅ All tables migrated successfully

### 2. **Twilio Integration (Already Configured)**
✅ Demo account credentials in .env
✅ TwiML App configured
✅ Webhook URLs set up

### 3. **Ngrok (For Webhooks)**
```bash
# Make sure ngrok is running on port 3001
ngrok http 3001
```

## 🔧 Troubleshooting

### Backend Won't Start
```bash
# Check if port 3001 is in use
lsof -ti:3001

# Kill process if needed
kill -9 $(lsof -ti:3001)
```

### Frontend Won't Start
```bash
# Check if port 3000 is in use
lsof -ti:3000

# Kill process if needed
kill -9 $(lsof -ti:3000)
```

### Database Connection Issues
```bash
# Test Supabase connection
cd backend && NODE_ENV=production node test-supabase-connection.js
```

### Twilio Integration Issues
```bash
# Test Twilio endpoints
npm run test:twilio
```

## 📱 Features Ready to Use

### Core Features
- ✅ Lead management and tracking
- ✅ Contact database with search
- ✅ Call logging and history
- ✅ Enhanced call analytics
- ✅ Note templates and quick notes

### Twilio Voice Features
- ✅ Make outbound calls from web interface
- ✅ Real-time call status updates
- ✅ Call recording (if enabled)
- ✅ Call quality metrics
- ✅ DTMF (dialpad) support

### Dashboard Features
- ✅ Live call metrics
- ✅ Call history with filters
- ✅ Lead conversion tracking
- ✅ Performance analytics

## 🎯 Next Steps

1. **Start the application**: `npm run dev`
2. **Open browser**: Navigate to http://localhost:3000
3. **Test Twilio**: Make a test call using your demo account
4. **Add leads**: Import or manually add your contacts
5. **Start calling**: Use the integrated dialer

## 🆘 Getting Help

- **Backend Issues**: Check `backend/logs/` for error logs
- **Frontend Issues**: Open browser console (F12) for errors
- **Database Issues**: Use `npm run db:migrate` to reset
- **Twilio Issues**: Verify webhook URLs in Twilio Console

---

**Pro Tip**: Keep ngrok running in a separate terminal to maintain consistent webhook URLs during development!