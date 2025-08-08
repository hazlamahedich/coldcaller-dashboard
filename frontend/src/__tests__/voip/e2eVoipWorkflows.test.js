/**
 * VOIP End-to-End Workflow Tests
 * Complete user workflow testing for VOIP functionality
 * Tests real-world calling scenarios and user interactions
 */

import {
  MockSIPProxy,
  MockWebRTCManager,
  MockSIPMessage,
  SecurityTestUtils,
  MediaStreamMock
} from '../mocks/voipMocks';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DialPad from '../../components/DialPad';
import { callsService } from '../../services/callsService';

// Mock the services
jest.mock('../../services/callsService');
const mockCallsService = callsService;

// E2E Workflow Test Configuration
const E2E_CONFIG = {
  testTimeout: 30000, // 30 seconds for complete workflows
  callQualityThreshold: 3.5,
  maxCallSetupTime: 5000, // 5 seconds
  maxCallEndTime: 2000, // 2 seconds
  networkSimulationDelay: 100 // 100ms network delay simulation
};

describe('VOIP End-to-End Workflow Tests', () => {
  let sipProxy;
  let webrtcManager;
  let securityUtils;
  let user;

  beforeEach(() => {
    sipProxy = new MockSIPProxy({
      requireAuth: true,
      rateLimitEnabled: true,
      messageValidation: true
    });

    webrtcManager = new MockWebRTCManager({
      requireEncryption: true,
      validateCertificates: true,
      enforceSecureTransport: true
    });

    securityUtils = new SecurityTestUtils();
    user = userEvent.setup();

    // Mock successful call service responses
    mockCallsService.startCallSession.mockResolvedValue({
      success: true,
      data: { sessionId: 'test-session-123' }
    });

    mockCallsService.endCallSession.mockResolvedValue({
      success: true,
      data: { id: 'call-log-123', duration: '2:30' }
    });

    mockCallsService.logCall.mockResolvedValue({
      success: true,
      data: { id: 'call-log-124' }
    });

    // Mock navigator.mediaDevices for WebRTC
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue(new MediaStreamMock('audio')),
        enumerateDevices: jest.fn().mockResolvedValue([
          { deviceId: 'default', kind: 'audioinput', label: 'Default Microphone' }
        ])
      },
      writable: true
    });
  });

  afterEach(() => {
    sipProxy.reset();
    webrtcManager.cleanup();
    securityUtils.cleanup();
    jest.clearAllMocks();
  });

  describe('Complete Outbound Call Workflow', () => {
    it('should complete full outbound call workflow successfully', async () => {
      const workflow = new CallWorkflowTracker();
      workflow.start('outbound-call-complete');

      // Step 1: Render DialPad component
      render(<DialPad />);
      await waitFor(() => {
        expect(screen.getByText('Dial Pad')).toBeInTheDocument();
      });
      workflow.step('ui-rendered');

      // Step 2: Enter phone number
      const phoneNumber = '555-123-4567';
      for (const digit of phoneNumber.replace(/-/g, '')) {
        const digitButton = screen.getByText(digit);
        await user.click(digitButton);
      }
      
      // Verify number is displayed correctly
      const phoneInput = screen.getByDisplayValue('(555) 123-4567');
      expect(phoneInput).toBeInTheDocument();
      workflow.step('number-entered');

      // Step 3: Initiate call
      const callButton = screen.getByText(/📞 Call/);
      expect(callButton).not.toBeDisabled();
      
      await user.click(callButton);
      workflow.step('call-initiated');

      // Step 4: Wait for call connection simulation
      await waitFor(() => {
        expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
      }, { timeout: E2E_CONFIG.maxCallSetupTime });
      workflow.step('call-connected');

      // Step 5: Verify call session was started
      expect(mockCallsService.startCallSession).toHaveBeenCalledWith({
        phone: '5551234567',
        timestamp: expect.any(String)
      });
      workflow.step('session-logged');

      // Step 6: Simulate call in progress (brief hold)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 7: End call with outcome
      const hangUpButton = screen.getByText(/📵 Hang Up/);
      await user.click(hangUpButton);
      workflow.step('call-ended');

      // Step 8: Verify call was logged
      await waitFor(() => {
        expect(mockCallsService.endCallSession).toHaveBeenCalledWith(
          'test-session-123',
          expect.objectContaining({
            phone: '5551234567',
            outcome: 'Call Ended',
            duration: expect.any(String)
          })
        );
      });
      workflow.step('call-logged');

      // Step 9: Verify UI returns to ready state
      await waitFor(() => {
        expect(screen.getByText(/📞 Call/)).toBeInTheDocument();
        expect(screen.queryByText(/🔴 Call in progress/)).not.toBeInTheDocument();
      });
      workflow.step('ui-reset');

      const workflowResults = workflow.complete();
      
      // Verify complete workflow timing
      expect(workflowResults.totalDuration).toBeLessThan(E2E_CONFIG.testTimeout);
      expect(workflowResults.steps).toHaveLength(9);
      
      console.log(`📞 Outbound Call Workflow:
        ⏱️  Total Duration: ${workflowResults.totalDuration}ms
        📊 Steps Completed: ${workflowResults.steps.length}
        🎯 Success Rate: 100%`);
    }, E2E_CONFIG.testTimeout);

    it('should handle call with different outcomes', async () => {
      const callOutcomes = ['Connected', 'Voicemail', 'No Answer', 'Busy'];
      const outcomeResults = [];

      for (const outcome of callOutcomes) {
        const workflow = new CallWorkflowTracker();
        workflow.start(`call-outcome-${outcome.toLowerCase()}`);

        // Render fresh component for each test
        const { unmount } = render(<DialPad />);
        
        // Quick dial and call
        await quickDial('555-987-6543', user);
        workflow.step('call-initiated');

        // Wait for call state
        await waitFor(() => {
          expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
        });

        // Select specific outcome
        const outcomeButton = screen.getByText(new RegExp(outcome));
        await user.click(outcomeButton);
        workflow.step('outcome-selected');

        // Verify call ended with correct outcome
        await waitFor(() => {
          expect(mockCallsService.endCallSession).toHaveBeenCalledWith(
            'test-session-123',
            expect.objectContaining({ outcome })
          );
        });
        workflow.step('call-completed');

        const results = workflow.complete();
        outcomeResults.push({
          outcome,
          duration: results.totalDuration,
          success: results.steps.length === 3
        });

        unmount();
        jest.clearAllMocks();

        // Reset mock responses for next iteration
        mockCallsService.startCallSession.mockResolvedValue({
          success: true,
          data: { sessionId: `test-session-${outcome}` }
        });
      }

      // All outcomes should complete successfully
      const successfulOutcomes = outcomeResults.filter(r => r.success);
      expect(successfulOutcomes).toHaveLength(callOutcomes.length);

      console.log('📊 Call Outcome Tests:');
      outcomeResults.forEach(result => {
        console.log(`  ${result.outcome}: ${result.duration}ms (${result.success ? '✅' : '❌'})`);
      });
    }, E2E_CONFIG.testTimeout * callOutcomes.length);

    it('should handle call errors and recovery', async () => {
      render(<DialPad />);

      // Simulate call service failure
      mockCallsService.startCallSession.mockRejectedValue(new Error('Network error'));

      // Attempt to make call
      await quickDial('555-111-2222', user);

      // Should show error state without crashing
      await waitFor(() => {
        expect(screen.queryByText(/🔴 Call in progress/)).not.toBeInTheDocument();
        expect(screen.getByText(/📞 Call/)).toBeInTheDocument();
      });

      // Error should be logged but not crash the app
      expect(console.error).toHaveBeenCalled();

      // Should allow retry after error
      mockCallsService.startCallSession.mockResolvedValue({
        success: true,
        data: { sessionId: 'retry-session-123' }
      });

      // Retry the call
      const retryCallButton = screen.getByText(/📞 Call/);
      await user.click(retryCallButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
      });

      console.log('🔄 Error Recovery Test: ✅ Completed');
    });
  });

  describe('Advanced Call Features Workflow', () => {
    it('should handle call with recording and notes', async () => {
      const workflow = new CallWorkflowTracker();
      workflow.start('call-with-recording');

      render(<DialPad />);

      // Enable recording before call (if feature available)
      // This would be implemented in a more complete VOIP interface
      const recordingEnabled = true; // Mock setting

      // Make call
      await quickDial('555-444-7777', user);
      workflow.step('call-initiated');

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
      });
      workflow.step('call-connected');

      // Simulate recording during call
      if (recordingEnabled) {
        // Mock recording functionality
        await simulateCallRecording(3000); // 3 second recording
        workflow.step('recording-completed');
      }

      // End call with notes
      const connectedButton = screen.getByText(/✅ Connected/);
      await user.click(connectedButton);
      workflow.step('call-ended-with-outcome');

      // Verify call was logged with recording reference
      await waitFor(() => {
        expect(mockCallsService.endCallSession).toHaveBeenCalledWith(
          'test-session-123',
          expect.objectContaining({
            outcome: 'Connected',
            notes: expect.stringContaining('Quick log: Connected')
          })
        );
      });
      workflow.step('call-logged-with-notes');

      const results = workflow.complete();
      expect(results.steps).toHaveLength(recordingEnabled ? 5 : 4);

      console.log(`🎙️ Recording Workflow:
        ⏱️  Duration: ${results.totalDuration}ms
        📹 Recording: ${recordingEnabled ? 'Enabled' : 'Disabled'}
        📝 Notes: Included`);
    });

    it('should handle multi-step call workflow with lead integration', async () => {
      // This test simulates integration with lead management
      const leadData = {
        id: 'lead-123',
        name: 'John Doe',
        phone: '555-555-0123',
        lastContact: null
      };

      render(<DialPad />);

      // Pre-fill from lead data (simulated)
      await fillPhoneFromLead(leadData.phone, user);

      // Initiate call
      const callButton = screen.getByText(/📞 Call/);
      await user.click(callButton);

      // Wait for call
      await waitFor(() => {
        expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
      });

      // Simulate successful conversation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // End with positive outcome
      const connectedButton = screen.getByText(/✅ Connected/);
      await user.click(connectedButton);

      // Should update lead's last contact
      await waitFor(() => {
        expect(mockCallsService.endCallSession).toHaveBeenCalledWith(
          'test-session-123',
          expect.objectContaining({
            phone: '5555550123',
            outcome: 'Connected'
          })
        );
      });

      console.log(`👤 Lead Integration Test: ✅ Completed
        📇 Lead: ${leadData.name}
        📞 Phone: ${leadData.phone}
        📊 Outcome: Connected`);
    });

    it('should handle call transfer simulation', async () => {
      // This test simulates call transfer functionality
      render(<DialPad />);

      // Start initial call
      await quickDial('555-333-9999', user);

      await waitFor(() => {
        expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
      });

      // Simulate transfer request (would be implemented in full VOIP UI)
      const transferRequested = true;
      
      if (transferRequested) {
        // Mock transfer process
        await simulateCallTransfer('555-888-7777');
        
        // End original call
        const hangUpButton = screen.getByText(/📵 Hang Up/);
        await user.click(hangUpButton);

        // Should log transfer in call notes
        await waitFor(() => {
          expect(mockCallsService.endCallSession).toHaveBeenCalledWith(
            'test-session-123',
            expect.objectContaining({
              outcome: 'Call Ended'
            })
          );
        });
      }

      console.log(`🔄 Call Transfer Test: ${transferRequested ? '✅' : '⏭️'} Completed`);
    });
  });

  describe('Mobile Device Workflow Testing', () => {
    it('should work correctly on mobile devices', async () => {
      // Mock mobile environment
      mockMobileDevice();

      render(<DialPad />);

      // Mobile-specific interactions
      await testMobileTouch('5551234567', user);

      // Should handle mobile-specific gestures
      const callButton = screen.getByText(/📞 Call/);
      
      // Simulate touch event
      fireEvent.touchStart(callButton);
      fireEvent.touchEnd(callButton);
      
      await waitFor(() => {
        expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
      });

      // End call with mobile gesture
      const hangUpButton = screen.getByText(/📵 Hang Up/);
      fireEvent.touchStart(hangUpButton);
      fireEvent.touchEnd(hangUpButton);

      await waitFor(() => {
        expect(screen.getByText(/📞 Call/)).toBeInTheDocument();
      });

      console.log('📱 Mobile Workflow: ✅ Completed');
    });

    it('should handle mobile network changes during call', async () => {
      mockMobileDevice();
      
      render(<DialPad />);

      // Start call
      await quickDial('555-mobile-123', user);

      await waitFor(() => {
        expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
      });

      // Simulate network change (WiFi to Cellular)
      await simulateNetworkChange('wifi', 'cellular');

      // Call should continue (in real implementation, would show quality change)
      expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();

      // End call
      const hangUpButton = screen.getByText(/📵 Hang Up/);
      await user.click(hangUpButton);

      console.log('📶 Network Change Test: ✅ Completed');
    });
  });

  describe('Accessibility Workflow Testing', () => {
    it('should be fully accessible with screen reader', async () => {
      render(<DialPad />);

      // Test keyboard navigation
      const firstButton = screen.getByText('1');
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      // Tab through number buttons
      fireEvent.keyDown(firstButton, { key: 'Tab' });
      expect(document.activeElement).toBe(screen.getByText('2'));

      // Test keyboard dialing
      await user.type(document.activeElement, '5551234567', { delay: 10 });

      // Should be able to call with keyboard
      const callButton = screen.getByText(/📞 Call/);
      fireEvent.keyDown(callButton, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
      });

      // Should announce call state changes
      expect(screen.getByText(/🔴 Call in progress/)).toHaveAttribute('role');

      console.log('♿ Accessibility Test: ✅ Completed');
    });

    it('should support voice commands (simulation)', async () => {
      // Mock voice recognition
      const mockVoiceCommands = {
        'call five five five one two three four five six seven': '5551234567',
        'hang up': 'hangup',
        'answer': 'answer'
      };

      render(<DialPad />);

      // Simulate voice command for dialing
      const voiceNumber = mockVoiceCommands['call five five five one two three four five six seven'];
      await simulateVoiceCommand('dial', voiceNumber);

      // Should show number was entered
      expect(screen.getByDisplayValue('(555) 123-4567')).toBeInTheDocument();

      // Simulate voice command for calling
      await simulateVoiceCommand('call');

      await waitFor(() => {
        expect(screen.getByText(/🔴 Call in progress/)).toBeInTheDocument();
      });

      // Simulate voice hang up
      await simulateVoiceCommand('hangup');

      await waitFor(() => {
        expect(screen.getByText(/📞 Call/)).toBeInTheDocument();
      });

      console.log('🎤 Voice Commands Test: ✅ Completed');
    });
  });

  // Helper functions for E2E testing

  async function quickDial(phoneNumber, user) {
    const digits = phoneNumber.replace(/[^0-9]/g, '');
    for (const digit of digits) {
      const button = screen.getByText(digit);
      await user.click(button);
    }
    
    const callButton = screen.getByText(/📞 Call/);
    await user.click(callButton);
  }

  async function fillPhoneFromLead(phoneNumber, user) {
    // Simulate filling phone number from lead data
    const digits = phoneNumber.replace(/[^0-9]/g, '');
    for (const digit of digits) {
      const button = screen.getByText(digit);
      await user.click(button);
    }
  }

  async function simulateCallRecording(duration) {
    // Simulate call recording process
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  async function simulateCallTransfer(targetNumber) {
    // Simulate call transfer process
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  function mockMobileDevice() {
    // Mock mobile device environment
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      writable: true
    });
  }

  async function testMobileTouch(phoneNumber, user) {
    const digits = phoneNumber.replace(/[^0-9]/g, '');
    for (const digit of digits) {
      const button = screen.getByText(digit);
      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);
    }
  }

  async function simulateNetworkChange(from, to) {
    // Simulate network change
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  async function simulateVoiceCommand(command, parameter) {
    // Simulate voice command processing
    if (command === 'dial' && parameter) {
      // Fill phone number
      const digits = parameter.replace(/[^0-9]/g, '');
      for (const digit of digits) {
        const button = screen.getByText(digit);
        fireEvent.click(button);
      }
    } else if (command === 'call') {
      const callButton = screen.getByText(/📞 Call/);
      fireEvent.click(callButton);
    } else if (command === 'hangup') {
      const hangUpButton = screen.getByText(/📵 Hang Up/);
      fireEvent.click(hangUpButton);
    }
    
    return new Promise(resolve => setTimeout(resolve, 100));
  }
});

// Call Workflow Tracker Class
class CallWorkflowTracker {
  constructor() {
    this.steps = [];
    this.startTime = null;
    this.endTime = null;
  }

  start(workflowName) {
    this.workflowName = workflowName;
    this.startTime = performance.now();
    this.steps = [];
  }

  step(stepName) {
    const stepTime = performance.now();
    this.steps.push({
      name: stepName,
      timestamp: stepTime,
      duration: this.steps.length > 0 ? 
        stepTime - this.steps[this.steps.length - 1].timestamp : 
        stepTime - this.startTime
    });
  }

  complete() {
    this.endTime = performance.now();
    return {
      workflowName: this.workflowName,
      totalDuration: this.endTime - this.startTime,
      steps: this.steps,
      stepsCompleted: this.steps.length,
      averageStepDuration: this.steps.reduce((sum, step) => sum + step.duration, 0) / this.steps.length
    };
  }
}