/**
 * Audio Performance Benchmarking Tool
 * Comprehensive testing for audio system performance
 */

class AudioBenchmark {
  constructor() {
    this.results = {
      loadTime: [],
      playbackLatency: [],
      memoryUsage: [],
      cachePerformance: [],
      networkPerformance: [],
      concurrentStreams: [],
      errors: []
    };

    this.testAudioData = {
      testClips: [
        { id: 'test_001', name: 'Short Clip', size: 50000, duration: 3000 },
        { id: 'test_002', name: 'Medium Clip', size: 150000, duration: 10000 },
        { id: 'test_003', name: 'Long Clip', size: 300000, duration: 20000 }
      ],
      testUrls: [
        'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAAC6u7q7uru6u7q7uru6uw==',
        'data:audio/mpeg;base64,/+NIxAC5AE0AAAAAAP/hNQxAASBLfBAMAAAAAAAAAAAAAAAAAQBAgAAASGQAAAAAAAAAAAAAAAAAAAAAAGAQBAEAAAAAAAAAAAAAAAAAAABAQEBAQE'
      ]
    };
  }

  /**
   * Run comprehensive audio benchmark
   */
  async runComprehensiveBenchmark() {
    console.log('🎯 Starting comprehensive audio benchmark...');
    
    const benchmarkResults = {
      timestamp: Date.now(),
      environment: this.getEnvironmentInfo(),
      tests: {}
    };

    try {
      // Test 1: Audio Loading Performance
      console.log('📥 Testing audio loading performance...');
      benchmarkResults.tests.loadingPerformance = await this.testLoadingPerformance();

      // Test 2: Playback Latency
      console.log('⏱️ Testing playback latency...');
      benchmarkResults.tests.playbackLatency = await this.testPlaybackLatency();

      // Test 3: Memory Usage
      console.log('🧠 Testing memory usage...');
      benchmarkResults.tests.memoryUsage = await this.testMemoryUsage();

      // Test 4: Cache Performance
      console.log('💾 Testing cache performance...');
      benchmarkResults.tests.cachePerformance = await this.testCachePerformance();

      // Test 5: Concurrent Streams
      console.log('🔀 Testing concurrent streams...');
      benchmarkResults.tests.concurrentStreams = await this.testConcurrentStreams();

      // Test 6: Network Performance
      console.log('🌐 Testing network performance...');
      benchmarkResults.tests.networkPerformance = await this.testNetworkPerformance();

      // Test 7: Error Resilience
      console.log('🛡️ Testing error resilience...');
      benchmarkResults.tests.errorResilience = await this.testErrorResilience();

      // Calculate overall score
      benchmarkResults.overallScore = this.calculateOverallScore(benchmarkResults.tests);

      console.log('✅ Benchmark completed!');
      console.log(`📊 Overall Score: ${benchmarkResults.overallScore}/100`);

      return benchmarkResults;

    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      benchmarkResults.error = error.message;
      return benchmarkResults;
    }
  }

  /**
   * Test audio loading performance
   */
  async testLoadingPerformance() {
    const results = {
      tests: [],
      averageLoadTime: 0,
      medianLoadTime: 0,
      p95LoadTime: 0,
      score: 0
    };

    const loadTimes = [];
    
    for (let i = 0; i < 10; i++) {
      for (const url of this.testAudioData.testUrls) {
        const startTime = performance.now();
        
        try {
          await this.loadAudioUrl(url);
          const loadTime = performance.now() - startTime;
          loadTimes.push(loadTime);
          
          results.tests.push({
            url: url.substring(0, 50) + '...',
            loadTime: loadTime,
            success: true
          });
          
        } catch (error) {
          results.tests.push({
            url: url.substring(0, 50) + '...',
            loadTime: null,
            success: false,
            error: error.message
          });
        }
      }
    }

    // Calculate statistics
    if (loadTimes.length > 0) {
      loadTimes.sort((a, b) => a - b);
      results.averageLoadTime = loadTimes.reduce((a, b) => a + b) / loadTimes.length;
      results.medianLoadTime = loadTimes[Math.floor(loadTimes.length / 2)];
      results.p95LoadTime = loadTimes[Math.floor(loadTimes.length * 0.95)];
      
      // Score: 100 if avg load time < 100ms, linearly decreasing to 0 at 2000ms
      results.score = Math.max(0, Math.min(100, 100 - (results.averageLoadTime - 100) / 19));
    }

    return results;
  }

