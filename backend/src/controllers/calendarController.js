/**
 * Calendar Controller
 * Handles calendar events and synchronization API endpoints
 */

const { body, param, query, validationResult } = require('express-validator');
const calendarService = require('../services/calendarService');
const { CalendarEvent, IntegrationSettings } = require('../database/models');

class CalendarController {
  /**
   * Get user's calendar events
   */
  async getEvents(req, res) {
    try {
      const userId = req.user.id;
      const {
        startDate,
        endDate,
        provider,
        limit = 100,
        page = 1
      } = req.query;

      const options = {
        limit: Math.min(parseInt(limit), 500),
        offset: (parseInt(page) - 1) * Math.min(parseInt(limit), 500)
      };

      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      if (provider) options.provider = provider;

      const events = await calendarService.getUserCalendarEvents(userId, options);

      // Transform events for API response
      const transformedEvents = events.map(event => ({
        id: event.id,
        externalEventId: event.externalEventId,
        title: event.title,
        description: event.description,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        timezone: event.timezone,
        location: event.location,
        isAllDay: event.isAllDay,
        isRecurring: event.isRecurring,
        status: event.status,
        visibility: event.visibility,
        attendees: event.attendees,
        organizer: event.organizer,
        leadId: event.leadId,
        callLogId: event.callLogId,
        provider: event.IntegrationSetting?.provider,
        lastSyncAt: event.lastSyncAt,
        isUpcoming: event.isUpcoming(),
        isToday: event.isToday(),
        duration: event.getDuration()
      }));

      res.json({
        success: true,
        data: {
          events: transformedEvents,
          pagination: {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 500),
            total: events.length
          }
        }
      });
    } catch (error) {
      console.error('Get calendar events error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get calendar events',
          details: error.message
        }
      });
    }
  }

  /**
   * Get single calendar event
   */
  async getEvent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { eventId } = req.params;
      const userId = req.user.id;

      const event = await CalendarEvent.findOne({
        where: { id: eventId, userId },
        include: [{
          model: IntegrationSettings,
          attributes: ['provider', 'status']
        }]
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Calendar event not found',
            code: 'EVENT_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: {
          id: event.id,
          externalEventId: event.externalEventId,
          title: event.title,
          description: event.description,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          timezone: event.timezone,
          location: event.location,
          isAllDay: event.isAllDay,
          isRecurring: event.isRecurring,
          recurrenceRule: event.recurrenceRule,
          status: event.status,
          visibility: event.visibility,
          attendees: event.attendees,
          organizer: event.organizer,
          leadId: event.leadId,
          callLogId: event.callLogId,
          provider: event.IntegrationSetting?.provider,
          lastSyncAt: event.lastSyncAt,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          isUpcoming: event.isUpcoming(),
          isToday: event.isToday(),
          duration: event.getDuration()
        }
      });
    } catch (error) {
      console.error('Get calendar event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get calendar event',
          details: error.message
        }
      });
    }
  }

  /**
   * Create calendar event in external provider
   */
  async createEvent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const userId = req.user.id;
      const {
        integrationId,
        title,
        description,
        startDateTime,
        endDateTime,
        timezone = 'UTC',
        location,
        attendees = [],
        leadId
      } = req.body;

      // Verify integration ownership
      const integration = await IntegrationSettings.findOne({
        where: { id: integrationId, userId, status: 'connected' }
      });

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Integration not found or not connected',
            code: 'INTEGRATION_NOT_FOUND'
          }
        });
      }

      const eventData = {
        title,
        description,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        timezone,
        location,
        attendees,
        leadId
      };

      const event = await calendarService.createExternalEvent(integrationId, eventData);

      res.status(201).json({
        success: true,
        data: {
          id: event.id,
          externalEventId: event.externalEventId,
          title: event.title,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          provider: integration.provider,
          createdAt: event.createdAt
        },
        message: 'Calendar event created successfully'
      });
    } catch (error) {
      console.error('Create calendar event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create calendar event',
          details: error.message
        }
      });
    }
  }

  /**
   * Sync calendar events for user
   */
  async syncEvents(req, res) {
    try {
      const userId = req.user.id;
      const { provider } = req.body;

      const results = await calendarService.syncUserCalendars(userId, provider);

      const summary = {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        totalCreated: results.reduce((sum, r) => sum + (r.created || 0), 0),
        totalUpdated: results.reduce((sum, r) => sum + (r.updated || 0), 0),
        totalErrors: results.reduce((sum, r) => sum + (r.errors?.length || 0), 0)
      };

      res.json({
        success: true,
        data: {
          summary,
          results: results.map(r => ({
            integration: r.integration,
            status: r.status,
            created: r.created,
            updated: r.updated,
            errors: r.errors?.length || 0
          }))
        },
        message: `Synchronized ${summary.totalCreated + summary.totalUpdated} calendar events`
      });
    } catch (error) {
      console.error('Sync calendar events error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to sync calendar events',
          details: error.message
        }
      });
    }
  }

  /**
   * Link calendar event to lead
   */
  async linkToLead(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { eventId } = req.params;
      const { leadId } = req.body;
      const userId = req.user.id;

      // Verify event ownership
      const event = await CalendarEvent.findOne({
        where: { id: eventId, userId }
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Calendar event not found',
            code: 'EVENT_NOT_FOUND'
          }
        });
      }

      // Verify lead ownership if leadId is provided
      if (leadId) {
        const { Lead } = require('../database/models');
        const lead = await Lead.findOne({
          where: { id: leadId, userId }
        });

        if (!lead) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Lead not found',
              code: 'LEAD_NOT_FOUND'
            }
          });
        }
      }

      // Update the event
      event.leadId = leadId;
      await event.save();

      res.json({
        success: true,
        data: {
          id: event.id,
          title: event.title,
          leadId: event.leadId,
          updatedAt: event.updatedAt
        },
        message: leadId ? 'Event linked to lead successfully' : 'Event unlinked from lead successfully'
      });
    } catch (error) {
      console.error('Link event to lead error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to link event to lead',
          details: error.message
        }
      });
    }
  }

  /**
   * Export events to ICS format
   */
  async exportEvents(req, res) {
    try {
      const userId = req.user.id;
      const {
        startDate,
        endDate,
        provider
      } = req.query;

      const options = {};
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      if (provider) options.provider = provider;

      const events = await calendarService.getUserCalendarEvents(userId, options);

      // Generate ICS content
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Cold Caller//Calendar Export//EN',
        'METHOD:PUBLISH'
      ];

      events.forEach(event => {
        icsContent.push(event.toICS());
      });

      icsContent.push('END:VCALENDAR');

      const icsString = icsContent.join('\r\n');

      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="calendar-export.ics"');
      res.send(icsString);
    } catch (error) {
      console.error('Export events error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to export events',
          details: error.message
        }
      });
    }
  }

  /**
   * Get calendar statistics
   */
  async getStats(req, res) {
    try {
      const userId = req.user.id;
      const { timeframe = '30d' } = req.query;

      let startDate = new Date();
      switch (timeframe) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const events = await calendarService.getUserCalendarEvents(userId, {
        startDate,
        limit: 1000
      });

      const stats = {
        total: events.length,
        upcoming: events.filter(e => e.isUpcoming()).length,
        today: events.filter(e => e.isToday()).length,
        withLeads: events.filter(e => e.leadId).length,
        byProvider: {},
        byStatus: {},
        averageDuration: 0
      };

      // Group by provider and status
      events.forEach(event => {
        const provider = event.IntegrationSetting?.provider || 'unknown';
        stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;
        stats.byStatus[event.status] = (stats.byStatus[event.status] || 0) + 1;
      });

      // Calculate average duration
      if (events.length > 0) {
        const totalDuration = events.reduce((sum, event) => sum + event.getDuration(), 0);
        stats.averageDuration = Math.round(totalDuration / events.length / (1000 * 60)); // in minutes
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get calendar stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get calendar statistics',
          details: error.message
        }
      });
    }
  }
}

