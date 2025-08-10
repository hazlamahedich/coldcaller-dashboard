/**
 * Calendar Event Model
 * Stores synchronized calendar events from external providers
 */

const { DataTypes } = require('sequelize');

const defineCalendarEventModel = (sequelize) => {
  const CalendarEvent = sequelize.define('CalendarEvent', {
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
    externalEventId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC'
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attendees: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('confirmed', 'tentative', 'cancelled'),
      defaultValue: 'confirmed'
    },
    isAllDay: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    recurrenceRule: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    recurrenceId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    originalEventId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'calendar_events',
        key: 'id'
      }
    },
    visibility: {
      type: DataTypes.ENUM('default', 'public', 'private', 'confidential'),
      defaultValue: 'default'
    },
    organizer: {
      type: DataTypes.JSON,
      allowNull: true
    },
    meetingUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    conferenceData: {
      type: DataTypes.JSON,
      allowNull: true
    },
    reminders: {
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
    },
    conflictResolution: {
      type: DataTypes.ENUM('local_wins', 'remote_wins', 'merge', 'manual'),
      allowNull: true
    }
  }, {
    tableName: 'calendar_events',
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
        fields: ['externalEventId', 'integrationId'],
        unique: true
      },
      {
        fields: ['startTime']
      },
      {
        fields: ['endTime']
      },
      {
        fields: ['status']
      },
      {
        fields: ['syncStatus']
      },
      {
        fields: ['isRecurring']
      },
      {
        fields: ['recurrenceId']
      }
    ],
    hooks: {
      beforeCreate: (event) => {
        event.lastSyncedAt = new Date();
      },
      beforeUpdate: (event) => {
        if (event.changed()) {
          event.lastSyncedAt = new Date();
        }
      }
    }
  });

  // Instance methods
  CalendarEvent.prototype.getDuration = function() {
    if (!this.startTime || !this.endTime) return 0;
    return Math.abs(new Date(this.endTime) - new Date(this.startTime));
  };

  CalendarEvent.prototype.getDurationHours = function() {
    return this.getDuration() / (1000 * 60 * 60);
  };

  CalendarEvent.prototype.isUpcoming = function() {
    return new Date(this.startTime) > new Date();
  };

  CalendarEvent.prototype.isOngoing = function() {
    const now = new Date();
    return new Date(this.startTime) <= now && now <= new Date(this.endTime);
  };

  CalendarEvent.prototype.hasConflict = function(otherEvent) {
    const thisStart = new Date(this.startTime);
    const thisEnd = new Date(this.endTime);
    const otherStart = new Date(otherEvent.startTime);
    const otherEnd = new Date(otherEvent.endTime);

    return thisStart < otherEnd && otherStart < thisEnd;
  };

  CalendarEvent.prototype.linkToLead = async function(leadId) {
    this.leadId = leadId;
    return this.save();
  };

  CalendarEvent.prototype.unlinkFromLead = async function() {
    this.leadId = null;
    return this.save();
  };

  CalendarEvent.prototype.markDeleted = async function() {
    this.syncStatus = 'deleted';
    return this.save();
  };

  // Class methods
  CalendarEvent.findUpcoming = async function(userId, limit = 10) {
    return await CalendarEvent.findAll({
      where: {
        userId,
        startTime: {
          [require('sequelize').Op.gt]: new Date()
        },
        status: {
          [require('sequelize').Op.ne]: 'cancelled'
        }
      },
      order: [['startTime', 'ASC']],
      limit
    });
  };

  CalendarEvent.findByDateRange = async function(userId, startDate, endDate) {
    return await CalendarEvent.findAll({
      where: {
        userId,
        startTime: {
          [require('sequelize').Op.gte]: startDate,
          [require('sequelize').Op.lte]: endDate
        }
      },
      order: [['startTime', 'ASC']]
    });
  };

  CalendarEvent.findConflicts = async function(userId, startTime, endTime, excludeId = null) {
    const where = {
      userId,
      startTime: {
        [require('sequelize').Op.lt]: endTime
      },
      endTime: {
        [require('sequelize').Op.gt]: startTime
      },
      status: {
        [require('sequelize').Op.ne]: 'cancelled'
      }
    };

    if (excludeId) {
      where.id = {
        [require('sequelize').Op.ne]: excludeId
      };
    }

    return await CalendarEvent.findAll({ where });
  };

  // Associations
  CalendarEvent.associate = (models) => {
    // CalendarEvent.belongsTo(models.IntegrationSettings, { foreignKey: 'integrationId', as: 'integration' });
    // CalendarEvent.belongsTo(models.Lead, { foreignKey: 'leadId', as: 'lead' });
    // CalendarEvent.belongsTo(models.CallLog, { foreignKey: 'callLogId', as: 'callLog' });
  };

  return CalendarEvent;
};

module.exports = { defineCalendarEventModel };