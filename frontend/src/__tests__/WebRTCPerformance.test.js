/**
 * WebRTC Performance Test Suite
 * Tests all WebRTC performance optimization components
 */

import CallQualityManager from '../utils/CallQualityManager';
import NetworkMonitor from '../utils/NetworkMonitor';
import WebRTCOptimizer from '../utils/WebRTCOptimizer';
import MobileCallManager from '../utils/MobileCallManager';

// Mock WebRTC APIs
const mockPeerConnection = {
  getStats: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  connectionState: 'new',
  iceConnectionState: 'new',
  signalingState: 'stable',
  getSenders: jest.fn(() => []),
  getTransceivers: jest.fn(() => []),
  restartIce: jest.fn(),
  close: jest.fn()
};

const mockAudioStream = {
  getAudioTracks: jest.fn(() => [{ kind: 'audio' }]),
  getTracks: jest.fn(() => [{ kind: 'audio', stop: jest.fn() }])
};

// Mock RTCRtpSender
global.RTCRtpSender = {
  getCapabilities: jest.fn(() => ({
    codecs: [
      { mimeType: 'audio/opus' },
      { mimeType: 'audio/G722' },
      { mimeType: 'audio/PCMU' }
    ]
  }))
};

// Mock RTCPeerConnection
global.RTCPeerConnection = jest.fn(() => mockPeerConnection);

// Mock Web Audio API
global.AudioContext = jest.fn(() => ({
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn()
  })),
  createAnalyser: jest.fn(() => ({
    fftSize: 256,
    smoothingTimeConstant: 0.3,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn()
  })),
  close: jest.fn(),
  baseLatency: 0.01,
  outputLatency: 0.02
}));

// Mock navigator APIs
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => Promise.resolve(mockAudioStream)),
    enumerateDevices: jest.fn(() => Promise.resolve([
      { kind: 'audiooutput', deviceId: 'default', label: 'Default' },
      { kind: 'audiooutput', deviceId: 'bluetooth', label: 'Bluetooth Headphones' }
    ])),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

// Mock battery API
Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  value: jest.fn(() => Promise.resolve({
    level: 0.8,
    charging: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }))
});

// Mock connection API
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    type: 'cellular',
    downlink: 10,
    rtt: 100,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

// Mock wake lock API
Object.defineProperty(navigator, 'wakeLock', {
  writable: true,
  value: {
    request: jest.fn(() => Promise.resolve({
      release: jest.fn(() => Promise.resolve())
    }))
  }
});

describe('CallQualityManager', () => {
  let callQualityManager;
  
  beforeEach(() => {
    callQualityManager = new CallQualityManager();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    if (callQualityManager) {
      callQualityManager.destroy();
    }
  });
  
  test('should initialize correctly', async () => {
    await expect(callQualityManager.initialize(mockPeerConnection, mockAudioStream))
      .resolves.not.toThrow();
    
    expect(callQualityManager.peerConnection).toBe(mockPeerConnection);
  });
  
  test('should start and stop monitoring', () => {
    callQualityManager.startMonitoring();
    expect(callQualityManager.monitoringInterval).toBeDefined();
    
    callQualityManager.stopMonitoring();
    expect(callQualityManager.monitoringInterval).toBeNull();
  });
  
  test('should calculate MOS score correctly', () => {
    callQualityManager.qualityMetrics = {
      mos: 4.2,
      packetLoss: 0.5,
      latency: 120,
      jitter: 15,
      rtt: 180
    };
    
    callQualityManager.updateMOSScore();
    expect(callQualityManager.qualityMetrics.mos).toBeGreaterThan(0);
    expect(callQualityManager.qualityMetrics.mos).toBeLessThanOrEqual(5);
  });
  
  test('should provide quality recommendations', () => {
    callQualityManager.qualityMetrics = {
      mos: 2.0,
      packetLoss: 5,
      latency: 300,
      jitter: 50,
      rtt: 400
    };
    
    const recommendations = callQualityManager.getQualityRecommendations();
    expect(recommendations).toBeInstanceOf(Array);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toHaveProperty('issue');
    expect(recommendations[0]).toHaveProperty('message');
    expect(recommendations[0]).toHaveProperty('suggestion');
  });
  
  test('should get current metrics', () => {
    const metrics = callQualityManager.getCurrentMetrics();
    expect(metrics).toHaveProperty('mos');
    expect(metrics).toHaveProperty('rtt');
    expect(metrics).toHaveProperty('jitter');
    expect(metrics).toHaveProperty('packetLoss');
  });
  
  test('should emit events correctly', () => {
    const mockCallback = jest.fn();
    callQualityManager.on('qualityUpdate', mockCallback);
    
    callQualityManager.emit('qualityUpdate', { test: 'data' });
    expect(mockCallback).toHaveBeenCalledWith({ test: 'data' });
  });
});

