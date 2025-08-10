# Microsoft OAuth Setup Guide

Step-by-step guide to configure Microsoft OAuth for Outlook Email and Office 365 Calendar integration.

## 📋 Overview

This guide covers:
- Azure Active Directory app registration
- Microsoft Graph API permissions
- OAuth application configuration
- Redirect URI setup for Microsoft
- Testing and troubleshooting Microsoft-specific issues

## 🚀 Prerequisites

- Microsoft account with admin privileges (personal or organizational)
- Access to Azure Portal or Microsoft 365 Admin Center
- Cold Calling Platform backend running

## 📝 Step-by-Step Setup

### Step 1: Access Azure Portal

1. **Navigate to Azure Portal**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Sign in with your Microsoft account

2. **Navigate to Azure Active Directory**
   ```
   - In the left sidebar, click "Azure Active Directory"
   - Or search for "Azure Active Directory" in the top search bar
   ```

### Step 2: Register Application

1. **App Registrations**
   ```
   - In Azure AD menu, click "App registrations"
   - Click "New registration"
   ```

2. **Configure Basic Information**
   ```
   Name: ColdCaller Integration
   Supported account types: 
     - "Accounts in any organizational directory and personal Microsoft accounts"
     - This allows both business and personal Microsoft accounts
   
   Redirect URI:
     - Platform: Web
     - URI: http://localhost:3000/integrations/callback
   ```

3. **Register Application**
   ```
   - Click "Register"
   - Note the "Application (client) ID" - you'll need this
   - Note the "Directory (tenant) ID" - you'll need this too
   ```

### Step 3: Configure Authentication

1. **Add Redirect URIs**
   ```
   - Go to "Authentication" in the left menu
   - Under "Redirect URIs", add the following:
   
   Development:
   - http://localhost:3000/integrations/callback
   - http://localhost:3000/oauth/callback
   - http://localhost:3001/api/integrations/callback
   
   Production:
   - https://your-domain.com/integrations/callback
   - https://your-domain.com/oauth/callback
   - https://api.your-domain.com/integrations/callback
   ```

2. **Configure Advanced Settings**
   ```
   Logout URL: (Optional) http://localhost:3000/logout
   
   Front-channel logout URL: (Optional) http://localhost:3000/logout
   
   Implicit grant and hybrid flows:
   - ☑ Access tokens (used for implicit flows)
   - ☑ ID tokens (used for implicit and hybrid flows)
   
   Allow public client flows: No (keep disabled for security)
   ```

### Step 4: Create Client Secret

1. **Navigate to Certificates & Secrets**
   ```
   - Click "Certificates & secrets" in left menu
   - Click "New client secret"
   ```

2. **Configure Client Secret**
   ```
   Description: ColdCaller Client Secret
   Expires: 24 months (recommended for production)
   
   Click "Add"
   ```

3. **Save Client Secret**
   ```
   ⚠️  IMPORTANT: Copy the secret value immediately!
   It will not be shown again after you leave this page.
   Store it securely in your .env file.
   ```

### Step 5: Configure API Permissions

1. **Navigate to API Permissions**
   ```
   - Click "API permissions" in left menu
   - Click "Add a permission"
   ```

2. **Add Microsoft Graph Permissions**
   ```
   - Click "Microsoft Graph"
   - Click "Delegated permissions"
   ```

3. **Select Required Permissions**

   **For Email Integration (Outlook):**
   ```
   Mail permissions:
   - Mail.Read
   - Mail.ReadWrite
   - Mail.Send
   
   User permissions:
   - User.Read (added by default)
   ```

   **For Calendar Integration:**
   ```
   Calendar permissions:
   - Calendars.Read
   - Calendars.ReadWrite
   ```

   **Complete Permission List:**
   ```
   ✓ Calendars.Read
   ✓ Calendars.ReadWrite  
   ✓ Mail.Read
   ✓ Mail.ReadWrite
   ✓ Mail.Send
   ✓ User.Read
   ✓ offline_access (for refresh tokens)
   ✓ openid (for OpenID Connect)
   ✓ profile (for user profile info)
   ```

4. **Grant Admin Consent**
   ```
   - Click "Grant admin consent for [your tenant]"
   - Click "Yes" to confirm
   - Verify all permissions show "Granted for [tenant]"
   ```

### Step 6: Configure Token Settings

1. **Optional Claims**
   ```
   - Go to "Token configuration" in left menu
   - Add optional claims if needed:
     - ID tokens: email, family_name, given_name
     - Access tokens: email
   ```

2. **API Permissions Review**
   ```
   Verify the following permissions are configured:
   
   Microsoft Graph (Delegated):
   - Calendars.Read
   - Calendars.ReadWrite
   - Mail.Read
   - Mail.ReadWrite  
   - Mail.Send
   - User.Read
   - offline_access
   - openid
   - profile
   ```

### Step 7: Environment Configuration

Add the credentials to your `.env` file:

```bash
# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
MICROSOFT_TENANT_ID=your-directory-tenant-id

# Microsoft Graph API Configuration
MICROSOFT_GRAPH_SCOPE=https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access openid profile

# Application URLs (must match redirect URIs in Azure)
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

### Step 8: Test Configuration

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
   
   # Validate Microsoft setup
   curl -X GET http://localhost:3001/api/oauth-admin/validate/microsoft_calendar
   curl -X GET http://localhost:3001/api/oauth-admin/validate/outlook_email
   ```

3. **Test OAuth Flow**
   ```bash
   # Test authentication URL generation
   curl -X POST http://localhost:3001/api/oauth-admin/test/microsoft_calendar \
     -H "Content-Type: application/json" \
     -d '{"mode": "auth_url_only"}'
   ```