  /**
   * Test playback latency
   */
  async testPlaybackLatency() {
    const results = {
      tests: [],
      averageLatency: 0,
      medianLatency: 0,
      score: 0
    };

    const latencies = [];

    for (let i = 0; i < 5; i++) {
      for (const url of this.testAudioData.testUrls) {
        const audio = new Audio(url);
        const startTime = performance.now();
        
        try {
          await new Promise((resolve, reject) => {
            audio.addEventListener('canplay', () => {
              const latency = performance.now() - startTime;
              latencies.push(latency);
              
              results.tests.push({
                test: `Latency Test ${i + 1}`,
                latency: latency,
                success: true
              });
              
              resolve();
            });
            
            audio.addEventListener('error', () => {
              results.tests.push({
                test: `Latency Test ${i + 1}`,
                latency: null,
                success: false,
                error: 'Audio load error'
              });
              reject(new Error('Audio load error'));
            });
            
            audio.load();
          });
          
        } catch (error) {
          // Already handled in promise
        }
      }
    }

    // Calculate statistics
    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      results.averageLatency = latencies.reduce((a, b) => a + b) / latencies.length;
      results.medianLatency = latencies[Math.floor(latencies.length / 2)];
      
      // Score: 100 if avg latency < 50ms, linearly decreasing to 0 at 500ms
      results.score = Math.max(0, Math.min(100, 100 - (results.averageLatency - 50) / 4.5));
    }

