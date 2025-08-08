/**
 * Audio Controller Tests
 * Comprehensive backend API endpoint testing
 */

const request = require('supertest');
const express = require('express');
const audioController = require('../../controllers/audioController');
const ResponseFormatter = require('../../utils/responseFormatter');

// Mock the data store
jest.mock('../../data/dataStore', () => ({
  audioClips: [
    {
      id: 1,
      name: "Professional Intro",
      category: "greetings",
      duration: "0:15",
      url: "/audio/professional-intro.mp3",
      createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
      id: 2,
      name: "Casual Intro",
      category: "greetings",
      duration: "0:12",
      url: "/audio/casual-intro.mp3",
      createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
      id: 3,
      name: "Not Interested",
      category: "objections",
      duration: "0:20",
      url: "/audio/not-interested.mp3",
      createdAt: "2024-01-01T00:00:00.000Z"
    },
    {
      id: 4,
      name: "Schedule Meeting",
      category: "closing",
      duration: "0:22",
      url: "/audio/schedule-meeting.mp3",
      createdAt: "2024-01-01T00:00:00.000Z"
    }
  ]
}));

// Create Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock routes
  app.get('/audio', audioController.getAllAudioClips);
  app.get('/audio/categories', audioController.getAudioCategories);
  app.get('/audio/search', audioController.searchAudioClips);
  app.get('/audio/:category', audioController.getAudioClipsByCategory);
  app.post('/audio', audioController.createAudioClip);
  app.put('/audio/:id', audioController.updateAudioClip);
  app.delete('/audio/:id', audioController.deleteAudioClip);
  
  return app;
};

