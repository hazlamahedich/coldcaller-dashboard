/**
 * Meeting Controller
 * Handles meeting scheduling, calendar integration, and timeline management
 */

const { body, param, query, validationResult } = require('express-validator');
const calendarService = require('../services/calendarService');
const { Meeting, CalendarEvent, Lead, IntegrationSettings } = require('../database/models');

class MeetingController {
  /**
   * Get user's meetings
   */
  async getMeetings(req, res) {
    try {
      const userId = req.user.id;
      const {
        startDate,
        endDate,
        leadId,
        status = 'all',
        limit = 50,
        page = 1
      } = req.query;

      const where = { userId };
      
      // Filter by date range
      if (startDate && endDate) {
        where.startTime = {
          [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // Filter by lead
      if (leadId) {
        where.leadId = leadId;
      }

      // Filter by status
      if (status !== 'all') {
        where.status = status;
      }

      const options = {
        where,
        include: [
          {
            model: Lead,
            attributes: ['id', 'name', 'company', 'email', 'phone']
          },
          {
            model: CalendarEvent,
            attributes: ['id', 'externalEventId', 'meetingUrl', 'conferenceData']
          }
        ],
        order: [['startTime', 'ASC']],
        limit: Math.min(parseInt(limit), 100),
        offset: (parseInt(page) - 1) * Math.min(parseInt(limit), 100)
      };

      const meetings = await Meeting.findAll(options);

      // Transform meetings for API response
      const transformedMeetings = meetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        duration: meeting.getDuration(),
        timezone: meeting.timezone,
        location: meeting.location,
        meetingType: meeting.meetingType,
        status: meeting.status,
        attendees: meeting.attendees,
        reminders: meeting.reminders,
        lead: meeting.Lead ? {
          id: meeting.Lead.id,
          name: meeting.Lead.name,
          company: meeting.Lead.company,
          email: meeting.Lead.email,
          phone: meeting.Lead.phone
        } : null,
        calendarEvent: meeting.CalendarEvent ? {
          id: meeting.CalendarEvent.id,
          externalEventId: meeting.CalendarEvent.externalEventId,
          meetingUrl: meeting.CalendarEvent.meetingUrl,
          conferenceData: meeting.CalendarEvent.conferenceData
        } : null,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        isUpcoming: meeting.isUpcoming(),
        isToday: meeting.isToday(),
        canJoin: meeting.canJoin()
      }));

      res.json({
        success: true,
        data: {
          meetings: transformedMeetings,
          pagination: {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
            total: meetings.length
          }
        }
      });
    } catch (error) {
      console.error('Get meetings error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get meetings',
          details: error.message
        }
      });
    }
  }

  /**
   * Get single meeting
   */
  async getMeeting(req, res) {
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

      const { meetingId } = req.params;
      const userId = req.user.id;

      const meeting = await Meeting.findOne({
        where: { id: meetingId, userId },
        include: [
          {
            model: Lead,
            attributes: ['id', 'name', 'company', 'email', 'phone']
          },
          {
            model: CalendarEvent,
            attributes: ['id', 'externalEventId', 'meetingUrl', 'conferenceData']
          }
        ]
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Meeting not found',
            code: 'MEETING_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: {
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          duration: meeting.getDuration(),
          timezone: meeting.timezone,
          location: meeting.location,
          meetingType: meeting.meetingType,
          status: meeting.status,
          attendees: meeting.attendees,
          reminders: meeting.reminders,
          lead: meeting.Lead,
          calendarEvent: meeting.CalendarEvent,
          createdAt: meeting.createdAt,
          updatedAt: meeting.updatedAt,
          isUpcoming: meeting.isUpcoming(),
          isToday: meeting.isToday(),
          canJoin: meeting.canJoin()
        }
      });
    } catch (error) {
      console.error('Get meeting error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get meeting',
          details: error.message
        }
      });
    }
  }

  /**
   * Create new meeting
   */
  async createMeeting(req, res) {
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
        leadId,
        title,
        description,
        startDateTime,
        endDateTime,
        timezone = 'UTC',
        location,
        meetingType = 'video',
        attendees = [],
        reminders = [],
        calendarProvider = 'google'
      } = req.body;

      // Verify lead ownership if leadId provided
      if (leadId) {
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

      // Get user's calendar integration
      const integration = await IntegrationSettings.findOne({
        where: {
          userId,
          provider: calendarProvider,
          status: 'connected',
          isActive: true
        }
      });

      if (!integration) {
        return res.status(400).json({
          success: false,
          error: {
            message: `${calendarProvider} calendar integration not found or not connected`,
            code: 'CALENDAR_INTEGRATION_NOT_FOUND'
          }
        });
      }

      // Create meeting in database
      const meeting = await Meeting.create({
        userId,
        leadId,
        title,
        description,
        startTime: new Date(startDateTime),
        endTime: new Date(endDateTime),
        timezone,
        location,
        meetingType,
        attendees,
        reminders,
        status: 'scheduled'
      });

      // Create calendar event
      try {
        const eventData = {
          title,
          description,
          startTime: new Date(startDateTime),
          endTime: new Date(endDateTime),
          timezone,
          location,
          attendees,
          duration: Math.floor((new Date(endDateTime) - new Date(startDateTime)) / (1000 * 60))
        };

        const calendarEvent = await calendarService.createExternalEvent(integration.id, eventData);
        
        // Link calendar event to meeting
        await meeting.update({
          calendarEventId: calendarEvent.id
        });

        // Add timeline entry to lead
        if (leadId) {
          await this.addTimelineEntry(leadId, {
            type: 'meeting_scheduled',
            title: `Meeting Scheduled: ${title}`,
            description: `Scheduled ${meetingType} meeting for ${new Date(startDateTime).toLocaleString()}`,
            data: {
              meetingId: meeting.id,
              startTime: startDateTime,
              duration: eventData.duration,
              meetingType
            }
          });
        }

        res.status(201).json({
          success: true,
          data: {
            meeting: {
              id: meeting.id,
              title: meeting.title,
              startTime: meeting.startTime,
              endTime: meeting.endTime,
              status: meeting.status,
              meetingType: meeting.meetingType,
              calendarEventId: calendarEvent.id
            },
            calendarEvent: {
              id: calendarEvent.id,
              externalEventId: calendarEvent.externalEventId,
              meetingUrl: calendarEvent.meetingUrl || calendarEvent.event?.conferenceData?.entryPoints?.[0]?.uri,
              htmlLink: calendarEvent.htmlLink || calendarEvent.webLink
            }
          },
          message: 'Meeting scheduled successfully'
        });

      } catch (calendarError) {
        console.error('Calendar event creation failed:', calendarError);
        
        // Update meeting status to indicate calendar sync issue
        await meeting.update({ 
          status: 'calendar_sync_failed',
          syncError: calendarError.message 
        });

        res.status(201).json({
          success: true,
          data: {
            meeting: {
              id: meeting.id,
              title: meeting.title,
              startTime: meeting.startTime,
              endTime: meeting.endTime,
              status: meeting.status
            }
          },
          warning: 'Meeting created but calendar sync failed. Please manually add to calendar.',
          calendarError: calendarError.message
        });
      }

    } catch (error) {
      console.error('Create meeting error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create meeting',
          details: error.message
        }
      });
    }
  }

  /**
   * Update meeting
   */
  async updateMeeting(req, res) {
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

      const { meetingId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const meeting = await Meeting.findOne({
        where: { id: meetingId, userId },
        include: [CalendarEvent]
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Meeting not found',
            code: 'MEETING_NOT_FOUND'
          }
        });
      }

      // Update meeting in database
      await meeting.update(updates);

      // Update calendar event if exists
      if (meeting.CalendarEvent) {
        try {
          const integration = await IntegrationSettings.findOne({
            where: { id: meeting.CalendarEvent.integrationId }
          });

          if (integration) {
            await calendarService.updateEvent(
              meeting.CalendarEvent.externalEventId,
              updates,
              integration.provider,
              integration.getTokens()
            );
          }
        } catch (calendarError) {
          console.error('Calendar update failed:', calendarError);
        }
      }

      // Add timeline entry if lead associated
      if (meeting.leadId) {
        await this.addTimelineEntry(meeting.leadId, {
          type: 'meeting_updated',
          title: `Meeting Updated: ${meeting.title}`,
          description: 'Meeting details have been updated',
          data: {
            meetingId: meeting.id,
            updates: Object.keys(updates)
          }
        });
      }

      res.json({
        success: true,
        data: {
          id: meeting.id,
          title: meeting.title,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          status: meeting.status,
          updatedAt: meeting.updatedAt
        },
        message: 'Meeting updated successfully'
      });
    } catch (error) {
      console.error('Update meeting error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update meeting',
          details: error.message
        }
      });
    }
  }

  /**
   * Cancel meeting
   */
  async cancelMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const userId = req.user.id;

      const meeting = await Meeting.findOne({
        where: { id: meetingId, userId },
        include: [CalendarEvent]
      });

      if (!meeting) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Meeting not found',
            code: 'MEETING_NOT_FOUND'
          }
        });
      }

      // Cancel meeting
      await meeting.update({ 
        status: 'cancelled',
        cancelledAt: new Date()
      });

      // Cancel calendar event
      if (meeting.CalendarEvent) {
        try {
          const integration = await IntegrationSettings.findOne({
            where: { id: meeting.CalendarEvent.integrationId }
          });

          if (integration) {
            await calendarService.deleteEvent(
              meeting.CalendarEvent.externalEventId,
              integration.provider,
              integration.getTokens()
            );
          }
        } catch (calendarError) {
          console.error('Calendar cancellation failed:', calendarError);
        }
      }

      // Add timeline entry
      if (meeting.leadId) {
        await this.addTimelineEntry(meeting.leadId, {
          type: 'meeting_cancelled',
          title: `Meeting Cancelled: ${meeting.title}`,
          description: 'Meeting has been cancelled',
          data: {
            meetingId: meeting.id,
            originalStartTime: meeting.startTime
          }
        });
      }

      res.json({
        success: true,
        data: {
          id: meeting.id,
          status: meeting.status,
          cancelledAt: meeting.cancelledAt
        },
        message: 'Meeting cancelled successfully'
      });
    } catch (error) {
      console.error('Cancel meeting error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to cancel meeting',
          details: error.message
        }
      });
    }
  }

  /**
   * Get meeting availability
   */
  async getAvailability(req, res) {
    try {
      const userId = req.user.id;
      const {
        startDate,
        endDate,
        duration = 30,
        provider = 'google'
      } = req.body;

      // Get user's calendar integration
      const integration = await IntegrationSettings.findOne({
        where: {
          userId,
          provider,
          status: 'connected',
          isActive: true
        }
      });

      if (!integration) {
        return res.status(400).json({
          success: false,
          error: {
            message: `${provider} calendar integration not found`,
            code: 'CALENDAR_INTEGRATION_NOT_FOUND'
          }
        });
      }

      // Get availability from calendar service
      const availability = await calendarService.getAvailability(
        userId,
        new Date(startDate),
        new Date(endDate),
        provider,
        integration.getTokens()
      );

      res.json({
        success: true,
        data: {
          availableSlots: availability.available || [],
          busySlots: availability.busy || [],
          provider,
          timeRange: {
            start: startDate,
            end: endDate,
            duration
          }
        }
      });
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get availability',
          details: error.message
        }
      });
    }
  }

  /**
   * Add timeline entry to lead
   */
  async addTimelineEntry(leadId, entry) {
    try {
      const { LeadTimeline } = require('../database/models');
      await LeadTimeline.create({
        leadId,
        ...entry,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to add timeline entry:', error);
    }
  }
}

// Validation rules
const validateMeetingId = [
  param('meetingId').isInt({ min: 1 }).withMessage('Valid meeting ID is required')
];

const validateCreateMeeting = [
  body('title').trim().notEmpty().withMessage('Meeting title is required'),
  body('startDateTime').isISO8601().withMessage('Valid start date/time is required'),
  body('endDateTime').isISO8601().withMessage('Valid end date/time is required'),
  body('description').optional().trim(),
  body('location').optional().trim(),
  body('meetingType').optional().isIn(['in-person', 'video', 'phone']).withMessage('Invalid meeting type'),
  body('timezone').optional().isString(),
  body('attendees').optional().isArray(),
  body('reminders').optional().isArray(),
  body('leadId').optional().isUUID().withMessage('Valid lead ID required'),
  body('calendarProvider').optional().isIn(['google', 'outlook', 'apple']).withMessage('Invalid calendar provider')
];

const validateUpdateMeeting = [
  param('meetingId').isInt({ min: 1 }).withMessage('Valid meeting ID is required'),
  body('title').optional().trim().notEmpty(),
  body('startDateTime').optional().isISO8601(),
  body('endDateTime').optional().isISO8601(),
  body('description').optional().trim(),
  body('location').optional().trim(),
  body('status').optional().isIn(['scheduled', 'completed', 'cancelled', 'no_show']),
  body('meetingType').optional().isIn(['in-person', 'video', 'phone'])
];

const validateGetAvailability = [
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
  body('provider').optional().isIn(['google', 'outlook', 'apple']).withMessage('Invalid calendar provider')
];

const controller = new MeetingController();

module.exports = {
  getMeetings: controller.getMeetings.bind(controller),
  getMeeting: [validateMeetingId, controller.getMeeting.bind(controller)],
  createMeeting: [validateCreateMeeting, controller.createMeeting.bind(controller)],
  updateMeeting: [validateUpdateMeeting, controller.updateMeeting.bind(controller)],
  cancelMeeting: [validateMeetingId, controller.cancelMeeting.bind(controller)],
  getAvailability: [validateGetAvailability, controller.getAvailability.bind(controller)]
};