/**
 * Migration: Create Integration Tables
 * Creates tables for integration settings, calendar events, and email sync
 */

const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Create IntegrationSettings table
      await queryInterface.createTable('integration_settings', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        provider: {
          type: Sequelize.ENUM(
            'google_calendar',
            'microsoft_calendar', 
            'gmail',
            'outlook_email',
            'exchange_email'
          ),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('connected', 'disconnected', 'expired', 'error'),
          defaultValue: 'disconnected'
        },
        accessToken: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        refreshToken: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        tokenExpiresAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        configuration: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        syncSettings: {
          type: Sequelize.JSON,
          defaultValue: {
            bidirectionalSync: false,
            autoCreateEvents: true,
            syncFrequency: 'hourly',
            conflictResolution: 'manual'
          }
        },
        lastSyncAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        lastSyncStatus: {
          type: Sequelize.ENUM('success', 'failed', 'partial'),
          allowNull: true
        },
        lastSyncError: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        webhookUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        webhookSecret: {
          type: Sequelize.STRING,
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
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
      }, { transaction });

      // Create unique index for userId + provider
      await queryInterface.addIndex('integration_settings', 
        ['userId', 'provider'],
        { unique: true, transaction }
      );

      // Create indexes for performance
      await queryInterface.addIndex('integration_settings', ['status'], { transaction });
      await queryInterface.addIndex('integration_settings', ['lastSyncAt'], { transaction });

      // Create CalendarEvents table
      await queryInterface.createTable('calendar_events', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        integrationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'integration_settings',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        externalEventId: {
          type: Sequelize.STRING,
          allowNull: false
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        startDateTime: {
          type: Sequelize.DATE,
          allowNull: false
        },
        endDateTime: {
          type: Sequelize.DATE,
          allowNull: false
        },
        timezone: {
          type: Sequelize.STRING,
          defaultValue: 'UTC'
        },
        location: {
          type: Sequelize.STRING,
          allowNull: true
        },
        isAllDay: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        isRecurring: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        recurrenceRule: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('confirmed', 'tentative', 'cancelled'),
          defaultValue: 'confirmed'
        },
        visibility: {
          type: Sequelize.ENUM('private', 'public', 'confidential'),
          defaultValue: 'private'
        },
        attendees: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        organizer: {
          type: Sequelize.JSON,
          allowNull: true
        },
        leadId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'leads',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        callLogId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'call_logs',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        lastSyncAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        syncVersion: {
          type: Sequelize.STRING,
          allowNull: true
        },
        isDeleted: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
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
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      // Create unique index for integrationId + externalEventId
      await queryInterface.addIndex('calendar_events',
        ['integrationId', 'externalEventId'],
        { unique: true, transaction }
      );

      // Create indexes for performance
      await queryInterface.addIndex('calendar_events', ['userId', 'startDateTime'], { transaction });
      await queryInterface.addIndex('calendar_events', ['leadId'], { transaction });
      await queryInterface.addIndex('calendar_events', ['status'], { transaction });

      // Create EmailSync table
      await queryInterface.createTable('email_sync', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        integrationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'integration_settings',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        externalMessageId: {
          type: Sequelize.STRING,
          allowNull: false
        },
        threadId: {
          type: Sequelize.STRING,
          allowNull: true
        },
        conversationId: {
          type: Sequelize.STRING,
          allowNull: true
        },
        subject: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        fromEmail: {
          type: Sequelize.STRING,
          allowNull: false
        },
        fromName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        toEmails: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        ccEmails: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        bccEmails: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        bodyText: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        bodyHtml: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        sentAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        receivedAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        isRead: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        isStarred: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        isImportant: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        labels: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        attachments: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        hasAttachments: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        leadId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'leads',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        direction: {
          type: Sequelize.ENUM('inbound', 'outbound'),
          allowNull: false
        },
        sentiment: {
          type: Sequelize.ENUM('positive', 'negative', 'neutral'),
          allowNull: true
        },
        intent: {
          type: Sequelize.STRING,
          allowNull: true
        },
        keywords: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        lastSyncAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        syncVersion: {
          type: Sequelize.STRING,
          allowNull: true
        },
        isDeleted: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
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
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      // Create unique index for integrationId + externalMessageId
      await queryInterface.addIndex('email_sync',
        ['integrationId', 'externalMessageId'],
        { unique: true, transaction }
      );

      // Create indexes for performance
      await queryInterface.addIndex('email_sync', ['userId', 'receivedAt'], { transaction });
      await queryInterface.addIndex('email_sync', ['leadId'], { transaction });
      await queryInterface.addIndex('email_sync', ['threadId'], { transaction });
      await queryInterface.addIndex('email_sync', ['fromEmail'], { transaction });
      await queryInterface.addIndex('email_sync', ['direction', 'sentAt'], { transaction });

      await transaction.commit();
      console.log('✅ Integration tables created successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to create integration tables:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop tables in reverse order (due to foreign keys)
      await queryInterface.dropTable('email_sync', { transaction });
      await queryInterface.dropTable('calendar_events', { transaction });
      await queryInterface.dropTable('integration_settings', { transaction });

      await transaction.commit();
      console.log('✅ Integration tables dropped successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to drop integration tables:', error);
      throw error;
    }
  }
};