// Validation rules
const validateEventId = [
  param('eventId').isInt({ min: 1 }).withMessage('Valid event ID is required')
];

const validateCreateEvent = [
  body('integrationId').isInt({ min: 1 }).withMessage('Valid integration ID is required'),
  body('title').trim().notEmpty().withMessage('Event title is required'),
  body('startDateTime').isISO8601().withMessage('Valid start date/time is required'),
  body('endDateTime').isISO8601().withMessage('Valid end date/time is required'),
  body('description').optional().trim(),
  body('location').optional().trim(),
  body('timezone').optional().isString(),
  body('attendees').optional().isArray(),
  body('leadId').optional().isInt({ min: 1 })
];

const validateLinkToLead = [
  param('eventId').isInt({ min: 1 }).withMessage('Valid event ID is required'),
  body('leadId').optional().isInt({ min: 1 }).withMessage('Valid lead ID is required')
];

const validateSyncEvents = [
  body('provider').optional().isIn(['google_calendar', 'microsoft_calendar']).withMessage('Invalid provider')
];

const controller = new CalendarController();

module.exports = {
  getEvents: controller.getEvents.bind(controller),
  getEvent: [validateEventId, controller.getEvent.bind(controller)],
  createEvent: [validateCreateEvent, controller.createEvent.bind(controller)],
  syncEvents: [validateSyncEvents, controller.syncEvents.bind(controller)],
  linkToLead: [validateLinkToLead, controller.linkToLead.bind(controller)],
  exportEvents: controller.exportEvents.bind(controller),
  getStats: controller.getStats.bind(controller)
};