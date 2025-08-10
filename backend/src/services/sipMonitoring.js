/**
 * SIP Monitoring Service
 * Real-time monitoring, alerting, and diagnostics for SIP infrastructure
 */

const EventEmitter = require('events');
const { Op } = require('sequelize');
const SipConfiguration = require('../database/models/SipConfiguration');
const SipCallLog = require('../database/models/SipCallLog');
const NodeCache = require('node-cache');

class SipMonitoringService extends EventEmitter {
  constructor() {
    super();
    
    this.cache = new NodeCache({ stdTTL: 60 }); // 1-minute cache
    this.monitoring = {
      active: false,
      interval: 30000, // 30 seconds
      timer: null
    };
    
    this.alerts = new Map();
    this.thresholds = {
      successRate: 90, // Minimum success rate %
      mosScore: 3.5,   // Minimum MOS score
      maxLatency: 200, // Maximum latency in ms
      maxErrors: 5,    // Maximum errors per hour
      maxCallDuration: 3600 // Maximum call duration in seconds
    };
    
    this.diagnostics = {
      traces: [],
      networkTests: [],
      performanceLog: [],
      securityEvents: []
    };
  }
  
  /**
   * Start real-time monitoring
   */
  startMonitoring() {
    if (this.monitoring.active) {
      console.log('🔍 Monitoring already active');
      return;
    }
    
    this.monitoring.active = true;
    this.monitoring.timer = setInterval(async () => {
      await this.performMonitoringCheck();
    }, this.monitoring.interval);
    
    console.log(`✅ SIP monitoring started (interval: ${this.monitoring.interval}ms)`);
    this.emit('monitoringStarted');
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.monitoring.active) return;
    
    this.monitoring.active = false;
    if (this.monitoring.timer) {
      clearInterval(this.monitoring.timer);
      this.monitoring.timer = null;
    }
    
