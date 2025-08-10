# Google OAuth Setup Guide

Step-by-step guide to configure Google OAuth for Gmail and Google Calendar integration.

## 📋 Overview

This guide covers:
- Google Cloud Console setup
- OAuth 2.0 credentials creation
- API enablement for Gmail and Calendar
- Redirect URI configuration
- Testing and troubleshooting

## 🚀 Prerequisites

- Google account with admin privileges
- Access to Google Cloud Console
- Cold Calling Platform backend running

## 📝 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. **Navigate to Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create New Project**
   ```
   - Click "Select a project" dropdown
   - Click "New Project"
   - Project name: "ColdCaller Integration" (or your preferred name)
   - Organization: Select your organization (if applicable)
   - Click "Create"
   ```

3. **Select Your Project**
   - Wait for project creation to complete
   - Ensure your new project is selected in the dropdown

### Step 2: Enable Required APIs

1. **Navigate to APIs & Services**
   ```
   - In the left sidebar, click "APIs & Services"
   - Click "Library"
   ```

2. **Enable Gmail API**
   ```
   - Search for "Gmail API"
   - Click on "Gmail API"
   - Click "Enable"
   - Wait for activation to complete
   ```

3. **Enable Google Calendar API**
   ```
   - Search for "Google Calendar API"
   - Click on "Calendar API"
   - Click "Enable"
   - Wait for activation to complete
   ```

### Step 3: Configure OAuth Consent Screen

1. **Navigate to OAuth Consent Screen**
   ```
   - Go to "APIs & Services" > "OAuth consent screen"
   ```

2. **Choose User Type**
   ```
   External: For public applications (recommended for most use cases)
   Internal: Only if using Google Workspace and want to restrict to organization users
   ```

3. **Fill App Information**
   ```
   App name: Cold Calling Platform
   User support email: your-email@domain.com
   App logo: (Optional) Upload your app logo
   App domain: https://your-domain.com
   Developer contact information: your-email@domain.com
   ```

4. **Configure App Domain (Production)**
   ```
   Application home page: https://your-domain.com
   Application privacy policy link: https://your-domain.com/privacy
   Application terms of service link: https://your-domain.com/terms
   ```

5. **Add Authorized Domains**
   ```
   For Development:
   - localhost
   
   For Production:
   - your-domain.com
   ```

6. **Configure Scopes**
   ```
   Click "Add or Remove Scopes"
   Select the following scopes:
   
   Gmail Scopes:
   - https://www.googleapis.com/auth/gmail.readonly
   - https://www.googleapis.com/auth/gmail.send
   - https://www.googleapis.com/auth/gmail.modify
   
   Calendar Scopes:
   - https://www.googleapis.com/auth/calendar.readonly
   - https://www.googleapis.com/auth/calendar.events
   ```

7. **Add Test Users** (For External Apps in Testing)
   ```
   - Add your email address
   - Add any other team member emails who need to test
   ```

### Step 4: Create OAuth Credentials

1. **Navigate to Credentials**
   ```
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   ```

2. **Configure OAuth Client**
   ```
   Application type: Web application
   Name: ColdCaller OAuth Client
   ```

3. **Add Authorized Redirect URIs**
   
   **For Development:**
   ```
   http://localhost:3000/integrations/callback
   http://localhost:3000/oauth/callback
   http://localhost:3001/api/integrations/callback
   ```

   **For Production:**
   ```
   https://your-domain.com/integrations/callback
   https://your-domain.com/oauth/callback
   https://api.your-domain.com/integrations/callback
   ```

4. **Save and Download Credentials**
   ```
   - Click "Create"
   - Copy the Client ID and Client Secret
   - Download the JSON file (keep it secure)
   ```

### Step 5: Environment Configuration

Add the credentials to your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application URLs (must match redirect URIs)
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# OAuth Specific Settings
GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/calendar.readonly,https://www.googleapis.com/auth/calendar.events
```

### Step 6: Test Configuration

1. **Start Your Application**
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend
   cd frontend
   npm start
   ```

2. **Test OAuth Configuration**
   ```bash
   # Check configuration
   curl -X GET http://localhost:3001/api/oauth-admin/config
   
   # Validate Google setup
   curl -X GET http://localhost:3001/api/oauth-admin/validate/google_calendar
   curl -X GET http://localhost:3001/api/oauth-admin/validate/gmail
   ```

