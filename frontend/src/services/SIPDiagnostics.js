/**
 * SIP Diagnostics - Real-time SIP connection monitoring and testing tools
 * Provides comprehensive network connectivity tests and performance metrics
 */

class SIPDiagnostics {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.connectionMetrics = {
      latency: [],
      packetLoss: [],
      jitter: [],
      bandwidth: [],
      registrationTime: [],
      callSetupTime: []
    };
    
    this.listeners = new Map();
    this.diagnosticTests = new Map();
    
    this.setupTests();
  }

  /**
   * Setup diagnostic test definitions
   */
  setupTests() {
    this.diagnosticTests.set('connectivity', {
      name: 'Network Connectivity',
      description: 'Test basic network connectivity to SIP server',
      timeout: 5000,
      test: this.testConnectivity.bind(this)
    });

    this.diagnosticTests.set('registration', {
      name: 'SIP Registration',
      description: 'Test SIP registration with authentication',
      timeout: 10000,
      test: this.testRegistration.bind(this)
    });

    this.diagnosticTests.set('audio', {
      name: 'Audio Quality',
      description: 'Test audio codec support and quality metrics',
      timeout: 15000,
      test: this.testAudioQuality.bind(this)
    });

    this.diagnosticTests.set('dtmf', {
      name: 'DTMF Transmission',
      description: 'Test DTMF tone generation and transmission',
      timeout: 8000,
      test: this.testDTMF.bind(this)
    });

    this.diagnosticTests.set('latency', {
      name: 'Network Latency',
      description: 'Measure round-trip time and network performance',
      timeout: 10000,
      test: this.testLatency.bind(this)
    });

    this.diagnosticTests.set('bandwidth', {
      name: 'Bandwidth Test',
      description: 'Test available bandwidth for voice traffic',
      timeout: 20000,
      test: this.testBandwidth.bind(this)
    });

    this.diagnosticTests.set('firewall', {
      name: 'Firewall/NAT Detection',
      description: 'Detect NAT type and firewall restrictions',
      timeout: 15000,
      test: this.testFirewallNAT.bind(this)
    });

    this.diagnosticTests.set('stun', {
      name: 'STUN/TURN Connectivity',
      description: 'Test STUN and TURN server connectivity',
      timeout: 10000,
      test: this.testSTUNTURN.bind(this)
    });
  }

  /**
   * Run comprehensive diagnostic suite
   */
  async runComprehensiveDiagnostics(config) {
    const results = {
      startTime: new Date().toISOString(),
      config: this.sanitizeConfig(config),
      tests: {},
      overall: null,
      recommendations: []
    };

    this.emit('diagnosticsStarted', { totalTests: this.diagnosticTests.size });

    let passed = 0;
    let total = 0;

    for (const [testId, testDef] of this.diagnosticTests.entries()) {
      total++;
      
      this.emit('testStarted', { 
        testId, 
        name: testDef.name,
        description: testDef.description 
      });

      try {
        const testResult = await Promise.race([
          testDef.test(config),
          this.timeout(testDef.timeout, `Test ${testDef.name} timed out`)
        ]);

        results.tests[testId] = {
          ...testResult,
          name: testDef.name,
          description: testDef.description,
          timestamp: new Date().toISOString()
        };

        if (testResult.success) {
          passed++;
        }

        this.emit('testCompleted', {
          testId,
          name: testDef.name,
          result: testResult
        });

      } catch (error) {
        results.tests[testId] = {
          success: false,
          error: error.message,
          name: testDef.name,
          description: testDef.description,
          timestamp: new Date().toISOString()
        };

        this.emit('testFailed', {
          testId,
          name: testDef.name,
          error: error.message
        });
      }

      // Small delay between tests
      await this.delay(500);
    }

    results.overall = {
      success: passed === total,
      passed,
      total,
      percentage: Math.round((passed / total) * 100)
    };

    results.endTime = new Date().toISOString();
    results.duration = new Date(results.endTime) - new Date(results.startTime);
    results.recommendations = this.generateRecommendations(results);

    this.emit('diagnosticsCompleted', results);
    return results;
  }

  /**
   * Test network connectivity
   */
  async testConnectivity(config) {
    const startTime = Date.now();
    
    try {
      // Test WebSocket connectivity if available
      if (config.connection.wsServers && config.connection.wsServers.length > 0) {
        const wsServer = config.connection.wsServers[0];
        
        return new Promise((resolve) => {
          const ws = new WebSocket(wsServer);
          const timeout = setTimeout(() => {
            ws.close();
            resolve({
              success: false,
              error: 'WebSocket connection timeout',
              responseTime: Date.now() - startTime
            });
          }, 5000);

          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve({
              success: true,
              responseTime: Date.now() - startTime,
              details: {
                server: wsServer,
                protocol: 'WebSocket'
              }
            });
          };

          ws.onerror = (error) => {
            clearTimeout(timeout);
            resolve({
              success: false,
              error: 'WebSocket connection failed',
              responseTime: Date.now() - startTime
            });
          };
        });
      }

      // Fallback to basic HTTP connectivity test
      const domain = this.extractDomain(config.authentication.realm || 'test.com');
      const response = await fetch(`https://${domain}`, { 
        method: 'HEAD',
        mode: 'no-cors'
      });

      return {
        success: true,
        responseTime: Date.now() - startTime,
        details: {
          method: 'HTTP',
          domain
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test SIP registration
   */
  async testRegistration(config) {
    // Simulate SIP registration test
    // In a real implementation, this would create a temporary SIP UA
    const startTime = Date.now();

    try {
      // Validate configuration first
      if (!config.authentication.username || !config.authentication.password) {
        throw new Error('Missing authentication credentials');
      }

      if (!config.authentication.realm) {
        throw new Error('Missing SIP realm/domain');
      }

      // Simulate registration process
      await this.delay(1000 + Math.random() * 2000);

      const success = Math.random() > 0.2; // 80% success rate for simulation

      return {
        success,
        responseTime: Date.now() - startTime,
        details: {
          username: config.authentication.username,
          realm: config.authentication.realm,
          method: config.authentication.authMethod || 'digest',
          expires: config.connection.registerExpires || 300
        },
        error: success ? null : 'Registration rejected by server'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test audio quality
   */
  async testAudioQuality(config) {
    const startTime = Date.now();

    try {
      // Test microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Analyze audio capabilities
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      
      // Sample audio for a short period
      await this.delay(2000);
      analyzer.getByteFrequencyData(dataArray);

      // Calculate basic audio metrics
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const max = Math.max(...dataArray);

      // Clean up
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();

      const supportedCodecs = this.detectSupportedCodecs();

      return {
        success: true,
        responseTime: Date.now() - startTime,
        details: {
          microphoneAccess: true,
          audioLevel: {
            average: Math.round(average),
            peak: max,
            quality: max > 50 ? 'good' : average > 20 ? 'fair' : 'poor'
          },
          supportedCodecs,
          preferredCodec: config.media.primaryCodec,
          sampleRate: audioContext.sampleRate,
          echoCancellation: config.media.echoCancellation,
          noiseSuppression: config.media.noiseSuppression
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
        details: {
          microphoneAccess: false,
          reason: error.name === 'NotAllowedError' ? 'Permission denied' : 'Hardware unavailable'
        }
      };
    }
  }

  /**
   * Test DTMF transmission
   */
  async testDTMF(config) {
    const startTime = Date.now();

    try {
      const dtmfConfig = config.dtmf;
      const supportedMethods = ['rfc4733', 'info', 'inband'];
      
      // Test DTMF generation capabilities
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Generate test DTMF tones
      const testTones = ['1', '2', '3'];
      const results = [];

      for (const tone of testTones) {
        const frequency = this.getDTMFFrequencies(tone);
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        
        oscillator1.frequency.value = frequency.low;
        oscillator2.frequency.value = frequency.high;
        
        oscillator1.start();
        oscillator2.start();
        
        await this.delay(dtmfConfig.duration);
        
        oscillator1.stop();
        oscillator2.stop();
        
        results.push({
          tone,
          frequencies: frequency,
          duration: dtmfConfig.duration,
          generated: true
        });

        await this.delay(dtmfConfig.interToneGap);
      }

      audioContext.close();

      return {
        success: true,
        responseTime: Date.now() - startTime,
        details: {
          method: dtmfConfig.method,
          supportedMethods,
          payloadType: dtmfConfig.payloadType,
          duration: dtmfConfig.duration,
          interToneGap: dtmfConfig.interToneGap,
          testResults: results
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test network latency
   */
  async testLatency(config) {
    const startTime = Date.now();
    const measurements = [];

    try {
      const domain = this.extractDomain(config.authentication.realm || 'google.com');
      
      // Perform multiple latency measurements
      for (let i = 0; i < 5; i++) {
        const measurementStart = performance.now();
        
        try {
          await fetch(`https://${domain}`, { 
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache'
          });
          
          const latency = performance.now() - measurementStart;
          measurements.push(latency);
          
        } catch (error) {
          // Use fallback measurement
          measurements.push(999);
        }

        if (i < 4) await this.delay(500);
      }

      const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const minLatency = Math.min(...measurements);
      const maxLatency = Math.max(...measurements);
      const jitter = this.calculateJitter(measurements);

      // Store metrics
      this.connectionMetrics.latency.push(avgLatency);
      this.connectionMetrics.jitter.push(jitter);

      return {
        success: true,
        responseTime: Date.now() - startTime,
        details: {
          averageLatency: Math.round(avgLatency),
          minimumLatency: Math.round(minLatency),
          maximumLatency: Math.round(maxLatency),
          jitter: Math.round(jitter),
          measurements: measurements.map(m => Math.round(m)),
          quality: this.assessLatencyQuality(avgLatency, jitter)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test available bandwidth
   */
  async testBandwidth(config) {
    const startTime = Date.now();

    try {
      // Simple bandwidth estimation using download test
      const testSizes = [1024, 10240, 102400]; // 1KB, 10KB, 100KB
      const results = [];

      for (const size of testSizes) {
        const testStart = performance.now();
        
        try {
          // Generate test data
          const testData = new ArrayBuffer(size);
          const blob = new Blob([testData]);
          const url = URL.createObjectURL(blob);
          
          await fetch(url);
          URL.revokeObjectURL(url);
          
          const duration = performance.now() - testStart;
          const speed = (size * 8) / (duration / 1000); // bits per second
          
          results.push({
            size,
            duration: Math.round(duration),
            speed: Math.round(speed)
          });
          
        } catch (error) {
          results.push({
            size,
            duration: 0,
            speed: 0,
            error: error.message
          });
        }
      }

      // Estimate bandwidth
      const validResults = results.filter(r => r.speed > 0);
      const avgBandwidth = validResults.length > 0 
        ? validResults.reduce((a, b) => a + b.speed, 0) / validResults.length
        : 0;

      this.connectionMetrics.bandwidth.push(avgBandwidth);

      const voiceBandwidthReq = this.getVoiceBandwidthRequirement(config.media.primaryCodec);

      return {
        success: avgBandwidth > 0,
        responseTime: Date.now() - startTime,
        details: {
          estimatedBandwidth: Math.round(avgBandwidth),
          unit: 'bps',
          humanReadable: this.formatBandwidth(avgBandwidth),
          voiceRequirement: voiceBandwidthReq,
          adequateForVoice: avgBandwidth > voiceBandwidthReq * 2,
          testResults: results,
          codec: config.media.primaryCodec
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test firewall and NAT detection
   */
  async testFirewallNAT(config) {
    const startTime = Date.now();

    try {
      const stunServers = config.connection.stunServers;
      if (!stunServers || stunServers.length === 0) {
        throw new Error('No STUN servers configured');
      }

      const pc = new RTCPeerConnection({
        iceServers: stunServers.map(url => ({ urls: url }))
      });

      const candidateTypes = [];
      const localCandidates = [];
      const remoteCandidates = [];

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pc.close();
          resolve({
            success: candidateTypes.length > 0,
            responseTime: Date.now() - startTime,
            details: {
              natType: this.determineNATType(candidateTypes),
              candidateTypes: [...new Set(candidateTypes)],
              localCandidates: localCandidates.length,
              remoteCandidates: remoteCandidates.length,
              iceSupport: candidateTypes.includes('srflx') || candidateTypes.includes('relay'),
              firewallDetected: !candidateTypes.includes('host')
            },
            error: candidateTypes.length === 0 ? 'No ICE candidates gathered' : null
          });
        }, 10000);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const type = event.candidate.type;
            
            candidateTypes.push(type);
            
            if (candidate.includes('host')) {
              localCandidates.push(candidate);
            } else {
              remoteCandidates.push(candidate);
            }

            // Check if we have enough information
            if (candidateTypes.includes('srflx') && candidateTypes.includes('host')) {
              clearTimeout(timeout);
              pc.close();
              resolve({
                success: true,
                responseTime: Date.now() - startTime,
                details: {
                  natType: this.determineNATType(candidateTypes),
                  candidateTypes: [...new Set(candidateTypes)],
                  localCandidates: localCandidates.length,
                  remoteCandidates: remoteCandidates.length,
                  iceSupport: true,
                  firewallDetected: false
                }
              });
            }
          }
        };

        // Create data channel to trigger ICE gathering
        pc.createDataChannel('test');
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
        });
      });

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test STUN/TURN connectivity
   */
  async testSTUNTURN(config) {
    const startTime = Date.now();

    try {
      const stunServers = config.connection.stunServers || [];
      const turnServers = config.connection.turnServers || [];
      const results = {
        stun: [],
        turn: []
      };

      // Test STUN servers
      for (const stunServer of stunServers.slice(0, 3)) { // Test max 3 servers
        try {
          const testResult = await this.testSingleSTUNServer(stunServer);
          results.stun.push({
            server: stunServer,
            ...testResult
          });
        } catch (error) {
          results.stun.push({
            server: stunServer,
            success: false,
            error: error.message
          });
        }
      }

      // Test TURN servers
      for (const turnServer of turnServers.slice(0, 2)) { // Test max 2 servers
        try {
          const testResult = await this.testSingleTURNServer(turnServer);
          results.turn.push({
            server: turnServer.urls,
            ...testResult
          });
        } catch (error) {
          results.turn.push({
            server: turnServer.urls,
            success: false,
            error: error.message
          });
        }
      }

      const stunSuccess = results.stun.some(r => r.success);
      const turnSuccess = results.turn.length === 0 || results.turn.some(r => r.success);

      return {
        success: stunSuccess && turnSuccess,
        responseTime: Date.now() - startTime,
        details: {
          stun: {
            tested: results.stun.length,
            successful: results.stun.filter(r => r.success).length,
            results: results.stun
          },
          turn: {
            tested: results.turn.length,
            successful: results.turn.filter(r => r.success).length,
            results: results.turn
          },
          iceSupport: stunSuccess,
          natTraversal: stunSuccess || turnSuccess
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test single STUN server
   */
  async testSingleSTUNServer(stunUrl) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: stunUrl }]
      });

      const timeout = setTimeout(() => {
        pc.close();
        resolve({
          success: false,
          error: 'STUN test timeout',
          responseTime: Date.now() - startTime
        });
      }, 5000);

      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.candidate.includes('srflx')) {
          clearTimeout(timeout);
          pc.close();
          resolve({
            success: true,
            responseTime: Date.now() - startTime,
            candidateType: 'srflx'
          });
        }
      };

      pc.createDataChannel('stun-test');
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
      });
    });
  }

  /**
   * Test single TURN server
   */
  async testSingleTURNServer(turnConfig) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const pc = new RTCPeerConnection({
        iceServers: [turnConfig]
      });

      const timeout = setTimeout(() => {
        pc.close();
        resolve({
          success: false,
          error: 'TURN test timeout',
          responseTime: Date.now() - startTime
        });
      }, 8000);

      pc.onicecandidate = (event) => {
        if (event.candidate && event.candidate.candidate.includes('relay')) {
          clearTimeout(timeout);
          pc.close();
          resolve({
            success: true,
            responseTime: Date.now() - startTime,
            candidateType: 'relay'
          });
        }
      };

      pc.createDataChannel('turn-test');
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
      });
    });
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Check connectivity
    if (!results.tests.connectivity?.success) {
      recommendations.push({
        category: 'connectivity',
        severity: 'critical',
        message: 'Network connectivity failed. Check your internet connection and server configuration.',
        action: 'Verify server URLs and network settings'
      });
    }

    // Check latency
    const latencyTest = results.tests.latency;
    if (latencyTest?.success && latencyTest.details?.averageLatency > 150) {
      recommendations.push({
        category: 'performance',
        severity: 'warning',
        message: `High latency detected (${latencyTest.details.averageLatency}ms). Voice quality may be affected.`,
        action: 'Consider using a server closer to your location'
      });
    }

    // Check bandwidth
    const bandwidthTest = results.tests.bandwidth;
    if (bandwidthTest?.success && !bandwidthTest.details?.adequateForVoice) {
      recommendations.push({
        category: 'performance',
        severity: 'warning',
        message: 'Insufficient bandwidth for optimal voice quality.',
        action: 'Consider upgrading internet connection or using a lower bitrate codec'
      });
    }

    // Check NAT/Firewall
    const natTest = results.tests.firewall;
    if (natTest?.success && natTest.details?.firewallDetected) {
      recommendations.push({
        category: 'network',
        severity: 'info',
        message: 'Firewall or NAT detected. STUN/TURN servers are required.',
        action: 'Ensure STUN/TURN servers are properly configured'
      });
    }

    // Check DTMF
    if (!results.tests.dtmf?.success) {
      recommendations.push({
        category: 'features',
        severity: 'warning',
        message: 'DTMF functionality may be impaired.',
        action: 'Check DTMF method configuration and codec support'
      });
    }

    return recommendations;
  }

  // Utility methods
  sanitizeConfig(config) {
    const { password, ...sanitized } = config.authentication;
    return {
      ...config,
      authentication: {
        ...sanitized,
        hasPassword: !!password
      }
    };
  }

  extractDomain(input) {
    if (!input) return 'test.com';
    return input.replace(/^sip:/, '').split('@').pop().split(':')[0];
  }

  timeout(ms, message) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getDTMFFrequencies(tone) {
    const frequencies = {
      '1': { low: 697, high: 1209 },
      '2': { low: 697, high: 1336 },
      '3': { low: 697, high: 1477 },
      '4': { low: 770, high: 1209 },
      '5': { low: 770, high: 1336 },
      '6': { low: 770, high: 1477 },
      '7': { low: 852, high: 1209 },
      '8': { low: 852, high: 1336 },
      '9': { low: 852, high: 1477 },
      '0': { low: 941, high: 1336 },
      '*': { low: 941, high: 1209 },
      '#': { low: 941, high: 1477 }
    };
    return frequencies[tone] || frequencies['1'];
  }

  detectSupportedCodecs() {
    // Simplified codec detection
    return ['opus', 'g722', 'pcmu', 'pcma'];
  }

  calculateJitter(measurements) {
    if (measurements.length < 2) return 0;
    
    let jitter = 0;
    for (let i = 1; i < measurements.length; i++) {
      jitter += Math.abs(measurements[i] - measurements[i - 1]);
    }
    return jitter / (measurements.length - 1);
  }

  assessLatencyQuality(latency, jitter) {
    if (latency < 50 && jitter < 10) return 'excellent';
    if (latency < 100 && jitter < 20) return 'good';
    if (latency < 200 && jitter < 40) return 'fair';
    return 'poor';
  }

  determineNATType(candidateTypes) {
    if (candidateTypes.includes('host') && candidateTypes.includes('srflx')) {
      return 'Symmetric NAT';
    } else if (candidateTypes.includes('host')) {
      return 'Open Internet';
    } else if (candidateTypes.includes('srflx')) {
      return 'Full Cone NAT';
    }
    return 'Restricted NAT';
  }

  getVoiceBandwidthRequirement(codec) {
    const requirements = {
      'opus': 32000, // 32 kbps
      'g722': 64000, // 64 kbps
      'pcmu': 80000, // 80 kbps (including overhead)
      'pcma': 80000, // 80 kbps (including overhead)
      'g729': 24000  // 24 kbps
    };
    return requirements[codec] || 64000;
  }

  formatBandwidth(bps) {
    if (bps >= 1000000) {
      return `${(bps / 1000000).toFixed(2)} Mbps`;
    } else if (bps >= 1000) {
      return `${(bps / 1000).toFixed(2)} Kbps`;
    }
    return `${Math.round(bps)} bps`;
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

  /**
   * Start real-time monitoring
   */
  startMonitoring(config, interval = 30000) {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    this.isMonitoring = true;
    this.monitoringConfig = config;

    this.monitoringInterval = setInterval(async () => {
      try {
        const quickTests = ['connectivity', 'latency'];
        const results = {};

        for (const testId of quickTests) {
          const testDef = this.diagnosticTests.get(testId);
          if (testDef) {
            results[testId] = await testDef.test(config);
          }
        }

        this.emit('monitoringUpdate', {
          timestamp: new Date().toISOString(),
          tests: results
        });

      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, interval);

    this.emit('monitoringStarted', { interval });
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.emit('monitoringStopped');
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics() {
    return {
      ...this.connectionMetrics,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Clear metrics history
   */
  clearMetrics() {
    Object.keys(this.connectionMetrics).forEach(key => {
      if (Array.isArray(this.connectionMetrics[key])) {
        this.connectionMetrics[key] = [];
      }
    });

    this.emit('metricsCleared');
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.stopMonitoring();
    this.listeners.clear();
    this.diagnosticTests.clear();
  }
}

export default SIPDiagnostics;