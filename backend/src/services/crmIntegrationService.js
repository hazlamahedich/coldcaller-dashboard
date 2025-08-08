/**
 * CRM Integration Service - Bi-directional sync with CRM systems
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class CRMIntegrationService {
  constructor() {
    this.providers = {
      salesforce: {
        name: 'Salesforce',
        baseUrl: process.env.SALESFORCE_BASE_URL,
        clientId: process.env.SALESFORCE_CLIENT_ID,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
        username: process.env.SALESFORCE_USERNAME,
        password: process.env.SALESFORCE_PASSWORD,
        securityToken: process.env.SALESFORCE_SECURITY_TOKEN
      },
      hubspot: {
        name: 'HubSpot',
        baseUrl: 'https://api.hubapi.com',
        apiKey: process.env.HUBSPOT_API_KEY,
        accessToken: process.env.HUBSPOT_ACCESS_TOKEN
      },
      pipedrive: {
        name: 'Pipedrive',
        baseUrl: process.env.PIPEDRIVE_BASE_URL,
        apiToken: process.env.PIPEDRIVE_API_TOKEN
      },
      zoho: {
        name: 'Zoho CRM',
        baseUrl: 'https://www.zohoapis.com/crm/v2',
        clientId: process.env.ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN
      }
    };
    
    this.defaultProvider = process.env.DEFAULT_CRM_PROVIDER || 'hubspot';
    this.syncQueue = [];
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
    
    // Start sync processor
    this.startSyncProcessor();
  }

  /**
   * Sync call log to CRM system
   */
  async syncCallLog(callId, provider = null) {
    try {
      const providerName = provider || this.defaultProvider;
      console.log(`Syncing call ${callId} to ${providerName} CRM`);
      
      // Get call log data (this would typically query the database)
      const callLog = await this.getCallLogData(callId);
      if (!callLog) {
        throw new Error(`Call log ${callId} not found`);
      }
      
      // Add to sync queue for processing
      this.addToSyncQueue({
        id: uuidv4(),
        type: 'call_log',
        action: 'create_or_update',
        provider: providerName,
        data: callLog,
        callId,
        attempts: 0,
        createdAt: new Date()
      });
      
      return { success: true, provider: providerName, status: 'queued' };
      
    } catch (error) {
      console.error(`Failed to queue call sync for ${callId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync lead data to CRM
   */
  async syncLead(leadData, provider = null) {
    try {
      const providerName = provider || this.defaultProvider;
      console.log(`Syncing lead ${leadData.id} to ${providerName} CRM`);
      
      this.addToSyncQueue({
        id: uuidv4(),
        type: 'lead',
        action: 'create_or_update',
        provider: providerName,
        data: leadData,
        leadId: leadData.id,
        attempts: 0,
        createdAt: new Date()
      });
      
      return { success: true, provider: providerName, status: 'queued' };
      
    } catch (error) {
      console.error(`Failed to queue lead sync:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync opportunity/deal data to CRM
   */
  async syncOpportunity(opportunityData, provider = null) {
    try {
      const providerName = provider || this.defaultProvider;
      console.log(`Syncing opportunity ${opportunityData.id} to ${providerName} CRM`);
      
      this.addToSyncQueue({
        id: uuidv4(),
        type: 'opportunity',
        action: 'create_or_update',
        provider: providerName,
        data: opportunityData,
        opportunityId: opportunityData.id,
        attempts: 0,
        createdAt: new Date()
      });
      
      return { success: true, provider: providerName, status: 'queued' };
      
    } catch (error) {
      console.error(`Failed to queue opportunity sync:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk sync multiple records
   */
  async bulkSync(records, provider = null) {
    try {
      const providerName = provider || this.defaultProvider;
      console.log(`Starting bulk sync of ${records.length} records to ${providerName}`);
      
      const syncResults = [];
      
      for (const record of records) {
        const syncItem = {
          id: uuidv4(),
          type: record.type,
          action: record.action || 'create_or_update',
          provider: providerName,
          data: record.data,
          attempts: 0,
          createdAt: new Date()
        };
        
        // Add record-specific IDs
        if (record.callId) syncItem.callId = record.callId;
        if (record.leadId) syncItem.leadId = record.leadId;
        if (record.opportunityId) syncItem.opportunityId = record.opportunityId;
        
        this.addToSyncQueue(syncItem);
        syncResults.push({ id: record.id || record.data.id, status: 'queued' });
      }
      
      return {
        success: true,
        provider: providerName,
        totalRecords: records.length,
        results: syncResults
      };
      
    } catch (error) {
      console.error(`Bulk sync failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Import data from CRM
   */
  async importFromCRM(importType, options = {}, provider = null) {
    try {
      const providerName = provider || this.defaultProvider;
      console.log(`Importing ${importType} from ${providerName} CRM`);
      
      switch (providerName) {
        case 'salesforce':
          return await this.importFromSalesforce(importType, options);
        case 'hubspot':
          return await this.importFromHubSpot(importType, options);
        case 'pipedrive':
          return await this.importFromPipedrive(importType, options);
        case 'zoho':
          return await this.importFromZoho(importType, options);
        default:
          throw new Error(`Unsupported CRM provider: ${providerName}`);
      }
      
    } catch (error) {
      console.error(`CRM import failed:`, error);
      throw new Error(`CRM import failed: ${error.message}`);
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(callId = null, leadId = null) {
    try {
      let queueItems = [...this.syncQueue];
      
      // Filter by specific IDs if provided
      if (callId) {
        queueItems = queueItems.filter(item => item.callId === callId);
      }
      if (leadId) {
        queueItems = queueItems.filter(item => item.leadId === leadId);
      }
      
      const statusSummary = {
        total: queueItems.length,
        pending: queueItems.filter(item => item.status === 'pending').length,
        processing: queueItems.filter(item => item.status === 'processing').length,
        completed: queueItems.filter(item => item.status === 'completed').length,
        failed: queueItems.filter(item => item.status === 'failed').length,
        items: queueItems.map(item => ({
          id: item.id,
          type: item.type,
          provider: item.provider,
          status: item.status || 'pending',
          attempts: item.attempts,
          lastAttempt: item.lastAttempt,
          error: item.error
        }))
      };
      
      return statusSummary;
      
    } catch (error) {
      console.error(`Failed to get sync status:`, error);
      throw new Error(`Sync status retrieval failed: ${error.message}`);
    }
  }

  /**
   * Process sync queue items
   */
  startSyncProcessor() {
    setInterval(async () => {
      if (this.syncQueue.length === 0) return;
      
      const pendingItems = this.syncQueue.filter(item => 
        !item.status || item.status === 'pending' || 
        (item.status === 'failed' && item.attempts < this.retryAttempts)
      );
      
      if (pendingItems.length === 0) return;
      
      console.log(`Processing ${pendingItems.length} sync items`);
      
      for (const item of pendingItems.slice(0, 5)) { // Process max 5 items at once
        await this.processSyncItem(item);
      }
    }, 10000); // Process every 10 seconds
  }

  /**
   * Process individual sync item
   */
  async processSyncItem(item) {
    try {
      item.status = 'processing';
      item.attempts = (item.attempts || 0) + 1;
      item.lastAttempt = new Date();
      
      console.log(`Processing sync item ${item.id} (attempt ${item.attempts})`);
      
      let result;
      switch (item.provider) {
        case 'salesforce':
          result = await this.syncToSalesforce(item);
          break;
        case 'hubspot':
          result = await this.syncToHubSpot(item);
          break;
        case 'pipedrive':
          result = await this.syncToPipedrive(item);
          break;
        case 'zoho':
          result = await this.syncToZoho(item);
          break;
        default:
          throw new Error(`Unsupported provider: ${item.provider}`);
      }
      
      if (result.success) {
        item.status = 'completed';
        item.completedAt = new Date();
        item.crmRecordId = result.crmRecordId;
        console.log(`Successfully synced item ${item.id} to ${item.provider}`);
      } else {
        throw new Error(result.error || 'Sync failed');
      }
      
    } catch (error) {
      console.error(`Sync item ${item.id} failed (attempt ${item.attempts}):`, error);
      
      item.error = error.message;
      item.lastError = new Date();
      
      if (item.attempts >= this.retryAttempts) {
        item.status = 'failed';
        console.error(`Sync item ${item.id} permanently failed after ${item.attempts} attempts`);
      } else {
        item.status = 'pending';
        console.log(`Sync item ${item.id} will be retried (attempt ${item.attempts}/${this.retryAttempts})`);
      }
    }
  }

  // Provider-specific sync methods

  /**
   * Sync to Salesforce
   */
  async syncToSalesforce(item) {
    try {
      const config = this.providers.salesforce;
      
      // Get access token
      const authResponse = await axios.post(`${config.baseUrl}/services/oauth2/token`, {
        grant_type: 'password',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        username: config.username,
        password: config.password + config.securityToken
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const accessToken = authResponse.data.access_token;
      const instanceUrl = authResponse.data.instance_url;
      
      // Map data to Salesforce format
      const salesforceData = this.mapToSalesforceFormat(item);
      
      // Sync to Salesforce
      const syncResponse = await axios.post(
        `${instanceUrl}/services/data/v52.0/sobjects/${salesforceData.objectType}`,
        salesforceData.data,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        crmRecordId: syncResponse.data.id,
        provider: 'salesforce'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Sync to HubSpot
   */
  async syncToHubSpot(item) {
    try {
      const config = this.providers.hubspot;
      
      // Map data to HubSpot format
      const hubspotData = this.mapToHubSpotFormat(item);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Use API key or access token
      if (config.accessToken) {
        headers['Authorization'] = `Bearer ${config.accessToken}`;
      } else if (config.apiKey) {
        hubspotData.url += `?hapikey=${config.apiKey}`;
      }
      
      const syncResponse = await axios.post(
        `${config.baseUrl}${hubspotData.endpoint}`,
        hubspotData.data,
        { headers }
      );
      
      return {
        success: true,
        crmRecordId: syncResponse.data.id,
        provider: 'hubspot'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Sync to Pipedrive
   */
  async syncToPipedrive(item) {
    try {
      const config = this.providers.pipedrive;
      
      // Map data to Pipedrive format
      const pipedriveData = this.mapToPipedriveFormat(item);
      
      const syncResponse = await axios.post(
        `${config.baseUrl}${pipedriveData.endpoint}?api_token=${config.apiToken}`,
        pipedriveData.data,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      return {
        success: true,
        crmRecordId: syncResponse.data.data.id,
        provider: 'pipedrive'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Sync to Zoho CRM
   */
  async syncToZoho(item) {
    try {
      const config = this.providers.zoho;
      
      // Get access token using refresh token
      const authResponse = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        {
          refresh_token: config.refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'refresh_token'
        }
      );
      
      const accessToken = authResponse.data.access_token;
      
      // Map data to Zoho format
      const zohoData = this.mapToZohoFormat(item);
      
      const syncResponse = await axios.post(
        `${config.baseUrl}/${zohoData.module}`,
        { data: [zohoData.data] },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        crmRecordId: syncResponse.data.data[0].details.id,
        provider: 'zoho'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Data mapping methods

  mapToSalesforceFormat(item) {
    switch (item.type) {
      case 'call_log':
        return {
          objectType: 'Task',
          data: {
            Subject: `Call: ${item.data.leadName}`,
            Description: item.data.callNotes?.summary || 'Cold call activity',
            ActivityDate: new Date(item.data.initiatedAt).toISOString().split('T')[0],
            Status: item.data.outcome === 'connected' ? 'Completed' : 'Not Started',
            Priority: item.data.priority || 'Normal',
            Type: 'Call',
            WhoId: item.data.leadId, // Contact/Lead ID
            CallDurationInSeconds: item.data.duration
          }
        };
      case 'lead':
        return {
          objectType: 'Lead',
          data: {
            FirstName: item.data.firstName,
            LastName: item.data.lastName,
            Company: item.data.company,
            Phone: item.data.phone,
            Email: item.data.email,
            Status: item.data.status || 'Open - Not Contacted'
          }
        };
      default:
        throw new Error(`Unsupported item type for Salesforce: ${item.type}`);
    }
  }

  mapToHubSpotFormat(item) {
    switch (item.type) {
      case 'call_log':
        return {
          endpoint: '/crm/v3/objects/calls',
          data: {
            properties: {
              hs_call_title: `Call: ${item.data.leadName}`,
              hs_call_body: item.data.callNotes?.summary || 'Cold call activity',
              hs_call_duration: (item.data.duration * 1000), // HubSpot expects milliseconds
              hs_call_from_number: item.data.phoneNumber,
              hs_call_disposition: item.data.disposition,
              hs_call_status: item.data.status,
              hs_activity_date: new Date(item.data.initiatedAt).getTime()
            }
          }
        };
      case 'lead':
        return {
          endpoint: '/crm/v3/objects/contacts',
          data: {
            properties: {
              firstname: item.data.firstName,
              lastname: item.data.lastName,
              company: item.data.company,
              phone: item.data.phone,
              email: item.data.email,
              lifecyclestage: 'lead'
            }
          }
        };
      default:
        throw new Error(`Unsupported item type for HubSpot: ${item.type}`);
    }
  }

  mapToPipedriveFormat(item) {
    switch (item.type) {
      case 'call_log':
        return {
          endpoint: '/v1/activities',
          data: {
            subject: `Call: ${item.data.leadName}`,
            type: 'call',
            due_date: new Date(item.data.initiatedAt).toISOString().split('T')[0],
            duration: `${Math.floor(item.data.duration / 60)}:${(item.data.duration % 60).toString().padStart(2, '0')}`,
            note: item.data.callNotes?.summary || 'Cold call activity',
            person_id: item.data.leadId
          }
        };
      case 'lead':
        return {
          endpoint: '/v1/persons',
          data: {
            name: `${item.data.firstName} ${item.data.lastName}`,
            phone: [{ value: item.data.phone, primary: true }],
            email: [{ value: item.data.email, primary: true }],
            org_name: item.data.company
          }
        };
      default:
        throw new Error(`Unsupported item type for Pipedrive: ${item.type}`);
    }
  }

  mapToZohoFormat(item) {
    switch (item.type) {
      case 'call_log':
        return {
          module: 'Calls',
          data: {
            Subject: `Call: ${item.data.leadName}`,
            Call_Start_Time: new Date(item.data.initiatedAt).toISOString(),
            Call_Duration: `${Math.floor(item.data.duration / 60)}:${(item.data.duration % 60).toString().padStart(2, '0')}`,
            Description: item.data.callNotes?.summary || 'Cold call activity',
            Call_Result: item.data.outcome,
            Who_Id: item.data.leadId
          }
        };
      case 'lead':
        return {
          module: 'Leads',
          data: {
            First_Name: item.data.firstName,
            Last_Name: item.data.lastName,
            Company: item.data.company,
            Phone: item.data.phone,
            Email: item.data.email,
            Lead_Status: 'Not Contacted'
          }
        };
      default:
        throw new Error(`Unsupported item type for Zoho: ${item.type}`);
    }
  }

  // Import methods (simplified implementations)

  async importFromSalesforce(importType, options) {
    // Implementation for importing data from Salesforce
    return { success: true, records: [], total: 0 };
  }

  async importFromHubSpot(importType, options) {
    // Implementation for importing data from HubSpot
    return { success: true, records: [], total: 0 };
  }

  async importFromPipedrive(importType, options) {
    // Implementation for importing data from Pipedrive
    return { success: true, records: [], total: 0 };
  }

  async importFromZoho(importType, options) {
    // Implementation for importing data from Zoho
    return { success: true, records: [], total: 0 };
  }

  // Helper methods

  addToSyncQueue(item) {
    this.syncQueue.push(item);
    console.log(`Added item ${item.id} to sync queue. Queue size: ${this.syncQueue.length}`);
  }

  async getCallLogData(callId) {
    // This would typically query the database to get call log data
    // For now, return mock data
    return {
      id: callId,
      leadId: 'lead-123',
      leadName: 'John Doe',
      phoneNumber: '+1234567890',
      initiatedAt: new Date(),
      duration: 300,
      outcome: 'connected',
      disposition: 'interested',
      callNotes: {
        summary: 'Productive conversation about IT services'
      },
      priority: 'medium'
    };
  }

  /**
   * Clean up completed sync items older than 24 hours
   */
  cleanupCompletedItems() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const initialLength = this.syncQueue.length;
    
    this.syncQueue = this.syncQueue.filter(item => {
      if (item.status === 'completed' && new Date(item.completedAt) < oneDayAgo) {
        return false;
      }
      if (item.status === 'failed' && new Date(item.lastError) < oneDayAgo) {
        return false;
      }
      return true;
    });
    
    const cleanedCount = initialLength - this.syncQueue.length;
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old sync items`);
    }
  }

  /**
   * Get supported CRM providers and their capabilities
   */
  getSupportedProviders() {
    return Object.entries(this.providers).map(([key, config]) => ({
      id: key,
      name: config.name,
      configured: this.isProviderConfigured(key),
      capabilities: this.getProviderCapabilities(key)
    }));
  }

  isProviderConfigured(provider) {
    const config = this.providers[provider];
    switch (provider) {
      case 'salesforce':
        return !!(config.clientId && config.clientSecret && config.username && config.password);
      case 'hubspot':
        return !!(config.apiKey || config.accessToken);
      case 'pipedrive':
        return !!(config.apiToken && config.baseUrl);
      case 'zoho':
        return !!(config.clientId && config.clientSecret && config.refreshToken);
      default:
        return false;
    }
  }

  getProviderCapabilities(provider) {
    const commonCapabilities = ['call_logs', 'leads', 'contacts'];
    
    switch (provider) {
      case 'salesforce':
        return [...commonCapabilities, 'opportunities', 'accounts', 'campaigns'];
      case 'hubspot':
        return [...commonCapabilities, 'deals', 'companies', 'workflows'];
      case 'pipedrive':
        return [...commonCapabilities, 'deals', 'organizations', 'activities'];
      case 'zoho':
        return [...commonCapabilities, 'potentials', 'accounts', 'campaigns'];
      default:
        return commonCapabilities;
    }
  }
}

// Start cleanup process every hour
setInterval(() => {
  if (global.crmService) {
    global.crmService.cleanupCompletedItems();
  }
}, 60 * 60 * 1000);

module.exports = new CRMIntegrationService();