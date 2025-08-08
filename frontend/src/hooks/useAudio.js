import { useState, useRef, useEffect, useCallback } from 'react';

// useAudio Hook - Professional audio playback management
// Features: advanced playback controls, event handling, error management
// Provides consistent audio interface across all components

export const useAudio = (initialUrl = null) => {
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [buffered, setBuffered] = useState(0);
  
  // Audio element reference
  const audioRef = useRef(null);
  const urlRef = useRef(initialUrl);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('loadstart', handleLoadStart);
      audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.removeEventListener('canplay', handleCanPlay);
      audioRef.current.removeEventListener('play', handlePlay);
      audioRef.current.removeEventListener('pause', handlePause);
      audioRef.current.removeEventListener('ended', handleEnded);
      audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.removeEventListener('error', handleError);
      audioRef.current.removeEventListener('progress', handleProgress);
      audioRef.current.removeEventListener('waiting', handleWaiting);
      audioRef.current.removeEventListener('playing', handlePlaying);
      audioRef.current = null;
    }
  }, []);

  // Event handlers
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setIsPaused(false);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleError = useCallback((e) => {
    const audio = audioRef.current;
    if (audio && audio.error) {
      const errorMessages = {
        1: 'Audio loading was aborted',
        2: 'Network error while loading audio',
        3: 'Audio decoding failed',
        4: 'Audio format not supported'
      };
      setError(errorMessages[audio.error.code] || 'Unknown audio error');
    }
    setIsLoading(false);
    setIsPlaying(false);
  }, []);

  const handleProgress = useCallback(() => {
    if (audioRef.current && audioRef.current.buffered.length > 0) {
      const bufferedEnd = audioRef.current.buffered.end(0);
      const duration = audioRef.current.duration;
      if (duration > 0) {
        setBuffered(bufferedEnd / duration);
      }
    }
  }, []);

  const handleWaiting = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handlePlaying = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Create and setup audio element
  const setupAudio = useCallback((url) => {
    cleanup();
    
    if (!url) return;
    
    audioRef.current = new Audio(url);
    audioRef.current.preload = 'metadata';
    audioRef.current.volume = isMuted ? 0 : volume;
    audioRef.current.playbackRate = playbackRate;
    
    // Add event listeners
    audioRef.current.addEventListener('loadstart', handleLoadStart);
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioRef.current.addEventListener('canplay', handleCanPlay);
    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('pause', handlePause);
    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('error', handleError);
    audioRef.current.addEventListener('progress', handleProgress);
    audioRef.current.addEventListener('waiting', handleWaiting);
    audioRef.current.addEventListener('playing', handlePlaying);
    
    urlRef.current = url;
  }, [volume, playbackRate, isMuted, cleanup, handleLoadStart, handleLoadedMetadata, 
      handleCanPlay, handlePlay, handlePause, handleEnded, handleTimeUpdate, 
      handleError, handleProgress, handleWaiting, handlePlaying]);

  // Load new audio URL
  const load = useCallback((url) => {
    setupAudio(url);
  }, [setupAudio]);

  // Play audio
  const play = useCallback(async () => {
    if (!audioRef.current) return;
    
    try {
      await audioRef.current.play();
    } catch (err) {
      console.error('❌ Failed to play audio:', err);
      setError('Playback failed: ' + err.message);
    }
  }, []);

  // Pause audio
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Stop audio (pause and reset)
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Seek to specific time
  const seek = useCallback((time) => {
    if (audioRef.current && !isNaN(time)) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
    }
  }, [duration]);

  // Set volume (0-1)
  const setVolumeLevel = useCallback((level) => {
    const newVolume = Math.max(0, Math.min(1, level));
    setVolume(newVolume);
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = newVolume;
    }
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  // Set playback rate
  const setPlaybackSpeed = useCallback((rate) => {
    const newRate = Math.max(0.5, Math.min(3, rate));
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  }, []);

  // Get current progress (0-1)
  const progress = duration > 0 ? currentTime / duration : 0;

  // Initialize with initial URL
  useEffect(() => {
    if (initialUrl) {
      setupAudio(initialUrl);
    }
    
    return cleanup;
  }, [initialUrl, setupAudio, cleanup]);

  // Update audio properties when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackRate;
    }
  }, [volume, playbackRate, isMuted]);

  return {
    // State
    isPlaying,
    isPaused,
    isLoading,
    currentTime,
    duration,
    volume,
    playbackRate,
    isMuted,
    error,
    buffered,
    progress,
    
    // Actions
    load,
    play,
    pause,
    stop,
    seek,
    setVolumeLevel,
    toggleMute,
    setPlaybackSpeed,
    
    // Utilities
    audioRef,
    currentUrl: urlRef.current
  };
};

export default useAudio;