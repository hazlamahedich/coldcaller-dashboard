const fs = require('fs').promises;
const path = require('path');

class CallRecordingModel {
  constructor() {
    this.defaultRecordingPath = './recordings';
    this.allowedFormats = ['mp3', 'wav', 'ogg'];
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
  }

  /**
   * Generate recording file path
   */
  generateRecordingPath(callId, format = 'mp3') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    
    const fileName = `${callId}_${timestamp}.${format}`;
    return path.join(this.defaultRecordingPath, year.toString(), month, day, fileName);
  }

  /**
   * Validate recording format
   */
  isValidFormat(format) {
    return this.allowedFormats.includes(format.toLowerCase());
  }

  /**
   * Create recording metadata
   */
  createRecordingMetadata(callId, filePath, options = {}) {
    return {
      callId,
      filePath,
      fileName: path.basename(filePath),
      format: path.extname(filePath).slice(1).toLowerCase(),
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      fileSize: null,
      status: 'recording',
      bitrate: options.bitrate || '128kbps',
      sampleRate: options.sampleRate || '44100Hz',
      channels: options.channels || 'mono',
      compression: options.compression || 'standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Finalize recording
   */
  async finalizeRecording(recordingMetadata) {
    try {
      recordingMetadata.endTime = new Date().toISOString();
      recordingMetadata.status = 'completed';
      recordingMetadata.updatedAt = new Date().toISOString();

      // Calculate duration
      if (recordingMetadata.startTime && recordingMetadata.endTime) {
        const start = new Date(recordingMetadata.startTime);
        const end = new Date(recordingMetadata.endTime);
        recordingMetadata.duration = Math.floor((end - start) / 1000); // seconds
      }

      // Get file size if file exists
      try {
        const stats = await fs.stat(recordingMetadata.filePath);
        recordingMetadata.fileSize = stats.size;
      } catch (error) {
        console.warn('Could not get file size:', error.message);
      }

      return recordingMetadata;
    } catch (error) {
      recordingMetadata.status = 'failed';
      recordingMetadata.error = error.message;
      recordingMetadata.updatedAt = new Date().toISOString();
      throw error;
    }
  }

  /**
   * Delete recording file and cleanup
   */
  async deleteRecording(filePath) {
    try {
      await fs.unlink(filePath);
      
      // Try to clean up empty directories
      const dir = path.dirname(filePath);
      try {
        const files = await fs.readdir(dir);
        if (files.length === 0) {
          await fs.rmdir(dir);
        }
      } catch (dirError) {
        // Directory not empty or other error, ignore
      }

      return { success: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, message: 'File already deleted' };
      }
      throw error;
    }
  }

  /**
   * Get recording file info
   */
  async getRecordingInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      
      return {
        exists: true,
        fileSize: stats.size,
        format: ext,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isValid: this.isValidFormat(ext) && stats.size > 0
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * List recordings in directory
   */
  async listRecordings(directory = this.defaultRecordingPath) {
    try {
      const recordings = [];
      
      const processDirectory = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await processDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).slice(1).toLowerCase();
            if (this.isValidFormat(ext)) {
              const stats = await fs.stat(fullPath);
              recordings.push({
                fileName: entry.name,
                filePath: fullPath,
                format: ext,
                fileSize: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime
              });
            }
          }
        }
      };

      await processDirectory(directory);
      return recordings.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Create recording directories
   */
  async ensureRecordingDirectory(filePath) {
    const directory = path.dirname(filePath);
    await fs.mkdir(directory, { recursive: true });
  }
}

module.exports = new CallRecordingModel();