const TwilioService = require('./twilioService');

/**
 * TwilioAnalyticsService - Cost monitoring and usage analytics for Twilio
 * Features: Real-time cost tracking, billing analysis, usage forecasting, alert system
 */
class TwilioAnalyticsService {
  constructor() {
    this.costThresholds = {
      daily: 50,      // $50/day
      weekly: 300,    // $300/week
      monthly: 1000   // $1000/month
    };
    
    this.rateMapping = {
      'voice-inbound': 0.0085,      // $0.0085/minute
      'voice-outbound': 0.013,      // $0.013/minute
      'voice-recording': 0.0025,    // $0.0025/minute
      'phonenumber-local': 1.15,    // $1.15/month
      'sms-inbound': 0.0075,        // $0.0075/message
      'sms-outbound': 0.0075        // $0.0075/message
    };

    // Add simple in-memory cache with 5-minute expiry
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive cost analytics for date range
   */
  async getCostAnalytics(startDate, endDate, granularity = 'daily') {
    try {
      // Check cache first
      const cacheKey = `analytics_${startDate.getTime()}_${endDate.getTime()}_${granularity}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('💰 [TwilioAnalytics] Returning cached data');
        return cached.data;
      }

      // Get usage data from Twilio
      const usageResult = await TwilioService.getUsage(startDate, endDate);
      
      if (!usageResult.success) {
        throw new Error(`Failed to fetch usage: ${usageResult.error}`);
      }

      const usage = usageResult.usage;
      
      // Process and categorize usage data
      const costBreakdown = this.processCostData(usage);
      const trends = this.calculateTrends(usage, granularity);
      const forecasts = this.generateForecasts(usage);
      const alerts = this.checkCostAlerts(costBreakdown, trends);
      const optimization = this.getOptimizationSuggestions(usage);

      const result = {
        success: true,
        data: {
          summary: {
            totalCost: costBreakdown.total,
            voiceCost: costBreakdown.voice,
            smsCost: costBreakdown.sms,
            phoneNumberCost: costBreakdown.phoneNumbers,
            recordingCost: costBreakdown.recording,
            period: {
              start: startDate,
              end: endDate,
              days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
            }
          },
          breakdown: costBreakdown,
          trends: trends,
          forecasts: forecasts,
          alerts: alerts,
          optimization: optimization,
          usage: usage
        }
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to get cost analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process raw usage data into cost categories
   */
  processCostData(usage) {
    const breakdown = {
      voice: 0,
      sms: 0,
      phoneNumbers: 0,
      recording: 0,
      other: 0,
      total: 0,
      categories: [],
      timeline: []
    };

    // Group usage by category and calculate costs
    const categoryMap = new Map();

    usage.forEach(record => {
      const cost = parseFloat(record.price) || 0;
      const category = this.categorizeUsage(record.category);
      
      breakdown[category] += cost;
      breakdown.total += cost;

      // Track by category for detailed breakdown
      const categoryKey = record.category;
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          category: categoryKey,
          description: record.description,
          cost: 0,
          usage: 0,
          count: 0
        });
      }

      const categoryData = categoryMap.get(categoryKey);
      categoryData.cost += cost;
      categoryData.usage += parseFloat(record.usage) || 0;
      categoryData.count += parseInt(record.count) || 0;

      // Add to timeline
      breakdown.timeline.push({
        date: record.startDate,
        category: category,
        cost: cost,
        usage: record.usage,
        description: record.description
      });
    });

    // Convert category map to array
    breakdown.categories = Array.from(categoryMap.values())
      .sort((a, b) => b.cost - a.cost);

    // Sort timeline by date
    breakdown.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    return breakdown;
  }

  /**
   * Categorize Twilio usage into cost buckets
   */
  categorizeUsage(category) {
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('voice') || lowerCategory.includes('call')) {
      return 'voice';
    } else if (lowerCategory.includes('sms') || lowerCategory.includes('message')) {
      return 'sms';
    } else if (lowerCategory.includes('phonenumber') || lowerCategory.includes('number')) {
      return 'phoneNumbers';
    } else if (lowerCategory.includes('recording')) {
      return 'recording';
    } else {
      return 'other';
    }
  }

  /**
   * Calculate cost trends and patterns
   */
  calculateTrends(usage, granularity) {
    const trends = {
      daily: [],
      weekly: [],
      monthly: [],
      growth: {
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      patterns: {
        peakDays: [],
        lowUsagePeriods: [],
        averageDailyCost: 0
      }
    };

    // Group usage by time periods
    const timelineMap = new Map();
    
    usage.forEach(record => {
      const date = new Date(record.startDate);
      const cost = parseFloat(record.price) || 0;
      
      // Daily grouping
      const dayKey = date.toISOString().split('T')[0];
      if (!timelineMap.has(dayKey)) {
        timelineMap.set(dayKey, { date: dayKey, cost: 0, usage: 0 });
      }
      timelineMap.get(dayKey).cost += cost;
      timelineMap.get(dayKey).usage += parseFloat(record.usage) || 0;
    });

    // Convert to arrays and sort
    trends.daily = Array.from(timelineMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate averages and growth
    const totalDays = trends.daily.length;
    const totalCost = trends.daily.reduce((sum, day) => sum + day.cost, 0);
    trends.patterns.averageDailyCost = totalCost / Math.max(totalDays, 1);

    // Calculate growth rates
    if (trends.daily.length >= 2) {
      const recent = trends.daily.slice(-7); // Last 7 days
      const previous = trends.daily.slice(-14, -7); // Previous 7 days
      
      const recentAvg = recent.reduce((sum, day) => sum + day.cost, 0) / recent.length;
      const previousAvg = previous.length > 0 ? 
        previous.reduce((sum, day) => sum + day.cost, 0) / previous.length : recentAvg;

      trends.growth.daily = previousAvg > 0 ? 
        ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    }

    // Find peak usage days
    trends.patterns.peakDays = trends.daily
      .filter(day => day.cost > trends.patterns.averageDailyCost * 1.5)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // Find low usage periods
    trends.patterns.lowUsagePeriods = trends.daily
      .filter(day => day.cost < trends.patterns.averageDailyCost * 0.3)
      .slice(0, 5);

    return trends;
  }

  /**
   * Generate cost forecasts based on historical data
   */
  generateForecasts(usage) {
    const forecasts = {
      nextWeek: { cost: 0, confidence: 0 },
      nextMonth: { cost: 0, confidence: 0 },
      nextQuarter: { cost: 0, confidence: 0 },
      projections: {
        conservative: 0,
        realistic: 0,
        aggressive: 0
      }
    };

    if (usage.length === 0) {
      return forecasts;
    }

    // Calculate daily average from recent data
    const recentUsage = usage.slice(-30); // Last 30 records
    const totalCost = recentUsage.reduce((sum, record) => sum + (parseFloat(record.price) || 0), 0);
    const dailyAverage = totalCost / Math.max(recentUsage.length, 1);

    // Simple linear projections
    forecasts.nextWeek.cost = dailyAverage * 7;
    forecasts.nextWeek.confidence = Math.min(recentUsage.length / 7 * 100, 95);

    forecasts.nextMonth.cost = dailyAverage * 30;
    forecasts.nextMonth.confidence = Math.min(recentUsage.length / 14 * 100, 85);

    forecasts.nextQuarter.cost = dailyAverage * 90;
    forecasts.nextQuarter.confidence = Math.min(recentUsage.length / 30 * 100, 75);

    // Different projection scenarios
    forecasts.projections.conservative = dailyAverage * 30 * 0.8; // 20% below average
    forecasts.projections.realistic = dailyAverage * 30; // Current average
    forecasts.projections.aggressive = dailyAverage * 30 * 1.3; // 30% above average

    return forecasts;
  }

  /**
   * Check for cost alerts based on thresholds
   */
  checkCostAlerts(breakdown, trends) {
    const alerts = {
      active: [],
      warnings: [],
      info: []
    };

    // Daily threshold check
    const todayCost = trends.daily.length > 0 ? trends.daily[trends.daily.length - 1].cost : 0;
    if (todayCost > this.costThresholds.daily) {
      alerts.active.push({
        type: 'cost_exceeded',
        severity: 'critical',
        title: 'Daily cost threshold exceeded',
        message: `Today's cost ($${todayCost.toFixed(2)}) exceeds daily threshold ($${this.costThresholds.daily})`,
        threshold: this.costThresholds.daily,
        actual: todayCost,
        timestamp: new Date().toISOString()
      });
    } else if (todayCost > this.costThresholds.daily * 0.8) {
      alerts.warnings.push({
        type: 'cost_warning',
        severity: 'warning',
        title: 'Approaching daily cost threshold',
        message: `Today's cost ($${todayCost.toFixed(2)}) is 80% of daily threshold`,
        threshold: this.costThresholds.daily,
        actual: todayCost,
        timestamp: new Date().toISOString()
      });
    }

