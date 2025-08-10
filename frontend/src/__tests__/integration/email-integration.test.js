/**
 * Email Integration Tests
 * Testing & QA Engineer - Comprehensive email template rendering and integration tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailComposer from '../../components/EmailComposer';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock dependencies
const mockOnClose = jest.fn();
const mockOnSend = jest.fn();

// Mock window.location for mailto testing
delete window.location;
window.location = { href: '' };

describe('Email Integration Tests', () => {
  const mockLeadData = {
    id: 'lead-123',
    name: 'John Smith',
    email: 'john.smith@example.com',
    company: 'ABC Corporation',
    phone: '+1-555-0123'
  };

  const renderEmailComposer = (props = {}) => {
    return render(
      <ThemeProvider>
        <EmailComposer
          isVisible={true}
          leadData={mockLeadData}
          onClose={mockOnClose}
          onSend={mockOnSend}
          {...props}
        />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
    
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve())
      }
    });

    // Mock alert
    global.alert = jest.fn();
  });

  describe('Email Template Rendering', () => {
    it('should render follow-up email template correctly', async () => {
      renderEmailComposer();

      // Wait for component to initialize
      await waitFor(() => {
        expect(screen.getByDisplayValue(/following up on our conversation/i)).toBeInTheDocument();
      });

      const subjectInput = screen.getByDisplayValue(/following up on our conversation/i);
      const bodyTextarea = screen.getByDisplayValue(/Hi John/);

      expect(subjectInput.value).toContain('ABC Corporation');
      expect(bodyTextarea.value).toContain('John');
      expect(bodyTextarea.value).toContain('ABC Corporation');
    });

    it('should render introduction email template', async () => {
      renderEmailComposer();

      const templateSelect = screen.getByRole('combobox');
      await userEvent.selectOptions(templateSelect, 'introduction');

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Introduction - Solutions for ABC Corporation/)).toBeInTheDocument();
      });

      const bodyTextarea = screen.getByDisplayValue(/Hi John/);
      expect(bodyTextarea.value).toContain('similar companies in your industry');
      expect(bodyTextarea.value).toContain('ABC Corporation');
    });

    it('should render thank you email template', async () => {
      renderEmailComposer();

      const templateSelect = screen.getByRole('combobox');
      await userEvent.selectOptions(templateSelect, 'thankyou');

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Thank you for your time - ABC Corporation/)).toBeInTheDocument();
      });

      const bodyTextarea = screen.getByDisplayValue(/Thank you for taking the time/);
      expect(bodyTextarea.value).toContain('ABC Corporation');
      expect(bodyTextarea.value).toContain('insights');
    });

    it('should render proposal follow-up template', async () => {
      renderEmailComposer();

      const templateSelect = screen.getByRole('combobox');
      await userEvent.selectOptions(templateSelect, 'proposal');

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Proposal for ABC Corporation/)).toBeInTheDocument();
      });

      const bodyTextarea = screen.getByDisplayValue(/I've attached the proposal/);
      expect(bodyTextarea.value).toContain('ABC Corporation');
      expect(bodyTextarea.value).toContain('proposal');
    });

    it('should handle custom template selection', async () => {
      renderEmailComposer();

      const templateSelect = screen.getByRole('combobox');
      await userEvent.selectOptions(templateSelect, 'custom');

      await waitFor(() => {
        const subjectInput = screen.getByPlaceholderText(/email subject/i);
        const bodyTextarea = screen.getByPlaceholderText(/write your email message/i);
        
        expect(subjectInput.value).toBe('');
        expect(bodyTextarea.value).toBe('');
      });
    });
  });

  describe('Template Variable Substitution', () => {
    it('should replace template variables correctly', async () => {
      const leadWithFullData = {
        ...mockLeadData,
        name: 'Jane Doe',
        company: 'XYZ Tech Solutions'
      };

      renderEmailComposer({ leadData: leadWithFullData });

      await waitFor(() => {
        const bodyTextarea = screen.getByDisplayValue(/Hi Jane/);
        expect(bodyTextarea.value).toContain('Jane');
        expect(bodyTextarea.value).toContain('XYZ Tech Solutions');
        expect(bodyTextarea.value).not.toContain('{firstName}');
        expect(bodyTextarea.value).not.toContain('{company}');
      });
    });

    it('should handle missing lead data gracefully', async () => {
      const incompleteLeadData = {
        id: 'lead-456',
        email: 'incomplete@example.com'
        // Missing name and company
      };

      renderEmailComposer({ leadData: incompleteLeadData });

      await waitFor(() => {
        const bodyTextarea = screen.getByDisplayValue(/Hi there/);
        expect(bodyTextarea.value).toContain('there'); // Default firstName
        expect(bodyTextarea.value).toContain('your company'); // Default company
      });
    });

    it('should handle first name extraction correctly', async () => {
      const leadWithMultipleNames = {
        ...mockLeadData,
        name: 'Dr. Robert James Smith Jr.'
      };

      renderEmailComposer({ leadData: leadWithMultipleNames });

      await waitFor(() => {
        const bodyTextarea = screen.getByDisplayValue(/Hi Dr\./);
        expect(bodyTextarea.value).toContain('Hi Dr.');
      });
    });

    it('should handle special characters in company names', async () => {
      const leadWithSpecialChars = {
        ...mockLeadData,
        company: 'Smith & Johnson Co., LLC'
      };

      renderEmailComposer({ leadData: leadWithSpecialChars });

      await waitFor(() => {
        const subjectInput = screen.getByDisplayValue(/Smith & Johnson Co., LLC/);
        expect(subjectInput.value).toContain('Smith & Johnson Co., LLC');
      });
    });
  });

  describe('Email Form Interactions', () => {
    it('should populate email fields from lead data', async () => {
      renderEmailComposer();

      const toInput = screen.getByLabelText(/to/i);
      expect(toInput.value).toBe(mockLeadData.email);
    });

    it('should allow editing of all form fields', async () => {
      renderEmailComposer();

      const toInput = screen.getByLabelText(/to/i);
      const subjectInput = screen.getByLabelText(/subject/i);
      const bodyTextarea = screen.getByLabelText(/message/i);

      // Clear and update fields
      await userEvent.clear(toInput);
      await userEvent.type(toInput, 'newemail@example.com');

      await userEvent.clear(subjectInput);
      await userEvent.type(subjectInput, 'Custom subject line');

      await userEvent.clear(bodyTextarea);
      await userEvent.type(bodyTextarea, 'Custom email body content');

      expect(toInput.value).toBe('newemail@example.com');
      expect(subjectInput.value).toBe('Custom subject line');
      expect(bodyTextarea.value).toBe('Custom email body content');
    });

    it('should switch to custom template when editing content', async () => {
      renderEmailComposer();

      const templateSelect = screen.getByRole('combobox');
      const subjectInput = screen.getByLabelText(/subject/i);

      // Start with follow-up template
      expect(templateSelect.value).toBe('followup');

      // Edit subject
      await userEvent.type(subjectInput, ' - Additional text');

      // Should switch to custom template
      await waitFor(() => {
        expect(templateSelect.value).toBe('custom');
      });
    });

    it('should validate required fields', async () => {
      renderEmailComposer();

      const sendButton = screen.getByRole('button', { name: /open in windows email/i });
      
      // Clear required fields
      const toInput = screen.getByLabelText(/to/i);
      const subjectInput = screen.getByLabelText(/subject/i);
      const bodyTextarea = screen.getByLabelText(/message/i);

      await userEvent.clear(toInput);
      await userEvent.clear(subjectInput);
      await userEvent.clear(bodyTextarea);

      // Button should be disabled
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Windows Email Client Integration', () => {
    it('should generate correct mailto URL', async () => {
      renderEmailComposer();

      const sendButton = screen.getByRole('button', { name: /open in windows email/i });
      
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(window.location.href).toContain('mailto:');
        expect(window.location.href).toContain('john.smith@example.com');
        expect(window.location.href).toContain('subject=');
        expect(window.location.href).toContain('body=');
      });
    });

    it('should URL encode email content properly', async () => {
      renderEmailComposer();

      const subjectInput = screen.getByLabelText(/subject/i);
      const bodyTextarea = screen.getByLabelText(/message/i);

      // Add special characters that need encoding
      await userEvent.clear(subjectInput);
      await userEvent.type(subjectInput, 'Test & Special Characters #1');

      await userEvent.clear(bodyTextarea);
      await userEvent.type(bodyTextarea, 'Body with spaces, newlines\nand special chars: & # %');

      const sendButton = screen.getByRole('button', { name: /open in windows email/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        const href = window.location.href;
        expect(href).toContain('%26'); // & encoded
        expect(href).toContain('%23'); // # encoded
        expect(href).toContain('%20'); // spaces encoded
      });
    });

    it('should call onSend callback with correct data', async () => {
      renderEmailComposer();

      const sendButton = screen.getByRole('button', { name: /open in windows email/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith({
          to: mockLeadData.email,
          subject: expect.stringContaining('ABC Corporation'),
          body: expect.stringContaining('John'),
          method: 'windows_client',
          timestamp: expect.any(String),
          leadId: mockLeadData.id
        });
      });
    });

    it('should close modal after sending', async () => {
      renderEmailComposer();

      const sendButton = screen.getByRole('button', { name: /open in windows email/i });
      await userEvent.click(sendButton);

      // Wait for the timeout in handleSendViaWindows
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should handle email client errors gracefully', async () => {
      // Mock error scenario
      Object.defineProperty(window, 'location', {
        value: {
          set href(value) {
            throw new Error('Failed to open email client');
          }
        },
        writable: true
      });

      renderEmailComposer();

      const sendButton = screen.getByRole('button', { name: /open in windows email/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to open email client/i)).toBeInTheDocument();
      });
    });
  });

  describe('Copy to Clipboard Functionality', () => {
    it('should copy email content to clipboard', async () => {
      renderEmailComposer();

      const copyButton = screen.getByRole('button', { name: /copy to clipboard/i });
      await userEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('To: john.smith@example.com')
        );
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('Subject:')
        );
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('Hi John')
        );
        expect(global.alert).toHaveBeenCalledWith('Email copied to clipboard!');
      });
    });

    it('should handle clipboard API failures', async () => {
      // Mock clipboard API failure
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard access denied'));

      renderEmailComposer();

      const copyButton = screen.getByRole('button', { name: /copy to clipboard/i });
      await userEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to copy to clipboard/i)).toBeInTheDocument();
      });
    });

    it('should disable copy button when no content', async () => {
      renderEmailComposer();

      const bodyTextarea = screen.getByLabelText(/message/i);
      await userEvent.clear(bodyTextarea);

      const copyButton = screen.getByRole('button', { name: /copy to clipboard/i });
      expect(copyButton).toBeDisabled();
    });
  });

  describe('Theme Support', () => {
    it('should render correctly in dark mode', () => {
      const ThemeProviderWithDarkMode = ({ children }) => (
        <ThemeProvider value={{ isDarkMode: true }}>
          {children}
        </ThemeProvider>
      );

      render(
        <ThemeProviderWithDarkMode>
          <EmailComposer
            isVisible={true}
            leadData={mockLeadData}
            onClose={mockOnClose}
            onSend={mockOnSend}
          />
        </ThemeProviderWithDarkMode>
      );

      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toHaveClass('bg-gray-800');
    });

    it('should render correctly in light mode', () => {
      const ThemeProviderWithLightMode = ({ children }) => (
        <ThemeProvider value={{ isDarkMode: false }}>
          {children}
        </ThemeProvider>
      );

      render(
        <ThemeProviderWithLightMode>
          <EmailComposer
            isVisible={true}
            leadData={mockLeadData}
            onClose={mockOnClose}
            onSend={mockOnSend}
          />
        </ThemeProviderWithLightMode>
      );

      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toHaveClass('bg-white');
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels', () => {
      renderEmailComposer();

      expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email template/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderEmailComposer();

      const toInput = screen.getByLabelText(/to/i);
      const subjectInput = screen.getByLabelText(/subject/i);
      const bodyTextarea = screen.getByLabelText(/message/i);
      const sendButton = screen.getByRole('button', { name: /open in windows email/i });

      // Tab through fields
      toInput.focus();
      expect(document.activeElement).toBe(toInput);

      await userEvent.tab();
      expect(document.activeElement).toBe(screen.getByRole('combobox'));

      await userEvent.tab();
      expect(document.activeElement).toBe(subjectInput);

      await userEvent.tab();
      expect(document.activeElement).toBe(bodyTextarea);
    });

    it('should handle focus management properly', async () => {
      renderEmailComposer();

      const closeButton = screen.getByRole('button', { name: '✕' });
      
      await userEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', async () => {
      // Force an error by mocking window.location to throw
      Object.defineProperty(window, 'location', {
        value: {
          set href(value) {
            throw new Error('Test error');
          }
        },
        writable: true
      });

      renderEmailComposer();

      const sendButton = screen.getByRole('button', { name: /open in windows email/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to open email client/i)).toBeInTheDocument();
      });
    });

    it('should clear errors when component re-renders', async () => {
      const { rerender } = renderEmailComposer();

      // Cause an error first
      Object.defineProperty(window, 'location', {
        value: {
          set href(value) {
            throw new Error('Test error');
          }
        },
        writable: true
      });

      const sendButton = screen.getByRole('button', { name: /open in windows email/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to open email client/i)).toBeInTheDocument();
      });

      // Re-render component
      rerender(
        <ThemeProvider>
          <EmailComposer
            isVisible={true}
            leadData={mockLeadData}
            onClose={mockOnClose}
            onSend={mockOnSend}
          />
        </ThemeProvider>
      );

      // Error should be cleared
      expect(screen.queryByText(/failed to open email client/i)).not.toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('should render large email templates efficiently', async () => {
      const largeTemplate = 'A'.repeat(10000);
      
      const leadWithLargeData = {
        ...mockLeadData,
        company: largeTemplate
      };

      const startTime = performance.now();
      renderEmailComposer({ leadData: leadWithLargeData });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(new RegExp(largeTemplate))).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle rapid template switching', async () => {
      renderEmailComposer();

      const templateSelect = screen.getByRole('combobox');
      
      // Rapidly switch between templates
      const templates = ['followup', 'introduction', 'thankyou', 'proposal', 'custom'];
      
      for (const template of templates) {
        await userEvent.selectOptions(templateSelect, template);
        
        // Verify template applied
        await waitFor(() => {
          expect(templateSelect.value).toBe(template);
        });
      }
    });
  });

  describe('Data Persistence', () => {
    it('should not persist email data when component unmounts', () => {
      const { unmount } = renderEmailComposer();

      const subjectInput = screen.getByLabelText(/subject/i);
      expect(subjectInput.value).toBeTruthy();

      unmount();

      // Re-render component
      renderEmailComposer();

      // Should start fresh
      const newSubjectInput = screen.getByLabelText(/subject/i);
      expect(newSubjectInput.value).toBeTruthy(); // Should have template default
    });
  });

  describe('Integration with Lead Management', () => {
    it('should handle lead data updates', async () => {
      const { rerender } = renderEmailComposer();

      // Update lead data
      const updatedLeadData = {
        ...mockLeadData,
        name: 'Jane Updated',
        company: 'Updated Corp'
      };

      rerender(
        <ThemeProvider>
          <EmailComposer
            isVisible={true}
            leadData={updatedLeadData}
            onClose={mockOnClose}
            onSend={mockOnSend}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(/jane updated/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(/updated corp/i)).toBeInTheDocument();
      });
    });

    it('should handle missing lead data', () => {
      renderEmailComposer({ leadData: null });

      const toInput = screen.getByLabelText(/to/i);
      expect(toInput.value).toBe('');
    });
  });
});