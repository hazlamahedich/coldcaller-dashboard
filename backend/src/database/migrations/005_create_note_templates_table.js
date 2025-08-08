/**
 * Migration: Create note templates table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('note_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      
      // Template identification
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      icon: {
        type: Sequelize.STRING(10),
        defaultValue: '📝',
        allowNull: false
      },
      
      // Categorization
      category: {
        type: Sequelize.ENUM('sales', 'support', 'follow-up', 'meeting', 'custom'),
        allowNull: false,
        defaultValue: 'custom'
      },
      
      // Template structure
      fields: {
        type: Sequelize.JSON,
        allowNull: false
      },
      
      // Template metadata
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      
      // Creator and sharing
      creatorId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      
      creatorName: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      
      isSystem: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      
      // Status and usage
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      
      lastUsedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      
      // Rating and feedback
      averageRating: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true
      },
      
      ratingCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      
      // Additional metadata
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
        allowNull: false
      },
      
      // Search optimization
      searchTags: {
        type: Sequelize.JSON,
        defaultValue: [],
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
    await queryInterface.addIndex('note_templates', ['category', 'isActive']);
    await queryInterface.addIndex('note_templates', ['isPublic', 'isActive']);
    await queryInterface.addIndex('note_templates', ['creatorId']);
    await queryInterface.addIndex('note_templates', ['usageCount']);
    await queryInterface.addIndex('note_templates', ['averageRating']);
    await queryInterface.addIndex('note_templates', ['slug'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('note_templates');
  }
};