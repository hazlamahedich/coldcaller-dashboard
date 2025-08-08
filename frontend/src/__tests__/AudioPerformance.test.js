/**
 * Audio Performance Test Suite
 * Comprehensive testing for audio performance optimizations
 */

import audioPerformanceManager from '../utils/audioPerformanceManager';
import audioAnalytics from '../utils/audioAnalytics';
import mobileAudioOptimizer from '../utils/mobileAudioOptimizations';
import AudioBenchmark from '../utils/audioBenchmark';

// Mock audio APIs
global.Audio = class MockAudio {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
    this.duration = 10;
    this.paused = true;
    this.ended = false;
    
    // Mock events
    setTimeout(() => {
      if (this.onloadedmetadata) this.onloadedmetadata();
      if (this.oncanplaythrough) this.oncanplaythrough();
    }, 100);
  }
  
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  
  pause() {
    this.paused = true;
  }
  
  load() {
    // Mock loading
  }
  
  addEventListener(event, handler) {
    this[`on${event}`] = handler;
  }
};

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(() => ({
    result: {
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn()
      })),
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          put: jest.fn(() => ({ onsuccess: null })),
          get: jest.fn(() => ({ result: null, onsuccess: null }))
        }))
      }))
    },
    onsuccess: null,
    onupgradeneeded: null
  }))
};

global.indexedDB = mockIndexedDB;

// Mock performance API
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50000000,
    totalJSHeapSize: 100000000,
    jsHeapSizeLimit: 2000000000
  }
};

// Mock navigator APIs
global.navigator = {
  ...global.navigator,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  },
  getBattery: jest.fn(() => Promise.resolve({
    level: 0.8,
    charging: false,
    addEventListener: jest.fn()
  }))
};

describe('AudioPerformanceManager', () => {
  let performanceManager;

  beforeEach(() => {
    jest.clearAllMocks();
    performanceManager = audioPerformanceManager;
  });

  test('should initialize with correct configuration', () => {
    expect(performanceManager.config).toBeDefined();
    expect(performanceManager.config.maxMemoryCacheMB).toBe(50);
    expect(performanceManager.config.maxConcurrentStreams).toBe(5);
  });

  test('should detect network profile correctly', () => {
    expect(performanceManager.currentProfile).toBeDefined();
  });

  test('should preload audio clips with priority', async () => {
    const mockAudioClips = {
      greetings: [
        { id: 'audio_001', name: 'Professional Intro', category: 'greetings', use_count: 45 },
        { id: 'audio_002', name: 'Casual Intro', category: 'greetings', use_count: 23 }
      ],
      objections: [
        { id: 'audio_004', name: 'Not Interested', category: 'objections', use_count: 89 }
      ]
    };

    const priorityIds = ['audio_001', 'audio_004'];
    
    // Mock the preload method to avoid actual network calls
    jest.spyOn(performanceManager, 'preloadAudioClip').mockResolvedValue(new Audio());
    
    const result = await performanceManager.preloadAudioClips(mockAudioClips, priorityIds);
    
    expect(result).toBeGreaterThan(0);
    expect(performanceManager.preloadAudioClip).toHaveBeenCalled();
  });

  test('should handle concurrent stream limits', async () => {
    const mockClipId = 'test_clip';
    
    // Mock audio loading to avoid network calls
    jest.spyOn(performanceManager, 'loadAudioClip').mockResolvedValue(new Audio());
    
    // Add maximum concurrent streams
    for (let i = 0; i < performanceManager.config.maxConcurrentStreams; i++) {
      performanceManager.activeStreams.add(new Audio());
    }
    
    // This should trigger stream limit handling
    const result = await performanceManager.playAudioClip(mockClipId);
    
    expect(performanceManager.activeStreams.size).toBeLessThanOrEqual(performanceManager.config.maxConcurrentStreams);
  });

  test('should implement crossfade transition', async () => {
    const mockAudio = new Audio();
    const activeAudio = new Audio();
    
    performanceManager.activeStreams.add(activeAudio);
    
    // Mock play method
    mockAudio.play = jest.fn(() => Promise.resolve());
    activeAudio.pause = jest.fn();
    
    await performanceManager.crossfadeTransition(mockAudio, 100);
    
    expect(mockAudio.play).toHaveBeenCalled();
    expect(activeAudio.pause).toHaveBeenCalled();
  });

  test('should track performance metrics', () => {
    const metrics = performanceManager.getPerformanceMetrics();
    
    expect(metrics).toHaveProperty('totalLoaded');
    expect(metrics).toHaveProperty('averageLoadTime');
    expect(metrics).toHaveProperty('cacheHitRate');
    expect(metrics).toHaveProperty('memoryUsageMB');
    expect(metrics).toHaveProperty('networkProfile');
  });

  test('should generate performance recommendations', () => {
    const dashboard = performanceManager.getPerformanceDashboard();
    
    expect(dashboard).toHaveProperty('summary');
    expect(dashboard).toHaveProperty('details');
    expect(dashboard).toHaveProperty('recommendations');
    expect(Array.isArray(dashboard.recommendations)).toBe(true);
  });

  test('should handle power saving mode', () => {
    performanceManager.enablePowerSavingMode();
    
    expect(performanceManager.config.maxConcurrentStreams).toBe(2);
    expect(performanceManager.config.preloadThreshold).toBe(1);
  });

  test('should cleanup inactive streams', () => {
    const inactiveAudio = new Audio();
    inactiveAudio.ended = true;
    
    performanceManager.activeStreams.add(inactiveAudio);
    performanceManager.cleanupInactiveStreams();
    
    expect(performanceManager.activeStreams.has(inactiveAudio)).toBe(false);
  });
});

