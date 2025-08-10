/**
 * SIP Call Log Database Model
 * Tracks all SIP calls with quality metrics and analytics
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SipCallLog = sequelize.define('SipCallLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Call Identity
  callId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'call_id'
  },
  
  sipSessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'sip_session_id'
  },
  
  // Configuration Reference
  sipConfigurationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sip_configurations',
      key: 'id'
    },
    field: 'sip_configuration_id'
  },
  
  // Call Details
  direction: {
    type: DataTypes.ENUM('inbound', 'outbound'),
    allowNull: false
  },
  
  fromNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'from_number'
  },
  
  toNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'to_number'
  },
  
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'display_name'
  },
  
  // Call Status and Timing
  status: {
    type: DataTypes.ENUM(
      'initiated',
      'ringing', 
      'answered',
      'connected',
      'on_hold',
      'transferred',
      'ended',
      'failed',
      'busy',
      'no_answer',
      'cancelled'
    ),
    allowNull: false,
    defaultValue: 'initiated'
  },
  
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_time'
  },
  
  answerTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'answer_time'
  },
  
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_time'
  },
  
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds'
  },
  
  ringTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time to answer in seconds',
    field: 'ring_time'
  },
  
  // Call Quality Metrics
  audioQuality: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'audio_quality',
    comment: 'RTC stats and quality metrics'
  },
  
  networkMetrics: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'network_metrics',
    comment: 'Network latency, jitter, packet loss'
  },
  
  mosScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 1.0, max: 5.0 },
    field: 'mos_score',
    comment: 'Mean Opinion Score (1-5)'
  },
  
  qualityRating: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor', 'bad'),
    allowNull: true,
    field: 'quality_rating'
  },
  
  // SIP Protocol Details
  sipMethod: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'sip_method'
  },
  
  sipResponseCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'sip_response_code'
  },
  
  sipResponseText: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'sip_response_text'
  },
  
  userAgent: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'user_agent'
  },
  
  // Codec Information
  audioCodec: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'audio_codec'
  },
  
  codecBitrate: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'codec_bitrate'
  },
  
  // Recording Information
  recordingEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'recording_enabled'
  },
  
  recordingPath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'recording_path'
  },
  
  recordingDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'recording_duration'
  },
  
  recordingFileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'recording_file_size'
  },
  
  // Error Information
  errorCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'error_code'
  },
  
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  
  disconnectReason: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'disconnect_reason'
  },
  
  // DTMF Events
  dtmfEvents: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'dtmf_events'
  },
  
  // Call Transfer Information
  transferTarget: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'transfer_target'
  },
  
  transferTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'transfer_time'
  },
  
  transferType: {
    type: DataTypes.ENUM('blind', 'attended', 'consultative'),
    allowNull: true,
    field: 'transfer_type'
  },
  
  // Business Context
  leadId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'lead_id'
  },
  
  campaignId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'campaign_id'
  },
  
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id'
  },
  
  // Call Outcome
  outcome: {
    type: DataTypes.ENUM(
      'connected',
      'voicemail', 
      'busy',
      'no_answer',
      'disconnected',
      'wrong_number',
      'not_interested',
      'callback_requested',
      'appointment_set',
      'sale_made'
    ),
    allowNull: true
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Cost Information
  cost: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    comment: 'Call cost in currency units'
  },
  
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'USD'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  tableName: 'sip_call_logs',
  timestamps: true,
  underscored: true,
  
  indexes: [
    { fields: ['call_id'], unique: true },
    { fields: ['sip_configuration_id'] },
    { fields: ['status'] },
    { fields: ['direction'] },
    { fields: ['start_time'] },
    { fields: ['from_number'] },
    { fields: ['to_number'] },
    { fields: ['lead_id'] },
    { fields: ['campaign_id'] },
    { fields: ['user_id'] },
    { fields: ['outcome'] },
    { fields: ['created_at'] },
    { fields: ['start_time', 'end_time'] }
  ]
});

// Instance Methods
SipCallLog.prototype.calculateDuration = function() {
  if (!this.endTime || !this.answerTime) return 0;
  return Math.floor((new Date(this.endTime) - new Date(this.answerTime)) / 1000);
};

SipCallLog.prototype.calculateRingTime = function() {
  if (!this.answerTime || !this.startTime) return 0;
  return Math.floor((new Date(this.answerTime) - new Date(this.startTime)) / 1000);
};

SipCallLog.prototype.addDtmfEvent = function(digit, timestamp = new Date()) {
  if (!this.dtmfEvents) this.dtmfEvents = [];
  
  this.dtmfEvents.push({
    digit,
    timestamp: timestamp.toISOString(),
    relativeTime: timestamp - new Date(this.startTime)
  });
  
  return this.save();
};

SipCallLog.prototype.updateQualityMetrics = function(metrics) {
  this.networkMetrics = { ...this.networkMetrics, ...metrics.network };
  this.audioQuality = { ...this.audioQuality, ...metrics.audio };
  
  if (metrics.mos) {
    this.mosScore = metrics.mos;
    this.qualityRating = this.getMosRating(metrics.mos);
  }
  
  return this.save();
};

SipCallLog.prototype.getMosRating = function(mos) {
  if (mos >= 4.0) return 'excellent';
  if (mos >= 3.5) return 'good';
  if (mos >= 3.0) return 'fair';
  if (mos >= 2.0) return 'poor';
  return 'bad';
};

SipCallLog.prototype.isConnected = function() {
  return ['answered', 'connected'].includes(this.status);
};

SipCallLog.prototype.isCompleted = function() {
  return ['ended', 'failed', 'busy', 'no_answer', 'cancelled'].includes(this.status);
};

SipCallLog.prototype.getCallSummary = function() {
  return {
    id: this.id,
    callId: this.callId,
    direction: this.direction,
    from: this.fromNumber,
    to: this.toNumber,
    status: this.status,
    duration: this.duration,
    quality: this.qualityRating,
    mos: this.mosScore,
    outcome: this.outcome,
    cost: this.cost,
    startTime: this.startTime,
    endTime: this.endTime
  };
};

// Class Methods
SipCallLog.findByConfiguration = function(configurationId, options = {}) {
  return this.findAll({
    where: { sipConfigurationId: configurationId },
    order: [['start_time', 'DESC']],
    ...options
  });
};

SipCallLog.findByTimeRange = function(startDate, endDate, options = {}) {
  return this.findAll({
    where: {
      start_time: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    order: [['start_time', 'DESC']],
    ...options
  });
};

SipCallLog.findActiveCalls = function() {
  return this.findAll({
    where: {
      status: ['initiated', 'ringing', 'answered', 'connected', 'on_hold']
    },
    order: [['start_time', 'ASC']]
  });
};

SipCallLog.getCallStatistics = async function(configurationId = null, timeRange = null) {
  const whereClause = {};
  
  if (configurationId) {
    whereClause.sipConfigurationId = configurationId;
  }
  
  if (timeRange) {
    whereClause.start_time = {
      [sequelize.Sequelize.Op.between]: [timeRange.start, timeRange.end]
    };
  }
  
  const stats = await this.findAll({
    where: whereClause,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCalls'],
      [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status IN ('answered', 'connected', 'ended') THEN 1 END")), 'successfulCalls'],
      [sequelize.fn('AVG', sequelize.col('duration')), 'averageDuration'],
      [sequelize.fn('AVG', sequelize.col('mos_score')), 'averageMos'],
      [sequelize.fn('MIN', sequelize.col('mos_score')), 'minMos'],
      [sequelize.fn('MAX', sequelize.col('mos_score')), 'maxMos'],
      [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost']
    ],
    raw: true
  });
  
  return stats[0] || {};
};

SipCallLog.getQualityDistribution = async function(configurationId = null, days = 7) {
  const whereClause = {
    start_time: {
      [sequelize.Sequelize.Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    }
  };
  
  if (configurationId) {
    whereClause.sipConfigurationId = configurationId;
  }
  
  const distribution = await this.findAll({
    where: whereClause,
    attributes: [
      'quality_rating',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['quality_rating'],
    raw: true
  });
  
  return distribution;
};

// Associations will be defined in a separate associations file
SipCallLog.associate = function(models) {
  SipCallLog.belongsTo(models.SipConfiguration, {
    foreignKey: 'sipConfigurationId',
    as: 'sipConfiguration'
  });
};

module.exports = SipCallLog;