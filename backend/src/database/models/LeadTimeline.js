/**
 * LeadTimeline Model
 * Stores timeline entries for lead interactions including meetings, calls, emails, etc.
 */

const { DataTypes } = require('sequelize');

const defineLeadTimelineModel = (sequelize) => {
  const LeadTimeline = sequelize.define('LeadTimeline', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Leads',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        'call',
        'email', 
        'meeting_scheduled',
        'meeting_completed',
        'meeting_cancelled',
        'meeting_updated',
        'note_added',
        'status_changed',
        'follow_up_scheduled',
        'follow_up_completed',
        'document_shared',
        'proposal_sent',
        'contract_signed',
        'payment_received',
        'lead_created',
        'lead_updated',
        'opportunity_created',
        'task_created',
        'task_completed',
        'reminder_set',
        'tag_added',
        'tag_removed',
        'custom'
      ),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    relatedEntityType: {
      type: DataTypes.ENUM('meeting', 'call_log', 'email', 'task', 'opportunity', 'document'),
      allowNull: true
    },
    relatedEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isVisible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'lead_timeline',
    indexes: [
      {
        fields: ['leadId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['timestamp']
      },
      {
        fields: ['relatedEntityType', 'relatedEntityId']
      },
      {
        fields: ['isVisible']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['leadId', 'timestamp']
      }
    ]
  });

  // Instance methods
  LeadTimeline.prototype.getRelativeTime = function() {
    const now = new Date();
    const timestamp = new Date(this.timestamp);
    const diffMs = now - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  LeadTimeline.prototype.getIcon = function() {
    const iconMap = {
      call: '📞',
      email: '📧',
      meeting_scheduled: '📅',
      meeting_completed: '✅',
      meeting_cancelled: '❌',
      meeting_updated: '📝',
      note_added: '📝',
      status_changed: '🔄',
      follow_up_scheduled: '⏰',
      follow_up_completed: '✅',
      document_shared: '📄',
      proposal_sent: '📊',
      contract_signed: '📋',
      payment_received: '💰',
      lead_created: '👤',
      lead_updated: '✏️',
      opportunity_created: '🎯',
      task_created: '📋',
      task_completed: '✅',
      reminder_set: '🔔',
      tag_added: '🏷️',
      tag_removed: '🏷️',
      custom: '📌'
    };
    return iconMap[this.type] || '📌';
  };

  LeadTimeline.prototype.getColorClass = function() {
    const colorMap = {
      call: 'blue',
      email: 'purple',
      meeting_scheduled: 'green',
      meeting_completed: 'green',
      meeting_cancelled: 'red',
      meeting_updated: 'orange',
      note_added: 'gray',
      status_changed: 'blue',
      follow_up_scheduled: 'yellow',
      follow_up_completed: 'green',
      document_shared: 'indigo',
      proposal_sent: 'purple',
      contract_signed: 'green',
      payment_received: 'green',
      lead_created: 'blue',
      lead_updated: 'blue',
      opportunity_created: 'purple',
      task_created: 'orange',
      task_completed: 'green',
      reminder_set: 'yellow',
      tag_added: 'teal',
      tag_removed: 'red',
      custom: 'gray'
    };
    return colorMap[this.type] || 'gray';
  };

  LeadTimeline.prototype.hide = async function() {
    this.isVisible = false;
    return this.save();
  };

  LeadTimeline.prototype.show = async function() {
    this.isVisible = true;
    return this.save();
  };

  LeadTimeline.prototype.addTag = async function(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      return this.save();
    }
  };

  LeadTimeline.prototype.removeTag = async function(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    return this.save();
  };

  LeadTimeline.prototype.addAttachment = async function(attachment) {
    this.attachments.push(attachment);
    return this.save();
  };

  LeadTimeline.prototype.updateMetadata = async function(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
    return this.save();
  };

  // Class methods
  LeadTimeline.createEntry = async function(leadId, userId, entryData) {
    const {
      type,
      title,
      description,
      data = {},
      relatedEntityType = null,
      relatedEntityId = null,
      priority = 'medium',
      tags = [],
      attachments = [],
      metadata = {},
      timestamp = new Date()
    } = entryData;

    return await LeadTimeline.create({
      leadId,
      userId,
      type,
      title,
      description,
      data,
      relatedEntityType,
      relatedEntityId,
      priority,
      tags,
      attachments,
      metadata,
      timestamp,
      isSystem: false,
      isVisible: true
    });
  };

  LeadTimeline.createSystemEntry = async function(leadId, userId, entryData) {
    const entry = await LeadTimeline.createEntry(leadId, userId, entryData);
    entry.isSystem = true;
    return entry.save();
  };

  LeadTimeline.getLeadTimeline = async function(leadId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      types = null,
      startDate = null,
      endDate = null,
      includeHidden = false,
      priority = null
    } = options;

    const where = { leadId };

    if (types && Array.isArray(types)) {
      where.type = {
        [require('sequelize').Op.in]: types
      };
    }

    if (startDate && endDate) {
      where.timestamp = {
        [require('sequelize').Op.between]: [startDate, endDate]
      };
    }

    if (!includeHidden) {
      where.isVisible = true;
    }

    if (priority) {
      where.priority = priority;
    }

    return await LeadTimeline.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });
  };

  LeadTimeline.getRecentActivity = async function(leadId, days = 30, limit = 10) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await LeadTimeline.findAll({
      where: {
        leadId,
        timestamp: {
          [require('sequelize').Op.gte]: startDate
        },
        isVisible: true
      },
      order: [['timestamp', 'DESC']],
      limit
    });
  };

  LeadTimeline.getUpcomingEvents = async function(leadId, days = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return await LeadTimeline.findAll({
      where: {
        leadId,
        type: {
          [require('sequelize').Op.in]: ['meeting_scheduled', 'follow_up_scheduled']
        },
        timestamp: {
          [require('sequelize').Op.between]: [new Date(), endDate]
        },
        isVisible: true
      },
      order: [['timestamp', 'ASC']]
    });
  };

  LeadTimeline.getActivitySummary = async function(leadId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await LeadTimeline.findAll({
      where: {
        leadId,
        timestamp: {
          [require('sequelize').Op.gte]: startDate
        },
        isVisible: true
      },
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['type']
    });

    const summary = {};
    activities.forEach(activity => {
      summary[activity.type] = parseInt(activity.dataValues.count);
    });

    return summary;
  };

  LeadTimeline.searchTimeline = async function(leadId, query, options = {}) {
    const {
      limit = 50,
      offset = 0
    } = options;

    return await LeadTimeline.findAll({
      where: {
        leadId,
        isVisible: true,
        [require('sequelize').Op.or]: [
          {
            title: {
              [require('sequelize').Op.iLike]: `%${query}%`
            }
          },
          {
            description: {
              [require('sequelize').Op.iLike]: `%${query}%`
            }
          }
        ]
      },
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });
  };

  LeadTimeline.bulkCreateEntries = async function(entries) {
    return await LeadTimeline.bulkCreate(entries, {
      validate: true
    });
  };

  LeadTimeline.deleteOldEntries = async function(olderThanDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    return await LeadTimeline.destroy({
      where: {
        timestamp: {
          [require('sequelize').Op.lt]: cutoffDate
        },
        type: {
          [require('sequelize').Op.notIn]: [
            'meeting_scheduled',
            'meeting_completed',
            'contract_signed',
            'payment_received'
          ]
        }
      }
    });
  };

  LeadTimeline.getTimelineStats = async function(leadId) {
    const total = await LeadTimeline.count({
      where: { leadId, isVisible: true }
    });

    const byType = await LeadTimeline.findAll({
      where: { leadId, isVisible: true },
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['type']
    });

    const lastActivity = await LeadTimeline.findOne({
      where: { leadId, isVisible: true },
      order: [['timestamp', 'DESC']]
    });

    const firstActivity = await LeadTimeline.findOne({
      where: { leadId, isVisible: true },
      order: [['timestamp', 'ASC']]
    });

    return {
      total,
      byType: byType.map(item => ({
        type: item.type,
        count: parseInt(item.dataValues.count)
      })),
      lastActivity: lastActivity ? lastActivity.timestamp : null,
      firstActivity: firstActivity ? firstActivity.timestamp : null
    };
  };

  // Associations
  LeadTimeline.associate = (models) => {
    LeadTimeline.belongsTo(models.Lead, { foreignKey: 'leadId', as: 'Lead' });
    LeadTimeline.belongsTo(models.User, { foreignKey: 'userId', as: 'User' });
  };

  return LeadTimeline;
};

module.exports = { defineLeadTimelineModel };