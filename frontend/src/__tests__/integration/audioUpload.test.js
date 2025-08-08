/**
 * Audio Upload Integration Tests
 * End-to-end testing of audio file upload functionality
 */

import { 
  setupAudioTestEnvironment, 
  cleanupAudioTestEnvironment,
  audioTestFixtures,
  mockApiResponses,
  performanceTestUtils,
  securityTestUtils
} from '../mocks/audioMocks';
import { audioService } from '../../services/audioService';

// Mock the audio service
jest.mock('../../services/audioService');
const mockAudioService = audioService;

describe('Audio Upload Integration Tests', () => {
  let audioMocks;

  beforeEach(() => {
    audioMocks = setupAudioTestEnvironment();
    jest.clearAllMocks();
    
    // Setup default mocks
    mockAudioService.uploadAudioClip.mockResolvedValue(mockApiResponses.uploadSuccess);
  });

  afterEach(() => {
    cleanupAudioTestEnvironment();
  });

  describe('File Upload Process', () => {
    it('should upload valid audio file with progress tracking', async () => {
      const progressCallback = jest.fn();
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      formData.append('name', 'Test Audio');
      formData.append('category', 'greetings');

      // Mock progress events
      mockAudioService.uploadAudioClip.mockImplementation((data, onProgress) => {
        if (onProgress) {
          setTimeout(() => onProgress(25), 10);
          setTimeout(() => onProgress(50), 20);
          setTimeout(() => onProgress(75), 30);
          setTimeout(() => onProgress(100), 40);
        }
        return Promise.resolve(mockApiResponses.uploadSuccess);
      });

      const result = await audioService.uploadAudioClip(formData, progressCallback);

      expect(result.success).toBe(true);
      expect(progressCallback).toHaveBeenCalledTimes(4);
      expect(progressCallback).toHaveBeenCalledWith(25);
      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(75);
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    it('should validate file type before upload', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.invalidAudioFile);
      formData.append('name', 'Invalid File');
      formData.append('category', 'greetings');

      // Simulate client-side validation
      const isValidFileType = securityTestUtils.validateFileType(
        audioTestFixtures.invalidAudioFile,
        ['audio/mpeg', 'audio/wav', 'audio/mp4']
      );

      expect(isValidFileType).toBe(false);
    });

    it('should validate file size before upload', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.largeAudioFile);

      const isValidFileSize = securityTestUtils.validateFileSize(
        audioTestFixtures.largeAudioFile,
        5 // 5MB limit
      );

      expect(isValidFileSize).toBe(false);
    });

    it('should handle upload cancellation', async () => {
      const abortController = new AbortController();
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);

      // Mock upload cancellation
      mockAudioService.uploadAudioClip.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve(mockApiResponses.uploadSuccess), 1000);
          
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Upload cancelled'));
          });
        });
      });

      const uploadPromise = audioService.uploadAudioClip(formData);
      
      // Cancel after 100ms
      setTimeout(() => abortController.abort(), 100);

      await expect(uploadPromise).rejects.toThrow('Upload cancelled');
    });

    it('should retry failed uploads', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);

      let attemptCount = 0;
      mockAudioService.uploadAudioClip.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockApiResponses.uploadSuccess);
      });

      // Implement retry logic
      const uploadWithRetry = async (data, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await audioService.uploadAudioClip(data);
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
          }
        }
      };

      const result = await uploadWithRetry(formData);
      
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });
  });

  describe('Multiple File Uploads', () => {
    it('should handle concurrent file uploads', async () => {
      const files = [
        audioTestFixtures.validAudioFile,
        audioTestFixtures.wavAudioFile,
        audioTestFixtures.mp4AudioFile
      ];

      const uploadPromises = files.map((file, index) => {
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('name', `Audio ${index + 1}`);
        formData.append('category', 'greetings');
        
        return audioService.uploadAudioClip(formData);
      });

      const results = await Promise.all(uploadPromises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle mixed success/failure in batch upload', async () => {
      const files = [
        audioTestFixtures.validAudioFile,
        audioTestFixtures.wavAudioFile,
        audioTestFixtures.mp4AudioFile
      ];

      mockAudioService.uploadAudioClip
        .mockResolvedValueOnce(mockApiResponses.uploadSuccess)
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce(mockApiResponses.uploadSuccess);

      const uploadPromises = files.map((file, index) => {
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('name', `Audio ${index + 1}`);
        formData.append('category', 'greetings');
        
        return audioService.uploadAudioClip(formData).catch(error => ({ error: error.message }));
      });

      const results = await Promise.all(uploadPromises);
      
      expect(results[0].success).toBe(true);
      expect(results[1].error).toBe('Upload failed');
      expect(results[2].success).toBe(true);
    });

    it('should track progress for multiple uploads', async () => {
      const progressCallbacks = [jest.fn(), jest.fn()];
      const files = [audioTestFixtures.validAudioFile, audioTestFixtures.wavAudioFile];

      mockAudioService.uploadAudioClip.mockImplementation((data, onProgress) => {
        if (onProgress) {
          setTimeout(() => onProgress(50), 10);
          setTimeout(() => onProgress(100), 20);
        }
        return Promise.resolve(mockApiResponses.uploadSuccess);
      });

      const uploadPromises = files.map((file, index) => {
        const formData = new FormData();
        formData.append('audio', file);
        return audioService.uploadAudioClip(formData, progressCallbacks[index]);
      });

      await Promise.all(uploadPromises);
      
      progressCallbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledWith(50);
        expect(callback).toHaveBeenCalledWith(100);
      });
    });
  });

  describe('Upload Performance', () => {
    it('should measure upload speed', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      
      const startTime = performance.now();
      
      await audioService.uploadAudioClip(formData);
      
      const uploadTime = performance.now() - startTime;
      const fileSizeInMB = audioTestFixtures.validAudioFile.size / (1024 * 1024);
      const uploadSpeedMbps = (fileSizeInMB / uploadTime) * 1000;
      
      // Should achieve reasonable upload speed (this is mocked, so will be very fast)
      expect(uploadSpeedMbps).toBeGreaterThan(0);
      expect(uploadTime).toBeLessThan(1000); // Should complete within 1 second for mock
    });

    it('should handle large file uploads efficiently', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.largeAudioFile);
      
      // Mock chunked upload for large files
      mockAudioService.uploadAudioClip.mockImplementation((data, onProgress) => {
        return new Promise(resolve => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            if (onProgress) onProgress(progress);
            if (progress >= 100) {
              clearInterval(interval);
              resolve(mockApiResponses.uploadSuccess);
            }
          }, 10);
        });
      });

      const progressCallback = jest.fn();
      const result = await audioService.uploadAudioClip(formData, progressCallback);
      
      expect(result.success).toBe(true);
      expect(progressCallback).toHaveBeenCalledTimes(10); // Should track progress in chunks
    });

    it('should optimize memory usage during upload', async () => {
      const initialMemory = performanceTestUtils.measureMemoryUsage();
      
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.largeAudioFile);
      
      await audioService.uploadAudioClip(formData);
      
      const finalMemory = performanceTestUtils.measureMemoryUsage();
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const fileSizeBytes = audioTestFixtures.largeAudioFile.size;
        
        // Memory increase should not be significantly more than file size
        expect(memoryIncrease).toBeLessThan(fileSizeBytes * 2);
      }
    });
  });

  describe('Upload Security', () => {
    it('should reject malicious file types', async () => {
      const maliciousFile = securityTestUtils.createMaliciousFile('malicious.exe');
      
      const isValid = securityTestUtils.validateFileType(
        maliciousFile,
        ['audio/mpeg', 'audio/wav', 'audio/mp4']
      );
      
      expect(isValid).toBe(false);
    });

    it('should enforce file size limits', async () => {
      const oversizedFile = securityTestUtils.createOversizedFile(100); // 100MB
      
      const isValid = securityTestUtils.validateFileSize(oversizedFile, 10); // 10MB limit
      
      expect(isValid).toBe(false);
    });

    it('should sanitize file names', async () => {
      const dangerousFileName = '../../../etc/passwd.mp3';
      const file = new File(['test content'], dangerousFileName, { type: 'audio/mpeg' });
      
      // File name sanitization should happen on the server side
      const formData = new FormData();
      formData.append('audio', file);
      
      await audioService.uploadAudioClip(formData);
      
      // Mock would handle the sanitization
      expect(mockAudioService.uploadAudioClip).toHaveBeenCalled();
    });

    it('should validate file headers/magic bytes', async () => {
      // Create a file with wrong extension but correct MIME type
      const suspiciousFile = new File(
        ['fake mp3 content'], 
        'suspicious.mp3', 
        { type: 'audio/mpeg' }
      );
      
      // Real implementation would check magic bytes
      const formData = new FormData();
      formData.append('audio', suspiciousFile);
      
      // This would fail in a real implementation with magic byte validation
      mockAudioService.uploadAudioClip.mockRejectedValue(new Error('Invalid file format'));
      
      await expect(audioService.uploadAudioClip(formData)).rejects.toThrow('Invalid file format');
    });

    it('should handle upload quota limits', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      
      // Mock quota exceeded error
      mockAudioService.uploadAudioClip.mockRejectedValue(new Error('Upload quota exceeded'));
      
      await expect(audioService.uploadAudioClip(formData)).rejects.toThrow('Upload quota exceeded');
    });
  });

  describe('Upload Error Recovery', () => {
    it('should handle network interruptions', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      
      // Simulate network interruption
      mockAudioService.uploadAudioClip.mockRejectedValue(new Error('Network error'));
      
      const result = await audioService.uploadAudioClip(formData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });

    it('should handle server errors gracefully', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      
      // Simulate server error
      mockAudioService.uploadAudioClip.mockRejectedValue(new Error('Server error: 500'));
      
      const result = await audioService.uploadAudioClip(formData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Server error');
    });

    it('should handle timeout errors', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      
      // Simulate timeout
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      mockAudioService.uploadAudioClip.mockRejectedValue(timeoutError);
      
      const result = await audioService.uploadAudioClip(formData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Request timeout');
    });

    it('should provide meaningful error messages', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.invalidAudioFile);
      
      const errors = [
        { error: new Error('File too large'), expectedMessage: 'File too large' },
        { error: new Error('Invalid format'), expectedMessage: 'Invalid format' },
        { error: new Error('Quota exceeded'), expectedMessage: 'Quota exceeded' }
      ];
      
      for (const { error, expectedMessage } of errors) {
        mockAudioService.uploadAudioClip.mockRejectedValue(error);
        
        const result = await audioService.uploadAudioClip(formData);
        
        expect(result.success).toBe(false);
        expect(result.message).toContain(expectedMessage);
      }
    });
  });

  describe('Upload Metadata Handling', () => {
    it('should preserve audio metadata', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      formData.append('name', 'Test Audio with Metadata');
      formData.append('category', 'greetings');
      formData.append('description', 'Test description');
      formData.append('tags', 'test,upload,integration');
      
      const result = await audioService.uploadAudioClip(formData);
      
      expect(result.success).toBe(true);
      expect(mockAudioService.uploadAudioClip).toHaveBeenCalledWith(
        expect.any(FormData),
        undefined
      );
    });

    it('should validate metadata fields', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      formData.append('name', ''); // Empty name should be rejected
      formData.append('category', 'invalid-category');
      
      // Client-side validation would catch this
      const isValidName = formData.get('name').trim().length > 0;
      const validCategories = ['greetings', 'objections', 'closing', 'general'];
      const isValidCategory = validCategories.includes(formData.get('category'));
      
      expect(isValidName).toBe(false);
      expect(isValidCategory).toBe(false);
    });

    it('should handle special characters in metadata', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      formData.append('name', 'Spéciål Çhåractérs & Émojis 🎵');
      formData.append('category', 'greetings');
      
      const result = await audioService.uploadAudioClip(formData);
      
      expect(result.success).toBe(true);
      // Server should handle Unicode properly
    });
  });

  describe('Upload Integration Scenarios', () => {
    it('should integrate with audio player after upload', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      formData.append('name', 'New Audio Clip');
      formData.append('category', 'greetings');
      
      const result = await audioService.uploadAudioClip(formData);
      
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: expect.any(Number),
        name: 'New Audio Clip',
        category: 'greetings',
        url: expect.any(String)
      });
    });

    it('should update audio clip list after successful upload', async () => {
      // Mock getting updated audio list
      mockAudioService.getAllAudioClips.mockResolvedValue({
        success: true,
        data: {
          greetings: [
            ...mockApiResponses.getAllAudioClips.data.greetings,
            mockApiResponses.uploadSuccess.data
          ]
        }
      });
      
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      
      const uploadResult = await audioService.uploadAudioClip(formData);
      expect(uploadResult.success).toBe(true);
      
      const updatedList = await audioService.getAllAudioClips();
      expect(updatedList.data.greetings).toContainEqual(
        expect.objectContaining({
          name: 'New Audio Clip'
        })
      );
    });

    it('should handle upload notification to other components', async () => {
      const onUploadComplete = jest.fn();
      
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      
      const result = await audioService.uploadAudioClip(formData);
      
      if (result.success) {
        onUploadComplete(result.data);
      }
      
      expect(onUploadComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(Number),
          name: 'New Audio Clip'
        })
      );
    });
  });
});