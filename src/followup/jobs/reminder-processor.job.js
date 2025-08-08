const cron = require('node-cron');
const { Followup, Task, User } = require('../models');
const notificationService = require('../services/notification.service');
const { Op } = require('sequelize');
const moment = require('moment');

/**
 * Reminder Processor Job
 * Background job that processes scheduled reminders and overdue notifications
 */
class ReminderProcessorJob {
  constructor() {
    this.logger = require('../../utils/logger');
    this.isRunning = false;
    this.jobs = [];
  }

  /**
   * Start all reminder processing jobs
   */
  start() {
    try {
      this.logger.info('Starting reminder processor jobs...');

      // Process immediate reminders every 5 minutes
      const immediateRemindersJob = cron.schedule('*/5 * * * *', async () => {
        if (!this.isRunning) {
          await this.processImmediateReminders();
        }
      }, {
        scheduled: false,
        name: 'immediate-reminders'
      });

      // Process overdue items every 30 minutes
      const overdueItemsJob = cron.schedule('*/30 * * * *', async () => {
        if (!this.isRunning) {
          await this.processOverdueItems();
        }
      }, {
        scheduled: false,
        name: 'overdue-items'
      });

      // Send daily digests at 8 AM
      const dailyDigestJob = cron.schedule('0 8 * * *', async () => {
        if (!this.isRunning) {
          await this.sendDailyDigests();
        }
      }, {
        scheduled: false,
        name: 'daily-digests'
      });

      // Clean up old processed reminders every 4 hours
      const cleanupJob = cron.schedule('0 */4 * * *', async () => {
        if (!this.isRunning) {
          await this.cleanupOldReminders();
        }
      }, {
        scheduled: false,
        name: 'reminder-cleanup'
      });

      // Process followup escalations every hour
      const escalationJob = cron.schedule('0 * * * *', async () => {
        if (!this.isRunning) {
          await this.processFollowupEscalations();
        }
      }, {
        scheduled: false,
        name: 'followup-escalations'
      });

      // Store job references
      this.jobs = [
        immediateRemindersJob,
        overdueItemsJob,
        dailyDigestJob,
        cleanupJob,
        escalationJob
      ];

      // Start all jobs
      this.jobs.forEach(job => job.start());

      this.logger.info('Reminder processor jobs started successfully');

    } catch (error) {
      this.logger.error('Error starting reminder processor jobs:', error);
      throw error;
    }
  }

  /**
   * Stop all reminder processing jobs
   */
  stop() {
    try {
      this.logger.info('Stopping reminder processor jobs...');

      this.jobs.forEach(job => {
        job.stop();
        job.destroy();
      });

      this.jobs = [];
      this.isRunning = false;

      this.logger.info('Reminder processor jobs stopped');

    } catch (error) {
      this.logger.error('Error stopping reminder processor jobs:', error);
    }
  }

