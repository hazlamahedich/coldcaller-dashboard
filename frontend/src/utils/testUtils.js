import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Custom render function with common providers
export const renderWithProviders = (ui, options = {}) => {
  // Add any providers here (Redux, Router, Theme, etc.) when needed
  return render(ui, options);
};

// Helper to setup user event
export const setupUser = () => userEvent.setup();

// Helper to wait for async operations
export const waitForAsync = async () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Mock data generators
export const generateMockLead = (overrides = {}) => ({
  id: Math.random(),
  name: 'Test User',
  company: 'Test Company',
  phone: '(555) 555-5555',
  email: 'test@example.com',
  status: 'New',
  lastContact: 'Never',
  notes: 'Test notes',
  ...overrides
});

export const generateMockScript = (overrides = {}) => ({
  title: 'Test Script',
  color: 'blue',
  text: 'This is a test script with [PLACEHOLDER] values.',
  ...overrides
});

export const generateMockAudioClip = (overrides = {}) => ({
  id: Math.random(),
  name: 'Test Clip',
  duration: '0:15',
  ...overrides
});

// Common test assertions
export const expectButtonToBeDisabled = (button) => {
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('disabled');
};

export const expectButtonToBeEnabled = (button) => {
  expect(button).not.toBeDisabled();
  expect(button).not.toHaveAttribute('disabled');
};

// Mock timers helper
export const runWithFakeTimers = async (callback) => {
  jest.useFakeTimers();
  try {
    await callback();
  } finally {
    jest.useRealTimers();
  }
};

// Console spy helpers
export const mockConsole = () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const logSpy = jest.spyOn(console, 'log').mockImplementation();
  const errorSpy = jest.spyOn(console, 'error').mockImplementation();
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  
  return {
    logSpy,
    errorSpy,
    warnSpy,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
};

// Accessibility testing helper
export const checkA11y = async (container) => {
  // Basic accessibility checks
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    // Buttons should have accessible text or aria-label
    const hasText = button.textContent.trim().length > 0;
    const hasAriaLabel = button.hasAttribute('aria-label');
    expect(hasText || hasAriaLabel).toBe(true);
  });
  
  // Check for proper heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach(heading => {
    const level = parseInt(heading.tagName[1]);
    expect(level).toBeLessThanOrEqual(lastLevel + 1);
    lastLevel = level;
  });
};

// Form testing helpers
export const fillInput = async (user, input, value) => {
  await user.clear(input);
  await user.type(input, value);
};

export const submitForm = async (user, form) => {
  const submitButton = form.querySelector('button[type="submit"]') || 
                       form.querySelector('button:last-child');
  await user.click(submitButton);
};

// Component state testing helpers
export const getComponentState = (component) => {
  // Helper to extract React component state for testing
  // Note: This is a simplified version, actual implementation would depend on React version
  return component.state || {};
};

// Network mock helpers
export const mockFetch = (response) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve(response),
      ok: true,
      status: 200,
    })
  );
};

export const mockFailedFetch = (error = 'Network error') => {
  global.fetch = jest.fn(() => Promise.reject(new Error(error)));
};

// Local storage mock
export const mockLocalStorage = () => {
  const storage = {};
  
  return {
    getItem: jest.fn((key) => storage[key] || null),
    setItem: jest.fn((key, value) => {
      storage[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    get storage() {
      return storage;
    }
  };
};

// Export all helpers
export default {
  renderWithProviders,
  setupUser,
  waitForAsync,
  generateMockLead,
  generateMockScript,
  generateMockAudioClip,
  expectButtonToBeDisabled,
  expectButtonToBeEnabled,
  runWithFakeTimers,
  mockConsole,
  checkA11y,
  fillInput,
  submitForm,
  getComponentState,
  mockFetch,
  mockFailedFetch,
  mockLocalStorage
};