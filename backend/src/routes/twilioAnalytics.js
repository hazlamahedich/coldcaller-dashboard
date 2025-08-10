const express = require('express');
const router = express.Router();
const TwilioAnalyticsService = require('../services/twilioAnalyticsService');
const { authenticate } = require('../middleware/auth');

/**
 * Get comprehensive cost analytics
 * GET /api/twilio-analytics/costs
 */
router.get('/costs', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      granularity = 'daily' 
    } = req.query;

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    console.log('💰 [TwilioAnalytics] Fetching cost analytics:', {
      startDate: start,
      endDate: end,
      granularity
    });

    const analytics = await TwilioAnalyticsService.getCostAnalytics(start, end, granularity);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch cost analytics',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      data: analytics.data
    });

  } catch (error) {
    console.error('💰 [TwilioAnalytics] Cost analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost analytics',
      error: error.message
    });
  }
});

/**
 * Get real-time cost metrics
 * GET /api/twilio-analytics/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    console.log('💰 [TwilioAnalytics] Fetching real-time metrics');
    
    const metrics = await TwilioAnalyticsService.getRealTimeCostMetrics();

    if (!metrics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch real-time metrics',
        error: metrics.error
      });
    }

    res.json({
      success: true,
      data: metrics.data
    });

  } catch (error) {
    console.error('💰 [TwilioAnalytics] Real-time metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time metrics',
      error: error.message
    });
  }
});

/**
 * Update cost thresholds
 * PUT /api/twilio-analytics/thresholds
 */
router.put('/thresholds', authenticate, async (req, res) => {
  try {
    const { daily, weekly, monthly } = req.body;

    // Validate thresholds
    const thresholds = {};
    if (daily !== undefined) thresholds.daily = parseFloat(daily);
    if (weekly !== undefined) thresholds.weekly = parseFloat(weekly);
    if (monthly !== undefined) thresholds.monthly = parseFloat(monthly);

    // Validate that values are positive numbers
    for (const [key, value] of Object.entries(thresholds)) {
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${key} threshold: must be a positive number`
        });
      }
    }

    TwilioAnalyticsService.updateCostThresholds(thresholds);

    console.log('💰 [TwilioAnalytics] Updated cost thresholds:', thresholds);

    res.json({
      success: true,
      message: 'Cost thresholds updated successfully',
      thresholds: thresholds
    });

  } catch (error) {
    console.error('💰 [TwilioAnalytics] Threshold update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update thresholds',
      error: error.message
    });
  }
});

/**
 * Get cost forecasts
 * GET /api/twilio-analytics/forecasts
 */
router.get('/forecasts', authenticate, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    console.log('💰 [TwilioAnalytics] Generating forecasts:', { days });

    const analytics = await TwilioAnalyticsService.getCostAnalytics(startDate, endDate);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate forecasts',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      data: {
        forecasts: analytics.data.forecasts,
        trends: analytics.data.trends,
        basePeriod: { startDate, endDate, days }
      }
    });

  } catch (error) {
    console.error('💰 [TwilioAnalytics] Forecasts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate forecasts',
      error: error.message
    });
  }
});

/**
 * Get optimization suggestions
 * GET /api/twilio-analytics/optimize
 */
router.get('/optimize', authenticate, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    console.log('💰 [TwilioAnalytics] Getting optimization suggestions');

    const analytics = await TwilioAnalyticsService.getCostAnalytics(startDate, endDate);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get optimization suggestions',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      data: {
        optimization: analytics.data.optimization,
        summary: analytics.data.summary,
        alerts: analytics.data.alerts
      }
    });

  } catch (error) {
    console.error('💰 [TwilioAnalytics] Optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get optimization suggestions',
      error: error.message
    });
  }
});

/**
 * Export cost report
 * GET /api/twilio-analytics/export
 */
router.get('/export', authenticate, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      format = 'json' 
    } = req.query;

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    console.log('💰 [TwilioAnalytics] Exporting cost report:', { format });

    const report = await TwilioAnalyticsService.exportCostReport(start, end, format);

    if (!report.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to export cost report',
        error: report.error
      });
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      res.send(report.data);
    } else {
      res.json({
        success: true,
        data: report.data,
        format: report.format
      });
    }

  } catch (error) {
    console.error('💰 [TwilioAnalytics] Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export cost report',
      error: error.message
    });
  }
});

/**
 * Get cost alerts
 * GET /api/twilio-analytics/alerts
 */
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const endDate = new Date();

    console.log('💰 [TwilioAnalytics] Checking cost alerts');

    const analytics = await TwilioAnalyticsService.getCostAnalytics(startDate, endDate);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check cost alerts',
        error: analytics.error
      });
    }

    res.json({
      success: true,
      data: {
        alerts: analytics.data.alerts,
        summary: analytics.data.summary,
        trends: {
          daily: analytics.data.trends.growth.daily,
          weekly: analytics.data.trends.growth.weekly
        }
      }
    });

  } catch (error) {
    console.error('💰 [TwilioAnalytics] Alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check cost alerts',
      error: error.message
    });
  }
});

/**
 * Get usage breakdown by category
 * GET /api/twilio-analytics/breakdown
 */
router.get('/breakdown', authenticate, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      category 
    } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    console.log('💰 [TwilioAnalytics] Getting usage breakdown:', { category });

    const analytics = await TwilioAnalyticsService.getCostAnalytics(start, end);

    if (!analytics.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get usage breakdown',
        error: analytics.error
      });
    }

    let responseData = {
      breakdown: analytics.data.breakdown,
      timeline: analytics.data.breakdown.timeline
    };

    // Filter by category if specified
    if (category) {
      responseData.breakdown.categories = analytics.data.breakdown.categories
        .filter(cat => cat.category.toLowerCase().includes(category.toLowerCase()));
      
      responseData.timeline = analytics.data.breakdown.timeline
        .filter(item => item.category.toLowerCase().includes(category.toLowerCase()));
    }

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('💰 [TwilioAnalytics] Breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get usage breakdown',
      error: error.message
    });
  }
});

module.exports = router;