/**
 * AudioUpload Component
 * Drag & drop audio file upload with metadata extraction
 * Supports multiple audio formats with validation
 */

import React, { useState, useRef, useCallback } from 'react';
import { audioManager } from '../services/WebAudioManager';
import { audioService } from '../services';
import { useTheme } from '../contexts/ThemeContext';

const AudioUpload = ({ 
  onUploadComplete = () => {}, 
  onUploadError = () => {}, 
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  acceptedFormats = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/mp4'],
  className = '' 
}) => {
  const { isDarkMode } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [errors, setErrors] = useState([]);
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Validate file
  const validateFile = useCallback((file) => {
    const errors = [];
    
    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit (${maxFileSize / 1024 / 1024}MB)`);
    }
    
    // Check file format
    if (!acceptedFormats.includes(file.type)) {
      errors.push(`Format ${file.type} not supported. Accepted: ${acceptedFormats.join(', ')}`);
    }
    
    // Check file name
    if (!file.name || file.name.trim().length === 0) {
      errors.push('Invalid file name');
    }
    
    return errors;
  }, [maxFileSize, acceptedFormats]);

  // Extract audio metadata
  const extractMetadata = useCallback(async (file) => {
    try {
      // Initialize audio manager if needed
      if (!audioManager.isInitialized) {
        await audioManager.initialize();
      }
      
      const metadata = await audioManager.extractMetadata(file);
      return {
        ...metadata,
        name: file.name,
        lastModified: new Date(file.lastModified),
        webkitRelativePath: file.webkitRelativePath || ''
      };
    } catch (error) {
      console.error('❌ Failed to extract metadata:', error);
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        duration: 0,
        error: error.message
      };
    }
  }, []);

  // Handle file selection
  const handleFiles = useCallback(async (files) => {
    const fileList = Array.from(files);
    const validFiles = [];
    const fileErrors = [];

    // Validate each file
    for (const file of fileList) {
      const validation = validateFile(file);
      if (validation.length > 0) {
        fileErrors.push({ file: file.name, errors: validation });
      } else {
        validFiles.push(file);
      }
    }

    setErrors(fileErrors);
    
    if (validFiles.length === 0) {
      return;
    }

    // Extract metadata for valid files
    const filesWithMetadata = [];
    for (const file of validFiles) {
      try {
        const fileMeta = await extractMetadata(file);
        filesWithMetadata.push({
          file,
          metadata: fileMeta
        });
      } catch (error) {
        console.error('Error extracting metadata for', file.name, error);
        filesWithMetadata.push({
          file,
          metadata: { name: file.name, error: error.message }
        });
      }
    }

    setSelectedFiles(filesWithMetadata);
    
    // Store metadata
    const metadataMap = {};
    filesWithMetadata.forEach(({ file, metadata }) => {
      metadataMap[file.name] = metadata;
    });
    setMetadata(metadataMap);

    console.log('📁 Files selected:', filesWithMetadata.length);
  }, [validateFile, extractMetadata]);

  // Upload files
  const uploadFiles = useCallback(async (uploadData = {}) => {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const { file, metadata: fileMeta } = selectedFiles[i];
      
      try {
        // Create form data
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('name', uploadData.name || file.name.replace(/\.[^/.]+$/, ''));
        formData.append('category', uploadData.category || 'greetings');
        formData.append('description', uploadData.description || '');
        formData.append('duration', fileMeta.duration ? `${Math.floor(fileMeta.duration / 60)}:${(fileMeta.duration % 60).toFixed(0).padStart(2, '0')}` : '0:00');
        
        // Add metadata
        formData.append('metadata', JSON.stringify({
          originalName: file.name,
          size: file.size,
          type: file.type,
          sampleRate: fileMeta.sampleRate,
          channels: fileMeta.channels,
          bitrate: fileMeta.bitrate,
          format: fileMeta.format
        }));

        // Upload with progress tracking
        const response = await audioService.uploadAudioClip(formData, (progress) => {
          const totalProgress = ((i + progress / 100) / selectedFiles.length) * 100;
          setUploadProgress(Math.round(totalProgress));
        });

        if (response.success) {
          uploadResults.push({
            file: file.name,
            success: true,
            data: response.data
          });
          successCount++;
        } else {
          uploadResults.push({
            file: file.name,
            success: false,
            error: response.message
          });
          errorCount++;
        }

      } catch (error) {
        console.error('Upload error for', file.name, error);
        uploadResults.push({
          file: file.name,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    setIsUploading(false);
    setUploadProgress(100);

    // Call completion callbacks
    if (successCount > 0) {
      onUploadComplete({
        successCount,
        errorCount,
        results: uploadResults,
        files: selectedFiles
      });
    }

    if (errorCount > 0) {
      onUploadError({
        errorCount,
        successCount,
        results: uploadResults
      });
    }

    // Reset after delay
    setTimeout(() => {
      setSelectedFiles([]);
      setMetadata({});
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 3000);

  }, [selectedFiles, onUploadComplete, onUploadError]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if leaving the drop zone itself
    if (!dropZoneRef.current?.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const { files } = e.dataTransfer;
    handleFiles(files);
  }, [handleFiles]);

  // File input change handler
  const handleFileInputChange = useCallback((e) => {
    const { files } = e.target;
    handleFiles(files);
  }, [handleFiles]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
    setMetadata({});
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`audio-upload-container ${className}`}>
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          isDragging 
            ? isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
            : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="space-y-4">
          <div className="text-4xl">
            {isDragging ? '📤' : '🎵'}
          </div>
          
          <div>
            <p className={`text-lg font-medium ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              {isDragging ? 'Drop your audio files here' : 'Upload Audio Files'}
            </p>
            <p className={`text-sm mt-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Drag & drop or click to select files
            </p>
          </div>
          
          <div className={`text-xs ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <p>Supported: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}</p>
            <p>Max size: {formatFileSize(maxFileSize)} per file</p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-4">
          <div className={`rounded-full h-2 ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className={`text-sm mt-1 text-center ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && !isUploading && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-lg font-medium ${
              isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              Selected Files ({selectedFiles.length})
            </h3>
            <button
              onClick={clearSelection}
              className={`text-sm transition-colors ${
                isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'
              }`}
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {selectedFiles.map(({ file, metadata: fileMeta }, index) => (
              <div key={index} className={`p-4 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>{file.name}</h4>
                    <div className={`text-sm space-y-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <p>Size: {formatFileSize(file.size)}</p>
                      {fileMeta.duration > 0 && (
                        <p>Duration: {formatDuration(fileMeta.duration)}</p>
                      )}
                      {fileMeta.sampleRate && (
                        <p>Quality: {fileMeta.sampleRate}Hz, {fileMeta.channels} channel{fileMeta.channels > 1 ? 's' : ''}</p>
                      )}
                      {fileMeta.format && (
                        <p>Format: {fileMeta.format}</p>
                      )}
                      {fileMeta.error && (
                        <p className={`${
                          isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`}>Error: {fileMeta.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'
                    }`}>
                      ✅ Valid
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Upload Form */}
          <UploadForm files={selectedFiles} onUpload={uploadFiles} />
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className={`mt-4 p-4 border rounded-lg ${
          isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
        }`}>
          <h4 className={`font-medium mb-2 ${
            isDarkMode ? 'text-red-200' : 'text-red-800'
          }`}>Upload Errors:</h4>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <div key={index} className="text-sm">
                <span className={`font-medium ${
                  isDarkMode ? 'text-red-300' : 'text-red-700'
                }`}>{error.file}:</span>
                <ul className="list-disc list-inside ml-4">
                  {error.errors.map((err, errIndex) => (
                    <li key={errIndex} className={`${
                      isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>{err}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Upload Form Component
const UploadForm = ({ files, onUpload }) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    category: 'greetings',
    name: '',
    description: ''
  });

  const categories = ['greetings', 'objections', 'closing', 'custom'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpload(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={`mt-4 p-4 rounded-lg ${
      isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
    }`}>
      <h4 className={`font-medium mb-3 ${
        isDarkMode ? 'text-blue-200' : 'text-blue-800'
      }`}>Upload Settings</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className={`w-full p-2 border rounded-md text-sm ${
              isDarkMode 
                ? 'border-gray-600 bg-gray-800 text-gray-200'
                : 'border-gray-300 bg-white text-gray-900'
            }`}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Name (optional)
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Custom name"
            className={`w-full p-2 border rounded-md text-sm ${
              isDarkMode 
                ? 'border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
        
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Description
          </label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Brief description"
            className={`w-full p-2 border rounded-md text-sm ${
              isDarkMode 
                ? 'border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-400'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <button
          type="submit"
          className={`px-6 py-2 text-white rounded-md transition-colors ${
            isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          Upload {files.length} File{files.length > 1 ? 's' : ''}
        </button>
      </div>
    </form>
  );
};

export default AudioUpload;