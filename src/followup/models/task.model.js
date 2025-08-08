const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

/**
 * Task Model
 * Manages tasks created from call outcomes and follow-up activities
 */
const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Related entities
  leadId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Leads',
      key: 'id'
    }
  },
  
  callId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Calls',
      key: 'id'
    }
  },
  
  followupId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Followups',
      key: 'id'
    }
  },
  
  // Assignment
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Teams',
      key: 'id'
    }
  },
  
  // Task details
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  type: {
    type: DataTypes.ENUM([
      'call', 'email', 'research', 'preparation', 'follow_up',
      'meeting', 'demo', 'proposal', 'contract', 'administrative',
      'data_entry', 'analysis', 'other'
    ]),
    allowNull: false,
    defaultValue: 'other'
  },
  
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Custom category for task organization'
  },
  
  status: {
    type: DataTypes.ENUM([
      'pending', 'in_progress', 'completed', 'cancelled', 
      'blocked', 'on_hold', 'deferred'
    ]),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  priority: {
    type: DataTypes.ENUM(['low', 'medium', 'high', 'urgent']),
    allowNull: false,
    defaultValue: 'medium'
  },
  
  // Scheduling and deadlines
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  estimatedDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated duration in minutes'
  },
  
  actualDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Actual time spent in minutes'
  },
  
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Dependencies and relationships
  parentTaskId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Tasks',
      key: 'id'
    }
  },
  
  blockedBy: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    comment: 'Array of task IDs that block this task'
  },
  
  // Automation and templates
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  recurrenceRule: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Recurrence pattern for recurring tasks'
  },
  
  templateId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'TaskTemplates',
      key: 'id'
    }
  },
  
  isAutomated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  automationRuleId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'AutomationRules',
      key: 'id'
    }
  },
  
  // Progress tracking
  progressPercentage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  milestones: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of milestone objects with completion status'
  },
  
  // Reminders and notifications
  reminderSettings: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: true,
      intervals: [1440, 60, 15], // 1 day, 1 hour, 15 minutes before due
      methods: ['email', 'push', 'desktop']
    }
  },
  
  lastReminderSent: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Collaboration
  collaborators: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    comment: 'Array of user IDs who can collaborate on this task'
  },
  
  watchers: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    comment: 'Array of user IDs who watch this task for updates'
  },
  
  // Escalation
  escalationRules: {
    type: DataTypes.JSONB,
    defaultValue: {
      enabled: false,
      conditions: [],
      actions: []
    }
  },
  
  escalatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  escalatedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // Outcome and results
  outcome: {
    type: DataTypes.ENUM([
      'successful', 'partial', 'unsuccessful', 'cancelled', 
      'deferred', 'blocked', 'escalated'
    ]),
    allowNull: true
  },
  
  outcomeNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Custom fields and metadata
  customFields: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'tasks',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['assignedTo'] },
    { fields: ['createdBy'] },
    { fields: ['leadId'] },
    { fields: ['callId'] },
    { fields: ['followupId'] },
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['dueDate'] },
    { fields: ['type'] },
    { fields: ['category'] },
    { fields: ['teamId'] },
    { fields: ['parentTaskId'] },
    { fields: ['isRecurring'] },
    { fields: ['tags'], using: 'gin' },
    {
      fields: ['assignedTo', 'status'],
      name: 'tasks_user_status'
    },
    {
      fields: ['dueDate', 'status'],
      name: 'tasks_due_status'
    },
    {
      fields: ['priority', 'dueDate'],
      name: 'tasks_priority_due'
    }
  ]
});

