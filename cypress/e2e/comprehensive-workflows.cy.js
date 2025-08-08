/**
 * Comprehensive End-to-End Testing Suite
 * Testing & QA Engineer - Complete User Workflow Testing
 */

describe('Comprehensive E2E Workflow Testing', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/')
    
    // Wait for the application to fully load
    cy.get('[data-testid="app-loaded"]').should('exist')
    cy.get('.loading').should('not.exist')
    
    // Set viewport for consistent testing
    cy.viewport(1280, 720)
  })

  describe('Complete Sales Call Workflow', () => {
    it('should complete a full sales call from start to finish', () => {
      // Step 1: Verify dashboard loads
      cy.get('h1').should('contain', 'Cold Calling Dashboard')
      cy.get('[data-testid="dial-pad"]').should('be.visible')
      cy.get('[data-testid="audio-clips"]').should('be.visible')
      cy.get('[data-testid="call-scripts"]').should('be.visible')
      cy.get('[data-testid="lead-panel"]').should('be.visible')

      // Step 2: Review current lead
      cy.get('[data-testid="current-lead-name"]').should('contain', 'John Smith')
      cy.get('[data-testid="current-lead-company"]').should('contain', 'Tech Solutions Inc.')
      cy.get('[data-testid="current-lead-phone"]').should('be.visible')

      // Step 3: Review the script before calling
      cy.get('[data-testid="script-introduction"]').click()
      cy.get('[data-testid="script-content"]').should('contain', 'Hi [NAME]')
      cy.get('[data-testid="script-copy-button"]').click()
      cy.get('[data-testid="copy-success"]').should('be.visible')

      // Step 4: Enter phone number
      cy.get('[data-testid="phone-input"]').clear()
      cy.get('[data-testid="dial-5"]').click()
      cy.get('[data-testid="dial-5"]').click()
      cy.get('[data-testid="dial-5"]').click()
      cy.get('[data-testid="dial-1"]').click()
      cy.get('[data-testid="dial-2"]').click()
      cy.get('[data-testid="dial-3"]').click()
      cy.get('[data-testid="dial-4"]').click()
      cy.get('[data-testid="dial-5"]').click()
      cy.get('[data-testid="dial-6"]').click()
      cy.get('[data-testid="dial-7"]').click()
      
      // Verify number is formatted correctly
      cy.get('[data-testid="phone-input"]').should('have.value', '555-123-4567')

      // Step 5: Start the call
      cy.get('[data-testid="call-button"]').click()
      cy.get('[data-testid="call-status"]').should('contain', 'Call in progress')
      cy.get('[data-testid="hang-up-button"]').should('be.visible')
      cy.get('[data-testid="call-timer"]').should('be.visible')

      // Step 6: Use audio clips during call
      cy.get('[data-testid="audio-category-greetings"]').click()
      cy.get('[data-testid="audio-play-professional-intro"]').click()
      cy.get('[data-testid="audio-status"]').should('contain', 'Playing audio clip')

      // Switch to objections when needed
      cy.get('[data-testid="audio-category-objections"]').click()
      cy.get('[data-testid="audio-play-not-interested"]').click()

      // Step 7: Take notes during call
      cy.get('[data-testid="notes-edit-button"]').click()
      cy.get('[data-testid="notes-textarea"]')
        .clear()
        .type('Spoke with decision maker. Interested in Q2 implementation. Follow up needed on pricing.')
      cy.get('[data-testid="notes-save-button"]').click()
      cy.get('[data-testid="notes-save-success"]').should('be.visible')

      // Step 8: End the call
      cy.get('[data-testid="hang-up-button"]').click()
      cy.get('[data-testid="call-status"]').should('contain', 'Call ended')
      cy.get('[data-testid="call-button"]').should('be.visible')

      // Step 9: Log call outcome
      cy.get('[data-testid="call-outcome-select"]').select('Interested')
      cy.get('[data-testid="call-quality-rating"]').find('[data-rating="4"]').click()
      cy.get('[data-testid="call-log-save"]').click()

      // Step 10: Verify call appears in recent calls
      cy.get('[data-testid="recent-calls"]').should('contain', 'John Smith')
      cy.get('[data-testid="recent-calls"]').should('contain', '555-123-4567')
    })

    it('should handle call interruptions and resumption', () => {
      // Start a call
      cy.get('[data-testid="phone-input"]').type('555-987-6543')
      cy.get('[data-testid="call-button"]').click()
      
      // Simulate network interruption
      cy.intercept('POST', '/api/calls/start', { networkError: true }).as('networkError')
      
      // Should show error state
      cy.get('[data-testid="call-error"]').should('be.visible')
      cy.get('[data-testid="retry-call-button"]').should('be.visible')

      // Restore network and retry
      cy.intercept('POST', '/api/calls/start', { fixture: 'call-success.json' }).as('callSuccess')
      cy.get('[data-testid="retry-call-button"]').click()
      
      cy.wait('@callSuccess')
      cy.get('[data-testid="call-status"]').should('contain', 'Call in progress')
    })

    it('should support call transfers', () => {
      // Start a call
      cy.get('[data-testid="phone-input"]').type('555-111-2222')
      cy.get('[data-testid="call-button"]').click()
      
      // Initiate transfer
      cy.get('[data-testid="call-transfer-button"]').click()
      cy.get('[data-testid="transfer-modal"]').should('be.visible')
      
      // Enter transfer target
      cy.get('[data-testid="transfer-target-input"]').type('555-333-4444')
      cy.get('[data-testid="transfer-confirm-button"]').click()
      
      // Verify transfer initiated
      cy.get('[data-testid="call-status"]').should('contain', 'Transferring')
      cy.get('[data-testid="transfer-target"]').should('contain', '555-333-4444')
    })
  })

  describe('Lead Management Workflow', () => {
    it('should navigate through all leads efficiently', () => {
      // Verify initial lead
      cy.get('[data-testid="lead-counter"]').should('contain', 'Lead 1 of 3')
      cy.get('[data-testid="current-lead-name"]').should('contain', 'John Smith')

      // Navigate to next lead
      cy.get('[data-testid="next-lead-button"]').click()
      cy.get('[data-testid="lead-counter"]').should('contain', 'Lead 2 of 3')
      cy.get('[data-testid="current-lead-name"]').should('contain', 'Sarah Johnson')

      // Navigate to last lead
      cy.get('[data-testid="next-lead-button"]').click()
      cy.get('[data-testid="lead-counter"]').should('contain', 'Lead 3 of 3')
      cy.get('[data-testid="current-lead-name"]').should('contain', 'Mike Chen')

      // Next button should be disabled at end
      cy.get('[data-testid="next-lead-button"]').should('be.disabled')

      // Navigate backwards
      cy.get('[data-testid="prev-lead-button"]').click()
      cy.get('[data-testid="lead-counter"]').should('contain', 'Lead 2 of 3')
      cy.get('[data-testid="current-lead-name"]').should('contain', 'Sarah Johnson')
    })

    it('should update lead information correctly', () => {
      // Start editing lead
      cy.get('[data-testid="edit-lead-button"]').click()
      cy.get('[data-testid="edit-lead-modal"]').should('be.visible')

      // Update lead information
      cy.get('[data-testid="lead-status-select"]').select('Qualified')
      cy.get('[data-testid="lead-priority-select"]').select('High')
      cy.get('[data-testid="lead-notes-textarea"]')
        .clear()
        .type('Updated lead information after initial contact.')

      // Save changes
      cy.get('[data-testid="save-lead-button"]').click()
      cy.get('[data-testid="edit-lead-modal"]').should('not.exist')

      // Verify changes are reflected
      cy.get('[data-testid="lead-status-badge"]').should('contain', 'Qualified')
      cy.get('[data-testid="lead-priority-badge"]').should('contain', 'High')
      cy.get('[data-testid="lead-notes"]').should('contain', 'Updated lead information')
    })

    it('should search and filter leads', () => {
      // Open lead search
      cy.get('[data-testid="search-leads-button"]').click()
      cy.get('[data-testid="search-modal"]').should('be.visible')

      // Search by name
      cy.get('[data-testid="search-input"]').type('Sarah')
      cy.get('[data-testid="search-results"]').should('contain', 'Sarah Johnson')
      cy.get('[data-testid="search-results"]').should('not.contain', 'John Smith')

      // Apply filters
      cy.get('[data-testid="filter-status"]').select('New')
      cy.get('[data-testid="filter-priority"]').select('High')
      cy.get('[data-testid="apply-filters-button"]').click()

      // Verify filtered results
      cy.get('[data-testid="search-results-count"]').should('be.visible')
      cy.get('[data-testid="search-results"]').should('exist')
    })
  })

  describe('Audio System Workflow', () => {
    it('should play audio clips from all categories', () => {
      const categories = [
        { name: 'Greetings', clips: ['Professional Intro', 'Casual Intro', 'Executive Intro'] },
        { name: 'Objections', clips: ['Not Interested', 'Too Busy', 'Send Email'] },
        { name: 'Closing', clips: ['Schedule Meeting', 'Request Quote', 'Follow Up'] }
      ]

      categories.forEach(category => {
        // Click category tab
        cy.get(`[data-testid="audio-category-${category.name.toLowerCase()}"]`).click()
        
        // Verify clips are shown
        category.clips.forEach(clip => {
          cy.get(`[data-testid="audio-clip-${clip.replace(/\s+/g, '-').toLowerCase()}"]`).should('be.visible')
        })

        // Play first clip in category
        cy.get(`[data-testid="audio-play-${category.clips[0].replace(/\s+/g, '-').toLowerCase()}"]`).click()
        cy.get('[data-testid="audio-status"]').should('contain', 'Playing audio clip')
        
        // Stop the clip
        cy.get(`[data-testid="audio-pause-${category.clips[0].replace(/\s+/g, '-').toLowerCase()}"]`).click()
        cy.get('[data-testid="audio-status"]').should('not.contain', 'Playing audio clip')
      })
    })

    it('should handle audio upload workflow', () => {
      // Open audio upload
      cy.get('[data-testid="upload-audio-button"]').click()
      cy.get('[data-testid="upload-modal"]').should('be.visible')

      // Select file
      const fileName = 'test-audio.mp3'
      cy.fixture(fileName).then(fileContent => {
        cy.get('[data-testid="file-input"]').selectFile({
          contents: Cypress.Buffer.from(fileContent),
          fileName: fileName,
          mimeType: 'audio/mp3'
        })
      })

      // Set audio properties
      cy.get('[data-testid="audio-category-select"]').select('greetings')
      cy.get('[data-testid="audio-title-input"]').type('Custom Greeting')
      cy.get('[data-testid="audio-description-textarea"]').type('Custom audio clip for testing')

      // Upload file
      cy.get('[data-testid="upload-button"]').click()
      cy.get('[data-testid="upload-progress"]').should('be.visible')

      // Verify upload success
      cy.get('[data-testid="upload-success"]').should('be.visible')
      cy.get('[data-testid="upload-modal"]').should('not.exist')

      // Verify new clip appears in list
      cy.get('[data-testid="audio-category-greetings"]').click()
      cy.get('[data-testid="audio-clip-custom-greeting"]').should('be.visible')
    })

    it('should handle audio file validation', () => {
      // Open audio upload
      cy.get('[data-testid="upload-audio-button"]').click()

      // Try to upload invalid file type
      cy.fixture('test-image.jpg').then(fileContent => {
        cy.get('[data-testid="file-input"]').selectFile({
          contents: Cypress.Buffer.from(fileContent),
          fileName: 'test-image.jpg',
          mimeType: 'image/jpeg'
        }, { force: true })
      })

      // Should show validation error
      cy.get('[data-testid="file-error"]').should('contain', 'Invalid file type')
      cy.get('[data-testid="upload-button"]').should('be.disabled')

      // Try oversized file
      cy.get('[data-testid="file-size-input"]').invoke('val', '50000000') // 50MB
      cy.get('[data-testid="file-error"]').should('contain', 'File too large')
    })
  })

  describe('Note-Taking System Workflow', () => {
    it('should create and manage notes effectively', () => {
      // Start with editing notes
      cy.get('[data-testid="notes-edit-button"]').click()
      cy.get('[data-testid="notes-textarea"]').should('be.visible')

      // Add initial note
      const initialNote = 'Initial contact made. Prospect showed interest in product demo.'
      cy.get('[data-testid="notes-textarea"]').type(initialNote)
      cy.get('[data-testid="notes-save-button"]').click()

      // Verify note is saved
      cy.get('[data-testid="notes-display"]').should('contain', initialNote)
      cy.get('[data-testid="notes-edit-button"]').should('be.visible')

      // Edit existing note
      cy.get('[data-testid="notes-edit-button"]').click()
      const additionalNote = '\n\nFollow-up: Schedule demo for next week.'
      cy.get('[data-testid="notes-textarea"]').type(additionalNote)
      cy.get('[data-testid="notes-save-button"]').click()

      // Verify updated note
      cy.get('[data-testid="notes-display"]').should('contain', initialNote)
      cy.get('[data-testid="notes-display"]').should('contain', 'Schedule demo for next week')
    })

    it('should use note templates', () => {
      // Open note templates
      cy.get('[data-testid="note-templates-button"]').click()
      cy.get('[data-testid="templates-modal"]').should('be.visible')

      // Select a template
      cy.get('[data-testid="template-initial-contact"]').click()
      cy.get('[data-testid="use-template-button"]').click()

      // Verify template is applied
      cy.get('[data-testid="notes-textarea"]').should('contain', 'Initial Contact')
      cy.get('[data-testid="notes-textarea"]').should('contain', 'Date:')
      cy.get('[data-testid="notes-textarea"]').should('contain', 'Outcome:')

      // Customize the template
      cy.get('[data-testid="notes-textarea"]')
        .type('\n\nCustom notes: Prospect interested in enterprise features.')

      cy.get('[data-testid="notes-save-button"]').click()

      // Verify custom content is saved
      cy.get('[data-testid="notes-display"]').should('contain', 'Custom notes: Prospect interested')
    })

    it('should handle note search and filtering', () => {
      // Create multiple notes for testing
      const notes = [
        'First call - no answer, left voicemail',
        'Second call - spoke with assistant, callback requested',
        'Third call - connected with decision maker'
      ]

      notes.forEach((note, index) => {
        cy.get('[data-testid="notes-edit-button"]').click()
        cy.get('[data-testid="notes-textarea"]').clear().type(note)
        cy.get('[data-testid="notes-save-button"]').click()
        
        // Navigate to next lead for variety
        if (index < notes.length - 1) {
          cy.get('[data-testid="next-lead-button"]').click()
        }
      })

      // Open note search
      cy.get('[data-testid="search-notes-button"]').click()
      cy.get('[data-testid="notes-search-modal"]').should('be.visible')

      // Search for specific term
      cy.get('[data-testid="notes-search-input"]').type('decision maker')
      cy.get('[data-testid="search-results"]').should('contain', 'Third call')
      cy.get('[data-testid="search-results"]').should('not.contain', 'First call')

      // Filter by date
      cy.get('[data-testid="date-filter-today"]').click()
      cy.get('[data-testid="search-results"]').should('have.length.greaterThan', 0)
    })
  })

  describe('Script Management Workflow', () => {
    it('should navigate through all script categories', () => {
      const scriptCategories = [
        { name: 'Introduction', content: 'Hi [NAME]' },
        { name: 'Qualification', content: 'tell me about your current' },
        { name: 'Objection Handling', content: 'I completely understand' },
        { name: 'Closing', content: 'perfect time to move forward' },
        { name: 'Gatekeeper', content: 'trying to reach the person' }
      ]

      scriptCategories.forEach(script => {
        // Click script category
        cy.get(`[data-testid="script-${script.name.replace(/\s+/g, '-').toLowerCase()}"]`).click()
        
        // Verify script content is displayed
        cy.get('[data-testid="script-content"]').should('contain', script.content)
        
        // Test copy functionality
        cy.get('[data-testid="script-copy-button"]').click()
        cy.get('[data-testid="copy-success"]').should('be.visible')
        
        // Test expand/collapse
        cy.get('[data-testid="script-expand-button"]').click()
        cy.get('[data-testid="script-expanded-content"]').should('be.visible')
        
        cy.get('[data-testid="script-collapse-button"]').click()
        cy.get('[data-testid="script-expanded-content"]').should('not.exist')
      })
    })

    it('should customize and save scripts', () => {
      // Select a script to customize
      cy.get('[data-testid="script-introduction"]').click()
      cy.get('[data-testid="customize-script-button"]').click()
      
      // Customize script content
      cy.get('[data-testid="script-editor"]').should('be.visible')
      cy.get('[data-testid="script-editor-textarea"]')
        .clear()
        .type('Hello [NAME], this is [AGENT] from [COMPANY]. How are you doing today?')
      
      // Save customization
      cy.get('[data-testid="save-script-button"]').click()
      cy.get('[data-testid="script-save-success"]').should('be.visible')
      
      // Verify customization is applied
      cy.get('[data-testid="script-content"]').should('contain', 'How are you doing today?')
    })
  })

  describe('Real-time Features Workflow', () => {
    it('should handle WebSocket connections for real-time updates', () => {
      // Mock WebSocket connection
      cy.window().its('WebSocket').should('exist')
      
      // Verify real-time status indicator
      cy.get('[data-testid="connection-status"]').should('contain', 'Connected')
      
      // Simulate real-time call update
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('websocket-message', {
          detail: {
            type: 'call-update',
            data: { status: 'incoming', from: '+1-555-999-8888' }
          }
        }))
      })
      
      // Verify incoming call notification
      cy.get('[data-testid="incoming-call-notification"]').should('be.visible')
      cy.get('[data-testid="incoming-call-number"]').should('contain', '555-999-8888')
    })

    it('should handle call quality monitoring', () => {
      // Start a call to enable quality monitoring
      cy.get('[data-testid="phone-input"]').type('555-123-4567')
      cy.get('[data-testid="call-button"]').click()
      
      // Verify call quality indicators appear
      cy.get('[data-testid="call-quality-indicator"]').should('be.visible')
      cy.get('[data-testid="audio-quality-meter"]').should('be.visible')
      cy.get('[data-testid="network-quality-meter"]').should('be.visible')
      
      // Simulate poor call quality
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('call-quality-change', {
          detail: { quality: 'poor', metrics: { latency: 500, jitter: 100 } }
        }))
      })
      
      // Verify quality warning appears
      cy.get('[data-testid="quality-warning"]').should('be.visible')
      cy.get('[data-testid="quality-suggestion"]').should('contain', 'network connection')
    })
  })

  describe('Mobile Interface Workflow', () => {
    it('should work correctly on mobile viewport', () => {
      // Switch to mobile viewport
      cy.viewport('iphone-x')
      
      // Verify mobile layout
      cy.get('[data-testid="mobile-header"]').should('be.visible')
      cy.get('[data-testid="mobile-navigation"]').should('be.visible')
      
      // Test mobile dial pad
      cy.get('[data-testid="mobile-dial-pad"]').should('be.visible')
      cy.get('[data-testid="dial-1"]').should('have.css', 'min-height', '44px') // iOS touch target
      
      // Test touch interactions
      cy.get('[data-testid="dial-5"]').click()
      cy.get('[data-testid="phone-input"]').should('have.value', '5')
      
      // Test mobile audio controls
      cy.get('[data-testid="audio-category-greetings"]').click()
      cy.get('[data-testid="audio-play-professional-intro"]').should('be.visible')
      
      // Test mobile navigation
      cy.get('[data-testid="mobile-menu-toggle"]').click()
      cy.get('[data-testid="mobile-menu"]').should('be.visible')
      
      cy.get('[data-testid="mobile-menu-leads"]').click()
      cy.get('[data-testid="mobile-leads-view"]').should('be.visible')
    })

    it('should handle mobile call interface', () => {
      cy.viewport('iphone-x')
      
      // Start a call on mobile
      cy.get('[data-testid="phone-input"]').type('555-123-4567')
      cy.get('[data-testid="mobile-call-button"]').click()
      
      // Verify mobile call interface
      cy.get('[data-testid="mobile-call-interface"]').should('be.visible')
      cy.get('[data-testid="mobile-hang-up"]').should('be.visible')
      cy.get('[data-testid="mobile-mute-button"]').should('be.visible')
      cy.get('[data-testid="mobile-speaker-button"]').should('be.visible')
      
      // Test mobile DTMF pad
      cy.get('[data-testid="mobile-dtmf-toggle"]').click()
      cy.get('[data-testid="mobile-dtmf-pad"]').should('be.visible')
      
      cy.get('[data-testid="dtmf-1"]').click()
      cy.get('[data-testid="dtmf-feedback"]').should('be.visible')
    })
  })

  describe('Accessibility Workflow', () => {
    it('should be fully keyboard navigable', () => {
      // Test keyboard navigation through main interface
      cy.get('body').type('{tab}')
      cy.focused().should('have.attr', 'data-testid', 'phone-input')
      
      cy.focused().type('{tab}')
      cy.focused().should('have.attr', 'data-testid', 'call-button')
      
      cy.focused().type('{tab}')
      cy.focused().should('have.attr', 'data-testid', 'dial-1')
      
      // Test keyboard shortcuts
      cy.get('body').type('{ctrl}c') // Copy script shortcut
      cy.get('[data-testid="copy-success"]').should('be.visible')
      
      cy.get('body').type('{space}') // Space to trigger call
      cy.get('[data-testid="call-status"]').should('contain', 'Call in progress')
    })

    it('should have proper ARIA labels and screen reader support', () => {
      // Check ARIA labels
      cy.get('[data-testid="call-button"]').should('have.attr', 'aria-label')
      cy.get('[data-testid="phone-input"]').should('have.attr', 'aria-label')
      cy.get('[data-testid="current-lead-info"]').should('have.attr', 'aria-live')
      
      // Check role attributes
      cy.get('[data-testid="dial-pad"]').should('have.attr', 'role', 'grid')
      cy.get('[data-testid="audio-clips"]').should('have.attr', 'role', 'tabpanel')
      cy.get('[data-testid="call-status"]').should('have.attr', 'role', 'status')
      
      // Check focus management
      cy.get('[data-testid="call-button"]').click()
      cy.focused().should('have.attr', 'data-testid', 'hang-up-button')
    })

    it('should meet color contrast requirements', () => {
      // Test high contrast mode
      cy.get('body').invoke('addClass', 'high-contrast')
      
      // Verify important elements maintain contrast
      cy.get('[data-testid="call-button"]').should('be.visible')
      cy.get('[data-testid="current-lead-name"]').should('be.visible')
      cy.get('[data-testid="call-status"]').should('be.visible')
      
      // Test reduced motion preferences
      cy.get('body').invoke('addClass', 'prefers-reduced-motion')
      
      // Verify animations are reduced or removed
      cy.get('[data-testid="call-progress-animation"]').should('not.have.class', 'animate')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', () => {
      // Simulate network failure
      cy.intercept('POST', '/api/**', { forceNetworkError: true }).as('networkFailure')
      
      // Attempt operation that requires network
      cy.get('[data-testid="notes-edit-button"]').click()
      cy.get('[data-testid="notes-textarea"]').type('Test note during network failure')
      cy.get('[data-testid="notes-save-button"]').click()
      
      // Verify error handling
      cy.get('[data-testid="network-error"]').should('be.visible')
      cy.get('[data-testid="retry-button"]').should('be.visible')
      cy.get('[data-testid="offline-mode-indicator"]').should('be.visible')
      
      // Test offline functionality
      cy.get('[data-testid="notes-display"]').should('contain', 'Test note') // Cached locally
      
      // Restore network and retry
      cy.intercept('POST', '/api/**').as('networkRestored')
      cy.get('[data-testid="retry-button"]').click()
      
      cy.wait('@networkRestored')
      cy.get('[data-testid="network-error"]').should('not.exist')
      cy.get('[data-testid="sync-success"]').should('be.visible')
    })

    it('should recover from audio system failures', () => {
      // Simulate audio context failure
      cy.window().then((win) => {
        // Mock audio context error
        win.AudioContext = function() {
          throw new Error('Audio context not supported')
        }
      })
      
      // Attempt to play audio
      cy.get('[data-testid="audio-play-professional-intro"]').click()
      
      // Verify fallback behavior
      cy.get('[data-testid="audio-error"]').should('contain', 'Audio not supported')
      cy.get('[data-testid="audio-fallback-text"]').should('be.visible')
      
      // Verify system still functions
      cy.get('[data-testid="call-button"]').should('not.be.disabled')
      cy.get('[data-testid="notes-edit-button"]').should('not.be.disabled')
    })

    it('should handle session expiration', () => {
      // Simulate session expiration
      cy.intercept('POST', '/api/**', { statusCode: 401, body: { error: 'Session expired' } }).as('sessionExpired')
      
      // Trigger authenticated action
      cy.get('[data-testid="notes-save-button"]').click()
      
      cy.wait('@sessionExpired')
      
      // Verify session expiration handling
      cy.get('[data-testid="session-expired-modal"]').should('be.visible')
      cy.get('[data-testid="reauth-required"]').should('contain', 'Please log in again')
      
      // Test automatic data preservation
      cy.get('[data-testid="preserve-data-notice"]').should('be.visible')
      cy.get('[data-testid="draft-saved-indicator"]').should('be.visible')
    })
  })

  describe('Performance and Load Testing', () => {
    it('should load within performance budgets', () => {
      // Measure page load performance
      cy.window().its('performance').then((performance) => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
        expect(loadTime).to.be.lessThan(3000) // 3 second load budget
      })
      
      // Verify critical rendering path
      cy.get('[data-testid="app-loaded"]').should('be.visible')
      
      // Check resource loading
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource')
        const jsResources = resources.filter(r => r.name.includes('.js'))
        const totalJSSize = jsResources.reduce((sum, r) => sum + r.transferSize, 0)
        
        expect(totalJSSize).to.be.lessThan(500000) // 500KB JS budget
      })
    })

    it('should handle large datasets efficiently', () => {
      // Load interface with large dataset
      cy.intercept('GET', '/api/leads', { fixture: 'large-leads-dataset.json' }).as('largeDataset')
      cy.visit('/')
      
      cy.wait('@largeDataset')
      
      // Verify interface remains responsive
      cy.get('[data-testid="leads-loaded"]').should('be.visible')
      cy.get('[data-testid="next-lead-button"]').click()
      cy.get('[data-testid="current-lead-name"]').should('be.visible')
      
      // Test search with large dataset
      cy.get('[data-testid="search-leads-button"]').click()
      cy.get('[data-testid="search-input"]').type('Smith')
      
      // Should return results quickly even with large dataset
      cy.get('[data-testid="search-results"]', { timeout: 1000 }).should('be.visible')
    })

    it('should maintain performance during extended use', () => {
      // Simulate extended usage session
      const actions = [
        () => cy.get('[data-testid="next-lead-button"]').click(),
        () => cy.get('[data-testid="audio-category-greetings"]').click(),
        () => cy.get('[data-testid="script-introduction"]').click(),
        () => cy.get('[data-testid="notes-edit-button"]').click(),
        () => cy.get('[data-testid="notes-textarea"]').type('Extended use test'),
        () => cy.get('[data-testid="notes-save-button"]').click()
      ]
      
      // Repeat actions multiple times
      for (let i = 0; i < 10; i++) {
        actions.forEach(action => action())
      }
      
      // Verify performance hasn't degraded
      const startTime = Date.now()
      cy.get('[data-testid="call-button"]').click()
      cy.get('[data-testid="call-status"]').should('be.visible').then(() => {
        const responseTime = Date.now() - startTime
        expect(responseTime).to.be.lessThan(500) // Should still respond quickly
      })
    })
  })
})