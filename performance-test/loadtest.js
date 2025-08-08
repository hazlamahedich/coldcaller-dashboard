/**
 * Comprehensive Load Testing Suite for ColdCaller
 * Tests API performance, WebSocket connections, and VOIP capacity
 */

const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class LoadTestSuite {
  constructor() {
    this.config = {
      baseUrl: process.env.API_URL || 'http://localhost:3001',
      wsUrl: process.env.WS_URL || 'ws://localhost:3001',
      testDuration: 60000, // 1 minute
      rampUpTime: 10000,   // 10 seconds
      maxConcurrentUsers: 100,
      requestsPerSecond: 50,
      thresholds: {
        avgResponseTime: 500,  // 500ms
        maxResponseTime: 2000, // 2 seconds
        errorRate: 0.05,       // 5%
        throughput: 45         // 45 RPS minimum
      }
    };
    
    this.results = {
      tests: {},
      summary: {},
      errors: []
    };
    
    this.scenarios = {
      api: {
        name: 'API Load Test',
        endpoints: [
          { path: '/api/health', method: 'GET', weight: 20 },
          { path: '/api/leads', method: 'GET', weight: 30 },
          { path: '/api/scripts', method: 'GET', weight: 20 },
          { path: '/api/analytics', method: 'GET', weight: 15 },
          { path: '/api/calls', method: 'POST', weight: 10, body: { leadId: 1, duration: 300 } },
          { path: '/api/performance/health', method: 'GET', weight: 5 }
        ]
      },
      websocket: {
        name: 'WebSocket Load Test',
        concurrentConnections: 50,
        messagesPerConnection: 100,
        messageInterval: 1000
      },
      voip: {
        name: 'VOIP Capacity Test',
        concurrentCalls: 25,
        callDuration: 30000,
        sipRegistrations: 50
      },
      stress: {
        name: 'Stress Test',
        maxUsers: 500,
        rampUpTime: 30000,
        sustainTime: 60000
      }
    };
  }
  
  async runAllTests() {
    console.log('🚀 Starting comprehensive load testing suite...\n');
    
    try {
      // Warm up the system
      await this.warmUpSystem();
      
      // Run individual test scenarios
      await this.runApiLoadTest();
      await this.runWebSocketLoadTest();
      await this.runVoipCapacityTest();
      await this.runStressTest();
      
      // Generate comprehensive report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Load testing suite failed:', error);
      process.exit(1);
    }
  }
  
  async warmUpSystem() {
    console.log('🔥 Warming up system...');
    
    const warmUpRequests = [];
    const endpoints = this.scenarios.api.endpoints;
    
    for (let i = 0; i < 20; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      warmUpRequests.push(this.makeRequest(endpoint));
    }
    
    await Promise.allSettled(warmUpRequests);
    
    // Wait for system to stabilize
    await this.sleep(3000);
    
    console.log('✅ System warmed up\n');
  }
  
  async runApiLoadTest() {
    console.log('📊 Running API load test...');
    
    const testResults = {
      name: this.scenarios.api.name,
      startTime: Date.now(),
      requests: [],
      errors: [],
      metrics: {}
    };
    
    const concurrentUsers = Math.min(this.config.maxConcurrentUsers, 50);
    const testDuration = this.config.testDuration;
    const requestsPerSecond = this.config.requestsPerSecond;
    
    console.log(`  Concurrent users: ${concurrentUsers}`);
    console.log(`  Target RPS: ${requestsPerSecond}`);
    console.log(`  Duration: ${testDuration / 1000}s`);
    
    // Create user workers
    const workers = [];
    for (let i = 0; i < concurrentUsers; i++) {
      workers.push(this.createApiWorker(i, testDuration, testResults));
    }
    
    // Start workers with ramp-up
    const rampUpDelay = this.config.rampUpTime / concurrentUsers;
    for (let i = 0; i < workers.length; i++) {
      setTimeout(() => workers[i](), i * rampUpDelay);
    }
    
    // Wait for test completion
    await this.sleep(testDuration + this.config.rampUpTime + 5000);
    
    // Calculate metrics
    testResults.endTime = Date.now();
    testResults.metrics = this.calculateMetrics(testResults);
    
    this.results.tests.api = testResults;
    
    console.log(`✅ API load test completed`);
    console.log(`  Total requests: ${testResults.requests.length}`);
    console.log(`  Average response time: ${testResults.metrics.avgResponseTime?.toFixed(2)}ms`);
    console.log(`  Error rate: ${(testResults.metrics.errorRate * 100)?.toFixed(2)}%`);
    console.log(`  Throughput: ${testResults.metrics.throughput?.toFixed(2)} RPS\n`);
  }
  
  async createApiWorker(workerId, duration, testResults) {
    return async () => {
      const endTime = Date.now() + duration;
      const endpoints = this.scenarios.api.endpoints;
      
      while (Date.now() < endTime) {
        try {
          // Select endpoint based on weight
          const endpoint = this.selectWeightedEndpoint(endpoints);
          
          const startTime = performance.now();
          const response = await this.makeRequest(endpoint);
          const responseTime = performance.now() - startTime;
          
          testResults.requests.push({
            workerId,
            endpoint: endpoint.path,
            method: endpoint.method,
            responseTime,
            statusCode: response.statusCode,
            timestamp: Date.now(),
            success: response.statusCode < 400
          });
          
        } catch (error) {
          testResults.errors.push({
            workerId,
            error: error.message,
            timestamp: Date.now()
          });
        }
        
        // Wait between requests
        await this.sleep(Math.random() * 2000); // 0-2 seconds
      }
    };
  }
  
  async runWebSocketLoadTest() {
    console.log('🔌 Running WebSocket load test...');
    
    const testResults = {
      name: this.scenarios.websocket.name,
      startTime: Date.now(),
      connections: [],
      messages: [],
      errors: [],
      metrics: {}
    };
    
    const { concurrentConnections, messagesPerConnection, messageInterval } = this.scenarios.websocket;
    
    console.log(`  Concurrent connections: ${concurrentConnections}`);
    console.log(`  Messages per connection: ${messagesPerConnection}`);
    console.log(`  Message interval: ${messageInterval}ms`);
    
    const connectionPromises = [];
    
    for (let i = 0; i < concurrentConnections; i++) {
      connectionPromises.push(
        this.createWebSocketWorker(i, messagesPerConnection, messageInterval, testResults)
      );
    }
    
    await Promise.allSettled(connectionPromises);
    
    testResults.endTime = Date.now();
    testResults.metrics = this.calculateWebSocketMetrics(testResults);
    
    this.results.tests.websocket = testResults;
    
    console.log(`✅ WebSocket load test completed`);
    console.log(`  Successful connections: ${testResults.metrics.successfulConnections}`);
    console.log(`  Total messages sent: ${testResults.messages.length}`);
    console.log(`  Average message latency: ${testResults.metrics.avgLatency?.toFixed(2)}ms`);
    console.log(`  Connection error rate: ${(testResults.metrics.connectionErrorRate * 100)?.toFixed(2)}%\n`);
  }
  
  async createWebSocketWorker(workerId, messageCount, interval, testResults) {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.wsUrl);
      let messagesReceived = 0;
      let messagesSent = 0;
      
      const connectionStart = performance.now();
      
      ws.on('open', () => {
        const connectionTime = performance.now() - connectionStart;
        
        testResults.connections.push({
          workerId,
          connectionTime,
          success: true,
          timestamp: Date.now()
        });
        
        // Start sending messages
        const messageTimer = setInterval(() => {
          if (messagesSent >= messageCount) {
            clearInterval(messageTimer);
            ws.close();
            return;
          }
          
          const messageStart = performance.now();
          const message = {
            id: `${workerId}-${messagesSent}`,
            workerId,
            timestamp: Date.now(),
            data: 'test-message'
          };
          
          ws.send(JSON.stringify(message));
          messagesSent++;
          
          testResults.messages.push({
            workerId,
            messageId: message.id,
            sent: true,
            timestamp: message.timestamp,
            sendTime: messageStart
          });
          
        }, interval);
      });
      
      ws.on('message', (data) => {
        const receiveTime = performance.now();
        messagesReceived++;
        
        try {
          const message = JSON.parse(data);
          const sentMessage = testResults.messages.find(m => m.messageId === message.id);
          
          if (sentMessage) {
            const latency = receiveTime - sentMessage.sendTime;
            testResults.messages.push({
              workerId,
              messageId: message.id,
              sent: false,
              received: true,
              latency,
              timestamp: Date.now()
            });
          }
          
        } catch (error) {
          testResults.errors.push({
            workerId,
            error: `Message parse error: ${error.message}`,
            timestamp: Date.now()
          });
        }
      });
      
      ws.on('error', (error) => {
        testResults.errors.push({
          workerId,
          error: error.message,
          timestamp: Date.now()
        });
        
        testResults.connections.push({
          workerId,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
        
        resolve();
      });
      
      ws.on('close', () => {
        resolve();
      });
      
      // Timeout protection
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        resolve();
      }, 30000);
    });
  }
  
  async runVoipCapacityTest() {
    console.log('📞 Running VoIP capacity test...');
    
    const testResults = {
      name: this.scenarios.voip.name,
      startTime: Date.now(),
      calls: [],
      registrations: [],
      errors: [],
      metrics: {}
    };
    
    const { concurrentCalls, callDuration, sipRegistrations } = this.scenarios.voip;
    
    console.log(`  Concurrent calls: ${concurrentCalls}`);
    console.log(`  Call duration: ${callDuration / 1000}s`);
    console.log(`  SIP registrations: ${sipRegistrations}`);
    
    // Simulate SIP registrations
    for (let i = 0; i < sipRegistrations; i++) {
      try {
        const registration = await this.simulateSipRegistration(i);
        testResults.registrations.push(registration);
      } catch (error) {
        testResults.errors.push({
          type: 'registration',
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    // Simulate concurrent calls
    const callPromises = [];
    for (let i = 0; i < concurrentCalls; i++) {
      callPromises.push(this.simulateVoipCall(i, callDuration, testResults));
    }
    
    await Promise.allSettled(callPromises);
    
    testResults.endTime = Date.now();
    testResults.metrics = this.calculateVoipMetrics(testResults);
    
    this.results.tests.voip = testResults;
    
    console.log(`✅ VoIP capacity test completed`);
    console.log(`  Successful registrations: ${testResults.metrics.successfulRegistrations}`);
    console.log(`  Successful calls: ${testResults.metrics.successfulCalls}`);
    console.log(`  Average call setup time: ${testResults.metrics.avgSetupTime?.toFixed(2)}ms`);
    console.log(`  Call success rate: ${(testResults.metrics.callSuccessRate * 100)?.toFixed(2)}%\n`);
  }
  
  async simulateSipRegistration(registrationId) {
    const startTime = performance.now();
    
    // Simulate SIP REGISTER request
    const response = await this.makeRequest({
      path: '/api/sip/register',
      method: 'POST',
      body: {
        username: `user${registrationId}`,
        domain: 'localhost',
        password: 'test123'
      }
    });
    
    const registrationTime = performance.now() - startTime;
    
    return {
      registrationId,
      success: response.statusCode === 200,
      registrationTime,
      timestamp: Date.now()
    };
  }
  
  async simulateVoipCall(callId, duration, testResults) {
    const startTime = performance.now();
    
    try {
      // Simulate call initiation
      const initResponse = await this.makeRequest({
        path: '/api/sip/call',
        method: 'POST',
        body: {
          from: `user${callId}`,
          to: `+1234567${String(callId).padStart(4, '0')}`,
          duration: duration
        }
      });
      
      const setupTime = performance.now() - startTime;
      
      if (initResponse.statusCode === 200) {
        // Simulate call duration
        await this.sleep(duration);
        
        // Simulate call termination
        await this.makeRequest({
          path: `/api/sip/call/${callId}/hangup`,
          method: 'POST'
        });
        
        testResults.calls.push({
          callId,
          success: true,
          setupTime,
          duration,
          timestamp: Date.now()
        });
      } else {
        testResults.calls.push({
          callId,
          success: false,
          setupTime,
          error: `Call initiation failed: ${initResponse.statusCode}`,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      testResults.errors.push({
        callId,
        error: error.message,
        timestamp: Date.now()
      });
      
      testResults.calls.push({
        callId,
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
  
  async runStressTest() {
    console.log('🔥 Running stress test...');
    
    const testResults = {
      name: this.scenarios.stress.name,
      startTime: Date.now(),
      requests: [],
      errors: [],
      systemMetrics: [],
      metrics: {}
    };
    
    const { maxUsers, rampUpTime, sustainTime } = this.scenarios.stress;
    
    console.log(`  Max users: ${maxUsers}`);
    console.log(`  Ramp up time: ${rampUpTime / 1000}s`);
    console.log(`  Sustain time: ${sustainTime / 1000}s`);
    
    // Monitor system metrics during stress test
    const metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.getSystemMetrics();
        testResults.systemMetrics.push(metrics);
      } catch (error) {
        console.warn('Failed to get system metrics:', error.message);
      }
    }, 5000);
    
    // Gradually ramp up users
    const totalTestTime = rampUpTime + sustainTime;
    const workers = [];
    
    for (let i = 0; i < maxUsers; i++) {
      const startDelay = (i / maxUsers) * rampUpTime;
      const workDuration = totalTestTime - startDelay;
      
      setTimeout(() => {
        workers.push(this.createStressWorker(i, workDuration, testResults));
      }, startDelay);
    }
    
    // Wait for test completion
    await this.sleep(totalTestTime + 10000);
    
    clearInterval(metricsInterval);
    
    testResults.endTime = Date.now();
    testResults.metrics = this.calculateStressMetrics(testResults);
    
    this.results.tests.stress = testResults;
    
    console.log(`✅ Stress test completed`);
    console.log(`  Peak concurrent users: ${maxUsers}`);
    console.log(`  Total requests: ${testResults.requests.length}`);
    console.log(`  Peak response time: ${testResults.metrics.peakResponseTime?.toFixed(2)}ms`);
    console.log(`  System survived: ${testResults.metrics.systemStable ? 'Yes' : 'No'}\n`);
  }
  
  async createStressWorker(workerId, duration, testResults) {
    const endTime = Date.now() + duration;
    const endpoints = this.scenarios.api.endpoints;
    
    while (Date.now() < endTime) {
      try {
        const endpoint = this.selectWeightedEndpoint(endpoints);
        const startTime = performance.now();
        
        const response = await this.makeRequest(endpoint);
        const responseTime = performance.now() - startTime;
        
        testResults.requests.push({
          workerId,
          endpoint: endpoint.path,
          responseTime,
          statusCode: response.statusCode,
          timestamp: Date.now(),
          success: response.statusCode < 400
        });
        
      } catch (error) {
        testResults.errors.push({
          workerId,
          error: error.message,
          timestamp: Date.now()
        });
      }
      
      // Minimal wait to prevent overwhelming
      await this.sleep(Math.random() * 100);
    }
  }
  
  async getSystemMetrics() {
    try {
      const response = await this.makeRequest({
        path: '/api/performance/health',
        method: 'GET'
      });
      
      if (response.statusCode === 200) {
        return {
          timestamp: Date.now(),
          ...JSON.parse(response.body)
        };
      }
    } catch (error) {
      return {
        timestamp: Date.now(),
        error: error.message
      };
    }
  }
  
  selectWeightedEndpoint(endpoints) {
    const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return endpoints[0]; // Fallback
  }
  
  async makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint.path, this.config.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        method: endpoint.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LoadTest/1.0'
        },
        timeout: 10000
      };
      
      const req = httpModule.request(url, options, (res) => {
        let body = '';
        
        res.on('data', chunk => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      
      if (endpoint.body) {
        req.write(JSON.stringify(endpoint.body));
      }
      
      req.end();
    });
  }
  
  calculateMetrics(testResults) {
    const requests = testResults.requests;
    const errors = testResults.errors;
    
    if (requests.length === 0) {
      return { error: 'No requests completed' };
    }
    
    const responseTimes = requests.map(r => r.responseTime);
    const successfulRequests = requests.filter(r => r.success);
    
    const totalTime = testResults.endTime - testResults.startTime;
    
    return {
      totalRequests: requests.length,
      successfulRequests: successfulRequests.length,
      errorRate: errors.length / requests.length,
      avgResponseTime: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      medianResponseTime: this.calculateMedian(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      throughput: (requests.length / totalTime) * 1000, // RPS
      errorCount: errors.length
    };
  }
  
  calculateWebSocketMetrics(testResults) {
    const connections = testResults.connections;
    const messages = testResults.messages.filter(m => m.received);
    const sentMessages = testResults.messages.filter(m => m.sent);
    
    const successfulConnections = connections.filter(c => c.success).length;
    const latencies = messages.map(m => m.latency).filter(l => l);
    
    return {
      totalConnections: connections.length,
      successfulConnections,
      connectionErrorRate: 1 - (successfulConnections / connections.length),
      totalMessagesSent: sentMessages.length,
      totalMessagesReceived: messages.length,
      messageDeliveryRate: messages.length / sentMessages.length,
      avgLatency: latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0
    };
  }
  
  calculateVoipMetrics(testResults) {
    const registrations = testResults.registrations;
    const calls = testResults.calls;
    
    const successfulRegistrations = registrations.filter(r => r.success).length;
    const successfulCalls = calls.filter(c => c.success).length;
    
    const setupTimes = calls.filter(c => c.setupTime).map(c => c.setupTime);
    
    return {
      totalRegistrations: registrations.length,
      successfulRegistrations,
      registrationSuccessRate: successfulRegistrations / registrations.length,
      totalCalls: calls.length,
      successfulCalls,
      callSuccessRate: successfulCalls / calls.length,
      avgSetupTime: setupTimes.length > 0 ? setupTimes.reduce((sum, t) => sum + t, 0) / setupTimes.length : 0,
      maxSetupTime: setupTimes.length > 0 ? Math.max(...setupTimes) : 0
    };
  }
  
  calculateStressMetrics(testResults) {
    const requests = testResults.requests;
    const systemMetrics = testResults.systemMetrics;
    
    const responseTimes = requests.map(r => r.responseTime);
    const successfulRequests = requests.filter(r => r.success);
    
    // Determine system stability
    const cpuUsages = systemMetrics.map(m => m.data?.performance?.cpu || 0);
    const memoryUsages = systemMetrics.map(m => m.data?.performance?.memory || 0);
    
    const systemStable = cpuUsages.every(cpu => cpu < 95) && memoryUsages.every(mem => mem < 95);
    
    return {
      totalRequests: requests.length,
      successfulRequests: successfulRequests.length,
      errorRate: (requests.length - successfulRequests.length) / requests.length,
      avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length : 0,
      peakResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      peakCpu: cpuUsages.length > 0 ? Math.max(...cpuUsages) : 0,
      peakMemory: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
      systemStable
    };
  }
  
  calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
  
  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
  
  async generateReport() {
    console.log('📊 Generating comprehensive load test report...');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results.tests,
      summary: this.generateSummary(),
      recommendations: this.generateRecommendations()
    };
    
    // Save detailed JSON report
    const reportsDir = path.join(__dirname, 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const jsonReportPath = path.join(reportsDir, `load-test-${Date.now()}.json`);
    await fs.writeFile(jsonReportPath, JSON.stringify(reportData, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport(reportData);
    const htmlReportPath = path.join(reportsDir, `load-test-${Date.now()}.html`);
    await fs.writeFile(htmlReportPath, htmlReport);
    
    // Print summary to console
    this.printSummary(reportData.summary);
    
    console.log(`📁 Detailed reports saved:`);
    console.log(`  JSON: ${jsonReportPath}`);
    console.log(`  HTML: ${htmlReportPath}`);
  }
  
  generateSummary() {
    const tests = this.results.tests;
    const summary = {
      overall: 'PASS',
      issues: [],
      highlights: []
    };
    
    // Analyze API test
    if (tests.api) {
      const api = tests.api.metrics;
      
      if (api.avgResponseTime > this.config.thresholds.avgResponseTime) {
        summary.issues.push(`API: High average response time (${api.avgResponseTime?.toFixed(2)}ms)`);
        summary.overall = 'WARN';
      }
      
      if (api.errorRate > this.config.thresholds.errorRate) {
        summary.issues.push(`API: High error rate (${(api.errorRate * 100)?.toFixed(2)}%)`);
        summary.overall = 'FAIL';
      }
      
      if (api.throughput > this.config.thresholds.throughput) {
        summary.highlights.push(`API: Good throughput (${api.throughput?.toFixed(2)} RPS)`);
      }
    }
    
    // Analyze WebSocket test
    if (tests.websocket) {
      const ws = tests.websocket.metrics;
      
      if (ws.connectionErrorRate > 0.1) {
        summary.issues.push(`WebSocket: High connection error rate (${(ws.connectionErrorRate * 100)?.toFixed(2)}%)`);
        summary.overall = 'WARN';
      }
      
      if (ws.avgLatency < 100) {
        summary.highlights.push(`WebSocket: Low message latency (${ws.avgLatency?.toFixed(2)}ms)`);
      }
    }
    
    // Analyze VoIP test
    if (tests.voip) {
      const voip = tests.voip.metrics;
      
      if (voip.callSuccessRate < 0.95) {
        summary.issues.push(`VoIP: Low call success rate (${(voip.callSuccessRate * 100)?.toFixed(2)}%)`);
        summary.overall = 'WARN';
      }
      
      if (voip.avgSetupTime < 3000) {
        summary.highlights.push(`VoIP: Fast call setup (${voip.avgSetupTime?.toFixed(2)}ms)`);
      }
    }
    
    // Analyze stress test
    if (tests.stress) {
      const stress = tests.stress.metrics;
      
      if (!stress.systemStable) {
        summary.issues.push('Stress: System instability detected under peak load');
        summary.overall = 'FAIL';
      }
      
      if (stress.systemStable && stress.errorRate < 0.05) {
        summary.highlights.push('Stress: System remained stable under peak load');
      }
    }
    
    return summary;
  }
  
  generateRecommendations() {
    const recommendations = [];
    const tests = this.results.tests;
    
    // API recommendations
    if (tests.api?.metrics.avgResponseTime > 500) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        issue: 'High API response times',
        recommendation: 'Implement response caching and database query optimization'
      });
    }
    
    // WebSocket recommendations
    if (tests.websocket?.metrics.connectionErrorRate > 0.1) {
      recommendations.push({
        category: 'Reliability',
        priority: 'Medium',
        issue: 'WebSocket connection failures',
        recommendation: 'Implement connection retry logic and increase connection pool limits'
      });
    }
    
    // VoIP recommendations
    if (tests.voip?.metrics.callSuccessRate < 0.95) {
      recommendations.push({
        category: 'VoIP Quality',
        priority: 'High',
        issue: 'Low call success rate',
        recommendation: 'Review SIP server configuration and network connectivity'
      });
    }
    
    // System recommendations
    if (tests.stress?.metrics.peakCpu > 80) {
      recommendations.push({
        category: 'Scalability',
        priority: 'High',
        issue: 'High CPU usage under load',
        recommendation: 'Consider horizontal scaling or CPU optimization'
      });
    }
    
    return recommendations;
  }
  
  generateHtmlReport(reportData) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>ColdCaller Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f8ff; padding: 20px; border-radius: 8px; }
        .summary { background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .test-section { margin: 20px 0; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .metric { background: #fff; padding: 10px; border: 1px solid #eee; border-radius: 4px; }
        .pass { color: green; font-weight: bold; }
        .warn { color: orange; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        .recommendations { background: #fffacd; padding: 15px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 ColdCaller Load Test Report</h1>
        <p>Generated: ${reportData.timestamp}</p>
        <p>Status: <span class="${reportData.summary.overall.toLowerCase()}">${reportData.summary.overall}</span></p>
    </div>
    
    <div class="summary">
        <h2>📊 Test Summary</h2>
        <h3>Issues:</h3>
        <ul>
            ${reportData.summary.issues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
        <h3>Highlights:</h3>
        <ul>
            ${reportData.summary.highlights.map(highlight => `<li>${highlight}</li>`).join('')}
        </ul>
    </div>
    
    ${Object.entries(reportData.results).map(([testName, testData]) => `
    <div class="test-section">
        <h2>${testData.name}</h2>
        <div class="metrics">
            ${Object.entries(testData.metrics).map(([key, value]) => `
            <div class="metric">
                <strong>${key}:</strong><br>
                ${typeof value === 'number' ? value.toFixed(2) : value}
            </div>
            `).join('')}
        </div>
    </div>
    `).join('')}
    
    <div class="recommendations">
        <h2>🎯 Recommendations</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Issue</th>
                    <th>Recommendation</th>
                </tr>
            </thead>
            <tbody>
                ${reportData.recommendations.map(rec => `
                <tr>
                    <td>${rec.category}</td>
                    <td class="${rec.priority.toLowerCase()}">${rec.priority}</td>
                    <td>${rec.issue}</td>
                    <td>${rec.recommendation}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
  }
  
  printSummary(summary) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 LOAD TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${summary.overall}`);
    
    if (summary.issues.length > 0) {
      console.log('\n🚨 Issues Detected:');
      summary.issues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    if (summary.highlights.length > 0) {
      console.log('\n✅ Highlights:');
      summary.highlights.forEach(highlight => console.log(`  • ${highlight}`));
    }
    
    console.log('='.repeat(60));
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const loadTester = new LoadTestSuite();
  
  // Parse command line arguments
  args.forEach(arg => {
    if (arg.startsWith('--url=')) {
      loadTester.config.baseUrl = arg.split('=')[1];
    }
    if (arg.startsWith('--users=')) {
      loadTester.config.maxConcurrentUsers = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--duration=')) {
      loadTester.config.testDuration = parseInt(arg.split('=')[1]) * 1000;
    }
  });
  
  loadTester.runAllTests().catch(console.error);
}

module.exports = LoadTestSuite;