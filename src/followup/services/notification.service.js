const { User, Followup, Task } = require('../models');
const moment = require('moment');
const EventEmitter = require('events');

/**
 * Notification Service
 * Handles email, push, desktop, and SMS notifications for follow-ups and tasks
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.logger = require('../../utils/logger');
    this.emailService = require('../../services/email.service');
    this.pushService = require('../../services/push.service');
    this.smsService = require('../../services/sms.service');
    this.scheduledNotifications = new Map();
    this.notificationQueue = [];
    
    // Start notification processor
    this.startNotificationProcessor();
  }

  /**
   * Send follow-up reminder
   */
  async sendFollowupReminder(followup, reminderType = 'upcoming') {
    try {
      const user = await User.findByPk(followup.userId);
      if (!user) {
        throw new Error(`User ${followup.userId} not found`);
      }

      const preferences = followup.notificationPreferences;
      const messages = this.generateFollowupMessages(followup, reminderType);

      const notifications = [];

      // Email notification
      if (preferences.email && this.emailService) {
        const emailResult = await this.emailService.send({
          to: user.email,
          subject: messages.email.subject,
          html: messages.email.html,
          text: messages.email.text,
          template: 'followup-reminder',
          data: {
            user: user.toJSON(),
            followup: followup.toJSON(),
            reminderType,
            formattedDate: moment(followup.scheduledFor).format('LLLL')
          }
        });

        notifications.push({ type: 'email', success: emailResult.success });
      }

      // Push notification
      if (preferences.push && this.pushService) {
        const pushResult = await this.pushService.sendToUser(user.id, {
          title: messages.push.title,
          body: messages.push.body,
          data: {
            type: 'followup_reminder',
            followupId: followup.id,
            reminderType
          },
          actions: [
            { action: 'view', title: 'View Follow-up' },
            { action: 'reschedule', title: 'Reschedule' },
            { action: 'complete', title: 'Mark Complete' }
          ]
        });

        notifications.push({ type: 'push', success: pushResult.success });
      }

      // Desktop notification
      if (preferences.desktop) {
        // Desktop notifications are typically handled by the client
        // Store for WebSocket broadcast
        this.emit('desktopNotification', {
          userId: user.id,
          notification: {
            title: messages.desktop.title,
            body: messages.desktop.body,
            icon: '/images/followup-icon.png',
            data: {
              type: 'followup_reminder',
              followupId: followup.id,
              reminderType
            }
          }
        });

        notifications.push({ type: 'desktop', success: true });
      }

      // SMS notification
      if (preferences.sms && user.phone && this.smsService) {
        const smsResult = await this.smsService.send({
          to: user.phone,
          message: messages.sms.text
        });

        notifications.push({ type: 'sms', success: smsResult.success });
      }

      // Update followup reminder status
      await followup.update({
        reminderSent: true,
        reminderSentAt: new Date()
      });

      this.logger.info(`Sent followup reminder for ${followup.id} to user ${user.id}`);

      return {
        success: true,
        notifications,
        followupId: followup.id,
        userId: user.id
      };

    } catch (error) {
      this.logger.error(`Error sending followup reminder for ${followup.id}:`, error);
      throw error;
    }
  }

  /**
   * Send task reminder
   */
  async sendTaskReminder(task, reminderType = 'upcoming') {
    try {
      const user = await User.findByPk(task.assignedTo);
      if (!user) {
        throw new Error(`User ${task.assignedTo} not found`);
      }

      const preferences = task.reminderSettings;
      const messages = this.generateTaskMessages(task, reminderType);

      const notifications = [];

      // Email notification
      if (preferences.methods.includes('email') && this.emailService) {
        const emailResult = await this.emailService.send({
          to: user.email,
          subject: messages.email.subject,
          html: messages.email.html,
          text: messages.email.text,
          template: 'task-reminder',
          data: {
            user: user.toJSON(),
            task: task.toJSON(),
            reminderType,
            formattedDueDate: task.dueDate ? moment(task.dueDate).format('LLLL') : 'No due date'
          }
        });

        notifications.push({ type: 'email', success: emailResult.success });
      }

      // Push notification
      if (preferences.methods.includes('push') && this.pushService) {
        const pushResult = await this.pushService.sendToUser(user.id, {
          title: messages.push.title,
          body: messages.push.body,
          data: {
            type: 'task_reminder',
            taskId: task.id,
            reminderType
          },
          actions: [
            { action: 'view', title: 'View Task' },
            { action: 'start', title: 'Start Task' },
            { action: 'complete', title: 'Mark Complete' }
          ]
        });

        notifications.push({ type: 'push', success: pushResult.success });
      }

      // Desktop notification
      if (preferences.methods.includes('desktop')) {
        this.emit('desktopNotification', {
          userId: user.id,
          notification: {
            title: messages.desktop.title,
            body: messages.desktop.body,
            icon: '/images/task-icon.png',
            data: {
              type: 'task_reminder',
              taskId: task.id,
              reminderType
            }
          }
        });

        notifications.push({ type: 'desktop', success: true });
      }

      // SMS notification
      if (preferences.methods.includes('sms') && user.phone && this.smsService) {
        const smsResult = await this.smsService.send({
          to: user.phone,
          message: messages.sms.text
        });

        notifications.push({ type: 'sms', success: smsResult.success });
      }

      // Update task reminder status
      task.lastReminderSent = new Date();
      await task.save();

      this.logger.info(`Sent task reminder for ${task.id} to user ${user.id}`);

      return {
        success: true,
        notifications,
        taskId: task.id,
        userId: user.id
      };

    } catch (error) {
      this.logger.error(`Error sending task reminder for ${task.id}:`, error);
      throw error;
    }
  }

  /**
   * Generate followup notification messages
   */
  generateFollowupMessages(followup, reminderType) {
    const lead = followup.lead;
    const leadName = lead?.name || 'Unknown Lead';
    const leadCompany = lead?.company || 'Unknown Company';
    const formattedDate = moment(followup.scheduledFor).format('MMM D, YYYY [at] h:mm A');
    const timeUntil = moment(followup.scheduledFor).fromNow();

    const messages = {
      email: {},
      push: {},
      desktop: {},
      sms: {}
    };

    switch (reminderType) {
      case 'upcoming':
        messages.email = {
          subject: `Follow-up Reminder: ${followup.title}`,
          html: this.generateFollowupEmailHTML(followup, reminderType),
          text: `Reminder: You have a follow-up "${followup.title}" with ${leadName} from ${leadCompany} scheduled for ${formattedDate} (${timeUntil}). Click here to view details or reschedule.`
        };

        messages.push = {
          title: 'Follow-up Reminder',
          body: `${followup.title} with ${leadName} ${timeUntil}`
        };

        messages.desktop = {
          title: 'Follow-up Reminder',
          body: `${followup.title} with ${leadName} scheduled for ${formattedDate}`
        };

        messages.sms = {
          text: `Reminder: Follow-up "${followup.title}" with ${leadName} ${timeUntil}. Reply DONE when complete.`
        };
        break;

      case 'overdue':
        messages.email = {
          subject: `⚠️ Overdue Follow-up: ${followup.title}`,
          html: this.generateFollowupEmailHTML(followup, reminderType),
          text: `OVERDUE: Your follow-up "${followup.title}" with ${leadName} from ${leadCompany} was scheduled for ${formattedDate} and is now overdue. Please complete or reschedule immediately.`
        };

        messages.push = {
          title: '⚠️ Overdue Follow-up',
          body: `${followup.title} with ${leadName} is overdue!`
        };

        messages.desktop = {
          title: '⚠️ Overdue Follow-up',
          body: `${followup.title} with ${leadName} was due ${timeUntil}`
        };

        messages.sms = {
          text: `OVERDUE: Follow-up "${followup.title}" with ${leadName} was due ${timeUntil}. Please complete ASAP.`
        };
        break;

      case 'daily_digest':
        // Handle in bulk digest method
        break;

      default:
        messages.email = {
          subject: `Follow-up Notification: ${followup.title}`,
          html: this.generateFollowupEmailHTML(followup, reminderType),
          text: `Follow-up notification: ${followup.title} with ${leadName} from ${leadCompany}.`
        };
    }

    return messages;
  }

  /**
   * Generate task notification messages
   */
  generateTaskMessages(task, reminderType) {
    const formattedDueDate = task.dueDate ? moment(task.dueDate).format('MMM D, YYYY [at] h:mm A') : 'No due date';
    const timeUntilDue = task.dueDate ? moment(task.dueDate).fromNow() : '';
    const priorityEmoji = {
      'urgent': '🚨',
      'high': '🔴',
      'medium': '🟡',
      'low': '🟢'
    }[task.priority] || '⚪';

    const messages = {
      email: {},
      push: {},
      desktop: {},
      sms: {}
    };

    switch (reminderType) {
      case 'upcoming':
        messages.email = {
          subject: `${priorityEmoji} Task Reminder: ${task.title}`,
          html: this.generateTaskEmailHTML(task, reminderType),
          text: `Reminder: You have a ${task.priority} priority task "${task.title}" due ${timeUntilDue} (${formattedDueDate}). Estimated time: ${task.estimatedDuration || 30} minutes.`
        };

        messages.push = {
          title: `${priorityEmoji} Task Reminder`,
          body: `${task.title} due ${timeUntilDue}`
        };

        messages.desktop = {
          title: `${priorityEmoji} Task Reminder`,
          body: `${task.title} is due ${formattedDueDate}`
        };

        messages.sms = {
          text: `Task reminder: "${task.title}" due ${timeUntilDue}. Priority: ${task.priority.toUpperCase()}`
        };
        break;

      case 'overdue':
        messages.email = {
          subject: `🚨 OVERDUE Task: ${task.title}`,
          html: this.generateTaskEmailHTML(task, reminderType),
          text: `URGENT: Your task "${task.title}" was due ${timeUntilDue} and is now overdue. Please complete or update the status immediately.`
        };

        messages.push = {
          title: '🚨 Overdue Task',
          body: `${task.title} is overdue!`
        };

        messages.desktop = {
          title: '🚨 Overdue Task',
          body: `${task.title} was due ${timeUntilDue}`
        };

        messages.sms = {
          text: `OVERDUE: Task "${task.title}" was due ${timeUntilDue}. Please complete ASAP.`
        };
        break;

      case 'assigned':
        messages.email = {
          subject: `📋 New Task Assigned: ${task.title}`,
          html: this.generateTaskEmailHTML(task, reminderType),
          text: `You have been assigned a new ${task.priority} priority task: "${task.title}". Due: ${formattedDueDate}. Estimated time: ${task.estimatedDuration || 30} minutes.`
        };

        messages.push = {
          title: '📋 New Task Assigned',
          body: `${task.title} (${task.priority} priority)`
        };

        messages.desktop = {
          title: '📋 New Task Assigned',
          body: `${task.title} - Due ${formattedDueDate}`
        };

        messages.sms = {
          text: `New task assigned: "${task.title}" - ${task.priority} priority, due ${timeUntilDue}`
        };
        break;

      default:
        messages.email = {
          subject: `Task Notification: ${task.title}`,
          html: this.generateTaskEmailHTML(task, reminderType),
          text: `Task notification: ${task.title}`
        };
    }

    return messages;
  }

  /**
   * Generate followup email HTML
   */
  generateFollowupEmailHTML(followup, reminderType) {
    const lead = followup.lead;
    const leadName = lead?.name || 'Unknown Lead';
    const leadCompany = lead?.company || 'Unknown Company';
    const formattedDate = moment(followup.scheduledFor).format('LLLL');
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #333; margin: 0;">Follow-up Reminder</h2>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef;">
          <h3 style="color: #495057; margin-top: 0;">${followup.title}</h3>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Lead:</strong> ${leadName}</p>
            <p style="margin: 5px 0;"><strong>Company:</strong> ${leadCompany}</p>
            <p style="margin: 5px 0;"><strong>Scheduled:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> ${followup.type}</p>
            <p style="margin: 5px 0;"><strong>Priority:</strong> ${followup.priority}</p>
          </div>
          
          ${followup.description ? `<p style="color: #6c757d;">${followup.description}</p>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="/followups/${followup.id}" 
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">
              View Follow-up
            </a>
            <a href="/followups/${followup.id}/reschedule" 
               style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">
              Reschedule
            </a>
            <a href="/followups/${followup.id}/complete" 
               style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">
              Mark Complete
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; color: #6c757d; font-size: 12px;">
          This is an automated reminder from your ColdCaller CRM system.
        </div>
      </div>
    `;
  }

  /**
   * Generate task email HTML
   */
  generateTaskEmailHTML(task, reminderType) {
    const formattedDueDate = task.dueDate ? moment(task.dueDate).format('LLLL') : 'No due date set';
    const priorityColor = {
      'urgent': '#dc3545',
      'high': '#fd7e14',
      'medium': '#ffc107',
      'low': '#28a745'
    }[task.priority] || '#6c757d';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${priorityColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Task ${reminderType === 'assigned' ? 'Assignment' : 'Reminder'}</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${task.priority.toUpperCase()} Priority</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef;">
          <h3 style="color: #495057; margin-top: 0;">${task.title}</h3>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Type:</strong> ${task.type}</p>
            <p style="margin: 5px 0;"><strong>Priority:</strong> ${task.priority}</p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${formattedDueDate}</p>
            <p style="margin: 5px 0;"><strong>Estimated Time:</strong> ${task.estimatedDuration || 30} minutes</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${task.status}</p>
          </div>
          
          ${task.description ? `<p style="color: #6c757d;">${task.description}</p>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="/tasks/${task.id}" 
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">
              View Task
            </a>
            ${task.status === 'pending' ? 
              `<a href="/tasks/${task.id}/start" 
                 style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">
                Start Task
               </a>` : ''}
            <a href="/tasks/${task.id}/complete" 
               style="background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 5px;">
              Mark Complete
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; color: #6c757d; font-size: 12px;">
          This is an automated notification from your ColdCaller CRM system.
        </div>
      </div>
    `;
  }

  /**
   * Schedule reminder
   */
  async scheduleReminder(reminderData) {
    try {
      const reminderId = `${reminderData.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const scheduledReminder = {
        id: reminderId,
        ...reminderData,
        createdAt: new Date()
      };

      this.scheduledNotifications.set(reminderId, scheduledReminder);

      // Calculate delay until notification should be sent
      const delay = new Date(reminderData.scheduledFor).getTime() - Date.now();

      if (delay > 0) {
        setTimeout(async () => {
          try {
            await this.processScheduledReminder(reminderId);
          } catch (error) {
            this.logger.error(`Error processing scheduled reminder ${reminderId}:`, error);
          }
        }, delay);

        this.logger.info(`Scheduled reminder ${reminderId} for ${reminderData.scheduledFor}`);
      } else {
        // Past due, process immediately
        await this.processScheduledReminder(reminderId);
      }

      return reminderId;

    } catch (error) {
      this.logger.error('Error scheduling reminder:', error);
      throw error;
    }
  }

  /**
   * Process scheduled reminder
   */
  async processScheduledReminder(reminderId) {
    try {
      const reminder = this.scheduledNotifications.get(reminderId);
      
      if (!reminder) {
        this.logger.warn(`Scheduled reminder ${reminderId} not found`);
        return;
      }

      if (reminder.followupId) {
        const followup = await Followup.findByPk(reminder.followupId);
        if (followup) {
          await this.sendFollowupReminder(followup, 'upcoming');
        }
      } else if (reminder.taskId) {
        const task = await Task.findByPk(reminder.taskId);
        if (task) {
          await this.sendTaskReminder(task, 'upcoming');
        }
      }

      // Remove processed reminder
      this.scheduledNotifications.delete(reminderId);

      this.logger.info(`Processed scheduled reminder ${reminderId}`);

    } catch (error) {
      this.logger.error(`Error processing scheduled reminder ${reminderId}:`, error);
    }
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigest(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) return;

      const tomorrow = moment().add(1, 'day').startOf('day');
      const weekFromNow = moment().add(7, 'days').endOf('day');

      // Get upcoming followups and tasks
      const [upcomingFollowups, upcomingTasks, overdueTasks] = await Promise.all([
        Followup.findAll({
          where: {
            userId: userId,
            scheduledFor: {
              [Op.between]: [tomorrow.toDate(), weekFromNow.toDate()]
            },
            status: { [Op.notIn]: ['completed', 'cancelled'] }
          },
          include: [{ model: Lead, as: 'lead' }],
          order: [['scheduledFor', 'ASC']],
          limit: 10
        }),
        Task.findAll({
          where: {
            assignedTo: userId,
            dueDate: {
              [Op.between]: [tomorrow.toDate(), weekFromNow.toDate()]
            },
            status: { [Op.notIn]: ['completed', 'cancelled'] }
          },
          order: [['dueDate', 'ASC']],
          limit: 10
        }),
        Task.getOverdueTasks(userId)
      ]);

      if (upcomingFollowups.length === 0 && upcomingTasks.length === 0 && overdueTasks.length === 0) {
        return; // No digest needed
      }

      const emailResult = await this.emailService.send({
        to: user.email,
        subject: `Daily Digest - ${upcomingFollowups.length + upcomingTasks.length} upcoming items`,
        html: this.generateDailyDigestHTML(user, upcomingFollowups, upcomingTasks, overdueTasks),
        template: 'daily-digest',
        data: {
          user: user.toJSON(),
          upcomingFollowups: upcomingFollowups.map(f => f.toJSON()),
          upcomingTasks: upcomingTasks.map(t => t.toJSON()),
          overdueTasks: overdueTasks.map(t => t.toJSON())
        }
      });

      this.logger.info(`Sent daily digest to user ${userId}`);

      return emailResult;

    } catch (error) {
      this.logger.error(`Error sending daily digest to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Generate daily digest email HTML
   */
  generateDailyDigestHTML(user, followups, tasks, overdueTasks) {
    const today = moment().format('MMMM D, YYYY');
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Daily Digest</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${today}</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef;">
          <h3 style="color: #495057; margin-top: 0;">Hello ${user.name},</h3>
          <p>Here's your activity summary for the upcoming week:</p>
          
          ${overdueTasks.length > 0 ? `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="color: #721c24; margin-top: 0;">🚨 Overdue Tasks (${overdueTasks.length})</h4>
              ${overdueTasks.slice(0, 5).map(task => `
                <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
                  <strong>${task.title}</strong><br>
                  <small style="color: #6c757d;">Due: ${task.dueDate ? moment(task.dueDate).format('MMM D, YYYY') : 'No due date'}</small>
                </div>
              `).join('')}
              ${overdueTasks.length > 5 ? `<p><em>...and ${overdueTasks.length - 5} more</em></p>` : ''}
            </div>
          ` : ''}
          
          ${followups.length > 0 ? `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="color: #155724; margin-top: 0;">📞 Upcoming Follow-ups (${followups.length})</h4>
              ${followups.slice(0, 5).map(followup => `
                <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
                  <strong>${followup.title}</strong><br>
                  <small style="color: #6c757d;">${followup.lead?.name || 'Unknown'} - ${moment(followup.scheduledFor).format('MMM D, YYYY [at] h:mm A')}</small>
                </div>
              `).join('')}
              ${followups.length > 5 ? `<p><em>...and ${followups.length - 5} more</em></p>` : ''}
            </div>
          ` : ''}
          
          ${tasks.length > 0 ? `
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h4 style="color: #0c5460; margin-top: 0;">📋 Upcoming Tasks (${tasks.length})</h4>
              ${tasks.slice(0, 5).map(task => `
                <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
                  <strong>${task.title}</strong><br>
                  <small style="color: #6c757d;">${task.priority} priority - Due: ${task.dueDate ? moment(task.dueDate).format('MMM D, YYYY') : 'No due date'}</small>
                </div>
              `).join('')}
              ${tasks.length > 5 ? `<p><em>...and ${tasks.length - 5} more</em></p>` : ''}
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="/dashboard" 
               style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; color: #6c757d; font-size: 12px;">
          To unsubscribe from daily digests, <a href="/notifications/unsubscribe?type=daily_digest" style="color: #6c757d;">click here</a>.
        </div>
      </div>
    `;
  }

  /**
   * Start notification processor
   */
  startNotificationProcessor() {
    // Process notification queue every 30 seconds
    setInterval(async () => {
      if (this.notificationQueue.length > 0) {
        const batch = this.notificationQueue.splice(0, 50); // Process up to 50 at a time
        
        for (const notification of batch) {
          try {
            await this.processQueuedNotification(notification);
          } catch (error) {
            this.logger.error('Error processing queued notification:', error);
          }
        }
      }
    }, 30000);

    // Check for overdue followups and tasks every hour
    setInterval(async () => {
      try {
        await this.checkForOverdueItems();
      } catch (error) {
        this.logger.error('Error checking for overdue items:', error);
      }
    }, 3600000); // 1 hour
  }

  /**
   * Process queued notification
   */
  async processQueuedNotification(notification) {
    // Implementation depends on notification type
    // This would process items added to the notification queue
  }

  /**
   * Check for overdue items and send notifications
   */
  async checkForOverdueItems() {
    try {
      // Find overdue followups
      const overdueFollowups = await Followup.findAll({
        where: {
          scheduledFor: { [Op.lt]: new Date() },
          status: { [Op.notIn]: ['completed', 'cancelled'] },
          reminderSent: false
        },
        include: [{ model: Lead, as: 'lead' }]
      });

      for (const followup of overdueFollowups) {
        await this.sendFollowupReminder(followup, 'overdue');
      }

      // Find overdue tasks
      const overdueTasks = await Task.findAll({
        where: {
          dueDate: { [Op.lt]: new Date() },
          status: { [Op.notIn]: ['completed', 'cancelled'] },
          lastReminderSent: {
            [Op.or]: [
              null,
              { [Op.lt]: moment().subtract(4, 'hours').toDate() } // Don't spam - max once per 4 hours
            ]
          }
        }
      });

      for (const task of overdueTasks) {
        await this.sendTaskReminder(task, 'overdue');
      }

      this.logger.info(`Processed ${overdueFollowups.length} overdue followups and ${overdueTasks.length} overdue tasks`);

    } catch (error) {
      this.logger.error('Error checking for overdue items:', error);
    }
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignment({ task, assignedUserId, assignedBy }) {
    try {
      await this.sendTaskReminder(task, 'assigned');
      this.logger.info(`Sent task assignment notification for task ${task.id} to user ${assignedUserId}`);
    } catch (error) {
      this.logger.error(`Error sending task assignment notification:`, error);
    }
  }

  /**
   * Send task escalation notification
   */
  async sendTaskEscalation({ task, escalatedTo, escalatedBy, reason }) {
    try {
      const user = await User.findByPk(escalatedTo);
      if (!user) return;

      const escalatedByUser = await User.findByPk(escalatedBy);

      await this.emailService.send({
        to: user.email,
        subject: `🚨 Task Escalated: ${task.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">Task Escalation</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e9ecef;">
              <p>A task has been escalated to you by ${escalatedByUser?.name || 'Unknown User'}.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0;">${task.title}</h4>
                <p><strong>Escalated by:</strong> ${escalatedByUser?.name || 'Unknown User'}</p>
                <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
                <p><strong>Original assignee:</strong> ${task.assignedUser?.name || 'Unknown'}</p>
                <p><strong>Due date:</strong> ${task.dueDate ? moment(task.dueDate).format('LLLL') : 'No due date'}</p>
              </div>
              
              ${task.description ? `<p>${task.description}</p>` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="/tasks/${task.id}" 
                   style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  Review Task
                </a>
              </div>
            </div>
          </div>
        `,
        template: 'task-escalation',
        data: {
          task: task.toJSON(),
          escalatedToUser: user.toJSON(),
          escalatedByUser: escalatedByUser?.toJSON(),
          reason
        }
      });

      this.logger.info(`Sent task escalation notification for task ${task.id} to user ${escalatedTo}`);

    } catch (error) {
      this.logger.error('Error sending task escalation notification:', error);
    }
  }
}

module.exports = new NotificationService();