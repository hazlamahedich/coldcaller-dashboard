import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('End-to-End Workflow Tests', () => {
  // Increase timeout for E2E tests
  jest.setTimeout(10000);
  describe('Complete Sales Call Workflow', () => {
    test('perform a full sales call from start to finish', async () => {
      render(<App />);
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Step 1: Review lead information
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Tech Solutions Inc.')).toBeInTheDocument();
      
      // Step 2: Select introduction script
      await user.click(screen.getByRole('button', { name: 'Introduction' }));
      expect(screen.getByText(/Hi \[NAME\]/i)).toBeInTheDocument();
      
      // Step 3: Copy script for reference
      await user.click(screen.getByText('📋 Copy'));
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      
      // Step 4: Dial the lead's number
      const phoneDigits = ['5', '5', '5', '1', '2', '3', '4', '5', '6', '7'];
      for (const digit of phoneDigits) {
        const button = screen.getByRole('button', { name: digit });
        await user.click(button);
      }
      
      // Step 5: Verify formatted number
      const phoneInput = screen.getByPlaceholderText('Enter phone number');
      expect(phoneInput.value).toBe('(555) 123-4567');
      
      // Step 6: Start the call
      await user.click(screen.getByText('📞 Call'));
      expect(consoleSpy).toHaveBeenCalledWith('Calling:', '5551234567');
      expect(screen.getByText('🔴 Call in progress...')).toBeInTheDocument();
      
      // Step 7: Play greeting audio
      const playButtons = screen.getAllByText(/▶️ Play/i);
      await user.click(playButtons[0]);
      expect(consoleSpy).toHaveBeenCalledWith('Playing:', 'Professional Intro');
      
      // Step 8: Handle objection - switch script
      await user.click(screen.getByRole('button', { name: 'Objection Handling' }));
      expect(screen.getByText(/I completely understand you're busy/i)).toBeInTheDocument();
      
      // Step 9: Play objection audio
      await user.click(screen.getByText('Objections'));
      const objectionPlayButtons = screen.getAllByText(/▶️ Play/i);
      await user.click(objectionPlayButtons[0]);
      expect(consoleSpy).toHaveBeenCalledWith('Playing:', 'Not Interested');
      
      // Step 10: Move to closing
      await user.click(screen.getByRole('button', { name: 'Closing' }));
      expect(screen.getByText(/Based on what you've told me/i)).toBeInTheDocument();
      
      // Step 11: End the call
      await user.click(screen.getByText('📵 Hang Up'));
      expect(consoleSpy).toHaveBeenCalledWith('Call ended');
      
      // Step 12: Add notes about the call
      await user.click(screen.getByText('✏️ Edit'));
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Spoke with John. Interested in demo. Follow up Tuesday.');
      await user.click(screen.getByText('✅ Save'));
      
      // Step 13: Move to next lead
      await user.click(screen.getByText(/Next ➡️/i));
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Lead 2 of 3')).toBeInTheDocument();
    });
  });

  describe('Lead Management Workflow', () => {
    test('navigate through all leads and update notes', async () => {
      render(<App />);
      const user = userEvent.setup();
      
      const leads = [
        { name: 'John Smith', note: 'Initial contact made' },
        { name: 'Sarah Johnson', note: 'Scheduled demo for next week' },
        { name: 'Mike Chen', note: 'Closed deal - $5000/month' }
      ];
      
      for (let i = 0; i < leads.length; i++) {
        // Verify lead name
        expect(screen.getByText(leads[i].name)).toBeInTheDocument();
        
        // Edit notes
        await user.click(screen.getByText('✏️ Edit'));
        const textarea = screen.getByRole('textbox');
        await user.clear(textarea);
        await user.type(textarea, leads[i].note);
        await user.click(screen.getByText('✅ Save'));
        
        // Verify notes saved
        expect(screen.getByText(leads[i].note)).toBeInTheDocument();
        
        // Move to next lead if not last
        if (i < leads.length - 1) {
          await user.click(screen.getByText(/Next ➡️/i));
        }
      }
      
      // Navigate back to first lead
      await user.click(screen.getByText(/Previous/i));
      await user.click(screen.getByText(/Previous/i));
      
      // Verify we're back at first lead with saved notes
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Initial contact made')).toBeInTheDocument();
    });
  });

  describe('Script Preparation Workflow', () => {
    test('prepare all scripts before calling', async () => {
      render(<App />);
      const user = userEvent.setup();
      
      const scripts = ['Introduction', 'Gatekeeper', 'Objection Handling', 'Closing'];
      const copiedScripts = [];
      
      for (const scriptName of scripts) {
        // Select script
        await user.click(screen.getByRole('button', { name: scriptName }));
        
        // Expand to read full script
        await user.click(screen.getByText('⬇️ Expand'));
        
        // Copy script
        await user.click(screen.getByText('📋 Copy'));
        
        // Verify clipboard was called
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        
        // Collapse script
        await user.click(screen.getByText('⬆️ Collapse'));
        
        copiedScripts.push(scriptName);
      }
      
      // Verify all scripts were reviewed
      expect(copiedScripts).toEqual(scripts);
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(4);
    });
  });

  describe('Audio Clip Testing Workflow', () => {
    test('test all audio clips before calling', async () => {
      jest.useFakeTimers();
      render(<App />);
      const user = userEvent.setup();
      
      const categories = ['Greetings', 'Objections', 'Closing'];
      
      for (const category of categories) {
        // Select category (skip Greetings as it's default)
        if (category !== 'Greetings') {
          await user.click(screen.getByText(category));
        }
        
        // Play first clip in category
        const playButtons = screen.getAllByText(/▶️ Play/i);
        fireEvent.click(playButtons[0]);
        
        // Verify playing status
        expect(screen.getByText('🎵 Playing audio clip...')).toBeInTheDocument();
        
        // Fast forward to auto-stop
        jest.advanceTimersByTime(3000);
        
        // Wait for status to clear
        await waitFor(() => {
          expect(screen.queryByText('🎵 Playing audio clip...')).not.toBeInTheDocument();
        });
      }
      
      jest.useRealTimers();
    });
  });

  describe('Quick Actions Workflow', () => {
    test('use quick actions for lead management', async () => {
      render(<App />);
      const user = userEvent.setup();
      
      // Test all quick action buttons are present and clickable
      const quickActions = [
        '📧 Send Email',
        '📅 Schedule Follow-up',
        '✔️ Mark as Contacted'
      ];
      
      for (const action of quickActions) {
        const button = screen.getByText(action);
        expect(button).toBeInTheDocument();
        
        // Verify it's a button and clickable
        const buttonElement = button.closest('button');
        expect(buttonElement).toBeInTheDocument();
        expect(buttonElement).not.toBeDisabled();
      }
    });
  });

  describe('Multi-Lead Calling Session', () => {
    test('make calls to multiple leads in sequence', async () => {
      render(<App />);
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Lead 1: John Smith
      const dialPadButton5 = screen.getByRole('button', { name: '5' });
      await user.click(dialPadButton5);
      await user.click(dialPadButton5);
      await user.click(dialPadButton5);
      await user.click(screen.getByText('📞 Call'));
      expect(consoleSpy).toHaveBeenCalledWith('Calling:', '555');
      await user.click(screen.getByText('📵 Hang Up'));
      
      // Clear number
      const deleteButton = screen.getByText('⌫');
      await user.click(deleteButton);
      await user.click(deleteButton);
      await user.click(deleteButton);
      
      // Move to Lead 2: Sarah Johnson
      await user.click(screen.getByText(/Next ➡️/i));
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      
      // Call Lead 2
      const dialPadButton5_2 = screen.getByRole('button', { name: '5' });
      await user.click(dialPadButton5_2);
      await user.click(dialPadButton5_2);
      await user.click(dialPadButton5_2);
      await user.click(screen.getByText('📞 Call'));
      expect(consoleSpy).toHaveBeenCalledWith('Calling:', '555');
      await user.click(screen.getByText('📵 Hang Up'));
      
      // Move to Lead 3: Mike Chen
      await user.click(screen.getByText(/Next ➡️/i));
      expect(screen.getByText('Mike Chen')).toBeInTheDocument();
      
      // Verify we called multiple leads
      expect(consoleSpy).toHaveBeenCalledWith('Call ended');
      expect(consoleSpy).toHaveBeenCalledTimes(6); // 2 calls * 3 logs each
    });
  });

  describe('Error Recovery Workflow', () => {
    test('recover from mis-dialed number', async () => {
      render(<App />);
      const user = userEvent.setup();
      
      // Dial wrong number
      await user.click(screen.getByRole('button', { name: '1' }));
      await user.click(screen.getByRole('button', { name: '2' }));
      await user.click(screen.getByRole('button', { name: '3' }));
      
      // Realize mistake and delete
      const deleteButton = screen.getByText('⌫');
      await user.click(deleteButton);
      await user.click(deleteButton);
      await user.click(deleteButton);
      
      // Dial correct number (4 digits to get formatting)
      const dialPadButton5 = screen.getByRole('button', { name: '5' });
      await user.click(dialPadButton5);
      await user.click(dialPadButton5);
      await user.click(dialPadButton5);
      await user.click(screen.getByRole('button', { name: '1' }));
      
      const phoneInput = screen.getByPlaceholderText('Enter phone number');
      expect(phoneInput.value).toBe('(555) 1');
    });

    test('cancel note editing without saving', async () => {
      render(<App />);
      const user = userEvent.setup();
      
      const originalNote = 'Interested in cloud services';
      
      // Start editing
      await user.click(screen.getByText('✏️ Edit'));
      
      // Make changes
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Accidental changes');
      
      // Cancel instead of save
      await user.click(screen.getByText('❌ Cancel'));
      
      // Original note should be preserved
      expect(screen.getByText(originalNote)).toBeInTheDocument();
      expect(screen.queryByText('Accidental changes')).not.toBeInTheDocument();
    });
  });
});