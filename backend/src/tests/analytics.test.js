/**
 * Analytics System Test Suite
 * Comprehensive tests for analytics API endpoints, models, and services
 */

const request = require('supertest');
const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const analyticsModel = require('../models/analyticsModel');
const analyticsService = require('../services/analyticsService');

// Mock express app for testing
const app = express();
app.use(express.json());

// Mock routes for testing
app.get('/api/analytics/leads', analyticsController.getLeadAnalytics);
app.get('/api/analytics/conversion', analyticsController.getConversionAnalytics);
app.get('/api/analytics/sources', analyticsController.getSourceAnalytics);
app.get('/api/analytics/agents', analyticsController.getAgentAnalytics);
app.get('/api/analytics/forecasting', analyticsController.getForecastingAnalytics);
app.get('/api/analytics/dashboard', analyticsController.getDashboardData);
app.get('/api/analytics/real-time', analyticsController.getRealTimeMetrics);
app.get('/api/analytics/kpis', analyticsController.getKPIs);
app.post('/api/analytics/reports/generate', analyticsController.generateCustomReport);

// Mock data for testing
const mockLeads = [
  {
    id: 'lead_001',
    name: 'Test Lead 1',
    status: 'New',
    priority: 'High',
    industry: 'Technology',
    lead_source: 'Website',
    conversion_probability: 0.75,
    created_at: '2024-01-15T08:30:00Z',
    call_attempts: 1
  },
  {
    id: 'lead_002',
    name: 'Test Lead 2',
    status: 'Qualified',
    priority: 'Medium',
    industry: 'Healthcare',
    lead_source: 'Referral',
    conversion_probability: 0.85,
    created_at: '2024-01-10T11:15:00Z',
    call_attempts: 3
  }
];

const mockCallLogs = [
  {
    id: 'call_001',
    lead_id: 'lead_001',
    agent_id: 'agent_001',
    outcome: 'Interested',
    quality_score: 4.5,
    duration: '00:12:30',
    date: '2024-01-20',
    created_at: '2024-01-20T10:30:00Z'
  },
  {
    id: 'call_002',
    lead_id: 'lead_002',
    agent_id: 'agent_002',
    outcome: 'Qualified',
    quality_score: 4.8,
    duration: '00:15:45',
    date: '2024-01-20',
    created_at: '2024-01-20T11:15:00Z'
  }
];

// Mock the data loading functions
jest.mock('../utils/dataManager', () => ({
  loadData: jest.fn((filename) => {
    if (filename === 'leads.json') return Promise.resolve(mockLeads);
    if (filename === 'callLogs.json') return Promise.resolve(mockCallLogs);
    return Promise.resolve([]);
  })
}));

