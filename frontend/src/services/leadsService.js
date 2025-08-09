/**
 * Leads Service
 * Handles all API calls related to leads management
 */

import api from './api.js';

// Leads service for managing prospect data
export const leadsService = {
  
  /**
   * Get all leads with optional filtering and pagination
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by lead status
   * @param {string} params.search - Search term for name/company
   * @param {number} params.page - Page number for pagination
   * @param {number} params.limit - Number of results per page
   * @returns {Promise<Object>} Response with leads array and pagination info
   */
  getAllLeads: async (params = {}) => {
    try {
      console.log('🚀 [leadsService] getAllLeads called with params:', params);
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/leads?${queryString}` : '/leads';
      console.log('📡 [leadsService] Making API request to:', url);
      
      const result = await api.get(url, {}, true); // With retry
      console.log('✅ [leadsService] API response received:', {
        result,
        type: typeof result,
        keys: result ? Object.keys(result) : 'No result',
        hasSuccess: result?.hasOwnProperty('success'),
        hasData: result?.hasOwnProperty('data'),
        successValue: result?.success,
        dataType: typeof result?.data,
        dataIsArray: Array.isArray(result?.data)
      });
      
      return result;
    } catch (error) {
      console.error('❌ [leadsService] Failed to fetch leads:', error);
      console.error('❌ [leadsService] Error details:', {
        name: error.name,
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      // Return fallback data structure
      const fallback = {
        success: false,
        data: [],
        pagination: { total: 0, page: 1, limit: 10 },
        message: error.message || 'Failed to load leads'
      };
      console.log('🔄 [leadsService] Returning fallback data:', fallback);
      return fallback;
    }
  },
  
  /**
   * Get a single lead by ID
   * @param {number|string} leadId - Lead identifier
   * @returns {Promise<Object>} Lead data object
   */
  getLeadById: async (leadId) => {
    try {
      return await api.get(`/leads/${leadId}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to fetch lead ${leadId}:`, error);
      return {
        success: false,
        data: null,
        message: `Failed to load lead ${leadId}`
      };
    }
  },
  
  /**
   * Create a new lead
   * @param {Object} leadData - Lead information
   * @param {string} leadData.name - Contact name
   * @param {string} leadData.company - Company name
   * @param {string} leadData.phone - Phone number
   * @param {string} leadData.email - Email address
   * @param {string} leadData.notes - Initial notes
   * @returns {Promise<Object>} Created lead data
   */
  createLead: async (leadData) => {
    try {
      // Validate required fields
      if (!leadData.name || !leadData.phone) {
        throw new Error('Name and phone number are required');
      }
      
      return await api.post('/leads', leadData, {}, true);
    } catch (error) {
      console.error('❌ Failed to create lead:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Failed to create lead'
      };
    }
  },
  
  /**
   * Update an existing lead
   * @param {number|string} leadId - Lead identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated lead data
   */
  updateLead: async (leadId, updates) => {
    try {
      return await api.put(`/leads/${leadId}`, updates, {}, true);
    } catch (error) {
      console.error(`❌ Failed to update lead ${leadId}:`, error);
      return {
        success: false,
        data: null,
        message: `Failed to update lead ${leadId}`
      };
    }
  },
  
  /**
   * Update lead notes
   * @param {number|string} leadId - Lead identifier
   * @param {string} notes - New notes content
   * @returns {Promise<Object>} Updated lead data
   */
  updateLeadNotes: async (leadId, notes) => {
    try {
      return await api.put(`/leads/${leadId}/notes`, { notes }, {}, true);
    } catch (error) {
      console.error(`❌ Failed to update notes for lead ${leadId}:`, error);
      return {
        success: false,
        data: null,
        message: 'Failed to update notes'
      };
    }
  },
  
  /**
   * Update lead status
   * @param {number|string} leadId - Lead identifier
   * @param {string} status - New status (New, Follow-up, Qualified, Closed)
   * @returns {Promise<Object>} Updated lead data
   */
  updateLeadStatus: async (leadId, status) => {
    try {
      const validStatuses = ['New', 'Follow-up', 'Qualified', 'Closed', 'Not Interested'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
      
      return await api.put(`/leads/${leadId}/status`, { status }, {}, true);
    } catch (error) {
      console.error(`❌ Failed to update status for lead ${leadId}:`, error);
      return {
        success: false,
        data: null,
        message: error.message || 'Failed to update status'
      };
    }
  },
  
  /**
   * Delete a lead
   * @param {number|string} leadId - Lead identifier
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteLead: async (leadId) => {
    try {
      return await api.delete(`/leads/${leadId}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to delete lead ${leadId}:`, error);
      return {
        success: false,
        message: `Failed to delete lead ${leadId}`
      };
    }
  },
  
  /**
   * Search leads by name or company
   * @param {string} searchTerm - Search query
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Search results
   */
  searchLeads: async (searchTerm, options = {}) => {
    try {
      const params = {
        search: searchTerm,
        ...options
      };
      
      return await this.getAllLeads(params);
    } catch (error) {
      console.error('❌ Failed to search leads:', error);
      return {
        success: false,
        data: [],
        message: 'Search failed'
      };
    }
  },
  
  /**
   * Get leads by status
   * @param {string} status - Status to filter by
   * @returns {Promise<Object>} Filtered leads
   */
  getLeadsByStatus: async (status) => {
    try {
      return await this.getAllLeads({ status });
    } catch (error) {
      console.error(`❌ Failed to get leads by status ${status}:`, error);
      return {
        success: false,
        data: [],
        message: `Failed to load ${status} leads`
      };
    }
  },
  
  /**
   * Get lead activity/call history
   * @param {number|string} leadId - Lead identifier
   * @returns {Promise<Object>} Lead activity history
   */
  getLeadActivity: async (leadId) => {
    try {
      return await api.get(`/leads/${leadId}/activity`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to get activity for lead ${leadId}:`, error);
      return {
        success: false,
        data: [],
        message: 'Failed to load lead activity'
      };
    }
  }
};

export default leadsService;