/**
 * Migration: Create Enhanced Call Logs Table
 * Creates the enhanced_call_logs table with comprehensive call documentation features
 */

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Creating enhanced_call_logs table...');
    
    await queryInterface.createTable('enhanced_call_logs', {
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
    
    // Create indexes for performance
    console.log('🔄 Creating indexes...');
    
    // Basic indexes
    await queryInterface.addIndex('enhanced_call_logs', ['leadId']);
    await queryInterface.addIndex('enhanced_call_logs', ['phoneNumber']);
    await queryInterface.addIndex('enhanced_call_logs', ['direction']);
    await queryInterface.addIndex('enhanced_call_logs', ['status']);
    await queryInterface.addIndex('enhanced_call_logs', ['outcome']);
    await queryInterface.addIndex('enhanced_call_logs', ['disposition']);
    await queryInterface.addIndex('enhanced_call_logs', ['initiatedAt']);
    await queryInterface.addIndex('enhanced_call_logs', ['duration']);
    await queryInterface.addIndex('enhanced_call_logs', ['agentId']);
    await queryInterface.addIndex('enhanced_call_logs', ['category']);
    await queryInterface.addIndex('enhanced_call_logs', ['priority']);
    
    // Unique indexes
    await queryInterface.addIndex('enhanced_call_logs', ['sipCallId'], { 
      unique: true,
      where: {
        sipCallId: {
          [Sequelize.Op.ne]: null
        }
      }
    });
    
    // Composite indexes for complex queries
    await queryInterface.addIndex('enhanced_call_logs', ['leadId', 'initiatedAt']);
    await queryInterface.addIndex('enhanced_call_logs', ['agentId', 'initiatedAt']);
    await queryInterface.addIndex('enhanced_call_logs', ['status', 'outcome']);
    await queryInterface.addIndex('enhanced_call_logs', ['direction', 'status']);
    await queryInterface.addIndex('enhanced_call_logs', ['category', 'priority']);
    await queryInterface.addIndex('enhanced_call_logs', ['followUpRequired', 'followUpDate']);
    
    // Date range indexes for analytics
    await queryInterface.addIndex('enhanced_call_logs', ['initiatedAt', 'agentId']);
    await queryInterface.addIndex('enhanced_call_logs', ['initiatedAt', 'category']);
    await queryInterface.addIndex('enhanced_call_logs', ['completedAt']);
    
    // Skip complex JSON indexes for now to ensure migration succeeds
    console.log('⚠️  Skipping JSON field indexes - can be added later if needed');
    
    console.log('✅ Enhanced call logs table created successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Dropping enhanced_call_logs table...');
    
    // Drop JSON indexes first if PostgreSQL
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      try {
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS enhanced_call_logs_call_notes_summary_idx;');
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS enhanced_call_logs_transcription_status_idx;');
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS enhanced_call_logs_quality_score_idx;');
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS enhanced_call_logs_tags_idx;');
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS enhanced_call_logs_crm_sync_status_idx;');
      } catch (error) {
        console.warn('Some JSON indexes may not have existed:', error.message);
      }
    }
    
    await queryInterface.dropTable('enhanced_call_logs');
    console.log('✅ Enhanced call logs table dropped');
  }
};