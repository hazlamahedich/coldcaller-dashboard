/**
 * AudioLibrary Component
 * Comprehensive audio management interface with categories, tags, and search
 * Features upload, organization, playback controls, and metadata management
 */

import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../services';
import { audioManager } from '../services/AudioManager';
import AudioUpload from './AudioUpload';
import WaveformVisualizer from './WaveformVisualizer';

const AudioLibrary = ({ 
  onAudioSelect = () => {},
  embedded = false,
  showUpload = true,
  showVisualizer = true,
  className = '' 
}) => {
  // State management
  const [audioClips, setAudioClips] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  
  // UI state
  const [selectedCategory, setSelectedCategory] = useState('greetings');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'duration', 'date', 'usage'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Audio playback state
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState({});
  const [volume, setVolume] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  
  // Selection and management
  const [selectedClips, setSelectedClips] = useState(new Set());
  const [editingClip, setEditingClip] = useState(null);
  const [showMetadata, setShowMetadata] = useState(false);
  
  // Refs
  const playbackInterval = useRef(null);

  // Load audio clips on mount
  useEffect(() => {
    loadAudioLibrary();
    initializeAudioManager();
    
    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
      audioManager.stopAllAudio();
    };
  }, []);

  // Initialize audio manager
  const initializeAudioManager = async () => {
    try {
      const initialized = await audioManager.initialize();
      if (initialized) {
        audioManager.setVolume(volume);
        console.log('🎵 AudioManager initialized for library');
      }
    } catch (error) {
      console.error('❌ Failed to initialize AudioManager:', error);
    }
  };

  // Load audio clips from API
  const loadAudioLibrary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await audioService.getAllAudioClips();
      
      if (response.success && Object.keys(response.data).length > 0) {
        setAudioClips(response.data);
        setApiConnected(true);
        console.log('✅ Audio library loaded:', Object.keys(response.data).length, 'categories');
      } else {
        const defaultResponse = await audioService.getDefaultAudioClips();
        setAudioClips(defaultResponse.data || {});
        setApiConnected(false);
        console.log('⚠️ Using default audio library');
      }
    } catch (err) {
      console.error('❌ Failed to load audio library:', err);
      setError('Failed to load audio library');
      setAudioClips({});
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Play audio clip with advanced features
  const playAudioClip = async (clip) => {
    try {
      // Stop any currently playing audio
      if (currentlyPlaying) {
        audioManager.stopAudio(currentlyPlaying.id);
        setCurrentlyPlaying(null);
      }

      if (apiConnected) {
        // Get audio URL
        const urlResponse = await audioService.getAudioUrl(clip.id);
        if (!urlResponse.success) {
          throw new Error('Failed to get audio URL');
        }

        // Load and play with Web Audio API
        await audioManager.loadAudioFile(urlResponse.data.url, clip.id.toString());
        
        await audioManager.playAudio(clip.id.toString(), {
          volume: volume,
          playbackRate: playbackRate,
          fadeIn: 0.1,
          fadeOut: 0.1
        });

        setCurrentlyPlaying(clip);
        
        // Start playback monitoring
        startPlaybackMonitoring(clip);
        
        // Record usage
        audioService.recordAudioUsage(clip.id, {
          timestamp: new Date().toISOString(),
          volume: volume,
          playbackRate: playbackRate
        });
        
        console.log('▶️ Playing audio clip:', clip.name);
      } else {
        // Simulate playback for offline mode
        setCurrentlyPlaying(clip);
        setTimeout(() => {
          setCurrentlyPlaying(null);
        }, parseInt(clip.duration?.split(':')[1] || '5') * 1000);
        console.log('🔊 Simulating playback:', clip.name);
      }
      
      // Callback for external components
      onAudioSelect(clip);
      
    } catch (error) {
      console.error('❌ Failed to play audio clip:', error);
      setError(`Failed to play ${clip.name}`);
    }
  };

  // Stop audio playback
  const stopAudioClip = (clip) => {
    if (currentlyPlaying && currentlyPlaying.id === clip.id) {
      audioManager.stopAudio(clip.id.toString());
      setCurrentlyPlaying(null);
      setPlaybackStatus({});
      
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
      
      console.log('⏹️ Audio playback stopped:', clip.name);
    }
  };

  // Monitor playback progress
  const startPlaybackMonitoring = (clip) => {
    if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
    }
    
    playbackInterval.current = setInterval(() => {
      const status = audioManager.getPlaybackStatus(clip.id.toString());
      if (status) {
        setPlaybackStatus(status);
      } else {
        // Playback ended
        setCurrentlyPlaying(null);
        setPlaybackStatus({});
        clearInterval(playbackInterval.current);
      }
    }, 100);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    audioManager.setVolume(newVolume);
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (newRate) => {
    setPlaybackRate(newRate);
    // Note: Changing playback rate during playback requires restarting the audio
  };

  // Filter and sort clips
  const getFilteredClips = () => {
    let clips = audioClips[selectedCategory] || [];
    
    // Search filter
    if (searchTerm) {
      clips = clips.filter(clip => 
        clip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clip.description && clip.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Sort clips
    clips.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'duration':
          const aDuration = parseDuration(a.duration);
          const bDuration = parseDuration(b.duration);
          comparison = aDuration - bDuration;
          break;
        case 'date':
          const aDate = new Date(a.createdAt || 0);
          const bDate = new Date(b.createdAt || 0);
          comparison = aDate - bDate;
          break;
        case 'usage':
          comparison = (a.usageCount || 0) - (b.usageCount || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return clips;
  };

  // Parse duration string to seconds
  const parseDuration = (duration) => {
    if (!duration) return 0;
    const [minutes, seconds] = duration.split(':').map(Number);
    return (minutes * 60) + seconds;
  };

  // Handle clip selection for batch operations
  const toggleClipSelection = (clipId) => {
    const newSelection = new Set(selectedClips);
    if (newSelection.has(clipId)) {
      newSelection.delete(clipId);
    } else {
      newSelection.add(clipId);
    }
    setSelectedClips(newSelection);
  };

  // Delete selected clips
  const deleteSelectedClips = async () => {
    if (selectedClips.size === 0) return;
    
    try {
      for (const clipId of selectedClips) {
        await audioService.deleteAudioClip(clipId);
      }
      setSelectedClips(new Set());
      await loadAudioLibrary();
      console.log('🗑️ Deleted', selectedClips.size, 'clips');
    } catch (error) {
      console.error('❌ Failed to delete clips:', error);
      setError('Failed to delete selected clips');
    }
  };

  // Handle upload completion
  const handleUploadComplete = (result) => {
    console.log('✅ Upload completed:', result);
    setShowUploadModal(false);
    loadAudioLibrary(); // Refresh library
  };

  // Handle upload error
  const handleUploadError = (error) => {
    console.error('❌ Upload error:', error);
    setError('Upload failed: ' + error.message);
  };

  const filteredClips = getFilteredClips();
  const categories = Object.keys(audioClips);

  return (
    <div className={`audio-library ${embedded ? 'embedded' : 'standalone'} ${className}`}>
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            🎵 Audio Library
          </h2>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              apiConnected ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {apiConnected ? '🟢 Online' : '🟡 Offline'}
            </div>
            {showUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
              >
                📤 Upload
              </button>
            )}
          </div>
        </div>

        {/* Search and filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <input
              type="text"
              placeholder="Search audio clips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="name">Sort by Name</option>
              <option value="duration">Sort by Duration</option>
              <option value="date">Sort by Date</option>
              <option value="usage">Sort by Usage</option>
            </select>
          </div>
          <div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 px-3 py-2 text-sm rounded ${
                viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              🔲 Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 px-3 py-2 text-sm rounded ${
                viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              📃 List
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)} 
              ({(audioClips[category] || []).length})
            </button>
          ))}
        </div>
      </div>

      {/* Audio Controls */}
      {currentlyPlaying && (
        <div className="bg-blue-50 border-b p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-medium text-blue-800">
                🎵 Now Playing: {currentlyPlaying.name}
              </h3>
              <div className="text-sm text-blue-600">
                {playbackStatus.progress ? 
                  `${Math.floor(playbackStatus.elapsed)}s / ${Math.floor(playbackStatus.duration)}s` :
                  currentlyPlaying.duration
                }
              </div>
            </div>
            <button
              onClick={() => stopAudioClip(currentlyPlaying)}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
            >
              ⏹️ Stop
            </button>
          </div>
          
          {/* Progress bar */}
          {playbackStatus.progress && (
            <div className="bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${(playbackStatus.progress * 100).toFixed(1)}%` }}
              />
            </div>
          )}
          
          {/* Volume and speed controls */}
          <div className="flex gap-4 items-center text-sm">
            <div className="flex items-center gap-2">
              <label className="text-blue-700">🔊 Volume:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-blue-600 w-8">{(volume * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-blue-700">⚡ Speed:</label>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1.0">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2.0">2.0x</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Waveform Visualizer */}
      {showVisualizer && currentlyPlaying && (
        <div className="bg-gray-900 p-4">
          <WaveformVisualizer 
            width={800} 
            height={120} 
            type="both"
            animate={true}
            showGrid={true}
            className="mx-auto"
          />
        </div>
      )}

      {/* Batch selection controls */}
      {selectedClips.size > 0 && (
        <div className="bg-yellow-50 border-b p-4">
          <div className="flex items-center justify-between">
            <span className="text-yellow-800">
              {selectedClips.size} clip{selectedClips.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedClips(new Set())}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                Clear Selection
              </button>
              <button
                onClick={deleteSelectedClips}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                🗑️ Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio clips */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-blue-600">🔄 Loading audio library...</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">⚠️ {error}</div>
            <button
              onClick={loadAudioLibrary}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              🔄 Retry
            </button>
          </div>
        ) : filteredClips.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">
              {searchTerm ? 
                `No clips found matching "${searchTerm}"` : 
                `No clips in ${selectedCategory} category`
              }
            </div>
          </div>
        ) : (
          <div className={`${viewMode === 'grid' ? 
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 
            'space-y-2'
          }`}>
            {filteredClips.map((clip) => (
              <AudioClipCard
                key={clip.id}
                clip={clip}
                isPlaying={currentlyPlaying?.id === clip.id}
                isSelected={selectedClips.has(clip.id)}
                viewMode={viewMode}
                onPlay={() => playAudioClip(clip)}
                onStop={() => stopAudioClip(clip)}
                onSelect={() => toggleClipSelection(clip.id)}
                onEdit={() => setEditingClip(clip)}
                showMetadata={showMetadata}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Upload Audio Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✖️
                </button>
              </div>
              <AudioUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFileSize={50 * 1024 * 1024} // 50MB
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Audio clip card component
const AudioClipCard = ({ 
  clip, 
  isPlaying, 
  isSelected, 
  viewMode, 
  onPlay, 
  onStop, 
  onSelect, 
  onEdit,
  showMetadata 
}) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    return `${size.toFixed(1)} ${units[unit]}`;
  };

  if (viewMode === 'list') {
    return (
      <div className={`flex items-center p-3 border rounded-md ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
      } hover:shadow-md transition-shadow`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mr-3"
        />
        <div className="flex-1 grid grid-cols-4 gap-4 items-center">
          <div>
            <h4 className="font-medium text-gray-800">{clip.name}</h4>
            <p className="text-sm text-gray-500">{clip.category}</p>
          </div>
          <div className="text-sm text-gray-600">
            {clip.duration}
          </div>
          <div className="text-sm text-gray-600">
            {clip.createdAt ? new Date(clip.createdAt).toLocaleDateString() : 'Unknown'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={isPlaying ? onStop : onPlay}
              className={`px-3 py-1 text-white rounded text-sm ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isPlaying ? '⏹️ Stop' : '▶️ Play'}
            </button>
            <button
              onClick={onEdit}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${
      isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
    } hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1"
        />
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          isPlaying ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {isPlaying ? '🎵 Playing' : clip.category}
        </div>
      </div>
      
      <div className="mb-3">
        <h3 className="font-medium text-gray-800 mb-1">{clip.name}</h3>
        <div className="text-sm text-gray-600">
          <p>⏱️ {clip.duration}</p>
          {showMetadata && clip.metadata && (
            <>
              <p>📊 {formatFileSize(clip.metadata.size)}</p>
              <p>🎧 {clip.metadata.format}</p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={isPlaying ? onStop : onPlay}
          className={`flex-1 px-3 py-2 text-white rounded text-sm font-medium transition-colors ${
            isPlaying 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isPlaying ? '⏹️ Stop' : '▶️ Play'}
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
        >
          ✏️
        </button>
      </div>
    </div>
  );
};

export default AudioLibrary;