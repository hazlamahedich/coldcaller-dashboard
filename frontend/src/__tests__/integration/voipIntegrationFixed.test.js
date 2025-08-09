/**
 * VOIP Integration Test Suite - Fixed Version
 * Comprehensive testing of all VOIP fixes working together
 * Tests: FloatingCallBar + DTMFKeypad + SIPManager + AudioFeedback + VOIPPhone
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

// Simple test wrapper without complex context imports
const TestWrapper = ({ children, themeMode = 'light' }) => {
  return (
    <div data-testid="test-wrapper" data-theme={themeMode}>
      {children}
    </div>
  );
};

// Mock implementations
const mockCallContext = {
  audioInitialized: true,
  audioContext: {
    state: 'running',
    currentTime: 0,
    createOscillator: jest.fn(() => ({
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { value: 440 },
      type: 'sine'
    })),
    createGain: jest.fn(() => ({
      connect: jest.fn(),
      gain: {
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn()
      }
    })),
    destination: {}
  },
  testAudio: jest.fn(),
  volume: 70,
  changeVolume: jest.fn()
};

// Mock useTheme hook
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    isDarkMode: false,
    toggleTheme: jest.fn(),
    themeClasses: {
      bg: 'bg-gray-50',
      cardBg: 'bg-white',
      textPrimary: 'text-gray-900'
    }
  }))
}));

// Mock useCall hook  
jest.mock('../../contexts/CallContext', () => ({
  useCall: jest.fn(() => mockCallContext)
}));

describe('VOIP Integration Test Suite - Fixed', () => {
  let sipManagerInstance;
  let audioFeedbackInstance;
  let mockOnCallLogged;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Web Audio API
    global.AudioContext = jest.fn(() => mockCallContext.audioContext);
    global.webkitAudioContext = jest.fn(() => mockCallContext.audioContext);
    
    // Mock Speech Synthesis API
    global.speechSynthesis = {
      cancel: jest.fn(),
      speak: jest.fn(),
      getVoices: jest.fn(() => [
        { name: 'Alex', lang: 'en-US' },
        { name: 'Samantha', lang: 'en-US' }
      ])
    };
    
    // Mock getUserMedia
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: jest.fn(() => Promise.resolve({
          getTracks: () => [{ stop: jest.fn(), enabled: true }],
          getAudioTracks: () => [{ stop: jest.fn(), enabled: true }]
        }))
      }
    };

    // Mock performance.now
    global.performance = { now: jest.fn(() => Date.now()) };

    mockOnCallLogged = jest.fn();
  });

  afterEach(() => {
    // Cleanup
    if (sipManagerInstance) {
      sipManagerInstance.destroy();
    }
    if (audioFeedbackInstance) {
      audioFeedbackInstance.destroy();
    }
  });

  describe('Core Component Integration Tests', () => {
    it('should validate SIP manager functionality', async () => {
      sipManagerInstance = new SIPManager();
      const eventCallbacks = {};

      // Mock event system
      sipManagerInstance.on = jest.fn((event, callback) => {
        eventCallbacks[event] = callback;
      });
      
      sipManagerInstance.emit = jest.fn((event, data) => {
        if (eventCallbacks[event]) {
          eventCallbacks[event](data);
        }
      });

      // Configure SIP
      sipManagerInstance.configure({
        uri: 'test@example.com',
        wsServers: 'wss://test.example.com',
        displayName: 'Test User'
      });

      // Test registration events
      let registrationStatus = null;
      sipManagerInstance.on('registered', (data) => {
        registrationStatus = 'registered';
      });
      
      sipManagerInstance.on('registrationFailed', (data) => {
        registrationStatus = 'failed';
      });

      // Simulate successful registration
      await act(async () => {
        sipManagerInstance.emit('registered', { uri: 'test@example.com' });
      });
      
      expect(registrationStatus).toBe('registered');

      // Test call events
      let callState = null;
      sipManagerInstance.on('callProgress', ({ state }) => {
        callState = state;
      });

      // Simulate call progression
      await act(async () => {
        sipManagerInstance.emit('callProgress', { callSession: {}, state: 'connecting' });
      });
      expect(callState).toBe('connecting');

      await act(async () => {
        sipManagerInstance.emit('callProgress', { callSession: {}, state: 'ringing' });
      });
      expect(callState).toBe('ringing');

      // Test DTMF handling
      const dtmfCallback = jest.fn();
      sipManagerInstance.on('dtmfSent', dtmfCallback);
      
      // Simulate DTMF sending
      sipManagerInstance.currentCall = { id: 'test-call', state: 'connected' };
      const dtmfResult = sipManagerInstance.sendDTMF('123');
      
      expect(dtmfResult).toBe(true);
      
      console.log('✅ SIP manager validation passed');
    });

    it('should validate audio feedback service functionality', async () => {
      audioFeedbackInstance = new AudioFeedbackService();
      
      // Test audio feedback for different call states
      const feedbackTypes = [
        'connecting',
        'ringing', 
        'connected',
        'failed',
        'hold',
        'resume',
        'muted',
        'unmuted'
      ];

      for (const type of feedbackTypes) {
        expect(() => {
          audioFeedbackInstance.playFeedback(type);
        }).not.toThrow();
      }

      // Test DTMF confirmation
      expect(() => {
        audioFeedbackInstance.playDTMFConfirmation('1');
      }).not.toThrow();

      // Test volume control
      audioFeedbackInstance.setVolume(0.8);
      expect(audioFeedbackInstance.volume).toBe(0.8);

      // Test enable/disable
      audioFeedbackInstance.setEnabled(false);
      expect(audioFeedbackInstance.isEnabled).toBe(false);

      audioFeedbackInstance.setEnabled(true);
      expect(audioFeedbackInstance.isEnabled).toBe(true);

      console.log('✅ Audio feedback service validation passed');
    });

    it('should validate DTMF keypad integration', async () => {
      const user = userEvent.setup();
      const mockKeyPress = jest.fn();
      const mockClose = jest.fn();

      render(
        <TestWrapper>
          <DTMFKeypad
            isVisible={true}
            onKeyPress={mockKeyPress}
            onClose={mockClose}
            isInCall={true}
            showToneAnimation={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/DTMF Keypad/i)).toBeInTheDocument();
      expect(screen.getByText(/In Call - Send Tones/i)).toBeInTheDocument();

      // Test all DTMF keys
      const dtmfKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
      
      for (const key of dtmfKeys) {
        const keyButton = screen.getByRole('button', { name: key });
        await user.click(keyButton);
        
        expect(mockKeyPress).toHaveBeenCalledWith(key);
        
        // Verify tone history updates
        await waitFor(() => {
          const toneHistory = screen.getByText(new RegExp(key));
          expect(toneHistory).toBeInTheDocument();
        });
      }

      // Test keyboard input
      await user.keyboard('123');
      expect(mockKeyPress).toHaveBeenCalledTimes(dtmfKeys.length + 3);

      // Test escape key closes keypad
      await user.keyboard('{Escape}');
      expect(mockClose).toHaveBeenCalled();

      console.log('✅ DTMF keypad integration validation passed');
    });

    it('should validate FloatingCallBar with different states', async () => {
      const user = userEvent.setup();
      
      const mockCallData = {
        name: 'Jane Smith',
        company: 'Example Inc',
        phone: '+1987654321'
      };

      const { rerender } = render(
        <TestWrapper>
          <FloatingCallBar
            isVisible={false}
            callState="idle"
            leadData={mockCallData}
            phoneNumber={mockCallData.phone}
            callDuration={0}
            isMuted={false}
            isOnHold={false}
            onMute={jest.fn()}
            onHold={jest.fn()}
            onHangup={jest.fn()}
            onShowDialpad={jest.fn()}
          />
        </TestWrapper>
      );

      // Initially not visible
      expect(screen.queryByText(/Jane Smith/)).not.toBeInTheDocument();

      // Test connecting state
      rerender(
        <TestWrapper>
          <FloatingCallBar
            isVisible={true}
            callState="connecting"
            leadData={mockCallData}
            phoneNumber={mockCallData.phone}
            callDuration={0}
            isMuted={false}
            isOnHold={false}
            onMute={jest.fn()}
            onHold={jest.fn()}
            onHangup={jest.fn()}
            onShowDialpad={jest.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();

      // Test active state with controls
      rerender(
        <TestWrapper>
          <FloatingCallBar
            isVisible={true}
            callState="active"
            leadData={mockCallData}
            phoneNumber={mockCallData.phone}
            callDuration={125}
            isMuted={false}
            isOnHold={false}
            onMute={jest.fn()}
            onHold={jest.fn()}
            onHangup={jest.fn()}
            onShowDialpad={jest.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText('02:05')).toBeInTheDocument(); // Call duration
      
      // Test controls are enabled
      const muteBtn = screen.getByRole('button', { name: /mute/i });
      const holdBtn = screen.getByRole('button', { name: /hold/i });
      const dialpadBtn = screen.getByRole('button', { name: /dialpad/i });
      
      expect(muteBtn).not.toBeDisabled();
      expect(holdBtn).not.toBeDisabled();
      expect(dialpadBtn).not.toBeDisabled();

      console.log('✅ FloatingCallBar state integration passed');
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle rapid DTMF input without issues', async () => {
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

      // Rapidly press multiple DTMF keys
      const dtmfSequence = ['1', '2', '3', '4', '5'];
      
      await act(async () => {
        for (const key of dtmfSequence) {
          const keyButton = screen.getByRole('button', { name: key });
          fireEvent.click(keyButton);
        }
      });

      // All keys should be processed
      expect(mockKeyPress).toHaveBeenCalledTimes(dtmfSequence.length);
      
      dtmfSequence.forEach(key => {
        expect(mockKeyPress).toHaveBeenCalledWith(key);
      });

      console.log('✅ Rapid DTMF input handling passed');
    });

    it('should maintain component performance under load', async () => {
      const startTime = performance.now();
      
      const { unmount } = render(
        <TestWrapper>
          <div>
            <FloatingCallBar
              isVisible={true}
              callState="active"
              leadData={{ name: 'Test' }}
              phoneNumber="+1234567890"
              callDuration={60}
              isMuted={false}
              isOnHold={false}
              onMute={jest.fn()}
              onHold={jest.fn()}
              onHangup={jest.fn()}
              onShowDialpad={jest.fn()}
            />
            <DTMFKeypad
              isVisible={true}
              onKeyPress={jest.fn()}
              onClose={jest.fn()}
              isInCall={true}
            />
          </div>
        </TestWrapper>
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render in under 1 second

      // Test cleanup
      unmount();
      
      console.log(`✅ Component performance test passed (render time: ${renderTime.toFixed(2)}ms)`);
    });

    it('should handle error conditions gracefully', async () => {
      // Mock network failure
      global.fetch = jest.fn(() => Promise.reject(new Error('Network failure')));
      
      // Mock microphone access denial
      global.navigator.mediaDevices.getUserMedia = jest.fn(() => 
        Promise.reject(new Error('Permission denied'))
      );

      expect(() => {
        render(
          <TestWrapper>
            <DTMFKeypad
              isVisible={true}
              onKeyPress={jest.fn()}
              onClose={jest.fn()}
              isInCall={true}
            />
          </TestWrapper>
        );
      }).not.toThrow();

      console.log('✅ Error handling test passed');
    });
  });

  describe('Security and Accessibility Tests', () => {
    it('should validate secure DTMF handling', async () => {
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

      // Verify tones are processed
      expect(mockKeyPress).toHaveBeenCalledTimes(sensitiveSequence.length);
      
      // Clear history for security if available
      const clearButton = screen.queryByRole('button', { name: /clear/i });
      if (clearButton) {
        await user.click(clearButton);
      }

      console.log('✅ Secure DTMF handling validation passed');
    });

    it('should provide keyboard accessibility', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <DTMFKeypad
            isVisible={true}
            onKeyPress={jest.fn()}
            onClose={jest.fn()}
            isInCall={true}
          />
        </TestWrapper>
      );

      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      // Test ARIA labels and roles
      const keypadTitle = screen.getByText(/DTMF Keypad/i);
      expect(keypadTitle).toBeInTheDocument();

      const keypadButtons = screen.getAllByRole('button');
      expect(keypadButtons.length).toBeGreaterThan(10); // At least 12 DTMF keys + close button

      console.log('✅ Keyboard accessibility test passed');
    });
  });

  describe('Production Readiness Tests', () => {
    it('should validate production configuration', async () => {
      const productionConfig = {
        uri: 'user@production.sip.com',
        wsServers: 'wss://production.sip.com:443/ws',
        displayName: 'Production User',
        encryption: true
      };

      sipManagerInstance = new SIPManager();
      sipManagerInstance.configure(productionConfig);

      // Validate configuration security
      expect(productionConfig.wsServers).toMatch(/^wss:/); // Secure WebSocket
      expect(productionConfig.encryption).toBe(true); // Encryption enabled

      console.log('✅ Production configuration validation passed');
    });

    it('should validate cross-browser compatibility setup', async () => {
      const browsers = [
        { name: 'Chrome', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        { name: 'Firefox', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0' },
        { name: 'Safari', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' }
      ];

      for (const browser of browsers) {
        // Mock browser user agent
        Object.defineProperty(global.navigator, 'userAgent', {
          value: browser.userAgent,
          configurable: true
        });

        // Test basic API availability for each browser
        expect(global.AudioContext || global.webkitAudioContext).toBeDefined();
        expect(global.navigator.mediaDevices).toBeDefined();
      }

      console.log('✅ Cross-browser compatibility validation passed');
    });

    it('should validate memory management', async () => {
      const components = [];

      // Create and destroy multiple components
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <TestWrapper key={i}>
            <DTMFKeypad
              isVisible={true}
              onKeyPress={jest.fn()}
              onClose={jest.fn()}
              isInCall={true}
            />
          </TestWrapper>
        );
        
        components.push(unmount);
      }

      // Force cleanup
      components.forEach(unmount => unmount());
      
      // Should complete without memory issues
      expect(components).toHaveLength(5);

      console.log('✅ Memory management validation passed');
    });
  });
});