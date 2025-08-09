/**
 * Web Audio API Manager - Professional audio processing with recording capabilities
 * Features: Web Audio API integration, recording, real-time processing, effects
 * Provides advanced audio capabilities for the Cold Caller application
 */

export class WebAudioManager {
  constructor() {
    this.audioContext = null;
    this.audioBuffers = new Map(); // clipId -> AudioBuffer
    this.audioSources = new Map(); // clipId -> AudioBufferSourceNode
    this.gainNodes = new Map(); // clipId -> GainNode
    this.analyzerNodes = new Map(); // clipId -> AnalyserNode
    this.mediaRecorder = null;
    this.recordingStream = null;
    this.isInitialized = false;
    
    // Features detection
    this.features = {
      webAudio: false,
      mediaRecorder: false,
      getUserMedia: false
    };
    
    // Recording state
    this.recordingData = [];
    this.isRecording = false;
    
    // Global volume
    this.masterVolume = 1.0;
    this.masterGainNode = null;
  }

  /**
   * Initialize Web Audio API and detect capabilities
   */
  async initialize() {
    try {
      console.log('🎵 Initializing Web Audio API Manager...');
      
      // Check for Web Audio API support
      if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create master gain node
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.connect(this.audioContext.destination);
        this.masterGainNode.gain.value = this.masterVolume;
        
        this.features.webAudio = true;
        console.log('✅ Web Audio API initialized');
      } else {
        console.warn('⚠️ Web Audio API not supported');
        return false;
      }
      
      // Check for MediaRecorder support
      if (typeof MediaRecorder !== 'undefined') {
        this.features.mediaRecorder = true;
        console.log('✅ MediaRecorder API supported');
      }
      
      // Check for getUserMedia support
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.features.getUserMedia = true;
        console.log('✅ getUserMedia API supported');
      }
      
