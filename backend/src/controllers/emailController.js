/**
 * Email Controller
 * Handles email synchronization and management API endpoints
 */

const { body, param, query, validationResult } = require('express-validator');
const emailService = require('../services/emailService');
const { EmailSync, IntegrationSettings } = require('../database/models');

class EmailController {
  /**
   * Get user's synchronized emails
   */
  async getEmails(req, res) {
    try {
      const userId = req.user.id;
      const {
        limit = 50,
        page = 1,
        provider,
        leadId,
        direction,
        startDate,
        endDate,
        search
      } = req.query;

      const options = {
        limit: Math.min(parseInt(limit), 200),
        offset: (parseInt(page) - 1) * Math.min(parseInt(limit), 200)
      };

      if (provider) options.provider = provider;
      if (leadId) options.leadId = parseInt(leadId);
      if (direction) options.direction = direction;
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);

      let emails = await emailService.getUserEmails(userId, options);

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        emails = emails.filter(email =>
          email.subject.toLowerCase().includes(searchLower) ||
          email.fromEmail.toLowerCase().includes(searchLower) ||
          email.fromName?.toLowerCase().includes(searchLower) ||
          email.getPlainTextContent().toLowerCase().includes(searchLower)
        );
      }

      // Transform emails for API response
      const transformedEmails = emails.map(email => ({
        id: email.id,
        externalMessageId: email.externalMessageId,
        threadId: email.threadId,
        conversationId: email.conversationId,
        subject: email.subject,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        toEmails: email.toEmails,
        ccEmails: email.ccEmails,
        bodyPreview: email.getPlainTextContent().substring(0, 200),
        sentAt: email.sentAt,
        receivedAt: email.receivedAt,
        isRead: email.isRead,
        isStarred: email.isStarred,
        isImportant: email.isImportant,
        hasAttachments: email.hasAttachments,
        attachmentCount: email.attachments?.length || 0,
        direction: email.direction,
        leadId: email.leadId,
        sentiment: email.sentiment,
        intent: email.intent,
        keywords: email.keywords,
        provider: email.IntegrationSetting?.provider,
        lastSyncAt: email.lastSyncAt,
        domain: email.extractDomain(),
        isFromLead: email.isFromLead()
      }));

