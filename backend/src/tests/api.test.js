// Basic API test file
const request = require('supertest');
const app = require('../server');

describe('Cold Caller API', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
        
      expect(response.body.status).toBe('OK');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('Leads API', () => {
    it('should get all leads', async () => {
      const response = await request(app)
        .get('/api/leads')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get lead statistics', async () => {
      const response = await request(app)
        .get('/api/leads/stats')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeGreaterThan(0);
    });
  });

  describe('Scripts API', () => {
    it('should get all scripts', async () => {
      const response = await request(app)
        .get('/api/scripts')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get introduction script', async () => {
      const response = await request(app)
        .get('/api/scripts/introduction')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Introduction');
    });
  });

  describe('Audio API', () => {
    it('should get all audio clips', async () => {
      const response = await request(app)
        .get('/api/audio')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get greetings audio clips', async () => {
      const response = await request(app)
        .get('/api/audio/greetings')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Calls API', () => {
    it('should get all call logs', async () => {
      const response = await request(app)
        .get('/api/calls')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get call statistics', async () => {
      const response = await request(app)
        .get('/api/calls/stats')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCalls).toBeGreaterThan(0);
    });
  });
});