// Model associations
Task.associate = (models) => {
  // Belongs to relationships
  Task.belongsTo(models.Lead, {
    foreignKey: 'leadId',
    as: 'lead'
  });
  
  Task.belongsTo(models.Call, {
    foreignKey: 'callId',
    as: 'call'
  });
  
  Task.belongsTo(models.Followup, {
    foreignKey: 'followupId',
    as: 'followup'
  });
  
  Task.belongsTo(models.User, {
    foreignKey: 'assignedTo',
    as: 'assignedUser'
  });
  
  Task.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  Task.belongsTo(models.User, {
    foreignKey: 'escalatedTo',
    as: 'escalatedToUser'
  });
  
  Task.belongsTo(models.Team, {
    foreignKey: 'teamId',
    as: 'team'
  });
  
  Task.belongsTo(models.Task, {
    foreignKey: 'parentTaskId',
    as: 'parentTask'
  });
  
  Task.belongsTo(models.TaskTemplate, {
    foreignKey: 'templateId',
    as: 'template'
  });
  
  Task.belongsTo(models.AutomationRule, {
    foreignKey: 'automationRuleId',
    as: 'automationRule'
  });
  
  // Has many relationships
  Task.hasMany(models.Task, {
    foreignKey: 'parentTaskId',
    as: 'subtasks'
  });
  
  Task.hasMany(models.TaskComment, {
    foreignKey: 'taskId',
    as: 'comments'
  });
  
  Task.hasMany(models.TaskAttachment, {
    foreignKey: 'taskId',
    as: 'attachments'
  });
  
  Task.hasMany(models.Activity, {
    foreignKey: 'taskId',
    as: 'activities'
  });
};

// Instance methods
Task.prototype.markInProgress = async function(userId = null) {
  this.status = 'in_progress';
  this.startedAt = new Date();
  if (userId) this.assignedTo = userId;
  return await this.save();
};

Task.prototype.markCompleted = async function(outcome, notes) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progressPercentage = 100;
  this.outcome = outcome;
  this.outcomeNotes = notes;
  
  // Calculate actual duration
  if (this.startedAt) {
    this.actualDuration = Math.round(
      (this.completedAt - this.startedAt) / (1000 * 60)
    );
  }
  
  return await this.save();
};

Task.prototype.isOverdue = function() {
  return this.dueDate && 
         this.dueDate < new Date() && 
         !['completed', 'cancelled'].includes(this.status);
};

Task.prototype.getDaysUntilDue = function() {
  if (!this.dueDate) return null;
  
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Task.prototype.canStart = function() {
  // Check if all blocking tasks are completed
  if (this.blockedBy && this.blockedBy.length > 0) {
    // This would need to be implemented with a database query
    // to check the status of blocking tasks
    return false;
  }
  
  return this.status === 'pending';
};

Task.prototype.escalate = async function(escalateTo, reason) {
  this.escalatedAt = new Date();
  this.escalatedTo = escalateTo;
  
  // Add escalation reason to metadata
  if (!this.metadata.escalations) {
    this.metadata.escalations = [];
  }
  
  this.metadata.escalations.push({
    escalatedAt: this.escalatedAt,
    escalatedTo: escalateTo,
    escalatedBy: this.assignedTo,
    reason: reason
  });
  
  return await this.save();
};

Task.prototype.addCollaborator = async function(userId) {
  if (!this.collaborators.includes(userId)) {
    this.collaborators.push(userId);
    return await this.save();
  }
  return this;
};

Task.prototype.addWatcher = async function(userId) {
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
    return await this.save();
  }
  return this;
};

// Class methods
Task.getOverdueTasks = async function(userId = null) {
  const where = {
    dueDate: { $lt: new Date() },
    status: { $notIn: ['completed', 'cancelled'] }
  };
  
  if (userId) {
    where.assignedTo = userId;
  }
  
  return await this.findAll({
    where,
    order: [['dueDate', 'ASC'], ['priority', 'DESC']]
  });
};

Task.getUpcomingTasks = async function(userId, days = 7) {
  const now = new Date();
  const future = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return await this.findAll({
    where: {
      assignedTo: userId,
      dueDate: {
        $between: [now, future]
      },
      status: { $notIn: ['completed', 'cancelled'] }
    },
    order: [['dueDate', 'ASC'], ['priority', 'DESC']]
  });
};

Task.getTasksByPriority = async function(priority, userId = null) {
  const where = {
    priority: priority,
    status: { $notIn: ['completed', 'cancelled'] }
  };
  
  if (userId) {
    where.assignedTo = userId;
  }
  
  return await this.findAll({
    where,
    order: [['dueDate', 'ASC']]
  });
};

module.exports = Task;