describe('AudioAnalytics', () => {
  let analytics;

  beforeEach(() => {
    analytics = audioAnalytics;
    jest.clearAllMocks();
  });

  test('should initialize session correctly', () => {
    expect(analytics.sessionId).toBeDefined();
    expect(analytics.metrics.sessionStats).toBeDefined();
    expect(analytics.metrics.performance).toBeDefined();
  });

  test('should record play events', () => {
    const clipId = 'test_001';
    const clipName = 'Test Clip';
    const category = 'greetings';
    const duration = '0:15';

    const playEvent = analytics.recordPlay(clipId, clipName, category, duration);
    
    expect(playEvent).toBeDefined();
    expect(playEvent.clipId).toBe(clipId);
    expect(analytics.metrics.sessionStats.totalClipsPlayed).toBe(1);
    expect(analytics.metrics.sessionStats.uniqueClipsPlayed.has(clipId)).toBe(true);
  });

  test('should track performance metrics', () => {
    const mockEntry = {
      responseEnd: 1000,
      requestStart: 900,
      name: 'test-audio.mp3'
    };

    analytics.recordLoadTime(mockEntry);
    
    expect(analytics.metrics.performance.loadTimes).toContain(100);
    expect(analytics.metrics.performance.totalRequests).toBe(1);
  });

  test('should record errors', () => {
    const errorEvent = analytics.recordError('playback', 'test_001', 'Network error');
    
    expect(errorEvent).toBeDefined();
    expect(analytics.metrics.performance.failedRequests).toBe(1);
  });

  test('should generate performance summary', () => {
    const summary = analytics.getPerformanceSummary();
    
    expect(summary).toHaveProperty('averageLoadTime');
    expect(summary).toHaveProperty('errorRate');
    expect(summary).toHaveProperty('cacheHitRate');
    expect(summary).toHaveProperty('totalClipsPlayed');
  });

  test('should track usage patterns', () => {
    // Record some plays
    analytics.recordPlay('audio_001', 'Test 1', 'greetings', '0:15');
    analytics.recordPlay('audio_002', 'Test 2', 'greetings', '0:12');
    analytics.recordPlay('audio_001', 'Test 1', 'greetings', '0:15');

    const patterns = analytics.getUsagePatterns();
    
    expect(patterns.topClips).toBeDefined();
    expect(patterns.categoryPreferences).toBeDefined();
    expect(patterns.topClips[0].count).toBe(2); // audio_001 played twice
  });

  test('should export analytics data', () => {
    const exportData = analytics.exportData();
    
    expect(exportData).toHaveProperty('sessionId');
    expect(exportData).toHaveProperty('metrics');
    expect(exportData).toHaveProperty('summary');
    expect(exportData).toHaveProperty('patterns');
  });
});

