import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioClipPlayer from '../AudioClipPlayer';

describe('AudioClipPlayer Component', () => {
  test('renders audio clip player with all elements', () => {
    render(<AudioClipPlayer />);
    
    // Check title
    expect(screen.getByText('Audio Clips')).toBeInTheDocument();
    
    // Check category tabs
    expect(screen.getByText('Greetings')).toBeInTheDocument();
    expect(screen.getByText('Objections')).toBeInTheDocument();
    expect(screen.getByText('Closing')).toBeInTheDocument();
    
    // Check default clips are shown (greetings)
    expect(screen.getByText('Professional Intro')).toBeInTheDocument();
    expect(screen.getByText('Casual Intro')).toBeInTheDocument();
    expect(screen.getByText('Executive Intro')).toBeInTheDocument();
    
    // Check tip text
    expect(screen.getByText(/Click on clips to play during your call/i)).toBeInTheDocument();
  });

  test('switching categories shows different clips', async () => {
    render(<AudioClipPlayer />);
    const user = userEvent.setup();
    
    // Initially shows greetings
    expect(screen.getByText('Professional Intro')).toBeInTheDocument();
    
    // Click on Objections tab
    await user.click(screen.getByText('Objections'));
    
    // Should show objection clips
    expect(screen.getByText('Not Interested')).toBeInTheDocument();
    expect(screen.getByText('Too Busy')).toBeInTheDocument();
    expect(screen.getByText('Send Email')).toBeInTheDocument();
    
    // Professional Intro should not be visible
    expect(screen.queryByText('Professional Intro')).not.toBeInTheDocument();
  });

  test('active category tab is highlighted', async () => {
    render(<AudioClipPlayer />);
    const user = userEvent.setup();
    
    // Initially, greetings tab should be active
    const greetingsTab = screen.getByText('Greetings');
    expect(greetingsTab).toHaveClass('bg-green-500');
    expect(greetingsTab).toHaveClass('text-white');
    
    // Click on Closing tab
    await user.click(screen.getByText('Closing'));
    
    // Check that Closing tab is now active (has green background and white text)
    const closingTab = screen.getByText('Closing');
    expect(closingTab).toHaveClass('bg-green-500');
    expect(closingTab).toHaveClass('text-white');
    
    // Greetings tab should no longer be active
    expect(greetingsTab).toHaveClass('bg-transparent');
    expect(greetingsTab).toHaveClass('text-gray-600');
  });

  test('clicking play button starts playing clip', async () => {
    render(<AudioClipPlayer />);
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Find the first play button
    const playButtons = screen.getAllByText(/▶️ Play/i);
    await user.click(playButtons[0]);
    
    // Check console log
    expect(consoleSpy).toHaveBeenCalledWith('Playing:', 'Professional Intro');
    
    // Button should change to pause
    expect(screen.getByText(/⏸️ Pause/i)).toBeInTheDocument();
    
    // Status should show
    expect(screen.getByText(/Playing audio clip/i)).toBeInTheDocument();
  });

  test('clicking pause stops the clip', async () => {
    render(<AudioClipPlayer />);
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Start playing a clip
    const playButtons = screen.getAllByText(/▶️ Play/i);
    await user.click(playButtons[0]);
    
    // Click pause
    const pauseButton = screen.getByText(/⏸️ Pause/i);
    await user.click(pauseButton);
    
    // Check console log
    expect(consoleSpy).toHaveBeenCalledWith('Stopping:', 'Professional Intro');
    
    // Button should return to play
    expect(screen.queryByText(/⏸️ Pause/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/▶️ Play/i)).toHaveLength(3);
  });

  test('playing a new clip stops the previous one', async () => {
    render(<AudioClipPlayer />);
    const user = userEvent.setup();
    
    // Play first clip
    const playButtons = screen.getAllByText(/▶️ Play/i);
    await user.click(playButtons[0]);
    
    // Should have one pause button
    expect(screen.getAllByText(/⏸️ Pause/i)).toHaveLength(1);
    
    // Play second clip
    const newPlayButtons = screen.getAllByText(/▶️ Play/i);
    await user.click(newPlayButtons[0]); // Click the first available play button
    
    // Should still have only one pause button
    expect(screen.getAllByText(/⏸️ Pause/i)).toHaveLength(1);
  });

  test('clip auto-stops after timeout', async () => {
    jest.useFakeTimers();
    render(<AudioClipPlayer />);
    const user = userEvent.setup();
    
    // Play a clip
    const playButtons = screen.getAllByText(/▶️ Play/i);
    fireEvent.click(playButtons[0]); // Use fireEvent for timer tests
    
    // Status should show
    expect(screen.getByText(/Playing audio clip/i)).toBeInTheDocument();
    
    // Fast-forward time by 3 seconds
    jest.advanceTimersByTime(3000);
    
    // Wait for state update
    await waitFor(() => {
      expect(screen.queryByText(/Playing audio clip/i)).not.toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  test('displays clip duration', () => {
    render(<AudioClipPlayer />);
    
    // Check that durations are displayed
    expect(screen.getByText('0:15')).toBeInTheDocument();
    expect(screen.getByText('0:12')).toBeInTheDocument();
    expect(screen.getByText('0:18')).toBeInTheDocument();
  });

  test('all three categories have clips', async () => {
    render(<AudioClipPlayer />);
    const user = userEvent.setup();
    
    // Check Greetings - filter to only button elements with Play text
    const greetingButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Play'));
    expect(greetingButtons).toHaveLength(3);
    
    // Check Objections
    await user.click(screen.getByText('Objections'));
    const objectionButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Play'));
    expect(objectionButtons).toHaveLength(3);
    
    // Check Closing
    await user.click(screen.getByText('Closing'));
    const closingButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Play'));
    expect(closingButtons).toHaveLength(3);
  });

  test('clips container is scrollable', () => {
    render(<AudioClipPlayer />);
    
    // Find the clips container - it should have the Tailwind classes for scrollability
    const clipItems = screen.getAllByText(/Play/i)[0].closest('div').parentElement;
    
    // Check that it has the proper Tailwind classes for scrolling
    expect(clipItems).toHaveClass('max-h-80');
    expect(clipItems).toHaveClass('overflow-y-auto');
  });
});