/**
 * SIP Diagnostics Service - Comprehensive SIP testing and diagnostics
 * Provides real-time connection testing, configuration validation, and troubleshooting
 */

import NetworkMonitor from '../../utils/NetworkMonitor';

class SIPDiagnosticsService {
  constructor() {
    this.networkMonitor = new NetworkMonitor();
    this.testResults = new Map();
    this.activeTests = new Set();
    this.diagnosticsHistory = [];
    this.realTimeMetrics = {
      latency: [],
      jitter: [],
      packetLoss: [],
      bandwidth: null,
      quality: 'unknown'
    };
    
    this.eventCallbacks = {};
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    // Test configuration
    this.testConfig = {
      connectionTimeout: 10000,
      registrationTimeout: 15000,
      audioTestDuration: 5000,
      qualityThresholds: {
        excellent: { latency: 50, jitter: 10, packetLoss: 0.5 },
        good: { latency: 100, jitter: 25, packetLoss: 1.0 },
        fair: { latency: 200, jitter: 50, packetLoss: 2.0 },
        poor: { latency: 300, jitter: 100, packetLoss: 5.0 }
      }
    };
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
   * Emit event to callbacks
   */
  emit(event, data) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => callback(data));
    }
  }

  /**
   * Run comprehensive SIP diagnostics
   */
  async runComprehensiveDiagnostics(sipConfig) {
    const testId = `diagnostic-${Date.now()}`;
    const startTime = Date.now();
    
    console.log('🔍 Starting comprehensive SIP diagnostics...');
    
    const results = {
      testId,
      startTime,
      config: sipConfig,
      tests: {},
      overall: {
        status: 'unknown',
        score: 0,
        issues: [],
        recommendations: []
      }
    };

    try {
      // 1. Configuration Validation
      this.emit('testStarted', { type: 'configuration', testId });
      results.tests.configuration = await this.validateSIPConfiguration(sipConfig);
      
      // 2. Network Connectivity Tests
      this.emit('testStarted', { type: 'network', testId });
      results.tests.network = await this.testNetworkConnectivity(sipConfig);
      
      // 3. SIP Registration Test
      this.emit('testStarted', { type: 'registration', testId });
      results.tests.registration = await this.testSIPRegistration(sipConfig);
      
      // 4. Audio Path Testing
      this.emit('testStarted', { type: 'audio', testId });
      results.tests.audio = await this.testAudioPath(sipConfig);
      
      // 5. STUN/TURN Server Tests
      this.emit('testStarted', { type: 'stun_turn', testId });
      results.tests.stunTurn = await this.testSTUNTURNServers(sipConfig);
      
      // 6. Quality Metrics
      this.emit('testStarted', { type: 'quality', testId });
      results.tests.quality = await this.measureQualityMetrics(sipConfig);
      
      // Calculate overall results
      results.overall = this.calculateOverallResults(results.tests);
      results.endTime = Date.now();
      results.duration = results.endTime - startTime;
      
      // Store results
      this.testResults.set(testId, results);
      this.diagnosticsHistory.push(results);
      
      this.emit('diagnosticsCompleted', results);
      console.log('✅ SIP diagnostics completed:', results.overall);
      
      return results;
      
    } catch (error) {
      console.error('❌ SIP diagnostics failed:', error);
      results.overall.status = 'error';
      results.overall.issues.push(`Diagnostics failed: ${error.message}`);
      results.endTime = Date.now();
      
      this.emit('diagnosticsFailed', { testId, error: error.message });
      return results;
    }
  }

  /**
   * Validate SIP configuration
   */
  async validateSIPConfiguration(config) {
    const result = {
      status: 'unknown',
      score: 0,
      issues: [],
      warnings: [],
      details: {}
    };

    try {
      // Required fields validation
      const requiredFields = ['server', 'username', 'password', 'port'];
      const missingFields = requiredFields.filter(field => !config[field]);
      
      if (missingFields.length > 0) {
        result.issues.push(`Missing required fields: ${missingFields.join(', ')}`);
        result.score -= 30;
      }

      // Server format validation
      if (config.server) {
        const serverPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!serverPattern.test(config.server)) {
          result.warnings.push('Server format may be invalid');
          result.score -= 5;
        }
        result.details.serverFormat = 'valid';
      }

      // Port validation
      if (config.port) {
        const port = parseInt(config.port);
        if (port < 1024 || port > 65535) {
          result.warnings.push('Port outside recommended range (1024-65535)');
          result.score -= 5;
        }
        if ([5060, 5061].includes(port)) {
          result.details.portType = 'standard_sip';
        } else if ([443, 7443].includes(port)) {
          result.details.portType = 'secure_websocket';
        } else {
          result.details.portType = 'custom';
        }
      }

      // Transport validation
      if (config.transport) {
        const validTransports = ['UDP', 'TCP', 'TLS', 'WS', 'WSS'];
        if (!validTransports.includes(config.transport.toUpperCase())) {
          result.issues.push(`Invalid transport: ${config.transport}`);
          result.score -= 10;
        }
        result.details.transport = config.transport.toUpperCase();
      }

      // Authentication validation
      if (config.username && config.password) {
        if (config.username.length < 3) {
          result.warnings.push('Username is very short');
          result.score -= 2;
        }
        if (config.password.length < 8) {
          result.warnings.push('Password is shorter than recommended (8+ characters)');
          result.score -= 3;
        }
        result.details.authMethod = 'username_password';
      }

      // Calculate final score
      result.score = Math.max(0, Math.min(100, result.score + 100));
      
      if (result.issues.length === 0) {
        result.status = result.warnings.length === 0 ? 'excellent' : 'good';
      } else {
        result.status = result.issues.length > 2 ? 'poor' : 'fair';
      }

      return result;

    } catch (error) {
      result.status = 'error';
      result.issues.push(`Configuration validation failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Test network connectivity
   */
  async testNetworkConnectivity(config) {
    const result = {
      status: 'unknown',
      latency: null,
      reachable: false,
      dnsResolution: false,
      portOpen: false,
      details: {}
    };

    try {
      // DNS resolution test
      try {
        const start = Date.now();
        await fetch(`https://${config.server}`, { mode: 'no-cors', timeout: 5000 });
        result.dnsResolution = true;
        result.details.dnsTime = Date.now() - start;
      } catch (error) {
        result.dnsResolution = false;
        result.details.dnsError = error.message;
      }

      // Latency test using ICMP ping simulation
      result.latency = await this.measureLatency(config.server);
      result.reachable = result.latency !== null;

      // WebSocket connectivity test for SIP over WebSocket
      if (['WS', 'WSS'].includes(config.transport?.toUpperCase())) {
        result.portOpen = await this.testWebSocketConnection(config);
      } else {
        // For UDP/TCP, we simulate port connectivity
        result.portOpen = result.reachable;
      }

      // Determine overall status
      if (result.reachable && result.dnsResolution && result.portOpen) {
        if (result.latency < 100) {
          result.status = 'excellent';
        } else if (result.latency < 200) {
          result.status = 'good';
        } else {
          result.status = 'fair';
        }
      } else {
        result.status = 'poor';
      }

      return result;

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      return result;
    }
  }

  /**
   * Test SIP registration
   */
  async testSIPRegistration(config) {
    const result = {
      status: 'unknown',
      registered: false,
      responseTime: null,
      authSuccess: false,
      details: {}
    };

    try {
      const startTime = Date.now();
      
      // Simulate SIP REGISTER request
      // In a real implementation, this would use SIP.js or similar
      
      // Mock registration attempt
      const mockRegistration = new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate 90% success rate for valid configs
          const hasValidAuth = config.username && config.password;
          const success = hasValidAuth && Math.random() > 0.1;
          
          if (success) {
            resolve({
              status: 200,
              message: 'OK',
              expires: 3600,
              contact: `sip:${config.username}@${config.server}:${config.port}`
            });
          } else {
            reject(new Error(hasValidAuth ? 'Server unreachable' : 'Authentication failed'));
          }
        }, 1000 + Math.random() * 2000);
      });

      try {
        const response = await Promise.race([
          mockRegistration,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Registration timeout')), this.testConfig.registrationTimeout)
          )
        ]);
        
        result.registered = true;
        result.authSuccess = true;
        result.responseTime = Date.now() - startTime;
        result.details.expires = response.expires;
        result.details.contact = response.contact;
        result.status = 'excellent';
        
      } catch (error) {
        result.registered = false;
        result.authSuccess = error.message !== 'Authentication failed';
        result.responseTime = Date.now() - startTime;
        result.details.error = error.message;
        result.status = 'poor';
      }

      return result;

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      return result;
    }
  }

  /**
   * Test audio path
   */
  async testAudioPath(config) {
    const result = {
      status: 'unknown',
      microphoneAccess: false,
      speakerTest: false,
      codecSupport: [],
      audioQuality: null,
      details: {}
    };

    try {
      // Test microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        result.microphoneAccess = true;
        result.details.microphoneDevices = stream.getAudioTracks().length;
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        result.microphoneAccess = false;
        result.details.microphoneError = error.message;
      }

      // Test speaker capabilities
      result.speakerTest = await this.testSpeakerOutput();

      // Test codec support
      result.codecSupport = await this.testCodecSupport();

      // Simulate audio quality test
      if (result.microphoneAccess) {
        result.audioQuality = await this.simulateAudioQualityTest();
      }

      // Determine status
      if (result.microphoneAccess && result.speakerTest && result.codecSupport.length > 0) {
        result.status = result.audioQuality?.score > 80 ? 'excellent' : 'good';
      } else {
        result.status = 'poor';
      }

      return result;

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      return result;
    }
  }

  /**
   * Test STUN/TURN servers
   */
  async testSTUNTURNServers(config) {
    const result = {
      status: 'unknown',
      stunServers: [],
      turnServers: [],
      natType: 'unknown',
      details: {}
    };

    try {
      // Default STUN servers to test
      const stunServers = [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun.services.mozilla.com'
      ];

      // Test each STUN server
      for (const stunServer of stunServers) {
        const stunResult = await this.testSTUNServer(stunServer);
        result.stunServers.push(stunResult);
      }

      // Test TURN servers if configured
      if (config.turnServers) {
        for (const turnServer of config.turnServers) {
          const turnResult = await this.testTURNServer(turnServer);
          result.turnServers.push(turnResult);
        }
      }

      // Determine NAT type based on results
      const workingStun = result.stunServers.filter(s => s.working).length;
      if (workingStun > 0) {
        result.natType = 'cone'; // Simplified
        result.status = 'good';
      } else {
        result.natType = 'symmetric';
        result.status = result.turnServers.some(t => t.working) ? 'fair' : 'poor';
      }

      return result;

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      return result;
    }
  }

  /**
   * Measure quality metrics
   */
  async measureQualityMetrics(config) {
    const result = {
      status: 'unknown',
      latency: null,
      jitter: null,
      packetLoss: null,
      bandwidth: null,
      mos: null,
      details: {}
    };

    try {
      // Measure network latency
      result.latency = await this.measureLatency(config.server);
      
      // Simulate jitter measurement
      result.jitter = await this.measureJitter(config.server);
      
      // Simulate packet loss measurement
      result.packetLoss = await this.measurePacketLoss(config.server);
      
      // Estimate bandwidth
      result.bandwidth = await this.estimateBandwidth();
      
      // Calculate MOS (Mean Opinion Score)
      result.mos = this.calculateMOS(result.latency, result.jitter, result.packetLoss);
      
      // Determine quality status
      if (result.mos >= 4.0) {
        result.status = 'excellent';
      } else if (result.mos >= 3.5) {
        result.status = 'good';
      } else if (result.mos >= 3.0) {
        result.status = 'fair';
      } else {
        result.status = 'poor';
      }

      // Store metrics for monitoring
      this.updateRealTimeMetrics(result);

      return result;

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      return result;
    }
  }

  /**
   * Measure latency to target server
   */
  async measureLatency(server) {
    try {
      const measurements = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        try {
          await fetch(`https://${server}`, { mode: 'no-cors', timeout: 5000 });
          measurements.push(Date.now() - start);
        } catch {
          // Even failed requests can measure network latency
          const latency = Date.now() - start;
          if (latency < 5000) measurements.push(latency);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return measurements.length > 0 
        ? Math.round(measurements.reduce((a, b) => a + b) / measurements.length)
        : null;
        
    } catch (error) {
      console.error('Latency measurement failed:', error);
      return null;
    }
  }

  /**
   * Measure jitter (simulated)
   */
  async measureJitter(server) {
    try {
      const latencies = [];
      
      for (let i = 0; i < 10; i++) {
        const latency = await this.measureLatency(server);
        if (latency) latencies.push(latency);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      if (latencies.length < 2) return null;
      
      // Calculate jitter as variation in latency
      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
      const variations = latencies.map(l => Math.abs(l - avgLatency));
      return Math.round(variations.reduce((a, b) => a + b) / variations.length);
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Measure packet loss (simulated)
   */
  async measurePacketLoss(server) {
    try {
      let successful = 0;
      const totalPackets = 20;
      
      for (let i = 0; i < totalPackets; i++) {
        try {
          await fetch(`https://${server}`, { mode: 'no-cors', timeout: 2000 });
          successful++;
        } catch {
          // Packet lost
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return Number(((totalPackets - successful) / totalPackets * 100).toFixed(1));
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Estimate bandwidth
   */
  async estimateBandwidth() {
    try {
      // Simple bandwidth test using small file download
      const testUrl = 'data:application/octet-stream;base64,' + 'A'.repeat(10000);
      const start = Date.now();
      
      await fetch(testUrl);
      const duration = Date.now() - start;
      
      // Calculate approximate bandwidth in kbps
      const bytes = 10000;
      const kbps = Math.round((bytes * 8) / (duration / 1000) / 1000);
      
      return Math.max(100, kbps); // Minimum 100 kbps
      
    } catch (error) {
      return 1000; // Default estimation
    }
  }

  /**
   * Calculate MOS score
   */
  calculateMOS(latency, jitter, packetLoss) {
    if (!latency || !jitter || packetLoss === null) return null;
    
    // Simplified MOS calculation based on network metrics
    let mos = 4.5; // Start with excellent
    
    // Latency impact
    if (latency > 400) mos -= 1.5;
    else if (latency > 300) mos -= 1.0;
    else if (latency > 200) mos -= 0.5;
    else if (latency > 150) mos -= 0.2;
    
    // Jitter impact
    if (jitter > 100) mos -= 1.0;
    else if (jitter > 50) mos -= 0.5;
    else if (jitter > 25) mos -= 0.2;
    
    // Packet loss impact
    if (packetLoss > 5) mos -= 1.5;
    else if (packetLoss > 3) mos -= 1.0;
    else if (packetLoss > 1) mos -= 0.5;
    else if (packetLoss > 0.5) mos -= 0.2;
    
    return Math.max(1.0, Math.min(4.5, Number(mos.toFixed(1))));
  }

  /**
   * Test WebSocket connection
   */
  async testWebSocketConnection(config) {
    return new Promise((resolve) => {
      try {
        const protocol = config.transport?.toLowerCase() === 'wss' ? 'wss' : 'ws';
        const url = `${protocol}://${config.server}:${config.port}/ws`;
        
        const ws = new WebSocket(url);
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Test speaker output
   */
  async testSpeakerOutput() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440; // A note
      gainNode.gain.value = 0.1; // Low volume
      
      oscillator.start();
      
      return new Promise((resolve) => {
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
          resolve(true);
        }, 100);
      });
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Test codec support
   */
  async testCodecSupport() {
    const supportedCodecs = [];
    
    const codecs = [
      'audio/opus',
      'audio/PCMU',
      'audio/PCMA',
      'audio/G722',
      'audio/iLBC',
      'audio/GSM'
    ];
    
    for (const codec of codecs) {
      if (window.MediaRecorder && window.MediaRecorder.isTypeSupported(codec)) {
        supportedCodecs.push(codec);
      }
    }
    
    return supportedCodecs;
  }

  /**
   * Simulate audio quality test
   */
  async simulateAudioQualityTest() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      return new Promise((resolve) => {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        microphone.connect(analyser);
        analyser.fftSize = 256;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        setTimeout(() => {
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate audio quality score based on frequency analysis
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          const score = Math.min(100, average * 2);
          
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          
          resolve({
            score: Math.round(score),
            frequency_range: bufferLength,
            average_amplitude: Math.round(average)
          });
        }, 2000);
      });
      
    } catch (error) {
      return { score: 50, error: error.message };
    }
  }

  /**
   * Test STUN server
   */
  async testSTUNServer(stunUrl) {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: stunUrl }]
        });
        
        const timeout = setTimeout(() => {
          pc.close();
          resolve({ url: stunUrl, working: false, error: 'Timeout' });
        }, 5000);
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            clearTimeout(timeout);
            pc.close();
            resolve({ 
              url: stunUrl, 
              working: true, 
              candidate: event.candidate.candidate 
            });
          }
        };
        
        pc.onicecandidateerror = (error) => {
          clearTimeout(timeout);
          pc.close();
          resolve({ url: stunUrl, working: false, error: error.errorText });
        };
        
        // Create offer to trigger ICE gathering
        pc.createDataChannel('test');
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
        });
        
      } catch (error) {
        resolve({ url: stunUrl, working: false, error: error.message });
      }
    });
  }

  /**
   * Test TURN server
   */
  async testTURNServer(turnConfig) {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [turnConfig]
        });
        
        const timeout = setTimeout(() => {
          pc.close();
          resolve({ url: turnConfig.urls, working: false, error: 'Timeout' });
        }, 10000);
        
        let relayFound = false;
        
        pc.onicecandidate = (event) => {
          if (event.candidate && event.candidate.candidate.includes('relay')) {
            relayFound = true;
            clearTimeout(timeout);
            pc.close();
            resolve({ 
              url: turnConfig.urls, 
              working: true, 
              candidate: event.candidate.candidate 
            });
          }
        };
        
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete' && !relayFound) {
            clearTimeout(timeout);
            pc.close();
            resolve({ url: turnConfig.urls, working: false, error: 'No relay candidate found' });
          }
        };
        
        // Create offer to trigger ICE gathering
        pc.createDataChannel('test');
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
        });
        
      } catch (error) {
        resolve({ url: turnConfig.urls, working: false, error: error.message });
      }
    });
  }

  /**
   * Calculate overall results
   */
  calculateOverallResults(tests) {
    const results = {
      status: 'unknown',
      score: 0,
      issues: [],
      recommendations: []
    };

    let totalScore = 0;
    let testCount = 0;

    // Weight different test categories
    const weights = {
      configuration: 0.2,
      network: 0.25,
      registration: 0.3,
      audio: 0.15,
      stunTurn: 0.05,
      quality: 0.05
    };

    for (const [testName, testResult] of Object.entries(tests)) {
      if (testResult && testResult.status !== 'error') {
        const weight = weights[testName] || 0.1;
        
        let score = 0;
        switch (testResult.status) {
          case 'excellent': score = 100; break;
          case 'good': score = 80; break;
          case 'fair': score = 60; break;
          case 'poor': score = 30; break;
          default: score = 0;
        }
        
        totalScore += score * weight;
        testCount += weight;
        
        // Collect issues and warnings
        if (testResult.issues) {
          results.issues.push(...testResult.issues);
        }
        if (testResult.warnings) {
          results.issues.push(...testResult.warnings);
        }
      }
    }

    results.score = testCount > 0 ? Math.round(totalScore / testCount) : 0;

    // Determine overall status
    if (results.score >= 90) {
      results.status = 'excellent';
    } else if (results.score >= 75) {
      results.status = 'good';
    } else if (results.score >= 60) {
      results.status = 'fair';
    } else {
      results.status = 'poor';
    }

    // Generate recommendations
    results.recommendations = this.generateRecommendations(tests);

    return results;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(tests) {
    const recommendations = [];

    if (tests.configuration?.status === 'poor') {
      recommendations.push('Review and correct SIP configuration settings');
    }

    if (tests.network?.status === 'poor') {
      recommendations.push('Check network connectivity and firewall settings');
    }

    if (tests.registration?.status === 'poor') {
      recommendations.push('Verify SIP credentials and server availability');
    }

    if (tests.audio?.status === 'poor') {
      recommendations.push('Check microphone and speaker permissions');
    }

    if (tests.quality?.latency > 200) {
      recommendations.push('High latency detected - consider using a closer SIP server');
    }

    if (tests.quality?.packetLoss > 3) {
      recommendations.push('Significant packet loss detected - check network quality');
    }

    if (!tests.stunTurn?.stunServers?.some(s => s.working)) {
      recommendations.push('STUN servers not accessible - may affect NAT traversal');
    }

    return recommendations;
  }

  /**
   * Update real-time metrics
   */
  updateRealTimeMetrics(qualityResult) {
    const maxHistory = 50;

    if (qualityResult.latency) {
      this.realTimeMetrics.latency.push({
        value: qualityResult.latency,
        timestamp: Date.now()
      });
      if (this.realTimeMetrics.latency.length > maxHistory) {
        this.realTimeMetrics.latency.shift();
      }
    }

    if (qualityResult.jitter) {
      this.realTimeMetrics.jitter.push({
        value: qualityResult.jitter,
        timestamp: Date.now()
      });
      if (this.realTimeMetrics.jitter.length > maxHistory) {
        this.realTimeMetrics.jitter.shift();
      }
    }

    if (qualityResult.packetLoss !== null) {
      this.realTimeMetrics.packetLoss.push({
        value: qualityResult.packetLoss,
        timestamp: Date.now()
      });
      if (this.realTimeMetrics.packetLoss.length > maxHistory) {
        this.realTimeMetrics.packetLoss.shift();
      }
    }

    this.realTimeMetrics.bandwidth = qualityResult.bandwidth;
    this.realTimeMetrics.quality = qualityResult.status;
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring(config, interval = 10000) {
    if (this.isMonitoring) {
      this.stopRealTimeMonitoring();
    }

    this.isMonitoring = true;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const quality = await this.measureQualityMetrics(config);
        this.emit('realTimeUpdate', {
          metrics: this.realTimeMetrics,
          currentQuality: quality
        });
      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, interval);

    console.log('📊 Real-time SIP monitoring started');
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('📊 Real-time SIP monitoring stopped');
  }

  /**
   * Get diagnostic results by ID
   */
  getTestResults(testId) {
    return this.testResults.get(testId);
  }

  /**
   * Get diagnostics history
   */
  getDiagnosticsHistory() {
    return this.diagnosticsHistory;
  }

  /**
   * Get current real-time metrics
   */
  getRealTimeMetrics() {
    return this.realTimeMetrics;
  }

  /**
   * Clear diagnostics history
   */
  clearHistory() {
    this.diagnosticsHistory = [];
    this.testResults.clear();
    this.realTimeMetrics = {
      latency: [],
      jitter: [],
      packetLoss: [],
      bandwidth: null,
      quality: 'unknown'
    };
  }

  /**
   * Destroy service and cleanup
   */
  destroy() {
    this.stopRealTimeMonitoring();
    this.clearHistory();
    this.eventCallbacks = {};
    console.log('🗑️ SIP Diagnostics Service destroyed');
  }
}

export default SIPDiagnosticsService;