describe('NetworkMonitor', () => {
  let networkMonitor;
  
  beforeEach(() => {
    networkMonitor = new NetworkMonitor();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    if (networkMonitor) {
      networkMonitor.destroy();
    }
  });
  
  test('should initialize correctly', () => {
    expect(networkMonitor.networkMetrics).toHaveProperty('connectionType');
    expect(networkMonitor.networkMetrics).toHaveProperty('rtt');
    expect(networkMonitor.networkMetrics).toHaveProperty('bandwidth');
  });
  
  test('should start and stop monitoring', () => {
    networkMonitor.startMonitoring();
    expect(networkMonitor.monitoringActive).toBe(true);
    
    networkMonitor.stopMonitoring();
    expect(networkMonitor.monitoringActive).toBe(false);
  });
  
  test('should measure RTT', async () => {
    // Mock successful image load
    const originalImage = global.Image;
    global.Image = class {
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 50);
      }
    };
    
    const rtt = await networkMonitor.measureRTT('https://example.com');
    expect(typeof rtt).toBe('number');
    expect(rtt).toBeGreaterThanOrEqual(0);
    
    global.Image = originalImage;
  });
  
  test('should update connection quality', () => {
    networkMonitor.networkMetrics.rtt = 50;
    networkMonitor.networkMetrics.bandwidth.download = 5000;
    
    networkMonitor.updateConnectionQuality();
    expect(['excellent', 'good', 'fair', 'poor']).toContain(networkMonitor.networkMetrics.quality);
  });
  
  test('should provide network recommendations', () => {
    networkMonitor.networkMetrics.quality = 'poor';
    networkMonitor.networkMetrics.rtt = 500;
    networkMonitor.networkMetrics.connectionType = 'cellular';
    
    const recommendations = networkMonitor.getNetworkRecommendations();
    expect(recommendations).toBeInstanceOf(Array);
    expect(recommendations.length).toBeGreaterThan(0);
  });
  
  test('should check VoIP suitability', () => {
    networkMonitor.networkMetrics = {
      quality: 'good',
      rtt: 150,
      bandwidth: { download: 100 },
      downlink: 0.1,
      connectionType: 'wifi'
    };
    
    const suitability = networkMonitor.isNetworkSuitableForVoIP();
    expect(suitability).toHaveProperty('suitable');
    expect(suitability).toHaveProperty('quality');
    expect(suitability).toHaveProperty('details');
  });
});

describe('WebRTCOptimizer', () => {
  let webrtcOptimizer;
  
  beforeEach(() => {
    webrtcOptimizer = new WebRTCOptimizer();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    if (webrtcOptimizer) {
      webrtcOptimizer.destroy();
    }
  });
  
  test('should initialize correctly', () => {
    expect(webrtcOptimizer.config).toHaveProperty('iceServers');
    expect(webrtcOptimizer.optimization).toHaveProperty('preferredCodecs');
    expect(webrtcOptimizer.statistics).toHaveProperty('connectionAttempts');
  });
  
  test('should create optimized peer connection', async () => {
    const peerConnection = await webrtcOptimizer.createPeerConnection();
    expect(RTCPeerConnection).toHaveBeenCalled();
    expect(webrtcOptimizer.peerConnection).toBeDefined();
  });
  
  test('should get optimal ICE servers', () => {
    const iceServers = webrtcOptimizer.getOptimalICEServers();
    expect(iceServers).toBeInstanceOf(Array);
    expect(iceServers.length).toBeGreaterThan(0);
    expect(iceServers[0]).toHaveProperty('urls');
  });
  
  test('should optimize ICE candidate', () => {
    const candidate = {
      candidate: 'candidate:123456 1 udp 2122260223 192.168.1.100 54400 typ host',
      type: 'host',
      protocol: 'udp'
    };
    
    const optimized = webrtcOptimizer.optimizeICECandidate(candidate);
    expect(optimized).toHaveProperty('priority');
    expect(optimized).toHaveProperty('optimized');
    expect(optimized.optimized).toBe(true);
  });
  
  test('should get optimal media constraints', () => {
    const constraints = webrtcOptimizer.getOptimalMediaConstraints();
    expect(constraints).toHaveProperty('audio');
    expect(constraints.audio).toHaveProperty('echoCancellation');
    expect(constraints.audio).toHaveProperty('noiseSuppression');
    expect(constraints.video).toBe(false);
  });
  
  test('should select optimal codecs', () => {
    const availableCodecs = [
      { mimeType: 'audio/opus' },
      { mimeType: 'audio/G722' },
      { mimeType: 'audio/PCMU' },
      { mimeType: 'audio/unknown' }
    ];
    
    const optimized = webrtcOptimizer.selectOptimalCodecs(availableCodecs);
    expect(optimized).toBeInstanceOf(Array);
    expect(optimized[0].mimeType).toContain('opus'); // Opus should be first
  });
  
  test('should get connection statistics', () => {
    const stats = webrtcOptimizer.getStatistics();
    expect(stats).toHaveProperty('connectionAttempts');
    expect(stats).toHaveProperty('successfulConnections');
    expect(stats).toHaveProperty('failedConnections');
  });
});

