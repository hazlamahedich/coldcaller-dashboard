/**
 * Jest Configuration for Comprehensive Testing
 * Testing & QA Engineer - Complete Test Infrastructure
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/frontend/src/setupTests.js',
    '<rootDir>/backend/src/tests/setup.js'
  ],
  
  // Test patterns
  testMatch: [
    '<rootDir>/frontend/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/frontend/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/backend/src/tests/**/*.{test,spec}.{js}',
    '<rootDir>/backend/src/**/*.{test,spec}.{js}',
    '<rootDir>/backend/tests/**/*.{test,spec}.{js}'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    // Frontend coverage
    'frontend/src/**/*.{js,jsx}',
    '!frontend/src/index.js',
    '!frontend/src/setupTests.js',
    '!frontend/src/data/**',
    '!frontend/src/**/*.stories.{js,jsx}',
    
    // Backend coverage
    'backend/src/**/*.{js}',
    '!backend/src/server.js',
    '!backend/src/scripts/**',
    '!backend/src/data/**',
    '!backend/src/database/migrations/**',
    '!backend/src/database/seeders/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Frontend specific thresholds
    'frontend/src/components/**/*.{js,jsx}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Backend specific thresholds
    'backend/src/controllers/**/*.{js}': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'backend/src/services/**/*.{js}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover',
    'cobertura'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@backend/(.*)$': '<rootDir>/backend/src/$1',
    '^@tests/(.*)$': '<rootDir>/frontend/src/__tests__/$1',
    '^@fixtures/(.*)$': '<rootDir>/backend/src/tests/fixtures/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/frontend/src/__tests__/__mocks__/fileMock.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods'
      ]
    }]
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@testing-library|sip\\.js)/)'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Globals
  globals: {
    'TextEncoder': TextEncoder,
    'TextDecoder': TextDecoder,
    'AbortController': AbortController,
    'fetch': fetch
  },
  
  // Projects for multi-environment testing
  projects: [
    // Frontend tests
    {
      displayName: 'Frontend Tests',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/src/**/*.{test,spec}.{js,jsx}'],
      setupFilesAfterEnv: ['<rootDir>/frontend/src/setupTests.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/frontend/src/__tests__/__mocks__/fileMock.js'
      },
      collectCoverageFrom: [
        'frontend/src/**/*.{js,jsx}',
        '!frontend/src/index.js',
        '!frontend/src/setupTests.js',
        '!frontend/src/data/**'
      ]
    },
    
    // Backend tests
    {
      displayName: 'Backend Tests',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/backend/src/**/*.{test,spec}.{js}',
        '<rootDir>/backend/tests/**/*.{test,spec}.{js}'
      ],
      setupFilesAfterEnv: ['<rootDir>/backend/src/tests/setup.js'],
      moduleNameMapper: {
        '^@backend/(.*)$': '<rootDir>/backend/src/$1',
        '^@fixtures/(.*)$': '<rootDir>/backend/src/tests/fixtures/$1'
      },
      collectCoverageFrom: [
        'backend/src/**/*.{js}',
        '!backend/src/server.js',
        '!backend/src/scripts/**',
        '!backend/src/database/migrations/**'
      ]
    },
    
    
    // Performance tests
    {
      displayName: 'Performance Tests',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/src/__tests__/performance/**/*.{test,spec}.{js,jsx}'],
      setupFilesAfterEnv: ['<rootDir>/frontend/src/setupTests.js'],
      globals: {
        'performance': {
          now: () => Date.now(),
          memory: {
            usedJSHeapSize: 1024 * 1024,
            totalJSHeapSize: 2 * 1024 * 1024,
            jsHeapSizeLimit: 4 * 1024 * 1024
          }
        }
      }
    },
    
    // Security tests
    {
      displayName: 'Security Tests',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/src/__tests__/security/**/*.{test,spec}.{js,jsx}'],
      setupFilesAfterEnv: ['<rootDir>/frontend/src/setupTests.js']
    }
  ],
  
  // Reporters (simplified)
  reporters: [
    'default'
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    'jest-watch-select-projects'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  
  // Verbose output for debugging
  verbose: false,
  
  // Notify on test results (disabled for now)
  notify: false,
  
  // Bail on first test failure (for CI)
  bail: process.env.CI ? 1 : 0,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Maximum worker threads
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Snapshot testing
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true
  },
  
  
  // Global setup and teardown
  globalSetup: './test-utils/global-setup.js',
  globalTeardown: './test-utils/global-teardown.js'
}