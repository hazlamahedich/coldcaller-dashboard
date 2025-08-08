import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScriptDisplay from '../ScriptDisplay';

// Mock clipboard API is already set up in setupTests.js

describe('ScriptDisplay Component', () => {
  test('renders script display with all elements', () => {
    render(<ScriptDisplay />);
    
    // Check title
    expect(screen.getByText('Call Scripts')).toBeInTheDocument();
    
    // Check script buttons - use getAllByText since button and header may have same text
    expect(screen.getAllByText('Introduction').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Gatekeeper')).toBeInTheDocument();
    expect(screen.getByText('Objection Handling')).toBeInTheDocument();
    expect(screen.getAllByText('Closing').length).toBeGreaterThanOrEqual(1);
    
    // Check default script is shown (introduction)
    expect(screen.getByText(/Hi \[NAME\]/i)).toBeInTheDocument();
    
    // Check tips section
    expect(screen.getByText('Quick Tips:')).toBeInTheDocument();
    expect(screen.getByText(/Blue = Introduction/i)).toBeInTheDocument();
  });

  test('clicking script buttons changes displayed script', async () => {
    render(<ScriptDisplay />);
    const user = userEvent.setup();
    
    // Initially shows introduction
    expect(screen.getByText(/Hi \[NAME\]/i)).toBeInTheDocument();
    
    // Click on Gatekeeper
    await user.click(screen.getByRole('button', { name: 'Gatekeeper' }));
    
    // Should show gatekeeper script
    expect(screen.getByText(/trying to reach the person who handles IT/i)).toBeInTheDocument();
    
    // Introduction script should not be visible
    expect(screen.queryByText(/Hi \[NAME\]/i)).not.toBeInTheDocument();
  });

  test('selected script button has different styling', async () => {
    render(<ScriptDisplay />);
    const user = userEvent.setup();
    
    // Get the introduction button (should be selected by default)
    const introButton = screen.getByRole('button', { name: 'Introduction' });
    
    // Introduction button should have selected styling (colored background)
    expect(introButton).toHaveClass('bg-blue-500');
    expect(introButton).toHaveClass('text-white');
    
    // Click on Closing button
    const closingButton = screen.getByRole('button', { name: 'Closing' });
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
    
    // Check Introduction is selected by default (blue header should be visible)
    expect(screen.getByText(/Hi \[NAME\]/i)).toBeInTheDocument();
    
    // Check Gatekeeper
    await user.click(screen.getByRole('button', { name: 'Gatekeeper' }));
    expect(screen.getByText(/trying to reach the person who handles IT/i)).toBeInTheDocument();
    
    // Check Objection Handling
    await user.click(screen.getByRole('button', { name: 'Objection Handling' }));
    expect(screen.getByText(/I completely understand you're busy/i)).toBeInTheDocument();
    
    // Check Closing
    await user.click(screen.getByRole('button', { name: 'Closing' }));
    expect(screen.getByText(/Based on what you've told me/i)).toBeInTheDocument();
  });

  test('displays all quick tips', () => {
    render(<ScriptDisplay />);
    
    // Check all tips are present
    expect(screen.getByText(/Blue = Introduction/i)).toBeInTheDocument();
    expect(screen.getByText(/Yellow = Gatekeeper/i)).toBeInTheDocument();
    expect(screen.getByText(/Red = Objections/i)).toBeInTheDocument();
    expect(screen.getByText(/Green = Closing/i)).toBeInTheDocument();
  });

  test('displays customization note', () => {
    render(<ScriptDisplay />);
    
    expect(screen.getByText(/Replace \[BRACKETS\] with actual information/i)).toBeInTheDocument();
  });

  test('script text contains placeholder brackets', () => {
    render(<ScriptDisplay />);
    
    // Check for placeholder brackets in the script
    expect(screen.getByText(/\[NAME\]/)).toBeInTheDocument();
    expect(screen.getByText(/\[YOUR NAME\]/)).toBeInTheDocument();
    expect(screen.getByText(/\[COMPANY\]/)).toBeInTheDocument();
  });

  test('all scripts are accessible', async () => {
    render(<ScriptDisplay />);
    const user = userEvent.setup();
    
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