/**
 * SIP Diagnostics Service Tests
 * Comprehensive test suite for SIP testing and diagnostics functionality
 */

import { jest } from '@jest/globals';
import SIPDiagnosticsService from '../../../services/diagnostics/SIPDiagnosticsService';

// Mock dependencies
const mockNetworkMonitor = {
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
  isNetworkSuitableForVoIP: jest.fn().mockReturnValue({ suitable: true }),
  networkMetrics: { quality: 'good' },
  getCurrentMetrics: jest.fn().mockReturnValue({ quality: 'good' }),
  getNetworkRecommendations: jest.fn().mockReturnValue([])
};

jest.mock('../../../utils/NetworkMonitor', () => {
  return jest.fn().mockImplementation(() => mockNetworkMonitor);
});

// Mock Web APIs
global.fetch = jest.fn();
global.WebSocket = jest.fn().mockImplementation(() => ({
  onopen: null,
  onerror: null,
  onclose: null,
  close: jest.fn(),
  readyState: 1
}));

global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createDataChannel: jest.fn(),
  createOffer: jest.fn().mockResolvedValue({}),
  setLocalDescription: jest.fn().mockResolvedValue(),
  onicecandidate: null,
  onicecandidateerror: null,
  onicegatheringstatechange: null,
  iceGatheringState: 'gathering',
  close: jest.fn()
}));

global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: jest.fn().mockReturnValue([{
      stop: jest.fn()
    }]),
    getAudioTracks: jest.fn().mockReturnValue([{
      stop: jest.fn()
    }])
  })
};

global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockReturnValue({
    frequency: { value: 0 },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  }),
  createGain: jest.fn().mockReturnValue({
    gain: { value: 0 },
    connect: jest.fn()
  }),
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  createAnalyser: jest.fn().mockReturnValue({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
    connect: jest.fn()
  }),
  destination: {},
  currentTime: 0,
  close: jest.fn()
}));

