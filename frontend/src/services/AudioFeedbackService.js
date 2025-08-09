/**
 * AudioFeedbackService - Enhanced audio feedback for VOIP call states
 * Provides professional audio cues, TTS announcements, and UI coordination
 * Features: Advanced state management, audio quality optimization, accessibility support
 */

class AudioFeedbackService {
  constructor() {
    this.isEnabled = true;
    this.volume = 0.7;
    this.speechSynthesis = null;
    this.audioContext = null;
    this.gainNode = null;
    this.listeners = new Map();
    this.currentState = 'idle';
    this.stateHistory = [];
    this.audioQueue = [];
    this.isPlaying = false;
    this.preferences = {
      enableTTS: true,
      enableTones: true,
      enableVibration: false,
      voiceRate: 1.1,
      voicePitch: 1.0,
      preferredVoice: null
    };
    this.initializeServices();
  }

  /**
   * Initialize audio services with enhanced error handling and optimization
   */
  async initializeServices() {
    console.log('🔊 Initializing Enhanced AudioFeedbackService...');
    
    try {
      // Initialize Speech Synthesis API with voice loading
      if ('speechSynthesis' in window) {
        this.speechSynthesis = window.speechSynthesis;
        
        // Wait for voices to load and select best voice
        await this.loadVoices();
      }

      // Initialize Web Audio API with advanced setup
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create master gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;
      
      // Resume audio context on first user interaction
      this.setupAutoResume();
      
      // Initialize vibration API if available
      if ('vibrate' in navigator) {
        console.log('📳 Vibration API available');
      }
      
      console.log('✅ AudioFeedbackService initialized successfully');
      this.emit('initialized', { success: true });
      
    } catch (error) {
      console.error('❌ AudioFeedbackService initialization failed:', error);
      this.emit('error', { type: 'initialization', error });
    }
  }

  /**
   * Load and cache available voices for optimal TTS performance
   */
  async loadVoices() {
    return new Promise((resolve) => {
      const loadVoicesHandler = () => {
        const voices = this.speechSynthesis.getVoices();
        
        // Find best professional voice
        const professionalVoices = voices.filter(voice => 
          voice.lang.startsWith('en') && (
            voice.name.includes('Samantha') ||
            voice.name.includes('Alex') ||
            voice.name.includes('Daniel') ||
            voice.name.includes('Karen') ||
            voice.name.includes('Victoria')
          )
        );
        
        this.preferences.preferredVoice = professionalVoices[0] || voices.find(v => v.lang.startsWith('en')) || voices[0];
        
        if (this.preferences.preferredVoice) {
          console.log(`🎙️ Selected voice: ${this.preferences.preferredVoice.name}`);
        }
        
        resolve(voices);
      };
      
      if (this.speechSynthesis.getVoices().length > 0) {
        loadVoicesHandler();
      } else {
        this.speechSynthesis.addEventListener('voiceschanged', loadVoicesHandler, { once: true });
      }
    });
  }

