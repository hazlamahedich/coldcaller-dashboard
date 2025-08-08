const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

/**
 * Follow-up Model
 * Manages scheduled follow-up activities and automation
 */
const Followup = sequelize.define('Followup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Related entities
  leadId: {
    type: DataTypes.UUID,
    allowNull: false,
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
  
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // Follow-up details
  type: {
    type: DataTypes.ENUM([
      'call', 'email', 'sms', 'meeting', 'demo', 'proposal', 
      'quote', 'contract', 'followup_call', 'nurture', 'other'
    ]),
    allowNull: false,
    defaultValue: 'call'
  },
  
  status: {
    type: DataTypes.ENUM([
      'pending', 'scheduled', 'in_progress', 'completed', 
      'cancelled', 'overdue', 'rescheduled'
    ]),
    allowNull: false,
    defaultValue: 'pending'
  },
  
  priority: {
    type: DataTypes.ENUM(['low', 'medium', 'high', 'urgent']),
    allowNull: false,
    defaultValue: 'medium'
  },
  
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Scheduling
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: new Date()
    }
  },
  
  duration: {
    type: DataTypes.INTEGER, // Duration in minutes
    allowNull: true,
    defaultValue: 30
  },
  
  timezone: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'UTC'
  },
  
  // Automation
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
  
  sequenceId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'FollowupSequences',
      key: 'id'
    }
  },
  
  sequenceStep: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  
  // Template and personalization
  templateId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'FollowupTemplates',
      key: 'id'
    }
  },
  
  customFields: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Completion tracking
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  completedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  outcome: {
    type: DataTypes.ENUM([
      'successful', 'no_answer', 'voicemail', 'callback_requested',
      'not_interested', 'follow_up_scheduled', 'meeting_scheduled',
      'demo_scheduled', 'proposal_requested', 'closed_won', 
      'closed_lost', 'other'
    ]),
    allowNull: true
  },
  
  outcomeNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Calendar integration
  calendarEventId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  calendarProvider: {
    type: DataTypes.ENUM(['google', 'outlook', 'apple', 'other']),
    allowNull: true
  },
  
  // Reminders and notifications
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  notificationPreferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      email: true,
      push: true,
      desktop: true,
      sms: false,
      reminderMinutes: [1440, 60, 15] // 1 day, 1 hour, 15 minutes
    }
  },
  
  // Tracking and analytics
  createdVia: {
    type: DataTypes.ENUM([
      'manual', 'automation', 'call_outcome', 'sequence', 
      'escalation', 'rescheduled', 'api'
    ]),
    defaultValue: 'manual'
  },
  
  rescheduleCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  lastRescheduledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'followups',
  timestamps: true,
  paranoid: true, // Soft deletes
  indexes: [
    { fields: ['leadId'] },
    { fields: ['userId'] },
    { fields: ['callId'] },
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['scheduledFor'] },
    { fields: ['type'] },
    { fields: ['isAutomated'] },
    { fields: ['sequenceId'] },
    { fields: ['completedAt'] },
    { fields: ['outcome'] },
    { fields: ['createdVia'] },
    {
      fields: ['scheduledFor', 'status'],
      name: 'followups_scheduled_active'
    },
    {
      fields: ['userId', 'scheduledFor'],
      name: 'followups_user_schedule'
    }
  ]
});

// Model associations
Followup.associate = (models) => {
  // Belongs to relationships
  Followup.belongsTo(models.Lead, {
    foreignKey: 'leadId',
    as: 'lead'
  });
  
  Followup.belongsTo(models.Call, {
    foreignKey: 'callId',
    as: 'call'
  });
  
  Followup.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'assignedUser'
  });
  
  Followup.belongsTo(models.User, {
    foreignKey: 'completedBy',
    as: 'completedByUser'
  });
  
  Followup.belongsTo(models.AutomationRule, {
    foreignKey: 'automationRuleId',
    as: 'automationRule'
  });
  
  Followup.belongsTo(models.FollowupSequence, {
    foreignKey: 'sequenceId',
    as: 'sequence'
  });
  
  Followup.belongsTo(models.FollowupTemplate, {
    foreignKey: 'templateId',
    as: 'template'
  });
  
  // Has many relationships
  Followup.hasMany(models.FollowupReminder, {
    foreignKey: 'followupId',
    as: 'reminders'
  });
  
  Followup.hasMany(models.FollowupNote, {
    foreignKey: 'followupId',
    as: 'notes'
  });
  
  Followup.hasMany(models.Activity, {
    foreignKey: 'followupId',
    as: 'activities'
  });
};

// Instance methods
Followup.prototype.markCompleted = async function(outcome, notes, userId) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.completedBy = userId;
  this.outcome = outcome;
  this.outcomeNotes = notes;
  return await this.save();
};

Followup.prototype.reschedule = async function(newDate, reason) {
  this.scheduledFor = newDate;
  this.status = 'rescheduled';
  this.rescheduleCount += 1;
  this.lastRescheduledAt = new Date();
  
  // Store reschedule reason in metadata
  if (!this.metadata.rescheduleHistory) {
    this.metadata.rescheduleHistory = [];
  }
  
  this.metadata.rescheduleHistory.push({
    previousDate: this.scheduledFor,
    newDate: newDate,
    reason: reason,
    timestamp: new Date()
  });
  
  return await this.save();
};

Followup.prototype.isOverdue = function() {
  return this.scheduledFor < new Date() && 
         !['completed', 'cancelled'].includes(this.status);
};

Followup.prototype.getDaysUntilDue = function() {
  const now = new Date();
  const scheduled = new Date(this.scheduledFor);
  const diffTime = scheduled - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Class methods
Followup.getOverdueFollowups = async function(userId = null) {
  const where = {
    scheduledFor: { $lt: new Date() },
    status: { $notIn: ['completed', 'cancelled'] }
  };
  
  if (userId) {
    where.userId = userId;
  }
  
  return await this.findAll({ where });
};

Followup.getUpcomingFollowups = async function(userId, days = 7) {
  const now = new Date();
  const future = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return await this.findAll({
    where: {
      userId: userId,
      scheduledFor: {
        $between: [now, future]
      },
      status: { $notIn: ['completed', 'cancelled'] }
    },
    order: [['scheduledFor', 'ASC']]
  });
};

module.exports = Followup;