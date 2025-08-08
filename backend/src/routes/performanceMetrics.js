/**
 * Performance Metrics API Routes
 */

const express = require('express');
const router = express.Router();
const performanceMonitor = require('../services/performanceMonitoringService');
const { trackRequestPerformance } = require('../middleware/performanceMiddleware');

// Apply performance tracking to all routes
router.use(trackRequestPerformance);

/**
 * @swagger
 * /api/performance/health:
 *   get:
 *     summary: Get system health status
 *     description: Returns overall system health with performance indicators
 *     tags: [Performance]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: System uptime in milliseconds
 *                 performance:
 *                   type: object
 *                   properties:
 *                     cpu:
 *                       type: number
 *                       description: CPU usage percentage
 *                     memory:
 *                       type: number
 *                       description: Memory usage percentage
 *                     avgResponseTime:
 *                       type: number
 *                       description: Average API response time in milliseconds
 *                     avgQueryTime:
 *                       type: number
 *                       description: Average database query time in milliseconds
 *                     activeCalls:
 *                       type: number
 *                       description: Number of active VoIP calls
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       severity:
 *                         type: string
 *                         enum: [low, medium, high, critical]
 *                       value:
 *                         type: number
 */
router.get('/health', (req, res) => {
  try {
    const healthStatus = performanceMonitor.getHealthStatus();
    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get health status',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/metrics:
 *   get:
 *     summary: Get comprehensive performance metrics
 *     description: Returns detailed performance metrics for all system components
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d]
 *         description: Time range for historical metrics
 *     responses:
 *       200:
 *         description: Comprehensive performance metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const timeRange = req.query.timeRange || '1h';
    const metrics = performanceMonitor.getMetrics();
    
    // Filter metrics based on time range if needed
    const filteredMetrics = filterMetricsByTimeRange(metrics, timeRange);
    
    res.json({
      success: true,
      data: filteredMetrics,
      metadata: {
        timeRange,
        generatedAt: new Date().toISOString(),
        metricsVersion: '2.0.0'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/metrics/system:
 *   get:
 *     summary: Get system-level performance metrics
 *     description: Returns CPU, memory, and system resource metrics
 *     tags: [Performance]
 */
router.get('/metrics/system', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    
    res.json({
      success: true,
      data: {
        system: metrics.system,
        timestamp: metrics.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system metrics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/metrics/api:
 *   get:
 *     summary: Get API performance metrics
 *     description: Returns API endpoint performance and response time metrics
 *     tags: [Performance]
 */
router.get('/metrics/api', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    
    res.json({
      success: true,
      data: {
        api: metrics.api,
        timestamp: metrics.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get API metrics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/metrics/database:
 *   get:
 *     summary: Get database performance metrics
 *     description: Returns database query performance and connection metrics
 *     tags: [Performance]
 */
router.get('/metrics/database', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    
    res.json({
      success: true,
      data: {
        database: metrics.database,
        timestamp: metrics.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get database metrics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/metrics/audio:
 *   get:
 *     summary: Get audio processing performance metrics
 *     description: Returns audio upload, processing, and storage metrics
 *     tags: [Performance]
 */
router.get('/metrics/audio', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    
    res.json({
      success: true,
      data: {
        audio: metrics.audio,
        timestamp: metrics.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get audio metrics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/metrics/voip:
 *   get:
 *     summary: Get VoIP performance metrics
 *     description: Returns VoIP call quality and connection metrics
 *     tags: [Performance]
 */
router.get('/metrics/voip', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    
    res.json({
      success: true,
      data: {
        voip: metrics.voip,
        timestamp: metrics.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get VoIP metrics',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/alerts:
 *   get:
 *     summary: Get recent performance alerts
 *     description: Returns recent performance alerts and their details
 *     tags: [Performance]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of alerts to return
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter alerts by severity level
 */
router.get('/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const severity = req.query.severity;
    
    // For now, return recent alerts from performance monitor
    // In a production system, you might store alerts in a database
    const healthStatus = performanceMonitor.getHealthStatus();
    let alerts = healthStatus.issues || [];
    
    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    // Limit results
    alerts = alerts.slice(0, limit);
    
    res.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
        filters: { limit, severity }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/optimization:
 *   get:
 *     summary: Get performance optimization recommendations
 *     description: Returns AI-powered recommendations for improving system performance
 *     tags: [Performance]
 */
router.get('/optimization', async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    const healthStatus = performanceMonitor.getHealthStatus();
    
    // Generate optimization recommendations based on current metrics
    const recommendations = await generateOptimizationRecommendations(metrics, healthStatus);
    
    res.json({
      success: true,
      data: {
        recommendations,
        basedOnMetrics: {
          timestamp: metrics.timestamp,
          systemStatus: healthStatus.status,
          criticalIssues: healthStatus.criticalIssues
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimization recommendations',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/benchmark:
 *   post:
 *     summary: Run performance benchmark
 *     description: Execute a performance benchmark test
 *     tags: [Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [api, database, audio, system]
 *               duration:
 *                 type: number
 *                 minimum: 5
 *                 maximum: 300
 *                 description: Benchmark duration in seconds
 *               intensity:
 *                 type: string
 *                 enum: [light, moderate, heavy]
 */
router.post('/benchmark', async (req, res) => {
  try {
    const { type, duration = 30, intensity = 'moderate' } = req.body;
    
    if (!['api', 'database', 'audio', 'system'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid benchmark type'
      });
    }
    
    // Start benchmark
    const benchmarkId = `benchmark-${type}-${Date.now()}`;
    console.log(`🚀 Starting ${type} benchmark (${intensity} intensity, ${duration}s)`);
    
    // Run benchmark asynchronously
    runBenchmark(type, duration, intensity, benchmarkId)
      .then(results => {
        console.log(`✅ Benchmark ${benchmarkId} completed:`, results);
      })
      .catch(error => {
        console.error(`❌ Benchmark ${benchmarkId} failed:`, error);
      });
    
    res.json({
      success: true,
      data: {
        benchmarkId,
        type,
        duration,
        intensity,
        status: 'started',
        message: `Benchmark started. Results will be available via WebSocket or check logs.`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start benchmark',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/performance/reset:
 *   post:
 *     summary: Reset performance metrics
 *     description: Clear all performance metrics and start fresh collection
 *     tags: [Performance]
 */
router.post('/reset', (req, res) => {
  try {
    performanceMonitor.resetMetrics();
    
    res.json({
      success: true,
      message: 'Performance metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics',
      details: error.message
    });
  }
});

// Helper function to filter metrics by time range
function filterMetricsByTimeRange(metrics, timeRange) {
  const now = Date.now();
  const timeRangeMs = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  const cutoff = now - (timeRangeMs[timeRange] || timeRangeMs['1h']);
  
  // Filter historical data arrays
  const filtered = { ...metrics };
  
  if (filtered.system?.cpu?.history) {
    filtered.system.cpu.history = filtered.system.cpu.history.filter(
      entry => entry.timestamp > cutoff
    );
  }
  
  if (filtered.system?.memory?.history) {
    filtered.system.memory.history = filtered.system.memory.history.filter(
      entry => entry.timestamp > cutoff
    );
  }
  
  if (filtered.system?.eventLoop?.lag) {
    filtered.system.eventLoop.lag = filtered.system.eventLoop.lag.filter(
      entry => entry.timestamp > cutoff
    );
  }
  
  return filtered;
}

// Generate optimization recommendations based on metrics
async function generateOptimizationRecommendations(metrics, healthStatus) {
  const recommendations = [];
  
  // System recommendations
  if (metrics.system.cpu.current > 0.7) {
    recommendations.push({
      category: 'system',
      priority: 'high',
      title: 'High CPU Usage Detected',
      description: `Current CPU usage is ${Math.round(metrics.system.cpu.current * 100)}%`,
      actions: [
        'Consider implementing request queuing',
        'Review and optimize CPU-intensive operations',
        'Add horizontal scaling if possible',
        'Enable caching for expensive computations'
      ]
    });
  }
  
  if (metrics.system.memory.current > 0.8) {
    recommendations.push({
      category: 'system',
      priority: 'high',
      title: 'High Memory Usage',
      description: `Current memory usage is ${Math.round(metrics.system.memory.current * 100)}%`,
      actions: [
        'Implement memory leak detection',
        'Add memory-based garbage collection tuning',
        'Review large object allocations',
        'Consider memory caching optimizations'
      ]
    });
  }
  
  // API recommendations
  if (metrics.api.requests.avgResponseTime > 1000) {
    recommendations.push({
      category: 'api',
      priority: 'medium',
      title: 'Slow API Response Times',
      description: `Average response time is ${Math.round(metrics.api.requests.avgResponseTime)}ms`,
      actions: [
        'Implement response caching',
        'Add database connection pooling',
        'Review slow endpoints and optimize queries',
        'Consider API response compression'
      ]
    });
  }
  
  // Database recommendations
  if (metrics.database.queries.avgTime > 200) {
    recommendations.push({
      category: 'database',
      priority: 'medium',
      title: 'Slow Database Queries',
      description: `Average query time is ${Math.round(metrics.database.queries.avgTime)}ms`,
      actions: [
        'Add database indexes for frequently queried fields',
        'Review and optimize slow queries',
        'Consider query result caching',
        'Implement connection pooling'
      ]
    });
  }
  
  // Audio recommendations
  if (metrics.audio.processing.queue > 5) {
    recommendations.push({
      category: 'audio',
      priority: 'medium',
      title: 'Audio Processing Queue Buildup',
      description: `${metrics.audio.processing.queue} items in processing queue`,
      actions: [
        'Increase audio processing workers',
        'Implement audio compression',
        'Add background job processing',
        'Consider audio CDN for large files'
      ]
    });
  }
  
  // VoIP recommendations
  if (metrics.voip.connections.failed > 10) {
    recommendations.push({
      category: 'voip',
      priority: 'high',
      title: 'High VoIP Connection Failures',
      description: `${metrics.voip.connections.failed} failed connections detected`,
      actions: [
        'Review network connectivity issues',
        'Implement connection retry logic',
        'Add fallback SIP servers',
        'Check firewall and NAT configurations'
      ]
    });
  }
  
  // General recommendations
  if (healthStatus.issues > 5) {
    recommendations.push({
      category: 'general',
      priority: 'high',
      title: 'Multiple Performance Issues Detected',
      description: `${healthStatus.issues} performance issues identified`,
      actions: [
        'Implement comprehensive monitoring dashboard',
        'Set up automated alerting',
        'Consider load balancing',
        'Review system architecture for scalability'
      ]
    });
  }
  
  return recommendations;
}

// Run performance benchmark
async function runBenchmark(type, duration, intensity, benchmarkId) {
  const results = {
    benchmarkId,
    type,
    startTime: Date.now(),
    duration: duration * 1000,
    intensity,
    metrics: {}
  };
  
  switch (type) {
    case 'api':
      results.metrics = await runApiBenchmark(duration, intensity);
      break;
    case 'database':
      results.metrics = await runDatabaseBenchmark(duration, intensity);
      break;
    case 'audio':
      results.metrics = await runAudioBenchmark(duration, intensity);
      break;
    case 'system':
      results.metrics = await runSystemBenchmark(duration, intensity);
      break;
  }
  
  results.endTime = Date.now();
  results.actualDuration = results.endTime - results.startTime;
  
  return results;
}

async function runApiBenchmark(duration, intensity) {
  const axios = require('axios');
  const baseUrl = 'http://localhost:3001/api';
  
  const endpoints = [
    '/health',
    '/leads',
    '/scripts',
    '/performance/health'
  ];
  
  const concurrency = intensity === 'light' ? 5 : intensity === 'moderate' ? 15 : 30;
  const requestsPerSecond = intensity === 'light' ? 10 : intensity === 'moderate' ? 25 : 50;
  
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    responseTimes: []
  };
  
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  
  const makeRequest = async (endpoint) => {
    const requestStart = Date.now();
    try {
      await axios.get(`${baseUrl}${endpoint}`, { timeout: 5000 });
      const responseTime = Date.now() - requestStart;
      results.responseTimes.push(responseTime);
      results.successfulRequests++;
      results.minResponseTime = Math.min(results.minResponseTime, responseTime);
      results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
    } catch (error) {
      results.failedRequests++;
    }
    results.totalRequests++;
  };
  
  // Run benchmark
  const interval = setInterval(async () => {
    if (Date.now() >= endTime) {
      clearInterval(interval);
      return;
    }
    
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      promises.push(makeRequest(endpoint));
    }
    
    await Promise.allSettled(promises);
  }, 1000 / requestsPerSecond);
  
  // Wait for completion
  await new Promise(resolve => {
    const checkComplete = () => {
      if (Date.now() >= endTime) {
        clearInterval(interval);
        resolve();
      } else {
        setTimeout(checkComplete, 100);
      }
    };
    checkComplete();
  });
  
  // Calculate final metrics
  if (results.responseTimes.length > 0) {
    results.avgResponseTime = results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length;
  }
  
  return results;
}

async function runDatabaseBenchmark(duration, intensity) {
  // This would implement database-specific benchmarks
  // For now, return mock results
  return {
    queriesExecuted: Math.floor(Math.random() * 1000),
    avgQueryTime: Math.floor(Math.random() * 100),
    slowQueries: Math.floor(Math.random() * 10)
  };
}

async function runAudioBenchmark(duration, intensity) {
  // This would implement audio processing benchmarks
  return {
    filesProcessed: Math.floor(Math.random() * 50),
    avgProcessingTime: Math.floor(Math.random() * 2000),
    totalDataProcessed: Math.floor(Math.random() * 100000000)
  };
}

async function runSystemBenchmark(duration, intensity) {
  // This would implement system-level benchmarks
  return {
    cpuUtilization: Math.random() * 100,
    memoryUtilization: Math.random() * 100,
    diskIO: Math.floor(Math.random() * 1000)
  };
}

module.exports = router;