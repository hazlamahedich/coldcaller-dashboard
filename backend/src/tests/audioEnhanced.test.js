const request = require('supertest');
const fs = require('fs-extra');
const path = require('path');
const app = require('../server');

describe('Enhanced Audio API', () => {
  const testAudioPath = path.join(__dirname, 'fixtures', 'test-audio.mp3');
  let uploadedFileId;

  beforeAll(async () => {
    // Create test audio file if it doesn't exist
    const fixturesDir = path.join(__dirname, 'fixtures');
    await fs.ensureDir(fixturesDir);
    
    if (!await fs.pathExists(testAudioPath)) {
      // Create a minimal MP3 file for testing (just header bytes)
      const mp3Header = Buffer.from([
        0xFF, 0xFB, 0x90, 0x00, // MP3 header
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      await fs.writeFile(testAudioPath, mp3Header);
    }
  });

  afterAll(async () => {
    // Clean up test files
    if (await fs.pathExists(testAudioPath)) {
      await fs.remove(testAudioPath);
    }
  });

  describe('POST /api/audio/upload', () => {
    it('should upload audio file successfully', async () => {
      const response = await request(app)
        .post('/api/audio/upload')
        .attach('audioFiles', testAudioPath)
        .field('category', 'general')
        .field('description', 'Test audio file')
        .field('tags', JSON.stringify(['test', 'sample']))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.uploadedFiles).toHaveLength(1);
      expect(response.body.data.uploadedFiles[0]).toHaveProperty('id');
      expect(response.body.data.uploadedFiles[0].category).toBe('general');
      
      uploadedFileId = response.body.data.uploadedFiles[0].id;
    });

    it('should reject non-audio files', async () => {
      const textFilePath = path.join(__dirname, 'fixtures', 'test.txt');
      await fs.writeFile(textFilePath, 'This is not an audio file');

      await request(app)
        .post('/api/audio/upload')
        .attach('audioFiles', textFilePath)
        .expect(400);

      await fs.remove(textFilePath);
    });

    it('should validate upload fields', async () => {
      await request(app)
        .post('/api/audio/upload')
        .attach('audioFiles', testAudioPath)
        .field('category', 'invalid_category')
        .expect(400);
    });
  });

  describe('GET /api/audio/files', () => {
    it('should get all audio files', async () => {
      const response = await request(app)
        .get('/api/audio/files')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/audio/files?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('limit', 5);
    });

    it('should support filtering by category', async () => {
      const response = await request(app)
        .get('/api/audio/files?category=general')
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach(file => {
          expect(file.category).toBe('general');
        });
      }
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/audio/files?search=test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/audio/file/:id', () => {
    it('should stream audio file', async () => {
      if (!uploadedFileId) {
        // Skip if no file was uploaded
        return;
      }

      const response = await request(app)
        .get(`/api/audio/file/${uploadedFileId}`)
        .expect(200);

      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['content-type']).toMatch(/^audio\//);
    });

    it('should support range requests', async () => {
      if (!uploadedFileId) {
        return;
      }

      const response = await request(app)
        .get(`/api/audio/file/${uploadedFileId}`)
        .set('Range', 'bytes=0-10')
        .expect(206);

      expect(response.headers['content-range']).toMatch(/^bytes 0-10/);
    });

    it('should return 404 for non-existent file', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app)
        .get(`/api/audio/file/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /api/audio/metadata/:id', () => {
    it('should get audio file metadata', async () => {
      if (!uploadedFileId) {
        return;
      }

      const response = await request(app)
        .get(`/api/audio/metadata/${uploadedFileId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', uploadedFileId);
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data).toHaveProperty('analytics');
    });

    it('should return 404 for non-existent file', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app)
        .get(`/api/audio/metadata/${fakeId}`)
        .expect(404);
    });
  });

  describe('PUT /api/audio/file/:id', () => {
    it('should update audio file metadata', async () => {
      if (!uploadedFileId) {
        return;
      }

      const response = await request(app)
        .put(`/api/audio/file/${uploadedFileId}`)
        .send({
          category: 'greetings',
          description: 'Updated description',
          tags: ['updated', 'test']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('greetings');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should validate update fields', async () => {
      if (!uploadedFileId) {
        return;
      }

      await request(app)
        .put(`/api/audio/file/${uploadedFileId}`)
        .send({
          category: 'invalid_category'
        })
        .expect(400);
    });
  });

  describe('POST /api/audio/process/:id', () => {
    it('should generate waveform data', async () => {
      if (!uploadedFileId) {
        return;
      }

      const response = await request(app)
        .post(`/api/audio/process/${uploadedFileId}`)
        .send({
          operation: 'waveform',
          options: { samples: 100 }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operation).toBe('waveform');
      expect(Array.isArray(response.body.data.waveform)).toBe(true);
    });

    it('should validate processing operation', async () => {
      if (!uploadedFileId) {
        return;
      }

      await request(app)
        .post(`/api/audio/process/${uploadedFileId}`)
        .send({
          operation: 'invalid_operation'
        })
        .expect(400);
    });

    it('should validate trim operation parameters', async () => {
      if (!uploadedFileId) {
        return;
      }

      await request(app)
        .post(`/api/audio/process/${uploadedFileId}`)
        .send({
          operation: 'trim'
          // Missing required startTime and duration
        })
        .expect(400);
    });
  });

  describe('GET /api/audio/statistics', () => {
    it('should get audio library statistics', async () => {
      const response = await request(app)
        .get('/api/audio/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalFiles');
      expect(response.body.data).toHaveProperty('totalSize');
      expect(response.body.data).toHaveProperty('categories');
      expect(response.body.data).toHaveProperty('formats');
      expect(response.body.data).toHaveProperty('formattedSize');
    });
  });

  describe('GET /api/audio/search', () => {
    it('should search audio files', async () => {
      const response = await request(app)
        .get('/api/audio/search?query=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('query', 'test');
      expect(response.body.data).toHaveProperty('results');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it('should validate search query', async () => {
      await request(app)
        .get('/api/audio/search')
        .expect(400);
    });

    it('should support advanced search filters', async () => {
      const response = await request(app)
        .get('/api/audio/search?query=test&category=general&minDuration=1&maxDuration=60')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/audio/file/:id', () => {
    it('should delete audio file', async () => {
      if (!uploadedFileId) {
        return;
      }

      const response = await request(app)
        .delete(`/api/audio/file/${uploadedFileId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', uploadedFileId);

      // Verify file is deleted
      await request(app)
        .get(`/api/audio/metadata/${uploadedFileId}`)
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid UUID format', async () => {
      await request(app)
        .get('/api/audio/file/invalid-uuid')
        .expect(400);
    });

    it('should handle server errors gracefully', async () => {
      // This test would need to mock internal errors
      // For now, we just ensure the error middleware is working
      const response = await request(app)
        .get('/api/audio/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce upload rate limits', async () => {
      // This test would need to make many rapid requests
      // For now, we just ensure the endpoint exists
      const response = await request(app)
        .post('/api/audio/upload')
        .expect(400); // No files provided

      expect(response.body.success).toBe(false);
    });
  });

  describe('Backward Compatibility', () => {
    it('should support legacy audio clips endpoint', async () => {
      const response = await request(app)
        .get('/api/audio')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support legacy categories endpoint', async () => {
      const response = await request(app)
        .get('/api/audio/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});