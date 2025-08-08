// MediaManager - WebRTC media stream and device management
// Handles audio/video capture, device selection, quality control, and media constraints
// Provides comprehensive media handling for SIP.js calling with mobile optimization

class MediaManager {
  constructor() {
    // Media streams
    this.localStream = null;
    this.remoteStream = null;
    
    // Media elements
    this.localAudio = null;
    this.remoteAudio = null;
    
    // Device management
    this.availableDevices = {
      audioInputs: [],
      audioOutputs: [],
      videoInputs: []
    };
    
    this.selectedDevices = {
      microphone: null,
      speaker: null,
      camera: null
    };
    
    // Media constraints
    this.defaultConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true
      },
      video: false
    };
    
    this.currentConstraints = { ...this.defaultConstraints };
    
    // Audio analysis
    this.audioContext = null;
    this.localAnalyzer = null;
    this.remoteAnalyzer = null;
    this.volumeMonitorInterval = null;
    
    // Quality settings
    this.qualitySettings = {
      sampleRate: 48000,
      channelCount: 1,
      bitrate: 64000, // 64 kbps for good quality
      codec: 'OPUS', // Preferred codec
      dtx: true, // Discontinuous transmission
      fec: true  // Forward error correction
    };
    
    // Volume levels
    this.volumeLevels = {
      local: 0,
      remote: 0,
      localPeak: 0,
      remotePeak: 0
    };
    
    // Event listeners
    this.listeners = new Map();
    
    // Mobile optimization flags
    this.isMobile = this.detectMobile();
    this.isIOS = this.detectIOS();
    this.isAndroid = this.detectAndroid();
    
    this.bindMethods();
    this.initialize();
  }
  
  // Bind methods to maintain context
  bindMethods() {
    this.handleDeviceChange = this.handleDeviceChange.bind(this);
    this.monitorVolumeLevels = this.monitorVolumeLevels.bind(this);
  }
  
  // Initialize MediaManager
  async initialize() {
    try {
      console.log('🎤 Initializing MediaManager...');
      
      // Check browser support
      this.checkWebRTCSupport();
      
      // Initialize audio context
      await this.initializeAudioContext();
      
      // Enumerate available devices
      await this.enumerateDevices();
      
      // Set up device change listener
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange);
      }
      
      // Apply mobile optimizations
      if (this.isMobile) {
        this.applyMobileOptimizations();
      }
      
      this.emit('initialized', {
        devices: this.availableDevices,
        isMobile: this.isMobile,
        audioContext: !!this.audioContext
      });
      
      console.log('✅ MediaManager initialized successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ MediaManager initialization failed:', error);
      this.emit('error', { 
        type: 'initialization',
        message: error.message,
        error 
      });
      return { success: false, error: error.message };
    }
  }
  
  // Check WebRTC support
  checkWebRTCSupport() {
    const missing = [];
    
    if (!navigator.mediaDevices) missing.push('MediaDevices API');
    if (!navigator.mediaDevices.getUserMedia) missing.push('getUserMedia');
    if (!navigator.mediaDevices.enumerateDevices) missing.push('enumerateDevices');
    if (!window.RTCPeerConnection) missing.push('RTCPeerConnection');
    if (!window.AudioContext && !window.webkitAudioContext) missing.push('AudioContext');
    
    if (missing.length > 0) {
      throw new Error(`WebRTC features not supported: ${missing.join(', ')}`);
    }
    
    console.log('✅ WebRTC support confirmed');
  }
  
  // Initialize audio context
  async initializeAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      
      if (AudioContext) {
        this.audioContext = new AudioContext();
        
        // Handle audio context state changes
        this.audioContext.addEventListener('statechange', () => {
          console.log(`🎵 Audio context state: ${this.audioContext.state}`);
          this.emit('audioContextStateChange', { state: this.audioContext.state });
        });
        
        // Resume audio context if suspended (required on mobile)
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to initialize audio context:', error);
      // Continue without audio context - not critical for basic functionality
    }
  }
  
  // Enumerate available media devices
  async enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      this.availableDevices = {
        audioInputs: devices.filter(d => d.kind === 'audioinput'),
        audioOutputs: devices.filter(d => d.kind === 'audiooutput'),
        videoInputs: devices.filter(d => d.kind === 'videoinput')
      };
      
      // Auto-select first available devices if none selected
      if (!this.selectedDevices.microphone && this.availableDevices.audioInputs.length > 0) {
        this.selectedDevices.microphone = this.availableDevices.audioInputs[0].deviceId;
      }
      
      if (!this.selectedDevices.speaker && this.availableDevices.audioOutputs.length > 0) {
        this.selectedDevices.speaker = this.availableDevices.audioOutputs[0].deviceId;
      }
      
      this.emit('devicesEnumerated', { 
        devices: this.availableDevices,
        selected: this.selectedDevices 
      });
      
      console.log('📱 Devices enumerated:', {
        audioInputs: this.availableDevices.audioInputs.length,
        audioOutputs: this.availableDevices.audioOutputs.length,
        videoInputs: this.availableDevices.videoInputs.length
      });
      
      return this.availableDevices;
      
    } catch (error) {
      console.error('❌ Failed to enumerate devices:', error);
      throw error;
    }
  }
  
  // Handle device changes (plug/unplug)
  async handleDeviceChange() {
    console.log('🔄 Media devices changed, re-enumerating...');
    
    try {
      await this.enumerateDevices();
      
      // Check if selected devices are still available
      this.validateSelectedDevices();
      
      this.emit('deviceChange', { 
        devices: this.availableDevices,
        selected: this.selectedDevices 
      });
      
    } catch (error) {
      console.error('❌ Failed to handle device change:', error);
      this.emit('error', { 
        type: 'device_change',
        message: error.message 
      });
    }
  }
  
  // Validate selected devices are still available
  validateSelectedDevices() {
    const { microphone, speaker } = this.selectedDevices;
    
    // Check microphone
    if (microphone) {
      const micExists = this.availableDevices.audioInputs.some(d => d.deviceId === microphone);
      if (!micExists && this.availableDevices.audioInputs.length > 0) {
        console.log('⚠️ Selected microphone no longer available, switching to default');
        this.selectedDevices.microphone = this.availableDevices.audioInputs[0].deviceId;
      }
    }
    
    // Check speaker
    if (speaker) {
      const speakerExists = this.availableDevices.audioOutputs.some(d => d.deviceId === speaker);
      if (!speakerExists && this.availableDevices.audioOutputs.length > 0) {
        console.log('⚠️ Selected speaker no longer available, switching to default');
        this.selectedDevices.speaker = this.availableDevices.audioOutputs[0].deviceId;
      }
    }
  }
  
  // Get user media with constraints
  async getUserMedia(constraints = null) {
    try {
      const mediaConstraints = constraints || this.buildMediaConstraints();
      
      console.log('🎤 Requesting user media with constraints:', mediaConstraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      
      this.localStream = stream;
      
      // Set up local audio element
      this.setupLocalAudio(stream);
      
      // Start volume monitoring
      this.startVolumeMonitoring();
      
      this.emit('localStreamAcquired', {
        streamId: stream.id,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        constraints: mediaConstraints
      });
      
      console.log('✅ Local media stream acquired');
      return stream;
      
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      this.emit('error', { 
        type: 'getUserMedia',
        message: this.getMediaErrorMessage(error),
        error 
      });
      throw error;
    }
  }
  
  // Build media constraints with current settings
  buildMediaConstraints() {
    const constraints = { ...this.currentConstraints };
    
    // Apply selected microphone
    if (this.selectedDevices.microphone && constraints.audio) {
      if (typeof constraints.audio === 'object') {
        constraints.audio.deviceId = { exact: this.selectedDevices.microphone };
      } else {
        constraints.audio = {
          deviceId: { exact: this.selectedDevices.microphone }
        };
      }
    }
    
    // Apply quality settings for audio
    if (constraints.audio && typeof constraints.audio === 'object') {
      constraints.audio.sampleRate = this.qualitySettings.sampleRate;
      constraints.audio.channelCount = this.qualitySettings.channelCount;
    }
    
    return constraints;
  }
  
  // Setup local audio element
  setupLocalAudio(stream) {
    if (this.localAudio) {
      this.localAudio.srcObject = null;
      this.localAudio.remove();
    }
    
    this.localAudio = document.createElement('audio');
    this.localAudio.srcObject = stream;
    this.localAudio.muted = true; // Prevent feedback
    this.localAudio.autoplay = true;
    document.body.appendChild(this.localAudio);
  }
  
  // Setup remote audio element
  setupRemoteAudio(stream) {
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
      this.remoteAudio.remove();
    }
    
    this.remoteAudio = document.createElement('audio');
    this.remoteAudio.srcObject = stream;
    this.remoteAudio.autoplay = true;
    document.body.appendChild(this.remoteAudio);
    
    // Apply selected speaker (if supported)
    this.setAudioOutput(this.remoteAudio, this.selectedDevices.speaker);
    
    this.remoteStream = stream;
    
    this.emit('remoteStreamReceived', {
      streamId: stream.id,
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length
    });
  }
  
  // Start volume level monitoring
  startVolumeMonitoring() {
    if (!this.audioContext || !this.localStream) return;
    
    try {
      // Set up local stream analyzer
      const localSource = this.audioContext.createMediaStreamSource(this.localStream);
      this.localAnalyzer = this.audioContext.createAnalyser();
      this.localAnalyzer.fftSize = 256;
      localSource.connect(this.localAnalyzer);
      
      // Set up remote stream analyzer (if available)
      if (this.remoteStream) {
        const remoteSource = this.audioContext.createMediaStreamSource(this.remoteStream);
        this.remoteAnalyzer = this.audioContext.createAnalyser();
        this.remoteAnalyzer.fftSize = 256;
        remoteSource.connect(this.remoteAnalyzer);
      }
      
      // Start monitoring interval
      this.volumeMonitorInterval = setInterval(this.monitorVolumeLevels, 100);
      
    } catch (error) {
      console.warn('⚠️ Failed to start volume monitoring:', error);
    }
  }
  
  // Monitor volume levels
  monitorVolumeLevels() {
    if (!this.localAnalyzer) return;
    
    try {
      // Get local volume
      const localData = new Uint8Array(this.localAnalyzer.frequencyBinCount);
      this.localAnalyzer.getByteFrequencyData(localData);
      
      let localSum = 0;
      for (let i = 0; i < localData.length; i++) {
        localSum += localData[i];
      }
      const localAverage = localSum / localData.length;
      this.volumeLevels.local = localAverage / 255;
      this.volumeLevels.localPeak = Math.max(this.volumeLevels.localPeak * 0.95, this.volumeLevels.local);
      
      // Get remote volume (if available)
      if (this.remoteAnalyzer) {
        const remoteData = new Uint8Array(this.remoteAnalyzer.frequencyBinCount);
        this.remoteAnalyzer.getByteFrequencyData(remoteData);
        
        let remoteSum = 0;
        for (let i = 0; i < remoteData.length; i++) {
          remoteSum += remoteData[i];
        }
        const remoteAverage = remoteSum / remoteData.length;
        this.volumeLevels.remote = remoteAverage / 255;
        this.volumeLevels.remotePeak = Math.max(this.volumeLevels.remotePeak * 0.95, this.volumeLevels.remote);
      }
      
      this.emit('volumeLevels', { ...this.volumeLevels });
      
    } catch (error) {
      console.warn('⚠️ Volume monitoring error:', error);
    }
  }
  
  // Stop volume monitoring
  stopVolumeMonitoring() {
    if (this.volumeMonitorInterval) {
      clearInterval(this.volumeMonitorInterval);
      this.volumeMonitorInterval = null;
    }
    
    this.volumeLevels = {
      local: 0,
      remote: 0,
      localPeak: 0,
      remotePeak: 0
    };
  }
  
  // Select microphone device
  async selectMicrophone(deviceId) {
    try {
      this.selectedDevices.microphone = deviceId;
      
      // If we have an active stream, restart with new device
      if (this.localStream) {
        await this.restartLocalStream();
      }
      
      this.emit('deviceSelected', { 
        type: 'microphone',
        deviceId,
        device: this.availableDevices.audioInputs.find(d => d.deviceId === deviceId)
      });
      
      console.log('🎤 Microphone selected:', deviceId);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to select microphone:', error);
      throw error;
    }
  }
  
  // Select speaker device
  async selectSpeaker(deviceId) {
    try {
      this.selectedDevices.speaker = deviceId;
      
      // Apply to remote audio element if available
      if (this.remoteAudio) {
        await this.setAudioOutput(this.remoteAudio, deviceId);
      }
      
      this.emit('deviceSelected', { 
        type: 'speaker',
        deviceId,
        device: this.availableDevices.audioOutputs.find(d => d.deviceId === deviceId)
      });
      
      console.log('🔊 Speaker selected:', deviceId);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to select speaker:', error);
      throw error;
    }
  }
  
  // Set audio output device (if supported)
  async setAudioOutput(audioElement, deviceId) {
    if (!audioElement || !deviceId) return;
    
    try {
      if (audioElement.setSinkId) {
        await audioElement.setSinkId(deviceId);
        console.log('🔊 Audio output set to device:', deviceId);
      } else {
        console.warn('⚠️ setSinkId not supported in this browser');
      }
    } catch (error) {
      console.error('❌ Failed to set audio output:', error);
      throw error;
    }
  }
  
  // Restart local stream with new constraints
  async restartLocalStream() {
    try {
      // Stop existing stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Get new stream
      await this.getUserMedia();
      
      this.emit('localStreamRestarted', {
        streamId: this.localStream.id
      });
      
      console.log('🔄 Local stream restarted with new constraints');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to restart local stream:', error);
      throw error;
    }
  }
  
  // Mute/unmute microphone
  setMicrophoneMute(muted) {
    if (!this.localStream) {
      throw new Error('No local stream available');
    }
    
    const audioTracks = this.localStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !muted;
    });
    
    this.emit('microphoneMuteChanged', { muted });
    console.log(`🎤 Microphone ${muted ? 'muted' : 'unmuted'}`);
    
    return { success: true, muted };
  }
  
  // Set speaker volume
  setSpeakerVolume(level) {
    if (!this.remoteAudio) {
      throw new Error('No remote audio available');
    }
    
    const volume = Math.max(0, Math.min(1, level));
    this.remoteAudio.volume = volume;
    
    this.emit('speakerVolumeChanged', { volume });
    console.log(`🔊 Speaker volume set to: ${Math.round(volume * 100)}%`);
    
    return { success: true, volume };
  }
  
  // Update media constraints
  updateConstraints(newConstraints) {
    this.currentConstraints = {
      ...this.currentConstraints,
      ...newConstraints
    };
    
    this.emit('constraintsUpdated', { constraints: this.currentConstraints });
    console.log('📝 Media constraints updated');
    
    return { success: true };
  }
  
  // Update quality settings
  updateQualitySettings(newSettings) {
    this.qualitySettings = {
      ...this.qualitySettings,
      ...newSettings
    };
    
    this.emit('qualitySettingsUpdated', { settings: this.qualitySettings });
    console.log('⚙️ Quality settings updated');
    
    return { success: true };
  }
  
  // Apply mobile optimizations
  applyMobileOptimizations() {
    console.log('📱 Applying mobile optimizations...');
    
    // Optimize audio constraints for mobile
    this.currentConstraints.audio = {
      ...this.currentConstraints.audio,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000, // Lower sample rate for mobile
      channelCount: 1
    };
    
    // Reduce quality settings for mobile
    this.qualitySettings.sampleRate = 16000;
    this.qualitySettings.bitrate = 32000; // 32 kbps for mobile
    
    // iOS specific optimizations
    if (this.isIOS) {
      this.currentConstraints.audio.echoCancellation = false; // iOS handles this natively
    }
    
    this.emit('mobileOptimizationsApplied', {
      isMobile: this.isMobile,
      isIOS: this.isIOS,
      isAndroid: this.isAndroid
    });
  }
  
  // Detect mobile device
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  // Detect iOS
  detectIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  
  // Detect Android
  detectAndroid() {
    return /Android/i.test(navigator.userAgent);
  }
  
  // Get media error message
  getMediaErrorMessage(error) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Microphone access denied. Please allow microphone permissions.';
      case 'NotFoundError':
        return 'No microphone found. Please connect a microphone.';
      case 'NotReadableError':
        return 'Microphone is being used by another application.';
      case 'OverconstrainedError':
        return 'Microphone constraints cannot be satisfied.';
      case 'SecurityError':
        return 'Microphone access blocked due to security policy.';
      case 'AbortError':
        return 'Microphone access aborted.';
      default:
        return `Microphone error: ${error.message}`;
    }
  }
  
  // Get current status
  getStatus() {
    return {
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream,
      isMonitoring: !!this.volumeMonitorInterval,
      audioContextState: this.audioContext?.state || 'unavailable',
      devices: {
        available: this.availableDevices,
        selected: this.selectedDevices
      },
      constraints: this.currentConstraints,
      qualitySettings: this.qualitySettings,
      volumeLevels: { ...this.volumeLevels },
      platform: {
        isMobile: this.isMobile,
        isIOS: this.isIOS,
        isAndroid: this.isAndroid
      }
    };
  }
  
  // Cleanup and release resources
  cleanup() {
    console.log('🧹 Cleaning up MediaManager...');
    
    // Stop volume monitoring
    this.stopVolumeMonitoring();
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clean up audio elements
    if (this.localAudio) {
      this.localAudio.srcObject = null;
      this.localAudio.remove();
      this.localAudio = null;
    }
    
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
      this.remoteAudio.remove();
      this.remoteAudio = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Remove device change listener
    if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
    }
    
    this.emit('cleanup', { timestamp: new Date().toISOString() });
  }
  
  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event listener:`, error);
        }
      });
    }
  }
  
  // Destroy instance
  destroy() {
    this.cleanup();
    this.listeners.clear();
  }
}

export default MediaManager;