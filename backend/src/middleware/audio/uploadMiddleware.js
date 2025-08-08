const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../../uploads/audio');
fs.ensureDirSync(uploadDir);

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter for audio files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/mpeg',     // MP3
    'audio/mp4',      // M4A
    'audio/wav',      // WAV
    'audio/x-wav',    // WAV
    'audio/ogg',      // OGG
    'audio/webm',     // WebM
    'audio/aac',      // AAC
    'audio/flac',     // FLAC
    'audio/x-ms-wma'  // WMA
  ];

  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.webm'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only audio files are allowed: ${allowedExtensions.join(', ')}`), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Maximum 10 files at once
  }
});

// Rate limiting for uploads
const uploadRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 uploads per windowMs
  message: 'Too many file uploads from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateAudioUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No audio files provided'
    });
  }

  // Additional validation
  for (const file of req.files) {
    // Check file size
    if (file.size > 50 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: `File ${file.originalname} is too large. Maximum size is 50MB.`
      });
    }

    // Validate mime type again
    const detectedMime = mime.lookup(file.originalname);
    if (!detectedMime || !detectedMime.startsWith('audio/')) {
      return res.status(400).json({
        success: false,
        message: `File ${file.originalname} is not a valid audio file.`
      });
    }
  }

  next();
};

// Progress tracking middleware
const trackUploadProgress = (req, res, next) => {
  req.uploadStartTime = Date.now();
  
  // Override res.json to include upload metrics
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    if (req.uploadStartTime) {
      const uploadDuration = Date.now() - req.uploadStartTime;
      if (data && typeof data === 'object') {
        data.uploadMetrics = {
          duration: uploadDuration,
          timestamp: new Date().toISOString()
        };
      }
    }
    return originalJson(data);
  };

  next();
};

module.exports = {
  upload,
  uploadRateLimit,
  validateAudioUpload,
  trackUploadProgress,
  uploadDir
};