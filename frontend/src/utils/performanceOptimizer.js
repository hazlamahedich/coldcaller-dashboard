/**
 * Frontend Performance Optimizer
 * Advanced performance optimization utilities for React application
 */

import { lazy, Suspense } from 'react';

class PerformanceOptimizer {
  constructor() {
    this.metrics = {
      navigation: {},
      resources: [],
      vitals: {},
      customMetrics: []
    };
    
    this.observers = [];
    this.isMonitoring = false;
    
    // Performance budgets
    this.budgets = {
      fcp: 2000,        // First Contentful Paint - 2s
      lcp: 2500,        // Largest Contentful Paint - 2.5s
      fid: 100,         // First Input Delay - 100ms
      cls: 0.1,         // Cumulative Layout Shift - 0.1
      ttfb: 600,        // Time to First Byte - 600ms
      bundleSize: 512 * 1024, // Bundle size - 512KB
      chunkSize: 128 * 1024   // Individual chunk size - 128KB
    };
    
    this.optimizations = {
      imageLoading: false,
      lazyLoading: false,
      preloading: false,
      caching: false,
      compression: false
    };
    
    this.init();
  }
  
  init() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.initPerformanceObservers();
      this.measurePageLoad();
      this.initResourceOptimization();
      this.startVitalsMonitoring();
    }
  }
  
  // Initialize performance observers
  initPerformanceObservers() {
    try {
      // Navigation timing observer
      if ('PerformanceObserver' in window) {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processNavigationEntry(entry);
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
        
        // Resource timing observer
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processResourceEntry(entry);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
        
        // Layout shift observer
        const layoutObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              this.metrics.vitals.cls = (this.metrics.vitals.cls || 0) + entry.value;
            }
          }
        });
        layoutObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutObserver);
        
        // Paint timing observer
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.metrics.vitals[entry.name.replace('-', '')] = entry.startTime;
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
        
        this.isMonitoring = true;
      }
    } catch (error) {
      console.warn('Performance observers not supported:', error);
    }
  }
  
  // Process navigation timing entries
  processNavigationEntry(entry) {
    this.metrics.navigation = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domContentLoadedEventEnd - entry.responseEnd,
      load: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - entry.navigationStart,
      ttfb: entry.responseStart - entry.navigationStart,
      fcp: entry.domContentLoadedEventStart - entry.navigationStart
    };
    
    this.checkBudgets();
  }
  
  // Process resource timing entries
  processResourceEntry(entry) {
    const resource = {
      name: entry.name,
      type: this.getResourceType(entry),
      size: entry.transferSize,
      duration: entry.duration,
      cached: entry.transferSize === 0,
      timing: {
        dns: entry.domainLookupEnd - entry.domainLookupStart,
        tcp: entry.connectEnd - entry.connectStart,
        request: entry.responseStart - entry.requestStart,
        response: entry.responseEnd - entry.responseStart
      }
    };
    
    this.metrics.resources.push(resource);
    this.optimizeResource(resource);
  }
  
  // Get resource type from URL and timing data
  getResourceType(entry) {
    const url = new URL(entry.name);
    const extension = url.pathname.split('.').pop().toLowerCase();
    
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
  }
  
  // Measure page load performance
  measurePageLoad() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          this.processNavigationEntry(navigation);
        }
        
        // Measure core web vitals
        this.measureCoreWebVitals();
      }, 100);
    });
  }
  
  // Measure Core Web Vitals
  measureCoreWebVitals() {
    // First Input Delay (FID)
    if ('addEventListener' in document) {
      const firstInputTypes = ['mousedown', 'keydown', 'touchstart', 'pointerdown'];
      
      const onFirstInput = (event) => {
        const fid = performance.now() - event.timeStamp;
        this.metrics.vitals.fid = fid;
        
        firstInputTypes.forEach(type => {
          document.removeEventListener(type, onFirstInput, { passive: true, capture: true });
        });
      };
      
      firstInputTypes.forEach(type => {
        document.addEventListener(type, onFirstInput, { passive: true, capture: true });
      });
    }
    
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.vitals.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }
    }
  }
  
  // Start monitoring Web Vitals
  startVitalsMonitoring() {
    // Monitor vitals every 5 seconds
    this.vitalsInterval = setInterval(() => {
      this.reportVitals();
    }, 5000);
  }
  
  // Check performance against budgets
  checkBudgets() {
    const violations = [];
    
    if (this.metrics.vitals.fcp > this.budgets.fcp) {
      violations.push(`FCP: ${this.metrics.vitals.fcp}ms > ${this.budgets.fcp}ms`);
    }
    
    if (this.metrics.vitals.lcp > this.budgets.lcp) {
      violations.push(`LCP: ${this.metrics.vitals.lcp}ms > ${this.budgets.lcp}ms`);
    }
    
    if (this.metrics.vitals.fid > this.budgets.fid) {
      violations.push(`FID: ${this.metrics.vitals.fid}ms > ${this.budgets.fid}ms`);
    }
    
    if (this.metrics.vitals.cls > this.budgets.cls) {
      violations.push(`CLS: ${this.metrics.vitals.cls} > ${this.budgets.cls}`);
    }
    
    if (this.metrics.navigation.ttfb > this.budgets.ttfb) {
      violations.push(`TTFB: ${this.metrics.navigation.ttfb}ms > ${this.budgets.ttfb}ms`);
    }
    
    if (violations.length > 0) {
      console.warn('🚨 Performance budget violations:', violations);
      this.triggerOptimizations(violations);
    }
  }
  
  // Trigger optimizations based on violations
  triggerOptimizations(violations) {
    violations.forEach(violation => {
      if (violation.includes('LCP') && !this.optimizations.imageLoading) {
        this.enableImageOptimizations();
      }
      
      if (violation.includes('FCP') && !this.optimizations.preloading) {
        this.enableResourcePreloading();
      }
      
      if (violation.includes('TTFB') && !this.optimizations.caching) {
        this.enableAdvancedCaching();
      }
    });
  }
  
  // Enable image optimizations
  enableImageOptimizations() {
    console.log('🖼️ Enabling image optimizations');
    this.optimizations.imageLoading = true;
    
    // Implement lazy loading for images
    if ('IntersectionObserver' in window) {
      this.implementLazyLoading();
    }
    
    // Preload critical images
    this.preloadCriticalImages();
  }
  
  // Implement lazy loading for images
  implementLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
    
    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
  
  // Preload critical images
  preloadCriticalImages() {
    const criticalImages = [
      '/favicon.ico',
      // Add other critical images
    ];
    
    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }
  
  // Enable resource preloading
  enableResourcePreloading() {
    console.log('⚡ Enabling resource preloading');
    this.optimizations.preloading = true;
    
    // Preload critical CSS and JS
    const criticalResources = [
      { href: '/static/css/main.css', as: 'style' },
      { href: '/static/js/main.js', as: 'script' }
    ];
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = resource.as;
      link.href = resource.href;
      document.head.appendChild(link);
    });
  }
  
  // Enable advanced caching
  enableAdvancedCaching() {
    console.log('💾 Enabling advanced caching');
    this.optimizations.caching = true;
    
    // Register service worker for caching
    if ('serviceWorker' in navigator) {
      this.registerServiceWorker();
    }
    
    // Enable browser caching headers
    this.configureCacheHeaders();
  }
  
  // Register service worker
  registerServiceWorker() {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service worker registered:', registration);
      })
      .catch(error => {
        console.warn('❌ Service worker registration failed:', error);
      });
  }
  
  // Configure cache headers (this would be done on the server)
  configureCacheHeaders() {
    // This is a client-side placeholder
    // Actual cache headers would be set by the server
    console.log('🔧 Cache headers should be configured on the server');
  }
  
  // Optimize individual resources
  optimizeResource(resource) {
    // Large resource optimization
    if (resource.size > this.budgets.chunkSize) {
      console.warn(`⚠️ Large resource detected: ${resource.name} (${(resource.size / 1024).toFixed(2)}KB)`);
      
      if (resource.type === 'script' || resource.type === 'stylesheet') {
        this.suggestCodeSplitting(resource);
      }
      
      if (resource.type === 'image') {
        this.suggestImageOptimization(resource);
      }
    }
    
    // Slow resource optimization
    if (resource.duration > 1000) {
      console.warn(`🐌 Slow resource: ${resource.name} (${resource.duration.toFixed(2)}ms)`);
      this.suggestResourceOptimization(resource);
    }
  }
  
  // Suggest code splitting
  suggestCodeSplitting(resource) {
    console.log(`📦 Consider code splitting for: ${resource.name}`);
    // Implementation would involve webpack configuration
  }
  
  // Suggest image optimization
  suggestImageOptimization(resource) {
    console.log(`🖼️ Consider image optimization for: ${resource.name}`);
    // Suggestions: WebP format, compression, responsive images
  }
  
  // Suggest resource optimization
  suggestResourceOptimization(resource) {
    console.log(`⚡ Consider optimization for: ${resource.name}`);
    // Suggestions: CDN, compression, caching
  }
  
  // Report Web Vitals to analytics
  reportVitals() {
    if (this.metrics.vitals.fcp && this.metrics.vitals.lcp) {
      // In a real application, you would send this to your analytics service
      console.log('📊 Web Vitals:', this.metrics.vitals);
    }
  }
  
  // Create performance dashboard data
  getDashboardData() {
    return {
      timestamp: Date.now(),
      vitals: this.metrics.vitals,
      navigation: this.metrics.navigation,
      resources: {
        total: this.metrics.resources.length,
        cached: this.metrics.resources.filter(r => r.cached).length,
        totalSize: this.metrics.resources.reduce((sum, r) => sum + (r.size || 0), 0),
        slowResources: this.metrics.resources.filter(r => r.duration > 1000).length,
        byType: this.getResourcesByType()
      },
      budgets: this.budgets,
      optimizations: this.optimizations,
      recommendations: this.generateRecommendations()
    };
  }
  
  // Get resources grouped by type
  getResourcesByType() {
    const byType = {};
    this.metrics.resources.forEach(resource => {
      if (!byType[resource.type]) {
        byType[resource.type] = { count: 0, totalSize: 0, avgDuration: 0 };
      }
      byType[resource.type].count++;
      byType[resource.type].totalSize += resource.size || 0;
      byType[resource.type].avgDuration += resource.duration || 0;
    });
    
    // Calculate averages
    Object.values(byType).forEach(type => {
      type.avgDuration = type.avgDuration / type.count;
    });
    
    return byType;
  }
  
  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // Core Web Vitals recommendations
    if (this.metrics.vitals.fcp > this.budgets.fcp) {
      recommendations.push({
        type: 'critical',
        metric: 'FCP',
        message: 'First Contentful Paint is too slow',
        suggestions: [
          'Enable text compression (gzip/brotli)',
          'Remove unused CSS',
          'Preload critical resources',
          'Optimize server response time'
        ]
      });
    }
    
    if (this.metrics.vitals.lcp > this.budgets.lcp) {
      recommendations.push({
        type: 'critical',
        metric: 'LCP',
        message: 'Largest Contentful Paint is too slow',
        suggestions: [
          'Optimize images (WebP, compression, sizing)',
          'Remove large unused assets',
          'Use a CDN for static assets',
          'Preload critical images'
        ]
      });
    }
    
    if (this.metrics.vitals.cls > this.budgets.cls) {
      recommendations.push({
        type: 'important',
        metric: 'CLS',
        message: 'Cumulative Layout Shift is too high',
        suggestions: [
          'Add size attributes to images and videos',
          'Reserve space for dynamic content',
          'Avoid inserting content above existing content',
          'Use CSS aspect-ratio for responsive media'
        ]
      });
    }
    
    // Resource-based recommendations
    const largeResources = this.metrics.resources.filter(r => r.size > this.budgets.chunkSize);
    if (largeResources.length > 0) {
      recommendations.push({
        type: 'improvement',
        metric: 'Bundle Size',
        message: `${largeResources.length} large resources detected`,
        suggestions: [
          'Implement code splitting',
          'Tree shake unused code',
          'Use dynamic imports for non-critical code',
          'Compress images and assets'
        ]
      });
    }
    
    return recommendations;
  }
  
  // Custom performance marker
  mark(name) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }
  
  // Custom performance measure
  measure(name, startMark, endMark) {
    if (typeof performance !== 'undefined' && performance.measure) {
      performance.measure(name, startMark, endMark);
      
      const measures = performance.getEntriesByName(name, 'measure');
      if (measures.length > 0) {
        const measure = measures[measures.length - 1];
        this.metrics.customMetrics.push({
          name,
          duration: measure.duration,
          timestamp: Date.now()
        });
      }
    }
  }
  
  // Component performance tracking
  trackComponent(componentName, renderTime) {
    const metric = {
      component: componentName,
      renderTime,
      timestamp: Date.now()
    };
    
    this.metrics.customMetrics.push(metric);
    
    if (renderTime > 16) { // 60fps threshold
      console.warn(`🐌 Slow component render: ${componentName} (${renderTime.toFixed(2)}ms)`);
    }
  }
  
  // Memory usage monitoring
  monitorMemory() {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }
  
  // Network information
  getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }
  
  // Cleanup performance monitoring
  cleanup() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    
    if (this.vitalsInterval) {
      clearInterval(this.vitalsInterval);
    }
    
    this.observers = [];
    this.isMonitoring = false;
  }
}

