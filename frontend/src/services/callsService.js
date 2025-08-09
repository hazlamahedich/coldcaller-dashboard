/**
 * Calls Service
 * Handles all API calls related to call logging and management
 */

import api from './api.js';

// Calls service for managing call logs and statistics
export const callsService = {
  
  /**
   * Get all call logs with filtering and pagination
   * @param {Object} params - Query parameters
   * @param {string} params.leadId - Filter by lead ID
   * @param {string} params.outcome - Filter by call outcome
   * @param {string} params.startDate - Filter calls from this date
   * @param {string} params.endDate - Filter calls to this date
   * @param {number} params.page - Page number for pagination
   * @param {number} params.limit - Number of results per page
   * @returns {Promise<Object>} Call logs with pagination
   */
  getAllCalls: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/calls?${queryString}` : '/calls';
      
      return await api.get(url, {}, true);
    } catch (error) {
      console.error('❌ Failed to fetch call logs:', error);
      // Return fallback data structure
      return {
        success: false,
        data: [],
        pagination: { total: 0, page: 1, limit: 10 },
        message: 'Failed to load call logs'
      };
    }
  },
  
  /**
   * Get a specific call log by ID
   * @param {number|string} callId - Call identifier
   * @returns {Promise<Object>} Call log data
   */
  getCallById: async (callId) => {
    try {
      return await api.get(`/calls/${callId}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to fetch call ${callId}:`, error);
      return {
        success: false,
        data: null,
        message: `Failed to load call ${callId}`
      };
    }
  },
  
  /**
   * Get call logs for a specific lead
   * @param {number|string} leadId - Lead identifier
   * @returns {Promise<Object>} Lead's call history
   */
  getCallsForLead: async (leadId) => {
    try {
      return await api.get(`/calls/lead/${leadId}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to get calls for lead ${leadId}:`, error);
      return {
        success: false,
        data: [],
        message: `Failed to load calls for lead ${leadId}`
      };
    }
  },
  
  /**
   * Log a new call
   * @param {Object} callData - Call information
   * @param {string|number} callData.leadId - Associated lead ID
   * @param {string} callData.phone - Phone number called
   * @param {string} callData.outcome - Call outcome (Connected, Voicemail, Busy, No Answer, etc.)
   * @param {string} callData.duration - Call duration (MM:SS format)
   * @param {string} callData.notes - Call notes
   * @param {string} callData.scheduledFollowup - Follow-up date (optional)
   * @returns {Promise<Object>} Created call log
   */
  logCall: async (callData) => {
    try {
      // Validate required fields
      if (!callData.leadId || !callData.phone || !callData.outcome) {
        throw new Error('Lead ID, phone number, and outcome are required');
      }
      
      // Add timestamp if not provided
      const logData = {
        ...callData,
        timestamp: callData.timestamp || new Date().toISOString(),
        date: callData.date || new Date().toISOString().split('T')[0],
        time: callData.time || new Date().toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      };
      
      return await api.post('/calls', logData, {}, true);
    } catch (error) {
      console.error('❌ Failed to log call:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Failed to log call'
      };
    }
  },
  
  /**
   * Update an existing call log
   * @param {number|string} callId - Call identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated call log
   */
  updateCall: async (callId, updates) => {
    try {
      return await api.put(`/calls/${callId}`, updates, {}, true);
    } catch (error) {
      console.error(`❌ Failed to update call ${callId}:`, error);
      return {
        success: false,
        data: null,
        message: `Failed to update call ${callId}`
      };
    }
  },
  
  /**
   * Delete a call log
   * @param {number|string} callId - Call identifier
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteCall: async (callId) => {
    try {
      return await api.delete(`/calls/${callId}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to delete call ${callId}:`, error);
      return {
        success: false,
        message: `Failed to delete call ${callId}`
      };
    }
  },
  
  /**
   * Get call statistics for today
   * @returns {Promise<Object>} Today's call statistics
   */
  getTodayStats: async () => {
    try {
      return await api.get('/calls/stats/today', {}, true);
    } catch (error) {
      console.error('❌ Failed to get today\'s stats:', error);
      // Return fallback stats
      return {
        success: true,
        data: {
          totalCalls: 0,
          connected: 0,
          voicemails: 0,
          appointments: 0,
          callsMade: 0,
          contactsReached: 0,
          appointmentsSet: 0
        },
        message: 'Using offline data'
      };
    }
  },
  
  /**
   * Get call statistics for a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Date range call statistics
   */
  getStatsForDateRange: async (startDate, endDate) => {
    try {
      const params = new URLSearchParams({ startDate, endDate });
      return await api.get(`/calls/stats/range?${params}`, {}, true);
    } catch (error) {
      console.error('❌ Failed to get date range stats:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to load statistics'
      };
    }
  },
  
  /**
   * Get recent call logs (last N calls)
   * @param {number} limit - Number of recent calls to fetch (default: 10)
   * @returns {Promise<Object>} Recent call logs
   */
  getRecentCalls: async (limit = 10) => {
    try {
      return await api.get(`/calls/recent?limit=${limit}`, {}, true);
    } catch (error) {
      console.error('❌ Failed to get recent calls:', error);
      return {
        success: false,
        data: [],
        message: 'Failed to load recent calls'
      };
    }
  },
  
  /**
   * Get call outcome statistics
   * @param {Object} params - Filter parameters
   * @param {string} params.startDate - Start date filter
   * @param {string} params.endDate - End date filter
   * @returns {Promise<Object>} Outcome statistics
   */
  getOutcomeStats: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/calls/stats/outcomes?${queryString}` : '/calls/stats/outcomes';
      
      return await api.get(url, {}, true);
    } catch (error) {
      console.error('❌ Failed to get outcome stats:', error);
      return {
        success: false,
        data: {},
        message: 'Failed to load outcome statistics'
      };
    }
  },
  
  /**
   * Start a new call session (for real-time tracking)
   * @param {Object} sessionData - Call session info
   * @param {string|number} sessionData.leadId - Lead being called
   * @param {string} sessionData.phone - Phone number
   * @returns {Promise<Object>} Call session ID
   */
  startCallSession: async (sessionData) => {
    try {
      return await api.post('/calls/start', sessionData, {}, false);
    } catch (error) {
      console.error('❌ Failed to start call session:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to start call tracking'
      };
    }
  },
  
  /**
   * End a call session and log the call
   * @param {string} sessionId - Call session identifier
   * @param {Object} callResult - Call outcome data
   * @returns {Promise<Object>} Final call log
   */
  endCallSession: async (sessionId, callResult) => {
    try {
      return await api.post(`/calls/session/${sessionId}/end`, callResult, {}, true);
    } catch (error) {
      console.error('❌ Failed to end call session:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to save call log'
      };
    }
  },
  
  /**
   * Search call logs by notes or lead name
   * @param {string} searchTerm - Search query
   * @param {Object} options - Additional search options
   * @returns {Promise<Object>} Search results
   */
  searchCalls: async (searchTerm, options = {}) => {
    try {
      const params = {
        search: searchTerm,
        ...options
      };
      
      return await this.getAllCalls(params);
    } catch (error) {
      console.error('❌ Failed to search calls:', error);
      return {
        success: false,
        data: [],
        message: 'Search failed'
      };
    }
  }
};

export default callsService;