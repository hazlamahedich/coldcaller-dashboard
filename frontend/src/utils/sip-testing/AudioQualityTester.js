/**
 * Audio Quality Tester - Comprehensive audio testing and quality analysis for SIP calls
 * Provides real-time audio quality measurement, codec testing, and audio diagnostics
 */

class AudioQualityTester {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.isRecording = false;
    this.testResults = new Map();
    this.eventCallbacks = {};
    
    // Audio quality metrics
    this.qualityMetrics = {
      volumeLevel: 0,
      frequencySpectrum: null,
      noiseLevel: 0,
      clarity: 0,
      mos: 0, // Mean Opinion Score
      thd: 0, // Total Harmonic Distortion
      snr: 0, // Signal to Noise Ratio
      dynamicRange: 0
    };

    // Test configuration
    this.testConfig = {
      sampleRate: 48000,
      bufferSize: 4096,
      analysisInterval: 100,
      testDuration: 10000,
      frequencyBands: {
        bass: [20, 250],
        mid: [250, 4000],
        treble: [4000, 20000],
        voice: [300, 3400] // Human voice frequency range
      },
      qualityThresholds: {
        excellent: { snr: 40, thd: 0.1, clarity: 90 },
        good: { snr: 30, thd: 0.5, clarity: 80 },
        fair: { snr: 20, thd: 1.0, clarity: 70 },
        poor: { snr: 10, thd: 2.0, clarity: 60 }
      }
    };

    // Codec support testing
    this.codecTests = {
      'audio/opus': { bitrates: [32000, 64000, 128000], quality: 'excellent' },
      'audio/PCMU': { bitrates: [64000], quality: 'good' },
      'audio/PCMA': { bitrates: [64000], quality: 'good' },
      'audio/G722': { bitrates: [64000], quality: 'very-good' },
      'audio/GSM': { bitrates: [13000], quality: 'fair' },
      'audio/iLBC': { bitrates: [15200], quality: 'fair' }
    };

