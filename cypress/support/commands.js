/**
 * Custom Cypress Commands for Comprehensive Testing
 * Testing & QA Engineer - Enhanced E2E Testing Capabilities
 */

// Import cypress-axe for accessibility testing
import 'cypress-axe'

// Import performance testing utilities
import './performance-commands'
import './accessibility-commands'
import './security-commands'
import './visual-commands'

/**
 * Authentication Commands
 */
Cypress.Commands.add('login', (username = 'test@example.com', password = 'password123') => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username, password }
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token)
  })
})

Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('authToken')
  cy.visit('/login')
})

/**
 * Data Seeding Commands
 */
Cypress.Commands.add('seedDatabase', (options = {}) => {
  const defaultData = {
    leads: 10,
    calls: 50,
    notes: 25,
    audioClips: 15
  }
  
  const data = { ...defaultData, ...options }
  
  return cy.task('seedTestData', data)
})

Cypress.Commands.add('cleanupDatabase', () => {
  return cy.task('cleanupTestData')
})

/**
 * Application State Commands
 */
Cypress.Commands.add('setAppState', (state) => {
  cy.window().then((win) => {
    win.localStorage.setItem('appState', JSON.stringify(state))
  })
})

Cypress.Commands.add('getAppState', () => {
  return cy.window().then((win) => {
    const state = win.localStorage.getItem('appState')
    return state ? JSON.parse(state) : {}
  })
})

/**
 * API Testing Commands
 */
Cypress.Commands.add('apiRequest', (method, endpoint, body = null, options = {}) => {
  const defaultOptions = {
    method,
    url: `${Cypress.env('API_BASE_URL')}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${window.localStorage.getItem('authToken') || ''}`
    },
    failOnStatusCode: false,
    ...options
  }
  
  if (body) {
    defaultOptions.body = body
  }
  
  return cy.request(defaultOptions)
})

Cypress.Commands.add('createTestLead', (leadData = {}) => {
  const defaultLead = {
    name: 'Test Lead',
    company: 'Test Company',
    phone: '+1-555-123-4567',
    email: 'test@example.com',
    status: 'New',
    priority: 'Medium'
  }
  
  const lead = { ...defaultLead, ...leadData }
  
  return cy.apiRequest('POST', '/leads', lead).then((response) => {
    expect(response.status).to.eq(201)
    return response.body.data
  })
})

Cypress.Commands.add('createTestCall', (callData = {}) => {
  const defaultCall = {
    lead_id: 'test_lead_001',
    phone_number: '+1-555-123-4567',
    duration: '00:05:30',
    outcome: 'Interested',
    quality_score: 4.5,
    notes: 'Test call notes'
  }
  
  const call = { ...defaultCall, ...callData }
  
  return cy.apiRequest('POST', '/calls', call).then((response) => {
    expect(response.status).to.eq(201)
    return response.body.data
  })
})

/**
 * Audio Testing Commands
 */
Cypress.Commands.add('mockAudioContext', () => {
  cy.window().then((win) => {
    const mockAudioContext = {
      createBufferSource: cy.stub().returns({
        buffer: null,
        connect: cy.stub(),
        start: cy.stub(),
        stop: cy.stub(),
        disconnect: cy.stub()
      }),
      createGain: cy.stub().returns({
        gain: { value: 1 },
        connect: cy.stub(),
        disconnect: cy.stub()
      }),
      destination: {},
      currentTime: 0,
      state: 'running'
    }
    
    win.AudioContext = cy.stub().returns(mockAudioContext)
    win.webkitAudioContext = cy.stub().returns(mockAudioContext)
  })
})

Cypress.Commands.add('uploadTestAudio', (filename = 'test-audio.mp3') => {
  cy.fixture(filename, 'base64').then((audioData) => {
    cy.get('[data-testid="file-input"]').selectFile({
      contents: Cypress.Buffer.from(audioData, 'base64'),
      fileName: filename,
      mimeType: 'audio/mp3'
    })
  })
})

/**
 * VOIP Testing Commands
 */
Cypress.Commands.add('mockVOIPService', () => {
  cy.window().then((win) => {
    win.VOIPService = {
      initialize: cy.stub().resolves(),
      makeCall: cy.stub().resolves({ id: 'test_call_001', status: 'connecting' }),
      hangup: cy.stub().resolves(),
      mute: cy.stub().resolves(),
      unmute: cy.stub().resolves(),
      getStatus: cy.stub().returns('idle')
    }
  })
})

Cypress.Commands.add('simulateIncomingCall', (phoneNumber = '+1-555-999-8888') => {
  cy.window().then((win) => {
    win.dispatchEvent(new CustomEvent('voip-incoming-call', {
      detail: { from: phoneNumber, callId: 'incoming_001' }
    }))
  })
})

/**
 * Mobile Testing Commands
 */
Cypress.Commands.add('setMobileViewport', (device = 'iphone-x') => {
  cy.viewport(device)
  cy.wait(500) // Allow layout to adjust
})

Cypress.Commands.add('simulateTouchGesture', (element, gesture = 'tap') => {
  cy.get(element).then(($el) => {
    const rect = $el[0].getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    switch (gesture) {
      case 'tap':
        cy.get(element).trigger('touchstart', { touches: [{ clientX: centerX, clientY: centerY }] })
        cy.get(element).trigger('touchend')
        break
      case 'press':
        cy.get(element).trigger('touchstart', { touches: [{ clientX: centerX, clientY: centerY }] })
        cy.wait(750) // Long press duration
        cy.get(element).trigger('touchend')
        break
      case 'swipe-left':
        cy.get(element).trigger('touchstart', { touches: [{ clientX: centerX + 50, clientY: centerY }] })
        cy.get(element).trigger('touchmove', { touches: [{ clientX: centerX - 50, clientY: centerY }] })
        cy.get(element).trigger('touchend')
        break
    }
  })
})

