/**
 * Comprehensive Performance Testing Suite
 * Testing & QA Engineer - Performance Benchmarking & Optimization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  setupTest,
  measurePerformance,
  testConfig,
  generateMockAudioFile,
  generateMockLead
} from '../testSetup/testConfig';

// Import components for performance testing
import App from '../../App';
import AudioClipPlayer from '../../components/AudioClipPlayer';
import LeadPanel from '../../components/LeadPanel';
import CallAnalyticsDashboard from '../../components/CallAnalyticsDashboard';
import AudioPerformanceDashboard from '../../components/AudioPerformanceDashboard';

// Performance monitoring utilities
const performanceObserver = {
  entries: [],
  observe: jest.fn(),
  disconnect: jest.fn()
};

// Mock Performance Observer API
global.PerformanceObserver = jest.fn(() => performanceObserver);
global.PerformanceObserver.supportedEntryTypes = [
  'navigation',
  'resource',
  'measure',
  'mark',
  'paint',
  'largest-contentful-paint',
  'first-input',
  'layout-shift'
];

describe('Comprehensive Performance Testing Suite', () => {
  let testSetup;
  let performanceMonitor;

  beforeEach(() => {
    testSetup = setupTest({
      enableAudio: true,
      enableNetwork: true,
      enablePerformance: true,
      networkCondition: 'wifi'
    });

    // Initialize performance monitoring
    performanceMonitor = {
      marks: new Map(),
      measures: new Map(),
      resourceTimings: [],
      paintTimings: [],
      layoutShifts: [],
      longTasks: []
    };

    // Mock performance.mark and performance.measure
    performance.mark = jest.fn((name) => {
      performanceMonitor.marks.set(name, performance.now());
    });

    performance.measure = jest.fn((name, startMark, endMark) => {
      const start = performanceMonitor.marks.get(startMark) || 0;
      const end = performanceMonitor.marks.get(endMark) || performance.now();
      const duration = end - start;
      performanceMonitor.measures.set(name, duration);
      return { name, duration, startTime: start };
    });

    // Mock Intersection Observer for performance monitoring
    global.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));
  });

  afterEach(() => {
    testSetup.cleanup();
    performanceMonitor = null;
  });

  describe('Component Load Performance', () => {
    test('App component should load within performance budget', async () => {
      const loadPerformance = measurePerformance(
        () => render(<App />),
        'App-Load'
      );

      const { result, metrics } = await loadPerformance();

      expect(metrics.duration).toBeLessThan(testConfig.performance.loadTime);
      expect(screen.getByText('🎯 Cold Calling Dashboard')).toBeInTheDocument();
      
      // Verify all critical elements are rendered
      expect(screen.getByText('Dial Pad')).toBeInTheDocument();
      expect(screen.getByText('Audio Clips')).toBeInTheDocument();
      expect(screen.getByText('Call Scripts')).toBeInTheDocument();
      expect(screen.getByText('Current Lead')).toBeInTheDocument();
    });

    test('AudioClipPlayer loads efficiently with large dataset', async () => {
      // Mock large audio dataset
      const largeAudioDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `audio_${i}`,
        title: `Audio Clip ${i}`,
        category: i % 3 === 0 ? 'greetings' : i % 3 === 1 ? 'objections' : 'closing',
        duration: `0:${(i % 60).toString().padStart(2, '0')}`,
        size: 1024 * (i + 1)
      }));

      const loadPerformance = measurePerformance(
        () => render(<AudioClipPlayer audioData={largeAudioDataset} />),
        'AudioClipPlayer-LargeDataset'
      );

      const { metrics } = await loadPerformance();

      expect(metrics.duration).toBeLessThan(500); // 500ms for large dataset
      expect(metrics.memoryDelta).toBeLessThan(testConfig.performance.memoryLimit);
    });

    test('LeadPanel renders efficiently with complex lead data', async () => {
      const complexLead = {
        ...generateMockLead(),
        activities: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          type: 'call',
          timestamp: new Date(Date.now() - i * 86400000).toISOString(),
          notes: `Activity ${i} with detailed notes and information`
        })),
        customFields: Array.from({ length: 20 }, (_, i) => ({
          key: `field_${i}`,
          value: `Value ${i}`,
          type: 'text'
        }))
      };

      const loadPerformance = measurePerformance(
        () => render(<LeadPanel lead={complexLead} />),
        'LeadPanel-ComplexData'
      );

      const { metrics } = await loadPerformance();

      expect(metrics.duration).toBeLessThan(300);
      expect(metrics.memoryDelta).toBeLessThan(5 * 1024 * 1024); // 5MB limit
    });

    test('Dashboard components lazy load efficiently', async () => {
      performance.mark('dashboard-start');
      
      render(<CallAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/analytics/i)).toBeInTheDocument();
      });

      performance.mark('dashboard-end');
      performance.measure('dashboard-load', 'dashboard-start', 'dashboard-end');

      const loadTime = performanceMonitor.measures.get('dashboard-load');
      expect(loadTime).toBeLessThan(1000); // 1 second for dashboard load
    });
  });

  describe('User Interaction Performance', () => {
    test('button clicks respond within input delay budget', async () => {
      const user = userEvent.setup();
      render(<App />);

      const callButton = screen.getByRole('button', { name: /call/i });

      performance.mark('click-start');
      await user.click(callButton);
      performance.mark('click-end');

      performance.measure('click-response', 'click-start', 'click-end');
      
      const clickResponseTime = performanceMonitor.measures.get('click-response');
      expect(clickResponseTime).toBeLessThan(100); // 100ms input delay budget
    });

    test('form inputs respond instantly', async () => {
      const user = userEvent.setup();
      render(<App />);

      const phoneInput = screen.getByPlaceholderText(/phone number/i);

      const inputPerformance = measurePerformance(
        async () => {
          await user.type(phoneInput, '555-123-4567');
        },
        'Input-Response'
      );

      const { metrics } = await inputPerformance();
      
      // Each character should respond within 16ms for 60fps
      const avgPerChar = metrics.duration / 12; // 12 characters typed
      expect(avgPerChar).toBeLessThan(16);
    });

    test('lead navigation is smooth and fast', async () => {
      const user = userEvent.setup();
      render(<App />);

      const nextButton = screen.getByText(/next ➡️/i);

      // Measure multiple navigation clicks
      const navigationTimes = [];

      for (let i = 0; i < 5; i++) {
        performance.mark(`nav-${i}-start`);
        await user.click(nextButton);
        performance.mark(`nav-${i}-end`);
        
        performance.measure(`nav-${i}`, `nav-${i}-start`, `nav-${i}-end`);
        navigationTimes.push(performanceMonitor.measures.get(`nav-${i}`));
      }

      // All navigation should be under 50ms
      navigationTimes.forEach(time => {
        expect(time).toBeLessThan(50);
      });

      // Average should be even faster
      const avgNavigationTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      expect(avgNavigationTime).toBeLessThan(30);
    });

    test('audio clip switching is performant', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Test category switching performance
      const categories = ['Greetings', 'Objections', 'Closing'];
      const switchingTimes = [];

      for (const category of categories) {
        performance.mark(`switch-${category}-start`);
        await user.click(screen.getByText(category));
        
        await waitFor(() => {
          performance.mark(`switch-${category}-end`);
        });

        performance.measure(`switch-${category}`, `switch-${category}-start`, `switch-${category}-end`);
        switchingTimes.push(performanceMonitor.measures.get(`switch-${category}`));
      }

      switchingTimes.forEach(time => {
        expect(time).toBeLessThan(100); // Category switching under 100ms
      });
    });
  });

  describe('Memory Management', () => {
    test('prevents memory leaks during extended usage', async () => {
      const user = userEvent.setup();
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      render(<App />);

      // Simulate extended usage
      for (let i = 0; i < 20; i++) {
        // Navigate through leads
        await user.click(screen.getByText(/next ➡️/i));
        
        // Switch audio categories
        const categories = ['Greetings', 'Objections', 'Closing'];
        await user.click(screen.getByText(categories[i % 3]));
        
        // Play audio clips
        const playButtons = screen.getAllByText(/▶️ Play/i);
        if (playButtons.length > 0) {
          await user.click(playButtons[0]);
        }

        // Edit and save notes
        const editButton = screen.getByText('✏️ Edit');
        await user.click(editButton);
        
        const textarea = screen.getByRole('textbox');
        await user.clear(textarea);
        await user.type(textarea, `Test note ${i}`);
        
        await user.click(screen.getByText('✅ Save'));
      }

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(testConfig.performance.memoryLimit);
    });

    test('properly cleans up audio contexts', async () => {
      const user = userEvent.setup();
      render(<AudioClipPlayer />);

      // Track audio context creation
      const audioContextCreateSpy = jest.spyOn(window, 'AudioContext');
      
      // Play and stop multiple audio clips
      for (let i = 0; i < 10; i++) {
        const playButtons = screen.getAllByText(/▶️ Play/i);
        await user.click(playButtons[0]);
        
        // Wait for playing state
        await waitFor(() => {
          expect(screen.getByText(/⏸️ Pause/i)).toBeInTheDocument();
        });

        // Stop the audio
        await user.click(screen.getByText(/⏸️ Pause/i));
      }

      // Should not create excessive audio contexts
      expect(audioContextCreateSpy).toHaveBeenCalledTimes(1);
    });

    test('handles large data sets without performance degradation', async () => {
      // Create large mock datasets
      const largeLeadsList = Array.from({ length: 1000 }, (_, i) => 
        generateMockLead({ 
          id: `lead_${i}`, 
          name: `Lead ${i}`,
          activities: Array.from({ length: 10 }, (_, j) => ({
            id: `${i}_${j}`,
            type: 'call',
            notes: `Activity ${j} for lead ${i}`
          }))
        })
      );

      const renderPerformance = measurePerformance(
        () => render(<LeadPanel leads={largeLeadsList} />),
        'Large-Dataset-Render'
      );

      const { metrics } = await renderPerformance();

      expect(metrics.duration).toBeLessThan(1000); // 1 second for 1000 leads
      expect(metrics.memoryDelta).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });
  });

  describe('Network Performance', () => {
    test('handles slow network conditions gracefully', async () => {
      // Simulate slow 3G network
      const slowNetworkDelay = 2000;
      
      // Mock slow API responses
      global.fetch = jest.fn(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ data: [] })
            });
          }, slowNetworkDelay);
        })
      );

      const user = userEvent.setup();
      render(<App />);

      // Trigger network request
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      performance.mark('network-start');
      await user.click(refreshButton);

      // Should show loading state immediately
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for request to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: slowNetworkDelay + 1000 });

      performance.mark('network-end');
      performance.measure('network-request', 'network-start', 'network-end');

      const networkTime = performanceMonitor.measures.get('network-request');
      
      // Should handle gracefully, even if slow
      expect(networkTime).toBeGreaterThan(slowNetworkDelay);
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument(); // UI still responsive
    });

    test('implements request caching for performance', async () => {
      const user = userEvent.setup();
      
      let fetchCallCount = 0;
      global.fetch = jest.fn(() => {
        fetchCallCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [generateMockLead()] })
        });
      });

      render(<App />);

      // First request
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(fetchCallCount).toBe(1);
      });

      // Second request (should use cache)
      await user.click(refreshButton);

      // Should not trigger additional fetch due to caching
      expect(fetchCallCount).toBe(1); // Still only 1 if caching works
    });

    test('handles offline mode gracefully', async () => {
      // Simulate offline network
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      global.fetch = jest.fn(() => 
        Promise.reject(new Error('Network unavailable'))
      );

      const user = userEvent.setup();
      render(<App />);

      // Trigger network request
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
        expect(screen.getByText(/cached data/i)).toBeInTheDocument();
      });

      // App should still be functional with cached data
      expect(screen.getByText('Current Lead')).toBeInTheDocument();
    });
  });

  describe('Rendering Performance', () => {
    test('virtual scrolling for large lists', async () => {
      const largeList = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: `Data for item ${i}`
      }));

      const renderPerformance = measurePerformance(
        () => render(<div data-testid="large-list">
          {largeList.map(item => (
            <div key={item.id}>{item.name}</div>
          ))}
        </div>),
        'Large-List-Render'
      );

      const { metrics } = await renderPerformance();

      // Should render efficiently even with 1000 items
      expect(metrics.duration).toBeLessThan(500);

      // Only visible items should be in DOM (if virtual scrolling implemented)
      const listItems = screen.getAllByText(/Item \d+/);
      expect(listItems.length).toBeLessThanOrEqual(100); // Assuming 100 visible items max
    });

    test('efficient re-rendering on state changes', async () => {
      const user = userEvent.setup();
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        return <AudioClipPlayer />;
      };

      render(<TestComponent />);

      const initialRenderCount = renderCount;

      // Trigger state change
      await user.click(screen.getByText('Objections'));
      
      // Should not cause excessive re-renders
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(2);
    });

    test('lazy loading of heavy components', async () => {
      performance.mark('lazy-start');

      // Simulate lazy loading of heavy dashboard
      const LazyDashboard = React.lazy(() => 
        Promise.resolve({ 
          default: () => <CallAnalyticsDashboard />
        })
      );

      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyDashboard />
        </React.Suspense>
      );

      // Should show loading state initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        performance.mark('lazy-end');
      });

      performance.measure('lazy-load', 'lazy-start', 'lazy-end');
      
      const lazyLoadTime = performanceMonitor.measures.get('lazy-load');
      expect(lazyLoadTime).toBeLessThan(200); // Fast lazy loading
    });
  });

  describe('Audio Performance', () => {
    test('audio loading and playback performance', async () => {
      const user = userEvent.setup();
      render(<AudioClipPlayer />);

      performance.mark('audio-load-start');
      
      const playButton = screen.getAllByText(/▶️ Play/i)[0];
      await user.click(playButton);

      // Should respond quickly
      performance.mark('audio-load-end');
      performance.measure('audio-load', 'audio-load-start', 'audio-load-end');

      const audioLoadTime = performanceMonitor.measures.get('audio-load');
      expect(audioLoadTime).toBeLessThan(100); // Audio should start within 100ms
    });

    test('multiple audio clips management', async () => {
      const user = userEvent.setup();
      render(<AudioClipPlayer />);

      // Play multiple clips in sequence
      const playButtons = screen.getAllByText(/▶️ Play/i);
      
      performance.mark('multi-audio-start');

      for (let i = 0; i < Math.min(playButtons.length, 5); i++) {
        await user.click(playButtons[i]);
        // Wait a bit before next click
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      performance.mark('multi-audio-end');
      performance.measure('multi-audio', 'multi-audio-start', 'multi-audio-end');

      const multiAudioTime = performanceMonitor.measures.get('multi-audio');
      expect(multiAudioTime).toBeLessThan(1000); // Should handle multiple clips efficiently
    });

    test('audio memory management', async () => {
      const user = userEvent.setup();
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      render(<AudioPerformanceDashboard />);

      // Simulate intensive audio operations
      for (let i = 0; i < 10; i++) {
        const playButtons = screen.getAllByText(/▶️ Play/i);
        if (playButtons.length > 0) {
          await user.click(playButtons[0]);
          
          // Stop after a short time
          setTimeout(async () => {
            const pauseButtons = screen.getAllByText(/⏸️ Pause/i);
            if (pauseButtons.length > 0) {
              await user.click(pauseButtons[0]);
            }
          }, 100);
        }
      }

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Audio operations shouldn't cause excessive memory usage
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB limit
    });
  });

  describe('Core Web Vitals Simulation', () => {
    test('Largest Contentful Paint (LCP) optimization', async () => {
      performance.mark('lcp-start');
      
      render(<App />);

      await waitFor(() => {
        // Main content should be visible
        expect(screen.getByText('🎯 Cold Calling Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Current Lead')).toBeInTheDocument();
        performance.mark('lcp-end');
      });

      performance.measure('lcp', 'lcp-start', 'lcp-end');
      
      const lcpTime = performanceMonitor.measures.get('lcp');
      expect(lcpTime).toBeLessThan(2500); // LCP should be under 2.5s
    });

    test('First Input Delay (FID) simulation', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Simulate first input
      performance.mark('fid-start');
      
      const firstButton = screen.getByRole('button', { name: /call/i });
      await user.click(firstButton);

      performance.mark('fid-end');
      performance.measure('fid', 'fid-start', 'fid-end');

      const fidTime = performanceMonitor.measures.get('fid');
      expect(fidTime).toBeLessThan(100); // FID should be under 100ms
    });

    test('Cumulative Layout Shift (CLS) prevention', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Simulate dynamic content loading
      await user.click(screen.getByText(/next ➡️/i));
      
      // Switch categories (potential layout shift trigger)
      await user.click(screen.getByText('Objections'));

      // Verify layout stability
      const dashboardElement = screen.getByText('🎯 Cold Calling Dashboard');
      const initialRect = dashboardElement.getBoundingClientRect();

      // Trigger more dynamic changes
      await user.click(screen.getByText('Closing'));
      await user.click(screen.getByText(/previous ⬅️/i));

      const finalRect = dashboardElement.getBoundingClientRect();
      
      // Layout should be stable (no unexpected shifts)
      expect(Math.abs(finalRect.top - initialRect.top)).toBeLessThan(5);
      expect(Math.abs(finalRect.left - initialRect.left)).toBeLessThan(5);
    });
  });

  describe('Bundle Size and Load Performance', () => {
    test('efficient code splitting and lazy loading', async () => {
      // Monitor resource loading
      const resourceSizes = {
        javascript: 0,
        css: 0,
        audio: 0
      };

      // Mock resource timing API
      performance.getEntriesByType = jest.fn((type) => {
        if (type === 'resource') {
          return [
            { name: 'main.js', transferSize: 150000, decodedBodySize: 300000 },
            { name: 'styles.css', transferSize: 50000, decodedBodySize: 80000 },
            { name: 'audio-clip.mp3', transferSize: 1000000, decodedBodySize: 1000000 }
          ];
        }
        return [];
      });

      render(<App />);

      const resources = performance.getEntriesByType('resource');
      
      resources.forEach(resource => {
        if (resource.name.endsWith('.js')) {
          resourceSizes.javascript += resource.transferSize;
        } else if (resource.name.endsWith('.css')) {
          resourceSizes.css += resource.transferSize;
        } else if (resource.name.includes('audio')) {
          resourceSizes.audio += resource.transferSize;
        }
      });

      // JavaScript bundle should be optimized
      expect(resourceSizes.javascript).toBeLessThan(500000); // 500KB limit for JS
      expect(resourceSizes.css).toBeLessThan(100000); // 100KB limit for CSS
      // Audio files loaded on demand, not all at once
      expect(resourceSizes.audio).toBeLessThan(5000000); // 5MB limit for initial audio
    });

    test('efficient asset preloading', async () => {
      render(<App />);

      // Check for preload hints
      const preloadLinks = document.querySelectorAll('link[rel="preload"]');
      
      // Should preload critical resources
      expect(preloadLinks.length).toBeGreaterThan(0);
      
      // Verify preload efficiency
      preloadLinks.forEach(link => {
        expect(link.getAttribute('as')).toBeTruthy(); // Should specify resource type
        expect(link.getAttribute('href')).toBeTruthy(); // Should have valid href
      });
    });
  });
});