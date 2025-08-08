/**
 * CallLog Model - Track all call activities with detailed metadata
 */

const { DataTypes } = require('sequelize');
const Joi = require('joi');

// Validation schema
const callLogValidationSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  phoneNumber: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
  direction: Joi.string().valid('inbound', 'outbound').required(),
  status: Joi.string().valid('initiated', 'ringing', 'answered', 'busy', 'failed', 'voicemail', 'completed').required(),
  outcome: Joi.string().valid('connected', 'voicemail', 'no_answer', 'busy', 'failed', 'interested', 'not_interested', 'callback_requested', 'meeting_scheduled').allow(null),
  duration: Joi.number().min(0).default(0),
  notes: Joi.string().max(2000).allow(null, ''),
  callQuality: Joi.number().min(1).max(5).allow(null),
  sipCallId: Joi.string().max(255).allow(null),
  recordingUrl: Joi.string().uri().allow(null),
  metadata: Joi.object().default({})
});

const defineCallLogModel = (sequelize) => {
  const CallLog = sequelize.define('CallLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Foreign key to Lead
    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'leads',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    
    // Call details
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        is: /^[\+]?[1-9][\d]{0,15}$/
      }
    },
    
    // Call direction
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false
    },
    
    // Call status during the call
    status: {
      type: DataTypes.ENUM('initiated', 'ringing', 'answered', 'busy', 'failed', 'voicemail', 'completed'),
      allowNull: false
    },
    
    // Call outcome after completion
    outcome: {
      type: DataTypes.ENUM('connected', 'voicemail', 'no_answer', 'busy', 'failed', 'interested', 'not_interested', 'callback_requested', 'meeting_scheduled'),
      allowNull: true
    },
    
    // Timing information
    initiatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    answeredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Call metrics
    duration: {
      type: DataTypes.INTEGER, // in seconds
      defaultValue: 0,
      allowNull: false
    },
    talkTime: {
      type: DataTypes.INTEGER, // in seconds (actual conversation time)
      allowNull: true
    },
    
    // Call quality (1-5 rating)
    callQuality: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    
    // SIP/VoIP specific data
    sipCallId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    sipStatus: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Recording information
    recordingUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    recordingDuration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    recordingSize: {
      type: DataTypes.INTEGER, // in bytes
      allowNull: true
    },
    
    // Call notes and outcome
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000]
      }
    },
    
    // Agent information
    agentId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    agentName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    // Additional metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false
    },
    
    // Cost tracking
    cost: {
      type: DataTypes.DECIMAL(8, 4), // up to $9999.9999
      allowNull: true
    },
    
    // Follow-up indicators
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Technical data
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true
    }
  }, {
    tableName: 'call_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['leadId']
      },
      {
        fields: ['phoneNumber']
      },
      {
        fields: ['direction']
      },
      {
        fields: ['status']
      },
      {
        fields: ['outcome']
      },
      {
        fields: ['initiatedAt']
      },
      {
        fields: ['duration']
      },
      {
        fields: ['agentId']
      },
      {
        fields: ['sipCallId'],
        unique: true,
        where: {
          sipCallId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      {
        fields: ['followUpRequired', 'followUpDate']
      }
    ],
    
    // Hooks for data processing
    hooks: {
      beforeUpdate: async (callLog) => {
        if (callLog.changed('completedAt') && callLog.completedAt && callLog.answeredAt) {
          // Calculate talk time
          callLog.talkTime = Math.floor((new Date(callLog.completedAt) - new Date(callLog.answeredAt)) / 1000);
        }
      }
    }
  });
  
  // Instance methods
  CallLog.prototype.markAnswered = async function() {
    this.status = 'answered';
    this.answeredAt = new Date();
    await this.save();
  };
  
  CallLog.prototype.markCompleted = async function(outcome, notes = '') {
    this.status = 'completed';
    this.completedAt = new Date();
    this.outcome = outcome;
    if (notes) {
      this.notes = notes;
    }
    
    // Calculate duration
    if (this.answeredAt) {
      this.duration = Math.floor((this.completedAt - this.initiatedAt) / 1000);
      this.talkTime = Math.floor((this.completedAt - this.answeredAt) / 1000);
    } else {
      this.duration = Math.floor((this.completedAt - this.initiatedAt) / 1000);
    }
    
    await this.save();
  };
  
  CallLog.prototype.addRecording = async function(url, duration = null, size = null) {
    this.recordingUrl = url;
    this.recordingDuration = duration;
    this.recordingSize = size;
    await this.save();
  };
  
  CallLog.prototype.scheduleFollowUp = async function(followUpDate, notes = '') {
    this.followUpRequired = true;
    this.followUpDate = followUpDate;
    if (notes) {
      this.notes = this.notes ? `${this.notes}\n\nFollow-up: ${notes}` : `Follow-up: ${notes}`;
    }
    await this.save();
  };
  
  // Class methods
  CallLog.validateData = (data) => {
    return callLogValidationSchema.validate(data, { abortEarly: false });
  };
  
  CallLog.getCallStats = async function(leadId = null, agentId = null, dateRange = null) {
    const whereClause = {};
    if (leadId) whereClause.leadId = leadId;
    if (agentId) whereClause.agentId = agentId;
    if (dateRange && dateRange.start && dateRange.end) {
      whereClause.initiatedAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }
    
    const calls = await CallLog.findAll({
      where: whereClause,
      attributes: [
        'outcome',
        [sequelize.Sequelize.fn('COUNT', '*'), 'count'],
        [sequelize.Sequelize.fn('AVG', sequelize.Sequelize.col('duration')), 'avgDuration'],
        [sequelize.Sequelize.fn('AVG', sequelize.Sequelize.col('callQuality')), 'avgQuality']
      ],
      group: ['outcome']
    });
    
    return calls;
  };
  
  CallLog.findRecentCalls = async function(leadId, limit = 10) {
    return await CallLog.findAll({
      where: { leadId },
      order: [['initiatedAt', 'DESC']],
      limit,
      include: [{
        model: sequelize.models.Lead,
        as: 'lead',
        attributes: ['firstName', 'lastName', 'company']
      }]
    });
  };
  
  // Define associations
  CallLog.associate = (models) => {
    CallLog.belongsTo(models.Lead, {
      foreignKey: 'leadId',
      as: 'lead',
      onDelete: 'CASCADE'
    });
  };
  
  return CallLog;
};

module.exports = { defineCallLogModel, callLogValidationSchema };