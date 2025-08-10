/**
 * Integration Settings Model
 * Stores OAuth credentials and integration configuration for calendar and email services
 */

const { DataTypes } = require('sequelize');
const { encrypt, decrypt } = require('../../utils/encryption');

const defineIntegrationSettingsModel = (sequelize) => {
  const IntegrationSettings = sequelize.define('IntegrationSettings', {
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
    provider: {
      type: DataTypes.ENUM('google_calendar', 'microsoft_calendar', 'gmail', 'outlook_email'),
      allowNull: false
    },
    providerAccountId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const encrypted = this.getDataValue('accessToken');
        return encrypted ? decrypt(encrypted) : null;
      },
      set(value) {
        this.setDataValue('accessToken', value ? encrypt(value) : null);
      }
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const encrypted = this.getDataValue('refreshToken');
        return encrypted ? decrypt(encrypted) : null;
      },
      set(value) {
        this.setDataValue('refreshToken', value ? encrypt(value) : null);
      }
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('connected', 'disconnected', 'error', 'expired'),
      defaultValue: 'connected'
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    syncSettings: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    configuration: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    webhookUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    webhookSecret: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const encrypted = this.getDataValue('webhookSecret');
        return encrypted ? decrypt(encrypted) : null;
      },
      set(value) {
        this.setDataValue('webhookSecret', value ? encrypt(value) : null);
      }
    },
    errorDetails: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'integration_settings',
    indexes: [
      {
        fields: ['userId', 'provider'],
        unique: true
      },
      {
        fields: ['provider']
      },
      {
        fields: ['status']
      },
      {
        fields: ['tokenExpiresAt']
      }
    ],
    hooks: {
      beforeCreate: (integration) => {
        integration.lastSyncAt = new Date();
      },
      beforeUpdate: (integration) => {
        if (integration.changed('accessToken') || integration.changed('refreshToken')) {
          integration.lastSyncAt = new Date();
        }
      }
    }
  });

  // Instance methods
  IntegrationSettings.prototype.isTokenExpired = function() {
    if (!this.tokenExpiresAt) return false;
    return new Date() >= this.tokenExpiresAt;
  };

  IntegrationSettings.prototype.needsRefresh = function(bufferMinutes = 5) {
    if (!this.tokenExpiresAt) return false;
    const bufferTime = new Date();
    bufferTime.setMinutes(bufferTime.getMinutes() + bufferMinutes);
    return bufferTime >= this.tokenExpiresAt;
  };

  IntegrationSettings.prototype.updateTokens = async function(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    if (expiresIn) {
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);
      this.tokenExpiresAt = expiryDate;
    }
    this.status = 'connected';
    this.errorDetails = null;
    return this.save();
  };

  IntegrationSettings.prototype.markError = async function(error) {
    this.status = 'error';
    this.errorDetails = {
      message: error.message,
      timestamp: new Date(),
      stack: error.stack
    };
    return this.save();
  };

  IntegrationSettings.prototype.markSyncCompleted = async function(status, errorMessage = null) {
    this.lastSyncAt = new Date();
    if (status === 'success') {
      this.status = 'connected';
      this.errorDetails = null;
    } else if (status === 'failed' && errorMessage) {
      this.status = 'error';
      this.errorDetails = {
        message: errorMessage,
        timestamp: new Date()
      };
    }
    return this.save();
  };

  // Associations
  IntegrationSettings.associate = (models) => {
    // IntegrationSettings.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return IntegrationSettings;
};

module.exports = { defineIntegrationSettingsModel };