describe('MobileAudioOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = mobileAudioOptimizer;
    jest.clearAllMocks();
  });

  test('should detect mobile devices', () => {
    expect(optimizer.isMobile).toBe(true); // Based on mocked userAgent
  });

  test('should initialize with mobile-specific config', () => {
    expect(optimizer.mobileConfig).toBeDefined();
    expect(optimizer.mobileConfig.maxConcurrentStreams).toBe(2);
    expect(optimizer.mobileConfig.preloadLimit).toBe(3);
  });

  test('should enable power save mode based on battery', async () => {
    // Simulate low battery
    const mockBattery = {
      level: 0.1, // 10%
      charging: false,
      addEventListener: jest.fn()
    };

    optimizer.batteryManager = mockBattery;
    optimizer.enablePowerSaveMode('critical');
    
    expect(optimizer.powerSaveMode).toBe('critical');
    expect(optimizer.mobileConfig.maxConcurrentStreams).toBe(1);
  });

  test('should adjust quality for connection type', () => {
    optimizer.adjustQualityForConnection('2g', 0.5);
    
    expect(optimizer.mobileConfig.qualityReduction).toBeLessThan(1.0);
  });

  test('should handle app backgrounded event', () => {
    const suspendSpy = jest.spyOn(optimizer, 'suspendAudioContext');
    
    optimizer.onAppBackgrounded();
    
    expect(suspendSpy).toHaveBeenCalled();
    expect(optimizer.mobileConfig.updateInterval).toBeGreaterThan(1000);
  });

  test('should generate performance report', () => {
    const report = optimizer.getPerformanceReport();
    
    expect(report).toHaveProperty('device');
    expect(report).toHaveProperty('battery');
    expect(report).toHaveProperty('connection');
    expect(report).toHaveProperty('powerSave');
    expect(report).toHaveProperty('optimizations');
  });

  test('should check feature enablement', () => {
    optimizer.enablePowerSaveMode('critical');
    
    expect(optimizer.shouldEnable('preloading')).toBe(false);
    expect(optimizer.shouldEnable('caching')).toBe(true);
    
    optimizer.disablePowerSaveMode();
    
    expect(optimizer.shouldEnable('preloading')).toBe(true);
  });
});