      this.isInitialized = true;
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Web Audio API:', error);
      return false;
    }
  }

  /**
   * Load audio file and decode to AudioBuffer
   */
  async loadAudioFile(url, clipId) {
    if (!this.audioContext) {
      throw new Error('Web Audio API not initialized');
    }
    
    try {
      console.log(`🔄 Loading audio file: ${clipId}`);
      
      // Resume audio context if suspended (required for some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Fetch audio data
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Store in cache
      this.audioBuffers.set(clipId, audioBuffer);
      
      console.log(`✅ Audio loaded: ${clipId} (${audioBuffer.duration.toFixed(2)}s)`);
      return audioBuffer;
      
    } catch (error) {
      console.error(`❌ Failed to load audio ${clipId}:`, error);
      throw error;
    }
  }

  /**
   * Play audio with advanced options
   */
  async playAudio(clipId, options = {}) {
    if (!this.audioContext || !this.audioBuffers.has(clipId)) {
      throw new Error(`Audio not loaded: ${clipId}`);
    }
    
    try {
      // Stop any currently playing instance
      this.stopAudio(clipId);
      
      const audioBuffer = this.audioBuffers.get(clipId);
      
      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      
      // Create analyzer node for waveform data
      const analyzerNode = this.audioContext.createAnalyser();
      analyzerNode.fftSize = 256;
      analyzerNode.smoothingTimeConstant = 0.8;
      
      // Connect nodes: source -> gain -> analyzer -> master -> destination
      source.connect(gainNode);
      gainNode.connect(analyzerNode);
      analyzerNode.connect(this.masterGainNode);
      
      // Store nodes for later control
      this.audioSources.set(clipId, source);
      this.gainNodes.set(clipId, gainNode);
      this.analyzerNodes.set(clipId, analyzerNode);
      
      // Apply options
      const {
        volume = 1.0,
        playbackRate = 1.0,
        fadeIn = 0,
        fadeOut = 0,
        startOffset = 0,
        loop = false
      } = options;
      
      // Set playback rate
      source.playbackRate.value = playbackRate;
      
      // Set volume
      gainNode.gain.value = volume;
      
      // Set loop
      source.loop = loop;
      
      // Apply fade in
      if (fadeIn > 0) {
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + fadeIn);
      }
      
      // Schedule fade out
      if (fadeOut > 0 && !loop) {
        const duration = audioBuffer.duration / playbackRate;
        const fadeStartTime = this.audioContext.currentTime + duration - fadeOut - startOffset;
        if (fadeStartTime > this.audioContext.currentTime) {
          gainNode.gain.setValueAtTime(volume, fadeStartTime);
          gainNode.gain.linearRampToValueAtTime(0, fadeStartTime + fadeOut);
        }
      }
      
      // Handle playback end
      source.onended = () => {
        this.cleanupAudio(clipId);
      };
      
      // Start playback
      source.start(0, startOffset);
      
      console.log(`▶️ Playing audio: ${clipId} (rate: ${playbackRate}x, volume: ${(volume * 100).toFixed(0)}%)`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to play audio ${clipId}:`, error);
      throw error;
    }
  }

  /**
   * Stop audio playback
   */
  stopAudio(clipId) {
    if (this.audioSources.has(clipId)) {
      try {
        const source = this.audioSources.get(clipId);
        source.stop();
        this.cleanupAudio(clipId);
        console.log(`⏹️ Stopped audio: ${clipId}`);
        return true;
      } catch (error) {
        // Source might already be stopped
        this.cleanupAudio(clipId);
        return true;
      }
    }
    return false;
  }

  /**
   * Stop all playing audio
   */
  stopAllAudio() {
    const clipIds = Array.from(this.audioSources.keys());
    clipIds.forEach(clipId => this.stopAudio(clipId));
    console.log('🔇 All audio stopped');
  }

  /**
   * Get playback status for a clip
   */
  getPlaybackStatus(clipId) {
    if (!this.audioSources.has(clipId) || !this.audioBuffers.has(clipId)) {
      return null;
    }
    
    const source = this.audioSources.get(clipId);
    const buffer = this.audioBuffers.get(clipId);
    const startTime = source.startTime || 0;
    const currentTime = this.audioContext.currentTime;
    
    const elapsed = Math.max(0, currentTime - startTime);
    const duration = buffer.duration;
    const progress = Math.min(elapsed / duration, 1);
    
    return {
      elapsed,
      duration,
      progress,
      isPlaying: progress < 1
    };
  }

  /**
   * Get waveform data for visualization
   */
  getWaveformData(clipId) {
    if (!this.analyzerNodes.has(clipId)) {
      return null;
    }
    
    const analyzer = this.analyzerNodes.get(clipId);
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyzer.getByteFrequencyData(dataArray);
    
    return dataArray;
  }

  /**
   * Set global volume
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.masterVolume;
    }
  }

  /**
   * Extract metadata from audio file
   */
  async extractMetadata(file) {
    try {
      // Create temporary audio element to get basic metadata
      const audioElement = document.createElement('audio');
      const objectURL = URL.createObjectURL(file);
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          URL.revokeObjectURL(objectURL);
          reject(new Error('Metadata extraction timeout'));
        }, 5000);
        
        audioElement.onloadedmetadata = () => {
          clearTimeout(timeoutId);
          
          const metadata = {
            duration: audioElement.duration,
            size: file.size,
            type: file.type,
            name: file.name,
            format: file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN'
          };
          
          // Try to get additional metadata if Web Audio API is available
          if (this.audioContext) {
            this.getAdvancedMetadata(file).then(advancedMeta => {
              URL.revokeObjectURL(objectURL);
              resolve({ ...metadata, ...advancedMeta });
            }).catch(() => {
              URL.revokeObjectURL(objectURL);
              resolve(metadata);
            });
          } else {
            URL.revokeObjectURL(objectURL);
            resolve(metadata);
          }
        };
        
        audioElement.onerror = () => {
          clearTimeout(timeoutId);
          URL.revokeObjectURL(objectURL);
          reject(new Error('Failed to load audio for metadata extraction'));
        };
        
        audioElement.src = objectURL;
      });
      
    } catch (error) {
      console.error('❌ Metadata extraction failed:', error);
      return {
        duration: 0,
        size: file.size,
        type: file.type,
        name: file.name,
        error: error.message
      };
    }
  }

  /**
   * Get advanced metadata using Web Audio API
   */
  async getAdvancedMetadata(file) {
    if (!this.audioContext) {
      return {};
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      
      return {
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        length: audioBuffer.length,
        bitrate: Math.round((file.size * 8) / audioBuffer.duration) // Approximate bitrate
      };
    } catch (error) {
      console.warn('⚠️ Advanced metadata extraction failed:', error);
      return {};
    }
  }

  /**
   * Start audio recording
   */
  async startRecording(options = {}) {
    if (!this.features.getUserMedia || !this.features.mediaRecorder) {
      throw new Error('Recording not supported');
    }
    
    try {
      console.log('🎤 Starting audio recording...');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: options.sampleRate || 44100
        }
      });
      
      this.recordingStream = stream;
      
      // Create MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: options.bitRate || 128000
      });
      
      this.recordingData = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingData.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        console.log('🎤 Recording stopped');
        // Stop all tracks
        if (this.recordingStream) {
          this.recordingStream.getTracks().forEach(track => track.stop());
          this.recordingStream = null;
        }
      };
      
      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      
      console.log('✅ Recording started');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop audio recording and return blob
   */
  async stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error('No active recording');
    }
    
    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.mediaRecorder.mimeType;
          const blob = new Blob(this.recordingData, { type: mimeType });
          
          this.isRecording = false;
          this.recordingData = [];
          
          // Stop stream
          if (this.recordingStream) {
            this.recordingStream.getTracks().forEach(track => track.stop());
            this.recordingStream = null;
          }
          
          console.log('✅ Recording completed:', blob.size, 'bytes');
          resolve(blob);
        } catch (error) {
          reject(error);
        }
      };
      
      this.mediaRecorder.stop();
    });
  }

  /**
   * Get supported MIME type for recording
   */
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm'; // Fallback
  }

  /**
   * Clean up audio resources
   */
  cleanupAudio(clipId) {
    this.audioSources.delete(clipId);
    this.gainNodes.delete(clipId);
    this.analyzerNodes.delete(clipId);
  }

  /**
   * Destroy and cleanup all resources
   */
  destroy() {
    // Stop all audio
    this.stopAllAudio();
    
    // Stop recording if active
    if (this.isRecording) {
      try {
        this.stopRecording();
      } catch (error) {
        console.warn('⚠️ Error stopping recording during cleanup:', error);
      }
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Clear all data
    this.audioBuffers.clear();
    this.audioSources.clear();
    this.gainNodes.clear();
    this.analyzerNodes.clear();
    
    console.log('🗑️ Web Audio Manager destroyed');
  }
}

// Create and export singleton instance
export const audioManager = new WebAudioManager();

export default audioManager;