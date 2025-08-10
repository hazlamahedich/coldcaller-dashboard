/**
 * Token Refresh Service
 * Background service to automatically refresh OAuth tokens before expiration
 */

const cron = require('node-cron');
const { IntegrationSettings } = require('../database/models');
const integrationService = require('./integrationService');
const webhookService = require('./webhookService');

class TokenRefreshService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.refreshQueue = [];
    this.processingQueue = false;
  }

  /**
   * Start the token refresh service
   */
  start() {
    if (this.isRunning) {
      console.log('Token refresh service is already running');
      return;
    }

    // Run every 30 minutes
    this.cronJob = cron.schedule('*/30 * * * *', async () => {
      await this.checkAndRefreshTokens();
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;

    console.log('🔄 Token refresh service started - checking every 30 minutes');

    // Run initial check
    this.checkAndRefreshTokens();
  }

  /**
   * Stop the token refresh service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('🛑 Token refresh service stopped');
  }

  /**
   * Check for tokens that need refresh and queue them
   */
  async checkAndRefreshTokens() {
    try {
      console.log('🔍 Checking for tokens that need refresh...');

      // Find integrations with tokens expiring in the next hour
      const oneHourFromNow = new Date(Date.now() + (60 * 60 * 1000));
      
      const expiredIntegrations = await IntegrationSettings.findAll({
        where: {
          status: 'connected',
          isActive: true,
          tokenExpiresAt: {
            [require('sequelize').Op.lte]: oneHourFromNow
          }
        }
      });

      console.log(`Found ${expiredIntegrations.length} integrations that need token refresh`);

      // Add to refresh queue
      for (const integration of expiredIntegrations) {
        if (!this.refreshQueue.some(item => item.id === integration.id)) {
          this.refreshQueue.push({
            id: integration.id,
            provider: integration.provider,
            userId: integration.userId,
            expiresAt: integration.tokenExpiresAt,
            priority: this.calculatePriority(integration.tokenExpiresAt)
          });
        }
      }

      // Process the queue
      if (!this.processingQueue && this.refreshQueue.length > 0) {
        await this.processRefreshQueue();
      }

    } catch (error) {
      console.error('Token refresh check failed:', error);
    }
  }

  /**
   * Process the token refresh queue
   */
  async processRefreshQueue() {
    if (this.processingQueue) return;

    this.processingQueue = true;
    console.log(`📋 Processing ${this.refreshQueue.length} token refresh requests`);

    // Sort by priority (most urgent first)
    this.refreshQueue.sort((a, b) => b.priority - a.priority);

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    while (this.refreshQueue.length > 0) {
      const item = this.refreshQueue.shift();
      
      try {
        await this.refreshIntegrationToken(item.id);
        results.successful++;
        console.log(`✅ Token refreshed successfully for integration ${item.id} (${item.provider})`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          integration: item.id,
          provider: item.provider,
          error: error.message
        });
        console.error(`❌ Token refresh failed for integration ${item.id} (${item.provider}):`, error.message);
      }

      // Add delay between requests to avoid rate limiting
      await this.delay(1000);
    }

    this.processingQueue = false;
    
    if (results.successful > 0 || results.failed > 0) {
      console.log(`🔄 Token refresh completed: ${results.successful} successful, ${results.failed} failed`);
    }

    return results;
  }

  /**
   * Refresh token for a specific integration
   */
  async refreshIntegrationToken(integrationId) {
    try {
      // Refresh the OAuth token
      const integration = await integrationService.refreshToken(integrationId);
      
      // Check if webhooks need to be refreshed too
      const webhookStatus = await webhookService.getWebhookStatus(integration);
      
      if (webhookStatus.hasWebhook && webhookStatus.isExpired) {
        console.log(`🪝 Refreshing webhook for integration ${integrationId}`);
        try {
          await webhookService.refreshWebhook(integration);
        } catch (webhookError) {
          console.warn(`⚠️ Webhook refresh failed for integration ${integrationId}:`, webhookError.message);
          // Don't fail the token refresh if webhook refresh fails
        }
      }

      return integration;
    } catch (error) {
      // Mark integration as expired if refresh fails
      try {
        await IntegrationSettings.update(
          { 
            status: 'expired',
            lastSyncError: `Token refresh failed: ${error.message}`
          },
          { where: { id: integrationId } }
        );
      } catch (updateError) {
        console.error('Failed to mark integration as expired:', updateError);
      }
      
      throw error;
    }
  }

  /**
   * Calculate priority based on how soon the token expires
   */
  calculatePriority(expiresAt) {
    const now = Date.now();
    const expiresAtTime = new Date(expiresAt).getTime();
    const timeUntilExpiry = expiresAtTime - now;
    
    // Higher priority for tokens expiring sooner
    // Max priority 100 for tokens expiring in the next 5 minutes
    if (timeUntilExpiry <= 5 * 60 * 1000) return 100;
    if (timeUntilExpiry <= 15 * 60 * 1000) return 75;
    if (timeUntilExpiry <= 30 * 60 * 1000) return 50;
    if (timeUntilExpiry <= 60 * 60 * 1000) return 25;
    
    return 10; // Low priority
  }

  /**
   * Manual refresh for specific integration
   */
  async manualRefresh(integrationId) {
    console.log(`🔄 Manual token refresh requested for integration ${integrationId}`);
    return await this.refreshIntegrationToken(integrationId);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueLength: this.refreshQueue.length,
      processingQueue: this.processingQueue,
      nextCheck: this.cronJob?.nextDates()?.toISOString() || null
    };
  }

  /**
   * Get refresh statistics
   */
  async getRefreshStats(hours = 24) {
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    try {
      const integrations = await IntegrationSettings.findAll({
        where: {
          updatedAt: {
            [require('sequelize').Op.gte]: startTime
          }
        },
        attributes: ['provider', 'status', 'updatedAt', 'lastSyncError']
      });

      const stats = {
        total: integrations.length,
        byStatus: {},
        byProvider: {},
        recent: integrations.slice(0, 10).map(i => ({
          provider: i.provider,
          status: i.status,
          updatedAt: i.updatedAt,
          hasError: !!i.lastSyncError
        }))
      };

      integrations.forEach(integration => {
        stats.byStatus[integration.status] = (stats.byStatus[integration.status] || 0) + 1;
        stats.byProvider[integration.provider] = (stats.byProvider[integration.provider] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get refresh stats:', error);
      return {
        total: 0,
        byStatus: {},
        byProvider: {},
        recent: []
      };
    }
  }

  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create and export singleton instance
const tokenRefreshService = new TokenRefreshService();

// Start the service automatically when the module is loaded
process.nextTick(() => {
  tokenRefreshService.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping token refresh service...');
  tokenRefreshService.stop();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping token refresh service...');
  tokenRefreshService.stop();
});

module.exports = tokenRefreshService;