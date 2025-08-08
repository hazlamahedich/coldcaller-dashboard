/**
 * Migration: Create Contacts Table
 * Creates the contacts table for managing multiple contact points per lead
 */

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Creating contacts table...');
    
    await queryInterface.createTable('contacts', {
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
      
      // Contact type
      type: {
        type: DataTypes.ENUM('phone', 'email', 'address', 'social'),
        allowNull: false
      },
      
      // Contact value
      value: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      
      // Label for this contact
      label: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      
      // Primary contact for this type
      isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      
      // Verification status
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      
      // Active status
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      
      // Additional metadata
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {}
      },
      
      // Verification tracking
      lastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      verificationAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      
      // Timestamps
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });
    
    // Create indexes
    console.log('🔄 Creating indexes...');
    
    await queryInterface.addIndex('contacts', ['leadId']);
    await queryInterface.addIndex('contacts', ['type']);
    await queryInterface.addIndex('contacts', ['value']);
    await queryInterface.addIndex('contacts', ['isPrimary']);
    await queryInterface.addIndex('contacts', ['isVerified']);
    await queryInterface.addIndex('contacts', ['isActive']);
    
    // Composite indexes
    await queryInterface.addIndex('contacts', ['leadId', 'type']);
    await queryInterface.addIndex('contacts', ['leadId', 'type', 'isPrimary']);
    await queryInterface.addIndex('contacts', ['type', 'isActive']);
    
    console.log('✅ Contacts table created successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Dropping contacts table...');
    await queryInterface.dropTable('contacts');
    console.log('✅ Contacts table dropped');
  }
};