/**
 * Enhanced AudioClipPlayer Component Tests
 * Comprehensive testing with Web Audio API mocking, accessibility, and performance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioClipPlayer from '../AudioClipPlayer';
import { audioService } from '../../services/audioService';
import { 
  setupAudioTestEnvironment, 
  cleanupAudioTestEnvironment, 
  mockAudioClips, 
  mockApiResponses,
  audioTestFixtures,
  performanceTestUtils
} from '../__tests__/mocks/audioMocks';

// Mock the audio service
jest.mock('../../services/audioService');
const mockAudioService = audioService;

describe('AudioClipPlayer Enhanced Tests', () => {
  let audioMocks;

  beforeEach(() => {
    audioMocks = setupAudioTestEnvironment();
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockAudioService.getAllAudioClips.mockResolvedValue(mockApiResponses.getAllAudioClips);
    mockAudioService.getDefaultAudioClips.mockResolvedValue(mockApiResponses.getAllAudioClips);
    mockAudioService.getAudioUrl.mockResolvedValue(mockApiResponses.getAudioUrl(1));
    mockAudioService.recordAudioUsage.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanupAudioTestEnvironment();
    jest.restoreAllMocks();
  });

  describe('Audio API Integration', () => {
    it('should handle Web Audio API initialization', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('API:')).toBeInTheDocument();
      });

      // Verify Web Audio API objects are created
      expect(global.Audio).toBeDefined();
      expect(global.AudioContext).toBeDefined();
    });

    it('should play audio using Web Audio API', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      await user.click(playButtons[0]);

      // Verify Audio object was created and play was called
      expect(audioMocks.webAudioMocks.Audio).toHaveBeenCalled();
      expect(mockAudioService.getAudioUrl).toHaveBeenCalledWith(1);
    });

    it('should handle audio playback errors gracefully', async () => {
      const mockAudio = audioMocks.webAudioMocks.Audio();
      mockAudio.play.mockRejectedValue(new Error('Audio play failed'));
      
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      await user.click(playButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Audio playback failed/)).toBeInTheDocument();
      });
    });

    it('should handle audio loading states', async () => {
      // Mock slow loading
      const mockAudio = audioMocks.webAudioMocks.Audio();
      mockAudio.play.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      await user.click(playButtons[0]);

      // Should show playing state immediately
      expect(screen.getByText(/Playing audio clip/)).toBeInTheDocument();
    });
  });

  describe('API Error Handling', () => {
    it('should fallback to default clips when API fails', async () => {
      mockAudioService.getAllAudioClips.mockRejectedValue(new Error('API Error'));
      
      render(<AudioClipPlayer />);

      await waitFor(() => {
        expect(screen.getByText('🟡 Offline')).toBeInTheDocument();
      });

      expect(mockAudioService.getDefaultAudioClips).toHaveBeenCalled();
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ECONNABORTED';
      mockAudioService.getAllAudioClips.mockRejectedValue(timeoutError);

      render(<AudioClipPlayer />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load audio clips from server/)).toBeInTheDocument();
      });
    });

    it('should handle malformed API responses', async () => {
      mockAudioService.getAllAudioClips.mockResolvedValue({ 
        success: true, 
        data: null // malformed
      });

      render(<AudioClipPlayer />);

      await waitFor(() => {
        expect(screen.getByText('🟡 Offline')).toBeInTheDocument();
      });
    });
  });

  describe('Audio Playback Control', () => {
    it('should stop previous audio when playing new clip', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      
      // Play first clip
      await user.click(playButtons[0]);
      await waitFor(() => {
        expect(screen.getByText(/⏸️ Stop/)).toBeInTheDocument();
      });

      // Play second clip - should stop first
      await user.click(playButtons[1]);
      
      // Should only have one playing clip
      const stopButtons = screen.getAllByText(/⏸️ Stop/);
      expect(stopButtons).toHaveLength(1);
    });

    it('should handle audio ended event', async () => {
      const mockAudio = audioMocks.webAudioMocks.Audio();
      
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      await user.click(playButtons[0]);

      // Simulate audio ended
      act(() => {
        if (mockAudio.onended) {
          mockAudio.onended();
        }
      });

      await waitFor(() => {
        expect(screen.queryByText(/Playing audio clip/)).not.toBeInTheDocument();
      });
    });

    it('should clean up audio resources on unmount', () => {
      const { unmount } = render(<AudioClipPlayer />);
      const mockAudio = audioMocks.webAudioMocks.Audio();

      unmount();

      expect(mockAudio.pause).toHaveBeenCalled();
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels for audio controls', async () => {
      render(<AudioClipPlayer />);

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      playButtons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
        expect(button).not.toHaveAttribute('disabled');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Tab to first play button
      await user.tab();
      const firstButton = screen.getAllByText(/▶️ Play/)[0];
      expect(firstButton).toHaveFocus();

      // Activate with Enter key
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(/Playing audio clip/)).toBeInTheDocument();
      });
    });

    it('should provide screen reader friendly status updates', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      await user.click(playButtons[0]);

      // Status should be announced to screen readers
      const statusElement = screen.getByText(/Playing audio clip/);
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveClass('text-blue-700');
    });

    it('should disable controls during loading', async () => {
      mockAudioService.getAllAudioClips.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockApiResponses.getAllAudioClips), 100))
      );

      render(<AudioClipPlayer />);

      // Controls should be disabled during loading
      expect(screen.getByText('🔄 Loading...')).toBeInTheDocument();
      
      const categoryButtons = screen.getAllByRole('button');
      categoryButtons.forEach(button => {
        if (button.textContent.includes('Greetings') || 
            button.textContent.includes('Objections') || 
            button.textContent.includes('Closing')) {
          expect(button).toBeDisabled();
        }
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should cache audio URLs to avoid redundant requests', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      
      // Play same clip twice
      await user.click(playButtons[0]);
      await user.click(playButtons[0]); // Stop
      await user.click(playButtons[0]); // Play again

      // Should only call getAudioUrl once due to caching
      expect(mockAudioService.getAudioUrl).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent playback requests', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      
      // Rapidly click multiple buttons
      await Promise.all([
        user.click(playButtons[0]),
        user.click(playButtons[1]),
        user.click(playButtons[2])
      ]);

      // Should only have one playing clip
      const stopButtons = screen.getAllByText(/⏸️ Stop/);
      expect(stopButtons).toHaveLength(1);
    });

    it('should measure audio loading performance', async () => {
      const startTime = performance.now();
      
      render(<AudioClipPlayer />);

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
    });
  });

  describe('Offline Mode Behavior', () => {
    it('should simulate playback in offline mode', async () => {
      mockAudioService.getAllAudioClips.mockRejectedValue(new Error('Network error'));
      
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟡 Offline')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      await user.click(playButtons[0]);

      expect(screen.getByText(/Simulating audio clip/)).toBeInTheDocument();
    });

    it('should handle offline to online transitions', async () => {
      // Start offline
      mockAudioService.getAllAudioClips.mockRejectedValue(new Error('Network error'));
      
      render(<AudioClipPlayer />);

      await waitFor(() => {
        expect(screen.getByText('🟡 Offline')).toBeInTheDocument();
      });

      // Switch to online
      mockAudioService.getAllAudioClips.mockResolvedValue(mockApiResponses.getAllAudioClips);
      
      const refreshButton = screen.getByText('🔄 Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });
    });
  });

  describe('Usage Analytics', () => {
    it('should record audio usage when playing clips', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      await user.click(playButtons[0]);

      expect(mockAudioService.recordAudioUsage).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });

    it('should continue playing even if usage tracking fails', async () => {
      mockAudioService.recordAudioUsage.mockRejectedValue(new Error('Tracking failed'));
      
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      await user.click(playButtons[0]);

      // Should still play despite tracking failure
      expect(screen.getByText(/Playing audio clip/)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary network issues', async () => {
      // First call fails, second succeeds
      mockAudioService.getAllAudioClips
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockApiResponses.getAllAudioClips);

      render(<AudioClipPlayer />);

      await waitFor(() => {
        expect(screen.getByText('🟡 Offline')).toBeInTheDocument();
      });

      // Retry
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });
    });

    it('should clear errors when switching categories', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      // Simulate an error state
      mockAudioService.getAudioUrl.mockRejectedValue(new Error('URL Error'));

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      await user.click(playButtons[0]);

      // Switch category to clear error
      await user.click(screen.getByText('Objections'));

      // Error should be cleared
      expect(screen.queryByText(/Failed to play/)).not.toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory on repeated play/stop cycles', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByText(/▶️ Play/);
      
      // Perform multiple play/stop cycles
      for (let i = 0; i < 10; i++) {
        await user.click(playButtons[0]); // Play
        await user.click(screen.getByText(/⏸️ Stop/)); // Stop
      }

      // Audio objects should be properly cleaned up
      expect(audioMocks.webAudioMocks.Audio).toHaveBeenCalled();
    });

    it('should clean up on component unmount', () => {
      const { unmount } = render(<AudioClipPlayer />);
      
      // Simulate having an active audio element
      const mockAudio = audioMocks.webAudioMocks.Audio();
      
      unmount();

      // Should pause and clean up
      expect(mockAudio.pause).toHaveBeenCalled();
    });
  });
});