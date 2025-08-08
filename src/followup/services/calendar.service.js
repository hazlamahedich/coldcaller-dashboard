const { google } = require('googleapis');
const { microsoft } = require('@azure/msal-node');
const moment = require('moment-timezone');
const EventEmitter = require('events');

/**
 * Calendar Integration Service
 * Handles integration with Google Calendar, Outlook, and other calendar providers
 */
class CalendarService extends EventEmitter {
  constructor() {
    super();
    this.logger = require('../../utils/logger');
    this.providers = {
      google: null,
      outlook: null,
      apple: null
    };
    
    this.initializeProviders();
  }

  /**
   * Initialize calendar providers
   */
  async initializeProviders() {
    try {
      // Initialize Google Calendar
      if (process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET) {
        this.providers.google = new google.auth.OAuth2(
          process.env.GOOGLE_CALENDAR_CLIENT_ID,
          process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
          process.env.GOOGLE_CALENDAR_REDIRECT_URI
        );
      }

      // Initialize Outlook Calendar
      if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
        this.providers.outlook = microsoft.create({
          auth: {
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            authority: 'https://login.microsoftonline.com/common'
          }
        });
      }

      this.logger.info('Calendar providers initialized');

    } catch (error) {
      this.logger.error('Error initializing calendar providers:', error);
    }
  }

  /**
   * Create calendar event
   */
  async createEvent(eventData, provider = 'google', userTokens = null) {
    try {
      const {
        title,
        description,
        startTime,
        duration = 30,
        attendees = [],
        location,
        timezone = 'UTC'
      } = eventData;

      const endTime = moment(startTime).add(duration, 'minutes').toDate();

      switch (provider) {
        case 'google':
          return await this.createGoogleEvent({
            title,
            description,
            startTime,
            endTime,
            attendees,
            location,
            timezone
          }, userTokens);

        case 'outlook':
          return await this.createOutlookEvent({
            title,
            description,
            startTime,
            endTime,
            attendees,
            location,
            timezone
          }, userTokens);

        case 'apple':
          return await this.createAppleEvent(eventData, userTokens);

        default:
          throw new Error(`Unsupported calendar provider: ${provider}`);
      }

    } catch (error) {
      this.logger.error(`Error creating calendar event with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Create Google Calendar event
   */
  async createGoogleEvent(eventData, userTokens) {
    try {
      if (!this.providers.google) {
        throw new Error('Google Calendar provider not initialized');
      }

      if (userTokens) {
        this.providers.google.setCredentials(userTokens);
      }

      const calendar = google.calendar({ version: 'v3', auth: this.providers.google });

      const event = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: moment(eventData.startTime).toISOString(),
          timeZone: eventData.timezone
        },
        end: {
          dateTime: moment(eventData.endTime).toISOString(),
          timeZone: eventData.timezone
        },
        attendees: eventData.attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 }
          ]
        },
        conferenceData: {
          createRequest: {
            requestId: `followup-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1
      });

      this.logger.info(`Created Google Calendar event: ${response.data.id}`);

      return {
        id: response.data.id,
        provider: 'google',
        htmlLink: response.data.htmlLink,
        meetingLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
        event: response.data
      };

    } catch (error) {
      this.logger.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Create Outlook Calendar event
   */
  async createOutlookEvent(eventData, userTokens) {
    try {
      if (!this.providers.outlook) {
        throw new Error('Outlook Calendar provider not initialized');
      }

      // Microsoft Graph API implementation
      const graphClient = require('@azure/microsoft-graph-client');
      
      if (!userTokens || !userTokens.accessToken) {
        throw new Error('Valid Outlook access token required');
      }

      const client = graphClient.Client.init({
        authProvider: (done) => {
          done(null, userTokens.accessToken);
        }
      });

      const event = {
        subject: eventData.title,
        body: {
          contentType: 'text',
          content: eventData.description || ''
        },
        start: {
          dateTime: moment(eventData.startTime).toISOString(),
          timeZone: eventData.timezone
        },
        end: {
          dateTime: moment(eventData.endTime).toISOString(),
          timeZone: eventData.timezone
        },
        location: eventData.location ? {
          displayName: eventData.location
        } : undefined,
        attendees: eventData.attendees.map(email => ({
          emailAddress: {
            address: email
          },
          type: 'required'
        })),
        reminderMinutesBeforeStart: 15,
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness'
      };

      const response = await client.api('/me/events').post(event);

      this.logger.info(`Created Outlook Calendar event: ${response.id}`);

      return {
        id: response.id,
        provider: 'outlook',
        webLink: response.webLink,
        meetingLink: response.onlineMeeting?.joinUrl,
        event: response
      };

    } catch (error) {
      this.logger.error('Error creating Outlook Calendar event:', error);
      throw error;
    }
  }

  /**
   * Create Apple Calendar event (via CalDAV)
   */
  async createAppleEvent(eventData, userCredentials) {
    try {
      // Apple Calendar integration would typically use CalDAV
      // This is a placeholder implementation
      
      this.logger.warn('Apple Calendar integration not implemented');
      
      return {
        id: `apple-${Date.now()}`,
        provider: 'apple',
        event: eventData
      };

    } catch (error) {
      this.logger.error('Error creating Apple Calendar event:', error);
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  async updateEvent(eventId, updates, provider = 'google', userTokens = null) {
    try {
      switch (provider) {
        case 'google':
          return await this.updateGoogleEvent(eventId, updates, userTokens);
        case 'outlook':
          return await this.updateOutlookEvent(eventId, updates, userTokens);
        case 'apple':
          return await this.updateAppleEvent(eventId, updates, userTokens);
        default:
          throw new Error(`Unsupported calendar provider: ${provider}`);
      }

    } catch (error) {
      this.logger.error(`Error updating calendar event ${eventId} with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Update Google Calendar event
   */
  async updateGoogleEvent(eventId, updates, userTokens) {
    try {
      if (userTokens) {
        this.providers.google.setCredentials(userTokens);
      }

      const calendar = google.calendar({ version: 'v3', auth: this.providers.google });

      // Get existing event
      const existingEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      // Prepare updates
      const eventUpdates = { ...existingEvent.data };

      if (updates.title) eventUpdates.summary = updates.title;
      if (updates.description) eventUpdates.description = updates.description;
      if (updates.location) eventUpdates.location = updates.location;
      
      if (updates.startTime) {
        eventUpdates.start = {
          dateTime: moment(updates.startTime).toISOString(),
          timeZone: updates.timezone || eventUpdates.start.timeZone
        };
        
        if (updates.duration) {
          eventUpdates.end = {
            dateTime: moment(updates.startTime).add(updates.duration, 'minutes').toISOString(),
            timeZone: updates.timezone || eventUpdates.end.timeZone
          };
        }
      }

      if (updates.attendees) {
        eventUpdates.attendees = updates.attendees.map(email => ({ email }));
      }

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: eventUpdates
      });

      this.logger.info(`Updated Google Calendar event: ${eventId}`);

      return {
        id: response.data.id,
        provider: 'google',
        htmlLink: response.data.htmlLink,
        event: response.data
      };

    } catch (error) {
      this.logger.error(`Error updating Google Calendar event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Update Outlook Calendar event
   */
  async updateOutlookEvent(eventId, updates, userTokens) {
    try {
      const graphClient = require('@azure/microsoft-graph-client');
      
      if (!userTokens || !userTokens.accessToken) {
        throw new Error('Valid Outlook access token required');
      }

      const client = graphClient.Client.init({
        authProvider: (done) => {
          done(null, userTokens.accessToken);
        }
      });

      const eventUpdates = {};

      if (updates.title) eventUpdates.subject = updates.title;
      if (updates.description) {
        eventUpdates.body = {
          contentType: 'text',
          content: updates.description
        };
      }
      if (updates.location) {
        eventUpdates.location = {
          displayName: updates.location
        };
      }
      
      if (updates.startTime) {
        eventUpdates.start = {
          dateTime: moment(updates.startTime).toISOString(),
          timeZone: updates.timezone || 'UTC'
        };
        
        if (updates.duration) {
          eventUpdates.end = {
            dateTime: moment(updates.startTime).add(updates.duration, 'minutes').toISOString(),
            timeZone: updates.timezone || 'UTC'
          };
        }
      }

      if (updates.attendees) {
        eventUpdates.attendees = updates.attendees.map(email => ({
          emailAddress: {
            address: email
          },
          type: 'required'
        }));
      }

      const response = await client.api(`/me/events/${eventId}`).patch(eventUpdates);

      this.logger.info(`Updated Outlook Calendar event: ${eventId}`);

      return {
        id: response.id,
        provider: 'outlook',
        webLink: response.webLink,
        event: response
      };

    } catch (error) {
      this.logger.error(`Error updating Outlook Calendar event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(eventId, provider = 'google', userTokens = null) {
    try {
      switch (provider) {
        case 'google':
          return await this.deleteGoogleEvent(eventId, userTokens);
        case 'outlook':
          return await this.deleteOutlookEvent(eventId, userTokens);
        case 'apple':
          return await this.deleteAppleEvent(eventId, userTokens);
        default:
          throw new Error(`Unsupported calendar provider: ${provider}`);
      }

    } catch (error) {
      this.logger.error(`Error deleting calendar event ${eventId} with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Delete Google Calendar event
   */
  async deleteGoogleEvent(eventId, userTokens) {
    try {
      if (userTokens) {
        this.providers.google.setCredentials(userTokens);
      }

      const calendar = google.calendar({ version: 'v3', auth: this.providers.google });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      this.logger.info(`Deleted Google Calendar event: ${eventId}`);

      return { success: true };

    } catch (error) {
      this.logger.error(`Error deleting Google Calendar event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Delete Outlook Calendar event
   */
  async deleteOutlookEvent(eventId, userTokens) {
    try {
      const graphClient = require('@azure/microsoft-graph-client');
      
      if (!userTokens || !userTokens.accessToken) {
        throw new Error('Valid Outlook access token required');
      }

      const client = graphClient.Client.init({
        authProvider: (done) => {
          done(null, userTokens.accessToken);
        }
      });

      await client.api(`/me/events/${eventId}`).delete();

      this.logger.info(`Deleted Outlook Calendar event: ${eventId}`);

      return { success: true };

    } catch (error) {
      this.logger.error(`Error deleting Outlook Calendar event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's calendar availability
   */
  async getAvailability(userId, startDate, endDate, provider = 'google', userTokens = null) {
    try {
      switch (provider) {
        case 'google':
          return await this.getGoogleAvailability(userId, startDate, endDate, userTokens);
        case 'outlook':
          return await this.getOutlookAvailability(userId, startDate, endDate, userTokens);
        default:
          throw new Error(`Availability check not supported for provider: ${provider}`);
      }

    } catch (error) {
      this.logger.error(`Error getting availability for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get Google Calendar availability
   */
  async getGoogleAvailability(userId, startDate, endDate, userTokens) {
    try {
      if (userTokens) {
        this.providers.google.setCredentials(userTokens);
      }

      const calendar = google.calendar({ version: 'v3', auth: this.providers.google });

      const response = await calendar.freebusy.query({
        resource: {
          timeMin: moment(startDate).toISOString(),
          timeMax: moment(endDate).toISOString(),
          items: [{ id: 'primary' }]
        }
      });

      const busySlots = response.data.calendars.primary.busy || [];
      
      // Generate available slots
      const availableSlots = this.generateAvailableSlots(
        startDate,
        endDate,
        busySlots,
        { businessHoursOnly: true }
      );

      return {
        busy: busySlots,
        available: availableSlots
      };

    } catch (error) {
      this.logger.error('Error getting Google Calendar availability:', error);
      throw error;
    }
  }

  /**
   * Generate available time slots
   */
  generateAvailableSlots(startDate, endDate, busySlots, options = {}) {
    const {
      businessHoursOnly = true,
      businessStart = 9,
      businessEnd = 17,
      slotDuration = 30,
      excludeWeekends = true
    } = options;

    const availableSlots = [];
    const current = moment(startDate);
    const end = moment(endDate);

    while (current.isBefore(end)) {
      const dayStart = current.clone().hour(businessStart).minute(0).second(0);
      const dayEnd = current.clone().hour(businessEnd).minute(0).second(0);

      // Skip weekends if specified
      if (excludeWeekends && (current.day() === 0 || current.day() === 6)) {
        current.add(1, 'day');
        continue;
      }

      let slotStart = dayStart.clone();

      while (slotStart.isBefore(dayEnd)) {
        const slotEnd = slotStart.clone().add(slotDuration, 'minutes');

        if (slotEnd.isAfter(dayEnd)) break;

        // Check if slot conflicts with any busy periods
        const isConflict = busySlots.some(busy => {
          const busyStart = moment(busy.start);
          const busyEnd = moment(busy.end);
          
          return slotStart.isBefore(busyEnd) && slotEnd.isAfter(busyStart);
        });

        if (!isConflict) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            duration: slotDuration
          });
        }

        slotStart.add(slotDuration, 'minutes');
      }

      current.add(1, 'day');
    }

    return availableSlots;
  }

  /**
   * Find optimal meeting time
   */
  async findOptimalMeetingTime(attendees, duration = 30, preferences = {}) {
    try {
      const {
        startDate = moment().add(1, 'day').toDate(),
        endDate = moment().add(7, 'days').toDate(),
        preferredTimes = [], // Array of preferred time slots
        timezone = 'UTC'
      } = preferences;

      // Get availability for all attendees
      const availabilityPromises = attendees.map(async (attendee) => {
        try {
          return await this.getAvailability(
            attendee.userId,
            startDate,
            endDate,
            attendee.provider || 'google',
            attendee.tokens
          );
        } catch (error) {
          this.logger.warn(`Could not get availability for ${attendee.userId}:`, error);
          return { available: [], busy: [] };
        }
      });

      const availabilities = await Promise.all(availabilityPromises);

      // Find common available slots
      const commonSlots = this.findCommonAvailableSlots(
        availabilities.map(a => a.available),
        duration
      );

      // Score slots based on preferences
      const scoredSlots = this.scoreTimeSlots(commonSlots, preferredTimes, preferences);

      // Return top 5 options
      return scoredSlots.slice(0, 5);

    } catch (error) {
      this.logger.error('Error finding optimal meeting time:', error);
      throw error;
    }
  }

  /**
   * Find common available slots among all attendees
   */
  findCommonAvailableSlots(attendeesAvailability, duration) {
    if (attendeesAvailability.length === 0) return [];

    // Start with first attendee's availability
    let commonSlots = [...attendeesAvailability[0]];

    // Intersect with each subsequent attendee's availability
    for (let i = 1; i < attendeesAvailability.length; i++) {
      const attendeeSlots = attendeesAvailability[i];
      commonSlots = this.intersectTimeSlots(commonSlots, attendeeSlots, duration);
    }

    return commonSlots;
  }

  /**
   * Intersect two sets of time slots
   */
  intersectTimeSlots(slots1, slots2, duration) {
    const intersections = [];

    for (const slot1 of slots1) {
      for (const slot2 of slots2) {
        const start1 = moment(slot1.start);
        const end1 = moment(slot1.end);
        const start2 = moment(slot2.start);
        const end2 = moment(slot2.end);

        const intersectionStart = moment.max(start1, start2);
        const intersectionEnd = moment.min(end1, end2);

        if (intersectionEnd.diff(intersectionStart, 'minutes') >= duration) {
          intersections.push({
            start: intersectionStart.toISOString(),
            end: intersectionEnd.toISOString(),
            duration: Math.min(
              intersectionEnd.diff(intersectionStart, 'minutes'),
              duration
            )
          });
        }
      }
    }

    return intersections;
  }

  /**
   * Score time slots based on preferences
   */
  scoreTimeSlots(slots, preferredTimes, preferences) {
    return slots.map(slot => {
      let score = 0;
      const slotStart = moment(slot.start);
      const slotHour = slotStart.hour();

      // Score based on time of day
      if (slotHour >= 9 && slotHour <= 11) score += 10; // Morning preferred
      if (slotHour >= 14 && slotHour <= 16) score += 8;  // Early afternoon
      if (slotHour >= 10 && slotHour <= 12) score += 5;  // Late morning

      // Score based on day of week
      const dayOfWeek = slotStart.day();
      if (dayOfWeek >= 2 && dayOfWeek <= 4) score += 5; // Tuesday to Thursday preferred

      // Score based on preferred times
      for (const preferredTime of preferredTimes) {
        const preferredStart = moment(preferredTime.start);
        const preferredEnd = moment(preferredTime.end);
        
        if (slotStart.isBetween(preferredStart, preferredEnd, null, '[]')) {
          score += 20;
        }
      }

      return { ...slot, score };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Get calendar OAuth URL
   */
  getOAuthUrl(provider, state) {
    switch (provider) {
      case 'google':
        if (!this.providers.google) {
          throw new Error('Google Calendar provider not initialized');
        }
        
        return this.providers.google.generateAuthUrl({
          access_type: 'offline',
          scope: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ],
          state: state
        });

      case 'outlook':
        const scopes = ['https://graph.microsoft.com/calendars.readwrite'];
        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
               `client_id=${process.env.MICROSOFT_CLIENT_ID}&` +
               `response_type=code&` +
               `redirect_uri=${encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI)}&` +
               `response_mode=query&` +
               `scope=${encodeURIComponent(scopes.join(' '))}&` +
               `state=${state}`;

      default:
        throw new Error(`OAuth not supported for provider: ${provider}`);
    }
  }

  /**
   * Exchange OAuth code for tokens
   */
  async exchangeCodeForTokens(code, provider, state) {
    try {
      switch (provider) {
        case 'google':
          const { tokens } = await this.providers.google.getToken(code);
          return tokens;

        case 'outlook':
          // Microsoft OAuth token exchange implementation
          const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              client_id: process.env.MICROSOFT_CLIENT_ID,
              client_secret: process.env.MICROSOFT_CLIENT_SECRET,
              code: code,
              redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
              grant_type: 'authorization_code'
            })
          });

          const tokenData = await response.json();
          return tokenData;

        default:
          throw new Error(`Token exchange not supported for provider: ${provider}`);
      }

    } catch (error) {
      this.logger.error(`Error exchanging code for tokens with ${provider}:`, error);
      throw error;
    }
  }
}

module.exports = new CalendarService();