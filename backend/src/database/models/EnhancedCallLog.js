/**
 * Enhanced CallLog Model - Advanced call logging with comprehensive documentation
 * and coaching framework
 */

const { DataTypes } = require('sequelize');
const Joi = require('joi');

// Enhanced validation schema with all new fields
const enhancedCallLogValidationSchema = Joi.object({
  // Existing fields
  leadId: Joi.string().uuid().required(),
  phoneNumber: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
  direction: Joi.string().valid('inbound', 'outbound').required(),
  status: Joi.string().valid('initiated', 'ringing', 'answered', 'busy', 'failed', 'voicemail', 'completed').required(),
  outcome: Joi.string().valid('connected', 'voicemail', 'no_answer', 'busy', 'failed', 'interested', 'not_interested', 'callback_requested', 'meeting_scheduled', 'qualified', 'disqualified', 'dnc', 'wrong_number').allow(null),
  duration: Joi.number().min(0).default(0),
  
  // Enhanced documentation fields
  callNotes: Joi.object({
    summary: Joi.string().max(500).allow(''),
    keyPoints: Joi.array().items(Joi.string().max(200)).max(10),
    painPoints: Joi.array().items(Joi.string().max(200)).max(10),
    interests: Joi.array().items(Joi.string().max(200)).max(10),
    objections: Joi.array().items(Joi.object({
      objection: Joi.string().max(200),
      response: Joi.string().max(500),
      resolved: Joi.boolean()
    })).max(10),
    nextSteps: Joi.array().items(Joi.object({
      action: Joi.string().max(200),
      dueDate: Joi.date().allow(null),
      priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
      assigned: Joi.string().max(100).allow('')
    })).max(10)
  }).default({}),
  
  // Disposition and categorization
  disposition: Joi.string().valid(
    'connected', 'voicemail_left', 'no_voicemail', 'busy_signal', 
    'no_answer', 'disconnected', 'wrong_number', 'fax_machine', 
    'do_not_call', 'callback_scheduled', 'meeting_scheduled',
    'interested_nurture', 'qualified_handoff', 'not_interested_final'
  ).allow(null),
  
  // Call quality and coaching
  callQuality: Joi.object({
    overallScore: Joi.number().min(1).max(10),
    technicalQuality: Joi.number().min(1).max(10),
    communicationSkill: Joi.number().min(1).max(10),
    productKnowledge: Joi.number().min(1).max(10),
    objectionHandling: Joi.number().min(1).max(10),
    closingTechnique: Joi.number().min(1).max(10)
  }).allow(null),
  
  coachingFeedback: Joi.object({
    strengths: Joi.array().items(Joi.string().max(300)).max(10),
    improvements: Joi.array().items(Joi.string().max(300)).max(10),
    coachNotes: Joi.string().max(1000).allow(''),
    actionItems: Joi.array().items(Joi.object({
      item: Joi.string().max(200),
      priority: Joi.string().valid('low', 'medium', 'high'),
      targetDate: Joi.date().allow(null)
    })).max(10),
    reviewedBy: Joi.string().max(100).allow(''),
    reviewedAt: Joi.date().allow(null)
  }).allow(null),
  
  // Recording and transcription
  recordingMetadata: Joi.object({
    recordingUrl: Joi.string().uri().allow(''),
    recordingDuration: Joi.number().min(0).allow(null),
    recordingSize: Joi.number().min(0).allow(null),
    format: Joi.string().valid('mp3', 'wav', 'm4a', 'webm').default('mp3'),
    quality: Joi.string().valid('low', 'medium', 'high').default('medium'),
    transcriptionStatus: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'not_requested').default('not_requested'),
    transcriptionUrl: Joi.string().uri().allow(''),
    transcriptionText: Joi.string().max(50000).allow(''),
    transcriptionAccuracy: Joi.number().min(0).max(1).allow(null),
    speechAnalytics: Joi.object({
      talkRatio: Joi.number().min(0).max(1),
      averagePace: Joi.number().min(0),
      silenceDuration: Joi.number().min(0),
      overtalkInstances: Joi.number().min(0),
      sentimentScore: Joi.number().min(-1).max(1),
      emotionDetection: Joi.object({
        dominant: Joi.string().valid('neutral', 'happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted'),
        confidence: Joi.number().min(0).max(1)
      }).allow(null),
      keywordMatches: Joi.array().items(Joi.object({
        keyword: Joi.string(),
        count: Joi.number().min(0),
        context: Joi.array().items(Joi.string())
      }))
    }).allow(null)
  }).allow(null),
  
  // Follow-up and scheduling
  followUpActions: Joi.array().items(Joi.object({
    id: Joi.string().uuid(),
    type: Joi.string().valid('call', 'email', 'meeting', 'demo', 'proposal', 'contract', 'other'),
    title: Joi.string().max(200),
    description: Joi.string().max(1000).allow(''),
    scheduledDate: Joi.date(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
    assignedTo: Joi.string().max(100).allow(''),
    status: Joi.string().valid('pending', 'scheduled', 'completed', 'cancelled').default('pending'),
    reminderSet: Joi.boolean().default(false),
    completedAt: Joi.date().allow(null),
    completionNotes: Joi.string().max(500).allow('')
  })).max(20),
  
  // Integration data
  integrationData: Joi.object({
    voipProvider: Joi.string().max(100).allow(''),
    voipCallId: Joi.string().max(255).allow(''),
    crmSyncStatus: Joi.string().valid('pending', 'synced', 'failed', 'not_applicable').default('pending'),
    crmRecordId: Joi.string().max(255).allow(''),
    lastSyncAt: Joi.date().allow(null),
    syncErrors: Joi.array().items(Joi.object({
      timestamp: Joi.date(),
      error: Joi.string(),
      resolved: Joi.boolean().default(false)
    }))
  }).default({}),
  
  // Performance tracking
  performanceMetrics: Joi.object({
    dialToConnectTime: Joi.number().min(0).allow(null),
    timeToFirstWord: Joi.number().min(0).allow(null),
    conversationDuration: Joi.number().min(0).allow(null),
    holdTime: Joi.number().min(0).allow(null),
    transferCount: Joi.number().min(0).default(0),
    reconnectionAttempts: Joi.number().min(0).default(0),
    callDropped: Joi.boolean().default(false),
    networkQuality: Joi.object({
      latency: Joi.number().min(0),
      jitter: Joi.number().min(0),
      packetLoss: Joi.number().min(0).max(1),
      mos: Joi.number().min(1).max(5)
    }).allow(null)
  }).default({}),
  
  // Tags and categorization
  tags: Joi.array().items(Joi.string().max(50)).max(20).default([]),
  category: Joi.string().valid(
    'prospecting', 'qualification', 'demo', 'negotiation', 'closing', 
    'follow_up', 'support', 'renewal', 'upsell', 'retention'
  ).allow(null),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  
  // Metadata and tracking
  metadata: Joi.object().default({})
});

