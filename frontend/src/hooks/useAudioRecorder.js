/**
 * useAudioRecorder Hook
 * Custom React hook for audio recording with Web Audio API
 * Provides recording functionality with real-time monitoring
 */

import { useState, useRef, useCallback } from 'react';
import { audioManager } from '../services/AudioManager';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  
  const timeInterval = useRef(null);
  const startTime = useRef(null);

  // Start recording
  const startRecording = useCallback(async (options = {}) => {
    try {
      setError(null);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioURL(null);

      // Initialize audio manager if needed
      if (!audioManager.isInitialized) {
        const initialized = await audioManager.initialize();
        if (!initialized) {
          throw new Error('AudioManager initialization failed');
        }
      }

      // Check if recording is supported
      if (!audioManager.features.mediaRecorder) {
        throw new Error('Audio recording not supported in this browser');
      }

      // Start recording with AudioManager
      const started = await audioManager.startRecording({
        mimeType: options.mimeType || 'audio/webm',
        audioBitsPerSecond: options.audioBitsPerSecond || 128000,
        ...options
      });

      if (!started) {
        throw new Error('Failed to start recording');
      }

      setIsRecording(true);
      startTime.current = Date.now();

      // Start timer
      timeInterval.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime.current) / 1000));
      }, 1000);

      console.log('🎤 Recording started');

    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      setError(err.message || 'Failed to start recording');
      setIsRecording(false);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      if (!isRecording) {
        return null;
      }

      // Clear timer
      if (timeInterval.current) {
        clearInterval(timeInterval.current);
        timeInterval.current = null;
      }

      // Stop recording with AudioManager
      const blob = await audioManager.stopRecording();
      
      if (blob) {
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        console.log('🎤 Recording completed:', {
          size: blob.size,
          type: blob.type,
          duration: recordingTime + 's'
        });
      }

      setIsRecording(false);
      return blob;

    } catch (err) {
      console.error('❌ Failed to stop recording:', err);
      setError(err.message || 'Failed to stop recording');
      setIsRecording(false);
      return null;
    }
  }, [isRecording, recordingTime]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (timeInterval.current) {
      clearInterval(timeInterval.current);
      timeInterval.current = null;
    }

    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
    }

    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setError(null);

    // Try to stop recording if active
    try {
      if (audioManager.isRecording) {
        audioManager.stopRecording();
      }
    } catch (err) {
      console.warn('Warning during recording cancellation:', err);
    }

    console.log('🎤 Recording cancelled');
  }, [audioURL]);

  // Clear recorded audio
  const clearRecording = useCallback(() => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    
    setAudioBlob(null);
    setAudioURL(null);
    setRecordingTime(0);
    setError(null);
    
    console.log('🎤 Recording cleared');
  }, [audioURL]);

  // Get recording duration in formatted string
  const getFormattedDuration = useCallback(() => {
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [recordingTime]);

  // Check if recording is supported
  const isSupported = audioManager.features.mediaRecorder;

  // Get recording status
  const getRecordingStatus = useCallback(() => {
    return {
      isRecording,
      recordingTime,
      formattedTime: getFormattedDuration(),
      audioBlob,
      audioURL,
      error,
      isSupported
    };
  }, [isRecording, recordingTime, getFormattedDuration, audioBlob, audioURL, error, isSupported]);

  return {
    // Status
    isRecording,
    recordingTime,
    audioBlob,
    audioURL,
    error,
    isSupported,
    
    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
    
    // Utilities
    getFormattedDuration,
    getRecordingStatus
  };
};