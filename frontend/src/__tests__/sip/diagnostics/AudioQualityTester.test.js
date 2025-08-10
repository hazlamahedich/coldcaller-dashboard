/**
 * Audio Quality Tester Tests
 * Comprehensive test suite for audio quality testing and analysis functionality
 */

import { jest } from '@jest/globals';
import AudioQualityTester from '../../../utils/sip-testing/AudioQualityTester';

// Mock Web Audio API
const mockAudioContext = {
  state: 'running',
  resume: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue(),
  createOscillator: jest.fn().mockReturnValue({
    frequency: { value: 0 },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  }),
  createGain: jest.fn().mockReturnValue({
    gain: { value: 0 },
    connect: jest.fn()
  }),
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  createAnalyser: jest.fn().mockReturnValue({
    fftSize: 256,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
    getFloatFrequencyData: jest.fn(),
    connect: jest.fn()
  }),
  destination: {},
  currentTime: 0,
  baseLatency: 0.005 // 5ms
};

global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
global.webkitAudioContext = global.AudioContext;

// Mock MediaRecorder
global.MediaRecorder = {
  isTypeSupported: jest.fn().mockImplementation((mimeType) => {
    return ['audio/opus', 'audio/PCMU', 'audio/PCMA'].includes(mimeType);
  })
};

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: jest.fn().mockReturnValue([{
      stop: jest.fn(),
      getCapabilities: jest.fn().mockReturnValue({
        sampleRate: { min: 8000, max: 48000 },
        channelCount: { min: 1, max: 2 }
      }),
      getSettings: jest.fn().mockReturnValue({
        sampleRate: 48000,
        channelCount: 1
      })
    }]),
    getAudioTracks: jest.fn().mockReturnValue([{
      stop: jest.fn(),
      getCapabilities: jest.fn().mockReturnValue({
        sampleRate: { min: 8000, max: 48000 },
        channelCount: { min: 1, max: 2 }
      }),
      getSettings: jest.fn().mockReturnValue({
        sampleRate: 48000,
        channelCount: 1
      })
    }])
  }),
  enumerateDevices: jest.fn().mockResolvedValue([
    {
      deviceId: 'input1',
      kind: 'audioinput',
      label: 'Default Microphone',
      groupId: 'group1'
    },
    {
      deviceId: 'output1',
      kind: 'audiooutput',
      label: 'Default Speaker',
      groupId: 'group1'
    }
  ])
};

