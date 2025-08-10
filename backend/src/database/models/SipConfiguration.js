/**
 * SIP Configuration Database Model
 * Stores SIP server configurations with encryption and validation
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

const SipConfiguration = sequelize.define('SipConfiguration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Basic Configuration
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  
  provider: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      isIn: [['twilio', 'ringcentral', 'vonage', 'asterisk', 'freepbx', 'custom']]
    }
  },
  
  server: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      isUrl: true
    }
  },
  
  port: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 65535
    }
  },
  
  // Authentication (encrypted)
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  
  passwordEncrypted: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'password_encrypted'
  },
  
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'display_name'
  },
  
  domain: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Transport Configuration
  transport: {
    type: DataTypes.ENUM('UDP', 'TCP', 'TLS', 'WS', 'WSS'),
    defaultValue: 'UDP',
    allowNull: false
  },
  
  // Advanced Settings
  codecPreference: {
    type: DataTypes.JSON,
    defaultValue: ['PCMU', 'PCMA', 'G722'],
    field: 'codec_preference'
  },
  
  stunServers: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'stun_servers'
  },
  
  turnServers: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'turn_servers'
  },
  
  encryptionMode: {
    type: DataTypes.ENUM('disabled', 'optional', 'required'),
    defaultValue: 'optional',
    field: 'encryption_mode'
  },
  
  dtmfMode: {
    type: DataTypes.ENUM('rfc2833', 'inband', 'info'),
    defaultValue: 'rfc2833',
    field: 'dtmf_mode'
  },
  
  // Timeouts and Retry Settings
  registrationTimeout: {
    type: DataTypes.INTEGER,
    defaultValue: 60000,
    validate: { min: 10000, max: 300000 },
    field: 'registration_timeout'
  },
  
  sessionTimeout: {
    type: DataTypes.INTEGER,
    defaultValue: 30000,
    validate: { min: 5000, max: 120000 },
    field: 'session_timeout'
  },
  
  retryAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    validate: { min: 1, max: 10 },
    field: 'retry_attempts'
  },
  
  // Recording Configuration
  enableRecording: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'enable_recording'
  },
  
  recordingPath: {
    type: DataTypes.STRING(500),
    defaultValue: './recordings',
    field: 'recording_path'
  },
  
  recordingFormat: {
    type: DataTypes.ENUM('mp3', 'wav', 'ogg'),
    defaultValue: 'mp3',
    field: 'recording_format'
  },
  
  // Status and Health
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  registrationStatus: {
    type: DataTypes.ENUM('unregistered', 'registering', 'registered', 'failed'),
    defaultValue: 'unregistered',
    field: 'registration_status'
  },
  
  lastRegistration: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_registration'
  },
  
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'last_error'
  },
  
  connectionQuality: {
    type: DataTypes.ENUM('unknown', 'bad', 'poor', 'fair', 'good', 'excellent'),
    defaultValue: 'unknown',
    field: 'connection_quality'
  },
  
  // Usage Statistics
  totalCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_calls'
  },
  
  successfulCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'successful_calls'
  },
  
  failedCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_calls'
  },
  
  averageCallDuration: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    field: 'average_call_duration'
  },
  
  // Optimization Settings
  providerOptimizations: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'provider_optimizations'
  },
  
  customSettings: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'custom_settings'
  },
  
  // Metadata
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by'
  },
  
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sip_configurations',
  timestamps: true,
  underscored: true,
  
  indexes: [
    { fields: ['provider'] },
    { fields: ['active'] },
    { fields: ['registration_status'] },
    { fields: ['created_by'] },
    { fields: ['server', 'username'], unique: true }
  ],
  
  hooks: {
    beforeCreate: async (sipConfig) => {
      if (sipConfig.password) {
        sipConfig.passwordEncrypted = await sipConfig.encryptPassword(sipConfig.password);
        delete sipConfig.password;
      }
    },
    
    beforeUpdate: async (sipConfig) => {
      if (sipConfig.password) {
        sipConfig.passwordEncrypted = await sipConfig.encryptPassword(sipConfig.password);
        delete sipConfig.password;
      }
    }
  }
});

// Instance Methods
SipConfiguration.prototype.encryptPassword = async function(password) {
  const algorithm = 'aes-256-gcm';
  const key = process.env.SIP_ENCRYPTION_KEY || crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from(this.id.toString()));
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted,
    authTag: authTag.toString('hex')
  });
};

SipConfiguration.prototype.decryptPassword = async function() {
  if (!this.passwordEncrypted) return null;
  
  try {
    const algorithm = 'aes-256-gcm';
    const key = process.env.SIP_ENCRYPTION_KEY || crypto.randomBytes(32);
    const encryptedData = JSON.parse(this.passwordEncrypted);
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from(this.id.toString()));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Password decryption failed:', error);
    return null;
  }
};

SipConfiguration.prototype.getSanitized = function() {
  const data = this.toJSON();
  delete data.passwordEncrypted;
  delete data.password;
  return data;
};

SipConfiguration.prototype.updateCallStats = async function(callSuccess, duration = 0) {
  this.totalCalls += 1;
  
  if (callSuccess) {
    this.successfulCalls += 1;
    // Update average duration
    const totalDuration = (this.averageCallDuration * (this.successfulCalls - 1)) + duration;
    this.averageCallDuration = totalDuration / this.successfulCalls;
  } else {
    this.failedCalls += 1;
  }
  
  return this.save();
};

SipConfiguration.prototype.updateConnectionQuality = function(quality) {
  this.connectionQuality = quality;
  return this.save();
};

SipConfiguration.prototype.getSuccessRate = function() {
  if (this.totalCalls === 0) return 0;
  return (this.successfulCalls / this.totalCalls) * 100;
};

// Class Methods
SipConfiguration.findByProvider = function(provider) {
  return this.findAll({
    where: { provider, active: true },
    order: [['created_at', 'DESC']]
  });
};

SipConfiguration.findActive = function() {
  return this.findAll({
    where: { active: true },
    order: [['updated_at', 'DESC']]
  });
};

SipConfiguration.findByUser = function(userId) {
  return this.findAll({
    where: { createdBy: userId },
    order: [['created_at', 'DESC']]
  });
};

SipConfiguration.getProviderStats = async function() {
  const stats = await this.findAll({
    attributes: [
      'provider',
      [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
      [sequelize.fn('AVG', sequelize.col('successful_calls')), 'avgSuccess'],
      [sequelize.fn('AVG', sequelize.col('average_call_duration')), 'avgDuration']
    ],
    group: ['provider'],
    raw: true
  });
  
  return stats;
};

module.exports = SipConfiguration;