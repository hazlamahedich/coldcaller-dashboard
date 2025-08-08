/**
 * Test Configuration and Setup for Comprehensive Testing Suite
 * Testing & QA Engineer - Advanced Test Infrastructure
 */

// Enhanced test utilities and configuration
export const testConfig = {
  timeouts: {
    short: 3000,
    medium: 10000,
    long: 30000,
    e2e: 60000
  },
  performance: {
    loadTime: 200, // milliseconds
    memoryLimit: 10 * 1024 * 1024, // 10MB
    maxFileSize: 5 * 1024 * 1024 // 5MB
  },
  accessibility: {
    axeRules: {
      'color-contrast': { enabled: true },
      'keyboard-access': { enabled: true },
      'focus-management': { enabled: true },
      'aria-labels': { enabled: true }
    }
  },
  security: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
    rateLimits: {
      requests: 100,
      window: 60000 // 1 minute
    }
  }
};

// Mock implementations for testing
export const mockWebAudioAPI = () => {
  const mockAudioContext = {
    createBufferSource: jest.fn(() => ({
      buffer: null,
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn()
    })),
    createGain: jest.fn(() => ({
      gain: { value: 1 },
      connect: jest.fn(),
      disconnect: jest.fn()
    })),
    decodeAudioData: jest.fn(() => Promise.resolve({
      duration: 10,
      sampleRate: 44100,
      numberOfChannels: 2
    })),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
    suspend: jest.fn(),
    resume: jest.fn(),
    close: jest.fn()
  };

  global.AudioContext = jest.fn(() => mockAudioContext);
  global.webkitAudioContext = jest.fn(() => mockAudioContext);
  
  return mockAudioContext;
};

export const mockMediaRecorderAPI = () => {
  const mockRecorder = {
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    requestData: jest.fn(),
    state: 'inactive',
    mimeType: 'audio/webm',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  };

  global.MediaRecorder = jest.fn(() => mockRecorder);
  global.MediaRecorder.isTypeSupported = jest.fn(() => true);
  
  return mockRecorder;
};

export const mockGetUserMedia = () => {
  const mockStream = {
    getTracks: jest.fn(() => []),
    getAudioTracks: jest.fn(() => []),
    getVideoTracks: jest.fn(() => []),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    clone: jest.fn(),
    active: true,
    id: 'mock-stream'
  };

  global.navigator.mediaDevices = {
    getUserMedia: jest.fn(() => Promise.resolve(mockStream)),
    enumerateDevices: jest.fn(() => Promise.resolve([]))
  };

  return mockStream;
};

