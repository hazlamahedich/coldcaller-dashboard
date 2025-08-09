// Jest-dom adds custom jest matchers for asserting on DOM nodes
// This allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
import '@testing-library/jest-dom';

// Mock clipboard API for tests
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
  },
});

// Mock window.alert for tests
global.alert = jest.fn();

// Mock IndexedDB for tests
global.indexedDB = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: jest.fn(),
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(),
          get: jest.fn(),
          put: jest.fn(),
          delete: jest.fn()
        }))
      }))
    }
  })),
  deleteDatabase: jest.fn()
};

// Mock MediaRecorder API
global.MediaRecorder = jest.fn(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  state: 'inactive'
}));

// Mock AudioContext
global.AudioContext = jest.fn(() => ({
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn()
  })),
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    getByteFrequencyData: jest.fn(),
    frequencyBinCount: 1024
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 }
  })),
  destination: {},
  close: jest.fn()
}));

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(() => Promise.resolve({
    getTracks: () => [],
    getVideoTracks: () => [],
    getAudioTracks: () => []
  }))
};

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1
}));

// Mock axios for API calls
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.reject(new Error('Mocked network error'))),
    post: jest.fn(() => Promise.reject(new Error('Mocked network error'))),
    put: jest.fn(() => Promise.reject(new Error('Mocked network error'))),
    delete: jest.fn(() => Promise.reject(new Error('Mocked network error'))),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  get: jest.fn(() => Promise.reject(new Error('Mocked network error'))),
  post: jest.fn(() => Promise.reject(new Error('Mocked network error'))),
  put: jest.fn(() => Promise.reject(new Error('Mocked network error'))),
  delete: jest.fn(() => Promise.reject(new Error('Mocked network error')))
}));

// Mock console methods to reduce noise in test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Only show actual errors, not React warnings
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:')
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
  
  console.warn = jest.fn((...args) => {
    // Suppress specific warnings if needed
    originalWarn.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});