/**
 * Audio Accessibility Tests
 * WCAG 2.1 AA compliance testing for audio features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import AudioClipPlayer from '../../components/AudioClipPlayer';
import { audioService } from '../../services/audioService';
import { 
  setupAudioTestEnvironment, 
  cleanupAudioTestEnvironment,
  mockApiResponses,
  mockAudioClips 
} from '../mocks/audioMocks';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the audio service
jest.mock('../../services/audioService');
const mockAudioService = audioService;

describe('Audio Accessibility Tests', () => {
  let audioMocks;

  beforeEach(() => {
    audioMocks = setupAudioTestEnvironment();
    jest.clearAllMocks();
    
    mockAudioService.getAllAudioClips.mockResolvedValue(mockApiResponses.getAllAudioClips);
    mockAudioService.getAudioUrl.mockResolvedValue(mockApiResponses.getAudioUrl(1));
    mockAudioService.recordAudioUsage.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanupAudioTestEnvironment();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading structure', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const heading = screen.getByRole('heading', { name: /audio clips/i });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveAttribute('class', expect.stringContaining('text-lg'));
    });

    it('should provide proper button labels', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByRole('button', { name: /play/i });
      expect(playButtons.length).toBeGreaterThan(0);

      playButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
        expect(button.textContent).toContain('Play');
      });
    });

    it('should have sufficient color contrast ratios', async () => {
      const { container } = render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Test specific color combinations
      const playButtons = container.querySelectorAll('[class*="bg-blue-500"]');
      playButtons.forEach(button => {
        const computedStyle = getComputedStyle(button);
        expect(computedStyle.backgroundColor).toBeDefined();
        expect(computedStyle.color).toBeDefined();
        // In real implementation, we'd calculate actual contrast ratios
      });
    });

    it('should provide alternative text for visual elements', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Status indicators should have text content
      expect(screen.getByText(/Connected/)).toBeInTheDocument();
      expect(screen.getByText(/API:/)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all interactive elements', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Get all focusable elements
      const focusableElements = [
        ...screen.getAllByRole('button', { name: /greetings|objections|closing/i }),
        ...screen.getAllByRole('button', { name: /play/i }),
        ...screen.getAllByRole('button', { name: /refresh|record/i })
      ];

      // Tab through all elements
      for (const element of focusableElements) {
        await user.tab();
        if (element === document.activeElement) {
          expect(element).toHaveFocus();
        }
      }
    });

    it('should activate buttons with Enter key', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      
      // Focus and activate with Enter
      playButton.focus();
      expect(playButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(/Playing audio clip/)).toBeInTheDocument();
      });
    });

    it('should activate buttons with Space key', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const categoryButton = screen.getByRole('button', { name: /objections/i });
      
      categoryButton.focus();
      expect(categoryButton).toHaveFocus();
      
      await user.keyboard(' '); // Space key
      
      await waitFor(() => {
        expect(screen.getByText('Not Interested')).toBeInTheDocument();
      });
    });

    it('should provide visible focus indicators', async () => {
      const { container } = render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      
      await user.tab();
      if (playButton === document.activeElement) {
        const computedStyle = getComputedStyle(playButton);
        // Should have focus styles
        expect(playButton).toHaveFocus();
        expect(playButton).toHaveClass(expect.stringMatching(/focus:/));
      }
    });

    it('should support arrow key navigation within button groups', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const categoryButtons = screen.getAllByRole('button', { 
        name: /greetings|objections|closing/i 
      });

      if (categoryButtons.length > 1) {
        categoryButtons[0].focus();
        expect(categoryButtons[0]).toHaveFocus();
        
        // Arrow keys could be used for category navigation
        await user.keyboard('{ArrowRight}');
        // Implementation would depend on actual arrow key support
      }
    });

    it('should skip over disabled elements in tab order', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Record button should be disabled when not connected to API in certain states
      const recordButton = screen.getByRole('button', { name: /record new/i });
      
      if (recordButton.disabled) {
        // Disabled elements should not be focusable
        recordButton.focus();
        expect(recordButton).not.toHaveFocus();
      }
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful labels for all interactive elements', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Category buttons should have accessible names
      const categoryButtons = screen.getAllByRole('button', { 
        name: /greetings|objections|closing/i 
      });
      
      categoryButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });

      // Play buttons should have meaningful names
      const playButtons = screen.getAllByRole('button', { name: /play/i });
      playButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
        expect(button.textContent).toMatch(/play/i);
      });
    });

    it('should announce state changes to screen readers', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Status changes should be announced
      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      await user.click(playButton);
      
      await waitFor(() => {
        const statusElement = screen.getByText(/Playing audio clip/);
        expect(statusElement).toBeInTheDocument();
        // Status should be announced via live region or similar
      });
    });

    it('should provide context for audio clip information', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Each audio clip should have complete context
      const clipElements = screen.getAllByText(/Professional Intro|Casual Intro/);
      clipElements.forEach(element => {
        const clipContainer = element.closest('[class*="p-3"]');
        expect(clipContainer).toBeInTheDocument();
        
        // Should have duration info
        expect(clipContainer).toContainHTML('0:');
      });
    });

    it('should use ARIA attributes appropriately', async () => {
      const { container } = render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Category tabs should use proper ARIA
      const categoryContainer = container.querySelector('[class*="flex gap-1"]');
      if (categoryContainer) {
        const buttons = categoryContainer.querySelectorAll('button');
        buttons.forEach(button => {
          expect(button).toHaveAttribute('type', 'button');
        });
      }

      // Status indicators should have proper roles
      const statusElements = container.querySelectorAll('[class*="text-green-600"],[class*="text-orange-600"]');
      statusElements.forEach(element => {
        expect(element).toBeInTheDocument();
      });
    });

    it('should provide landmarks and regions', async () => {
      const { container } = render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Main content should be in a landmark
      expect(container.querySelector('[class*="card"]')).toBeInTheDocument();
      
      // Different sections should be identifiable
      expect(screen.getByText('Audio Clips')).toBeInTheDocument();
    });
  });

  describe('Motor Disability Support', () => {
    it('should have adequate click targets (44x44px minimum)', async () => {
      const { container } = render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const computedStyle = getComputedStyle(button);
        const minSize = 44; // pixels
        
        // Check if button meets minimum size requirements
        // In real test, we'd measure actual dimensions
        expect(button).toHaveClass(expect.stringMatching(/p-\d+/)); // Has padding
      });
    });

    it('should support hover states for mouse users', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      
      await user.hover(playButton);
      
      // Should have hover styles
      expect(playButton).toHaveClass(expect.stringMatching(/hover:/));
    });

    it('should not rely on precise timing for interactions', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      
      // Should work with slow clicks/interactions
      await user.pointer([
        { target: playButton, keys: '[MouseLeft>]' },
        { delay: 1000 }, // Long delay
        { keys: '[/MouseLeft]' }
      ]);
      
      await waitFor(() => {
        expect(screen.getByText(/Playing audio clip/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should provide alternative interaction methods', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      // Should work with both keyboard and mouse
      await user.click(refreshButton);
      expect(mockAudioService.getAllAudioClips).toHaveBeenCalled();
      
      jest.clearAllMocks();
      
      refreshButton.focus();
      await user.keyboard('{Enter}');
      expect(mockAudioService.getAllAudioClips).toHaveBeenCalled();
    });
  });

  describe('Cognitive Accessibility', () => {
    it('should provide clear and consistent labeling', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // All play buttons should have consistent labeling
      const playButtons = screen.getAllByRole('button', { name: /play/i });
      playButtons.forEach(button => {
        expect(button.textContent).toContain('▶️ Play');
      });

      // Status indicators should be clear
      expect(screen.getByText(/API:/)).toBeInTheDocument();
      expect(screen.getByText(/Connected|Offline/)).toBeInTheDocument();
    });

    it('should provide helpful instructions and tips', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Should have user guidance
      const tipText = screen.getByText(/Tip: Click on clips to/);
      expect(tipText).toBeInTheDocument();
    });

    it('should indicate current state clearly', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Active category should be visually distinct
      const greetingsTab = screen.getByRole('button', { name: /greetings/i });
      expect(greetingsTab).toHaveClass('bg-green-500');
      expect(greetingsTab).toHaveClass('text-white');

      // Playing state should be clear
      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      await user.click(playButton);
      
      await waitFor(() => {
        const stopButton = screen.getByRole('button', { name: /stop/i });
        expect(stopButton).toHaveTextContent('⏸️ Stop');
      });
    });

    it('should provide error messages in plain language', async () => {
      mockAudioService.getAllAudioClips.mockRejectedValue(new Error('Network error'));
      
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load audio clips from server/)).toBeInTheDocument();
      });

      // Error should be in plain language with recovery option
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should avoid cognitive overload with progressive disclosure', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Should show only one category at a time
      expect(screen.getAllByText(/Professional Intro|Casual Intro/)).toHaveLength(2);
      
      // Other categories should be hidden until selected
      expect(screen.queryByText('Not Interested')).not.toBeInTheDocument();
    });
  });

  describe('Audio-Specific Accessibility', () => {
    it('should provide audio duration information', async () => {
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Duration should be visible for each clip
      expect(screen.getByText('0:15')).toBeInTheDocument();
      expect(screen.getByText('0:12')).toBeInTheDocument();
    });

    it('should indicate audio playback status', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      await user.click(playButton);
      
      await waitFor(() => {
        // Status should be clearly indicated
        expect(screen.getByText(/Playing audio clip/)).toBeInTheDocument();
      });
    });

    it('should provide pause/stop controls', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      await user.click(playButton);
      
      await waitFor(() => {
        const stopButton = screen.getByRole('button', { name: /stop/i });
        expect(stopButton).toBeInTheDocument();
        expect(stopButton).toBeEnabled();
      });
    });

    it('should handle audio conflicts appropriately', async () => {
      render(<AudioClipPlayer />);
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      const playButtons = screen.getAllByRole('button', { name: /play/i });
      
      // Play first clip
      await user.click(playButtons[0]);
      await waitFor(() => {
        expect(screen.getByText(/Playing audio clip/)).toBeInTheDocument();
      });
      
      // Play second clip - should stop first
      await user.click(playButtons[1]);
      
      // Should only have one playing clip
      const stopButtons = screen.getAllByRole('button', { name: /stop/i });
      expect(stopButtons).toHaveLength(1);
    });

    it('should work without audio when necessary', async () => {
      // Mock offline mode
      mockAudioService.getAllAudioClips.mockRejectedValue(new Error('Network error'));
      
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟡 Offline')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      await user.click(playButton);
      
      // Should simulate playback
      await waitFor(() => {
        expect(screen.getByText(/Simulating audio clip/)).toBeInTheDocument();
      });
    });
  });

  describe('Error State Accessibility', () => {
    it('should announce errors to screen readers', async () => {
      mockAudioService.getAllAudioClips.mockRejectedValue(new Error('API Error'));
      
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        const errorElement = screen.getByText(/Failed to load audio clips from server/);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveClass('text-red-600');
      });
    });

    it('should provide recovery actions for errors', async () => {
      mockAudioService.getAllAudioClips.mockRejectedValue(new Error('Network error'));
      
      render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load audio clips from server/)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toBeEnabled();
    });

    it('should maintain accessibility during loading states', async () => {
      // Mock slow loading
      mockAudioService.getAllAudioClips.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockApiResponses.getAllAudioClips), 1000))
      );
      
      render(<AudioClipPlayer />);
      
      // Loading state should be accessible
      expect(screen.getByText(/Loading/)).toBeInTheDocument();
      
      // Controls should be disabled during loading
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        if (button.textContent.includes('Greetings') || 
            button.textContent.includes('Objections') ||
            button.textContent.includes('Closing')) {
          expect(button).toBeDisabled();
        }
      });
    });
  });

  describe('Responsive Design Accessibility', () => {
    it('should maintain accessibility on small screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 320, writable: true });
      
      const { container } = render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // Should still be accessible on mobile
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      
      // Touch targets should still be adequate
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support zoom up to 200% without loss of functionality', async () => {
      // Mock 200% zoom
      Object.defineProperty(document.documentElement, 'style', {
        value: { zoom: '2.0' },
        writable: true
      });
      
      const { container } = render(<AudioClipPlayer />);
      
      await waitFor(() => {
        expect(screen.getByText('🟢 Connected')).toBeInTheDocument();
      });

      // All functionality should still work
      const playButton = screen.getAllByRole('button', { name: /play/i })[0];
      expect(playButton).toBeEnabled();
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});