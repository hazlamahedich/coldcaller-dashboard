/**
 * Call Analytics Controller
 * Handles all call analytics API endpoints and performance tracking
 */

const callAnalyticsModel = require('../models/callAnalyticsModel');
const { sendResponse, sendError } = require('../utils/response');

/**
 * GET /api/call-analytics/performance - Call performance metrics and trends
 */
const getCallPerformance = async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      agent_id,
      lead_source,
      outcome,
      include_trends = true 
    } = req.query;

    // Build date range
    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    // Build filters
    const filters = {};
    if (agent_id) filters.agent_id = agent_id;
    if (lead_source) filters.lead_source = lead_source;
    if (outcome) filters.outcome = outcome;

    const performanceData = await callAnalyticsModel.getCallPerformanceAnalytics(dateRange, filters);
    
    sendResponse(res, performanceData, 'Call performance analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting call performance analytics:', error);
    sendError(res, 'Failed to retrieve call performance analytics', 500);
  }
};

/**
 * GET /api/call-analytics/agent-scorecards - Individual agent performance scorecards
 */
const getAgentScorecards = async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      agent_id,
      include_rankings = true,
      include_coaching = true
    } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const scorecardData = await callAnalyticsModel.generateAgentScorecards(dateRange, agent_id);
    
    sendResponse(res, scorecardData, 'Agent scorecards retrieved successfully');
  } catch (error) {
    console.error('Error getting agent scorecards:', error);
    sendError(res, 'Failed to retrieve agent scorecards', 500);
  }
};

/**
 * GET /api/call-analytics/quality-analysis - Call quality analysis and insights
 */
const getCallQualityAnalysis = async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      agent_id,
      quality_threshold = 3.0,
      include_coaching = true
    } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const filters = {};
    if (agent_id) filters.agent_id = agent_id;
    if (quality_threshold) filters.quality_threshold = parseFloat(quality_threshold);

    const qualityData = await callAnalyticsModel.analyzeCallQuality(dateRange, filters);
    
    sendResponse(res, qualityData, 'Call quality analysis retrieved successfully');
  } catch (error) {
    console.error('Error getting call quality analysis:', error);
    sendError(res, 'Failed to retrieve call quality analysis', 500);
  }
};

/**
 * GET /api/call-analytics/real-time-dashboard - Real-time call activity and performance
 */
const getRealTimeDashboard = async (req, res) => {
  try {
    const dashboardData = await callAnalyticsModel.generateRealTimeDashboard();
    
    sendResponse(res, dashboardData, 'Real-time dashboard data retrieved successfully');
  } catch (error) {
    console.error('Error getting real-time dashboard:', error);
    sendError(res, 'Failed to retrieve real-time dashboard data', 500);
  }
};

/**
 * POST /api/call-analytics/automated-report - Generate automated reports
 */
const generateAutomatedReport = async (req, res) => {
  try {
    const {
      reportType,
      schedule,
      recipients = [],
      customizations = {},
      deliveryFormat = 'email'
    } = req.body;

    // Validate required fields
    if (!reportType || !schedule) {
      return sendError(res, 'Report type and schedule are required', 400);
    }

    const reportData = await callAnalyticsModel.generateAutomatedReport(
      reportType,
      schedule,
      recipients,
      customizations
    );

    sendResponse(res, reportData, 'Automated report generated successfully');
  } catch (error) {
    console.error('Error generating automated report:', error);
    sendError(res, 'Failed to generate automated report', 500);
  }
};

/**
 * GET /api/call-analytics/volume-trends - Call volume analysis with trending
 */
const getVolumeAnalysis = async (req, res) => {
  try {
    const { start_date, end_date, granularity = 'daily' } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const performanceData = await callAnalyticsModel.getCallPerformanceAnalytics(dateRange, {});
    const volumeData = performanceData.volumeAnalysis;

    sendResponse(res, volumeData, 'Call volume analysis retrieved successfully');
  } catch (error) {
    console.error('Error getting volume analysis:', error);
    sendError(res, 'Failed to retrieve volume analysis', 500);
  }
};

/**
 * GET /api/call-analytics/connection-rates - Connection and answer rate optimization
 */
const getConnectionAnalysis = async (req, res) => {
  try {
    const { start_date, end_date, agent_id } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const filters = {};
    if (agent_id) filters.agent_id = agent_id;

    const performanceData = await callAnalyticsModel.getCallPerformanceAnalytics(dateRange, filters);
    const connectionData = performanceData.connectionAnalysis;

    sendResponse(res, connectionData, 'Connection analysis retrieved successfully');
  } catch (error) {
    console.error('Error getting connection analysis:', error);
    sendError(res, 'Failed to retrieve connection analysis', 500);
  }
};

