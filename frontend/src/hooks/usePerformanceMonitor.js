import { useEffect, useCallback, useRef } from 'react';

/**
 * usePerformanceMonitor - Advanced Performance Monitoring Hook
 * 
 * Features:
 * - Core Web Vitals tracking (LCP, FID, CLS)
 * - Custom performance metrics
 * - Component render time tracking
 * - Memory usage monitoring
 * - Network condition detection
 * - Performance budget alerting
 * 
 * Usage:
 * const { trackMetric, getMetrics, reportVitals } = usePerformanceMonitor();
 */
export const usePerformanceMonitor = ({
  onMetric = () => {},
  onBudgetViolation = () => {},
  budgets = {
    fcp: 2000,        // First Contentful Paint - 2s
    lcp: 2500,        // Largest Contentful Paint - 2.5s
    fid: 100,         // First Input Delay - 100ms
    cls: 0.1,         // Cumulative Layout Shift - 0.1
    ttfb: 600,        // Time to First Byte - 600ms
    renderTime: 16    // Component render time - 16ms (60fps)
  },
  enableVitals = true,
  enableMemoryTracking = true,
  enableNetworkTracking = true
} = {}) => {
  const metricsRef = useRef({
    vitals: {},
    custom: new Map(),
    navigation: {},
    resources: [],
    memory: [],
    network: null
  });

  const observersRef = useRef([]);
  const isInitializedRef = useRef(false);

  // Performance observer initialization
  const initializeObservers = useCallback(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window) || isInitializedRef.current) {
      return;
    }

    try {
      // Largest Contentful Paint Observer
      if (enableVitals) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          const lcp = lastEntry.startTime;
          
          metricsRef.current.vitals.lcp = lcp;
          onMetric('lcp', lcp);
          
          if (lcp > budgets.lcp) {
            onBudgetViolation('lcp', lcp, budgets.lcp);
          }
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observersRef.current.push(lcpObserver);

        // First Input Delay Observer
        let firstInput = false;
        const fidObserver = (event) => {
          if (firstInput) return;
          
          const fid = performance.now() - event.timeStamp;
          metricsRef.current.vitals.fid = fid;
          onMetric('fid', fid);
          
          if (fid > budgets.fid) {
            onBudgetViolation('fid', fid, budgets.fid);
          }
          
          firstInput = true;
        };

        ['mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(type => {
          document.addEventListener(type, fidObserver, { passive: true, capture: true, once: true });
        });

        // Cumulative Layout Shift Observer
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = metricsRef.current.vitals.cls || 0;
          
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          
          metricsRef.current.vitals.cls = clsValue;
          onMetric('cls', clsValue);
          
          if (clsValue > budgets.cls) {
            onBudgetViolation('cls', clsValue, budgets.cls);
          }
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observersRef.current.push(clsObserver);

        // Paint Timing Observer
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const metricName = entry.name.replace('-', '');
            metricsRef.current.vitals[metricName] = entry.startTime;
            onMetric(metricName, entry.startTime);
            
            if (metricName === 'firstcontentfulpaint' && entry.startTime > budgets.fcp) {
              onBudgetViolation('fcp', entry.startTime, budgets.fcp);
            }
          }
        });
        
        paintObserver.observe({ entryTypes: ['paint'] });
        observersRef.current.push(paintObserver);
      }

      // Navigation Timing Observer
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const timing = {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            request: entry.responseStart - entry.requestStart,
            response: entry.responseEnd - entry.responseStart,
            dom: entry.domContentLoadedEventEnd - entry.responseEnd,
            load: entry.loadEventEnd - entry.loadEventStart,
            ttfb: entry.responseStart - entry.navigationStart,
            total: entry.loadEventEnd - entry.navigationStart
          };
          
          metricsRef.current.navigation = timing;
          onMetric('navigation', timing);
          
          if (timing.ttfb > budgets.ttfb) {
            onBudgetViolation('ttfb', timing.ttfb, budgets.ttfb);
          }
        }
      });
      
      navigationObserver.observe({ entryTypes: ['navigation'] });
      observersRef.current.push(navigationObserver);

      // Resource Timing Observer
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = {
            name: entry.name,
            type: getResourceType(entry.name),
            size: entry.transferSize || 0,
            duration: entry.duration,
            cached: entry.transferSize === 0,
            timing: {
              dns: entry.domainLookupEnd - entry.domainLookupStart,
              tcp: entry.connectEnd - entry.connectStart,
              request: entry.responseStart - entry.requestStart,
              response: entry.responseEnd - entry.responseStart
            }
          };
          
          metricsRef.current.resources.push(resource);
          onMetric('resource', resource);
          
          // Alert on slow resources
          if (resource.duration > 1000) {
            onBudgetViolation('resource_slow', resource.duration, 1000, resource.name);
          }
        }
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
      observersRef.current.push(resourceObserver);

      isInitializedRef.current = true;
    } catch (error) {
      console.warn('Performance observers initialization failed:', error);
    }
  }, [enableVitals, budgets, onMetric, onBudgetViolation]);

  // Memory monitoring
  const trackMemory = useCallback(() => {
    if (!enableMemoryTracking || typeof performance === 'undefined' || !performance.memory) {
      return null;
    }

    const memoryInfo = {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100,
      timestamp: Date.now()
    };

    metricsRef.current.memory.push(memoryInfo);
    
    // Keep only last 100 memory samples
    if (metricsRef.current.memory.length > 100) {
      metricsRef.current.memory.shift();
    }

    onMetric('memory', memoryInfo);
    
    // Alert on high memory usage
    if (memoryInfo.percentage > 80) {
      onBudgetViolation('memory_high', memoryInfo.percentage, 80);
    }

    return memoryInfo;
  }, [enableMemoryTracking, onMetric, onBudgetViolation]);

  // Network condition detection
  const trackNetwork = useCallback(() => {
    if (!enableNetworkTracking || typeof navigator === 'undefined' || !navigator.connection) {
      return null;
    }

    const networkInfo = {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData,
      timestamp: Date.now()
    };

    metricsRef.current.network = networkInfo;
    onMetric('network', networkInfo);

    return networkInfo;
  }, [enableNetworkTracking, onMetric]);

  // Custom metric tracking
  const trackMetric = useCallback((name, value, tags = {}) => {
    const metric = {
      name,
      value,
      tags,
      timestamp: Date.now()
    };

    metricsRef.current.custom.set(name, metric);
    onMetric(name, value, tags);

    return metric;
  }, [onMetric]);

  // Component render time tracking
  const trackComponentRender = useCallback((componentName, renderTime) => {
    trackMetric('component_render', renderTime, { component: componentName });

    if (renderTime > budgets.renderTime) {
      onBudgetViolation('component_render_slow', renderTime, budgets.renderTime, componentName);
    }

    return renderTime;
  }, [trackMetric, budgets.renderTime, onBudgetViolation]);

  // Performance mark
  const mark = useCallback((name) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }, []);

  // Performance measure
  const measure = useCallback((name, startMark, endMark) => {
    if (typeof performance !== 'undefined' && performance.measure) {
      performance.measure(name, startMark, endMark);
      
      const measures = performance.getEntriesByName(name, 'measure');
      if (measures.length > 0) {
        const measure = measures[measures.length - 1];
        trackMetric(name, measure.duration);
        return measure.duration;
      }
    }
    return null;
  }, [trackMetric]);

  // Get all metrics
  const getMetrics = useCallback(() => {
    return {
      vitals: { ...metricsRef.current.vitals },
      navigation: { ...metricsRef.current.navigation },
      resources: [...metricsRef.current.resources],
      memory: [...metricsRef.current.memory],
      network: metricsRef.current.network ? { ...metricsRef.current.network } : null,
      custom: Object.fromEntries(metricsRef.current.custom)
    };
  }, []);

  // Get performance score
  const getPerformanceScore = useCallback(() => {
    const vitals = metricsRef.current.vitals;
    let score = 100;

    // Core Web Vitals scoring
    if (vitals.lcp > budgets.lcp) score -= 25;
    if (vitals.fid > budgets.fid) score -= 25;
    if (vitals.cls > budgets.cls) score -= 25;
    if (vitals.firstcontentfulpaint > budgets.fcp) score -= 25;

    return Math.max(0, score);
  }, [budgets]);

  // Generate performance report
  const generateReport = useCallback(() => {
    const metrics = getMetrics();
    const score = getPerformanceScore();

    return {
      score,
      timestamp: Date.now(),
      metrics,
      recommendations: generateRecommendations(metrics, budgets)
    };
  }, [getMetrics, getPerformanceScore, budgets]);

  // Cleanup function
  const cleanup = useCallback(() => {
    observersRef.current.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Error disconnecting observer:', error);
      }
    });
    
    observersRef.current = [];
    isInitializedRef.current = false;
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeObservers();
    
    // Track memory and network periodically
    const interval = setInterval(() => {
      trackMemory();
      trackNetwork();
    }, 5000);

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [initializeObservers, trackMemory, trackNetwork, cleanup]);

  return {
    trackMetric,
    trackComponentRender,
    mark,
    measure,
    getMetrics,
    getPerformanceScore,
    generateReport,
    trackMemory,
    trackNetwork
  };
};

