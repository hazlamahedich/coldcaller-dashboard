/**
 * Analytics Routes
 * Defines all analytics API endpoints
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { validateAnalyticsParams, validateReportRequest, validateExportParams } = require('../middleware/analyticsValidation');

// Analytics endpoints

/**
 * GET /api/analytics/leads
 * @desc Get lead performance metrics and trends
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} lead_source - Filter by lead source
 * @query {string} status - Filter by lead status
 * @query {string} priority - Filter by priority
 * @query {string} industry - Filter by industry
 * @query {string} assigned_to - Filter by assigned agent
 */
router.get('/leads', validateAnalyticsParams, analyticsController.getLeadAnalytics);

/**
 * GET /api/analytics/conversion
 * @desc Get conversion funnel analysis
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} lead_source - Filter by lead source
 * @query {string} agent_id - Filter by agent ID
 */
router.get('/conversion', validateAnalyticsParams, analyticsController.getConversionAnalytics);

/**
 * GET /api/analytics/sources
 * @desc Get lead source attribution and ROI analysis
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 */
router.get('/sources', validateAnalyticsParams, analyticsController.getSourceAnalytics);

/**
 * GET /api/analytics/agents
 * @desc Get agent performance and productivity metrics
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} agent_id - Filter by specific agent ID
 * @query {boolean} include_rankings - Include agent rankings (default: true)
 */
router.get('/agents', validateAnalyticsParams, analyticsController.getAgentAnalytics);

/**
 * GET /api/analytics/forecasting
 * @desc Get pipeline forecasting and predictions
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {number} forecast_period - Forecast period in days (default: 30)
 */
router.get('/forecasting', validateAnalyticsParams, analyticsController.getForecastingAnalytics);

/**
 * GET /api/analytics/dashboard
 * @desc Get comprehensive dashboard data
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 */
router.get('/dashboard', validateAnalyticsParams, analyticsController.getDashboardData);

/**
 * GET /api/analytics/real-time
 * @desc Get real-time metrics for today
 */
router.get('/real-time', analyticsController.getRealTimeMetrics);

/**
 * GET /api/analytics/kpis
 * @desc Get key performance indicators
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} compare_period - Period to compare against (optional)
 */
router.get('/kpis', validateAnalyticsParams, analyticsController.getKPIs);

/**
 * GET /api/analytics/exports/:type
 * @desc Export analytics data in various formats
 * @param {string} type - Export type (leads|agents|sources|dashboard)
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} format - Export format (json|csv) - default: json
 */
router.get('/exports/:type', validateAnalyticsParams, validateExportParams, analyticsController.exportAnalytics);

/**
 * POST /api/analytics/reports/generate
 * @desc Generate custom reports
 * @body {string} reportType - Type of report to generate
 * @body {object} dateRange - Date range for the report
 * @body {object} filters - Filters to apply
 * @body {boolean} includeCharts - Include chart data
 * @body {string} format - Report format (json|pdf|excel)
 * @body {array} sections - Sections to include in report
 */
router.post('/reports/generate', validateReportRequest, analyticsController.generateCustomReport);

module.exports = router;