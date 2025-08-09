import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Setup the mock before running tests
beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
});

const renderThemeToggle = () => {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
};

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    document.documentElement.setAttribute('data-theme', 'light');
  });

  test('renders theme toggle button', () => {
    renderThemeToggle();
    
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveClass('theme-toggle');
  });

  test('displays correct title for light mode', () => {
    renderThemeToggle();
    
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveAttribute('title', 'Switch to dark mode');
  });

  test('contains sun and moon icons', () => {
    renderThemeToggle();
    
    // Check for SVG elements (sun and moon icons)
    const svgElements = screen.getAllByRole('img', { hidden: true });
    expect(svgElements).toHaveLength(2);
  });

  test('toggles theme when clicked', () => {
    renderThemeToggle();
    
    const toggleButton = screen.getByRole('button');
    
    // Initially should be in light mode
    expect(toggleButton).toHaveAttribute('title', 'Switch to dark mode');
    
    // Click to toggle to dark mode
    fireEvent.click(toggleButton);
    
    expect(toggleButton).toHaveAttribute('title', 'Switch to light mode');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('toggles back to light mode', () => {
    renderThemeToggle();
    
    const toggleButton = screen.getByRole('button');
    
    // Click twice to go to dark then back to light
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);
    
    expect(toggleButton).toHaveAttribute('title', 'Switch to dark mode');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  test('applies correct CSS classes for theme state', () => {
    renderThemeToggle();
    
    const toggleButton = screen.getByRole('button');
    
    // Check initial light mode classes
    const sunIcon = toggleButton.querySelector('.text-yellow-500');
    const moonIcon = toggleButton.querySelector('.text-blue-500');
    const toggleBall = toggleButton.querySelector('.absolute');
    
    expect(sunIcon).toHaveClass('opacity-100');
    expect(moonIcon).toHaveClass('opacity-50');
    expect(toggleBall).toHaveClass('left-1');
    
    // Toggle to dark mode
    fireEvent.click(toggleButton);
    
    expect(sunIcon).toHaveClass('opacity-50');
    expect(moonIcon).toHaveClass('opacity-100');
    expect(toggleBall).toHaveClass('left-8');
  });

  test('loads saved theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    
    renderThemeToggle();
    
    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toHaveAttribute('title', 'Switch to light mode');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('respects system preference when no saved theme', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock prefers dark mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    
    renderThemeToggle();
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});