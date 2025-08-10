/**
 * Network Diagnostics Tests
 * Comprehensive test suite for network diagnostics functionality
 */

import { jest } from '@jest/globals';
import NetworkDiagnostics from '../../../utils/sip-testing/NetworkDiagnostics';

// Mock Performance Observer
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

// Mock Network Information API
global.navigator.connection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  saveData: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock fetch
global.fetch = jest.fn();

// Mock performance.now
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('NetworkDiagnostics', () => {
  let networkDiagnostics;

  beforeEach(() => {
    networkDiagnostics = new NetworkDiagnostics();
    jest.clearAllMocks();
    
    // Reset performance.now to return incrementing values
    let counter = 0;
    global.performance.now.mockImplementation(() => {
      counter += 50; // 50ms increments
      return counter;
    });
  });

  afterEach(() => {
    networkDiagnostics.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(networkDiagnostics).toBeDefined();
      expect(networkDiagnostics.testResults).toBeInstanceOf(Map);
      expect(networkDiagnostics.realtimeData).toBeDefined();
      expect(networkDiagnostics.monitoringActive).toBe(false);
    });

    test('should initialize with test configuration', () => {
      expect(networkDiagnostics.testConfig).toMatchObject({
        pingCount: 10,
        timeoutMs: 5000,
        intervalMs: 100,
        qualityThresholds: expect.any(Object)
      });
    });

    test('should have quality thresholds configured', () => {
      const thresholds = networkDiagnostics.testConfig.qualityThresholds;
      expect(thresholds).toMatchObject({
        excellent: expect.any(Object),
        good: expect.any(Object),
        fair: expect.any(Object),
        poor: expect.any(Object)
      });
    });

    test('should initialize network information API if available', () => {
      expect(networkDiagnostics.networkInfo).toBeDefined();
      expect(networkDiagnostics.networkInfo.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });
  });

  describe('Event System', () => {
    test('should register and emit events', () => {
      const callback = jest.fn();
      networkDiagnostics.on('testEvent', callback);
      
      networkDiagnostics.emit('testEvent', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should handle network change events', () => {
      const callback = jest.fn();
      networkDiagnostics.on('networkChanged', callback);
      
      networkDiagnostics.handleNetworkChange();
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false
        })
      );
    });
  });

  describe('Comprehensive Network Diagnostics', () => {
    test('should run complete network diagnostics', async () => {
      fetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await networkDiagnostics.runNetworkDiagnostics('example.com');

      expect(result).toMatchObject({
        testId: expect.any(String),
        targetHost: 'example.com',
        startTime: expect.any(Number),
        tests: {
          connectivity: expect.any(Object),
          latency: expect.any(Object),
          jitter: expect.any(Object),
          packetLoss: expect.any(Object),
          bandwidth: expect.any(Object),
          pathAnalysis: expect.any(Object),
          qos: expect.any(Object)
        },
        summary: {
          overall: expect.stringMatching(/excellent|good|fair|poor/),
          score: expect.any(Number),
          issues: expect.any(Array),
          recommendations: expect.any(Array)
        }
      });
    });

    test('should emit progress events during diagnostics', async () => {
      fetch.mockResolvedValue({ ok: true, status: 200 });
      
      const startCallback = jest.fn();
      const progressCallback = jest.fn();
      const completeCallback = jest.fn();

      networkDiagnostics.on('diagnosticsStarted', startCallback);
      networkDiagnostics.on('testProgress', progressCallback);
      networkDiagnostics.on('diagnosticsCompleted', completeCallback);

      await networkDiagnostics.runNetworkDiagnostics('example.com');

      expect(startCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledTimes(7); // 7 test categories
      expect(completeCallback).toHaveBeenCalled();
    });

    test('should store test results', async () => {
      fetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await networkDiagnostics.runNetworkDiagnostics('example.com');

      expect(networkDiagnostics.testResults.has(result.testId)).toBe(true);
    });
  });

  describe('Connectivity Testing', () => {
    test('should test connectivity successfully', async () => {
      fetch.mockResolvedValue({ status: 200 });

      const result = await networkDiagnostics.testConnectivity('example.com');

      expect(result).toMatchObject({
        reachable: true,
        responseTime: expect.any(Number),
        httpStatus: 200,
        dnsResolution: true,
        error: null
      });

      expect(fetch).toHaveBeenCalledWith('https://example.com', { mode: 'no-cors', timeout: 5000 });
    });

    test('should handle connectivity failures', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await networkDiagnostics.testConnectivity('unreachable.com');

      expect(result.reachable).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('should detect DNS resolution issues', async () => {
      fetch.mockRejectedValue(new Error('Failed to fetch'));

      const result = await networkDiagnostics.testConnectivity('invalid-host.com');

      expect(result.dnsResolution).toBe(false);
    });
  });

  describe('Latency Measurement', () => {
    test('should measure network latency', async () => {
      fetch.mockResolvedValue({ ok: true });

      const result = await networkDiagnostics.measureLatency('example.com');

      expect(result).toMatchObject({
        measurements: expect.any(Array),
        average: expect.any(Number),
        minimum: expect.any(Number),
        maximum: expect.any(Number),
        standardDeviation: expect.any(Number),
        quality: expect.stringMatching(/excellent|good|fair|poor/)
      });

      expect(result.measurements).toHaveLength(10); // Default ping count
      expect(result.average).toBeGreaterThan(0);
    });

    test('should handle latency measurement failures', async () => {
      fetch.mockRejectedValue(new Error('Timeout'));

      const result = await networkDiagnostics.measureLatency('slow.example.com');

      expect(result.measurements.some(m => m.error)).toBe(true);
    });

    test('should assess latency quality correctly', async () => {
      fetch.mockResolvedValue({ ok: true });
      
      // Mock performance.now to return consistent low latency
      global.performance.now.mockImplementation(() => {
        const base = Date.now();
        return base + 30; // 30ms latency
      });

      const result = await networkDiagnostics.measureLatency('fast.example.com');

      expect(result.quality).toBe('excellent'); // 30ms should be excellent
    });
  });

  describe('Single Latency Measurement', () => {
    test('should measure single latency correctly', async () => {
      fetch.mockResolvedValue({ ok: true });
      
      global.performance.now
        .mockReturnValueOnce(1000)  // Start time
        .mockReturnValueOnce(1050); // End time (50ms later)

      const latency = await networkDiagnostics.singleLatencyMeasurement('example.com');

      expect(latency).toBe(50);
    });

    test('should handle timeouts in single measurement', async () => {
      // Mock a timeout scenario
      fetch.mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 6000);
      }));

      global.performance.now
        .mockReturnValueOnce(1000)   // Start time
        .mockReturnValueOnce(6100);  // End time (after timeout)

      const latency = await networkDiagnostics.singleLatencyMeasurement('slow.example.com');

      expect(latency).toBeNull();
    });
  });

  describe('Jitter Measurement', () => {
    test('should measure network jitter', async () => {
      fetch.mockResolvedValue({ ok: true });

      const result = await networkDiagnostics.measureJitter('example.com');

      expect(result).toMatchObject({
        measurements: expect.any(Array),
        average: expect.any(Number),
        maximum: expect.any(Number),
        quality: expect.stringMatching(/excellent|good|fair|poor/)
      });

      if (result.measurements.length > 0) {
        expect(result.measurements[0]).toMatchObject({
          sequence: expect.any(Number),
          jitter: expect.any(Number),
          latency1: expect.any(Number),
          latency2: expect.any(Number)
        });
      }
    });

    test('should calculate jitter from latency variations', async () => {
      fetch.mockResolvedValue({ ok: true });
      
      // Mock varying latencies for jitter calculation
      let callCount = 0;
      global.performance.now.mockImplementation(() => {
        const baseTimes = [1000, 1050, 1000, 1080, 1000, 1040]; // Varying response times
        return baseTimes[callCount++ % baseTimes.length] || 1000;
      });

      const result = await networkDiagnostics.measureJitter('example.com');

      expect(result.average).toBeGreaterThan(0);
      expect(result.maximum).toBeGreaterThanOrEqual(result.average);
    });
  });

  describe('Packet Loss Measurement', () => {
    test('should measure packet loss', async () => {
      // Mock 90% success rate (10% packet loss)
      let successCount = 0;
      fetch.mockImplementation(() => {
        successCount++;
        if (successCount <= 18) { // 18 out of 20 succeed
          return Promise.resolve({ ok: true });
        }
        return Promise.reject(new Error('Packet lost'));
      });

      const result = await networkDiagnostics.measurePacketLoss('example.com');

      expect(result).toMatchObject({
        packetsTransmitted: 20,
        packetsReceived: 18,
        packetLoss: 10.0,
        quality: expect.stringMatching(/excellent|good|fair|poor/)
      });
    });

    test('should handle complete packet loss', async () => {
      fetch.mockRejectedValue(new Error('All packets lost'));

      const result = await networkDiagnostics.measurePacketLoss('unreachable.com');

      expect(result.packetLoss).toBe(100.0);
      expect(result.quality).toBe('poor');
    });
  });

  describe('Bandwidth Estimation', () => {
    test('should estimate bandwidth using Network API', async () => {
      const result = await networkDiagnostics.estimateBandwidth();

      expect(result).toMatchObject({
        download: expect.any(Number),
        upload: expect.any(Number),
        quality: expect.stringMatching(/excellent|good|fair|poor/),
        method: expect.any(String)
      });

      expect(result.method).toBe('network_api');
      expect(result.download).toBe(10000); // From mocked downlink value
    });

    test('should fallback to download test when Network API unavailable', async () => {
      // Temporarily remove network info
      const originalNetworkInfo = networkDiagnostics.networkInfo;
      networkDiagnostics.networkInfo = null;

      fetch.mockResolvedValue({ ok: true });

      const result = await networkDiagnostics.estimateBandwidth();

      expect(result.method).toBe('download_test');
      expect(result.download).toBeGreaterThan(0);

      // Restore network info
      networkDiagnostics.networkInfo = originalNetworkInfo;
    });
  });

  describe('Network Path Analysis', () => {
    test('should analyze network path', async () => {
      const result = await networkDiagnostics.analyzeNetworkPath('example.com');

      expect(result).toMatchObject({
        hops: expect.any(Array),
        totalHops: expect.any(Number),
        pathMTU: 1500,
        routingIssues: expect.any(Array)
      });

      expect(result.totalHops).toBeGreaterThanOrEqual(5);
      expect(result.totalHops).toBeLessThanOrEqual(20);

      if (result.hops.length > 0) {
        expect(result.hops[0]).toMatchObject({
          hop: expect.any(Number),
          ip: expect.any(String),
          hostname: expect.any(String),
          rtt: expect.any(Number),
          loss: expect.any(Number)
        });
      }
    });

    test('should detect routing issues', async () => {
      const result = await networkDiagnostics.analyzeNetworkPath('example.com');

      // Check if routing issues are detected based on simulated conditions
      if (result.hops.some(hop => hop.rtt > 200)) {
        expect(result.routingIssues).toContain('High latency detected in network path');
      }

      if (result.hops.some(hop => hop.loss > 1)) {
        expect(result.routingIssues).toContain('Packet loss detected in network path');
      }
    });
  });

  describe('Quality of Service Analysis', () => {
    test('should analyze QoS based on test results', async () => {
      const testResults = {
        latency: { average: 50 },
        jitter: { average: 10 },
        packetLoss: { packetLoss: 0.5 },
        bandwidth: { download: 1000 }
      };

      const result = await networkDiagnostics.analyzeQoS(testResults);

      expect(result).toMatchObject({
        dscp: expect.any(String),
        prioritization: expect.any(Boolean),
        trafficShaping: expect.any(String),
        recommendations: expect.any(Array)
      });
    });

    test('should detect well-configured QoS', async () => {
      const excellentTestResults = {
        latency: { average: 20 },
        jitter: { average: 5 },
        packetLoss: { packetLoss: 0.1 },
        bandwidth: { download: 2000 }
      };

      const result = await networkDiagnostics.analyzeQoS(excellentTestResults);

      expect(result.prioritization).toBe(true);
      expect(result.dscp).toBe('likely_configured');
    });

    test('should recommend QoS improvements for poor conditions', async () => {
      const poorTestResults = {
        latency: { average: 300 },
        jitter: { average: 80 },
        packetLoss: { packetLoss: 4.0 },
        bandwidth: { download: 200 }
      };

      const result = await networkDiagnostics.analyzeQoS(poorTestResults);

      expect(result.prioritization).toBe(false);
      expect(result.recommendations).toContain('Consider implementing QoS/DSCP marking for VoIP traffic');
    });
  });

  describe('Network Summary Calculation', () => {
    test('should calculate network summary correctly', () => {
      const tests = {
        connectivity: { reachable: true, status: 'good' },
        latency: { quality: 'excellent', average: 30 },
        jitter: { quality: 'good' },
        packetLoss: { quality: 'excellent', packetLoss: 0.5 },
        bandwidth: { quality: 'good' },
        pathAnalysis: { routingIssues: [] },
        qos: { recommendations: ['Test recommendation'] }
      };

      const summary = networkDiagnostics.calculateNetworkSummary(tests);

      expect(summary).toMatchObject({
        overall: expect.stringMatching(/excellent|good|fair|poor/),
        score: expect.any(Number),
        issues: expect.any(Array),
        recommendations: expect.any(Array)
      });

      expect(summary.score).toBeGreaterThan(70); // Good test results should yield high score
      expect(summary.recommendations).toContain('Test recommendation');
    });

    test('should identify issues in summary', () => {
      const testsWithIssues = {
        connectivity: { reachable: false, status: 'poor' },
        latency: { quality: 'poor', average: 400 },
        packetLoss: { quality: 'poor', packetLoss: 8.0 }
      };

      const summary = networkDiagnostics.calculateNetworkSummary(testsWithIssues);

      expect(summary.overall).toBe('poor');
      expect(summary.issues).toContain('Host is not reachable');
      expect(summary.issues.some(issue => issue.includes('High latency'))).toBe(true);
      expect(summary.issues.some(issue => issue.includes('Packet loss'))).toBe(true);
    });
  });

  describe('Real-time Monitoring', () => {
    test('should start real-time monitoring', () => {
      networkDiagnostics.startRealTimeMonitoring('example.com', 1000);

      expect(networkDiagnostics.monitoringActive).toBe(true);
      expect(networkDiagnostics.monitoringInterval).toBeDefined();
    });

    test('should stop real-time monitoring', () => {
      networkDiagnostics.startRealTimeMonitoring('example.com', 1000);
      networkDiagnostics.stopRealTimeMonitoring();

      expect(networkDiagnostics.monitoringActive).toBe(false);
      expect(networkDiagnostics.monitoringInterval).toBeNull();
    });

    test('should emit real-time updates', (done) => {
      fetch.mockResolvedValue({ ok: true });
      
      const updateCallback = jest.fn(() => {
        networkDiagnostics.stopRealTimeMonitoring();
        expect(updateCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            metrics: expect.any(Object),
            currentQuality: expect.any(Object)
          })
        );
        done();
      });
      
      networkDiagnostics.on('realtimeUpdate', updateCallback);
      networkDiagnostics.startRealTimeMonitoring('example.com', 100);
    });

    test('should update real-time data', () => {
      networkDiagnostics.realtimeData.latency.push({ value: 50, timestamp: Date.now() });
      
      const quality = networkDiagnostics.assessCurrentQuality();
      
      expect(quality).toMatch(/excellent|good|fair|poor|unknown/);
    });
  });

  describe('Quality Assessment', () => {
    test('should assess latency quality correctly', () => {
      expect(networkDiagnostics.assessLatencyQuality(30)).toBe('excellent');
      expect(networkDiagnostics.assessLatencyQuality(75)).toBe('good');
      expect(networkDiagnostics.assessLatencyQuality(150)).toBe('fair');
      expect(networkDiagnostics.assessLatencyQuality(250)).toBe('poor');
    });

    test('should assess jitter quality correctly', () => {
      expect(networkDiagnostics.assessJitterQuality(5)).toBe('excellent');
      expect(networkDiagnostics.assessJitterQuality(20)).toBe('good');
      expect(networkDiagnostics.assessJitterQuality(40)).toBe('fair');
      expect(networkDiagnostics.assessJitterQuality(80)).toBe('poor');
    });

    test('should assess packet loss quality correctly', () => {
      expect(networkDiagnostics.assessPacketLossQuality(0.3)).toBe('excellent');
      expect(networkDiagnostics.assessPacketLossQuality(0.8)).toBe('good');
      expect(networkDiagnostics.assessPacketLossQuality(2.5)).toBe('fair');
      expect(networkDiagnostics.assessPacketLossQuality(4.0)).toBe('poor');
    });

    test('should assess bandwidth quality correctly', () => {
      expect(networkDiagnostics.assessBandwidthQuality(1500)).toBe('excellent');
      expect(networkDiagnostics.assessBandwidthQuality(750)).toBe('good');
      expect(networkDiagnostics.assessBandwidthQuality(300)).toBe('fair');
      expect(networkDiagnostics.assessBandwidthQuality(50)).toBe('poor');
    });
  });

  describe('Data Management', () => {
    test('should retrieve test results by ID', () => {
      const testId = 'test-123';
      const testResult = { testId, status: 'completed' };
      
      networkDiagnostics.testResults.set(testId, testResult);
      
      const retrieved = networkDiagnostics.getTestResults(testId);
      expect(retrieved).toEqual(testResult);
    });

    test('should get real-time data', () => {
      const realTimeData = networkDiagnostics.getRealTimeData();
      
      expect(realTimeData).toMatchObject({
        latency: expect.any(Array),
        jitter: expect.any(Array),
        packetLoss: expect.any(Number),
        bandwidth: expect.any(Object),
        connectionQuality: expect.any(String),
        timestamp: null
      });
    });

    test('should get network information', () => {
      const networkInfo = networkDiagnostics.getNetworkInfo();
      
      expect(networkInfo).toMatchObject({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false
      });
    });

    test('should clear results', () => {
      networkDiagnostics.testResults.set('test-1', { data: 'test' });
      networkDiagnostics.realtimeData.latency.push({ value: 50, timestamp: Date.now() });
      
      networkDiagnostics.clearResults();
      
      expect(networkDiagnostics.testResults.size).toBe(0);
      expect(networkDiagnostics.realtimeData.latency).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle diagnostics errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await networkDiagnostics.runNetworkDiagnostics('unreachable.com');

      expect(result.summary.overall).toBe('error');
      expect(result.summary.issues.some(issue => issue.includes('failed'))).toBe(true);
    });

    test('should handle performance entry errors', () => {
      const invalidEntry = { entryType: 'unknown' };
      
      expect(() => {
        networkDiagnostics.handlePerformanceEntries([invalidEntry]);
      }).not.toThrow();
    });

    test('should handle network change errors gracefully', () => {
      // Temporarily break network info
      const originalNetworkInfo = networkDiagnostics.networkInfo;
      networkDiagnostics.networkInfo = null;
      
      expect(() => {
        networkDiagnostics.handleNetworkChange();
      }).not.toThrow();
      
      // Restore network info
      networkDiagnostics.networkInfo = originalNetworkInfo;
    });
  });

  describe('Performance and Optimization', () => {
    test('should complete diagnostics within reasonable time', async () => {
      fetch.mockResolvedValue({ ok: true });

      const startTime = Date.now();
      const result = await networkDiagnostics.runNetworkDiagnostics('example.com');
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result.duration).toBeLessThan(30000);
    });

    test('should handle concurrent diagnostic requests', async () => {
      fetch.mockResolvedValue({ ok: true });

      const promises = [
        networkDiagnostics.runNetworkDiagnostics('example1.com'),
        networkDiagnostics.runNetworkDiagnostics('example2.com'),
        networkDiagnostics.runNetworkDiagnostics('example3.com')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.testId).toBeDefined();
        expect(result.summary.overall).toMatch(/excellent|good|fair|poor|error/);
      });
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should cleanup resources on destroy', () => {
      networkDiagnostics.startRealTimeMonitoring('example.com', 1000);
      
      // Add some test data
      networkDiagnostics.testResults.set('test-1', { data: 'test' });
      
      networkDiagnostics.destroy();
      
      expect(networkDiagnostics.monitoringActive).toBe(false);
      expect(networkDiagnostics.monitoringInterval).toBeNull();
      expect(networkDiagnostics.testResults.size).toBe(0);
      expect(networkDiagnostics.eventCallbacks).toEqual({});
      expect(navigator.connection.removeEventListener).toHaveBeenCalled();
    });

    test('should disconnect performance observer on destroy', () => {
      const mockDisconnect = jest.fn();
      networkDiagnostics.perfObserver = { disconnect: mockDisconnect };
      
      networkDiagnostics.destroy();
      
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});