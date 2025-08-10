/**
 * Calendar Sync Integration Tests
 * Testing & QA Engineer - Comprehensive calendar synchronization testing
 */

const CalendarService = require('../../services/../../../src/followup/services/calendar.service');
const moment = require('moment-timezone');
const { google } = require('googleapis');

// Mock external dependencies
jest.mock('googleapis');
jest.mock('@azure/microsoft-graph-client');

describe('Calendar Sync Integration Tests', () => {
  let mockGoogleCalendar;
  let mockOutlookClient;
  
  beforeAll(async () => {
    // Mock Google Calendar API
    mockGoogleCalendar = {
      events: {
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn()
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

  describe('Google Calendar Event Creation', () => {
    it('should create a Google Calendar event with all details', async () => {
      const eventData = {
        title: 'Follow-up call with ABC Corp',
        description: 'Discuss proposal and next steps',
        startTime: moment().add(1, 'day').hour(14).minute(0).toDate(),
        duration: 30,
        attendees: ['contact@abccorp.com', 'manager@abccorp.com'],
        location: 'Conference Room A',
        timezone: 'America/New_York'
      };

      const mockResponse = {
        data: {
          id: 'google_event_123',
          htmlLink: 'https://calendar.google.com/event?eid=123',
          conferenceData: {
            entryPoints: [{
              uri: 'https://meet.google.com/abc-defg-hij'
            }]
          }
        }
      };

      mockGoogleCalendar.events.insert.mockResolvedValue(mockResponse);

      const userTokens = {
        access_token: 'valid_token',
        refresh_token: 'refresh_token'
      };

      const result = await CalendarService.createEvent(eventData, 'google', userTokens);

      expect(result.id).toBe('google_event_123');
      expect(result.provider).toBe('google');
      expect(result.htmlLink).toBeDefined();
      expect(result.meetingLink).toBeDefined();

      expect(mockGoogleCalendar.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: expect.objectContaining({
          summary: eventData.title,
          description: eventData.description,
          location: eventData.location,
          attendees: [
            { email: 'contact@abccorp.com' },
            { email: 'manager@abccorp.com' }
          ]
        }),
        conferenceDataVersion: 1
      });
    });

    it('should create recurring Google Calendar events', async () => {
      const recurringEventData = {
        title: 'Weekly team sync',
        description: 'Weekly team synchronization meeting',
        startTime: moment().add(1, 'day').hour(10).minute(0).toDate(),
        duration: 60,
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=10'],
        timezone: 'UTC'
      };

      const mockResponse = {
        data: {
          id: 'recurring_event_123',
          htmlLink: 'https://calendar.google.com/event?eid=recurring123',
          recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=10']
        }
      };

      mockGoogleCalendar.events.insert.mockResolvedValue(mockResponse);

      const result = await CalendarService.createEvent(recurringEventData, 'google');

      expect(result.id).toBe('recurring_event_123');
      expect(mockGoogleCalendar.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: expect.objectContaining({
          summary: recurringEventData.title,
          recurrence: recurringEventData.recurrence
        }),
        conferenceDataVersion: 1
      });
    });

    it('should handle Google Calendar API rate limits', async () => {
      const eventData = {
        title: 'Rate limited event',
        startTime: moment().add(1, 'day').toDate(),
        duration: 30
      };

      // Mock rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.code = 429;
      
      mockGoogleCalendar.events.insert
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          data: { id: 'retry_success_123' }
        });

      // Should retry after rate limit
      await expect(async () => {
        await CalendarService.createEvent(eventData, 'google');
      }).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Outlook Calendar Event Creation', () => {
    it('should create an Outlook Calendar event with Teams meeting', async () => {
      const eventData = {
        title: 'Client presentation',
        description: 'Present our solution to the client',
        startTime: moment().add(2, 'days').hour(15).minute(0).toDate(),
        duration: 45,
        attendees: ['client@company.com'],
        timezone: 'America/Los_Angeles'
      };

      const mockResponse = {
        id: 'outlook_event_456',
        webLink: 'https://outlook.office365.com/calendar/item/456',
        onlineMeeting: {
          joinUrl: 'https://teams.microsoft.com/l/meetup-join/123'
        }
      };

      mockOutlookClient.post.mockResolvedValue(mockResponse);

      const userTokens = {
        accessToken: 'valid_outlook_token'
      };

      const result = await CalendarService.createEvent(eventData, 'outlook', userTokens);

      expect(result.id).toBe('outlook_event_456');
      expect(result.provider).toBe('outlook');
      expect(result.webLink).toBeDefined();
      expect(result.meetingLink).toBeDefined();

      expect(mockOutlookClient.api).toHaveBeenCalledWith('/me/events');
      expect(mockOutlookClient.post).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: eventData.title,
          body: {
            contentType: 'text',
            content: eventData.description
          },
          isOnlineMeeting: true,
          onlineMeetingProvider: 'teamsForBusiness'
        })
      );
    });

    it('should handle Outlook calendar conflicts', async () => {
      const conflictingEventData = {
        title: 'Conflicting meeting',
        startTime: moment().add(1, 'day').hour(14).minute(0).toDate(),
        duration: 60
      };

      const conflictError = new Error('Conflict detected');
      conflictError.code = 'ErrorCalendarCannotUpdateDeletedItem';
      
      mockOutlookClient.post.mockRejectedValue(conflictError);

      await expect(
        CalendarService.createEvent(conflictingEventData, 'outlook', { accessToken: 'token' })
      ).rejects.toThrow('Conflict detected');
    });
  });

  describe('Calendar Event Updates', () => {
    it('should update Google Calendar event details', async () => {
      const eventId = 'existing_google_event_123';
      const updates = {
        title: 'Updated meeting title',
        description: 'Updated meeting description',
        startTime: moment().add(2, 'days').hour(16).minute(0).toDate(),
        duration: 45,
        attendees: ['new.attendee@company.com']
      };

      const existingEvent = {
        data: {
          id: eventId,
          summary: 'Original title',
          start: { timeZone: 'UTC' },
          end: { timeZone: 'UTC' }
        }
      };

      const updatedEvent = {
        data: {
          id: eventId,
          summary: updates.title,
          description: updates.description,
          htmlLink: 'https://calendar.google.com/updated/123'
        }
      };

      mockGoogleCalendar.events.get.mockResolvedValue(existingEvent);
      mockGoogleCalendar.events.update.mockResolvedValue(updatedEvent);

      const result = await CalendarService.updateEvent(eventId, updates, 'google');

      expect(result.id).toBe(eventId);
      expect(mockGoogleCalendar.events.update).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: eventId,
        resource: expect.objectContaining({
          summary: updates.title,
          description: updates.description,
          attendees: [{ email: 'new.attendee@company.com' }]
        })
      });
    });

    it('should update Outlook Calendar event', async () => {
      const eventId = 'existing_outlook_event_456';
      const updates = {
        title: 'Updated Outlook meeting',
        location: 'New conference room',
        startTime: moment().add(3, 'days').hour(11).minute(30).toDate()
      };

      const updatedEvent = {
        id: eventId,
        subject: updates.title,
        location: { displayName: updates.location },
        webLink: 'https://outlook.office365.com/updated/456'
      };

      mockOutlookClient.patch.mockResolvedValue(updatedEvent);

      const result = await CalendarService.updateEvent(
        eventId, 
        updates, 
        'outlook', 
        { accessToken: 'valid_token' }
      );

      expect(result.id).toBe(eventId);
      expect(mockOutlookClient.api).toHaveBeenCalledWith(`/me/events/${eventId}`);
      expect(mockOutlookClient.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: updates.title,
          location: { displayName: updates.location }
        })
      );
    });
  });

  describe('Calendar Event Deletion', () => {
    it('should delete Google Calendar events', async () => {
      const eventId = 'google_event_to_delete';
      
      mockGoogleCalendar.events.delete.mockResolvedValue({});

      const result = await CalendarService.deleteEvent(eventId, 'google');

      expect(result.success).toBe(true);
      expect(mockGoogleCalendar.events.delete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: eventId
      });
    });

    it('should delete Outlook Calendar events', async () => {
      const eventId = 'outlook_event_to_delete';
      
      mockOutlookClient.delete.mockResolvedValue({});

      const result = await CalendarService.deleteEvent(
        eventId, 
        'outlook', 
        { accessToken: 'valid_token' }
      );

      expect(result.success).toBe(true);
      expect(mockOutlookClient.api).toHaveBeenCalledWith(`/me/events/${eventId}`);
      expect(mockOutlookClient.delete).toHaveBeenCalled();
    });

    it('should handle deletion of non-existent events', async () => {
      const nonExistentEventId = 'non_existent_event';
      
      const notFoundError = new Error('Event not found');
      notFoundError.code = 404;
      
      mockGoogleCalendar.events.delete.mockRejectedValue(notFoundError);

      await expect(
        CalendarService.deleteEvent(nonExistentEventId, 'google')
      ).rejects.toThrow('Event not found');
    });
  });

  describe('Calendar Availability Sync', () => {
    it('should get Google Calendar availability', async () => {
      const startDate = moment().startOf('week').toDate();
      const endDate = moment().endOf('week').toDate();

      const mockBusyResponse = {
        data: {
          calendars: {
            primary: {
              busy: [
                {
                  start: moment().add(1, 'day').hour(10).toISOString(),
                  end: moment().add(1, 'day').hour(11).toISOString()
                },
                {
                  start: moment().add(2, 'days').hour(14).toISOString(),
                  end: moment().add(2, 'days').hour(15).toISOString()
                }
              ]
            }
          }
        }
      };

      mockGoogleCalendar.freebusy.query.mockResolvedValue(mockBusyResponse);

      const result = await CalendarService.getAvailability(
        'user123', 
        startDate, 
        endDate, 
        'google'
      );

      expect(result.busy).toHaveLength(2);
      expect(result.available).toBeDefined();
      expect(result.available.length).toBeGreaterThan(0);

      expect(mockGoogleCalendar.freebusy.query).toHaveBeenCalledWith({
        resource: {
          timeMin: moment(startDate).toISOString(),
          timeMax: moment(endDate).toISOString(),
          items: [{ id: 'primary' }]
        }
      });
    });

    it('should generate available time slots correctly', () => {
      const startDate = moment().hour(9).minute(0).second(0).toDate();
      const endDate = moment().hour(17).minute(0).second(0).toDate();
      const busySlots = [
        {
          start: moment().hour(10).minute(0).toISOString(),
          end: moment().hour(11).minute(0).toISOString()
        }
      ];

      const availableSlots = CalendarService.generateAvailableSlots(
        startDate,
        endDate,
        busySlots,
        {
          businessHoursOnly: true,
          businessStart: 9,
          businessEnd: 17,
          slotDuration: 30
        }
      );

      expect(availableSlots.length).toBeGreaterThan(0);
      
      // Should not include slots that conflict with busy periods
      const conflictingSlot = availableSlots.find(slot => {
        const slotStart = moment(slot.start);
        const slotEnd = moment(slot.end);
        return slotStart.hour() === 10 && slotStart.minute() === 30 && slotEnd.hour() === 11;
      });
      
      expect(conflictingSlot).toBeUndefined();
    });
  });

  describe('Multi-Attendee Meeting Scheduling', () => {
    it('should find optimal meeting time for multiple attendees', async () => {
      const attendees = [
        {
          userId: 'user1',
          provider: 'google',
          tokens: { access_token: 'token1' }
        },
        {
          userId: 'user2',
          provider: 'outlook',
          tokens: { accessToken: 'token2' }
        }
      ];

      // Mock availability for both users
      mockGoogleCalendar.freebusy.query.mockResolvedValue({
        data: {
          calendars: {
            primary: {
              busy: [{
                start: moment().add(1, 'day').hour(10).toISOString(),
                end: moment().add(1, 'day').hour(11).toISOString()
              }]
            }
          }
        }
      });

      mockOutlookClient.post.mockResolvedValue({
        value: [{
          busy: [{
            start: moment().add(1, 'day').hour(14).toISOString(),
            end: moment().add(1, 'day').hour(15).toISOString()
          }]
        }]
      });

      const optimalTimes = await CalendarService.findOptimalMeetingTime(
        attendees,
        30,
        {
          startDate: moment().add(1, 'day').toDate(),
          endDate: moment().add(7, 'days').toDate()
        }
      );

      expect(optimalTimes).toBeDefined();
      expect(Array.isArray(optimalTimes)).toBe(true);
      expect(optimalTimes.length).toBeGreaterThan(0);
      
      // Each optimal time should have a score
      optimalTimes.forEach(time => {
        expect(time.score).toBeDefined();
        expect(typeof time.score).toBe('number');
      });
    });

    it('should handle attendees with no available times', async () => {
      const attendees = [
        {
          userId: 'busy_user',
          provider: 'google',
          tokens: { access_token: 'token' }
        }
      ];

      // Mock completely busy calendar
      mockGoogleCalendar.freebusy.query.mockResolvedValue({
        data: {
          calendars: {
            primary: {
              busy: Array.from({ length: 100 }, (_, i) => ({
                start: moment().add(i, 'hours').toISOString(),
                end: moment().add(i + 1, 'hours').toISOString()
              }))
            }
          }
        }
      });

      const optimalTimes = await CalendarService.findOptimalMeetingTime(
        attendees,
        30,
        {
          startDate: moment().toDate(),
          endDate: moment().add(3, 'days').toDate()
        }
      );

      expect(optimalTimes).toBeDefined();
      expect(Array.isArray(optimalTimes)).toBe(true);
      // Should return empty array or very limited options
    });
  });

  describe('Time Zone Handling', () => {
    it('should handle different time zones correctly', async () => {
      const eventData = {
        title: 'Cross-timezone meeting',
        startTime: moment.tz('2024-01-15 14:00', 'America/New_York').toDate(),
        duration: 60,
        timezone: 'America/New_York'
      };

      const mockResponse = {
        data: {
          id: 'timezone_event_123',
          start: {
            dateTime: '2024-01-15T14:00:00-05:00',
            timeZone: 'America/New_York'
          },
          end: {
            dateTime: '2024-01-15T15:00:00-05:00',
            timeZone: 'America/New_York'
          }
        }
      };

      mockGoogleCalendar.events.insert.mockResolvedValue(mockResponse);

      await CalendarService.createEvent(eventData, 'google');

      expect(mockGoogleCalendar.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        resource: expect.objectContaining({
          start: expect.objectContaining({
            timeZone: 'America/New_York'
          }),
          end: expect.objectContaining({
            timeZone: 'America/New_York'
          })
        }),
        conferenceDataVersion: 1
      });
    });

    it('should convert between different time zones', () => {
      const nyTime = moment.tz('2024-01-15 14:00', 'America/New_York');
      const utcTime = nyTime.utc();
      const laTime = utcTime.clone().tz('America/Los_Angeles');

      expect(nyTime.format('HH:mm')).toBe('14:00');
      expect(laTime.format('HH:mm')).toBe('11:00');
    });
  });

  describe('Sync Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ECONNRESET';

      mockGoogleCalendar.events.insert.mockRejectedValue(timeoutError);

      await expect(
        CalendarService.createEvent({
          title: 'Timeout test',
          startTime: moment().add(1, 'day').toDate()
        }, 'google')
      ).rejects.toThrow('Network timeout');
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.code = 403;

      mockGoogleCalendar.events.insert.mockRejectedValue(quotaError);

      await expect(
        CalendarService.createEvent({
          title: 'Quota test',
          startTime: moment().add(1, 'day').toDate()
        }, 'google')
      ).rejects.toThrow('Quota exceeded');
    });

    it('should handle invalid calendar permissions', async () => {
      const permissionError = new Error('Insufficient permissions');
      permissionError.code = 403;

      mockGoogleCalendar.events.insert.mockRejectedValue(permissionError);

      await expect(
        CalendarService.createEvent({
          title: 'Permission test',
          startTime: moment().add(1, 'day').toDate()
        }, 'google')
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle bulk calendar operations efficiently', async () => {
      const bulkEvents = Array.from({ length: 50 }, (_, i) => ({
        title: `Bulk Event ${i + 1}`,
        startTime: moment().add(i, 'days').hour(14).minute(0).toDate(),
        duration: 30
      }));

      // Mock successful responses
      mockGoogleCalendar.events.insert.mockImplementation(() => 
        Promise.resolve({
          data: { id: `bulk_event_${Date.now()}` }
        })
      );

      const startTime = Date.now();
      
      const results = await Promise.all(
        bulkEvents.map(event => 
          CalendarService.createEvent(event, 'google')
        )
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(50);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      results.forEach(result => {
        expect(result.id).toBeDefined();
      });
    });
  });
});