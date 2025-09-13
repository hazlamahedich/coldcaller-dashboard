# Frontend Service Configuration Checklist

## 🔧 Service Settings (in Railway Dashboard)

### Basic Configuration:
- [x] Service Name: `coldcaller-frontend`
- [x] Root Directory: `frontend` (CRITICAL - set this!)
- [x] Build Command: `npm run build` (should auto-detect)
- [x] Start Command: `npx serve -s build -l $PORT` (you may need to set this manually)

### Environment Variables (Add these in Variables tab):

```env
# Core Application
NODE_ENV=production

# API Configuration - Update with your backend URL
REACT_APP_API_URL=https://coldcaller-backend-production.up.railway.app
REACT_APP_ENVIRONMENT=production

# Feature Flags (optional)
REACT_APP_ENABLE_OFFLINE_MODE=true
REACT_APP_ENABLE_DEBUG_LOGGING=false
REACT_APP_ENABLE_API_RETRY=true
```

## 📋 Deployment Steps:

1. **Create Service:**
   - Click "+ New" → "GitHub Repo" or "Empty Service"
   - Name: `coldcaller-frontend`

2. **Configure Settings:**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Start Command: `npx serve -s build -l $PORT`

3. **Add Dependencies:**
   - Railway should auto-detect package.json
   - Make sure `serve` is in devDependencies

4. **Update Backend URL:**
   - After backend deploys, get its URL
   - Update `REACT_APP_API_URL` variable

## 🔍 Important Notes:
- The frontend will get its own Railway URL
- Update CORS settings in backend after frontend deploys
- Test the connection between frontend and backend