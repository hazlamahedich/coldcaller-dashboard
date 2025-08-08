const { Followup, AutomationRule, Lead, User, Call } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const EventEmitter = require('events');

/**
 * Follow-up Scheduler Service
 * Handles automatic follow-up creation and scheduling based on call outcomes
 */
class FollowupSchedulerService extends EventEmitter {
  constructor() {
    super();
    this.logger = require('../../utils/logger');
    this.notificationService = require('./notification.service');
    this.calendarService = require('./calendar.service');
  }

  /**
   * Create follow-up based on call outcome
   */
  async createFollowupFromCall(callId, outcome, userId, options = {}) {
    try {
      this.logger.info(`Creating follow-up from call ${callId} with outcome ${outcome}`);

      const call = await Call.findByPk(callId, {
        include: [{ model: Lead, as: 'lead' }]
      });

      if (!call) {
        throw new Error(`Call ${callId} not found`);
      }

      // Find applicable automation rules
      const automationRules = await this.findApplicableRules('call_outcome', {
        outcome,
        leadId: call.leadId,
        callId: callId
      });

      const followups = [];

      // Process each automation rule
      for (const rule of automationRules) {
        try {
          const followup = await this.executeAutomationRule(rule, {
            call,
            outcome,
            userId,
            ...options
          });

          if (followup) {
            followups.push(followup);
            await rule.incrementExecution(true);
          }
        } catch (error) {
          this.logger.error(`Failed to execute automation rule ${rule.id}:`, error);
          await rule.incrementExecution(false);
        }
      }

      // Create manual follow-up if specified or no automation rules applied
      if (options.createManual || followups.length === 0) {
        const manualFollowup = await this.createManualFollowup({
          leadId: call.leadId,
          callId: callId,
          userId,
          outcome,
          ...options
        });
        followups.push(manualFollowup);
      }

      this.emit('followupsCreated', { followups, call, outcome });

      return followups;

    } catch (error) {
      this.logger.error('Error creating follow-up from call:', error);
      throw error;
    }
  }

