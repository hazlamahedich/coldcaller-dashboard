const fs = require('fs-extra');
const path = require('path');
const audioFileModel = require('../models/audioFileModel');
const audioProcessor = require('../utils/audio/audioProcessor');
const ResponseFormatter = require('../utils/responseFormatter');

/**
 * Enhanced Audio Controller with file upload, processing, and streaming capabilities
 */

/**
 * Upload audio files with metadata extraction and processing
 */
const uploadAudioFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return ResponseFormatter.error(res, 'No audio files provided', 400);
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Extract metadata from uploaded file
        const metadata = await audioProcessor.extractMetadata(file.path);
        
        // Create database record
        const audioFileData = {
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          metadata: metadata,
          category: req.body.category || 'general',
          description: req.body.description || '',
          tags: req.body.tags ? JSON.parse(req.body.tags) : []
        };

        const audioFile = await audioFileModel.create(audioFileData);
        
        // Generate waveform data asynchronously (don't wait)
        audioProcessor.generateWaveform(file.path)
          .then(waveform => {
            audioFileModel.update(audioFile.id, { 
              waveform, 
              isProcessed: true 
            });
          })
          .catch(error => {
            console.error('Error generating waveform:', error);
          });

        uploadedFiles.push({
          id: audioFile.id,
          originalName: audioFile.originalName,
          filename: audioFile.filename,
          url: audioFile.url,
          size: audioFile.size,
          duration: metadata.duration,
          format: metadata.format,
          category: audioFile.category,
          createdAt: audioFile.createdAt
        });

      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    const response = {
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      data: {
        uploadedFiles,
        totalUploaded: uploadedFiles.length,
        totalErrors: errors.length
      }
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return res.status(201).json(response);

  } catch (error) {
    console.error('Error uploading audio files:', error);
    return ResponseFormatter.error(res, 'Failed to upload audio files');
  }
};

/**
 * Get all audio files with advanced filtering and pagination
 */
const getAllAudioFiles = async (req, res) => {
  try {
    const {
      category,
      tags,
      search,
      processed,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      category,
      tags: tags ? tags.split(',') : undefined,
      search,
      processed: processed !== undefined ? processed === 'true' : undefined,
      sortBy,
      sortOrder
    };

    const allFiles = await audioFileModel.findWithFilters(filters);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedFiles = allFiles.slice(startIndex, endIndex);

    // Format response with essential info
    const formattedFiles = paginatedFiles.map(file => ({
      id: file.id,
      originalName: file.originalName,
      filename: file.filename,
      url: file.url,
      size: file.size,
      category: file.category,
      tags: file.tags,
      description: file.description,
      duration: file.metadata.duration || 0,
      format: file.metadata.format,
      isProcessed: file.isProcessed,
      analytics: file.analytics,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }));

    return ResponseFormatter.paginated(
      res,
      formattedFiles,
      page,
      limit,
      allFiles.length,
      'Audio files retrieved successfully'
    );
    
  } catch (error) {
    console.error('Error fetching audio files:', error);
    return ResponseFormatter.error(res, 'Failed to fetch audio files');
  }
};

/**
 * Stream specific audio file with range support
 */
const streamAudioFile = async (req, res) => {
  try {
    const { id } = req.params;
    const audioFile = await audioFileModel.findById(id);
    
    if (!audioFile) {
      return ResponseFormatter.notFound(res, 'Audio file');
    }

    const filePath = audioFile.path;
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      return ResponseFormatter.error(res, 'Audio file not found on disk', 404);
    }

    // Update play analytics
    audioFileModel.updateAnalytics(id, 'play').catch(console.error);

    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Set appropriate headers
    res.set({
      'Content-Type': audioFile.mimetype,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${audioFile.originalName}"`
    });

    // Handle range requests for streaming
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunkSize
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.set('Content-Length', fileSize);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }

  } catch (error) {
    console.error('Error streaming audio file:', error);
    return ResponseFormatter.error(res, 'Failed to stream audio file');
  }
};

/**
 * Get audio file metadata and details
 */
const getAudioFileMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const audioFile = await audioFileModel.findById(id);
    
    if (!audioFile) {
      return ResponseFormatter.notFound(res, 'Audio file');
    }

    const detailedInfo = {
      id: audioFile.id,
      originalName: audioFile.originalName,
      filename: audioFile.filename,
      url: audioFile.url,
      size: audioFile.size,
      category: audioFile.category,
      tags: audioFile.tags,
      description: audioFile.description,
      metadata: audioFile.metadata,
      waveform: audioFile.waveform,
      analytics: audioFile.analytics,
      isProcessed: audioFile.isProcessed,
      createdAt: audioFile.createdAt,
      updatedAt: audioFile.updatedAt
    };

    return ResponseFormatter.success(res, detailedInfo, 'Audio file metadata retrieved successfully');

  } catch (error) {
    console.error('Error fetching audio file metadata:', error);
    return ResponseFormatter.error(res, 'Failed to fetch audio file metadata');
  }
};

/**
 * Update audio file metadata
 */
const updateAudioFileMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Only allow certain fields to be updated
    const allowedUpdates = {
      category: updates.category,
      description: updates.description,
      tags: updates.tags
    };

    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    const updatedFile = await audioFileModel.update(id, allowedUpdates);
    
    if (!updatedFile) {
      return ResponseFormatter.notFound(res, 'Audio file');
    }

    return ResponseFormatter.success(res, updatedFile, 'Audio file updated successfully');

  } catch (error) {
    console.error('Error updating audio file:', error);
    return ResponseFormatter.error(res, 'Failed to update audio file');
  }
};

