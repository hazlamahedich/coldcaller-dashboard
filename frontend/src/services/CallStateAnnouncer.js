/**
 * CallStateAnnouncer Service - Professional call state audio announcements
 * Features: TTS announcements for all call states, configurable voice settings
 * Provides clear audio feedback for all call state changes
 */

export class CallStateAnnouncer {
  constructor() {
    this.isEnabled = true;
    this.volume = 0.8;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.voiceName = null; // Will auto-select best available voice
    this.announcementQueue = [];
    this.isAnnouncing = false;
    this.supportedStates = [
      'idle', 'connecting', 'ringing', 'active', 'hold', 
      'ending', 'ended', 'muted', 'unmuted', 'resumed'
    ];
    
    // Initialize voice preferences
    this.initializeVoices();
  }

  /**
   * Initialize available voices and select the best one
   */
  initializeVoices() {
    if (!('speechSynthesis' in window)) {
      console.warn('⚠️ Text-to-Speech not supported in this browser');
      this.isEnabled = false;
      return;
    }

    // Wait for voices to load
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        // Voices not loaded yet, try again
        setTimeout(loadVoices, 100);
        return;
      }

      // Prefer female voices for professional phone announcements
      const preferredVoices = [
        'Samantha', 'Victoria', 'Allison', 'Ava', 'Susan',
        'Microsoft Zira', 'Google US English Female',
        'female', 'woman'
      ];

      let selectedVoice = null;

      // Try to find preferred voice
      for (const preferred of preferredVoices) {
        selectedVoice = voices.find(voice => 
          voice.name.toLowerCase().includes(preferred.toLowerCase())
        );
        if (selectedVoice) break;
      }

