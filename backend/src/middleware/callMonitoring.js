const WebSocketManager = require('../services/webSocketManager');
const SIPManager = require('../services/sipManager');
const { systemMetrics } = require('../data/dataStore');

/**
 * Middleware for monitoring call activities and system performance
 */
class CallMonitoringMiddleware {
  
  /**
   * Track call API requests
   */
  static trackCallRequest(req, res, next) {
    const startTime = Date.now();
    
    // Store original end method
    const originalEnd = res.end;
    
    res.end = function(...args) {
      // Call original end method
      originalEnd.apply(this, args);
      
      // Track metrics
      const duration = Date.now() - startTime;
      const method = req.method;
      const route = req.route ? req.route.path : req.path;
      const statusCode = res.statusCode;
      
      // Update system metrics
      CallMonitoringMiddleware.updateSystemMetrics({
        method,
        route,
        statusCode,
        duration,
        timestamp: new Date().toISOString()
      });
      
      // Broadcast API activity if it's a call-related operation
      if (route && route.includes('/calls/')) {
        WebSocketManager.broadcast('api', {
          type: 'apiCall',
          data: {
            method,
            route,
            statusCode,
            duration,
            timestamp: new Date().toISOString()
          }
        });
      }
    };
    
    next();
  }

  /**
   * Monitor call quality in real-time
   */
  static monitorCallQuality(req, res, next) {
    // Only apply to call update endpoints
    if (req.path.includes('/calls/') && req.path.includes('/update')) {
      const originalJson = res.json;
      
      res.json = function(data) {
        // Check if call quality data is included
        if (data && data.data && data.data.quality) {
          const callId = req.params.id;
          const quality = data.data.quality;
          
          // Broadcast real-time quality update
          WebSocketManager.sendCallQualityUpdate(callId, quality);
          
          // Update system averages
          CallMonitoringMiddleware.updateQualityMetrics(quality);
        }
        
        return originalJson.call(this, data);
      };
    }
    
    next();
  }

  /**
   * Log SIP events
   */
  static logSIPEvents(req, res, next) {
    if (req.path.includes('/sip/')) {
      const originalJson = res.json;
      
      res.json = function(data) {
        // Log SIP configuration changes
        if (req.method === 'POST' && req.path === '/api/sip/configure') {
          console.log(`📞 SIP Configuration Updated: ${JSON.stringify({
            provider: req.body.provider,
            server: req.body.server,
            port: req.body.port,
            transport: req.body.transport,
            timestamp: new Date().toISOString()
          })}`);
        }
        
        // Log registration events
        if (req.path.includes('/register') || req.path.includes('/unregister')) {
          console.log(`📞 SIP ${req.path.includes('register') ? 'Registration' : 'Unregistration'}: ${new Date().toISOString()}`);
        }
        
        return originalJson.call(this, data);
      };
    }
    
    next();
  }

  /**
   * Performance monitoring
   */
  static performanceMonitor(req, res, next) {
    const startTime = process.hrtime.bigint();
    
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds
      
      // Log slow requests (>1000ms)
      if (duration > 1000) {
        console.warn(`⚠️  Slow request detected: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
        
        // Broadcast performance alert
        WebSocketManager.broadcast('performance', {
          type: 'slowRequest',
          data: {
            method: req.method,
            path: req.path,
            duration: duration.toFixed(2),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Update performance metrics
      systemMetrics.averageResponseTime = CallMonitoringMiddleware.calculateMovingAverage(
        systemMetrics.averageResponseTime || 0,
        duration
      );
    });
    
    next();
  }

  /**
   * Memory usage monitoring
   */
  static memoryMonitor(req, res, next) {
    const memUsage = process.memoryUsage();
    const threshold = 100 * 1024 * 1024; // 100MB threshold
    
    if (memUsage.heapUsed > threshold) {
      console.warn(`⚠️  High memory usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      // Broadcast memory alert
      WebSocketManager.broadcast('system', {
        type: 'highMemoryUsage',
        data: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    next();
  }

  /**
   * Update system metrics
   */
  static updateSystemMetrics(data) {
    systemMetrics.lastUpdate = data.timestamp;
    
    // Increment counters based on request type
    if (data.route && data.route.includes('/start')) {
      systemMetrics.totalCallsStarted++;
    }
    
    if (data.route && data.route.includes('/end')) {
      systemMetrics.totalCallsCompleted++;
    }
    
    // Calculate system uptime
    systemMetrics.systemUptime = process.uptime();
  }

  /**
   * Update call quality metrics
   */
  static updateQualityMetrics(quality) {
    if (quality.mos) {
      systemMetrics.averageCallQuality = CallMonitoringMiddleware.calculateMovingAverage(
        systemMetrics.averageCallQuality || 0,
        quality.mos
      );
    }
  }

  /**
   * Calculate moving average (simple implementation)
   */
  static calculateMovingAverage(currentAvg, newValue, weight = 0.1) {
    return currentAvg + (newValue - currentAvg) * weight;
  }

  /**
   * Get monitoring statistics
   */
  static getMonitoringStats() {
    return {
      systemMetrics,
      websocketStats: WebSocketManager.getStats(),
      sipStats: SIPManager.getCallMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check endpoint data
   */
  static async getHealthCheck() {
    const memUsage = process.memoryUsage();
    const sipStatus = await SIPManager.getRegistrationStatus();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      sip: {
        registered: sipStatus.registered,
        connectionQuality: sipStatus.connectionQuality,
        activeCalls: sipStatus.activeConnections
      },
      websocket: {
        connectedClients: WebSocketManager.getStats().totalClients
      },
      system: systemMetrics
    };
  }
}

module.exports = CallMonitoringMiddleware;