      res.json({
        success: true,
        data: {
          emails: transformedEmails,
          pagination: {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 200),
            total: transformedEmails.length,
            hasMore: transformedEmails.length === Math.min(parseInt(limit), 200)
          }
        }
      });
    } catch (error) {
      console.error('Get emails error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get emails',
          details: error.message
        }
      });
    }
  }

  /**
   * Get single email with full content
   */
  async getEmail(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { emailId } = req.params;
      const userId = req.user.id;

      const email = await EmailSync.findOne({
        where: { id: emailId, userId },
        include: [{
          model: IntegrationSettings,
          attributes: ['provider', 'status']
        }]
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Email not found',
            code: 'EMAIL_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: {
          id: email.id,
          externalMessageId: email.externalMessageId,
          threadId: email.threadId,
          conversationId: email.conversationId,
          subject: email.subject,
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          toEmails: email.toEmails,
          ccEmails: email.ccEmails,
          bccEmails: email.bccEmails,
          bodyText: email.bodyText,
          bodyHtml: email.bodyHtml,
          sentAt: email.sentAt,
          receivedAt: email.receivedAt,
          isRead: email.isRead,
          isStarred: email.isStarred,
          isImportant: email.isImportant,
          labels: email.labels,
          attachments: email.attachments,
          hasAttachments: email.hasAttachments,
          direction: email.direction,
          leadId: email.leadId,
          sentiment: email.sentiment,
          intent: email.intent,
          keywords: email.keywords,
          provider: email.IntegrationSetting?.provider,
          lastSyncAt: email.lastSyncAt,
          createdAt: email.createdAt,
          updatedAt: email.updatedAt,
          domain: email.extractDomain(),
          isFromLead: email.isFromLead(),
          allRecipients: email.getAllRecipients()
        }
      });
    } catch (error) {
      console.error('Get email error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get email',
          details: error.message
        }
      });
    }
  }

  /**
   * Get email thread
   */
  async getThread(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { threadId } = req.params;
      const userId = req.user.id;

      // Get all emails in the thread
      const emails = await EmailSync.findByThread(threadId);
      
      // Filter by user ownership
      const userEmails = emails.filter(email => email.userId === userId);

      if (userEmails.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Email thread not found',
            code: 'THREAD_NOT_FOUND'
          }
        });
      }

      const transformedEmails = userEmails.map(email => ({
        id: email.id,
        subject: email.subject,
        fromEmail: email.fromEmail,
        fromName: email.fromName,
        toEmails: email.toEmails,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
        sentAt: email.sentAt,
        receivedAt: email.receivedAt,
        isRead: email.isRead,
        direction: email.direction,
        hasAttachments: email.hasAttachments,
        attachments: email.attachments
      }));

      res.json({
        success: true,
        data: {
          threadId,
          emails: transformedEmails,
          totalEmails: transformedEmails.length,
          participants: [...new Set(userEmails.flatMap(e => [e.fromEmail, ...e.toEmails]))]
        }
      });
    } catch (error) {
      console.error('Get email thread error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get email thread',
          details: error.message
        }
      });
    }
  }

  /**
   * Send email through integrated provider
   */
  async sendEmail(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const userId = req.user.id;
      const {
        integrationId,
        to,
        cc = [],
        bcc = [],
        subject,
        body,
        leadId
      } = req.body;

      // Verify integration ownership
      const integration = await IntegrationSettings.findOne({
        where: { id: integrationId, userId, status: 'connected' }
      });

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Integration not found or not connected',
            code: 'INTEGRATION_NOT_FOUND'
          }
        });
      }

      // Check if integration supports sending emails
      if (!integration.provider.includes('email') && integration.provider !== 'gmail') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'This integration does not support sending emails',
            code: 'SEND_NOT_SUPPORTED'
          }
        });
      }

      const emailData = {
        to: Array.isArray(to) ? to : [to],
        cc,
        bcc,
        subject,
        body,
        leadId
      };

      const result = await emailService.sendEmail(integrationId, emailData);

      res.json({
        success: true,
        data: {
          messageId: result.id,
          provider: integration.provider,
          sentAt: new Date()
        },
        message: 'Email sent successfully'
      });
    } catch (error) {
      console.error('Send email error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send email',
          details: error.message
        }
      });
    }
  }

  /**
   * Sync emails for user
   */
  async syncEmails(req, res) {
    try {
      const userId = req.user.id;
      const { provider } = req.body;

      const results = await emailService.syncUserEmails(userId, provider);

      const summary = {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        totalCreated: results.reduce((sum, r) => sum + (r.created || 0), 0),
        totalUpdated: results.reduce((sum, r) => sum + (r.updated || 0), 0),
        totalErrors: results.reduce((sum, r) => sum + (r.errors?.length || 0), 0)
      };

      res.json({
        success: true,
        data: {
          summary,
          results: results.map(r => ({
            integration: r.integration,
            status: r.status,
            created: r.created,
            updated: r.updated,
            errors: r.errors?.length || 0
          }))
        },
        message: `Synchronized ${summary.totalCreated + summary.totalUpdated} emails`
      });
    } catch (error) {
      console.error('Sync emails error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to sync emails',
          details: error.message
        }
      });
    }
  }

  /**
   * Link email to lead
   */
  async linkToLead(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { emailId } = req.params;
      const { leadId } = req.body;
      const userId = req.user.id;

      // Verify email ownership
      const email = await EmailSync.findOne({
        where: { id: emailId, userId }
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Email not found',
            code: 'EMAIL_NOT_FOUND'
          }
        });
      }

      // Verify lead ownership if leadId is provided
      if (leadId) {
        const { Lead } = require('../database/models');
        const lead = await Lead.findOne({
          where: { id: leadId, userId }
        });

        if (!lead) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Lead not found',
              code: 'LEAD_NOT_FOUND'
            }
          });
        }
      }

      // Update the email
      email.leadId = leadId;
      await email.save();

      res.json({
        success: true,
        data: {
          id: email.id,
          subject: email.subject,
          leadId: email.leadId,
          updatedAt: email.updatedAt
        },
        message: leadId ? 'Email linked to lead successfully' : 'Email unlinked from lead successfully'
      });
    } catch (error) {
      console.error('Link email to lead error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to link email to lead',
          details: error.message
        }
      });
    }
  }

  /**
   * Get email statistics
   */
  async getStats(req, res) {
    try {
      const userId = req.user.id;
      const { timeframe = '30d' } = req.query;

      let startDate = new Date();
      switch (timeframe) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const emails = await emailService.getUserEmails(userId, {
        startDate,
        limit: 1000
      });

      const stats = {
        total: emails.length,
        unread: emails.filter(e => !e.isRead).length,
        inbound: emails.filter(e => e.direction === 'inbound').length,
        outbound: emails.filter(e => e.direction === 'outbound').length,
        withLeads: emails.filter(e => e.leadId).length,
        withAttachments: emails.filter(e => e.hasAttachments).length,
        byProvider: {},
        bySentiment: {},
        topDomains: {},
        threadStats: {
          totalThreads: new Set(emails.map(e => e.threadId)).size,
          averageThreadLength: 0
        }
      };

      // Group by provider, sentiment, and domain
      emails.forEach(email => {
        const provider = email.IntegrationSetting?.provider || 'unknown';
        stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;
        
        if (email.sentiment) {
          stats.bySentiment[email.sentiment] = (stats.bySentiment[email.sentiment] || 0) + 1;
        }

        const domain = email.extractDomain();
        if (domain) {
          stats.topDomains[domain] = (stats.topDomains[domain] || 0) + 1;
        }
      });

      // Calculate average thread length
      if (stats.threadStats.totalThreads > 0) {
        stats.threadStats.averageThreadLength = Math.round(emails.length / stats.threadStats.totalThreads);
      }

      // Get top domains
      stats.topDomains = Object.entries(stats.topDomains)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [domain, count]) => ({ ...obj, [domain]: count }), {});

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get email stats error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get email statistics',
          details: error.message
        }
      });
    }
  }
}