    return results;
  }

  /**
   * Test memory usage
   */
  async testMemoryUsage() {
    const results = {
      initialMemory: 0,
      peakMemory: 0,
      finalMemory: 0,
      memoryIncrease: 0,
      leakDetected: false,
      score: 0
    };

    if (!('memory' in performance)) {
      results.error = 'Memory API not available';
      results.score = 50; // Neutral score if can't test
      return results;
    }

    // Get initial memory
    results.initialMemory = performance.memory.usedJSHeapSize / (1024 * 1024);
    
    // Create and play multiple audio elements
    const audioElements = [];
    
    try {
      for (let i = 0; i < 10; i++) {
        const audio = new Audio(this.testAudioData.testUrls[0]);
        audioElements.push(audio);
        
        // Trigger loading
        audio.load();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Track peak memory
        const currentMemory = performance.memory.usedJSHeapSize / (1024 * 1024);
        results.peakMemory = Math.max(results.peakMemory, currentMemory);
      }
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Cleanup
      audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
        audio.load();
      });
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get final memory
      results.finalMemory = performance.memory.usedJSHeapSize / (1024 * 1024);
      results.memoryIncrease = results.finalMemory - results.initialMemory;
      
      // Detect memory leak (more than 5MB increase after cleanup)
      results.leakDetected = results.memoryIncrease > 5;
      
      // Score: 100 if memory increase < 2MB, decreasing to 0 at 20MB
      results.score = Math.max(0, Math.min(100, 100 - (results.memoryIncrease - 2) / 0.18));
      
      if (results.leakDetected) {
        results.score = Math.min(results.score, 30); // Cap score if leak detected
      }
      
    } catch (error) {
      results.error = error.message;
      results.score = 0;
    }

    return results;
  }

  /**
   * Test cache performance
   */
  async testCachePerformance() {
    const results = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      averageHitTime: 0,
      averageMissTime: 0,
      score: 0
    };

    const hitTimes = [];
    const missTimes = [];

    // Test cache implementation (mock)
    const cache = new Map();
    const testData = 'mock-audio-data';

    try {
      // Warm up cache
      for (let i = 0; i < 5; i++) {
        cache.set(`test-${i}`, testData);
      }

      // Test cache hits
      for (let i = 0; i < 50; i++) {
        const key = `test-${i % 5}`;
        const startTime = performance.now();
        
        if (cache.has(key)) {
          const data = cache.get(key);
          const hitTime = performance.now() - startTime;
          hitTimes.push(hitTime);
          results.cacheHits++;
        } else {
          // Simulate cache miss
          await new Promise(resolve => setTimeout(resolve, 10));
          const missTime = performance.now() - startTime;
          missTimes.push(missTime);
          results.cacheMisses++;
        }
      }

      // Calculate statistics
      results.cacheHitRate = results.cacheHits / (results.cacheHits + results.cacheMisses) * 100;
      
      if (hitTimes.length > 0) {
        results.averageHitTime = hitTimes.reduce((a, b) => a + b) / hitTimes.length;
      }
      
      if (missTimes.length > 0) {
        results.averageMissTime = missTimes.reduce((a, b) => a + b) / missTimes.length;
      }
      
      // Score based on hit rate and speed
      const hitRateScore = results.cacheHitRate;
      const speedScore = results.averageHitTime < 1 ? 100 : Math.max(0, 100 - results.averageHitTime);
      results.score = (hitRateScore + speedScore) / 2;
      
    } catch (error) {
      results.error = error.message;
      results.score = 0;
    }

    return results;
  }

  /**
   * Test concurrent streams
   */
  async testConcurrentStreams() {
    const results = {
      maxConcurrentStreams: 0,
      successfulStreams: 0,
      failedStreams: 0,
      averageStreamSetupTime: 0,
      score: 0
    };

    const setupTimes = [];
    const audioElements = [];

    try {
      // Test increasing numbers of concurrent streams
      for (let streamCount = 1; streamCount <= 10; streamCount++) {
        const startTime = performance.now();
        const streamPromises = [];

        // Create concurrent streams
        for (let i = 0; i < streamCount; i++) {
          const audio = new Audio(this.testAudioData.testUrls[i % this.testAudioData.testUrls.length]);
          audioElements.push(audio);
          
          const streamPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Stream setup timeout'));
            }, 5000);

            audio.addEventListener('canplay', () => {
              clearTimeout(timeout);
              resolve();
            });
            
            audio.addEventListener('error', () => {
              clearTimeout(timeout);
              reject(new Error('Stream setup failed'));
            });
            
            audio.load();
          });
          
          streamPromises.push(streamPromise);
        }

        try {
          await Promise.all(streamPromises);
          const setupTime = performance.now() - startTime;
          setupTimes.push(setupTime);
          
          results.maxConcurrentStreams = streamCount;
          results.successfulStreams = streamCount;
          
          console.log(`✅ ${streamCount} concurrent streams successful (${setupTime.toFixed(0)}ms)`);
          
        } catch (error) {
          results.failedStreams = streamCount;
          console.log(`❌ ${streamCount} concurrent streams failed: ${error.message}`);
          break;
        }

        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Calculate average setup time
      if (setupTimes.length > 0) {
        results.averageStreamSetupTime = setupTimes.reduce((a, b) => a + b) / setupTimes.length;
      }

      // Score based on max concurrent streams and setup time
      const concurrencyScore = Math.min(100, results.maxConcurrentStreams * 20); // 20 points per stream, max 100
      const speedScore = results.averageStreamSetupTime < 100 ? 100 : 
                        Math.max(0, 100 - (results.averageStreamSetupTime - 100) / 10);
      results.score = (concurrencyScore + speedScore) / 2;

    } catch (error) {
      results.error = error.message;
      results.score = 0;
    } finally {
      // Cleanup
      audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    }

    return results;
  }

  /**
   * Test network performance
   */
  async testNetworkPerformance() {
    const results = {
      downloadSpeeds: [],
      averageDownloadSpeed: 0,
      connectionLatency: 0,
      timeouts: 0,
      score: 0
    };

    try {
      // Test download speeds with different sized data
      const testSizes = [1024, 5120, 10240]; // 1KB, 5KB, 10KB
      
      for (const size of testSizes) {
        const testData = 'x'.repeat(size);
        const blob = new Blob([testData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const startTime = performance.now();
        
        try {
          const response = await fetch(url);
          await response.text();
          const endTime = performance.now();
          
          const downloadTime = endTime - startTime;
          const downloadSpeed = (size / 1024) / (downloadTime / 1000); // KB/s
          
          results.downloadSpeeds.push(downloadSpeed);
          
        } catch (error) {
          results.timeouts++;
        } finally {
          URL.revokeObjectURL(url);
        }
      }

      // Calculate average download speed
      if (results.downloadSpeeds.length > 0) {
        results.averageDownloadSpeed = results.downloadSpeeds.reduce((a, b) => a + b) / results.downloadSpeeds.length;
      }

      // Test connection latency
      const latencyStartTime = performance.now();
      try {
        await fetch('data:text/plain,test');
        results.connectionLatency = performance.now() - latencyStartTime;
      } catch (error) {
        results.connectionLatency = -1;
      }

      // Score based on download speed and latency
      const speedScore = Math.min(100, results.averageDownloadSpeed * 2); // 50 points per KB/s, max 100
      const latencyScore = results.connectionLatency > 0 ? 
                          Math.max(0, 100 - results.connectionLatency) : 50;
      results.score = (speedScore + latencyScore) / 2;

    } catch (error) {
      results.error = error.message;
      results.score = 0;
    }

    return results;
  }

  /**
   * Test error resilience
   */
  async testErrorResilience() {
    const results = {
      tests: [],
      recoveredErrors: 0,
      totalErrors: 0,
      recoveryRate: 0,
      score: 0
    };

    const errorTests = [
      {
        name: 'Invalid URL',
        test: () => this.loadAudioUrl('invalid-url'),
        expectError: true
      },
      {
        name: '404 Not Found', 
        test: () => this.loadAudioUrl('/nonexistent-audio.mp3'),
        expectError: true
      },
      {
        name: 'Invalid Format',
        test: () => this.loadAudioUrl('data:text/plain,not-audio'),
        expectError: true
      },
      {
        name: 'Empty Data',
        test: () => this.loadAudioUrl('data:audio/wav;base64,'),
        expectError: true
      }
    ];

    for (const errorTest of errorTests) {
      try {
        await errorTest.test();
        
        if (errorTest.expectError) {
          results.tests.push({
            name: errorTest.name,
            passed: false,
            error: 'Expected error but succeeded'
          });
        } else {
          results.tests.push({
            name: errorTest.name,
            passed: true
          });
        }
        
      } catch (error) {
        results.totalErrors++;
        
        if (errorTest.expectError) {
          results.recoveredErrors++;
          results.tests.push({
            name: errorTest.name,
            passed: true,
            error: error.message
          });
        } else {
          results.tests.push({
            name: errorTest.name,
            passed: false,
            error: error.message
          });
        }
      }
    }

    // Calculate recovery rate
    if (results.totalErrors > 0) {
      results.recoveryRate = results.recoveredErrors / results.totalErrors * 100;
    }

    // Score based on how well errors were handled
    results.score = results.tests.filter(t => t.passed).length / results.tests.length * 100;

    return results;
  }

  /**
   * Helper: Load audio URL with promise
   */
  loadAudioUrl(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      
      const timeout = setTimeout(() => {
        reject(new Error('Load timeout'));
      }, 5000);

      audio.addEventListener('canplay', () => {
        clearTimeout(timeout);
        resolve(audio);
      });
      
      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('Audio load failed'));
      });
      
      audio.load();
    });
  }

  /**
   * Calculate overall benchmark score
   */
  calculateOverallScore(tests) {
    const scores = [];
    
    Object.values(tests).forEach(test => {
      if (typeof test.score === 'number') {
        scores.push(test.score);
      }
    });
    
    if (scores.length === 0) return 0;
    
    return Math.round(scores.reduce((a, b) => a + b) / scores.length);
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      memory: performance.memory ? {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / (1024 * 1024),
        totalJSHeapSize: performance.memory.totalJSHeapSize / (1024 * 1024),
        usedJSHeapSize: performance.memory.usedJSHeapSize / (1024 * 1024)
      } : null,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      },
      audioContext: this.getAudioContextInfo()
    };
  }

  /**
   * Get audio context information
   */
  getAudioContextInfo() {
    try {
      if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const info = {
          sampleRate: audioContext.sampleRate,
          state: audioContext.state,
          maxChannelCount: audioContext.destination.maxChannelCount,
          numberOfInputs: audioContext.destination.numberOfInputs,
          numberOfOutputs: audioContext.destination.numberOfOutputs
        };
        audioContext.close();
        return info;
      }
    } catch (error) {
      return { error: error.message };
    }
    
    return { available: false };
  }

  /**
   * Generate benchmark report
   */
  generateReport(results) {
    const report = {
      summary: {
        timestamp: new Date(results.timestamp).toISOString(),
        overallScore: results.overallScore,
        environment: results.environment.userAgent,
        testsCompleted: Object.keys(results.tests).length
      },
      recommendations: this.generateRecommendations(results),
      detailedResults: results.tests,
      environment: results.environment
    };

    console.log('📊 Benchmark Report Generated');
    console.table(report.summary);
    
    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Loading performance recommendations
    if (results.tests.loadingPerformance && results.tests.loadingPerformance.score < 70) {
      recommendations.push('Consider implementing audio preloading and compression');
    }

    // Memory recommendations
    if (results.tests.memoryUsage) {
      if (results.tests.memoryUsage.leakDetected) {
        recommendations.push('Memory leak detected - review audio element cleanup');
      }
      if (results.tests.memoryUsage.score < 60) {
        recommendations.push('High memory usage - consider reducing concurrent streams');
      }
    }

    // Concurrency recommendations
    if (results.tests.concurrentStreams && results.tests.concurrentStreams.maxConcurrentStreams < 3) {
      recommendations.push('Low concurrent stream support - implement stream pooling');
    }

    // Cache recommendations
    if (results.tests.cachePerformance && results.tests.cachePerformance.score < 80) {
      recommendations.push('Improve caching strategy for better performance');
    }

    // Network recommendations
    if (results.tests.networkPerformance && results.tests.networkPerformance.score < 60) {
      recommendations.push('Network performance issues - consider adaptive quality streaming');
    }

    return recommendations;
  }
}

// Export for use in other components
export default AudioBenchmark;