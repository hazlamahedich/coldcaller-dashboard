#!/bin/bash
set -e

echo "🚀 Railway Deployment Script for ColdCaller"
echo "==========================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "railway login --browserless"
    exit 1
fi

echo "✅ Railway CLI ready"

# Deploy backend
echo "📦 Deploying backend service..."
cd backend

# Remove problematic config if exists
rm -f railway.json nixpacks.toml

# Create simple deployment config
cat > railway.json << EOF
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE"
  }
}
EOF

echo "🔄 Attempting backend deployment..."
if railway up --service backend-api; then
    echo "✅ Backend deployed successfully"
else
    echo "⚠️  Backend deployment failed. Please use Railway dashboard to deploy manually."
    echo "📝 Instructions:"
    echo "   1. Run: railway open"
    echo "   2. Create new service: backend-api"
    echo "   3. Connect your GitHub repo"
    echo "   4. Set root directory: backend"
    echo "   5. Add environment variables from railway-env-vars.txt"
fi

cd ..

echo "✅ Deployment script completed!"
echo "🌐 Open Railway dashboard: railway open"
echo "📋 Don't forget to add environment variables from railway-env-vars.txt"