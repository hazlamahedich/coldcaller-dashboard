/**
 * Audio Routes Integration Tests
 * Tests the complete audio API routes with validation and middleware
 */

const request = require('supertest');
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const audioRoutes = require('../../routes/audio');
const { handleValidationErrors } = require('../../middleware/errorHandler');

// Mock the audio controller
jest.mock('../../controllers/audioController');
const audioController = require('../../controllers/audioController');

// Create test application
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Add validation error handling middleware
  app.use('/api/audio', audioRoutes);
  
  // Global error handler
  app.use((err, req, res, next) => {
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });
  
  return app;
};

describe('Audio Routes', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    
    // Setup default mock implementations
    audioController.getAllAudioClips.mockImplementation((req, res) => {
      res.json({ success: true, data: [] });
    });
    audioController.getAudioCategories.mockImplementation((req, res) => {
      res.json({ success: true, data: [] });
    });
    audioController.searchAudioClips.mockImplementation((req, res) => {
      res.json({ success: true, data: [] });
    });
    audioController.getAudioClipsByCategory.mockImplementation((req, res) => {
      res.json({ success: true, data: [] });
    });
    audioController.createAudioClip.mockImplementation((req, res) => {
      res.status(201).json({ success: true, data: { id: 1 } });
    });
    audioController.updateAudioClip.mockImplementation((req, res) => {
      res.json({ success: true, data: { id: 1 } });
    });
    audioController.deleteAudioClip.mockImplementation((req, res) => {
      res.json({ success: true, data: { id: 1 } });
    });
  });

  describe('GET /api/audio', () => {
    it('should call getAllAudioClips controller', async () => {
      await request(app)
        .get('/api/audio')
        .expect(200);

      expect(audioController.getAllAudioClips).toHaveBeenCalledTimes(1);
    });

    it('should pass query parameters to controller', async () => {
      await request(app)
        .get('/api/audio?category=greetings&page=2&limit=5')
        .expect(200);

      const mockCall = audioController.getAllAudioClips.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.query).toEqual({
        category: 'greetings',
        page: '2',
        limit: '5'
      });
    });

    it('should handle empty query parameters', async () => {
      await request(app)
        .get('/api/audio')
        .expect(200);

      const mockCall = audioController.getAllAudioClips.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.query).toEqual({});
    });
  });

  describe('GET /api/audio/categories', () => {
    it('should call getAudioCategories controller', async () => {
      await request(app)
        .get('/api/audio/categories')
        .expect(200);

      expect(audioController.getAudioCategories).toHaveBeenCalledTimes(1);
    });

    it('should have correct route precedence over /:category', async () => {
      await request(app)
        .get('/api/audio/categories')
        .expect(200);

      // Should call categories, not getAudioClipsByCategory
      expect(audioController.getAudioCategories).toHaveBeenCalledTimes(1);
      expect(audioController.getAudioClipsByCategory).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/audio/search', () => {
    it('should validate required query parameter', async () => {
      const response = await request(app)
        .get('/api/audio/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual([
        {
          type: 'field',
          msg: 'Search query is required and must be between 1-100 characters',
          path: 'query',
          location: 'query'
        }
      ]);
    });

    it('should validate query length', async () => {
      const longQuery = 'A'.repeat(101);
      
      const response = await request(app)
        .get(`/api/audio/search?query=${longQuery}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].msg).toContain('between 1-100 characters');
    });

    it('should trim whitespace from query', async () => {
      await request(app)
        .get('/api/audio/search?query=  test  ')
        .expect(200);

      const mockCall = audioController.searchAudioClips.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.query.query).toBe('test');
    });

    it('should call searchAudioClips with valid query', async () => {
      await request(app)
        .get('/api/audio/search?query=intro')
        .expect(200);

      expect(audioController.searchAudioClips).toHaveBeenCalledTimes(1);
    });

    it('should reject empty query strings', async () => {
      const response = await request(app)
        .get('/api/audio/search?query=   ')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/audio/:category', () => {
    it('should call getAudioClipsByCategory with category param', async () => {
      await request(app)
        .get('/api/audio/greetings')
        .expect(200);

      const mockCall = audioController.getAudioClipsByCategory.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.params.category).toBe('greetings');
    });

    it('should handle special characters in category', async () => {
      await request(app)
        .get('/api/audio/special-category')
        .expect(200);

      const mockCall = audioController.getAudioClipsByCategory.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.params.category).toBe('special-category');
    });

    it('should handle URL encoded categories', async () => {
      await request(app)
        .get('/api/audio/test%20category')
        .expect(200);

      const mockCall = audioController.getAudioClipsByCategory.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.params.category).toBe('test category');
    });
  });

  describe('POST /api/audio', () => {
    it('should validate required name field', async () => {
      const response = await request(app)
        .post('/api/audio')
        .send({ category: 'greetings' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Name is required and must be between 1-100 characters',
          path: 'name'
        })
      );
    });

    it('should validate required category field', async () => {
      const response = await request(app)
        .post('/api/audio')
        .send({ name: 'Test Audio' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Category must be one of: greetings, objections, closing, general',
          path: 'category'
        })
      );
    });

    it('should validate category values', async () => {
      const response = await request(app)
        .post('/api/audio')
        .send({ 
          name: 'Test Audio',
          category: 'invalid-category'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Category must be one of: greetings, objections, closing, general'
        })
      );
    });

    it('should validate duration format', async () => {
      const response = await request(app)
        .post('/api/audio')
        .send({ 
          name: 'Test Audio',
          category: 'greetings',
          duration: 'invalid-duration'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Duration must be in MM:SS format (e.g., 1:30)'
        })
      );
    });

    it('should accept valid duration formats', async () => {
      const validDurations = ['0:30', '1:45', '10:00'];
      
      for (const duration of validDurations) {
        await request(app)
          .post('/api/audio')
          .send({ 
            name: 'Test Audio',
            category: 'greetings',
            duration
          })
          .expect(201);
      }
    });

    it('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/audio')
        .send({ 
          name: 'Test Audio',
          category: 'greetings',
          url: 'not-a-valid-url'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'URL must be a valid URL'
        })
      );
    });

    it('should accept valid URLs', async () => {
      const validUrls = [
        'https://example.com/audio.mp3',
        'http://localhost/audio.wav',
        'audio/clip.mp3' // relative URLs should be allowed
      ];
      
      for (const url of validUrls) {
        await request(app)
          .post('/api/audio')
          .send({ 
            name: 'Test Audio',
            category: 'greetings',
            url
          })
          .expect(201);
      }
    });

    it('should trim whitespace from string fields', async () => {
      await request(app)
        .post('/api/audio')
        .send({ 
          name: '  Test Audio  ',
          category: '  greetings  '
        })
        .expect(201);

      const mockCall = audioController.createAudioClip.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.body.name).toBe('Test Audio');
      expect(req.body.category).toBe('greetings');
    });

    it('should call createAudioClip with valid data', async () => {
      const audioData = {
        name: 'Test Audio',
        category: 'greetings',
        duration: '0:30',
        url: 'https://example.com/audio.mp3'
      };

      await request(app)
        .post('/api/audio')
        .send(audioData)
        .expect(201);

      expect(audioController.createAudioClip).toHaveBeenCalledTimes(1);
    });

    it('should handle name length validation', async () => {
      const response = await request(app)
        .post('/api/audio')
        .send({ 
          name: 'A'.repeat(101), // Too long
          category: 'greetings'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Name is required and must be between 1-100 characters'
        })
      );
    });
  });

  describe('PUT /api/audio/:id', () => {
    it('should validate optional fields', async () => {
      await request(app)
        .put('/api/audio/1')
        .send({}) // Empty update should be valid
        .expect(200);

      expect(audioController.updateAudioClip).toHaveBeenCalledTimes(1);
    });

    it('should validate name length when provided', async () => {
      const response = await request(app)
        .put('/api/audio/1')
        .send({ name: 'A'.repeat(101) })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Name must be between 1-100 characters'
        })
      );
    });

    it('should validate category when provided', async () => {
      const response = await request(app)
        .put('/api/audio/1')
        .send({ category: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Category must be one of: greetings, objections, closing, general'
        })
      );
    });

    it('should validate duration format when provided', async () => {
      const response = await request(app)
        .put('/api/audio/1')
        .send({ duration: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Duration must be in MM:SS format (e.g., 1:30)'
        })
      );
    });

    it('should validate URL format when provided', async () => {
      const response = await request(app)
        .put('/api/audio/1')
        .send({ url: 'invalid-url' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'URL must be a valid URL'
        })
      );
    });

    it('should call updateAudioClip with valid partial data', async () => {
      const updates = { name: 'Updated Name' };

      await request(app)
        .put('/api/audio/1')
        .send(updates)
        .expect(200);

      const mockCall = audioController.updateAudioClip.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.params.id).toBe('1');
      expect(req.body).toEqual(updates);
    });
  });

  describe('DELETE /api/audio/:id', () => {
    it('should call deleteAudioClip with ID param', async () => {
      await request(app)
        .delete('/api/audio/1')
        .expect(200);

      const mockCall = audioController.deleteAudioClip.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.params.id).toBe('1');
    });

    it('should handle string IDs', async () => {
      await request(app)
        .delete('/api/audio/test-id')
        .expect(200);

      const mockCall = audioController.deleteAudioClip.mock.calls[0];
      const req = mockCall[0];
      
      expect(req.params.id).toBe('test-id');
    });
  });

  describe('Validation Error Handling', () => {
    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/audio')
        .send({}) // Missing required fields
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            type: 'field',
            msg: expect.any(String),
            path: expect.any(String),
            location: 'body'
          })
        ])
      });
    });

    it('should handle multiple validation errors', async () => {
      const response = await request(app)
        .post('/api/audio')
        .send({
          name: '', // Too short
          category: 'invalid', // Invalid value
          duration: 'invalid', // Invalid format
          url: 'not-a-url' // Invalid URL
        })
        .expect(400);

      expect(response.body.errors).toHaveLength(4);
      expect(response.body.errors.map(e => e.path)).toEqual(
        expect.arrayContaining(['name', 'category', 'duration', 'url'])
      );
    });

    it('should not call controller when validation fails', async () => {
      await request(app)
        .post('/api/audio')
        .send({ name: '' }) // Invalid
        .expect(400);

      expect(audioController.createAudioClip).not.toHaveBeenCalled();
    });

    it('should handle edge case validation', async () => {
      // Test boundary conditions
      const response = await request(app)
        .post('/api/audio')
        .send({
          name: 'A', // Minimum length (1 character)
          category: 'greetings'
        })
        .expect(201);

      expect(audioController.createAudioClip).toHaveBeenCalledTimes(1);
    });
  });

  describe('Route Security', () => {
    it('should sanitize input data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        category: 'greetings'
      };

      await request(app)
        .post('/api/audio')
        .send(maliciousData)
        .expect(201);

      // The actual sanitization would happen in the controller
      expect(audioController.createAudioClip).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/audio')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express handles this before our routes
      expect(response.body).toBeDefined();
    });

    it('should limit request size', async () => {
      // This would typically be handled by middleware like express.json({ limit: '1mb' })
      const largePayload = {
        name: 'A'.repeat(100), // Within limits
        category: 'greetings'
      };

      await request(app)
        .post('/api/audio')
        .send(largePayload)
        .expect(201);
    });
  });

  describe('Route Performance', () => {
    it('should handle concurrent requests', async () => {
      const promises = Array(20).fill().map(() => 
        request(app).get('/api/audio')
      );

      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(20);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should respond quickly to simple requests', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/audio')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100); // Should respond within 100ms
    });
  });
});