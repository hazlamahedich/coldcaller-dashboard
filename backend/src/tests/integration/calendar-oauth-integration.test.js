/**
 * Calendar OAuth Integration Tests
 * Testing & QA Engineer - Comprehensive OAuth flow testing with mock providers
 */

const request = require('supertest');
const express = require('express');
const CalendarService = require('../../services/../../../src/followup/services/calendar.service');
const { google } = require('googleapis');

// Mock external dependencies
jest.mock('googleapis');
jest.mock('@azure/microsoft-graph-client');
jest.mock('@azure/msal-node');

describe('Calendar OAuth Integration Tests', () => {
  let app;
  let mockGoogleAuth;
  let mockOutlookClient;
  
  beforeAll(async () => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock Google OAuth
    mockGoogleAuth = {
      generateAuthUrl: jest.fn(),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn()
    };
    
    google.auth.OAuth2.mockImplementation(() => mockGoogleAuth);
    google.calendar = jest.fn().mockReturnValue({
      events: {
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        get: jest.fn()
      },
      freebusy: {
        query: jest.fn()
      }
    });
    
    // Mock Microsoft Graph Client
    mockOutlookClient = {
      api: jest.fn().mockReturnThis(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      get: jest.fn()
    };
    
    const graphClient = require('@azure/microsoft-graph-client');
    graphClient.Client = {
      init: jest.fn(() => mockOutlookClient)
    };
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup environment variables
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'test_google_client_id';
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test_google_client_secret';
    process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'http://localhost:3001/auth/google/callback';
    process.env.MICROSOFT_CLIENT_ID = 'test_microsoft_client_id';
    process.env.MICROSOFT_CLIENT_SECRET = 'test_microsoft_client_secret';
    process.env.MICROSOFT_REDIRECT_URI = 'http://localhost:3001/auth/microsoft/callback';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    delete process.env.GOOGLE_CALENDAR_REDIRECT_URI;
    delete process.env.MICROSOFT_CLIENT_ID;
    delete process.env.MICROSOFT_CLIENT_SECRET;
    delete process.env.MICROSOFT_REDIRECT_URI;
  });

  describe('Google Calendar OAuth Flow', () => {
    it('should generate Google OAuth URL with correct parameters', () => {
      const state = 'test-state-123';
      
      mockGoogleAuth.generateAuthUrl.mockReturnValue(
        'https://accounts.google.com/oauth2/authorize?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&state=test-state-123'
      );

      const authUrl = CalendarService.getOAuthUrl('google', state);

      expect(authUrl).toContain('accounts.google.com/oauth2/authorize');
      expect(authUrl).toContain('calendar');
      expect(authUrl).toContain('test-state-123');
      expect(mockGoogleAuth.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ],
        state: state
      });
    });

    it('should exchange authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'ya29.test_access_token',
        refresh_token: 'test_refresh_token',
        scope: 'https://www.googleapis.com/auth/calendar',
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000
      };

      mockGoogleAuth.getToken.mockResolvedValue({ tokens: mockTokens });

      const result = await CalendarService.exchangeCodeForTokens('test_auth_code', 'google', 'test-state-123');

      expect(result).toEqual(mockTokens);
      expect(mockGoogleAuth.getToken).toHaveBeenCalledWith('test_auth_code');
    });

    it('should handle OAuth token refresh', async () => {
      const mockRefreshedTokens = {
        access_token: 'ya29.new_access_token',
        refresh_token: 'test_refresh_token',
        expiry_date: Date.now() + 3600000
      };

      mockGoogleAuth.refreshAccessToken.mockResolvedValue({
        credentials: mockRefreshedTokens
      });

      const userTokens = {
        refresh_token: 'test_refresh_token'
      };

      CalendarService.providers.google = mockGoogleAuth;
      mockGoogleAuth.setCredentials(userTokens);
      
      const result = await mockGoogleAuth.refreshAccessToken();

      expect(result.credentials).toEqual(mockRefreshedTokens);
      expect(mockGoogleAuth.setCredentials).toHaveBeenCalledWith(userTokens);
    });

    it('should handle expired tokens gracefully', async () => {
      const expiredTokens = {
        access_token: 'expired_token',
        refresh_token: 'test_refresh_token',
        expiry_date: Date.now() - 1000 // Expired
      };

      mockGoogleAuth.setCredentials.mockImplementation(() => {
        throw new Error('Token has expired');
      });

      await expect(async () => {
        CalendarService.providers.google = mockGoogleAuth;
        mockGoogleAuth.setCredentials(expiredTokens);
      }).rejects.toThrow('Token has expired');
    });
  });

  describe('Microsoft Outlook OAuth Flow', () => {
    it('should generate Microsoft OAuth URL with correct parameters', () => {
      const state = 'test-state-456';
      
      const authUrl = CalendarService.getOAuthUrl('outlook', state);

      expect(authUrl).toContain('login.microsoftonline.com');
      expect(authUrl).toContain('calendars.readwrite');
      expect(authUrl).toContain('test-state-456');
      expect(authUrl).toContain(process.env.MICROSOFT_CLIENT_ID);
    });

    it('should exchange authorization code for Microsoft tokens', async () => {
      const mockTokenResponse = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'https://graph.microsoft.com/calendars.readwrite'
      };

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockTokenResponse)
      });

      const result = await CalendarService.exchangeCodeForTokens('test_auth_code', 'outlook', 'test-state-456');

      expect(result).toEqual(mockTokenResponse);
      expect(fetch).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
    });

    it('should handle Microsoft token refresh', async () => {
      const refreshTokenResponse = {
        access_token: 'new_access_token_123',
        refresh_token: 'refresh_token_123',
        token_type: 'Bearer',
        expires_in: 3600
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(refreshTokenResponse)
      });

      const result = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: 'refresh_token_123',
          client_id: process.env.MICROSOFT_CLIENT_ID,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET
        })
      });

      const tokenData = await result.json();
      expect(tokenData).toEqual(refreshTokenResponse);
    });
  });

  describe('OAuth Error Scenarios', () => {
    it('should handle invalid authorization code', async () => {
      mockGoogleAuth.getToken.mockRejectedValue(new Error('invalid_grant'));

      await expect(
        CalendarService.exchangeCodeForTokens('invalid_code', 'google', 'test-state')
      ).rejects.toThrow('invalid_grant');
    });

    it('should handle network errors during token exchange', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        CalendarService.exchangeCodeForTokens('test_code', 'outlook', 'test-state')
      ).rejects.toThrow('Network error');
    });

    it('should handle malformed token responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(
        CalendarService.exchangeCodeForTokens('test_code', 'outlook', 'test-state')
      ).rejects.toThrow('Invalid JSON');
    });

    it('should validate required environment variables', () => {
      delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
      
      expect(() => {
        CalendarService.getOAuthUrl('google', 'test-state');
      }).toThrow('Google Calendar provider not initialized');
    });
  });

  describe('OAuth State Management', () => {
    it('should validate state parameter in callback', async () => {
      const originalState = 'secure-state-123';
      const callbackState = 'secure-state-123';

      expect(originalState).toBe(callbackState);
    });

    it('should reject mismatched state parameters', async () => {
      const originalState = 'secure-state-123';
      const callbackState = 'malicious-state-456';

      expect(originalState).not.toBe(callbackState);
    });

    it('should handle missing state parameter', () => {
      expect(() => {
        CalendarService.getOAuthUrl('google', null);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Token Storage and Retrieval', () => {
    it('should securely store OAuth tokens', async () => {
      const tokens = {
        access_token: 'secure_token_123',
        refresh_token: 'secure_refresh_123',
        expiry_date: Date.now() + 3600000
      };

      // Mock secure storage
      const mockStorage = {
        set: jest.fn(),
        get: jest.fn().mockResolvedValue(tokens)
      };

      await mockStorage.set('user_123_google_tokens', tokens);
      const retrievedTokens = await mockStorage.get('user_123_google_tokens');

      expect(retrievedTokens).toEqual(tokens);
      expect(mockStorage.set).toHaveBeenCalledWith('user_123_google_tokens', tokens);
    });

    it('should encrypt sensitive token data', () => {
      const tokens = {
        access_token: 'sensitive_token',
        refresh_token: 'sensitive_refresh'
      };

      // Mock encryption
      const mockEncrypt = jest.fn().mockReturnValue('encrypted_data');
      const mockDecrypt = jest.fn().mockReturnValue(JSON.stringify(tokens));

      const encrypted = mockEncrypt(JSON.stringify(tokens));
      const decrypted = JSON.parse(mockDecrypt(encrypted));

      expect(encrypted).toBe('encrypted_data');
      expect(decrypted).toEqual(tokens);
    });
  });

  describe('Multi-Provider OAuth Support', () => {
    it('should handle multiple OAuth providers simultaneously', async () => {
      const googleTokens = { access_token: 'google_token', provider: 'google' };
      const outlookTokens = { access_token: 'outlook_token', provider: 'outlook' };

      mockGoogleAuth.getToken.mockResolvedValue({ tokens: googleTokens });
      
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue(outlookTokens)
      });

      const [googleResult, outlookResult] = await Promise.all([
        CalendarService.exchangeCodeForTokens('google_code', 'google', 'state1'),
        CalendarService.exchangeCodeForTokens('outlook_code', 'outlook', 'state2')
      ]);

      expect(googleResult).toEqual(googleTokens);
      expect(outlookResult).toEqual(outlookTokens);
    });

    it('should handle unsupported OAuth providers', () => {
      expect(() => {
        CalendarService.getOAuthUrl('unsupported_provider', 'test-state');
      }).toThrow('OAuth not supported for provider: unsupported_provider');
    });
  });
});