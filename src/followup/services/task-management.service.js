const { Task, User, Lead, Call, Followup } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const EventEmitter = require('events');

/**
 * Task Management Service
 * Handles task creation, assignment, and lifecycle management
 */
class TaskManagementService extends EventEmitter {
  constructor() {
    super();
    this.logger = require('../../utils/logger');
    this.notificationService = require('./notification.service');
    this.priorityQueue = new Map(); // Priority-based task queuing
  }

  /**
   * Create task from call outcome
   */
  async createTaskFromCall(callId, outcome, userId, taskData = {}) {
    try {
      this.logger.info(`Creating task from call ${callId} with outcome ${outcome}`);

      const call = await Call.findByPk(callId, {
        include: [{ model: Lead, as: 'lead' }]
      });

      if (!call) {
        throw new Error(`Call ${callId} not found`);
      }

      // Generate task based on outcome
      const generatedTask = this.generateTaskFromOutcome(outcome, call, taskData);

      const task = await Task.create({
        leadId: call.leadId,
        callId: callId,
        assignedTo: userId,
        createdBy: userId,
        ...generatedTask,
        ...taskData
      });

      // Add to priority queue
      this.addToPriorityQueue(task);

      // Schedule reminders
      await this.scheduleTaskReminders(task);

      this.emit('taskCreated', { task, call, outcome });

      this.logger.info(`Created task ${task.id} from call outcome`);

      return task;

    } catch (error) {
      this.logger.error('Error creating task from call:', error);
      throw error;
    }
  }

  /**
   * Generate task details based on call outcome
   */
  generateTaskFromOutcome(outcome, call, customData = {}) {
    const lead = call.lead;
    
    const taskTemplates = {
      'no_answer': {
        title: `Follow-up call - No answer from ${lead?.name || 'prospect'}`,
        description: `Attempted call to ${lead?.name || 'prospect'} at ${lead?.company || 'Unknown Company'} but received no answer. Follow up with another call attempt.`,
        type: 'call',
        priority: 'medium',
        dueDate: moment().add(1, 'day').toDate(),
        estimatedDuration: 15
      },
      'voicemail': {
        title: `Follow-up call - Left voicemail for ${lead?.name || 'prospect'}`,
        description: `Left voicemail for ${lead?.name || 'prospect'} at ${lead?.company || 'Unknown Company'}. Follow up with another call or email.`,
        type: 'call',
        priority: 'medium',
        dueDate: moment().add(2, 'days').toDate(),
        estimatedDuration: 15
      },
      'callback_requested': {
        title: `Return callback to ${lead?.name || 'prospect'}`,
        description: `${lead?.name || 'Prospect'} requested a callback. Contact them as soon as possible.`,
        type: 'call',
        priority: 'high',
        dueDate: moment().add(4, 'hours').toDate(),
        estimatedDuration: 20
      },
      'follow_up_scheduled': {
        title: `Prepare for scheduled follow-up with ${lead?.name || 'prospect'}`,
        description: `Prepare materials and notes for scheduled follow-up call with ${lead?.name || 'prospect'} at ${lead?.company || 'Unknown Company'}.`,
        type: 'preparation',
        priority: 'medium',
        dueDate: moment().add(1, 'week').toDate(),
        estimatedDuration: 30
      },
      'meeting_scheduled': {
        title: `Prepare for meeting with ${lead?.name || 'prospect'}`,
        description: `Prepare agenda, materials, and research for upcoming meeting with ${lead?.name || 'prospect'}.`,
        type: 'preparation',
        priority: 'high',
        dueDate: moment().add(2, 'hours').toDate(),
        estimatedDuration: 45
      },
      'demo_scheduled': {
        title: `Prepare product demo for ${lead?.name || 'prospect'}`,
        description: `Prepare customized product demo based on ${lead?.name || 'prospect'}'s requirements and pain points.`,
        type: 'preparation',
        priority: 'high',
        dueDate: moment().add(4, 'hours').toDate(),
        estimatedDuration: 60
      },
      'proposal_requested': {
        title: `Create proposal for ${lead?.name || 'prospect'}`,
        description: `Develop detailed proposal for ${lead?.name || 'prospect'} based on discussed requirements.`,
        type: 'proposal',
        priority: 'high',
        dueDate: moment().add(1, 'day').toDate(),
        estimatedDuration: 120
      },
      'not_interested': {
        title: `Add ${lead?.name || 'prospect'} to nurture sequence`,
        description: `${lead?.name || 'Prospect'} is not currently interested. Add to long-term nurture sequence.`,
        type: 'administrative',
        priority: 'low',
        dueDate: moment().add(3, 'days').toDate(),
        estimatedDuration: 10
      }
    };

    const baseTask = taskTemplates[outcome] || {
      title: `Follow-up task for ${lead?.name || 'prospect'}`,
      description: `Follow-up required based on call outcome: ${outcome}`,
      type: 'other',
      priority: 'medium',
      dueDate: moment().add(1, 'day').toDate(),
      estimatedDuration: 30
    };

    return { ...baseTask, ...customData };
  }