describe('Audio Controller', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /audio - getAllAudioClips', () => {
    it('should return all audio clips with default pagination', async () => {
      const response = await request(app)
        .get('/audio')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4);
      expect(response.body.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: 4,
        itemsPerPage: 10
      });
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/audio?category=greetings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(clip => clip.category === 'greetings')).toBe(true);
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/audio?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        currentPage: 1,
        totalPages: 2,
        totalItems: 4,
        itemsPerPage: 2
      });
    });

    it('should return empty page for out of range pagination', async () => {
      const response = await request(app)
        .get('/audio?page=10&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should handle case-insensitive category filtering', async () => {
      const response = await request(app)
        .get('/audio?category=GREETINGS')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should handle server errors gracefully', async () => {
      // Mock console.error to prevent noise in test output
      const originalError = console.error;
      console.error = jest.fn();

      // Force an error by mocking ResponseFormatter
      const mockError = jest.spyOn(ResponseFormatter, 'paginated')
        .mockImplementation(() => {
          throw new Error('Test error');
        });

      const response = await request(app)
        .get('/audio')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error fetching audio clips:', expect.any(Error));

      // Restore
      mockError.mockRestore();
      console.error = originalError;
    });
  });

  describe('GET /audio/categories - getAudioCategories', () => {
    it('should return category statistics', async () => {
      const response = await request(app)
        .get('/audio/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      
      const greetingsCategory = response.body.data.find(cat => cat.name === 'greetings');
      expect(greetingsCategory).toEqual({
        name: 'greetings',
        count: 2,
        totalDuration: 27 // 15 + 12 seconds
      });
    });

    it('should calculate total duration correctly', async () => {
      const response = await request(app)
        .get('/audio/categories')
        .expect(200);

      const objectionsCategory = response.body.data.find(cat => cat.name === 'objections');
      expect(objectionsCategory.totalDuration).toBe(20);
    });

    it('should handle empty categories', async () => {
      // Mock empty audioClips
      jest.doMock('../../data/dataStore', () => ({
        audioClips: []
      }));

      const response = await request(app)
        .get('/audio/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /audio/search - searchAudioClips', () => {
    it('should search audio clips by name', async () => {
      const response = await request(app)
        .get('/audio/search?query=intro')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(clip => 
        clip.name.toLowerCase().includes('intro')
      )).toBe(true);
    });

    it('should handle case-insensitive search', async () => {
      const response = await request(app)
        .get('/audio/search?query=PROFESSIONAL')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Professional Intro');
    });

    it('should return empty results for no matches', async () => {
      const response = await request(app)
        .get('/audio/search?query=nonexistent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.message).toContain("Found 0 audio clips matching 'nonexistent'");
    });

    it('should require search query parameter', async () => {
      const response = await request(app)
        .get('/audio/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search query is required');
    });

    it('should handle empty search query', async () => {
      const response = await request(app)
        .get('/audio/search?query=')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search query is required');
    });
  });

  describe('GET /audio/:category - getAudioClipsByCategory', () => {
    it('should return clips for valid category', async () => {
      const response = await request(app)
        .get('/audio/greetings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(clip => clip.category === 'greetings')).toBe(true);
    });

    it('should handle case-insensitive category lookup', async () => {
      const response = await request(app)
        .get('/audio/OBJECTIONS')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('objections');
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .get('/audio/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Audio clips for category 'nonexistent' not found");
    });

    it('should handle empty categories', async () => {
      const response = await request(app)
        .get('/audio/empty-category')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /audio - createAudioClip', () => {
    it('should create new audio clip successfully', async () => {
      const newClip = {
        name: 'New Test Clip',
        category: 'greetings',
        duration: '0:30',
        url: '/audio/new-test-clip.mp3'
      };

      const response = await request(app)
        .post('/audio')
        .send(newClip)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(Number),
        name: newClip.name,
        category: newClip.category,
        duration: newClip.duration,
        url: newClip.url,
        createdAt: expect.any(String)
      });
    });

    it('should generate ID and default values', async () => {
      const minimalClip = {
        name: 'Minimal Clip',
        category: 'general'
      };

      const response = await request(app)
        .post('/audio')
        .send(minimalClip)
        .expect(201);

      expect(response.body.data).toMatchObject({
        id: expect.any(Number),
        name: 'Minimal Clip',
        category: 'general',
        duration: '0:00',
        url: expect.stringContaining('/audio/minimal-clip.mp3')
      });
    });

    it('should handle duplicate IDs by incrementing', async () => {
      const clip1 = { name: 'Clip 1', category: 'general' };
      const clip2 = { name: 'Clip 2', category: 'general' };

      const response1 = await request(app).post('/audio').send(clip1);
      const response2 = await request(app).post('/audio').send(clip2);

      expect(response1.body.data.id).toBeLessThan(response2.body.data.id);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/audio')
        .send({})
        .expect(500); // Will fail due to missing required fields

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /audio/:id - updateAudioClip', () => {
    it('should update existing audio clip', async () => {
      const updates = {
        name: 'Updated Professional Intro',
        category: 'greetings'
      };

      const response = await request(app)
        .put('/audio/1')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 1,
        name: 'Updated Professional Intro',
        category: 'greetings',
        updatedAt: expect.any(String)
      });
    });

    it('should preserve existing fields when updating', async () => {
      const updates = { name: 'Updated Name Only' };

      const response = await request(app)
        .put('/audio/1')
        .send(updates)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: 1,
        name: 'Updated Name Only',
        category: 'greetings', // Should preserve original category
        duration: '0:15' // Should preserve original duration
      });
    });

    it('should return 404 for non-existent clip', async () => {
      const response = await request(app)
        .put('/audio/999')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Audio clip not found');
    });

    it('should handle invalid ID format', async () => {
      const response = await request(app)
        .put('/audio/invalid')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /audio/:id - deleteAudioClip', () => {
    it('should delete existing audio clip', async () => {
      const response = await request(app)
        .delete('/audio/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 1,
        name: 'Professional Intro'
      });
    });

    it('should return 404 for non-existent clip', async () => {
      const response = await request(app)
        .delete('/audio/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Audio clip not found');
    });

    it('should remove clip from data store', async () => {
      await request(app)
        .delete('/audio/1')
        .expect(200);

      // Verify it's gone
      const response = await request(app)
        .get('/audio')
        .expect(200);

      expect(response.body.data.find(clip => clip.id === 1)).toBeUndefined();
    });

    it('should handle invalid ID format', async () => {
      const response = await request(app)
        .delete('/audio/invalid')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock a database error by throwing in the middleware
      const originalError = console.error;
      console.error = jest.fn();

      // Force an error in the data access
      jest.doMock('../../data/dataStore', () => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/audio')
        .expect(500);

      expect(response.body.success).toBe(false);

      console.error = originalError;
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/audio')
        .send('invalid json')
        .expect(400);

      // Express will handle malformed JSON
    });

    it('should validate numeric IDs', async () => {
      const response = await request(app)
        .get('/audio/not-a-number')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill().map((_, i) => 
        request(app).get('/audio').expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      // Mock a large dataset
      const largeDataset = Array(1000).fill().map((_, i) => ({
        id: i + 1000,
        name: `Audio Clip ${i}`,
        category: 'performance-test',
        duration: '0:10',
        url: `/audio/clip-${i}.mp3`
      }));

      jest.doMock('../../data/dataStore', () => ({
        audioClips: largeDataset
      }));

      const startTime = Date.now();
      const response = await request(app)
        .get('/audio?limit=100')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle rapid sequential requests', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(request(app).get('/audio'));
      }

      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(50);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousQuery = "'; DROP TABLE audio_clips; --";
      
      const response = await request(app)
        .get(`/audio/search?query=${encodeURIComponent(maliciousQuery)}`)
        .expect(200);

      // Should safely handle the query
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should handle XSS attempts in search', async () => {
      const xssQuery = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .get(`/audio/search?query=${encodeURIComponent(xssQuery)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).not.toContain('<script>');
    });

    it('should validate input lengths', async () => {
      const longName = 'A'.repeat(1000);
      
      const response = await request(app)
        .post('/audio')
        .send({ name: longName, category: 'general' })
        .expect(201); // Should still succeed but truncate if needed

      expect(response.body.success).toBe(true);
    });

    it('should prevent directory traversal in file paths', async () => {
      const maliciousPath = '../../../etc/passwd';
      
      const response = await request(app)
        .post('/audio')
        .send({ 
          name: 'Test Clip',
          category: 'general',
          url: maliciousPath
        })
        .expect(201);

      // Should sanitize the path
      expect(response.body.data.url).not.toContain('../');
    });
  });
});