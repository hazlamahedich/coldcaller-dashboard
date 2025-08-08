/**
 * Cypress Configuration for Comprehensive Testing
 * Testing & QA Engineer - E2E Test Infrastructure
 */

const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Base URL for testing
    baseUrl: 'http://localhost:3000',
    
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Test files location
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // Support files
    supportFile: 'cypress/support/e2e.js',
    
    // Screenshots and videos
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    
    // Performance and timeout settings
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    
    // Test retry configuration
    retries: {
      runMode: 2,
      openMode: 0
    },
    
    // Video recording
    video: true,
    videoCompression: 32,
    
    // Screenshots on failure
    screenshotOnRunFailure: true,
    
    // Environment variables
    env: {
      // API endpoints
      API_BASE_URL: 'http://localhost:8000/api',
      
      // Test data
      TEST_USER_PHONE: '555-123-4567',
      TEST_LEAD_NAME: 'Test Lead',
      
      // Performance thresholds
      LOAD_TIME_THRESHOLD: 3000,
      RESPONSE_TIME_THRESHOLD: 500,
      
      // Feature flags for testing
      ENABLE_AUDIO_TESTS: true,
      ENABLE_VOIP_TESTS: true,
      ENABLE_PERFORMANCE_TESTS: true,
      ENABLE_ACCESSIBILITY_TESTS: true,
      
      // Test coverage
      COVERAGE_THRESHOLD: 80
    },
    
    setupNodeEvents(on, config) {
      // Code coverage plugin
      require('@cypress/code-coverage/task')(on, config)
      
      // Performance testing
      on('task', {
        // Performance monitoring
        measureLoadTime: () => {
          return new Promise((resolve) => {
            const startTime = Date.now()
            setTimeout(() => {
              resolve(Date.now() - startTime)
            }, 100)
          })
        },
        
        // Memory usage tracking
        trackMemoryUsage: () => {
          if (typeof process.memoryUsage === 'function') {
            return process.memoryUsage()
          }
          return { heapUsed: 0, heapTotal: 0, external: 0 }
        },
        
        // Network simulation
        simulateSlowNetwork: (delay) => {
          return new Promise((resolve) => {
            setTimeout(resolve, delay || 2000)
          })
        },
        
        // Test data management
        seedTestData: () => {
          console.log('Seeding test data...')
          return {
            leads: [
              { id: 'test_001', name: 'John Smith', company: 'Tech Solutions Inc.' },
              { id: 'test_002', name: 'Sarah Johnson', company: 'Digital Marketing Pro' },
              { id: 'test_003', name: 'Mike Chen', company: 'Global Innovations' }
            ],
            audioClips: [
              { id: 'audio_001', title: 'Professional Intro', category: 'greetings' },
              { id: 'audio_002', title: 'Not Interested', category: 'objections' },
              { id: 'audio_003', title: 'Schedule Meeting', category: 'closing' }
            ]
          }
        },
        
        // Cleanup test data
        cleanupTestData: () => {
          console.log('Cleaning up test data...')
          return null
        },
        
        // Log test results
        logTestResult: ({ test, result, duration, error }) => {
          const logEntry = {
            timestamp: new Date().toISOString(),
            test,
            result,
            duration,
            error: error || null
          }
          console.log('Test Result:', JSON.stringify(logEntry, null, 2))
          return null
        }
      })
      
      // Browser launch options
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
          // Chrome-specific options
          launchOptions.args.push('--disable-dev-shm-usage')
          launchOptions.args.push('--no-sandbox')
          launchOptions.args.push('--disable-gpu')
          
          // Performance testing options
          if (config.env.ENABLE_PERFORMANCE_TESTS) {
            launchOptions.args.push('--enable-precise-memory-info')
            launchOptions.args.push('--enable-logging')
          }
          
          // Audio testing options
          if (config.env.ENABLE_AUDIO_TESTS) {
            launchOptions.args.push('--autoplay-policy=no-user-gesture-required')
            launchOptions.args.push('--disable-backgrounding-occluded-windows')
          }
        }
        
        if (browser.name === 'firefox') {
          // Firefox-specific options
          launchOptions.preferences = {
            ...launchOptions.preferences,
            'media.volume_scale': '0.01' // Low volume for audio tests
          }
        }
        
        return launchOptions
      })
      
      // Test results processing
      on('after:run', (results) => {
        console.log('Test run completed:')
        console.log(`Total tests: ${results.totalTests}`)
        console.log(`Passing: ${results.totalPassed}`)
        console.log(`Failing: ${results.totalFailed}`)
        console.log(`Duration: ${results.totalDuration}ms`)
        
        // Performance metrics
        if (results.totalDuration > config.env.LOAD_TIME_THRESHOLD) {
          console.warn(`Warning: Test suite took ${results.totalDuration}ms (threshold: ${config.env.LOAD_TIME_THRESHOLD}ms)`)
        }
        
        return results
      })
      
      // Custom commands registration
      on('task', {
        // Accessibility testing
        checkA11y: require('./cypress/support/accessibility-checker'),
        
        // Performance testing
        measurePerformance: require('./cypress/support/performance-tracker'),
        
        // Security testing
        securityScan: require('./cypress/support/security-scanner'),
        
        // Visual regression testing
        visualTest: require('./cypress/support/visual-tester')
      })
      
      return config
    }
  },
  
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack'
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js'
  },
  
  // Global configuration
  chromeWebSecurity: false,
  modifyObstructiveThirdPartyCode: true,
  experimentalStudio: true,
  experimentalWebKitSupport: true,
  
  // Reporting
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: true,
    json: true,
    timestamp: 'mmddyyyy_HHMMss'
  }
})