/**
 * Comprehensive Performance Monitoring Service
 * Real-time performance tracking and optimization for ColdCaller system
 */

const EventEmitter = require('events');
const { performance, PerformanceObserver } = require('perf_hooks');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class PerformanceMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      system: {
        cpu: { history: [], current: 0, peak: 0 },
        memory: { history: [], current: 0, peak: 0, heapUsed: 0 },
        eventLoop: { lag: [], avgLag: 0 },
        uptime: 0
      },
      api: {
        requests: { total: 0, active: 0, avgResponseTime: 0, errors: 0 },
        endpoints: new Map(),
        slowRequests: [],
        errorRates: []
      },
      database: {
        connections: { active: 0, peak: 0, created: 0 },
        queries: { total: 0, slow: 0, avgTime: 0, errors: 0 },
        slowQueries: []
      },
      audio: {
        uploads: { total: 0, size: 0, avgProcessingTime: 0 },
        processing: { active: 0, queue: 0, errors: 0 },
        storage: { used: 0, available: 0 }
      },
      voip: {
        calls: { active: 0, total: 0, avgDuration: 0, quality: [] },
        connections: { sip: 0, webrtc: 0, failed: 0 }
      }
    };
    
    this.config = {
      collection: {
        interval: 5000, // 5 seconds
        retentionPeriod: 3600000, // 1 hour
        slowRequestThreshold: 1000, // 1 second
        slowQueryThreshold: 500, // 500ms
        memoryThreshold: 0.8, // 80% memory usage
        cpuThreshold: 0.8 // 80% CPU usage
      },
      alerts: {
        enabled: true,
        channels: ['console', 'websocket'],
        cooldown: 60000 // 1 minute between similar alerts
      }
    };
    
    this.alerts = new Map();
    this.observers = [];
    this.startTime = Date.now();
    
    this.initializeObservers();
    this.startMonitoring();
  }

  initializeObservers() {
    // HTTP Performance Observer
    const httpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordHttpMetric(entry);
      }
    });
    httpObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    this.observers.push(httpObserver);

    // Node.js Performance Hooks
    const nodeObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordNodeMetric(entry);
      }
    });
    nodeObserver.observe({ entryTypes: ['node'] });
    this.observers.push(nodeObserver);
  }

  startMonitoring() {
    // System metrics collection
    this.systemInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collection.interval);

    // Event loop lag monitoring
    this.eventLoopInterval = setInterval(() => {
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        this.recordEventLoopLag(lag);
      });
    }, 1000);

    // Cleanup old metrics
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000); // Every minute

    console.log('🚀 Performance monitoring service started');
  }

  async collectSystemMetrics() {
    try {
      // CPU Usage
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / (process.uptime() * 1000000);
      this.recordCpuMetric(Math.min(cpuPercent, 1)); // Cap at 100%

      // Memory Usage
      const memUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const memPercent = memUsage.rss / totalMemory;
      this.recordMemoryMetric(memPercent, memUsage);

      // System Uptime
      this.metrics.system.uptime = Date.now() - this.startTime;

      // Audio storage metrics
      await this.collectAudioStorageMetrics();

      // Check for alerts
      this.checkSystemAlerts();

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  recordCpuMetric(cpuPercent) {
    const timestamp = Date.now();
    this.metrics.system.cpu.current = cpuPercent;
    this.metrics.system.cpu.peak = Math.max(this.metrics.system.cpu.peak, cpuPercent);
    this.metrics.system.cpu.history.push({ timestamp, value: cpuPercent });
    
    this.trimHistory(this.metrics.system.cpu.history);
  }

  recordMemoryMetric(memPercent, memUsage) {
    const timestamp = Date.now();
    this.metrics.system.memory.current = memPercent;
    this.metrics.system.memory.peak = Math.max(this.metrics.system.memory.peak, memPercent);
    this.metrics.system.memory.heapUsed = memUsage.heapUsed;
    this.metrics.system.memory.history.push({ timestamp, value: memPercent, heap: memUsage.heapUsed });
    
    this.trimHistory(this.metrics.system.memory.history);
  }

  recordEventLoopLag(lag) {
    const timestamp = Date.now();
    this.metrics.system.eventLoop.lag.push({ timestamp, value: lag });
    
    // Calculate average lag
    const recentLags = this.metrics.system.eventLoop.lag.slice(-10);
    this.metrics.system.eventLoop.avgLag = 
      recentLags.reduce((sum, entry) => sum + entry.value, 0) / recentLags.length;
    
    this.trimHistory(this.metrics.system.eventLoop.lag);
  }

  recordHttpMetric(entry) {
    const endpoint = this.extractEndpoint(entry.name);
    if (!endpoint) return;

    // Update global API metrics
    this.metrics.api.requests.total++;
    this.updateAverageResponseTime(entry.duration);

    // Update endpoint-specific metrics
    if (!this.metrics.api.endpoints.has(endpoint)) {
      this.metrics.api.endpoints.set(endpoint, {
        requests: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
        slowRequests: 0
      });
    }

    const endpointMetrics = this.metrics.api.endpoints.get(endpoint);
    endpointMetrics.requests++;
    endpointMetrics.totalTime += entry.duration;
    endpointMetrics.avgTime = endpointMetrics.totalTime / endpointMetrics.requests;

    // Track slow requests
    if (entry.duration > this.config.collection.slowRequestThreshold) {
      endpointMetrics.slowRequests++;
      this.recordSlowRequest(endpoint, entry.duration);
    }
  }

  recordSlowRequest(endpoint, duration) {
    const slowRequest = {
      endpoint,
      duration: Math.round(duration),
      timestamp: new Date().toISOString()
    };

    this.metrics.api.slowRequests.push(slowRequest);
    
    // Keep only recent slow requests
    if (this.metrics.api.slowRequests.length > 100) {
      this.metrics.api.slowRequests.shift();
    }

    // Emit alert for very slow requests
    if (duration > this.config.collection.slowRequestThreshold * 2) {
      this.emitAlert('slow_request', {
        endpoint,
        duration,
        severity: 'high'
      });
    }
  }

  recordDatabaseMetric(type, duration, query) {
    this.metrics.database.queries.total++;
    
    // Update average query time
    const totalTime = this.metrics.database.queries.avgTime * (this.metrics.database.queries.total - 1);
    this.metrics.database.queries.avgTime = (totalTime + duration) / this.metrics.database.queries.total;

    // Track slow queries
    if (duration > this.config.collection.slowQueryThreshold) {
      this.metrics.database.queries.slow++;
      this.recordSlowQuery(type, duration, query);
    }
  }

  recordSlowQuery(type, duration, query) {
    const slowQuery = {
      type,
      duration: Math.round(duration),
      query: query.length > 200 ? query.substring(0, 200) + '...' : query,
      timestamp: new Date().toISOString()
    };

    this.metrics.database.slowQueries.push(slowQuery);
    
    // Keep only recent slow queries
    if (this.metrics.database.slowQueries.length > 50) {
      this.metrics.database.slowQueries.shift();
    }
  }

  recordAudioMetric(type, data) {
    switch (type) {
      case 'upload':
        this.metrics.audio.uploads.total++;
        this.metrics.audio.uploads.size += data.size || 0;
        if (data.processingTime) {
          this.updateAudioProcessingTime(data.processingTime);
        }
        break;
      
      case 'processing_start':
        this.metrics.audio.processing.active++;
        this.metrics.audio.processing.queue = Math.max(0, this.metrics.audio.processing.queue - 1);
        break;
      
      case 'processing_complete':
        this.metrics.audio.processing.active = Math.max(0, this.metrics.audio.processing.active - 1);
        break;
      
      case 'processing_error':
        this.metrics.audio.processing.errors++;
        this.metrics.audio.processing.active = Math.max(0, this.metrics.audio.processing.active - 1);
        break;
      
      case 'queue':
        this.metrics.audio.processing.queue++;
        break;
    }
  }

  recordVoipMetric(type, data) {
    switch (type) {
      case 'call_start':
        this.metrics.voip.calls.active++;
        this.metrics.voip.calls.total++;
        break;
      
      case 'call_end':
        this.metrics.voip.calls.active = Math.max(0, this.metrics.voip.calls.active - 1);
        if (data.duration) {
          this.updateCallDuration(data.duration);
        }
        break;
      
      case 'call_quality':
        this.metrics.voip.calls.quality.push({
          timestamp: Date.now(),
          quality: data.quality,
          metrics: data.metrics
        });
        this.trimHistory(this.metrics.voip.calls.quality);
        break;
      
      case 'connection':
        if (data.type === 'sip') {
          this.metrics.voip.connections.sip += data.delta || 1;
        } else if (data.type === 'webrtc') {
          this.metrics.voip.connections.webrtc += data.delta || 1;
        }
        break;
      
      case 'connection_failed':
        this.metrics.voip.connections.failed++;
        break;
    }
  }

  async collectAudioStorageMetrics() {
    try {
      const audioDir = path.join(__dirname, '../../uploads/audio');
      const stats = await fs.stat(audioDir).catch(() => null);
      
      if (stats) {
        // Calculate directory size
        const files = await fs.readdir(audioDir);
        let totalSize = 0;
        
        for (const file of files) {
          try {
            const fileStat = await fs.stat(path.join(audioDir, file));
            totalSize += fileStat.size;
          } catch (err) {
            // File might have been deleted
          }
        }
        
        this.metrics.audio.storage.used = totalSize;
      }
      
      // Get available disk space
      const diskUsage = await this.getDiskUsage();
      this.metrics.audio.storage.available = diskUsage.free;
      
    } catch (error) {
      console.error('Error collecting audio storage metrics:', error);
    }
  }

  getDiskUsage() {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec('df -h .', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          const lines = stdout.trim().split('\n');
          const data = lines[1].split(/\s+/);
          resolve({
            total: this.parseSize(data[1]),
            used: this.parseSize(data[2]),
            free: this.parseSize(data[3])
          });
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  parseSize(sizeStr) {
    const units = { K: 1024, M: 1024**2, G: 1024**3, T: 1024**4 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGT]?)$/);
    if (!match) return 0;
    
    const [, number, unit] = match;
    return parseFloat(number) * (units[unit] || 1);
  }

  updateAverageResponseTime(duration) {
    const total = this.metrics.api.requests.total;
    const currentAvg = this.metrics.api.requests.avgResponseTime;
    this.metrics.api.requests.avgResponseTime = 
      ((currentAvg * (total - 1)) + duration) / total;
  }

  updateAudioProcessingTime(duration) {
    const total = this.metrics.audio.uploads.total;
    const currentAvg = this.metrics.audio.uploads.avgProcessingTime;
    this.metrics.audio.uploads.avgProcessingTime = 
      ((currentAvg * (total - 1)) + duration) / total;
  }

  updateCallDuration(duration) {
    const total = this.metrics.voip.calls.total;
    const currentAvg = this.metrics.voip.calls.avgDuration;
    this.metrics.voip.calls.avgDuration = 
      ((currentAvg * (total - 1)) + duration) / total;
  }

  extractEndpoint(url) {
    try {
      const match = url.match(/\/api\/([^?]+)/);
      return match ? `/api/${match[1]}` : null;
    } catch {
      return null;
    }
  }

  checkSystemAlerts() {
    const now = Date.now();
    
    // CPU Alert
    if (this.metrics.system.cpu.current > this.config.collection.cpuThreshold) {
      this.emitAlert('high_cpu', {
        current: this.metrics.system.cpu.current,
        threshold: this.config.collection.cpuThreshold,
        severity: 'high'
      });
    }
    
    // Memory Alert
    if (this.metrics.system.memory.current > this.config.collection.memoryThreshold) {
      this.emitAlert('high_memory', {
        current: this.metrics.system.memory.current,
        threshold: this.config.collection.memoryThreshold,
        severity: 'high'
      });
    }
    
    // Event Loop Lag Alert
    if (this.metrics.system.eventLoop.avgLag > 100) {
      this.emitAlert('event_loop_lag', {
        avgLag: this.metrics.system.eventLoop.avgLag,
        severity: 'medium'
      });
    }
  }

  emitAlert(type, data) {
    const now = Date.now();
    const lastAlert = this.alerts.get(type);
    
    // Check cooldown
    if (lastAlert && (now - lastAlert) < this.config.alerts.cooldown) {
      return;
    }
    
    this.alerts.set(type, now);
    
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      data,
      id: `${type}-${now}`
    };
    
    // Emit to listeners
    this.emit('alert', alert);
    
    // Console logging
    if (this.config.alerts.channels.includes('console')) {
      console.warn(`🚨 Performance Alert [${alert.data.severity?.toUpperCase()}]: ${type}`, alert.data);
    }
  }

  trimHistory(historyArray, maxAge = this.config.collection.retentionPeriod) {
    const cutoff = Date.now() - maxAge;
    let index = 0;
    
    while (index < historyArray.length && historyArray[index].timestamp < cutoff) {
      index++;
    }
    
    if (index > 0) {
      historyArray.splice(0, index);
    }
  }

  cleanupOldMetrics() {
    // Clean up system metrics
    this.trimHistory(this.metrics.system.cpu.history);
    this.trimHistory(this.metrics.system.memory.history);
    this.trimHistory(this.metrics.system.eventLoop.lag);
    
    // Clean up API metrics
    this.metrics.api.slowRequests = this.metrics.api.slowRequests.filter(
      req => Date.now() - new Date(req.timestamp).getTime() < this.config.collection.retentionPeriod
    );
    
    // Clean up database metrics
    this.metrics.database.slowQueries = this.metrics.database.slowQueries.filter(
      query => Date.now() - new Date(query.timestamp).getTime() < this.config.collection.retentionPeriod
    );
    
    // Clean up VoIP quality metrics
    this.trimHistory(this.metrics.voip.calls.quality);
  }

  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      system: this.metrics.system,
      api: {
        ...this.metrics.api,
        endpoints: Object.fromEntries(this.metrics.api.endpoints)
      },
      database: this.metrics.database,
      audio: this.metrics.audio,
      voip: this.metrics.voip
    };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const issues = [];
    
    // System health checks
    if (metrics.system.cpu.current > 0.8) {
      issues.push({ type: 'high_cpu', severity: 'high', value: metrics.system.cpu.current });
    }
    
    if (metrics.system.memory.current > 0.8) {
      issues.push({ type: 'high_memory', severity: 'high', value: metrics.system.memory.current });
    }
    
    if (metrics.system.eventLoop.avgLag > 50) {
      issues.push({ type: 'event_loop_lag', severity: 'medium', value: metrics.system.eventLoop.avgLag });
    }
    
    // API health checks
    if (metrics.api.requests.avgResponseTime > 1000) {
      issues.push({ type: 'slow_api', severity: 'medium', value: metrics.api.requests.avgResponseTime });
    }
    
    // Database health checks
    if (metrics.database.queries.avgTime > 500) {
      issues.push({ type: 'slow_queries', severity: 'medium', value: metrics.database.queries.avgTime });
    }
    
    // Determine overall status
    let status = 'healthy';
    if (issues.some(i => i.severity === 'high')) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      timestamp: metrics.timestamp,
      uptime: metrics.system.uptime,
      issues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'high').length,
      performance: {
        cpu: Math.round(metrics.system.cpu.current * 100),
        memory: Math.round(metrics.system.memory.current * 100),
        avgResponseTime: Math.round(metrics.api.requests.avgResponseTime),
        avgQueryTime: Math.round(metrics.database.queries.avgTime),
        activeCalls: metrics.voip.calls.active
      },
      issues: issues
    };
  }

  resetMetrics() {
    this.metrics = {
      system: {
        cpu: { history: [], current: 0, peak: 0 },
        memory: { history: [], current: 0, peak: 0, heapUsed: 0 },
        eventLoop: { lag: [], avgLag: 0 },
        uptime: 0
      },
      api: {
        requests: { total: 0, active: 0, avgResponseTime: 0, errors: 0 },
        endpoints: new Map(),
        slowRequests: [],
        errorRates: []
      },
      database: {
        connections: { active: 0, peak: 0, created: 0 },
        queries: { total: 0, slow: 0, avgTime: 0, errors: 0 },
        slowQueries: []
      },
      audio: {
        uploads: { total: 0, size: 0, avgProcessingTime: 0 },
        processing: { active: 0, queue: 0, errors: 0 },
        storage: { used: 0, available: 0 }
      },
      voip: {
        calls: { active: 0, total: 0, avgDuration: 0, quality: [] },
        connections: { sip: 0, webrtc: 0, failed: 0 }
      }
    };
    
    this.startTime = Date.now();
    console.log('📊 Performance metrics reset');
  }

  stop() {
    if (this.systemInterval) clearInterval(this.systemInterval);
    if (this.eventLoopInterval) clearInterval(this.eventLoopInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    console.log('⏹️ Performance monitoring service stopped');
  }
}

module.exports = new PerformanceMonitoringService();