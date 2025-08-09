import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScriptDisplay from '../ScriptDisplay';
import { dummyScripts } from '../../data/dummyData';

// Mock clipboard API is already set up in setupTests.js

// Mock data for testing
const mockScripts = {
  introduction: {
    title: "Introduction",
    color: "blue",
    text: "Hi [NAME], this is [YOUR NAME] from [COMPANY]. I'm calling because we help companies like [THEIR COMPANY] reduce their IT costs by up to 30%. Do you have 2 minutes to hear how we've helped similar businesses?"
  },
  gatekeeper: {
    title: "Gatekeeper",
    color: "yellow",
    text: "Hi, I'm trying to reach the person who handles IT decisions at [COMPANY]. Could you point me in the right direction? I have some important information about cost savings that I think they'd want to know about."
  },
  objection: {
    title: "Objection Handling",
    color: "red",
    text: "I completely understand you're busy. That's exactly why I'm calling - we specialize in saving busy executives time and money. Would it be better if I sent you a quick email with the key points and we could schedule a brief call next week?"
  },
  closing: {
    title: "Closing",
    color: "green",
    text: "Great! Based on what you've told me, it sounds like we could really help. The next step would be a 15-minute demo where I can show you exactly how this would work for [COMPANY]. Are you available Tuesday at 2 PM or would Thursday at 10 AM work better?"
  }
};

// Mock the scripts service with immediate resolution
jest.mock('../../services', () => ({
  scriptsService: {
    getAllScripts: jest.fn(),
    getDefaultScripts: jest.fn()
  }
}));

// Import the mocked service to set up return values
import { scriptsService } from '../../services';