// Utility functions
const getResourceType = (url) => {
  try {
    const parsedUrl = new URL(url);
    const extension = parsedUrl.pathname.split('.').pop()?.toLowerCase();
    
    const typeMap = {
      'js': 'script',
      'css': 'stylesheet',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'svg': 'image',
      'webp': 'image',
      'mp3': 'audio',
      'mp4': 'video',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font'
    };
    
    return typeMap[extension] || 'other';
  } catch {
    return 'other';
  }
};

const generateRecommendations = (metrics, budgets) => {
  const recommendations = [];

  // Core Web Vitals recommendations
  if (metrics.vitals.lcp > budgets.lcp) {
    recommendations.push({
      type: 'critical',
      metric: 'LCP',
      current: metrics.vitals.lcp,
      target: budgets.lcp,
      suggestions: [
        'Optimize images (WebP, compression, sizing)',
        'Remove large unused assets',
        'Use a CDN for static assets',
        'Preload critical images'
      ]
    });
  }

  if (metrics.vitals.fid > budgets.fid) {
    recommendations.push({
      type: 'critical',
      metric: 'FID',
      current: metrics.vitals.fid,
      target: budgets.fid,
      suggestions: [
        'Reduce JavaScript execution time',
        'Code splitting and lazy loading',
        'Remove unused polyfills',
        'Optimize third-party scripts'
      ]
    });
  }

  if (metrics.vitals.cls > budgets.cls) {
    recommendations.push({
      type: 'important',
      metric: 'CLS',
      current: metrics.vitals.cls,
      target: budgets.cls,
      suggestions: [
        'Add size attributes to images and videos',
        'Reserve space for dynamic content',
        'Avoid inserting content above existing content',
        'Use CSS aspect-ratio for responsive media'
      ]
    });
  }

  // Resource recommendations
  const largeResources = metrics.resources.filter(r => r.size > 100000); // 100KB
  if (largeResources.length > 0) {
    recommendations.push({
      type: 'improvement',
      metric: 'Bundle Size',
      current: largeResources.length,
      suggestions: [
        'Implement code splitting',
        'Tree shake unused code',
        'Compress images and assets',
        'Use dynamic imports for non-critical code'
      ]
    });
  }

  // Memory recommendations
  const latestMemory = metrics.memory[metrics.memory.length - 1];
  if (latestMemory && latestMemory.percentage > 70) {
    recommendations.push({
      type: 'warning',
      metric: 'Memory Usage',
      current: latestMemory.percentage,
      target: 70,
      suggestions: [
        'Check for memory leaks',
        'Optimize large data structures',
        'Implement virtual scrolling for large lists',
        'Clean up event listeners and timers'
      ]
    });
  }

  return recommendations;
};

// HOC for automatic component performance tracking
export const withPerformanceTracking = (Component, componentName) => {
  const WrappedComponent = (props) => {
    const { trackComponentRender } = usePerformanceMonitor();
    const startTime = useRef(performance.now());

    useEffect(() => {
      const renderTime = performance.now() - startTime.current;
      trackComponentRender(componentName || Component.displayName || Component.name, renderTime);
    });

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceTracking(${componentName || Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default usePerformanceMonitor;