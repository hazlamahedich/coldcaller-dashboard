/**
 * End-to-End Calendar and Email Integration Tests
 * Testing & QA Engineer - Comprehensive E2E workflows for calendar and email features
 */

describe('Calendar and Email Integration E2E Tests', () => {
  beforeEach(() => {
    // Setup test data
    cy.fixture('test-leads').as('leads');
    cy.fixture('oauth-tokens').as('tokens');
    
    // Mock external API responses
    cy.intercept('GET', '/api/health', { fixture: 'health-response' });
    cy.intercept('GET', '/api/leads', { fixture: 'leads-response' });
    cy.intercept('POST', '/api/calendar/oauth/google', { fixture: 'google-oauth-response' });
    cy.intercept('POST', '/api/calendar/oauth/outlook', { fixture: 'outlook-oauth-response' });
    
    // Visit the application
    cy.visit('/');
    
    // Mock authentication if required
    cy.window().then((win) => {
      win.localStorage.setItem('auth_token', 'test-jwt-token');
    });
  });

  describe('OAuth Authorization Flow', () => {
    it('should complete Google Calendar OAuth flow', () => {
      // Navigate to settings/integrations
      cy.get('[data-cy="settings-menu"]').click();
      cy.get('[data-cy="integrations-tab"]').click();
      
      // Start Google Calendar OAuth
      cy.get('[data-cy="google-calendar-connect"]').click();
      
      // Mock OAuth redirect
      cy.intercept('GET', '/api/calendar/oauth/google/url', {
        statusCode: 200,
        body: { 
          authUrl: 'https://accounts.google.com/oauth2/authorize?client_id=test',
          state: 'test-state-123'
        }
      });
      
      // Verify OAuth URL generation
      cy.get('[data-cy="oauth-popup"]').should('be.visible');
      cy.get('[data-cy="oauth-popup"]').should('contain', 'Google Calendar');
      
      // Mock successful OAuth callback
      cy.intercept('POST', '/api/calendar/oauth/google/callback', {
        statusCode: 200,
        body: {
          success: true,
          tokens: {
            access_token: 'test_access_token',
            refresh_token: 'test_refresh_token'
          }
        }
      });
      
      // Simulate OAuth success
      cy.window().then((win) => {
        win.postMessage({ 
          type: 'oauth_success', 
          provider: 'google',
          tokens: {
            access_token: 'test_access_token',
            refresh_token: 'test_refresh_token'
          }
        }, '*');
      });
      
      // Verify connection success
      cy.get('[data-cy="google-calendar-status"]')
        .should('contain', 'Connected')
        .should('have.class', 'text-green-600');
      
      cy.get('[data-cy="google-calendar-disconnect"]').should('be.visible');
    });

    it('should complete Outlook Calendar OAuth flow', () => {
      cy.get('[data-cy="settings-menu"]').click();
      cy.get('[data-cy="integrations-tab"]').click();
      
      cy.get('[data-cy="outlook-calendar-connect"]').click();
      
      cy.intercept('GET', '/api/calendar/oauth/outlook/url', {
        statusCode: 200,
        body: { 
          authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          state: 'test-state-456'
        }
      });
      
      cy.get('[data-cy="oauth-popup"]').should('be.visible');
      cy.get('[data-cy="oauth-popup"]').should('contain', 'Outlook Calendar');
      
      // Mock Outlook OAuth success
      cy.window().then((win) => {
        win.postMessage({ 
          type: 'oauth_success', 
          provider: 'outlook',
          tokens: {
            access_token: 'outlook_access_token',
            refresh_token: 'outlook_refresh_token'
          }
        }, '*');
      });
      
      cy.get('[data-cy="outlook-calendar-status"]')
        .should('contain', 'Connected')
        .should('have.class', 'text-green-600');
    });

    it('should handle OAuth errors gracefully', () => {
      cy.get('[data-cy="settings-menu"]').click();
      cy.get('[data-cy="integrations-tab"]').click();
      
      cy.get('[data-cy="google-calendar-connect"]').click();
      
      // Simulate OAuth error
      cy.window().then((win) => {
        win.postMessage({ 
          type: 'oauth_error', 
          provider: 'google',
          error: 'access_denied'
        }, '*');
      });
      
      // Verify error handling
      cy.get('[data-cy="oauth-error"]')
        .should('be.visible')
        .should('contain', 'Authorization was denied');
      
      cy.get('[data-cy="google-calendar-status"]')
        .should('contain', 'Not Connected')
        .should('have.class', 'text-red-600');
    });

    it('should handle OAuth timeout', () => {
      cy.get('[data-cy="settings-menu"]').click();
      cy.get('[data-cy="integrations-tab"]').click();
      
      cy.get('[data-cy="google-calendar-connect"]').click();
      
      // Wait for timeout (should be handled automatically)
      cy.wait(30000); // 30 second timeout
      
      cy.get('[data-cy="oauth-timeout"]')
        .should('be.visible')
        .should('contain', 'Authorization timed out');
    });
  });

  describe('Calendar Event Creation Workflow', () => {
    beforeEach(() => {
      // Mock authenticated calendar connection
      cy.window().then((win) => {
        win.localStorage.setItem('google_calendar_tokens', JSON.stringify({
          access_token: 'test_token',
          refresh_token: 'refresh_token'
        }));
      });
    });

    it('should create calendar event from lead interaction', () => {
      // Navigate to leads
      cy.get('[data-cy="leads-menu"]').click();
      
      // Select a lead
      cy.get('[data-cy="lead-item"]').first().click();
      
      // Open lead detail modal
      cy.get('[data-cy="lead-detail-modal"]').should('be.visible');
      
      // Click schedule meeting button
      cy.get('[data-cy="schedule-meeting-btn"]').click();
      
      // Calendar modal should open
      cy.get('[data-cy="calendar-modal"]').should('be.visible');
      cy.get('[data-cy="calendar-modal-title"]').should('contain', 'Schedule Meeting');
      
      // Fill out meeting details
      cy.get('[data-cy="meeting-title"]').type('Follow-up call with {company}');
      cy.get('[data-cy="meeting-description"]').type('Discuss proposal and next steps');
      
      // Set date and time
      cy.get('[data-cy="meeting-date"]').type('2024-01-20');
      cy.get('[data-cy="meeting-time"]').select('14:00');
      cy.get('[data-cy="meeting-duration"]').select('30');
      
      // Add attendees (should be pre-filled from lead)
      cy.get('[data-cy="attendee-email"]').should('have.value', 'john.doe@example.com');
      
      // Select calendar provider
      cy.get('[data-cy="calendar-provider"]').select('google');
      
      // Mock calendar creation API
      cy.intercept('POST', '/api/calendar/events', {
        statusCode: 201,
        body: {
          id: 'cal_event_123',
          provider: 'google',
          htmlLink: 'https://calendar.google.com/event?eid=123',
          meetingLink: 'https://meet.google.com/abc-defg-hij'
        }
      }).as('createEvent');
      
      // Create the event
      cy.get('[data-cy="create-event-btn"]').click();
      
      // Verify API call
      cy.wait('@createEvent').then((interception) => {
        expect(interception.request.body).to.deep.include({
          title: 'Follow-up call with {company}',
          description: 'Discuss proposal and next steps',
          duration: 30,
          provider: 'google'
        });
      });
      
      // Verify success notification
      cy.get('[data-cy="success-notification"]')
        .should('be.visible')
        .should('contain', 'Meeting scheduled successfully');
      
      // Verify event details displayed
      cy.get('[data-cy="event-link"]')
        .should('be.visible')
        .should('contain', 'View in Google Calendar');
      
      cy.get('[data-cy="meeting-link"]')
        .should('be.visible')
        .should('contain', 'Join Meeting');
      
      // Modal should close
      cy.get('[data-cy="calendar-modal"]').should('not.exist');
    });

    it('should handle calendar conflicts', () => {
      cy.get('[data-cy="leads-menu"]').click();
      cy.get('[data-cy="lead-item"]').first().click();
      cy.get('[data-cy="schedule-meeting-btn"]').click();
      
      // Fill out meeting details for a conflicting time
      cy.get('[data-cy="meeting-title"]').type('Conflicting meeting');
      cy.get('[data-cy="meeting-date"]').type('2024-01-20');
      cy.get('[data-cy="meeting-time"]').select('10:00'); // Assume conflict at 10 AM
      
      // Mock conflict response
      cy.intercept('POST', '/api/calendar/events', {
        statusCode: 409,
        body: {
          error: 'Calendar conflict detected',
          conflicts: [{
            title: 'Existing meeting',
            start: '2024-01-20T10:00:00Z',
            end: '2024-01-20T11:00:00Z'
          }]
        }
      }).as('conflictResponse');
      
      cy.get('[data-cy="create-event-btn"]').click();
      
      cy.wait('@conflictResponse');
      
      // Verify conflict notification
      cy.get('[data-cy="conflict-notification"]')
        .should('be.visible')
        .should('contain', 'Calendar conflict detected');
      
      cy.get('[data-cy="existing-events"]')
        .should('be.visible')
        .should('contain', 'Existing meeting');
      
      // Suggest alternative times
      cy.get('[data-cy="alternative-times"]')
        .should('be.visible')
        .should('contain', 'Suggested times');
      
      // Select alternative time
      cy.get('[data-cy="alt-time-btn"]').first().click();
      
      // Verify time updated
      cy.get('[data-cy="meeting-time"]').should('have.value', '11:00');
    });

    it('should sync with multiple calendar providers', () => {
      // Setup multiple calendar connections
      cy.window().then((win) => {
        win.localStorage.setItem('outlook_calendar_tokens', JSON.stringify({
          access_token: 'outlook_token',
          refresh_token: 'outlook_refresh'
        }));
      });
      
      cy.get('[data-cy="leads-menu"]').click();
      cy.get('[data-cy="lead-item"]').first().click();
      cy.get('[data-cy="schedule-meeting-btn"]').click();
      
      // Should show multiple provider options
      cy.get('[data-cy="calendar-provider"]').should('contain', 'Google Calendar');
      cy.get('[data-cy="calendar-provider"]').should('contain', 'Outlook Calendar');
      
      // Test creating in both calendars
      cy.get('[data-cy="sync-all-calendars"]').check();
      
      // Mock multiple calendar creation
      cy.intercept('POST', '/api/calendar/events/bulk', {
        statusCode: 201,
        body: {
          results: [
            {
              provider: 'google',
              id: 'google_event_123',
              success: true
            },
            {
              provider: 'outlook',
              id: 'outlook_event_456',
              success: true
            }
          ]
        }
      }).as('bulkCreate');
      
      cy.get('[data-cy="meeting-title"]').type('Multi-calendar event');
      cy.get('[data-cy="meeting-date"]').type('2024-01-21');
      cy.get('[data-cy="meeting-time"]').select('15:00');
      
      cy.get('[data-cy="create-event-btn"]').click();
      
      cy.wait('@bulkCreate');
      
      // Verify multiple success notifications
      cy.get('[data-cy="sync-status"]')
        .should('contain', 'Created in Google Calendar')
        .should('contain', 'Created in Outlook Calendar');
    });
  });

  describe('Email Composition and Sending Workflow', () => {
    it('should compose and send email from lead', () => {
      cy.get('[data-cy="leads-menu"]').click();
      cy.get('[data-cy="lead-item"]').first().click();
      
      // Open email composer
      cy.get('[data-cy="send-email-btn"]').click();
      
      // Verify email modal opens
      cy.get('[data-cy="email-modal"]').should('be.visible');
      cy.get('[data-cy="email-modal-title"]').should('contain', 'Compose Email');
      
      // Verify lead data pre-population
      cy.get('[data-cy="email-to"]').should('have.value', 'john.doe@example.com');
      
      // Verify template selection
      cy.get('[data-cy="template-select"]').should('be.visible');
      cy.get('[data-cy="template-select"]').select('followup');
      
      // Verify template application
      cy.get('[data-cy="email-subject"]')
        .should('contain', 'Following up on our conversation')
        .should('contain', 'ABC Corporation'); // From lead data
      
      cy.get('[data-cy="email-body"]')
        .should('contain', 'Hi John') // From lead name
        .should('contain', 'ABC Corporation'); // From lead company
      
      // Customize email
      cy.get('[data-cy="email-subject"]').clear().type('Custom follow-up subject');
      cy.get('[data-cy="email-body"]').clear().type('Custom email content for the lead.');
      
      // Send via Windows email client
      cy.get('[data-cy="send-windows-email"]').click();
      
      // Mock mailto URL handling
      cy.window().then((win) => {
        // Verify mailto URL was set
        expect(win.location.href).to.contain('mailto:john.doe@example.com');
        expect(win.location.href).to.contain('subject=Custom%20follow-up%20subject');
        expect(win.location.href).to.contain('body=Custom%20email%20content');
      });
      
      // Verify success notification
      cy.get('[data-cy="email-sent-notification"]', { timeout: 2000 })
        .should('be.visible')
        .should('contain', 'Email opened in default client');
      
      // Verify modal closes
      cy.get('[data-cy="email-modal"]').should('not.exist');
    });

    it('should copy email to clipboard', () => {
      cy.get('[data-cy="leads-menu"]').click();
      cy.get('[data-cy="lead-item"]').first().click();
      cy.get('[data-cy="send-email-btn"]').click();
      
      // Select template and customize
      cy.get('[data-cy="template-select"]').select('introduction');
      cy.get('[data-cy="email-subject"]').should('contain', 'Introduction - Solutions');
      
      // Mock clipboard API
      cy.window().then((win) => {
        win.navigator.clipboard = {
          writeText: cy.stub().resolves()
        };
      });
      
      // Copy to clipboard
      cy.get('[data-cy="copy-clipboard-btn"]').click();
      
      // Verify clipboard success
      cy.get('[data-cy="clipboard-success"]')
        .should('be.visible')
        .should('contain', 'Email copied to clipboard');
    });

    it('should handle different email templates', () => {
      const templates = [
        { value: 'followup', name: 'Follow-up', contains: 'following up' },
        { value: 'introduction', name: 'Introduction', contains: 'reaching out' },
        { value: 'thankyou', name: 'Thank You', contains: 'thank you' },
        { value: 'proposal', name: 'Proposal', contains: 'attached the proposal' }
      ];
      
      cy.get('[data-cy="leads-menu"]').click();
      cy.get('[data-cy="lead-item"]').first().click();
      cy.get('[data-cy="send-email-btn"]').click();
      
      templates.forEach(template => {
        cy.get('[data-cy="template-select"]').select(template.value);
        
        cy.get('[data-cy="email-body"]')
          .should('contain', template.contains);
        
        cy.get('[data-cy="email-subject"]')
          .should('contain', 'ABC Corporation'); // Lead company should always be substituted
      });
    });

    it('should validate email form', () => {
      cy.get('[data-cy="leads-menu"]').click();
      cy.get('[data-cy="lead-item"]').first().click();
      cy.get('[data-cy="send-email-btn"]').click();
      
      // Clear required fields
      cy.get('[data-cy="email-to"]').clear();
      cy.get('[data-cy="email-subject"]').clear();
      cy.get('[data-cy="email-body"]').clear();
      
      // Verify send button is disabled
      cy.get('[data-cy="send-windows-email"]').should('be.disabled');
      cy.get('[data-cy="copy-clipboard-btn"]').should('be.disabled');
      
      // Fill required fields
      cy.get('[data-cy="email-to"]').type('test@example.com');
      cy.get('[data-cy="email-subject"]').type('Test subject');
      cy.get('[data-cy="email-body"]').type('Test body content');
      
      // Verify buttons are enabled
      cy.get('[data-cy="send-windows-email"]').should('not.be.disabled');
      cy.get('[data-cy="copy-clipboard-btn"]').should('not.be.disabled');
    });
  });

  describe('Integration Workflows', () => {
    it('should complete full lead-to-meeting-to-email workflow', () => {
      // Step 1: View lead
      cy.get('[data-cy="leads-menu"]').click();
      cy.get('[data-cy="lead-item"]').first().click();
      cy.get('[data-cy="lead-detail-modal"]').should('be.visible');
      
      // Step 2: Schedule meeting
      cy.get('[data-cy="schedule-meeting-btn"]').click();
      cy.get('[data-cy="calendar-modal"]').should('be.visible');
      
      cy.get('[data-cy="meeting-title"]').type('Initial consultation');
      cy.get('[data-cy="meeting-date"]').type('2024-01-25');
      cy.get('[data-cy="meeting-time"]').select('10:00');
      
      cy.intercept('POST', '/api/calendar/events', {
        statusCode: 201,
        body: { id: 'meeting_123', meetingLink: 'https://meet.google.com/test' }
      }).as('createMeeting');
      
      cy.get('[data-cy="create-event-btn"]').click();
      cy.wait('@createMeeting');
      
      cy.get('[data-cy="success-notification"]').should('be.visible');
      cy.get('[data-cy="calendar-modal"]').should('not.exist');
      
      // Step 3: Send follow-up email with meeting details
      cy.get('[data-cy="send-email-btn"]').click();
      cy.get('[data-cy="email-modal"]').should('be.visible');
      
      // Select meeting confirmation template
      cy.get('[data-cy="template-select"]').select('thankyou');
      
      // Verify meeting link could be included (this would be automatically added in real implementation)
      cy.get('[data-cy="include-meeting-link"]').check();
      
      cy.get('[data-cy="email-body"]')
        .should('contain', 'Thank you')
        .should('contain', 'ABC Corporation');
      
      // Send email
      cy.get('[data-cy="send-windows-email"]').click();
      
      cy.get('[data-cy="email-sent-notification"]').should('be.visible');
      cy.get('[data-cy="email-modal"]').should('not.exist');
      
      // Step 4: Verify lead status updated
      cy.get('[data-cy="lead-status"]').should('contain', 'Meeting Scheduled');
      cy.get('[data-cy="lead-last-contact"]').should('contain', 'today');
    });

    it('should handle calendar and email errors gracefully', () => {
      cy.get('[data-cy="leads-menu"]').click();
      cy.get('[data-cy="lead-item"]').first().click();
      
      // Test calendar error
      cy.get('[data-cy="schedule-meeting-btn"]').click();
      cy.get('[data-cy="meeting-title"]').type('Error test meeting');
      cy.get('[data-cy="meeting-date"]').type('2024-01-30');
      cy.get('[data-cy="meeting-time"]').select('14:00');
      
      cy.intercept('POST', '/api/calendar/events', {
        statusCode: 500,
        body: { error: 'Calendar service unavailable' }
      }).as('calendarError');
      
      cy.get('[data-cy="create-event-btn"]').click();
      cy.wait('@calendarError');
      
      cy.get('[data-cy="error-notification"]')
        .should('be.visible')
        .should('contain', 'Calendar service unavailable');
      
      // Test email error
      cy.get('[data-cy="close-calendar-modal"]').click();
      cy.get('[data-cy="send-email-btn"]').click();
      
      // Mock email client failure
      cy.window().then((win) => {
        // Override location.href to throw error
        Object.defineProperty(win.location, 'href', {
          set: () => { throw new Error('Email client not found'); },
          get: () => 'http://localhost:3000'
        });
      });
      
      cy.get('[data-cy="send-windows-email"]').click();
      
      cy.get('[data-cy="email-error"]')
        .should('be.visible')
        .should('contain', 'Failed to open email client');
    });

    it('should maintain state across page refreshes', () => {
      // Setup OAuth tokens
      cy.window().then((win) => {
        win.localStorage.setItem('google_calendar_tokens', JSON.stringify({
          access_token: 'persistent_token',
          expires_at: Date.now() + 3600000
        }));
      });
      
      // Navigate to settings and verify connection
      cy.get('[data-cy="settings-menu"]').click();
      cy.get('[data-cy="integrations-tab"]').click();
      
      cy.get('[data-cy="google-calendar-status"]').should('contain', 'Connected');
      
      // Refresh page
      cy.reload();
      
      // Verify connection persisted
      cy.get('[data-cy="settings-menu"]').click();
      cy.get('[data-cy="integrations-tab"]').click();
      
      cy.get('[data-cy="google-calendar-status"]').should('contain', 'Connected');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent operations', () => {
      // Open multiple lead modals
      cy.get('[data-cy="leads-menu"]').click();
      
      // Select multiple leads (simulate multiple tabs/windows)
      for (let i = 0; i < 3; i++) {
        cy.get(`[data-cy="lead-item"]:nth-child(${i + 1})`).click({ multiple: true });
      }
      
      // Verify all modals can handle concurrent operations
      cy.get('[data-cy="lead-detail-modal"]').should('have.length.greaterThan', 0);
      
      // Test concurrent email compositions
      cy.get('[data-cy="send-email-btn"]').first().click();
      cy.get('[data-cy="email-modal"]').should('be.visible');
      
      // Verify template loading is fast
      cy.get('[data-cy="template-select"]').select('followup');
      cy.get('[data-cy="email-body"]').should('contain', 'Hi', { timeout: 1000 });
    });

    it('should perform well with large datasets', () => {
      // Mock large lead dataset
      cy.intercept('GET', '/api/leads', {
        statusCode: 200,
        body: {
          leads: Array.from({ length: 1000 }, (_, i) => ({
            id: `lead_${i}`,
            name: `Lead ${i}`,
            email: `lead${i}@example.com`,
            company: `Company ${i}`
          }))
        }
      }).as('largeDataset');
      
      cy.get('[data-cy="leads-menu"]').click();
      cy.wait('@largeDataset');
      
      // Verify page loads within reasonable time
      cy.get('[data-cy="leads-list"]', { timeout: 5000 }).should('be.visible');
      cy.get('[data-cy="lead-item"]').should('have.length.greaterThan', 10);
      
      // Test search performance
      cy.get('[data-cy="search-leads"]').type('Lead 999');
      cy.get('[data-cy="lead-item"]', { timeout: 2000 })
        .should('have.length', 1)
        .should('contain', 'Lead 999');
    });
  });
});