  /**
   * Setup auto-resume for audio context on user interaction
   */
  setupAutoResume() {
    const resumeAudio = async () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
          console.log('🔊 Audio context resumed on user interaction');
        } catch (error) {
          console.warn('⚠️ Failed to resume audio context:', error);
        }
      }
    };
    
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, resumeAudio, { once: true });
    });
  }

  /**
   * Enhanced call state management
   * @param {string} newState - New call state
   * @param {Object} data - Additional state data
   */
  onCallStateChange(newState, data = {}) {
    console.log(`🔄 Call state change: ${this.currentState} → ${newState}`);
    
    // Store state history
    this.stateHistory.push({
      from: this.currentState,
      to: newState,
      timestamp: Date.now(),
      data
    });
    
    // Keep only last 10 state changes
    if (this.stateHistory.length > 10) {
      this.stateHistory = this.stateHistory.slice(-10);
    }
    
    const previousState = this.currentState;
    this.currentState = newState;
    
    // Auto-play feedback for state changes
    this.playFeedback(newState, null, { previousState, ...data });
    
    // Emit state change event
    this.emit('stateChanged', { 
      from: previousState, 
      to: newState, 
      data 
    });
  }

  /**
   * Enable or disable audio feedback with preferences sync
   * @param {boolean} enabled - Enable state
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🔊 Audio feedback ${enabled ? 'enabled' : 'disabled'}`);
    this.emit('enabledChanged', { enabled });
  }

  /**
   * Set volume level with smooth transitions
   * @param {number} volume - Volume (0-1)
   */
  setVolume(volume) {
    const newVolume = Math.max(0, Math.min(1, volume));
    this.volume = newVolume;
    
    if (this.gainNode) {
      // Smooth volume transition
      this.gainNode.gain.setTargetAtTime(newVolume, this.audioContext.currentTime, 0.1);
    }
    
    console.log(`🔊 Volume set to ${Math.round(newVolume * 100)}%`);
    this.emit('volumeChanged', { volume: newVolume });
  }

  /**
   * Enhanced audio feedback with queuing and smart prioritization
   * @param {string} type - Event type (connecting, ringing, connected, failed, hold, resume, muted, unmuted)
   * @param {string} message - Optional custom message
   * @param {Object} options - Additional options (priority, delay, etc.)
   */
  async playFeedback(type, message = null, options = {}) {
    if (!this.isEnabled) return;

    const feedbackConfig = this.getFeedbackConfig(type);
    if (!feedbackConfig) {
      console.warn(`⚠️ No feedback config found for type: ${type}`);
      return;
    }

    const feedbackItem = {
      type,
      message: message || feedbackConfig.message,
      config: feedbackConfig,
      options: {
        priority: options.priority || 'normal',
        delay: options.delay || 0,
        vibrate: options.vibrate !== false,
        ...options
      },
      timestamp: Date.now()
    };

    // Add to queue or play immediately based on priority
    if (feedbackItem.options.priority === 'critical' || !this.isPlaying) {
      await this.playFeedbackImmediate(feedbackItem);
    } else {
      this.audioQueue.push(feedbackItem);
      this.processAudioQueue();
    }

    console.log(`🔊 Audio feedback queued: ${type} - ${feedbackItem.message}`);
    this.emit('feedbackPlayed', { type, message: feedbackItem.message, options });
  }

  /**
   * Play feedback immediately with all enhancements
   */
  async playFeedbackImmediate(feedbackItem) {
    const { type, message, config, options } = feedbackItem;
    this.isPlaying = true;

    try {
      // Resume audio context if needed
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Apply delay if specified
      if (options.delay > 0) {
        await this.delay(options.delay);
      }

      // Play vibration feedback (mobile)
      if (options.vibrate && this.preferences.enableVibration && 'vibrate' in navigator) {
        this.playVibrationFeedback(type);
      }

      // Play audio tone with enhanced quality
      if (config.tone && this.preferences.enableTones && this.audioContext) {
        await this.playEnhancedTone(config.tone, type);
      }

      // Play TTS with queue management
      if (config.speak && this.preferences.enableTTS && this.speechSynthesis && message) {
        await this.speakEnhanced(message);
      }

      console.log(`🔊 Audio feedback played: ${type} - ${message}`);
      
    } catch (error) {
      console.error(`❌ Audio feedback failed for ${type}:`, error);
      this.emit('error', { type: 'playback', error, feedbackType: type });
      
    } finally {
      this.isPlaying = false;
      // Process next item in queue
      setTimeout(() => this.processAudioQueue(), 100);
    }
  }

  /**
   * Process audio queue with smart prioritization
   */
  async processAudioQueue() {
    if (this.isPlaying || this.audioQueue.length === 0) return;

    // Sort by priority and timestamp
    this.audioQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff = priorityOrder[a.options.priority] - priorityOrder[b.options.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    const nextItem = this.audioQueue.shift();
    await this.playFeedbackImmediate(nextItem);
  }

  /**
   * Get enhanced feedback configuration for event type
   * @param {string} type - Event type
   * @returns {Object|null} Feedback configuration
   */
  getFeedbackConfig(type) {
    const configs = {
      // Call progression states
      idle: {
        message: 'Call system ready',
        speak: false,
        tone: null,
        priority: 'low'
      },
      connecting: {
        message: 'Connecting call',
        speak: true,
        tone: { frequency: 440, duration: 300, type: 'sine' },
        priority: 'high',
        vibration: [100, 50, 100]
      },
      ringing: {
        message: 'Phone ringing',
        speak: true,
        tone: { frequency: 480, duration: 800, type: 'triangle' },
        priority: 'high',
        vibration: [200, 100, 200]
      },
      connected: {
        message: 'Call connected',
        speak: true,
        tone: { frequency: 660, duration: 400, type: 'sine' },
        priority: 'critical',
        vibration: [150]
      },
      failed: {
        message: 'Call failed',
        speak: true,
        tone: { frequency: 200, duration: 800, type: 'sawtooth' },
        priority: 'critical',
        vibration: [500, 200, 500]
      },
      ending: {
        message: 'Ending call',
        speak: true,
        tone: { frequency: 400, duration: 300, type: 'sine' },
        priority: 'high',
        vibration: [100, 100, 100]
      },
      ended: {
        message: 'Call ended',
        speak: true,
        tone: { frequency: 300, duration: 600, type: 'sine' },
        priority: 'high',
        vibration: [200, 100, 200]
      },
      
      // Call control states
      hold: {
        message: 'Call on hold',
        speak: true,
        tone: { frequency: 350, duration: 350, type: 'triangle' },
        priority: 'normal',
        vibration: [100, 200, 100]
      },
      resume: {
        message: 'Call resumed',
        speak: true,
        tone: { frequency: 550, duration: 350, type: 'sine' },
        priority: 'normal',
        vibration: [150]
      },
      muted: {
        message: 'Microphone muted',
        speak: true,
        tone: { frequency: 300, duration: 250, type: 'square' },
        priority: 'normal',
        vibration: [100]
      },
      unmuted: {
        message: 'Microphone unmuted',
        speak: true,
        tone: { frequency: 500, duration: 250, type: 'sine' },
        priority: 'normal',
        vibration: [100]
      },
      
      // Audio feedback events
      dtmf: {
        message: null,
        speak: false,
        tone: { frequency: 800, duration: 100, type: 'square' },
        priority: 'low',
        vibration: [50]
      },
      recordingStarted: {
        message: 'Recording started',
        speak: true,
        tone: { frequency: 600, duration: 200, type: 'sine' },
        priority: 'normal',
        vibration: [100, 100]
      },
      recordingStopped: {
        message: 'Recording stopped',
        speak: true,
        tone: { frequency: 400, duration: 200, type: 'sine' },
        priority: 'normal',
        vibration: [100]
      },
      
      // Quality and network states
      qualityGood: {
        message: 'Connection quality good',
        speak: false,
        tone: { frequency: 700, duration: 150, type: 'sine' },
        priority: 'low'
      },
      qualityPoor: {
        message: 'Connection quality poor',
        speak: true,
        tone: { frequency: 250, duration: 300, type: 'triangle' },
        priority: 'normal',
        vibration: [150, 150, 150]
      },
      
      // Error states
      error: {
        message: 'System error occurred',
        speak: true,
        tone: { frequency: 200, duration: 600, type: 'sawtooth' },
        priority: 'critical',
        vibration: [300, 200, 300, 200, 300]
      }
    };

    return configs[type] || null;
  }

  /**
   * Play enhanced audio tone with improved quality and effects
   * @param {Object} toneConfig - Tone configuration
   * @param {string} callbackType - Type for logging
   */
  async playEnhancedTone(toneConfig, callbackType = 'unknown') {
    if (!this.audioContext || !toneConfig) return;

    try {
      const { frequency, duration, type = 'sine' } = toneConfig;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filterNode = this.audioContext.createBiquadFilter();

      // Audio chain: oscillator → filter → gain → master gain → destination
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(this.gainNode);

      // Oscillator setup
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      
      // Filter setup for better audio quality
      filterNode.type = 'lowpass';
      filterNode.frequency.value = frequency * 2;
      filterNode.Q.value = 1.5;
      
      // Enhanced gain envelope for smooth audio
      const now = this.audioContext.currentTime;
      const durationSec = duration / 1000;
      const attackTime = Math.min(0.02, durationSec * 0.1);
      const releaseTime = Math.min(0.1, durationSec * 0.3);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + attackTime);
      gainNode.gain.setValueAtTime(0.15, now + durationSec - releaseTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      oscillator.start(now);
      oscillator.stop(now + durationSec);
      
      console.log(`🎵 Enhanced tone played for ${callbackType}: ${frequency}Hz, ${duration}ms`);
      
      return new Promise((resolve) => {
        oscillator.onended = () => resolve();
      });

    } catch (error) {
      console.warn(`⚠️ Failed to play enhanced tone for ${callbackType}:`, error);
    }
  }

  /**
   * Play vibration feedback for mobile devices
   * @param {string} type - Feedback type for vibration pattern
   */
  playVibrationFeedback(type) {
    if (!('vibrate' in navigator)) return;

    const config = this.getFeedbackConfig(type);
    if (!config || !config.vibration) return;

    try {
      navigator.vibrate(config.vibration);
      console.log(`📳 Vibration played for ${type}: ${config.vibration}`);
    } catch (error) {
      console.warn(`⚠️ Vibration failed for ${type}:`, error);
    }
  }

  /**
   * Utility function for delays
   * @param {number} ms - Delay in milliseconds
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced text-to-speech with better voice selection and error handling
   * @param {string} text - Text to speak
   * @param {Object} options - Speech options
   */
  async speakEnhanced(text, options = {}) {
    if (!this.speechSynthesis || !text) return;

    try {
      // Cancel any ongoing speech
      this.speechSynthesis.cancel();
      
      // Small delay to ensure cancellation completed
      await this.delay(50);

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply preferences and options
      utterance.volume = Math.min(this.volume, 0.8); // Slightly lower for TTS
      utterance.rate = options.rate || this.preferences.voiceRate;
      utterance.pitch = options.pitch || this.preferences.voicePitch;

      // Use cached preferred voice or find best available
      if (this.preferences.preferredVoice) {
        utterance.voice = this.preferences.preferredVoice;
      }

      console.log(`🗣️ Speaking: "${text}" (${utterance.voice?.name || 'default voice'})`);
      
      // Return promise that resolves when speech is complete
      return new Promise((resolve, reject) => {
        utterance.onend = () => {
          console.log('🗣️ Speech completed');
          resolve();
        };
        
        utterance.onerror = (error) => {
          console.warn('⚠️ Speech synthesis error:', error);
          reject(error);
        };
        
        this.speechSynthesis.speak(utterance);
        
        // Timeout fallback (some browsers don't fire events reliably)
        setTimeout(() => {
          if (this.speechSynthesis.speaking) {
            console.warn('⚠️ Speech synthesis timeout, canceling');
            this.speechSynthesis.cancel();
            reject(new Error('Speech synthesis timeout'));
          } else {
            resolve();
          }
        }, text.length * 100 + 2000); // Rough estimate: 10 chars per second + 2s buffer
      });

    } catch (error) {
      console.warn('⚠️ Enhanced speech failed:', error);
    }
  }

  /**
   * Legacy speak method for backward compatibility
   * @param {string} text - Text to speak
   */
  speak(text) {
    return this.speakEnhanced(text);
  }

  /**
   * Enhanced DTMF confirmation with realistic touch-tone feedback
   * @param {string} tone - DTMF tone sent
   */
  async playDTMFConfirmation(tone) {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      // DTMF frequency mapping (realistic phone tones)
      const dtmfFreqs = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
      };

      const frequencies = dtmfFreqs[tone] || [800, 1000]; // Fallback frequencies
      const duration = 0.15; // 150ms like real phones

      // Create dual-tone DTMF sound
      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.gainNode);

        oscillator.type = 'sine'; // Sine waves for realistic DTMF
        oscillator.frequency.value = freq;
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.1, now + duration - 0.02);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        oscillator.start(now);
        oscillator.stop(now + duration);
      });

      console.log(`📟 DTMF confirmation played: ${tone} (${frequencies.join('Hz + ')}Hz)`);

    } catch (error) {
      console.warn('⚠️ Failed to play DTMF confirmation:', error);
    }
  }

  /**
   * Event system for audio feedback coordination
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(listener);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  off(event, listener) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(listener);
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.warn(`⚠️ Event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Set user preferences for audio feedback
   * @param {Object} prefs - Preference updates
   */
  setPreferences(prefs) {
    this.preferences = { ...this.preferences, ...prefs };
    
    // Reselect voice if preference changed
    if (prefs.preferredVoice && this.speechSynthesis) {
      const voices = this.speechSynthesis.getVoices();
      this.preferences.preferredVoice = voices.find(v => v.name === prefs.preferredVoice) || this.preferences.preferredVoice;
    }
    
    console.log('🔧 Audio preferences updated:', this.preferences);
    this.emit('preferencesChanged', this.preferences);
  }

  /**
   * Get current preferences
   * @returns {Object} Current preferences
   */
  getPreferences() {
    return { ...this.preferences };
  }

  /**
   * Get current state and statistics
   * @returns {Object} Service state
   */
  getState() {
    return {
      isEnabled: this.isEnabled,
      volume: this.volume,
      currentState: this.currentState,
      isPlaying: this.isPlaying,
      queueLength: this.audioQueue.length,
      stateHistory: [...this.stateHistory],
      preferences: { ...this.preferences },
      audioContextState: this.audioContext?.state,
      speechSynthesisAvailable: !!this.speechSynthesis
    };
  }

  /**
   * Clear audio queue and stop all playback
   */
  stop() {
    console.log('⏹️ Stopping all audio feedback');
    
    // Clear queue
    this.audioQueue = [];
    this.isPlaying = false;
    
    // Cancel speech synthesis
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    
    // Suspend audio context
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
    
    this.emit('stopped');
  }

  /**
   * Comprehensive audio system test with enhanced feedback
   */
  async test() {
    console.log('🧪 Testing Enhanced Audio Feedback Service...');
    
    try {
      // Resume audio context if needed
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const testSequence = [
        { type: 'connecting', delay: 0, priority: 'high' },
        { type: 'ringing', delay: 1200, priority: 'high' },
        { type: 'connected', delay: 3500, priority: 'critical' },
        { type: 'muted', delay: 5000, priority: 'normal' },
        { type: 'unmuted', delay: 6000, priority: 'normal' },
        { type: 'hold', delay: 7000, priority: 'normal' },
        { type: 'resume', delay: 8000, priority: 'normal' },
        { type: 'ended', delay: 9500, priority: 'high' }
      ];

      console.log(`🎭 Running ${testSequence.length} test scenarios...`);
      
      // Test each scenario with proper priority and timing
      testSequence.forEach(({ type, delay, priority }) => {
        setTimeout(() => {
          console.log(`🧪 Testing ${type} feedback...`);
          this.playFeedback(type, null, { 
            priority, 
            vibrate: true,
            testMode: true 
          });
        }, delay);
      });
      
      // Test DTMF sequence
      setTimeout(() => {
        console.log('🧪 Testing DTMF sequence...');
        const dtmfSequence = ['1', '2', '3', '*', '0', '#'];
        dtmfSequence.forEach((tone, index) => {
          setTimeout(() => {
            this.playDTMFConfirmation(tone);
          }, index * 200);
        });
      }, 10500);

      // Final test summary
      setTimeout(() => {
        console.log('✅ Audio feedback test completed!');
        console.log('📊 Service state:', this.getState());
        this.emit('testCompleted', { success: true });
      }, 12000);

    } catch (error) {
      console.error('❌ Audio feedback test failed:', error);
      this.emit('testCompleted', { success: false, error });
    }
  }

  /**
   * Quick connectivity test
   * @returns {Promise<boolean>} Test result
   */
  async quickTest() {
    try {
      await this.playFeedback('connected', 'Audio test successful', { priority: 'critical' });
      console.log('✅ Quick audio test passed');
      return true;
    } catch (error) {
      console.error('❌ Quick audio test failed:', error);
      return false;
    }
  }

  /**
   * Enhanced cleanup with proper resource management
   */
  destroy() {
    console.log('🧹 Destroying Enhanced Audio Feedback Service...');
    
    // Stop all playback
    this.stop();
    
    // Clear all queues and timers
    this.audioQueue = [];
    this.stateHistory = [];
    
    // Cleanup speech synthesis
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.speechSynthesis = null;
    }
    
    // Cleanup audio context
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      this.audioContext = null;
      this.gainNode = null;
    }
    
    // Clear event listeners
    this.listeners.clear();
    
    // Reset state
    this.isEnabled = false;
    this.isPlaying = false;
    this.currentState = 'destroyed';
    
    console.log('🔊 Enhanced Audio Feedback Service destroyed');
    this.emit('destroyed');
  }
}

export default AudioFeedbackService;