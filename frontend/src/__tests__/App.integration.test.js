import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('App Integration Tests', () => {
  test('renders complete dashboard with all components', () => {
    render(<App />);
    
    // Check header
    expect(screen.getByText('🎯 Cold Calling Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Your all-in-one sales calling platform')).toBeInTheDocument();
    
    // Check all main components are rendered
    expect(screen.getByText('Dial Pad')).toBeInTheDocument();
    expect(screen.getByText('Audio Clips')).toBeInTheDocument();
    expect(screen.getByText('Call Scripts')).toBeInTheDocument();
    expect(screen.getByText('Current Lead')).toBeInTheDocument();
    
    // Check stats box
    expect(screen.getByText("Today's Stats")).toBeInTheDocument();
    
    // Check call log
    expect(screen.getByText('Recent Calls')).toBeInTheDocument();
    
    // Check footer
    expect(screen.getByText(/Quick Start:/)).toBeInTheDocument();
  });

  test('complete calling workflow', async () => {
    render(<App />);
    const user = userEvent.setup();
    
    // Step 1: Select and view a lead
    const johnSmithElements = screen.getAllByText('John Smith');
    expect(johnSmithElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tech Solutions Inc.')).toBeInTheDocument();
    
    // Step 2: Review the script
    await user.click(screen.getByRole('button', { name: 'Introduction' }));
    expect(screen.getByText(/Hi \[NAME\]/i)).toBeInTheDocument();
    
    // Step 3: Enter phone number in dial pad
    // Get dial pad button specifically (not stats numbers)
    const dialPadButton5 = screen.getByRole('button', { name: '5' });
    await user.click(dialPadButton5);
    await user.click(dialPadButton5);
    await user.click(dialPadButton5);
    
    const phoneInput = screen.getByPlaceholderText('Enter phone number');
    expect(phoneInput.value).toBe('555');
    
    // Step 4: Start the call
    await user.click(screen.getByText('📞 Call'));
    expect(screen.getByText('📵 Hang Up')).toBeInTheDocument();
    expect(screen.getByText('🔴 Call in progress...')).toBeInTheDocument();
    
    // Step 5: Play an audio clip during call
    const playButtons = screen.getAllByText(/▶️ Play/i);
    await user.click(playButtons[0]);
    expect(screen.getByText('🎵 Playing audio clip...')).toBeInTheDocument();
    
    // Step 6: End the call
    await user.click(screen.getByText('📵 Hang Up'));
    expect(screen.getByText('📞 Call')).toBeInTheDocument();
  });

  test('lead navigation updates display', async () => {
    render(<App />);
    const user = userEvent.setup();
    
    // Initially shows first lead
    expect(screen.getAllByText('John Smith').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lead 1 of 3')).toBeInTheDocument();
    
    // Navigate to next lead
    await user.click(screen.getByText(/Next ➡️/i));
    
    // Should show second lead
    expect(screen.getAllByText('Sarah Johnson').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lead 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Digital Marketing Pro')).toBeInTheDocument();
  });

  test('script selection and copy workflow', async () => {
    render(<App />);
    const user = userEvent.setup();
    
    // Create spy for clipboard
    const clipboardSpy = jest.spyOn(navigator.clipboard, 'writeText');
    
    // Select objection handling script
    await user.click(screen.getByRole('button', { name: 'Objection Handling' }));
    
    // Verify script is displayed
    expect(screen.getByText(/I completely understand you're busy/i)).toBeInTheDocument();
    
    // Copy the script
    await user.click(screen.getByText('📋 Copy'));
    
    // Verify clipboard was used
    expect(clipboardSpy).toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith('Script copied to clipboard!');
    
    // Clean up
    clipboardSpy.mockRestore();
  });

  test('audio clip category switching', async () => {
    render(<App />);
    const user = userEvent.setup();
    
    // Initially shows greetings
    expect(screen.getByText('Professional Intro')).toBeInTheDocument();
    
    // Switch to objections
    await user.click(screen.getByText('Objections'));
    expect(screen.getByText('Not Interested')).toBeInTheDocument();
    expect(screen.queryByText('Professional Intro')).not.toBeInTheDocument();
    
    // Switch to closing - there are multiple "Closing" buttons (script + audio)
    // We'll click all of them to ensure we get the audio clip category
    const allClosingButtons = screen.getAllByText('Closing');
    for (const button of allClosingButtons) {
      await user.click(button);
    }
    // Should show the closing audio clips
    expect(screen.getByText('Schedule Meeting')).toBeInTheDocument();
    expect(screen.queryByText('Not Interested')).not.toBeInTheDocument();
  });

  test('note editing workflow', async () => {
    render(<App />);
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Start editing notes
    await user.click(screen.getByText('✏️ Edit'));
    
    // Verify textarea appears
    const initialTextareas = screen.getAllByRole('textbox');
    expect(initialTextareas.length).toBeGreaterThanOrEqual(1);
    
    // Edit the notes (use the last textarea if multiple exist)
    const textarea = initialTextareas[initialTextareas.length - 1];
    
    // Clear and type new text
    await user.clear(textarea);
    await user.type(textarea, 'Called and spoke with decision maker');
    
    // Save the notes
    await user.click(screen.getByText('✅ Save'));
    
    // Verify console was called (indicating save was triggered)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Saving notes:'), expect.any(String));
    
    // Verify the save button worked and edit mode ended  
    // Notes section should not have a textarea anymore
    const finalTextareas = screen.getAllByRole('textbox');
    const phoneInput = screen.getByPlaceholderText('Enter phone number');
    // Should only have the phone input, not the notes textarea
    expect(finalTextareas.length).toBe(1);
    expect(finalTextareas[0]).toBe(phoneInput);
    expect(screen.getByText('✏️ Edit')).toBeInTheDocument();
  });

  test('stats display remains static', () => {
    render(<App />);
    
    // Check that stats are displayed (these are dummy for now)
    expect(screen.getByText('Calls Made:')).toBeInTheDocument();
    const statValues = screen.getAllByText('12');
    expect(statValues.length).toBeGreaterThanOrEqual(1);
    
    expect(screen.getByText('Contacts Reached:')).toBeInTheDocument();
    const contactValues = screen.getAllByText('5');
    expect(contactValues.length).toBeGreaterThanOrEqual(1);
    
    expect(screen.getByText('Appointments Set:')).toBeInTheDocument();
    const appointmentValues = screen.getAllByText('2');
    expect(appointmentValues.length).toBeGreaterThanOrEqual(1);
  });

  test('recent calls display', () => {
    render(<App />);
    
    // Check recent calls are displayed
    const johnSmithElements = screen.getAllByText('John Smith');
    expect(johnSmithElements.length).toBeGreaterThanOrEqual(1); // At least one instance
    
    expect(screen.getByText('10:30 AM')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('11:15 AM')).toBeInTheDocument();
  });

  test('responsive layout renders all columns', () => {
    render(<App />);
    
    // Check that all three columns are present
    const dashboard = screen.getByText('Current Lead').closest('div').parentElement.parentElement;
    const children = dashboard.children;
    
    // Should have 3 main columns
    expect(children.length).toBeGreaterThanOrEqual(3);
  });

  test('multiple components can be interacted with independently', async () => {
    render(<App />);
    const user = userEvent.setup();
    
    // Interact with dial pad - get the button specifically
    const dialPadButton5 = screen.getByRole('button', { name: '5' });
    await user.click(dialPadButton5);
    
    // Interact with script display
    await user.click(screen.getByRole('button', { name: 'Gatekeeper' }));
    
    // Interact with audio player
    await user.click(screen.getByText('Objections'));
    
    // Interact with lead panel
    await user.click(screen.getByText(/Next ➡️/i));
    
    // Verify all interactions worked
    const phoneInput = screen.getByPlaceholderText('Enter phone number');
    expect(phoneInput.value).toBe('5');
    expect(screen.getByText(/trying to reach the person/i)).toBeInTheDocument();
    expect(screen.getByText('Too Busy')).toBeInTheDocument();
    expect(screen.getAllByText('Sarah Johnson').length).toBeGreaterThanOrEqual(1);
  });

  test('expand/collapse script works within full app', async () => {
    render(<App />);
    const user = userEvent.setup();
    
    // Find and click expand button
    await user.click(screen.getByText('⬇️ Expand'));
    
    // Should change to collapse
    expect(screen.getByText('⬆️ Collapse')).toBeInTheDocument();
    
    // Click collapse
    await user.click(screen.getByText('⬆️ Collapse'));
    
    // Should change back to expand
    expect(screen.getByText('⬇️ Expand')).toBeInTheDocument();
  });

  test('footer tips are displayed', () => {
    render(<App />);
    
    // Check footer content
    expect(screen.getByText(/Select a lead → Review the script → Dial the number → Use audio clips when needed/)).toBeInTheDocument();
    expect(screen.getByText(/Week 2: Tailwind CSS styling/)).toBeInTheDocument();
  });
});