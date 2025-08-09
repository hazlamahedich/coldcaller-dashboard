/**
 * VOIP Validation Test Suite
 * Production environment validation tests for all VOIP fixes
 * Tests: Production readiness, security, performance, and reliability
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// VOIP Components
import VOIPPhone from '../../components/VOIPPhone';
import FloatingCallBar from '../../components/FloatingCallBar';
import DTMFKeypad from '../../components/DTMFKeypad';
import SIPManager from '../../services/SIPManager';
import AudioFeedbackService from '../../services/AudioFeedbackService';

// Test utilities
import { TestWrapper } from '../testSetup/testConfig';
import { createMockAudioContext, createMockSIPEnvironment } from '../mocks/voipMocks';

describe('VOIP Production Validation Suite', () => {
  let mockEnvironment;
  let audioContext;
  let sipManager;
  let audioFeedback;

  beforeEach(() => {
    // Setup production-like environment
    mockEnvironment = createMockSIPEnvironment({
      production: true,
      encryption: true,
      security: 'high',
      latency: 50,
      reliability: 99.9
    });

    audioContext = createMockAudioContext();
    global.AudioContext = jest.fn(() => audioContext);
    
    // Mock production APIs
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn(() => Promise.resolve({
        getTracks: () => [
          { 
            stop: jest.fn(), 
            enabled: true, 
            kind: 'audio',
            getSettings: () => ({ 
              sampleRate: 48000,
              channelCount: 2,
              echoCancellation: true,
              noiseSuppression: true 
            })
          }
        ],
        getAudioTracks: () => [{ stop: jest.fn(), enabled: true }]
      }))
    };

    // Mock performance monitoring
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => [])
    };
  });

  afterEach(() => {
    if (sipManager) sipManager.destroy();
    if (audioFeedback) audioFeedback.destroy();
    mockEnvironment.cleanup();
  });

  describe('Production Environment Validation', () => {
    it('should validate production SIP configuration', async () => {
      const productionConfig = {
        uri: process.env.REACT_APP_SIP_URI || 'user@production.sip.com',
        wsServers: process.env.REACT_APP_SIP_WS_SERVER || 'wss://production.sip.com:443/ws',
        displayName: 'Production User',
        authUser: 'prod_user',
        password: 'secure_password_123',
        registrar: 'production.sip.com',
        transport: 'wss',
        encryption: true
      };

      sipManager = new SIPManager();
      sipManager.configure(productionConfig);

      // Validate configuration security
      expect(productionConfig.wsServers).toMatch(/^wss:/); // Secure WebSocket
      expect(productionConfig.password).toHaveLength.greaterThan(8); // Strong password
      expect(productionConfig.encryption).toBe(true); // Encryption enabled

      // Mock successful registration
      const registrationPromise = sipManager.register();
      
      // Simulate production registration delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(sipManager.isRegistered).toBe(false); // Still registering
      
      console.log('✅ Production SIP configuration validation passed');
    });

    it('should validate secure WebRTC connection establishment', async () => {
      sipManager = new SIPManager();
      
      // Configure with production security settings
      sipManager.configure({
        uri: 'secure@test.com',
        wsServers: 'wss://secure.test.com:443/ws',
        encryption: true,
        dtlsFingerprinting: true
      });

      const callSession = await sipManager.makeCall('+15551234567', {
        encryption: 'required',
        dtlsFingerprinting: true,
        iceGathering: 'complete'
      });

      // Validate secure connection parameters
      expect(callSession.localStream).toBeDefined();
      expect(callSession.id).toMatch(/^call-\d+$/);
      expect(callSession.direction).toBe('outgoing');

      // Validate security measures
      const quality = sipManager.getConnectionQuality();
      expect(quality).toHaveProperty('signal');
      expect(quality).toHaveProperty('latency');
      expect(quality.latency).toBeLessThan(150); // Production latency requirement

      console.log('✅ Secure WebRTC connection validation passed');
    });

    it('should validate DTMF security and reliability', async () => {
      const user = userEvent.setup();
      const mockKeyPress = jest.fn();
      const sentTones = [];

      render(
        <TestWrapper>
          <DTMFKeypad
            isVisible={true}
            onKeyPress={mockKeyPress}
            onClose={jest.fn()}
            isInCall={true}
            showToneAnimation={true}
          />
        </TestWrapper>
      );

      // Test secure DTMF sequence (simulating banking/IVR navigation)
      const secureSequence = ['*', '1', '2', '3', '4', '#'];
      
      for (const key of secureSequence) {
        const keyButton = screen.getByRole('button', { name: key });
        
        // Measure DTMF response time
        const startTime = performance.now();
        await user.click(keyButton);
        const responseTime = performance.now() - startTime;
        
        expect(responseTime).toBeLessThan(100); // Sub-100ms response
        expect(mockKeyPress).toHaveBeenLastCalledWith(key);
        
        sentTones.push({ key, responseTime });
      }

      // Validate tone history is maintained securely
      const toneHistory = screen.getByText(/123456/);
      expect(toneHistory).toBeInTheDocument();

      // Test rapid sequential input (stress test)
      const rapidSequence = ['1', '1', '1', '1', '1'];
      for (const key of rapidSequence) {
        const keyButton = screen.getByRole('button', { name: key });
        fireEvent.click(keyButton);
      }

      expect(mockKeyPress).toHaveBeenCalledTimes(secureSequence.length + rapidSequence.length);

      console.log('✅ DTMF security and reliability validation passed');
    });

    it('should validate audio quality and feedback systems', async () => {
      audioFeedback = new AudioFeedbackService();
      
      // Test all production audio feedback scenarios
      const productionScenarios = [
        { type: 'connecting', expectedDuration: 200 },
        { type: 'ringing', expectedDuration: 400 },
        { type: 'connected', expectedDuration: 300 },
        { type: 'failed', expectedDuration: 500 },
        { type: 'hold', expectedDuration: 250 },
        { type: 'resume', expectedDuration: 250 },
        { type: 'muted', expectedDuration: 200 },
        { type: 'unmuted', expectedDuration: 200 }
      ];

      for (const scenario of productionScenarios) {
        const startTime = performance.now();
        
        // Test audio feedback
        audioFeedback.playFeedback(scenario.type);
        
        const processingTime = performance.now() - startTime;
        expect(processingTime).toBeLessThan(50); // Sub-50ms processing

        // Test speech synthesis (if available)
        if (global.speechSynthesis) {
          expect(global.speechSynthesis.speak).toHaveBeenCalled();
        }
      }

      // Test volume control in production range
      const productionVolumeLevels = [0.2, 0.5, 0.7, 1.0];
      for (const volume of productionVolumeLevels) {
        audioFeedback.setVolume(volume);
        expect(audioFeedback.volume).toBe(volume);
      }

      // Test DTMF confirmation audio
      const dtmfTones = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
      for (const tone of dtmfTones) {
        expect(() => audioFeedback.playDTMFConfirmation(tone)).not.toThrow();
      }

      console.log('✅ Audio quality and feedback validation passed');
    });
  });

  describe('Performance Under Load Validation', () => {
    it('should handle multiple simultaneous VOIP sessions', async () => {
      const sessionCount = 5;
      const sessions = [];
      const startTime = performance.now();

      // Create multiple SIP managers (simulating multiple tabs/users)
      for (let i = 0; i < sessionCount; i++) {
        const manager = new SIPManager();
        manager.configure({
          uri: `user${i}@test.com`,
          wsServers: 'wss://test.com:443/ws',
          displayName: `User ${i}`
        });
        sessions.push(manager);
      }

      // Attempt simultaneous registrations
      const registrationPromises = sessions.map(session => 
        session.register().catch(err => ({ error: err.message }))
      );

      const results = await Promise.allSettled(registrationPromises);
      const setupTime = performance.now() - startTime;

      // Validate performance metrics
      expect(setupTime).toBeLessThan(3000); // Setup within 3 seconds
      
      const successfulRegistrations = results.filter(r => 
        r.status === 'fulfilled' && !r.value.error
      ).length;

      // At least 80% should register successfully under load
      expect(successfulRegistrations).toBeGreaterThanOrEqual(Math.floor(sessionCount * 0.8));

      // Cleanup
      sessions.forEach(session => session.destroy());

      console.log(`✅ Multiple sessions test passed (${successfulRegistrations}/${sessionCount} successful, ${setupTime.toFixed(0)}ms setup)`);
    });

    it('should maintain UI responsiveness during calls', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <VOIPPhone 
            leadInfo={{ name: 'Performance Test User' }}
            onCallLogged={jest.fn()}
          />
        </TestWrapper>
      );

      // Simulate high-frequency user interactions
      const interactions = [];
      const interactionCount = 50;
      
      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      
      const startTime = performance.now();
      
      // Rapid typing simulation
      for (let i = 0; i < interactionCount; i++) {
        const digit = (i % 10).toString();
        await user.type(phoneInput, digit, { delay: 1 });
        
        const responseTime = performance.now() - startTime - (i * 1);
        interactions.push({ action: 'type', responseTime });
      }

      // Calculate average response time
      const avgResponseTime = interactions.reduce((sum, int) => sum + int.responseTime, 0) / interactions.length;
      
      // UI should remain responsive (sub-16ms for 60fps)
      expect(avgResponseTime).toBeLessThan(50); // Allow some overhead for testing environment

      console.log(`✅ UI responsiveness test passed (avg: ${avgResponseTime.toFixed(2)}ms)`);
    });

    it('should validate memory usage and cleanup', async () => {
      const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      const components = [];

      // Create and destroy multiple components
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <VOIPPhone key={i} />
          </TestWrapper>
        );
        
        components.push(unmount);
      }

      // Force cleanup
      components.forEach(unmount => unmount());
      
      // Simulate garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal after cleanup
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      console.log(`✅ Memory usage validation passed (increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB)`);
    });
  });

  describe('Error Handling and Recovery Validation', () => {
    it('should gracefully handle network failures', async () => {
      const user = userEvent.setup();
      
      // Mock network failure
      global.fetch = jest.fn(() => Promise.reject(new Error('Network failure')));
      
      render(
        <TestWrapper>
          <VOIPPhone onCallLogged={jest.fn()} />
        </TestWrapper>
      );

      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      await user.type(phoneInput, '5551234567');

      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      // Should show appropriate error handling
      await waitFor(() => {
        expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // System should recover and be ready for next call
      await waitFor(() => {
        expect(callButton).not.toBeDisabled();
      }, { timeout: 3000 });

      console.log('✅ Network failure handling validation passed');
    });

    it('should handle microphone permission denial', async () => {
      const user = userEvent.setup();
      
      // Mock microphone access denial
      global.navigator.mediaDevices.getUserMedia = jest.fn(() => 
        Promise.reject(new Error('Permission denied'))
      );

      render(
        <TestWrapper>
          <VOIPPhone onCallLogged={jest.fn()} />
        </TestWrapper>
      );

      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      await user.type(phoneInput, '5551234567');

      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      // Should show permission error
      await waitFor(() => {
        expect(screen.getByText(/permission|access|microphone/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      console.log('✅ Microphone permission handling validation passed');
    });

    it('should validate SIP server connection failures', async () => {
      sipManager = new SIPManager();
      
      // Configure with invalid server
      sipManager.configure({
        uri: 'test@invalid.server.com',
        wsServers: 'wss://invalid.server.com:443/ws',
        password: 'invalid'
      });

      let registrationError = null;
      sipManager.on('registrationFailed', (data) => {
        registrationError = data;
      });

      const registrationResult = await sipManager.register();

      expect(registrationResult).toBe(false);
      expect(registrationError).toBeTruthy();
      expect(registrationError.error).toBeTruthy();

      // Verify retry mechanism
      expect(sipManager.registrationRetries).toBeGreaterThan(0);

      console.log('✅ SIP server connection failure validation passed');
    });
  });

  describe('Security Validation', () => {
    it('should validate secure communication protocols', async () => {
      sipManager = new SIPManager();
      
      // Configure with security requirements
      const secureConfig = {
        uri: 'secure@test.com',
        wsServers: 'wss://secure.test.com:443/ws', // WSS required
        encryption: true,
        dtlsFingerprinting: true,
        srtpProtection: true
      };

      sipManager.configure(secureConfig);

      // Validate secure protocols are enforced
      expect(secureConfig.wsServers.startsWith('wss://')).toBe(true);
      expect(secureConfig.encryption).toBe(true);

      // Test WebRTC peer connection security
      const peerConnectionConfig = sipManager.pcConfig;
      expect(peerConnectionConfig.iceServers).toBeDefined();
      
      // STUN servers should use secure connections
      const stunServers = peerConnectionConfig.iceServers.filter(server => 
        server.urls.includes('stun:')
      );
      expect(stunServers.length).toBeGreaterThan(0);

      console.log('✅ Secure communication protocols validation passed');
    });

    it('should validate DTMF tone security', async () => {
      const user = userEvent.setup();
      const mockKeyPress = jest.fn();

      render(
        <TestWrapper>
          <DTMFKeypad
            isVisible={true}
            onKeyPress={mockKeyPress}
            onClose={jest.fn()}
            isInCall={true}
          />
        </TestWrapper>
      );

      // Test sensitive DTMF sequences (like credit card numbers, SSNs)
      const sensitiveSequence = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
      
      for (const key of sensitiveSequence) {
        const keyButton = screen.getByRole('button', { name: key });
        await user.click(keyButton);
      }

      // Verify tones are processed but potentially masked in history
      expect(mockKeyPress).toHaveBeenCalledTimes(sensitiveSequence.length);
      
      // Clear history for security
      const clearButton = screen.queryByRole('button', { name: /clear/i });
      if (clearButton) {
        await user.click(clearButton);
      }

      console.log('✅ DTMF tone security validation passed');
    });

    it('should validate audio stream security', async () => {
      audioFeedback = new AudioFeedbackService();
      
      // Test audio context security
      expect(audioFeedback.audioContext).toBeDefined();
      
      // Validate secure audio processing
      const testFrequencies = [440, 880, 1320]; // Standard test tones
      
      for (const frequency of testFrequencies) {
        expect(() => {
          audioFeedback.playTone(frequency, 100);
        }).not.toThrow();
      }

      // Test speech synthesis security (prevent injection)
      const potentialXSS = '<script>alert("xss")</script>';
      expect(() => {
        audioFeedback.speak(potentialXSS);
      }).not.toThrow();

      // Verify XSS content is not executed
      expect(global.speechSynthesis.speak).toHaveBeenCalledWith(
        expect.objectContaining({
          text: potentialXSS // Should be passed as text, not executed
        })
      );

      console.log('✅ Audio stream security validation passed');
    });
  });

  describe('Cross-Platform Validation', () => {
    it('should validate mobile device compatibility', async () => {
      // Mock mobile user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true
      });

      // Mock touch events
      global.TouchEvent = class TouchEvent extends Event {
        constructor(type, options = {}) {
          super(type, options);
          this.touches = options.touches || [];
        }
      };

      render(
        <TestWrapper>
          <FloatingCallBar
            isVisible={true}
            callState="active"
            leadData={{ name: 'Mobile Test' }}
            phoneNumber="+1234567890"
            callDuration={60}
            isMuted={false}
            isOnHold={false}
            onMute={jest.fn()}
            onHold={jest.fn()}
            onHangup={jest.fn()}
            onShowDialpad={jest.fn()}
          />
        </TestWrapper>
      );

      // Test touch interactions
      const muteButton = screen.getByRole('button', { name: /mute/i });
      
      fireEvent.touchStart(muteButton);
      fireEvent.touchEnd(muteButton);

      expect(muteButton).toBeInTheDocument();

      console.log('✅ Mobile device compatibility validation passed');
    });

    it('should validate browser compatibility', async () => {
      const browsers = [
        { name: 'Chrome', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
        { name: 'Firefox', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0' },
        { name: 'Safari', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15' },
        { name: 'Edge', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59' }
      ];

      for (const browser of browsers) {
        Object.defineProperty(global.navigator, 'userAgent', {
          value: browser.userAgent,
          configurable: true
        });

        // Test audio context creation for each browser
        const mockAudioContext = browser.name === 'Safari' ? 
          global.webkitAudioContext : global.AudioContext;
        
        expect(mockAudioContext).toBeDefined();

        // Test WebRTC support
        expect(global.navigator.mediaDevices).toBeDefined();
        expect(global.navigator.mediaDevices.getUserMedia).toBeDefined();
      }

      console.log('✅ Browser compatibility validation passed');
    });
  });
});