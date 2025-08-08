const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

/**
 * Automation Rule Model
 * Defines automated follow-up creation rules based on call outcomes
 */
const AutomationRule = sequelize.define('AutomationRule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // Trigger conditions
  triggerEvent: {
    type: DataTypes.ENUM([
      'call_completed', 'call_outcome', 'lead_created', 
      'lead_updated', 'followup_completed', 'time_based',
      'lead_score_change', 'engagement_threshold'
    ]),
    allowNull: false
  },
  
  conditions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'JSON object defining trigger conditions'
  },
  
  // Actions to take
  actions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of actions to execute when conditions are met'
  },
  
  // Follow-up creation settings
  followupType: {
    type: DataTypes.ENUM([
      'call', 'email', 'sms', 'meeting', 'demo', 'proposal', 
      'quote', 'contract', 'followup_call', 'nurture', 'other'
    ]),
    allowNull: false,
    defaultValue: 'call'
  },
  
  priority: {
    type: DataTypes.ENUM(['low', 'medium', 'high', 'urgent']),
    allowNull: false,
    defaultValue: 'medium'
  },
  
  // Scheduling rules
  scheduleRule: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      type: 'relative', // 'relative', 'absolute', 'business_hours'
      value: 1,
      unit: 'days', // 'minutes', 'hours', 'days', 'weeks'
      businessHoursOnly: true,
      timezone: 'UTC'
    }
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
  
  titleTemplate: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Template for follow-up title with variables'
  },
  
  descriptionTemplate: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Template for follow-up description with variables'
  },
  
  // Assignment rules
  assignmentRule: {
    type: DataTypes.JSONB,
    defaultValue: {
      type: 'original_user', // 'original_user', 'round_robin', 'territory', 'skill_based'
      fallback: 'manager'
    }
  },
  
  // Limits and controls
  maxExecutionsPerLead: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum times this rule can execute for a single lead'
  },
  
  cooldownPeriod: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Minimum hours between executions for same lead'
  },
  
  // Analytics and tracking
  executionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  successCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  lastExecuted: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Team and permission settings
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Teams',
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
  
  // A/B testing
  isTestRule: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  testPercentage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'automation_rules',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['triggerEvent'] },
    { fields: ['isActive'] },
    { fields: ['teamId'] },
    { fields: ['createdBy'] },
    { fields: ['followupType'] },
    { fields: ['lastExecuted'] },
    {
      fields: ['triggerEvent', 'isActive'],
      name: 'automation_rules_active_triggers'
    }
  ]
});

// Model associations
AutomationRule.associate = (models) => {
  AutomationRule.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  AutomationRule.belongsTo(models.Team, {
    foreignKey: 'teamId',
    as: 'team'
  });
  
  AutomationRule.belongsTo(models.FollowupTemplate, {
    foreignKey: 'templateId',
    as: 'template'
  });
  
  AutomationRule.hasMany(models.Followup, {
    foreignKey: 'automationRuleId',
    as: 'followups'
  });
  
  AutomationRule.hasMany(models.AutomationExecution, {
    foreignKey: 'ruleId',
    as: 'executions'
  });
};

// Instance methods
AutomationRule.prototype.canExecute = function(leadId) {
  if (!this.isActive) return false;
  
  // Check cooldown period
  if (this.cooldownPeriod && this.lastExecuted) {
    const cooldownMs = this.cooldownPeriod * 60 * 60 * 1000;
    if (Date.now() - this.lastExecuted.getTime() < cooldownMs) {
      return false;
    }
  }
  
  return true;
};

AutomationRule.prototype.evaluateConditions = function(context) {
  const { conditions } = this;
  
  // Simple condition evaluation logic
  for (const [key, value] of Object.entries(conditions)) {
    if (context[key] !== value) {
      return false;
    }
  }
  
  return true;
};

AutomationRule.prototype.calculateScheduleDate = function(baseDate = new Date()) {
  const { scheduleRule } = this;
  const { type, value, unit, businessHoursOnly, timezone } = scheduleRule;
  
  let scheduledFor = new Date(baseDate);
  
  // Calculate offset based on unit
  const multiplier = {
    'minutes': 60 * 1000,
    'hours': 60 * 60 * 1000,
    'days': 24 * 60 * 60 * 1000,
    'weeks': 7 * 24 * 60 * 60 * 1000
  };
  
  const offset = value * multiplier[unit];
  scheduledFor.setTime(scheduledFor.getTime() + offset);
  
  // Adjust for business hours if required
  if (businessHoursOnly) {
    scheduledFor = this.adjustForBusinessHours(scheduledFor);
  }
  
  return scheduledFor;
};

AutomationRule.prototype.adjustForBusinessHours = function(date) {
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
};

AutomationRule.prototype.incrementExecution = async function(success = false) {
  this.executionCount += 1;
  if (success) this.successCount += 1;
  this.lastExecuted = new Date();
  return await this.save();
};

// Class methods
AutomationRule.findActiveByTrigger = async function(triggerEvent) {
  return await this.findAll({
    where: {
      triggerEvent: triggerEvent,
      isActive: true
    },
    order: [['priority', 'DESC'], ['createdAt', 'ASC']]
  });
};

AutomationRule.getSuccessRate = function() {
  if (this.executionCount === 0) return 0;
  return (this.successCount / this.executionCount) * 100;
};

module.exports = AutomationRule;