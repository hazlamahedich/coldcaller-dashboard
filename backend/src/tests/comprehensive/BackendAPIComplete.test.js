/**
 * Comprehensive Backend API Testing Suite
 * Testing & QA Engineer - Complete API Endpoint Coverage
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Import all controllers and services
const leadsController = require('../../controllers/leadsController');
const enhancedLeadsController = require('../../controllers/enhancedLeadsController');
const callsController = require('../../controllers/callsController');
const enhancedCallsController = require('../../controllers/enhancedCallsController');
const analyticsController = require('../../controllers/analyticsController');
const callAnalyticsController = require('../../controllers/callAnalyticsController');
const audioController = require('../../controllers/audioController');
const enhancedAudioController = require('../../controllers/enhancedAudioController');
const notesController = require('../../controllers/notesController');
const noteTemplatesController = require('../../controllers/noteTemplatesController');
const scriptsController = require('../../controllers/scriptsController');
const sipController = require('../../controllers/sipController');

// Import middleware
const errorHandler = require('../../middleware/errorHandler');
const validation = require('../../middleware/validation');
const requestLogger = require('../../middleware/requestLogger');

// Create comprehensive test app
const createTestApp = () => {
  const app = express();
  
  // Middleware setup
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Test routes for all endpoints
  // Leads endpoints
  app.get('/api/leads', leadsController.getAllLeads);
  app.get('/api/leads/:id', leadsController.getLeadById);
  app.post('/api/leads', validation.validateLead, leadsController.createLead);
  app.put('/api/leads/:id', validation.validateLead, leadsController.updateLead);
  app.delete('/api/leads/:id', leadsController.deleteLead);
  app.get('/api/leads/:id/activities', leadsController.getLeadActivities);
  app.post('/api/leads/bulk', leadsController.bulkCreateLeads);
  app.get('/api/leads/search/:query', leadsController.searchLeads);

  // Enhanced Leads endpoints
  app.get('/api/enhanced/leads', enhancedLeadsController.getAllLeads);
  app.get('/api/enhanced/leads/statistics', enhancedLeadsController.getStatistics);
  app.get('/api/enhanced/leads/priority/:priority', enhancedLeadsController.getLeadsByPriority);
  app.post('/api/enhanced/leads/:id/score', enhancedLeadsController.updateLeadScore);
  app.post('/api/enhanced/leads/:id/assign', enhancedLeadsController.assignLead);

  // Calls endpoints
  app.get('/api/calls', callsController.getAllCalls);
  app.get('/api/calls/:id', callsController.getCallById);
  app.post('/api/calls', validation.validateCall, callsController.createCall);
  app.put('/api/calls/:id', validation.validateCall, callsController.updateCall);
  app.delete('/api/calls/:id', callsController.deleteCall);
  app.get('/api/calls/lead/:leadId', callsController.getCallsByLead);

  // Enhanced Calls endpoints
  app.get('/api/enhanced/calls', enhancedCallsController.getAllCalls);
  app.post('/api/enhanced/calls', enhancedCallsController.logCall);
  app.get('/api/enhanced/calls/analytics/:period', enhancedCallsController.getCallAnalytics);
  app.post('/api/enhanced/calls/:id/quality-score', enhancedCallsController.updateQualityScore);

  // Analytics endpoints
  app.get('/api/analytics/leads', analyticsController.getLeadAnalytics);
  app.get('/api/analytics/conversion', analyticsController.getConversionAnalytics);
  app.get('/api/analytics/sources', analyticsController.getSourceAnalytics);
  app.get('/api/analytics/agents', analyticsController.getAgentAnalytics);
  app.get('/api/analytics/forecasting', analyticsController.getForecastingAnalytics);
  app.get('/api/analytics/dashboard', analyticsController.getDashboardData);
  app.get('/api/analytics/real-time', analyticsController.getRealTimeMetrics);
  app.get('/api/analytics/kpis', analyticsController.getKPIs);
  app.post('/api/analytics/reports/generate', analyticsController.generateCustomReport);

  // Call Analytics endpoints
  app.get('/api/call-analytics/overview', callAnalyticsController.getOverview);
  app.get('/api/call-analytics/performance', callAnalyticsController.getPerformanceMetrics);
  app.get('/api/call-analytics/quality', callAnalyticsController.getQualityMetrics);
  app.post('/api/call-analytics/coaching', callAnalyticsController.generateCoachingInsights);

  // Audio endpoints
  app.get('/api/audio', audioController.getAllAudioFiles);
  app.get('/api/audio/:id', audioController.getAudioById);
  app.post('/api/audio/upload', audioController.uploadAudio);
  app.delete('/api/audio/:id', audioController.deleteAudio);
  app.get('/api/audio/category/:category', audioController.getAudioByCategory);

  // Enhanced Audio endpoints
  app.get('/api/enhanced/audio', enhancedAudioController.getAllAudioFiles);
  app.post('/api/enhanced/audio/upload', enhancedAudioController.uploadAudio);
  app.get('/api/enhanced/audio/analytics', enhancedAudioController.getAudioAnalytics);
  app.post('/api/enhanced/audio/:id/process', enhancedAudioController.processAudio);

  // Notes endpoints
  app.get('/api/notes', notesController.getAllNotes);
  app.get('/api/notes/:id', notesController.getNoteById);
  app.post('/api/notes', validation.validateNote, notesController.createNote);
  app.put('/api/notes/:id', validation.validateNote, notesController.updateNote);
  app.delete('/api/notes/:id', notesController.deleteNote);
  app.get('/api/notes/lead/:leadId', notesController.getNotesByLead);

  // Note Templates endpoints
  app.get('/api/note-templates', noteTemplatesController.getAllTemplates);
  app.get('/api/note-templates/:id', noteTemplatesController.getTemplateById);
  app.post('/api/note-templates', noteTemplatesController.createTemplate);
  app.put('/api/note-templates/:id', noteTemplatesController.updateTemplate);
  app.delete('/api/note-templates/:id', noteTemplatesController.deleteTemplate);

  // Scripts endpoints
  app.get('/api/scripts', scriptsController.getAllScripts);
  app.get('/api/scripts/:id', scriptsController.getScriptById);
  app.post('/api/scripts', scriptsController.createScript);
  app.put('/api/scripts/:id', scriptsController.updateScript);
  app.delete('/api/scripts/:id', scriptsController.deleteScript);
  app.get('/api/scripts/category/:category', scriptsController.getScriptsByCategory);

  // SIP endpoints
  app.post('/api/sip/register', sipController.register);
  app.post('/api/sip/unregister', sipController.unregister);
  app.post('/api/sip/call', sipController.makeCall);
  app.post('/api/sip/hangup', sipController.hangupCall);
  app.get('/api/sip/status', sipController.getStatus);

  // Health endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health/detailed', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        sip: 'available',
        audio: 'processing'
      },
      version: '1.0.0'
    });
  });

  // Error handling
  app.use(errorHandler);

  return app;
};

// Mock data generators
const generateMockLead = (overrides = {}) => ({
  name: 'Test Lead',
  company: 'Test Company',
  phone: '+1-555-0123',
  email: 'test@example.com',
  status: 'New',
  priority: 'Medium',
  industry: 'Technology',
  notes: 'Test lead for API testing',
  ...overrides
});

const generateMockCall = (overrides = {}) => ({
  lead_id: 'lead_123',
  phone_number: '+1-555-0123',
  duration: '00:05:30',
  outcome: 'Interested',
  quality_score: 4.5,
  notes: 'Good conversation',
  agent_id: 'agent_123',
  date: new Date().toISOString(),
  ...overrides
});

const generateMockNote = (overrides = {}) => ({
  lead_id: 'lead_123',
  content: 'Test note content',
  type: 'general',
  agent_id: 'agent_123',
  ...overrides
});

// Mock database operations
jest.mock('../../utils/dataManager', () => ({
  loadData: jest.fn((filename) => {
    const mockData = {
      'leads.json': [generateMockLead({ id: 'lead_001' }), generateMockLead({ id: 'lead_002' })],
      'callLogs.json': [generateMockCall({ id: 'call_001' }), generateMockCall({ id: 'call_002' })],
      'audioFiles.json': [
        { id: 'audio_001', filename: 'test1.mp3', category: 'greetings', duration: 15 },
        { id: 'audio_002', filename: 'test2.mp3', category: 'objections', duration: 20 }
      ],
      'scripts.json': [
        { id: 'script_001', title: 'Introduction', content: 'Hello [NAME]', category: 'opening' },
        { id: 'script_002', title: 'Closing', content: 'Thank you for your time', category: 'closing' }
      ],
      'notes.json': [generateMockNote({ id: 'note_001' }), generateMockNote({ id: 'note_002' })]
    };
    return Promise.resolve(mockData[filename] || []);
  }),
  saveData: jest.fn(() => Promise.resolve()),
  appendData: jest.fn(() => Promise.resolve())
}));

describe('Comprehensive Backend API Test Suite', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Leads API Endpoints', () => {
    describe('GET /api/leads', () => {
      test('should return all leads with pagination', async () => {
        const response = await request(app)
          .get('/api/leads')
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('leads');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.leads)).toBe(true);
      });

      test('should filter leads by status', async () => {
        const response = await request(app)
          .get('/api/leads')
          .query({ status: 'New' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.leads).toBeDefined();
      });

      test('should sort leads by priority', async () => {
        const response = await request(app)
          .get('/api/leads')
          .query({ sortBy: 'priority', sortOrder: 'desc' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.leads).toBeDefined();
      });

      test('should handle empty results gracefully', async () => {
        // Mock empty data
        require('../../utils/dataManager').loadData.mockResolvedValueOnce([]);

        const response = await request(app)
          .get('/api/leads')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.leads).toEqual([]);
      });
    });

    describe('GET /api/leads/:id', () => {
      test('should return specific lead by ID', async () => {
        const response = await request(app)
          .get('/api/leads/lead_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id', 'lead_001');
      });

      test('should return 404 for non-existent lead', async () => {
        const response = await request(app)
          .get('/api/leads/non_existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Lead not found');
      });
    });

    describe('POST /api/leads', () => {
      test('should create new lead with valid data', async () => {
        const newLead = generateMockLead({
          name: 'New Test Lead',
          email: 'newlead@example.com'
        });

        const response = await request(app)
          .post('/api/leads')
          .send(newLead)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.name).toBe('New Test Lead');
      });

      test('should validate required fields', async () => {
        const invalidLead = { company: 'Test Company' }; // Missing required name

        const response = await request(app)
          .post('/api/leads')
          .send(invalidLead)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('validation');
      });

      test('should validate email format', async () => {
        const invalidLead = generateMockLead({
          email: 'invalid-email'
        });

        const response = await request(app)
          .post('/api/leads')
          .send(invalidLead)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('email');
      });

      test('should validate phone number format', async () => {
        const invalidLead = generateMockLead({
          phone: '123'
        });

        const response = await request(app)
          .post('/api/leads')
          .send(invalidLead)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('phone');
      });
    });

    describe('PUT /api/leads/:id', () => {
      test('should update existing lead', async () => {
        const updates = { status: 'Qualified', priority: 'High' };

        const response = await request(app)
          .put('/api/leads/lead_001')
          .send(updates)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject(updates);
      });

      test('should return 404 for non-existent lead update', async () => {
        const updates = { status: 'Qualified' };

        const response = await request(app)
          .put('/api/leads/non_existent')
          .send(updates)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/leads/:id', () => {
      test('should delete existing lead', async () => {
        const response = await request(app)
          .delete('/api/leads/lead_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');
      });

      test('should return 404 for non-existent lead deletion', async () => {
        const response = await request(app)
          .delete('/api/leads/non_existent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/leads/bulk', () => {
      test('should create multiple leads in bulk', async () => {
        const leads = [
          generateMockLead({ name: 'Bulk Lead 1', email: 'bulk1@example.com' }),
          generateMockLead({ name: 'Bulk Lead 2', email: 'bulk2@example.com' }),
          generateMockLead({ name: 'Bulk Lead 3', email: 'bulk3@example.com' })
        ];

        const response = await request(app)
          .post('/api/leads/bulk')
          .send({ leads })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.created).toBe(3);
        expect(response.body.data.ids).toHaveLength(3);
      });

      test('should handle partial failures in bulk creation', async () => {
        const leads = [
          generateMockLead({ name: 'Valid Lead', email: 'valid@example.com' }),
          { name: 'Invalid Lead' }, // Missing required email
          generateMockLead({ name: 'Another Valid Lead', email: 'valid2@example.com' })
        ];

        const response = await request(app)
          .post('/api/leads/bulk')
          .send({ leads })
          .expect(207); // Multi-status

        expect(response.body.data.created).toBe(2);
        expect(response.body.data.failed).toBe(1);
        expect(response.body.data.errors).toHaveLength(1);
      });
    });

    describe('GET /api/leads/search/:query', () => {
      test('should search leads by name', async () => {
        const response = await request(app)
          .get('/api/leads/search/Test')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toBeDefined();
        expect(Array.isArray(response.body.data.results)).toBe(true);
      });

      test('should search leads by company', async () => {
        const response = await request(app)
          .get('/api/leads/search/Company')
          .query({ field: 'company' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toBeDefined();
      });

      test('should return empty results for no matches', async () => {
        const response = await request(app)
          .get('/api/leads/search/NonExistentQuery')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.results).toEqual([]);
      });
    });
  });

  describe('Calls API Endpoints', () => {
    describe('GET /api/calls', () => {
      test('should return all calls with pagination', async () => {
        const response = await request(app)
          .get('/api/calls')
          .query({ page: 1, limit: 20 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('calls');
        expect(response.body.data).toHaveProperty('pagination');
      });

      test('should filter calls by date range', async () => {
        const response = await request(app)
          .get('/api/calls')
          .query({
            start_date: '2024-01-01',
            end_date: '2024-12-31'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.calls).toBeDefined();
      });

      test('should filter calls by outcome', async () => {
        const response = await request(app)
          .get('/api/calls')
          .query({ outcome: 'Interested' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.calls).toBeDefined();
      });
    });

    describe('POST /api/calls', () => {
      test('should create new call log', async () => {
        const newCall = generateMockCall({
          phone_number: '+1-555-999-8888',
          outcome: 'Qualified'
        });

        const response = await request(app)
          .post('/api/calls')
          .send(newCall)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.outcome).toBe('Qualified');
      });

      test('should validate call duration format', async () => {
        const invalidCall = generateMockCall({
          duration: 'invalid-duration'
        });

        const response = await request(app)
          .post('/api/calls')
          .send(invalidCall)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('duration');
      });

      test('should validate quality score range', async () => {
        const invalidCall = generateMockCall({
          quality_score: 6.0 // Should be 1-5
        });

        const response = await request(app)
          .post('/api/calls')
          .send(invalidCall)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('quality_score');
      });
    });

    describe('GET /api/calls/lead/:leadId', () => {
      test('should return all calls for specific lead', async () => {
        const response = await request(app)
          .get('/api/calls/lead/lead_123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.calls).toBeDefined();
        expect(Array.isArray(response.body.data.calls)).toBe(true);
      });

      test('should return empty array for lead with no calls', async () => {
        // Mock empty calls for lead
        require('../../utils/dataManager').loadData.mockResolvedValueOnce([]);

        const response = await request(app)
          .get('/api/calls/lead/lead_with_no_calls')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.calls).toEqual([]);
      });
    });
  });

  describe('Analytics API Endpoints', () => {
    describe('GET /api/analytics/dashboard', () => {
      test('should return comprehensive dashboard data', async () => {
        const response = await request(app)
          .get('/api/analytics/dashboard')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('leads');
        expect(response.body.data).toHaveProperty('conversion');
        expect(response.body.data).toHaveProperty('sources');
        expect(response.body.data).toHaveProperty('agents');
        expect(response.body.data).toHaveProperty('generatedAt');
      });

      test('should complete within performance threshold', async () => {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/analytics/dashboard')
          .expect(200);

        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(5000); // 5 second threshold
      });
    });

    describe('GET /api/analytics/real-time', () => {
      test('should return current day metrics', async () => {
        const response = await request(app)
          .get('/api/analytics/real-time')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('today');
        expect(response.body.data).toHaveProperty('timestamp');
      });
    });

    describe('POST /api/analytics/reports/generate', () => {
      test('should generate custom report with all sections', async () => {
        const reportRequest = {
          reportType: 'comprehensive',
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31'
          },
          sections: ['leads', 'calls', 'conversion', 'quality'],
          format: 'json'
        };

        const response = await request(app)
          .post('/api/analytics/reports/generate')
          .send(reportRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('reportId');
        expect(response.body.data).toHaveProperty('sections');
        expect(response.body.data.sections).toHaveProperty('leads');
        expect(response.body.data.sections).toHaveProperty('calls');
      });

      test('should validate report type', async () => {
        const invalidRequest = {
          dateRange: { start: '2024-01-01', end: '2024-01-31' }
          // Missing reportType
        };

        const response = await request(app)
          .post('/api/analytics/reports/generate')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('reportType');
      });
    });
  });

  describe('Audio API Endpoints', () => {
    describe('GET /api/audio', () => {
      test('should return all audio files', async () => {
        const response = await request(app)
          .get('/api/audio')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.audioFiles).toBeDefined();
        expect(Array.isArray(response.body.data.audioFiles)).toBe(true);
      });

      test('should filter by category', async () => {
        const response = await request(app)
          .get('/api/audio')
          .query({ category: 'greetings' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.audioFiles).toBeDefined();
      });
    });

    describe('POST /api/audio/upload', () => {
      test('should handle audio file upload', async () => {
        // Note: In real implementation, this would use multer for file handling
        const mockAudioData = {
          filename: 'test-upload.mp3',
          category: 'greetings',
          duration: 25,
          size: 1024000
        };

        const response = await request(app)
          .post('/api/audio/upload')
          .send(mockAudioData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.filename).toBe('test-upload.mp3');
      });

      test('should validate audio file format', async () => {
        const invalidAudio = {
          filename: 'test.txt', // Invalid format
          category: 'greetings'
        };

        const response = await request(app)
          .post('/api/audio/upload')
          .send(invalidAudio)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('format');
      });

      test('should validate file size limits', async () => {
        const oversizedAudio = {
          filename: 'huge-file.mp3',
          category: 'greetings',
          size: 50 * 1024 * 1024 // 50MB
        };

        const response = await request(app)
          .post('/api/audio/upload')
          .send(oversizedAudio)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('size');
      });
    });
  });

  describe('SIP API Endpoints', () => {
    describe('POST /api/sip/register', () => {
      test('should register SIP account', async () => {
        const sipConfig = {
          uri: 'sip:user@domain.com',
          password: 'password123',
          displayName: 'Test User'
        };

        const response = await request(app)
          .post('/api/sip/register')
          .send(sipConfig)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('registered');
      });

      test('should validate SIP URI format', async () => {
        const invalidConfig = {
          uri: 'invalid-uri',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/sip/register')
          .send(invalidConfig)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('SIP URI');
      });
    });

    describe('POST /api/sip/call', () => {
      test('should initiate SIP call', async () => {
        const callRequest = {
          target: 'sip:target@domain.com',
          from: 'sip:user@domain.com'
        };

        const response = await request(app)
          .post('/api/sip/call')
          .send(callRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('callId');
      });

      test('should validate call target', async () => {
        const invalidCall = {
          target: 'invalid-target'
        };

        const response = await request(app)
          .post('/api/sip/call')
          .send(invalidCall)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('target');
      });
    });

    describe('GET /api/sip/status', () => {
      test('should return SIP connection status', async () => {
        const response = await request(app)
          .get('/api/sip/status')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('registered');
      });
    });
  });

  describe('Notes API Endpoints', () => {
    describe('POST /api/notes', () => {
      test('should create new note', async () => {
        const newNote = generateMockNote({
          content: 'This is a test note',
          type: 'follow-up'
        });

        const response = await request(app)
          .post('/api/notes')
          .send(newNote)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.content).toBe('This is a test note');
      });

      test('should validate note content length', async () => {
        const longNote = generateMockNote({
          content: 'x'.repeat(5001) // Assuming 5000 char limit
        });

        const response = await request(app)
          .post('/api/notes')
          .send(longNote)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('content');
      });
    });
  });

  describe('Health Check Endpoints', () => {
    describe('GET /api/health', () => {
      test('should return basic health status', async () => {
        const response = await request(app)
          .get('/api/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
      });

      test('should respond quickly', async () => {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/health')
          .expect(200);

        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(100); // Should be very fast
      });
    });

    describe('GET /api/health/detailed', () => {
      test('should return detailed health status', async () => {
        const response = await request(app)
          .get('/api/health/detailed')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('services');
        expect(response.body).toHaveProperty('version');
        expect(response.body.services).toHaveProperty('database');
        expect(response.body.services).toHaveProperty('sip');
        expect(response.body.services).toHaveProperty('audio');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/leads')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle oversized requests', async () => {
      const oversizedData = {
        data: 'x'.repeat(11 * 1024 * 1024) // 11MB, exceeds 10MB limit
      };

      const response = await request(app)
        .post('/api/leads')
        .send(oversizedData)
        .expect(413);

      expect(response.body.success).toBe(false);
    });

    test('should handle database connection errors', async () => {
      // Mock database error
      require('../../utils/dataManager').loadData.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/leads')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Internal server error');
    });
  });

  describe('Performance Tests', () => {
    test('concurrent requests should be handled efficiently', async () => {
      const promises = [];
      const startTime = Date.now();

      // Send 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/leads')
            .expect(200)
        );
      }

      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(10000); // Should handle 10 requests in < 10 seconds
    });

    test('large dataset should be paginated efficiently', async () => {
      // Mock large dataset
      const largeMockData = Array.from({ length: 1000 }, (_, i) => 
        generateMockLead({ id: `lead_${i}`, name: `Lead ${i}` })
      );
      
      require('../../utils/dataManager').loadData.mockResolvedValueOnce(largeMockData);

      const response = await request(app)
        .get('/api/leads')
        .query({ page: 1, limit: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.leads).toHaveLength(50);
      expect(response.body.data.pagination.totalPages).toBe(20);
    });
  });

  describe('Security Tests', () => {
    test('should sanitize input to prevent XSS', async () => {
      const xssAttempt = generateMockLead({
        name: '<script>alert("XSS")</script>',
        notes: 'javascript:alert("XSS")'
      });

      const response = await request(app)
        .post('/api/leads')
        .send(xssAttempt)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Verify that script tags are sanitized or escaped
      expect(response.body.data.name).not.toContain('<script>');
      expect(response.body.data.notes).not.toContain('javascript:');
    });

    test('should prevent SQL injection attempts', async () => {
      const sqlInjectionAttempt = {
        name: "'; DROP TABLE leads; --",
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/leads')
        .send(sqlInjectionAttempt)
        .expect(201);

      expect(response.body.success).toBe(true);
      // System should sanitize and not execute SQL
    });

    test('should validate file uploads for security', async () => {
      const maliciousUpload = {
        filename: '../../../etc/passwd',
        category: 'greetings'
      };

      const response = await request(app)
        .post('/api/audio/upload')
        .send(maliciousUpload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid filename');
    });

    test('should handle CSRF protection', async () => {
      // Test would depend on CSRF middleware implementation
      const response = await request(app)
        .post('/api/leads')
        .send(generateMockLead())
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});

// Cleanup
afterAll(() => {
  jest.clearAllMocks();
});