  /**
   * Find applicable automation rules based on trigger and conditions
   */
  async findApplicableRules(triggerEvent, context) {
    const rules = await AutomationRule.findActiveByTrigger(triggerEvent);
    const applicableRules = [];

    for (const rule of rules) {
      if (await this.evaluateRuleConditions(rule, context)) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  /**
   * Evaluate if automation rule conditions are met
   */
  async evaluateRuleConditions(rule, context) {
    try {
      // Check if rule can execute (cooldown, limits, etc.)
      if (!rule.canExecute(context.leadId)) {
        return false;
      }

      // Evaluate conditions
      const { conditions } = rule;

      for (const [key, expectedValue] of Object.entries(conditions)) {
        const actualValue = this.getContextValue(context, key);
        
        if (!this.compareValues(actualValue, expectedValue)) {
          return false;
        }
      }

      return true;

    } catch (error) {
      this.logger.error(`Error evaluating rule conditions for ${rule.id}:`, error);
      return false;
    }
  }

  /**
   * Get value from context using dot notation
   */
  getContextValue(context, path) {
    return path.split('.').reduce((obj, key) => obj?.[key], context);
  }

  /**
   * Compare values with support for operators
   */
  compareValues(actual, expected) {
    if (typeof expected === 'object' && expected !== null) {
      // Support for operators like { $in: [...], $eq: ..., $gt: ... }
      for (const [operator, value] of Object.entries(expected)) {
        switch (operator) {
          case '$eq':
            return actual === value;
          case '$ne':
            return actual !== value;
          case '$in':
            return Array.isArray(value) && value.includes(actual);
          case '$nin':
            return Array.isArray(value) && !value.includes(actual);
          case '$gt':
            return actual > value;
          case '$gte':
            return actual >= value;
          case '$lt':
            return actual < value;
          case '$lte':
            return actual <= value;
          case '$contains':
            return typeof actual === 'string' && actual.includes(value);
          default:
            return false;
        }
      }
    }

    return actual === expected;
  }

  /**
   * Execute automation rule and create follow-up
   */
  async executeAutomationRule(rule, context) {
    try {
      this.logger.info(`Executing automation rule ${rule.id}`);

      // Calculate scheduled date
      const scheduledFor = rule.calculateScheduleDate();

      // Determine assignment
      const assignedUserId = await this.determineAssignment(rule, context);

      // Create follow-up
      const followup = await Followup.create({
        leadId: context.call.leadId,
        callId: context.call.id,
        userId: assignedUserId,
        type: rule.followupType,
        priority: rule.priority,
        title: this.interpolateTemplate(rule.titleTemplate, context),
        description: this.interpolateTemplate(rule.descriptionTemplate, context),
        scheduledFor: scheduledFor,
        templateId: rule.templateId,
        automationRuleId: rule.id,
        isAutomated: true,
        createdVia: 'automation'
      });

      // Schedule calendar event if enabled
      if (context.createCalendarEvent !== false) {
        await this.scheduleCalendarEvent(followup);
      }

      // Set up reminders
      await this.scheduleReminders(followup);

      this.logger.info(`Created automated follow-up ${followup.id}`);

      return followup;

    } catch (error) {
      this.logger.error(`Error executing automation rule ${rule.id}:`, error);
      throw error;
    }
  }

  /**
   * Create manual follow-up
   */
  async createManualFollowup(options) {
    const {
      leadId,
      callId,
      userId,
      outcome,
      type = 'call',
      priority = 'medium',
      title,
      description,
      scheduledFor,
      duration = 30
    } = options;

    // Generate default title if not provided
    const defaultTitle = title || this.generateDefaultTitle(outcome, type);
    
    // Calculate scheduled date if not provided
    const defaultScheduledFor = scheduledFor || this.calculateDefaultScheduleDate(outcome);

    const followup = await Followup.create({
      leadId,
      callId,
      userId,
      type,
      priority,
      title: defaultTitle,
      description: description || `Follow-up created from call outcome: ${outcome}`,
      scheduledFor: defaultScheduledFor,
      duration,
      createdVia: 'manual'
    });

    // Schedule calendar event
    await this.scheduleCalendarEvent(followup);

    // Set up reminders
    await this.scheduleReminders(followup);

    this.logger.info(`Created manual follow-up ${followup.id}`);

    return followup;
  }

  /**
   * Determine user assignment based on rule configuration
   */
  async determineAssignment(rule, context) {
    const { assignmentRule } = rule;

    switch (assignmentRule.type) {
      case 'original_user':
        return context.userId;
      
      case 'round_robin':
        return await this.getRoundRobinUser(rule.teamId);
      
      case 'territory':
        return await this.getTerritoryUser(context.call.lead);
      
      case 'skill_based':
        return await this.getSkillBasedUser(rule.followupType, rule.teamId);
      
      default:
        return context.userId;
    }
  }

  /**
   * Get next user in round-robin rotation
   */
  async getRoundRobinUser(teamId) {
    // Implementation depends on team management system
    // For now, return a placeholder
    return null;
  }

  /**
   * Get user based on territory assignment
   */
  async getTerritoryUser(lead) {
    // Implementation depends on territory management
    return null;
  }

  /**
   * Get user based on skill matching
   */
  async getSkillBasedUser(followupType, teamId) {
    // Implementation depends on skill management
    return null;
  }

  /**
   * Interpolate template variables
   */
  interpolateTemplate(template, context) {
    if (!template) return '';

    const { call, outcome } = context;
    const lead = call.lead;

    return template
      .replace(/\{\{leadName\}\}/g, lead?.name || 'Unknown')
      .replace(/\{\{leadCompany\}\}/g, lead?.company || 'Unknown Company')
      .replace(/\{\{outcome\}\}/g, outcome || 'Unknown')
      .replace(/\{\{callDate\}\}/g, call?.createdAt ? moment(call.createdAt).format('YYYY-MM-DD') : '')
      .replace(/\{\{userName\}\}/g, context.user?.name || 'Unknown User');
  }

  /**
   * Generate default title based on outcome
   */
  generateDefaultTitle(outcome, type) {
    const titleMap = {
      'no_answer': 'Follow-up call - No answer',
      'voicemail': 'Follow-up call - Left voicemail',
      'callback_requested': 'Return callback as requested',
      'follow_up_scheduled': 'Scheduled follow-up call',
      'meeting_scheduled': 'Prepare for scheduled meeting',
      'demo_scheduled': 'Prepare for product demo',
      'proposal_requested': 'Prepare and send proposal',
      'not_interested': 'Nurture sequence - Check back later'
    };

    return titleMap[outcome] || `${type.charAt(0).toUpperCase() + type.slice(1)} follow-up`;
  }

  /**
   * Calculate default schedule date based on outcome
   */
  calculateDefaultScheduleDate(outcome) {
    const scheduleMap = {
      'no_answer': { days: 1 },
      'voicemail': { days: 2 },
      'callback_requested': { hours: 4 },
      'follow_up_scheduled': { weeks: 1 },
      'meeting_scheduled': { hours: 2 }, // Prep time
      'demo_scheduled': { hours: 4 },
      'proposal_requested': { days: 1 },
      'not_interested': { weeks: 4 }
    };

    const schedule = scheduleMap[outcome] || { days: 3 };
    const scheduledFor = moment();

    if (schedule.minutes) scheduledFor.add(schedule.minutes, 'minutes');
    if (schedule.hours) scheduledFor.add(schedule.hours, 'hours');
    if (schedule.days) scheduledFor.add(schedule.days, 'days');
    if (schedule.weeks) scheduledFor.add(schedule.weeks, 'weeks');

    // Adjust for business hours
    return this.adjustForBusinessHours(scheduledFor.toDate());
  }

  /**
   * Adjust date for business hours
   */
  adjustForBusinessHours(date) {
    const businessStart = 9; // 9 AM
    const businessEnd = 17;  // 5 PM
    
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    
    // If weekend, move to Monday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 2;
      date.setDate(date.getDate() + daysUntilMonday);
      date.setHours(businessStart, 0, 0, 0);
    }
    // If before business hours, move to business start
    else if (hour < businessStart) {
      date.setHours(businessStart, 0, 0, 0);
    }
    // If after business hours, move to next business day start
    else if (hour >= businessEnd) {
      date.setDate(date.getDate() + 1);
      date.setHours(businessStart, 0, 0, 0);
    }
    
    return date;
  }

  /**
   * Schedule calendar event for follow-up
   */
  async scheduleCalendarEvent(followup) {
    try {
      if (this.calendarService) {
        const event = await this.calendarService.createEvent({
          title: followup.title,
          description: followup.description,
          startTime: followup.scheduledFor,
          duration: followup.duration || 30,
          attendees: [followup.userId]
        });

        if (event) {
          await followup.update({
            calendarEventId: event.id,
            calendarProvider: event.provider || 'google'
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to create calendar event for followup ${followup.id}:`, error);
    }
  }

  /**
   * Schedule reminders for follow-up
   */
  async scheduleReminders(followup) {
    try {
      if (this.notificationService && followup.notificationPreferences.email) {
        const reminderMinutes = followup.notificationPreferences.reminderMinutes || [1440, 60, 15];
        
        for (const minutes of reminderMinutes) {
          const reminderTime = moment(followup.scheduledFor).subtract(minutes, 'minutes');
          
          if (reminderTime.isAfter()) {
            await this.notificationService.scheduleReminder({
              followupId: followup.id,
              type: 'email',
              scheduledFor: reminderTime.toDate(),
              message: `Reminder: ${followup.title} scheduled for ${moment(followup.scheduledFor).format('LLLL')}`
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to schedule reminders for followup ${followup.id}:`, error);
    }
  }

  /**
   * Bulk schedule follow-ups
   */
  async bulkScheduleFollowups(followupData) {
    const results = [];

    for (const data of followupData) {
      try {
        const followup = await this.createManualFollowup(data);
        results.push({ success: true, followup });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          data 
        });
      }
    }

    return results;
  }

  /**
   * Reschedule follow-up
   */
  async rescheduleFollowup(followupId, newDate, reason, userId) {
    try {
      const followup = await Followup.findByPk(followupId);
      
      if (!followup) {
        throw new Error(`Follow-up ${followupId} not found`);
      }

      const oldDate = followup.scheduledFor;
      await followup.reschedule(newDate, reason);

      // Update calendar event
      if (followup.calendarEventId && this.calendarService) {
        await this.calendarService.updateEvent(followup.calendarEventId, {
          startTime: newDate
        });
      }

      // Reschedule reminders
      await this.scheduleReminders(followup);

      this.emit('followupRescheduled', { 
        followup, 
        oldDate, 
        newDate, 
        reason, 
        userId 
      });

      this.logger.info(`Rescheduled follow-up ${followupId} from ${oldDate} to ${newDate}`);

      return followup;

    } catch (error) {
      this.logger.error(`Error rescheduling follow-up ${followupId}:`, error);
      throw error;
    }
  }

  /**
   * Get overdue follow-ups
   */
  async getOverdueFollowups(userId = null) {
    return await Followup.getOverdueFollowups(userId);
  }

  /**
   * Get upcoming follow-ups
   */
  async getUpcomingFollowups(userId, days = 7) {
    return await Followup.getUpcomingFollowups(userId, days);
  }

  /**
   * Complete follow-up
   */
  async completeFollowup(followupId, outcome, notes, userId) {
    try {
      const followup = await Followup.findByPk(followupId);
      
      if (!followup) {
        throw new Error(`Follow-up ${followupId} not found`);
      }

      await followup.markCompleted(outcome, notes, userId);

      this.emit('followupCompleted', { followup, outcome, notes, userId });

      this.logger.info(`Completed follow-up ${followupId} with outcome ${outcome}`);

      return followup;

    } catch (error) {
      this.logger.error(`Error completing follow-up ${followupId}:`, error);
      throw error;
    }
  }
}

module.exports = new FollowupSchedulerService();