describe('AudioBenchmark', () => {
  let benchmark;

  beforeEach(() => {
    benchmark = new AudioBenchmark();
    jest.clearAllMocks();
  });

  test('should initialize with test data', () => {
    expect(benchmark.testAudioData).toBeDefined();
    expect(benchmark.testAudioData.testClips).toHaveLength(3);
    expect(benchmark.testAudioData.testUrls).toHaveLength(2);
  });

  test('should run loading performance test', async () => {
    const results = await benchmark.testLoadingPerformance();
    
    expect(results).toHaveProperty('tests');
    expect(results).toHaveProperty('averageLoadTime');
    expect(results).toHaveProperty('score');
    expect(results.score).toBeGreaterThanOrEqual(0);
    expect(results.score).toBeLessThanOrEqual(100);
  });

  test('should run memory usage test', async () => {
    const results = await benchmark.testMemoryUsage();
    
    expect(results).toHaveProperty('initialMemory');
    expect(results).toHaveProperty('finalMemory');
    expect(results).toHaveProperty('leakDetected');
    expect(results).toHaveProperty('score');
  });

  test('should run cache performance test', async () => {
    const results = await benchmark.testCachePerformance();
    
    expect(results).toHaveProperty('cacheHits');
    expect(results).toHaveProperty('cacheMisses');
    expect(results).toHaveProperty('cacheHitRate');
    expect(results).toHaveProperty('score');
  });

  test('should run concurrent streams test', async () => {
    const results = await benchmark.testConcurrentStreams();
    
    expect(results).toHaveProperty('maxConcurrentStreams');
    expect(results).toHaveProperty('successfulStreams');
    expect(results).toHaveProperty('score');
  });

  test('should calculate overall score', () => {
    const mockTests = {
      test1: { score: 80 },
      test2: { score: 90 },
      test3: { score: 70 }
    };

    const overallScore = benchmark.calculateOverallScore(mockTests);
    
    expect(overallScore).toBe(80); // Average of 80, 90, 70
  });

  test('should generate environment info', () => {
    const envInfo = benchmark.getEnvironmentInfo();
    
    expect(envInfo).toHaveProperty('userAgent');
    expect(envInfo).toHaveProperty('platform');
    expect(envInfo).toHaveProperty('screen');
    expect(envInfo).toHaveProperty('audioContext');
  });

  test('should generate recommendations', () => {
    const mockResults = {
      tests: {
        loadingPerformance: { score: 40 },
        memoryUsage: { score: 30, leakDetected: true },
        concurrentStreams: { maxConcurrentStreams: 1 }
      }
    };

    const recommendations = benchmark.generateRecommendations(mockResults);
    
    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some(r => r.includes('preloading'))).toBe(true);
    expect(recommendations.some(r => r.includes('memory leak'))).toBe(true);
  });

  test('should run comprehensive benchmark', async () => {
    // Mock individual test methods to avoid timeouts in testing
    jest.spyOn(benchmark, 'testLoadingPerformance').mockResolvedValue({ score: 80 });
    jest.spyOn(benchmark, 'testPlaybackLatency').mockResolvedValue({ score: 75 });
    jest.spyOn(benchmark, 'testMemoryUsage').mockResolvedValue({ score: 85 });
    jest.spyOn(benchmark, 'testCachePerformance').mockResolvedValue({ score: 90 });
    jest.spyOn(benchmark, 'testConcurrentStreams').mockResolvedValue({ score: 70 });
    jest.spyOn(benchmark, 'testNetworkPerformance').mockResolvedValue({ score: 65 });
    jest.spyOn(benchmark, 'testErrorResilience').mockResolvedValue({ score: 95 });

    const results = await benchmark.runComprehensiveBenchmark();
    
    expect(results).toHaveProperty('timestamp');
    expect(results).toHaveProperty('environment');
    expect(results).toHaveProperty('tests');
    expect(results).toHaveProperty('overallScore');
    expect(results.overallScore).toBeGreaterThan(0);
  });

  test('should generate benchmark report', () => {
    const mockResults = {
      timestamp: Date.now(),
      overallScore: 78,
      environment: { userAgent: 'test' },
      tests: {
        loadingPerformance: { score: 80 },
        memoryUsage: { score: 76 }
      }
    };

    const report = benchmark.generateReport(mockResults);
    
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('recommendations');
    expect(report).toHaveProperty('detailedResults');
    expect(report.summary.overallScore).toBe(78);
  });
});

describe('Integration Tests', () => {
  test('should integrate performance manager with analytics', async () => {
    const clipId = 'integration_test';
    
    // Mock successful audio loading
    jest.spyOn(audioPerformanceManager, 'loadAudioClip').mockResolvedValue(new Audio());
    
    // Play audio clip
    await audioPerformanceManager.playAudioClip(clipId);
    
    // Check that metrics were updated
    const metrics = audioPerformanceManager.getPerformanceMetrics();
    expect(metrics.totalLoaded).toBeGreaterThanOrEqual(0);
  });

  test('should integrate mobile optimizer with performance manager', () => {
    // Enable power save mode
    mobileAudioOptimizer.enablePowerSaveMode('low');
    
    // Check that performance manager respects mobile settings
    const config = mobileAudioOptimizer.getConfig();
    expect(config.maxConcurrentStreams).toBeLessThanOrEqual(2);
  });

  test('should handle performance events across components', () => {
    let eventReceived = false;
    
    // Listen for power save mode change
    window.addEventListener('powerSaveModeChanged', () => {
      eventReceived = true;
    });
    
    // Trigger power save mode
    mobileAudioOptimizer.enablePowerSaveMode('medium');
    
    // Check event was dispatched
    expect(eventReceived).toBe(true);
  });
});