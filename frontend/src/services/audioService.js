/**
 * Audio Service (Performance Optimized)
 * Handles all API calls related to audio clips management with performance optimizations
 */

import api from './api.js';
import audioPerformanceManager from '../utils/audioPerformanceManager';
import audioAnalytics from '../utils/audioAnalytics';

// Audio service for managing audio clips and playback with performance optimization
export const audioService = {
  
  /**
   * Get all audio clips organized by category (Performance Optimized)
   * @param {Object} params - Query parameters
   * @param {string} params.category - Filter by audio category
   * @param {string} params.search - Search term for audio name
   * @returns {Promise<Object>} Audio clips collection
   */
  getAllAudioClips: async (params = {}) => {
    const startTime = performance.now();
    
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/audio?${queryString}` : '/audio';
      
      const response = await api.get(url, {}, true);
      
      // Initialize performance optimization after first load
      if (response.success && response.data) {
        // Preload high-priority audio clips
        audioPerformanceManager.preloadAudioClips(response.data, ['audio_001', 'audio_004', 'audio_007']);
      }
      
      const loadTime = performance.now() - startTime;
      console.log(`⚡ Audio clips loaded in ${loadTime.toFixed(0)}ms`);
      
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch audio clips:', error);
      audioAnalytics.recordError('fetch_clips', null, error.message);
      
      // Return fallback data structure
      return {
        success: false,
        data: {},
        message: 'Failed to load audio clips'
      };
    }
  },
  
  /**
   * Get audio clips by category
   * @param {string} category - Audio category (greetings, objections, closing)
   * @returns {Promise<Object>} Filtered audio clips
   */
  getAudioByCategory: async (category) => {
    try {
      return await api.get(`/audio/category/${category}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to get audio by category ${category}:`, error);
      return {
        success: false,
        data: [],
        message: `Failed to load ${category} audio clips`
      };
    }
  },
  
  /**
   * Get a specific audio clip by ID
   * @param {number|string} audioId - Audio clip identifier
   * @returns {Promise<Object>} Audio clip data
   */
  getAudioClip: async (audioId) => {
    try {
      return await api.get(`/audio/${audioId}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to fetch audio clip ${audioId}:`, error);
      return {
        success: false,
        data: null,
        message: `Failed to load audio clip ${audioId}`
      };
    }
  },
  
  /**
   * Get audio clip file URL for playback
   * @param {number|string} audioId - Audio clip identifier
   * @returns {Promise<Object>} Audio file URL
   */
  getAudioUrl: async (audioId) => {
    try {
      return await api.get(`/audio/${audioId}/url`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to get audio URL for ${audioId}:`, error);
      return {
        success: false,
        data: null,
        message: 'Failed to get audio URL'
      };
    }
  },
  
  /**
   * Upload a new audio clip
   * @param {FormData} audioData - Form data with audio file and metadata
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} Upload result
   */
  uploadAudioClip: async (audioData, onProgress = null) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      
      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        };
      }
      
      return await api.post('/audio/upload', audioData, config, true);
    } catch (error) {
      console.error('❌ Failed to upload audio clip:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Failed to upload audio clip'
      };
    }
  },
  
  /**
   * Update audio clip metadata
   * @param {number|string} audioId - Audio clip identifier
   * @param {Object} updates - Metadata to update
   * @param {string} updates.name - Display name
   * @param {string} updates.category - Audio category
   * @param {string} updates.description - Audio description
   * @returns {Promise<Object>} Updated audio clip
   */
  updateAudioClip: async (audioId, updates) => {
    try {
      return await api.put(`/audio/${audioId}`, updates, {}, true);
    } catch (error) {
      console.error(`❌ Failed to update audio clip ${audioId}:`, error);
      return {
        success: false,
        data: null,
        message: `Failed to update audio clip ${audioId}`
      };
    }
  },
  
  /**
   * Delete an audio clip
   * @param {number|string} audioId - Audio clip identifier
   * @returns {Promise<Object>} Deletion confirmation
   */
  deleteAudioClip: async (audioId) => {
    try {
      return await api.delete(`/audio/${audioId}`, {}, true);
    } catch (error) {
      console.error(`❌ Failed to delete audio clip ${audioId}:`, error);
      return {
        success: false,
        message: `Failed to delete audio clip ${audioId}`
      };
    }
  },
  
  /**
   * Search audio clips by name
   * @param {string} searchTerm - Search query
   * @returns {Promise<Object>} Search results
   */
  searchAudioClips: async (searchTerm) => {
    try {
      return await this.getAllAudioClips({ search: searchTerm });
    } catch (error) {
      console.error('❌ Failed to search audio clips:', error);
      return {
        success: false,
        data: [],
        message: 'Search failed'
      };
    }
  },
  
  /**
   * Get audio clip usage statistics
   * @param {number|string} audioId - Audio clip identifier (optional)
   * @returns {Promise<Object>} Usage statistics
   */
  getAudioStats: async (audioId = null) => {
    try {
      const url = audioId ? `/audio/${audioId}/stats` : '/audio/stats';
      return await api.get(url, {}, true);
    } catch (error) {
      console.error('❌ Failed to get audio stats:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to load audio statistics'
      };
    }
  },
  
  /**
   * Get default audio clips for new users
   * @returns {Promise<Object>} Default audio clips
   */
  getDefaultAudioClips: async () => {
    try {
      return await api.get('/audio/defaults', {}, true);
    } catch (error) {
      console.error('❌ Failed to get default audio clips:', error);
      // Return fallback default audio structure as array (consistent with API)
      const defaultClips = [
        // Greetings
        { id: 1, name: "Professional Intro", duration: "0:15", category: "greetings" },
        { id: 2, name: "Casual Intro", duration: "0:12", category: "greetings" },
        { id: 3, name: "Executive Intro", duration: "0:18", category: "greetings" },
        // Objections
        { id: 4, name: "Not Interested", duration: "0:20", category: "objections" },
        { id: 5, name: "Too Busy", duration: "0:15", category: "objections" },
        { id: 6, name: "Send Email", duration: "0:18", category: "objections" },
        // Closing
        { id: 7, name: "Schedule Meeting", duration: "0:22", category: "closing" },
        { id: 8, name: "Trial Offer", duration: "0:25", category: "closing" },
        { id: 9, name: "Next Steps", duration: "0:20", category: "closing" },
        // Custom - This is key for showing custom category!
        { id: 10, name: "My Custom Recording", duration: "0:30", category: "custom" },
        { id: 11, name: "Personal Follow-up", duration: "0:25", category: "custom" }
      ];
      
      return {
        success: true,
        data: defaultClips,
        message: 'Default audio clips loaded'
      };
    }
  },
  
  /**
   * Record usage of an audio clip (Enhanced with Analytics)
   * @param {number|string} audioId - Audio clip identifier
   * @param {Object} usageData - Usage context data
   * @param {string} usageData.leadId - Associated lead ID
   * @param {string} usageData.callId - Associated call ID
   * @returns {Promise<Object>} Usage recording result
   */
  recordAudioUsage: async (audioId, usageData = {}) => {
    try {
      // Record in analytics first (local, fast)
      if (usageData.clipName && usageData.category && usageData.duration) {
        audioAnalytics.recordPlay(audioId, usageData.clipName, usageData.category, usageData.duration);
      }
      
      // Then send to API (can fail without affecting UX)
      return await api.post(`/audio/${audioId}/usage`, usageData, {}, false);
    } catch (error) {
      console.error(`❌ Failed to record audio usage for ${audioId}:`, error);
      audioAnalytics.recordError('record_usage', audioId, error.message);
      
      // Don't fail the main operation if usage tracking fails
      return {
        success: false,
        message: 'Usage tracking failed'
      };
    }
  },

  /**
   * Play audio clip with advanced performance features
   * @param {number|string} audioId - Audio clip identifier
   * @param {Object} options - Playback options
   * @returns {Promise<Object>} Playback result with audio element
   */
  playAudioClipOptimized: async (audioId, options = {}) => {
    const startTime = performance.now();
    
    try {
      // Use performance manager for optimized playback
      const audioElement = await audioPerformanceManager.playAudioClip(audioId, {
        volume: options.volume || 1.0,
        crossfade: options.crossfade || false,
        crossfadeMs: options.crossfadeMs || 150
      });
      
      const playTime = performance.now() - startTime;
      console.log(`▶️ Audio played in ${playTime.toFixed(0)}ms`);
      
      return {
        success: true,
        audioElement: audioElement,
        playTime: playTime
      };
      
    } catch (error) {
      console.error(`❌ Failed to play audio ${audioId}:`, error);
      audioAnalytics.recordError('playback', audioId, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get performance dashboard data
   * @returns {Object} Performance metrics and analytics
   */
  getPerformanceDashboard: () => {
    return {
      performance: audioPerformanceManager.getPerformanceDashboard(),
      analytics: {
        summary: audioAnalytics.getPerformanceSummary(),
        patterns: audioAnalytics.getUsagePatterns(),
        technical: audioAnalytics.metrics.technical
      },
      historical: audioAnalytics.getHistoricalData()
    };
  },

  /**
   * Preload specific audio clips for better performance
   * @param {Array} clipIds - Array of clip IDs to preload
   * @returns {Promise<number>} Number of successfully preloaded clips
   */
  preloadAudioClips: async (clipIds) => {
    try {
      // Get clip data first
      const clipsData = {};
      for (const id of clipIds) {
        const response = await this.getAudioClip(id);
        if (response.success) {
          clipsData[response.data.category] = clipsData[response.data.category] || [];
          clipsData[response.data.category].push(response.data);
        }
      }
      
      // Use performance manager to preload
      return await audioPerformanceManager.preloadAudioClips(clipsData, clipIds);
    } catch (error) {
      console.error('❌ Failed to preload audio clips:', error);
      return 0;
    }
  },

  /**
   * Export performance analytics data
   * @returns {Object} Comprehensive analytics export
   */
  exportAnalytics: () => {
    return audioAnalytics.exportData();
  }
};

export default audioService;