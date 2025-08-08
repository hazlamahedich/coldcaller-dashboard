/**
 * Call Analytics Routes
 * Defines all call analytics and reporting API endpoints
 */

const express = require('express');
const router = express.Router();
const callAnalyticsController = require('../controllers/callAnalyticsController');
const { 
  validateAnalyticsParams, 
  validateReportRequest, 
  validateExportParams, 
  validateAdvancedFiltering, 
  validateCoachingRequest 
} = require('../middleware/callAnalyticsValidation');

// Core Call Analytics Endpoints

/**
 * GET /api/call-analytics/performance
 * @desc Get comprehensive call performance metrics and trends
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} agent_id - Filter by agent ID
 * @query {string} lead_source - Filter by lead source
 * @query {string} outcome - Filter by call outcome
 * @query {boolean} include_trends - Include trending analysis (default: true)
 */
router.get('/performance', validateAnalyticsParams, callAnalyticsController.getCallPerformance);

/**
 * GET /api/call-analytics/agent-scorecards
 * @desc Get individual agent performance scorecards with KPIs
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} agent_id - Specific agent ID (optional)
 * @query {boolean} include_rankings - Include performance rankings (default: true)
 * @query {boolean} include_coaching - Include coaching recommendations (default: true)
 */
router.get('/agent-scorecards', validateAnalyticsParams, callAnalyticsController.getAgentScorecards);

/**
 * GET /api/call-analytics/quality-analysis
 * @desc Get call quality analysis with detailed insights
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} agent_id - Filter by agent ID
 * @query {number} quality_threshold - Minimum quality threshold (default: 3.0)
 * @query {boolean} include_coaching - Include coaching insights (default: true)
 */
router.get('/quality-analysis', validateAnalyticsParams, callAnalyticsController.getCallQualityAnalysis);

/**
 * GET /api/call-analytics/real-time-dashboard
 * @desc Get real-time call activity monitoring and performance
 */
router.get('/real-time-dashboard', callAnalyticsController.getRealTimeDashboard);

// Specific Analytics Components

/**
 * GET /api/call-analytics/volume-trends
 * @desc Get call volume analysis with trending
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} granularity - Data granularity (daily|weekly|monthly)
 */
router.get('/volume-trends', validateAnalyticsParams, callAnalyticsController.getVolumeAnalysis);

/**
 * GET /api/call-analytics/connection-rates
 * @desc Get connection and answer rate optimization analysis
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} agent_id - Filter by agent ID
 */
router.get('/connection-rates', validateAnalyticsParams, callAnalyticsController.getConnectionAnalysis);

/**
 * GET /api/call-analytics/duration-analysis
 * @desc Get call duration and talk time analysis
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} agent_id - Filter by agent ID
 */
router.get('/duration-analysis', validateAnalyticsParams, callAnalyticsController.getDurationAnalysis);

/**
 * GET /api/call-analytics/outcome-distribution
 * @desc Get call outcome analysis and conversion tracking
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} agent_id - Filter by agent ID
 * @query {string} lead_source - Filter by lead source
 */
router.get('/outcome-distribution', validateAnalyticsParams, callAnalyticsController.getOutcomeAnalysis);

/**
 * GET /api/call-analytics/timing-analysis
 * @desc Get peak calling hours and day-of-week performance
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} timezone - Timezone for analysis (default: UTC)
 */
router.get('/timing-analysis', validateAnalyticsParams, callAnalyticsController.getTimingAnalysis);

// Agent Performance & Coaching

/**
 * GET /api/call-analytics/coaching-insights
 * @desc Get agent coaching recommendations and improvement plans
 * @query {string} agent_id - Required: Agent ID for coaching insights
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {string} focus_area - Specific area to focus coaching on
 */
router.get('/coaching-insights', validateCoachingRequest, callAnalyticsController.getCoachingInsights);

// Advanced Analytics & Filtering

/**
 * GET /api/call-analytics/advanced-filtering
 * @desc Get advanced analytics with custom filtering and grouping
 * @query {string} start_date - Start date (YYYY-MM-DD)
 * @query {string} end_date - End date (YYYY-MM-DD)
 * @query {array} agents - Array of agent IDs
 * @query {array} outcomes - Array of call outcomes
 * @query {object} quality_range - Quality score range {min, max}
 * @query {object} duration_range - Duration range {min, max}
 * @query {array} lead_sources - Array of lead sources
 * @query {array} industries - Array of industries
 * @query {string} group_by - Group results by (agent|outcome|source|industry)
 */
router.get('/advanced-filtering', validateAdvancedFiltering, callAnalyticsController.getAdvancedAnalytics);

// Reporting & Export

/**
 * POST /api/call-analytics/automated-report
 * @desc Generate and schedule automated reports
 * @body {string} reportType - Type of report (daily_performance|weekly_scorecard|monthly_analysis|agent_coaching)
 * @body {object} schedule - Report schedule configuration
 * @body {array} recipients - Email recipients for the report
 * @body {object} customizations - Report customization options
 * @body {string} deliveryFormat - Delivery format (email|pdf|excel)
 */
router.post('/automated-report', validateReportRequest, callAnalyticsController.generateAutomatedReport);

/**
 * POST /api/call-analytics/export
 * @desc Export call analytics data in various formats
 * @body {string} exportType - Type of data to export (performance|scorecards|quality|dashboard)
 * @body {string} format - Export format (json|csv|excel)
 * @body {object} dateRange - Date range for export
 * @body {object} filters - Filters to apply
 * @body {boolean} includeCharts - Include chart data (default: false)
 */
router.post('/export', validateExportParams, callAnalyticsController.exportAnalytics);

// WebSocket Endpoint for Real-Time Updates (handled in WebSocket manager)
/**
 * WebSocket /ws/call-analytics
 * @desc Real-time call analytics updates
 * Events: 'call_started', 'call_ended', 'metrics_update', 'alert_triggered'
 */

module.exports = router;