# OAuth Setup Guide - Cold Calling Platform

Complete guide for setting up OAuth integrations with Google and Microsoft services for calendar and email synchronization.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Provider Setup](#provider-setup)
5. [Environment Configuration](#environment-configuration)
6. [Testing & Verification](#testing--verification)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

## 🌟 Overview

This platform integrates with external services to provide seamless calendar and email functionality:

- **Google Integration**: Gmail and Google Calendar access
- **Microsoft Integration**: Outlook Email and Office 365 Calendar access
- **Secure OAuth 2.0**: Industry-standard authentication flows
- **Real-time Sync**: Automatic synchronization of events and emails

## ✅ Prerequisites

Before setting up OAuth integrations, ensure you have:

- [ ] Administrative access to Google Cloud Console (for Google integrations)
- [ ] Administrative access to Azure Portal (for Microsoft integrations)
- [ ] Production domain with HTTPS enabled (for production deployments)
- [ ] Environment variables properly configured
- [ ] Backend server running on accessible URL

## 🚀 Quick Start

### 1. Choose Your Integrations

Determine which services you need:

| Service | Provider | Features | Setup Required |
|---------|----------|----------|----------------|
| Gmail | Google | Email sync, send emails | Google OAuth |
| Google Calendar | Google | Calendar events, scheduling | Google OAuth |
| Outlook Email | Microsoft | Email sync, send emails | Microsoft OAuth |
| Office 365 Calendar | Microsoft | Calendar events, scheduling | Microsoft OAuth |

### 2. Environment Setup

Copy the environment template:
```bash
cp .env.example .env
```

### 3. Provider Configuration

Follow the detailed setup guides:
- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)
- [Microsoft OAuth Setup](./MICROSOFT_OAUTH_SETUP.md)

### 4. Test Integration

Use the built-in testing endpoints to verify setup:
```bash
# Test OAuth configuration
curl -X GET http://localhost:3001/api/oauth-admin/config

# Validate specific provider
curl -X GET http://localhost:3001/api/oauth-admin/validate/google_calendar
```

## 🔧 Provider Setup

### Google Services

1. **Create Google Cloud Project**
2. **Enable APIs** (Gmail, Calendar)
3. **Configure OAuth Consent Screen**
4. **Generate Client Credentials**
5. **Configure Redirect URIs**

**Detailed Guide**: See [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)

### Microsoft Services

1. **Register Azure Application**
2. **Configure API Permissions**
3. **Set Authentication URLs**
4. **Generate Client Secret**
5. **Configure Redirect URIs**

**Detailed Guide**: See [Microsoft OAuth Setup](./MICROSOFT_OAUTH_SETUP.md)

## 🌐 Environment Configuration

Add the following to your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=your-tenant-id

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# OAuth Callback Configuration
OAUTH_SUCCESS_REDIRECT=/integrations?success=true
OAUTH_ERROR_REDIRECT=/integrations?error=true
```

## 🧪 Testing & Verification

### 1. Configuration Test

Test your OAuth configuration:
```bash
# Check overall config
GET /api/oauth-admin/config

# Validate specific provider
GET /api/oauth-admin/validate/{provider}

# Test OAuth flow
POST /api/oauth-admin/test/{provider}
```

### 2. Integration Health Check

Monitor integration health:
```bash
GET /api/oauth-admin/health
```

### 3. Manual Integration Test

1. Navigate to `/integrations` in the frontend
2. Click "Connect" for desired service
3. Complete OAuth flow
4. Verify successful connection
5. Test sync functionality

## 🔧 Troubleshooting

### Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Invalid Client ID | "Invalid client" error | Verify client ID in environment |
| Redirect URI Mismatch | "redirect_uri_mismatch" | Check OAuth provider settings |
| Invalid Scopes | "access_denied" | Verify required scopes are configured |
| Expired Tokens | "invalid_grant" | Use token refresh endpoint |

### Debug Mode

Enable detailed logging:
```bash
# Set debug environment
DEBUG=oauth:*,integration:*

# Start server with debug
npm run dev
```

### Health Check Endpoint

```bash
# Check system health
curl -X GET http://localhost:3001/api/health

# Detailed integration health
curl -X GET http://localhost:3001/api/oauth-admin/health
```

## 🔐 Security Best Practices

### Environment Security

- [ ] Never commit `.env` files to version control
- [ ] Use strong, unique client secrets
- [ ] Regularly rotate OAuth credentials
- [ ] Use HTTPS in production
- [ ] Implement proper CORS settings

### Token Management

- [ ] Store tokens encrypted at rest
- [ ] Implement automatic token refresh
- [ ] Monitor token expiration
- [ ] Revoke unused tokens
- [ ] Audit token access regularly

### Production Considerations

- [ ] Use separate OAuth apps for staging/production
- [ ] Implement rate limiting
- [ ] Monitor OAuth usage
- [ ] Set up alerting for failures
- [ ] Regular security audits

## 📚 Additional Resources

- [Google OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)
- [Microsoft OAuth Setup Guide](./MICROSOFT_OAUTH_SETUP.md)
- [Environment Configuration Guide](./.env.example)
- [API Documentation](./backend/API_DOCUMENTATION.md)

## 🆘 Support

If you encounter issues:

1. **Check Logs**: Review server logs for detailed error messages
2. **Verify Configuration**: Use the validation endpoints
3. **Test Connectivity**: Ensure OAuth providers are accessible
4. **Review Documentation**: Check provider-specific setup guides

## 📝 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-10 | Initial OAuth setup guide |

---

**Next Steps**: Choose your integration provider and follow the detailed setup guide:
- [🔗 Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)
- [🔗 Microsoft OAuth Setup](./MICROSOFT_OAUTH_SETUP.md)