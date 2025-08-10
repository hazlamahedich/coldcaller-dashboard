/**
 * Email Integration Service
 * Handles Gmail and Outlook email synchronization
 */

const axios = require('axios');
const { IntegrationSettings, EmailSync } = require('../database/models');
const integrationService = require('./integrationService');

class EmailService {
  constructor() {
    this.providers = {
      gmail: {
        baseUrl: 'https://www.googleapis.com/gmail/v1',
        messagesEndpoint: '/users/me/messages',
        messageDetailEndpoint: (id) => `/users/me/messages/${id}`
      },
      outlook_email: {
        baseUrl: 'https://graph.microsoft.com/v1.0',
        messagesEndpoint: '/me/messages',
        messageDetailEndpoint: (id) => `/me/messages/${id}`
      }
    };
  }

  /**
   * Sync emails for a user
   */
  async syncUserEmails(userId, provider = null) {
    const where = { userId, status: 'connected', isActive: true };
    if (provider) where.provider = provider;

    const integrations = await IntegrationSettings.findAll({
      where: {
        ...where,
        provider: provider ? provider : ['gmail', 'outlook_email']
      }
    });

    const results = [];
    
    for (const integration of integrations) {
      try {
        const result = await this.syncEmails(integration);
        results.push({ integration: integration.id, ...result });
      } catch (error) {
        console.error(`Email sync failed for integration ${integration.id}:`, error.message);
        results.push({
          integration: integration.id,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Sync emails for a specific integration
   */
  async syncEmails(integration) {
    // Refresh token if needed
    if (integration.needsRefresh()) {
      await integrationService.refreshToken(integration.id);
      await integration.reload();
    }

    const provider = integration.provider;
    const syncResults = {
      status: 'success',
      created: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };

    try {
      // Get messages from provider
      const messages = await this.fetchEmails(integration);
      
      // Process each message
      for (const message of messages) {
        try {
          const result = await this.processEmail(integration, message);
          syncResults[result.action]++;
        } catch (error) {
          syncResults.errors.push({
            messageId: message.id,
            error: error.message
          });
        }
      }

      // Mark sync as completed
      await integration.markSyncCompleted('success');
      
    } catch (error) {
      syncResults.status = 'error';
      syncResults.message = error.message;
      await integration.markSyncCompleted('failed', error.message);
    }

    return syncResults;
  }

  /**
   * Fetch emails from provider
   */
  async fetchEmails(integration, options = {}) {
    const provider = integration.provider;
    const config = this.providers[provider];
    const {
      maxResults = 100,
      query = '',
      pageToken = null
    } = options;
    
    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Accept': 'application/json'
    };

    if (provider === 'gmail') {
      let params = {
        maxResults,
        q: query || 'in:inbox OR in:sent',
        includeSpamTrash: false
      };

      if (pageToken) params.pageToken = pageToken;

      // Get message list first
      const listResponse = await axios.get(
        `${config.baseUrl}${config.messagesEndpoint}`,
        { headers, params }
      );

      const messageIds = listResponse.data.messages || [];
      const messages = [];

      // Fetch detailed message data (batch if possible)
      for (const msgRef of messageIds.slice(0, maxResults)) {
        try {
          const detailResponse = await axios.get(
            `${config.baseUrl}${config.messageDetailEndpoint(msgRef.id)}`,
            { headers }
          );
          messages.push(detailResponse.data);
        } catch (error) {
          console.warn(`Failed to fetch Gmail message ${msgRef.id}:`, error.message);
        }
      }

      return messages;

    } else if (provider === 'outlook_email') {
      const params = {
        $top: maxResults,
        $select: 'id,subject,sender,toRecipients,ccRecipients,bccRecipients,sentDateTime,receivedDateTime,body,isRead,flag,hasAttachments,attachments',
        $orderby: 'receivedDateTime desc'
      };

      if (query) {
        params.$filter = `contains(subject,'${query}') or contains(from/emailAddress/address,'${query}')`;
      }

      const response = await axios.get(
        `${config.baseUrl}${config.messagesEndpoint}`,
        { headers, params }
      );

      return response.data.value || [];
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Process individual email
   */
  async processEmail(integration, messageData) {
    const provider = integration.provider;
    const normalizedEmail = this.normalizeEmailData(provider, messageData);
    
    // Check if email already exists
    const existingEmail = await EmailSync.findOne({
      where: {
        integrationId: integration.id,
        externalMessageId: normalizedEmail.externalMessageId
      }
    });

    if (existingEmail) {
      // Update existing email
      await existingEmail.update({
        ...normalizedEmail,
        lastSyncAt: new Date()
      });
      return { action: 'updated', email: existingEmail };
    } else {
      // Create new email record
      const newEmail = await EmailSync.create({
        ...normalizedEmail,
        userId: integration.userId,
        integrationId: integration.id,
        lastSyncAt: new Date()
      });
      
      // Attempt to link with existing lead
      await this.linkEmailToLead(newEmail);
      
      return { action: 'created', email: newEmail };
    }
  }

  /**
   * Normalize email data from different providers
   */
  normalizeEmailData(provider, messageData) {
    if (provider === 'gmail') {
      const headers = this.parseGmailHeaders(messageData.payload.headers);
      const body = this.extractGmailBody(messageData.payload);
      
      return {
        externalMessageId: messageData.id,
        threadId: messageData.threadId,
        subject: headers.subject || 'No Subject',
        fromEmail: this.extractEmail(headers.from),
        fromName: this.extractName(headers.from),
        toEmails: this.parseEmailList(headers.to),
        ccEmails: this.parseEmailList(headers.cc),
        bccEmails: this.parseEmailList(headers.bcc),
        bodyText: body.text,
        bodyHtml: body.html,
        sentAt: new Date(headers.date || Date.now()),
        receivedAt: new Date(parseInt(messageData.internalDate)),
        isRead: !messageData.labelIds?.includes('UNREAD'),
        isStarred: messageData.labelIds?.includes('STARRED') || false,
        isImportant: messageData.labelIds?.includes('IMPORTANT') || false,
        labels: messageData.labelIds || [],
        attachments: this.extractGmailAttachments(messageData.payload),
        hasAttachments: (messageData.payload.parts || []).some(part => 
          part.filename && part.filename.length > 0
        ),
        direction: this.determineDirection(headers, integration.userId),
        syncVersion: messageData.historyId
      };

    } else if (provider === 'outlook_email') {
      return {
        externalMessageId: messageData.id,
        threadId: messageData.conversationId,
        conversationId: messageData.conversationId,
        subject: messageData.subject || 'No Subject',
        fromEmail: messageData.sender?.emailAddress?.address || '',
        fromName: messageData.sender?.emailAddress?.name || '',
        toEmails: (messageData.toRecipients || []).map(r => r.emailAddress.address),
        ccEmails: (messageData.ccRecipients || []).map(r => r.emailAddress.address),
        bccEmails: (messageData.bccRecipients || []).map(r => r.emailAddress.address),
        bodyText: messageData.body?.contentType === 'text' ? messageData.body.content : null,
        bodyHtml: messageData.body?.contentType === 'html' ? messageData.body.content : null,
        sentAt: new Date(messageData.sentDateTime),
        receivedAt: new Date(messageData.receivedDateTime),
        isRead: messageData.isRead || false,
        isStarred: messageData.flag?.flagStatus === 'flagged' || false,
        isImportant: messageData.importance === 'high' || false,
        labels: [], // Outlook uses folders instead of labels
        attachments: this.extractOutlookAttachments(messageData.attachments),
        hasAttachments: messageData.hasAttachments || false,
        direction: this.determineDirection({ from: messageData.sender?.emailAddress?.address }, integration.userId),
        syncVersion: messageData['@odata.etag']
      };
    }

    throw new Error(`Unsupported provider for normalization: ${provider}`);
  }

  /**
   * Get user emails
   */
  async getUserEmails(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      provider = null,
      leadId = null,
      direction = null,
      startDate = null,
      endDate = null
    } = options;

    const where = { userId };
    
    if (leadId) where.leadId = leadId;
    if (direction) where.direction = direction;
    if (startDate || endDate) {
      where.receivedAt = {};
      if (startDate) where.receivedAt[require('sequelize').Op.gte] = startDate;
      if (endDate) where.receivedAt[require('sequelize').Op.lte] = endDate;
    }

    const include = [{
      model: IntegrationSettings,
      attributes: ['provider', 'status'],
      where: provider ? { provider } : {}
    }];

    return await EmailSync.findAll({
      where,
      include,
      order: [['receivedAt', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Send email through provider
   */
  async sendEmail(integrationId, emailData) {
    const integration = await IntegrationSettings.findByPk(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    if (integration.needsRefresh()) {
      await integrationService.refreshToken(integrationId);
      await integration.reload();
    }

    const provider = integration.provider;
    const config = this.providers[provider];
    
    const headers = {
      'Authorization': `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json'
    };

    if (provider === 'gmail') {
      const message = this.buildGmailMessage(emailData);
      const response = await axios.post(
        `${config.baseUrl}/users/me/messages/send`,
        { raw: message },
        { headers }
      );

      return response.data;

    } else if (provider === 'outlook_email') {
      const message = this.buildOutlookMessage(emailData);
      const response = await axios.post(
        `${config.baseUrl}/me/sendMail`,
        { message },
        { headers }
      );

      return response.data;
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Link email to lead based on email address
   */
  async linkEmailToLead(emailRecord) {
    try {
      // Import Lead model dynamically to avoid circular dependency
      const { Lead } = require('../database/models');
      
      const emailAddress = emailRecord.direction === 'inbound' 
        ? emailRecord.fromEmail 
        : emailRecord.getMainRecipient();

      if (!emailAddress) return;

      const lead = await Lead.findOne({
        where: {
          email: emailAddress,
          userId: emailRecord.userId
        }
      });

      if (lead) {
        emailRecord.leadId = lead.id;
        await emailRecord.save();
      }
    } catch (error) {
      console.warn('Failed to link email to lead:', error.message);
    }
  }

  // Helper methods

  parseGmailHeaders(headers) {
    const headerMap = {};
    headers.forEach(header => {
      headerMap[header.name.toLowerCase()] = header.value;
    });
    return headerMap;
  }

  extractGmailBody(payload) {
    let text = '';
    let html = '';

    const extractBody = (part) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text = Buffer.from(part.body.data, 'base64').toString();
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = Buffer.from(part.body.data, 'base64').toString();
      } else if (part.parts) {
        part.parts.forEach(extractBody);
      }
    };

    extractBody(payload);
    return { text, html };
  }

  extractGmailAttachments(payload) {
    const attachments = [];
    
    const extractAttachments = (part) => {
      if (part.filename && part.filename.length > 0) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body?.size || 0,
          attachmentId: part.body?.attachmentId
        });
      } else if (part.parts) {
        part.parts.forEach(extractAttachments);
      }
    };

    extractAttachments(payload);
    return attachments;
  }

  extractOutlookAttachments(attachments) {
    if (!attachments) return [];
    
    return attachments.map(attachment => ({
      filename: attachment.name,
      mimeType: attachment.contentType,
      size: attachment.size,
      attachmentId: attachment.id
    }));
  }

  extractEmail(emailString) {
    if (!emailString) return '';
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString.trim();
  }

  extractName(emailString) {
    if (!emailString) return '';
    const match = emailString.match(/^(.+?)\s*<.+?>$/);
    return match ? match[1].replace(/"/g, '').trim() : '';
  }

  parseEmailList(emailString) {
    if (!emailString) return [];
    return emailString.split(',').map(email => this.extractEmail(email.trim())).filter(Boolean);
  }

  determineDirection(headers, userId) {
    // This is a simplified implementation
    // In practice, you'd need to check against user's email addresses
    return 'inbound'; // Default assumption
  }

  buildGmailMessage(emailData) {
    const message = [
      `To: ${emailData.to.join(', ')}`,
      `Subject: ${emailData.subject}`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      emailData.body
    ].join('\n');

    return Buffer.from(message).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  buildOutlookMessage(emailData) {
    return {
      subject: emailData.subject,
      body: {
        contentType: 'HTML',
        content: emailData.body
      },
      toRecipients: emailData.to.map(email => ({
        emailAddress: { address: email }
      })),
      ccRecipients: emailData.cc?.map(email => ({
        emailAddress: { address: email }
      })) || []
    };
  }
}

module.exports = new EmailService();