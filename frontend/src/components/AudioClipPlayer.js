import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../services';
import { audioManager } from '../services/WebAudioManager';
import { dummyAudioClips, dummyAudioClipsArray, convertAudioClipsToCategories } from '../data/dummyData';
import WaveformVisualizer from './WaveformVisualizer';
// Removed AudioUpload import as it's not used
import AudioLibrary from './AudioLibrary';
import AudioRecorder from './AudioRecorder';
import { useTheme } from '../contexts/ThemeContext';

// AudioClipPlayer Component - Enhanced with Web Audio API integration
// Features real-time waveform visualization, advanced audio controls,
// keyboard shortcuts, and comprehensive audio library management

const AudioClipPlayer = () => {
  const { isDarkMode, themeClasses } = useTheme();
  
  // API Integration State
  const [audioClips, setAudioClips] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  
  // Audio Player State
  const [playingClip, setPlayingClip] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('greetings');
  const [audioUrls, setAudioUrls] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Enhanced Audio State
  const [volume, setVolume] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [audioManagerReady, setAudioManagerReady] = useState(false);
  
  // Audio element reference for fallback playback
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  // Load audio clips and initialize audio manager on component mount
  useEffect(() => {
    loadAudioClips();
    initializeAudioManager();
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Cleanup Web Audio API resources
      audioManager.stopAllAudio();
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Initialize Web Audio API Manager
  const initializeAudioManager = async () => {
    try {
      const initialized = await audioManager.initialize();
      if (initialized) {
        audioManager.setVolume(volume);
        setAudioManagerReady(true);
        console.log('🎵 Web Audio API initialized');
      } else {
        console.warn('⚠️ Web Audio API not available, using fallback');
        setAudioManagerReady(false);
      }
    } catch (error) {
      console.error('❌ Failed to initialize AudioManager:', error);
      setAudioManagerReady(false);
    }
  };

  // Force add custom category for debugging
  const ensureCustomCategory = (categorizedData) => {
    if (!categorizedData['custom']) {
      console.log('⚠️ Custom category missing, adding default custom clips');
      categorizedData['custom'] = [
        { id: 'custom-1', name: 'Sample Custom Recording', duration: '0:30', category: 'custom' },
        { id: 'custom-2', name: 'My Test Recording', duration: '0:25', category: 'custom' }
      ];
    }
    return categorizedData;
  };

  const loadAudioClips = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading audio clips...');
      
      // First check localStorage for user recordings with detailed logging
      const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
      console.log('💾 Loading: Found', userRecordings.length, 'user recordings in localStorage');
      console.log('📝 User recordings details:', userRecordings.map(r => ({id: r.id, name: r.name, category: r.category})));
      
      const response = await audioService.getAllAudioClips();
      
      console.log('🔍 API Response Debug:', response);
      console.log('🔍 Response success:', response.success);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Is array:', Array.isArray(response.data));
      console.log('🔍 Data length:', response.data?.length || 0);
      
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        // Convert array to categories format that component expects
        const categorizedData = response.data.reduce((acc, clip) => {
          if (!acc[clip.category]) {
            acc[clip.category] = [];
          }
          acc[clip.category].push(clip);
          return acc;
        }, {});
        const finalData = ensureCustomCategory(categorizedData);
        setAudioClips(finalData);
        setApiConnected(true);
        console.log('✅ Audio clips loaded from API:', response.data.length, 'clips in', Object.keys(categorizedData).length, 'categories');
        console.log('📋 Categories found:', Object.keys(categorizedData));
        console.log('🎯 Custom category found:', categorizedData['custom'] ? 'YES' : 'NO');
      } else {
        // Fallback to default audio clips if API fails or returns empty data
        console.log('⚠️ API unavailable or empty, loading default audio clips');
        const defaultResponse = await audioService.getDefaultAudioClips();
        
        console.log('🔍 Default response:', defaultResponse);
        
        if (defaultResponse.success && Array.isArray(defaultResponse.data)) {
          // Load user recordings from localStorage with enhanced processing
          const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
          console.log('💾 Found user recordings in localStorage:', userRecordings.length);
          console.log('📝 User recordings content:', userRecordings);
          
          // Ensure user recordings have proper structure
          const processedUserRecordings = userRecordings.map(recording => ({
            ...recording,
            category: recording.category || 'custom',
            id: recording.id || Date.now() + Math.random()
          }));
          
          // Combine default clips with processed user recordings
          const allClips = [...defaultResponse.data, ...processedUserRecordings];
          
          // Convert array to categories (consistent with API success path)
          const categorizedData = convertAudioClipsToCategories(allClips);
          
          // Force custom category existence with user recordings
          if (processedUserRecordings.length > 0) {
            const customClips = processedUserRecordings.filter(r => r.category === 'custom');
            if (customClips.length > 0) {
              categorizedData['custom'] = customClips;
              console.log('🔧 Forced custom category with user recordings:', customClips.length);
            }
          }
          
          const finalData = ensureCustomCategory(categorizedData);
          setAudioClips(finalData);
          console.log('✅ Default + user clips loaded:', allClips.length, 'clips in', Object.keys(categorizedData).length, 'categories');
          console.log('📋 Categories from defaults + user:', Object.keys(categorizedData));
          console.log('🎯 Custom category found:', categorizedData['custom'] ? 'YES' : 'NO');
          if (categorizedData['custom']) {
            console.log('🎵 Custom clips:', categorizedData['custom']);
          }
        } else {
          // Use dummy data + user recordings in categorized format
          console.log('⚠️ Default service failed, using dummy data + user recordings');
          const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
          console.log('💾 Found user recordings in localStorage:', userRecordings.length);
          console.log('📝 User recordings content:', userRecordings);
          
          // Ensure user recordings have proper structure
          const processedUserRecordings = userRecordings.map(recording => ({
            ...recording,
            category: recording.category || 'custom',
            id: recording.id || Date.now() + Math.random()
          }));
          
          // Combine dummy data with processed user recordings
          const allClips = [...dummyAudioClipsArray, ...processedUserRecordings];
          
          const categorizedData = convertAudioClipsToCategories(allClips);
          
          // Force custom category existence with user recordings
          if (processedUserRecordings.length > 0) {
            const customClips = processedUserRecordings.filter(r => r.category === 'custom');
            if (customClips.length > 0) {
              categorizedData['custom'] = customClips;
              console.log('🔧 Forced custom category with user recordings:', customClips.length);
            }
          }
          
          const finalData = ensureCustomCategory(categorizedData);
          setAudioClips(finalData);
          console.log('✅ Dummy + user clips loaded:', allClips.length, 'clips in', Object.keys(categorizedData).length, 'categories');
          console.log('📋 Categories from dummy + user:', Object.keys(categorizedData));
          console.log('🎯 Custom category found:', categorizedData['custom'] ? 'YES' : 'NO');
          if (categorizedData['custom']) {
            console.log('🎵 Custom clips:', categorizedData['custom']);
          }
        }
        setApiConnected(false);
      }
    } catch (err) {
      console.error('❌ Failed to load audio clips:', err);
      setError('Failed to load audio clips from server');
      // Fallback to dummy data + user recordings in array format
      const userRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
      console.log('💾 Found user recordings in error fallback:', userRecordings.length);
      console.log('📝 User recordings content:', userRecordings);
      
      // Ensure user recordings have proper structure
      const processedUserRecordings = userRecordings.map(recording => ({
        ...recording,
        category: recording.category || 'custom',
        id: recording.id || Date.now() + Math.random()
      }));
      
      const allClips = [...dummyAudioClipsArray, ...processedUserRecordings];
      const categorizedData = convertAudioClipsToCategories(allClips);
      
      // Force custom category existence with user recordings
      if (processedUserRecordings.length > 0) {
        const customClips = processedUserRecordings.filter(r => r.category === 'custom');
        if (customClips.length > 0) {
          categorizedData['custom'] = customClips;
          console.log('🔧 Forced custom category with user recordings:', customClips.length);
        }
      }
      
      const finalData = ensureCustomCategory(categorizedData);
      setAudioClips(finalData);
      console.log('❌ Error fallback - using dummy + user clips:', allClips.length, 'clips in', Object.keys(categorizedData).length, 'categories');
      console.log('📋 Categories from error fallback:', Object.keys(categorizedData));
      console.log('🎯 Custom category found:', categorizedData['custom'] ? 'YES' : 'NO');
      if (categorizedData['custom']) {
        console.log('🎵 Custom clips:', categorizedData['custom']);
      }
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced function to handle audio clip playback with Web Audio API
  const handlePlayClip = async (clipId, clipName) => {
    try {
      if (playingClip === clipId && isPlaying) {
        // If the same clip is playing, stop it
        stopCurrentAudio();
        console.log('⏸️ Stopped:', clipName);
        return;
      }
      
      // Stop any currently playing audio
      stopCurrentAudio();
      
      setPlayingClip(clipId);
      setIsPlaying(true);
      setPlaybackProgress(0);
      
      if (apiConnected) {
        // Get audio URL from API
        let audioUrl = audioUrls[clipId];
        if (!audioUrl) {
          const response = await audioService.getAudioUrl(clipId);
          if (response.success) {
            audioUrl = response.data.url;
            setAudioUrls(prev => ({ ...prev, [clipId]: audioUrl }));
          } else {
            throw new Error('Failed to get audio URL');
          }
        }
        
        // Use Web Audio API if available, otherwise fallback to HTML5 Audio
        if (audioManagerReady) {
          await playWithWebAudio(audioUrl, clipId, clipName);
        } else {
          await playWithHTML5Audio(audioUrl, clipId, clipName);
        }
        
        // Record usage analytics
        audioService.recordAudioUsage(clipId, { 
          timestamp: new Date().toISOString(),
          volume: volume,
          playbackRate: playbackRate,
          webAudioAPI: audioManagerReady
        });
        
      } else {
        // Simulate playback for offline mode
        console.log('🔊 Simulating playback:', clipName);
        setTimeout(() => {
          setPlayingClip(null);
          setIsPlaying(false);
          setPlaybackProgress(0);
        }, 3000);
      }
      
    } catch (err) {
      console.error('❌ Failed to play audio:', err);
      setError(`Failed to play ${clipName}`);
      setPlayingClip(null);
      setIsPlaying(false);
      setPlaybackProgress(0);
    }
  };

  // Play audio using Web Audio API
  const playWithWebAudio = async (audioUrl, clipId, clipName) => {
    try {
      // Load audio file
      await audioManager.loadAudioFile(audioUrl, clipId.toString());
      
      // Play with advanced options
      await audioManager.playAudio(clipId.toString(), {
        volume: volume,
        playbackRate: playbackRate,
        fadeIn: 0.05,
        fadeOut: 0.05
      });
      
      // Start progress monitoring
      startProgressMonitoring(clipId);
      
      console.log('🎵 Playing with Web Audio API:', clipName, {
        volume: (volume * 100).toFixed(0) + '%',
        speed: playbackRate + 'x'
      });
      
    } catch (error) {
      console.error('❌ Web Audio API playback failed:', error);
      // Fallback to HTML5 Audio
      await playWithHTML5Audio(audioUrl, clipId, clipName);
    }
  };

  // Fallback to HTML5 Audio
  const playWithHTML5Audio = async (audioUrl, clipId, clipName) => {
    audioRef.current = new Audio(audioUrl);
    audioRef.current.volume = volume;
    audioRef.current.playbackRate = playbackRate;
    
    audioRef.current.onended = () => {
      setPlayingClip(null);
      setIsPlaying(false);
      setPlaybackProgress(0);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
    
    audioRef.current.onerror = () => {
      console.error('❌ HTML5 Audio playback failed');
      setError('Audio playback failed');
      setPlayingClip(null);
      setIsPlaying(false);
      setPlaybackProgress(0);
    };
    
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setPlaybackProgress(progress);
      }
    };
    
    await audioRef.current.play();
    console.log('🎵 Playing with HTML5 Audio:', clipName);
  };

  // Start progress monitoring for Web Audio API
  const startProgressMonitoring = (clipId) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(() => {
      const status = audioManager.getPlaybackStatus(clipId.toString());
      if (status) {
        setPlaybackProgress((status.progress || 0) * 100);
      } else {
        // Playback ended
        setPlayingClip(null);
        setIsPlaying(false);
        setPlaybackProgress(0);
        clearInterval(progressInterval.current);
      }
    }, 100);
  };

  // Stop current audio playback
  const stopCurrentAudio = () => {
    if (audioManagerReady && playingClip) {
      audioManager.stopAudio(playingClip.toString());
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    setPlayingClip(null);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioManagerReady) {
      audioManager.setVolume(newVolume);
    }
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (newRate) => {
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
    // Note: Web Audio API playback rate changes require restarting audio
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return; // Don't handle shortcuts when typing
      }
      
      switch (e.key) {
        case ' ': // Spacebar - play/pause
          e.preventDefault();
          if (isPlaying) {
            stopCurrentAudio();
          } else if (currentClips.length > 0) {
            handlePlayClip(currentClips[0].id, currentClips[0].name);
          }
          break;
        case 'ArrowUp': // Volume up
          e.preventDefault();
          handleVolumeChange(Math.min(1.0, volume + 0.1));
          break;
        case 'ArrowDown': // Volume down
          e.preventDefault();
          handleVolumeChange(Math.max(0.0, volume - 0.1));
          break;
        case 'Escape': // Stop
          e.preventDefault();
          stopCurrentAudio();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, volume, audioClips[selectedCategory]]);
  
  // Function to refresh audio clips
  const refreshAudioClips = () => {
    loadAudioClips();
  };
  
  // Debug function to add test recording
  const addTestRecording = () => {
    const testRecording = {
      id: 'test-' + Date.now(),
      name: 'Debug Test Recording',
      category: 'custom',
      duration: '0:15',
      description: 'A test recording for debugging',
      createdAt: new Date().toISOString()
    };
    
    const existingRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
    existingRecordings.push(testRecording);
    localStorage.setItem('userRecordings', JSON.stringify(existingRecordings));
    
    console.log('🗝 Added test recording:', testRecording);
    loadAudioClips();
    setSelectedCategory('custom');
  };

  // Debug function to log current component state
  const debugCurrentState = () => {
    console.group('🔍 AudioClipPlayer Debug State');
    console.log('📂 Selected Category:', selectedCategory);
    console.log('🎵 Audio Clips:', audioClips);
    console.log('🎯 Playing Clip:', playingClip);
    console.log('🎮 Is Playing:', isPlaying);
    console.log('📊 API Connected:', apiConnected);
    console.log('⏱️ Playback Progress:', playbackProgress);
    console.log('🔊 Volume:', volume);
    console.log('💾 LocalStorage userRecordings:', JSON.parse(localStorage.getItem('userRecordings') || '[]'));
    console.log('🎮 Audio Manager Ready:', audioManagerReady);
    console.log('📱 Show Recorder:', showRecorder);
    console.log('📚 Show Library:', showLibrary);
    console.log('📊 Show Visualizer:', showVisualizer);
    console.groupEnd();
  };

  // Get clips for the selected category
  const currentClips = audioClips[selectedCategory] || [];

  return (
    <div className="card max-w-md mx-2.5">
      <div className="text-center mb-4">
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-slate-800'}`}>Audio Clips</h2>
        {loading && (
          <div className="text-sm text-blue-600 mt-1">
            🔄 Loading audio clips...
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
            ⚠️ {error}
            <button 
              onClick={refreshAudioClips} 
              className="ml-2 text-blue-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          API: <span className={`font-semibold ${
            apiConnected ? 'text-green-600' : 'text-orange-600'
          }`}>
            {apiConnected ? '🟢 Connected' : '🟡 Offline'}
          </span>
          {audioManagerReady && (
            <span className="ml-2 text-blue-600">🎵 Web Audio</span>
          )}
        </div>
      </div>
      
      {/* Category tabs - Full width responsive layout */}
      <div className={`mb-5 border-b-2 pb-2.5 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <div className="flex flex-wrap gap-2">
          {Object.keys(audioClips).length > 0 ? Object.keys(audioClips).sort().map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setError(null);
              }}
              disabled={loading}
              className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-green-500 text-white font-bold shadow-md'
                  : isDarkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-gray-100' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800'
              }`}
              title={`Switch to ${category.charAt(0).toUpperCase() + category.slice(1)} category`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
              <span className={`ml-2 text-xs opacity-75`}>
                ({(audioClips[category] || []).length})
              </span>
            </button>
          )) : (
            <div className="w-full text-center text-gray-500 py-4">
              {loading ? '🔄 Loading categories...' : '🎧 No categories available'}
            </div>
          )}
        </div>
      </div>

      {/* Audio clips for selected category */}
      <div className="max-h-80 overflow-y-auto">
        {currentClips.length > 0 ? currentClips.map((clip) => (
          <div key={clip.id} className={`flex justify-between items-center p-3 mb-2 rounded-md border hover:shadow-md transition-shadow duration-200 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}>
            <div className="flex flex-col flex-1">
              <span className={`font-semibold text-sm ${isDarkMode ? 'text-gray-100' : 'text-slate-700'}`}>{clip.name}</span>
              <span className="text-xs text-gray-500 mt-0.5">{clip.duration}</span>
            </div>
            <button
              onClick={() => handlePlayClip(clip.id, clip.name)}
              disabled={loading}
              className={`px-4 py-2 text-white border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                playingClip === clip.id
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {playingClip === clip.id && isPlaying ? '⏸️ Stop' : '▶️ Play'}
            </button>
          </div>
        )) : (
          <div className="text-center text-gray-500 py-8">
            {loading ? (
              '🔄 Loading audio clips...'
            ) : (
              <div>
                🎧 No audio clips available in {selectedCategory}
                <button 
                  onClick={refreshAudioClips}
                  className="block mx-auto mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  🔄 Refresh
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Status indicator with progress */}
      {playingClip && isPlaying && (
        <div className={`mt-4 p-4 rounded-md border ${
          isDarkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className={`text-center text-sm font-medium mb-2 ${
            isDarkMode ? 'text-blue-200' : 'text-blue-700'
          }`}>
            🎵 {apiConnected ? 
              (audioManagerReady ? 'Playing with Web Audio API' : 'Playing with HTML5 Audio') : 
              'Simulating'} audio clip...
          </div>
          
          {/* Progress bar */}
          {playbackProgress > 0 && (
            <div className={`rounded-full h-2 mb-3 ${
              isDarkMode ? 'bg-blue-800' : 'bg-blue-200'
            }`}>
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${playbackProgress.toFixed(1)}%` }}
              />
            </div>
          )}
          
          {/* Audio controls */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <label className={`${
                isDarkMode ? 'text-blue-200' : 'text-blue-700'
              }`}>🔊</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className={`w-8 text-xs ${
                isDarkMode ? 'text-blue-300' : 'text-blue-600'
              }`}>{(volume * 100).toFixed(0)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className={`${
                isDarkMode ? 'text-blue-200' : 'text-blue-700'
              }`}>⚡</label>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                className={`border rounded px-1 py-0.5 text-xs ${
                  isDarkMode 
                    ? 'border-blue-600 bg-gray-800 text-gray-200'
                    : 'border-blue-300 bg-white text-gray-800'
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
            
            <button
              onClick={stopCurrentAudio}
              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
            >
              ⏹️ Stop
            </button>
          </div>
        </div>
      )}
      
      {/* Waveform Visualizer */}
      {showVisualizer && isPlaying && (
        <div className="mt-4 p-3 bg-gray-900 rounded-md">
          <WaveformVisualizer 
            width={400} 
            height={100} 
            type="both"
            animate={true}
            showGrid={false}
            className="mx-auto"
          />
        </div>
      )}

      {/* Enhanced Control buttons */}
      <div className="space-y-3 mt-4">
        {/* Primary controls */}
        <div className="flex gap-2">
          <button 
            onClick={refreshAudioClips}
            disabled={loading}
            className={`flex-1 px-3 py-2 disabled:opacity-50 rounded-md text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-blue-800 hover:bg-blue-700 text-blue-200' 
                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            }`}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button 
            onClick={addTestRecording}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isDarkMode 
                ? 'bg-green-800 hover:bg-green-700 text-green-200' 
                : 'bg-green-100 hover:bg-green-200 text-green-700'
            }`}
            title="Add test recording to debug"
          >
            🗝 Test
          </button>
          <button 
            onClick={debugCurrentState}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isDarkMode 
                ? 'bg-purple-800 hover:bg-purple-700 text-purple-200' 
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
            }`}
            title="Debug current audio clips state"
          >
            🔍 Debug
          </button>
          <button 
            onClick={() => setShowVisualizer(!showVisualizer)}
            disabled={!audioManagerReady}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
              showVisualizer 
                ? isDarkMode 
                  ? 'bg-green-800 text-green-200 hover:bg-green-700'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                : isDarkMode 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Visualizer
          </button>
        </div>
        
        {/* Secondary controls */}
        <div className="flex gap-2">
          <button 
            onClick={() => setShowLibrary(!showLibrary)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              showLibrary 
                ? isDarkMode 
                  ? 'bg-purple-800 text-purple-200 hover:bg-purple-700'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : isDarkMode 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📚 Library
          </button>
          <button 
            onClick={() => setShowRecorder(true)}
            disabled={!audioManagerReady || !audioManager.features.mediaRecorder}
            className={`flex-1 px-3 py-2 disabled:opacity-50 rounded-md text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-red-800 hover:bg-red-700 text-red-200' 
                : 'bg-red-100 hover:bg-red-200 text-red-700'
            }`}
            title={audioManagerReady ? 'Start audio recording' : 'Web Audio API required for recording'}
          >
            🎤 Record
          </button>
        </div>
      </div>
      
      {/* Enhanced Instructions and features info */}
      <div className="mt-4 space-y-3">
        <div className={`p-3 rounded-md text-sm leading-relaxed ${
          isDarkMode 
            ? 'bg-orange-900/30 text-orange-200'
            : 'bg-orange-50 text-gray-600'
        }`}>
          💡 <strong>Audio Controls:</strong>
          <div className="mt-1 text-xs space-y-1">
            <div>• <kbd className={`px-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>Space</kbd> - Play/Pause first clip</div>
            <div>• <kbd className={`px-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>↑/↓</kbd> - Volume control</div>
            <div>• <kbd className={`px-1 rounded ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>Esc</kbd> - Stop playback</div>
            {audioManagerReady && <div>• 📊 Real-time waveform visualization</div>}
            {!audioManagerReady && <div>• 🔄 HTML5 Audio fallback mode</div>}
          </div>
          {!apiConnected && (
            <div className={`mt-2 text-xs ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
              ⚠️ Offline mode - audio playback simulated
            </div>
          )}
        </div>
        
        {/* Feature status */}
        <div className={`p-3 rounded-md text-xs ${
          isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-600'
        }`}>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <span>Web Audio API:</span>
              <span className={audioManagerReady 
                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                : isDarkMode ? 'text-red-400' : 'text-red-600'
              }>
                {audioManagerReady ? '✅ Ready' : '❌ Not available'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Recording:</span>
              <span className={audioManager.features?.mediaRecorder 
                ? isDarkMode ? 'text-green-400' : 'text-green-600'
                : isDarkMode ? 'text-red-400' : 'text-red-600'
              }>
                {audioManager.features?.mediaRecorder ? '✅ Supported' : '❌ Not supported'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Audio Recorder Modal */}
      {showRecorder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>Audio Recorder</h3>
              <button
                onClick={() => setShowRecorder(false)}
                className={`transition-colors ${
                  isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ✖️
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <AudioRecorder 
                onRecordingComplete={async (recording) => {
                  console.log('🎤 Recording completed:', recording);
                  console.log('🔄 Starting recording completion workflow...');
                  
                  try {
                    // Ensure recording is saved to localStorage first
                    const existingRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
                    console.log('💾 Before save - existing recordings:', existingRecordings.length);
                    
                    // Add recording if not already present
                    const recordingExists = existingRecordings.some(r => r.id === recording.id);
                    if (!recordingExists) {
                      existingRecordings.push(recording);
                      localStorage.setItem('userRecordings', JSON.stringify(existingRecordings));
                      console.log('✅ Recording saved to localStorage');
                    }
                    
                    // Longer delay to ensure localStorage is fully committed
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Force refresh the audio clips with debug logging
                    console.log('🔄 Refreshing audio clips after recording...');
                    await loadAudioClips();
                    
                    // Wait a bit more before switching category
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Switch to custom category to show the new recording
                    console.log('📂 Switching to custom category...');
                    setSelectedCategory('custom');
                    
                    setShowRecorder(false);
                    
                    // Final verification
                    const updatedRecordings = JSON.parse(localStorage.getItem('userRecordings') || '[]');
                    console.log('💾 Final localStorage recordings:', updatedRecordings);
                    console.log('🎯 Custom category clips:', audioClips['custom'] || []);
                    
                    // Show success message
                    console.log('✅ Recording workflow completed successfully!');
                    
                  } catch (error) {
                    console.error('❌ Error in recording completion workflow:', error);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Full Audio Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>Audio Library</h3>
              <button
                onClick={() => setShowLibrary(false)}
                className={`text-xl transition-colors ${
                  isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                ✖️
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <AudioLibrary 
                embedded={true}
                showUpload={true}
                showVisualizer={true}
                onAudioSelect={(clip) => {
                  console.log('📚 Selected from library:', clip.name);
                  setShowLibrary(false);
                  handlePlayClip(clip.id, clip.name);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioClipPlayer;