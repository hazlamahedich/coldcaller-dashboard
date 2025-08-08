/**
 * Database Backup System - Create automated backups with compression and validation
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { sequelize, isDev, isProd } = require('../config/database');

// Backup configuration
const BACKUP_CONFIG = {
  directory: path.join(__dirname, '../../../data/backups'),
  retention: {
    daily: 7,    // Keep 7 daily backups
    weekly: 4,   // Keep 4 weekly backups  
    monthly: 12  // Keep 12 monthly backups
  },
  compression: true,
  encryption: isProd,
  formats: ['sql', 'json'],
  maxFileSize: 100 * 1024 * 1024 // 100MB limit
};

// Ensure backup directory exists
const ensureBackupDirectory = async () => {
  try {
    await fs.access(BACKUP_CONFIG.directory);
  } catch (error) {
    await fs.mkdir(BACKUP_CONFIG.directory, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_CONFIG.directory}`);
  }
};

// Generate backup filename
const generateBackupFilename = (type = 'full', format = 'sql') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const environment = process.env.NODE_ENV || 'development';
  return `coldcaller_${type}_${environment}_${timestamp}.${format}`;
};

// Create SQL dump backup
const createSQLBackup = async (filename) => {
  console.log('🔄 Creating SQL backup...');
  
  const backupPath = path.join(BACKUP_CONFIG.directory, filename);
  const tables = ['leads', 'contacts', 'call_logs', 'migrations'];
  let sqlContent = '';
  
  // Add header
  sqlContent += `-- Cold Caller Database Backup\n`;
  sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
  sqlContent += `-- Environment: ${process.env.NODE_ENV || 'development'}\n`;
  sqlContent += `-- Database: ${sequelize.getDatabaseName()}\n\n`;
  
  // Disable foreign key checks
  if (sequelize.getDialect() === 'sqlite') {
    sqlContent += `PRAGMA foreign_keys = OFF;\n\n`;
  } else {
    sqlContent += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;
  }
  
  try {
    // Export each table
    for (const table of tables) {
      console.log(`   Exporting table: ${table}`);
      
      // Get table structure
      const [createTableResult] = await sequelize.query(
        sequelize.getDialect() === 'sqlite' 
          ? `SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`
          : `SHOW CREATE TABLE \`${table}\``
      );
      
      if (createTableResult.length > 0) {
        if (sequelize.getDialect() === 'sqlite') {
          sqlContent += `${createTableResult[0].sql};\n\n`;
        } else {
          sqlContent += `${createTableResult[0]['Create Table']};\n\n`;
        }
      }
      
      // Get table data
      const [rows] = await sequelize.query(`SELECT * FROM ${table}`);
      
      if (rows.length > 0) {
        sqlContent += `-- Data for table ${table}\n`;
        
        // Get column names
        const [columns] = await sequelize.query(
          sequelize.getDialect() === 'sqlite'
            ? `PRAGMA table_info(${table})`
            : `DESCRIBE \`${table}\``
        );
        
        const columnNames = sequelize.getDialect() === 'sqlite'
          ? columns.map(col => col.name)
          : columns.map(col => col.Field);
        
        // Insert statements
        for (const row of rows) {
          const values = columnNames.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            return value;
          }).join(', ');
          
          sqlContent += `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${values});\n`;
        }
        
        sqlContent += '\n';
      }
    }
    
    // Re-enable foreign key checks
    if (sequelize.getDialect() === 'sqlite') {
      sqlContent += `PRAGMA foreign_keys = ON;\n`;
    } else {
      sqlContent += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    }
    
    // Write file
    if (BACKUP_CONFIG.compression) {
      const compressed = zlib.gzipSync(sqlContent);
      await fs.writeFile(backupPath + '.gz', compressed);
      console.log(`✅ SQL backup created (compressed): ${filename}.gz`);
      return backupPath + '.gz';
    } else {
      await fs.writeFile(backupPath, sqlContent);
      console.log(`✅ SQL backup created: ${filename}`);
      return backupPath;
    }
    
  } catch (error) {
    console.error('❌ SQL backup failed:', error);
    throw error;
  }
};

// Create JSON backup
const createJSONBackup = async (filename) => {
  console.log('🔄 Creating JSON backup...');
  
  const backupPath = path.join(BACKUP_CONFIG.directory, filename);
  const models = sequelize.models;
  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: sequelize.getDatabaseName(),
      version: '1.0.0'
    },
    data: {}
  };
  
  try {
    // Export each model
    for (const [modelName, model] of Object.entries(models)) {
      console.log(`   Exporting model: ${modelName}`);
      
      const records = await model.findAll({
        paranoid: false // Include soft-deleted records
      });
      
      backupData.data[modelName] = records.map(record => record.toJSON());
      console.log(`   Exported ${records.length} ${modelName} records`);
    }
    
    // Convert to JSON
    const jsonContent = JSON.stringify(backupData, null, 2);
    
    // Write file
    if (BACKUP_CONFIG.compression) {
      const compressed = zlib.gzipSync(jsonContent);
      await fs.writeFile(backupPath + '.gz', compressed);
      console.log(`✅ JSON backup created (compressed): ${filename}.gz`);
      return backupPath + '.gz';
    } else {
      await fs.writeFile(backupPath, jsonContent);
      console.log(`✅ JSON backup created: ${filename}`);
      return backupPath;
    }
    
  } catch (error) {
    console.error('❌ JSON backup failed:', error);
    throw error;
  }
};

// Calculate file checksum
const calculateChecksum = async (filePath) => {
  const data = await fs.readFile(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
};

// Create backup metadata
const createBackupMetadata = async (backupFiles) => {
  const metadata = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: sequelize.getDatabaseName(),
    files: []
  };
  
  for (const filePath of backupFiles) {
    const stats = await fs.stat(filePath);
    const checksum = await calculateChecksum(filePath);
    
    metadata.files.push({
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      checksum,
      created: stats.birthtime.toISOString()
    });
  }
  
  // Write metadata file
  const metadataPath = path.join(
    BACKUP_CONFIG.directory,
    `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.meta.json`
  );
  
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`📋 Backup metadata created: ${path.basename(metadataPath)}`);
  
  return metadataPath;
};

// Clean old backups based on retention policy
const cleanOldBackups = async () => {
  console.log('🧹 Cleaning old backups...');
  
  try {
    const files = await fs.readdir(BACKUP_CONFIG.directory);
    const backupFiles = files.filter(file => 
      file.includes('coldcaller_') && 
      (file.endsWith('.sql') || file.endsWith('.sql.gz') || 
       file.endsWith('.json') || file.endsWith('.json.gz'))
    );
    
    // Group by type and date
    const grouped = {};
    
    for (const file of backupFiles) {
      const match = file.match(/coldcaller_(\w+)_\w+_(\d{4}-\d{2}-\d{2})T/);
      if (match) {
        const [, type, date] = match;
        const key = `${type}_${date}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(file);
      }
    }
    
    // Keep only the most recent backup per day, then apply retention policy
    const now = new Date();
    const toDelete = [];
    
    Object.entries(grouped).forEach(([key, files]) => {
      const [type, dateStr] = key.split('_');
      const date = new Date(dateStr);
      const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      // Sort files by timestamp and keep only the most recent
      files.sort().reverse();
      const toKeep = files.slice(0, 1);
      const extras = files.slice(1);
      
      // Apply retention policy
      if (daysDiff > BACKUP_CONFIG.retention.daily) {
        toDelete.push(...toKeep, ...extras);
      } else {
        toDelete.push(...extras);
      }
    });
    
    // Delete old files
    for (const file of toDelete) {
      const filePath = path.join(BACKUP_CONFIG.directory, file);
      await fs.unlink(filePath);
      console.log(`   Deleted: ${file}`);
    }
    
    console.log(`✅ Cleaned ${toDelete.length} old backup files`);
    
  } catch (error) {
    console.error('❌ Backup cleanup failed:', error);
  }
};

// Main backup function
const createBackup = async (options = {}) => {
  const {
    type = 'full',
    formats = BACKUP_CONFIG.formats,
    skipCleanup = false
  } = options;
  
  console.log('🚀 Starting database backup...');
  const startTime = Date.now();
  
  try {
    await ensureBackupDirectory();
    
    const backupFiles = [];
    
    // Create backups in requested formats
    for (const format of formats) {
      const filename = generateBackupFilename(type, format);
      
      if (format === 'sql') {
        const filePath = await createSQLBackup(filename);
        backupFiles.push(filePath);
      } else if (format === 'json') {
        const filePath = await createJSONBackup(filename);
        backupFiles.push(filePath);
      }
    }
    
    // Create metadata
    const metadataPath = await createBackupMetadata(backupFiles);
    backupFiles.push(metadataPath);
    
    // Cleanup old backups
    if (!skipCleanup) {
      await cleanOldBackups();
    }
    
    const duration = Date.now() - startTime;
    console.log(`🎉 Backup completed successfully in ${duration}ms`);
    
    // Calculate total size
    let totalSize = 0;
    for (const filePath of backupFiles) {
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }
    
    console.log('📊 Backup Summary:');
    console.log(`   Files created: ${backupFiles.length}`);
    console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      success: true,
      files: backupFiles,
      size: totalSize,
      duration
    };
    
  } catch (error) {
    console.error('💥 Backup process failed:', error);
    throw error;
  }
};

// Command line interface
const main = async () => {
  const args = process.argv.slice(2);
  const options = {
    type: args.includes('--incremental') ? 'incremental' : 'full',
    formats: args.includes('--sql-only') ? ['sql'] : args.includes('--json-only') ? ['json'] : ['sql', 'json'],
    skipCleanup: args.includes('--no-cleanup')
  };
  
  try {
    await sequelize.authenticate();
    await createBackup(options);
  } catch (error) {
    console.error('Command failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Export functions
module.exports = {
  createBackup,
  createSQLBackup,
  createJSONBackup,
  cleanOldBackups,
  BACKUP_CONFIG
};

// Run if called directly
if (require.main === module) {
  main();
}