describe('Analytics API Endpoints', () => {
  describe('GET /api/analytics/leads', () => {
    test('should return lead analytics with summary data', async () => {
      const response = await request(app)
        .get('/api/analytics/leads')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('distributions');
      expect(response.body.data.summary).toHaveProperty('totalLeads');
      expect(response.body.data.summary).toHaveProperty('conversionRate');
    });

    test('should filter leads by date range', async () => {
      const response = await request(app)
        .get('/api/analytics/leads')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
    });

    test('should filter leads by status', async () => {
      const response = await request(app)
        .get('/api/analytics/leads')
        .query({ status: 'New' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return validation error for invalid date format', async () => {
      const response = await request(app)
        .get('/api/analytics/leads')
        .query({ start_date: 'invalid-date' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid start_date format');
    });
  });

  describe('GET /api/analytics/conversion', () => {
    test('should return conversion funnel data', async () => {
      const response = await request(app)
        .get('/api/analytics/conversion')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('funnel');
      expect(response.body.data).toHaveProperty('dropOffAnalysis');
      expect(response.body.data).toHaveProperty('recommendations');
    });

    test('should include call outcomes in funnel data', async () => {
      const response = await request(app)
        .get('/api/analytics/conversion')
        .expect(200);

      expect(response.body.data).toHaveProperty('callOutcomes');
      expect(response.body.data.funnel).toHaveProperty('totalLeads');
      expect(response.body.data.funnel).toHaveProperty('contacted');
    });
  });

  describe('GET /api/analytics/sources', () => {
    test('should return source attribution data', async () => {
      const response = await request(app)
        .get('/api/analytics/sources')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('ranking');
      expect(response.body.data).toHaveProperty('recommendations');
    });

    test('should include ROI calculations for sources', async () => {
      const response = await request(app)
        .get('/api/analytics/sources')
        .expect(200);

      const sources = response.body.data.sources;
      Object.values(sources).forEach(source => {
        expect(source).toHaveProperty('roi');
        expect(source).toHaveProperty('costPerLead');
        expect(source).toHaveProperty('conversionRate');
      });
    });
  });

  describe('GET /api/analytics/agents', () => {
    test('should return agent performance data', async () => {
      const response = await request(app)
        .get('/api/analytics/agents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('agents');
      expect(response.body.data).toHaveProperty('rankings');
      expect(response.body.data).toHaveProperty('teamSummary');
    });

    test('should include agent call metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/agents')
        .expect(200);

      const agents = Object.values(response.body.data.agents);
      agents.forEach(agent => {
        expect(agent).toHaveProperty('calls');
        expect(agent).toHaveProperty('leads');
        expect(agent).toHaveProperty('performance');
        expect(agent.calls).toHaveProperty('avgQualityScore');
      });
    });
  });

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
      expect(response.body.data).toHaveProperty('forecasting');
      expect(response.body.data).toHaveProperty('generatedAt');
    });
  });

  describe('GET /api/analytics/real-time', () => {
    test('should return real-time metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/real-time')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('today');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('nextUpdate');
    });
  });

  describe('GET /api/analytics/kpis', () => {
    test('should return key performance indicators', async () => {
      const response = await request(app)
        .get('/api/analytics/kpis')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('lead_generation');
      expect(response.body.data).toHaveProperty('conversion_rate');
      expect(response.body.data).toHaveProperty('avg_call_quality');
    });

    test('should include trend information in KPIs', async () => {
      const response = await request(app)
        .get('/api/analytics/kpis')
        .expect(200);

      const kpis = response.body.data;
      Object.values(kpis).forEach(kpi => {
        expect(kpi).toHaveProperty('value');
        expect(kpi).toHaveProperty('label');
        expect(kpi).toHaveProperty('trend');
        expect(kpi).toHaveProperty('status');
      });
    });
  });

  describe('POST /api/analytics/reports/generate', () => {
    test('should generate custom report with all sections', async () => {
      const reportRequest = {
        reportType: 'summary',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        },
        sections: ['leads', 'conversion', 'sources'],
        format: 'json'
      };

      const response = await request(app)
        .post('/api/analytics/reports/generate')
        .send(reportRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportId');
      expect(response.body.data).toHaveProperty('sections');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.sections).toHaveProperty('leads');
      expect(response.body.data.sections).toHaveProperty('conversion');
      expect(response.body.data.sections).toHaveProperty('sources');
    });

    test('should require reportType', async () => {
      const response = await request(app)
        .post('/api/analytics/reports/generate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Report type is required');
    });
  });
});

describe('Analytics Model', () => {
  describe('getLeadMetrics', () => {
    test('should calculate basic lead metrics', async () => {
      const metrics = await analyticsModel.getLeadMetrics();
      
      expect(metrics).toHaveProperty('summary');
      expect(metrics).toHaveProperty('distributions');
      expect(metrics.summary).toHaveProperty('totalLeads');
      expect(metrics.summary).toHaveProperty('conversionRate');
      expect(typeof metrics.summary.totalLeads).toBe('number');
      expect(typeof metrics.summary.conversionRate).toBe('number');
    });

    test('should apply date range filters', async () => {
      const dateRange = {
        start: '2024-01-01',
        end: '2024-01-31'
      };

      const metrics = await analyticsModel.getLeadMetrics(dateRange);
      expect(metrics).toHaveProperty('summary');
    });

    test('should calculate lead source distribution', async () => {
      const metrics = await analyticsModel.getLeadMetrics();
      
      expect(metrics.distributions).toHaveProperty('leadSources');
      expect(typeof metrics.distributions.leadSources).toBe('object');
    });
  });

  describe('getConversionFunnel', () => {
    test('should calculate funnel metrics', async () => {
      const funnel = await analyticsModel.getConversionFunnel();
      
      expect(funnel).toHaveProperty('funnel');
      expect(funnel).toHaveProperty('dropOffAnalysis');
      expect(funnel.funnel).toHaveProperty('totalLeads');
      expect(funnel.funnel).toHaveProperty('contacted');
      expect(funnel.dropOffAnalysis).toHaveProperty('contactRate');
    });
  });

  describe('getAgentPerformance', () => {
    test('should calculate agent metrics', async () => {
      const performance = await analyticsModel.getAgentPerformance();
      
      expect(performance).toHaveProperty('agents');
      expect(performance).toHaveProperty('teamSummary');
      expect(performance.teamSummary).toHaveProperty('totalAgents');
      expect(performance.teamSummary).toHaveProperty('totalCalls');
    });
  });
});