    // Growth rate alerts
    if (trends.growth.daily > 50) {
      alerts.warnings.push({
        type: 'growth_spike',
        severity: 'warning',
        title: 'Unusual cost growth detected',
        message: `Daily costs increased by ${trends.growth.daily.toFixed(1)}% over the past week`,
        growth: trends.growth.daily,
        timestamp: new Date().toISOString()
      });
    }

    // High usage category alerts
    const highCategories = breakdown.categories.filter(cat => cat.cost > 100);
    highCategories.forEach(category => {
      alerts.info.push({
        type: 'high_usage_category',
        severity: 'info',
        title: `High usage in ${category.category}`,
        message: `${category.description}: $${category.cost.toFixed(2)}`,
        category: category.category,
        cost: category.cost,
        timestamp: new Date().toISOString()
      });
    });

    return alerts;
  }

  /**
   * Generate cost optimization suggestions
   */
  getOptimizationSuggestions(usage) {
    const suggestions = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      estimatedSavings: 0
    };

    // Analyze usage patterns for optimization opportunities
    const categoryUsage = new Map();
    let totalCost = 0;

    usage.forEach(record => {
      const category = record.category;
      const cost = parseFloat(record.price) || 0;
      totalCost += cost;

      if (!categoryUsage.has(category)) {
        categoryUsage.set(category, { cost: 0, count: 0, usage: 0 });
      }
      
      const data = categoryUsage.get(category);
      data.cost += cost;
      data.count += parseInt(record.count) || 0;
      data.usage += parseFloat(record.usage) || 0;
    });

    // Check for high voice usage
    const voiceCategories = Array.from(categoryUsage.entries())
      .filter(([category]) => category.toLowerCase().includes('voice'));
    
    const voiceCost = voiceCategories.reduce((sum, [, data]) => sum + data.cost, 0);
    
    if (voiceCost > totalCost * 0.6) {
      suggestions.immediate.push({
        type: 'voice_optimization',
        title: 'Optimize voice call costs',
        description: 'Voice calls represent 60%+ of your costs. Consider shorter calls or VoIP alternatives.',
        potentialSavings: voiceCost * 0.2,
        priority: 'high',
        category: 'voice'
      });
    }

    // Check recording usage
    const recordingData = categoryUsage.get('voice-recordings');
    if (recordingData && recordingData.cost > 20) {
      suggestions.shortTerm.push({
        type: 'recording_management',
        title: 'Optimize call recordings',
        description: 'Consider automatic deletion of old recordings or selective recording.',
        potentialSavings: recordingData.cost * 0.5,
        priority: 'medium',
        category: 'recording'
      });
    }

    // Check for unused phone numbers
    const phoneNumberData = categoryUsage.get('phonenumber-local');
    if (phoneNumberData && phoneNumberData.count > 5) {
      suggestions.longTerm.push({
        type: 'phone_number_optimization',
        title: 'Review phone number inventory',
        description: `You have ${phoneNumberData.count} phone numbers. Consider releasing unused numbers.`,
        potentialSavings: (phoneNumberData.count - 1) * 1.15,
        priority: 'low',
        category: 'phoneNumbers'
      });
    }

    // Calculate total estimated savings
    suggestions.estimatedSavings = [
      ...suggestions.immediate,
      ...suggestions.shortTerm,
      ...suggestions.longTerm
    ].reduce((sum, suggestion) => sum + (suggestion.potentialSavings || 0), 0);

    return suggestions;
  }

  /**
   * Get real-time cost metrics for dashboard
   */
  async getRealTimeCostMetrics() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get usage for different periods (sequential to reduce load)
      console.log('💰 [TwilioAnalytics] Fetching usage data sequentially...');
      const dailyUsage = await TwilioService.getUsage(startOfDay, today);
      const weeklyUsage = await TwilioService.getUsage(startOfWeek, today);  
      const monthlyUsage = await TwilioService.getUsage(startOfMonth, today);

      const metrics = {
        today: this.calculatePeriodCost(dailyUsage.usage || []),
        thisWeek: this.calculatePeriodCost(weeklyUsage.usage || []),
        thisMonth: this.calculatePeriodCost(monthlyUsage.usage || []),
        alerts: [],
        trends: {
          direction: 'stable',
          percentage: 0
        }
      };

      // Check alerts
      if (metrics.today > this.costThresholds.daily) {
        metrics.alerts.push({
          type: 'daily_exceeded',
          severity: 'critical',
          message: `Daily threshold exceeded: $${metrics.today.toFixed(2)}`
        });
      }

      return {
        success: true,
        data: metrics
      };

    } catch (error) {
      console.error('💰 [TwilioAnalytics] Failed to get real-time metrics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate total cost for a period
   */
  calculatePeriodCost(usage) {
    return usage.reduce((sum, record) => sum + (parseFloat(record.price) || 0), 0);
  }

  /**
   * Update cost thresholds
   */
  updateCostThresholds(thresholds) {
    this.costThresholds = { ...this.costThresholds, ...thresholds };
    console.log('💰 [TwilioAnalytics] Cost thresholds updated:', this.costThresholds);
  }

  /**
   * Export cost report
   */
  async exportCostReport(startDate, endDate, format = 'json') {
    try {
      const analytics = await this.getCostAnalytics(startDate, endDate);
      
      if (!analytics.success) {
        throw new Error('Failed to generate cost report');
      }

      const report = {
        reportGenerated: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: analytics.data.summary,
        breakdown: analytics.data.breakdown,
        trends: analytics.data.trends,
        forecasts: analytics.data.forecasts,
        optimization: analytics.data.optimization
      };

      if (format === 'csv') {
        return this.convertToCSV(report);
      }

      return {
        success: true,
        data: report,
        format: format
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert report to CSV format
   */
  convertToCSV(report) {
    const lines = [
      'Category,Cost,Usage,Count,Description',
      ...report.breakdown.categories.map(cat => 
        `"${cat.category}","${cat.cost}","${cat.usage}","${cat.count}","${cat.description}"`
      )
    ];

    return {
      success: true,
      data: lines.join('\n'),
      format: 'csv',
      filename: `twilio-cost-report-${Date.now()}.csv`
    };
  }
}

module.exports = new TwilioAnalyticsService();