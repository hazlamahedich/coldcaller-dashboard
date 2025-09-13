# 🚀 ColdCaller Railway Deployment Guide

## 📋 Pre-Deployment Checklist

✅ Railway CLI installed and authenticated  
✅ Project "cold caller pro" created  
✅ Redis database added  
✅ Configuration files created  
✅ Serve package added to frontend  

## 🔧 Step-by-Step Deployment

### 1️⃣ Deploy Backend Service

**In Railway Dashboard:**

1. **Create Service:**
   - Click **"+ New"** button
   - Select **"GitHub Repo"** (connect your repository)
   - Or **"Empty Service"** (upload manually)
   - Name: `coldcaller-backend`

2. **Configure Settings:**
   - Go to **Settings** tab
   - Set **Root Directory**: `backend` ⚠️ CRITICAL
   - Build Command: `npm run build` (auto-detected)
   - Start Command: `npm start` (auto-detected)

3. **Add Environment Variables** (Variables tab):
   ```env
   NODE_ENV=production
   PORT=3001
   
   # Your Supabase credentials (get from Supabase dashboard)
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_KEY=your-supabase-service-role-key
   
   # Use these secure values generated for you:
   JWT_SECRET=68df405b050f1888c6977148320d0f624ab637a6b8ccc8347c11a53e925417f9
   ENCRYPTION_KEY=77dd7acfee5139fb00e78cf45b545238b0755751e04b1b6df5896514cf12e15b
   
   # AI Integration
   GOOGLE_AI_API_KEY=your-google-ai-api-key
   GOOGLE_AI_MODEL=gemini-1.5-pro-latest
   
   # Redis connection (automatic)
   REDIS_URL=${{Redis.REDIS_URL}}
   
   # Optional - Twilio for calling
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-phone-number
   ```

4. **Deploy:**
   - Railway will automatically build and deploy
   - Check the **Deployments** tab for progress
   - Note the backend URL (something like: `https://coldcaller-backend-production.up.railway.app`)

### 2️⃣ Deploy Frontend Service

1. **Create Service:**
   - Click **"+ New"** button  
   - Select **"GitHub Repo"** (same repository)
   - Name: `coldcaller-frontend`

2. **Configure Settings:**
   - Go to **Settings** tab
   - Set **Root Directory**: `frontend` ⚠️ CRITICAL
   - Build Command: `npm run build` (auto-detected)
   - Start Command: `npx serve -s build -l $PORT`

3. **Add Environment Variables** (Variables tab):
   ```env
   NODE_ENV=production
   
   # Update with your actual backend URL from step 1
   REACT_APP_API_URL=https://coldcaller-backend-production.up.railway.app
   REACT_APP_ENVIRONMENT=production
   
   # Optional feature flags
   REACT_APP_ENABLE_OFFLINE_MODE=true
   REACT_APP_ENABLE_DEBUG_LOGGING=false
   REACT_APP_ENABLE_API_RETRY=true
   ```

4. **Deploy:**
   - Railway will build and deploy the frontend
   - Note the frontend URL

### 3️⃣ Final Configuration

1. **Update Backend CORS:**
   - Go back to backend service **Variables**
   - Add/update these variables:
   ```env
   FRONTEND_URL=https://your-frontend-url.up.railway.app
   CORS_ORIGIN=https://your-frontend-url.up.railway.app
   ```

2. **Redeploy Backend:**
   - After updating CORS variables
   - Go to **Deployments** tab → Click **"Deploy Latest"**

## ✅ Testing Your Deployment

1. **Backend Health Check:**
   - Visit: `https://your-backend-url.up.railway.app/api/health`
   - Should return JSON with status: "ok"

2. **Frontend Access:**
   - Visit your frontend URL
   - Should load the ColdCaller application

3. **API Connection:**
   - Test if frontend can communicate with backend
   - Check browser console for any CORS errors

## 🔍 Troubleshooting

**Build Failures:**
- Check **Deploy Logs** in Railway dashboard
- Ensure **Root Directory** is set correctly
- Verify all environment variables are set

**CORS Issues:**
- Double-check `FRONTEND_URL` and `CORS_ORIGIN` in backend
- Redeploy backend after updating CORS variables

**Database Connection Issues:**
- Verify Supabase credentials are correct
- Check that `REDIS_URL` is using `${{Redis.REDIS_URL}}`

## 🎉 Success!

Your ColdCaller application should now be deployed and accessible via:
- **Frontend:** https://your-frontend-url.up.railway.app
- **Backend API:** https://your-backend-url.up.railway.app

The app will have full functionality including:
- ✅ Supabase database integration
- ✅ Redis caching  
- ✅ AI-powered chatbot (with Google Gemini)
- ✅ Twilio VOIP calling (if configured)
- ✅ Real-time features via WebSocket