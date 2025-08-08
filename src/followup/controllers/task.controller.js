const { Task, User, Lead, Call, Followup } = require('../models');
const taskManagementService = require('../services/task-management.service');
const { Op } = require('sequelize');
const moment = require('moment');

/**
 * Task Controller
 * Handles HTTP requests for task management
 */
class TaskController {

  /**
   * Get all tasks with filtering and pagination
   */
  async getTasks(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        type,
        category,
        assignedTo,
        createdBy,
        leadId,
        dueDateStart,
        dueDateEnd,
        sortBy = 'dueDate',
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
      
      if (category) {
        where.category = category;
      }
      
      if (assignedTo) {
        where.assignedTo = assignedTo;
      }
      
      if (createdBy) {
        where.createdBy = createdBy;
      }
      
      if (leadId) {
        where.leadId = leadId;
      }

      if (dueDateStart || dueDateEnd) {
        where.dueDate = {};
        if (dueDateStart) where.dueDate[Op.gte] = new Date(dueDateStart);
        if (dueDateEnd) where.dueDate[Op.lte] = new Date(dueDateEnd);
      }

      const { rows: tasks, count: total } = await Task.findAndCountAll({
        where,
        include: [
          { model: Lead, as: 'lead' },
          { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          { model: Call, as: 'call' },
          { model: Followup, as: 'followup' },
          { model: Task, as: 'parentTask', attributes: ['id', 'title'] },
          { model: Task, as: 'subtasks', attributes: ['id', 'title', 'status'] }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true
      });

      // Add computed fields
      const tasksWithComputed = tasks.map(task => {
        const taskData = task.toJSON();
        taskData.isOverdue = task.isOverdue();
        taskData.daysUntilDue = task.getDaysUntilDue();
        taskData.canStart = task.canStart();
        return taskData;
      });

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          tasks: tasksWithComputed,
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
      console.error('Error getting tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tasks',
        details: error.message
      });
    }
  }

  /**
   * Get single task by ID
   */
  async getTask(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findByPk(id, {
        include: [
          { model: Lead, as: 'lead' },
          { model: User, as: 'assignedUser' },
          { model: User, as: 'creator' },
          { model: User, as: 'escalatedToUser' },
          { model: Call, as: 'call' },
          { model: Followup, as: 'followup' },
          { model: Task, as: 'parentTask' },
          { model: Task, as: 'subtasks' }
        ]
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      const taskData = task.toJSON();
      taskData.isOverdue = task.isOverdue();
      taskData.daysUntilDue = task.getDaysUntilDue();
      taskData.canStart = task.canStart();

      res.json({
        success: true,
        data: taskData
      });

    } catch (error) {
      console.error('Error getting task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve task',
        details: error.message
      });
    }
  }

