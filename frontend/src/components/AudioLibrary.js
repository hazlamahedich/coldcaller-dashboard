/**
 * AudioLibrary Component
 * Comprehensive audio management interface with categories, tags, and search
 * Features upload, organization, playback controls, and metadata management
 */

import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../services';
import { audioManager } from '../services/WebAudioManager';
import { useTheme } from '../contexts/ThemeContext';
import AudioUpload from './AudioUpload';
import WaveformVisualizer from './WaveformVisualizer';

const AudioLibrary = ({ 
  onAudioSelect = () => {},
  embedded = false,
  showUpload = true,
  showVisualizer = true,
  className = '' 
}) => {
  const { isDarkMode, themeClasses } = useTheme();
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
      
      console.log('🔄 Loading audio library...');
      const response = await audioService.getAllAudioClips();
      
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        // Convert array to categories format
        const categorizedData = response.data.reduce((acc, clip) => {
          if (!acc[clip.category]) {
            acc[clip.category] = [];
          }
          acc[clip.category].push(clip);
          return acc;
        }, {});
        
        setAudioClips(categorizedData);
        setApiConnected(true);
        console.log('✅ Audio library loaded:', response.data.length, 'clips in', Object.keys(categorizedData).length, 'categories');
      } else if (response.success && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
        // Already categorized format
        setAudioClips(response.data);
        setApiConnected(true);
        console.log('✅ Audio library loaded:', Object.keys(response.data).length, 'categories');
      } else {
        // Fallback to default audio clips
        console.log('⚠️ API response empty or invalid, using defaults');
        const defaultResponse = await audioService.getDefaultAudioClips();
        
        if (defaultResponse.success && Array.isArray(defaultResponse.data)) {
          // Convert array to categories
          const categorizedData = defaultResponse.data.reduce((acc, clip) => {
            if (!acc[clip.category]) {
              acc[clip.category] = [];
            }
            acc[clip.category].push(clip);
            return acc;
          }, {});
          
          setAudioClips(categorizedData);
          console.log('✅ Default audio library loaded:', defaultResponse.data.length, 'clips in', Object.keys(categorizedData).length, 'categories');
        } else {
          setAudioClips({});
        }
        setApiConnected(false);
      }
      
    } catch (err) {
      console.error('❌ Failed to load audio library:', err);
      setError('Failed to load audio library');
      setAudioClips({});
      setApiConnected(false);
    }
    
    // ALWAYS load user recordings from localStorage regardless of API status
    try {
      const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
      console.log('📱 Loading user recordings from localStorage:', userRecordings.length);
      
      if (userRecordings.length > 0) {
        setAudioClips(prevClips => {
          const updatedClips = { ...prevClips };
          
          // Add user recordings to their respective categories
          userRecordings.forEach(recording => {
            const category = recording.category || 'custom';
            if (!updatedClips[category]) {
              updatedClips[category] = [];
            }
            
            // Check if recording already exists (avoid duplicates)
            const exists = updatedClips[category].some(clip => clip.id === recording.id);
            if (!exists) {
              updatedClips[category].push(recording);
            }
          });
          
          console.log('✅ User recordings integrated. Total categories:', Object.keys(updatedClips).length);
          console.log('📂 Available categories:', Object.keys(updatedClips));
          return updatedClips;
        });
      }
    } catch (error) {
      console.error('❌ Failed to load user recordings from localStorage:', error);
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

      console.log('🎵 Attempting to play clip:', clip.name, 'ID:', clip.id, 'API Connected:', apiConnected);

      // Check if this is a localStorage recording (these can't be played back)
      const isLocalStorageRecording = typeof clip.id === 'number' || clip.id?.toString().startsWith('test-');
      
      if (isLocalStorageRecording) {
        // Show info message for localStorage recordings
        console.log('ℹ️ This is a localStorage recording - no audio data available for playback');
        setError(`"${clip.name}" is a local recording without audio data. Only uploaded clips can be played.`);
        
        // Clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
        return;
      }

      if (apiConnected) {
        // Try to get audio URL from API
        console.log('🌐 Fetching audio URL for clip ID:', clip.id);
        const urlResponse = await audioService.getAudioUrl(clip.id);
        
        if (!urlResponse.success) {
          throw new Error(`Failed to get audio URL: ${urlResponse.message || 'Unknown error'}`);
        }

        console.log('✅ Audio URL obtained:', urlResponse.data.url);
        
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
        try {
          await audioService.recordAudioUsage(clip.id, {
            timestamp: new Date().toISOString(),
            volume: volume,
            playbackRate: playbackRate
          });
        } catch (usageError) {
          console.warn('⚠️ Failed to record usage:', usageError);
        }
        
        console.log('▶️ Successfully playing audio clip:', clip.name);
      } else {
        // API not connected - simulate playback for demonstration
        console.log('🔌 API not connected, simulating playback for:', clip.name);
        setCurrentlyPlaying(clip);
        
        // Calculate duration from string (e.g., "1:30" = 90 seconds)
        let durationMs = 5000; // default 5 seconds
        if (clip.duration && typeof clip.duration === 'string') {
          const parts = clip.duration.split(':');
          if (parts.length === 2) {
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseInt(parts[1]) || 0;
            durationMs = (minutes * 60 + seconds) * 1000;
          }
        }
        
        setTimeout(() => {
          if (currentlyPlaying && currentlyPlaying.id === clip.id) {
            setCurrentlyPlaying(null);
          }
        }, durationMs);
        
        console.log('🔊 Simulating playback for', durationMs / 1000, 'seconds');
      }
      
      // Callback for external components
      onAudioSelect(clip);
      
    } catch (error) {
      console.error('❌ Failed to play audio clip:', error);
      setError(`Failed to play "${clip.name}": ${error.message}`);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
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
      <div className={`border-b p-4 ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${
            isDarkMode ? 'text-gray-100' : 'text-gray-800'
          }`}>
            🎵 Audio Library
          </h2>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              apiConnected 
                ? isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
                : isDarkMode ? 'bg-orange-800 text-orange-200' : 'bg-orange-100 text-orange-700'
            }`}>
              {apiConnected ? '🟢 Online' : '🟡 Offline'}
            </div>
            {showUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className={`px-4 py-2 text-white rounded-md text-sm transition-colors ${
                  isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'
                }`}
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
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-800 text-gray-100'
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
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
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-800 text-gray-100'
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-500 text-white' 
                  : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              🔲 Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-500 text-white' 
                  : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
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
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
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
        <div className={`border-b p-4 ${
          isDarkMode ? 'bg-blue-900/30 border-gray-700' : 'bg-blue-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className={`font-medium ${
                isDarkMode ? 'text-blue-200' : 'text-blue-800'
              }`}>
                🎵 Now Playing: {currentlyPlaying.name}
              </h3>
              <div className={`text-sm ${
                isDarkMode ? 'text-blue-300' : 'text-blue-600'
              }`}>
                {playbackStatus.progress ? 
                  `${Math.floor(playbackStatus.elapsed)}s / ${Math.floor(playbackStatus.duration)}s` :
                  currentlyPlaying.duration
                }
              </div>
            </div>
            <button
              onClick={() => stopAudioClip(currentlyPlaying)}
              className={`px-4 py-2 text-white rounded-md text-sm transition-colors ${
                isDarkMode ? 'bg-red-600 hover:bg-red-500' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              ⏹️ Stop
            </button>
          </div>
          
          {/* Progress bar */}
          {playbackStatus.progress && (
            <div className={`rounded-full h-2 mb-3 ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${(playbackStatus.progress * 100).toFixed(1)}%` }}
              />
            </div>
          )}
          
          {/* Volume and speed controls */}
          <div className="flex gap-4 items-center text-sm">
            <div className="flex items-center gap-2">
              <label className={`${
                isDarkMode ? 'text-blue-200' : 'text-blue-700'
              }`}>🔊 Volume:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className={`w-8 ${
                isDarkMode ? 'text-blue-300' : 'text-blue-600'
              }`}>{(volume * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className={`${
                isDarkMode ? 'text-blue-200' : 'text-blue-700'
              }`}>⚡ Speed:</label>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                className={`border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-800 text-gray-100'
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
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
        <div className={`p-4 ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-900'
        }`}>
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
        <div className={`border-b p-4 ${
          isDarkMode ? 'bg-yellow-900/20 border-gray-700' : 'bg-yellow-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`${
              isDarkMode ? 'text-yellow-200' : 'text-yellow-800'
            }`}>
              {selectedClips.size} clip{selectedClips.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedClips(new Set())}
                className={`px-3 py-1 text-white rounded text-sm transition-colors ${
                  isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600'
                }`}
              >
                Clear Selection
              </button>
              <button
                onClick={deleteSelectedClips}
                className={`px-3 py-1 text-white rounded text-sm transition-colors ${
                  isDarkMode ? 'bg-red-600 hover:bg-red-500' : 'bg-red-500 hover:bg-red-600'
                }`}
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
            <div className="text-4xl mb-4">🔄</div>
            <div className={`text-lg font-medium ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>Loading audio library...</div>
            <div className={`text-sm mt-2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>Please wait while we load your audio clips</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className={`text-lg font-semibold mb-2 ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`}>Error Loading Audio Library</h3>
            <p className={`mb-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={loadAudioLibrary}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                🔄 Retry
              </button>
              {showUpload && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className={`px-4 py-2 text-white rounded-md transition-colors ${
                    isDarkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  📤 Upload
                </button>
              )}
            </div>
          </div>
        ) : filteredClips.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className={`text-lg font-semibold mb-2 ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>No audio clips found</h3>
            <p className={`mb-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {searchTerm ? 
                `No clips found matching "${searchTerm}"` : 
                `No clips in ${selectedCategory} category`
              }
            </p>
            {showUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                📤 Upload Audio
              </button>
            )}
          </div>
        ) : (
          <div className={`${viewMode === 'grid' ? 
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 
            'space-y-2'
          }`}>
            {filteredClips.map((clip) => {
              const isLocalStorageRecording = typeof clip.id === 'number' || clip.id?.toString().startsWith('test-');
              return (
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
                  isPlayable={!isLocalStorageRecording}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>Upload Audio Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className={`transition-colors ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                  }`}
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
  showMetadata,
  isPlayable = true 
}) => {
  const { isDarkMode } = useTheme();
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
      <div className={`flex items-center p-3 border rounded-md hover:shadow-md transition-shadow ${
        isSelected 
          ? isDarkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-300'
          : isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mr-3"
        />
        <div className="flex-1 grid grid-cols-4 gap-4 items-center">
          <div>
            <h4 className={`font-medium ${
              isDarkMode ? 'text-gray-100' : 'text-gray-800'
            }`}>{clip.name}</h4>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>{clip.category}</p>
          </div>
          <div className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {clip.duration}
          </div>
          <div className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {clip.createdAt ? new Date(clip.createdAt).toLocaleDateString() : 'Unknown'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={isPlaying ? onStop : onPlay}
              disabled={!isPlayable && !isPlaying}
              className={`px-3 py-1 text-white rounded text-sm transition-colors ${
                !isPlayable && !isPlaying
                  ? isDarkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : isPlaying 
                    ? isDarkMode ? 'bg-red-600 hover:bg-red-500' : 'bg-red-500 hover:bg-red-600'
                    : isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'
              }`}
              title={!isPlayable ? 'Local recordings cannot be played back' : ''}
            >
              {isPlaying ? '⏹️ Stop' : !isPlayable ? '🔒 Local' : '▶️ Play'}
            </button>
            <button
              onClick={onEdit}
              className={`px-3 py-1 text-white rounded text-sm transition-colors ${
                isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              ✏️
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
      isSelected 
        ? isDarkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-300'
        : isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1"
        />
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          isPlaying 
            ? isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'
            : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}>
          {isPlaying ? '🎵 Playing' : clip.category}
        </div>
      </div>
      
      <div className="mb-3">
        <h3 className={`font-medium mb-1 ${
          isDarkMode ? 'text-gray-100' : 'text-gray-800'
        }`}>{clip.name}</h3>
        <div className={`text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
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
          disabled={!isPlayable && !isPlaying}
          className={`flex-1 px-3 py-2 text-white rounded text-sm font-medium transition-colors ${
            !isPlayable && !isPlaying
              ? isDarkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : isPlaying 
                ? isDarkMode ? 'bg-red-600 hover:bg-red-500' : 'bg-red-500 hover:bg-red-600'
                : isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'
          }`}
          title={!isPlayable ? 'Local recordings cannot be played back' : ''}
        >
          {isPlaying ? '⏹️ Stop' : !isPlayable ? '🔒 Local Only' : '▶️ Play'}
        </button>
        <button
          onClick={onEdit}
          className={`px-3 py-2 text-white rounded text-sm transition-colors ${
            isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          ✏️
        </button>
      </div>
    </div>
  );
};

export default AudioLibrary;