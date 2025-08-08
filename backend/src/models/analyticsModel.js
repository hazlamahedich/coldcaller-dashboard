/**
 * Analytics Data Model
 * Handles data aggregation, calculations, and analytics operations
 */

const fs = require('fs').promises;
const path = require('path');
const dataManager = require('../utils/dataManager');

class AnalyticsModel {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load data with caching
   */
  async loadData(filename) {
    const cacheKey = `data_${filename}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const data = await dataManager.loadData(filename);
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      return data;
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
      return [];
    }
  }

  /**
   * Calculate lead metrics and KPIs
   */
  async getLeadMetrics(dateRange = null, filters = {}) {
    const leads = await this.loadData('leads.json');
    const callLogs = await this.loadData('callLogs.json');
    
    let filteredLeads = this.applyFilters(leads, filters, dateRange);
    let filteredCalls = this.applyFilters(callLogs, filters, dateRange, 'date');

    // Basic metrics
    const totalLeads = filteredLeads.length;
    const newLeads = filteredLeads.filter(lead => lead.status === 'New').length;
    const qualifiedLeads = filteredLeads.filter(lead => lead.status === 'Qualified').length;
    const convertedLeads = filteredLeads.filter(lead => lead.status === 'Converted').length;

    // Conversion rates
    const qualificationRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Lead source distribution
    const leadSources = this.getDistribution(filteredLeads, 'lead_source');

    // Priority distribution
    const priorityDistribution = this.getDistribution(filteredLeads, 'priority');

    // Industry analysis
    const industryDistribution = this.getDistribution(filteredLeads, 'industry');

    // Geographic analysis
    const geoDistribution = this.getGeographicDistribution(filteredLeads);

    // Average conversion probability
    const avgConversionProb = this.calculateAverage(filteredLeads, 'conversion_probability');

    // Call attempt analysis
    const avgCallAttempts = this.calculateAverage(filteredLeads, 'call_attempts');

    return {
      summary: {
        totalLeads,
        newLeads,
        qualifiedLeads,
        convertedLeads,
        qualificationRate: Math.round(qualificationRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgConversionProb: Math.round(avgConversionProb * 100) / 100,
        avgCallAttempts: Math.round(avgCallAttempts * 100) / 100
      },
      distributions: {
        leadSources,
        priorities: priorityDistribution,
        industries: industryDistribution,
        geography: geoDistribution
      },
      trends: await this.getLeadTrends(filteredLeads, dateRange)
    };
  }

  /**
   * Calculate conversion funnel metrics
   */
  async getConversionFunnel(dateRange = null, filters = {}) {
    const leads = await this.loadData('leads.json');
    const callLogs = await this.loadData('callLogs.json');
    
    let filteredLeads = this.applyFilters(leads, filters, dateRange);
    let filteredCalls = this.applyFilters(callLogs, filters, dateRange, 'date');

    // Map call outcomes to funnel stages
    const callsByOutcome = this.getDistribution(filteredCalls, 'outcome');
    
    const funnelData = {
      totalLeads: filteredLeads.length,
      contacted: filteredCalls.length,
      answered: filteredCalls.filter(call => 
        ['Interested', 'Qualified', 'Callback Requested', 'Information Requested'].includes(call.outcome)
      ).length,
      interested: filteredCalls.filter(call => 
        ['Interested', 'Qualified', 'Information Requested'].includes(call.outcome)
      ).length,
      qualified: filteredCalls.filter(call => call.outcome === 'Qualified').length,
      converted: filteredLeads.filter(lead => lead.status === 'Converted').length
    };

    // Calculate drop-off rates
    const dropOffAnalysis = {
      contactRate: funnelData.totalLeads > 0 ? (funnelData.contacted / funnelData.totalLeads) * 100 : 0,
      answerRate: funnelData.contacted > 0 ? (funnelData.answered / funnelData.contacted) * 100 : 0,
      interestRate: funnelData.answered > 0 ? (funnelData.interested / funnelData.answered) * 100 : 0,
      qualificationRate: funnelData.interested > 0 ? (funnelData.qualified / funnelData.interested) * 100 : 0,
      conversionRate: funnelData.qualified > 0 ? (funnelData.converted / funnelData.qualified) * 100 : 0
    };

    return {
      funnel: funnelData,
      dropOffAnalysis,
      callOutcomes: callsByOutcome,
      recommendations: this.generateFunnelRecommendations(dropOffAnalysis)
    };
  }

  /**
   * Get lead source attribution and ROI analysis
   */
  async getSourceAttribution(dateRange = null) {
    const leads = await this.loadData('leads.json');
    const callLogs = await this.loadData('callLogs.json');
    
    let filteredLeads = this.applyFilters(leads, {}, dateRange);
    
    const sourceMetrics = {};
    
    // Group by lead source
    const sourceGroups = this.groupBy(filteredLeads, 'lead_source');
    
    for (const [source, sourceLeads] of Object.entries(sourceGroups)) {
      const totalLeads = sourceLeads.length;
      const qualified = sourceLeads.filter(lead => lead.status === 'Qualified').length;
      const converted = sourceLeads.filter(lead => lead.status === 'Converted').length;
      
      // Get calls for these leads
      const leadIds = sourceLeads.map(lead => lead.id);
      const sourceCalls = callLogs.filter(call => leadIds.includes(call.lead_id));
      
      const avgQualityScore = this.calculateAverage(sourceCalls, 'quality_score');
      const avgConversionProb = this.calculateAverage(sourceLeads, 'conversion_probability');
      const totalCallTime = this.calculateTotalDuration(sourceCalls);
      
      sourceMetrics[source] = {
        totalLeads,
        qualified,
        converted,
        qualificationRate: totalLeads > 0 ? (qualified / totalLeads) * 100 : 0,
        conversionRate: totalLeads > 0 ? (converted / totalLeads) * 100 : 0,
        avgQualityScore: Math.round(avgQualityScore * 100) / 100,
        avgConversionProb: Math.round(avgConversionProb * 100) / 100,
        totalCallTime: totalCallTime,
        costPerLead: this.estimateCostPerLead(source),
        roi: this.calculateROI(source, converted, totalLeads)
      };
    }

    // Sort by performance
    const sortedSources = Object.entries(sourceMetrics)
      .sort(([,a], [,b]) => b.roi - a.roi);

    return {
      sources: sourceMetrics,
      ranking: sortedSources,
      recommendations: this.generateSourceRecommendations(sortedSources)
    };
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(dateRange = null, filters = {}) {
    const leads = await this.loadData('leads.json');
    const callLogs = await this.loadData('callLogs.json');
    
    let filteredCalls = this.applyFilters(callLogs, filters, dateRange, 'date');
    let filteredLeads = this.applyFilters(leads, filters, dateRange);
    
    const agentMetrics = {};
    
    // Group calls by agent
    const agentGroups = this.groupBy(filteredCalls, 'agent_id');
    
    for (const [agentId, agentCalls] of Object.entries(agentGroups)) {
      const agentName = agentCalls[0]?.agent_name || agentId;
      
      // Get leads for this agent
      const agentLeadIds = agentCalls.map(call => call.lead_id);
      const agentLeads = filteredLeads.filter(lead => 
        agentLeadIds.includes(lead.id) || lead.assigned_to === agentId
      );
      
      const totalCalls = agentCalls.length;
      const totalCallTime = this.calculateTotalDuration(agentCalls);
      const avgCallDuration = totalCalls > 0 ? totalCallTime / totalCalls : 0;
      const avgQualityScore = this.calculateAverage(agentCalls, 'quality_score');
      
      // Outcome analysis
      const outcomes = this.getDistribution(agentCalls, 'outcome');
      const qualifiedCalls = agentCalls.filter(call => call.outcome === 'Qualified').length;
      const interestedCalls = agentCalls.filter(call => 
        ['Interested', 'Qualified', 'Information Requested'].includes(call.outcome)
      ).length;
      
      // Lead metrics
      const totalLeads = agentLeads.length;
      const qualifiedLeads = agentLeads.filter(lead => lead.status === 'Qualified').length;
      const convertedLeads = agentLeads.filter(lead => lead.status === 'Converted').length;
      
      agentMetrics[agentId] = {
        agentId,
        agentName,
        calls: {
          total: totalCalls,
          totalTime: totalCallTime,
          avgDuration: Math.round(avgCallDuration * 100) / 100,
          avgQualityScore: Math.round(avgQualityScore * 100) / 100,
          outcomes
        },
        leads: {
          total: totalLeads,
          qualified: qualifiedLeads,
          converted: convertedLeads,
          qualificationRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
          conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
        },
        performance: {
          callsPerDay: this.calculateCallsPerDay(agentCalls, dateRange),
          successRate: totalCalls > 0 ? (interestedCalls / totalCalls) * 100 : 0,
          qualificationRate: totalCalls > 0 ? (qualifiedCalls / totalCalls) * 100 : 0,
          productivity: this.calculateProductivityScore(agentCalls, agentLeads)
        }
      };
    }

    // Generate rankings
    const rankings = {
      byQualityScore: this.rankAgents(agentMetrics, 'calls.avgQualityScore'),
      byConversionRate: this.rankAgents(agentMetrics, 'leads.conversionRate'),
      byProductivity: this.rankAgents(agentMetrics, 'performance.productivity')
    };

    return {
      agents: agentMetrics,
      rankings,
      teamSummary: this.calculateTeamSummary(agentMetrics),
      recommendations: this.generateAgentRecommendations(agentMetrics)
    };
  }

  /**
   * Generate forecasting and predictions
   */
  async generateForecasting(dateRange = null, forecastPeriod = 30) {
    const leads = await this.loadData('leads.json');
    const callLogs = await this.loadData('callLogs.json');
    
    // Historical trend analysis
    const trends = await this.getHistoricalTrends(leads, callLogs);
    
    // Pipeline analysis
    const pipeline = await this.getPipelineAnalysis(leads);
    
    // Predictive models
    const predictions = {
      leadGeneration: this.predictLeadGeneration(trends, forecastPeriod),
      conversionForecast: this.predictConversions(pipeline, trends),
      revenueForecast: this.predictRevenue(pipeline, trends, forecastPeriod),
      capacityForecast: this.predictCapacityNeeds(trends, forecastPeriod)
    };

    return {
      trends,
      pipeline,
      predictions,
      confidence: this.calculatePredictionConfidence(trends),
      recommendations: this.generateForecastingRecommendations(predictions)
    };
  }

  // Helper Methods

  applyFilters(data, filters, dateRange, dateField = 'created_at') {
    let filtered = data;

    // Date range filter
    if (dateRange && dateRange.start && dateRange.end) {
      filtered = filtered.filter(item => {
        const date = new Date(item[dateField]);
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        return date >= start && date <= end;
      });
    }

    // Apply other filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'dateRange') {
        if (Array.isArray(value)) {
          filtered = filtered.filter(item => value.includes(item[key]));
        } else {
          filtered = filtered.filter(item => item[key] === value);
        }
      }
    });

    return filtered;
  }

  getDistribution(data, field) {
    const distribution = {};
    data.forEach(item => {
      const value = item[field] || 'Unknown';
      distribution[value] = (distribution[value] || 0) + 1;
    });
    return distribution;
  }

  getGeographicDistribution(leads) {
    const geoData = {};
    leads.forEach(lead => {
      if (lead.address) {
        const state = lead.address.state || 'Unknown';
        const city = lead.address.city || 'Unknown';
        
        if (!geoData[state]) {
          geoData[state] = { total: 0, cities: {} };
        }
        
        geoData[state].total += 1;
        geoData[state].cities[city] = (geoData[state].cities[city] || 0) + 1;
      }
    });
    return geoData;
  }

  calculateAverage(data, field) {
    if (!data.length) return 0;
    const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
    return sum / data.length;
  }

  calculateTotalDuration(calls) {
    return calls.reduce((total, call) => {
      const duration = this.parseDuration(call.duration);
      return total + duration;
    }, 0);
  }

  parseDuration(durationStr) {
    if (!durationStr) return 0;
    const parts = durationStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  groupBy(data, field) {
    return data.reduce((groups, item) => {
      const key = item[field] || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  // Placeholder methods for more complex calculations
  
  estimateCostPerLead(source) {
    const costMap = {
      'Website': 25,
      'Cold Call': 45,
      'Referral': 15,
      'LinkedIn': 35,
      'Trade Show': 85,
      'Email Campaign': 20
    };
    return costMap[source] || 30;
  }

  calculateROI(source, converted, totalLeads) {
    const revenue = converted * 5000; // Assumed average deal size
    const cost = totalLeads * this.estimateCostPerLead(source);
    return cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
  }

  calculateProductivityScore(calls, leads) {
    const callVolume = calls.length * 0.3;
    const qualityScore = this.calculateAverage(calls, 'quality_score') * 0.4;
    const conversionRate = leads.length > 0 ? 
      (leads.filter(l => l.status === 'Qualified').length / leads.length) * 0.3 : 0;
    
    return Math.round((callVolume + qualityScore + conversionRate) * 100) / 100;
  }

  calculateCallsPerDay(calls, dateRange) {
    if (!calls || calls.length === 0) return 0;
    
    // If no date range provided, calculate based on call dates
    if (!dateRange || (!dateRange.start && !dateRange.end)) {
      const callDates = calls.map(call => new Date(call.date || call.created_at));
      const earliestDate = new Date(Math.min(...callDates));
      const latestDate = new Date(Math.max(...callDates));
      const daysDiff = Math.max(1, Math.ceil((latestDate - earliestDate) / (24 * 60 * 60 * 1000)));
      return Math.round((calls.length / daysDiff) * 100) / 100;
    }
    
    // Calculate based on provided date range
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)));
    
    return Math.round((calls.length / daysDiff) * 100) / 100;
  }

  rankAgents(agentMetrics, metric) {
    return Object.entries(agentMetrics)
      .map(([id, data]) => ({
        agentId: id,
        agentName: data.agentName,
        score: this.getNestedValue(data, metric)
      }))
      .sort((a, b) => b.score - a.score);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj) || 0;
  }

  calculateTeamSummary(agentMetrics) {
    const agents = Object.values(agentMetrics);
    return {
      totalAgents: agents.length,
      totalCalls: agents.reduce((sum, agent) => sum + agent.calls.total, 0),
      avgQualityScore: this.calculateAverage(agents.map(a => ({ quality_score: a.calls.avgQualityScore })), 'quality_score'),
      teamConversionRate: agents.length > 0 ? 
        agents.reduce((sum, agent) => sum + agent.leads.conversionRate, 0) / agents.length : 0
    };
  }

  // Placeholder methods for complex analytics
  async getLeadTrends(leads, dateRange) {
    // Implementation would create time-series data
    return { message: 'Trend analysis coming soon' };
  }

  async getHistoricalTrends(leads, callLogs) {
    return { message: 'Historical analysis coming soon' };
  }

  async getPipelineAnalysis(leads) {
    return {
      totalValue: leads.reduce((sum, lead) => sum + (lead.estimated_value || 5000), 0),
      stages: this.getDistribution(leads, 'status')
    };
  }

  predictLeadGeneration(trends, period) {
    return { predicted: Math.round(Math.random() * 100 + 50) };
  }

  predictConversions(pipeline, trends) {
    return { predicted: Math.round(pipeline.totalValue * 0.15) };
  }

  predictRevenue(pipeline, trends, period) {
    return { predicted: Math.round(pipeline.totalValue * 0.25) };
  }

  predictCapacityNeeds(trends, period) {
    return { recommendedAgents: 3 };
  }

  calculatePredictionConfidence(trends) {
    return 75; // Placeholder confidence score
  }

  // Recommendation generators
  generateFunnelRecommendations(analysis) {
    const recommendations = [];
    if (analysis.contactRate < 80) {
      recommendations.push('Improve lead contact rate by updating phone numbers');
    }
    if (analysis.answerRate < 30) {
      recommendations.push('Optimize call timing and frequency');
    }
    if (analysis.interestRate < 25) {
      recommendations.push('Refine call scripts and value proposition');
    }
    return recommendations;
  }

  generateSourceRecommendations(sources) {
    return [
      `Focus more investment on ${sources[0][0]} (highest ROI)`,
      'Consider reducing spend on low-performing sources',
      'Test new acquisition channels'
    ];
  }

  generateAgentRecommendations(agentMetrics) {
    return [
      'Provide additional training for agents with low quality scores',
      'Share best practices from top performers',
      'Consider workload balancing across agents'
    ];
  }

  generateForecastingRecommendations(predictions) {
    return [
      'Plan capacity for predicted lead volume',
      'Adjust sales targets based on forecasts',
      'Prepare resources for growth periods'
    ];
  }
}

module.exports = new AnalyticsModel();