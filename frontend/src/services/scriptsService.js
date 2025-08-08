/**
 * Scripts Service
 * Handles all API calls related to call scripts management
 */

import api from './api.js';

// Scripts service for managing call scripts and templates
export const scriptsService = {
  
  /**
   * Get all available scripts
   * @param {Object} params - Query parameters
   * @param {string} params.category - Filter by script category
   * @param {string} params.search - Search term for script content
   * @returns {Promise<Object>} Scripts collection
   */
  getAllScripts: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/scripts?${queryString}` : '/scripts';
      
      return await api.get(url, {}, true);
    } catch (error) {
      console.error('❌ Failed to fetch scripts:', error);
      // Return fallback data structure
      return {
        success: false,
        data: {},
        message: 'Failed to load scripts'
      };
    }
  },
  
  /**
   * Get a specific script by ID or key
   * @param {string} scriptKey - Script identifier (introduction, gatekeeper, etc.)
   * @returns {Promise<Object>} Script data
   */
  getScript: async (scriptKey) => {
    try {
      return await api.get(`/scripts/${scriptKey}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to fetch script ${scriptKey}:`, error);
      return {
        success: false,
        data: null,
        message: `Failed to load ${scriptKey} script`
      };
    }
  },
  
  /**
   * Get scripts by category
   * @param {string} category - Script category (introduction, objection, closing, etc.)
   * @returns {Promise<Object>} Filtered scripts
   */
  getScriptsByCategory: async (category) => {
    try {
      return await api.get(`/scripts/category/${category}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to get scripts by category ${category}:`, error);
      return {
        success: false,
        data: [],
        message: `Failed to load ${category} scripts`
      };
    }
  },
  
  /**
   * Create a new script
   * @param {Object} scriptData - Script information
   * @param {string} scriptData.key - Unique script identifier
   * @param {string} scriptData.title - Display title
   * @param {string} scriptData.text - Script content
   * @param {string} scriptData.color - UI color theme
   * @param {string} scriptData.category - Script category
   * @returns {Promise<Object>} Created script
   */
  createScript: async (scriptData) => {
    try {
      // Validate required fields
      if (!scriptData.key || !scriptData.title || !scriptData.text) {
        throw new Error('Key, title, and text are required');
      }
      
      return await api.post('/scripts', scriptData, {}, true);
    } catch (error) {
      console.error('❌ Failed to create script:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Failed to create script'
      };
    }
  },
  
  /**
   * Update an existing script
   * @param {string} scriptKey - Script identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated script
   */
  updateScript: async (scriptKey, updates) => {
    try {
      return await api.put(`/scripts/${scriptKey}`, updates, {}, true);
    } catch (error) {
      console.error(`❌ Failed to update script ${scriptKey}:`, error);
      return {
        success: false,
        data: null,
        message: `Failed to update ${scriptKey} script`
      };
    }
  },
  
  /**
   * Delete a script
   * @param {string} scriptKey - Script identifier
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteScript: async (scriptKey) => {
    try {
      return await api.delete(`/scripts/${scriptKey}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to delete script ${scriptKey}:`, error);
      return {
        success: false,
        message: `Failed to delete ${scriptKey} script`
      };
    }
  },
  
  /**
   * Personalize a script with lead information
   * @param {string} scriptKey - Script identifier
   * @param {Object} leadData - Lead information for personalization
   * @param {string} leadData.name - Lead name
   * @param {string} leadData.company - Company name
   * @param {Object} agentData - Agent information
   * @param {string} agentData.name - Agent name
   * @param {string} agentData.company - Agent's company
   * @returns {Promise<Object>} Personalized script
   */
  personalizeScript: async (scriptKey, leadData, agentData = {}) => {
    try {
      const personalizationData = {
        lead: leadData,
        agent: agentData
      };
      
      return await api.post(`/scripts/${scriptKey}/personalize`, personalizationData, {}, true);
    } catch (error) {
      console.error(`❌ Failed to personalize script ${scriptKey}:`, error);
      return {
        success: false,
        data: null,
        message: 'Failed to personalize script'
      };
    }
  },
  
  /**
   * Search scripts by content
   * @param {string} searchTerm - Search query
   * @returns {Promise<Object>} Search results
   */
  searchScripts: async (searchTerm) => {
    try {
      return await this.getAllScripts({ search: searchTerm });
    } catch (error) {
      console.error('❌ Failed to search scripts:', error);
      return {
        success: false,
        data: [],
        message: 'Search failed'
      };
    }
  },
  
  /**
   * Get script usage statistics
   * @param {string} scriptKey - Script identifier (optional)
   * @returns {Promise<Object>} Usage statistics
   */
  getScriptStats: async (scriptKey = null) => {
    try {
      const url = scriptKey ? `/scripts/${scriptKey}/stats` : '/scripts/stats';
      return await api.get(url, {}, true);
    } catch (error) {
      console.error('❌ Failed to get script stats:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to load script statistics'
      };
    }
  },
  
  /**
   * Get default scripts for new users
   * @returns {Promise<Object>} Default script templates
   */
  getDefaultScripts: async () => {
    try {
      return await api.get('/scripts/defaults', {}, true);
    } catch (error) {
      console.error('❌ Failed to get default scripts:', error);
      // Return fallback default scripts
      return {
        success: true,
        data: {
          introduction: {
            title: "Introduction",
            color: "blue",
            text: "Hi [NAME], this is [YOUR NAME] from [COMPANY]. I'm calling because we help companies like [THEIR COMPANY] reduce their IT costs by up to 30%. Do you have 2 minutes to hear how we've helped similar businesses?"
          },
          gatekeeper: {
            title: "Gatekeeper",
            color: "yellow",
            text: "Hi, I'm trying to reach the person who handles IT decisions at [COMPANY]. Could you point me in the right direction? I have some important information about cost savings that I think they'd want to know about."
          },
          objection: {
            title: "Objection Handling",
            color: "red",
            text: "I completely understand you're busy. That's exactly why I'm calling - we specialize in saving busy executives time and money. Would it be better if I sent you a quick email with the key points and we could schedule a brief call next week?"
          },
          closing: {
            title: "Closing",
            color: "green",
            text: "Great! Based on what you've told me, it sounds like we could really help. The next step would be a 15-minute demo where I can show you exactly how this would work for [COMPANY]. Are you available Tuesday at 2 PM or would Thursday at 10 AM work better?"
          }
        },
        message: 'Default scripts loaded'
      };
    }
  }
};

export default scriptsService;