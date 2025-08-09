/**
 * Backend Test Setup
 * Global configuration for backend Jest tests
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Test database configuration - use SQLite for tests to avoid conflicts
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:'; // Use in-memory SQLite for tests
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3001'; // Different port from production
process.env.DB_NAME = 'coldcaller_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_SSL = 'false';

// Disable external service calls during testing
process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
process.env.TWILIO_API_KEY = 'test_api_key';
process.env.TWILIO_API_SECRET = 'test_api_secret';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';

// Set JWT secret for testing
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Mock external dependencies
jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    calls: {
      create: jest.fn().mockResolvedValue({ sid: 'mock_call_sid' }),
      list: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue({ sid: 'mock_call_sid', status: 'completed' })
    },
    recordings: {
      list: jest.fn().mockResolvedValue([])
    },
    jwt: {
      AccessToken: jest.fn().mockImplementation(() => ({
        addGrant: jest.fn(),
        toJwt: jest.fn().mockReturnValue('mock_jwt_token')
      })),
      taskrouter: {
        VoiceGrant: jest.fn()
      }
    }
  }))
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Global test timeout
jest.setTimeout(30000);

// Suppress console output during tests unless there's an error
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep errors for debugging
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { id: 1, email: 'test@example.com' },
    ...overrides
  }),
  
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },
  
  createMockNext: () => jest.fn()
};