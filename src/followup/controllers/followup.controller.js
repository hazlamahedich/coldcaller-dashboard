const { Followup, AutomationRule, Lead, User, Call } = require('../models');
const followupSchedulerService = require('../services/followup-scheduler.service');
const { Op } = require('sequelize');
const moment = require('moment');

/**
 * Follow-up Controller
 * Handles HTTP requests for follow-up management
 */
class FollowupController {
  
  /**
   * Get all follow-ups with filtering and pagination
   */
  async getFollowups(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        type,
        userId,
        leadId,
        startDate,
        endDate,
        sortBy = 'scheduledFor',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Apply filters
      if (status) {
        where.status = Array.isArray(status) ? { [Op.in]: status } : status;
      }
      
      if (priority) {
        where.priority = Array.isArray(priority) ? { [Op.in]: priority } : priority;
      }
      
      if (type) {
        where.type = Array.isArray(type) ? { [Op.in]: type } : type;
      }
      
      if (userId) {
        where.userId = userId;
      }
      
      if (leadId) {
        where.leadId = leadId;
      }

      if (startDate || endDate) {
        where.scheduledFor = {};
        if (startDate) where.scheduledFor[Op.gte] = new Date(startDate);
        if (endDate) where.scheduledFor[Op.lte] = new Date(endDate);
      }

      const { rows: followups, count: total } = await Followup.findAndCountAll({
        where,
        include: [
          { model: Lead, as: 'lead' },
          { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] },
          { model: Call, as: 'call' }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true
      });

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          followups,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            itemsPerPage: parseInt(limit),
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Error getting follow-ups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve follow-ups',
        details: error.message
      });
    }
  }

  /**
   * Get single follow-up by ID
   */
  async getFollowup(req, res) {
    try {
      const { id } = req.params;

      const followup = await Followup.findByPk(id, {
        include: [
          { model: Lead, as: 'lead' },
          { model: User, as: 'assignedUser' },
          { model: User, as: 'completedByUser' },
          { model: Call, as: 'call' },
          { model: AutomationRule, as: 'automationRule' }
        ]
      });

      if (!followup) {
        return res.status(404).json({
          success: false,
          error: 'Follow-up not found'
        });
      }

      res.json({
        success: true,
        data: followup
      });

    } catch (error) {
      console.error('Error getting follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve follow-up',
        details: error.message
      });
    }
  }

  /**
   * Create new follow-up
   */
  async createFollowup(req, res) {
    try {
      const {
        leadId,
        callId,
        type = 'call',
        priority = 'medium',
        title,
        description,
        scheduledFor,
        duration = 30,
        templateId,
        createCalendarEvent = true
      } = req.body;

      const userId = req.user.id;

      // Validate required fields
      if (!leadId || !title || !scheduledFor) {
        return res.status(400).json({
          success: false,
          error: 'Lead ID, title, and scheduled date are required'
        });
      }

      // Check if lead exists
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found'
        });
      }

      const followup = await followupSchedulerService.createManualFollowup({
        leadId,
        callId,
        userId,
        type,
        priority,
        title,
        description,
        scheduledFor: new Date(scheduledFor),
        duration,
        templateId,
        createCalendarEvent
      });

      res.status(201).json({
        success: true,
        data: followup,
        message: 'Follow-up created successfully'
      });

    } catch (error) {
      console.error('Error creating follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create follow-up',
        details: error.message
      });
    }
  }

  /**
   * Create follow-up from call outcome
   */
  async createFollowupFromCall(req, res) {
    try {
      const { callId, outcome, options = {} } = req.body;
      const userId = req.user.id;

      if (!callId || !outcome) {
        return res.status(400).json({
          success: false,
          error: 'Call ID and outcome are required'
        });
      }

      const followups = await followupSchedulerService.createFollowupFromCall(
        callId,
        outcome,
        userId,
        options
      );

      res.status(201).json({
        success: true,
        data: followups,
        message: `Created ${followups.length} follow-up(s) from call outcome`
      });

    } catch (error) {
      console.error('Error creating follow-up from call:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create follow-up from call',
        details: error.message
      });
    }
  }

  /**
   * Update follow-up
   */
  async updateFollowup(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const followup = await Followup.findByPk(id);
      
      if (!followup) {
        return res.status(404).json({
          success: false,
          error: 'Follow-up not found'
        });
      }

      // Validate status transitions
      if (updates.status && !this.isValidStatusTransition(followup.status, updates.status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from ${followup.status} to ${updates.status}`
        });
      }

      await followup.update(updates);

      const updatedFollowup = await Followup.findByPk(id, {
        include: [
          { model: Lead, as: 'lead' },
          { model: User, as: 'assignedUser' },
          { model: Call, as: 'call' }
        ]
      });

      res.json({
        success: true,
        data: updatedFollowup,
        message: 'Follow-up updated successfully'
      });

    } catch (error) {
      console.error('Error updating follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update follow-up',
        details: error.message
      });
    }
  }

  /**
   * Reschedule follow-up
   */
  async rescheduleFollowup(req, res) {
    try {
      const { id } = req.params;
      const { newDate, reason } = req.body;
      const userId = req.user.id;

      if (!newDate) {
        return res.status(400).json({
          success: false,
          error: 'New date is required'
        });
      }

      const followup = await followupSchedulerService.rescheduleFollowup(
        id,
        new Date(newDate),
        reason,
        userId
      );

      res.json({
        success: true,
        data: followup,
        message: 'Follow-up rescheduled successfully'
      });

    } catch (error) {
      console.error('Error rescheduling follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reschedule follow-up',
        details: error.message
      });
    }
  }

  /**
   * Complete follow-up
   */
  async completeFollowup(req, res) {
    try {
      const { id } = req.params;
      const { outcome, notes } = req.body;
      const userId = req.user.id;

      if (!outcome) {
        return res.status(400).json({
          success: false,
          error: 'Outcome is required'
        });
      }

      const followup = await followupSchedulerService.completeFollowup(
        id,
        outcome,
        notes,
        userId
      );

      res.json({
        success: true,
        data: followup,
        message: 'Follow-up completed successfully'
      });

    } catch (error) {
      console.error('Error completing follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete follow-up',
        details: error.message
      });
    }
  }

  /**
   * Delete follow-up
   */
  async deleteFollowup(req, res) {
    try {
      const { id } = req.params;

      const followup = await Followup.findByPk(id);
      
      if (!followup) {
        return res.status(404).json({
          success: false,
          error: 'Follow-up not found'
        });
      }

      await followup.destroy();

      res.json({
        success: true,
        message: 'Follow-up deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete follow-up',
        details: error.message
      });
    }
  }

  /**
   * Get upcoming follow-ups for user
   */
  async getUpcomingFollowups(req, res) {
    try {
      const { days = 7 } = req.query;
      const userId = req.user.id;

      const followups = await followupSchedulerService.getUpcomingFollowups(userId, parseInt(days));

      res.json({
        success: true,
        data: followups
      });

    } catch (error) {
      console.error('Error getting upcoming follow-ups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve upcoming follow-ups',
        details: error.message
      });
    }
  }

  /**
   * Get overdue follow-ups for user
   */
  async getOverdueFollowups(req, res) {
    try {
      const userId = req.user.id;

      const followups = await followupSchedulerService.getOverdueFollowups(userId);

      res.json({
        success: true,
        data: followups
      });

    } catch (error) {
      console.error('Error getting overdue follow-ups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overdue follow-ups',
        details: error.message
      });
    }
  }

  /**
   * Bulk create follow-ups
   */
  async bulkCreateFollowups(req, res) {
    try {
      const { followups: followupData } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(followupData) || followupData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Array of follow-up data is required'
        });
      }

      // Add userId to each follow-up
      const followupsWithUser = followupData.map(data => ({
        ...data,
        userId
      }));

      const results = await followupSchedulerService.bulkScheduleFollowups(followupsWithUser);

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        success: true,
        data: {
          successful: successful.length,
          failed: failed.length,
          results
        },
        message: `Bulk operation completed: ${successful.length} successful, ${failed.length} failed`
      });

    } catch (error) {
      console.error('Error bulk creating follow-ups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk create follow-ups',
        details: error.message
      });
    }
  }

  /**
   * Get follow-up statistics
   */
  async getFollowupStatistics(req, res) {
    try {
      const { timeframe = 'month', userId } = req.query;
      const targetUserId = userId || req.user.id;

      const startDate = moment().subtract(1, timeframe);

      const [
        totalFollowups,
        completedFollowups,
        overdueFollowups,
        upcomingFollowups,
        avgCompletionTime,
        completionRateByOutcome
      ] = await Promise.all([
        // Total follow-ups
        Followup.count({
          where: {
            userId: targetUserId,
            createdAt: { [Op.gte]: startDate.toDate() }
          }
        }),

        // Completed follow-ups
        Followup.count({
          where: {
            userId: targetUserId,
            status: 'completed',
            completedAt: { [Op.gte]: startDate.toDate() }
          }
        }),

        // Overdue follow-ups
        Followup.count({
          where: {
            userId: targetUserId,
            scheduledFor: { [Op.lt]: new Date() },
            status: { [Op.notIn]: ['completed', 'cancelled'] }
          }
        }),

        // Upcoming follow-ups (next 7 days)
        Followup.count({
          where: {
            userId: targetUserId,
            scheduledFor: {
              [Op.between]: [new Date(), moment().add(7, 'days').toDate()]
            },
            status: { [Op.notIn]: ['completed', 'cancelled'] }
          }
        }),

        // Average completion time
        Followup.findAll({
          where: {
            userId: targetUserId,
            status: 'completed',
            completedAt: { [Op.gte]: startDate.toDate() },
            scheduledFor: { [Op.not]: null },
            completedAt: { [Op.not]: null }
          },
          attributes: ['scheduledFor', 'completedAt']
        }).then(followups => {
          if (followups.length === 0) return 0;
          
          const totalHours = followups.reduce((sum, f) => {
            const scheduled = moment(f.scheduledFor);
            const completed = moment(f.completedAt);
            return sum + Math.abs(completed.diff(scheduled, 'hours'));
          }, 0);
          
          return Math.round(totalHours / followups.length);
        }),

        // Completion rate by outcome
        Followup.findAll({
          where: {
            userId: targetUserId,
            status: 'completed',
            completedAt: { [Op.gte]: startDate.toDate() },
            outcome: { [Op.not]: null }
          },
          attributes: [
            'outcome',
            [require('sequelize').fn('COUNT', '*'), 'count']
          ],
          group: ['outcome']
        })
      ]);

      const completionRate = totalFollowups > 0 
        ? ((completedFollowups / totalFollowups) * 100).toFixed(2)
        : 0;

      const outcomeDistribution = completionRateByOutcome.reduce((acc, item) => {
        acc[item.outcome] = parseInt(item.dataValues.count);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          timeframe,
          totalFollowups,
          completedFollowups,
          overdueFollowups,
          upcomingFollowups,
          completionRate: parseFloat(completionRate),
          averageCompletionTimeHours: avgCompletionTime,
          outcomeDistribution
        }
      });

    } catch (error) {
      console.error('Error getting follow-up statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve follow-up statistics',
        details: error.message
      });
    }
  }

  /**
   * Validate status transition
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'pending': ['scheduled', 'in_progress', 'cancelled'],
      'scheduled': ['in_progress', 'completed', 'cancelled', 'rescheduled'],
      'in_progress': ['completed', 'cancelled', 'rescheduled'],
      'completed': [], // Cannot transition from completed
      'cancelled': ['scheduled', 'pending'], // Can reactivate cancelled
      'overdue': ['in_progress', 'completed', 'cancelled', 'rescheduled'],
      'rescheduled': ['scheduled', 'in_progress', 'completed', 'cancelled']
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}

module.exports = new FollowupController();