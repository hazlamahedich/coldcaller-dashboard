import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../services';
import { dummyAudioClips } from '../data/dummyData';

// AudioClipPlayer Component - This creates panels with buttons to play audio clips
// Organized by categories like greetings, objections, and closing
// Now integrated with backend API services for real audio playback

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
  
  // Audio element reference for actual playback
  const audioRef = useRef(null);

  // Load audio clips from API on component mount
  useEffect(() => {
    loadAudioClips();
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

  // Function to handle audio clip playback with real audio files
  const handlePlayClip = async (clipId, clipName) => {
    try {
      if (playingClip === clipId && isPlaying) {
        // If the same clip is playing, stop it
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setPlayingClip(null);
        setIsPlaying(false);
        console.log('⏸️ Stopped:', clipName);
        return;
      }
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      setPlayingClip(clipId);
      setIsPlaying(true);
      
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
        
        // Create and play audio element
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => {
          setPlayingClip(null);
          setIsPlaying(false);
        };
        audioRef.current.onerror = () => {
          console.error('❌ Audio playback failed');
          setError('Audio playback failed');
          setPlayingClip(null);
          setIsPlaying(false);
        };
        
        await audioRef.current.play();
        console.log('▶️ Playing:', clipName);
        
        // Record usage analytics
        audioService.recordAudioUsage(clipId, { timestamp: new Date().toISOString() });
        
      } else {
        // Simulate playback for offline mode
        console.log('🔊 Simulating playback:', clipName);
        setTimeout(() => {
          setPlayingClip(null);
          setIsPlaying(false);
        }, 3000);
      }
      
    } catch (err) {
      console.error('❌ Failed to play audio:', err);
      setError(`Failed to play ${clipName}`);
      setPlayingClip(null);
      setIsPlaying(false);
    }
  };
  
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

      {/* Status indicator */}
      {playingClip && isPlaying && (
        <div className="text-center mt-4 p-3 bg-blue-50 rounded-md text-blue-700 text-sm font-medium">
          🎵 {apiConnected ? 'Playing' : 'Simulating'} audio clip...
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-3 mt-4">
        <button 
          onClick={refreshAudioClips}
          disabled={loading}
          className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 text-blue-700 rounded-md text-sm font-medium transition-colors"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
        <button 
          onClick={() => console.log('🎤 Recording feature coming soon!')}
          disabled={!apiConnected}
          className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 rounded-md text-sm font-medium transition-colors"
        >
          🎤 Record New
        </button>
      </div>
      
      {/* Instructions for user */}
      <div className="mt-4 p-3 bg-orange-50 rounded-md text-sm text-gray-600 leading-relaxed">
        💡 Tip: Click on clips to {apiConnected ? 'play' : 'simulate'} during your call.
        {!apiConnected && (
          <div className="mt-1 text-xs text-orange-700">
            ⚠️ Offline mode - audio playback simulated
          </div>
        )}
      </div>
    </div>
  );
};


export default AudioClipPlayer;