  /**
   * Create new task
   */
  async createTask(req, res) {
    try {
      const {
        title,
        description,
        type = 'other',
        category,
        priority = 'medium',
        assignedTo,
        leadId,
        callId,
        followupId,
        dueDate,
        estimatedDuration,
        parentTaskId,
        tags = [],
        customFields = {},
        reminderSettings
      } = req.body;

      const createdBy = req.user.id;

      // Validate required fields
      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required'
        });
      }

      // Set default assignee to creator if not specified
      const finalAssignedTo = assignedTo || createdBy;

      // Validate assigned user exists
      const assignedUser = await User.findByPk(finalAssignedTo);
      if (!assignedUser) {
        return res.status(404).json({
          success: false,
          error: 'Assigned user not found'
        });
      }

      // Validate lead exists if specified
      if (leadId) {
        const lead = await Lead.findByPk(leadId);
        if (!lead) {
          return res.status(404).json({
            success: false,
            error: 'Lead not found'
          });
        }
      }

      const taskData = {
        title,
        description,
        type,
        category,
        priority,
        assignedTo: finalAssignedTo,
        createdBy,
        leadId,
        callId,
        followupId,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedDuration,
        parentTaskId,
        tags,
        customFields,
        reminderSettings
      };

      const task = await Task.create(taskData);

      // Add to priority queue
      taskManagementService.addToPriorityQueue(task);

      // Schedule reminders
      await taskManagementService.scheduleTaskReminders(task);

      const createdTask = await Task.findByPk(task.id, {
        include: [
          { model: Lead, as: 'lead' },
          { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
        ]
      });

      res.status(201).json({
        success: true,
        data: createdTask,
        message: 'Task created successfully'
      });

    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create task',
        details: error.message
      });
    }
  }

  /**
   * Create task from call outcome
   */
  async createTaskFromCall(req, res) {
    try {
      const { callId, outcome, taskData = {} } = req.body;
      const userId = req.user.id;

      if (!callId || !outcome) {
        return res.status(400).json({
          success: false,
          error: 'Call ID and outcome are required'
        });
      }

      const task = await taskManagementService.createTaskFromCall(
        callId,
        outcome,
        userId,
        taskData
      );

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created from call outcome successfully'
      });

    } catch (error) {
      console.error('Error creating task from call:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create task from call',
        details: error.message
      });
    }
  }

  /**
   * Update task
   */
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const task = await Task.findByPk(id);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Validate status transitions
      if (updates.status && !this.isValidStatusTransition(task.status, updates.status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from ${task.status} to ${updates.status}`
        });
      }

      // Handle priority changes
      if (updates.priority && updates.priority !== task.priority) {
        await taskManagementService.updateTaskPriority(id, updates.priority, req.user.id);
        delete updates.priority; // Remove from updates since it's already handled
      }

      await task.update(updates);

      const updatedTask = await Task.findByPk(id, {
        include: [
          { model: Lead, as: 'lead' },
          { model: User, as: 'assignedUser' },
          { model: User, as: 'creator' },
          { model: Call, as: 'call' },
          { model: Followup, as: 'followup' }
        ]
      });

      res.json({
        success: true,
        data: updatedTask,
        message: 'Task updated successfully'
      });

    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update task',
        details: error.message
      });
    }
  }

  /**
   * Assign task to user
   */
  async assignTask(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const assignedBy = req.user.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const task = await taskManagementService.assignTask(id, userId, assignedBy);

      res.json({
        success: true,
        data: task,
        message: 'Task assigned successfully'
      });

    } catch (error) {
      console.error('Error assigning task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign task',
        details: error.message
      });
    }
  }

  /**
   * Start task
   */
  async startTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = await taskManagementService.startTask(id, userId);

      res.json({
        success: true,
        data: task,
        message: 'Task started successfully'
      });

    } catch (error) {
      console.error('Error starting task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start task',
        details: error.message
      });
    }
  }

  /**
   * Complete task
   */
  async completeTask(req, res) {
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

      const task = await taskManagementService.completeTask(id, outcome, notes, userId);

      res.json({
        success: true,
        data: task,
        message: 'Task completed successfully'
      });

    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete task',
        details: error.message
      });
    }
  }

  /**
   * Escalate task
   */
  async escalateTask(req, res) {
    try {
      const { id } = req.params;
      const { escalateTo, reason } = req.body;
      const userId = req.user.id;

      if (!escalateTo) {
        return res.status(400).json({
          success: false,
          error: 'Escalation target user ID is required'
        });
      }

      const task = await taskManagementService.escalateTask(id, escalateTo, reason, userId);

      res.json({
        success: true,
        data: task,
        message: 'Task escalated successfully'
      });

    } catch (error) {
      console.error('Error escalating task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to escalate task',
        details: error.message
      });
    }
  }

  /**
   * Delete task
   */
  async deleteTask(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findByPk(id);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      await task.destroy();

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete task',
        details: error.message
      });
    }
  }

  /**
   * Get upcoming tasks for user
   */
  async getUpcomingTasks(req, res) {
    try {
      const { days = 7 } = req.query;
      const userId = req.user.id;

      const tasks = await taskManagementService.getUpcomingTasks(userId, parseInt(days));

      // Add computed fields
      const tasksWithComputed = tasks.map(task => {
        const taskData = task.toJSON();
        taskData.isOverdue = task.isOverdue();
        taskData.daysUntilDue = task.getDaysUntilDue();
        return taskData;
      });

      res.json({
        success: true,
        data: tasksWithComputed
      });

    } catch (error) {
      console.error('Error getting upcoming tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve upcoming tasks',
        details: error.message
      });
    }
  }

  /**
   * Get overdue tasks for user
   */
  async getOverdueTasks(req, res) {
    try {
      const userId = req.user.id;

      const tasks = await taskManagementService.getOverdueTasks(userId);

      // Add computed fields
      const tasksWithComputed = tasks.map(task => {
        const taskData = task.toJSON();
        taskData.daysUntilDue = task.getDaysUntilDue();
        return taskData;
      });

      res.json({
        success: true,
        data: tasksWithComputed
      });

    } catch (error) {
      console.error('Error getting overdue tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overdue tasks',
        details: error.message
      });
    }
  }

  /**
   * Get tasks by priority
   */
  async getTasksByPriority(req, res) {
    try {
      const { priority } = req.params;
      const userId = req.user.id;

      const tasks = await taskManagementService.getTasksByPriority(priority, userId);

      // Add computed fields
      const tasksWithComputed = tasks.map(task => {
        const taskData = task.toJSON();
        taskData.isOverdue = task.isOverdue();
        taskData.daysUntilDue = task.getDaysUntilDue();
        return taskData;
      });

      res.json({
        success: true,
        data: tasksWithComputed
      });

    } catch (error) {
      console.error('Error getting tasks by priority:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tasks by priority',
        details: error.message
      });
    }
  }

  /**
   * Get next task for user (from priority queue)
   */
  async getNextTask(req, res) {
    try {
      const userId = req.user.id;

      const nextTaskInfo = taskManagementService.getNextTaskForUser(userId);

      if (!nextTaskInfo) {
        return res.json({
          success: true,
          data: null,
          message: 'No tasks in queue'
        });
      }

      // Get full task details
      const task = await Task.findByPk(nextTaskInfo.taskId, {
        include: [
          { model: Lead, as: 'lead' },
          { model: User, as: 'assignedUser' },
          { model: Call, as: 'call' },
          { model: Followup, as: 'followup' }
        ]
      });

      if (!task) {
        return res.json({
          success: true,
          data: null,
          message: 'Task not found'
        });
      }

      const taskData = task.toJSON();
      taskData.isOverdue = task.isOverdue();
      taskData.daysUntilDue = task.getDaysUntilDue();
      taskData.priorityScore = nextTaskInfo.score;

      res.json({
        success: true,
        data: taskData
      });

    } catch (error) {
      console.error('Error getting next task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get next task',
        details: error.message
      });
    }
  }

  /**
   * Bulk create tasks
   */
  async bulkCreateTasks(req, res) {
    try {
      const { tasks: tasksData } = req.body;
      const createdBy = req.user.id;

      if (!Array.isArray(tasksData) || tasksData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Array of task data is required'
        });
      }

      // Add createdBy to each task
      const tasksWithCreator = tasksData.map(data => ({
        ...data,
        createdBy,
        assignedTo: data.assignedTo || createdBy
      }));

      const results = await taskManagementService.bulkCreateTasks(tasksWithCreator);

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
      console.error('Error bulk creating tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk create tasks',
        details: error.message
      });
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(req, res) {
    try {
      const { timeframe = 'week', userId } = req.query;
      const targetUserId = userId || req.user.id;

      const statistics = await taskManagementService.getTaskStatistics(targetUserId, timeframe);

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('Error getting task statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve task statistics',
        details: error.message
      });
    }
  }

  /**
   * Add collaborator to task
   */
  async addCollaborator(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const task = await Task.findByPk(id);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      await task.addCollaborator(userId);

      res.json({
        success: true,
        data: task,
        message: 'Collaborator added successfully'
      });

    } catch (error) {
      console.error('Error adding collaborator:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add collaborator',
        details: error.message
      });
    }
  }

  /**
   * Add watcher to task
   */
  async addWatcher(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const task = await Task.findByPk(id);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      await task.addWatcher(userId);

      res.json({
        success: true,
        data: task,
        message: 'Watcher added successfully'
      });

    } catch (error) {
      console.error('Error adding watcher:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add watcher',
        details: error.message
      });
    }
  }

  /**
   * Validate status transition
   */
  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'pending': ['in_progress', 'cancelled', 'blocked', 'on_hold'],
      'in_progress': ['completed', 'cancelled', 'blocked', 'on_hold', 'deferred'],
      'completed': [], // Cannot transition from completed
      'cancelled': ['pending'], // Can reactivate cancelled tasks
      'blocked': ['pending', 'in_progress', 'cancelled'],
      'on_hold': ['pending', 'in_progress', 'cancelled'],
      'deferred': ['pending', 'cancelled']
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}

module.exports = new TaskController();