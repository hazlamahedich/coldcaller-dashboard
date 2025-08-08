/**
 * Analytics Controller
 * Handles all analytics API endpoints and data processing
 */

const analyticsModel = require('../models/analyticsModel');
const { sendResponse, sendError } = require('../utils/response');

/**
 * GET /api/analytics/leads - Lead performance metrics and trends
 */
const getLeadAnalytics = async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      lead_source, 
      status, 
      priority, 
      industry,
      assigned_to 
    } = req.query;

    // Build date range
    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    // Build filters
    const filters = {};
    if (lead_source) filters.lead_source = lead_source;
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (industry) filters.industry = industry;
    if (assigned_to) filters.assigned_to = assigned_to;

    const metrics = await analyticsModel.getLeadMetrics(dateRange, filters);
    
    sendResponse(res, metrics, 'Lead analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting lead analytics:', error);
    sendError(res, 'Failed to retrieve lead analytics', 500);
  }
};

/**
 * GET /api/analytics/conversion - Conversion funnel analysis
 */
const getConversionAnalytics = async (req, res) => {
  try {
    const { start_date, end_date, lead_source, agent_id } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const filters = {};
    if (lead_source) filters.lead_source = lead_source;
    if (agent_id) filters.agent_id = agent_id;

    const funnelData = await analyticsModel.getConversionFunnel(dateRange, filters);
    
    sendResponse(res, funnelData, 'Conversion funnel analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting conversion analytics:', error);
    sendError(res, 'Failed to retrieve conversion analytics', 500);
  }
};

/**
 * GET /api/analytics/sources - Lead source attribution and ROI
 */
const getSourceAnalytics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const sourceData = await analyticsModel.getSourceAttribution(dateRange);
    
    sendResponse(res, sourceData, 'Source attribution analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting source analytics:', error);
    sendError(res, 'Failed to retrieve source analytics', 500);
  }
};

/**
 * GET /api/analytics/agents - Agent performance and productivity
 */
const getAgentAnalytics = async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      agent_id,
      include_rankings = true 
    } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const filters = {};
    if (agent_id) filters.agent_id = agent_id;

    const agentData = await analyticsModel.getAgentPerformance(dateRange, filters);
    
    // Filter specific agent if requested
    if (agent_id) {
      agentData.agents = { [agent_id]: agentData.agents[agent_id] };
    }

    sendResponse(res, agentData, 'Agent performance analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting agent analytics:', error);
    sendError(res, 'Failed to retrieve agent analytics', 500);
  }
};

/**
 * GET /api/analytics/forecasting - Pipeline forecasting and predictions
 */
const getForecastingAnalytics = async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      forecast_period = 30 
    } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const forecastData = await analyticsModel.generateForecasting(
      dateRange, 
      parseInt(forecast_period)
    );
    
    sendResponse(res, forecastData, 'Forecasting analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting forecasting analytics:', error);
    sendError(res, 'Failed to retrieve forecasting analytics', 500);
  }
};

/**
 * GET /api/analytics/dashboard - Comprehensive dashboard data
 */
const getDashboardData = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    // Get all analytics in parallel
    const [
      leadMetrics,
      conversionFunnel,
      sourceAttribution,
      agentPerformance,
      forecasting
    ] = await Promise.all([
      analyticsModel.getLeadMetrics(dateRange),
      analyticsModel.getConversionFunnel(dateRange),
      analyticsModel.getSourceAttribution(dateRange),
      analyticsModel.getAgentPerformance(dateRange),
      analyticsModel.generateForecasting(dateRange, 30)
    ]);

    const dashboardData = {
      leads: leadMetrics,
      conversion: conversionFunnel,
      sources: sourceAttribution,
      agents: agentPerformance,
      forecasting: forecasting,
      generatedAt: new Date().toISOString(),
      dateRange: dateRange || 'All time'
    };
    
    sendResponse(res, dashboardData, 'Dashboard data retrieved successfully');
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    sendError(res, 'Failed to retrieve dashboard data', 500);
  }
};

/**
 * GET /api/analytics/real-time - Real-time metrics
 */
const getRealTimeMetrics = async (req, res) => {
  try {
    // Get today's data
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const dateRange = {
      start: startOfDay.toISOString(),
      end: today.toISOString()
    };

    const [leadMetrics, agentPerformance] = await Promise.all([
      analyticsModel.getLeadMetrics(dateRange),
      analyticsModel.getAgentPerformance(dateRange)
    ]);

    const realTimeData = {
      today: {
        leads: leadMetrics.summary,
        agents: agentPerformance.teamSummary
      },
      timestamp: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    };
    
    sendResponse(res, realTimeData, 'Real-time metrics retrieved successfully');
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    sendError(res, 'Failed to retrieve real-time metrics', 500);
  }
};

/**
 * GET /api/analytics/exports/:type - Export analytics data
 */
