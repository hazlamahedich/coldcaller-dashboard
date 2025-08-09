import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SIPManager from '../../services/SIPManager';
import SIPProviderManager from '../../services/SIPProviderManager';
import DTMFKeypad from '../../components/DTMFKeypad';
import VOIPPhone from '../../components/VOIPPhone';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockReturnValue({
    type: 'sine',
    frequency: { value: 0 },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  }),
  createGain: jest.fn().mockReturnValue({
    gain: { value: 0 },
    connect: jest.fn()
  }),
  destination: {},
  currentTime: 0,
  close: jest.fn()
}));

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  onopen: null,
  onerror: null,
  close: jest.fn(),
  readyState: 1
}));

// Mock RTCPeerConnection
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createDataChannel: jest.fn(),
  createOffer: jest.fn().mockResolvedValue({}),
  setLocalDescription: jest.fn().mockResolvedValue(),
  onicecandidate: null,
  close: jest.fn()
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('SIP Integration Tests', () => {
  describe('SIPManager DTMF Integration', () => {
    let sipManager;

    beforeEach(() => {
      sipManager = new SIPManager();
      // Mock a connected call
      sipManager.currentCall = {
        id: 'test-call-123',
        number: '+1234567890',
        state: 'connected',
        startTime: new Date(),
        dtmfHistory: []
      };
    });

    afterEach(() => {
      sipManager.destroy();
    });

    test('should send DTMF tones successfully', () => {
      const result = sipManager.sendDTMF('1');
      
      expect(result).toBe(true);
      expect(sipManager.currentCall.dtmfHistory).toHaveLength(1);
      expect(sipManager.currentCall.dtmfHistory[0]).toMatchObject({
        tones: '1',
        duration: 200
      });
    });

    test('should handle multiple DTMF tones', () => {
      const tones = '123*0#';
      
      for (const tone of tones) {
        sipManager.sendDTMF(tone);
      }
      
      expect(sipManager.currentCall.dtmfHistory).toHaveLength(6);
      const sentTones = sipManager.currentCall.dtmfHistory.map(entry => entry.tones).join('');
      expect(sentTones).toBe(tones);
    });

    test('should fail to send DTMF when not in call', () => {
      sipManager.currentCall = null;
      
      const result = sipManager.sendDTMF('1');
      
      expect(result).toBe(false);
    });

    test('should emit dtmfSent event', () => {
      const mockCallback = jest.fn();
      sipManager.on('dtmfSent', mockCallback);
      
      sipManager.sendDTMF('5');
      
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        tones: '5',
        callSession: sipManager.currentCall
      }));
    });

    test('should attempt SIP transmission', () => {
      // Mock SIP session with DTMF capability
      sipManager.currentCall.sipSession = {
        dtmf: jest.fn().mockReturnValue(true)
      };
      
      const result = sipManager.transmitDTMFViaSIP('1');
      
      expect(result).toBe(true);
    });
  });

  describe('SIPProviderManager Configuration', () => {
    let providerManager;

    beforeEach(() => {
      providerManager = new SIPProviderManager();
    });

    test('should initialize with default providers', () => {
      const providers = providerManager.getAvailableProviders();
      
      expect(providers).toHaveLength(4);
      expect(providers.map(p => p.type)).toEqual(['twilio', 'generic', 'asterisk', '3cx']);
    });

    test('should configure Twilio provider', () => {
      const config = {
        authentication: {
          accountSid: 'test-sid',
          apiKey: 'test-key'
        }
      };
      
      const result = providerManager.configureProvider('twilio', config);
      
      expect(result.name).toBe('Twilio');
      expect(result.authentication.accountSid).toBe('test-sid');
    });

    test('should get DTMF configuration', () => {
      providerManager.configureProvider('twilio', {});
      const dtmfConfig = providerManager.getDTMFConfig('twilio');
      
      expect(dtmfConfig).toMatchObject({
        preferredMethod: 'rfc4733',
        duration: 200,
        interToneGap: 50
      });
      expect(dtmfConfig.supportedMethods).toContain('rfc4733');
      expect(dtmfConfig.supportedMethods).toContain('info');
    });

    test('should validate DTMF methods', () => {
      providerManager.configureProvider('twilio', {});
      
      expect(providerManager.validateDTMFMethod('rfc4733', 'twilio')).toBe(true);
      expect(providerManager.validateDTMFMethod('info', 'twilio')).toBe(true);
      expect(providerManager.validateDTMFMethod('inband', 'twilio')).toBe(false);
    });

    test('should generate SIP configuration', () => {
      const config = {
        authentication: {
          username: 'testuser',
          password: 'testpass',
          realm: 'test.com'
        },
        wsServers: ['wss://test.com:7443/ws']
      };
      
      providerManager.configureProvider('generic', config);
      const sipConfig = providerManager.getSIPConfiguration('generic');
      
      expect(sipConfig).toMatchObject({
        uri: 'sip:testuser@test.com',
        wsServers: ['wss://test.com:7443/ws'],
        authUser: 'testuser',
        password: 'testpass'
      });
    });

    test('should auto-detect provider from environment', () => {
      // Mock environment variables
      process.env.REACT_APP_TWILIO_ACCOUNT_SID = 'test-sid';
      
      const provider = providerManager.autoDetectProvider();
      
      expect(provider).toBe('twilio');
      
      // Clean up
      delete process.env.REACT_APP_TWILIO_ACCOUNT_SID;
    });
  });

  describe('DTMFKeypad SIP Integration', () => {
    const mockSipManager = {
      sendDTMF: jest.fn().mockReturnValue(true),
      getRegistrationStatus: jest.fn().mockReturnValue(true)
    };

    test('should render with SIP integration props', () => {
      render(
        <TestWrapper>
          <DTMFKeypad
            isVisible={true}
            isInCall={true}
            sipManager={mockSipManager}
            dtmfMethod="rfc4733"
            onKeyPress={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/RFC4733 Tones/)).toBeInTheDocument();
      expect(screen.getByText(/SIP Connected/)).toBeInTheDocument();
    });

    test('should send DTMF via SIP manager when key pressed', async () => {
      const mockKeyPress = jest.fn();
      
      render(
        <TestWrapper>
          <DTMFKeypad
            isVisible={true}
            isInCall={true}
            sipManager={mockSipManager}
            dtmfMethod="rfc4733"
            onKeyPress={mockKeyPress}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      const key1Button = screen.getByRole('button', { name: /Send DTMF tone: 1/ });
      fireEvent.click(key1Button);

      await waitFor(() => {
        expect(mockSipManager.sendDTMF).toHaveBeenCalledWith('1');
        expect(mockKeyPress).toHaveBeenCalledWith('1', expect.objectContaining({
          transmitted: true,
          method: 'rfc4733'
        }));
      });
    });

    test('should show SIP connection warning when disconnected', () => {
      const disconnectedSipManager = {
        ...mockSipManager,
        getRegistrationStatus: jest.fn().mockReturnValue(false)
      };

      render(
        <TestWrapper>
          <DTMFKeypad
            isVisible={true}
            isInCall={true}
            sipManager={disconnectedSipManager}
            dtmfMethod="rfc4733"
            onKeyPress={jest.fn()}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/SIP not connected/)).toBeInTheDocument();
    });

    test('should handle keyboard input for DTMF', async () => {
      const mockKeyPress = jest.fn();
      
      render(
        <TestWrapper>
          <DTMFKeypad
            isVisible={true}
            isInCall={true}
            sipManager={mockSipManager}
            dtmfMethod="info"
            onKeyPress={mockKeyPress}
            onClose={jest.fn()}
          />
        </TestWrapper>
      );

      // Simulate keyboard event
      fireEvent.keyDown(document, { key: '5' });

      await waitFor(() => {
        expect(mockSipManager.sendDTMF).toHaveBeenCalledWith('5');
        expect(mockKeyPress).toHaveBeenCalledWith('5', expect.objectContaining({
          transmitted: true,
          method: 'info'
        }));
      });
    });
  });

  describe('VOIPPhone SIP Provider Integration', () => {
    test('should initialize with SIP provider manager', () => {
      render(
        <TestWrapper>
          <VOIPPhone />
        </TestWrapper>
      );

      // Component should render without errors
      expect(screen.getByText(/VOIP Phone/)).toBeInTheDocument();
    });

    test('should handle DTMF key press with transmission info', async () => {
      render(
        <TestWrapper>
          <VOIPPhone />
        </TestWrapper>
      );

      // Get the DTMF button (this would open the keypad)
      const dtmfButton = screen.getByText(/DTMF Keypad/);
      expect(dtmfButton).toBeInTheDocument();
    });
  });

  describe('SIP Integration Error Handling', () => {
    test('should handle SIP configuration errors', () => {
      const providerManager = new SIPProviderManager();
      
      expect(() => {
        providerManager.configureProvider('nonexistent', {});
      }).toThrow('Unsupported SIP provider: nonexistent');
    });

    test('should handle DTMF transmission failures', () => {
      const sipManager = new SIPManager();
      sipManager.currentCall = {
        state: 'connected',
        dtmfHistory: []
      };

      // Mock transmission failure
      sipManager.transmitDTMFViaSIP = jest.fn().mockReturnValue(false);
      
      const result = sipManager.sendDTMF('1');
      
      expect(result).toBe(true); // Should still return true as it falls back
      expect(sipManager.currentCall.dtmfHistory[0].method).toBe('simulated');
    });

    test('should handle WebSocket connection test failure', async () => {
      const providerManager = new SIPProviderManager();
      
      // Mock WebSocket constructor to throw error
      global.WebSocket = jest.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      const result = await providerManager.testWebSocketConnection('wss://invalid.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });
});

describe('SIP Performance and Quality Tests', () => {
  test('should handle rapid DTMF key presses', () => {
    const sipManager = new SIPManager();
    sipManager.currentCall = {
      state: 'connected',
      dtmfHistory: []
    };

    // Simulate rapid key presses
    const keys = '1234567890*#';
    const startTime = Date.now();
    
    keys.split('').forEach(key => {
      sipManager.sendDTMF(key);
    });
    
    const endTime = Date.now();
    
    expect(sipManager.currentCall.dtmfHistory).toHaveLength(12);
    expect(endTime - startTime).toBeLessThan(100); // Should be very fast
  });

  test('should maintain DTMF history integrity', () => {
    const sipManager = new SIPManager();
    sipManager.currentCall = {
      state: 'connected',
      dtmfHistory: []
    };

    // Send various DTMF tones
    const testSequence = ['1', '2', '3', '*', '0', '#'];
    
    testSequence.forEach(tone => {
      sipManager.sendDTMF(tone);
    });

    const history = sipManager.currentCall.dtmfHistory;
    
    expect(history).toHaveLength(6);
    expect(history.every(entry => entry.timestamp instanceof Date)).toBe(true);
    expect(history.every(entry => typeof entry.tones === 'string')).toBe(true);
    expect(history.every(entry => entry.duration === 200)).toBe(true);
  });
});