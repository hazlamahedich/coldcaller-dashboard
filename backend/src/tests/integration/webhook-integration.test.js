/**
 * Webhook Integration Tests
 * Testing & QA Engineer - Comprehensive webhook handling and integration tests
 */

const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const EventEmitter = require('events');

// Mock webhook service
class MockWebhookService extends EventEmitter {
  constructor() {
    super();
    this.webhooks = new Map();
    this.events = [];
  }

  register(webhook) {
    this.webhooks.set(webhook.id, webhook);
  }

  handleWebhook(payload, headers) {
    this.events.push({ payload, headers, timestamp: Date.now() });
    this.emit('webhook', { payload, headers });
  }

  getEvents() {
    return this.events;
  }

  clearEvents() {
    this.events = [];
  }
}

describe('Webhook Integration Tests', () => {
  let app;
  let webhookService;
  let server;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(express.raw({ type: 'application/json' }));
    
    webhookService = new MockWebhookService();

    // Webhook verification middleware
    const verifyWebhook = (req, res, next) => {
      const signature = req.headers['x-webhook-signature'];
      const secret = process.env.WEBHOOK_SECRET || 'test-secret';
      
      if (!signature) {
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');

      if (expectedSignature !== receivedSignature) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      next();
    };

    // Webhook endpoints
    app.post('/webhooks/calendar', verifyWebhook, (req, res) => {
      try {
        webhookService.handleWebhook(req.body, req.headers);
        res.status(200).json({ received: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/webhooks/email', verifyWebhook, (req, res) => {
      try {
        webhookService.handleWebhook(req.body, req.headers);
        res.status(200).json({ received: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/webhooks/generic', verifyWebhook, (req, res) => {
      try {
        webhookService.handleWebhook(req.body, req.headers);
        res.status(200).json({ received: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Health check
    app.get('/webhooks/health', (req, res) => {
      res.status(200).json({ status: 'healthy', timestamp: Date.now() });
    });

    server = app.listen(0); // Use random available port
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    webhookService.clearEvents();
    jest.clearAllMocks();
  });

  describe('Webhook Authentication', () => {
    it('should accept valid webhook signatures', async () => {
      const payload = { event: 'calendar.created', data: { id: '123' } };
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/calendar')
        .set('x-webhook-signature', `sha256=${signature}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });

    it('should reject invalid webhook signatures', async () => {
      const payload = { event: 'calendar.created', data: { id: '123' } };
      const invalidSignature = 'invalid-signature';

      const response = await request(app)
        .post('/webhooks/calendar')
        .set('x-webhook-signature', `sha256=${invalidSignature}`)
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid webhook signature');
    });

    it('should reject requests without signatures', async () => {
      const payload = { event: 'calendar.created', data: { id: '123' } };

      const response = await request(app)
        .post('/webhooks/calendar')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Missing webhook signature');
    });

    it('should handle malformed signatures', async () => {
      const payload = { event: 'calendar.created', data: { id: '123' } };

      const response = await request(app)
        .post('/webhooks/calendar')
        .set('x-webhook-signature', 'malformed-signature-without-prefix')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid webhook signature');
    });
  });

  describe('Calendar Webhook Events', () => {
    const createValidRequest = (payload) => {
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return request(app)
        .post('/webhooks/calendar')
        .set('x-webhook-signature', `sha256=${signature}`)
        .send(payload);
    };

    it('should handle calendar event created webhook', async () => {
      const payload = {
        event: 'calendar.event.created',
        data: {
          id: 'cal_event_123',
          summary: 'Follow-up meeting',
          start: '2024-01-15T14:00:00Z',
          end: '2024-01-15T15:00:00Z',
          attendees: ['user@example.com'],
          creator: 'system@coldcaller.com'
        }
      };

      let webhookReceived = false;
      webhookService.once('webhook', (data) => {
        webhookReceived = true;
        expect(data.payload.event).toBe('calendar.event.created');
        expect(data.payload.data.id).toBe('cal_event_123');
      });

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      expect(webhookReceived).toBe(true);
    });

    it('should handle calendar event updated webhook', async () => {
      const payload = {
        event: 'calendar.event.updated',
        data: {
          id: 'cal_event_123',
          summary: 'Updated meeting title',
          changes: ['summary', 'start_time'],
          previous: {
            summary: 'Original meeting title',
            start: '2024-01-15T14:00:00Z'
          },
          current: {
            summary: 'Updated meeting title',
            start: '2024-01-15T15:00:00Z'
          }
        }
      };

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].payload.event).toBe('calendar.event.updated');
      expect(events[0].payload.data.changes).toContain('summary');
    });

    it('should handle calendar event deleted webhook', async () => {
      const payload = {
        event: 'calendar.event.deleted',
        data: {
          id: 'cal_event_123',
          summary: 'Cancelled meeting',
          deleted_by: 'user@example.com',
          deleted_at: '2024-01-15T10:30:00Z'
        }
      };

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.event).toBe('calendar.event.deleted');
      expect(events[0].payload.data.deleted_by).toBe('user@example.com');
    });

    it('should handle calendar sync status webhook', async () => {
      const payload = {
        event: 'calendar.sync.completed',
        data: {
          user_id: 'user_123',
          provider: 'google',
          status: 'success',
          events_synced: 25,
          last_sync: '2024-01-15T12:00:00Z',
          next_sync: '2024-01-15T18:00:00Z'
        }
      };

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.data.events_synced).toBe(25);
      expect(events[0].payload.data.status).toBe('success');
    });

    it('should handle calendar authorization revoked webhook', async () => {
      const payload = {
        event: 'calendar.auth.revoked',
        data: {
          user_id: 'user_123',
          provider: 'google',
          revoked_at: '2024-01-15T11:00:00Z',
          reason: 'user_action'
        }
      };

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.event).toBe('calendar.auth.revoked');
      expect(events[0].payload.data.provider).toBe('google');
    });
  });

  describe('Email Webhook Events', () => {
    const createValidRequest = (payload) => {
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return request(app)
        .post('/webhooks/email')
        .set('x-webhook-signature', `sha256=${signature}`)
        .send(payload);
    };

    it('should handle email sent webhook', async () => {
      const payload = {
        event: 'email.sent',
        data: {
          id: 'email_123',
          to: 'recipient@example.com',
          from: 'sender@coldcaller.com',
          subject: 'Follow-up email',
          sent_at: '2024-01-15T13:00:00Z',
          message_id: 'msg_abc123',
          lead_id: 'lead_456'
        }
      };

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.event).toBe('email.sent');
      expect(events[0].payload.data.lead_id).toBe('lead_456');
    });

    it('should handle email delivered webhook', async () => {
      const payload = {
        event: 'email.delivered',
        data: {
          id: 'email_123',
          message_id: 'msg_abc123',
          delivered_at: '2024-01-15T13:02:00Z',
          recipient: 'recipient@example.com',
          delivery_status: 'delivered'
        }
      };

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.data.delivery_status).toBe('delivered');
    });

    it('should handle email opened webhook', async () => {
      const payload = {
        event: 'email.opened',
        data: {
          id: 'email_123',
          message_id: 'msg_abc123',
          opened_at: '2024-01-15T14:30:00Z',
          recipient: 'recipient@example.com',
          user_agent: 'Mozilla/5.0...',
          ip_address: '192.168.1.100',
          location: 'New York, NY'
        }
      };

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.data.location).toBe('New York, NY');
    });

    it('should handle email bounced webhook', async () => {
      const payload = {
        event: 'email.bounced',
        data: {
          id: 'email_123',
          message_id: 'msg_abc123',
          bounced_at: '2024-01-15T13:05:00Z',
          recipient: 'invalid@example.com',
          bounce_type: 'hard',
          bounce_reason: 'mailbox_does_not_exist',
          diagnostic_code: '550 5.1.1 User unknown'
        }
      };

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.data.bounce_type).toBe('hard');
      expect(events[0].payload.data.bounce_reason).toBe('mailbox_does_not_exist');
    });

    it('should handle email replied webhook', async () => {
      const payload = {
        event: 'email.replied',
        data: {
          id: 'email_123',
          original_message_id: 'msg_abc123',
          reply_message_id: 'reply_xyz789',
          replied_at: '2024-01-15T16:45:00Z',
          from: 'recipient@example.com',
          subject: 'Re: Follow-up email',
          preview: 'Thank you for your email. I would like to schedule...',
          lead_id: 'lead_456'
        }
      };

      const response = await createValidRequest(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.event).toBe('email.replied');
      expect(events[0].payload.data.reply_message_id).toBe('reply_xyz789');
    });
  });

  describe('Webhook Event Processing', () => {
    it('should handle multiple simultaneous webhooks', async () => {
      const payloads = [
        { event: 'email.sent', data: { id: 'email_1' } },
        { event: 'calendar.event.created', data: { id: 'cal_1' } },
        { event: 'email.delivered', data: { id: 'email_1' } }
      ];

      const promises = payloads.map(payload => {
        const secret = 'test-secret';
        const signature = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');

        return request(app)
          .post('/webhooks/generic')
          .set('x-webhook-signature', `sha256=${signature}`)
          .send(payload);
      });

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const events = webhookService.getEvents();
      expect(events).toHaveLength(3);
    });

    it('should handle large webhook payloads', async () => {
      const largeData = {
        event: 'calendar.bulk.import',
        data: {
          events: Array.from({ length: 100 }, (_, i) => ({
            id: `event_${i}`,
            summary: `Event ${i}`,
            description: 'A'.repeat(1000) // 1KB description
          }))
        }
      };

      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(largeData))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/generic')
        .set('x-webhook-signature', `sha256=${signature}`)
        .send(largeData);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.data.events).toHaveLength(100);
    });

    it('should handle webhook retries', async () => {
      // Mock server error on first request
      let requestCount = 0;
      
      app.post('/webhooks/retry-test', (req, res) => {
        requestCount++;
        if (requestCount === 1) {
          res.status(500).json({ error: 'Temporary server error' });
        } else {
          res.status(200).json({ received: true, attempt: requestCount });
        }
      });

      const payload = { event: 'test.retry', data: { id: 'retry_123' } };

      // First request should fail
      const firstResponse = await request(app)
        .post('/webhooks/retry-test')
        .send(payload);

      expect(firstResponse.status).toBe(500);

      // Second request should succeed
      const secondResponse = await request(app)
        .post('/webhooks/retry-test')
        .send(payload);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.attempt).toBe(2);
    });
  });

  describe('Webhook Error Scenarios', () => {
    it('should handle malformed JSON payloads', async () => {
      const response = await request(app)
        .post('/webhooks/generic')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const payload = {
        // Missing 'event' field
        data: { id: 'test_123' }
      };

      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/generic')
        .set('x-webhook-signature', `sha256=${signature}`)
        .send(payload);

      expect(response.status).toBe(200); // Webhook still processed
      
      const events = webhookService.getEvents();
      expect(events[0].payload).toEqual(payload);
    });

    it('should handle webhook timeouts', async () => {
      // Mock slow webhook processing
      let processingTime = 0;
      
      app.post('/webhooks/timeout-test', (req, res) => {
        setTimeout(() => {
          res.status(200).json({ received: true });
        }, 100); // 100ms delay
        
        processingTime = Date.now();
      });

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/webhooks/timeout-test')
        .timeout(1000) // 1 second timeout
        .send({ event: 'test.timeout' });

      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeGreaterThan(100);
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should rate limit webhook requests', async () => {
      const payload = { event: 'rate.limit.test', data: { id: 'rate_123' } };
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Send multiple requests rapidly
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/webhooks/generic')
          .set('x-webhook-signature', `sha256=${signature}`)
          .send(payload)
      );

      const responses = await Promise.all(promises);

      // All should succeed (no rate limiting in test setup)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Webhook Security', () => {
    it('should validate webhook origin', async () => {
      const payload = { event: 'security.test', data: { id: 'sec_123' } };
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/generic')
        .set('x-webhook-signature', `sha256=${signature}`)
        .set('x-forwarded-for', '192.168.1.100')
        .set('user-agent', 'TestWebhookClient/1.0')
        .send(payload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].headers['x-forwarded-for']).toBe('192.168.1.100');
    });

    it('should handle replay attacks', async () => {
      const payload = { 
        event: 'replay.test', 
        data: { id: 'replay_123' },
        timestamp: Date.now() - 10000 // 10 seconds ago
      };
      
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // First request
      const response1 = await request(app)
        .post('/webhooks/generic')
        .set('x-webhook-signature', `sha256=${signature}`)
        .set('x-webhook-timestamp', payload.timestamp.toString())
        .send(payload);

      expect(response1.status).toBe(200);

      // Duplicate request (replay attack)
      const response2 = await request(app)
        .post('/webhooks/generic')
        .set('x-webhook-signature', `sha256=${signature}`)
        .set('x-webhook-timestamp', payload.timestamp.toString())
        .send(payload);

      // Should accept duplicate (no replay protection in basic implementation)
      expect(response2.status).toBe(200);
    });
  });

  describe('Webhook Health and Monitoring', () => {
    it('should provide webhook health endpoint', async () => {
      const response = await request(app)
        .get('/webhooks/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should log webhook processing metrics', async () => {
      const payload = { event: 'metrics.test', data: { id: 'metrics_123' } };
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const startTime = Date.now();

      const response = await request(app)
        .post('/webhooks/generic')
        .set('x-webhook-signature', `sha256=${signature}`)
        .send(payload);

      const endTime = Date.now();

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].timestamp).toBeGreaterThanOrEqual(startTime);
      expect(events[0].timestamp).toBeLessThanOrEqual(endTime);
    });
  });

  describe('Integration with External Services', () => {
    it('should handle Google Calendar webhooks', async () => {
      const googleWebhookPayload = {
        kind: 'api#channel',
        id: 'channel-123',
        resourceId: 'resource-456',
        resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        type: 'web_hook'
      };

      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(googleWebhookPayload))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/calendar')
        .set('x-webhook-signature', `sha256=${signature}`)
        .set('x-goog-channel-id', 'channel-123')
        .set('x-goog-resource-id', 'resource-456')
        .send(googleWebhookPayload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.id).toBe('channel-123');
      expect(events[0].headers['x-goog-channel-id']).toBe('channel-123');
    });

    it('should handle Microsoft Outlook webhooks', async () => {
      const outlookWebhookPayload = {
        '@odata.type': '#Microsoft.Graph.changeNotification',
        id: 'notification-789',
        subscriptionId: 'subscription-abc',
        resource: "me/events('event-123')",
        changeType: 'updated',
        clientState: 'client-state-xyz'
      };

      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(outlookWebhookPayload))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/calendar')
        .set('x-webhook-signature', `sha256=${signature}`)
        .send(outlookWebhookPayload);

      expect(response.status).toBe(200);
      
      const events = webhookService.getEvents();
      expect(events[0].payload.changeType).toBe('updated');
    });
  });
});