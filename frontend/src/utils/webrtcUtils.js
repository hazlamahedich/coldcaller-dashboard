// WebRTC Utility Functions
// Comprehensive WebRTC helper functions for SIP.js integration
// Handles browser compatibility, media constraints, connection optimization, and debugging

// Browser compatibility detection
export const browserSupport = {
  // Check WebRTC support
  hasWebRTC: () => {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  },
  
  // Check specific WebRTC features
  hasFeature: (feature) => {
    const features = {
      getUserMedia: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      enumerateDevices: () => !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
      setSinkId: () => {
        const audio = document.createElement('audio');
        return typeof audio.setSinkId === 'function';
      },
      getStats: () => {
        try {
          const pc = new RTCPeerConnection();
          const hasGetStats = typeof pc.getStats === 'function';
          pc.close();
          return hasGetStats;
        } catch (e) {
          return false;
        }
      },
      addTransceiver: () => {
        try {
          const pc = new RTCPeerConnection();
          const hasAddTransceiver = typeof pc.addTransceiver === 'function';
          pc.close();
          return hasAddTransceiver;
        } catch (e) {
          return false;
        }
      }
    };
    
    return features[feature] ? features[feature]() : false;
  },
  
  // Get browser info
  getBrowserInfo: () => {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    
    if (ua.includes('Chrome') && !ua.includes('Edge')) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Edge')) {
      browser = 'Edge';
      const match = ua.match(/Edge\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    
    return { browser, version, userAgent: ua };
  },
  
  // Check mobile device
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
};

// Media constraints optimization
export const mediaConstraints = {
  // Get optimized audio constraints
  getAudioConstraints: (options = {}) => {
    const base = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };
    
    // Browser-specific optimizations
    const browserInfo = browserSupport.getBrowserInfo();
    
    if (browserInfo.browser === 'Chrome') {
      Object.assign(base, {
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
        googAudioMirroring: false
      });
    }
    
    // Mobile optimizations
    if (browserSupport.isMobile()) {
      Object.assign(base, {
        sampleRate: 16000,
        channelCount: 1
      });
    }
    
    // Apply custom options
    return { ...base, ...options };
  },
  
  // Get video constraints (if needed)
  getVideoConstraints: (options = {}) => {
    const base = {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 15 }
    };
    
    if (browserSupport.isMobile()) {
      Object.assign(base, {
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 10 }
      });
    }
    
    return { ...base, ...options };
  },
  
  // Build complete media constraints
  buildConstraints: (audio = true, video = false, options = {}) => {
    const constraints = {};
    
    if (audio) {
      constraints.audio = typeof audio === 'object' 
        ? mediaConstraints.getAudioConstraints(audio)
        : mediaConstraints.getAudioConstraints();
    }
    
    if (video) {
      constraints.video = typeof video === 'object'
        ? mediaConstraints.getVideoConstraints(video)
        : mediaConstraints.getVideoConstraints();
    }
    
    return constraints;
  }
};

