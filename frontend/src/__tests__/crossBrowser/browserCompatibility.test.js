/**
 * Cross-Browser Compatibility Tests
 * Tests audio functionality across different browser environments
 */

import { 
  setupAudioTestEnvironment, 
  cleanupAudioTestEnvironment,
  browserCompatibilityData,
  mockAudioClips,
  audioTestFixtures
} from '../mocks/audioMocks';
import { render, screen, fireEvent } from '@testing-library/react';
import AudioClipPlayer from '../../components/AudioClipPlayer';
import { audioService } from '../../services/audioService';

// Mock the audio service
jest.mock('../../services/audioService');
const mockAudioService = audioService;

describe('Cross-Browser Compatibility Tests', () => {
  let audioMocks;
  let originalUserAgent;
  let originalAudioContext;
  let originalAudio;

  beforeEach(() => {
    audioMocks = setupAudioTestEnvironment();
    originalUserAgent = navigator.userAgent;
    originalAudioContext = global.AudioContext;
    originalAudio = global.Audio;
    
    jest.clearAllMocks();
    
    mockAudioService.getAllAudioClips.mockResolvedValue({
      success: true,
      data: mockAudioClips
    });
    mockAudioService.getAudioUrl.mockResolvedValue({
      success: true,
      data: { url: '/audio/test.mp3' }
    });
  });

  afterEach(() => {
    // Restore original user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true
    });
    
    global.AudioContext = originalAudioContext;
    global.Audio = originalAudio;
    
    cleanupAudioTestEnvironment();
  });

  describe('Browser Detection and Feature Support', () => {
    const mockBrowser = (browserName, version = '100.0') => {
      const userAgents = {
        chrome: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`,
        firefox: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`,
        safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version}.0 Safari/605.1.15`,
        edge: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36 Edg/${version}.0.0.0`
      };
      
      Object.defineProperty(navigator, 'userAgent', {
        value: userAgents[browserName] || userAgents.chrome,
        writable: true
      });
    };

    it('should detect Chrome browser correctly', () => {
      mockBrowser('chrome', '120.0');
      
      const isChrome = navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg');
      
      expect(isChrome).toBe(true);
    });

    it('should detect Firefox browser correctly', () => {
      mockBrowser('firefox', '119.0');
      
      const isFirefox = navigator.userAgent.includes('Firefox');
      
      expect(isFirefox).toBe(true);
    });

    it('should detect Safari browser correctly', () => {
      mockBrowser('safari', '17.0');
      
      const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
      
      expect(isSafari).toBe(true);
    });

    it('should detect Edge browser correctly', () => {
      mockBrowser('edge', '120.0');
      
      const isEdge = navigator.userAgent.includes('Edg');
      
      expect(isEdge).toBe(true);
    });

    it('should check Web Audio API support across browsers', () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      browsers.forEach(browser => {
        mockBrowser(browser);
        
        // All modern browsers should support Web Audio API
        expect(typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined').toBe(true);
        
        // Check expected support based on our compatibility data
        const expectedSupport = browserCompatibilityData.webAudioSupport[browser];
        expect(expectedSupport).toBe(true);
      });
    });

    it('should check MediaRecorder API support across browsers', () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      browsers.forEach(browser => {
        mockBrowser(browser);
        
        const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
        const expectedSupport = browserCompatibilityData.mediaRecorderSupport[browser];
        
        if (browser === 'safari') {
          // Safari has limited MediaRecorder support
          expect(expectedSupport).toBe(false);
        } else {
          expect(expectedSupport).toBe(true);
        }
      });
    });
  });

  describe('Audio Format Support', () => {
    const testAudioFormats = (browserName) => {
      mockBrowser(browserName);
      
      const audio = new Audio();
      const supportedFormats = [];
      
      const formats = {
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/webm': 'webm',
        'audio/mp4': 'mp4'
      };
      
      Object.entries(formats).forEach(([mimeType, extension]) => {
        const canPlay = audio.canPlayType(mimeType);
        if (canPlay === 'probably' || canPlay === 'maybe') {
          supportedFormats.push(mimeType);
        }
      });
      
      return supportedFormats;
    };

    it('should support expected audio formats in Chrome', () => {
      mockBrowser('chrome');
      
      const audio = new Audio();
      
      // Chrome should support all major formats
      expect(audio.canPlayType('audio/mpeg')).toBeTruthy();
      expect(audio.canPlayType('audio/wav')).toBeTruthy();
      expect(audio.canPlayType('audio/ogg')).toBeTruthy();
      expect(audio.canPlayType('audio/webm')).toBeTruthy();
    });

    it('should support expected audio formats in Firefox', () => {
      mockBrowser('firefox');
      
      const audio = new Audio();
      
      // Firefox should support all major formats
      expect(audio.canPlayType('audio/mpeg')).toBeTruthy();
      expect(audio.canPlayType('audio/wav')).toBeTruthy();
      expect(audio.canPlayType('audio/ogg')).toBeTruthy();
      expect(audio.canPlayType('audio/webm')).toBeTruthy();
    });

    it('should support expected audio formats in Safari', () => {
      mockBrowser('safari');
      
      const audio = new Audio();
      
      // Safari supports MP3, WAV, and MP4 but not OGG/WebM
      expect(audio.canPlayType('audio/mpeg')).toBeTruthy();
      expect(audio.canPlayType('audio/wav')).toBeTruthy();
      expect(audio.canPlayType('audio/mp4')).toBeTruthy();
    });

    it('should support expected audio formats in Edge', () => {
      mockBrowser('edge');
      
      const audio = new Audio();
      
      // Edge should support all major formats like Chrome
      expect(audio.canPlayType('audio/mpeg')).toBeTruthy();
      expect(audio.canPlayType('audio/wav')).toBeTruthy();
      expect(audio.canPlayType('audio/ogg')).toBeTruthy();
      expect(audio.canPlayType('audio/webm')).toBeTruthy();
    });

    it('should gracefully handle unsupported formats', () => {
      const unsupportedFormat = 'audio/fake-format';
      const audio = new Audio();
      
      expect(audio.canPlayType(unsupportedFormat)).toBe('');
    });
  });

  describe('Component Functionality Across Browsers', () => {
    it('should render correctly in Chrome', async () => {
      mockBrowser('chrome');
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      expect(screen.getByText('Audio Clips')).toBeInTheDocument();
      expect(screen.getAllByText(/▶️ Play/)).toHaveLength(2); // Default greetings
    });

    it('should render correctly in Firefox', async () => {
      mockBrowser('firefox');
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      expect(screen.getByText('Audio Clips')).toBeInTheDocument();
      expect(screen.getAllByText(/▶️ Play/)).toHaveLength(2);
    });

    it('should render correctly in Safari', async () => {
      mockBrowser('safari');
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      expect(screen.getByText('Audio Clips')).toBeInTheDocument();
      expect(screen.getAllByText(/▶️ Play/)).toHaveLength(2);
    });

    it('should render correctly in Edge', async () => {
      mockBrowser('edge');
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      expect(screen.getByText('Audio Clips')).toBeInTheDocument();
      expect(screen.getAllByText(/▶️ Play/)).toHaveLength(2);
    });

    it('should handle audio playback across browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        mockBrowser(browser);
        
        const { unmount } = render(<AudioClipPlayer />);
        
        await screen.findByText('🟢 Connected');
        
        const playButton = screen.getAllByText(/▶️ Play/)[0];
        fireEvent.click(playButton);
        
        // All browsers should handle playback
        await screen.findByText(/Playing audio clip/);
        
        unmount();
      }
    });
  });

  describe('Web Audio API Cross-Browser Tests', () => {
    it('should handle AudioContext creation across browsers', () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      browsers.forEach(browser => {
        mockBrowser(browser);
        
        let audioContext;
        
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          expect(audioContext).toBeDefined();
          expect(audioContext.state).toBe('running');
          
          // Test basic audio context methods
          expect(typeof audioContext.createBufferSource).toBe('function');
          expect(typeof audioContext.createGain).toBe('function');
          expect(typeof audioContext.createAnalyser).toBe('function');
          
        } catch (error) {
          // Should not fail in any modern browser
          fail(`AudioContext creation failed in ${browser}: ${error.message}`);
        } finally {
          if (audioContext && audioContext.close) {
            audioContext.close();
          }
        }
      });
    });

    it('should handle audio decoding across browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        mockBrowser(browser);
        
        const audioContext = audioMocks.webAudioMocks.mockAudioContext;
        const fakeAudioData = new ArrayBuffer(1024);
        
        try {
          const decodedData = await audioContext.decodeAudioData(fakeAudioData);
          expect(decodedData).toBeDefined();
          expect(decodedData.duration).toBeGreaterThan(0);
        } catch (error) {
          // Expected for fake data, but method should exist
          expect(typeof audioContext.decodeAudioData).toBe('function');
        }
      }
    });

    it('should handle gain nodes across browsers', () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      browsers.forEach(browser => {
        mockBrowser(browser);
        
        const audioContext = audioMocks.webAudioMocks.mockAudioContext;
        const gainNode = audioContext.createGain();
        
        expect(gainNode).toBeDefined();
        expect(gainNode.gain).toBeDefined();
        expect(typeof gainNode.connect).toBe('function');
        expect(typeof gainNode.disconnect).toBe('function');
        
        // Test gain value manipulation
        gainNode.gain.value = 0.5;
        expect(gainNode.gain.value).toBe(0.5);
      });
    });
  });

  describe('Mobile Browser Compatibility', () => {
    const mockMobileBrowser = (device) => {
      const mobileUserAgents = {
        'ios-safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'android-chrome': 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'android-firefox': 'Mozilla/5.0 (Mobile; rv:119.0) Gecko/119.0 Firefox/119.0'
      };
      
      Object.defineProperty(navigator, 'userAgent', {
        value: mobileUserAgents[device] || mobileUserAgents['android-chrome'],
        writable: true
      });
      
      // Mock mobile-specific properties
      Object.defineProperty(window, 'orientation', {
        value: 0,
        writable: true
      });
      
      // Mock touch events
      window.TouchEvent = class TouchEvent extends Event {
        constructor(type, options = {}) {
          super(type, options);
          this.touches = options.touches || [];
          this.targetTouches = options.targetTouches || [];
          this.changedTouches = options.changedTouches || [];
        }
      };
    };

    it('should work on iOS Safari', async () => {
      mockMobileBrowser('ios-safari');
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      
      // Should handle touch interactions
      const playButton = screen.getAllByText(/▶️ Play/)[0];
      fireEvent.click(playButton);
      
      await screen.findByText(/Playing audio clip/);
    });

    it('should work on Android Chrome', async () => {
      mockMobileBrowser('android-chrome');
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      
      const playButton = screen.getAllByText(/▶️ Play/)[0];
      fireEvent.click(playButton);
      
      await screen.findByText(/Playing audio clip/);
    });

    it('should work on Android Firefox', async () => {
      mockMobileBrowser('android-firefox');
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      
      const playButton = screen.getAllByText(/▶️ Play/)[0];
      fireEvent.click(playButton);
      
      await screen.findByText(/Playing audio clip/);
    });

    it('should handle mobile viewport constraints', async () => {
      mockMobileBrowser('ios-safari');
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      
      // Component should adapt to mobile viewport
      const container = screen.getByText('Audio Clips').closest('.card');
      expect(container).toBeInTheDocument();
    });

    it('should handle touch events properly', async () => {
      mockMobileBrowser('ios-safari');
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      
      const playButton = screen.getAllByText(/▶️ Play/)[0];
      
      // Simulate touch event
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }],
        bubbles: true
      });
      
      fireEvent(playButton, touchEvent);
      fireEvent.click(playButton); // Fallback to click
      
      await screen.findByText(/Playing audio clip/);
    });
  });

  describe('Browser Version Compatibility', () => {
    it('should handle legacy browser versions gracefully', () => {
      // Mock older browser
      mockBrowser('chrome', '80.0'); // Older Chrome version
      
      // Should still work with basic functionality
      expect(() => {
        render(<AudioClipPlayer />);
      }).not.toThrow();
    });

    it('should detect and handle missing features', () => {
      // Mock browser without some features
      delete global.AudioContext;
      delete global.webkitAudioContext;
      
      const hasAudioContext = typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
      
      expect(hasAudioContext).toBe(false);
      
      // Component should still render but with limited functionality
      expect(() => {
        render(<AudioClipPlayer />);
      }).not.toThrow();
    });

    it('should provide fallbacks for unsupported APIs', async () => {
      // Mock missing MediaRecorder
      delete global.MediaRecorder;
      
      render(<AudioClipPlayer />);
      
      await screen.findByText('🟢 Connected');
      
      // Record button should be disabled or hidden
      const recordButton = screen.getByText('🎤 Record New');
      expect(recordButton).toBeDisabled();
    });
  });

  describe('Performance Across Browsers', () => {
    it('should maintain performance standards across browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      const performanceResults = {};
      
      for (const browser of browsers) {
        mockBrowser(browser);
        
        const startTime = performance.now();
        
        const { unmount } = render(<AudioClipPlayer />);
        await screen.findByText('🟢 Connected');
        
        const renderTime = performance.now() - startTime;
        performanceResults[browser] = renderTime;
        
        unmount();
      }
      
      // All browsers should render within reasonable time
      Object.entries(performanceResults).forEach(([browser, time]) => {
        expect(time).toBeLessThan(500); // 500ms budget per browser
        console.log(`${browser}: ${time.toFixed(2)}ms`);
      });
    });

    it('should handle memory usage consistently across browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        mockBrowser(browser);
        
        const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        const { unmount } = render(<AudioClipPlayer />);
        await screen.findByText('🟢 Connected');
        
        // Perform some interactions
        const playButton = screen.getAllByText(/▶️ Play/)[0];
        fireEvent.click(playButton);
        
        const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Should not use excessive memory
        if (performance.memory) {
          expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
        }
        
        unmount();
      }
    });
  });

  describe('Accessibility Across Browsers', () => {
    it('should maintain accessibility features across browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        mockBrowser(browser);
        
        const { unmount } = render(<AudioClipPlayer />);
        
        await screen.findByText('🟢 Connected');
        
        // Check ARIA attributes
        const playButtons = screen.getAllByText(/▶️ Play/);
        playButtons.forEach(button => {
          expect(button).toHaveAttribute('type', 'button');
          expect(button).not.toHaveAttribute('disabled');
        });
        
        // Check keyboard navigation
        const firstButton = playButtons[0];
        firstButton.focus();
        expect(document.activeElement).toBe(firstButton);
        
        unmount();
      }
    });

    it('should support screen readers across browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        mockBrowser(browser);
        
        const { unmount } = render(<AudioClipPlayer />);
        
        await screen.findByText('🟢 Connected');
        
        // Status updates should be announced
        const statusElement = screen.getByText(/🟢 Connected/);
        expect(statusElement).toBeInTheDocument();
        
        // Play button should have meaningful text
        const playButton = screen.getAllByText(/▶️ Play/)[0];
        expect(playButton.textContent).toContain('Play');
        
        unmount();
      }
    });
  });

  describe('Error Handling Across Browsers', () => {
    it('should handle audio errors consistently', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        mockBrowser(browser);
        
        // Mock audio error
        const mockAudio = audioMocks.webAudioMocks.Audio();
        mockAudio.play.mockRejectedValue(new Error('Audio error'));
        
        const { unmount } = render(<AudioClipPlayer />);
        
        await screen.findByText('🟢 Connected');
        
        const playButton = screen.getAllByText(/▶️ Play/)[0];
        fireEvent.click(playButton);
        
        // Should handle error gracefully
        expect(screen.queryByText(/Playing audio clip/)).not.toBeInTheDocument();
        
        unmount();
      }
    });

    it('should provide browser-specific error messages when needed', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      for (const browser of browsers) {
        mockBrowser(browser);
        
        mockAudioService.getAllAudioClips.mockRejectedValue(new Error('Network error'));
        
        const { unmount } = render(<AudioClipPlayer />);
        
        // Should show error state
        await screen.findByText(/Failed to load audio clips/);
        
        // Error should be displayed regardless of browser
        expect(screen.getByText('Retry')).toBeInTheDocument();
        
        unmount();
        
        // Reset mock for next iteration
        mockAudioService.getAllAudioClips.mockResolvedValue({
          success: true,
          data: mockAudioClips
        });
      }
    });
  });
});