      // Fallback to default English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.default
        ) || voices[0];
      }

      this.voiceName = selectedVoice?.name;
      console.log(`🗣️ Call announcer voice: ${this.voiceName}`);
    };

    // Start loading voices
    loadVoices();
    
    // Also listen for voice changes
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Enable or disable announcements
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.clearQueue();
    }
    console.log(`🗣️ Call announcements ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set announcement volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    console.log(`🔊 Announcement volume: ${Math.round(this.volume * 100)}%`);
  }

  /**
   * Set speech rate (0.1 to 10)
   */
  setRate(rate) {
    this.rate = Math.max(0.1, Math.min(10, rate));
    console.log(`⏩ Announcement rate: ${this.rate}x`);
  }

  /**
   * Set speech pitch (0 to 2)
   */
  setPitch(pitch) {
    this.pitch = Math.max(0, Math.min(2, pitch));
    console.log(`🎵 Announcement pitch: ${this.pitch}`);
  }

  /**
   * Main method to announce call state changes
   */
  announceCallState(state, context = {}) {
    if (!this.isEnabled || !this.supportedStates.includes(state)) {
      return false;
    }

    const announcement = this.getAnnouncementText(state, context);
    if (announcement) {
      this.queueAnnouncement(announcement, this.getAnnouncementPriority(state));
      return true;
    }
    return false;
  }

  /**
   * Get appropriate announcement text for each state
   */
  getAnnouncementText(state, context = {}) {
    const phoneNumber = context.phoneNumber || 'number';
    const formattedNumber = this.formatPhoneNumber(phoneNumber);

    switch (state) {
      case 'idle':
        return null; // No announcement for idle state

      case 'connecting':
        return `Connecting to ${formattedNumber}`;

      case 'ringing':
        return `Calling ${formattedNumber}`;

      case 'active':
        return `Call connected to ${formattedNumber}`;

      case 'hold':
        return 'Call placed on hold';

      case 'resumed':
        return 'Call resumed';

      case 'ending':
        return 'Ending call';

      case 'ended':
        const reason = context.reason || 'completed';
        const duration = context.duration || 0;
        const durationText = this.formatDuration(duration);
        
        if (reason === 'user_hangup' || reason === 'completed') {
          return duration > 5 ? `Call ended. Duration ${durationText}` : 'Call ended';
        } else if (reason === 'failed' || reason === 'busy') {
          return `Call ${reason}`;
        } else if (reason === 'no_answer') {
          return 'No answer';
        } else {
          return 'Call disconnected';
        }

      case 'muted':
        return 'Microphone muted';

      case 'unmuted':
        return 'Microphone unmuted';

      default:
        return null;
    }
  }

  /**
   * Get priority level for different announcement types
   */
  getAnnouncementPriority(state) {
    const priorities = {
      'active': 3,      // High priority - call connected
      'ended': 3,       // High priority - call ended
      'connecting': 2,  // Medium priority
      'ringing': 2,     // Medium priority
      'hold': 2,        // Medium priority
      'resumed': 2,     // Medium priority
      'muted': 1,       // Low priority
      'unmuted': 1,     // Low priority
      'ending': 1       // Low priority
    };
    
    return priorities[state] || 1;
  }

  /**
   * Queue an announcement with priority handling
   */
  queueAnnouncement(text, priority = 1) {
    // Clear lower priority announcements if higher priority comes in
    if (priority >= 2) {
      this.announcementQueue = this.announcementQueue.filter(item => item.priority >= priority);
    }

    this.announcementQueue.push({
      text,
      priority,
      timestamp: Date.now()
    });

    // Sort by priority (higher priority first)
    this.announcementQueue.sort((a, b) => b.priority - a.priority);

    // Process queue
    this.processAnnouncementQueue();
  }

  /**
   * Process the announcement queue
   */
  async processAnnouncementQueue() {
    if (this.isAnnouncing || this.announcementQueue.length === 0) {
      return;
    }

    this.isAnnouncing = true;

    try {
      while (this.announcementQueue.length > 0) {
        const announcement = this.announcementQueue.shift();
        await this.speakText(announcement.text);
        
        // Small pause between announcements
        await this.delay(200);
      }
    } finally {
      this.isAnnouncing = false;
    }
  }

  /**
   * Speak text using Web Speech API
   */
  async speakText(text) {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        console.warn('⚠️ Speech synthesis not supported');
        resolve();
        return;
      }

      try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice settings
        utterance.volume = this.volume;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;

        // Set preferred voice if available
        if (this.voiceName) {
          const voices = window.speechSynthesis.getVoices();
          const selectedVoice = voices.find(voice => voice.name === this.voiceName);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        // Set up event handlers
        utterance.onend = () => {
          console.log(`🗣️ Announced: "${text}"`);
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('❌ Speech synthesis error:', event.error);
          resolve(); // Continue even if speech fails
        };

        // Speak the text
        window.speechSynthesis.speak(utterance);

        // Fallback timeout in case events don't fire
        setTimeout(() => {
          resolve();
        }, (text.length * 100) + 2000); // Estimate based on text length

      } catch (error) {
        console.error('❌ Speech synthesis failed:', error);
        resolve(); // Continue even if speech fails
      }
    });
  }

  /**
   * Clear all queued announcements
   */
  clearQueue() {
    this.announcementQueue = [];
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    this.isAnnouncing = false;
    console.log('🗣️ Announcement queue cleared');
  }

  /**
   * Test the announcement system
   */
  async testAnnouncement() {
    if (!this.isEnabled) {
      console.warn('⚠️ Announcements are disabled');
      return false;
    }

    try {
      await this.speakText('Call state announcements are working correctly');
      return true;
    } catch (error) {
      console.error('❌ Announcement test failed:', error);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      enabled: this.isEnabled,
      volume: this.volume,
      rate: this.rate,
      pitch: this.pitch,
      voiceName: this.voiceName,
      queueLength: this.announcementQueue.length
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    if (typeof config.enabled === 'boolean') this.setEnabled(config.enabled);
    if (typeof config.volume === 'number') this.setVolume(config.volume);
    if (typeof config.rate === 'number') this.setRate(config.rate);
    if (typeof config.pitch === 'number') this.setPitch(config.pitch);
    
    console.log('🗣️ Announcement configuration updated:', this.getConfig());
  }

  /**
   * Utility method to format phone numbers for speech
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return 'unknown number';
    
    // Remove non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      // US format: (XXX) XXX-XXXX -> "area code X X X, X X X, X X X X"
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      // US format with country code
      return `${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    } else if (cleaned.length > 6) {
      // International format - just add spaces every 3 digits
      return cleaned.replace(/(\d{3})/g, '$1 ').trim();
    } else {
      // Short numbers - read digit by digit
      return cleaned.split('').join(' ');
    }
  }

  /**
   * Format duration for speech
   */
  formatDuration(seconds) {
    if (!seconds || seconds < 1) return '';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (mins === 0) {
      return `${secs} second${secs !== 1 ? 's' : ''}`;
    } else if (secs === 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''}`;
    } else {
      return `${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Utility delay method
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.clearQueue();
    this.isEnabled = false;
    console.log('🗑️ Call State Announcer destroyed');
  }
}

// Create and export singleton instance
export const callStateAnnouncer = new CallStateAnnouncer();

export default callStateAnnouncer;