/**
 * Note Model - Advanced note-taking with templates, collaboration, and analytics
 */

const { DataTypes } = require('sequelize');
const Joi = require('joi');

// Validation schema
const noteValidationSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  callId: Joi.string().uuid().allow(null),
  templateId: Joi.string().max(50).allow(null),
  type: Joi.string().valid('cold-call', 'follow-up', 'demo-presentation', 'closing-call', 'general', 'custom').required(),
  title: Joi.string().max(200).allow(null, ''),
  content: Joi.string().max(10000).required(),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  quality: Joi.number().min(0).max(100).default(0),
  followUpRequired: Joi.boolean().default(false),
  followUpDate: Joi.date().allow(null),
  collaborators: Joi.array().items(Joi.string().uuid()).default([]),
  version: Joi.number().min(1).default(1),
  isArchived: Joi.boolean().default(false),
  metadata: Joi.object().default({})
});

const defineNoteModel = (sequelize) => {
  const Note = sequelize.define('Note', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Foreign keys
    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'leads',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    
    callId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'call_logs',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    
    // Template and type
    templateId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      index: true
    },
    
    type: {
      type: DataTypes.ENUM('cold-call', 'follow-up', 'demo-presentation', 'closing-call', 'general', 'custom'),
      allowNull: false,
      defaultValue: 'general',
      index: true
    },
    
    // Content
    title: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      validate: {
        len: [1, 10000]
      }
    },
    
    // Rich text content with formatting
    richContent: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },
    
    // Organizational
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false
    },
    
    // Quality and analytics
    quality: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    
    wordCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    
    readingTime: {
      type: DataTypes.INTEGER, // in seconds
      defaultValue: 0,
      allowNull: false
    },
    
    // Follow-up management
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      index: true
    },
    
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true,
      index: true
    },
    
    followUpCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    
    // Collaboration
    authorId: {
      type: DataTypes.UUID,
      allowNull: true,
      index: true
    },
    
    authorName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    collaborators: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false
    },
    
    // Version control
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    
    parentNoteId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'notes',
        key: 'id'
      }
    },
    
    // Status
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived', 'deleted'),
      defaultValue: 'published',
      allowNull: false,
      index: true
    },
    
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      index: true
    },
    
    // Analytics data
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    
    lastViewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // AI-generated insights
    sentiment: {
      type: DataTypes.ENUM('positive', 'neutral', 'negative'),
      allowNull: true
    },
    
    keyTopics: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false
    },
    
    actionItems: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false
    },
    
    // Search optimization
    searchVector: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Additional metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false
    }
    
  }, {
    tableName: 'notes',
    timestamps: true,
    indexes: [
      // Primary search indexes
      {
        fields: ['leadId', 'createdAt']
      },
      {
        fields: ['callId']
      },
      {
        fields: ['type', 'createdAt']
      },
      {
        fields: ['authorId', 'createdAt']
      },
      {
        fields: ['quality']
      },
      {
        fields: ['followUpRequired', 'followUpDate']
      },
      {
        fields: ['status', 'isArchived']
      },
      {
        fields: ['templateId']
      },
      // Full-text search index
      {
        name: 'note_content_search',
        fields: ['content'],
        type: 'FULLTEXT'
      },
      // Tag search optimization
      {
        name: 'note_tags_gin',
        fields: ['tags'],
        using: 'gin',
        where: {
          tags: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      }
    ],
    
    // Hooks for automated processing
    hooks: {
      beforeValidate: (note) => {
        // Calculate word count
        if (note.content) {
          const words = note.content.trim().split(/\s+/).filter(word => word.length > 0);
          note.wordCount = words.length;
          note.readingTime = Math.ceil(words.length / 200); // Average reading speed: 200 wpm
        }
        
        // Generate search vector
        if (note.content && note.tags) {
          const searchText = [
            note.content,
            note.title || '',
            ...(note.tags || [])
          ].join(' ').toLowerCase();
          note.searchVector = searchText;
        }
      },
      
      afterCreate: async (note) => {
        // Auto-calculate quality score on creation
        if (!note.quality || note.quality === 0) {
          note.quality = await Note.calculateQuality(note);
          await note.save();
        }
      },
      
      afterUpdate: async (note) => {
        // Recalculate quality if content changed
        if (note.changed('content')) {
          note.quality = await Note.calculateQuality(note);
        }
      }
    }
  });
  
  // Instance methods
  Note.prototype.incrementViewCount = async function() {
    this.viewCount += 1;
    this.lastViewedAt = new Date();
    await this.save(['viewCount', 'lastViewedAt']);
  };
  
  Note.prototype.addTag = async function(tag) {
    if (!this.tags.includes(tag)) {
      this.tags = [...this.tags, tag];
      await this.save(['tags']);
    }
  };
  
  Note.prototype.removeTag = async function(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    await this.save(['tags']);
  };
  
  Note.prototype.addCollaborator = async function(userId) {
    if (!this.collaborators.includes(userId)) {
      this.collaborators = [...this.collaborators, userId];
      await this.save(['collaborators']);
    }
  };
  
  Note.prototype.removeCollaborator = async function(userId) {
    this.collaborators = this.collaborators.filter(id => id !== userId);
    await this.save(['collaborators']);
  };
  
  Note.prototype.createVersion = async function(changes) {
    // Create a new version of the note
    const newVersion = await Note.create({
      ...this.toJSON(),
      id: undefined, // Let it generate a new ID
      parentNoteId: this.id,
      version: this.version + 1,
      ...changes,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return newVersion;
  };
  
  Note.prototype.archive = async function() {
    this.isArchived = true;
    this.status = 'archived';
    await this.save(['isArchived', 'status']);
  };
  
  Note.prototype.restore = async function() {
    this.isArchived = false;
    this.status = 'published';
    await this.save(['isArchived', 'status']);
  };
  
  // Class methods
  Note.validateData = (data) => {
    return noteValidationSchema.validate(data, { abortEarly: false });
  };
  
  Note.calculateQuality = async function(note) {
    let score = 0;
    const content = note.content || '';
    
    // Length scoring (0-20 points)
    if (content.length > 50) score += 5;
    if (content.length > 200) score += 5;
    if (content.length > 500) score += 5;
    if (content.length > 1000) score += 5;
    
    // Structure scoring (0-25 points)
    if (content.includes('#')) score += 5; // Has headings
    if (content.includes('-') || content.includes('*')) score += 5; // Has lists
    if (content.includes('[') && content.includes(']')) score += 5; // Has checkboxes or links
    if (content.split('\n').length > 5) score += 5; // Multi-paragraph
    if (note.tags && note.tags.length > 0) score += 5; // Has tags
    
    // Content quality keywords (0-30 points)
    const qualityKeywords = [
      'discussed', 'agreed', 'decided', 'action', 'follow-up', 'next steps',
      'outcome', 'result', 'feedback', 'concern', 'opportunity', 'challenge',
      'timeline', 'budget', 'decision maker', 'pain point', 'solution'
    ];
    
    qualityKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        score += 2; // Max 30 points (15 keywords * 2 points)
      }
    });
    
    // Template usage bonus (0-15 points)
    if (note.templateId) score += 10;
    if (note.type !== 'general') score += 5;
    
    // Collaboration and follow-up (0-10 points)
    if (note.followUpRequired) score += 5;
    if (note.collaborators && note.collaborators.length > 0) score += 5;
    
    return Math.min(score, 100);
  };
  
  Note.searchNotes = async function(query, options = {}) {
    const {
      leadId,
      callId,
      type,
      tags,
      authorId,
      qualityMin = 0,
      qualityMax = 100,
      dateFrom,
      dateTo,
      includeArchived = false,
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'DESC'
    } = options;
    
    const whereClause = {};
    
    // Basic filters
    if (leadId) whereClause.leadId = leadId;
    if (callId) whereClause.callId = callId;
    if (type) whereClause.type = type;
    if (authorId) whereClause.authorId = authorId;
    if (!includeArchived) whereClause.isArchived = false;
    
    // Quality range
    whereClause.quality = {
      [sequelize.Sequelize.Op.between]: [qualityMin, qualityMax]
    };
    
    // Date range
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[sequelize.Sequelize.Op.gte] = dateFrom;
      if (dateTo) whereClause.createdAt[sequelize.Sequelize.Op.lte] = dateTo;
    }
    
    // Tag filter
    if (tags && tags.length > 0) {
      whereClause.tags = {
        [sequelize.Sequelize.Op.overlap]: tags
      };
    }
    
    // Text search
    if (query && query.trim()) {
      whereClause[sequelize.Sequelize.Op.or] = [
        {
          content: {
            [sequelize.Sequelize.Op.iLike]: `%${query}%`
          }
        },
        {
          title: {
            [sequelize.Sequelize.Op.iLike]: `%${query}%`
          }
        },
        {
          searchVector: {
            [sequelize.Sequelize.Op.iLike]: `%${query.toLowerCase()}%`
          }
        }
      ];
    }
    
    const notes = await Note.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.Lead,
          as: 'lead',
          attributes: ['firstName', 'lastName', 'company']
        },
        {
          model: sequelize.models.CallLog,
          as: 'call',
          attributes: ['outcome', 'duration', 'initiatedAt']
        }
      ],
      order: [[orderBy, orderDirection]],
      limit,
      offset
    });
    
    return notes;
  };
  
  Note.getNoteAnalytics = async function(leadId = null, dateRange = null) {
    const whereClause = { isArchived: false };
    if (leadId) whereClause.leadId = leadId;
    
    if (dateRange && dateRange.start && dateRange.end) {
      whereClause.createdAt = {
        [sequelize.Sequelize.Op.between]: [dateRange.start, dateRange.end]
      };
    }
    
    const notes = await Note.findAll({
      where: whereClause,
      attributes: [
        'type',
        'quality',
        'tags',
        'wordCount',
        'createdAt',
        'followUpRequired',
        'sentiment'
      ]
    });
    
    // Calculate analytics
    const analytics = {
      totalNotes: notes.length,
      averageQuality: Math.round(
        notes.reduce((sum, note) => sum + note.quality, 0) / notes.length
      ),
      averageWordCount: Math.round(
        notes.reduce((sum, note) => sum + note.wordCount, 0) / notes.length
      ),
      notesByType: {},
      qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      tagFrequency: {},
      followUpRate: 0,
      timelineData: []
    };
    
    notes.forEach(note => {
      // Count by type
      analytics.notesByType[note.type] = (analytics.notesByType[note.type] || 0) + 1;
      
      // Quality distribution
      if (note.quality >= 80) analytics.qualityDistribution.excellent++;
      else if (note.quality >= 60) analytics.qualityDistribution.good++;
      else if (note.quality >= 40) analytics.qualityDistribution.fair++;
      else analytics.qualityDistribution.poor++;
      
      // Sentiment distribution
      if (note.sentiment) {
        analytics.sentimentDistribution[note.sentiment]++;
      }
      
      // Tag frequency
      note.tags.forEach(tag => {
        analytics.tagFrequency[tag] = (analytics.tagFrequency[tag] || 0) + 1;
      });
      
      // Follow-up rate
      if (note.followUpRequired) analytics.followUpRate++;
    });
    
    analytics.followUpRate = Math.round((analytics.followUpRate / notes.length) * 100);
    
    return analytics;
  };
  
  Note.getRecentNotes = async function(leadId, limit = 10) {
    return await Note.findAll({
      where: { 
        leadId, 
        isArchived: false 
      },
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        {
          model: sequelize.models.CallLog,
          as: 'call',
          attributes: ['outcome', 'duration', 'initiatedAt']
        }
      ]
    });
  };
  
  // Define associations
  Note.associate = (models) => {
    Note.belongsTo(models.Lead, {
      foreignKey: 'leadId',
      as: 'lead',
      onDelete: 'CASCADE'
    });
    
    Note.belongsTo(models.CallLog, {
      foreignKey: 'callId',
      as: 'call',
      onDelete: 'SET NULL'
    });
    
    Note.belongsTo(models.Note, {
      foreignKey: 'parentNoteId',
      as: 'parentNote'
    });
    
    Note.hasMany(models.Note, {
      foreignKey: 'parentNoteId',
      as: 'versions'
    });
  };
  
  return Note;
};

module.exports = { defineNoteModel, noteValidationSchema };