// Performance measurement utilities
export const measurePerformance = (fn, label = 'operation') => {
  return async (...args) => {
    const startTime = performance.now();
    const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    const result = await fn(...args);
    
    const endTime = performance.now();
    const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    const metrics = {
      duration: endTime - startTime,
      memoryDelta: endMemory - startMemory,
      label
    };
    
    // Log performance if it exceeds thresholds
    if (metrics.duration > testConfig.performance.loadTime) {
      console.warn(`Performance warning: ${label} took ${metrics.duration.toFixed(2)}ms`);
    }
    
    if (metrics.memoryDelta > testConfig.performance.memoryLimit) {
      console.warn(`Memory warning: ${label} used ${(metrics.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return { result, metrics };
  };
};

// Accessibility testing helpers
export const checkAccessibility = async (component) => {
  const { axe } = await import('axe-core');
  
  const results = await axe.run(component, {
    rules: testConfig.accessibility.axeRules
  });
  
  return results;
};

// Security testing utilities
export const createMaliciousFile = (type = 'script') => {
  const maliciousFiles = {
    script: new File(['<script>alert("XSS")</script>'], 'malicious.js', { type: 'application/javascript' }),
    executable: new File(['\x4d\x5a'], 'malicious.exe', { type: 'application/octet-stream' }),
    oversized: new File([new ArrayBuffer(testConfig.security.maxFileSize + 1)], 'huge.mp3', { type: 'audio/mp3' }),
    invalidType: new File(['fake audio'], 'fake.mp3', { type: 'text/plain' })
  };
  
  return maliciousFiles[type];
};

// Network condition simulation
export const simulateNetworkConditions = (condition = 'slow3g') => {
  const conditions = {
    offline: { online: false, downlink: 0, rtt: Infinity },
    slow3g: { online: true, downlink: 0.4, rtt: 2000 },
    fast3g: { online: true, downlink: 1.6, rtt: 300 },
    wifi: { online: true, downlink: 10, rtt: 50 }
  };
  
  const selectedCondition = conditions[condition];
  
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: selectedCondition.online
  });
  
  global.navigator.connection = selectedCondition;
  
  return selectedCondition;
};

// Test data generators
export const generateMockAudioFile = (options = {}) => {
  const {
    duration = 10,
    size = 1024,
    type = 'audio/mp3',
    name = 'test-audio.mp3'
  } = options;
  
  const buffer = new ArrayBuffer(size);
  const file = new File([buffer], name, { type });
  file.duration = duration;
  
  return file;
};

export const generateMockLead = (overrides = {}) => {
  return {
    id: 'lead_' + Date.now(),
    name: 'Test Lead',
    company: 'Test Company',
    phone: '+1-555-0123',
    email: 'test@example.com',
    status: 'New',
    priority: 'Medium',
    notes: 'Test lead for testing',
    created_at: new Date().toISOString(),
    ...overrides
  };
};

export const generateMockCallLog = (overrides = {}) => {
  return {
    id: 'call_' + Date.now(),
    lead_id: 'lead_123',
    agent_id: 'agent_123',
    phone_number: '+1-555-0123',
    duration: '00:05:30',
    outcome: 'Interested',
    quality_score: 4.5,
    notes: 'Good conversation',
    date: new Date().toISOString(),
    ...overrides
  };
};

// Browser compatibility checks
export const checkBrowserSupport = () => {
  const features = {
    webAudio: !!(window.AudioContext || window.webkitAudioContext),
    mediaRecorder: !!window.MediaRecorder,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
    webSocket: !!window.WebSocket,
    localStorage: !!window.localStorage,
    indexedDB: !!window.indexedDB
  };
  
  return features;
};

// Error simulation
export const simulateError = (type = 'network') => {
  const errors = {
    network: new Error('Network request failed'),
    timeout: new Error('Request timeout'),
    permission: new Error('Permission denied'),
    notFound: new Error('Resource not found'),
    server: new Error('Internal server error'),
    validation: new Error('Validation failed')
  };
  
  return errors[type];
};

// Rate limiting simulation
export const createRateLimiter = (maxRequests = 10, windowMs = 60000) => {
  let requests = 0;
  let windowStart = Date.now();
  
  return () => {
    const now = Date.now();
    
    if (now - windowStart > windowMs) {
      requests = 0;
      windowStart = now;
    }
    
    requests++;
    
    if (requests > maxRequests) {
      throw new Error('Rate limit exceeded');
    }
    
    return true;
  };
};

// Cleanup utilities
export const cleanup = () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Clear local storage
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  
  // Clear session storage
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
  
  // Reset navigator mocks
  if (global.navigator) {
    delete global.navigator.mediaDevices;
    delete global.navigator.connection;
  }
  
  // Reset global mocks
  delete global.AudioContext;
  delete global.MediaRecorder;
};

// Setup function for tests
export const setupTest = (options = {}) => {
  const {
    enableAudio = true,
    enableNetwork = true,
    enablePerformance = true,
    networkCondition = 'wifi'
  } = options;
  
  if (enableAudio) {
    mockWebAudioAPI();
    mockMediaRecorderAPI();
    mockGetUserMedia();
  }
  
  if (enableNetwork) {
    simulateNetworkConditions(networkCondition);
  }
  
  if (enablePerformance && typeof performance === 'undefined') {
    global.performance = {
      now: jest.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 1024 * 1024,
        totalJSHeapSize: 2 * 1024 * 1024,
        jsHeapSizeLimit: 4 * 1024 * 1024
      }
    };
  }
  
  return {
    cleanup: () => cleanup()
  };
};

export default {
  testConfig,
  mockWebAudioAPI,
  mockMediaRecorderAPI,
  mockGetUserMedia,
  measurePerformance,
  checkAccessibility,
  createMaliciousFile,
  simulateNetworkConditions,
  generateMockAudioFile,
  generateMockLead,
  generateMockCallLog,
  checkBrowserSupport,
  simulateError,
  createRateLimiter,
  setupTest,
  cleanup
};