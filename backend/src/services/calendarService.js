/**
 * Calendar Integration Service
 * Handles Google Calendar and Microsoft Calendar synchronization
 */

const axios = require('axios');
const { IntegrationSettings, CalendarEvent } = require('../database/models');
const integrationService = require('./integrationService');

class CalendarService {
  constructor() {
    this.providers = {
      google_calendar: {
        baseUrl: 'https://www.googleapis.com/calendar/v3',
        eventsEndpoint: (calendarId = 'primary') => `/calendars/${calendarId}/events`
      },
      microsoft_calendar: {
        baseUrl: 'https://graph.microsoft.com/v1.0',
        eventsEndpoint: '/me/events'
      }
    };
  }

  /**
   * Sync calendar events for a user
   */
  async syncUserCalendars(userId, provider = null) {
    const where = { userId, status: 'connected', isActive: true };
    if (provider) where.provider = provider;

    const integrations = await IntegrationSettings.findAll({
      where: {
        ...where,
        provider: provider ? provider : ['google_calendar', 'microsoft_calendar']
      }
    });

    const results = [];
    
    for (const integration of integrations) {
      try {
        const result = await this.syncCalendarEvents(integration);
        results.push({ integration: integration.id, ...result });
      } catch (error) {
        console.error(`Calendar sync failed for integration ${integration.id}:`, error.message);
        results.push({
          integration: integration.id,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Sync events for a specific integration
   */
  async syncCalendarEvents(integration) {
    // Refresh token if needed
    if (integration.needsRefresh()) {
      await integrationService.refreshToken(integration.id);
      await integration.reload();
    }

    const provider = integration.provider;
    const syncResults = {
      status: 'success',
      created: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };

    try {
      // Get events from provider
      const events = await this.fetchCalendarEvents(integration);
      
      // Process each event
      for (const event of events) {
        try {
          const result = await this.processCalendarEvent(integration, event);
          syncResults[result.action]++;
        } catch (error) {
          syncResults.errors.push({
            eventId: event.id,
            error: error.message
          });
        }
      }

      // Mark sync as completed
      await integration.markSyncCompleted('success');
      
    } catch (error) {
      syncResults.status = 'error';
      syncResults.message = error.message;
      await integration.markSyncCompleted('failed', error.message);
    }

    return syncResults;
  }

  /**
   * Fetch events from calendar provider
   */
  async fetchCalendarEvents(integration) {
    const provider = integration.provider;
    const config = this.providers[provider];
    
    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Accept': 'application/json'
    };

    let params = {
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime'
    };

    // Set time range for sync (last 30 days and next 90 days)
    const now = new Date();
    const timeMin = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();
    const timeMax = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)).toISOString();

    if (provider === 'google_calendar') {
      params.timeMin = timeMin;
      params.timeMax = timeMax;
      
      const response = await axios.get(
        `${config.baseUrl}${config.eventsEndpoint()}`,
        { headers, params }
      );

      return response.data.items || [];

    } else if (provider === 'microsoft_calendar') {
      // Microsoft Graph uses different query parameters
      params = {
        $top: 250,
        $filter: `start/dateTime ge '${timeMin}' and start/dateTime le '${timeMax}'`,
        $orderby: 'start/dateTime'
      };

      const response = await axios.get(
        `${config.baseUrl}${config.eventsEndpoint}`,
        { headers, params }
      );

      return response.data.value || [];
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Process individual calendar event
   */
  async processCalendarEvent(integration, eventData) {
    const provider = integration.provider;
    const normalizedEvent = this.normalizeEventData(provider, eventData);
    
    // Check if event already exists
    const existingEvent = await CalendarEvent.findOne({
      where: {
        integrationId: integration.id,
        externalEventId: normalizedEvent.externalEventId
      }
    });

    if (existingEvent) {
      // Update existing event
      await existingEvent.update({
        ...normalizedEvent,
        lastSyncAt: new Date()
      });
      return { action: 'updated', event: existingEvent };
    } else {
      // Create new event
      const newEvent = await CalendarEvent.create({
        ...normalizedEvent,
        userId: integration.userId,
        integrationId: integration.id,
        lastSyncAt: new Date()
      });
      return { action: 'created', event: newEvent };
    }
  }

  /**
   * Normalize event data from different providers
   */
  normalizeEventData(provider, eventData) {
    if (provider === 'google_calendar') {
      return {
        externalEventId: eventData.id,
        title: eventData.summary || 'Untitled Event',
        description: eventData.description || null,
        startDateTime: new Date(eventData.start.dateTime || eventData.start.date),
        endDateTime: new Date(eventData.end.dateTime || eventData.end.date),
        timezone: eventData.start.timeZone || 'UTC',
        location: eventData.location || null,
        isAllDay: !eventData.start.dateTime,
        isRecurring: !!eventData.recurringEventId,
        recurrenceRule: eventData.recurrence ? eventData.recurrence.join('\n') : null,
        status: this.mapGoogleStatus(eventData.status),
        visibility: eventData.visibility || 'private',
        attendees: this.normalizeAttendees(eventData.attendees),
        organizer: eventData.organizer ? {
          email: eventData.organizer.email,
          name: eventData.organizer.displayName
        } : null,
        syncVersion: eventData.etag
      };
    } else if (provider === 'microsoft_calendar') {
      return {
        externalEventId: eventData.id,
        title: eventData.subject || 'Untitled Event',
        description: eventData.bodyPreview || null,
        startDateTime: new Date(eventData.start.dateTime),
        endDateTime: new Date(eventData.end.dateTime),
        timezone: eventData.start.timeZone || 'UTC',
        location: eventData.location?.displayName || null,
        isAllDay: eventData.isAllDay || false,
        isRecurring: !!eventData.recurrence,
        recurrenceRule: eventData.recurrence ? JSON.stringify(eventData.recurrence) : null,
        status: this.mapMicrosoftStatus(eventData.responseStatus),
        visibility: eventData.sensitivity || 'normal',
        attendees: this.normalizeAttendees(eventData.attendees, 'microsoft'),
        organizer: eventData.organizer ? {
          email: eventData.organizer.emailAddress.address,
          name: eventData.organizer.emailAddress.name
        } : null,
        syncVersion: eventData['@odata.etag']
      };
    }

    throw new Error(`Unsupported provider for normalization: ${provider}`);
  }

  /**
   * Get calendar events for user
   */
  async getUserCalendarEvents(userId, options = {}) {
    const {
      startDate = new Date(),
      endDate = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days from now
      limit = 100,
      provider = null
    } = options;

    const where = {
      userId,
      startDateTime: {
        [require('sequelize').Op.gte]: startDate,
        [require('sequelize').Op.lte]: endDate
      }
    };

    const include = [{
      model: IntegrationSettings,
      attributes: ['provider', 'status'],
      where: provider ? { provider } : {}
    }];

    return await CalendarEvent.findAll({
      where,
      include,
      order: [['startDateTime', 'ASC']],
      limit
    });
  }

  /**
   * Create calendar event in external provider
   */
  async createExternalEvent(integrationId, eventData) {
    const integration = await IntegrationSettings.findByPk(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    if (integration.needsRefresh()) {
      await integrationService.refreshToken(integrationId);
      await integration.reload();
    }

    const provider = integration.provider;
    const config = this.providers[provider];
    
    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json'
    };

    const payload = this.formatEventForProvider(provider, eventData);

    if (provider === 'google_calendar') {
      const response = await axios.post(
        `${config.baseUrl}${config.eventsEndpoint()}`,
        payload,
        { headers }
      );

      // Save to local database
      const normalizedEvent = this.normalizeEventData(provider, response.data);
      const calendarEvent = await CalendarEvent.create({
        ...normalizedEvent,
        userId: integration.userId,
        integrationId: integration.id,
        lastSyncAt: new Date()
      });

      return calendarEvent;

    } else if (provider === 'microsoft_calendar') {
      const response = await axios.post(
        `${config.baseUrl}${config.eventsEndpoint}`,
        payload,
        { headers }
      );

      // Save to local database
      const normalizedEvent = this.normalizeEventData(provider, response.data);
      const calendarEvent = await CalendarEvent.create({
        ...normalizedEvent,
        userId: integration.userId,
        integrationId: integration.id,
        lastSyncAt: new Date()
      });

      return calendarEvent;
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  // Helper methods

  normalizeAttendees(attendees, provider = 'google') {
    if (!attendees) return [];

    if (provider === 'microsoft') {
      return attendees.map(attendee => ({
        email: attendee.emailAddress.address,
        name: attendee.emailAddress.name,
        status: attendee.status?.response || 'needsAction'
      }));
    }

    // Google format
    return attendees.map(attendee => ({
      email: attendee.email,
      name: attendee.displayName,
      status: attendee.responseStatus || 'needsAction'
    }));
  }

  mapGoogleStatus(status) {
    const statusMap = {
      'confirmed': 'confirmed',
      'tentative': 'tentative',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'confirmed';
  }

  mapMicrosoftStatus(responseStatus) {
    const statusMap = {
      'accepted': 'confirmed',
      'tentativelyAccepted': 'tentative',
      'declined': 'cancelled',
      'none': 'confirmed'
    };
    return statusMap[responseStatus] || 'confirmed';
  }

  formatEventForProvider(provider, eventData) {
    if (provider === 'google_calendar') {
      return {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startDateTime.toISOString(),
          timeZone: eventData.timezone || 'UTC'
        },
        end: {
          dateTime: eventData.endDateTime.toISOString(),
          timeZone: eventData.timezone || 'UTC'
        },
        location: eventData.location,
        attendees: eventData.attendees?.map(a => ({ email: a.email }))
      };
    } else if (provider === 'microsoft_calendar') {
      return {
        subject: eventData.title,
        body: {
          contentType: 'text',
          content: eventData.description
        },
        start: {
          dateTime: eventData.startDateTime.toISOString(),
          timeZone: eventData.timezone || 'UTC'
        },
        end: {
          dateTime: eventData.endDateTime.toISOString(),
          timeZone: eventData.timezone || 'UTC'
        },
        location: eventData.location ? { displayName: eventData.location } : null,
        attendees: eventData.attendees?.map(a => ({
          emailAddress: { address: a.email, name: a.name }
        }))
      };
    }
  }
}

module.exports = new CalendarService();