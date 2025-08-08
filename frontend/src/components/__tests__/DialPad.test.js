import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DialPad from '../DialPad';

describe('DialPad Component', () => {
  // Test that the component renders without crashing
  test('renders dial pad with all elements', () => {
    render(<DialPad />);
    
    // Check title
    expect(screen.getByText('Dial Pad')).toBeInTheDocument();
    
    // Check all number buttons exist
    const numberButtons = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
    numberButtons.forEach(num => {
      expect(screen.getByText(num)).toBeInTheDocument();
    });
    
    // Check call button
    expect(screen.getByText(/Call/i)).toBeInTheDocument();
    
    // Check input field
    expect(screen.getByPlaceholderText('Enter phone number')).toBeInTheDocument();
  });

  test('clicking number buttons adds digits to phone number', async () => {
    render(<DialPad />);
    const user = userEvent.setup();
    
    // Click some number buttons
    await user.click(screen.getByText('5'));
    await user.click(screen.getByText('5'));
    await user.click(screen.getByText('5'));
    
    // Check the input shows the formatted number (component formats 3 digits as "555")
    const input = screen.getByPlaceholderText('Enter phone number');
    expect(input.value).toBe('555');
  });

  test('formats phone number correctly', async () => {
    render(<DialPad />);
    const user = userEvent.setup();
    
    // Enter a full phone number
    const buttons = ['5', '5', '5', '1', '2', '3', '4', '5', '6', '7'];
    for (const btn of buttons) {
      await user.click(screen.getByText(btn));
    }
    
    const input = screen.getByPlaceholderText('Enter phone number');
    expect(input.value).toBe('(555) 123-4567');
  });

  test('delete button removes last digit', async () => {
    render(<DialPad />);
    const user = userEvent.setup();
    
    // Add some numbers (4 digits to get formatting)
    await user.click(screen.getByText('1'));
    await user.click(screen.getByText('2'));
    await user.click(screen.getByText('3'));
    await user.click(screen.getByText('4'));
    
    // Should show "(123) 4"
    const input = screen.getByPlaceholderText('Enter phone number');
    expect(input.value).toBe('(123) 4');
    
    // Click delete button - should remove the "4"
    const deleteButton = screen.getByText('⌫');
    await user.click(deleteButton);
    
    // Should now show "123" (no formatting for 3 digits)
    expect(input.value).toBe('123');
  });

  test('call button is disabled when no number entered', () => {
    render(<DialPad />);
    
    const callButton = screen.getByText(/Call/i).closest('button');
    expect(callButton).toBeDisabled();
  });

  test('call button enables when number is entered', async () => {
    render(<DialPad />);
    const user = userEvent.setup();
    
    // Enter a number
    await user.click(screen.getByText('5'));
    
    const callButton = screen.getByText(/Call/i).closest('button');
    expect(callButton).not.toBeDisabled();
  });

  test('clicking call button starts a call', async () => {
    render(<DialPad />);
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Enter a number
    await user.click(screen.getByText('5'));
    await user.click(screen.getByText('5'));
    await user.click(screen.getByText('5'));
    
    // Click call
    const callButton = screen.getByText(/Call/i);
    await user.click(callButton);
    
    // Check console log
    expect(consoleSpy).toHaveBeenCalledWith('Calling:', '555');
    
    // Check UI changes to show hang up
    expect(screen.getByText(/Hang Up/i)).toBeInTheDocument();
    expect(screen.getByText(/Call in progress/i)).toBeInTheDocument();
  });

  test('clicking hang up ends the call', async () => {
    render(<DialPad />);
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Start a call
    await user.click(screen.getByText('5'));
    await user.click(screen.getByText(/Call/i));
    
    // Hang up
    const hangUpButton = screen.getByText(/Hang Up/i);
    await user.click(hangUpButton);
    
    // Check console log
    expect(consoleSpy).toHaveBeenCalledWith('Call ended');
    
    // Check UI returns to normal
    expect(screen.getByText(/Call/i)).toBeInTheDocument();
    expect(screen.queryByText(/Call in progress/i)).not.toBeInTheDocument();
  });

  test('number buttons are disabled during call', async () => {
    render(<DialPad />);
    const user = userEvent.setup();
    
    // Start a call
    await user.click(screen.getByText('5'));
    await user.click(screen.getByText(/Call/i));
    
    // Check number buttons are disabled
    const numberButton = screen.getByText('1');
    expect(numberButton.closest('button')).toBeDisabled();
  });

  test('direct input in text field works', async () => {
    render(<DialPad />);
    const user = userEvent.setup();
    
    const input = screen.getByPlaceholderText('Enter phone number');
    
    // Type directly in input
    await user.clear(input);
    await user.type(input, '5551234567');
    
    // Check formatting is applied
    expect(input.value).toBe('(555) 123-4567');
  });

  test('non-numeric characters are filtered out', async () => {
    render(<DialPad />);
    const user = userEvent.setup();
    
    const input = screen.getByPlaceholderText('Enter phone number');
    
    // Try to type letters and numbers
    await user.type(input, 'abc123def456');
    
    // Only numbers should remain
    expect(input.value).toBe('(123) 456');
  });
});