// ICE server configurations
export const iceServers = {
  // Default STUN servers
  getDefaultSTUN: () => [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  
  // Provider-specific STUN/TURN servers
  getProviderServers: (provider) => {
    const providers = {
      twilio: [
        { urls: 'stun:global.stun.twilio.com:3478' }
      ],
      google: [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
      mozilla: [
        { urls: 'stun:stun.services.mozilla.com:3478' }
      ]
    };
    
    return providers[provider] || iceServers.getDefaultSTUN();
  },
  
  // Build RTCConfiguration
  buildRTCConfiguration: (customServers = [], options = {}) => {
    const defaultConfig = {
      iceServers: [
        ...iceServers.getDefaultSTUN(),
        ...customServers
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require'
    };
    
    return { ...defaultConfig, ...options };
  }
};

// Audio analysis utilities
export const audioAnalysis = {
  // Create audio analyzer
  createAnalyzer: (audioContext, stream, options = {}) => {
    if (!audioContext || !stream) return null;
    
    try {
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      
      analyzer.fftSize = options.fftSize || 256;
      analyzer.smoothingTimeConstant = options.smoothing || 0.8;
      analyzer.minDecibels = options.minDb || -90;
      analyzer.maxDecibels = options.maxDb || -10;
      
      source.connect(analyzer);
      
      return { source, analyzer };
    } catch (error) {
      console.error('Failed to create audio analyzer:', error);
      return null;
    }
  },
  
  // Get volume level
  getVolumeLevel: (analyzer) => {
    if (!analyzer) return 0;
    
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzer.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    
    return sum / bufferLength / 255; // Normalize to 0-1
  },
  
  // Detect silence
  detectSilence: (analyzer, threshold = 0.01, duration = 3000) => {
    let silenceStart = null;
    
    return () => {
      const volume = audioAnalysis.getVolumeLevel(analyzer);
      const now = Date.now();
      
      if (volume < threshold) {
        if (silenceStart === null) {
          silenceStart = now;
        }
        return now - silenceStart > duration;
      } else {
        silenceStart = null;
        return false;
      }
    };
  },
  
  // Get frequency data
  getFrequencyData: (analyzer) => {
    if (!analyzer) return [];
    
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzer.getByteFrequencyData(dataArray);
    
    return Array.from(dataArray);
  }
};

// Connection quality monitoring
export const connectionMonitoring = {
  // Monitor connection quality
  monitorConnection: async (peerConnection, interval = 2000) => {
    if (!peerConnection) return null;
    
    const monitor = {
      isRunning: false,
      interval: null,
      stats: {
        packetsLost: 0,
        jitter: 0,
        roundTripTime: 0,
        bytesReceived: 0,
        bytesSent: 0,
        timestamp: Date.now()
      },
      callbacks: []
    };
    
    const collectStats = async () => {
      if (!monitor.isRunning) return;
      
      try {
        const stats = await peerConnection.getStats();
        const newStats = connectionMonitoring.parseStats(stats);
        
        // Calculate deltas
        const timeDelta = newStats.timestamp - monitor.stats.timestamp;
        const receivedDelta = newStats.bytesReceived - monitor.stats.bytesReceived;
        const sentDelta = newStats.bytesSent - monitor.stats.bytesSent;
        
        const quality = {
          ...newStats,
          bandwidth: {
            received: timeDelta > 0 ? (receivedDelta * 8) / (timeDelta / 1000) : 0, // bps
            sent: timeDelta > 0 ? (sentDelta * 8) / (timeDelta / 1000) : 0 // bps
          },
          qualityScore: connectionMonitoring.calculateQualityScore(newStats)
        };
        
        monitor.stats = newStats;
        
        // Notify callbacks
        monitor.callbacks.forEach(callback => {
          try {
            callback(quality);
          } catch (error) {
            console.error('Error in connection monitor callback:', error);
          }
        });
        
      } catch (error) {
        console.error('Failed to collect connection stats:', error);
      }
    };
    
    monitor.start = () => {
      if (monitor.isRunning) return;
      
      monitor.isRunning = true;
      monitor.interval = setInterval(collectStats, interval);
      collectStats(); // Initial collection
    };
    
    monitor.stop = () => {
      if (!monitor.isRunning) return;
      
      monitor.isRunning = false;
      if (monitor.interval) {
        clearInterval(monitor.interval);
        monitor.interval = null;
      }
    };
    
    monitor.onUpdate = (callback) => {
      monitor.callbacks.push(callback);
    };
    
    return monitor;
  },
  
  // Parse WebRTC stats
  parseStats: (stats) => {
    const result = {
      packetsLost: 0,
      packetsReceived: 0,
      packetsSent: 0,
      jitter: 0,
      roundTripTime: 0,
      bytesReceived: 0,
      bytesSent: 0,
      audioLevel: 0,
      timestamp: Date.now()
    };
    
    stats.forEach((report) => {
      switch (report.type) {
        case 'inbound-rtp':
          if (report.mediaType === 'audio') {
            result.packetsLost += report.packetsLost || 0;
            result.packetsReceived += report.packetsReceived || 0;
            result.jitter = Math.max(result.jitter, report.jitter || 0);
            result.bytesReceived += report.bytesReceived || 0;
            result.audioLevel = Math.max(result.audioLevel, report.audioLevel || 0);
          }
          break;
          
        case 'outbound-rtp':
          if (report.mediaType === 'audio') {
            result.packetsSent += report.packetsSent || 0;
            result.bytesSent += report.bytesSent || 0;
          }
          break;
          
        case 'candidate-pair':
          if (report.state === 'succeeded') {
            result.roundTripTime = Math.max(result.roundTripTime, report.currentRoundTripTime || 0);
          }
          break;
      }
    });
    
    return result;
  },
  
  // Calculate quality score (1-5 scale)
  calculateQualityScore: (stats) => {
    let score = 5;
    
    // Packet loss penalty
    const lossRate = stats.packetsReceived > 0 
      ? stats.packetsLost / (stats.packetsReceived + stats.packetsLost)
      : 0;
    
    if (lossRate > 0.05) score -= 2;      // >5% loss
    else if (lossRate > 0.02) score -= 1; // >2% loss
    else if (lossRate > 0.01) score -= 0.5; // >1% loss
    
    // Jitter penalty
    if (stats.jitter > 0.1) score -= 1;      // >100ms jitter
    else if (stats.jitter > 0.05) score -= 0.5; // >50ms jitter
    
    // RTT penalty
    if (stats.roundTripTime > 0.3) score -= 1;    // >300ms RTT
    else if (stats.roundTripTime > 0.15) score -= 0.5; // >150ms RTT
    
    // Audio level check
    if (stats.audioLevel < 0.1) score -= 0.5; // Low audio level
    
    return Math.max(1, Math.min(5, Math.round(score * 2) / 2));
  }
};

// Network diagnostics
export const networkDiagnostics = {
  // Test network connectivity
  testConnectivity: async (servers = iceServers.getDefaultSTUN()) => {
    const results = await Promise.allSettled(
      servers.map(server => networkDiagnostics.testSTUNServer(server.urls))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const total = results.length;
    
    return {
      success: successful > 0,
      successRate: successful / total,
      results: results.map((r, i) => ({
        server: servers[i].urls,
        success: r.status === 'fulfilled',
        error: r.status === 'rejected' ? r.reason?.message : null
      }))
    };
  },
  
  // Test individual STUN server
  testSTUNServer: (stunUrl, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: stunUrl }]
      });
      
      const timer = setTimeout(() => {
        pc.close();
        reject(new Error('STUN test timeout'));
      }, timeout);
      
      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.type === 'srflx') {
          clearTimeout(timer);
          pc.close();
          resolve({
            server: stunUrl,
            publicIP: event.candidate.address,
            port: event.candidate.port
          });
        }
      };
      
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          pc.close();
          reject(new Error('No reflexive candidates found'));
        }
      };
      
      // Create data channel to trigger ICE gathering
      pc.createDataChannel('test');
      
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(error => {
          clearTimeout(timer);
          pc.close();
          reject(error);
        });
    });
  },
  
  // Measure network latency
  measureLatency: async (url = 'https://www.google.com/favicon.ico', samples = 3) => {
    const measurements = [];
    
    for (let i = 0; i < samples; i++) {
      try {
        const start = performance.now();
        await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        const end = performance.now();
        measurements.push(end - start);
      } catch (error) {
        // Ignore individual failures
      }
      
      // Small delay between measurements
      if (i < samples - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (measurements.length === 0) {
      throw new Error('All latency measurements failed');
    }
    
    const average = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    
    return { average, min, max, samples: measurements.length };
  }
};

// Debug utilities
export const debugUtils = {
  // Log WebRTC stats in readable format
  logStats: (stats) => {
    console.group('📊 WebRTC Connection Stats');
    console.log('Packets Lost:', stats.packetsLost);
    console.log('Packets Received:', stats.packetsReceived);
    console.log('Packets Sent:', stats.packetsSent);
    console.log('Jitter:', `${(stats.jitter * 1000).toFixed(2)}ms`);
    console.log('Round Trip Time:', `${(stats.roundTripTime * 1000).toFixed(2)}ms`);
    console.log('Bytes Received:', stats.bytesReceived);
    console.log('Bytes Sent:', stats.bytesSent);
    console.log('Audio Level:', (stats.audioLevel * 100).toFixed(1) + '%');
    console.log('Quality Score:', stats.qualityScore || 'N/A');
    console.groupEnd();
  },
  
  // Create debug panel
  createDebugPanel: () => {
    const panel = document.createElement('div');
    panel.id = 'webrtc-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      background: rgba(0,0,0,0.8);
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
      max-height: 400px;
      overflow-y: auto;
    `;
    
    const title = document.createElement('div');
    title.textContent = '📊 WebRTC Debug';
    title.style.cssText = 'font-weight: bold; margin-bottom: 10px;';
    panel.appendChild(title);
    
    const content = document.createElement('div');
    content.id = 'webrtc-debug-content';
    panel.appendChild(content);
    
    document.body.appendChild(panel);
    
    return {
      panel,
      update: (data) => {
        content.innerHTML = Object.entries(data)
          .map(([key, value]) => `${key}: ${value}`)
          .join('<br>');
      },
      remove: () => {
        if (panel.parentNode) {
          panel.parentNode.removeChild(panel);
        }
      }
    };
  },
  
  // Enable WebRTC logging
  enableWebRTCLogging: () => {
    if (typeof webkitRTCPeerConnection !== 'undefined') {
      // Chrome
      const originalAddIceCandidate = webkitRTCPeerConnection.prototype.addIceCandidate;
      webkitRTCPeerConnection.prototype.addIceCandidate = function(candidate, success, error) {
        console.log('🧊 ICE Candidate:', candidate);
        return originalAddIceCandidate.call(this, candidate, success, error);
      };
    }
    
    // Enable verbose WebRTC logging in Chrome
    if (window.chrome && window.chrome.webstore) {
      localStorage.setItem('enableWebRTCLogging', 'true');
      console.log('🔍 WebRTC verbose logging enabled (Chrome)');
    }
  }
};

// Error handling utilities
export const errorHandling = {
  // WebRTC error codes
  errorCodes: {
    'NotFoundError': 'No media devices found',
    'NotAllowedError': 'Media access denied by user',
    'NotReadableError': 'Media device is already in use',
    'OverconstrainedError': 'Media constraints cannot be satisfied',
    'SecurityError': 'Media access blocked by security policy',
    'AbortError': 'Media operation was aborted',
    'NotSupportedError': 'Operation not supported in this browser',
    'TypeError': 'Invalid parameters provided',
    'InvalidStateError': 'Operation called in invalid state'
  },
  
  // Get user-friendly error message
  getErrorMessage: (error) => {
    if (typeof error === 'string') return error;
    if (!error || !error.name) return 'Unknown error occurred';
    
    const message = errorHandling.errorCodes[error.name] || error.message || 'Unknown error';
    return `${message} (${error.name})`;
  },
  
  // Create error handler
  createErrorHandler: (context = 'WebRTC') => {
    return (error) => {
      const message = errorHandling.getErrorMessage(error);
      console.error(`❌ ${context} Error:`, message, error);
      
      // Emit custom event for error handling
      const event = new CustomEvent('webrtcError', {
        detail: { context, error, message }
      });
      window.dispatchEvent(event);
      
      return { success: false, error: message };
    };
  }
};

// Performance optimization
export const performanceOptimization = {
  // Optimize for mobile
  optimizeForMobile: () => {
    if (!browserSupport.isMobile()) return {};
    
    return {
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      iceServers: iceServers.getDefaultSTUN().slice(0, 2), // Limit STUN servers
      iceCandidatePoolSize: 4, // Reduce pool size
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require'
    };
  },
  
  // Optimize for poor network conditions
  optimizeForPoorNetwork: () => {
    return {
      audio: {
        sampleRate: 8000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      iceServers: [iceServers.getDefaultSTUN()[0]], // Single STUN server
      iceCandidatePoolSize: 2,
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require'
    };
  }
};

// Export all utilities
export default {
  browserSupport,
  mediaConstraints,
  iceServers,
  audioAnalysis,
  connectionMonitoring,
  networkDiagnostics,
  debugUtils,
  errorHandling,
  performanceOptimization
};