describe('SIPDiagnosticsService', () => {
  let diagnosticsService;

  beforeEach(() => {
    diagnosticsService = new SIPDiagnosticsService();
    
    // Reset mocks
    fetch.mockClear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    diagnosticsService.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(diagnosticsService).toBeDefined();
      expect(diagnosticsService.testResults).toBeInstanceOf(Map);
      expect(diagnosticsService.diagnosticsHistory).toEqual([]);
      expect(diagnosticsService.isMonitoring).toBe(false);
    });

    test('should have proper test configuration', () => {
      expect(diagnosticsService.testConfig).toMatchObject({
        connectionTimeout: 10000,
        registrationTimeout: 15000,
        audioTestDuration: 5000
      });
    });
  });

  describe('Event System', () => {
    test('should register and emit events', () => {
      const callback = jest.fn();
      diagnosticsService.on('testEvent', callback);
      
      diagnosticsService.emit('testEvent', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should support multiple callbacks for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      diagnosticsService.on('testEvent', callback1);
      diagnosticsService.on('testEvent', callback2);
      
      diagnosticsService.emit('testEvent', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('SIP Configuration Validation', () => {
    test('should validate complete SIP configuration', async () => {
      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 5060,
        transport: 'UDP'
      };

      const result = await diagnosticsService.validateSIPConfiguration(config);

      expect(result).toMatchObject({
        status: expect.any(String),
        score: expect.any(Number),
        issues: expect.any(Array),
        warnings: expect.any(Array),
        details: expect.any(Object)
      });
    });

    test('should detect missing required fields', async () => {
      const config = {
        server: 'sip.example.com'
        // Missing username, password, port
      };

      const result = await diagnosticsService.validateSIPConfiguration(config);

      expect(result.score).toBeLessThan(100);
      expect(result.issues.some(issue => issue.includes('Missing required fields'))).toBe(true);
    });

    test('should validate port numbers', async () => {
      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 99999, // Invalid port
        transport: 'UDP'
      };

      const result = await diagnosticsService.validateSIPConfiguration(config);

      expect(result.issues.some(issue => issue.includes('Invalid port number'))).toBe(true);
    });

    test('should validate server format', async () => {
      const config = {
        server: 'invalid-server-format',
        username: 'testuser',
        password: 'testpass123',
        port: 5060,
        transport: 'UDP'
      };

      const result = await diagnosticsService.validateSIPConfiguration(config);

      expect(result.warnings.some(warning => warning.includes('Server format may be invalid'))).toBe(true);
    });
  });

  describe('Network Connectivity Testing', () => {
    test('should test network connectivity successfully', async () => {
      fetch.mockResolvedValueOnce({
        status: 200,
        ok: true
      });

      const config = {
        server: 'sip.example.com',
        port: 5060,
        transport: 'UDP'
      };

      const result = await diagnosticsService.testNetworkConnectivity(config);

      expect(result).toMatchObject({
        status: expect.any(String),
        latency: expect.any(Number),
        reachable: expect.any(Boolean),
        dnsResolution: expect.any(Boolean)
      });
    });

    test('should handle network connectivity failures', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const config = {
        server: 'unreachable.example.com',
        port: 5060,
        transport: 'UDP'
      };

      const result = await diagnosticsService.testNetworkConnectivity(config);

      expect(result.reachable).toBe(false);
      expect(result.status).toBe('poor');
    });

    test('should test WebSocket connectivity for WS transport', async () => {
      const config = {
        server: 'sip.example.com',
        port: 7443,
        transport: 'WSS'
      };

      const result = await diagnosticsService.testNetworkConnectivity(config);

      expect(WebSocket).toHaveBeenCalledWith('wss://sip.example.com:7443/ws');
      expect(result).toHaveProperty('portOpen');
    });
  });

  describe('SIP Registration Testing', () => {
    test('should simulate SIP registration test', async () => {
      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 5060
      };

      const result = await diagnosticsService.testSIPRegistration(config);

      expect(result).toMatchObject({
        status: expect.any(String),
        registered: expect.any(Boolean),
        responseTime: expect.any(Number),
        authSuccess: expect.any(Boolean)
      });
    });

    test('should handle registration timeout', async () => {
      const config = {
        server: 'slow.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 5060
      };

      // Mock a very slow registration
      const originalTimeout = diagnosticsService.testConfig.registrationTimeout;
      diagnosticsService.testConfig.registrationTimeout = 100; // Very short timeout

      const result = await diagnosticsService.testSIPRegistration(config);

      expect(result.registered).toBe(false);
      expect(result.details.error).toMatch(/timeout/i);

      // Restore original timeout
      diagnosticsService.testConfig.registrationTimeout = originalTimeout;
    });
  });

  describe('Audio Path Testing', () => {
    test('should test microphone access', async () => {
      const config = {};
      const result = await diagnosticsService.testAudioPath(config);

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(result).toMatchObject({
        status: expect.any(String),
        microphoneAccess: expect.any(Boolean),
        speakerTest: expect.any(Boolean),
        codecSupport: expect.any(Array)
      });
    });

    test('should handle microphone permission denied', async () => {
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const config = {};
      const result = await diagnosticsService.testAudioPath(config);

      expect(result.microphoneAccess).toBe(false);
      expect(result.details.microphoneError).toBeDefined();
    });
  });

  describe('STUN/TURN Server Testing', () => {
    test('should test STUN servers', async () => {
      const config = {};
      const result = await diagnosticsService.testSTUNTURNServers(config);

      expect(result).toMatchObject({
        status: expect.any(String),
        stunServers: expect.any(Array),
        turnServers: expect.any(Array),
        natType: expect.any(String)
      });

      expect(RTCPeerConnection).toHaveBeenCalled();
    });

    test('should test TURN servers if configured', async () => {
      const config = {
        turnServers: [{
          urls: 'turn:turn.example.com',
          username: 'turnuser',
          credential: 'turnpass'
        }]
      };

      const result = await diagnosticsService.testSTUNTURNServers(config);

      expect(result.turnServers).toHaveLength(1);
    });
  });

  describe('Quality Metrics Measurement', () => {
    test('should measure network quality metrics', async () => {
      fetch.mockResolvedValue({ ok: true });

      const config = {
        server: 'sip.example.com'
      };

      const result = await diagnosticsService.measureQualityMetrics(config);

      expect(result).toMatchObject({
        status: expect.any(String),
        latency: expect.any(Number),
        jitter: expect.any(Number),
        packetLoss: expect.any(Number),
        mos: expect.any(Number)
      });
    });

    test('should calculate MOS score correctly', () => {
      const latency = 50;
      const jitter = 10;
      const packetLoss = 0.5;

      const mos = diagnosticsService.calculateMOS(latency, jitter, packetLoss);

      expect(mos).toBeGreaterThan(3.0);
      expect(mos).toBeLessThanOrEqual(4.5);
    });

    test('should handle high latency in MOS calculation', () => {
      const latency = 500; // Very high latency
      const jitter = 100;
      const packetLoss = 5;

      const mos = diagnosticsService.calculateMOS(latency, jitter, packetLoss);

      expect(mos).toBeLessThan(2.0);
    });
  });

  describe('Comprehensive Diagnostics', () => {
    test('should run complete diagnostic suite', async () => {
      fetch.mockResolvedValue({ ok: true });

      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 5060,
        transport: 'UDP'
      };

      const result = await diagnosticsService.runComprehensiveDiagnostics(config);

      expect(result).toMatchObject({
        testId: expect.any(String),
        startTime: expect.any(Number),
        config: config,
        tests: {
          configuration: expect.any(Object),
          network: expect.any(Object),
          registration: expect.any(Object),
          audio: expect.any(Object),
          stunTurn: expect.any(Object),
          quality: expect.any(Object)
        },
        overall: expect.any(Object)
      });

      expect(result.tests.configuration).toBeDefined();
      expect(result.tests.network).toBeDefined();
      expect(result.tests.registration).toBeDefined();
      expect(result.overall.status).toMatch(/excellent|good|fair|poor/);
    });

    test('should store test results', async () => {
      fetch.mockResolvedValue({ ok: true });

      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 5060
      };

      const result = await diagnosticsService.runComprehensiveDiagnostics(config);

      expect(diagnosticsService.testResults.has(result.testId)).toBe(true);
      expect(diagnosticsService.diagnosticsHistory).toContain(result);
    });

    test('should emit progress events during diagnostics', async () => {
      fetch.mockResolvedValue({ ok: true });
      
      const progressCallback = jest.fn();
      diagnosticsService.on('testStarted', progressCallback);

      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 5060
      };

      await diagnosticsService.runComprehensiveDiagnostics(config);

      expect(progressCallback).toHaveBeenCalledTimes(6); // 6 test categories
    });
  });

  describe('Real-time Monitoring', () => {
    test('should start real-time monitoring', () => {
      const config = { server: 'sip.example.com' };
      
      diagnosticsService.startRealTimeMonitoring(config, 1000);

      expect(diagnosticsService.isMonitoring).toBe(true);
      expect(diagnosticsService.monitoringInterval).toBeDefined();
    });

    test('should stop real-time monitoring', () => {
      const config = { server: 'sip.example.com' };
      
      diagnosticsService.startRealTimeMonitoring(config, 1000);
      diagnosticsService.stopRealTimeMonitoring();

      expect(diagnosticsService.isMonitoring).toBe(false);
      expect(diagnosticsService.monitoringInterval).toBeNull();
    });

    test('should emit real-time updates', (done) => {
      fetch.mockResolvedValue({ ok: true });
      
      const updateCallback = jest.fn(() => {
        diagnosticsService.stopRealTimeMonitoring();
        expect(updateCallback).toHaveBeenCalled();
        done();
      });
      
      diagnosticsService.on('realTimeUpdate', updateCallback);
      diagnosticsService.startRealTimeMonitoring({ server: 'sip.example.com' }, 100);
    });
  });

  describe('Test Results Management', () => {
    test('should retrieve test results by ID', () => {
      const testId = 'test-123';
      const testResult = { testId, status: 'completed' };
      
      diagnosticsService.testResults.set(testId, testResult);
      
      const retrieved = diagnosticsService.getTestResults(testId);
      expect(retrieved).toEqual(testResult);
    });

    test('should get diagnostics history', () => {
      const history = [
        { testId: 'test-1', status: 'completed' },
        { testId: 'test-2', status: 'completed' }
      ];
      
      diagnosticsService.diagnosticsHistory = history;
      
      const retrieved = diagnosticsService.getDiagnosticsHistory();
      expect(retrieved).toEqual(history);
    });

    test('should get real-time metrics', () => {
      const metrics = diagnosticsService.getRealTimeMetrics();
      
      expect(metrics).toMatchObject({
        latency: expect.any(Array),
        jitter: expect.any(Array),
        packetLoss: expect.any(Number),
        bandwidth: expect.any(Object),
        quality: expect.any(String)
      });
    });

    test('should clear history and results', () => {
      // Add some test data
      diagnosticsService.testResults.set('test-1', { data: 'test' });
      diagnosticsService.diagnosticsHistory.push({ testId: 'test-1' });
      
      diagnosticsService.clearHistory();
      
      expect(diagnosticsService.testResults.size).toBe(0);
      expect(diagnosticsService.diagnosticsHistory).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const config = {
        server: 'unreachable.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 5060
      };

      const result = await diagnosticsService.runComprehensiveDiagnostics(config);

      expect(result.overall.status).toBe('error');
      expect(result.overall.issues.length).toBeGreaterThan(0);
    });

    test('should handle WebSocket connection failures', async () => {
      WebSocket.mockImplementationOnce(() => {
        throw new Error('WebSocket failed');
      });

      const result = await diagnosticsService.testWebSocketConnection({
        server: 'sip.example.com',
        port: 7443,
        transport: 'WSS'
      });

      expect(result).toBe(false);
    });

    test('should handle audio context errors', async () => {
      global.AudioContext.mockImplementationOnce(() => {
        throw new Error('AudioContext failed');
      });

      const config = {};
      const result = await diagnosticsService.testAudioPath(config);

      expect(result.speakerTest).toBe(false);
    });
  });

  describe('Performance and Optimization', () => {
    test('should complete diagnostics within reasonable time', async () => {
      fetch.mockResolvedValue({ ok: true });

      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 5060
      };

      const startTime = Date.now();
      const result = await diagnosticsService.runComprehensiveDiagnostics(config);
      const duration = Date.now() - startTime;

      expect(result.duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    });

    test('should handle concurrent diagnostic requests', async () => {
      fetch.mockResolvedValue({ ok: true });

      const config = {
        server: 'sip.example.com',
        username: 'testuser',
        password: 'testpass123',
        port: 5060
      };

      const promises = [
        diagnosticsService.runComprehensiveDiagnostics(config),
        diagnosticsService.runComprehensiveDiagnostics(config),
        diagnosticsService.runComprehensiveDiagnostics(config)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.testId).toBeDefined();
        expect(result.overall.status).toMatch(/excellent|good|fair|poor|error/);
      });
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should cleanup resources on destroy', () => {
      diagnosticsService.startRealTimeMonitoring({ server: 'sip.example.com' }, 1000);
      
      // Add some test data
      diagnosticsService.testResults.set('test-1', { data: 'test' });
      diagnosticsService.diagnosticsHistory.push({ testId: 'test-1' });
      
      diagnosticsService.destroy();
      
      expect(diagnosticsService.isMonitoring).toBe(false);
      expect(diagnosticsService.monitoringInterval).toBeNull();
      expect(diagnosticsService.testResults.size).toBe(0);
      expect(diagnosticsService.diagnosticsHistory).toEqual([]);
      expect(diagnosticsService.eventCallbacks).toEqual({});
    });
  });
});