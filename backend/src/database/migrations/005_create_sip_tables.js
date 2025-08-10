/**
 * SIP Configuration and Call Logs Database Migration
 * Creates tables for comprehensive SIP management
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    console.log('🔄 Creating SIP configuration and call log tables...');
    
    // Create SIP Configurations table
    await queryInterface.createTable('sip_configurations', {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
      },
      
      // Basic Configuration
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      
      provider: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      
      server: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      
      port: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      
      // Authentication
      username: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      
      password_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      
      display_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      
      domain: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      
      // Transport Configuration
      transport: {
        type: DataTypes.STRING(10),
        defaultValue: 'UDP',
        allowNull: false
      },
      
      // Advanced Settings (JSON as TEXT for SQLite)
      codec_preference: {
        type: DataTypes.TEXT,
        defaultValue: '["PCMU", "PCMA", "G722"]'
      },
      
      stun_servers: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      
      turn_servers: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      
      encryption_mode: {
        type: DataTypes.STRING(20),
        defaultValue: 'optional'
      },
      
      dtmf_mode: {
        type: DataTypes.STRING(20),
        defaultValue: 'rfc2833'
      },
      
      // Timeouts and Retry Settings
      registration_timeout: {
        type: DataTypes.INTEGER,
        defaultValue: 60000
      },
      
      session_timeout: {
        type: DataTypes.INTEGER,
        defaultValue: 30000
      },
      
      retry_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 3
      },
      
      // Recording Configuration
      enable_recording: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      
      recording_path: {
        type: DataTypes.STRING(500),
        defaultValue: './recordings'
      },
      
      recording_format: {
        type: DataTypes.STRING(10),
        defaultValue: 'mp3'
      },
      
      // Status and Health
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      
      registration_status: {
        type: DataTypes.STRING(20),
        defaultValue: 'unregistered'
      },
      
      last_registration: {
        type: DataTypes.DATE,
        allowNull: true
      },
      
      last_error: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      
      connection_quality: {
        type: DataTypes.STRING(20),
        defaultValue: 'unknown'
      },
      
      // Usage Statistics
      total_calls: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      
      successful_calls: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      
      failed_calls: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      
      average_call_duration: {
        type: DataTypes.REAL,
        defaultValue: 0
      },
      
      // Optimization Settings (JSON as TEXT)
      provider_optimizations: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      
      custom_settings: {
        type: DataTypes.TEXT,
        defaultValue: '{}'
      },
      
      // Metadata
      created_by: {
        type: DataTypes.STRING,
        allowNull: true
      },
      
      tags: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      
      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
    
    console.log('✅ SIP configurations table created');
    
    // Create SIP Call Logs table
    await queryInterface.createTable('sip_call_logs', {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
      },
      
      // Call Identity
      call_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
      },
      
      sip_session_id: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      
      // Configuration Reference
      sip_configuration_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      
      // Call Details
      direction: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      
      from_number: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      
      to_number: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      
      display_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      
      // Call Status and Timing
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'initiated'
      },
      
      start_time: {
        type: DataTypes.DATE,
        allowNull: false
      },
      
      answer_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      
      end_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      
      ring_time: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      
      // Call Quality Metrics (JSON as TEXT)
      audio_quality: {
        type: DataTypes.TEXT,
        defaultValue: '{}'
      },
      
      network_metrics: {
        type: DataTypes.TEXT,
        defaultValue: '{}'
      },
      
      mos_score: {
        type: DataTypes.REAL,
        allowNull: true
      },
      
      quality_rating: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      
      // SIP Protocol Details
      sip_method: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      
      sip_response_code: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      
      sip_response_text: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      
      user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      
      // Codec Information
      audio_codec: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      
      codec_bitrate: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      
      // Recording Information
      recording_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      
      recording_path: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      
      recording_duration: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      
      recording_file_size: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      
      // Error Information
      error_code: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      
      disconnect_reason: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      
      // DTMF Events (JSON as TEXT)
      dtmf_events: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      
      // Call Transfer Information
      transfer_target: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      
      transfer_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      
      transfer_type: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      
      // Business Context
      lead_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      
      campaign_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      
      user_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      
      // Call Outcome
      outcome: {
        type: DataTypes.STRING(30),
        allowNull: true
      },
      
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      
      // Cost Information
      cost: {
        type: DataTypes.REAL,
        allowNull: true
      },
      
      currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'USD'
      },
      
      // Metadata (JSON as TEXT)
      metadata: {
        type: DataTypes.TEXT,
        defaultValue: '{}'
      },
      
      tags: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      
      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
    
    console.log('✅ SIP call logs table created');
    
    // Create indexes
    try {
      await queryInterface.addIndex('sip_configurations', ['provider']);
      await queryInterface.addIndex('sip_configurations', ['active']);
      await queryInterface.addIndex('sip_configurations', ['registration_status']);
      await queryInterface.addIndex('sip_call_logs', ['call_id']);
      await queryInterface.addIndex('sip_call_logs', ['sip_configuration_id']);
      await queryInterface.addIndex('sip_call_logs', ['status']);
      await queryInterface.addIndex('sip_call_logs', ['start_time']);
      
      console.log('✅ SIP table indexes created');
    } catch (error) {
      console.warn('⚠️ Some indexes may already exist:', error.message);
    }
    
    console.log('🎉 SIP tables migration completed successfully!');
  },
  
  async down(queryInterface) {
    console.log('🔄 Dropping SIP tables...');
    
    await queryInterface.dropTable('sip_call_logs');
    console.log('✅ SIP call logs table dropped');
    
    await queryInterface.dropTable('sip_configurations');
    console.log('✅ SIP configurations table dropped');
    
    console.log('🎉 SIP tables rollback completed!');
  }
};