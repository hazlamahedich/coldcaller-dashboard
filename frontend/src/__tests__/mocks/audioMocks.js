/**
 * Audio Testing Mocks and Utilities
 * Comprehensive Web Audio API and MediaRecorder API mocks for testing
 */

// Mock Web Audio API
export const createWebAudioMock = () => {
  // Mock AudioContext
  const mockAudioContext = {
    state: 'running',
    sampleRate: 44100,
    currentTime: 0,
    destination: { connect: jest.fn() },
    createBufferSource: jest.fn(() => ({
      buffer: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })),
    createGain: jest.fn(() => ({
      gain: { value: 1, setValueAtTime: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn()
    })),
    createAnalyser: jest.fn(() => ({
      fftSize: 2048,
      frequencyBinCount: 1024,
      connect: jest.fn(),
      disconnect: jest.fn(),
      getByteFrequencyData: jest.fn(),
      getByteTimeDomainData: jest.fn()
    })),
    decodeAudioData: jest.fn().mockResolvedValue({
      length: 44100,
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 2
    }),
    close: jest.fn().mockResolvedValue(),
    suspend: jest.fn().mockResolvedValue(),
    resume: jest.fn().mockResolvedValue()
  };

  // Mock Audio constructor
  const mockAudio = jest.fn().mockImplementation((src) => ({
    src: src || '',
    currentTime: 0,
    duration: 3.5,
    paused: true,
    ended: false,
    volume: 1,
    muted: false,
    readyState: 4, // HAVE_ENOUGH_DATA
    networkState: 1, // NETWORK_IDLE
    play: jest.fn().mockResolvedValue(),
    pause: jest.fn(),
    load: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    onplay: null,
    onpause: null,
    onended: null,
    onerror: null,
    onloadstart: null,
    onloadeddata: null,
    onloadedmetadata: null,
    oncanplay: null,
    oncanplaythrough: null
  }));

  return {
    AudioContext: jest.fn(() => mockAudioContext),
    webkitAudioContext: jest.fn(() => mockAudioContext),
    Audio: mockAudio,
    mockAudioContext,
    mockAudio
  };
};

// Mock MediaRecorder API
export const createMediaRecorderMock = () => {
  const mockMediaRecorder = jest.fn().mockImplementation(() => ({
    state: 'inactive',
    mimeType: 'audio/webm',
    start: jest.fn(() => {
      mockMediaRecorder.state = 'recording';
    }),
    stop: jest.fn(() => {
      mockMediaRecorder.state = 'inactive';
    }),
    pause: jest.fn(() => {
      mockMediaRecorder.state = 'paused';
    }),
    resume: jest.fn(() => {
      mockMediaRecorder.state = 'recording';
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ondataavailable: null,
    onstart: null,
    onstop: null,
    onerror: null
  }));

  mockMediaRecorder.isTypeSupported = jest.fn(() => true);

  return mockMediaRecorder;
};

// Mock getUserMedia for recording tests
export const createGetUserMediaMock = () => {
  const mockStream = {
    id: 'mock-stream-id',
    active: true,
    getTracks: jest.fn(() => [
      {
        id: 'mock-audio-track',
        kind: 'audio',
        label: 'Mock Audio Track',
        enabled: true,
        muted: false,
        stop: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    ]),
    getAudioTracks: jest.fn(() => [
      {
        id: 'mock-audio-track',
        kind: 'audio',
        label: 'Mock Audio Track',
        enabled: true,
        muted: false,
        stop: jest.fn()
      }
    ]),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };

  return jest.fn().mockResolvedValue(mockStream);
};

// Audio file test fixtures
export const audioTestFixtures = {
  validAudioFile: new File(['mock audio data'], 'test-audio.mp3', { 
    type: 'audio/mpeg',
    size: 1024 * 1024 // 1MB
  }),
  
  largeAudioFile: new File(['x'.repeat(10 * 1024 * 1024)], 'large-audio.mp3', { 
    type: 'audio/mpeg',
    size: 10 * 1024 * 1024 // 10MB
  }),
  
  invalidAudioFile: new File(['invalid content'], 'invalid.txt', { 
    type: 'text/plain',
    size: 100
  }),
  
  wavAudioFile: new File(['mock wav data'], 'test-audio.wav', { 
    type: 'audio/wav',
    size: 2 * 1024 * 1024 // 2MB
  }),
  
  mp4AudioFile: new File(['mock mp4 data'], 'test-audio.mp4', { 
    type: 'audio/mp4',
    size: 1.5 * 1024 * 1024 // 1.5MB
  })
};

// Mock audio clip data for testing
export const mockAudioClips = {
  greetings: [
    {
      id: 1,
      name: "Professional Intro",
      duration: "0:15",
      category: "greetings",
      url: "/audio/professional-intro.mp3",
      createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
      id: 2,
      name: "Casual Intro",
      duration: "0:12",
      category: "greetings",
      url: "/audio/casual-intro.mp3",
      createdAt: "2024-01-01T00:00:00.000Z"
    }
  ],
  objections: [
    {
      id: 3,
      name: "Not Interested",
      duration: "0:20",
      category: "objections",
      url: "/audio/not-interested.mp3",
      createdAt: "2024-01-01T00:00:00.000Z"
    }
  ],
  closing: [
    {
      id: 4,
      name: "Schedule Meeting",
      duration: "0:22",
      category: "closing",
      url: "/audio/schedule-meeting.mp3",
      createdAt: "2024-01-01T00:00:00.000Z"
    }
  ]
};

// Mock API responses
export const mockApiResponses = {
  getAllAudioClips: {
    success: true,
    data: mockAudioClips,
    message: 'Audio clips retrieved successfully'
  },
  
  getAudioUrl: (audioId) => ({
    success: true,
    data: { url: `/audio/stream/${audioId}` },
    message: 'Audio URL retrieved successfully'
  }),
  
  uploadSuccess: {
    success: true,
    data: {
      id: 5,
      name: "New Audio Clip",
      category: "greetings",
      duration: "0:18",
      url: "/audio/new-clip.mp3"
    },
    message: 'Audio clip uploaded successfully'
  },
  
  uploadError: {
    success: false,
    data: null,
    message: 'File upload failed'
  },
  
  networkError: {
    success: false,
    data: {},
    message: 'Network error'
  }
};

// Browser compatibility test data
export const browserCompatibilityData = {
  supportedFormats: {
    chrome: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
    firefox: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
    safari: ['audio/mpeg', 'audio/wav', 'audio/mp4'],
    edge: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
  },
  
  webAudioSupport: {
    chrome: true,
    firefox: true,
    safari: true,
    edge: true
  },
  
  mediaRecorderSupport: {
    chrome: true,
    firefox: true,
    safari: false,
    edge: true
  }
};

// Performance test utilities
export const performanceTestUtils = {
  measureAudioLoadTime: async (audioElement) => {
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      audioElement.addEventListener('canplaythrough', () => {
        const endTime = performance.now();
        resolve(endTime - startTime);
      });
      
      audioElement.load();
    });
  },
  
  measureMemoryUsage: () => {
    if (window.performance && window.performance.memory) {
      return {
        usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },
  
  simulateNetworkConditions: (latency = 100, bandwidth = 1000) => {
    // Mock network delay for testing
    return new Promise(resolve => setTimeout(resolve, latency));
  }
};

// Security test utilities
export const securityTestUtils = {
  createMaliciousFile: (filename = 'malicious.exe') => {
    return new File(['malicious content'], filename, { 
      type: 'application/octet-stream',
      size: 1024
    });
  },
  
  createOversizedFile: (sizeInMB = 100) => {
    const content = 'x'.repeat(sizeInMB * 1024 * 1024);
    return new File([content], 'oversized.mp3', { 
      type: 'audio/mpeg',
      size: sizeInMB * 1024 * 1024
    });
  },
  
  validateFileType: (file, allowedTypes) => {
    return allowedTypes.includes(file.type);
  },
  
  validateFileSize: (file, maxSizeInMB = 10) => {
    return file.size <= maxSizeInMB * 1024 * 1024;
  }
};

// Setup function to initialize all mocks
export const setupAudioTestEnvironment = () => {
  const webAudioMocks = createWebAudioMock();
  const mediaRecorderMock = createMediaRecorderMock();
  const getUserMediaMock = createGetUserMediaMock();
  
  // Apply mocks to global objects
  global.AudioContext = webAudioMocks.AudioContext;
  global.webkitAudioContext = webAudioMocks.webkitAudioContext;
  global.Audio = webAudioMocks.Audio;
  global.MediaRecorder = mediaRecorderMock;
  
  // Mock navigator.mediaDevices.getUserMedia
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: getUserMediaMock,
      enumerateDevices: jest.fn().mockResolvedValue([
        {
          deviceId: 'default',
          kind: 'audioinput',
          label: 'Default Audio Input',
          groupId: 'default-group'
        }
      ])
    },
    writable: true
  });
  
  // Mock URL.createObjectURL and URL.revokeObjectURL
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();
  
  return {
    webAudioMocks,
    mediaRecorderMock,
    getUserMediaMock
  };
};

// Cleanup function
export const cleanupAudioTestEnvironment = () => {
  // Restore original implementations
  delete global.AudioContext;
  delete global.webkitAudioContext;
  delete global.Audio;
  delete global.MediaRecorder;
  
  jest.restoreAllMocks();
};

export default {
  createWebAudioMock,
  createMediaRecorderMock,
  createGetUserMediaMock,
  audioTestFixtures,
  mockAudioClips,
  mockApiResponses,
  browserCompatibilityData,
  performanceTestUtils,
  securityTestUtils,
  setupAudioTestEnvironment,
  cleanupAudioTestEnvironment
};