describe('Analytics Service', () => {
  describe('generateLeadScoring', () => {
    test('should generate lead scoring for valid lead', async () => {
      const scoring = await analyticsService.generateLeadScoring('lead_001');
      
      expect(scoring).toHaveProperty('leadId', 'lead_001');
      expect(scoring).toHaveProperty('score');
      expect(scoring).toHaveProperty('factors');
      expect(scoring).toHaveProperty('recommendation');
      expect(scoring).toHaveProperty('confidence');
      expect(scoring).toHaveProperty('nextBestAction');
      
      expect(typeof scoring.score).toBe('number');
      expect(scoring.score).toBeGreaterThanOrEqual(0);
      expect(scoring.score).toBeLessThanOrEqual(1);
    });

    test('should throw error for invalid lead', async () => {
      await expect(analyticsService.generateLeadScoring('invalid_lead'))
        .rejects
        .toThrow('Lead not found');
    });
  });

  describe('predictConversionProbability', () => {
    test('should predict conversion probability', async () => {
      const prediction = await analyticsService.predictConversionProbability('lead_001');
      
      expect(prediction).toHaveProperty('leadId', 'lead_001');
      expect(prediction).toHaveProperty('conversionProbability');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('timeToConversion');
      expect(prediction).toHaveProperty('recommendations');
      
      expect(typeof prediction.conversionProbability).toBe('number');
      expect(prediction.conversionProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.conversionProbability).toBeLessThanOrEqual(100);
    });
  });

  describe('Real-time metrics', () => {
    test('should return real-time metrics when available', () => {
      const metrics = analyticsService.getRealTimeMetrics();
      
      if (metrics) {
        expect(metrics).toHaveProperty('leadsToday');
        expect(metrics).toHaveProperty('callsToday');
        expect(metrics).toHaveProperty('timestamp');
      }
    });

    test('should handle subscription management', () => {
      const callback = jest.fn();
      
      analyticsService.subscribe('test-connection', callback);
      analyticsService.notifySubscribers('test-event', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith('test-event', { data: 'test' });
      
      analyticsService.unsubscribe('test-connection');
    });
  });

  describe('Scoring calculations', () => {
    test('should calculate industry score correctly', () => {
      const techScore = analyticsService.calculateIndustryScore('Technology');
      const unknownScore = analyticsService.calculateIndustryScore('Unknown Industry');
      
      expect(techScore).toBe(0.85);
      expect(unknownScore).toBe(0.60);
    });

    test('should calculate company size score correctly', () => {
      const mediumScore = analyticsService.calculateCompanySizeScore('50-200');
      const unknownScore = analyticsService.calculateCompanySizeScore('Unknown');
      
      expect(mediumScore).toBe(0.85);
      expect(unknownScore).toBe(0.65);
    });

    test('should calculate engagement score correctly', () => {
      const mockCalls = [
        { quality_score: 4.5, outcome: 'Interested' },
        { quality_score: 4.0, outcome: 'Qualified' }
      ];
      
      const score = analyticsService.calculateEngagementScore(mockCalls);
      
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});

describe('Analytics Performance', () => {
  test('dashboard endpoint should respond within reasonable time', async () => {
    const startTime = Date.now();
    
    await request(app)
      .get('/api/analytics/dashboard')
      .expect(200);
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('lead scoring should handle multiple requests efficiently', async () => {
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(analyticsService.generateLeadScoring('lead_001'));
    }
    
    await Promise.all(promises);
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(3000); // Should handle 5 requests within 3 seconds
  });
});

describe('Error Handling', () => {
  test('should handle invalid date ranges gracefully', async () => {
    const response = await request(app)
      .get('/api/analytics/leads')
      .query({
        start_date: '2024-01-31',
        end_date: '2024-01-01' // End before start
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('start_date must be before end_date');
  });

  test('should handle missing data gracefully', async () => {
    // Mock empty data
    jest.doMock('../utils/dataManager', () => ({
      loadData: jest.fn(() => Promise.resolve([]))
    }));

    const response = await request(app)
      .get('/api/analytics/leads')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.summary.totalLeads).toBe(0);
  });

  test('should handle server errors appropriately', async () => {
    // Mock error in data loading
    jest.doMock('../utils/dataManager', () => ({
      loadData: jest.fn(() => Promise.reject(new Error('Database error')))
    }));

    const response = await request(app)
      .get('/api/analytics/leads')
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Failed to retrieve lead analytics');
  });
});

// Cleanup
afterAll(() => {
  jest.clearAllMocks();
});