const TwilioAnalyticsService = require('../../src/services/twilioAnalyticsService');
const TwilioService = require('../../src/services/twilioService');

// Mock TwilioService
jest.mock('../../src/services/twilioService', () => ({
  getUsage: jest.fn()
}));

describe('TwilioAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCostAnalytics', () => {
    it('should return comprehensive cost analytics successfully', async () => {
      const mockUsageData = [
        {
          category: 'voice-outbound',
          description: 'Outbound voice calls',
          price: '15.50',
          usage: '120',
          count: '25',
          startDate: '2025-08-01'
        },
        {
          category: 'voice-recording',
          description: 'Call recordings',
          price: '2.30',
          usage: '45',
          count: '25',
          startDate: '2025-08-01'
        }
      ];

      TwilioService.getUsage.mockResolvedValue({
        success: true,
        usage: mockUsageData
      });

      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-31');

      const result = await TwilioAnalyticsService.getCostAnalytics(startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.summary).toBeDefined();
      expect(result.data.breakdown).toBeDefined();
      expect(result.data.trends).toBeDefined();
      expect(result.data.forecasts).toBeDefined();
      expect(result.data.alerts).toBeDefined();
      expect(result.data.optimization).toBeDefined();

      // Verify cost calculations
      expect(result.data.summary.totalCost).toBe(17.8);
      expect(result.data.breakdown.voice).toBe(15.5);
      expect(result.data.breakdown.recording).toBe(2.3);
    });

    it('should handle TwilioService failure gracefully', async () => {
      TwilioService.getUsage.mockResolvedValue({
        success: false,
        error: 'Failed to fetch usage data'
      });

      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-31');

      const result = await TwilioAnalyticsService.getCostAnalytics(startDate, endDate);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch usage');
    });
  });

  describe('processCostData', () => {
    it('should correctly categorize usage data', () => {
      const mockUsage = [
        { category: 'voice-outbound', price: '10.50', usage: '100', count: '20', startDate: '2025-08-01' },
        { category: 'sms-outbound', price: '5.25', usage: '70', count: '10', startDate: '2025-08-01' },
        { category: 'phonenumber-local', price: '1.15', usage: '1', count: '1', startDate: '2025-08-01' }
      ];

      const result = TwilioAnalyticsService.processCostData(mockUsage);

      expect(result.voice).toBe(10.5);
      expect(result.sms).toBe(5.25);
      expect(result.phoneNumbers).toBe(1.15);
      expect(result.total).toBe(16.9);
      expect(result.categories).toHaveLength(3);
    });

    it('should handle empty usage data', () => {
      const result = TwilioAnalyticsService.processCostData([]);

      expect(result.total).toBe(0);
      expect(result.voice).toBe(0);
      expect(result.categories).toHaveLength(0);
      expect(result.timeline).toHaveLength(0);
    });
  });

  describe('categorizeUsage', () => {
    it('should correctly categorize different usage types', () => {
      expect(TwilioAnalyticsService.categorizeUsage('voice-outbound')).toBe('voice');
      expect(TwilioAnalyticsService.categorizeUsage('sms-inbound')).toBe('sms');
      expect(TwilioAnalyticsService.categorizeUsage('phonenumber-local')).toBe('phoneNumbers');
      expect(TwilioAnalyticsService.categorizeUsage('voice-recording')).toBe('recording');
      expect(TwilioAnalyticsService.categorizeUsage('unknown-category')).toBe('other');
    });
  });

  describe('calculateTrends', () => {
    it('should calculate daily trends correctly', () => {
      const mockUsage = [
        { startDate: '2025-08-01', price: '10.00' },
        { startDate: '2025-08-01', price: '5.00' },
        { startDate: '2025-08-02', price: '12.00' }
      ];

      const result = TwilioAnalyticsService.calculateTrends(mockUsage);

      expect(result.daily).toHaveLength(2);
      expect(result.daily[0].cost).toBe(15); // 10 + 5
      expect(result.daily[1].cost).toBe(12);
      expect(result.patterns.averageDailyCost).toBe(13.5);
    });
  });

  describe('generateForecasts', () => {
    it('should generate reasonable forecasts', () => {
      const mockUsage = Array.from({ length: 30 }, (_, i) => ({
        startDate: `2025-08-${String(i + 1).padStart(2, '0')}`,
        price: '10.00'
      }));

      const result = TwilioAnalyticsService.generateForecasts(mockUsage);

      expect(result.nextWeek.cost).toBe(70); // 10 * 7
      expect(result.nextMonth.cost).toBe(300); // 10 * 30
      expect(result.projections.conservative).toBe(240); // 300 * 0.8
      expect(result.projections.realistic).toBe(300);
      expect(result.projections.aggressive).toBe(390); // 300 * 1.3
    });

    it('should handle empty usage data', () => {
      const result = TwilioAnalyticsService.generateForecasts([]);

      expect(result.nextWeek.cost).toBe(0);
      expect(result.nextMonth.cost).toBe(0);
      expect(result.projections.conservative).toBe(0);
    });
  });

  describe('checkCostAlerts', () => {
    it('should generate critical alert when daily threshold exceeded', () => {
      const mockBreakdown = { total: 60 };
      const mockTrends = {
        daily: [{ cost: 60 }],
        growth: { daily: 10 }
      };

      const result = TwilioAnalyticsService.checkCostAlerts(mockBreakdown, mockTrends);

      expect(result.active).toHaveLength(1);
      expect(result.active[0].type).toBe('cost_exceeded');
      expect(result.active[0].severity).toBe('critical');
    });

    it('should generate warning when approaching threshold', () => {
      const mockBreakdown = { total: 42, categories: [] };
      const mockTrends = {
        daily: [{ cost: 42 }],
        growth: { daily: 5 }
      };

      const result = TwilioAnalyticsService.checkCostAlerts(mockBreakdown, mockTrends);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('cost_warning');
    });

    it('should generate growth spike alert', () => {
      const mockBreakdown = { total: 30, categories: [] };
      const mockTrends = {
        daily: [{ cost: 30 }],
        growth: { daily: 75 }
      };

      const result = TwilioAnalyticsService.checkCostAlerts(mockBreakdown, mockTrends);

      expect(result.warnings.some(alert => alert.type === 'growth_spike')).toBe(true);
    });
  });

  describe('getOptimizationSuggestions', () => {
    it('should suggest voice optimization for high voice costs', () => {
      const mockUsage = [
        { category: 'voice-outbound', price: '150.00', count: '100', usage: '500' },
        { category: 'sms-outbound', price: '25.00', count: '50', usage: '50' }
      ];

      const result = TwilioAnalyticsService.getOptimizationSuggestions(mockUsage);

      expect(result.immediate).toHaveLength(1);
      expect(result.immediate[0].type).toBe('voice_optimization');
      expect(result.estimatedSavings).toBeGreaterThan(0);
    });

    it('should suggest recording optimization for high recording costs', () => {
      const mockUsage = [
        { category: 'voice-recordings', price: '25.00', count: '100', usage: '500' }
      ];

      const result = TwilioAnalyticsService.getOptimizationSuggestions(mockUsage);

      expect(result.shortTerm.some(s => s.type === 'recording_management')).toBe(true);
    });

    it('should suggest phone number optimization for many numbers', () => {
      const mockUsage = [
        { category: 'phonenumber-local', price: '10.00', count: '8', usage: '8' }
      ];

      const result = TwilioAnalyticsService.getOptimizationSuggestions(mockUsage);

      expect(result.longTerm.some(s => s.type === 'phone_number_optimization')).toBe(true);
    });
  });

  describe('getRealTimeCostMetrics', () => {
    it('should return real-time metrics successfully', async () => {
      const mockUsageData = [
        { price: '5.00', startDate: new Date().toISOString() }
      ];

      TwilioService.getUsage.mockResolvedValue({
        success: true,
        usage: mockUsageData
      });

      const result = await TwilioAnalyticsService.getRealTimeCostMetrics();

      expect(result.success).toBe(true);
      expect(result.data.today).toBeDefined();
      expect(result.data.thisWeek).toBeDefined();
      expect(result.data.thisMonth).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      TwilioService.getUsage.mockRejectedValue(new Error('Service unavailable'));

      const result = await TwilioAnalyticsService.getRealTimeCostMetrics();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service unavailable');
    });
  });

  describe('updateCostThresholds', () => {
    it('should update cost thresholds correctly', () => {
      const newThresholds = { daily: 75, weekly: 400 };
      
      TwilioAnalyticsService.updateCostThresholds(newThresholds);

      expect(TwilioAnalyticsService.costThresholds.daily).toBe(75);
      expect(TwilioAnalyticsService.costThresholds.weekly).toBe(400);
      expect(TwilioAnalyticsService.costThresholds.monthly).toBe(1000); // Unchanged
    });
  });

  describe('exportCostReport', () => {
    it('should generate JSON report successfully', async () => {
      TwilioService.getUsage.mockResolvedValue({
        success: true,
        usage: [{ category: 'voice-outbound', price: '10.00' }]
      });

      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-31');

      const result = await TwilioAnalyticsService.exportCostReport(startDate, endDate, 'json');

      expect(result.success).toBe(true);
      expect(result.format).toBe('json');
      expect(result.data.reportGenerated).toBeDefined();
      expect(result.data.summary).toBeDefined();
    });

    it('should generate CSV report successfully', async () => {
      TwilioService.getUsage.mockResolvedValue({
        success: true,
        usage: [
          { 
            category: 'voice-outbound', 
            price: '10.00', 
            usage: '100', 
            count: '20',
            description: 'Outbound calls' 
          }
        ]
      });

      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-31');

      const result = await TwilioAnalyticsService.exportCostReport(startDate, endDate, 'csv');

      expect(result.success).toBe(true);
      expect(result.format).toBe('csv');
      expect(result.data).toContain('Category,Cost,Usage,Count,Description');
      expect(result.data).toContain('voice-outbound');
    });
  });

  describe('calculatePeriodCost', () => {
    it('should calculate total cost for period correctly', () => {
      const usage = [
        { price: '10.50' },
        { price: '5.25' },
        { price: '2.15' }
      ];

      const result = TwilioAnalyticsService.calculatePeriodCost(usage);
      expect(result).toBe(17.9);
    });

    it('should handle empty usage array', () => {
      const result = TwilioAnalyticsService.calculatePeriodCost([]);
      expect(result).toBe(0);
    });

    it('should handle invalid price values', () => {
      const usage = [
        { price: '10.50' },
        { price: 'invalid' },
        { price: null },
        { price: '5.25' }
      ];

      const result = TwilioAnalyticsService.calculatePeriodCost(usage);
      expect(result).toBe(15.75);
    });
  });
});