/**
 * Delete audio file
 */
const deleteAudioFile = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFile = await audioFileModel.delete(id);
    
    if (!deletedFile) {
      return ResponseFormatter.notFound(res, 'Audio file');
    }

    return ResponseFormatter.success(res, deletedFile, 'Audio file deleted successfully');

  } catch (error) {
    console.error('Error deleting audio file:', error);
    return ResponseFormatter.error(res, 'Failed to delete audio file');
  }
};

/**
 * Process audio file (convert, compress, etc.)
 */
const processAudioFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { operation, options = {} } = req.body;

    const audioFile = await audioFileModel.findById(id);
    if (!audioFile) {
      return ResponseFormatter.notFound(res, 'Audio file');
    }

    const inputPath = audioFile.path;
    const outputDir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));

    let outputPath;
    let result;

    switch (operation) {
      case 'convert_mp3':
        outputPath = path.join(outputDir, `${baseName}_converted.mp3`);
        await audioProcessor.convertToMp3(inputPath, outputPath, options);
        result = { convertedPath: outputPath, format: 'mp3' };
        break;

      case 'compress':
        outputPath = path.join(outputDir, `${baseName}_compressed.mp3`);
        await audioProcessor.compressAudio(inputPath, outputPath, options.quality || 'medium');
        result = { compressedPath: outputPath, quality: options.quality || 'medium' };
        break;

      case 'normalize':
        outputPath = path.join(outputDir, `${baseName}_normalized.mp3`);
        await audioProcessor.normalizeAudio(inputPath, outputPath, options.targetDb || -16);
        result = { normalizedPath: outputPath, targetDb: options.targetDb || -16 };
        break;

      case 'trim':
        if (!options.startTime || !options.duration) {
          return ResponseFormatter.error(res, 'startTime and duration are required for trimming', 400);
        }
        outputPath = path.join(outputDir, `${baseName}_trimmed.mp3`);
        await audioProcessor.trimAudio(inputPath, outputPath, options.startTime, options.duration);
        result = { trimmedPath: outputPath, startTime: options.startTime, duration: options.duration };
        break;

      case 'waveform':
        const waveform = await audioProcessor.generateWaveform(inputPath, options.samples || 1000);
        await audioFileModel.update(id, { waveform });
        result = { waveform, samples: options.samples || 1000 };
        break;

      default:
        return ResponseFormatter.error(res, 'Invalid operation. Supported: convert_mp3, compress, normalize, trim, waveform', 400);
    }

    // Update processed status
    await audioFileModel.update(id, { isProcessed: true });

    return ResponseFormatter.success(res, {
      operation,
      audioFileId: id,
      ...result,
      processedAt: new Date().toISOString()
    }, `Audio processing completed: ${operation}`);

  } catch (error) {
    console.error('Error processing audio file:', error);
    return ResponseFormatter.error(res, `Failed to process audio file: ${error.message}`);
  }
};

/**
 * Get audio library statistics
 */
const getAudioStatistics = async (req, res) => {
  try {
    const stats = await audioFileModel.getStatistics();
    
    // Add formatted size
    stats.formattedSize = formatFileSize(stats.totalSize);
    
    return ResponseFormatter.success(res, stats, 'Audio statistics retrieved successfully');

  } catch (error) {
    console.error('Error fetching audio statistics:', error);
    return ResponseFormatter.error(res, 'Failed to fetch audio statistics');
  }
};

/**
 * Search audio files with advanced filters
 */
const searchAudioFiles = async (req, res) => {
  try {
    const { query, category, tags, minDuration, maxDuration } = req.query;
    
    if (!query || query.trim().length === 0) {
      return ResponseFormatter.error(res, 'Search query is required', 400);
    }

    const filters = {
      search: query.trim(),
      category,
      tags: tags ? tags.split(',') : undefined
    };

    let results = await audioFileModel.findWithFilters(filters);

    // Additional filtering by duration
    if (minDuration || maxDuration) {
      results = results.filter(file => {
        const duration = file.metadata.duration || 0;
        const min = minDuration ? parseFloat(minDuration) : 0;
        const max = maxDuration ? parseFloat(maxDuration) : Infinity;
        return duration >= min && duration <= max;
      });
    }

    const formattedResults = results.map(file => ({
      id: file.id,
      originalName: file.originalName,
      filename: file.filename,
      url: file.url,
      category: file.category,
      tags: file.tags,
      description: file.description,
      duration: file.metadata.duration || 0,
      format: file.metadata.format,
      analytics: file.analytics,
      createdAt: file.createdAt
    }));

    return ResponseFormatter.success(res, {
      query,
      total: formattedResults.length,
      results: formattedResults
    }, `Found ${formattedResults.length} audio files matching '${query}'`);

  } catch (error) {
    console.error('Error searching audio files:', error);
    return ResponseFormatter.error(res, 'Failed to search audio files');
  }
};

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  uploadAudioFiles,
  getAllAudioFiles,
  streamAudioFile,
  getAudioFileMetadata,
  updateAudioFileMetadata,
  deleteAudioFile,
  processAudioFile,
  getAudioStatistics,
  searchAudioFiles
};