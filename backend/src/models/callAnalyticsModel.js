/**
 * Call Analytics Model
 * Advanced call performance analytics and reporting system
 */

const dataManager = require('../utils/dataManager');
const { subDays, startOfDay, endOfDay, format, parseISO } = require('date-fns');
const _ = require('lodash');

class CallAnalyticsModel {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive call performance analytics
   */
  async getCallPerformanceAnalytics(dateRange = null, filters = {}) {
    try {
      const callLogs = await dataManager.loadData('callLogs.json');
      const leads = await dataManager.loadData('leads.json');
      
      // Filter calls by date range
      const filteredCalls = this.filterCallsByDateRange(callLogs, dateRange);
      const filteredByParams = this.filterCallsByParams(filteredCalls, filters);

      // Call volume analysis with trending
      const volumeAnalysis = this.analyzeCallVolume(filteredByParams, dateRange);
      
      // Connection and answer rates
      const connectionAnalysis = this.analyzeConnectionRates(filteredByParams);
      
      // Call duration analysis
      const durationAnalysis = this.analyzeDuration(filteredByParams);
      
      // Outcome distribution
      const outcomeAnalysis = this.analyzeOutcomes(filteredByParams);
      
      // Timing analysis (peak hours/days)
      const timingAnalysis = this.analyzeOptimalTiming(filteredByParams);

      return {
        summary: {
          totalCalls: filteredByParams.length,
          totalConnected: connectionAnalysis.totalConnected,
          totalAnswered: connectionAnalysis.totalAnswered,
          avgDuration: durationAnalysis.avgDuration,
          conversionRate: outcomeAnalysis.conversionRate,
          dateRange: dateRange || 'All time'
        },
        volumeAnalysis,
        connectionAnalysis,
        durationAnalysis,
        outcomeAnalysis,
        timingAnalysis,
        trends: this.calculateTrends(filteredByParams, dateRange),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting call performance analytics:', error);
      throw error;
    }
  }

  /**
   * Generate individual agent scorecards with KPIs
   */
  async generateAgentScorecards(dateRange = null, agentId = null) {
    try {
      const callLogs = await dataManager.loadData('callLogs.json');
      const leads = await dataManager.loadData('leads.json');
      
      const filteredCalls = this.filterCallsByDateRange(callLogs, dateRange);
      
      // Group calls by agent
      const callsByAgent = _.groupBy(filteredCalls, 'agent_id');
      
      const scorecards = {};
      const agentsToProcess = agentId ? [agentId] : Object.keys(callsByAgent);
      
      for (const currentAgentId of agentsToProcess) {
        const agentCalls = callsByAgent[currentAgentId] || [];
        
        scorecards[currentAgentId] = {
          agentId: currentAgentId,
          agentName: this.getAgentName(currentAgentId), // Would get from agents table
          
          // Volume metrics
          totalCalls: agentCalls.length,
          callsPerDay: this.calculateCallsPerDay(agentCalls, dateRange),
          
          // Quality metrics
          connectionRate: this.calculateConnectionRate(agentCalls),
          answerRate: this.calculateAnswerRate(agentCalls),
          avgCallDuration: this.calculateAvgDuration(agentCalls),
          avgQualityScore: this.calculateAvgQualityScore(agentCalls),
          
          // Outcome metrics
          conversionRate: this.calculateConversionRate(agentCalls),
          qualificationRate: this.calculateQualificationRate(agentCalls),
          interestRate: this.calculateInterestRate(agentCalls),
          
          // Lead management metrics
          leadsAdvanced: this.calculateLeadsAdvanced(agentCalls),
          followUpAdherence: this.calculateFollowUpAdherence(agentCalls, leads),
          noteCompleteness: this.calculateNoteCompleteness(agentCalls),
          
          // Performance rankings
          performanceRank: 0, // Will be calculated after all agents
          improvementAreas: this.identifyImprovementAreas(agentCalls),
          strengths: this.identifyStrengths(agentCalls),
          
          // Coaching recommendations
          coachingRecommendations: this.generateCoachingRecommendations(agentCalls),
          
          // Time-based analysis
          bestPerformingHours: this.findBestPerformingHours(agentCalls),
          bestPerformingDays: this.findBestPerformingDays(agentCalls),
          
          dateRange: dateRange || 'All time',
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Calculate performance rankings
      this.calculatePerformanceRankings(scorecards);
      
      return {
        scorecards,
        teamSummary: this.calculateTeamSummary(scorecards),
        benchmarks: this.calculateBenchmarks(scorecards),
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error generating agent scorecards:', error);
      throw error;
    }
  }

  /**
   * Analyze call quality with detailed insights
   */
  async analyzeCallQuality(dateRange = null, filters = {}) {
    try {
      const callLogs = await dataManager.loadData('callLogs.json');
      const leads = await dataManager.loadData('leads.json');
      
      const filteredCalls = this.filterCallsByDateRange(callLogs, dateRange);
      const filteredByParams = this.filterCallsByParams(filteredCalls, filters);
      
      // Quality score analysis
      const qualityAnalysis = this.analyzeQualityScores(filteredByParams);
      
      // Outcome correlation analysis
      const outcomeCorrelation = this.analyzeOutcomeCorrelation(filteredByParams, leads);
      
      // Script effectiveness analysis
      const scriptAnalysis = this.analyzeScriptEffectiveness(filteredByParams);
      
      // Objection handling analysis
      const objectionAnalysis = this.analyzeObjectionHandling(filteredByParams);
      
      // Customer feedback analysis
      const feedbackAnalysis = this.analyzeFeedback(filteredByParams);
      
      // Coaching insights
      const coachingInsights = this.generateQualityCoachingInsights(filteredByParams);
      
      // Best practices identification
      const bestPractices = this.identifyBestPractices(filteredByParams);

      return {
        summary: {
          totalCallsAnalyzed: filteredByParams.length,
          avgQualityScore: qualityAnalysis.avgScore,
          qualityTrend: qualityAnalysis.trend,
          topPerformingOutcome: outcomeCorrelation.bestOutcome
        },
        qualityAnalysis,
        outcomeCorrelation,
        scriptAnalysis,
        objectionAnalysis,
        feedbackAnalysis,
        coachingInsights,
        bestPractices,
        recommendations: this.generateQualityRecommendations(filteredByParams),
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error analyzing call quality:', error);
      throw error;
    }
  }

  /**
   * Generate real-time call dashboard data
   */
  async generateRealTimeDashboard() {
    try {
      const now = new Date();
      const startOfToday = startOfDay(now);
      const endOfToday = endOfDay(now);
      
      const callLogs = await dataManager.loadData('callLogs.json');
      
      // Today's calls
      const todayCalls = callLogs.filter(call => {
        const callDate = parseISO(call.created_at);
        return callDate >= startOfToday && callDate <= endOfToday;
      });
      
      // Real-time metrics
      const realTimeMetrics = {
        // Current activity
        totalCallsToday: todayCalls.length,
        callsInProgress: this.getCallsInProgress(todayCalls), // Would track active calls
        callsLastHour: this.getCallsLastHour(todayCalls),
        
        // Performance indicators
        connectionRateToday: this.calculateConnectionRate(todayCalls),
        avgQualityToday: this.calculateAvgQualityScore(todayCalls),
        conversionRateToday: this.calculateConversionRate(todayCalls),
        
        // Agent activity
        activeAgents: this.getActiveAgents(todayCalls),
        topPerformerToday: this.getTopPerformerToday(todayCalls),
        agentsNeedingSupport: this.identifyAgentsNeedingSupport(todayCalls),
        
        // Hourly breakdown
        hourlyBreakdown: this.getHourlyBreakdown(todayCalls),
        
        // Alerts and notifications
        alerts: this.generateRealTimeAlerts(todayCalls),
        
        // Next actions
        priorityFollowUps: this.getPriorityFollowUps(),
        upcomingCalls: this.getUpcomingScheduledCalls(),
        
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 30000).toISOString() // 30 seconds
      };
      
      return realTimeMetrics;
      
    } catch (error) {
      console.error('Error generating real-time dashboard:', error);
      throw error;
    }
  }

  /**
   * Generate automated reports with scheduling
   */
  async generateAutomatedReport(reportType, schedule, recipients, customizations = {}) {
    try {
      const reportConfig = {
        reportId: `auto_${Date.now()}`,
        type: reportType,
        schedule,
        recipients,
        customizations,
        createdAt: new Date().toISOString()
      };
      
      let reportData;
      
      switch (reportType) {
        case 'daily_performance':
          reportData = await this.generateDailyPerformanceReport();
          break;
        case 'weekly_scorecard':
          reportData = await this.generateWeeklyScorecard();
          break;
        case 'monthly_analysis':
          reportData = await this.generateMonthlyAnalysis();
          break;
        case 'agent_coaching':
          reportData = await this.generateAgentCoachingReport();
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
      
      // Format report for delivery
      const formattedReport = {
        ...reportConfig,
        data: reportData,
        summary: this.generateReportSummary(reportData),
        recommendations: this.generateReportRecommendations(reportData),
        visualizations: this.generateReportVisualizations(reportData),
        deliveryStatus: 'ready',
        generatedAt: new Date().toISOString()
      };
      
      return formattedReport;
      
    } catch (error) {
      console.error('Error generating automated report:', error);
      throw error;
    }
  }

  // Helper Methods for Call Performance Analytics

  analyzeCallVolume(calls, dateRange) {
    const dailyVolume = this.groupCallsByDate(calls);
    const weeklyVolume = this.groupCallsByWeek(calls);
    const monthlyVolume = this.groupCallsByMonth(calls);
    
    return {
      daily: dailyVolume,
      weekly: weeklyVolume,
      monthly: monthlyVolume,
      trends: {
        dailyGrowth: this.calculateGrowthRate(dailyVolume),
        weeklyGrowth: this.calculateGrowthRate(weeklyVolume),
        monthlyGrowth: this.calculateGrowthRate(monthlyVolume)
      },
      peaks: this.identifyVolumePeaks(dailyVolume),
      forecasting: this.forecastVolume(dailyVolume)
    };
  }

  analyzeConnectionRates(calls) {
    const totalCalls = calls.length;
    const connectedCalls = calls.filter(call => 
      call.outcome !== 'No Answer' && call.outcome !== 'Busy'
    );
    const answeredCalls = calls.filter(call => 
      call.outcome !== 'No Answer' && call.outcome !== 'Busy' && call.outcome !== 'Voicemail'
    );
    
    return {
      totalCalls,
      totalConnected: connectedCalls.length,
      totalAnswered: answeredCalls.length,
      connectionRate: (connectedCalls.length / totalCalls * 100).toFixed(2),
      answerRate: (answeredCalls.length / totalCalls * 100).toFixed(2),
      voicemailRate: (calls.filter(call => call.outcome === 'Voicemail').length / totalCalls * 100).toFixed(2),
      optimization: {
        potentialImprovement: this.calculateConnectionOptimization(calls),
        recommendations: this.getConnectionRecommendations(calls)
      }
    };
  }

  analyzeDuration(calls) {
    const durations = calls.map(call => call.duration || 0).filter(d => d > 0);
    const avgDuration = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
    
    return {
      avgDuration: Math.round(avgDuration),
      totalTalkTime: durations.reduce((sum, d) => sum + d, 0),
      durationDistribution: this.calculateDurationDistribution(durations),
      optimalDurationRange: this.findOptimalDurationRange(calls),
      talkTimeAnalysis: {
        shortCalls: durations.filter(d => d < 60).length,
        mediumCalls: durations.filter(d => d >= 60 && d < 300).length,
        longCalls: durations.filter(d => d >= 300).length
      }
    };
  }

  // Helper Methods for Agent Scorecards

  calculateCallsPerDay(calls, dateRange) {
    if (!calls.length) return 0;
    
    const days = dateRange ? 
      Math.ceil((parseISO(dateRange.end) - parseISO(dateRange.start)) / (24 * 60 * 60 * 1000)) :
      30; // Default to 30 days if no range
      
    return (calls.length / days).toFixed(1);
  }

  calculateConnectionRate(calls) {
    if (!calls.length) return 0;
    const connected = calls.filter(call => 
      call.outcome !== 'No Answer' && call.outcome !== 'Busy'
    ).length;
    return (connected / calls.length * 100).toFixed(2);
  }

  calculateConversionRate(calls) {
    if (!calls.length) return 0;
    const converted = calls.filter(call => 
      ['Qualified', 'Information Requested', 'Demo Scheduled'].includes(call.outcome)
    ).length;
    return (converted / calls.length * 100).toFixed(2);
  }

  identifyImprovementAreas(calls) {
    const areas = [];
    
    const connectionRate = parseFloat(this.calculateConnectionRate(calls));
    const conversionRate = parseFloat(this.calculateConversionRate(calls));
    const avgQuality = this.calculateAvgQualityScore(calls);
    
    if (connectionRate < 70) areas.push('Connection Rate');
    if (conversionRate < 15) areas.push('Conversion Rate');
    if (avgQuality < 3.5) areas.push('Call Quality');
    
    return areas;
  }

  generateCoachingRecommendations(calls) {
    const recommendations = [];
    
    const connectionRate = parseFloat(this.calculateConnectionRate(calls));
    const conversionRate = parseFloat(this.calculateConversionRate(calls));
    const avgQuality = this.calculateAvgQualityScore(calls);
    
    if (connectionRate < 70) {
      recommendations.push({
        area: 'Connection Rate',
        recommendation: 'Focus on optimal calling times and lead list quality',
        priority: 'High',
        expectedImprovement: '10-15% increase in connections'
      });
    }
    
    if (conversionRate < 15) {
      recommendations.push({
        area: 'Conversion',
        recommendation: 'Improve qualification questions and objection handling',
        priority: 'High',
        expectedImprovement: '5-8% increase in conversions'
      });
    }
    
    return recommendations;
  }

  // Helper Methods for Call Quality Analysis

  analyzeQualityScores(calls) {
    const scores = calls.map(call => call.quality_score || 0).filter(s => s > 0);
    const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
    
    return {
      avgScore: avgScore.toFixed(2),
      scoreDistribution: this.calculateScoreDistribution(scores),
      trend: this.calculateQualityTrend(calls),
      topPerformers: this.identifyTopQualityPerformers(calls),
      improvementOpportunities: this.identifyQualityImprovements(calls)
    };
  }

  // Helper Methods for Real-Time Dashboard

  getCallsInProgress(calls) {
    // In a real system, this would check for currently active calls
    return Math.floor(Math.random() * 5); // Simulated active calls
  }

  getCallsLastHour(calls) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return calls.filter(call => parseISO(call.created_at) > oneHourAgo).length;
  }

  getActiveAgents(calls) {
    const agents = [...new Set(calls.map(call => call.agent_id))];
    return agents.length;
  }

  generateRealTimeAlerts(calls) {
    const alerts = [];
    
    const recentCalls = calls.filter(call => {
      const callTime = parseISO(call.created_at);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      return callTime > twoHoursAgo;
    });
    
    const connectionRate = this.calculateConnectionRate(recentCalls);
    if (parseFloat(connectionRate) < 50) {
      alerts.push({
        type: 'warning',
        message: 'Connection rate below 50% in last 2 hours',
        action: 'Check lead quality and calling times',
        priority: 'High'
      });
    }
    
    return alerts;
  }

  // Utility Methods

  filterCallsByDateRange(calls, dateRange) {
    if (!dateRange) return calls;
    
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    
    return calls.filter(call => {
      const callDate = parseISO(call.created_at);
      return callDate >= start && callDate <= end;
    });
  }

  filterCallsByParams(calls, filters) {
    let filtered = [...calls];
    
    if (filters.agent_id) {
      filtered = filtered.filter(call => call.agent_id === filters.agent_id);
    }
    
    if (filters.outcome) {
      filtered = filtered.filter(call => call.outcome === filters.outcome);
    }
    
    if (filters.lead_source) {
      filtered = filtered.filter(call => call.lead_source === filters.lead_source);
    }
    
    return filtered;
  }

  getAgentName(agentId) {
    // In a real system, this would look up agent names from a database
    const agentNames = {
      'agent-1': 'John Smith',
      'agent-2': 'Sarah Johnson', 
      'agent-3': 'Mike Davis',
      'agent-4': 'Emily Chen'
    };
    return agentNames[agentId] || `Agent ${agentId}`;
  }

  calculateAvgQualityScore(calls) {
    const scores = calls.map(call => call.quality_score || 0).filter(s => s > 0);
    return scores.length > 0 ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(2) : 0;
  }

  calculateAvgDuration(calls) {
    const durations = calls.map(call => call.duration || 0).filter(d => d > 0);
    return durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : 0;
  }
}

module.exports = new CallAnalyticsModel();