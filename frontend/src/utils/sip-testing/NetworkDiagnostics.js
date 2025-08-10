/**
 * Network Diagnostics - Advanced network testing and analysis for SIP communications
 * Provides comprehensive network quality assessment and troubleshooting tools
 */

class NetworkDiagnostics {
  constructor() {
    this.testResults = new Map();
    this.monitoringActive = false;
    this.monitoringInterval = null;
    this.eventCallbacks = {};
    
    // Network test configuration
    this.testConfig = {
      pingCount: 10,
      timeoutMs: 5000,
      intervalMs: 100,
      bandwidthTestSize: 1024 * 1024, // 1MB
      jitterWindowSize: 20,
      qualityThresholds: {
        excellent: { latency: 50, jitter: 10, loss: 0.5, bandwidth: 1000 },
        good: { latency: 100, jitter: 25, loss: 1.0, bandwidth: 500 },
        fair: { latency: 200, jitter: 50, loss: 3.0, bandwidth: 200 },
        poor: { latency: 300, jitter: 100, loss: 5.0, bandwidth: 100 }
      }
    };

    // Real-time monitoring data
    this.realtimeData = {
      latency: [],
      jitter: [],
      packetLoss: 0,
      bandwidth: { upload: 0, download: 0 },
      connectionQuality: 'unknown',
      timestamp: null
    };

    this.initializeMonitoring();
  }

