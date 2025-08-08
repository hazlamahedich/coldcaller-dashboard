/**
 * Migration: Create Leads Table
 * Creates the main leads table with all necessary fields and indexes
 */

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Creating leads table...');
    
    await queryInterface.createTable('leads', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      
      // Basic information
      firstName: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      lastName: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      
      // Contact information
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      alternatePhone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      
      // Company information
      company: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      industry: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      companySize: {
        type: DataTypes.ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
        allowNull: true
      },
      website: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      
      // Status and priority
      status: {
        type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing'),
        defaultValue: 'new',
        allowNull: false
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
        allowNull: false
      },
      leadSource: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      
      // Address
      addressStreet: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      addressCity: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      addressState: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      addressZip: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      addressCountry: {
        type: DataTypes.STRING(50),
        defaultValue: 'USA',
        allowNull: false
      },
      
      // Scoring and metrics
      leadScore: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      conversionProbability: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0.00
      },
      estimatedValue: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      },
      
      // Timing and follow-up
      lastContactDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      nextFollowUpDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      timeZone: {
        type: DataTypes.STRING(50),
        defaultValue: 'UTC'
      },
      bestCallTime: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      
      // Notes and tags
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      tags: {
        type: DataTypes.JSON,
        defaultValue: []
      },
      
      // Assignment
      assignedTo: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      teamId: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      
      // Tracking metrics
      callAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      emailsSent: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      meetingsScheduled: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      
      // Data quality
      dataQualityScore: {
        type: DataTypes.INTEGER,
        defaultValue: 50
      },
      duplicateCheckHash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
      },
      
      // Compliance
      consentGiven: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      consentDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      doNotCall: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      doNotEmail: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      
      // Lifecycle
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      archivedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      archivedReason: {
        type: DataTypes.STRING(255),
        allowNull: true
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
    
    // Create indexes for performance
    console.log('🔄 Creating indexes...');
    
    await queryInterface.addIndex('leads', ['email'], { unique: true });
    await queryInterface.addIndex('leads', ['phone']);
    await queryInterface.addIndex('leads', ['company']);
    await queryInterface.addIndex('leads', ['status']);
    await queryInterface.addIndex('leads', ['priority']);
    await queryInterface.addIndex('leads', ['assignedTo']);
    await queryInterface.addIndex('leads', ['leadScore']);
    await queryInterface.addIndex('leads', ['nextFollowUpDate']);
    await queryInterface.addIndex('leads', ['duplicateCheckHash'], { unique: true });
    await queryInterface.addIndex('leads', ['isActive']);
    await queryInterface.addIndex('leads', ['createdAt']);
    await queryInterface.addIndex('leads', ['updatedAt']);
    
    // Composite indexes for common queries
    await queryInterface.addIndex('leads', ['status', 'priority']);
    await queryInterface.addIndex('leads', ['assignedTo', 'status']);
    await queryInterface.addIndex('leads', ['isActive', 'status']);
    
    console.log('✅ Leads table created successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Dropping leads table...');
    await queryInterface.dropTable('leads');
    console.log('✅ Leads table dropped');
  }
};