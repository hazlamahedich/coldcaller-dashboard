/**
 * Migration: Create Call Logs Table
 * Creates the call_logs table for tracking all call activities
 */

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Creating call_logs table...');
    
    await queryInterface.createTable('call_logs', {
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
        allowNull: false
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
        type: DataTypes.ENUM('connected', 'voicemail', 'no_answer', 'busy', 'failed', 'interested', 'not_interested', 'callback_requested', 'meeting_scheduled'),
        allowNull: true
      },
      
      // Timing
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
      
      // Metrics
      duration: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      talkTime: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      callQuality: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      
      // SIP/VoIP data
      sipCallId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
      },
      sipStatus: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      
      // Recording
      recordingUrl: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      recordingDuration: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      recordingSize: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      
      // Notes and agent info
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      agentId: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      agentName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      
      // Additional data
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {}
      },
      cost: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true
      },
      
      // Follow-up
      followUpRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
      },
      
      // Timestamps
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
    
    // Create indexes
    console.log('🔄 Creating indexes...');
    
    await queryInterface.addIndex('call_logs', ['leadId']);
    await queryInterface.addIndex('call_logs', ['phoneNumber']);
    await queryInterface.addIndex('call_logs', ['direction']);
    await queryInterface.addIndex('call_logs', ['status']);
    await queryInterface.addIndex('call_logs', ['outcome']);
    await queryInterface.addIndex('call_logs', ['initiatedAt']);
    await queryInterface.addIndex('call_logs', ['duration']);
    await queryInterface.addIndex('call_logs', ['agentId']);
    await queryInterface.addIndex('call_logs', ['sipCallId'], { unique: true });
    await queryInterface.addIndex('call_logs', ['followUpRequired', 'followUpDate']);
    
    // Composite indexes for common queries
    await queryInterface.addIndex('call_logs', ['leadId', 'initiatedAt']);
    await queryInterface.addIndex('call_logs', ['agentId', 'initiatedAt']);
    await queryInterface.addIndex('call_logs', ['status', 'outcome']);
    await queryInterface.addIndex('call_logs', ['direction', 'status']);
    
    console.log('✅ Call logs table created successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Dropping call_logs table...');
    await queryInterface.dropTable('call_logs');
    console.log('✅ Call logs table dropped');
  }
};