// Validation rules
const validateEmailId = [
  param('emailId').isInt({ min: 1 }).withMessage('Valid email ID is required')
];

const validateThreadId = [
  param('threadId').notEmpty().withMessage('Thread ID is required')
];

const validateSendEmail = [
  body('integrationId').isInt({ min: 1 }).withMessage('Valid integration ID is required'),
  body('to').isArray({ min: 1 }).withMessage('At least one recipient is required'),
  body('to.*').isEmail().withMessage('Valid recipient email addresses are required'),
  body('cc').optional().isArray(),
  body('cc.*').optional().isEmail().withMessage('Valid CC email addresses are required'),
  body('bcc').optional().isArray(),
  body('bcc.*').optional().isEmail().withMessage('Valid BCC email addresses are required'),
  body('subject').trim().notEmpty().withMessage('Email subject is required'),
  body('body').trim().notEmpty().withMessage('Email body is required'),
  body('leadId').optional().isInt({ min: 1 })
];

const validateLinkToLead = [
  param('emailId').isInt({ min: 1 }).withMessage('Valid email ID is required'),
  body('leadId').optional().isInt({ min: 1 }).withMessage('Valid lead ID is required')
];

const validateSyncEmails = [
  body('provider').optional().isIn(['gmail', 'outlook_email']).withMessage('Invalid provider')
];

const controller = new EmailController();

module.exports = {
  getEmails: controller.getEmails.bind(controller),
  getEmail: [validateEmailId, controller.getEmail.bind(controller)],
  getThread: [validateThreadId, controller.getThread.bind(controller)],
  sendEmail: [validateSendEmail, controller.sendEmail.bind(controller)],
  syncEmails: [validateSyncEmails, controller.syncEmails.bind(controller)],
  linkToLead: [validateLinkToLead, controller.linkToLead.bind(controller)],
  getStats: controller.getStats.bind(controller)
};