/**
 * GET /api/call-analytics/duration-analysis - Call duration and talk time analysis
 */
const getDurationAnalysis = async (req, res) => {
  try {
    const { start_date, end_date, agent_id } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const filters = {};
    if (agent_id) filters.agent_id = agent_id;

    const performanceData = await callAnalyticsModel.getCallPerformanceAnalytics(dateRange, filters);
    const durationData = performanceData.durationAnalysis;

    sendResponse(res, durationData, 'Duration analysis retrieved successfully');
  } catch (error) {
    console.error('Error getting duration analysis:', error);
    sendError(res, 'Failed to retrieve duration analysis', 500);
  }
};

/**
 * GET /api/call-analytics/outcome-distribution - Call outcome analysis and conversion tracking
 */
const getOutcomeAnalysis = async (req, res) => {
  try {
    const { start_date, end_date, agent_id, lead_source } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const filters = {};
    if (agent_id) filters.agent_id = agent_id;
    if (lead_source) filters.lead_source = lead_source;

    const performanceData = await callAnalyticsModel.getCallPerformanceAnalytics(dateRange, filters);
    const outcomeData = performanceData.outcomeAnalysis;

    sendResponse(res, outcomeData, 'Outcome analysis retrieved successfully');
  } catch (error) {
    console.error('Error getting outcome analysis:', error);
    sendError(res, 'Failed to retrieve outcome analysis', 500);
  }
};

/**
 * GET /api/call-analytics/timing-analysis - Peak calling hours and day-of-week performance
 */
const getTimingAnalysis = async (req, res) => {
  try {
    const { start_date, end_date, timezone = 'UTC' } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const performanceData = await callAnalyticsModel.getCallPerformanceAnalytics(dateRange, {});
    const timingData = performanceData.timingAnalysis;

    sendResponse(res, timingData, 'Timing analysis retrieved successfully');
  } catch (error) {
    console.error('Error getting timing analysis:', error);
    sendError(res, 'Failed to retrieve timing analysis', 500);
  }
};

/**
 * GET /api/call-analytics/coaching-insights - Agent coaching recommendations
 */
const getCoachingInsights = async (req, res) => {
  try {
    const { agent_id, start_date, end_date, focus_area } = req.query;

    if (!agent_id) {
      return sendError(res, 'Agent ID is required for coaching insights', 400);
    }

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const scorecardData = await callAnalyticsModel.generateAgentScorecards(dateRange, agent_id);
    const qualityData = await callAnalyticsModel.analyzeCallQuality(dateRange, { agent_id });

    const coachingInsights = {
      agentId: agent_id,
      scorecard: scorecardData.scorecards[agent_id],
      qualityAnalysis: qualityData,
      focusArea: focus_area,
      priorityRecommendations: scorecardData.scorecards[agent_id]?.coachingRecommendations || [],
      improvementPlan: generateImprovementPlan(scorecardData.scorecards[agent_id], qualityData),
      benchmarkComparison: compareToBenchmarks(scorecardData.scorecards[agent_id], scorecardData.benchmarks),
      generatedAt: new Date().toISOString()
    };

    sendResponse(res, coachingInsights, 'Coaching insights retrieved successfully');
  } catch (error) {
    console.error('Error getting coaching insights:', error);
    sendError(res, 'Failed to retrieve coaching insights', 500);
  }
};

/**
 * GET /api/call-analytics/advanced-filtering - Advanced analytics with custom filtering
 */
const getAdvancedAnalytics = async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      agents = [],
      outcomes = [],
      quality_range = {},
      duration_range = {},
      lead_sources = [],
      industries = [],
      group_by = 'agent'
    } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    // Build advanced filters
    const filters = {};
    if (agents.length > 0) filters.agents = Array.isArray(agents) ? agents : [agents];
    if (outcomes.length > 0) filters.outcomes = Array.isArray(outcomes) ? outcomes : [outcomes];
    if (quality_range.min || quality_range.max) filters.quality_range = quality_range;
    if (duration_range.min || duration_range.max) filters.duration_range = duration_range;
    if (lead_sources.length > 0) filters.lead_sources = Array.isArray(lead_sources) ? lead_sources : [lead_sources];

    const performanceData = await callAnalyticsModel.getCallPerformanceAnalytics(dateRange, filters);

    // Group data based on request
    const groupedData = groupAnalyticsData(performanceData, group_by);

    sendResponse(res, groupedData, 'Advanced analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting advanced analytics:', error);
    sendError(res, 'Failed to retrieve advanced analytics', 500);
  }
};

