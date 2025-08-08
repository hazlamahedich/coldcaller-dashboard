/**
 * Comprehensive Security Testing Suite
 * Testing & QA Engineer - Security Vulnerability Assessment
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  setupTest,
  createMaliciousFile,
  simulateError,
  createRateLimiter,
  testConfig
} from '../testSetup/testConfig';

// Import components for security testing
import AudioUploader from '../../components/AudioUploader';
import LeadPanel from '../../components/LeadPanel';
import NoteTakingSystem from '../../components/NoteTakingSystem';
import DialPad from '../../components/DialPad';

// Mock API calls for security testing
const mockAPI = {
  uploadAudio: jest.fn(),
  createLead: jest.fn(),
  updateNote: jest.fn(),
  makeCall: jest.fn()
};

jest.mock('../../services/api', () => ({
  uploadAudio: (...args) => mockAPI.uploadAudio(...args),
  createLead: (...args) => mockAPI.createLead(...args),
  updateNote: (...args) => mockAPI.updateNote(...args),
  makeCall: (...args) => mockAPI.makeCall(...args)
}));

describe('Comprehensive Security Testing Suite', () => {
  let testSetup;

  beforeEach(() => {
    testSetup = setupTest({
      enableAudio: true,
      enableNetwork: true,
      networkCondition: 'wifi'
    });

    // Reset all mocks
    Object.values(mockAPI).forEach(mock => mock.mockReset());

    // Setup CSP for testing
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', "default-src 'self'; script-src 'self' 'unsafe-inline'");
    document.head.appendChild(meta);
  });

  afterEach(() => {
    testSetup.cleanup();
    // Clean up CSP meta tag
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      cspMeta.remove();
    }
  });

  describe('File Upload Security', () => {
    test('should reject malicious executable files', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<AudioUploader />);

      const fileInput = screen.getByLabelText(/upload audio/i);
      const maliciousFile = createMaliciousFile('executable');

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [maliciousFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/file type not allowed/i)).toBeInTheDocument();
      });

      expect(mockAPI.uploadAudio).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should reject files with malicious script content', async () => {
      const user = userEvent.setup();
      render(<AudioUploader />);

      const fileInput = screen.getByLabelText(/upload audio/i);
      const scriptFile = createMaliciousFile('script');

      Object.defineProperty(fileInput, 'files', {
        value: [scriptFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/security violation detected/i)).toBeInTheDocument();
      });

      expect(mockAPI.uploadAudio).not.toHaveBeenCalled();
    });

    test('should enforce file size limits', async () => {
      const user = userEvent.setup();
      render(<AudioUploader />);

      const fileInput = screen.getByLabelText(/upload audio/i);
      const oversizedFile = createMaliciousFile('oversized');

      Object.defineProperty(fileInput, 'files', {
        value: [oversizedFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });

      expect(mockAPI.uploadAudio).not.toHaveBeenCalled();
    });

    test('should validate MIME type vs file extension', async () => {
      const user = userEvent.setup();
      render(<AudioUploader />);

      const fileInput = screen.getByLabelText(/upload audio/i);
      const mismatchedFile = createMaliciousFile('invalidType');

      Object.defineProperty(fileInput, 'files', {
        value: [mismatchedFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/file type mismatch/i)).toBeInTheDocument();
      });

      expect(mockAPI.uploadAudio).not.toHaveBeenCalled();
    });

    test('should scan files for embedded malicious content', async () => {
      const user = userEvent.setup();
      render(<AudioUploader />);

      // Create a file that appears legitimate but contains suspicious content
      const suspiciousContent = new Blob([
        'ID3\x03\x00\x00\x00', // MP3 header
        '<script>eval(atob("YWxlcnQoIlhTUyIp"))</script>', // Base64 encoded XSS
        '\x00'.repeat(1000) // Padding
      ]);
      
      const suspiciousFile = new File([suspiciousContent], 'legitimate.mp3', {
        type: 'audio/mp3'
      });

      const fileInput = screen.getByLabelText(/upload audio/i);
      
      Object.defineProperty(fileInput, 'files', {
        value: [suspiciousFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/suspicious content detected/i)).toBeInTheDocument();
      });

      expect(mockAPI.uploadAudio).not.toHaveBeenCalled();
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    test('should sanitize user input in lead name field', async () => {
      const user = userEvent.setup();
      const mockLead = {
        id: 'lead_123',
        name: '<script>alert("XSS")</script>',
        company: 'Test Company',
        phone: '+1-555-0123'
      };

      render(<LeadPanel lead={mockLead} />);

      // Verify script tag is not executed
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
      
      // Verify the content is escaped or sanitized
      const leadNameElement = screen.getByText(/alert.*XSS/);
      expect(leadNameElement.innerHTML).not.toContain('<script>');
      expect(leadNameElement.textContent).toContain('alert("XSS")'); // Text only, no script execution
    });

    test('should prevent XSS in note content', async () => {
      const user = userEvent.setup();
      render(<NoteTakingSystem leadId="lead_123" />);

      const noteInput = screen.getByRole('textbox');
      const xssPayload = '<img src="x" onerror="alert(\'XSS\')">';

      await user.type(noteInput, xssPayload);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify XSS payload is sanitized
      expect(mockAPI.updateNote).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.not.stringContaining('<img')
        })
      );
    });

    test('should sanitize data attributes', async () => {
      const maliciousData = {
        id: 'lead_123',
        name: 'John Smith',
        phone: '+1-555-0123',
        // Attempt to inject via data attribute
        customField: 'javascript:alert("XSS")'
      };

      render(<LeadPanel lead={maliciousData} />);

      const leadElement = screen.getByText('John Smith');
      const dataAttributes = Array.from(leadElement.attributes).filter(attr => 
        attr.name.startsWith('data-')
      );

      // Verify no javascript: protocols in data attributes
      dataAttributes.forEach(attr => {
        expect(attr.value).not.toMatch(/javascript:/i);
        expect(attr.value).not.toMatch(/data:/i);
        expect(attr.value).not.toMatch(/vbscript:/i);
      });
    });

    test('should prevent DOM-based XSS via URL parameters', () => {
      // Mock URL with XSS attempt
      const originalLocation = window.location;
      delete window.location;
      window.location = {
        ...originalLocation,
        search: '?lead=<script>alert("XSS")</script>',
        hash: '#<img src=x onerror=alert("XSS")>'
      };

      render(<LeadPanel />);

      // Verify no script execution from URL parameters
      const pageContent = document.body.innerHTML;
      expect(pageContent).not.toContain('<script>alert("XSS")</script>');
      expect(pageContent).not.toContain('<img src=x onerror=');

      // Restore original location
      window.location = originalLocation;
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should validate phone number format strictly', async () => {
      const user = userEvent.setup();
      render(<DialPad />);

      const phoneInput = screen.getByPlaceholderText(/phone number/i);
      
      // Test various malicious phone number formats
      const maliciousInputs = [
        'javascript:alert("XSS")',
        '"><script>alert("XSS")</script>',
        '+1-555-0123; DROP TABLE leads;',
        'sip:user@malicious.com;?header=<script>',
        '1-800-CALL\\x00\\x01\\x02' // Null bytes
      ];

      for (const maliciousInput of maliciousInputs) {
        await user.clear(phoneInput);
        await user.type(phoneInput, maliciousInput);
        
        const callButton = screen.getByRole('button', { name: /call/i });
        await user.click(callButton);

        // Verify input is rejected or sanitized
        expect(mockAPI.makeCall).not.toHaveBeenCalledWith(
          expect.stringContaining('script')
        );
        expect(mockAPI.makeCall).not.toHaveBeenCalledWith(
          expect.stringContaining('DROP')
        );
      }
    });

    test('should validate email addresses securely', async () => {
      const user = userEvent.setup();
      const leadData = { name: 'Test Lead', company: 'Test Co' };
      
      render(<LeadPanel lead={leadData} />);

      // Try to edit with malicious email
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      const emailInput = screen.getByLabelText(/email/i);
      const maliciousEmails = [
        'user@domain.com<script>alert("XSS")</script>',
        'user+<svg/onload=alert("XSS")>@domain.com',
        '"<script>alert(\\"XSS\\")</script>"@domain.com',
        'user@domain.com\r\nBcc: attacker@evil.com'
      ];

      for (const maliciousEmail of maliciousEmails) {
        await user.clear(emailInput);
        await user.type(emailInput, maliciousEmail);
        
        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        // Verify malicious content is rejected
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      }
    });

    test('should prevent SQL injection in search queries', async () => {
      const user = userEvent.setup();
      render(<LeadPanel />);

      // Mock search functionality
      const searchInput = screen.getByPlaceholderText(/search/i);
      const sqlInjectionAttempts = [
        "'; DROP TABLE leads; --",
        "' OR '1'='1",
        "' UNION SELECT password FROM users --",
        "'; INSERT INTO leads (name) VALUES ('hacked'); --"
      ];

      for (const injection of sqlInjectionAttempts) {
        await user.clear(searchInput);
        await user.type(searchInput, injection);
        
        fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter' });

        // Verify SQL injection is prevented (would depend on backend implementation)
        // In frontend, we mainly check that dangerous characters are escaped
        expect(searchInput.value).not.toContain('DROP TABLE');
        expect(searchInput.value).not.toContain('UNION SELECT');
      }
    });
  });

  describe('Authentication and Authorization', () => {
    test('should handle expired session tokens', async () => {
      const user = userEvent.setup();
      
      // Mock expired token response
      mockAPI.uploadAudio.mockRejectedValue({
        response: { status: 401, data: { message: 'Token expired' } }
      });

      render(<AudioUploader />);

      const fileInput = screen.getByLabelText(/upload audio/i);
      const validFile = new File(['audio data'], 'test.mp3', { type: 'audio/mp3' });

      Object.defineProperty(fileInput, 'files', {
        value: [validFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
        expect(screen.getByText(/please log in again/i)).toBeInTheDocument();
      });
    });

    test('should prevent unauthorized access to sensitive data', async () => {
      // Mock unauthorized response
      mockAPI.createLead.mockRejectedValue({
        response: { status: 403, data: { message: 'Insufficient permissions' } }
      });

      const user = userEvent.setup();
      render(<LeadPanel />);

      const addButton = screen.getByRole('button', { name: /add lead/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
      });
    });

    test('should validate JWT token format', () => {
      // Test JWT token validation
      const invalidTokens = [
        'invalid.token.format',
        'eyJhbGciOiJIUzI1NiJ9.invalid', // Invalid payload
        '', // Empty token
        'Bearer <script>alert("XSS")</script>', // XSS attempt in token
        'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoidGVzdCJ9.invalid_signature'
      ];

      invalidTokens.forEach(token => {
        localStorage.setItem('authToken', token);
        
        // Component should handle invalid tokens gracefully
        render(<LeadPanel />);
        
        // Should show authentication required message
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
        
        localStorage.removeItem('authToken');
      });
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    test('should handle rate limiting on API calls', async () => {
      const user = userEvent.setup();
      const rateLimiter = createRateLimiter(5, 1000); // 5 requests per second

      // Mock rate limiting response
      mockAPI.uploadAudio.mockImplementation(() => {
        rateLimiter();
        return Promise.resolve({ success: true });
      });

      render(<AudioUploader />);

      const fileInput = screen.getByLabelText(/upload audio/i);
      const validFile = new File(['audio data'], 'test.mp3', { type: 'audio/mp3' });

      // Rapidly trigger multiple uploads
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(fileInput, 'files', {
          value: [validFile],
          writable: false,
        });
        fireEvent.change(fileInput);
      }

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
        expect(screen.getByText(/please wait before trying again/i)).toBeInTheDocument();
      });
    });

    test('should prevent rapid form submission', async () => {
      const user = userEvent.setup();
      render(<NoteTakingSystem leadId="lead_123" />);

      const noteInput = screen.getByRole('textbox');
      const saveButton = screen.getByRole('button', { name: /save/i });

      await user.type(noteInput, 'Test note');

      // Rapidly click save button
      for (let i = 0; i < 5; i++) {
        await user.click(saveButton);
      }

      // Should only call API once due to debouncing/rate limiting
      expect(mockAPI.updateNote).toHaveBeenCalledTimes(1);
    });

    test('should handle large payload DoS attempts', async () => {
      const user = userEvent.setup();
      render(<NoteTakingSystem leadId="lead_123" />);

      const noteInput = screen.getByRole('textbox');
      
      // Attempt to input extremely large content
      const largeContent = 'x'.repeat(1000000); // 1MB of text
      
      await user.type(noteInput, largeContent);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/content too large/i)).toBeInTheDocument();
      });

      expect(mockAPI.updateNote).not.toHaveBeenCalled();
    });
  });

  describe('Content Security Policy (CSP) Compliance', () => {
    test('should comply with CSP directives', () => {
      render(<LeadPanel />);

      // Check that no inline scripts are executed
      const scriptTags = document.querySelectorAll('script');
      scriptTags.forEach(script => {
        if (script.src === '') {
          // Inline script - should not contain dangerous content
          expect(script.innerHTML).not.toContain('eval(');
          expect(script.innerHTML).not.toContain('Function(');
          expect(script.innerHTML).not.toContain('setTimeout(');
        }
      });
    });

    test('should prevent unsafe inline styles', () => {
      const maliciousComponent = () => (
        <div style={{ background: "url('javascript:alert(\"XSS\")')" }}>
          Test Content
        </div>
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(React.createElement(maliciousComponent));

      // CSP should block the malicious style
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Content Security Policy')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Data Privacy and GDPR Compliance', () => {
    test('should not log sensitive data to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const user = userEvent.setup();
      
      const sensitiveData = {
        id: 'lead_123',
        name: 'John Doe',
        phone: '+1-555-0123',
        email: 'john@example.com',
        ssn: '123-45-6789', // Sensitive data
        creditCard: '4111-1111-1111-1111' // Sensitive data
      };

      render(<LeadPanel lead={sensitiveData} />);

      // Trigger various actions that might log data
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify sensitive data is not logged
      const allLogs = consoleSpy.mock.calls.flat().join(' ');
      expect(allLogs).not.toContain('123-45-6789');
      expect(allLogs).not.toContain('4111-1111-1111-1111');

      consoleSpy.mockRestore();
    });

    test('should sanitize data in error messages', async () => {
      const user = userEvent.setup();
      
      // Mock error with sensitive data
      mockAPI.createLead.mockRejectedValue(new Error(
        'Database error: INSERT failed for john@example.com with SSN 123-45-6789'
      ));

      render(<LeadPanel />);

      const addButton = screen.getByRole('button', { name: /add lead/i });
      await user.click(addButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/error/i);
        // Error message should not contain sensitive data
        expect(errorMessage.textContent).not.toContain('123-45-6789');
        expect(errorMessage.textContent).not.toContain('john@example.com');
      });
    });
  });

  describe('Secure Communication', () => {
    test('should enforce HTTPS for API calls', () => {
      // Mock network request interception
      const originalFetch = global.fetch;
      const fetchSpy = jest.fn();
      
      global.fetch = fetchSpy;

      render(<LeadPanel />);

      // Verify that API calls use HTTPS
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\//),
        expect.any(Object)
      );

      global.fetch = originalFetch;
    });

    test('should validate SSL certificates', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock SSL certificate error
      mockAPI.createLead.mockRejectedValue({
        code: 'CERT_UNTRUSTED',
        message: 'Certificate verification failed'
      });

      const user = userEvent.setup();
      render(<LeadPanel />);

      const addButton = screen.getByRole('button', { name: /add lead/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/secure connection failed/i)).toBeInTheDocument();
        expect(screen.getByText(/please check your network/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Browser Security Features', () => {
    test('should set secure headers for sensitive operations', () => {
      render(<AudioUploader />);

      // Check for security-related attributes
      const form = document.querySelector('form');
      if (form) {
        expect(form.getAttribute('novalidate')).toBeNull();
        expect(form.getAttribute('autocomplete')).toBe('off');
      }
    });

    test('should prevent clickjacking with frame-busting', () => {
      // Verify frame-busting code is present
      expect(window.self).toBe(window.top);
      
      // Check for X-Frame-Options equivalent behavior
      if (window.self !== window.top) {
        expect(window.location.href).toBe(window.top.location.href);
      }
    });

    test('should disable autocomplete for sensitive fields', () => {
      render(<LeadPanel />);

      const phoneInput = screen.getByDisplayValue(/555-0123/);
      expect(phoneInput.getAttribute('autocomplete')).toBe('off');
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose stack traces to users', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock a server error with stack trace
      mockAPI.createLead.mockRejectedValue(new Error(`
        Error: Database connection failed
        at Connection.connect (/app/db/connection.js:45:12)
        at async LeadService.create (/app/services/leadService.js:23:5)
        at async LeadController.createLead (/app/controllers/leadController.js:15:3)
      `));

      const user = userEvent.setup();
      render(<LeadPanel />);

      const addButton = screen.getByRole('button', { name: /add lead/i });
      await user.click(addButton);

      await waitFor(() => {
        const errorElements = screen.getAllByText(/error/i);
        errorElements.forEach(element => {
          // Should not show file paths or stack traces
          expect(element.textContent).not.toContain('/app/');
          expect(element.textContent).not.toContain('.js:');
          expect(element.textContent).not.toMatch(/at \w+\./);
        });
      });

      consoleSpy.mockRestore();
    });

    test('should log security events for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(<AudioUploader />);

      const fileInput = screen.getByLabelText(/upload audio/i);
      const maliciousFile = createMaliciousFile('executable');

      Object.defineProperty(fileInput, 'files', {
        value: [maliciousFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        // Security events should be logged for monitoring
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Security.*violation.*detected/i)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});