/**
 * Comprehensive VOIP System Testing Suite
 * Testing & QA Engineer - End-to-End VOIP Functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupTest, testConfig, mockWebAudioAPI, simulateNetworkConditions } from '../testSetup/testConfig';

// Import components
import VOIPPhone from '../../components/VOIPPhone';
import DialPad from '../../components/DialPad';
import CallControls from '../../components/CallControls';
import DTMFKeypad from '../../components/DTMFKeypad';

// Mock VOIP services
jest.mock('../../services/VOIPService', () => {
  return {
    __esModule: true,
    default: {
      initializeVOIP: jest.fn(() => Promise.resolve()),
      makeCall: jest.fn(() => Promise.resolve({ id: 'call-123', status: 'connecting' })),
      hangupCall: jest.fn(() => Promise.resolve()),
      acceptCall: jest.fn(() => Promise.resolve()),
      rejectCall: jest.fn(() => Promise.resolve()),
      sendDTMF: jest.fn(() => Promise.resolve()),
      mute: jest.fn(() => Promise.resolve()),
      unmute: jest.fn(() => Promise.resolve()),
      hold: jest.fn(() => Promise.resolve()),
      unhold: jest.fn(() => Promise.resolve()),
      transfer: jest.fn(() => Promise.resolve()),
      getCallStatus: jest.fn(() => 'idle'),
      getCallQuality: jest.fn(() => ({ audio: 'excellent', network: 'good' })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  };
});

jest.mock('../../services/SIPManager', () => ({
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  makeCall: jest.fn(() => Promise.resolve()),
  hangup: jest.fn(() => Promise.resolve()),
  register: jest.fn(() => Promise.resolve()),
  unregister: jest.fn(() => Promise.resolve()),
  isConnected: jest.fn(() => true),
  getConnectionStatus: jest.fn(() => 'connected')
}));

describe('Comprehensive VOIP System Tests', () => {
  let testSetup;

  beforeEach(() => {
    testSetup = setupTest({
      enableAudio: true,
      enableNetwork: true,
      networkCondition: 'wifi'
    });

    // Mock SIP.js library
    global.SIP = {
      UserAgent: jest.fn(() => ({
        start: jest.fn(() => Promise.resolve()),
        stop: jest.fn(() => Promise.resolve()),
        invite: jest.fn(() => Promise.resolve()),
        register: jest.fn(() => Promise.resolve()),
        unregister: jest.fn(() => Promise.resolve()),
        isConnected: jest.fn(() => true),
        transport: {
          isConnected: jest.fn(() => true),
          connect: jest.fn(() => Promise.resolve()),
          disconnect: jest.fn(() => Promise.resolve())
        }
      })),
      Web: {
        SessionManager: jest.fn(() => ({
          call: jest.fn(() => Promise.resolve()),
          hangup: jest.fn(() => Promise.resolve()),
          answer: jest.fn(() => Promise.resolve()),
          reject: jest.fn(() => Promise.resolve())
        }))
      }
    };

    // Mock WebRTC APIs
    global.RTCPeerConnection = jest.fn(() => ({
      createOffer: jest.fn(() => Promise.resolve()),
      createAnswer: jest.fn(() => Promise.resolve()),
      setLocalDescription: jest.fn(() => Promise.resolve()),
      setRemoteDescription: jest.fn(() => Promise.resolve()),
      addIceCandidate: jest.fn(() => Promise.resolve()),
      getStats: jest.fn(() => Promise.resolve(new Map())),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn()
    }));
  });

  afterEach(() => {
    testSetup.cleanup();
  });

  describe('VOIP Phone Component Integration', () => {
    test('renders VOIP phone with all controls', () => {
      render(<VOIPPhone />);

      expect(screen.getByText(/VOIP Phone/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /call/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hang up/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument();
    });

    test('initializes VOIP service on mount', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      render(<VOIPPhone />);

      await waitFor(() => {
        expect(VOIPService.initializeVOIP).toHaveBeenCalled();
      });
    });

    test('handles VOIP service initialization failure gracefully', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      VOIPService.initializeVOIP.mockRejectedValue(new Error('VOIP initialization failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<VOIPPhone />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('VOIP initialization failed')
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Call Management', () => {
    test('successfully makes outbound call', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      const user = userEvent.setup();
      
      render(<VOIPPhone />);

      const phoneInput = screen.getByPlaceholderText(/phone number/i);
      const callButton = screen.getByRole('button', { name: /call/i });

      await user.type(phoneInput, '+1-555-123-4567');
      await user.click(callButton);

      await waitFor(() => {
        expect(VOIPService.makeCall).toHaveBeenCalledWith('+1-555-123-4567');
      });
    });

    test('validates phone number before making call', async () => {
      const user = userEvent.setup();
      render(<VOIPPhone />);

      const phoneInput = screen.getByPlaceholderText(/phone number/i);
      const callButton = screen.getByRole('button', { name: /call/i });

      // Try with invalid number
      await user.type(phoneInput, '123');
      await user.click(callButton);

      expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument();
    });

    test('handles call connection states', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      const user = userEvent.setup();

      // Mock different call states
      VOIPService.makeCall
        .mockResolvedValueOnce({ id: 'call-123', status: 'connecting' })
        .mockResolvedValueOnce({ id: 'call-123', status: 'connected' });

      render(<VOIPPhone />);

      const phoneInput = screen.getByPlaceholderText(/phone number/i);
      const callButton = screen.getByRole('button', { name: /call/i });

      await user.type(phoneInput, '+1-555-123-4567');
      await user.click(callButton);

      // Should show connecting state
      await waitFor(() => {
        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      });

      // Simulate call connected
      act(() => {
        // Simulate VOIP event
        const mockEvent = new CustomEvent('callConnected', {
          detail: { callId: 'call-123' }
        });
        window.dispatchEvent(mockEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    test('successfully hangs up active call', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      const user = userEvent.setup();

      render(<VOIPPhone />);

      // Simulate active call
      act(() => {
        const mockEvent = new CustomEvent('callConnected', {
          detail: { callId: 'call-123' }
        });
        window.dispatchEvent(mockEvent);
      });

      const hangupButton = screen.getByRole('button', { name: /hang up/i });
      await user.click(hangupButton);

      await waitFor(() => {
        expect(VOIPService.hangupCall).toHaveBeenCalledWith('call-123');
      });
    });
  });

  describe('Call Quality Monitoring', () => {
    test('displays call quality indicators', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      VOIPService.getCallQuality.mockReturnValue({
        audio: 'excellent',
        network: 'good',
        jitter: 15,
        latency: 50,
        packetLoss: 0.1
      });

      render(<VOIPPhone />);

      // Simulate active call
      act(() => {
        const mockEvent = new CustomEvent('callConnected', {
          detail: { callId: 'call-123' }
        });
        window.dispatchEvent(mockEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/audio: excellent/i)).toBeInTheDocument();
        expect(screen.getByText(/network: good/i)).toBeInTheDocument();
      });
    });

    test('warns about poor call quality', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      VOIPService.getCallQuality.mockReturnValue({
        audio: 'poor',
        network: 'poor',
        jitter: 150,
        latency: 500,
        packetLoss: 5.0
      });

      render(<VOIPPhone />);

      // Simulate active call with poor quality
      act(() => {
        const mockEvent = new CustomEvent('callQualityChange', {
          detail: { quality: 'poor', metrics: { jitter: 150, latency: 500 } }
        });
        window.dispatchEvent(mockEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/poor call quality detected/i)).toBeInTheDocument();
        expect(screen.getByText(/check your network connection/i)).toBeInTheDocument();
      });
    });
  });

  describe('DTMF (Touch Tone) Support', () => {
    test('sends DTMF tones during active call', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      const user = userEvent.setup();

      render(<DTMFKeypad callId="call-123" />);

      // Test all DTMF buttons
      const dtmfButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
      
      for (const button of dtmfButtons) {
        const buttonElement = screen.getByRole('button', { name: button });
        await user.click(buttonElement);
        
        await waitFor(() => {
          expect(VOIPService.sendDTMF).toHaveBeenCalledWith('call-123', button);
        });
      }
    });

    test('plays DTMF tone sound when button pressed', async () => {
      const mockAudioContext = mockWebAudioAPI();
      const user = userEvent.setup();

      render(<DTMFKeypad callId="call-123" />);

      const button1 = screen.getByRole('button', { name: '1' });
      await user.click(button1);

      // Verify audio context was used for tone generation
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    test('disables DTMF when no active call', () => {
      render(<DTMFKeypad />);

      const dtmfButtons = screen.getAllByRole('button');
      dtmfButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Call Controls', () => {
    test('mute/unmute functionality', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      const user = userEvent.setup();

      render(<CallControls callId="call-123" />);

      const muteButton = screen.getByRole('button', { name: /mute/i });
      await user.click(muteButton);

      await waitFor(() => {
        expect(VOIPService.mute).toHaveBeenCalledWith('call-123');
      });

      // Button should change to unmute
      expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument();

      const unmuteButton = screen.getByRole('button', { name: /unmute/i });
      await user.click(unmuteButton);

      await waitFor(() => {
        expect(VOIPService.unmute).toHaveBeenCalledWith('call-123');
      });
    });

    test('hold/unhold functionality', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      const user = userEvent.setup();

      render(<CallControls callId="call-123" />);

      const holdButton = screen.getByRole('button', { name: /hold/i });
      await user.click(holdButton);

      await waitFor(() => {
        expect(VOIPService.hold).toHaveBeenCalledWith('call-123');
      });

      // Button should change to unhold
      expect(screen.getByRole('button', { name: /unhold/i })).toBeInTheDocument();
    });

    test('call transfer functionality', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      const user = userEvent.setup();

      render(<CallControls callId="call-123" />);

      const transferButton = screen.getByRole('button', { name: /transfer/i });
      await user.click(transferButton);

      // Should show transfer dialog
      expect(screen.getByText(/transfer call/i)).toBeInTheDocument();
      
      const transferInput = screen.getByPlaceholderText(/transfer to/i);
      await user.type(transferInput, '+1-555-999-8888');

      const confirmTransferButton = screen.getByRole('button', { name: /confirm transfer/i });
      await user.click(confirmTransferButton);

      await waitFor(() => {
        expect(VOIPService.transfer).toHaveBeenCalledWith('call-123', '+1-555-999-8888');
      });
    });
  });

  describe('Network Resilience', () => {
    test('handles network disconnection gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      render(<VOIPPhone />);

      // Simulate network disconnection
      simulateNetworkConditions('offline');
      
      act(() => {
        const mockEvent = new CustomEvent('offline');
        window.dispatchEvent(mockEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/network connection lost/i)).toBeInTheDocument();
        expect(screen.getByText(/attempting to reconnect/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('attempts automatic reconnection', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      render(<VOIPPhone />);

      // Simulate network reconnection
      simulateNetworkConditions('wifi');
      
      act(() => {
        const mockEvent = new CustomEvent('online');
        window.dispatchEvent(mockEvent);
      });

      await waitFor(() => {
        expect(VOIPService.initializeVOIP).toHaveBeenCalledTimes(2); // Initial + reconnect
      });
    });

    test('handles poor network conditions', async () => {
      simulateNetworkConditions('slow3g');
      render(<VOIPPhone />);

      act(() => {
        const mockEvent = new CustomEvent('callQualityChange', {
          detail: { quality: 'poor', cause: 'network' }
        });
        window.dispatchEvent(mockEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/poor network detected/i)).toBeInTheDocument();
        expect(screen.getByText(/call quality may be affected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles VOIP service errors gracefully', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      VOIPService.makeCall.mockRejectedValue(new Error('Call failed'));

      const user = userEvent.setup();
      render(<VOIPPhone />);

      const phoneInput = screen.getByPlaceholderText(/phone number/i);
      const callButton = screen.getByRole('button', { name: /call/i });

      await user.type(phoneInput, '+1-555-123-4567');
      await user.click(callButton);

      await waitFor(() => {
        expect(screen.getByText(/call failed/i)).toBeInTheDocument();
      });
    });

    test('handles WebRTC errors', async () => {
      // Mock WebRTC error
      global.RTCPeerConnection = jest.fn(() => {
        throw new Error('WebRTC not supported');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<VOIPPhone />);

      await waitFor(() => {
        expect(screen.getByText(/webrtc not supported/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    test('handles audio device errors', async () => {
      global.navigator.mediaDevices.getUserMedia.mockRejectedValue(
        new Error('Permission denied')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<VOIPPhone />);

      await waitFor(() => {
        expect(screen.getByText(/microphone access denied/i)).toBeInTheDocument();
        expect(screen.getByText(/please enable microphone permissions/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Testing', () => {
    test('VOIP initialization completes within timeout', async () => {
      const startTime = performance.now();
      render(<VOIPPhone />);

      await waitFor(() => {
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(testConfig.timeouts.medium);
      });
    });

    test('call establishment is responsive', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      const user = userEvent.setup();

      render(<VOIPPhone />);

      const phoneInput = screen.getByPlaceholderText(/phone number/i);
      const callButton = screen.getByRole('button', { name: /call/i });

      const startTime = performance.now();
      
      await user.type(phoneInput, '+1-555-123-4567');
      await user.click(callButton);

      await waitFor(() => {
        expect(VOIPService.makeCall).toHaveBeenCalled();
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(1000); // Should be very fast for UI response
      });
    });

    test('handles multiple concurrent calls efficiently', async () => {
      const VOIPService = (await import('../../services/VOIPService')).default;
      
      // Simulate multiple VOIP phone instances
      const phones = Array.from({ length: 3 }, (_, i) => (
        <VOIPPhone key={i} />
      ));

      render(<div>{phones}</div>);

      await waitFor(() => {
        expect(VOIPService.initializeVOIP).toHaveBeenCalledTimes(3);
      }, { timeout: testConfig.timeouts.medium });
    });
  });

  describe('Accessibility', () => {
    test('VOIP phone is keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<VOIPPhone />);

      const phoneInput = screen.getByPlaceholderText(/phone number/i);
      
      // Tab to input
      await user.tab();
      expect(phoneInput).toHaveFocus();

      // Enter phone number
      await user.type(phoneInput, '+1-555-123-4567');

      // Tab to call button and activate
      await user.tab();
      const callButton = screen.getByRole('button', { name: /call/i });
      expect(callButton).toHaveFocus();

      await user.keyboard('{Enter}');
      // Should trigger call (tested via mock)
    });

    test('call controls have proper ARIA labels', () => {
      render(<CallControls callId="call-123" />);

      expect(screen.getByRole('button', { name: /mute call/i })).toHaveAttribute('aria-label', expect.stringContaining('mute'));
      expect(screen.getByRole('button', { name: /hold call/i })).toHaveAttribute('aria-label', expect.stringContaining('hold'));
      expect(screen.getByRole('button', { name: /hang up call/i })).toHaveAttribute('aria-label', expect.stringContaining('hang up'));
    });

    test('call status is announced to screen readers', async () => {
      render(<VOIPPhone />);

      act(() => {
        const mockEvent = new CustomEvent('callConnected', {
          detail: { callId: 'call-123' }
        });
        window.dispatchEvent(mockEvent);
      });

      await waitFor(() => {
        const statusElement = screen.getByText(/connected/i);
        expect(statusElement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});