// React performance utilities
export const withPerformanceTracking = (WrappedComponent, componentName) => {
  return function PerformanceTrackedComponent(props) {
    const startTime = performance.now();
    
    useEffect(() => {
      const renderTime = performance.now() - startTime;
      performanceOptimizer.trackComponent(componentName, renderTime);
    });
    
    return <WrappedComponent {...props} />;
  };
};

// Lazy loading with loading states
export const createLazyComponent = (importFunc, LoadingComponent = null) => {
  const LazyComponent = lazy(importFunc);
  
  return function LazyWrapper(props) {
    return (
      <Suspense fallback={LoadingComponent || <div>Loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
};

// Image optimization component
export const OptimizedImage = ({ 
  src, 
  alt, 
  className, 
  lazy = true, 
  placeholder = null,
  ...props 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(!lazy);
  const imgRef = useRef();
  
  useEffect(() => {
    if (lazy && imgRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1, rootMargin: '50px' }
      );
      
      observer.observe(imgRef.current);
      return () => observer.disconnect();
    }
  }, [lazy]);
  
  return (
    <div ref={imgRef} className={className}>
      {placeholder && !loaded && (
        <div className="image-placeholder">
          {placeholder}
        </div>
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0 }}
          {...props}
        />
      )}
    </div>
  );
};

// Create global performance optimizer instance
const performanceOptimizer = new PerformanceOptimizer();

export default performanceOptimizer;