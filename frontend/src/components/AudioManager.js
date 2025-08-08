import React, { useState, useEffect } from 'react';
import AudioClipPlayer from './AudioClipPlayer';
import AudioUploader from './AudioUploader';
import AudioLibrary from './AudioLibrary';
import WaveformVisualizer from './WaveformVisualizer';
import AudioRecorder from './AudioRecorder';
import { useAudio } from '../hooks/useAudio';
import { audioService } from '../services';

// AudioManager Component - Comprehensive audio management interface
// Features: unified audio controls, component switching, state management
// Provides complete audio solution for the cold calling application

const AudioManager = ({ initialTab = 'player' }) => {
  // Tab management
  const [activeTab, setActiveTab] = useState(initialTab);
  const [audioClips, setAudioClips] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selected clip state
  const [selectedClip, setSelectedClip] = useState(null);
  const [selectedClipUrl, setSelectedClipUrl] = useState(null);
  
  // Audio player hook
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    progress,
    play,
    pause,
    stop,
    seek,
    setVolumeLevel,
    toggleMute,
    load: loadAudio
  } = useAudio();

  // Available tabs
  const tabs = [
    { id: 'player', label: 'Audio Player', icon: '🎵', component: 'player' },
    { id: 'library', label: 'Library', icon: '📚', component: 'library' },
    { id: 'upload', label: 'Upload', icon: '⬆️', component: 'upload' },
    { id: 'record', label: 'Record', icon: '🎤', component: 'record' },
    { id: 'visualizer', label: 'Visualizer', icon: '〰️', component: 'visualizer', disabled: !selectedClip }
  ];

  // Load audio library on mount
  useEffect(() => {
    loadAudioLibrary();
  }, []);

  // Load audio clips from API
  const loadAudioLibrary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await audioService.getAllAudioClips();
      
      if (response.success) {
        setAudioClips(response.data || {});
      } else {
        throw new Error(response.message || 'Failed to load library');
      }
      
    } catch (err) {
      console.error('❌ Failed to load audio library:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle clip selection
  const handleClipSelect = (clip) => {
    setSelectedClip(clip);
    
    // If we're in visualizer mode, also load the audio
    if (activeTab === 'visualizer') {
      loadClipForVisualization(clip);
    }
  };

  // Handle clip playback
  const handleClipPlay = async (clipId, clipName) => {
    try {
      // Get audio URL from service
      const response = await audioService.getAudioUrl(clipId);
      
      if (response.success) {
        const audioUrl = response.data.url;
        
        // Load and play audio
        loadAudio(audioUrl);
        setTimeout(() => play(), 100); // Small delay to ensure loading
        
        // Update selected clip
        const clip = findClipById(clipId);
        if (clip) {
          setSelectedClip(clip);
          setSelectedClipUrl(audioUrl);
        }
        
        console.log('▶️ Playing:', clipName);
        
      } else {
        throw new Error(response.message || 'Failed to get audio URL');
      }
      
    } catch (err) {
      console.error('❌ Failed to play clip:', err);
      setError(`Failed to play ${clipName}`);
    }
  };

  // Load clip for visualization
  const loadClipForVisualization = async (clip) => {
    try {
      const response = await audioService.getAudioUrl(clip.id);
      
      if (response.success) {
        setSelectedClipUrl(response.data.url);
        loadAudio(response.data.url);
      }
      
    } catch (err) {
      console.error('❌ Failed to load clip for visualization:', err);
    }
  };

  // Find clip by ID in all categories
  const findClipById = (clipId) => {
    for (const category of Object.values(audioClips)) {
      const clip = category.find(c => c.id === clipId);
      if (clip) return clip;
    }
    return null;
  };

  // Handle upload completion
  const handleUploadComplete = (uploadedClip) => {
    console.log('✅ Upload completed:', uploadedClip);
    
    // Reload library to include new clip
    loadAudioLibrary();
    
    // Switch to library tab to show the new clip
    setActiveTab('library');
  };

  // Handle recording completion
  const handleRecordingComplete = (recordedClip) => {
    console.log('✅ Recording completed:', recordedClip);
    
    // Reload library to include new recording
    loadAudioLibrary();
    
    // Switch to library tab to show the new recording
    setActiveTab('library');
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'player':
        return (
          <AudioClipPlayer 
            audioClips={audioClips}
            onClipPlay={handleClipPlay}
            playingClip={selectedClip?.id}
            isPlaying={isPlaying}
          />
        );
        
      case 'library':
        return (
          <AudioLibrary
            onClipSelect={handleClipSelect}
            onClipPlay={handleClipPlay}
            selectedClipId={selectedClip?.id}
          />
        );
        
      case 'upload':
        return (
          <AudioUploader 
            onUploadComplete={handleUploadComplete}
          />
        );
        
      case 'record':
        return (
          <AudioRecorder 
            onRecordingComplete={handleRecordingComplete}
          />
        );
        
      case 'visualizer':
        return (
          <div>
            {selectedClip ? (
              <div>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Now Visualizing: {selectedClip.name}
                  </h3>
                  <div className="text-sm text-gray-600">
                    Category: {selectedClip.category} | Duration: {selectedClip.duration}
                  </div>
                </div>
                
                <WaveformVisualizer
                  audioUrl={selectedClipUrl}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={seek}
                  height={150}
                />
                
                {/* Playback controls */}
                <div className="mt-6 flex items-center justify-center space-x-4">
                  <button
                    onClick={isPlaying ? pause : play}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                  </button>
                  
                  <button
                    onClick={stop}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    ⏹️ Stop
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleMute}
                      className="px-3 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {isMuted ? '🔇' : '🔊'}
                    </button>
                    
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                      className="w-24"
                    />
                    
                    <span className="text-sm text-gray-600 w-12">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎵</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Audio Selected</h3>
                <p className="text-gray-500 mb-4">
                  Select an audio clip from the Library or Player to visualize its waveform
                </p>
                <button
                  onClick={() => setActiveTab('library')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Library
                </button>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Audio Manager</h1>
        <p className="text-gray-600">
          Complete audio management for your cold calling scripts
        </p>
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-red-600 text-lg mr-2">⚠️</span>
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white shadow-md text-blue-600'
                  : tab.disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">🔄</div>
              <div className="text-gray-600">Loading audio components...</div>
            </div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>

      {/* Global Audio Controls (when clip is selected) */}
      {selectedClip && activeTab !== 'visualizer' && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-sm">
          <div className="text-sm font-medium text-gray-800 mb-2 truncate">
            Now Playing: {selectedClip.name}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={isPlaying ? pause : play}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            
            <button
              onClick={stop}
              className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
            >
              ⏹️
            </button>
            
            <div className="flex-1 text-xs text-gray-600">
              {Math.round(progress * 100)}%
            </div>
            
            <button
              onClick={() => setActiveTab('visualizer')}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
              title="View Waveform"
            >
              〰️
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioManager;