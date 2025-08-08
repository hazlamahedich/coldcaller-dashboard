/**
 * Performance Middleware - Request/Response performance tracking
 */

const { performance } = require('perf_hooks');
const performanceMonitor = require('../services/performanceMonitoringService');

// Request performance tracking middleware
const trackRequestPerformance = (req, res, next) => {
  const startTime = performance.now();
  const startMark = `request-start-${req.path}-${Date.now()}`;
  
  // Mark request start
  performance.mark(startMark);
  
  // Store start time in request
  req.performanceStart = startTime;
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Create performance measure
    const measureName = `request-${req.method}-${req.path}`;
    try {
      performance.mark(`request-end-${req.path}-${Date.now()}`);
      performance.measure(measureName, startMark);
    } catch (error) {
      // Handle performance mark errors gracefully
    }
    
    // Record metrics
    recordRequestMetrics(req, res, duration);
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  next();
};

// Record detailed request metrics
const recordRequestMetrics = (req, res, duration) => {
  const endpoint = req.path;
  const method = req.method;
  const statusCode = res.statusCode;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  // Log slow requests
  if (duration > 1000) {
    console.warn(`🐌 Slow request: ${method} ${endpoint} - ${duration.toFixed(2)}ms`);
  }
  
  // Log error responses
  if (statusCode >= 400) {
    console.warn(`❌ Error response: ${method} ${endpoint} - ${statusCode}`);
    performanceMonitor.recordHttpMetric({
      name: `${method} ${endpoint}`,
      duration,
      entryType: 'error',
      statusCode
    });
  } else {
    performanceMonitor.recordHttpMetric({
      name: `${method} ${endpoint}`,
      duration,
      entryType: 'navigation',
      statusCode
    });
  }
  
  // Track API endpoint usage
  performanceMonitor.emit('request_completed', {
    endpoint,
    method,
    duration,
    statusCode,
    userAgent,
    timestamp: new Date().toISOString()
  });
};

// Memory usage monitoring middleware
const monitorMemoryUsage = (req, res, next) => {
  const memBefore = process.memoryUsage();
  
  // Override res.end to capture memory delta
  const originalEnd = res.end;
  res.end = function(...args) {
    const memAfter = process.memoryUsage();
    const memoryDelta = {
      heapUsed: memAfter.heapUsed - memBefore.heapUsed,
      heapTotal: memAfter.heapTotal - memBefore.heapTotal,
      external: memAfter.external - memBefore.external
    };
    
    // Log significant memory increases
    if (memoryDelta.heapUsed > 10 * 1024 * 1024) { // 10MB
      console.warn(`💾 High memory usage: ${req.method} ${req.path} - +${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Record memory usage
    req.memoryDelta = memoryDelta;
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Database query performance middleware
const trackDatabasePerformance = (queryType, query) => {
  const startTime = performance.now();
  
  return {
    end: (error = null) => {
      const duration = performance.now() - startTime;
      
      if (error) {
        performanceMonitor.recordDatabaseMetric('error', duration, query);
        console.error(`❌ Database error: ${queryType} - ${duration.toFixed(2)}ms - ${error.message}`);
      } else {
        performanceMonitor.recordDatabaseMetric(queryType, duration, query);
        
        if (duration > 500) {
          console.warn(`🐌 Slow query: ${queryType} - ${duration.toFixed(2)}ms`);
        }
      }
    }
  };
};

// Audio processing performance middleware
const trackAudioProcessing = (operation, metadata = {}) => {
  const startTime = performance.now();
  
  performanceMonitor.recordAudioMetric('processing_start', metadata);
  
  return {
    complete: (result = {}) => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordAudioMetric('processing_complete', {
        ...metadata,
        ...result,
        processingTime: duration
      });
      
      if (duration > 5000) { // 5 seconds
        console.warn(`🎵 Slow audio processing: ${operation} - ${duration.toFixed(2)}ms`);
      }
    },
    error: (error) => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordAudioMetric('processing_error', {
        ...metadata,
        error: error.message,
        processingTime: duration
      });
      
      console.error(`❌ Audio processing error: ${operation} - ${error.message}`);
    }
  };
};

// VoIP performance tracking
const trackVoipPerformance = (eventType, data = {}) => {
  performanceMonitor.recordVoipMetric(eventType, data);
  
  switch (eventType) {
    case 'call_start':
      console.log(`📞 Call started: ${data.callId || 'unknown'}`);
      break;
    case 'call_end':
      console.log(`📞 Call ended: ${data.callId || 'unknown'} - Duration: ${data.duration || 0}ms`);
      break;
    case 'call_quality':
      if (data.quality < 3) {
        console.warn(`📞 Poor call quality: ${data.quality}/5 - ${JSON.stringify(data.metrics)}`);
      }
      break;
    case 'connection_failed':
      console.error(`❌ VoIP connection failed: ${data.reason || 'unknown'}`);
      break;
  }
};

// Rate limiting with performance awareness
const adaptiveRateLimit = (req, res, next) => {
  const currentLoad = performanceMonitor.getMetrics();
  
  // Adjust rate limiting based on system performance
  const cpuUsage = currentLoad.system.cpu.current;
  const memoryUsage = currentLoad.system.memory.current;
  const avgResponseTime = currentLoad.api.requests.avgResponseTime;
  
  // More aggressive rate limiting under high load
  if (cpuUsage > 0.8 || memoryUsage > 0.8 || avgResponseTime > 2000) {
    res.status(503).json({
      error: 'Service temporarily overloaded',
      retryAfter: 30,
      performance: {
        cpuUsage: Math.round(cpuUsage * 100),
        memoryUsage: Math.round(memoryUsage * 100),
        avgResponseTime: Math.round(avgResponseTime)
      }
    });
    return;
  }
  
  next();
};

// Circuit breaker for external services
const createCircuitBreaker = (serviceName, options = {}) => {
  const config = {
    failureThreshold: options.failureThreshold || 5,
    resetTimeout: options.resetTimeout || 30000,
    monitoringPeriod: options.monitoringPeriod || 60000,
    ...options
  };
  
  let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  let failures = 0;
  let lastFailTime = 0;
  let requests = 0;
  
  return (req, res, next) => {
    const now = Date.now();
    
    // Reset failure count if monitoring period has passed
    if (now - lastFailTime > config.monitoringPeriod) {
      failures = 0;
      requests = 0;
    }
    
    // Handle circuit states
    switch (state) {
      case 'OPEN':
        if (now - lastFailTime > config.resetTimeout) {
          state = 'HALF_OPEN';
          console.log(`🔄 Circuit breaker for ${serviceName} entering HALF_OPEN state`);
        } else {
          res.status(503).json({
            error: `${serviceName} circuit breaker is OPEN`,
            retryAfter: Math.ceil((config.resetTimeout - (now - lastFailTime)) / 1000)
          });
          return;
        }
        break;
        
      case 'HALF_OPEN':
        // Allow limited requests to test service recovery
        if (requests >= 3) {
          res.status(503).json({
            error: `${serviceName} circuit breaker is testing recovery`,
            retryAfter: 10
          });
          return;
        }
        break;
    }
    
    requests++;
    
    // Track response for circuit breaker logic
    const originalEnd = res.end;
    res.end = function(...args) {
      if (res.statusCode >= 500) {
        failures++;
        lastFailTime = now;
        
        if (failures >= config.failureThreshold) {
          state = 'OPEN';
          console.error(`🔴 Circuit breaker for ${serviceName} opened after ${failures} failures`);
        }
      } else if (state === 'HALF_OPEN') {
        // Service recovered
        state = 'CLOSED';
        failures = 0;
        console.log(`🟢 Circuit breaker for ${serviceName} closed - service recovered`);
      }
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Request timeout with performance monitoring
const adaptiveTimeout = (baseTimeout = 30000) => {
  return (req, res, next) => {
    const metrics = performanceMonitor.getMetrics();
    
    // Adjust timeout based on current system load
    let timeout = baseTimeout;
    if (metrics.system.cpu.current > 0.7) {
      timeout *= 1.5; // 50% longer timeout under high CPU load
    }
    if (metrics.api.requests.avgResponseTime > 1000) {
      timeout *= 1.3; // 30% longer timeout if responses are generally slow
    }
    
    req.setTimeout(timeout, () => {
      console.warn(`⏰ Request timeout: ${req.method} ${req.path} - ${timeout}ms`);
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          timeout: timeout,
          performance: metrics.system
        });
      }
    });
    
    next();
  };
};

module.exports = {
  trackRequestPerformance,
  monitorMemoryUsage,
  trackDatabasePerformance,
  trackAudioProcessing,
  trackVoipPerformance,
  adaptiveRateLimit,
  createCircuitBreaker,
  adaptiveTimeout
};