describe('MobileCallManager', () => {
  let mobileCallManager;
  
  beforeEach(() => {
    mobileCallManager = new MobileCallManager();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    if (mobileCallManager) {
      mobileCallManager.destroy();
    }
  });
  
  test('should detect mobile device', () => {
    expect(typeof mobileCallManager.isMobile).toBe('boolean');
  });
  
  test('should initialize mobile features', async () => {
    await expect(mobileCallManager.initializeMobileFeatures()).resolves.not.toThrow();
  });
  
  test('should update power save mode', () => {
    mobileCallManager.deviceMetrics.batteryLevel = 0.1;
    mobileCallManager.deviceMetrics.isCharging = false;
    
    mobileCallManager.updatePowerSaveMode();
    expect(mobileCallManager.powerSaveMode).toBe('critical');
    
    mobileCallManager.deviceMetrics.batteryLevel = 0.8;
    mobileCallManager.updatePowerSaveMode();
    expect(mobileCallManager.powerSaveMode).toBe('none');
  });
  
  test('should set call quality levels', () => {
    const mockCallback = jest.fn();
    mobileCallManager.on('qualityChange', mockCallback);
    
    mobileCallManager.setCallQuality('low');
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'low',
        settings: expect.any(Object)
      })
    );
  });
  
  test('should adapt call quality based on conditions', () => {
    const mockCallback = jest.fn();
    mobileCallManager.on('qualityChange', mockCallback);
    
    // Set poor conditions
    mobileCallManager.powerSaveMode = 'critical';
    mobileCallManager.networkQuality = 'poor';
    mobileCallManager.memoryPressure = 'high';
    
    mobileCallManager.adaptCallQuality();
    expect(mockCallback).toHaveBeenCalled();
  });
  
  test('should handle background/foreground transitions', async () => {
    const backgroundCallback = jest.fn();
    const foregroundCallback = jest.fn();
    
    mobileCallManager.on('backgrounded', backgroundCallback);
    mobileCallManager.on('foregrounded', foregroundCallback);
    
    await mobileCallManager.handleBackgroundTransition();
    expect(backgroundCallback).toHaveBeenCalled();
    
    await mobileCallManager.handleForegroundTransition(5000);
    expect(foregroundCallback).toHaveBeenCalled();
  });
  
  test('should provide mobile recommendations', () => {
    mobileCallManager.deviceMetrics.batteryLevel = 0.1;
    mobileCallManager.networkQuality = 'poor';
    mobileCallManager.memoryPressure = 'high';
    
    const recommendations = mobileCallManager.getMobileRecommendations();
    expect(recommendations).toBeInstanceOf(Array);
    expect(recommendations.length).toBeGreaterThan(0);
    
    const batteryRec = recommendations.find(r => r.type === 'battery');
    expect(batteryRec).toBeDefined();
    expect(batteryRec.severity).toBe('high');
  });
  
  test('should get device status', () => {
    const status = mobileCallManager.getDeviceStatus();
    expect(status).toHaveProperty('isMobile');
    expect(status).toHaveProperty('deviceMetrics');
    expect(status).toHaveProperty('powerSaveMode');
    expect(status).toHaveProperty('networkQuality');
    expect(status).toHaveProperty('memoryPressure');
    expect(status).toHaveProperty('audioRouting');
  });
  
  test('should handle wake lock operations', async () => {
    await expect(mobileCallManager.acquireWakeLock()).resolves.not.toThrow();
    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
    
    await expect(mobileCallManager.releaseWakeLock()).resolves.not.toThrow();
  });
});

describe('Integration Tests', () => {
  let callQualityManager;
  let networkMonitor;
  let webrtcOptimizer;
  let mobileCallManager;
  
  beforeEach(async () => {
    callQualityManager = new CallQualityManager();
    networkMonitor = new NetworkMonitor();
    webrtcOptimizer = new WebRTCOptimizer();
    mobileCallManager = new MobileCallManager();
  });
  
  afterEach(() => {
    [callQualityManager, networkMonitor, webrtcOptimizer, mobileCallManager].forEach(manager => {
      if (manager && typeof manager.destroy === 'function') {
        manager.destroy();
      }
    });
  });
  
  test('should integrate all managers for complete WebRTC optimization', async () => {
    // Create optimized peer connection
    const peerConnection = await webrtcOptimizer.createPeerConnection();
    expect(peerConnection).toBeDefined();
    
    // Add optimized media stream
    const stream = await webrtcOptimizer.addOptimizedLocalStream();
    expect(stream).toBeDefined();
    
    // Initialize call quality monitoring
    await callQualityManager.initialize(peerConnection, stream);
    expect(callQualityManager.peerConnection).toBe(peerConnection);
    
    // Start network monitoring
    networkMonitor.startMonitoring(1000);
    expect(networkMonitor.monitoringActive).toBe(true);
    
    // Check mobile optimizations
    const deviceStatus = mobileCallManager.getDeviceStatus();
    expect(deviceStatus).toBeDefined();
  });
  
  test('should coordinate quality adaptation across managers', () => {
    // Simulate poor network conditions
    networkMonitor.networkMetrics.quality = 'poor';
    networkMonitor.networkMetrics.rtt = 500;
    
    // Simulate low battery
    mobileCallManager.deviceMetrics.batteryLevel = 0.15;
    mobileCallManager.updatePowerSaveMode();
    
    // Check that mobile manager adapts quality
    expect(mobileCallManager.powerSaveMode).toBe('critical');
    
    // Verify recommendations are generated
    const networkRecs = networkMonitor.getNetworkRecommendations();
    const mobileRecs = mobileCallManager.getMobileRecommendations();
    
    expect(networkRecs.length).toBeGreaterThan(0);
    expect(mobileRecs.length).toBeGreaterThan(0);
  });
});

describe('Error Handling', () => {
  test('should handle WebRTC initialization errors gracefully', async () => {
    const optimizer = new WebRTCOptimizer();
    
    // Mock RTCPeerConnection to throw error
    global.RTCPeerConnection = jest.fn(() => {
      throw new Error('WebRTC not supported');
    });
    
    await expect(optimizer.createPeerConnection()).rejects.toThrow('WebRTC not supported');
    
    optimizer.destroy();
  });
  
  test('should handle missing browser APIs gracefully', () => {
    // Remove navigator.connection
    const originalConnection = navigator.connection;
    delete navigator.connection;
    
    const monitor = new NetworkMonitor();
    expect(monitor.networkMetrics.connectionType).toBe('unknown');
    
    // Restore
    navigator.connection = originalConnection;
    monitor.destroy();
  });
  
  test('should handle audio context creation failure', async () => {
    const originalAudioContext = global.AudioContext;
    global.AudioContext = jest.fn(() => {
      throw new Error('Audio context creation failed');
    });
    
    const qualityManager = new CallQualityManager();
    
    // Should not throw even if audio context fails
    await expect(qualityManager.initialize(mockPeerConnection, mockAudioStream))
      .resolves.not.toThrow();
    
    global.AudioContext = originalAudioContext;
    qualityManager.destroy();
  });
});

describe('Performance Tests', () => {
  jest.setTimeout(10000);
  
  test('should handle rapid quality updates efficiently', () => {
    const qualityManager = new CallQualityManager();
    const updates = [];
    
    qualityManager.on('qualityUpdate', (data) => {
      updates.push(data);
    });
    
    // Simulate 100 rapid updates
    for (let i = 0; i < 100; i++) {
      qualityManager.qualityMetrics.mos = 3.0 + Math.random();
      qualityManager.updateMOSScore();
    }
    
    expect(updates.length).toBe(100);
    expect(qualityManager.qualityHistory.length).toBeLessThanOrEqual(100);
    
    qualityManager.destroy();
  });
  
  test('should clean up resources properly', () => {
    const managers = [
      new CallQualityManager(),
      new NetworkMonitor(),
      new WebRTCOptimizer(),
      new MobileCallManager()
    ];
    
    // Verify all managers are created
    managers.forEach(manager => {
      expect(manager).toBeDefined();
    });
    
    // Destroy all managers
    managers.forEach(manager => {
      expect(() => manager.destroy()).not.toThrow();
    });
  });
});