  /**
   * Create task from follow-up
   */
  async createTaskFromFollowup(followupId, taskData = {}) {
    try {
      const followup = await Followup.findByPk(followupId, {
        include: [{ model: Lead, as: 'lead' }]
      });

      if (!followup) {
        throw new Error(`Follow-up ${followupId} not found`);
      }

      const task = await Task.create({
        leadId: followup.leadId,
        followupId: followupId,
        assignedTo: followup.userId,
        createdBy: followup.userId,
        title: taskData.title || `Complete follow-up: ${followup.title}`,
        description: taskData.description || followup.description,
        type: followup.type,
        priority: followup.priority,
        dueDate: followup.scheduledFor,
        ...taskData
      });

      this.addToPriorityQueue(task);
      await this.scheduleTaskReminders(task);

      this.emit('taskCreated', { task, followup });

      return task;

    } catch (error) {
      this.logger.error('Error creating task from follow-up:', error);
      throw error;
    }
  }

  /**
   * Assign task to user
   */
  async assignTask(taskId, userId, assignedBy) {
    try {
      const task = await Task.findByPk(taskId);
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      const oldUserId = task.assignedTo;
      task.assignedTo = userId;
      
      // Add assignment history to metadata
      if (!task.metadata.assignmentHistory) {
        task.metadata.assignmentHistory = [];
      }
      
      task.metadata.assignmentHistory.push({
        previousUser: oldUserId,
        newUser: userId,
        assignedBy: assignedBy,
        assignedAt: new Date()
      });

      await task.save();

      // Update priority queue
      this.addToPriorityQueue(task);

      // Notify assigned user
      if (this.notificationService) {
        await this.notificationService.sendTaskAssignment({
          task,
          assignedUserId: userId,
          assignedBy
        });
      }

      this.emit('taskAssigned', { task, oldUserId, newUserId: userId, assignedBy });

      return task;

    } catch (error) {
      this.logger.error(`Error assigning task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update task priority
   */
  async updateTaskPriority(taskId, priority, userId) {
    try {
      const task = await Task.findByPk(taskId);
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      const oldPriority = task.priority;
      task.priority = priority;
      
      // Add priority change to metadata
      if (!task.metadata.priorityHistory) {
        task.metadata.priorityHistory = [];
      }
      
      task.metadata.priorityHistory.push({
        previousPriority: oldPriority,
        newPriority: priority,
        changedBy: userId,
        changedAt: new Date()
      });

      await task.save();

      // Update priority queue
      this.addToPriorityQueue(task);

      this.emit('taskPriorityChanged', { task, oldPriority, newPriority: priority, userId });

      return task;

    } catch (error) {
      this.logger.error(`Error updating task priority ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Add task to priority queue
   */
  addToPriorityQueue(task) {
    const priorityScores = {
      'urgent': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };

    const priorityScore = priorityScores[task.priority] || 2;
    const dueScore = task.dueDate ? this.calculateDueScore(task.dueDate) : 0;
    const totalScore = priorityScore * 10 + dueScore;

    if (!this.priorityQueue.has(task.assignedTo)) {
      this.priorityQueue.set(task.assignedTo, new Map());
    }

    this.priorityQueue.get(task.assignedTo).set(task.id, {
      taskId: task.id,
      score: totalScore,
      priority: task.priority,
      dueDate: task.dueDate,
      updatedAt: new Date()
    });
  }

  /**
   * Calculate due date score for priority queue
   */
  calculateDueScore(dueDate) {
    if (!dueDate) return 0;
    
    const now = moment();
    const due = moment(dueDate);
    const hoursUntilDue = due.diff(now, 'hours');
    
    if (hoursUntilDue < 0) return 100; // Overdue
    if (hoursUntilDue <= 4) return 50;  // Due within 4 hours
    if (hoursUntilDue <= 24) return 25; // Due within 24 hours
    if (hoursUntilDue <= 72) return 10; // Due within 3 days
    return 1; // Due later
  }

  /**
   * Get next task for user based on priority queue
   */
  getNextTaskForUser(userId) {
    const userQueue = this.priorityQueue.get(userId);
    
    if (!userQueue || userQueue.size === 0) {
      return null;
    }

    // Find highest scoring task
    let nextTask = null;
    let highestScore = -1;

    for (const [taskId, taskInfo] of userQueue.entries()) {
      if (taskInfo.score > highestScore) {
        highestScore = taskInfo.score;
        nextTask = taskInfo;
      }
    }

    return nextTask;
  }

  /**
   * Start task
   */
  async startTask(taskId, userId) {
    try {
      const task = await Task.findByPk(taskId);
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      if (task.status !== 'pending') {
        throw new Error(`Task ${taskId} is not in pending status`);
      }

      if (!task.canStart()) {
        throw new Error(`Task ${taskId} cannot be started due to blocking dependencies`);
      }

      await task.markInProgress(userId);

      this.emit('taskStarted', { task, userId });

      return task;

    } catch (error) {
      this.logger.error(`Error starting task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Complete task
   */
  async completeTask(taskId, outcome, notes, userId) {
    try {
      const task = await Task.findByPk(taskId);
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      await task.markCompleted(outcome, notes);

      // Remove from priority queue
      const userQueue = this.priorityQueue.get(task.assignedTo);
      if (userQueue) {
        userQueue.delete(taskId);
      }

      // Process any dependent tasks
      await this.processDependentTasks(taskId);

      this.emit('taskCompleted', { task, outcome, notes, userId });

      return task;

    } catch (error) {
      this.logger.error(`Error completing task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Process dependent tasks after task completion
   */
  async processDependentTasks(completedTaskId) {
    try {
      // Find tasks that were blocked by this task
      const dependentTasks = await Task.findAll({
        where: {
          blockedBy: { [Op.contains]: [completedTaskId] }
        }
      });

      for (const task of dependentTasks) {
        // Remove completed task from blocked list
        const updatedBlockedBy = task.blockedBy.filter(id => id !== completedTaskId);
        
        // If no more blocking tasks, make task available
        if (updatedBlockedBy.length === 0) {
          task.blockedBy = [];
          task.status = 'pending';
          await task.save();
          
          // Add to priority queue
          this.addToPriorityQueue(task);
          
          this.emit('taskUnblocked', { task });
        } else {
          task.blockedBy = updatedBlockedBy;
          await task.save();
        }
      }

    } catch (error) {
      this.logger.error(`Error processing dependent tasks for ${completedTaskId}:`, error);
    }
  }

  /**
   * Schedule task reminders
   */
  async scheduleTaskReminders(task) {
    try {
      if (!this.notificationService || !task.reminderSettings.enabled) {
        return;
      }

      const { intervals, methods } = task.reminderSettings;
      
      for (const minutes of intervals) {
        const reminderTime = moment(task.dueDate).subtract(minutes, 'minutes');
        
        if (reminderTime.isAfter()) {
          for (const method of methods) {
            await this.notificationService.scheduleTaskReminder({
              taskId: task.id,
              type: method,
              scheduledFor: reminderTime.toDate(),
              message: `Task reminder: ${task.title} is due ${moment(task.dueDate).format('LLLL')}`
            });
          }
        }
      }

    } catch (error) {
      this.logger.error(`Failed to schedule reminders for task ${task.id}:`, error);
    }
  }

  /**
   * Escalate overdue task
   */
  async escalateTask(taskId, escalateTo, reason, userId) {
    try {
      const task = await Task.findByPk(taskId);
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      await task.escalate(escalateTo, reason);

      // Notify escalated user
      if (this.notificationService) {
        await this.notificationService.sendTaskEscalation({
          task,
          escalatedTo,
          escalatedBy: userId,
          reason
        });
      }

      this.emit('taskEscalated', { task, escalatedTo, reason, userId });

      return task;

    } catch (error) {
      this.logger.error(`Error escalating task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId = null) {
    return await Task.getOverdueTasks(userId);
  }

  /**
   * Get upcoming tasks
   */
  async getUpcomingTasks(userId, days = 7) {
    return await Task.getUpcomingTasks(userId, days);
  }

  /**
   * Get tasks by priority
   */
  async getTasksByPriority(priority, userId = null) {
    return await Task.getTasksByPriority(priority, userId);
  }

  /**
   * Get task statistics for user
   */
  async getTaskStatistics(userId, timeframe = 'week') {
    try {
      const startDate = moment().subtract(1, timeframe);
      
      const [totalTasks, completedTasks, overdueTasks, upcomingTasks] = await Promise.all([
        Task.count({
          where: {
            assignedTo: userId,
            createdAt: { [Op.gte]: startDate.toDate() }
          }
        }),
        Task.count({
          where: {
            assignedTo: userId,
            status: 'completed',
            completedAt: { [Op.gte]: startDate.toDate() }
          }
        }),
        Task.count({
          where: {
            assignedTo: userId,
            dueDate: { [Op.lt]: new Date() },
            status: { [Op.notIn]: ['completed', 'cancelled'] }
          }
        }),
        Task.count({
          where: {
            assignedTo: userId,
            dueDate: {
              [Op.between]: [new Date(), moment().add(7, 'days').toDate()]
            },
            status: { [Op.notIn]: ['completed', 'cancelled'] }
          }
        })
      ]);

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(2) : 0;

      return {
        totalTasks,
        completedTasks,
        overdueTasks,
        upcomingTasks,
        completionRate: parseFloat(completionRate),
        timeframe
      };

    } catch (error) {
      this.logger.error(`Error getting task statistics for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk create tasks
   */
  async bulkCreateTasks(tasksData) {
    const results = [];

    for (const taskData of tasksData) {
      try {
        const task = await Task.create(taskData);
        this.addToPriorityQueue(task);
        await this.scheduleTaskReminders(task);
        results.push({ success: true, task });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message, 
          data: taskData 
        });
      }
    }

    return results;
  }
}

module.exports = new TaskManagementService();