/**
 * POST /api/call-analytics/export - Export call analytics data
 */
const exportAnalytics = async (req, res) => {
  try {
    const {
      exportType = 'performance',
      format = 'json',
      dateRange,
      filters = {},
      includeCharts = false
    } = req.body;

    let data;
    let filename;

    switch (exportType) {
      case 'performance':
        data = await callAnalyticsModel.getCallPerformanceAnalytics(dateRange, filters);
        filename = `call_performance_${Date.now()}`;
        break;
      case 'scorecards':
        data = await callAnalyticsModel.generateAgentScorecards(dateRange);
        filename = `agent_scorecards_${Date.now()}`;
        break;
      case 'quality':
        data = await callAnalyticsModel.analyzeCallQuality(dateRange, filters);
        filename = `call_quality_${Date.now()}`;
        break;
      case 'dashboard':
        data = await callAnalyticsModel.generateRealTimeDashboard();
        filename = `dashboard_export_${Date.now()}`;
        break;
      default:
        return sendError(res, 'Invalid export type', 400);
    }

    // Add export metadata
    const exportData = {
      exportType,
      data,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.id || 'system',
      filters,
      dateRange
    };

    if (format === 'csv') {
      const csv = convertToCSV(exportData.data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
    
  } catch (error) {
    console.error('Error exporting analytics:', error);
    sendError(res, 'Failed to export analytics data', 500);
  }
};

// Helper Functions

const generateImprovementPlan = (scorecard, qualityData) => {
  const plan = {
    goals: [],
    actions: [],
    timeline: '30 days',
    successMetrics: []
  };

  if (scorecard?.improvementAreas.includes('Connection Rate')) {
    plan.goals.push('Improve connection rate to 75%+');
    plan.actions.push('Optimize calling times based on lead timezone');
    plan.actions.push('Review and update lead list quality');
    plan.successMetrics.push('Connection rate improvement of 10%+');
  }

  if (scorecard?.improvementAreas.includes('Conversion Rate')) {
    plan.goals.push('Increase conversion rate to 20%+');
    plan.actions.push('Practice objection handling techniques');
    plan.actions.push('Improve qualification questions');
    plan.successMetrics.push('Conversion rate improvement of 5%+');
  }

  return plan;
};

const compareToBenchmarks = (scorecard, benchmarks) => {
  if (!scorecard || !benchmarks) return {};

  return {
    connectionRate: {
      agent: parseFloat(scorecard.connectionRate),
      benchmark: benchmarks.avgConnectionRate || 70,
      status: parseFloat(scorecard.connectionRate) >= (benchmarks.avgConnectionRate || 70) ? 'above' : 'below'
    },
    conversionRate: {
      agent: parseFloat(scorecard.conversionRate),
      benchmark: benchmarks.avgConversionRate || 15,
      status: parseFloat(scorecard.conversionRate) >= (benchmarks.avgConversionRate || 15) ? 'above' : 'below'
    },
    qualityScore: {
      agent: parseFloat(scorecard.avgQualityScore),
      benchmark: benchmarks.avgQualityScore || 3.5,
      status: parseFloat(scorecard.avgQualityScore) >= (benchmarks.avgQualityScore || 3.5) ? 'above' : 'below'
    }
  };
};

const groupAnalyticsData = (data, groupBy) => {
  // Implementation would depend on the grouping logic needed
  return {
    groupedBy: groupBy,
    data: data,
    summary: {
      totalGroups: 1,
      message: 'Advanced grouping functionality can be implemented based on specific requirements'
    }
  };
};

const convertToCSV = (data) => {
  // Simple CSV conversion - would need enhancement for complex nested objects
  if (typeof data !== 'object') return data.toString();
  
  try {
    const flattenedData = JSON.stringify(data, null, 2);
    return flattenedData;
  } catch (error) {
    return 'Error converting to CSV format';
  }
};

module.exports = {
  getCallPerformance,
  getAgentScorecards,
  getCallQualityAnalysis,
  getRealTimeDashboard,
  generateAutomatedReport,
  getVolumeAnalysis,
  getConnectionAnalysis,
  getDurationAnalysis,
  getOutcomeAnalysis,
  getTimingAnalysis,
  getCoachingInsights,
  getAdvancedAnalytics,
  exportAnalytics
};