    console.log('🛑 SIP monitoring stopped');
    this.emit('monitoringStopped');
  }
  
  /**
   * Perform comprehensive monitoring check
   */
  async performMonitoringCheck() {
    try {
      const checkResults = {
        timestamp: new Date().toISOString(),
        configurations: [],
        alerts: [],
        networkHealth: null,
        systemHealth: null
      };
      
      // Check all active configurations
      const activeConfigs = await SipConfiguration.findAll({
        where: { active: true }
      });
      
      for (const config of activeConfigs) {
        const configHealth = await this.checkConfigurationHealth(config);
        checkResults.configurations.push(configHealth);
        
        // Generate alerts for issues
        const alerts = this.generateAlertsForConfig(config, configHealth);
        checkResults.alerts.push(...alerts);
      }
      
      // Check network health
      checkResults.networkHealth = await this.checkNetworkHealth();
      
      // Check system health
      checkResults.systemHealth = await this.checkSystemHealth();
      
      // Store monitoring data
      this.storeMonitoringData(checkResults);
      
      // Process alerts
      this.processAlerts(checkResults.alerts);
      
      // Emit monitoring event
      this.emit('monitoringCheck', checkResults);
      
      console.log(`📊 Monitoring check completed: ${checkResults.configurations.length} configs, ${checkResults.alerts.length} alerts`);
      
    } catch (error) {
      console.error('❌ Monitoring check failed:', error);
      this.emit('monitoringError', error);
    }
  }
  
  /**
   * Check health of specific SIP configuration
   */
  async checkConfigurationHealth(config) {
    const configHealth = {
      configurationId: config.id,
      name: config.name,
      provider: config.provider,
      status: 'unknown',
      metrics: {},
      issues: [],
      lastChecked: new Date().toISOString()
    };
    
    try {
      // Get recent call statistics (last 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCalls = await SipCallLog.findAll({
        where: {
          sip_configuration_id: config.id,
          start_time: { [Op.gte]: oneHourAgo }
        }
      });
      
      // Calculate metrics
      const totalCalls = recentCalls.length;
      const successfulCalls = recentCalls.filter(call => 
        ['answered', 'connected', 'ended'].includes(call.status)
      ).length;
      const failedCalls = recentCalls.filter(call => call.status === 'failed').length;
      const avgMos = recentCalls
        .filter(call => call.mos_score)
        .reduce((sum, call, _, arr) => sum + (call.mos_score / arr.length), 0) || 0;
      
      configHealth.metrics = {
        totalCalls,
        successfulCalls,
        failedCalls,
        successRate: totalCalls > 0 ? (successfulCalls / totalCalls * 100) : 0,
        errorRate: totalCalls > 0 ? (failedCalls / totalCalls * 100) : 0,
        averageMos: avgMos,
        activeCalls: recentCalls.filter(call => 
          ['initiated', 'ringing', 'connected', 'on_hold'].includes(call.status)
        ).length
      };
      
      // Determine overall status
      configHealth.status = this.determineConfigStatus(configHealth.metrics);
      
      // Check for specific issues
      configHealth.issues = this.identifyConfigIssues(config, configHealth.metrics);
      
    } catch (error) {
      configHealth.status = 'error';
      configHealth.error = error.message;
      configHealth.issues.push({
        type: 'monitoring',
        severity: 'high',
        message: 'Health check failed',
        details: error.message
      });
    }
    
    return configHealth;
  }
  
  /**
   * Check overall network health
   */
  async checkNetworkHealth() {
    const networkHealth = {
      status: 'unknown',
      tests: [],
      metrics: {
        averageLatency: 0,
        packetLoss: 0,
        jitter: 0,
        bandwidth: 0
      },
      issues: []
    };
    
    try {
      // Test connectivity to common DNS servers
      const testHosts = [
        { name: 'Google DNS', host: '8.8.8.8', port: 53 },
        { name: 'Cloudflare DNS', host: '1.1.1.1', port: 53 }
      ];
      
      for (const testHost of testHosts) {
        const test = await this.performNetworkTest(testHost.host, testHost.port);
        networkHealth.tests.push({
          name: testHost.name,
          host: testHost.host,
          port: testHost.port,
          ...test
        });
      }
      
      // Calculate aggregate metrics
      const successfulTests = networkHealth.tests.filter(test => test.success);
      if (successfulTests.length > 0) {
        networkHealth.metrics.averageLatency = successfulTests
          .reduce((sum, test) => sum + test.latency, 0) / successfulTests.length;
      }
      
      // Determine network status
      const successRate = (successfulTests.length / networkHealth.tests.length) * 100;
      if (successRate >= 90) networkHealth.status = 'excellent';
      else if (successRate >= 75) networkHealth.status = 'good';
      else if (successRate >= 50) networkHealth.status = 'fair';
      else networkHealth.status = 'poor';
      
    } catch (error) {
      networkHealth.status = 'error';
      networkHealth.error = error.message;
    }
    
    return networkHealth;
  }
  
  /**
   * Check system health
   */
  async checkSystemHealth() {
    const systemHealth = {
      status: 'unknown',
      metrics: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        activeConnections: 0,
        errorRate: 0
      },
      issues: []
    };
    
    try {
      // Check memory usage
      const memUsage = process.memoryUsage();
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (memoryUsagePercent > 90) {
        systemHealth.issues.push({
          type: 'memory',
          severity: 'high',
          message: 'High memory usage detected',
          value: `${memoryUsagePercent.toFixed(1)}%`
        });
      }
      
      // Check recent error rate
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentErrors = await SipCallLog.count({
        where: {
          status: 'failed',
          start_time: { [Op.gte]: oneHourAgo }
        }
      });
      
      const totalRecentCalls = await SipCallLog.count({
        where: {
          start_time: { [Op.gte]: oneHourAgo }
        }
      });
      
      systemHealth.metrics.errorRate = totalRecentCalls > 0 ? 
        (recentErrors / totalRecentCalls) * 100 : 0;
      
      // Determine system status
      if (systemHealth.issues.length === 0 && systemHealth.metrics.errorRate < 5) {
        systemHealth.status = 'healthy';
      } else if (systemHealth.metrics.errorRate < 15) {
        systemHealth.status = 'warning';
      } else {
        systemHealth.status = 'critical';
      }
      
    } catch (error) {
      systemHealth.status = 'error';
      systemHealth.error = error.message;
    }
    
    return systemHealth;
  }
  
  /**
   * Generate alerts for configuration issues
   */
  generateAlertsForConfig(config, health) {
    const alerts = [];
    
    // Success rate alert
    if (health.metrics.successRate < this.thresholds.successRate) {
      alerts.push({
        id: `success-rate-${config.id}`,
        type: 'success_rate',
        severity: health.metrics.successRate < 50 ? 'critical' : 'warning',
        configurationId: config.id,
        configurationName: config.name,
        message: `Low success rate: ${health.metrics.successRate.toFixed(1)}%`,
        threshold: this.thresholds.successRate,
        currentValue: health.metrics.successRate,
        timestamp: new Date().toISOString()
      });
    }
    
    // MOS score alert
    if (health.metrics.averageMos > 0 && health.metrics.averageMos < this.thresholds.mosScore) {
      alerts.push({
        id: `mos-score-${config.id}`,
        type: 'audio_quality',
        severity: health.metrics.averageMos < 2.5 ? 'critical' : 'warning',
        configurationId: config.id,
        configurationName: config.name,
        message: `Poor audio quality: MOS ${health.metrics.averageMos.toFixed(1)}`,
        threshold: this.thresholds.mosScore,
        currentValue: health.metrics.averageMos,
        timestamp: new Date().toISOString()
      });
    }
    
    return alerts;
  }
  
  /**
   * Process and store alerts
   */
  processAlerts(alerts) {
    for (const alert of alerts) {
      const existing = this.alerts.get(alert.id);
      
      if (!existing) {
        // New alert
        this.alerts.set(alert.id, {
          ...alert,
          count: 1,
          firstOccurrence: alert.timestamp,
          lastOccurrence: alert.timestamp,
          status: 'active'
        });
        
        console.log(`🚨 New alert: ${alert.message} (${alert.severity})`);
        this.emit('newAlert', alert);
      } else {
        // Update existing alert
        existing.count++;
        existing.lastOccurrence = alert.timestamp;
        existing.currentValue = alert.currentValue;
        
        this.emit('alertUpdated', existing);
      }
    }
  }
  
  // Helper Methods
  
  determineConfigStatus(metrics) {
    if (metrics.successRate >= 95 && metrics.averageMos >= 4.0) return 'excellent';
    if (metrics.successRate >= 85 && metrics.averageMos >= 3.5) return 'good';
    if (metrics.successRate >= 70 && metrics.averageMos >= 3.0) return 'fair';
    if (metrics.successRate >= 50) return 'poor';
    return 'critical';
  }
  
  identifyConfigIssues(config, metrics) {
    const issues = [];
    
    if (metrics.successRate < 70) {
      issues.push({
        type: 'reliability',
        severity: 'high',
        message: 'Low call success rate indicates connectivity or authentication issues'
      });
    }
    
    if (metrics.averageMos > 0 && metrics.averageMos < 3.0) {
      issues.push({
        type: 'quality',
        severity: 'medium',
        message: 'Poor audio quality may affect call experience'
      });
    }
    
    if (metrics.errorRate > 20) {
      issues.push({
        type: 'errors',
        severity: 'medium',
        message: 'High error rate detected in recent calls'
      });
    }
    
    return issues;
  }
  
  async performNetworkTest(host, port) {
    return new Promise((resolve) => {
      const net = require('net');
      const startTime = Date.now();
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          latency: 0,
          error: 'Connection timeout'
        });
      }, 5000);
      
      socket.connect(port, host, () => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;
        socket.end();
        
        resolve({
          success: true,
          latency,
          error: null
        });
      });
      
      socket.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          latency: 0,
          error: error.message
        });
      });
    });
  }
  
  storeMonitoringData(checkResults) {
    // Store in performance log
    this.diagnostics.performanceLog.push({
      timestamp: checkResults.timestamp,
      configurations: checkResults.configurations.length,
      alerts: checkResults.alerts.length,
      networkStatus: checkResults.networkHealth?.status,
      systemStatus: checkResults.systemHealth?.status
    });
    
    // Keep only last 1000 entries
    if (this.diagnostics.performanceLog.length > 1000) {
      this.diagnostics.performanceLog = this.diagnostics.performanceLog.slice(-1000);
    }
  }
  
  // Public API Methods
  
  getMonitoringStatus() {
    return {
      active: this.monitoring.active,
      interval: this.monitoring.interval,
      thresholds: this.thresholds,
      activeAlerts: Array.from(this.alerts.values()).filter(alert => alert.status === 'active'),
      totalAlerts: this.alerts.size
    };
  }
  
  getActiveAlerts() {
    return Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active')
      .sort((a, b) => new Date(b.lastOccurrence) - new Date(a.lastOccurrence));
  }
  
  resolveAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }
  
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('🔧 Monitoring thresholds updated:', this.thresholds);
    this.emit('thresholdsUpdated', this.thresholds);
  }
  
  getDiagnostics() {
    return {
      traces: this.diagnostics.traces.slice(-100),
      networkTests: this.diagnostics.networkTests.slice(-50),
      performanceLog: this.diagnostics.performanceLog.slice(-100),
      securityEvents: this.diagnostics.securityEvents.slice(-50)
    };
  }
}

module.exports = new SipMonitoringService();