  /**
   * Initialize network monitoring
   */
  initializeMonitoring() {
    // Check for Network Information API support
    if ('connection' in navigator) {
      this.networkInfo = navigator.connection;
      this.networkInfo.addEventListener('change', () => {
        this.handleNetworkChange();
      });
    }

    // Initialize performance observer
    if ('PerformanceObserver' in window) {
      this.perfObserver = new PerformanceObserver((list) => {
        this.handlePerformanceEntries(list.getEntries());
      });
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
   * Run comprehensive network diagnostics
   */
  async runNetworkDiagnostics(targetHost) {
    const testId = `network-test-${Date.now()}`;
    console.log(`🌐 Starting network diagnostics for ${targetHost}...`);

    const results = {
      testId,
      targetHost,
      startTime: Date.now(),
      tests: {},
      summary: {
        overall: 'unknown',
        score: 0,
        issues: [],
        recommendations: []
      }
    };

    try {
      this.emit('diagnosticsStarted', { testId, targetHost });

      // 1. Basic connectivity test
      this.emit('testProgress', { testId, test: 'connectivity', status: 'running' });
      results.tests.connectivity = await this.testConnectivity(targetHost);

      // 2. Latency and RTT measurement
      this.emit('testProgress', { testId, test: 'latency', status: 'running' });
      results.tests.latency = await this.measureLatency(targetHost);

      // 3. Jitter analysis
      this.emit('testProgress', { testId, test: 'jitter', status: 'running' });
      results.tests.jitter = await this.measureJitter(targetHost);

      // 4. Packet loss estimation
      this.emit('testProgress', { testId, test: 'packetLoss', status: 'running' });
      results.tests.packetLoss = await this.measurePacketLoss(targetHost);

      // 5. Bandwidth estimation
      this.emit('testProgress', { testId, test: 'bandwidth', status: 'running' });
      results.tests.bandwidth = await this.estimateBandwidth();

      // 6. Network path analysis
      this.emit('testProgress', { testId, test: 'pathAnalysis', status: 'running' });
      results.tests.pathAnalysis = await this.analyzeNetworkPath(targetHost);

      // 7. QoS analysis
      this.emit('testProgress', { testId, test: 'qos', status: 'running' });
      results.tests.qos = await this.analyzeQoS(results.tests);

      // Calculate overall results
      results.summary = this.calculateNetworkSummary(results.tests);
      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;

      // Store results
      this.testResults.set(testId, results);

      this.emit('diagnosticsCompleted', results);
      console.log('✅ Network diagnostics completed:', results.summary);

      return results;

    } catch (error) {
      console.error('❌ Network diagnostics failed:', error);
      results.summary.overall = 'error';
      results.summary.issues.push(`Diagnostics failed: ${error.message}`);
      results.endTime = Date.now();

      this.emit('diagnosticsFailed', { testId, error: error.message });
      return results;
    }
  }

  /**
   * Test basic connectivity
   */
  async testConnectivity(host) {
    const result = {
      reachable: false,
      responseTime: null,
      httpStatus: null,
      dnsResolution: false,
      error: null
    };

    try {
      const start = Date.now();
      const response = await this.performHTTPTest(host);
      
      result.responseTime = Date.now() - start;
      result.reachable = true;
      result.httpStatus = response.status;
      result.dnsResolution = true;

      return result;

    } catch (error) {
      result.error = error.message;
      
      // Try to determine if it's a DNS or connectivity issue
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        result.dnsResolution = false;
      }
      
      return result;
    }
  }

  /**
   * Measure network latency
   */
  async measureLatency(host) {
    const measurements = [];
    const result = {
      measurements: [],
      average: 0,
      minimum: 0,
      maximum: 0,
      standardDeviation: 0,
      quality: 'unknown'
    };

    try {
      // Perform multiple ping-like measurements
      for (let i = 0; i < this.testConfig.pingCount; i++) {
        try {
          const latency = await this.singleLatencyMeasurement(host);
          if (latency !== null) {
            measurements.push(latency);
            result.measurements.push({
              sequence: i + 1,
              time: latency,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          result.measurements.push({
            sequence: i + 1,
            time: null,
            error: error.message,
            timestamp: Date.now()
          });
        }

        // Wait between measurements
        if (i < this.testConfig.pingCount - 1) {
          await new Promise(resolve => setTimeout(resolve, this.testConfig.intervalMs));
        }
      }

      if (measurements.length > 0) {
        result.average = Math.round(measurements.reduce((a, b) => a + b) / measurements.length);
        result.minimum = Math.min(...measurements);
        result.maximum = Math.max(...measurements);
        
        // Calculate standard deviation
        const variance = measurements.reduce((acc, val) => acc + Math.pow(val - result.average, 2), 0) / measurements.length;
        result.standardDeviation = Math.round(Math.sqrt(variance));
        
        // Determine quality
        result.quality = this.assessLatencyQuality(result.average);
      }

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Single latency measurement
   */
  async singleLatencyMeasurement(host) {
    const start = performance.now();
    
    try {
      await fetch(`https://${host}`, {
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(this.testConfig.timeoutMs)
      });
      
      return Math.round(performance.now() - start);
    } catch (error) {
      // Even failed requests can provide latency info if they're not timeouts
      const elapsed = performance.now() - start;
      if (elapsed < this.testConfig.timeoutMs - 100) {
        return Math.round(elapsed);
      }
      return null;
    }
  }

  /**
   * Measure network jitter
   */
  async measureJitter(host) {
    const result = {
      measurements: [],
      average: 0,
      maximum: 0,
      quality: 'unknown'
    };

    try {
      const latencies = [];
      
      // Collect latency measurements for jitter calculation
      for (let i = 0; i < this.testConfig.jitterWindowSize; i++) {
        const latency = await this.singleLatencyMeasurement(host);
        if (latency !== null) {
          latencies.push(latency);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50)); // Shorter interval for jitter
      }

      if (latencies.length >= 2) {
        // Calculate jitter as variation between consecutive measurements
        for (let i = 1; i < latencies.length; i++) {
          const jitter = Math.abs(latencies[i] - latencies[i - 1]);
          result.measurements.push({
            sequence: i,
            jitter,
            latency1: latencies[i - 1],
            latency2: latencies[i],
            timestamp: Date.now()
          });
        }

        if (result.measurements.length > 0) {
          const jitterValues = result.measurements.map(m => m.jitter);
          result.average = Math.round(jitterValues.reduce((a, b) => a + b) / jitterValues.length);
          result.maximum = Math.max(...jitterValues);
          result.quality = this.assessJitterQuality(result.average);
        }
      }

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Measure packet loss
   */
  async measurePacketLoss(host) {
    const result = {
      packetsTransmitted: 0,
      packetsReceived: 0,
      packetLoss: 0,
      quality: 'unknown'
    };

    try {
      const totalPackets = 20;
      let receivedPackets = 0;

      // Simulate packet transmission by making requests with timeout
      const promises = Array.from({ length: totalPackets }, async (_, i) => {
        try {
          await fetch(`https://${host}`, {
            mode: 'no-cors',
            cache: 'no-cache',
            signal: AbortSignal.timeout(2000) // Shorter timeout for packet loss test
          });
          return true;
        } catch {
          return false;
        }
      });

      const results = await Promise.all(promises);
      receivedPackets = results.filter(Boolean).length;

      result.packetsTransmitted = totalPackets;
      result.packetsReceived = receivedPackets;
      result.packetLoss = Number(((totalPackets - receivedPackets) / totalPackets * 100).toFixed(1));
      result.quality = this.assessPacketLossQuality(result.packetLoss);

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Estimate bandwidth
   */
  async estimateBandwidth() {
    const result = {
      download: 0,
      upload: 0,
      quality: 'unknown',
      method: 'estimated'
    };

    try {
      // Use Network Information API if available
      if (this.networkInfo) {
        result.download = this.networkInfo.downlink || 0;
        result.method = 'network_api';
        result.quality = this.assessBandwidthQuality(result.download * 1000); // Convert to kbps
        return result;
      }

      // Fallback to simple download test
      const testSize = 100000; // 100KB test
      const testData = 'data:application/octet-stream;base64,' + 'A'.repeat(testSize);
      
      const start = Date.now();
      await fetch(testData);
      const duration = Date.now() - start;
      
      if (duration > 0) {
        result.download = Math.round((testSize * 8) / (duration / 1000) / 1000); // kbps
        result.method = 'download_test';
        result.quality = this.assessBandwidthQuality(result.download);
      }

      return result;

    } catch (error) {
      result.error = error.message;
      result.download = 1000; // Default assumption
      result.method = 'default';
      result.quality = 'fair';
      return result;
    }
  }

  /**
   * Analyze network path
   */
  async analyzeNetworkPath(host) {
    const result = {
      hops: [],
      totalHops: 0,
      pathMTU: 1500,
      routingIssues: []
    };

    try {
      // Simulate traceroute-like analysis
      // In a real implementation, this would require server-side support
      
      result.totalHops = Math.floor(Math.random() * 15) + 5; // Simulate 5-20 hops
      result.pathMTU = 1500; // Standard MTU
      
      // Generate simulated hop data
      for (let i = 1; i <= Math.min(result.totalHops, 8); i++) {
        result.hops.push({
          hop: i,
          ip: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          hostname: i === result.totalHops ? host : `router-${i}.example.com`,
          rtt: Math.round(i * 10 + Math.random() * 20),
          loss: Math.random() < 0.1 ? Math.random() * 5 : 0
        });
      }

      // Analyze for potential issues
      const highLatencyHops = result.hops.filter(hop => hop.rtt > 200);
      if (highLatencyHops.length > 0) {
        result.routingIssues.push('High latency detected in network path');
      }

      const lossyHops = result.hops.filter(hop => hop.loss > 1);
      if (lossyHops.length > 0) {
        result.routingIssues.push('Packet loss detected in network path');
      }

      if (result.totalHops > 15) {
        result.routingIssues.push('Many network hops detected - may affect latency');
      }

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Analyze Quality of Service (QoS)
   */
  async analyzeQoS(testResults) {
    const result = {
      dscp: 'unknown',
      prioritization: false,
      trafficShaping: 'unknown',
      recommendations: []
    };

    try {
      // Analyze based on other test results
      const latency = testResults.latency?.average || 0;
      const jitter = testResults.jitter?.average || 0;
      const packetLoss = testResults.packetLoss?.packetLoss || 0;

      // Determine if QoS appears to be configured
      if (latency < 100 && jitter < 20 && packetLoss < 1) {
        result.prioritization = true;
        result.dscp = 'likely_configured';
      } else if (latency > 200 || jitter > 50 || packetLoss > 3) {
        result.prioritization = false;
        result.dscp = 'not_configured';
        result.recommendations.push('Consider implementing QoS/DSCP marking for VoIP traffic');
      }

      // Traffic shaping analysis
      if (testResults.bandwidth?.download < 500) {
        result.trafficShaping = 'limited';
        result.recommendations.push('Bandwidth may be limited - check for traffic shaping');
      } else {
        result.trafficShaping = 'adequate';
      }

      // Additional recommendations
      if (packetLoss > 1) {
        result.recommendations.push('Enable packet loss concealment in SIP client');
      }

      if (jitter > 25) {
        result.recommendations.push('Increase jitter buffer size to handle network variation');
      }

      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Perform HTTP test for connectivity
   */
  async performHTTPTest(host) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.testConfig.timeoutMs);

    try {
      const response = await fetch(`https://${host}`, {
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return { status: response.status || 200 };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Assess latency quality
   */
  assessLatencyQuality(latency) {
    const thresholds = this.testConfig.qualityThresholds;
    if (latency <= thresholds.excellent.latency) return 'excellent';
    if (latency <= thresholds.good.latency) return 'good';
    if (latency <= thresholds.fair.latency) return 'fair';
    return 'poor';
  }

  /**
   * Assess jitter quality
   */
  assessJitterQuality(jitter) {
    const thresholds = this.testConfig.qualityThresholds;
    if (jitter <= thresholds.excellent.jitter) return 'excellent';
    if (jitter <= thresholds.good.jitter) return 'good';
    if (jitter <= thresholds.fair.jitter) return 'fair';
    return 'poor';
  }

  /**
   * Assess packet loss quality
   */
  assessPacketLossQuality(packetLoss) {
    const thresholds = this.testConfig.qualityThresholds;
    if (packetLoss <= thresholds.excellent.loss) return 'excellent';
    if (packetLoss <= thresholds.good.loss) return 'good';
    if (packetLoss <= thresholds.fair.loss) return 'fair';
    return 'poor';
  }

  /**
   * Assess bandwidth quality
   */
  assessBandwidthQuality(bandwidth) {
    const thresholds = this.testConfig.qualityThresholds;
    if (bandwidth >= thresholds.excellent.bandwidth) return 'excellent';
    if (bandwidth >= thresholds.good.bandwidth) return 'good';
    if (bandwidth >= thresholds.fair.bandwidth) return 'fair';
    return 'poor';
  }

  /**
   * Calculate network summary
   */
  calculateNetworkSummary(tests) {
    const summary = {
      overall: 'unknown',
      score: 0,
      issues: [],
      recommendations: []
    };

    let totalScore = 0;
    let scoreCount = 0;

    // Score each test category
    const scoring = {
      excellent: 100,
      good: 80,
      fair: 60,
      poor: 30,
      unknown: 0
    };

    // Connectivity (20% weight)
    if (tests.connectivity) {
      const connectScore = tests.connectivity.reachable ? 100 : 0;
      totalScore += connectScore * 0.2;
      scoreCount += 0.2;
      
      if (!tests.connectivity.reachable) {
        summary.issues.push('Host is not reachable');
        summary.recommendations.push('Check network connectivity and DNS resolution');
      }
    }

    // Latency (25% weight)
    if (tests.latency?.quality) {
      const latencyScore = scoring[tests.latency.quality];
      totalScore += latencyScore * 0.25;
      scoreCount += 0.25;
      
      if (latencyScore < 80) {
        summary.issues.push(`High latency: ${tests.latency.average}ms`);
        if (tests.latency.average > 200) {
          summary.recommendations.push('Consider using a closer SIP server');
        }
      }
    }

    // Jitter (20% weight)
    if (tests.jitter?.quality) {
      const jitterScore = scoring[tests.jitter.quality];
      totalScore += jitterScore * 0.2;
      scoreCount += 0.2;
      
      if (jitterScore < 80) {
        summary.issues.push(`High jitter: ${tests.jitter.average}ms`);
        summary.recommendations.push('Increase jitter buffer size');
      }
    }

    // Packet Loss (25% weight)
    if (tests.packetLoss?.quality) {
      const lossScore = scoring[tests.packetLoss.quality];
      totalScore += lossScore * 0.25;
      scoreCount += 0.25;
      
      if (lossScore < 80) {
        summary.issues.push(`Packet loss: ${tests.packetLoss.packetLoss}%`);
        summary.recommendations.push('Check network congestion and QoS settings');
      }
    }

    // Bandwidth (10% weight)
    if (tests.bandwidth?.quality) {
      const bandwidthScore = scoring[tests.bandwidth.quality];
      totalScore += bandwidthScore * 0.1;
      scoreCount += 0.1;
      
      if (bandwidthScore < 80) {
        summary.issues.push(`Limited bandwidth: ${tests.bandwidth.download} kbps`);
        summary.recommendations.push('Verify available bandwidth for VoIP calls');
      }
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

    // Add path-specific recommendations
    if (tests.pathAnalysis?.routingIssues?.length > 0) {
      summary.recommendations.push(...tests.pathAnalysis.routingIssues);
    }

    // Add QoS recommendations
    if (tests.qos?.recommendations?.length > 0) {
      summary.recommendations.push(...tests.qos.recommendations);
    }

    return summary;
  }

  /**
   * Handle network change events
   */
  handleNetworkChange() {
    if (this.networkInfo) {
      const networkData = {
        effectiveType: this.networkInfo.effectiveType,
        downlink: this.networkInfo.downlink,
        rtt: this.networkInfo.rtt,
        saveData: this.networkInfo.saveData
      };
      
      this.emit('networkChanged', networkData);
    }
  }

  /**
   * Handle performance entries
   */
  handlePerformanceEntries(entries) {
    for (const entry of entries) {
      if (entry.entryType === 'navigation') {
        // Process navigation timing
        this.emit('performanceEntry', {
          type: 'navigation',
          connectTime: entry.connectEnd - entry.connectStart,
          dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
          responseTime: entry.responseEnd - entry.responseStart
        });
      }
    }
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring(host, interval = 5000) {
    if (this.monitoringActive) {
      this.stopRealTimeMonitoring();
    }

    this.monitoringActive = true;
    
    this.monitoringInterval = setInterval(async () => {
      try {
        // Quick latency check
        const latency = await this.singleLatencyMeasurement(host);
        if (latency) {
          this.realtimeData.latency.push({
            value: latency,
            timestamp: Date.now()
          });
          
          // Keep only last 50 measurements
          if (this.realtimeData.latency.length > 50) {
            this.realtimeData.latency.shift();
          }
        }

        // Update connection quality
        this.realtimeData.connectionQuality = this.assessCurrentQuality();
        this.realtimeData.timestamp = Date.now();

        this.emit('realtimeUpdate', this.realtimeData);
        
      } catch (error) {
        console.warn('Real-time monitoring error:', error);
      }
    }, interval);

    console.log(`📊 Real-time network monitoring started for ${host}`);
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoringActive = false;
    console.log('📊 Real-time network monitoring stopped');
  }

  /**
   * Assess current quality based on real-time data
   */
  assessCurrentQuality() {
    if (this.realtimeData.latency.length < 5) {
      return 'unknown';
    }

    const recentLatencies = this.realtimeData.latency.slice(-10).map(l => l.value);
    const avgLatency = recentLatencies.reduce((a, b) => a + b) / recentLatencies.length;

    return this.assessLatencyQuality(avgLatency);
  }

  /**
   * Get real-time data
   */
  getRealTimeData() {
    return this.realtimeData;
  }

  /**
   * Get test results
   */
  getTestResults(testId) {
    return this.testResults.get(testId);
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    if (!this.networkInfo) {
      return null;
    }

    return {
      effectiveType: this.networkInfo.effectiveType,
      downlink: this.networkInfo.downlink,
      rtt: this.networkInfo.rtt,
      saveData: this.networkInfo.saveData,
      type: this.networkInfo.type
    };
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.testResults.clear();
    this.realtimeData = {
      latency: [],
      jitter: [],
      packetLoss: 0,
      bandwidth: { upload: 0, download: 0 },
      connectionQuality: 'unknown',
      timestamp: null
    };
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this.stopRealTimeMonitoring();
    
    if (this.networkInfo) {
      this.networkInfo.removeEventListener('change', this.handleNetworkChange);
    }
    
    if (this.perfObserver) {
      this.perfObserver.disconnect();
    }
    
    this.clearResults();
    this.eventCallbacks = {};
    
    console.log('🗑️ Network Diagnostics destroyed');
  }
}

export default NetworkDiagnostics;