    this.initializeAudioContext();
  }

  /**
   * Initialize Web Audio API context
   */
  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      console.log('🎵 Audio context initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error);
    }
  }

  /**
   * Register event callback
   */
  on(event, callback) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => callback(data));
    }
  }

  /**
   * Run comprehensive audio quality test
   */
  async runAudioQualityTest(options = {}) {
    const testId = `audio-test-${Date.now()}`;
    console.log('🎵 Starting comprehensive audio quality test...');

    const results = {
      testId,
      startTime: Date.now(),
      options,
      tests: {},
      summary: {
        overall: 'unknown',
        score: 0,
        issues: [],
        recommendations: []
      }
    };

    try {
      this.emit('testStarted', { testId });

      // 1. Microphone access and capabilities test
      this.emit('testProgress', { testId, test: 'microphone', status: 'running' });
      results.tests.microphone = await this.testMicrophoneCapabilities();

      // 2. Speaker/output test
      this.emit('testProgress', { testId, test: 'speaker', status: 'running' });
      results.tests.speaker = await this.testSpeakerCapabilities();

      // 3. Codec support test
      this.emit('testProgress', { testId, test: 'codecs', status: 'running' });
      results.tests.codecs = await this.testCodecSupport();

      // 4. Audio quality analysis
      if (results.tests.microphone.available) {
        this.emit('testProgress', { testId, test: 'quality', status: 'running' });
        results.tests.quality = await this.analyzeAudioQuality(options.duration || this.testConfig.testDuration);
      }

      // 5. Echo and feedback test
      this.emit('testProgress', { testId, test: 'echo', status: 'running' });
      results.tests.echo = await this.testEchoAndFeedback();

      // 6. Latency test
      this.emit('testProgress', { testId, test: 'latency', status: 'running' });
      results.tests.latency = await this.testAudioLatency();

      // Calculate overall results
      results.summary = this.calculateAudioSummary(results.tests);
      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;

      // Store results
      this.testResults.set(testId, results);

      this.emit('testCompleted', results);
      console.log('✅ Audio quality test completed:', results.summary);

      return results;

    } catch (error) {
      console.error('❌ Audio quality test failed:', error);
      results.summary.overall = 'error';
      results.summary.issues.push(`Test failed: ${error.message}`);
      results.endTime = Date.now();

      this.emit('testFailed', { testId, error: error.message });
      return results;
    }
  }

  /**
   * Test microphone capabilities
   */
  async testMicrophoneCapabilities() {
    const result = {
      available: false,
      devices: [],
      permissions: 'unknown',
      sampleRates: [],
      channelCount: 0,
      capabilities: {}
    };

    try {
      // Check for microphone permissions and availability
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.testConfig.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      result.available = true;
      result.permissions = 'granted';

      // Get audio track capabilities
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        result.capabilities = audioTrack.getCapabilities();
        result.channelCount = audioTrack.getSettings().channelCount;
        
        if (result.capabilities.sampleRate) {
          result.sampleRates = [result.capabilities.sampleRate.min, result.capabilities.sampleRate.max];
        }
      }

      // Get available audio input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      result.devices = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label,
          groupId: device.groupId
        }));

      // Clean up
      stream.getTracks().forEach(track => track.stop());

      return result;

    } catch (error) {
      result.available = false;
      result.permissions = error.name === 'NotAllowedError' ? 'denied' : 'unknown';
      result.error = error.message;
      return result;
    }
  }

  /**
   * Test speaker capabilities
   */
  async testSpeakerCapabilities() {
    const result = {
      available: false,
      devices: [],
      testTone: false,
      volumeControl: false,
      capabilities: {}
    };

    try {
      // Get available audio output devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      result.devices = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label,
          groupId: device.groupId
        }));

      result.available = result.devices.length > 0;

      // Test tone generation
      if (this.audioContext) {
        result.testTone = await this.playTestTone(440, 0.1, 500); // A4 note for 500ms
      }

      // Check for volume control support
      result.volumeControl = 'setSinkId' in HTMLMediaElement.prototype;

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Test codec support
   */
  async testCodecSupport() {
    const result = {
      supported: [],
      recommended: [],
      quality: {}
    };

    try {
      for (const [mimeType, config] of Object.entries(this.codecTests)) {
        const support = {
          mimeType,
          supported: false,
          quality: config.quality,
          bitrates: []
        };

        // Check if codec is supported
        if (window.MediaRecorder && MediaRecorder.isTypeSupported(mimeType)) {
          support.supported = true;
          
          // Test different bitrates
          for (const bitrate of config.bitrates) {
            try {
              const options = { mimeType, audioBitsPerSecond: bitrate };
              if (MediaRecorder.isTypeSupported(mimeType + `;codecs=${mimeType.split('/')[1]}`)) {
                support.bitrates.push(bitrate);
              }
            } catch (error) {
              // Bitrate not supported
            }
          }
        }

        if (support.supported) {
          result.supported.push(support);
          
          if (['excellent', 'very-good', 'good'].includes(config.quality)) {
            result.recommended.push(support);
          }
        }

        result.quality[mimeType] = support;
      }

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Analyze audio quality in real-time
   */
  async analyzeAudioQuality(duration = 10000) {
    const result = {
      duration,
      metrics: {
        volume: { min: 0, max: 0, average: 0 },
        frequency: { spectrum: [], dominantFreq: 0 },
        noise: { level: 0, snr: 0 },
        clarity: 0,
        mos: 0
      },
      quality: 'unknown',
      samples: []
    };

    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.testConfig.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false, // Disable for accurate noise measurement
          autoGainControl: false
        }
      });

      // Set up audio analysis
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.testConfig.bufferSize;
      this.analyser.smoothingTimeConstant = 0.8;
      
      source.connect(this.analyser);

      // Analysis data arrays
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const frequencyData = new Float32Array(bufferLength);
      
      const volumeSamples = [];
      const noiseSamples = [];
      const claritySamples = [];

      // Analysis loop
      const startTime = Date.now();
      const analysisInterval = setInterval(() => {
        // Get frequency data
        this.analyser.getByteFrequencyData(dataArray);
        this.analyser.getFloatFrequencyData(frequencyData);

        // Calculate volume (RMS)
        const rms = Math.sqrt(dataArray.reduce((acc, val) => acc + (val * val), 0) / bufferLength);
        const volume = Math.round((rms / 255) * 100);
        volumeSamples.push(volume);

        // Analyze frequency spectrum
        const spectrum = this.analyzeFrequencySpectrum(dataArray);
        
        // Calculate noise level
        const noiseLevel = this.calculateNoiseLevel(frequencyData);
        noiseSamples.push(noiseLevel);

        // Calculate clarity (high frequency content vs noise)
        const clarity = this.calculateAudioClarity(dataArray, noiseLevel);
        claritySamples.push(clarity);

        // Store sample
        result.samples.push({
          timestamp: Date.now() - startTime,
          volume,
          spectrum: spectrum.bands,
          dominantFreq: spectrum.dominantFreq,
          noise: noiseLevel,
          clarity
        });

        this.emit('qualityUpdate', {
          timestamp: Date.now() - startTime,
          volume,
          spectrum,
          noise: noiseLevel,
          clarity
        });

      }, this.testConfig.analysisInterval);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(analysisInterval);

      // Calculate final metrics
      if (volumeSamples.length > 0) {
        result.metrics.volume.min = Math.min(...volumeSamples);
        result.metrics.volume.max = Math.max(...volumeSamples);
        result.metrics.volume.average = Math.round(volumeSamples.reduce((a, b) => a + b) / volumeSamples.length);
      }

      if (noiseSamples.length > 0) {
        result.metrics.noise.level = Math.round(noiseSamples.reduce((a, b) => a + b) / noiseSamples.length);
        result.metrics.noise.snr = result.metrics.volume.average - result.metrics.noise.level;
      }

      if (claritySamples.length > 0) {
        result.metrics.clarity = Math.round(claritySamples.reduce((a, b) => a + b) / claritySamples.length);
      }

      // Calculate MOS score
      result.metrics.mos = this.calculateMOS(result.metrics);

      // Determine overall quality
      result.quality = this.assessAudioQuality(result.metrics);

      // Clean up
      stream.getTracks().forEach(track => track.stop());
      source.disconnect();

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Test for echo and feedback
   */
  async testEchoAndFeedback() {
    const result = {
      echoDetected: false,
      echoDelay: 0,
      feedbackRisk: 'low',
      recommendations: []
    };

    try {
      // This is a simplified echo detection
      // Real echo detection would require more sophisticated analysis
      
      // Get microphone and speaker streams
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up analysis
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Generate test tone
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.frequency.value = 1000; // 1kHz test tone
      gainNode.gain.value = 0.1; // Low volume
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start();
      
      // Monitor for echo
      let echoDetected = false;
      let maxVolume = 0;
      
      const monitoringTime = 3000; // 3 seconds
      const checkInterval = 100;
      const checks = monitoringTime / checkInterval;
      
      for (let i = 0; i < checks; i++) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
        
        if (volume > maxVolume) {
          maxVolume = volume;
        }
        
        // Simple echo detection - if we detect significant volume increase
        if (volume > 100) { // Threshold for potential echo/feedback
          echoDetected = true;
        }
      }
      
      oscillator.stop();
      
      result.echoDetected = echoDetected;
      result.feedbackRisk = echoDetected ? 'high' : (maxVolume > 50 ? 'medium' : 'low');
      
      if (echoDetected) {
        result.recommendations.push('Enable echo cancellation');
        result.recommendations.push('Reduce speaker volume');
        result.recommendations.push('Use headphones to prevent feedback');
      }
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
      source.disconnect();

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Test audio latency
   */
  async testAudioLatency() {
    const result = {
      inputLatency: 0,
      outputLatency: 0,
      totalLatency: 0,
      quality: 'unknown'
    };

    try {
      // Get base latency from audio context
      if (this.audioContext.baseLatency) {
        result.outputLatency = Math.round(this.audioContext.baseLatency * 1000); // Convert to ms
      }

      if (this.audioContext.outputLatency) {
        result.outputLatency += Math.round(this.audioContext.outputLatency * 1000);
      }

      // Estimate input latency (harder to measure precisely)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = stream.getAudioTracks()[0];
      
      if (audioTrack.getSettings) {
        const settings = audioTrack.getSettings();
        // Estimate based on buffer size and sample rate
        if (settings.sampleRate && settings.channelCount) {
          result.inputLatency = Math.round((this.testConfig.bufferSize / settings.sampleRate) * 1000);
        }
      }

      result.totalLatency = result.inputLatency + result.outputLatency;

      // Assess latency quality
      if (result.totalLatency < 50) {
        result.quality = 'excellent';
      } else if (result.totalLatency < 100) {
        result.quality = 'good';
      } else if (result.totalLatency < 200) {
        result.quality = 'fair';
      } else {
        result.quality = 'poor';
      }

      stream.getTracks().forEach(track => track.stop());

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Play test tone
   */
  async playTestTone(frequency, volume, duration) {
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.frequency.value = frequency;
      gainNode.gain.value = volume;
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start();
      
      await new Promise(resolve => setTimeout(resolve, duration));
      
      oscillator.stop();
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Analyze frequency spectrum
   */
  analyzeFrequencySpectrum(dataArray) {
    const bands = {
      bass: 0,
      mid: 0,
      treble: 0,
      voice: 0
    };

    const nyquist = this.testConfig.sampleRate / 2;
    const binSize = nyquist / dataArray.length;

    let dominantFreq = 0;
    let maxAmplitude = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const frequency = i * binSize;
      const amplitude = dataArray[i];

      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude;
        dominantFreq = frequency;
      }

      // Categorize into frequency bands
      if (frequency >= this.testConfig.frequencyBands.bass[0] && frequency <= this.testConfig.frequencyBands.bass[1]) {
        bands.bass += amplitude;
      } else if (frequency >= this.testConfig.frequencyBands.mid[0] && frequency <= this.testConfig.frequencyBands.mid[1]) {
        bands.mid += amplitude;
      } else if (frequency >= this.testConfig.frequencyBands.treble[0] && frequency <= this.testConfig.frequencyBands.treble[1]) {
        bands.treble += amplitude;
      }

      if (frequency >= this.testConfig.frequencyBands.voice[0] && frequency <= this.testConfig.frequencyBands.voice[1]) {
        bands.voice += amplitude;
      }
    }

    return { bands, dominantFreq: Math.round(dominantFreq) };
  }

  /**
   * Calculate noise level
   */
  calculateNoiseLevel(frequencyData) {
    // Calculate noise floor as the average of the lowest frequency bins
    const noiseFloorBins = frequencyData.slice(0, Math.floor(frequencyData.length * 0.1));
    const noiseFloor = noiseFloorBins.reduce((acc, val) => acc + val, 0) / noiseFloorBins.length;
    
    // Convert to percentage (0-100)
    return Math.max(0, Math.round((noiseFloor + 100) * 0.5)); // Rough conversion
  }

  /**
   * Calculate audio clarity
   */
  calculateAudioClarity(dataArray, noiseLevel) {
    // Calculate clarity as ratio of signal energy to noise
    const totalEnergy = dataArray.reduce((acc, val) => acc + (val * val), 0);
    const signalEnergy = Math.sqrt(totalEnergy / dataArray.length);
    
    const clarity = Math.max(0, 100 - (noiseLevel / signalEnergy) * 100);
    return Math.round(clarity);
  }

  /**
   * Calculate MOS (Mean Opinion Score)
   */
  calculateMOS(metrics) {
    let mos = 4.5; // Start with excellent

    // Factor in SNR
    if (metrics.noise.snr < 20) {
      mos -= 1.5;
    } else if (metrics.noise.snr < 30) {
      mos -= 0.5;
    }

    // Factor in clarity
    if (metrics.clarity < 60) {
      mos -= 1.0;
    } else if (metrics.clarity < 80) {
      mos -= 0.3;
    }

    // Factor in volume consistency
    const volumeRange = metrics.volume.max - metrics.volume.min;
    if (volumeRange > 50) {
      mos -= 0.5; // High volume variation
    }

    return Math.max(1.0, Math.min(4.5, Number(mos.toFixed(1))));
  }

  /**
   * Assess overall audio quality
   */
  assessAudioQuality(metrics) {
    const thresholds = this.testConfig.qualityThresholds;
    
    if (metrics.noise.snr >= thresholds.excellent.snr && metrics.clarity >= thresholds.excellent.clarity) {
      return 'excellent';
    } else if (metrics.noise.snr >= thresholds.good.snr && metrics.clarity >= thresholds.good.clarity) {
      return 'good';
    } else if (metrics.noise.snr >= thresholds.fair.snr && metrics.clarity >= thresholds.fair.clarity) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Calculate audio test summary
   */
  calculateAudioSummary(tests) {
    const summary = {
      overall: 'unknown',
      score: 0,
      issues: [],
      recommendations: []
    };

    let totalScore = 0;
    let scoreCount = 0;

    // Scoring weights
    const weights = {
      microphone: 0.25,
      speaker: 0.15,
      codecs: 0.15,
      quality: 0.3,
      echo: 0.1,
      latency: 0.05
    };

    // Score each test
    for (const [testName, testResult] of Object.entries(tests)) {
      if (!testResult) continue;

      let score = 0;
      const weight = weights[testName] || 0.1;

      switch (testName) {
        case 'microphone':
          score = testResult.available ? 100 : 0;
          if (!testResult.available) {
            summary.issues.push('Microphone not accessible');
            summary.recommendations.push('Enable microphone permissions');
          }
          break;

        case 'speaker':
          score = testResult.available ? (testResult.testTone ? 100 : 80) : 0;
          if (!testResult.available) {
            summary.issues.push('No audio output devices found');
          }
          break;

        case 'codecs':
          score = (testResult.supported.length / Object.keys(this.codecTests).length) * 100;
          if (testResult.recommended.length === 0) {
            summary.recommendations.push('Install additional audio codecs for better quality');
          }
          break;

        case 'quality':
          const qualityScoring = { excellent: 100, good: 80, fair: 60, poor: 30 };
          score = qualityScoring[testResult.quality] || 0;
          
          if (testResult.metrics.noise.snr < 20) {
            summary.issues.push(`Low signal-to-noise ratio: ${testResult.metrics.noise.snr}dB`);
            summary.recommendations.push('Use noise cancellation or find quieter environment');
          }
          
          if (testResult.metrics.clarity < 70) {
            summary.issues.push(`Poor audio clarity: ${testResult.metrics.clarity}%`);
            summary.recommendations.push('Check microphone quality and positioning');
          }
          break;

        case 'echo':
          score = testResult.echoDetected ? 30 : (testResult.feedbackRisk === 'high' ? 60 : 100);
          
          if (testResult.echoDetected) {
            summary.issues.push('Echo detected');
            summary.recommendations.push(...testResult.recommendations);
          }
          break;

        case 'latency':
          const latencyScoring = { excellent: 100, good: 80, fair: 60, poor: 30 };
          score = latencyScoring[testResult.quality] || 0;
          
          if (testResult.totalLatency > 150) {
            summary.issues.push(`High audio latency: ${testResult.totalLatency}ms`);
            summary.recommendations.push('Use lower buffer sizes for reduced latency');
          }
          break;
      }

      totalScore += score * weight;
      scoreCount += weight;
    }

    // Calculate final score
    summary.score = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    // Determine overall quality
    if (summary.score >= 90) {
      summary.overall = 'excellent';
    } else if (summary.score >= 75) {
      summary.overall = 'good';
    } else if (summary.score >= 60) {
      summary.overall = 'fair';
    } else {
      summary.overall = 'poor';
    }

    return summary;
  }

  /**
   * Get test results by ID
   */
  getTestResults(testId) {
    return this.testResults.get(testId);
  }

  /**
   * Get current quality metrics
   */
  getCurrentMetrics() {
    return this.qualityMetrics;
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.testResults.clear();
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.clearResults();
    this.eventCallbacks = {};

    console.log('🗑️ Audio Quality Tester destroyed');
  }
}

export default AudioQualityTester;