  /**
   * Process immediate reminders (due within next 15 minutes)
   */
  async processImmediateReminders() {
    try {
      this.isRunning = true;
      this.logger.info('Processing immediate reminders...');

      const now = new Date();
      const reminderWindow = moment().add(15, 'minutes').toDate();

      // Find follow-ups with upcoming reminders
      const upcomingFollowups = await Followup.findAll({
        where: {
          scheduledFor: {
            [Op.between]: [now, reminderWindow]
          },
          status: { [Op.notIn]: ['completed', 'cancelled'] },
          reminderSent: false
        },
        include: [
          { model: User, as: 'assignedUser' }
        ]
      });

      // Find tasks with upcoming reminders
      const upcomingTasks = await Task.findAll({
        where: {
          dueDate: {
            [Op.between]: [now, reminderWindow]
          },
          status: { [Op.notIn]: ['completed', 'cancelled'] },
          lastReminderSent: {
            [Op.or]: [
              null,
              { [Op.lt]: moment().subtract(1, 'hour').toDate() }
            ]
          }
        },
        include: [
          { model: User, as: 'assignedUser' }
        ]
      });

      // Process follow-up reminders
      let followupCount = 0;
      for (const followup of upcomingFollowups) {
        try {
          await notificationService.sendFollowupReminder(followup, 'upcoming');
          followupCount++;
        } catch (error) {
          this.logger.error(`Error sending reminder for followup ${followup.id}:`, error);
        }
      }

      // Process task reminders
      let taskCount = 0;
      for (const task of upcomingTasks) {
        try {
          await notificationService.sendTaskReminder(task, 'upcoming');
          taskCount++;
        } catch (error) {
          this.logger.error(`Error sending reminder for task ${task.id}:`, error);
        }
      }

      this.logger.info(`Processed ${followupCount} follow-up reminders and ${taskCount} task reminders`);

    } catch (error) {
      this.logger.error('Error processing immediate reminders:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process overdue items
   */
  async processOverdueItems() {
    try {
      this.isRunning = true;
      this.logger.info('Processing overdue items...');

      const now = new Date();

      // Find overdue follow-ups
      const overdueFollowups = await Followup.findAll({
        where: {
          scheduledFor: { [Op.lt]: now },
          status: { [Op.notIn]: ['completed', 'cancelled'] }
        },
        include: [
          { model: User, as: 'assignedUser' }
        ]
      });

      // Find overdue tasks
      const overdueTasks = await Task.findAll({
        where: {
          dueDate: { [Op.lt]: now },
          status: { [Op.notIn]: ['completed', 'cancelled'] },
          lastReminderSent: {
            [Op.or]: [
              null,
              { [Op.lt]: moment().subtract(4, 'hours').toDate() }
            ]
          }
        },
        include: [
          { model: User, as: 'assignedUser' }
        ]
      });

      // Update overdue follow-ups status
      let overdueFollowupCount = 0;
      for (const followup of overdueFollowups) {
        try {
          if (followup.status !== 'overdue') {
            await followup.update({ status: 'overdue' });
          }
          await notificationService.sendFollowupReminder(followup, 'overdue');
          overdueFollowupCount++;
        } catch (error) {
          this.logger.error(`Error processing overdue followup ${followup.id}:`, error);
        }
      }

      // Send overdue task notifications
      let overdueTaskCount = 0;
      for (const task of overdueTasks) {
        try {
          await notificationService.sendTaskReminder(task, 'overdue');
          overdueTaskCount++;
        } catch (error) {
          this.logger.error(`Error processing overdue task ${task.id}:`, error);
        }
      }

      this.logger.info(`Processed ${overdueFollowupCount} overdue follow-ups and ${overdueTaskCount} overdue tasks`);

    } catch (error) {
      this.logger.error('Error processing overdue items:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send daily digest emails to users
   */
  async sendDailyDigests() {
    try {
      this.isRunning = true;
      this.logger.info('Sending daily digest emails...');

      // Get all active users
      const users = await User.findAll({
        where: {
          isActive: true,
          emailNotifications: true // Assume this field exists
        },
        attributes: ['id', 'email', 'name', 'notificationPreferences']
      });

      let digestCount = 0;
      for (const user of users) {
        try {
          // Check if user wants daily digests
          if (user.notificationPreferences?.dailyDigest !== false) {
            await notificationService.sendDailyDigest(user.id);
            digestCount++;
          }
        } catch (error) {
          this.logger.error(`Error sending daily digest to user ${user.id}:`, error);
        }
      }

      this.logger.info(`Sent ${digestCount} daily digest emails`);

    } catch (error) {
      this.logger.error('Error sending daily digests:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up old processed reminders
   */
  async cleanupOldReminders() {
    try {
      this.isRunning = true;
      this.logger.info('Cleaning up old reminders...');

      const cutoffDate = moment().subtract(30, 'days').toDate();

      // Update old follow-ups that have reminder sent but are still pending
      const oldFollowups = await Followup.update(
        { reminderSent: false },
        {
          where: {
            reminderSent: true,
            reminderSentAt: { [Op.lt]: cutoffDate },
            status: { [Op.notIn]: ['completed', 'cancelled'] }
          }
        }
      );

      this.logger.info(`Reset reminder status for ${oldFollowups[0]} old follow-ups`);

      // Clean up any temporary reminder data
      // This could include cleaning up scheduled notification queue entries
      
    } catch (error) {
      this.logger.error('Error cleaning up old reminders:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process follow-up escalations
   */
  async processFollowupEscalations() {
    try {
      this.isRunning = true;
      this.logger.info('Processing follow-up escalations...');

      const now = new Date();

      // Find follow-ups that should be escalated
      // This could be based on business rules like:
      // - High priority items overdue by more than 2 hours
      // - Medium priority items overdue by more than 24 hours
      // - Multiple reschedules
      const escalationCandidates = await Followup.findAll({
        where: {
          [Op.or]: [
            // High priority overdue by 2+ hours
            {
              priority: 'high',
              scheduledFor: { [Op.lt]: moment().subtract(2, 'hours').toDate() },
              status: { [Op.notIn]: ['completed', 'cancelled'] }
            },
            // Medium priority overdue by 24+ hours
            {
              priority: 'medium',
              scheduledFor: { [Op.lt]: moment().subtract(24, 'hours').toDate() },
              status: { [Op.notIn]: ['completed', 'cancelled'] }
            },
            // Multiple reschedules (3+)
            {
              rescheduleCount: { [Op.gte]: 3 },
              status: { [Op.notIn]: ['completed', 'cancelled'] }
            }
          ]
        },
        include: [
          { model: User, as: 'assignedUser' }
        ]
      });

      let escalationCount = 0;
      for (const followup of escalationCandidates) {
        try {
          // Logic to determine escalation target
          // This could be manager, team lead, or based on escalation rules
          const escalationTarget = await this.determineEscalationTarget(followup);
          
          if (escalationTarget) {
            // Send escalation notification
            await notificationService.sendFollowupEscalation({
              followup,
              escalatedTo: escalationTarget.id,
              reason: this.generateEscalationReason(followup)
            });
            
            escalationCount++;
          }
        } catch (error) {
          this.logger.error(`Error escalating followup ${followup.id}:`, error);
        }
      }

      this.logger.info(`Processed ${escalationCount} follow-up escalations`);

    } catch (error) {
      this.logger.error('Error processing follow-up escalations:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Determine escalation target for a follow-up
   */
  async determineEscalationTarget(followup) {
    try {
      // Simple escalation logic - in a real system this would be more sophisticated
      // Could involve organization hierarchy, team structures, etc.
      
      const user = followup.assignedUser;
      if (!user) return null;

      // Find user's manager or team lead
      const manager = await User.findOne({
        where: {
          // Assuming we have some relationship or field to identify managers
          id: user.managerId || user.teamLeadId
        }
      });

      return manager;

    } catch (error) {
      this.logger.error('Error determining escalation target:', error);
      return null;
    }
  }

  /**
   * Generate escalation reason message
   */
  generateEscalationReason(followup) {
    const reasons = [];

    if (followup.priority === 'high' && followup.isOverdue()) {
      reasons.push('High priority follow-up is overdue');
    }

    if (followup.rescheduleCount >= 3) {
      reasons.push(`Follow-up has been rescheduled ${followup.rescheduleCount} times`);
    }

    const hoursPastDue = moment().diff(moment(followup.scheduledFor), 'hours');
    if (hoursPastDue > 24) {
      reasons.push(`Follow-up is ${Math.round(hoursPastDue)} hours overdue`);
    }

    return reasons.join('; ') || 'Automatic escalation based on business rules';
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      totalJobs: this.jobs.length,
      activeJobs: this.jobs.filter(job => job.running).length,
      jobs: this.jobs.map(job => ({
        name: job.options?.name || 'unnamed',
        running: job.running || false,
        scheduled: job.scheduled || false
      }))
    };
  }

  /**
   * Manual trigger for testing
   */
  async runManually(jobType) {
    try {
      this.logger.info(`Manually running job: ${jobType}`);

      switch (jobType) {
        case 'immediate-reminders':
          await this.processImmediateReminders();
          break;
        case 'overdue-items':
          await this.processOverdueItems();
          break;
        case 'daily-digests':
          await this.sendDailyDigests();
          break;
        case 'cleanup':
          await this.cleanupOldReminders();
          break;
        case 'escalations':
          await this.processFollowupEscalations();
          break;
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }

      this.logger.info(`Manual job completed: ${jobType}`);
      return { success: true, jobType };

    } catch (error) {
      this.logger.error(`Error running manual job ${jobType}:`, error);
      throw error;
    }
  }
}

module.exports = new ReminderProcessorJob();