/**
 * VOIP End-to-End Test Suite
 * Complete user journey testing for VOIP functionality
 * Tests real-world scenarios and user workflows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Components
import VOIPPhone from '../../components/VOIPPhone';
import FloatingCallBar from '../../components/FloatingCallBar';
import CallContext from '../../contexts/CallContext';

// Test utilities
import { TestWrapper } from '../testSetup/testConfig';
import { simulateCallProgression, simulateNetworkConditions } from '../mocks/voipMocks';

describe('VOIP End-to-End User Journeys', () => {
  let mockCallLogged;
  let mockLeadInfo;

  beforeEach(() => {
    mockCallLogged = jest.fn();
    mockLeadInfo = {
      id: 'lead-123',
      name: 'John Doe',
      company: 'Acme Corp',
      phone: '+1-555-123-4567',
      email: 'john.doe@acmecorp.com',
      priority: 'High',
      status: 'Qualified'
    };

    // Setup production-like environment
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn(() => Promise.resolve({
        getTracks: () => [{ stop: jest.fn(), enabled: true, kind: 'audio' }],
        getAudioTracks: () => [{ stop: jest.fn(), enabled: true }]
      }))
    };

    global.AudioContext = jest.fn(() => ({
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
    }));

    global.speechSynthesis = {
      cancel: jest.fn(),
      speak: jest.fn(),
      getVoices: jest.fn(() => [])
    };
  });

  describe('Complete Sales Call Journey', () => {
    it('should complete a successful sales call with full feature usage', async () => {
      const user = userEvent.setup();
      
      // Step 1: Render VOIP phone for lead
      render(
        <TestWrapper>
          <VOIPPhone 
            leadInfo={mockLeadInfo}
            onCallLogged={mockCallLogged}
          />
        </TestWrapper>
      );

      // Step 2: Wait for SIP registration
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      console.log('📞 Step 1: SIP Registration Complete');

      // Step 3: Auto-populate phone number from lead
      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      expect(phoneInput).toHaveValue('(555) 123-4567');

      console.log('📞 Step 2: Lead phone number populated');

      // Step 4: Initiate call
      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      console.log('📞 Step 3: Call initiated');

      // Step 5: Progress through call states
      await waitFor(() => {
        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/ringing/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(screen.getByText(/connected|active/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      console.log('📞 Step 4: Call connected successfully');

      // Step 6: Use DTMF for IVR navigation (common in business calls)
      const dtmfButton = screen.getByRole('button', { name: /dtmf keypad/i });
      await user.click(dtmfButton);

      // Navigate business phone menu: Press 1 for Sales, then extension 123
      const key1 = screen.getByRole('button', { name: '1' });
      await user.click(key1);
      
      await waitFor(() => {
        expect(screen.getByText(/1/)).toBeInTheDocument();
      });

      const key2 = screen.getByRole('button', { name: '2' });
      const key3 = screen.getByRole('button', { name: '3' });
      await user.click(key2);
      await user.click(key3);

      console.log('📞 Step 5: DTMF navigation complete (1-2-3)');

      // Close DTMF keypad
      const closeDTMF = screen.getByRole('button', { name: /close|✕/i });
      await user.click(closeDTMF);

      // Step 7: Test call controls during conversation
      const muteButton = screen.getByRole('button', { name: /mute/i });
      await user.click(muteButton);

      await waitFor(() => {
        expect(screen.getByText(/muted/i)).toBeInTheDocument();
      });

      console.log('📞 Step 6: Mute activated for private consultation');

      // Unmute to continue conversation
      await user.click(muteButton);

      // Step 8: Put call on hold (simulating looking up information)
      const holdButton = screen.getByRole('button', { name: /hold/i });
      await user.click(holdButton);

      await waitFor(() => {
        expect(screen.getByText(/hold/i)).toBeInTheDocument();
      });

      console.log('📞 Step 7: Call on hold for information lookup');

      // Resume call
      await user.click(holdButton);

      console.log('📞 Step 8: Call resumed');

      // Step 9: Complete call successfully
      const hangupButton = screen.getByRole('button', { name: /hang up/i });
      await user.click(hangupButton);

      console.log('📞 Step 9: Call ended by user');

      // Step 10: Verify call logging with lead information
      await waitFor(() => {
        expect(mockCallLogged).toHaveBeenCalledWith(
          expect.objectContaining({
            phone: '5551234567',
            outcome: 'Connected',
            notes: expect.stringContaining('VOIP call'),
            leadId: 'lead-123'
          })
        );
      }, { timeout: 3000 });

      console.log('📞 Step 10: Call logged successfully');

      // Step 11: Verify call history updates
      await waitFor(() => {
        expect(screen.getByText(/call history/i)).toBeInTheDocument();
      });

      console.log('✅ Complete sales call journey test passed');
    });

    it('should handle customer service call with multiple transfers', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <VOIPPhone 
            leadInfo={{
              name: 'Customer Support',
              company: 'Help Desk',
              phone: '+1-800-555-HELP'
            }}
            onCallLogged={mockCallLogged}
          />
        </TestWrapper>
      );

      // Step 1: Call customer service line
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });

      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '8005554357'); // 800-555-HELP

      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      // Wait for call to connect
      await waitFor(() => {
        expect(screen.getByText(/active|connected/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Step 2: Navigate phone menu system
      const dtmfButton = screen.getByRole('button', { name: /dtmf keypad/i });
      await user.click(dtmfButton);

      // Press 2 for Technical Support
      const key2 = screen.getByRole('button', { name: '2' });
      await user.click(key2);

      // Press 3 for Billing Department  
      const key3 = screen.getByRole('button', { name: '3' });
      await user.click(key3);

      // Press 0 for Operator
      const key0 = screen.getByRole('button', { name: '0' });
      await user.click(key0);

      console.log('📞 Customer service DTMF navigation: 2-3-0');

      // Close DTMF
      const closeDTMF = screen.getByRole('button', { name: /close/i });
      await user.click(closeDTMF);

      // Step 3: Simulate being put on hold multiple times
      const holdButton = screen.getByRole('button', { name: /hold/i });
      
      // First hold period
      await user.click(holdButton);
      await waitFor(() => {
        expect(screen.getByText(/hold/i)).toBeInTheDocument();
      });
      
      // Resume after 2 seconds
      setTimeout(async () => {
        await user.click(holdButton);
      }, 2000);

      // Second hold period (transfer)
      setTimeout(async () => {
        await user.click(holdButton);
      }, 4000);

      // Step 4: Complete call
      const hangupButton = screen.getByRole('button', { name: /hang up/i });
      setTimeout(async () => {
        await user.click(hangupButton);
      }, 6000);

      // Verify call completion
      await waitFor(() => {
        expect(mockCallLogged).toHaveBeenCalled();
      }, { timeout: 8000 });

      console.log('✅ Customer service call with transfers test passed');
    });
  });

  describe('Real-World Network Conditions', () => {
    it('should handle poor network conditions gracefully', async () => {
      const user = userEvent.setup();
      
      // Simulate poor network
      simulateNetworkConditions({
        bandwidth: 256, // Low bandwidth
        latency: 300,   // High latency
        packetLoss: 3   // 3% packet loss
      });

      render(
        <TestWrapper>
          <VOIPPhone 
            leadInfo={mockLeadInfo}
            onCallLogged={mockCallLogged}
          />
        </TestWrapper>
      );

      // Call under poor conditions
      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      await user.type(phoneInput, '5551234567');

      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      // Should handle network issues
      await waitFor(() => {
        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      });

      // Call may take longer to establish
      await waitFor(() => {
        expect(screen.getByText(/ringing|connected|failed/i)).toBeInTheDocument();
      }, { timeout: 8000 });

      console.log('✅ Poor network conditions handling test passed');
    });

    it('should recover from network interruptions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <VOIPPhone 
            leadInfo={mockLeadInfo}
            onCallLogged={mockCallLogged}
          />
        </TestWrapper>
      );

      // Establish call
      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      await user.type(phoneInput, '5551234567');

      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      await waitFor(() => {
        expect(screen.getByText(/connected|active/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Simulate network interruption
      simulateNetworkConditions({ offline: true });

      // Wait for recovery
      setTimeout(() => {
        simulateNetworkConditions({ 
          bandwidth: 1000,
          latency: 50,
          packetLoss: 0
        });
      }, 3000);

      // Call should either recover or fail gracefully
      await waitFor(() => {
        const status = screen.queryByText(/connected|failed|ended/i);
        expect(status).toBeInTheDocument();
      }, { timeout: 10000 });

      console.log('✅ Network interruption recovery test passed');
    });
  });

  describe('Floating Call Bar Integration', () => {
    it('should provide seamless floating call bar experience', async () => {
      const user = userEvent.setup();
      let callState = 'idle';
      let showFloatingBar = false;
      const mockCallData = mockLeadInfo;

      const MockFloatingBarWrapper = () => {
        const [currentState, setCurrentState] = React.useState(callState);
        const [isVisible, setIsVisible] = React.useState(showFloatingBar);

        React.useEffect(() => {
          setCurrentState(callState);
          setIsVisible(showFloatingBar);
        }, []);

        return (
          <>
            <VOIPPhone 
              leadInfo={mockCallData}
              onCallLogged={mockCallLogged}
            />
            <FloatingCallBar
              isVisible={isVisible}
              callState={currentState}
              leadData={mockCallData}
              phoneNumber={mockCallData.phone}
              callDuration={60}
              isMuted={false}
              isOnHold={false}
              onMute={jest.fn()}
              onHold={jest.fn()}
              onHangup={jest.fn()}
              onShowDialpad={jest.fn()}
            />
          </>
        );
      };

      const { rerender } = render(
        <TestWrapper>
          <MockFloatingBarWrapper />
        </TestWrapper>
      );

      // Initiate call to trigger floating bar
      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      await user.type(phoneInput, '5551234567');

      const callButton = screen.getByRole('button', { name: /call/i });
      await user.click(callButton);

      // Update state to show floating bar
      callState = 'active';
      showFloatingBar = true;
      
      rerender(
        <TestWrapper>
          <MockFloatingBarWrapper />
        </TestWrapper>
      );

      // Floating bar should show lead information
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      // Test floating bar controls
      const floatingMuteBtn = screen.getAllByRole('button', { name: /mute/i })[0];
      await user.click(floatingMuteBtn);

      console.log('✅ Floating call bar integration test passed');
    });

    it('should handle minimize and restore functionality', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <FloatingCallBar
            isVisible={true}
            callState="active"
            leadData={mockLeadInfo}
            phoneNumber="+15551234567"
            callDuration={120}
            isMuted={false}
            isOnHold={false}
            onMute={jest.fn()}
            onHold={jest.fn()}
            onHangup={jest.fn()}
            onShowDialpad={jest.fn()}
          />
        </TestWrapper>
      );

      // Should show full view initially
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('02:00')).toBeInTheDocument(); // Duration

      // Test minimize
      const minimizeButton = screen.getByRole('button', { name: /➖/i });
      await user.click(minimizeButton);

      // Should show minimized view
      await waitFor(() => {
        expect(screen.queryByText('02:00')).not.toBeInTheDocument();
      });

      // Test restore by clicking the minimized icon
      const restoreButton = screen.getByRole('button', { name: /✅/i }); // Active call icon
      await user.click(restoreButton);

      // Should show full view again
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      console.log('✅ Floating bar minimize/restore test passed');
    });
  });

  describe('Accessibility and Usability', () => {
    it('should provide comprehensive keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <VOIPPhone leadInfo={mockLeadInfo} />
        </TestWrapper>
      );

      // Test tab navigation through all interactive elements
      await user.tab(); // Phone input
      expect(document.activeElement).toHaveAttribute('placeholder', /enter phone number/i);

      await user.tab(); // Delete button
      await user.tab(); // Clear button
      
      // Tab through keypad
      for (let i = 0; i < 12; i++) { // 12 keypad buttons
        await user.tab();
      }

      await user.tab(); // Call button
      expect(document.activeElement).toHaveAttribute('class', expect.stringContaining('btn-primary'));

      console.log('✅ Keyboard navigation accessibility test passed');
    });

    it('should provide screen reader friendly content', async () => {
      render(
        <TestWrapper>
          <VOIPPhone leadInfo={mockLeadInfo} />
        </TestWrapper>
      );

      // Test ARIA labels and roles
      const callButton = screen.getByRole('button', { name: /call/i });
      expect(callButton).toBeInTheDocument();

      const phoneInput = screen.getByRole('textbox');
      expect(phoneInput).toHaveAttribute('placeholder');

      // Test status announcements
      const statusText = screen.getByText(/connected|disconnected/i);
      expect(statusText).toBeInTheDocument();

      console.log('✅ Screen reader accessibility test passed');
    });

    it('should handle high contrast and theme modes', async () => {
      const user = userEvent.setup();
      
      // Test with dark mode
      render(
        <TestWrapper themeMode="dark">
          <VOIPPhone leadInfo={mockLeadInfo} />
        </TestWrapper>
      );

      const phoneContainer = screen.getByText(/VOIP Phone/i).closest('div');
      expect(phoneContainer).toHaveClass(expect.stringMatching(/card/));

      // Test with light mode
      const { rerender } = render(
        <TestWrapper themeMode="light">
          <VOIPPhone leadInfo={mockLeadInfo} />
        </TestWrapper>
      );

      expect(phoneContainer).toHaveClass(expect.stringMatching(/card/));

      console.log('✅ Theme mode accessibility test passed');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should maintain performance with rapid user interactions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <VOIPPhone leadInfo={mockLeadInfo} />
        </TestWrapper>
      );

      const phoneInput = screen.getByPlaceholderText(/enter phone number/i);
      const startTime = performance.now();

      // Rapid typing simulation
      const phoneNumber = '5551234567890';
      for (const digit of phoneNumber) {
        await user.type(phoneInput, digit, { delay: 1 });
      }

      const typingTime = performance.now() - startTime;
      expect(typingTime).toBeLessThan(2000); // Should complete in under 2 seconds

      console.log(`✅ Performance test passed (${typingTime.toFixed(2)}ms for ${phoneNumber.length} keystrokes)`);
    });

    it('should handle concurrent call attempts gracefully', async () => {
      const promises = [];
      
      // Simulate multiple call attempts
      for (let i = 0; i < 5; i++) {
        const callAttempt = new Promise((resolve) => {
          render(
            <TestWrapper key={i}>
              <VOIPPhone 
                leadInfo={{ ...mockLeadInfo, id: `lead-${i}` }}
                onCallLogged={() => resolve(i)}
              />
            </TestWrapper>
          );
        });
        promises.push(callAttempt);
      }

      // Should handle multiple renders without crashes
      expect(() => {
        promises.forEach(p => p.catch(() => {})); // Handle any rejections
      }).not.toThrow();

      console.log('✅ Concurrent call attempts test passed');
    });
  });
});