/**
 * Performance Testing Commands
 */
Cypress.Commands.add('measurePageLoad', () => {
  cy.window().then((win) => {
    return win.performance.timing.loadEventEnd - win.performance.timing.navigationStart
  })
})

Cypress.Commands.add('measureResourceLoad', (resourceName) => {
  cy.window().then((win) => {
    const entries = win.performance.getEntriesByType('resource')
    const resource = entries.find(entry => entry.name.includes(resourceName))
    return resource ? resource.loadTime : null
  })
})

Cypress.Commands.add('checkPerformanceBudget', (budget = {}) => {
  const defaultBudget = {
    loadTime: 3000,
    jsSize: 500000,
    cssSize: 100000,
    imageSize: 1000000
  }
  
  const performanceBudget = { ...defaultBudget, ...budget }
  
  cy.measurePageLoad().then((loadTime) => {
    expect(loadTime).to.be.lessThan(performanceBudget.loadTime)
  })
  
  cy.window().then((win) => {
    const resources = win.performance.getEntriesByType('resource')
    
    // Check JavaScript bundle size
    const jsResources = resources.filter(r => r.name.includes('.js'))
    const totalJSSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
    expect(totalJSSize).to.be.lessThan(performanceBudget.jsSize)
    
    // Check CSS bundle size
    const cssResources = resources.filter(r => r.name.includes('.css'))
    const totalCSSSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
    expect(totalCSSSize).to.be.lessThan(performanceBudget.cssSize)
  })
})

/**
 * Error Simulation Commands
 */
Cypress.Commands.add('simulateNetworkError', () => {
  cy.intercept('**', { forceNetworkError: true }).as('networkError')
})

Cypress.Commands.add('simulateServerError', (endpoint = '**') => {
  cy.intercept(endpoint, { statusCode: 500, body: { error: 'Internal Server Error' } }).as('serverError')
})

Cypress.Commands.add('simulateSlowNetwork', (delay = 2000) => {
  cy.intercept('**', (req) => {
    req.reply((res) => {
      res.delay(delay)
    })
  }).as('slowNetwork')
})

/**
 * Test Data Management Commands
 */
Cypress.Commands.add('generateTestData', (type, count = 10) => {
  const generators = {
    leads: () => ({
      name: `Test Lead ${Math.floor(Math.random() * 1000)}`,
      company: `Test Company ${Math.floor(Math.random() * 1000)}`,
      phone: `+1-555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `test${Math.floor(Math.random() * 1000)}@example.com`,
      status: ['New', 'Qualified', 'Interested', 'Closed'][Math.floor(Math.random() * 4)]
    }),
    calls: () => ({
      lead_id: `test_lead_${Math.floor(Math.random() * 100)}`,
      duration: `00:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}`,
      outcome: ['Interested', 'Not Interested', 'Callback', 'Qualified'][Math.floor(Math.random() * 4)],
      quality_score: Math.floor(Math.random() * 5) + 1
    }),
    notes: () => ({
      lead_id: `test_lead_${Math.floor(Math.random() * 100)}`,
      content: `Test note content ${Math.floor(Math.random() * 1000)}`,
      type: ['general', 'follow-up', 'meeting'][Math.floor(Math.random() * 3)]
    })
  }
  
  if (!generators[type]) {
    throw new Error(`Unknown test data type: ${type}`)
  }
  
  return Array.from({ length: count }, generators[type])
})

/**
 * Utility Commands
 */
Cypress.Commands.add('waitForAppLoad', (timeout = 10000) => {
  cy.get('[data-testid="app-loaded"]', { timeout }).should('exist')
  cy.get('.loading', { timeout: 5000 }).should('not.exist')
})

Cypress.Commands.add('waitForElement', (selector, timeout = 10000) => {
  cy.get(selector, { timeout }).should('be.visible')
})

Cypress.Commands.add('typeInField', (selector, text, options = {}) => {
  const defaultOptions = {
    delay: 50,
    clear: true,
    ...options
  }
  
  if (defaultOptions.clear) {
    cy.get(selector).clear()
  }
  
  cy.get(selector).type(text, { delay: defaultOptions.delay })
})

Cypress.Commands.add('clickAndWait', (selector, waitSelector = null, timeout = 5000) => {
  cy.get(selector).click()
  
  if (waitSelector) {
    cy.get(waitSelector, { timeout }).should('be.visible')
  } else {
    cy.wait(100) // Small delay for UI updates
  }
})

/**
 * Debug and Reporting Commands
 */
Cypress.Commands.add('logTestStep', (step, data = {}) => {
  cy.log(`Test Step: ${step}`)
  
  if (Object.keys(data).length > 0) {
    cy.log(`Data: ${JSON.stringify(data)}`)
  }
  
  cy.task('logTestResult', {
    test: Cypress.currentTest.title,
    step,
    data,
    timestamp: new Date().toISOString()
  })
})

Cypress.Commands.add('takeScreenshotWithInfo', (name, info = {}) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${name}_${timestamp}`
  
  cy.screenshot(filename)
  
  cy.task('logTestResult', {
    test: Cypress.currentTest.title,
    screenshot: filename,
    info,
    timestamp: new Date().toISOString()
  })
})

// Overwrite default commands for better error handling
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  const defaultOptions = {
    timeout: 30000,
    retryOnStatusCodeFailure: true,
    retryOnNetworkFailure: true,
    ...options
  }
  
  return originalFn(url, defaultOptions)
})

Cypress.Commands.overwrite('get', (originalFn, selector, options) => {
  const defaultOptions = {
    timeout: 10000,
    ...options
  }
  
  return originalFn(selector, defaultOptions)
})