const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

/**
 * Follow-up Sequence Model
 * Manages multi-step follow-up sequences for lead nurturing
 */
const FollowupSequence = sequelize.define('FollowupSequence', {
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
  
  category: {
    type: DataTypes.ENUM([
      'nurture', 'sales', 'onboarding', 'retention', 
      'reactivation', 'upsell', 'cross_sell', 'custom'
    ]),
    allowNull: false,
    defaultValue: 'nurture'
  },
  
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // Sequence configuration
  totalSteps: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 50
    }
  },
  
  estimatedDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated duration in days'
  },
  
  // Trigger conditions
  triggerConditions: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Conditions that trigger this sequence'
  },
  
  // Exit conditions
  exitConditions: {
    type: DataTypes.JSONB,
    defaultValue: {
      outcomes: ['closed_won', 'closed_lost', 'unsubscribed'],
      maxReschedules: 3,
      inactivityDays: 30
    }
  },
  
  // Sequence steps
  steps: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of sequence steps with timing and templates'
  },
  
  // A/B testing
  isTestSequence: {
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
  
  controlSequenceId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'FollowupSequences',
      key: 'id'
    }
  },
  
  // Performance metrics
  enrollmentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  completionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  conversionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  averageCompletionTime: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Average completion time in days'
  },
  
  // Team and permissions
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
  
  // Tags and categorization
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'followup_sequences',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['isActive'] },
    { fields: ['teamId'] },
    { fields: ['createdBy'] },
    { fields: ['isTestSequence'] },
    { fields: ['tags'], using: 'gin' },
    {
      fields: ['category', 'isActive'],
      name: 'followup_sequences_active_category'
    }
  ]
});

// Model associations
FollowupSequence.associate = (models) => {
  FollowupSequence.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  FollowupSequence.belongsTo(models.Team, {
    foreignKey: 'teamId',
    as: 'team'
  });
  
  FollowupSequence.belongsTo(models.FollowupSequence, {
    foreignKey: 'controlSequenceId',
    as: 'controlSequence'
  });
  
  FollowupSequence.hasMany(models.Followup, {
    foreignKey: 'sequenceId',
    as: 'followups'
  });
  
  FollowupSequence.hasMany(models.SequenceEnrollment, {
    foreignKey: 'sequenceId',
    as: 'enrollments'
  });
};

// Instance methods
FollowupSequence.prototype.getStep = function(stepNumber) {
  return this.steps.find(step => step.order === stepNumber);
};

FollowupSequence.prototype.getNextStep = function(currentStep) {
  return this.steps.find(step => step.order === currentStep + 1);
};

FollowupSequence.prototype.calculateCompletionRate = function() {
  if (this.enrollmentCount === 0) return 0;
  return (this.completionCount / this.enrollmentCount) * 100;
};

FollowupSequence.prototype.calculateConversionRate = function() {
  if (this.enrollmentCount === 0) return 0;
  return (this.conversionCount / this.enrollmentCount) * 100;
};

FollowupSequence.prototype.enrollLead = async function(leadId, userId, startStep = 1) {
  const models = require('../../../models');
  
  // Create sequence enrollment
  const enrollment = await models.SequenceEnrollment.create({
    sequenceId: this.id,
    leadId: leadId,
    userId: userId,
    currentStep: startStep,
    status: 'active',
    enrolledAt: new Date()
  });
  
  // Create first follow-up
  const firstStep = this.getStep(startStep);
  if (firstStep) {
    await this.createStepFollowup(enrollment, firstStep);
  }
  
  // Update enrollment count
  await this.increment('enrollmentCount');
  
  return enrollment;
};

FollowupSequence.prototype.createStepFollowup = async function(enrollment, step) {
  const models = require('../../../models');
  
  // Calculate scheduled date
  const scheduledFor = this.calculateStepDate(step);
  
  // Create follow-up
  const followup = await models.Followup.create({
    leadId: enrollment.leadId,
    userId: enrollment.userId,
    sequenceId: this.id,
    sequenceStep: step.order,
    type: step.type || 'call',
    priority: step.priority || 'medium',
    title: this.interpolateTemplate(step.title, enrollment),
    description: this.interpolateTemplate(step.description, enrollment),
    scheduledFor: scheduledFor,
    duration: step.duration || 30,
    templateId: step.templateId,
    isAutomated: true,
    createdVia: 'sequence'
  });
  
  return followup;
};

FollowupSequence.prototype.calculateStepDate = function(step, baseDate = new Date()) {
  const { timing } = step;
  
  if (!timing) return baseDate;
  
  let scheduledDate = new Date(baseDate);
  
  // Add delay based on timing configuration
  if (timing.delay && timing.unit) {
    const multiplier = {
      'minutes': 60 * 1000,
      'hours': 60 * 60 * 1000,
      'days': 24 * 60 * 60 * 1000,
      'weeks': 7 * 24 * 60 * 60 * 1000
    };
    
    const offset = timing.delay * multiplier[timing.unit];
    scheduledDate.setTime(scheduledDate.getTime() + offset);
  }
  
  // Adjust for business hours
  if (timing.businessHoursOnly) {
    scheduledDate = this.adjustForBusinessHours(scheduledDate);
  }
  
  return scheduledDate;
};

FollowupSequence.prototype.adjustForBusinessHours = function(date) {
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

FollowupSequence.prototype.interpolateTemplate = function(template, enrollment) {
  if (!template) return '';
  
  // Simple template interpolation
  return template
    .replace('{{leadName}}', enrollment.lead?.name || 'there')
    .replace('{{stepNumber}}', enrollment.currentStep)
    .replace('{{sequenceName}}', this.name);
};

// Class methods
FollowupSequence.findActiveByCategory = async function(category) {
  return await this.findAll({
    where: {
      category: category,
      isActive: true
    },
    order: [['name', 'ASC']]
  });
};

module.exports = FollowupSequence;