4. **Manual Integration Test**
   - Navigate to http://localhost:3000/integrations
   - Click "Connect Microsoft Calendar" or "Connect Outlook Email"
   - Complete the OAuth flow
   - Verify successful connection

## 🔧 Advanced Configuration

### Custom Scopes

Modify scopes based on your needs:

```bash
# Minimal Email Access (read-only)
MICROSOFT_EMAIL_SCOPES=https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access

# Full Email Access
MICROSOFT_EMAIL_SCOPES=https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access

# Calendar Read-Only
MICROSOFT_CALENDAR_SCOPES=https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read offline_access

# Full Calendar Access
MICROSOFT_CALENDAR_SCOPES=https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access
```

### Multi-tenant Configuration

For organizational deployment:

1. **Configure App for Multi-tenant**
   ```
   - In App registration > Authentication
   - Supported account types: "Accounts in any organizational directory"
   ```

2. **Admin Consent Workflow**
   ```
   - Enable "Admin consent requests" in Azure AD
   - Configure approval process for permissions
   ```

### Application Permissions vs Delegated Permissions

```
Delegated Permissions:
- Act on behalf of signed-in user
- User must be present and consent
- Recommended for most scenarios

Application Permissions:
- App acts with its own identity
- Requires admin consent
- Use for background services
```

## 🐛 Troubleshooting

### Common Errors

#### 1. "Invalid Client"
```
Error: AADSTS70011: The provided value for the input parameter 'scope' is not valid.

Solutions:
- Verify MICROSOFT_CLIENT_ID in .env file
- Check that client ID matches Azure app registration
- Ensure app is not deleted or disabled in Azure
```

#### 2. "Redirect URI Mismatch"
```
Error: AADSTS50011: The reply URL specified in the request does not match the reply URLs configured for the application.

Solutions:
- Check redirect URIs in Azure app registration
- Ensure URLs exactly match (including http/https, port numbers)
- Verify FRONTEND_URL in .env matches registered URIs
```

#### 3. "Insufficient Privileges"
```
Error: AADSTS65001: The user or administrator has not consented to use the application.

Solutions:
- Grant admin consent in Azure portal
- Ensure all required permissions are added
- Check if user account has necessary privileges
```

#### 4. "Invalid Scope"
```
Error: AADSTS70011: Invalid scope.

Solutions:
- Verify scope URLs are correct in .env
- Check that permissions are granted in Azure portal
- Ensure offline_access is included for refresh tokens
```

#### 5. "Token Expired"
```
Error: AADSTS70008: The provided authorization grant is expired.

Solutions:
- Implement token refresh logic
- Check token expiration handling
- Verify refresh token is stored and used correctly
```

### Debug Mode

Enable detailed logging:

```bash
# Add to .env
DEBUG=oauth:*,microsoft:*
LOG_LEVEL=debug

# Restart your application
npm run dev
```

### Microsoft Graph API Limits

Microsoft Graph has throttling limits:

```
Outlook Mail:
- 10,000 API requests per 10 minutes per application per mailbox
- 4 concurrent requests per mailbox

Calendar:
- 10,000 API requests per 10 minutes per application per mailbox
- 4 concurrent requests per mailbox

User profile:
- 10,000 API requests per 10 minutes per application per tenant
```

Monitor usage in Azure portal under your app registration.

## ✅ Testing Checklist

Before going to production:

- [ ] App registration is complete with all required settings
- [ ] Client secret is generated and stored securely
- [ ] All required permissions are added and admin consent granted
- [ ] Redirect URIs are configured correctly for both development and production
- [ ] Environment variables are set correctly
- [ ] OAuth flow completes successfully
- [ ] Token refresh works correctly
- [ ] API calls succeed after authentication
- [ ] Error handling is implemented for common scenarios

## 🔐 Security Best Practices

### Development
- Use localhost redirect URIs for local development
- Store client secrets in .env files (never commit to git)
- Use separate app registrations for development and production
- Test with different user account types (personal vs organizational)

### Production
- Use HTTPS for all redirect URIs
- Implement proper CORS settings
- Store client secrets securely (Azure Key Vault, environment variables)
- Enable conditional access policies if using organizational accounts
- Monitor sign-in logs in Azure AD
- Set up alerts for suspicious activities

### Token Security
- Encrypt tokens at rest
- Implement automatic token refresh
- Set up token expiration monitoring
- Revoke tokens for inactive users
- Use shortest-lived tokens possible

### Permissions
- Request minimum required permissions
- Review permissions regularly
- Implement incremental consent where possible
- Monitor permission usage and access patterns

## 📚 Additional Resources

- [Microsoft identity platform documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Graph API documentation](https://docs.microsoft.com/en-us/graph/)
- [OAuth 2.0 and OpenID Connect protocols](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-protocols)
- [Microsoft Graph permissions reference](https://docs.microsoft.com/en-us/graph/permissions-reference)

## 🆘 Need Help?

If you encounter issues:

1. **Check Azure AD Sign-in Logs**
   ```
   - Go to Azure AD > Monitoring > Sign-in logs
   - Filter by your application ID
   - Review failed sign-in attempts
   ```

2. **Verify Configuration**
   ```bash
   curl -X GET http://localhost:3001/api/oauth-admin/validate/microsoft_calendar
   ```

3. **Use Microsoft Graph Explorer**
   - Visit [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
   - Test API calls with your permissions
   - Validate token scope and permissions

4. **Check Audit Logs**
   ```
   - Azure AD > Monitoring > Audit logs
   - Look for permission changes and app modifications
   ```

---

**Next**: Return to [Main OAuth Guide](./OAUTH_SETUP_GUIDE.md) or check [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)