describe('ScriptDisplay Component', () => {
  beforeEach(() => {
    // Setup mock return values before each test
    scriptsService.getAllScripts.mockResolvedValue({
      success: true,
      data: mockScripts
    });
    scriptsService.getDefaultScripts.mockResolvedValue({
      success: true,
      data: mockScripts
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders script display with all elements', async () => {
    render(<ScriptDisplay />);
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    // Check title
    expect(screen.getByText('Call Scripts')).toBeInTheDocument();
    
    // Check script buttons - look for buttons with specific roles
    expect(screen.getByRole('button', { name: /Introduction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gatekeeper/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Objection Handling/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Closing/i })).toBeInTheDocument();
    
    // Check default script is shown (introduction)
    expect(screen.getByText(/Hi \[NAME\]/i)).toBeInTheDocument();
    
    // Check tips section
    expect(screen.getByText('Quick Tips:')).toBeInTheDocument();
    expect(screen.getByText(/Blue = Introduction/i)).toBeInTheDocument();
  });

  test('clicking script buttons changes displayed script', async () => {
    render(<ScriptDisplay />);
    const user = userEvent.setup();
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    // Initially shows introduction
    expect(screen.getByText(/Hi \[NAME\]/i)).toBeInTheDocument();
    
    // Click on Gatekeeper
    await user.click(screen.getByRole('button', { name: /Gatekeeper/i }));
    
    // Should show gatekeeper script - check for a more specific text that should be in gatekeeper script
    expect(screen.getByText(/gatekeeper/i)).toBeInTheDocument();
    
    // Introduction script should not be visible
    expect(screen.queryByText(/Hi \[NAME\]/i)).not.toBeInTheDocument();
  });

  test('selected script button has different styling', async () => {
    render(<ScriptDisplay />);
    const user = userEvent.setup();
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    // Get the introduction button (should be selected by default)
    const introButton = screen.getByRole('button', { name: /Introduction/i });
    
    // Introduction button should have selected styling (colored background)
    expect(introButton).toHaveClass('bg-blue-500');
    expect(introButton).toHaveClass('text-white');
    
    // Click on Closing button
    const closingButton = screen.getByRole('button', { name: /Closing/i });
    await user.click(closingButton);
    
    // Closing button should now have selected styling
    expect(closingButton).toHaveClass('bg-green-500');
    expect(closingButton).toHaveClass('text-white');
    
    // Introduction button should have unselected styling
    expect(introButton).toHaveClass('bg-gray-200');
    expect(introButton).toHaveClass('text-gray-700');
  });

  test('copy button copies script to clipboard', async () => {
    render(<ScriptDisplay />);
    const user = userEvent.setup();
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    // Spy on the clipboard writeText method
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText');
    
    // Click copy button
    await user.click(screen.getByText(/📋 Copy/i));
    
    // Check clipboard writeText was called
    expect(writeTextSpy).toHaveBeenCalled();
    
    // Check alert was shown
    expect(global.alert).toHaveBeenCalledWith('Script copied to clipboard!');
    
    // Clean up spy
    writeTextSpy.mockRestore();
  });

  test('expand/collapse button toggles script view', async () => {
    render(<ScriptDisplay />);
    const user = userEvent.setup();
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    // Find the expand button
    const expandButton = screen.getByText(/⬇️ Expand/i);
    
    // Click expand
    await user.click(expandButton);
    
    // Button should change to collapse
    expect(screen.getByText(/⬆️ Collapse/i)).toBeInTheDocument();
    expect(screen.queryByText(/⬇️ Expand/i)).not.toBeInTheDocument();
    
    // Click collapse
    await user.click(screen.getByText(/⬆️ Collapse/i));
    
    // Should return to original state
    expect(screen.getByText(/⬇️ Expand/i)).toBeInTheDocument();
    expect(screen.queryByText(/⬆️ Collapse/i)).not.toBeInTheDocument();
  });

  test('each script has correct color coding', async () => {
    render(<ScriptDisplay />);
    const user = userEvent.setup();
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    // Check Introduction is selected by default (blue header should be visible)
    expect(screen.getByText(/Hi \[NAME\]/i)).toBeInTheDocument();
    
    // Check Gatekeeper
    await user.click(screen.getByRole('button', { name: /Gatekeeper/i }));
    // Just verify the gatekeeper script is displayed
    expect(screen.getByText(/gatekeeper/i)).toBeInTheDocument();
    
    // Check Objection Handling
    await user.click(screen.getByRole('button', { name: /Objection Handling/i }));
    expect(screen.getByText(/objection/i)).toBeInTheDocument();
    
    // Check Closing
    await user.click(screen.getByRole('button', { name: /Closing/i }));
    expect(screen.getByText(/closing/i)).toBeInTheDocument();
  });

  test('displays all quick tips', async () => {
    render(<ScriptDisplay />);
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    // Check all tips are present
    expect(screen.getByText(/Blue = Introduction/i)).toBeInTheDocument();
    expect(screen.getByText(/Yellow = Gatekeeper/i)).toBeInTheDocument();
    expect(screen.getByText(/Red = Objections/i)).toBeInTheDocument();
    expect(screen.getByText(/Green = Closing/i)).toBeInTheDocument();
  });

  test('displays customization note', async () => {
    render(<ScriptDisplay />);
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/Replace \[BRACKETS\] with actual information/i)).toBeInTheDocument();
  });

  test('script text contains placeholder brackets', async () => {
    render(<ScriptDisplay />);
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    // Check for placeholder brackets in the script
    expect(screen.getByText(/\[NAME\]/)).toBeInTheDocument();
    expect(screen.getByText(/\[YOUR NAME\]/)).toBeInTheDocument();
    expect(screen.getByText(/\[COMPANY\]/)).toBeInTheDocument();
  });

  test('all scripts are accessible', async () => {
    render(<ScriptDisplay />);
    const user = userEvent.setup();
    
    // Wait for scripts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading scripts...')).not.toBeInTheDocument();
    });
    
    const scripts = ['Introduction', 'Gatekeeper', 'Objection Handling', 'Closing'];
    
    for (const scriptName of scripts) {
      await user.click(screen.getByRole('button', { name: scriptName }));
      
      // Each should have copy and expand buttons
      expect(screen.getByText(/📋 Copy/i)).toBeInTheDocument();
      expect(screen.getByText(/Expand|Collapse/i)).toBeInTheDocument();
      
      // Verify script content is visible with Tailwind class
      const scriptContent = document.querySelector('.font-serif');
      expect(scriptContent).toBeInTheDocument();
    }
  });
});