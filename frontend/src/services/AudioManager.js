/**
 * AudioManager Service Class - Professional audio management service
 * Features: advanced audio processing, caching, analytics, error handling
 * Provides enterprise-level audio management capabilities
 */

import { audioService } from './audioService';
import { validateAudioFile, extractAudioMetadata, formatDuration, formatFileSize } from '../utils/audioUtils';

export class AudioManager {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
    this.analytics = {
      plays: new Map(),
      uploads: 0,
      errors: 0,
      totalPlayTime: 0
    };
    this.maxCacheSize = 50; // Maximum cached audio URLs
    this.cacheTimeout = 300000; // 5 minutes cache timeout
  }

  /**
   * Initialize the audio manager
   */
  async initialize() {
    try {
      console.log('🎵 Initializing AudioManager...');
      
      // Load initial audio clips
      await this.loadAudioClips();
      
      // Setup periodic cleanup
      this.setupCleanupInterval();
      
      console.log('✅ AudioManager initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize AudioManager:', error);
      this.analytics.errors++;
      return false;
    }
  }

  /**
   * Load all audio clips with caching
   */
  async loadAudioClips(forceRefresh = false) {
    const cacheKey = 'all_clips';
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    try {
      const response = await audioService.getAllAudioClips();
      
      if (response.success) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
        
        this.emit('clipsLoaded', response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to load clips');
      }
      
    } catch (error) {
      console.error('❌ Failed to load audio clips:', error);
      this.analytics.errors++;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get audio URL with caching and analytics
   */
  async getAudioUrl(clipId, trackAnalytics = true) {
    const cacheKey = `url_${clipId}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        if (trackAnalytics) {
          this.trackPlay(clipId);
        }
        return cached.data;
      }
    }
    
    try {
      const response = await audioService.getAudioUrl(clipId);
      
      if (response.success) {
        // Cache the URL
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
        
        // Cleanup cache if too large
        if (this.cache.size > this.maxCacheSize) {
          this.cleanupCache();
        }
        
        if (trackAnalytics) {
          this.trackPlay(clipId);
        }
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get audio URL');
      }
      
    } catch (error) {
      console.error(`❌ Failed to get audio URL for ${clipId}:`, error);
      this.analytics.errors++;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Upload audio with validation and progress tracking
   */
  async uploadAudio(file, metadata = {}, onProgress = null) {
    try {
      // Validate file
      const validation = validateAudioFile(file);
      if (!validation.success) {
        throw new Error(validation.message);
      }
      
      // Extract metadata
      const audioMetadata = await extractAudioMetadata(file);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('name', metadata.name || file.name.replace(/\.[^/.]+$/, ''));
      formData.append('category', metadata.category || 'custom');
      formData.append('description', metadata.description || '');
      
      // Add extracted metadata
      formData.append('duration', audioMetadata.duration || 0);
      formData.append('fileSize', audioMetadata.size);
      formData.append('mimeType', audioMetadata.type);
      
      const response = await audioService.uploadAudioClip(formData, onProgress);
      
      if (response.success) {
        // Clear cache to force refresh
        this.clearCache(['all_clips']);
        
        // Track upload analytics
        this.analytics.uploads++;
        
        // Emit success event
        this.emit('audioUploaded', response.data);
        
        console.log('✅ Audio uploaded successfully:', response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Upload failed');
      }
      
    } catch (error) {
      console.error('❌ Audio upload failed:', error);
      this.analytics.errors++;
      this.emit('uploadError', error);
      throw error;
    }
  }

  /**
   * Delete audio clip with cache cleanup
   */
  async deleteAudio(clipId) {
    try {
      const response = await audioService.deleteAudioClip(clipId);
      
      if (response.success) {
        // Clear related cache entries
        this.clearCache([`url_${clipId}`, 'all_clips']);
        
        // Remove from analytics
        this.analytics.plays.delete(clipId);
        
        // Emit deletion event
        this.emit('audioDeleted', clipId);
        
        console.log('✅ Audio deleted successfully:', clipId);
        return true;
      } else {
        throw new Error(response.message || 'Delete failed');
      }
      
    } catch (error) {
      console.error(`❌ Failed to delete audio ${clipId}:`, error);
      this.analytics.errors++;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Search audio clips with intelligent filtering
   */
  async searchAudio(query, filters = {}) {
    try {
      const clips = await this.loadAudioClips();
      let allClips = [];
      
      // Flatten all clips
      Object.entries(clips).forEach(([category, categoryClips]) => {
        allClips.push(...categoryClips.map(clip => ({ ...clip, category })));
      });
      
      // Apply search query
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        allClips = allClips.filter(clip =>
          clip.name.toLowerCase().includes(searchTerm) ||
          clip.description?.toLowerCase().includes(searchTerm) ||
          clip.category.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply filters
      if (filters.category && filters.category !== 'all') {
        allClips = allClips.filter(clip => clip.category === filters.category);
      }
      
      if (filters.minDuration) {
        allClips = allClips.filter(clip => {
          const duration = this.parseDuration(clip.duration);
          return duration >= filters.minDuration;
        });
      }
      
      if (filters.maxDuration) {
        allClips = allClips.filter(clip => {
          const duration = this.parseDuration(clip.duration);
          return duration <= filters.maxDuration;
        });
      }
      
      // Sort results by relevance (exact matches first)
      if (query && query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        allClips.sort((a, b) => {
          const aExact = a.name.toLowerCase() === searchTerm ? 1 : 0;
          const bExact = b.name.toLowerCase() === searchTerm ? 1 : 0;
          return bExact - aExact;
        });
      }
      
      return allClips;
      
    } catch (error) {
      console.error('❌ Audio search failed:', error);
      this.analytics.errors++;
      throw error;
    }
  }

  /**
   * Get audio analytics and usage statistics
   */
  getAnalytics() {
    const totalPlays = Array.from(this.analytics.plays.values()).reduce((sum, count) => sum + count, 0);
    
    // Get most played clips
    const topClips = Array.from(this.analytics.plays.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    return {
      totalUploads: this.analytics.uploads,
      totalPlays,
      totalErrors: this.analytics.errors,
      totalPlayTime: Math.round(this.analytics.totalPlayTime),
      cacheSize: this.cache.size,
      topClips,
      averagePlayTime: totalPlays > 0 ? Math.round(this.analytics.totalPlayTime / totalPlays) : 0
    };
  }

  /**
   * Export audio library data
   */
  async exportLibrary(format = 'json') {
    try {
      const clips = await this.loadAudioClips();
      const analytics = this.getAnalytics();
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        clips,
        analytics,
        summary: {
          totalClips: this.getTotalClipCount(clips),
          categories: Object.keys(clips).length,
          totalSize: this.calculateTotalSize(clips)
        }
      };
      
      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else if (format === 'csv') {
        return this.convertToCSV(clips);
      }
      
      throw new Error(`Unsupported export format: ${format}`);
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      throw error;
    }
  }

  /**
   * Track audio play for analytics
   */
  trackPlay(clipId, duration = 0) {
    if (!this.analytics.plays.has(clipId)) {
      this.analytics.plays.set(clipId, 0);
    }
    
    this.analytics.plays.set(clipId, this.analytics.plays.get(clipId) + 1);
    
    if (duration > 0) {
      this.analytics.totalPlayTime += duration;
    }
    
    this.emit('playTracked', { clipId, duration });
  }

  /**
   * Event system for audio manager
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(listener);
  }

  off(event, listener) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(listener);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`❌ Event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Clear specific cache entries
   */
  clearCache(keys = null) {
    if (keys) {
      keys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Cleanup old cache entries
   */
  cleanupCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // If still too large, remove oldest entries
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Setup periodic cleanup
   */
  setupCleanupInterval() {
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Cleanup every minute
  }

  /**
   * Utility methods
   */
  parseDuration(duration) {
    if (!duration) return 0;
    const parts = duration.split(':').map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
  }

  getTotalClipCount(clips) {
    return Object.values(clips).reduce((total, categoryClips) => total + categoryClips.length, 0);
  }

  calculateTotalSize(clips) {
    let totalSize = 0;
    Object.values(clips).forEach(categoryClips => {
      categoryClips.forEach(clip => {
        totalSize += clip.fileSize || 0;
      });
    });
    return totalSize;
  }

  convertToCSV(clips) {
    const headers = ['Name', 'Category', 'Duration', 'Size', 'Created', 'Plays'];
    const rows = [];
    
    Object.entries(clips).forEach(([category, categoryClips]) => {
      categoryClips.forEach(clip => {
        rows.push([
          clip.name,
          category,
          clip.duration || 'N/A',
          formatFileSize(clip.fileSize),
          clip.createdAt ? new Date(clip.createdAt).toLocaleDateString() : 'N/A',
          this.analytics.plays.get(clip.id) || 0
        ]);
      });
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.cache.clear();
    this.listeners.clear();
    console.log('🗑️ AudioManager destroyed');
  }
}

// Create singleton instance
export const audioManager = new AudioManager();

export default audioManager;