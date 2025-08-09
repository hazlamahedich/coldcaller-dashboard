/**
 * Audio Utility Functions
 * Helper functions for audio processing, format conversion, and analysis
 */

// Audio format validation
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/wav',
  'audio/mp3', 
  'audio/mpeg',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a'
];

// Maximum file sizes by format (in bytes)
export const MAX_FILE_SIZES = {
  'audio/wav': 100 * 1024 * 1024,  // 100MB for uncompressed
  'audio/mp3': 50 * 1024 * 1024,   // 50MB for compressed
  'audio/mpeg': 50 * 1024 * 1024,  // 50MB for compressed
  'audio/ogg': 50 * 1024 * 1024,   // 50MB for compressed
  'audio/webm': 75 * 1024 * 1024,  // 75MB for WebM
  'audio/mp4': 50 * 1024 * 1024,   // 50MB for MP4
  'audio/x-m4a': 50 * 1024 * 1024  // 50MB for M4A
};

/**
 * Validate audio file format and size
 * @param {File} file - Audio file to validate
 * @returns {Object} Validation result
 */
export const validateAudioFile = (file) => {
  const errors = [];
  const warnings = [];
  
  // Check if file exists
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors, warnings };
  }
  
  // Check file format
  if (!SUPPORTED_AUDIO_FORMATS.includes(file.type)) {
    errors.push(`Unsupported format: ${file.type}`);
  }
  
  // Check file size
  const maxSize = MAX_FILE_SIZES[file.type] || 50 * 1024 * 1024; // Default 50MB
  if (file.size > maxSize) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(maxSize)})`);
  }
  
  // Check for empty files
  if (file.size === 0) {
    errors.push('File is empty');
  }
  
  // Warnings for large files
  if (file.size > 10 * 1024 * 1024) {
    warnings.push('Large file - may take time to upload and process');
  }
  
  // Warning for uncompressed formats
  if (file.type === 'audio/wav' && file.size > 25 * 1024 * 1024) {
    warnings.push('Consider converting to compressed format (MP3, OGG) for better performance');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Format duration in seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Parse duration string (MM:SS) to seconds
 * @param {string} duration - Duration string in MM:SS format
 * @returns {number} Duration in seconds
 */
export const parseDuration = (duration) => {
  if (!duration || typeof duration !== 'string') return 0;
  
  const parts = duration.split(':');
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  if (isNaN(minutes) || isNaN(seconds)) return 0;
  
  return (minutes * 60) + seconds;
};

/**
 * Get audio format info from MIME type
 * @param {string} mimeType - MIME type
 * @returns {Object} Format information
 */
export const getAudioFormatInfo = (mimeType) => {
  const formatMap = {
    'audio/wav': { 
      name: 'WAV', 
      compressed: false, 
      quality: 'lossless',
      compatibility: 'excellent'
    },
    'audio/mp3': { 
      name: 'MP3', 
      compressed: true, 
      quality: 'lossy',
      compatibility: 'excellent'
    },
    'audio/mpeg': { 
      name: 'MP3', 
      compressed: true, 
      quality: 'lossy',
      compatibility: 'excellent'
    },
    'audio/ogg': { 
      name: 'OGG', 
      compressed: true, 
      quality: 'lossy',
      compatibility: 'good'
    },
    'audio/webm': { 
      name: 'WebM', 
      compressed: true, 
      quality: 'lossy',
      compatibility: 'good'
    },
    'audio/mp4': { 
      name: 'MP4', 
      compressed: true, 
      quality: 'lossy',
      compatibility: 'excellent'
    },
    'audio/x-m4a': { 
      name: 'M4A', 
      compressed: true, 
      quality: 'lossy',
      compatibility: 'excellent'
    }
  };
  
  return formatMap[mimeType] || { 
    name: 'Unknown', 
    compressed: false, 
    quality: 'unknown',
    compatibility: 'unknown'
  };
};

/**
 * Generate audio waveform data from AudioBuffer
 * @param {AudioBuffer} audioBuffer - Web Audio API AudioBuffer
 * @param {number} samples - Number of samples to generate (default: 500)
 * @returns {Array<number>} Waveform data array
 */
export const generateWaveformData = (audioBuffer, samples = 500) => {
  if (!audioBuffer || !audioBuffer.getChannelData) {
    return new Array(samples).fill(0);
  }
  
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  const blockSize = Math.floor(channelData.length / samples);
  const waveformData = [];
  
  for (let i = 0; i < samples; i++) {
    let sum = 0;
    const start = i * blockSize;
    const end = start + blockSize;
    
    // Calculate RMS for this block
    for (let j = start; j < end && j < channelData.length; j++) {
      sum += Math.abs(channelData[j]);
    }
    
    waveformData.push(sum / blockSize);
  }
  
  return waveformData;
};

/**
 * Calculate audio loudness (RMS)
 * @param {Float32Array} audioData - Audio sample data
 * @returns {number} RMS loudness value (0-1)
 */
export const calculateRMS = (audioData) => {
  if (!audioData || audioData.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  
  return Math.sqrt(sum / audioData.length);
};

/**
 * Detect silence in audio data
 * @param {Float32Array} audioData - Audio sample data
 * @param {number} threshold - Silence threshold (default: 0.01)
 * @returns {boolean} True if audio is considered silent
 */
export const detectSilence = (audioData, threshold = 0.01) => {
  const rms = calculateRMS(audioData);
  return rms < threshold;
};

/**
 * Get optimal recording settings based on use case
 * @param {string} useCase - 'voice', 'music', 'podcast', 'phone'
 * @returns {Object} Recording configuration
 */
export const getOptimalRecordingSettings = (useCase = 'voice') => {
  const settings = {
    voice: {
      sampleRate: 22050,
      bitrate: 64000,
      mimeType: 'audio/webm;codecs=opus',
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    music: {
      sampleRate: 44100,
      bitrate: 128000,
      mimeType: 'audio/webm;codecs=opus',
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    },
    podcast: {
      sampleRate: 44100,
      bitrate: 96000,
      mimeType: 'audio/webm;codecs=opus',
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    phone: {
      sampleRate: 16000,
      bitrate: 32000,
      mimeType: 'audio/webm;codecs=opus',
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  };
  
  return settings[useCase] || settings.voice;
};

/**
 * Create audio categories with metadata
 * @param {Array} audioClips - Array of audio clips
 * @returns {Object} Categorized clips with statistics
 */
export const categorizeAudioClips = (audioClips) => {
  const categories = {};
  
  audioClips.forEach(clip => {
    const category = clip.category || 'uncategorized';
    
    if (!categories[category]) {
      categories[category] = {
        clips: [],
        totalDuration: 0,
        averageDuration: 0,
        count: 0
      };
    }
    
    categories[category].clips.push(clip);
    categories[category].count++;
    
    // Calculate durations
    const duration = parseDuration(clip.duration);
    categories[category].totalDuration += duration;
    categories[category].averageDuration = categories[category].totalDuration / categories[category].count;
  });
  
  return categories;
};

/**
 * Search audio clips by various criteria
 * @param {Array} audioClips - Array of audio clips
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Array} Filtered audio clips
 */
export const searchAudioClips = (audioClips, query, filters = {}) => {
  let results = [...audioClips];
  
  // Text search
  if (query && query.trim()) {
    const searchTerm = query.toLowerCase().trim();
    results = results.filter(clip => 
      clip.name.toLowerCase().includes(searchTerm) ||
      (clip.description && clip.description.toLowerCase().includes(searchTerm)) ||
      (clip.category && clip.category.toLowerCase().includes(searchTerm))
    );
  }
  
  // Category filter
  if (filters.category) {
    results = results.filter(clip => clip.category === filters.category);
  }
  
  // Duration filter
  if (filters.minDuration || filters.maxDuration) {
    results = results.filter(clip => {
      const duration = parseDuration(clip.duration);
      if (filters.minDuration && duration < filters.minDuration) return false;
      if (filters.maxDuration && duration > filters.maxDuration) return false;
      return true;
    });
  }
  
  // Date filter
  if (filters.dateFrom || filters.dateTo) {
    results = results.filter(clip => {
      if (!clip.createdAt) return false;
      const clipDate = new Date(clip.createdAt);
      if (filters.dateFrom && clipDate < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && clipDate > new Date(filters.dateTo)) return false;
      return true;
    });
  }
  
  return results;
};

/**
 * Sort audio clips by various criteria
 * @param {Array} audioClips - Array of audio clips
 * @param {string} sortBy - Sort criteria
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted audio clips
 */
export const sortAudioClips = (audioClips, sortBy = 'name', order = 'asc') => {
  const sorted = [...audioClips].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'duration':
        comparison = parseDuration(a.duration) - parseDuration(b.duration);
        break;
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '');
        break;
      case 'date':
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        comparison = dateA - dateB;
        break;
      case 'usage':
        comparison = (a.usageCount || 0) - (b.usageCount || 0);
        break;
      case 'size':
        comparison = (a.size || 0) - (b.size || 0);
        break;
      default:
        comparison = 0;
    }
    
    return order === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
};

/**
 * Extract audio metadata from file
 * @param {File} file - Audio file to extract metadata from
 * @returns {Promise<Object>} Audio metadata
 */
export const extractAudioMetadata = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        const metadata = {
          duration: audio.duration,
          size: file.size,
          type: file.type,
          name: file.name,
          lastModified: file.lastModified,
          bitrate: calculateEstimatedBitrate(file.size, audio.duration),
          format: getAudioFormatInfo(file.type)
        };
        
        URL.revokeObjectURL(url);
        resolve(metadata);
      });
      
      audio.addEventListener('error', (error) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio metadata: ' + error.message));
      });
      
      audio.src = url;
    } catch (error) {
      reject(new Error('Failed to extract audio metadata: ' + error.message));
    }
  });
};

/**
 * Calculate estimated bitrate from file size and duration
 * @param {number} fileSize - File size in bytes
 * @param {number} duration - Duration in seconds
 * @returns {number} Estimated bitrate in kbps
 */
const calculateEstimatedBitrate = (fileSize, duration) => {
  if (!fileSize || !duration || duration <= 0) return 0;
  return Math.round((fileSize * 8) / (duration * 1000));
};

/**
 * Browser compatibility checks
 * @returns {Object} Compatibility information
 */
export const checkBrowserCompatibility = () => {
  return {
    webAudio: !!(window.AudioContext || window.webkitAudioContext),
    mediaRecorder: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    audioWorklet: !!(window.AudioContext && window.AudioContext.prototype.audioWorklet),
    offlineAudio: !!(window.OfflineAudioContext || window.webkitOfflineAudioContext)
  };
};

export default {
  validateAudioFile,
  extractAudioMetadata,
  formatFileSize,
  formatDuration,
  parseDuration,
  getAudioFormatInfo,
  generateWaveformData,
  calculateRMS,
  detectSilence,
  getOptimalRecordingSettings,
  categorizeAudioClips,
  searchAudioClips,
  sortAudioClips,
  checkBrowserCompatibility
};