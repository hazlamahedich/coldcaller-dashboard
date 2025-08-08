import React, { useState, useRef } from 'react';
import { audioService } from '../services';

// AudioUploader Component - Professional audio file upload interface
// Features: drag & drop, file validation, upload progress, audio preview
// Supports multiple audio formats with real-time feedback

const AudioUploader = ({ onUploadComplete, allowedFormats = ['mp3', 'wav', 'ogg', 'm4a'] }) => {
  // Upload state management
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [audioMetadata, setAudioMetadata] = useState(null);
  
  // Form state for audio metadata
  const [audioName, setAudioName] = useState('');
  const [audioCategory, setAudioCategory] = useState('greetings');
  const [audioDescription, setAudioDescription] = useState('');
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // File validation function
  const validateFile = (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB limit
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedFormats.includes(fileExtension)) {
      throw new Error(`Unsupported format. Allowed: ${allowedFormats.join(', ')}`);
    }
    
    if (file.size > maxSize) {
      throw new Error('File size must be less than 50MB');
    }
    
    if (!file.type.startsWith('audio/')) {
      throw new Error('File must be an audio file');
    }
    
    return true;
  };

  // Extract audio metadata
  const extractMetadata = (file) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.onloadedmetadata = () => {
        const metadata = {
          duration: audio.duration,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        };
        URL.revokeObjectURL(url);
        resolve(metadata);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ size: file.size, type: file.type });
      };
      
      audio.src = url;
    });
  };

  // Handle file selection
  const handleFileSelect = async (file) => {
    try {
      setUploadError(null);
      validateFile(file);
      
      // Extract metadata and create preview
      const metadata = await extractMetadata(file);
      const preview = URL.createObjectURL(file);
      
      setUploadedFile(file);
      setPreviewUrl(preview);
      setAudioMetadata(metadata);
      setAudioName(file.name.replace(/\.[^/.]+$/, ''));
      
      console.log('✅ File selected:', file.name, metadata);
      
    } catch (error) {
      console.error('❌ File validation failed:', error);
      setUploadError(error.message);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current?.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // File input change handler
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Upload file to server
  const handleUpload = async () => {
    if (!uploadedFile) return;
    
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('audio', uploadedFile);
      formData.append('name', audioName);
      formData.append('category', audioCategory);
      formData.append('description', audioDescription);
      
      const response = await audioService.uploadAudioClip(
        formData,
        (progress) => setUploadProgress(progress)
      );
      
      if (response.success) {
        console.log('✅ Audio upload successful:', response.data);
        
        // Cleanup
        URL.revokeObjectURL(previewUrl);
        setUploadedFile(null);
        setPreviewUrl(null);
        setAudioMetadata(null);
        setAudioName('');
        setAudioDescription('');
        setUploadProgress(0);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Notify parent component
        if (onUploadComplete) {
          onUploadComplete(response.data);
        }
        
      } else {
        throw new Error(response.message || 'Upload failed');
      }
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setUploadError(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Clear selected file
  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setUploadedFile(null);
    setPreviewUrl(null);
    setAudioMetadata(null);
    setAudioName('');
    setAudioDescription('');
    setUploadError(null);
    setUploadProgress(0);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Audio Clip</h2>
        <p className="text-gray-600">
          Upload audio files for your call scripts. Supported formats: {allowedFormats.join(', ').toUpperCase()}
        </p>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 text-lg mr-2">⚠️</span>
            <span className="text-red-800 font-medium">{uploadError}</span>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : uploadedFile
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        {!uploadedFile ? (
          <div>
            <div className="text-6xl mb-4">
              {isDragging ? '📁' : '🎵'}
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {isDragging ? 'Drop your audio file here' : 'Drag & drop your audio file'}
            </h3>
            <p className="text-gray-500 mb-4">or</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={allowedFormats.map(format => `.${format}`).join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="text-left">
            {/* File Preview */}
            <div className="flex items-start space-x-4 mb-6">
              <div className="text-4xl">🎵</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-2">{uploadedFile.name}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>Size: {formatFileSize(uploadedFile.size)}</div>
                  <div>Type: {uploadedFile.type}</div>
                  {audioMetadata?.duration && (
                    <div>Duration: {formatDuration(audioMetadata.duration)}</div>
                  )}
                </div>
                
                {/* Audio Preview */}
                {previewUrl && (
                  <div className="mt-3">
                    <audio controls className="w-full" preload="metadata">
                      <source src={previewUrl} type={uploadedFile.type} />
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
              </div>
              <button
                onClick={clearSelection}
                disabled={isUploading}
                className="text-red-600 hover:text-red-700 disabled:opacity-50"
                title="Remove file"
              >
                ❌
              </button>
            </div>

            {/* Metadata Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clip Name *
                </label>
                <input
                  type="text"
                  value={audioName}
                  onChange={(e) => setAudioName(e.target.value)}
                  disabled={isUploading}
                  placeholder="Enter clip name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={audioCategory}
                  onChange={(e) => setAudioCategory(e.target.value)}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  required
                >
                  <option value="greetings">Greetings</option>
                  <option value="objections">Objections</option>
                  <option value="closing">Closing</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={audioDescription}
                onChange={(e) => setAudioDescription(e.target.value)}
                disabled={isUploading}
                placeholder="Optional description for this audio clip"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex space-x-3">
              <button
                onClick={handleUpload}
                disabled={isUploading || !audioName.trim()}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isUploading ? '⏳ Uploading...' : '⬆️ Upload Audio'}
              </button>
              <button
                onClick={clearSelection}
                disabled={isUploading}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-500 text-center">
        <p>Maximum file size: 50MB. Audio files will be processed and optimized for playback.</p>
      </div>
    </div>
  );
};

export default AudioUploader;