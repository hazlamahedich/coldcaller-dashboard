/**
 * Email Sync Model
 * Stores synchronized email data and threading information
 */

const { DataTypes } = require('sequelize');

const defineEmailSyncModel = (sequelize) => {
  const EmailSync = sequelize.define('EmailSync', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    integrationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'integration_settings',
        key: 'id'
      }
    },
    leadId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Leads',
        key: 'id'
      }
    },
    externalMessageId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    threadId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    subject: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    snippet: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    bodyHtml: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sender: {
      type: DataTypes.JSON,
      allowNull: false
    },
    recipients: {
      type: DataTypes.JSON,
      defaultValue: {
        to: [],
        cc: [],
        bcc: []
      }
    },
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isImportant: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isStarred: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    hasAttachments: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    labels: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    folder: {
      type: DataTypes.STRING,
      allowNull: true
    },
    categories: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high'),
      defaultValue: 'normal'
    },
    sentimentScore: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: -1.0,
        max: 1.0
      }
    },
    intentClassification: {
      type: DataTypes.ENUM('inquiry', 'complaint', 'compliment', 'request', 'follow_up', 'other'),
      allowNull: true
    },
    keyPhrases: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    actionItems: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    externalMetadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    syncStatus: {
      type: DataTypes.ENUM('synced', 'pending', 'error', 'deleted'),
      defaultValue: 'synced'
    },
    localChanges: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'email_syncs',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['integrationId']
      },
      {
        fields: ['leadId']
      },
      {
        fields: ['externalMessageId', 'integrationId'],
        unique: true
      },
      {
        fields: ['threadId']
      },
      {
        fields: ['direction']
      },
      {
        fields: ['sentAt']
      },
      {
        fields: ['isRead']
      },
      {
        fields: ['isImportant']
      },
      {
        fields: ['hasAttachments']
      },
      {
        fields: ['syncStatus']
      },
      {
        fields: ['sentimentScore']
      },
      {
        fields: ['intentClassification']
      }
    ],
    hooks: {
      beforeCreate: (email) => {
        email.lastSyncedAt = new Date();
        // Auto-link to lead based on email addresses
        if (!email.leadId && email.sender && email.sender.email) {
          // This would typically be done in a service layer
          email.linkToLeadByEmail(email.sender.email);
        }
      },
      beforeUpdate: (email) => {
        if (email.changed()) {
          email.lastSyncedAt = new Date();
        }
      }
    }
  });

  // Instance methods
  EmailSync.prototype.isFromLead = function() {
    return this.direction === 'inbound';
  };

  EmailSync.prototype.isToLead = function() {
    return this.direction === 'outbound';
  };

  EmailSync.prototype.getConversationEmails = async function() {
    return await EmailSync.findAll({
      where: {
        threadId: this.threadId,
        userId: this.userId
      },
      order: [['sentAt', 'ASC']]
    });
  };

  EmailSync.prototype.markAsRead = async function() {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  };

  EmailSync.prototype.toggleStar = async function() {
    this.isStarred = !this.isStarred;
    return this.save();
  };

  EmailSync.prototype.addLabel = async function(label) {
    if (!this.labels.includes(label)) {
      this.labels = [...this.labels, label];
      return this.save();
    }
    return this;
  };

  EmailSync.prototype.removeLabel = async function(label) {
    this.labels = this.labels.filter(l => l !== label);
    return this.save();
  };

  EmailSync.prototype.linkToLead = async function(leadId) {
    this.leadId = leadId;
    return this.save();
  };

  EmailSync.prototype.unlinkFromLead = async function() {
    this.leadId = null;
    return this.save();
  };

  EmailSync.prototype.linkToLeadByEmail = async function(emailAddress) {
    // This would typically query the Lead model to find matching leads
    // For now, we'll just store the intent to link
    if (!this.localChanges) {
      this.localChanges = {};
    }
    this.localChanges.pendingLeadLink = emailAddress;
    return this.save();
  };

  EmailSync.prototype.analyzeSentiment = function() {
    // This would integrate with a sentiment analysis service
    // For now, we'll do a simple keyword-based analysis
    if (!this.body) return 0;
    
    const positiveWords = ['good', 'great', 'excellent', 'wonderful', 'fantastic', 'pleased', 'happy', 'satisfied'];
    const negativeWords = ['bad', 'terrible', 'awful', 'disappointed', 'unhappy', 'frustrated', 'angry', 'upset'];
    
    const text = this.body.toLowerCase();
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return Math.min(0.8, positiveCount * 0.2);
    } else if (negativeCount > positiveCount) {
      return Math.max(-0.8, negativeCount * -0.2);
    }
    
    return 0;
  };

  EmailSync.prototype.extractActionItems = function() {
    if (!this.body) return [];
    
    const actionPhrases = [
      /please (.*?)(?:\.|$)/gi,
      /can you (.*?)(?:\.|$)/gi,
      /could you (.*?)(?:\.|$)/gi,
      /need to (.*?)(?:\.|$)/gi,
      /should (.*?)(?:\.|$)/gi,
      /action.*?:(.*?)(?:\n|$)/gi
    ];
    
    const actions = [];
    actionPhrases.forEach(pattern => {
      const matches = [...this.body.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && match[1].trim()) {
          actions.push(match[1].trim());
        }
      });
    });
    
    return actions.slice(0, 5); // Limit to 5 action items
  };

  // Class methods
  EmailSync.findByThread = async function(userId, threadId) {
    return await EmailSync.findAll({
      where: { userId, threadId },
      order: [['sentAt', 'ASC']]
    });
  };

  EmailSync.findUnread = async function(userId, limit = 50) {
    return await EmailSync.findAll({
      where: {
        userId,
        isRead: false,
        direction: 'inbound'
      },
      order: [['sentAt', 'DESC']],
      limit
    });
  };

  EmailSync.findByLead = async function(leadId, limit = 100) {
    return await EmailSync.findAll({
      where: { leadId },
      order: [['sentAt', 'DESC']],
      limit
    });
  };

  EmailSync.findByEmailAddress = async function(userId, emailAddress) {
    const { Op } = require('sequelize');
    return await EmailSync.findAll({
      where: {
        userId,
        [Op.or]: [
          { 'sender.email': emailAddress },
          { 'recipients.to': { [Op.contains]: [{ email: emailAddress }] } },
          { 'recipients.cc': { [Op.contains]: [{ email: emailAddress }] } }
        ]
      },
      order: [['sentAt', 'DESC']]
    });
  };

  // Associations
  EmailSync.associate = (models) => {
    // EmailSync.belongsTo(models.IntegrationSettings, { foreignKey: 'integrationId', as: 'integration' });
    // EmailSync.belongsTo(models.User, { foreignKey: 'userId' });
    // EmailSync.belongsTo(models.Lead, { foreignKey: 'leadId', as: 'lead' });
  };

  return EmailSync;
};

module.exports = { defineEmailSyncModel };