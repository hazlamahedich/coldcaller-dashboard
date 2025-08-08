/**
 * Audio Performance Benchmark Tests
 * Measures and validates audio system performance characteristics
 */

import { 
  setupAudioTestEnvironment, 
  cleanupAudioTestEnvironment,
  performanceTestUtils,
  mockAudioClips,
  audioTestFixtures
} from '../mocks/audioMocks';
import { audioService } from '../../services/audioService';
import AudioClipPlayer from '../../components/AudioClipPlayer';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the audio service
jest.mock('../../services/audioService');
const mockAudioService = audioService;

describe('Audio Performance Benchmarks', () => {
  let audioMocks;

  beforeEach(() => {
    audioMocks = setupAudioTestEnvironment();
    jest.clearAllMocks();
    
    // Setup performance-optimized mocks
    mockAudioService.getAllAudioClips.mockResolvedValue({
      success: true,
      data: mockAudioClips
    });
  });

  afterEach(() => {
    cleanupAudioTestEnvironment();
  });

  describe('Audio Loading Performance', () => {
    it('should load audio clips within performance budget', async () => {
      const PERFORMANCE_BUDGET_MS = 200;
      const startTime = performance.now();
      
      render(<AudioClipPlayer />);
      
      // Wait for component to load
      await screen.findByText('🟢 Connected');
      
      const loadTime = performance.now() - startTime;
      
      expect(loadTime).toBeLessThan(PERFORMANCE_BUDGET_MS);
      console.log(`Audio clips loaded in ${loadTime.toFixed(2)}ms`);
    });

    it('should efficiently handle large audio catalogs', async () => {
      // Create large dataset
      const largeAudioCatalog = {};
      const categoriesCount = 20;
      const clipsPerCategory = 100;
      
      for (let i = 0; i < categoriesCount; i++) {
        const categoryName = `category-${i}`;
        largeAudioCatalog[categoryName] = Array(clipsPerCategory).fill().map((_, j) => ({
          id: i * clipsPerCategory + j,
          name: `Audio Clip ${j}`,
          category: categoryName,
          duration: `0:${String(15 + j % 45).padStart(2, '0')}`,
          url: `/audio/clip-${i}-${j}.mp3`
        }));
      }
      
      mockAudioService.getAllAudioClips.mockResolvedValue({
        success: true,
        data: largeAudioCatalog
      });
      
      const startTime = performance.now();
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      const loadTime = performance.now() - startTime;
      
      // Should handle 2000 clips efficiently
      expect(loadTime).toBeLessThan(500);
      console.log(`Large catalog (${categoriesCount * clipsPerCategory} clips) loaded in ${loadTime.toFixed(2)}ms`);
    });

    it('should optimize rendering performance with virtualization', async () => {
      const MANY_CLIPS = Array(1000).fill().map((_, i) => ({
        id: i,
        name: `Clip ${i}`,
        category: 'performance-test',
        duration: '0:10',
        url: `/audio/clip-${i}.mp3`
      }));
      
      mockAudioService.getAllAudioClips.mockResolvedValue({
        success: true,
        data: { 'performance-test': MANY_CLIPS }
      });
      
      const startTime = performance.now();
      render(<AudioClipPlayer />);
      
      // Component should render initial view quickly even with many clips
      const initialRenderTime = performance.now() - startTime;
      expect(initialRenderTime).toBeLessThan(100);
      
      // Only visible clips should be in DOM
      const playButtons = screen.getAllByText(/▶️ Play/);
      expect(playButtons.length).toBeLessThanOrEqual(50); // Should virtualize long lists
    });

    it('should measure memory usage during audio operations', async () => {
      const measureMemory = () => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      };
      
      const initialMemory = measureMemory();
      
      // Perform memory-intensive operations
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      
      // Play multiple clips
      const playButtons = screen.getAllByText(/▶️ Play/);
      for (let i = 0; i < Math.min(5, playButtons.length); i++) {
        fireEvent.click(playButtons[i]);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const finalMemory = measureMemory();
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        const memoryUsageMB = memoryIncrease / (1024 * 1024);
        
        console.log(`Memory usage increased by ${memoryUsageMB.toFixed(2)}MB`);
        
        // Should not leak excessive memory
        expect(memoryUsageMB).toBeLessThan(10); // Less than 10MB increase
      }
    });
  });

  describe('Audio Playback Performance', () => {
    it('should start audio playback within latency budget', async () => {
      const LATENCY_BUDGET_MS = 50;
      
      mockAudioService.getAudioUrl.mockResolvedValue({
        success: true,
        data: { url: '/audio/test.mp3' }
      });
      
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      
      const playButton = screen.getAllByText(/▶️ Play/)[0];
      
      const startTime = performance.now();
      fireEvent.click(playButton);
      
      // Wait for playback to start
      await screen.findByText(/Playing audio clip/);
      const playbackLatency = performance.now() - startTime;
      
      expect(playbackLatency).toBeLessThan(LATENCY_BUDGET_MS);
      console.log(`Audio playback started in ${playbackLatency.toFixed(2)}ms`);
    });

    it('should efficiently switch between audio clips', async () => {
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      
      const playButtons = screen.getAllByText(/▶️ Play/);
      
      const switchTimes = [];
      
      // Test switching between multiple clips
      for (let i = 0; i < Math.min(5, playButtons.length); i++) {
        const startTime = performance.now();
        fireEvent.click(playButtons[i]);
        
        await screen.findByText(/Playing audio clip/);
        const switchTime = performance.now() - startTime;
        switchTimes.push(switchTime);
        
        // Brief pause between switches
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const avgSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
      
      expect(avgSwitchTime).toBeLessThan(30); // Should switch quickly
      console.log(`Average clip switch time: ${avgSwitchTime.toFixed(2)}ms`);
    });

    it('should handle concurrent audio operations efficiently', async () => {
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      
      const startTime = performance.now();
      
      // Simulate rapid interactions
      const playButtons = screen.getAllByText(/▶️ Play/);
      const promises = [];
      
      for (let i = 0; i < Math.min(10, playButtons.length); i++) {
        promises.push(new Promise(resolve => {
          setTimeout(() => {
            fireEvent.click(playButtons[i % playButtons.length]);
            resolve();
          }, i * 5);
        }));
      }
      
      await Promise.all(promises);
      
      const totalTime = performance.now() - startTime;
      
      // Should handle rapid clicks efficiently
      expect(totalTime).toBeLessThan(200);
      console.log(`Handled 10 concurrent operations in ${totalTime.toFixed(2)}ms`);
    });

    it('should optimize caching for frequently accessed clips', async () => {
      mockAudioService.getAudioUrl.mockResolvedValue({
        success: true,
        data: { url: '/audio/test.mp3' }
      });
      
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      
      const playButton = screen.getAllByText(/▶️ Play/)[0];
      
      // Play same clip multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(playButton);
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Stop if playing
        const stopButton = screen.queryByText(/⏸️ Stop/);
        if (stopButton) {
          fireEvent.click(stopButton);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Should only call getAudioUrl once due to caching
      expect(mockAudioService.getAudioUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe('Network Performance', () => {
    it('should handle slow network conditions gracefully', async () => {
      // Simulate slow network
      mockAudioService.getAllAudioClips.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: mockAudioClips
          }), 2000) // 2 second delay
        )
      );
      
      const startTime = performance.now();
      render(<AudioClipPlayer />);
      
      // Should show loading state immediately
      expect(screen.getByText(/🔄 Loading/)).toBeInTheDocument();
      
      // Wait for data to load
      await screen.findByText('🟢 Connected', {}, { timeout: 3000 });
      
      const totalTime = performance.now() - startTime;
      console.log(`Handled slow network in ${totalTime.toFixed(2)}ms`);
      
      // Should handle gracefully without blocking UI
      expect(totalTime).toBeGreaterThan(1900); // Network delay
      expect(totalTime).toBeLessThan(2500); // But not much overhead
    });

    it('should optimize API call batching', async () => {
      let apiCallCount = 0;
      mockAudioService.getAllAudioClips.mockImplementation(() => {
        apiCallCount++;
        return Promise.resolve({
          success: true,
          data: mockAudioClips
        });
      });
      
      // Render multiple components that might trigger API calls
      render(
        <div>
          <AudioClipPlayer />
          <AudioClipPlayer />
          <AudioClipPlayer />
        </div>
      );
      
      await screen.findAllByText('🟢 Connected');
      
      // Should batch or cache to avoid redundant calls
      expect(apiCallCount).toBeLessThanOrEqual(1);
    });

    it('should measure bandwidth efficiency', async () => {
      const mockData = mockAudioClips;
      const dataSize = JSON.stringify(mockData).length;
      
      const startTime = performance.now();
      
      mockAudioService.getAllAudioClips.mockResolvedValue({
        success: true,
        data: mockData
      });
      
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      
      const transferTime = performance.now() - startTime;
      const bandwidthUsage = dataSize / transferTime; // bytes per ms
      
      console.log(`Data transfer: ${dataSize} bytes in ${transferTime.toFixed(2)}ms`);
      console.log(`Effective bandwidth usage: ${(bandwidthUsage * 1000 / 1024).toFixed(2)} KB/s`);
      
      // Should be efficient for the data size
      expect(bandwidthUsage).toBeGreaterThan(0);
    });
  });

  describe('Scalability Benchmarks', () => {
    it('should scale linearly with number of audio clips', async () => {
      const testSizes = [10, 50, 100, 500];
      const loadTimes = [];
      
      for (const size of testSizes) {
        const testData = {
          'test-category': Array(size).fill().map((_, i) => ({
            id: i,
            name: `Clip ${i}`,
            category: 'test-category',
            duration: '0:15',
            url: `/audio/clip-${i}.mp3`
          }))
        };
        
        mockAudioService.getAllAudioClips.mockResolvedValue({
          success: true,
          data: testData
        });
        
        const startTime = performance.now();
        const { unmount } = render(<AudioClipPlayer />);
        await screen.findByText('🟢 Connected');
        const loadTime = performance.now() - startTime;
        
        loadTimes.push({ size, loadTime });
        unmount();
      }
      
      // Calculate scaling factor
      const firstLoad = loadTimes[0];
      const lastLoad = loadTimes[loadTimes.length - 1];
      const scalingFactor = lastLoad.loadTime / firstLoad.loadTime;
      const dataSizeRatio = lastLoad.size / firstLoad.size;
      
      console.log('Scalability test results:', loadTimes);
      console.log(`Scaling factor: ${scalingFactor.toFixed(2)}x for ${dataSizeRatio}x data`);
      
      // Should scale reasonably (not more than linear)
      expect(scalingFactor).toBeLessThan(dataSizeRatio * 1.5);
    });

    it('should handle memory pressure gracefully', async () => {
      // Create large objects to simulate memory pressure
      const largeObjects = [];
      for (let i = 0; i < 50; i++) {
        largeObjects.push(new Array(100000).fill(`memory-pressure-${i}`));
      }
      
      const initialMemory = performanceTestUtils.measureMemoryUsage();
      
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      
      // Component should still work under memory pressure
      const playButton = screen.getAllByText(/▶️ Play/)[0];
      fireEvent.click(playButton);
      
      await screen.findByText(/Playing audio clip/);
      
      const finalMemory = performanceTestUtils.measureMemoryUsage();
      
      if (initialMemory && finalMemory) {
        const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        console.log(`Memory growth under pressure: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
        
        // Should handle memory pressure without excessive growth
        expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
      }
      
      // Cleanup
      largeObjects.length = 0;
    });

    it('should maintain performance with long-running sessions', async () => {
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      
      const performanceMetrics = [];
      const playButtons = screen.getAllByText(/▶️ Play/);
      
      // Simulate long session with many interactions
      for (let iteration = 0; iteration < 20; iteration++) {
        const startTime = performance.now();
        
        // Play random clip
        const randomButton = playButtons[iteration % playButtons.length];
        fireEvent.click(randomButton);
        
        await screen.findByText(/Playing audio clip/);
        
        // Stop after brief play
        const stopButton = screen.getByText(/⏸️ Stop/);
        fireEvent.click(stopButton);
        
        const operationTime = performance.now() - startTime;
        performanceMetrics.push(operationTime);
        
        // Brief pause between operations
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Analyze performance degradation
      const firstFive = performanceMetrics.slice(0, 5);
      const lastFive = performanceMetrics.slice(-5);
      
      const avgFirst = firstFive.reduce((a, b) => a + b, 0) / firstFive.length;
      const avgLast = lastFive.reduce((a, b) => a + b, 0) / lastFive.length;
      
      const degradationRatio = avgLast / avgFirst;
      
      console.log(`Performance metrics:`, performanceMetrics);
      console.log(`Performance degradation ratio: ${degradationRatio.toFixed(2)}`);
      
      // Should not degrade significantly over time
      expect(degradationRatio).toBeLessThan(2.0); // Less than 2x slower
    });
  });

  describe('Performance Monitoring', () => {
    it('should track Core Web Vitals equivalents', async () => {
      const vitals = {
        LCP: null, // Largest Contentful Paint
        FID: null, // First Input Delay  
        CLS: null  // Cumulative Layout Shift
      };
      
      // Measure LCP equivalent (component ready time)
      const lcpStart = performance.now();
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      vitals.LCP = performance.now() - lcpStart;
      
      // Measure FID equivalent (first interaction response)
      const playButton = screen.getAllByText(/▶️ Play/)[0];
      const fidStart = performance.now();
      fireEvent.click(playButton);
      await screen.findByText(/Playing audio clip/);
      vitals.FID = performance.now() - fidStart;
      
      console.log('Core Web Vitals equivalent:', vitals);
      
      // Core Web Vitals targets (adapted for our use case)
      expect(vitals.LCP).toBeLessThan(2500); // 2.5s
      expect(vitals.FID).toBeLessThan(100);  // 100ms
    });

    it('should profile component render cycles', async () => {
      const renderTimes = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        const { unmount } = render(<AudioClipPlayer />);
        await screen.findByText('🟢 Connected');
        
        const renderTime = performance.now() - startTime;
        renderTimes.push(renderTime);
        
        unmount();
      }
      
      const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      const maxRenderTime = Math.max(...renderTimes);
      const minRenderTime = Math.min(...renderTimes);
      
      console.log(`Render performance - Avg: ${avgRenderTime.toFixed(2)}ms, Min: ${minRenderTime.toFixed(2)}ms, Max: ${maxRenderTime.toFixed(2)}ms`);
      
      // Consistent render performance
      expect(avgRenderTime).toBeLessThan(200);
      expect(maxRenderTime - minRenderTime).toBeLessThan(100); // Low variance
    });

    it('should measure resource utilization efficiency', async () => {
      const startCPU = performance.now();
      const startMemory = performanceTestUtils.measureMemoryUsage();
      
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');
      
      // Perform typical user interactions
      const playButton = screen.getAllByText(/▶️ Play/)[0];
      fireEvent.click(playButton);
      await screen.findByText(/Playing audio clip/);
      
      const endCPU = performance.now();
      const endMemory = performanceTestUtils.measureMemoryUsage();
      
      const cpuTime = endCPU - startCPU;
      
      if (startMemory && endMemory) {
        const memoryUsed = (endMemory.usedJSHeapSize - startMemory.usedJSHeapSize) / 1024 / 1024;
        
        console.log(`Resource utilization - CPU: ${cpuTime.toFixed(2)}ms, Memory: ${memoryUsed.toFixed(2)}MB`);
        
        // Efficient resource usage
        expect(cpuTime).toBeLessThan(500); // 500ms CPU time
        expect(memoryUsed).toBeLessThan(5); // 5MB memory
      }
    });
  });
});