const defineEnhancedCallLogModel = (sequelize) => {
  const EnhancedCallLog = sequelize.define('EnhancedCallLog', {
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
    
    // Basic call information
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        is: /^[\+]?[1-9][\d]{0,15}$/
      }
    },
    
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false
    },
    
    status: {
      type: DataTypes.ENUM('initiated', 'ringing', 'answered', 'busy', 'failed', 'voicemail', 'completed'),
      allowNull: false
    },
    
    outcome: {
      type: DataTypes.ENUM(
        'connected', 'voicemail', 'no_answer', 'busy', 'failed', 
        'interested', 'not_interested', 'callback_requested', 
        'meeting_scheduled', 'qualified', 'disqualified', 'dnc', 'wrong_number'
      ),
      allowNull: true
    },
    
    disposition: {
      type: DataTypes.ENUM(
        'connected', 'voicemail_left', 'no_voicemail', 'busy_signal',
        'no_answer', 'disconnected', 'wrong_number', 'fax_machine',
        'do_not_call', 'callback_scheduled', 'meeting_scheduled',
        'interested_nurture', 'qualified_handoff', 'not_interested_final'
      ),
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
    
    // Duration metrics
    duration: {
      type: DataTypes.INTEGER, // total call duration in seconds
      defaultValue: 0,
      allowNull: false
    },
    talkTime: {
      type: DataTypes.INTEGER, // actual conversation time
      allowNull: true
    },
    
    // Enhanced call notes with rich structure
    callNotes: {
      type: DataTypes.JSON,
      defaultValue: {
        summary: '',
        keyPoints: [],
        painPoints: [],
        interests: [],
        objections: [],
        nextSteps: []
      }
    },
    
    // Call quality scoring for coaching
    callQuality: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    
    // Coaching feedback system
    coachingFeedback: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    
    // Recording and transcription metadata
    recordingMetadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    
    // Follow-up action tracking
    followUpActions: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    
    // Performance metrics
    performanceMetrics: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    
    // Integration data
    integrationData: {
      type: DataTypes.JSON,
      defaultValue: {}
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
    
    // Categorization
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    category: {
      type: DataTypes.ENUM(
        'prospecting', 'qualification', 'demo', 'negotiation', 'closing',
        'follow_up', 'support', 'renewal', 'upsell', 'retention'
      ),
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    
    // Legacy SIP compatibility
    sipCallId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    sipStatus: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Cost tracking
    cost: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: true
    },
    
    // Follow-up flags (legacy compatibility)
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Technical metadata
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.INET,
      allowNull: true
    },
    
    // Additional metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false
    }
  }, {
    tableName: 'enhanced_call_logs',
    timestamps: true,
    indexes: [
      // Basic indexes
      { fields: ['leadId'] },
      { fields: ['phoneNumber'] },
      { fields: ['direction'] },
      { fields: ['status'] },
      { fields: ['outcome'] },
      { fields: ['disposition'] },
      { fields: ['initiatedAt'] },
      { fields: ['duration'] },
      { fields: ['agentId'] },
      { fields: ['category'] },
      { fields: ['priority'] },
      
      // Unique indexes
      {
        fields: ['sipCallId'],
        unique: true,
        where: {
          sipCallId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      
      // Composite indexes for complex queries
      { fields: ['leadId', 'initiatedAt'] },
      { fields: ['agentId', 'initiatedAt'] },
      { fields: ['status', 'outcome'] },
      { fields: ['direction', 'status'] },
      { fields: ['category', 'priority'] },
      { fields: ['followUpRequired', 'followUpDate'] },
      
      // JSON field indexes for PostgreSQL
      {
        fields: [sequelize.literal("((call_notes->>'summary'))")],
        name: 'call_notes_summary_idx'
      },
      {
        fields: [sequelize.literal("((recording_metadata->>'transcriptionStatus'))")], 
        name: 'transcription_status_idx'
      }
    ],
    
    // Hooks for automated processing
    hooks: {
      beforeCreate: async (callLog) => {
        // Auto-populate follow-up flags from actions
        if (callLog.followUpActions && callLog.followUpActions.length > 0) {
          callLog.followUpRequired = true;
          const nextAction = callLog.followUpActions
            .filter(action => action.status === 'pending')
            .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
          if (nextAction) {
            callLog.followUpDate = nextAction.scheduledDate;
          }
        }
        
        // Set default integration sync status
        if (!callLog.integrationData.crmSyncStatus) {
          callLog.integrationData.crmSyncStatus = 'pending';
        }
      },
      
      beforeUpdate: async (callLog) => {
        // Calculate talk time when call is completed
        if (callLog.changed('completedAt') && callLog.completedAt && callLog.answeredAt) {
          callLog.talkTime = Math.floor((new Date(callLog.completedAt) - new Date(callLog.answeredAt)) / 1000);
        }
        
        // Update performance metrics
        if (callLog.answeredAt && callLog.completedAt) {
          if (!callLog.performanceMetrics) callLog.performanceMetrics = {};
          callLog.performanceMetrics.conversationDuration = callLog.talkTime;
          callLog.performanceMetrics.dialToConnectTime = Math.floor(
            (new Date(callLog.answeredAt) - new Date(callLog.initiatedAt)) / 1000
          );
        }
        
        // Update follow-up flags based on actions
        const pendingActions = callLog.followUpActions?.filter(action => 
          action.status === 'pending'
        ) || [];
        callLog.followUpRequired = pendingActions.length > 0;
        
        if (pendingActions.length > 0) {
          const nextAction = pendingActions.sort((a, b) => 
            new Date(a.scheduledDate) - new Date(b.scheduledDate)
          )[0];
          callLog.followUpDate = nextAction.scheduledDate;
        } else {
          callLog.followUpDate = null;
        }
      }
    }
  });
  
  // Enhanced instance methods
  EnhancedCallLog.prototype.markAnswered = async function() {
    this.status = 'answered';
    this.answeredAt = new Date();
    await this.save();
  };
  
  EnhancedCallLog.prototype.markCompleted = async function(outcome, disposition = null, notes = {}) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.outcome = outcome;
    if (disposition) this.disposition = disposition;
    
    // Merge notes with existing call notes
    if (notes && Object.keys(notes).length > 0) {
      this.callNotes = {
        ...this.callNotes,
        ...notes
      };
    }
    
    // Calculate durations
    if (this.answeredAt) {
      this.duration = Math.floor((this.completedAt - this.initiatedAt) / 1000);
      this.talkTime = Math.floor((this.completedAt - this.answeredAt) / 1000);
    } else {
      this.duration = Math.floor((this.completedAt - this.initiatedAt) / 1000);
    }
    
    await this.save();
  };
  
  EnhancedCallLog.prototype.addRecording = async function(recordingData) {
    this.recordingMetadata = {
      ...this.recordingMetadata,
      ...recordingData,
      recordedAt: new Date()
    };
    await this.save();
  };
  
  EnhancedCallLog.prototype.addTranscription = async function(transcriptionData) {
    if (!this.recordingMetadata) this.recordingMetadata = {};
    
    this.recordingMetadata = {
      ...this.recordingMetadata,
      transcriptionStatus: 'completed',
      transcriptionText: transcriptionData.text,
      transcriptionAccuracy: transcriptionData.accuracy,
      speechAnalytics: transcriptionData.analytics,
      transcribedAt: new Date()
    };
    
    await this.save();
  };
  
  EnhancedCallLog.prototype.addFollowUpAction = async function(action) {
    if (!this.followUpActions) this.followUpActions = [];
    
    const newAction = {
      id: require('uuid').v4(),
      ...action,
      createdAt: new Date()
    };
    
    this.followUpActions.push(newAction);
    this.followUpRequired = true;
    
    // Update next follow-up date
    const pendingActions = this.followUpActions.filter(a => a.status === 'pending');
    if (pendingActions.length > 0) {
      const nextAction = pendingActions.sort((a, b) => 
        new Date(a.scheduledDate) - new Date(b.scheduledDate)
      )[0];
      this.followUpDate = nextAction.scheduledDate;
    }
    
    await this.save();
    return newAction;
  };
  
  EnhancedCallLog.prototype.completeFollowUpAction = async function(actionId, completionNotes = '') {
    if (!this.followUpActions) return null;
    
    const actionIndex = this.followUpActions.findIndex(a => a.id === actionId);
    if (actionIndex === -1) return null;
    
    this.followUpActions[actionIndex] = {
      ...this.followUpActions[actionIndex],
      status: 'completed',
      completedAt: new Date(),
      completionNotes
    };
    
    await this.save();
    return this.followUpActions[actionIndex];
  };
  
  EnhancedCallLog.prototype.addCoachingFeedback = async function(feedback, reviewerId) {
    this.coachingFeedback = {
      ...feedback,
      reviewedBy: reviewerId,
      reviewedAt: new Date()
    };
    await this.save();
  };
  
  EnhancedCallLog.prototype.updateCallQuality = async function(qualityScores) {
    // Calculate overall score if not provided
    if (!qualityScores.overallScore && qualityScores.technicalQuality) {
      const scores = [
        qualityScores.technicalQuality || 5,
        qualityScores.communicationSkill || 5,
        qualityScores.productKnowledge || 5,
        qualityScores.objectionHandling || 5,
        qualityScores.closingTechnique || 5
      ];
      qualityScores.overallScore = Math.round(
        scores.reduce((sum, score) => sum + score, 0) / scores.length * 10
      ) / 10;
    }
    
    this.callQuality = qualityScores;
    await this.save();
  };
  
  // Enhanced class methods
  EnhancedCallLog.validateData = (data) => {
    return enhancedCallLogValidationSchema.validate(data, { abortEarly: false });
  };
  
  EnhancedCallLog.getDetailedCallStats = async function(filters = {}) {
    const whereClause = {};
    
    if (filters.leadId) whereClause.leadId = filters.leadId;
    if (filters.agentId) whereClause.agentId = filters.agentId;
    if (filters.category) whereClause.category = filters.category;
    if (filters.outcome) whereClause.outcome = filters.outcome;
    if (filters.dateRange) {
      whereClause.initiatedAt = {
        [sequelize.Sequelize.Op.between]: [filters.dateRange.start, filters.dateRange.end]
      };
    }
    
    const calls = await EnhancedCallLog.findAll({
      where: whereClause,
      include: [{
        model: sequelize.models.Lead,
        as: 'lead',
        attributes: ['firstName', 'lastName', 'company', 'status']
      }]
    });
    
    return {
      total: calls.length,
      byOutcome: calls.reduce((acc, call) => {
        acc[call.outcome] = (acc[call.outcome] || 0) + 1;
        return acc;
      }, {}),
      byCategory: calls.reduce((acc, call) => {
        acc[call.category] = (acc[call.category] || 0) + 1;
        return acc;
      }, {}),
      averageQuality: calls.filter(call => call.callQuality?.overallScore)
        .reduce((sum, call, _, arr) => sum + call.callQuality.overallScore / arr.length, 0),
      followUpsPending: calls.filter(call => call.followUpRequired).length,
      recordingsCount: calls.filter(call => call.recordingMetadata?.recordingUrl).length,
      transcriptionsCount: calls.filter(call => 
        call.recordingMetadata?.transcriptionStatus === 'completed'
      ).length
    };
  };
  
  EnhancedCallLog.getCoachingInsights = async function(agentId, dateRange = null) {
    const whereClause = { agentId };
    if (dateRange) {
      whereClause.initiatedAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }
    
    const calls = await EnhancedCallLog.findAll({
      where: whereClause,
      order: [['initiatedAt', 'DESC']]
    });
    
    const qualityScores = calls
      .filter(call => call.callQuality)
      .map(call => call.callQuality);
    
    const coachingFeedback = calls
      .filter(call => call.coachingFeedback)
      .map(call => call.coachingFeedback);
    
    return {
      totalCalls: calls.length,
      averageQuality: qualityScores.length > 0 ? {
        overall: qualityScores.reduce((sum, q) => sum + q.overallScore, 0) / qualityScores.length,
        technical: qualityScores.reduce((sum, q) => sum + q.technicalQuality, 0) / qualityScores.length,
        communication: qualityScores.reduce((sum, q) => sum + q.communicationSkill, 0) / qualityScores.length,
        productKnowledge: qualityScores.reduce((sum, q) => sum + q.productKnowledge, 0) / qualityScores.length,
        objectionHandling: qualityScores.reduce((sum, q) => sum + q.objectionHandling, 0) / qualityScores.length,
        closing: qualityScores.reduce((sum, q) => sum + q.closingTechnique, 0) / qualityScores.length
      } : null,
      recentFeedback: coachingFeedback.slice(0, 5),
      improvementAreas: coachingFeedback
        .flatMap(feedback => feedback.improvements || [])
        .reduce((acc, improvement) => {
          acc[improvement] = (acc[improvement] || 0) + 1;
          return acc;
        }, {}),
      strengths: coachingFeedback
        .flatMap(feedback => feedback.strengths || [])
        .reduce((acc, strength) => {
          acc[strength] = (acc[strength] || 0) + 1;
          return acc;
        }, {})
    };
  };
  
  // Define associations
  EnhancedCallLog.associate = (models) => {
    EnhancedCallLog.belongsTo(models.Lead, {
      foreignKey: 'leadId',
      as: 'lead',
      onDelete: 'CASCADE'
    });
  };
  
  return EnhancedCallLog;
};

module.exports = { defineEnhancedCallLogModel, enhancedCallLogValidationSchema };