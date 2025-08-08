/**
 * Migration: Create notes table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      
      // Foreign keys
      leadId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'leads',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      
      callId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'call_logs',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      
      // Template and type
      templateId: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      
      type: {
        type: Sequelize.ENUM('cold-call', 'follow-up', 'demo-presentation', 'closing-call', 'general', 'custom'),
        allowNull: false,
        defaultValue: 'general'
      },
      
      // Content
      title: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      
      content: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      },
      
      richContent: {
        type: Sequelize.JSON,
        allowNull: true
      },
      
      // Organizational
      tags: {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: false
      },
      
      // Quality and analytics
      quality: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      
      wordCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      
      readingTime: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      
      // Follow-up management
      followUpRequired: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      
      followUpDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      followUpCompleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      
      // Collaboration
      authorId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      
      authorName: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      
      collaborators: {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: false
      },
      
      // Version control
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      
      parentNoteId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'notes',
          key: 'id'
        }
      },
      
      // Status
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived', 'deleted'),
        defaultValue: 'published',
        allowNull: false
      },
      
      isArchived: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      
      // Analytics data
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      
      lastViewedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // AI-generated insights
      sentiment: {
        type: Sequelize.ENUM('positive', 'neutral', 'negative'),
        allowNull: true
      },
      
      keyTopics: {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: false
      },
      
      actionItems: {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: false
      },
      
      // Search optimization
      searchVector: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Additional metadata
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
        allowNull: false
      },
      
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('notes', ['leadId', 'createdAt']);
    await queryInterface.addIndex('notes', ['callId']);
    await queryInterface.addIndex('notes', ['type', 'createdAt']);
    await queryInterface.addIndex('notes', ['authorId', 'createdAt']);
    await queryInterface.addIndex('notes', ['quality']);
    await queryInterface.addIndex('notes', ['followUpRequired', 'followUpDate']);
    await queryInterface.addIndex('notes', ['status', 'isArchived']);
    await queryInterface.addIndex('notes', ['templateId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notes');
  }
};