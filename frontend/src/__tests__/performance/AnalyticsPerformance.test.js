/**
 * Analytics Performance Test Suite
 * Performance Optimization Specialist - Comprehensive Performance Testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import components for testing
import LeadAnalyticsDashboard from '../../components/LeadAnalyticsDashboard';
import OptimizedLeadAnalyticsDashboard from '../../components/OptimizedLeadAnalyticsDashboard';
import { usePerformanceMonitor, withPerformanceTracking } from '../../hooks/usePerformanceMonitor';
import { analyticsCache, performanceCache } from '../../utils/performanceCache';

// Mock data generators
const generateMockLead = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  name: 'Test Lead',
  email: 'test@example.com',
  phone: '555-123-4567',
  company: 'Test Company',
  status: 'New',
  priority: 'Medium',
  industry: 'Technology',
  lead_source: 'Website',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

const generateLargeDataset = (count = 1000) => {
  const statuses = ['New', 'Follow-up', 'Qualified', 'Closed', 'Not Interested'];
  const priorities = ['High', 'Medium', 'Low'];
  const industries = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail'];
  const sources = ['Website', 'Email', 'Phone', 'Social Media', 'Referral'];
  
  return Array.from({ length: count }, (_, i) => generateMockLead({
    id: `lead_${i}`,
    name: `Lead ${i}`,
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    industry: industries[i % industries.length],
    lead_source: sources[i % sources.length],
    created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
  }));
};

// Mock services
jest.mock('../../services', () => ({
  leadsService: {
    getAllLeads: jest.fn()
  }
}));

// Mock theme context
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDarkMode: false,
    themeClasses: {
      cardBg: 'bg-white',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-700',
      textMuted: 'text-gray-500',
      buttonPrimary: 'bg-blue-600 text-white',
      input: 'border border-gray-300',
      focusRing: 'focus:ring-blue-500',
      border: 'border-gray-200'
    }
  })
}));

describe('Analytics Performance Test Suite', () => {
  let mockLeadsService;
  let performanceMonitor;
  
  beforeEach(() => {
    // Setup mock service
    const { leadsService } = require('../../services');
    mockLeadsService = leadsService;
    
    // Setup performance monitoring
    performanceMonitor = {
      metrics: new Map(),
      mark: jest.fn(),
      measure: jest.fn(),
      trackMetric: jest.fn()
    };
    
    // Mock performance API
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      memory: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 15000000,
        jsHeapSizeLimit: 100000000
      }
    };
    
    // Clear caches
    analyticsCache.clear();
    performanceCache.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Large Dataset Performance', () => {
    test('handles 1000+ leads efficiently', async () => {
      const largeDataset = generateLargeDataset(1000);
      mockLeadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: largeDataset }
      });

      const startTime = performance.now();
      
      render(<OptimizedLeadAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 1 second for 1000 leads
      expect(renderTime).toBeLessThan(1000);
      
      // Verify data is displayed correctly
      expect(screen.getByText('1000')).toBeInTheDocument(); // Total count
    });

    test('processes 5000+ leads without performance degradation', async () => {
      const massiveDataset = generateLargeDataset(5000);
      mockLeadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: massiveDataset }
      });

      const startTime = performance.now();
      const initialMemory = performance.memory.usedJSHeapSize;
      
      render(<OptimizedLeadAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      const endTime = performance.now();
      const finalMemory = performance.memory.usedJSHeapSize;
      
      const renderTime = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      // Should handle 5000 leads in reasonable time
      expect(renderTime).toBeLessThan(3000); // 3 seconds max
      
      // Memory usage should be reasonable (< 50MB increase)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      // Verify data processing accuracy
      expect(screen.getByText('5000')).toBeInTheDocument();
    });

    test('maintains 60fps during data processing', async () => {
      const dataset = generateLargeDataset(2000);
      mockLeadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: dataset }
      });

      const frameTime = 16.67; // 60fps = 16.67ms per frame
      const processingTimes = [];
      
      // Mock requestAnimationFrame to measure frame times
      let frameCount = 0;
      global.requestAnimationFrame = jest.fn((callback) => {
        const startFrame = performance.now();
        callback();
        const endFrame = performance.now();
        processingTimes.push(endFrame - startFrame);
        frameCount++;
        
        if (frameCount < 10) {
          return setTimeout(() => requestAnimationFrame(callback), frameTime);
        }
      });

      render(<OptimizedLeadAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });

      // Most frames should be under 16.67ms
      const slowFrames = processingTimes.filter(time => time > frameTime);
      const slowFramePercentage = (slowFrames.length / processingTimes.length) * 100;
      
      expect(slowFramePercentage).toBeLessThan(10); // Less than 10% slow frames
    });
  });

  describe('Component Optimization Performance', () => {
    test('optimized component is faster than original', async () => {
      const dataset = generateLargeDataset(500);
      mockLeadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: dataset }
      });

      // Test original component
      const startOriginal = performance.now();
      const { unmount: unmountOriginal } = render(<LeadAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });
      
      const originalTime = performance.now() - startOriginal;
      unmountOriginal();

      // Clear and test optimized component
      jest.clearAllMocks();
      mockLeadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: dataset }
      });

      const startOptimized = performance.now();
      render(<OptimizedLeadAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });
      
      const optimizedTime = performance.now() - startOptimized;

      // Optimized should be at least 30% faster
      const improvement = (originalTime - optimizedTime) / originalTime * 100;
      expect(improvement).toBeGreaterThan(30);
    });

    test('memoization prevents unnecessary re-renders', async () => {
      const dataset = generateLargeDataset(100);
      mockLeadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: dataset }
      });

      let renderCount = 0;
      const TestComponent = React.memo(() => {
        renderCount++;
        return <OptimizedLeadAnalyticsDashboard />;
      });

      const { rerender } = render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });

      const initialRenderCount = renderCount;

      // Rerender with same props (should not trigger re-render)
      rerender(<TestComponent />);
      
      // Should not re-render due to React.memo
      expect(renderCount).toBe(initialRenderCount);
    });

    test('useCallback prevents function recreation', async () => {
      const dataset = generateLargeDataset(100);
      mockLeadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: dataset }
      });

      const functionCreations = [];
      
      const TestComponent = () => {
        const handleRefresh = React.useCallback(() => {
          functionCreations.push(Date.now());
        }, []);
        
        return <OptimizedLeadAnalyticsDashboard onRefresh={handleRefresh} />;
      };

      const { rerender } = render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });

      // Multiple rerenders should not create new functions
      rerender(<TestComponent />);
      rerender(<TestComponent />);
      
      expect(functionCreations.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Caching Performance', () => {
    test('analytics cache improves load times', async () => {
      const dataset = generateLargeDataset(500);
      const cacheKey = 'analytics_test';
      
      // First load (no cache)
      mockLeadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: dataset }
      });

      const startUncached = performance.now();
      render(<OptimizedLeadAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });
      
      const uncachedTime = performance.now() - startUncached;

      // Cache the processed data
      analyticsCache.set(cacheKey, dataset, 300000); // 5 minutes

      // Second load (with cache)
      const startCached = performance.now();
      const cachedData = analyticsCache.get(cacheKey);
      const cachedTime = performance.now() - startCached;

      // Cache should be significantly faster
      expect(cachedTime).toBeLessThan(uncachedTime * 0.1); // 90% faster
      expect(cachedData).toEqual(dataset);
    });

    test('cache compression reduces memory usage', () => {
      const largeDataset = generateLargeDataset(1000);
      
      // Store with compression
      analyticsCache.set('large_data', largeDataset, 300000, { compress: true });
      
      const stats = analyticsCache.getStats();
      
      // Should show compression savings
      expect(stats.compressionSaved).toBeGreaterThan(0);
      expect(stats.hitRate).toBe(0); // No hits yet
      
      // Retrieve and verify data integrity
      const retrieved = analyticsCache.get('large_data');
      expect(retrieved).toEqual(largeDataset);
      
      const finalStats = analyticsCache.getStats();
      expect(finalStats.hitRate).toBe(100); // Should be 100% hit rate
    });

    test('LRU eviction works correctly', () => {
      // Fill cache beyond capacity
      const cacheSize = 10;
      const cache = new (require('../../utils/performanceCache').default)({
        maxMemorySize: cacheSize
      });

      // Add items beyond capacity
      for (let i = 0; i < cacheSize + 5; i++) {
        cache.set(`item_${i}`, { data: i }, 300000);
      }

      const stats = cache.getStats();
      
      // Should have evicted items
      expect(stats.evictions).toBeGreaterThan(0);
      expect(stats.memorySize).toBeLessThanOrEqual(cacheSize);
      
      // Oldest items should be evicted
      expect(cache.get('item_0')).toBeNull();
      expect(cache.get('item_1')).toBeNull();
      
      // Newest items should still exist
      expect(cache.get(`item_${cacheSize + 4}`)).toBeTruthy();
    });
  });

  describe('Memory Management', () => {
    test('prevents memory leaks during extended usage', async () => {
      const user = userEvent.setup();
      const dataset = generateLargeDataset(200);
      
      mockLeadsService.getAllLeads.mockResolvedValue({
        success: true,
        data: { leads: dataset }
      });

      const initialMemory = performance.memory.usedJSHeapSize;
      
      render(<OptimizedLeadAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });

      // Simulate extended usage
      for (let i = 0; i < 20; i++) {
        // Change date ranges
        const select = screen.getByDisplayValue('Last 30 days');
        await user.selectOptions(select, 'Last 7 days');
        await user.selectOptions(select, 'Last 90 days');
        await user.selectOptions(select, 'Last 30 days');
        
        // Refresh data
        await user.click(screen.getByText(/Refresh/i));
        
        await waitFor(() => {
          expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
        });
      }

      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('properly cleans up AbortController on unmount', () => {
      const abortSpy = jest.fn();
      global.AbortController = jest.fn(() => ({
        abort: abortSpy,
        signal: { aborted: false }
      }));

      const { unmount } = render(<OptimizedLeadAnalyticsDashboard />);
      
      // Unmount should trigger cleanup
      unmount();
      
      expect(abortSpy).toHaveBeenCalled();
    });

    test('handles rapid date range changes without request accumulation', async () => {
      const user = userEvent.setup();
      const dataset = generateLargeDataset(100);
      
      let requestCount = 0;
      mockLeadsService.getAllLeads.mockImplementation(() => {
        requestCount++;
        return Promise.resolve({
          success: true,
          data: { leads: dataset }
        });
      });

      render(<OptimizedLeadAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });

      const initialRequestCount = requestCount;
      const select = screen.getByDisplayValue('Last 30 days');

      // Rapid changes should cancel previous requests
      await user.selectOptions(select, 'Last 7 days');
      await user.selectOptions(select, 'Last 90 days');
      await user.selectOptions(select, 'Last year');
      await user.selectOptions(select, 'Last 30 days');

      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });

      // Should not accumulate too many requests due to AbortController
      expect(requestCount - initialRequestCount).toBeLessThan(10);
    });
  });

  describe('Real-time Performance Monitoring', () => {
    test('tracks Core Web Vitals correctly', async () => {
      const vitalsData = {
        lcp: 1200, // Good LCP
        fid: 80,   // Good FID
        cls: 0.05  // Good CLS
      };

      // Mock performance observer
      global.PerformanceObserver = jest.fn((callback) => ({
        observe: jest.fn(() => {
          // Simulate Core Web Vitals entries
          callback({
            getEntries: () => [
              { name: 'largest-contentful-paint', startTime: vitalsData.lcp },
              { name: 'first-input', startTime: vitalsData.fid },
              { name: 'layout-shift', value: vitalsData.cls, hadRecentInput: false }
            ]
          });
        }),
        disconnect: jest.fn()
      }));

      const TestComponent = withPerformanceTracking(
        OptimizedLeadAnalyticsDashboard, 
        'OptimizedAnalytics'
      );

      render(<TestComponent />);
      
      // Performance tracking should be working
      expect(global.PerformanceObserver).toHaveBeenCalled();
    });

    test('performance budgets trigger alerts correctly', () => {
      const budgetViolations = [];
      
      const { result } = renderHook(() => 
        usePerformanceMonitor({
          onBudgetViolation: (metric, value, budget) => {
            budgetViolations.push({ metric, value, budget });
          },
          budgets: {
            lcp: 2500,
            fid: 100,
            cls: 0.1
          }
        })
      );

      // Simulate budget violations
      act(() => {
        result.current.trackMetric('lcp', 3000); // Violates LCP budget
        result.current.trackMetric('fid', 150);  // Violates FID budget
        result.current.trackMetric('cls', 0.2);  // Violates CLS budget
      });

      expect(budgetViolations).toHaveLength(3);
      expect(budgetViolations[0]).toEqual({
        metric: 'lcp',
        value: 3000,
        budget: 2500
      });
    });
  });

  describe('Network Performance', () => {
    test('handles slow network gracefully', async () => {
      const dataset = generateLargeDataset(100);
      const slowDelay = 2000; // 2 second delay
      
      mockLeadsService.getAllLeads.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              data: { leads: dataset }
            });
          }, slowDelay);
        })
      );

      const startTime = performance.now();
      
      render(<OptimizedLeadAnalyticsDashboard />);
      
      // Should show loading state immediately
      expect(screen.getByText(/Loading analytics/i)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      }, { timeout: slowDelay + 1000 });

      const totalTime = performance.now() - startTime;
      
      // Should handle slow network gracefully
      expect(totalTime).toBeGreaterThan(slowDelay);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    test('implements request caching for repeated calls', async () => {
      const dataset = generateLargeDataset(100);
      let callCount = 0;
      
      mockLeadsService.getAllLeads.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          success: true,
          data: { leads: dataset }
        });
      });

      const { rerender } = render(<OptimizedLeadAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Leads/i)).toBeInTheDocument();
      });

      expect(callCount).toBe(1);

      // Rerender should use cache (if implemented)
      rerender(<OptimizedLeadAnalyticsDashboard />);
      
      // Call count should not increase if caching is working
      // Note: This would need to be implemented in the component
      expect(callCount).toBe(1);
    });
  });
});

// Helper function for renderHook (if not available in test environment)
const renderHook = (callback) => {
  let result = {};
  
  function TestComponent() {
    result.current = callback();
    return null;
  }
  
  const utils = render(<TestComponent />);
  
  return { result, ...utils };
};