/**
 * Meeting Model
 * Stores scheduled meetings and integrates with calendar events and lead timeline
 */

const { DataTypes } = require('sequelize');

const defineMeetingModel = (sequelize) => {
  const Meeting = sequelize.define('Meeting', {
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
    leadId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Leads',
        key: 'id'
      }
    },
    calendarEventId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'calendar_events',
        key: 'id'
      }
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
    meetingType: {
      type: DataTypes.ENUM('in-person', 'video', 'phone'),
      defaultValue: 'video'
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'no_show', 'calendar_sync_failed'),
      defaultValue: 'scheduled'
    },
    attendees: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    reminders: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    meetingNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    outcome: {
      type: DataTypes.ENUM('successful', 'rescheduled', 'cancelled', 'no_show', 'needs_followup'),
      allowNull: true
    },
    followupRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    followupDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    recurringPattern: {
      type: DataTypes.JSON,
      allowNull: true
    },
    parentMeetingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'meetings',
        key: 'id'
      }
    },
    externalMeetingId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    meetingUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dialInNumbers: {
      type: DataTypes.JSON,
      allowNull: true
    },
    recordingEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    recordingUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    syncStatus: {
      type: DataTypes.ENUM('synced', 'pending', 'failed'),
      defaultValue: 'pending'
    },
    syncError: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rescheduledFromId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'meetings',
        key: 'id'
      }
    },
    rescheduledToId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'meetings',
        key: 'id'
      }
    }
  }, {
    tableName: 'meetings',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['leadId']
      },
      {
        fields: ['calendarEventId']
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
        fields: ['meetingType']
      },
      {
        fields: ['syncStatus']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['followupRequired']
      },
      {
        fields: ['parentMeetingId']
      },
      {
        fields: ['rescheduledFromId']
      }
    ],
    hooks: {
      beforeCreate: (meeting) => {
        meeting.lastSyncedAt = new Date();
      },
      beforeUpdate: (meeting) => {
        if (meeting.changed()) {
          meeting.lastSyncedAt = new Date();
        }
        
        // Auto-set completion timestamp
        if (meeting.status === 'completed' && !meeting.completedAt) {
          meeting.completedAt = new Date();
        }
        
        // Auto-set cancellation timestamp
        if (meeting.status === 'cancelled' && !meeting.cancelledAt) {
          meeting.cancelledAt = new Date();
        }
      }
    }
  });

  // Instance methods
  Meeting.prototype.getDuration = function() {
    if (!this.startTime || !this.endTime) return 0;
    return Math.abs(new Date(this.endTime) - new Date(this.startTime));
  };

  Meeting.prototype.getDurationMinutes = function() {
    return Math.round(this.getDuration() / (1000 * 60));
  };

  Meeting.prototype.getDurationHours = function() {
    return this.getDuration() / (1000 * 60 * 60);
  };

  Meeting.prototype.isUpcoming = function() {
    return new Date(this.startTime) > new Date() && this.status === 'scheduled';
  };

  Meeting.prototype.isToday = function() {
    const today = new Date();
    const meetingDate = new Date(this.startTime);
    return today.toDateString() === meetingDate.toDateString();
  };

  Meeting.prototype.isOngoing = function() {
    const now = new Date();
    return new Date(this.startTime) <= now && 
           now <= new Date(this.endTime) && 
           this.status === 'scheduled';
  };

  Meeting.prototype.isPast = function() {
    return new Date(this.endTime) < new Date();
  };

  Meeting.prototype.canJoin = function() {
    const now = new Date();
    const startTime = new Date(this.startTime);
    const endTime = new Date(this.endTime);
    
    // Can join 15 minutes before start time and until end time
    const joinWindow = new Date(startTime.getTime() - 15 * 60 * 1000);
    
    return now >= joinWindow && 
           now <= endTime && 
           this.status === 'scheduled' && 
           (this.meetingUrl || this.dialInNumbers);
  };

  Meeting.prototype.getTimeUntilStart = function() {
    const now = new Date();
    const startTime = new Date(this.startTime);
    return Math.max(0, startTime.getTime() - now.getTime());
  };

  Meeting.prototype.getTimeUntilEnd = function() {
    const now = new Date();
    const endTime = new Date(this.endTime);
    return Math.max(0, endTime.getTime() - now.getTime());
  };

  Meeting.prototype.markCompleted = async function(notes, outcome) {
    this.status = 'completed';
    this.completedAt = new Date();
    if (notes) this.meetingNotes = notes;
    if (outcome) this.outcome = outcome;
    return this.save();
  };

  Meeting.prototype.markCancelled = async function(reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    if (reason) this.cancellationReason = reason;
    return this.save();
  };

  Meeting.prototype.markNoShow = async function() {
    this.status = 'no_show';
    this.outcome = 'no_show';
    return this.save();
  };

  Meeting.prototype.reschedule = async function(newStartTime, newEndTime, reason) {
    // Create new meeting for the rescheduled time
    const rescheduledMeeting = await Meeting.create({
      userId: this.userId,
      leadId: this.leadId,
      title: this.title,
      description: this.description,
      startTime: newStartTime,
      endTime: newEndTime,
      timezone: this.timezone,
      location: this.location,
      meetingType: this.meetingType,
      attendees: this.attendees,
      reminders: this.reminders,
      priority: this.priority,
      tags: this.tags,
      rescheduledFromId: this.id
    });

    // Mark current meeting as cancelled and link to new meeting
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancellationReason = reason || 'Rescheduled';
    this.rescheduledToId = rescheduledMeeting.id;
    await this.save();

    return rescheduledMeeting;
  };

  Meeting.prototype.addAttendee = function(email, name) {
    if (!this.attendees.find(a => a.email === email)) {
      this.attendees.push({ email, name });
      return this.save();
    }
  };

  Meeting.prototype.removeAttendee = function(email) {
    this.attendees = this.attendees.filter(a => a.email !== email);
    return this.save();
  };

  Meeting.prototype.updateReminders = function(reminders) {
    this.reminders = reminders;
    return this.save();
  };

  Meeting.prototype.hasConflict = function(otherMeeting) {
    const thisStart = new Date(this.startTime);
    const thisEnd = new Date(this.endTime);
    const otherStart = new Date(otherMeeting.startTime);
    const otherEnd = new Date(otherMeeting.endTime);

    return thisStart < otherEnd && otherStart < thisEnd;
  };

  Meeting.prototype.toCalendarFormat = function() {
    return {
      title: this.title,
      description: this.description,
      start: this.startTime,
      end: this.endTime,
      location: this.location,
      attendees: this.attendees.map(a => a.email),
      reminders: this.reminders
    };
  };

  Meeting.prototype.toTimelineEntry = function() {
    return {
      type: 'meeting',
      title: this.title,
      description: this.description,
      timestamp: this.startTime,
      status: this.status,
      data: {
        id: this.id,
        duration: this.getDurationMinutes(),
        meetingType: this.meetingType,
        location: this.location,
        attendees: this.attendees.length,
        outcome: this.outcome
      }
    };
  };

  // Class methods
  Meeting.findUpcoming = async function(userId, limit = 10) {
    return await Meeting.findAll({
      where: {
        userId,
        startTime: {
          [require('sequelize').Op.gt]: new Date()
        },
        status: 'scheduled'
      },
      order: [['startTime', 'ASC']],
      limit
    });
  };

  Meeting.findToday = async function(userId) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return await Meeting.findAll({
      where: {
        userId,
        startTime: {
          [require('sequelize').Op.between]: [startOfDay, endOfDay]
        }
      },
      order: [['startTime', 'ASC']]
    });
  };

  Meeting.findByDateRange = async function(userId, startDate, endDate, includeStatus = ['scheduled', 'completed']) {
    return await Meeting.findAll({
      where: {
        userId,
        startTime: {
          [require('sequelize').Op.between]: [startDate, endDate]
        },
        status: {
          [require('sequelize').Op.in]: includeStatus
        }
      },
      order: [['startTime', 'ASC']]
    });
  };

  Meeting.findConflicts = async function(userId, startTime, endTime, excludeId = null) {
    const where = {
      userId,
      startTime: {
        [require('sequelize').Op.lt]: endTime
      },
      endTime: {
        [require('sequelize').Op.gt]: startTime
      },
      status: 'scheduled'
    };

    if (excludeId) {
      where.id = {
        [require('sequelize').Op.ne]: excludeId
      };
    }

    return await Meeting.findAll({ where });
  };

  Meeting.findByLead = async function(leadId, includeCompleted = false) {
    const statuses = includeCompleted ? 
      ['scheduled', 'completed', 'no_show'] : 
      ['scheduled'];

    return await Meeting.findAll({
      where: {
        leadId,
        status: {
          [require('sequelize').Op.in]: statuses
        }
      },
      order: [['startTime', 'DESC']]
    });
  };

  Meeting.findRequiringFollowup = async function(userId) {
    return await Meeting.findAll({
      where: {
        userId,
        followupRequired: true,
        status: ['completed', 'no_show'],
        followupDate: {
          [require('sequelize').Op.lte]: new Date()
        }
      },
      order: [['followupDate', 'ASC']]
    });
  };

  // Associations
  Meeting.associate = (models) => {
    Meeting.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Meeting.belongsTo(models.Lead, { foreignKey: 'leadId', as: 'Lead' });
    Meeting.belongsTo(models.CalendarEvent, { foreignKey: 'calendarEventId', as: 'CalendarEvent' });
    Meeting.belongsTo(models.Meeting, { foreignKey: 'parentMeetingId', as: 'parentMeeting' });
    Meeting.belongsTo(models.Meeting, { foreignKey: 'rescheduledFromId', as: 'originalMeeting' });
    Meeting.belongsTo(models.Meeting, { foreignKey: 'rescheduledToId', as: 'rescheduledMeeting' });
    Meeting.hasMany(models.Meeting, { foreignKey: 'parentMeetingId', as: 'childMeetings' });
  };

  return Meeting;
};

module.exports = { defineMeetingModel };