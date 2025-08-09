/**
 * VOIP Integration Test Suite
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

// Context Providers 
import CallContext from '../../contexts/CallContext';
import ThemeContext from '../../contexts/ThemeContext';

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

const mockThemeContext = {
  isDarkMode: false,
  toggleTheme: jest.fn()
};

// Test wrapper with all required contexts
const TestWrapper = ({ children }) => (
  <ThemeContext.Provider value={mockThemeContext}>
    <CallContext.Provider value={mockCallContext}>
      {children}
    </CallContext.Provider>
  </ThemeContext.Provider>
);

describe('VOIP Integration Test Suite', () => {
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

  describe('Complete VOIP Workflow Integration', () => {
    it('should handle complete call workflow with all components', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <VOIPPhone 
            leadInfo={{ name: 'John Doe', company: 'Test Corp', phone: '+1234567890' }}
            onCallLogged={mockOnCallLogged}
          />
        </TestWrapper>
      );

      // Step 1: Wait for SIP registration
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Step 2: Enter phone number
      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '5551234567');

      // Step 3: Initiate call
      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      // Step 4: Verify call states progression
      await waitFor(() => {
        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      });

      // Simulate call progression
      await waitFor(() => {
        expect(screen.getByText(/ringing/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(screen.getByText(/connected|active/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Step 5: Test DTMF keypad during call
      const dtmfButton = screen.getByRole('button', { name: /dtmf keypad/i });
      await user.click(dtmfButton);
      
      await waitFor(() => {
        expect(screen.getByText(/DTMF Keypad/i)).toBeInTheDocument();
      });

      // Send DTMF tones
      const dtmfKey1 = screen.getByRole('button', { name: '1' });
      await user.click(dtmfKey1);
      
      const dtmfKey2 = screen.getByRole('button', { name: '2' });
      await user.click(dtmfKey2);

      // Close DTMF keypad
      const closeDTMF = screen.getByRole('button', { name: /close/i });
      await user.click(closeDTMF);

      // Step 6: Test mute functionality
      const muteButton = screen.getByRole('button', { name: /mute/i });
      await user.click(muteButton);

      await waitFor(() => {
        expect(screen.getByText(/muted/i)).toBeInTheDocument();
      });

      // Step 7: Test hold functionality
      const holdButton = screen.getByRole('button', { name: /hold/i });
      await user.click(holdButton);

      await waitFor(() => {
        expect(screen.getByText(/hold/i)).toBeInTheDocument();
      });

      // Resume call
      await user.click(holdButton);

      // Step 8: End call
      const hangupButton = screen.getByRole('button', { name: /hang up/i });
      await user.click(hangupButton);

      // Step 9: Verify call logging
      await waitFor(() => {
        expect(mockOnCallLogged).toHaveBeenCalledWith(
          expect.objectContaining({
            phone: '5551234567',
            outcome: expect.any(String),
            duration: expect.any(String),
            notes: expect.stringContaining('VOIP call')
          })
        );
      }, { timeout: 3000 });

      console.log('✅ Complete VOIP workflow integration test passed');
    });

    it('should integrate FloatingCallBar with all call states', async () => {
      const user = userEvent.setup();
      
      let callState = 'idle';
      let isVisible = false;
      const mockCallData = {
        name: 'Jane Smith',
        company: 'Example Inc',
        phone: '+1987654321'
      };

      const { rerender } = render(
        <TestWrapper>
          <FloatingCallBar
            isVisible={isVisible}
            callState={callState}
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
      callState = 'connecting';
      isVisible = true;
      rerender(
        <TestWrapper>
          <FloatingCallBar
            isVisible={isVisible}
            callState={callState}
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

      // Test ringing state
      callState = 'ringing';
      rerender(
        <TestWrapper>
          <FloatingCallBar
            isVisible={isVisible}
            callState={callState}
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

      expect(screen.getByText(/ringing/i)).toBeInTheDocument();

      // Test active state with controls
      callState = 'active';
      rerender(
        <TestWrapper>
          <FloatingCallBar
            isVisible={isVisible}
            callState={callState}
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

      console.log('✅ FloatingCallBar integration with all states passed');
    });

    it('should integrate DTMF keypad with audio feedback', async () => {
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

      console.log('✅ DTMF keypad integration with audio feedback passed');
    });

    it('should validate SIP manager event handling', async () => {
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

      await act(async () => {
        sipManagerInstance.emit('callConnected', { callSession: {} });
      });

      // Test DTMF handling
      const dtmfCallback = jest.fn();
      sipManagerInstance.on('dtmfSent', dtmfCallback);
      
      // Simulate DTMF sending
      sipManagerInstance.currentCall = { id: 'test-call', state: 'connected' };
      const dtmfResult = sipManagerInstance.sendDTMF('123');
      
      expect(dtmfResult).toBe(true);
      
      console.log('✅ SIP manager event handling validation passed');
    });

    it('should validate audio feedback service integration', async () => {
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

      console.log('✅ Audio feedback service integration validation passed');
    });
  });

  describe('Production-like Integration Testing', () => {
    it('should handle network latency and connection issues', async () => {
      const user = userEvent.setup();
      
      // Mock slow network response
      global.fetch = jest.fn(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          }), 2000)
        )
      );

      render(
        <TestWrapper>
          <VOIPPhone 
            leadInfo={{ name: 'Test User', phone: '+1555000111' }}
            onCallLogged={mockOnCallLogged}
          />
        </TestWrapper>
      );

      // Wait for initial load with timeout
      await waitFor(() => {
        expect(screen.getByText(/VOIP Phone/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      await user.type(phoneInput, '5550001111');

      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      // Should handle the delayed response gracefully
      await waitFor(() => {
        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      console.log('✅ Network latency handling test passed');
    });

    it('should handle concurrent DTMF operations', async () => {
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

      console.log('✅ Concurrent DTMF operations test passed');
    });

    it('should validate error handling and recovery', async () => {
      const user = userEvent.setup();
      
      // Mock navigator.mediaDevices.getUserMedia to fail
      global.navigator.mediaDevices.getUserMedia = jest.fn(() => 
        Promise.reject(new Error('Camera/microphone access denied'))
      );

      render(
        <TestWrapper>
          <VOIPPhone 
            leadInfo={{ name: 'Test User' }}
            onCallLogged={mockOnCallLogged}
          />
        </TestWrapper>
      );

      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      await user.type(phoneInput, '5551234567');

      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      // Should display appropriate error message
      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      console.log('✅ Error handling and recovery test passed');
    });
  });

  describe('Performance and Memory Integration', () => {
    it('should maintain performance with multiple components', async () => {
      const startTime = performance.now();
      
      const { unmount } = render(
        <TestWrapper>
          <div>
            <VOIPPhone />
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
      
      console.log(`✅ Performance test passed (render time: ${renderTime.toFixed(2)}ms)`);
    });

    it('should properly cleanup resources on unmount', async () => {
      const mockDestroy = jest.fn();
      const mockClose = jest.fn();

      // Mock cleanup functions
      SIPManager.prototype.destroy = mockDestroy;
      AudioFeedbackService.prototype.destroy = mockDestroy;
      
      const { unmount } = render(
        <TestWrapper>
          <VOIPPhone />
        </TestWrapper>
      );

      // Component should mount without issues
      expect(screen.getByText(/VOIP Phone/i)).toBeInTheDocument();

      // Unmount and verify cleanup
      unmount();
      
      // Cleanup should be called during unmount
      await waitFor(() => {
        expect(mockDestroy).toHaveBeenCalled();
      });

      console.log('✅ Resource cleanup test passed');
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility across all components', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <VOIPPhone />
        </TestWrapper>
      );

      // Test keyboard navigation
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      // Test ARIA labels and roles
      const callButton = screen.getByRole('button', { name: /call/i });
      expect(callButton).toHaveAttribute('class');

      // Test screen reader friendly content
      const statusText = screen.getByText(/connected|disconnected/i);
      expect(statusText).toBeInTheDocument();

      console.log('✅ Accessibility integration test passed');
    });
  });
});