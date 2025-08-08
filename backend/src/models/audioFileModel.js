const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Audio File Model - Manages audio file metadata and database operations
 */
class AudioFileModel {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/audioFiles.json');
    this.ensureDataFile();
  }

  /**
   * Ensure the data file exists
   */
  async ensureDataFile() {
    try {
      await fs.ensureFile(this.dataPath);
      const exists = await fs.pathExists(this.dataPath);
      if (exists) {
        const content = await fs.readFile(this.dataPath, 'utf8');
        if (!content.trim()) {
          await fs.writeJson(this.dataPath, [], { spaces: 2 });
        }
      } else {
        await fs.writeJson(this.dataPath, [], { spaces: 2 });
      }
    } catch (error) {
      console.error('Error ensuring data file:', error);
    }
  }

  /**
   * Load all audio files from storage
   * @returns {Promise<Array>} Array of audio file objects
   */
  async loadAll() {
    try {
      const data = await fs.readJson(this.dataPath);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading audio files:', error);
      return [];
    }
  }

  /**
   * Save audio files to storage
   * @param {Array} audioFiles - Array of audio file objects
   * @returns {Promise<boolean>} Success status
   */
  async saveAll(audioFiles) {
    try {
      await fs.writeJson(this.dataPath, audioFiles, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error saving audio files:', error);
      return false;
    }
  }

  /**
   * Create a new audio file record
   * @param {object} fileData - Audio file data
   * @returns {Promise<object>} Created audio file object
   */
  async create(fileData) {
    try {
      const audioFiles = await this.loadAll();
      
      const audioFile = {
        id: uuidv4(),
        originalName: fileData.originalName,
        filename: fileData.filename,
        path: fileData.path,
        url: fileData.url || `/api/audio/file/${fileData.filename}`,
        size: fileData.size,
        mimetype: fileData.mimetype,
        metadata: fileData.metadata || {},
        tags: fileData.tags || [],
        category: fileData.category || 'general',
        description: fileData.description || '',
        isProcessed: false,
        waveform: fileData.waveform || [],
        analytics: {
          plays: 0,
          downloads: 0,
          lastPlayed: null,
          lastDownloaded: null
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      audioFiles.push(audioFile);
      await this.saveAll(audioFiles);
      
      return audioFile;
    } catch (error) {
      console.error('Error creating audio file:', error);
      throw error;
    }
  }

  /**
   * Find audio file by ID
   * @param {string} id - Audio file ID
   * @returns {Promise<object|null>} Audio file object or null
   */
  async findById(id) {
    try {
      const audioFiles = await this.loadAll();
      return audioFiles.find(file => file.id === id) || null;
    } catch (error) {
      console.error('Error finding audio file by ID:', error);
      return null;
    }
  }

  /**
   * Find audio file by filename
   * @param {string} filename - Audio filename
   * @returns {Promise<object|null>} Audio file object or null
   */
  async findByFilename(filename) {
    try {
      const audioFiles = await this.loadAll();
      return audioFiles.find(file => file.filename === filename) || null;
    } catch (error) {
      console.error('Error finding audio file by filename:', error);
      return null;
    }
  }

  /**
   * Update audio file
   * @param {string} id - Audio file ID
   * @param {object} updates - Update data
   * @returns {Promise<object|null>} Updated audio file object or null
   */
  async update(id, updates) {
    try {
      const audioFiles = await this.loadAll();
      const index = audioFiles.findIndex(file => file.id === id);
      
      if (index === -1) {
        return null;
      }

      audioFiles[index] = {
        ...audioFiles[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.saveAll(audioFiles);
      return audioFiles[index];
    } catch (error) {
      console.error('Error updating audio file:', error);
      throw error;
    }
  }

  /**
   * Delete audio file
   * @param {string} id - Audio file ID
   * @returns {Promise<object|null>} Deleted audio file object or null
   */
  async delete(id) {
    try {
      const audioFiles = await this.loadAll();
      const index = audioFiles.findIndex(file => file.id === id);
      
      if (index === -1) {
        return null;
      }

      const deletedFile = audioFiles.splice(index, 1)[0];
      await this.saveAll(audioFiles);
      
      // Also delete the actual file
      try {
        if (deletedFile.path && await fs.pathExists(deletedFile.path)) {
          await fs.remove(deletedFile.path);
        }
      } catch (error) {
        console.error('Error deleting physical file:', error);
      }
      
      return deletedFile;
    } catch (error) {
      console.error('Error deleting audio file:', error);
      throw error;
    }
  }

  /**
   * Find audio files with filters
   * @param {object} filters - Filter options
   * @returns {Promise<Array>} Filtered audio files
   */
  async findWithFilters(filters = {}) {
    try {
      const audioFiles = await this.loadAll();
      let filtered = [...audioFiles];

      // Filter by category
      if (filters.category) {
        filtered = filtered.filter(file => 
          file.category.toLowerCase() === filters.category.toLowerCase()
        );
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(file =>
          filters.tags.some(tag => 
            file.tags.some(fileTag => 
              fileTag.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );
      }

      // Search by name or description
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(file =>
          file.originalName.toLowerCase().includes(searchTerm) ||
          (file.description && file.description.toLowerCase().includes(searchTerm))
        );
      }

      // Filter by processed status
      if (filters.processed !== undefined) {
        filtered = filtered.filter(file => file.isProcessed === filters.processed);
      }

      // Sort
      if (filters.sortBy) {
        filtered.sort((a, b) => {
          const aVal = a[filters.sortBy];
          const bVal = b[filters.sortBy];
          
          if (filters.sortOrder === 'desc') {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }

      return filtered;
    } catch (error) {
      console.error('Error finding audio files with filters:', error);
      return [];
    }
  }

  /**
   * Update analytics for audio file
   * @param {string} id - Audio file ID
   * @param {string} action - Analytics action (play, download)
   * @returns {Promise<boolean>} Success status
   */
  async updateAnalytics(id, action) {
    try {
      const audioFile = await this.findById(id);
      if (!audioFile) {
        return false;
      }

      const now = new Date().toISOString();
      const updates = { analytics: { ...audioFile.analytics } };

      if (action === 'play') {
        updates.analytics.plays += 1;
        updates.analytics.lastPlayed = now;
      } else if (action === 'download') {
        updates.analytics.downloads += 1;
        updates.analytics.lastDownloaded = now;
      }

      await this.update(id, updates);
      return true;
    } catch (error) {
      console.error('Error updating analytics:', error);
      return false;
    }
  }

  /**
   * Get statistics for all audio files
   * @returns {Promise<object>} Statistics object
   */
  async getStatistics() {
    try {
      const audioFiles = await this.loadAll();
      
      const stats = {
        totalFiles: audioFiles.length,
        totalSize: audioFiles.reduce((sum, file) => sum + (file.size || 0), 0),
        totalPlays: audioFiles.reduce((sum, file) => sum + (file.analytics.plays || 0), 0),
        totalDownloads: audioFiles.reduce((sum, file) => sum + (file.analytics.downloads || 0), 0),
        categories: {},
        formats: {},
        processed: audioFiles.filter(file => file.isProcessed).length,
        unprocessed: audioFiles.filter(file => !file.isProcessed).length
      };

      // Category breakdown
      audioFiles.forEach(file => {
        stats.categories[file.category] = (stats.categories[file.category] || 0) + 1;
      });

      // Format breakdown
      audioFiles.forEach(file => {
        const format = file.metadata.format || 'unknown';
        stats.formats[format] = (stats.formats[format] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        totalPlays: 0,
        totalDownloads: 0,
        categories: {},
        formats: {},
        processed: 0,
        unprocessed: 0
      };
    }
  }
}

module.exports = new AudioFileModel();