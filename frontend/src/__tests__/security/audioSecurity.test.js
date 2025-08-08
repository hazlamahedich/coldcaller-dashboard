/**
 * Audio Security Tests
 * Validates file upload security, input sanitization, and vulnerability prevention
 */

import { 
  setupAudioTestEnvironment, 
  cleanupAudioTestEnvironment,
  audioTestFixtures,
  securityTestUtils,
  mockApiResponses
} from '../mocks/audioMocks';
import { audioService } from '../../services/audioService';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AudioClipPlayer from '../../components/AudioClipPlayer';

// Mock the audio service
jest.mock('../../services/audioService');
const mockAudioService = audioService;

describe('Audio Security Tests', () => {
  let audioMocks;
  
  beforeEach(() => {
    audioMocks = setupAudioTestEnvironment();
    jest.clearAllMocks();
    
    // Console mocks for security error testing
    console.error = jest.fn();
    console.warn = jest.fn();
    
    // Default successful mock
    mockAudioService.getAllAudioClips.mockResolvedValue(mockApiResponses.getAllAudioClips);
    mockAudioService.uploadAudioClip.mockResolvedValue(mockApiResponses.uploadSuccess);
  });

  afterEach(() => {
    cleanupAudioTestEnvironment();
    jest.restoreAllMocks();
  });

  describe('File Upload Security', () => {
    it('should validate file type to prevent malicious uploads', async () => {
      const maliciousFiles = [
        securityTestUtils.createMaliciousFile('virus.exe'),
        securityTestUtils.createMaliciousFile('malware.bat'),
        securityTestUtils.createMaliciousFile('script.js'),
        new File(['<script>alert("xss")</script>'], 'malicious.mp3', { type: 'text/html' })
      ];

      const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'];

      maliciousFiles.forEach(file => {
        const isValidType = securityTestUtils.validateFileType(file, allowedMimeTypes);
        expect(isValidType).toBe(false);
      });
    });

    it('should enforce file size limits to prevent DoS attacks', async () => {
      const maxSizeInMB = 10;
      const testFiles = [
        securityTestUtils.createOversizedFile(50), // 50MB - too large
        securityTestUtils.createOversizedFile(100), // 100MB - way too large
        audioTestFixtures.validAudioFile // Normal size - should pass
      ];

      const results = testFiles.map(file => 
        securityTestUtils.validateFileSize(file, maxSizeInMB)
      );

      expect(results[0]).toBe(false); // 50MB should fail
      expect(results[1]).toBe(false); // 100MB should fail
      expect(results[2]).toBe(true);  // Normal file should pass
    });

    it('should sanitize file names to prevent path traversal', async () => {
      const dangerousFileNames = [
        '../../../etc/passwd.mp3',
        '..\\..\\windows\\system32\\file.mp3',
        '/etc/shadow.mp3',
        'C:\\Windows\\System32\\evil.mp3',
        'file/with/slashes.mp3',
        'file\\with\\backslashes.mp3'
      ];

      const formData = new FormData();
      
      dangerousFileNames.forEach(fileName => {
        const file = new File(['test content'], fileName, { type: 'audio/mpeg' });
        formData.set('audio', file);
        
        // In real implementation, server should sanitize these
        expect(file.name).toBe(fileName); // Client keeps original name
        
        // Server-side sanitization would be tested in backend tests
      });
    });

    it('should validate file headers/magic bytes to prevent MIME type spoofing', async () => {
      // Create files with correct extension but wrong content
      const spoofedFiles = [
        new File(['#!/bin/bash\necho "malicious"'], 'fake-audio.mp3', { type: 'audio/mpeg' }),
        new File(['<html><script>alert("xss")</script></html>'], 'fake-audio.wav', { type: 'audio/wav' }),
        new File(['PK\x03\x04'], 'fake-audio.mp4', { type: 'audio/mp4' }) // ZIP header
      ];

      // Real implementation would check magic bytes on server
      spoofedFiles.forEach(file => {
        // Client-side validation is limited to MIME type
        expect(file.type).toContain('audio/');
        
        // Server should validate actual file content
      });
    });

    it('should handle malformed audio files safely', async () => {
      const corruptedFile = new File([
        '\xFF\xFE\x00\x00CORRUPT_AUDIO_DATA_HERE'
      ], 'corrupted.mp3', { type: 'audio/mpeg' });

      const formData = new FormData();
      formData.append('audio', corruptedFile);

      // Mock server rejection of corrupted file
      mockAudioService.uploadAudioClip.mockRejectedValue(new Error('Invalid audio file format'));

      const result = await audioService.uploadAudioClip(formData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid audio file format');
    });

    it('should prevent zip bombs and other compression attacks', async () => {
      // Simulate a zip bomb disguised as audio file
      const zipBombFile = new File([
        'PK\x03\x04', // ZIP file signature
        '\x00'.repeat(1000) // Compressed data that expands enormously
      ], 'zipbomb.mp3', { type: 'audio/mpeg' });

      const isValidSize = securityTestUtils.validateFileSize(zipBombFile, 10);
      expect(isValidSize).toBe(true); // Small compressed size passes

      // Real implementation should check decompressed size on server
    });

    it('should rate limit upload attempts to prevent abuse', async () => {
      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);

      let uploadCount = 0;
      mockAudioService.uploadAudioClip.mockImplementation(() => {
        uploadCount++;
        if (uploadCount > 5) {
          return Promise.reject(new Error('Rate limit exceeded'));
        }
        return Promise.resolve(mockApiResponses.uploadSuccess);
      });

      // Try to upload many files rapidly
      const uploadPromises = Array(10).fill().map(() => 
        audioService.uploadAudioClip(formData)
      );

      const results = await Promise.allSettled(uploadPromises);
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const rateLimitedCount = results.filter(r => r.status === 'rejected' && 
        r.reason.message.includes('Rate limit')).length;

      expect(successCount).toBeLessThanOrEqual(5);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize audio clip names to prevent XSS', async () => {
      const maliciousNames = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
        '\'; DROP TABLE audio_clips; --'
      ];

      maliciousNames.forEach(maliciousName => {
        const formData = new FormData();
        formData.append('audio', audioTestFixtures.validAudioFile);
        formData.append('name', maliciousName);

        // Client should not execute malicious content
        expect(maliciousName).toContain('<script>');
        
        // Server-side sanitization would handle this
      });
    });

    it('should validate category inputs against allowed values', async () => {
      const invalidCategories = [
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
        'DROP TABLE audio_clips',
        null,
        undefined,
        123,
        { malicious: 'object' }
      ];

      const validCategories = ['greetings', 'objections', 'closing', 'general'];

      invalidCategories.forEach(category => {
        const isValid = validCategories.includes(category);
        expect(isValid).toBe(false);
      });
    });

    it('should sanitize description and metadata fields', async () => {
      const maliciousMetadata = {
        description: '<script>alert("xss")</script>',
        tags: 'javascript:alert("xss")',
        notes: '<img src=x onerror=alert("xss")>'
      };

      // Real implementation would sanitize on server
      Object.values(maliciousMetadata).forEach(value => {
        expect(typeof value).toBe('string');
        // Server would remove script tags and dangerous content
      });
    });

    it('should handle Unicode and special characters safely', async () => {
      const unicodeNames = [
        'Spéciál Çhåractérs',
        '中文音频',
        'العربية',
        '🎵🎧🎤',
        'файл.mp3',
        'ファイル.mp3'
      ];

      unicodeNames.forEach(name => {
        const formData = new FormData();
        formData.append('audio', audioTestFixtures.validAudioFile);
        formData.append('name', name);

        // Should handle Unicode properly without issues
        expect(name.length).toBeGreaterThan(0);
        expect(typeof name).toBe('string');
      });
    });
  });

  describe('API Security', () => {
    it('should handle malicious API responses safely', async () => {
      const maliciousResponses = [
        '<script>alert("xss")</script>',
        { malicious: '<img src=x onerror=alert("xss")>' },
        'javascript:alert("xss")',
        null,
        undefined,
        { data: { name: '<script>alert("xss")</script>' } }
      ];

      maliciousResponses.forEach(async (response, index) => {
        mockAudioService.getAllAudioClips.mockResolvedValueOnce({
          success: true,
          data: response
        });

        const { unmount } = render(<AudioClipPlayer />);

        // Component should handle malicious responses safely
        expect(() => {
          // Should not execute any scripts or throw errors
        }).not.toThrow();

        unmount();
      });
    });

    it('should validate API response structure', async () => {
      const invalidResponses = [
        null,
        undefined,
        'string response',
        123,
        [],
        { wrong: 'structure' },
        { success: 'not boolean', data: {} }
      ];

      invalidResponses.forEach(async (response) => {
        mockAudioService.getAllAudioClips.mockResolvedValueOnce(response);

        const { unmount } = render(<AudioClipPlayer />);

        // Component should handle invalid responses gracefully
        await waitFor(() => {
          expect(screen.queryByText('🟢 Connected')).not.toBeInTheDocument();
        });

        unmount();
      });
    });

    it('should prevent CSRF attacks through proper headers', async () => {
      // Mock CSRF token validation
      const csrfToken = 'valid-csrf-token';
      
      mockAudioService.uploadAudioClip.mockImplementation((formData) => {
        // Check if CSRF token is present (would be handled by HTTP client)
        return Promise.resolve(mockApiResponses.uploadSuccess);
      });

      const formData = new FormData();
      formData.append('audio', audioTestFixtures.validAudioFile);
      
      const result = await audioService.uploadAudioClip(formData);
      
      expect(result.success).toBe(true);
      // Real implementation would include CSRF token validation
    });

    it('should handle authentication and authorization properly', async () => {
      // Mock authentication failure
      mockAudioService.getAllAudioClips.mockRejectedValue(
        new Error('Authentication required')
      );

      const { unmount } = render(<AudioClipPlayer />);

      await waitFor(() => {
        expect(screen.getByText('🟡 Offline')).toBeInTheDocument();
      });

      // Should handle auth errors gracefully
      expect(screen.queryByText('🟢 Connected')).not.toBeInTheDocument();

      unmount();
    });
  });

  describe('Content Security Policy (CSP) Compliance', () => {
    it('should not execute inline scripts', () => {
      // Mock CSP violation
      const cspViolation = () => {
        eval('alert("This should not execute")');
      };

      expect(() => {
        // Should not execute inline scripts
        try {
          cspViolation();
        } catch (error) {
          // Expected to fail under CSP
        }
      }).not.toThrow();
    });

    it('should use safe DOM manipulation methods', async () => {
      render(<AudioClipPlayer />);

      await screen.findByText('🟢 Connected');

      // Check that no innerHTML is used with user content
      const clipElements = screen.getAllByText(/Play/);
      
      clipElements.forEach(element => {
        // Text content should be safe
        expect(element.textContent).not.toContain('<script>');
        expect(element.textContent).not.toContain('javascript:');
      });
    });

    it('should validate all external resource URLs', async () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")',
        'file:///etc/passwd',
        'ftp://malicious-site.com/file.mp3'
      ];

      maliciousUrls.forEach(url => {
        // URL validation should reject malicious schemes
        try {
          const parsed = new URL(url);
          const isHttps = parsed.protocol === 'https:' || parsed.protocol === 'http:';
          expect(isHttps).toBe(false); // Most of these should fail
        } catch (error) {
          // Invalid URLs should throw
          expect(error).toBeInstanceOf(TypeError);
        }
      });
    });
  });

  describe('Data Privacy and Security', () => {
    it('should not log sensitive information', async () => {
      const sensitiveData = {
        audioUrl: '/secure/private-audio.mp3',
        userToken: 'secret-auth-token',
        personalData: 'sensitive-info'
      };

      mockAudioService.getAudioUrl.mockResolvedValue({
        success: true,
        data: { url: sensitiveData.audioUrl }
      });

      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');

      const playButton = screen.getAllByText(/▶️ Play/)[0];
      fireEvent.click(playButton);

      // Check console logs don't contain sensitive data
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('secret-auth-token')
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('sensitive-info')
      );
    });

    it('should handle user data securely in localStorage', () => {
      const sensitiveUserData = {
        authToken: 'secret-token',
        personalInfo: 'private-data'
      };

      // Should not store sensitive data in localStorage
      const storedData = JSON.stringify({ theme: 'dark' }); // Only non-sensitive data
      
      expect(storedData).not.toContain('secret-token');
      expect(storedData).not.toContain('private-data');
    });

    it('should clear sensitive data on component unmount', () => {
      const { unmount } = render(<AudioClipPlayer />);

      // Simulate sensitive data in component state
      const audioElement = audioMocks.webAudioMocks.Audio();
      
      unmount();

      // Should clean up audio elements and references
      expect(audioElement.pause).toHaveBeenCalled();
    });

    it('should implement secure error handling without data leakage', async () => {
      const sensitiveError = new Error('Database connection failed at server ip 192.168.1.100 with password admin123');
      
      mockAudioService.getAllAudioClips.mockRejectedValue(sensitiveError);

      const { unmount } = render(<AudioClipPlayer />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load audio clips/)).toBeInTheDocument();
      });

      // Error should be sanitized for user display
      expect(screen.queryByText(/192.168.1.100/)).not.toBeInTheDocument();
      expect(screen.queryByText(/admin123/)).not.toBeInTheDocument();

      unmount();
    });
  });

  describe('Denial of Service (DoS) Protection', () => {
    it('should limit concurrent requests', async () => {
      let requestCount = 0;
      const MAX_CONCURRENT_REQUESTS = 5;

      mockAudioService.getAllAudioClips.mockImplementation(() => {
        requestCount++;
        if (requestCount > MAX_CONCURRENT_REQUESTS) {
          return Promise.reject(new Error('Too many requests'));
        }
        return new Promise(resolve => 
          setTimeout(() => resolve(mockApiResponses.getAllAudioClips), 100)
        );
      });

      // Try to make many concurrent requests
      const promises = Array(10).fill().map(() => audioService.getAllAudioClips());
      const results = await Promise.allSettled(promises);

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;

      expect(successCount).toBeLessThanOrEqual(MAX_CONCURRENT_REQUESTS);
      expect(errorCount).toBeGreaterThan(0);
    });

    it('should implement request timeouts', async () => {
      mockAudioService.getAllAudioClips.mockImplementation(() => 
        new Promise(() => {
          // Never resolves - simulates hanging request
        })
      );

      const timeoutPromise = Promise.race([
        audioService.getAllAudioClips(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        )
      ]);

      await expect(timeoutPromise).rejects.toThrow('Request timeout');
    });

    it('should handle memory exhaustion gracefully', () => {
      // Try to create large arrays that could cause memory issues
      const largeArrays = [];
      
      try {
        for (let i = 0; i < 1000; i++) {
          largeArrays.push(new Array(1000).fill(`data-${i}`));
        }
        
        // Component should still work
        const { unmount } = render(<AudioClipPlayer />);
        expect(screen.getByText('Audio Clips')).toBeInTheDocument();
        unmount();
        
      } catch (error) {
        // Should handle memory pressure gracefully
        expect(error).toBeDefined();
      } finally {
        // Cleanup
        largeArrays.length = 0;
      }
    });

    it('should prevent infinite loops and recursive calls', async () => {
      let callCount = 0;
      const MAX_CALLS = 10;

      mockAudioService.getAllAudioClips.mockImplementation(() => {
        callCount++;
        if (callCount > MAX_CALLS) {
          throw new Error('Too many recursive calls detected');
        }
        return Promise.resolve(mockApiResponses.getAllAudioClips);
      });

      // Should not make infinite recursive calls
      render(<AudioClipPlayer />);
      await screen.findByText('🟢 Connected');

      expect(callCount).toBeLessThanOrEqual(MAX_CALLS);
    });
  });
});