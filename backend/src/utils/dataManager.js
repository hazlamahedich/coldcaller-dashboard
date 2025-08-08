/**
 * Data Manager - High-level service for managing all data operations
 * Provides unified interface for CRUD operations with validation and relationships
 */

const dataLoader = require('./dataLoader');
const { validateRecord, validateBatch, cleanData } = require('./validation');
const { DateUtils, NumberUtils, ArrayUtils, StringUtils } = require('./helpers');

class DataManager {
  constructor() {
    this.collections = ['leads', 'scripts', 'audioClips', 'callLogs', 'stats'];
    this.relationships = {
      callLogs: {
        lead_id: 'leads',
        scripts_used: 'scripts',
        audio_clips_used: 'audioClips'
      },
      audioClips: {
        script_id: 'scripts'
      }
    };
  }

  /**
   * Initialize data manager and validate all collections
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Data Manager...');
      
      const results = {};
      
      // Check each collection exists and get stats
      for (const collection of this.collections) {
        try {
          const data = await dataLoader.loadData(collection);
          const stats = await dataLoader.getStats(collection);
          results[collection] = {
            loaded: true,
            count: Array.isArray(data) ? data.length : 1,
            stats
          };
        } catch (error) {
          results[collection] = {
            loaded: false,
            error: error.message
          };
        }
      }

      // Validate data integrity
      const integrity = await this.validateDataIntegrity();
      
      console.log('✅ Data Manager initialized successfully');
      
      return {
        success: true,
        collections: results,
        integrity,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error initializing Data Manager:', error.message);
      throw error;
    }
  }

  /**
   * Get all data from a collection with optional filtering and pagination
   * @param {string} collection - Collection name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query result with data and metadata
   */
  async getCollection(collection, options = {}) {
    try {
      const { 
        filter = {}, 
        sort = [], 
        page = 1, 
        pageSize = 50,
        includeStats = false 
      } = options;

      // Load data
      let data = await dataLoader.loadData(collection);
      
      if (!Array.isArray(data)) {
        return { data, total: 1, page: 1, pageSize: 1 };
      }

      // Apply filters
      if (Object.keys(filter).length > 0) {
        data = await dataLoader.findRecords(collection, filter);
      }

      // Apply sorting
      if (sort.length > 0) {
        data = ArrayUtils.multiSort(data, sort);
      }

      // Get total before pagination
      const total = data.length;

      // Apply pagination
      const paginatedResult = ArrayUtils.paginate(data, page, pageSize);

      const result = {
        data: paginatedResult.items,
        pagination: paginatedResult.pagination,
        total,
        filters: filter,
        sort
      };

      // Include collection statistics if requested
      if (includeStats) {
        result.stats = await dataLoader.getStats(collection);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error getting collection ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Get single record by ID with optional relationship loading
   * @param {string} collection - Collection name
   * @param {string} id - Record ID
   * @param {Object} options - Load options
   * @returns {Promise<Object|null>} Record with loaded relationships
   */
  async getRecord(collection, id, options = {}) {
    try {
      const { loadRelationships = false } = options;
      
      const record = await dataLoader.getById(collection, id);
      
      if (!record) {
        return null;
      }

      // Load relationships if requested
      if (loadRelationships && this.relationships[collection]) {
        const related = await this.loadRelationships(record, this.relationships[collection]);
        return { ...record, _relationships: related };
      }

      return record;
    } catch (error) {
      console.error(`❌ Error getting record from ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Create new record with validation
   * @param {string} collection - Collection name
   * @param {Object} recordData - Record data
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Created record
   */
  async createRecord(collection, recordData, options = {}) {
    try {
      const { validate = true, generateId = true } = options;
      
      // Clean input data
      const cleanedData = cleanData(recordData);
      
      // Validate if requested
      if (validate) {
        const validation = validateRecord(collection, cleanedData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        cleanedData = validation.data;
      }

      // Generate ID if needed
      if (generateId && !cleanedData.id) {
        cleanedData.id = dataLoader.generateId(collection);
      }

      // Add timestamps
      const now = new Date().toISOString();
      cleanedData.created_at = now;
      cleanedData.updated_at = now;

      // Create record
      const newRecord = await dataLoader.addRecord(collection, cleanedData);
      
      // Update related statistics
      await this.updateCollectionStats(collection);
      
      console.log(`✅ Created record in ${collection}: ${newRecord.id}`);
      return newRecord;
    } catch (error) {
      console.error(`❌ Error creating record in ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Update existing record with validation
   * @param {string} collection - Collection name
   * @param {string} id - Record ID
   * @param {Object} updates - Fields to update
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated record
   */
  async updateRecord(collection, id, updates, options = {}) {
    try {
      const { validate = true, partialUpdate = true } = options;
      
      // Get existing record for validation context
      const existing = await dataLoader.getById(collection, id);
      if (!existing) {
        throw new Error(`Record not found: ${id}`);
      }

      // Clean update data
      const cleanedUpdates = cleanData(updates);
      
      // Prepare data for validation (merge with existing for full validation)
      const dataForValidation = partialUpdate 
        ? { ...existing, ...cleanedUpdates }
        : cleanedUpdates;

      // Validate if requested
      if (validate) {
        const validation = validateRecord(collection, dataForValidation);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Use only the updated fields from validation
        Object.keys(cleanedUpdates).forEach(key => {
          cleanedUpdates[key] = validation.data[key];
        });
      }

      // Add update timestamp
      cleanedUpdates.updated_at = new Date().toISOString();

      // Update record
      const updatedRecord = await dataLoader.updateRecord(collection, id, cleanedUpdates);
      
      if (updatedRecord) {
        console.log(`✅ Updated record in ${collection}: ${id}`);
      }
      
      return updatedRecord;
    } catch (error) {
      console.error(`❌ Error updating record in ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete record and handle relationships
   * @param {string} collection - Collection name
   * @param {string} id - Record ID
   * @param {Object} options - Delete options
   * @returns {Promise<boolean>} Success status
   */
  async deleteRecord(collection, id, options = {}) {
    try {
      const { cascadeDelete = false, backup = true } = options;
      
      // Create backup if requested
      if (backup) {
        const record = await dataLoader.getById(collection, id);
        if (record) {
          await this.backupRecord(collection, record);
        }
      }

      // Handle cascade delete
      if (cascadeDelete) {
        await this.cascadeDelete(collection, id);
      }

      // Delete the record
      const success = await dataLoader.deleteRecord(collection, id);
      
      if (success) {
        // Update statistics
        await this.updateCollectionStats(collection);
        console.log(`🗑️ Deleted record from ${collection}: ${id}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Error deleting record from ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch create multiple records
   * @param {string} collection - Collection name
   * @param {Array} records - Array of records to create
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} Batch result
   */
  async batchCreate(collection, records, options = {}) {
    try {
      const { validate = true, stopOnError = false } = options;
      
      // Validate all records if requested
      if (validate) {
        const batchValidation = validateBatch(collection, records);
        
        if (!batchValidation.isValid && stopOnError) {
          throw new Error(`Batch validation failed: ${batchValidation.invalidCount} invalid records`);
        }

        records = batchValidation.validRecords;
        
        if (records.length === 0) {
          throw new Error('No valid records to create');
        }
      }

      const results = [];
      const errors = [];
      
      // Process each record
      for (const record of records) {
        try {
          const created = await this.createRecord(collection, record, { validate: false });
          results.push(created);
        } catch (error) {
          errors.push({ record, error: error.message });
          if (stopOnError) break;
        }
      }

      console.log(`📦 Batch created ${results.length} records in ${collection} (${errors.length} errors)`);
      
      return {
        success: errors.length === 0,
        created: results,
        errors,
        total: records.length,
        successCount: results.length,
        errorCount: errors.length
      };
    } catch (error) {
      console.error(`❌ Error in batch create for ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Search across collections with advanced queries
   * @param {string|Array} collections - Collection(s) to search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async search(collections, query, options = {}) {
    try {
      const { 
        fields = [], 
        fuzzy = true, 
        limit = 20,
        includeScore = false 
      } = options;
      
      const searchCollections = Array.isArray(collections) ? collections : [collections];
      const results = {};
      
      for (const collection of searchCollections) {
        const data = await dataLoader.loadData(collection);
        
        if (!Array.isArray(data)) {
          continue;
        }

        const searchFields = fields.length > 0 ? fields : this.getSearchableFields(collection);
        const matches = this.performSearch(data, query, searchFields, { fuzzy, includeScore });
        
        results[collection] = matches.slice(0, limit);
      }
      
      const totalResults = Object.values(results).reduce((sum, matches) => sum + matches.length, 0);
      
      console.log(`🔍 Search found ${totalResults} results across ${searchCollections.length} collections`);
      
      return {
        query,
        results,
        totalResults,
        collections: searchCollections,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error in search:', error.message);
      throw error;
    }
  }

  /**
   * Get analytics and insights for collections
   * @param {string} collection - Collection name
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(collection, options = {}) {
    try {
      const { 
        timeframe = 'month',
        metrics = ['count', 'growth', 'trends'],
        groupBy = null 
      } = options;
      
      const data = await dataLoader.loadData(collection);
      const stats = await dataLoader.getStats(collection);
      
      if (!Array.isArray(data)) {
        return { message: 'Analytics not available for non-array collections' };
      }

      const analytics = {
        collection,
        timeframe,
        period: this.getTimeframePeriod(timeframe),
        basic: {
          total: data.length,
          ...stats
        }
      };

      // Calculate metrics
      if (metrics.includes('count')) {
        analytics.counts = this.calculateCounts(data, timeframe);
      }

      if (metrics.includes('growth')) {
        analytics.growth = this.calculateGrowth(data, timeframe);
      }

      if (metrics.includes('trends')) {
        analytics.trends = this.calculateTrends(data, timeframe);
      }

      // Group by field if requested
      if (groupBy && data.length > 0 && data[0][groupBy]) {
        analytics.groups = ArrayUtils.groupBy(data, groupBy);
        analytics.groupStats = Object.entries(analytics.groups).map(([key, items]) => ({
          group: key,
          count: items.length,
          percentage: items.length / data.length
        }));
      }

      console.log(`📊 Generated analytics for ${collection}: ${data.length} records analyzed`);
      
      return analytics;
    } catch (error) {
      console.error(`❌ Error getting analytics for ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate data integrity across all collections
   * @returns {Promise<Object>} Integrity report
   * @private
   */
  async validateDataIntegrity() {
    try {
      const issues = [];
      const stats = {};
      
      // Check each collection
      for (const collection of this.collections) {
        try {
          const data = await dataLoader.loadData(collection);
          const collectionIssues = [];
          
          if (Array.isArray(data)) {
            // Check for duplicate IDs
            const ids = data.map(record => record.id).filter(Boolean);
            const uniqueIds = new Set(ids);
            if (ids.length !== uniqueIds.size) {
              collectionIssues.push('Duplicate IDs found');
            }

            // Check for missing required timestamps
            const missingTimestamps = data.filter(record => 
              !record.created_at || !record.updated_at
            );
            if (missingTimestamps.length > 0) {
              collectionIssues.push(`${missingTimestamps.length} records missing timestamps`);
            }

            // Validate relationships
            if (this.relationships[collection]) {
              const relationshipIssues = await this.validateRelationships(data, this.relationships[collection]);
              collectionIssues.push(...relationshipIssues);
            }

            stats[collection] = {
              total: data.length,
              issues: collectionIssues.length
            };
          }

          if (collectionIssues.length > 0) {
            issues.push({
              collection,
              issues: collectionIssues
            });
          }
        } catch (error) {
          issues.push({
            collection,
            issues: [`Failed to load: ${error.message}`]
          });
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        stats,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error validating data integrity:', error.message);
      throw error;
    }
  }

  /**
   * Load relationships for a record
   * @param {Object} record - Source record
   * @param {Object} relationships - Relationship definitions
   * @returns {Promise<Object>} Loaded relationships
   * @private
   */
  async loadRelationships(record, relationships) {
    const loaded = {};
    
    for (const [field, targetCollection] of Object.entries(relationships)) {
      const value = record[field];
      
      if (!value) continue;
      
      try {
        if (Array.isArray(value)) {
          // Load multiple related records
          const records = [];
          for (const id of value) {
            const related = await dataLoader.getById(targetCollection, id);
            if (related) records.push(related);
          }
          loaded[field] = records;
        } else {
          // Load single related record
          const related = await dataLoader.getById(targetCollection, value);
          if (related) loaded[field] = related;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load relationship ${field}:`, error.message);
      }
    }
    
    return loaded;
  }

  /**
   * Helper methods for analytics
   * @private
   */
  getTimeframePeriod(timeframe) {
    const now = new Date();
    const periods = {
      day: { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now },
      week: { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now },
      month: { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now },
      year: { start: new Date(now.getFullYear(), 0, 1), end: now }
    };
    return periods[timeframe] || periods.month;
  }

  calculateCounts(data, timeframe) {
    const period = this.getTimeframePeriod(timeframe);
    
    return data.filter(record => {
      const date = new Date(record.created_at);
      return date >= period.start && date <= period.end;
    }).length;
  }

  calculateGrowth(data, timeframe) {
    // Implementation for growth calculation
    return { message: 'Growth calculation not implemented yet' };
  }

  calculateTrends(data, timeframe) {
    // Implementation for trend analysis
    return { message: 'Trend analysis not implemented yet' };
  }

  getSearchableFields(collection) {
    const searchableFields = {
      leads: ['name', 'company', 'email', 'notes', 'tags'],
      scripts: ['title', 'text', 'tags'],
      callLogs: ['lead_name', 'notes', 'outcome'],
      audioClips: ['name', 'transcript', 'tags']
    };
    return searchableFields[collection] || [];
  }

  performSearch(data, query, fields, options) {
    // Simple search implementation
    const lowercaseQuery = query.toLowerCase();
    
    return data.filter(record => {
      return fields.some(field => {
        const value = record[field];
        if (Array.isArray(value)) {
          return value.some(item => 
            typeof item === 'string' && item.toLowerCase().includes(lowercaseQuery)
          );
        }
        return typeof value === 'string' && value.toLowerCase().includes(lowercaseQuery);
      });
    });
  }

  async validateRelationships(data, relationships) {
    // Implementation for relationship validation
    return [];
  }

  async cascadeDelete(collection, id) {
    // Implementation for cascade delete
    console.log(`⚠️ Cascade delete not implemented for ${collection}:${id}`);
  }

  async backupRecord(collection, record) {
    // Implementation for record backup
    console.log(`📂 Record backup not implemented for ${collection}:${record.id}`);
  }

  async updateCollectionStats(collection) {
    // Implementation for updating collection statistics
    console.log(`📊 Stats update not implemented for ${collection}`);
  }
}

// Export singleton instance
module.exports = new DataManager();