import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../services';
import { audioManager } from '../services/AudioManager';
import { dummyAudioClips } from '../data/dummyData';
import WaveformVisualizer from './WaveformVisualizer';
import AudioUpload from './AudioUpload';
import AudioLibrary from './AudioLibrary';

// AudioClipPlayer Component - Enhanced with Web Audio API integration
// Features real-time waveform visualization, advanced audio controls,
// keyboard shortcuts, and comprehensive audio library management

const AudioClipPlayer = () => {
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

  const loadAudioClips = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await audioService.getAllAudioClips();
      
      if (response.success && Object.keys(response.data).length > 0) {
        setAudioClips(response.data);
        setApiConnected(true);
        console.log('✅ Audio clips loaded from API:', Object.keys(response.data).length, 'categories');
      } else {
        // Fallback to default audio clips if API fails
        console.log('⚠️ API unavailable, loading default audio clips');
        const defaultResponse = await audioService.getDefaultAudioClips();
        setAudioClips(defaultResponse.data || dummyAudioClips);
        setApiConnected(false);
      }
    } catch (err) {
      console.error('❌ Failed to load audio clips:', err);
      setError('Failed to load audio clips from server');
      // Fallback to dummy data
      setAudioClips(dummyAudioClips);
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

  // Get clips for the selected category
  const currentClips = audioClips[selectedCategory] || [];

  return (
    <div className="card max-w-md mx-2.5">
      <div className="text-center mb-4">
        <h2 className="text-slate-800 text-lg font-semibold">Audio Clips</h2>
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
      
      {/* Category tabs */}
      <div className="flex gap-1 mb-5 border-b-2 border-gray-200 pb-2.5">
        {Object.keys(audioClips).length > 0 ? Object.keys(audioClips).map((category) => (
          <button
            key={category}
            onClick={() => {
              setSelectedCategory(category);
              setError(null);
            }}
            disabled={loading}
            className={`px-4 py-2 text-sm rounded-t-md transition-all duration-300 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedCategory === category
                ? 'bg-green-500 text-white font-bold'
                : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        )) : (
          <div className="text-center text-gray-500 py-2">
            {loading ? '🔄 Loading...' : '🎧 No categories available'}
          </div>
        )}
      </div>

      {/* Audio clips for selected category */}
      <div className="max-h-80 overflow-y-auto">
        {currentClips.length > 0 ? currentClips.map((clip) => (
          <div key={clip.id} className="flex justify-between items-center p-3 mb-2 bg-white rounded-md border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-sm text-slate-700">{clip.name}</span>
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
        <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
          <div className="text-center text-blue-700 text-sm font-medium mb-2">
            🎵 {apiConnected ? 
              (audioManagerReady ? 'Playing with Web Audio API' : 'Playing with HTML5 Audio') : 
              'Simulating'} audio clip...
          </div>
          
          {/* Progress bar */}
          {playbackProgress > 0 && (
            <div className="bg-blue-200 rounded-full h-2 mb-3">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${playbackProgress.toFixed(1)}%` }}
              />
            </div>
          )}
          
          {/* Audio controls */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <label className="text-blue-700">🔊</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-blue-600 w-8 text-xs">{(volume * 100).toFixed(0)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-blue-700">⚡</label>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white"
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
            className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 text-blue-700 rounded-md text-sm font-medium transition-colors"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <button 
            onClick={() => setShowVisualizer(!showVisualizer)}
            disabled={!audioManagerReady}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              showVisualizer 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
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
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📚 Library
          </button>
          <button 
            onClick={() => console.log('🎤 Recording feature - opening modal soon!')}
            disabled={!audioManagerReady || !audioManager.features.mediaRecorder}
            className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 rounded-md text-sm font-medium transition-colors"
            title={audioManagerReady ? 'Start audio recording' : 'Web Audio API required for recording'}
          >
            🎤 Record
          </button>
        </div>
      </div>
      
      {/* Enhanced Instructions and features info */}
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-orange-50 rounded-md text-sm text-gray-600 leading-relaxed">
          💡 <strong>Audio Controls:</strong>
          <div className="mt-1 text-xs space-y-1">
            <div>• <kbd className="bg-gray-200 px-1 rounded">Space</kbd> - Play/Pause first clip</div>
            <div>• <kbd className="bg-gray-200 px-1 rounded">↑/↓</kbd> - Volume control</div>
            <div>• <kbd className="bg-gray-200 px-1 rounded">Esc</kbd> - Stop playback</div>
            {audioManagerReady && <div>• 📊 Real-time waveform visualization</div>}
            {!audioManagerReady && <div>• 🔄 HTML5 Audio fallback mode</div>}
          </div>
          {!apiConnected && (
            <div className="mt-2 text-xs text-orange-700">
              ⚠️ Offline mode - audio playback simulated
            </div>
          )}
        </div>
        
        {/* Feature status */}
        <div className="p-3 bg-gray-50 rounded-md text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <span>Web Audio API:</span>
              <span className={audioManagerReady ? 'text-green-600' : 'text-red-600'}>
                {audioManagerReady ? '✅ Ready' : '❌ Not available'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Recording:</span>
              <span className={audioManager.features?.mediaRecorder ? 'text-green-600' : 'text-red-600'}>
                {audioManager.features?.mediaRecorder ? '✅ Supported' : '❌ Not supported'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Full Audio Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold">Audio Library</h3>
              <button
                onClick={() => setShowLibrary(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
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