3. **Test OAuth Flow**
   ```bash
   # Test authentication URL generation
   curl -X POST http://localhost:3001/api/oauth-admin/test/google_calendar \
     -H "Content-Type: application/json" \
     -d '{"mode": "auth_url_only"}'
   ```

4. **Manual Integration Test**
   - Navigate to http://localhost:3000/integrations
   - Click "Connect Google Calendar" or "Connect Gmail"
   - Complete the OAuth flow
   - Verify successful connection

## 🔧 Advanced Configuration

### Custom Scopes

If you need different permissions, modify the scopes in your environment:

```bash
# Minimal Gmail access (read-only)
GOOGLE_GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.readonly

# Full Gmail access
GOOGLE_GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/gmail.modify

# Calendar read-only
GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar.readonly

# Full calendar access
GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar.readonly,https://www.googleapis.com/auth/calendar.events
```

### Domain-wide Delegation (For Workspace)

If you need to access multiple users' accounts:

1. **Enable Domain-wide Delegation**
   ```
   - In Google Cloud Console > Credentials
   - Click on your service account
   - Enable "Domain-wide delegation"
   ```

2. **Configure in Workspace Admin**
   ```
   - Go to admin.google.com
   - Security > API Controls > Domain-wide delegation
   - Add your client ID with required scopes
   ```

## 🐛 Troubleshooting

### Common Errors

#### 1. "Invalid Client ID"
```
Error: The OAuth client was not found.

Solutions:
- Verify GOOGLE_CLIENT_ID in .env file
- Check that client ID is from the correct Google Cloud project
- Ensure APIs are enabled in Google Cloud Console
```

#### 2. "Redirect URI Mismatch"
```
Error: redirect_uri_mismatch

Solutions:
- Check authorized redirect URIs in Google Cloud Console
- Ensure URLs exactly match (including http/https, port numbers)
- Verify FRONTEND_URL and BACKEND_URL in .env
```

#### 3. "Access Denied"
```
Error: access_denied

Solutions:
- Check if required scopes are configured in OAuth consent screen
- Verify user has permission to grant requested scopes
- For external apps, ensure user is added as test user
```

#### 4. "App Not Verified"
```
Warning: This app isn't verified

Solutions:
- Add users as test users during development
- Submit app for verification for production use
- Configure OAuth consent screen completely
```

### Debug Mode

Enable detailed logging:

```bash
# Add to .env
DEBUG=oauth:*,google:*
LOG_LEVEL=debug

# Restart your application
npm run dev
```

### API Rate Limits

Google APIs have usage limits:

```
Gmail API:
- 1 billion quota units per day (default)
- 250 quota units per user per second

Calendar API:
- 1 million queries per day per project
- 100 queries per 100 seconds per user
```

Monitor usage in Google Cloud Console > APIs & Services > Quotas.

## ✅ Testing Checklist

Before going to production:

- [ ] OAuth consent screen is fully configured
- [ ] All required APIs are enabled
- [ ] Client credentials are correct in environment
- [ ] Redirect URIs match exactly
- [ ] Test users can complete OAuth flow
- [ ] Token refresh works correctly
- [ ] API calls succeed after authentication

## 🔐 Security Best Practices

### Development
- Use localhost redirect URIs for local development
- Keep client secrets in .env files (never commit to git)
- Use separate OAuth clients for development and production

### Production
- Use HTTPS for all redirect URIs
- Implement proper CORS settings
- Store client secrets securely (environment variables, secret managers)
- Regularly audit OAuth permissions and users
- Monitor API usage and rate limits

### Token Security
- Encrypt tokens at rest
- Implement automatic token refresh
- Set up token expiration monitoring
- Revoke tokens for inactive users

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)

## 🆘 Need Help?

If you encounter issues:

1. **Check Google Cloud Console Logs**
   - Go to Logging > Logs Explorer
   - Filter by your project and OAuth-related logs

2. **Verify Configuration**
   ```bash
   curl -X GET http://localhost:3001/api/oauth-admin/validate/google_calendar
   ```

3. **Test with Google OAuth Playground**
   - Visit [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Use your client credentials to test the flow

---

**Next**: [Microsoft OAuth Setup](./MICROSOFT_OAUTH_SETUP.md) or return to [Main OAuth Guide](./OAUTH_SETUP_GUIDE.md)