describe('AudioQualityTester', () => {
  let audioTester;

  beforeEach(() => {
    audioTester = new AudioQualityTester();
    jest.clearAllMocks();
  });

  afterEach(() => {
    audioTester.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(audioTester).toBeDefined();
      expect(audioTester.testResults).toBeInstanceOf(Map);
      expect(audioTester.qualityMetrics).toBeDefined();
      expect(audioTester.audioContext).toBeDefined();
    });

    test('should initialize AudioContext', async () => {
      expect(AudioContext).toHaveBeenCalled();
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    test('should have test configuration', () => {
      expect(audioTester.testConfig).toMatchObject({
        sampleRate: 48000,
        bufferSize: 4096,
        analysisInterval: 100,
        testDuration: 10000
      });
    });

    test('should have quality thresholds', () => {
      expect(audioTester.testConfig.qualityThresholds).toMatchObject({
        excellent: expect.any(Object),
        good: expect.any(Object),
        fair: expect.any(Object),
        poor: expect.any(Object)
      });
    });
  });

  describe('Event System', () => {
    test('should register and emit events', () => {
      const callback = jest.fn();
      audioTester.on('testEvent', callback);
      
      audioTester.emit('testEvent', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should support multiple event callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      audioTester.on('testEvent', callback1);
      audioTester.on('testEvent', callback2);
      
      audioTester.emit('testEvent', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('Microphone Capabilities Testing', () => {
    test('should test microphone access successfully', async () => {
      const result = await audioTester.testMicrophoneCapabilities();

      expect(result).toMatchObject({
        available: true,
        devices: expect.any(Array),
        permissions: 'granted',
        capabilities: expect.any(Object),
        channelCount: 1
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            sampleRate: 48000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          })
        })
      );
    });

    test('should handle microphone permission denied', async () => {
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
      );

      const result = await audioTester.testMicrophoneCapabilities();

      expect(result.available).toBe(false);
      expect(result.permissions).toBe('denied');
      expect(result.error).toBe('Permission denied');
    });

    test('should enumerate audio input devices', async () => {
      const result = await audioTester.testMicrophoneCapabilities();

      expect(result.devices).toHaveLength(1);
      expect(result.devices[0]).toMatchObject({
        deviceId: 'input1',
        label: 'Default Microphone',
        groupId: 'group1'
      });
    });

    test('should get microphone capabilities', async () => {
      const result = await audioTester.testMicrophoneCapabilities();

      expect(result.capabilities).toMatchObject({
        sampleRate: { min: 8000, max: 48000 },
        channelCount: { min: 1, max: 2 }
      });
      expect(result.sampleRates).toEqual([8000, 48000]);
    });
  });

  describe('Speaker Capabilities Testing', () => {
    test('should test speaker capabilities', async () => {
      const result = await audioTester.testSpeakerCapabilities();

      expect(result).toMatchObject({
        available: true,
        devices: expect.any(Array),
        testTone: expect.any(Boolean),
        volumeControl: expect.any(Boolean)
      });
    });

    test('should enumerate audio output devices', async () => {
      const result = await audioTester.testSpeakerCapabilities();

      expect(result.devices).toHaveLength(1);
      expect(result.devices[0]).toMatchObject({
        deviceId: 'output1',
        label: 'Default Speaker',
        groupId: 'group1'
      });
    });

    test('should test tone generation', async () => {
      const result = await audioTester.testSpeakerCapabilities();

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(result.testTone).toBe(true);
    });

    test('should check volume control support', async () => {
      // Mock setSinkId support
      HTMLMediaElement.prototype.setSinkId = jest.fn();

      const result = await audioTester.testSpeakerCapabilities();

      expect(result.volumeControl).toBe(true);
    });
  });

  describe('Codec Support Testing', () => {
    test('should test codec support', async () => {
      const result = await audioTester.testCodecSupport();

      expect(result).toMatchObject({
        supported: expect.any(Array),
        recommended: expect.any(Array),
        quality: expect.any(Object)
      });

      expect(MediaRecorder.isTypeSupported).toHaveBeenCalledTimes(6); // 6 codecs tested
    });

    test('should identify supported codecs', async () => {
      const result = await audioTester.testCodecSupport();

      const supportedCodecs = result.supported.map(codec => codec.mimeType);
      expect(supportedCodecs).toContain('audio/opus');
      expect(supportedCodecs).toContain('audio/PCMU');
      expect(supportedCodecs).toContain('audio/PCMA');
    });

    test('should categorize codec quality', async () => {
      const result = await audioTester.testCodecSupport();

      expect(result.quality['audio/opus']).toMatchObject({
        supported: true,
        quality: 'excellent'
      });
      expect(result.quality['audio/G722']).toMatchObject({
        supported: false,
        quality: 'very-good'
      });
    });

    test('should recommend high-quality codecs', async () => {
      const result = await audioTester.testCodecSupport();

      const recommendedQualities = result.recommended.map(codec => codec.quality);
      expect(recommendedQualities).toContain('excellent');
    });
  });

  describe('Audio Quality Analysis', () => {
    test('should analyze audio quality', async () => {
      // Mock analyser data
      const mockAnalyser = mockAudioContext.createAnalyser();
      mockAnalyser.getByteFrequencyData.mockImplementation((dataArray) => {
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.random() * 255;
        }
      });
      mockAnalyser.getFloatFrequencyData.mockImplementation((dataArray) => {
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = -60 + Math.random() * 40; // -60 to -20 dB
        }
      });

      const result = await audioTester.analyzeAudioQuality(1000); // Short duration for test

      expect(result).toMatchObject({
        duration: 1000,
        metrics: {
          volume: expect.any(Object),
          frequency: expect.any(Object),
          noise: expect.any(Object),
          clarity: expect.any(Number),
          mos: expect.any(Number)
        },
        quality: expect.stringMatching(/excellent|good|fair|poor/),
        samples: expect.any(Array)
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            echoCancellation: true,
            noiseSuppression: false, // Disabled for accurate noise measurement
            autoGainControl: false
          })
        })
      );
    });

    test('should emit quality updates during analysis', async () => {
      const updateCallback = jest.fn();
      audioTester.on('qualityUpdate', updateCallback);

      await audioTester.analyzeAudioQuality(500);

      expect(updateCallback).toHaveBeenCalled();
      expect(updateCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
          volume: expect.any(Number),
          spectrum: expect.any(Object),
          noise: expect.any(Number),
          clarity: expect.any(Number)
        })
      );
    });

    test('should calculate volume metrics correctly', async () => {
      const result = await audioTester.analyzeAudioQuality(500);

      expect(result.metrics.volume.min).toBeGreaterThanOrEqual(0);
      expect(result.metrics.volume.max).toBeLessThanOrEqual(100);
      expect(result.metrics.volume.average).toBeGreaterThanOrEqual(result.metrics.volume.min);
      expect(result.metrics.volume.average).toBeLessThanOrEqual(result.metrics.volume.max);
    });

    test('should analyze frequency spectrum', async () => {
      const result = await audioTester.analyzeAudioQuality(500);

      expect(result.samples.length).toBeGreaterThan(0);
      expect(result.samples[0].spectrum).toMatchObject({
        bass: expect.any(Number),
        mid: expect.any(Number),
        treble: expect.any(Number),
        voice: expect.any(Number)
      });
    });
  });

  describe('Echo and Feedback Testing', () => {
    test('should test for echo and feedback', async () => {
      const result = await audioTester.testEchoAndFeedback();

      expect(result).toMatchObject({
        echoDetected: expect.any(Boolean),
        echoDelay: expect.any(Number),
        feedbackRisk: expect.stringMatching(/low|medium|high/),
        recommendations: expect.any(Array)
      });

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });

    test('should provide recommendations when echo detected', async () => {
      // Mock high volume to simulate echo
      const mockAnalyser = mockAudioContext.createAnalyser();
      mockAnalyser.getByteFrequencyData.mockImplementation((dataArray) => {
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = 150; // High volume indicating potential echo
        }
      });

      const result = await audioTester.testEchoAndFeedback();

      if (result.echoDetected) {
        expect(result.recommendations).toContain('Enable echo cancellation');
        expect(result.recommendations).toContain('Reduce speaker volume');
        expect(result.recommendations).toContain('Use headphones to prevent feedback');
      }
    });
  });

  describe('Audio Latency Testing', () => {
    test('should measure audio latency', async () => {
      const result = await audioTester.testAudioLatency();

      expect(result).toMatchObject({
        inputLatency: expect.any(Number),
        outputLatency: expect.any(Number),
        totalLatency: expect.any(Number),
        quality: expect.stringMatching(/excellent|good|fair|poor/)
      });
    });

    test('should use AudioContext baseLatency', async () => {
      mockAudioContext.baseLatency = 0.010; // 10ms

      const result = await audioTester.testAudioLatency();

      expect(result.outputLatency).toBeGreaterThanOrEqual(10);
    });

    test('should assess latency quality correctly', async () => {
      mockAudioContext.baseLatency = 0.020; // 20ms

      const result = await audioTester.testAudioLatency();

      if (result.totalLatency < 50) {
        expect(result.quality).toBe('excellent');
      } else if (result.totalLatency < 100) {
        expect(result.quality).toBe('good');
      }
    });
  });

  describe('Test Tone Generation', () => {
    test('should play test tone successfully', async () => {
      const success = await audioTester.playTestTone(440, 0.1, 100);

      expect(success).toBe(true);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    test('should handle test tone generation errors', async () => {
      mockAudioContext.createOscillator.mockImplementationOnce(() => {
        throw new Error('Oscillator failed');
      });

      const success = await audioTester.playTestTone(440, 0.1, 100);

      expect(success).toBe(false);
    });
  });

  describe('Quality Calculations', () => {
    test('should calculate MOS score correctly', () => {
      const metrics = {
        noise: { snr: 30 },
        clarity: 85,
        volume: { min: 20, max: 80, average: 50 }
      };

      const mos = audioTester.calculateMOS(metrics);

      expect(mos).toBeGreaterThanOrEqual(1.0);
      expect(mos).toBeLessThanOrEqual(4.5);
      expect(mos).toBeGreaterThan(3.0); // Good quality with these metrics
    });

    test('should penalize poor metrics in MOS calculation', () => {
      const poorMetrics = {
        noise: { snr: 10 }, // Poor SNR
        clarity: 40,        // Poor clarity
        volume: { min: 0, max: 100, average: 50 } // High variation
      };

      const mos = audioTester.calculateMOS(poorMetrics);

      expect(mos).toBeLessThan(3.0);
    });

    test('should assess audio quality levels correctly', () => {
      const excellentMetrics = {
        noise: { snr: 45 },
        clarity: 95
      };

      const quality = audioTester.assessAudioQuality(excellentMetrics);
      expect(quality).toBe('excellent');

      const poorMetrics = {
        noise: { snr: 5 },
        clarity: 30
      };

      const poorQuality = audioTester.assessAudioQuality(poorMetrics);
      expect(poorQuality).toBe('poor');
    });
  });

  describe('Comprehensive Audio Testing', () => {
    test('should run complete audio quality test', async () => {
      const result = await audioTester.runAudioQualityTest({ duration: 500 });

      expect(result).toMatchObject({
        testId: expect.any(String),
        startTime: expect.any(Number),
        tests: {
          microphone: expect.any(Object),
          speaker: expect.any(Object),
          codecs: expect.any(Object),
          quality: expect.any(Object),
          echo: expect.any(Object),
          latency: expect.any(Object)
        },
        summary: {
          overall: expect.stringMatching(/excellent|good|fair|poor/),
          score: expect.any(Number),
          issues: expect.any(Array),
          recommendations: expect.any(Array)
        }
      });
    });

    test('should emit test progress events', async () => {
      const startCallback = jest.fn();
      const progressCallback = jest.fn();
      const completeCallback = jest.fn();

      audioTester.on('testStarted', startCallback);
      audioTester.on('testProgress', progressCallback);
      audioTester.on('testCompleted', completeCallback);

      await audioTester.runAudioQualityTest({ duration: 100 });

      expect(startCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledTimes(6); // 6 test categories
      expect(completeCallback).toHaveBeenCalled();
    });

    test('should store test results', async () => {
      const result = await audioTester.runAudioQualityTest({ duration: 100 });

      expect(audioTester.testResults.has(result.testId)).toBe(true);
    });

    test('should skip quality analysis if microphone unavailable', async () => {
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('No microphone'));

      const result = await audioTester.runAudioQualityTest({ duration: 100 });

      expect(result.tests.microphone.available).toBe(false);
      expect(result.tests.quality).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle AudioContext initialization failure', () => {
      AudioContext.mockImplementationOnce(() => {
        throw new Error('AudioContext failed');
      });

      const tester = new AudioQualityTester();
      expect(tester.audioContext).toBeNull();

      tester.destroy();
    });

    test('should handle test failures gracefully', async () => {
      navigator.mediaDevices.getUserMedia.mockRejectedValue(new Error('Media error'));

      const result = await audioTester.runAudioQualityTest({ duration: 100 });

      expect(result.summary.overall).toBe('error');
      expect(result.summary.issues.some(issue => issue.includes('Test failed'))).toBe(true);
    });

    test('should handle device enumeration failure', async () => {
      navigator.mediaDevices.enumerateDevices.mockRejectedValueOnce(new Error('Enumeration failed'));

      const result = await audioTester.testSpeakerCapabilities();

      expect(result.error).toBe('Enumeration failed');
    });
  });

  describe('Results Management', () => {
    test('should retrieve test results by ID', () => {
      const testId = 'test-123';
      const testResult = { testId, summary: { overall: 'good' } };
      
      audioTester.testResults.set(testId, testResult);
      
      const retrieved = audioTester.getTestResults(testId);
      expect(retrieved).toEqual(testResult);
    });

    test('should get current quality metrics', () => {
      const metrics = audioTester.getCurrentMetrics();
      
      expect(metrics).toMatchObject({
        volumeLevel: expect.any(Number),
        noiseLevel: expect.any(Number),
        clarity: expect.any(Number),
        mos: expect.any(Number)
      });
    });

    test('should clear test results', () => {
      audioTester.testResults.set('test-1', { data: 'test' });
      
      audioTester.clearResults();
      
      expect(audioTester.testResults.size).toBe(0);
    });
  });

  describe('Performance and Optimization', () => {
    test('should complete tests within reasonable time', async () => {
      const startTime = Date.now();
      const result = await audioTester.runAudioQualityTest({ duration: 500 });
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.duration).toBeLessThan(10000);
    });

    test('should handle concurrent tests', async () => {
      const promises = [
        audioTester.runAudioQualityTest({ duration: 200 }),
        audioTester.runAudioQualityTest({ duration: 200 }),
        audioTester.runAudioQualityTest({ duration: 200 })
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.testId).toBeDefined();
        expect(result.summary.overall).toMatch(/excellent|good|fair|poor|error/);
      });
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should cleanup resources on destroy', () => {
      // Add some test data
      audioTester.testResults.set('test-1', { data: 'test' });
      audioTester.mediaStream = { getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]) };
      
      audioTester.destroy();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(audioTester.testResults.size).toBe(0);
      expect(audioTester.eventCallbacks).toEqual({});
    });

    test('should stop media streams on destroy', () => {
      const mockTrack = { stop: jest.fn() };
      audioTester.mediaStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack])
      };
      
      audioTester.destroy();
      
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });
});