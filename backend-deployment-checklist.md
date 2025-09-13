# Backend Service Configuration Checklist

## 🔧 Service Settings (in Railway Dashboard)

### Basic Configuration:
- [x] Service Name: `coldcaller-backend`
- [x] Root Directory: `backend` (CRITICAL - set this!)
- [x] Build Command: `npm run build` (should auto-detect)
- [x] Start Command: `npm start` (should auto-detect)

### Environment Variables (Add these in Variables tab):

```env
# Core Application
NODE_ENV=production
PORT=3001

# Database - Use your Supabase values
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# Security - Generate secure values
JWT_SECRET=your-super-secure-jwt-secret-32-chars-minimum
ENCRYPTION_KEY=your-32-character-encryption-key-here

# AI Integration
GOOGLE_AI_API_KEY=your-google-ai-api-key
GOOGLE_AI_MODEL=gemini-1.5-pro-latest

# Redis (Railway will auto-provide)
REDIS_URL=${{Redis.REDIS_URL}}

# Optional - Twilio for calling features
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# CORS - Update after frontend deploys
FRONTEND_URL=https://your-frontend.up.railway.app
CORS_ORIGIN=https://your-frontend.up.railway.app
```

## 🔍 Important Notes:
- The `${{Redis.REDIS_URL}}` will automatically connect to your Redis database
- Replace all `your-*` values with your actual credentials
- Get Supabase credentials from your Supabase dashboard
- Generate secure random strings for JWT_SECRET and ENCRYPTION_KEY