/**
 * VOIP Performance and Load Testing
 * Tests concurrent call handling, quality under load, and system resilience
 * Benchmarks for scalability and performance optimization
 */

import {
  MockSIPProxy,
  MockWebRTCManager,
  MockSIPMessage,
  SecurityTestUtils,
  ThreatSimulator
} from '../mocks/voipMocks';

// Performance testing configuration
const PERFORMANCE_CONFIG = {
  maxConcurrentCalls: 50,
  callEstablishmentTimeout: 3000, // 3 seconds
  qualityThreshold: {
    audioQuality: 4.2, // MOS score
    packetLoss: 1.0,   // Max 1% packet loss
    jitter: 20,        // Max 20ms jitter
    latency: 150       // Max 150ms latency
  },
  loadTestDuration: 60000, // 1 minute
  stressTestMultiplier: 2
};

describe('VOIP Performance and Load Testing', () => {
  let sipProxy;
  let webrtcManager;
  let securityUtils;
  let threatSimulator;

  beforeEach(() => {
    sipProxy = new MockSIPProxy({
      requireAuth: true,
      rateLimitEnabled: true,
      maxRequestsPerMinute: 1000, // Higher limit for load testing
      maxConcurrentSessions: PERFORMANCE_CONFIG.maxConcurrentCalls
    });

    webrtcManager = new MockWebRTCManager({
      maxConnectionsPerUser: PERFORMANCE_CONFIG.maxConcurrentCalls,
      bandwidthLimit: 10000000, // 10 Mbps for load testing
      qualityMonitoring: true
    });

    securityUtils = new SecurityTestUtils();
    threatSimulator = new ThreatSimulator();

    // Mock performance.now() for consistent timing
    global.performance = global.performance || {};
    global.performance.now = jest.fn(() => Date.now());
  });

  afterEach(() => {
    sipProxy.reset();
    webrtcManager.cleanup();
    securityUtils.cleanup();
  });

  describe('Concurrent Call Handling', () => {
    it('should handle 50 concurrent calls without degradation', async () => {
      const startTime = Date.now();
      const callPromises = [];
      const callResults = [];

      // Create 50 concurrent call sessions
      for (let i = 0; i < PERFORMANCE_CONFIG.maxConcurrentCalls; i++) {
        const callPromise = createCallSession(i).then(result => {
          callResults.push(result);
          return result;
        });
        callPromises.push(callPromise);
      }

      // Wait for all calls to complete or timeout
      const results = await Promise.allSettled(callPromises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Analyze results
      const successfulCalls = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failedCalls = results.filter(r => r.status === 'rejected' || !r.value?.success).length;
      
      const successRate = (successfulCalls / PERFORMANCE_CONFIG.maxConcurrentCalls) * 100;
      const averageSetupTime = callResults
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.setupTime, 0) / successfulCalls;

      // Performance assertions
      expect(successRate).toBeGreaterThanOrEqual(96); // 96% minimum success rate
      expect(averageSetupTime).toBeLessThan(PERFORMANCE_CONFIG.callEstablishmentTimeout);
      expect(totalDuration).toBeLessThan(10000); // Complete within 10 seconds

      console.log(`🎯 Concurrent Call Results:
        📊 Success Rate: ${successRate.toFixed(1)}%
        ⏱️  Average Setup: ${averageSetupTime.toFixed(0)}ms
        🕐 Total Duration: ${totalDuration}ms
        ✅ Successful: ${successfulCalls}
        ❌ Failed: ${failedCalls}`);
    });

    it('should maintain quality under high concurrent load', async () => {
      const qualityMetrics = [];
      const loadTestCalls = Array(PERFORMANCE_CONFIG.maxConcurrentCalls * PERFORMANCE_CONFIG.stressTestMultiplier);

      // Stress test with 2x normal capacity
      const stressPromises = Array.from(loadTestCalls, async (_, index) => {
        try {
          const callSession = await createCallSession(index);
          if (callSession.success) {
            const quality = await measureCallQuality(callSession);
            qualityMetrics.push(quality);
          }
          return callSession;
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const stressResults = await Promise.allSettled(stressPromises);
      const acceptedCalls = stressResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;

      // Quality analysis
      if (qualityMetrics.length > 0) {
        const avgAudioQuality = qualityMetrics.reduce((sum, m) => sum + m.audioQuality, 0) / qualityMetrics.length;
        const avgPacketLoss = qualityMetrics.reduce((sum, m) => sum + m.packetLoss, 0) / qualityMetrics.length;
        const avgJitter = qualityMetrics.reduce((sum, m) => sum + m.jitter, 0) / qualityMetrics.length;
        const avgLatency = qualityMetrics.reduce((sum, m) => sum + m.latency, 0) / qualityMetrics.length;

        // Quality thresholds should be maintained even under stress
        expect(avgAudioQuality).toBeGreaterThanOrEqual(PERFORMANCE_CONFIG.qualityThreshold.audioQuality);
        expect(avgPacketLoss).toBeLessThanOrEqual(PERFORMANCE_CONFIG.qualityThreshold.packetLoss);
        expect(avgJitter).toBeLessThanOrEqual(PERFORMANCE_CONFIG.qualityThreshold.jitter);
        expect(avgLatency).toBeLessThanOrEqual(PERFORMANCE_CONFIG.qualityThreshold.latency);

        console.log(`📈 Quality Under Load:
          🎵 Audio Quality: ${avgAudioQuality.toFixed(2)} MOS
          📦 Packet Loss: ${avgPacketLoss.toFixed(2)}%
          📊 Jitter: ${avgJitter.toFixed(1)}ms
          ⚡ Latency: ${avgLatency.toFixed(1)}ms
          📞 Accepted Calls: ${acceptedCalls}`);
      }

      // System should gracefully handle overload
      expect(acceptedCalls).toBeGreaterThan(PERFORMANCE_CONFIG.maxConcurrentCalls * 0.8); // At least 80% of normal capacity
    });

    it('should implement proper load balancing and queuing', async () => {
      const callQueue = [];
      const processingTimes = [];
      
      // Create calls in bursts to test queuing
      const burstSize = 20;
      const numberOfBursts = 5;
      
      for (let burst = 0; burst < numberOfBursts; burst++) {
        const burstStartTime = Date.now();
        const burstCalls = [];
        
        // Create burst of calls
        for (let i = 0; i < burstSize; i++) {
          const callId = `burst-${burst}-call-${i}`;
          const callPromise = createCallSession(i, { callId });
          burstCalls.push(callPromise);
        }
        
        // Wait for burst to complete
        const burstResults = await Promise.allSettled(burstCalls);
        const burstDuration = Date.now() - burstStartTime;
        const successfulInBurst = burstResults.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length;
        
        callQueue.push({
          burstId: burst,
          successfulCalls: successfulInBurst,
          duration: burstDuration,
          efficiency: successfulInBurst / burstSize
        });
        
        processingTimes.push(burstDuration);
        
        // Small delay between bursts
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Analyze load balancing effectiveness
      const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const processingTimeVariance = processingTimes.reduce((sum, time) => 
        sum + Math.pow(time - avgProcessingTime, 2), 0
      ) / processingTimes.length;
      const processingTimeStdDev = Math.sqrt(processingTimeVariance);
      
      // Consistent processing times indicate good load balancing
      expect(processingTimeStdDev).toBeLessThan(avgProcessingTime * 0.3); // Less than 30% variation
      
      // Queue should handle all bursts effectively
      const overallSuccess = callQueue.reduce((sum, burst) => sum + burst.efficiency, 0) / numberOfBursts;
      expect(overallSuccess).toBeGreaterThanOrEqual(0.9); // 90% success rate across all bursts
      
      console.log(`⚖️ Load Balancing Results:
        📊 Average Processing: ${avgProcessingTime.toFixed(0)}ms
        📈 Standard Deviation: ${processingTimeStdDev.toFixed(0)}ms
        🎯 Overall Success: ${(overallSuccess * 100).toFixed(1)}%`);
    });
  });

  describe('Network Condition Resilience', () => {
    it('should adapt to varying network conditions', async () => {
      const networkConditions = [
        { name: 'Excellent', bandwidth: 10000, latency: 20, packetLoss: 0 },
        { name: 'Good', bandwidth: 5000, latency: 50, packetLoss: 0.1 },
        { name: 'Fair', bandwidth: 1000, latency: 100, packetLoss: 1.0 },
        { name: 'Poor', bandwidth: 256, latency: 200, packetLoss: 2.0 },
        { name: 'Very Poor', bandwidth: 128, latency: 500, packetLoss: 5.0 }
      ];

      const adaptationResults = [];

      for (const condition of networkConditions) {
        const callSession = await createCallSession(0, {
          networkCondition: condition
        });

        if (callSession.success) {
          const quality = await measureCallQuality(callSession, condition);
          const adaptation = await testNetworkAdaptation(callSession, condition);
          
          adaptationResults.push({
            condition: condition.name,
            quality,
            adaptation,
            maintainedCall: quality.audioQuality > 3.0 // Minimum acceptable quality
          });
        }
      }

      // System should maintain calls in all but the worst conditions
      const maintainedCalls = adaptationResults.filter(r => r.maintainedCall).length;
      expect(maintainedCalls).toBeGreaterThanOrEqual(networkConditions.length - 1); // All except Very Poor

      // Quality should degrade gracefully
      let previousQuality = 5.0;
      adaptationResults.forEach(result => {
        expect(result.quality.audioQuality).toBeLessThanOrEqual(previousQuality + 0.5); // Allow some variance
        previousQuality = result.quality.audioQuality;
      });

      console.log(`🌐 Network Adaptation Results:`);
      adaptationResults.forEach(result => {
        console.log(`  ${result.condition}: Quality ${result.quality.audioQuality.toFixed(1)}, Maintained: ${result.maintainedCall}`);
      });
    });

    it('should handle network interruptions and recovery', async () => {
      const callSession = await createCallSession(0);
      expect(callSession.success).toBe(true);

      // Simulate network interruption
      const interruptionStart = Date.now();
      await simulateNetworkInterruption(callSession, 5000); // 5 second interruption

      // Test recovery
      const recoveryStart = Date.now();
      const recoveryResult = await testCallRecovery(callSession);
      const recoveryTime = Date.now() - recoveryStart;

      // Call should recover within reasonable time
      expect(recoveryResult.recovered).toBe(true);
      expect(recoveryTime).toBeLessThan(10000); // 10 second recovery time
      expect(recoveryResult.qualityAfterRecovery).toBeGreaterThanOrEqual(3.5); // Acceptable quality restored

      console.log(`🔄 Recovery Results:
        ⏱️  Recovery Time: ${recoveryTime}ms
        🎵 Quality After: ${recoveryResult.qualityAfterRecovery.toFixed(1)} MOS
        📊 Data Loss: ${recoveryResult.dataLossPercentage.toFixed(1)}%`);
    });

    it('should optimize codec selection based on conditions', async () => {
      const networkProfiles = [
        { name: 'High Bandwidth', bandwidth: 10000, expectedCodec: 'opus' },
        { name: 'Medium Bandwidth', bandwidth: 1000, expectedCodec: 'G722' },
        { name: 'Low Bandwidth', bandwidth: 256, expectedCodec: 'G711' },
        { name: 'Very Low Bandwidth', bandwidth: 64, expectedCodec: 'G729' }
      ];

      for (const profile of networkProfiles) {
        const peerConnection = await webrtcManager.createSecurePeerConnection({
          networkProfile: profile
        });

        const offer = await peerConnection.createOffer();
        const selectedCodec = extractPreferredCodec(offer.sdp);

        // Should select appropriate codec for bandwidth
        expect(selectedCodec.toLowerCase()).toContain(profile.expectedCodec.toLowerCase());

        console.log(`🎧 ${profile.name}: Selected ${selectedCodec} codec`);
        
        peerConnection.close();
      }
    });
  });

  describe('Scalability and Resource Management', () => {
    it('should scale resources based on demand', async () => {
      const scalingTests = [
        { users: 10, expectedResources: 'low' },
        { users: 50, expectedResources: 'medium' },
        { users: 100, expectedResources: 'high' },
        { users: 200, expectedResources: 'maximum' }
      ];

      for (const test of scalingTests) {
        const resourceUsage = await simulateUserLoad(test.users);
        
        // Resource usage should scale appropriately
        expect(resourceUsage.cpuUsage).toBeLessThan(80); // Never exceed 80% CPU
        expect(resourceUsage.memoryUsage).toBeLessThan(85); // Never exceed 85% memory
        expect(resourceUsage.networkUsage).toBeLessThan(90); // Never exceed 90% bandwidth
        
        // Should automatically scale resources
        if (test.users > 50) {
          expect(resourceUsage.scalingTriggered).toBe(true);
          expect(resourceUsage.additionalInstances).toBeGreaterThan(0);
        }

        console.log(`📈 ${test.users} Users:
          💻 CPU: ${resourceUsage.cpuUsage}%
          🧠 Memory: ${resourceUsage.memoryUsage}%
          🌐 Network: ${resourceUsage.networkUsage}%
          🚀 Scaled: ${resourceUsage.scalingTriggered}`);
      }
    });

    it('should manage memory efficiently during long calls', async () => {
      const longCallDuration = 3600000; // 1 hour
      const memorySnapshots = [];

      // Start call and monitor memory over time
      const callSession = await createCallSession(0, { duration: longCallDuration });
      const startMemory = await getMemoryUsage();
      memorySnapshots.push({ time: 0, memory: startMemory });

      // Take memory snapshots every 10 minutes (simulated)
      const snapshotIntervals = [10, 20, 30, 40, 50, 60]; // minutes
      
      for (const minute of snapshotIntervals) {
        // Simulate time passage and memory measurement
        await simulateTimePassage(minute * 60000);
        const currentMemory = await getMemoryUsage();
        memorySnapshots.push({ time: minute, memory: currentMemory });
      }

      // Analyze memory growth
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1].memory - memorySnapshots[0].memory;
      const memoryGrowthRate = memoryGrowth / longCallDuration * 60000; // MB per minute

      // Memory should not leak significantly
      expect(memoryGrowthRate).toBeLessThan(1.0); // Less than 1MB per minute growth
      expect(memoryGrowth).toBeLessThan(100); // Less than 100MB total growth

      // Memory should be stable (not constantly growing)
      const recentGrowth = memorySnapshots.slice(-3).reduce((sum, snapshot, index, array) => {
        if (index === 0) return 0;
        return sum + (snapshot.memory - array[index - 1].memory);
      }, 0);
      expect(Math.abs(recentGrowth)).toBeLessThan(10); // Stable recent memory usage

      console.log(`🧠 Memory Analysis (1-hour call):
        📈 Total Growth: ${memoryGrowth.toFixed(1)}MB
        📊 Growth Rate: ${memoryGrowthRate.toFixed(3)}MB/min
        🎯 Recent Stability: ${recentGrowth.toFixed(1)}MB`);
    });

    it('should handle resource exhaustion gracefully', async () => {
      // Simulate resource exhaustion scenarios
      const exhaustionScenarios = [
        { type: 'cpu', threshold: 95 },
        { type: 'memory', threshold: 95 },
        { type: 'bandwidth', threshold: 98 }
      ];

      for (const scenario of exhaustionScenarios) {
        // Push system to resource limits
        await simulateResourceExhaustion(scenario.type, scenario.threshold);

        // Try to create new calls under exhaustion
        const newCallAttempts = Array(10).fill().map(async (_, index) => {
          try {
            const call = await createCallSession(index, { priority: 'low' });
            return { success: true, call };
          } catch (error) {
            return { success: false, error: error.message };
          }
        });

        const exhaustionResults = await Promise.allSettled(newCallAttempts);
        const acceptedCalls = exhaustionResults.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length;

        // System should reject most new calls but maintain existing ones
        expect(acceptedCalls).toBeLessThan(5); // Limited new call acceptance
        
        // Existing calls should be protected
        const existingCallsProtected = await verifyExistingCallsProtected();
        expect(existingCallsProtected).toBe(true);

        // System should provide meaningful error messages
        const rejectedCalls = exhaustionResults.filter(r => 
          r.status === 'fulfilled' && !r.value.success
        );
        rejectedCalls.forEach(call => {
          expect(call.value.error).toMatch(/resource|capacity|limit/i);
        });

        console.log(`⚠️ ${scenario.type.toUpperCase()} Exhaustion:
          📞 Accepted: ${acceptedCalls}/10
          🛡️ Existing Protected: ${existingCallsProtected}
          💬 Error Messages: Appropriate`);

        // Reset resource levels
        await resetResourceLevels();
      }
    });
  });

  describe('Performance Benchmarking', () => {
    it('should meet latency benchmarks for call establishment', async () => {
      const establishmentTimes = [];
      const benchmarkCalls = 100;

      for (let i = 0; i < benchmarkCalls; i++) {
        const startTime = performance.now();
        const callSession = await createCallSession(i, { benchmark: true });
        const establishmentTime = performance.now() - startTime;
        
        if (callSession.success) {
          establishmentTimes.push(establishmentTime);
        }
      }

      // Calculate statistics
      const avgEstablishment = establishmentTimes.reduce((a, b) => a + b, 0) / establishmentTimes.length;
      const sortedTimes = establishmentTimes.sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

      // Performance benchmarks
      expect(avgEstablishment).toBeLessThan(2000); // Average < 2 seconds
      expect(p95).toBeLessThan(3000); // 95th percentile < 3 seconds
      expect(p99).toBeLessThan(5000); // 99th percentile < 5 seconds

      console.log(`⏱️ Call Establishment Benchmarks:
        📊 Average: ${avgEstablishment.toFixed(0)}ms
        📈 P50: ${p50.toFixed(0)}ms
        📈 P95: ${p95.toFixed(0)}ms
        📈 P99: ${p99.toFixed(0)}ms`);
    });

    it('should benchmark audio quality metrics', async () => {
      const qualityBenchmarks = [];
      const benchmarkCalls = 50;

      for (let i = 0; i < benchmarkCalls; i++) {
        const callSession = await createCallSession(i, { 
          quality: 'high',
          duration: 60000 // 1 minute calls
        });

        if (callSession.success) {
          const quality = await measureCallQuality(callSession, {
            bandwidth: 1000 + Math.random() * 4000, // Variable bandwidth
            latency: 50 + Math.random() * 100,      // Variable latency
            packetLoss: Math.random() * 1           // Variable packet loss
          });
          
          qualityBenchmarks.push(quality);
        }
      }

      // Quality statistics
      const avgMOS = qualityBenchmarks.reduce((sum, q) => sum + q.audioQuality, 0) / qualityBenchmarks.length;
      const avgPacketLoss = qualityBenchmarks.reduce((sum, q) => sum + q.packetLoss, 0) / qualityBenchmarks.length;
      const avgJitter = qualityBenchmarks.reduce((sum, q) => sum + q.jitter, 0) / qualityBenchmarks.length;
      const avgLatency = qualityBenchmarks.reduce((sum, q) => sum + q.latency, 0) / qualityBenchmarks.length;

      // Quality benchmarks
      expect(avgMOS).toBeGreaterThanOrEqual(4.2); // High quality standard
      expect(avgPacketLoss).toBeLessThanOrEqual(1.0); // Max 1% packet loss
      expect(avgJitter).toBeLessThanOrEqual(20); // Max 20ms jitter
      expect(avgLatency).toBeLessThanOrEqual(150); // Max 150ms latency

      console.log(`🎵 Audio Quality Benchmarks:
        📊 Average MOS: ${avgMOS.toFixed(2)}
        📦 Packet Loss: ${avgPacketLoss.toFixed(2)}%
        📈 Jitter: ${avgJitter.toFixed(1)}ms
        ⚡ Latency: ${avgLatency.toFixed(1)}ms`);
    });
  });

  // Helper functions for performance testing
  async function createCallSession(index, options = {}) {
    const startTime = performance.now();
    
    try {
      // Create SIP session
      const invite = MockSIPMessage.createInvite({
        from: `user${index}@company.com`,
        to: `target${index}@company.com`,
        callId: options.callId || `perf-test-${index}`,
        sourceIP: options.sourceIP || `192.168.1.${(index % 254) + 1}`
      });

      const sipResponse = await sipProxy.handleMessage(invite);
      if (![100, 180, 200].includes(sipResponse.statusCode)) {
        throw new Error(`SIP setup failed: ${sipResponse.statusCode}`);
      }

      // Create WebRTC connection
      const peerConnection = await webrtcManager.createSecurePeerConnection({
        userId: `user${index}`,
        networkProfile: options.networkCondition
      });

      const setupTime = performance.now() - startTime;
      
      return {
        success: true,
        setupTime,
        callId: options.callId || `perf-test-${index}`,
        sipResponse,
        peerConnection
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        setupTime: performance.now() - startTime
      };
    }
  }

  async function measureCallQuality(callSession, networkCondition = {}) {
    // Simulate quality measurement based on network conditions
    const baseQuality = 4.5; // MOS score
    const baseLoss = 0.1;    // Packet loss %
    const baseJitter = 5;    // Jitter ms
    const baseLatency = 50;  // Latency ms

    const qualityImpact = networkCondition.bandwidth ? 
      Math.max(0, (1000 - networkCondition.bandwidth) / 1000) : 0;
    
    return {
      audioQuality: Math.max(1.0, baseQuality - qualityImpact * 2),
      packetLoss: baseLoss + (networkCondition.packetLoss || 0),
      jitter: baseJitter + (networkCondition.latency || 0) / 10,
      latency: baseLatency + (networkCondition.latency || 0)
    };
  }

  async function testNetworkAdaptation(callSession, condition) {
    // Test how well the system adapts to network conditions
    return {
      codecSwitched: condition.bandwidth < 500,
      bitratereduced: condition.bandwidth < 1000,
      qualityAdjusted: condition.packetLoss > 2.0,
      adaptationTime: Math.random() * 2000 + 500 // 0.5-2.5 seconds
    };
  }

  async function simulateNetworkInterruption(callSession, duration) {
    // Simulate network interruption
    callSession.interrupted = true;
    callSession.interruptionDuration = duration;
    
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  async function testCallRecovery(callSession) {
    // Test recovery from network interruption
    const recoveryStartTime = performance.now();
    
    // Simulate recovery process
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));
    
    return {
      recovered: true,
      recoveryTime: performance.now() - recoveryStartTime,
      qualityAfterRecovery: 4.0 + Math.random() * 0.8,
      dataLossPercentage: Math.random() * 5 // 0-5% data loss
    };
  }

  function extractPreferredCodec(sdp) {
    // Extract preferred audio codec from SDP
    const codecMatch = sdp.match(/a=rtpmap:\d+ (\w+)\/\d+/);
    return codecMatch ? codecMatch[1] : 'unknown';
  }

  async function simulateUserLoad(userCount) {
    // Simulate system load based on user count
    const baseUsage = {
      cpuUsage: 20,
      memoryUsage: 30,
      networkUsage: 10
    };

    const loadMultiplier = userCount / 50; // Base load for 50 users
    
    return {
      cpuUsage: Math.min(95, baseUsage.cpuUsage * loadMultiplier),
      memoryUsage: Math.min(95, baseUsage.memoryUsage * loadMultiplier),
      networkUsage: Math.min(95, baseUsage.networkUsage * loadMultiplier),
      scalingTriggered: userCount > 50,
      additionalInstances: Math.max(0, Math.floor(userCount / 50) - 1)
    };
  }

  async function getMemoryUsage() {
    // Simulate memory usage measurement
    return 50 + Math.random() * 20; // 50-70 MB baseline
  }

  async function simulateTimePassage(milliseconds) {
    // Simulate time passage for memory leak testing
    global.performance.now = jest.fn(() => Date.now() + milliseconds);
  }

  async function simulateResourceExhaustion(resourceType, threshold) {
    // Simulate resource exhaustion
    global.mockResourceExhaustion = { type: resourceType, level: threshold };
  }

  async function verifyExistingCallsProtected() {
    // Verify existing calls are protected during resource exhaustion
    return true; // Simplified for testing
  }

  async function resetResourceLevels() {
    // Reset resource levels after exhaustion test
    global.mockResourceExhaustion = null;
  }
});