const exportAnalytics = async (req, res) => {
  try {
    const { type } = req.params;
    const { start_date, end_date, format = 'json' } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    let data;
    let filename;

    switch (type) {
      case 'leads':
        data = await analyticsModel.getLeadMetrics(dateRange);
        filename = `lead_analytics_${Date.now()}`;
        break;
      case 'agents':
        data = await analyticsModel.getAgentPerformance(dateRange);
        filename = `agent_performance_${Date.now()}`;
        break;
      case 'sources':
        data = await analyticsModel.getSourceAttribution(dateRange);
        filename = `source_attribution_${Date.now()}`;
        break;
      case 'dashboard':
        data = await getDashboardDataForExport(dateRange);
        filename = `dashboard_export_${Date.now()}`;
        break;
      default:
        return sendError(res, 'Invalid export type', 400);
    }

    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.send(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error exporting analytics:', error);
    sendError(res, 'Failed to export analytics data', 500);
  }
};

/**
 * POST /api/analytics/reports/generate - Generate custom reports
 */
const generateCustomReport = async (req, res) => {
  try {
    const {
      reportType,
      dateRange,
      filters = {},
      includeCharts = true,
      format = 'json',
      sections = []
    } = req.body;

    // Validate required fields
    if (!reportType) {
      return sendError(res, 'Report type is required', 400);
    }

    const reportData = {
      reportId: `custom_${Date.now()}`,
      reportType,
      generatedAt: new Date().toISOString(),
      dateRange: dateRange || 'All time',
      filters,
      sections: {},
      summary: {}
    };

    // Generate requested sections
    if (sections.includes('leads') || sections.length === 0) {
      reportData.sections.leads = await analyticsModel.getLeadMetrics(dateRange, filters);
    }

    if (sections.includes('conversion') || sections.length === 0) {
      reportData.sections.conversion = await analyticsModel.getConversionFunnel(dateRange, filters);
    }

    if (sections.includes('sources') || sections.length === 0) {
      reportData.sections.sources = await analyticsModel.getSourceAttribution(dateRange);
    }

    if (sections.includes('agents') || sections.length === 0) {
      reportData.sections.agents = await analyticsModel.getAgentPerformance(dateRange, filters);
    }

    if (sections.includes('forecasting')) {
      reportData.sections.forecasting = await analyticsModel.generateForecasting(dateRange);
    }

    // Generate executive summary
    reportData.summary = generateExecutiveSummary(reportData.sections);

    sendResponse(res, reportData, 'Custom report generated successfully');
  } catch (error) {
    console.error('Error generating custom report:', error);
    sendError(res, 'Failed to generate custom report', 500);
  }
};

/**
 * GET /api/analytics/kpis - Key Performance Indicators
 */
const getKPIs = async (req, res) => {
  try {
    const { start_date, end_date, compare_period } = req.query;

    const dateRange = start_date && end_date ? {
      start: start_date,
      end: end_date
    } : null;

    const [leadMetrics, conversionFunnel, agentPerformance] = await Promise.all([
      analyticsModel.getLeadMetrics(dateRange),
      analyticsModel.getConversionFunnel(dateRange),
      analyticsModel.getAgentPerformance(dateRange)
    ]);

    const kpis = {
      lead_generation: {
        value: leadMetrics.summary.totalLeads,
        label: 'Total Leads',
        trend: '+12%', // Placeholder
        status: 'good'
      },
      conversion_rate: {
        value: `${leadMetrics.summary.conversionRate}%`,
        label: 'Conversion Rate',
        trend: '+5.2%',
        status: 'good'
      },
      avg_call_quality: {
        value: agentPerformance.teamSummary.avgQualityScore,
        label: 'Avg Call Quality',
        trend: '+0.3',
        status: 'stable'
      },
      pipeline_value: {
        value: '$125,000', // Placeholder
        label: 'Pipeline Value',
        trend: '+8%',
        status: 'good'
      },
      agent_productivity: {
        value: agentPerformance.teamSummary.totalCalls,
        label: 'Total Calls',
        trend: '+15%',
        status: 'excellent'
      },
      funnel_efficiency: {
        value: `${Math.round(conversionFunnel.dropOffAnalysis.contactRate)}%`,
        label: 'Contact Rate',
        trend: '-2%',
        status: 'needs_attention'
      }
    };

    sendResponse(res, kpis, 'KPIs retrieved successfully');
  } catch (error) {
    console.error('Error getting KPIs:', error);
    sendError(res, 'Failed to retrieve KPIs', 500);
  }
};

// Helper Functions

const getDashboardDataForExport = async (dateRange) => {
  const [
    leadMetrics,
    conversionFunnel,
    sourceAttribution,
    agentPerformance
  ] = await Promise.all([
    analyticsModel.getLeadMetrics(dateRange),
    analyticsModel.getConversionFunnel(dateRange),
    analyticsModel.getSourceAttribution(dateRange),
    analyticsModel.getAgentPerformance(dateRange)
  ]);

  return {
    leads: leadMetrics,
    conversion: conversionFunnel,
    sources: sourceAttribution,
    agents: agentPerformance,
    exportedAt: new Date().toISOString()
  };
};

const convertToCSV = (data) => {
  // Simple CSV conversion - would need enhancement for complex nested objects
  if (typeof data !== 'object') return data.toString();
  
  const keys = Object.keys(data);
  const values = Object.values(data).map(val => 
    typeof val === 'object' ? JSON.stringify(val) : val
  );
  
  return `${keys.join(',')}\n${values.join(',')}`;
};

const generateExecutiveSummary = (sections) => {
  const summary = {
    totalLeads: sections.leads?.summary.totalLeads || 0,
    conversionRate: sections.leads?.summary.conversionRate || 0,
    topPerformingSource: 'Website', // Placeholder
    recommendedActions: []
  };

  // Add dynamic recommendations
  if (summary.conversionRate < 10) {
    summary.recommendedActions.push('Focus on lead qualification improvement');
  }
  if (sections.conversion?.dropOffAnalysis.contactRate < 80) {
    summary.recommendedActions.push('Improve lead contact strategies');
  }

  return summary;
};

module.exports = {
  getLeadAnalytics,
  getConversionAnalytics,
  getSourceAnalytics,
  getAgentAnalytics,
  getForecastingAnalytics,
  getDashboardData,
  getRealTimeMetrics,
  exportAnalytics,
  generateCustomReport,
  getKPIs
};