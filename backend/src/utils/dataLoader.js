const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * DataLoader - Utility class for managing JSON data files
 * Provides CRUD operations with backup and versioning support
 */
class DataLoader {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.backupPath = path.join(__dirname, '../data/backups');
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   * @private
   */
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
  }

  /**
   * Load data from JSON file
   * @param {string} filename - Name of the JSON file (without extension)
   * @returns {Promise<Array|Object>} Parsed JSON data
   */
  async loadData(filename) {
    try {
      const filePath = path.join(this.dataPath, `${filename}.json`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Data file not found: ${filename}.json`);
      }

      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);
      
      console.log(`✅ Loaded ${filename}.json: ${Array.isArray(data) ? data.length : 1} records`);
      return data;
    } catch (error) {
      console.error(`❌ Error loading ${filename}.json:`, error.message);
      throw error;
    }
  }

  /**
   * Save data to JSON file with backup
   * @param {string} filename - Name of the JSON file (without extension)
   * @param {Array|Object} data - Data to save
   * @returns {Promise<boolean>} Success status
   */
  async saveData(filename, data) {
    try {
      const filePath = path.join(this.dataPath, `${filename}.json`);
      
      // Create backup if file exists
      if (fs.existsSync(filePath)) {
        await this.createBackup(filename);
      }

      // Add metadata for arrays
      if (Array.isArray(data)) {
        data = data.map(item => ({
          ...item,
          updated_at: item.updated_at || new Date().toISOString()
        }));
      }

      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, jsonData, 'utf8');
      
      console.log(`✅ Saved ${filename}.json: ${Array.isArray(data) ? data.length : 1} records`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving ${filename}.json:`, error.message);
      throw error;
    }
  }

  /**
   * Create backup of existing file
   * @param {string} filename - Name of the file to backup
   * @returns {Promise<string>} Backup file path
   * @private
   */
  async createBackup(filename) {
    try {
      const sourceFile = path.join(this.dataPath, `${filename}.json`);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupPath, `${filename}_${timestamp}.json`);
      
      fs.copyFileSync(sourceFile, backupFile);
      console.log(`📂 Created backup: ${path.basename(backupFile)}`);
      
      return backupFile;
    } catch (error) {
      console.error(`❌ Error creating backup for ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Add new record to collection
   * @param {string} filename - Collection name
   * @param {Object} record - Record to add
   * @returns {Promise<Object>} Added record with generated ID
   */
  async addRecord(filename, record) {
    try {
      const data = await this.loadData(filename);
      
      if (!Array.isArray(data)) {
        throw new Error(`${filename} is not a collection (array)`);
      }

      // Generate ID if not provided
      const newRecord = {
        id: record.id || this.generateId(filename),
        ...record,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      data.push(newRecord);
      await this.saveData(filename, data);
      
      console.log(`➕ Added record to ${filename}: ${newRecord.id}`);
      return newRecord;
    } catch (error) {
      console.error(`❌ Error adding record to ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Update existing record
   * @param {string} filename - Collection name
   * @param {string} id - Record ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated record or null if not found
   */
  async updateRecord(filename, id, updates) {
    try {
      const data = await this.loadData(filename);
      
      if (!Array.isArray(data)) {
        throw new Error(`${filename} is not a collection (array)`);
      }

      const recordIndex = data.findIndex(item => item.id === id);
      
      if (recordIndex === -1) {
        console.log(`⚠️ Record not found in ${filename}: ${id}`);
        return null;
      }

      // Update record with new data and timestamp
      data[recordIndex] = {
        ...data[recordIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };

      await this.saveData(filename, data);
      
      console.log(`✏️ Updated record in ${filename}: ${id}`);
      return data[recordIndex];
    } catch (error) {
      console.error(`❌ Error updating record in ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete record from collection
   * @param {string} filename - Collection name
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteRecord(filename, id) {
    try {
      const data = await this.loadData(filename);
      
      if (!Array.isArray(data)) {
        throw new Error(`${filename} is not a collection (array)`);
      }

      const initialLength = data.length;
      const filteredData = data.filter(item => item.id !== id);
      
      if (filteredData.length === initialLength) {
        console.log(`⚠️ Record not found in ${filename}: ${id}`);
        return false;
      }

      await this.saveData(filename, filteredData);
      
      console.log(`🗑️ Deleted record from ${filename}: ${id}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting record from ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Find records matching criteria
   * @param {string} filename - Collection name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Matching records
   */
  async findRecords(filename, criteria = {}) {
    try {
      const data = await this.loadData(filename);
      
      if (!Array.isArray(data)) {
        return data;
      }

      if (Object.keys(criteria).length === 0) {
        return data;
      }

      const results = data.filter(record => {
        return Object.entries(criteria).every(([key, value]) => {
          if (typeof value === 'string' && value.includes('*')) {
            // Wildcard matching
            const regex = new RegExp(value.replace(/\\*/g, '.*'), 'i');
            return regex.test(record[key]);
          }
          return record[key] === value;
        });
      });

      console.log(`🔍 Found ${results.length} records in ${filename} matching criteria`);
      return results;
    } catch (error) {
      console.error(`❌ Error finding records in ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Get record by ID
   * @param {string} filename - Collection name
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async getById(filename, id) {
    try {
      const data = await this.loadData(filename);
      
      if (!Array.isArray(data)) {
        return data.id === id ? data : null;
      }

      const record = data.find(item => item.id === id);
      
      if (!record) {
        console.log(`⚠️ Record not found in ${filename}: ${id}`);
        return null;
      }

      return record;
    } catch (error) {
      console.error(`❌ Error getting record from ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate unique ID for collection
   * @param {string} filename - Collection name for prefix
   * @returns {string} Generated ID
   * @private
   */
  generateId(filename) {
    const prefix = filename.replace(/s$/, ''); // Remove plural 's'
    const timestamp = Date.now().toString(36);
    const random = uuidv4().split('-')[0];
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Get collection statistics
   * @param {string} filename - Collection name
   * @returns {Promise<Object>} Statistics object
   */
  async getStats(filename) {
    try {
      const data = await this.loadData(filename);
      
      if (!Array.isArray(data)) {
        return { type: 'object', size: 1 };
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayRecords = data.filter(r => r.created_at?.startsWith(today));
      const weekRecords = data.filter(r => new Date(r.created_at) >= thisWeek);
      const monthRecords = data.filter(r => new Date(r.created_at) >= thisMonth);

      return {
        type: 'array',
        total: data.length,
        today: todayRecords.length,
        thisWeek: weekRecords.length,
        thisMonth: monthRecords.length,
        lastUpdated: data.length > 0 ? data.reduce((latest, record) => {
          return new Date(record.updated_at || record.created_at) > new Date(latest) 
            ? (record.updated_at || record.created_at) 
            : latest;
        }, '1970-01-01T00:00:00Z') : null
      };
    } catch (error) {
      console.error(`❌ Error getting stats for ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Restore from backup
   * @param {string} filename - Original filename
   * @param {string} backupTimestamp - Backup timestamp
   * @returns {Promise<boolean>} Success status
   */
  async restoreBackup(filename, backupTimestamp) {
    try {
      const backupFile = path.join(this.backupPath, `${filename}_${backupTimestamp}.json`);
      const currentFile = path.join(this.dataPath, `${filename}.json`);
      
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${filename}_${backupTimestamp}.json`);
      }

      // Create backup of current file before restore
      await this.createBackup(`${filename}_pre_restore`);
      
      // Copy backup to current location
      fs.copyFileSync(backupFile, currentFile);
      
      console.log(`♻️ Restored ${filename}.json from backup: ${backupTimestamp}`);
      return true;
    } catch (error) {
      console.error(`❌ Error restoring backup for ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * List available backups
   * @param {string} filename - File to list backups for
   * @returns {Promise<Array>} Array of backup info objects
   */
  async listBackups(filename) {
    try {
      const backupFiles = fs.readdirSync(this.backupPath)
        .filter(file => file.startsWith(`${filename}_`) && file.endsWith('.json'))
        .map(file => {
          const timestamp = file.replace(`${filename}_`, '').replace('.json', '');
          const filePath = path.join(this.backupPath, file);
          const stats = fs.statSync(filePath);
          
          return {
            filename: file,
            timestamp,
            created: stats.ctime,
            size: stats.size,
            path: filePath
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

      console.log(`📋 Found ${backupFiles.length} backups for ${filename}`);
      return backupFiles;
    } catch (error) {
      console.error(`❌ Error listing backups for ${filename}:`, error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new DataLoader();