/**
 * Comprehensive Audio Service Tests
 * Tests all audioService methods with mocking and error handling
 */

import { audioService } from '../audioService';
import api from '../api';
import { mockApiResponses, mockAudioClips } from '../../__tests__/mocks/audioMocks';

// Mock the api module
jest.mock('../api');
const mockApi = api;

describe('Audio Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console mocks
    console.error = jest.fn();
    console.log = jest.fn();
  });

  describe('getAllAudioClips', () => {
    it('should fetch all audio clips successfully', async () => {
      mockApi.get.mockResolvedValue(mockApiResponses.getAllAudioClips);

      const result = await audioService.getAllAudioClips();

      expect(mockApi.get).toHaveBeenCalledWith('/audio', {}, true);
      expect(result).toEqual(mockApiResponses.getAllAudioClips);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('greetings');
      expect(result.data).toHaveProperty('objections');
      expect(result.data).toHaveProperty('closing');
    });

    it('should handle query parameters correctly', async () => {
      const params = { category: 'greetings', search: 'intro' };
      mockApi.get.mockResolvedValue(mockApiResponses.getAllAudioClips);

      await audioService.getAllAudioClips(params);

      expect(mockApi.get).toHaveBeenCalledWith('/audio?category=greetings&search=intro', {}, true);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Network error');
      mockApi.get.mockRejectedValue(error);

      const result = await audioService.getAllAudioClips();

      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
      expect(result.message).toBe('Failed to load audio clips');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to fetch audio clips:', error);
    });

    it('should return fallback when API returns empty data', async () => {
      mockApi.get.mockResolvedValue({ success: false, data: {} });

      const result = await audioService.getAllAudioClips();

      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
    });
  });

  describe('getAudioByCategory', () => {
    it('should fetch audio clips by category', async () => {
      const categoryData = {
        success: true,
        data: mockAudioClips.greetings,
        message: 'Category clips retrieved'
      };
      mockApi.get.mockResolvedValue(categoryData);

      const result = await audioService.getAudioByCategory('greetings');

      expect(mockApi.get).toHaveBeenCalledWith('/audio/category/greetings', {}, true);
      expect(result).toEqual(categoryData);
    });

    it('should handle category not found', async () => {
      const error = new Error('Category not found');
      mockApi.get.mockRejectedValue(error);

      const result = await audioService.getAudioByCategory('nonexistent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to load nonexistent audio clips');
    });
  });

  describe('getAudioClip', () => {
    it('should fetch specific audio clip by ID', async () => {
      const clipData = {
        success: true,
        data: mockAudioClips.greetings[0],
        message: 'Audio clip retrieved'
      };
      mockApi.get.mockResolvedValue(clipData);

      const result = await audioService.getAudioClip(1);

      expect(mockApi.get).toHaveBeenCalledWith('/audio/1', {}, true);
      expect(result).toEqual(clipData);
    });

    it('should handle clip not found', async () => {
      const error = new Error('Clip not found');
      mockApi.get.mockRejectedValue(error);

      const result = await audioService.getAudioClip(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to load audio clip 999');
    });
  });

  describe('getAudioUrl', () => {
    it('should fetch audio URL for streaming', async () => {
      const urlData = mockApiResponses.getAudioUrl(1);
      mockApi.get.mockResolvedValue(urlData);

      const result = await audioService.getAudioUrl(1);

      expect(mockApi.get).toHaveBeenCalledWith('/audio/1/url', {}, true);
      expect(result).toEqual(urlData);
      expect(result.data.url).toContain('/audio/stream/');
    });

    it('should handle URL retrieval failure', async () => {
      const error = new Error('URL not found');
      mockApi.get.mockRejectedValue(error);

      const result = await audioService.getAudioUrl(1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to get audio URL');
    });
  });

  describe('uploadAudioClip', () => {
    const mockFormData = new FormData();
    mockFormData.append('audio', new File(['test'], 'test.mp3', { type: 'audio/mpeg' }));
    mockFormData.append('name', 'Test Audio');
    mockFormData.append('category', 'greetings');

    it('should upload audio clip successfully', async () => {
      mockApi.post.mockResolvedValue(mockApiResponses.uploadSuccess);

      const result = await audioService.uploadAudioClip(mockFormData);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/audio/upload',
        mockFormData,
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' }
        }),
        true
      );
      expect(result).toEqual(mockApiResponses.uploadSuccess);
    });

    it('should handle upload progress callback', async () => {
      const progressCallback = jest.fn();
      mockApi.post.mockResolvedValue(mockApiResponses.uploadSuccess);

      await audioService.uploadAudioClip(mockFormData, progressCallback);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/audio/upload',
        mockFormData,
        expect.objectContaining({
          onUploadProgress: expect.any(Function)
        }),
        true
      );
    });

    it('should call progress callback with percentage', async () => {
      const progressCallback = jest.fn();
      
      // Mock the API to call the progress handler
      mockApi.post.mockImplementation((url, data, config) => {
        if (config.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 });
        }
        return Promise.resolve(mockApiResponses.uploadSuccess);
      });

      await audioService.uploadAudioClip(mockFormData, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(50);
    });

    it('should handle upload failure', async () => {
      const error = new Error('Upload failed');
      mockApi.post.mockRejectedValue(error);

      const result = await audioService.uploadAudioClip(mockFormData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Upload failed');
    });
  });

  describe('updateAudioClip', () => {
    const updates = { name: 'Updated Name', category: 'objections' };

    it('should update audio clip successfully', async () => {
      const updateResponse = {
        success: true,
        data: { ...mockAudioClips.greetings[0], ...updates },
        message: 'Audio clip updated'
      };
      mockApi.put.mockResolvedValue(updateResponse);

      const result = await audioService.updateAudioClip(1, updates);

      expect(mockApi.put).toHaveBeenCalledWith('/audio/1', updates, {}, true);
      expect(result).toEqual(updateResponse);
    });

    it('should handle update failure', async () => {
      const error = new Error('Update failed');
      mockApi.put.mockRejectedValue(error);

      const result = await audioService.updateAudioClip(1, updates);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to update audio clip 1');
    });
  });

  describe('deleteAudioClip', () => {
    it('should delete audio clip successfully', async () => {
      const deleteResponse = {
        success: true,
        message: 'Audio clip deleted successfully'
      };
      mockApi.delete.mockResolvedValue(deleteResponse);

      const result = await audioService.deleteAudioClip(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/audio/1', {}, true);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle delete failure', async () => {
      const error = new Error('Delete failed');
      mockApi.delete.mockRejectedValue(error);

      const result = await audioService.deleteAudioClip(1);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to delete audio clip 1');
    });
  });

  describe('searchAudioClips', () => {
    it('should search audio clips by term', async () => {
      const searchParams = { search: 'intro' };
      mockApi.get.mockResolvedValue(mockApiResponses.getAllAudioClips);

      const result = await audioService.searchAudioClips('intro');

      expect(mockApi.get).toHaveBeenCalledWith('/audio?search=intro', {}, true);
      expect(result).toEqual(mockApiResponses.getAllAudioClips);
    });

    it('should handle search failure', async () => {
      const error = new Error('Search failed');
      mockApi.get.mockRejectedValue(error);

      const result = await audioService.searchAudioClips('test');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Search failed');
    });
  });

  describe('getAudioStats', () => {
    it('should get overall audio statistics', async () => {
      const statsResponse = {
        success: true,
        data: {
          totalClips: 9,
          totalPlaytime: 150,
          categoryCounts: { greetings: 3, objections: 3, closing: 3 }
        },
        message: 'Statistics retrieved'
      };
      mockApi.get.mockResolvedValue(statsResponse);

      const result = await audioService.getAudioStats();

      expect(mockApi.get).toHaveBeenCalledWith('/audio/stats', {}, true);
      expect(result).toEqual(statsResponse);
    });

    it('should get statistics for specific clip', async () => {
      const clipStatsResponse = {
        success: true,
        data: { playCount: 25, lastPlayed: '2024-01-01T12:00:00.000Z' },
        message: 'Clip statistics retrieved'
      };
      mockApi.get.mockResolvedValue(clipStatsResponse);

      const result = await audioService.getAudioStats(1);

      expect(mockApi.get).toHaveBeenCalledWith('/audio/1/stats', {}, true);
      expect(result).toEqual(clipStatsResponse);
    });
  });

  describe('getDefaultAudioClips', () => {
    it('should get default audio clips', async () => {
      const defaultResponse = {
        success: true,
        data: mockAudioClips,
        message: 'Default clips retrieved'
      };
      mockApi.get.mockResolvedValue(defaultResponse);

      const result = await audioService.getDefaultAudioClips();

      expect(mockApi.get).toHaveBeenCalledWith('/audio/defaults', {}, true);
      expect(result).toEqual(defaultResponse);
    });

    it('should return fallback defaults on API failure', async () => {
      const error = new Error('Defaults not available');
      mockApi.get.mockRejectedValue(error);

      const result = await audioService.getDefaultAudioClips();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('greetings');
      expect(result.data).toHaveProperty('objections');
      expect(result.data).toHaveProperty('closing');
      expect(result.message).toBe('Default audio clips loaded');
    });
  });

  describe('recordAudioUsage', () => {
    const usageData = {
      leadId: 'lead-123',
      callId: 'call-456',
      timestamp: '2024-01-01T12:00:00.000Z'
    };

    it('should record audio usage successfully', async () => {
      const usageResponse = {
        success: true,
        message: 'Usage recorded'
      };
      mockApi.post.mockResolvedValue(usageResponse);

      const result = await audioService.recordAudioUsage(1, usageData);

      expect(mockApi.post).toHaveBeenCalledWith('/audio/1/usage', usageData, {}, false);
      expect(result).toEqual(usageResponse);
    });

    it('should handle usage recording failure gracefully', async () => {
      const error = new Error('Usage recording failed');
      mockApi.post.mockRejectedValue(error);

      const result = await audioService.recordAudioUsage(1, usageData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Usage tracking failed');
      // Should not break main operation
      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to record audio usage for 1:',
        error
      );
    });

    it('should work with empty usage data', async () => {
      const usageResponse = { success: true, message: 'Usage recorded' };
      mockApi.post.mockResolvedValue(usageResponse);

      const result = await audioService.recordAudioUsage(1);

      expect(mockApi.post).toHaveBeenCalledWith('/audio/1/usage', {}, {}, false);
      expect(result).toEqual(usageResponse);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ECONNABORTED';
      mockApi.get.mockRejectedValue(timeoutError);

      const result = await audioService.getAllAudioClips();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to load audio clips');
    });

    it('should handle malformed responses', async () => {
      mockApi.get.mockResolvedValue({ unexpected: 'response' });

      const result = await audioService.getAllAudioClips();

      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
    });

    it('should validate file size in upload', async () => {
      // This would be handled by the frontend validation
      const largeFile = new File(['x'.repeat(50 * 1024 * 1024)], 'large.mp3', { 
        type: 'audio/mpeg' 
      });
      const formData = new FormData();
      formData.append('audio', largeFile);

      mockApi.post.mockRejectedValue(new Error('File too large'));

      const result = await audioService.uploadAudioClip(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('File too large');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle concurrent requests gracefully', async () => {
      mockApi.get.mockResolvedValue(mockApiResponses.getAllAudioClips);

      // Simulate multiple concurrent requests
      const promises = [
        audioService.getAllAudioClips(),
        audioService.getAudioByCategory('greetings'),
        audioService.getAudioClip(1)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle mixed success/failure scenarios', async () => {
      // First call succeeds, second fails
      mockApi.get
        .mockResolvedValueOnce(mockApiResponses.getAllAudioClips)
        .mockRejectedValueOnce(new Error('Network error'));

      const successResult = await audioService.getAllAudioClips();
      const failureResult = await audioService.getAllAudioClips();

      expect(successResult.success).toBe(true);
      expect(failureResult.success).toBe(false);
    });
  });
});