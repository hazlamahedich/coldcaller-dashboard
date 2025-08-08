import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadPanel from '../LeadPanel';

describe('LeadPanel Component', () => {
  test('renders lead panel with all elements', () => {
    render(<LeadPanel />);
    
    // Check title
    expect(screen.getByText('Current Lead')).toBeInTheDocument();
    
    // Check navigation
    expect(screen.getByText(/Previous/i)).toBeInTheDocument();
    expect(screen.getByText(/Next/i)).toBeInTheDocument();
    expect(screen.getByText('Lead 1 of 3')).toBeInTheDocument();
    
    // Check first lead data is displayed
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Tech Solutions Inc.')).toBeInTheDocument();
    expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
    expect(screen.getByText('john@techsolutions.com')).toBeInTheDocument();
    
    // Check status badge
    expect(screen.getByText('New')).toBeInTheDocument();
    
    // Check quick actions
    expect(screen.getByText('📧 Send Email')).toBeInTheDocument();
    expect(screen.getByText('📅 Schedule Follow-up')).toBeInTheDocument();
    expect(screen.getByText('✔️ Mark as Contacted')).toBeInTheDocument();
  });

  test('navigation buttons work correctly', async () => {
    render(<LeadPanel />);
    const user = userEvent.setup();
    
    // Initially on lead 1
    expect(screen.getByText('Lead 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    
    // Click next
    await user.click(screen.getByText(/Next/i));
    
    // Should show lead 2
    expect(screen.getByText('Lead 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Digital Marketing Pro')).toBeInTheDocument();
    
    // Click next again
    await user.click(screen.getByText(/Next/i));
    
    // Should show lead 3
    expect(screen.getByText('Lead 3 of 3')).toBeInTheDocument();
    expect(screen.getByText('Mike Chen')).toBeInTheDocument();
    
    // Click previous
    await user.click(screen.getByText(/Previous/i));
    
    // Should go back to lead 2
    expect(screen.getByText('Lead 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
  });

  test('previous button is disabled on first lead', () => {
    render(<LeadPanel />);
    
    const previousButton = screen.getByText(/Previous/i).closest('button');
    expect(previousButton).toBeDisabled();
  });

  test('next button is disabled on last lead', async () => {
    render(<LeadPanel />);
    const user = userEvent.setup();
    
    // Navigate to last lead
    await user.click(screen.getByText(/Next/i));
    await user.click(screen.getByText(/Next/i));
    
    // Next button should be disabled
    const nextButton = screen.getByText(/Next/i).closest('button');
    expect(nextButton).toBeDisabled();
  });

  test('edit notes functionality works', async () => {
    render(<LeadPanel />);
    const user = userEvent.setup();
    
    // Click edit button
    await user.click(screen.getByText('✏️ Edit'));
    
    // Textarea should appear with current notes
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('Interested in cloud services');
    
    // Save and Cancel buttons should appear
    expect(screen.getByText('✅ Save')).toBeInTheDocument();
    expect(screen.getByText('❌ Cancel')).toBeInTheDocument();
  });

  test('saving notes updates the display', async () => {
    render(<LeadPanel />);
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Click edit
    await user.click(screen.getByText('✏️ Edit'));
    
    // Change notes
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'New test notes');
    
    // Save
    await user.click(screen.getByText('✅ Save'));
    
    // Check console log
    expect(consoleSpy).toHaveBeenCalledWith('Saving notes:', 'New test notes');
    
    // Textarea should be hidden
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    
    // New notes should be displayed
    expect(screen.getByText('New test notes')).toBeInTheDocument();
  });

  test('canceling edit reverts changes', async () => {
    render(<LeadPanel />);
    const user = userEvent.setup();
    
    // Get the initial notes content (whatever it is)
    const notesSection = screen.getByText('📝 Notes:').parentElement.nextElementSibling;
    const initialNotes = notesSection.textContent;
    
    // Click edit
    await user.click(screen.getByText('✏️ Edit'));
    
    // Change notes
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Temporary changes that should be reverted');
    
    // Cancel
    await user.click(screen.getByText('❌ Cancel'));
    
    // Original notes should still be displayed
    expect(screen.getByText(initialNotes)).toBeInTheDocument();
    expect(screen.queryByText('Temporary changes that should be reverted')).not.toBeInTheDocument();
  });

  test('status badges have correct colors', async () => {
    render(<LeadPanel />);
    const user = userEvent.setup();
    
    // Check "New" status (blue background)
    let statusBadge = screen.getByText('New');
    expect(statusBadge).toHaveClass('bg-blue-500');
    expect(statusBadge).toHaveClass('text-white');
    
    // Navigate to lead 2 with "Follow-up" status (orange background)
    await user.click(screen.getByText(/Next/i));
    statusBadge = screen.getByText('Follow-up');
    expect(statusBadge).toHaveClass('bg-orange-500');
    expect(statusBadge).toHaveClass('text-white');
    
    // Navigate to lead 3 with "Qualified" status (green background)
    await user.click(screen.getByText(/Next/i));
    statusBadge = screen.getByText('Qualified');
    expect(statusBadge).toHaveClass('bg-green-500');
    expect(statusBadge).toHaveClass('text-white');
  });

  test('all lead information fields are displayed', () => {
    render(<LeadPanel />);
    
    // Check all labels
    expect(screen.getByText('👤 Name:')).toBeInTheDocument();
    expect(screen.getByText('🏢 Company:')).toBeInTheDocument();
    expect(screen.getByText('📞 Phone:')).toBeInTheDocument();
    expect(screen.getByText('✉️ Email:')).toBeInTheDocument();
    expect(screen.getByText('📅 Last Contact:')).toBeInTheDocument();
    expect(screen.getByText('📝 Notes:')).toBeInTheDocument();
  });

  test('navigating leads clears edit mode', async () => {
    render(<LeadPanel />);
    const user = userEvent.setup();
    
    // Start editing
    await user.click(screen.getByText('✏️ Edit'));
    
    // Textarea should be visible
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    
    // Navigate to next lead
    await user.click(screen.getByText(/Next/i));
    
    // Edit mode should be cleared
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('✏️ Edit')).toBeInTheDocument();
  });

  test('empty notes show placeholder text', async () => {
    render(<LeadPanel />);
    const user = userEvent.setup();
    
    // Clear the notes
    await user.click(screen.getByText('✏️ Edit'));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.click(screen.getByText('✅ Save'));
    
    // Should show placeholder
    expect(screen.getByText('No notes yet. Click Edit to add notes.')).toBeInTheDocument();
  });

  test('quick action buttons are clickable', async () => {
    render(<LeadPanel />);
    const user = userEvent.setup();
    
    // All quick action buttons should be present and clickable
    const emailButton = screen.getByText('📧 Send Email');
    const scheduleButton = screen.getByText('📅 Schedule Follow-up');
    const markButton = screen.getByText('✔️ Mark as Contacted');
    
    expect(emailButton).toBeInTheDocument();
    expect(scheduleButton).toBeInTheDocument();
    expect(markButton).toBeInTheDocument();
    
    // They should be buttons
    expect(emailButton.closest('button')).toBeInTheDocument();
    expect(scheduleButton.closest('button')).toBeInTheDocument();
    expect(markButton.closest('button')).toBeInTheDocument();
  });
});