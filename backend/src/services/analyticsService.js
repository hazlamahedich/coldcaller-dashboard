/**
 * Analytics Service
 * Advanced analytics processing and real-time data aggregation
 */

const analyticsModel = require('../models/analyticsModel');
const dataManager = require('../utils/dataManager');

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.realTimeMetrics = new Map();
    this.subscribers = new Map(); // For WebSocket connections
    this.refreshInterval = 5 * 60 * 1000; // 5 minutes
    this.realTimeInterval = 30 * 1000; // 30 seconds
    
    this.startRealTimeProcessing();
  }

  /**
   * Start real-time analytics processing
   */
  startRealTimeProcessing() {
    // Aggregate data every 5 minutes
    setInterval(() => {
      this.aggregateData().catch(console.error);
    }, this.refreshInterval);

    // Update real-time metrics every 30 seconds
    setInterval(() => {
      this.updateRealTimeMetrics().catch(console.error);
    }, this.realTimeInterval);
  }

  /**
   * Aggregate and cache analytics data
   */
  async aggregateData() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Aggregate different time periods
      const aggregations = {
        today: await this.aggregatePeriod({ start: today.toISOString(), end: now.toISOString() }),
        yesterday: await this.aggregatePeriod({ start: yesterday.toISOString(), end: today.toISOString() }),
        week: await this.aggregatePeriod({ start: weekAgo.toISOString(), end: now.toISOString() }),
        month: await this.aggregatePeriod({ start: monthAgo.toISOString(), end: now.toISOString() })
      };

      // Cache aggregated data
      this.cache.set('aggregated_data', {
        data: aggregations,
        timestamp: now.toISOString()
      });

      console.log('Analytics data aggregated successfully');
    } catch (error) {
      console.error('Error aggregating analytics data:', error);
    }
  }

  /**
   * Aggregate data for a specific period
   */
  async aggregatePeriod(dateRange) {
    const [leadMetrics, conversionFunnel, agentPerformance] = await Promise.all([
      analyticsModel.getLeadMetrics(dateRange),
      analyticsModel.getConversionFunnel(dateRange),
      analyticsModel.getAgentPerformance(dateRange)
    ]);

    return {
      leadMetrics,
      conversionFunnel,
      agentPerformance,
      summary: {
        totalLeads: leadMetrics.summary.totalLeads,
        conversionRate: leadMetrics.summary.conversionRate,
        totalCalls: agentPerformance.teamSummary.totalCalls,
        avgQualityScore: agentPerformance.teamSummary.avgQualityScore
      }
    };
  }

  /**
   * Update real-time metrics
   */
  async updateRealTimeMetrics() {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const realTimeData = await this.aggregatePeriod({
        start: startOfDay.toISOString(),
        end: now.toISOString()
      });

      // Calculate real-time KPIs
      const kpis = {
        leadsToday: realTimeData.leadMetrics.summary.totalLeads,
        callsToday: realTimeData.agentPerformance.teamSummary.totalCalls,
        conversionRate: realTimeData.leadMetrics.summary.conversionRate,
        avgCallQuality: realTimeData.agentPerformance.teamSummary.avgQualityScore,
        timestamp: now.toISOString()
      };

      this.realTimeMetrics.set('current_kpis', kpis);

      // Notify WebSocket subscribers
      this.notifySubscribers('realtime_update', kpis);

      console.log('Real-time metrics updated');
    } catch (error) {
      console.error('Error updating real-time metrics:', error);
    }
  }

  /**
   * Get cached aggregated data
   */
  getCachedData(period = 'today') {
    const cached = this.cache.get('aggregated_data');
    
    if (!cached) {
      return null;
    }

    return cached.data[period] || null;
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics() {
    return this.realTimeMetrics.get('current_kpis') || null;
  }

  /**
   * Subscribe to real-time updates (WebSocket)
   */
  subscribe(connectionId, callback) {
    this.subscribers.set(connectionId, callback);
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(connectionId) {
    this.subscribers.delete(connectionId);
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(event, data) {
    this.subscribers.forEach((callback, connectionId) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error(`Error notifying subscriber ${connectionId}:`, error);
        this.subscribers.delete(connectionId);
      }
    });
  }

  /**
   * Generate predictive lead scoring
   */
  async generateLeadScoring(leadId) {
    try {
      const leads = await dataManager.loadData('leads.json');
      const callLogs = await dataManager.loadData('callLogs.json');
      
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Get lead's call history
      const leadCalls = callLogs.filter(call => call.lead_id === leadId);

      // Calculate scoring factors
      const factors = {
        // Industry scoring
        industryScore: this.calculateIndustryScore(lead.industry),
        
        // Company size scoring
        companySizeScore: this.calculateCompanySizeScore(lead.company_size),
        
        // Lead source scoring
        sourceScore: this.calculateSourceScore(lead.lead_source),
        
        // Engagement scoring
        engagementScore: this.calculateEngagementScore(leadCalls),
        
        // Behavioral scoring
        behavioralScore: this.calculateBehavioralScore(lead, leadCalls),
        
        // Timing scoring
        timingScore: this.calculateTimingScore(lead)
      };

      // Calculate weighted score
      const finalScore = (
        factors.industryScore * 0.20 +
        factors.companySizeScore * 0.15 +
        factors.sourceScore * 0.15 +
        factors.engagementScore * 0.25 +
        factors.behavioralScore * 0.15 +
        factors.timingScore * 0.10
      );

      return {
        leadId,
        score: Math.round(finalScore * 100) / 100,
        factors,
        recommendation: this.generateLeadRecommendation(finalScore, factors),
        confidence: this.calculateConfidence(factors),
        nextBestAction: this.getNextBestAction(finalScore, lead, leadCalls)
      };

    } catch (error) {
      console.error('Error generating lead scoring:', error);
      throw error;
    }
  }

  /**
   * Calculate conversion probability prediction
   */
  async predictConversionProbability(leadId) {
    try {
      const scoring = await this.generateLeadScoring(leadId);
      const leads = await dataManager.loadData('leads.json');
      
      // Historical conversion analysis
      const historicalData = await this.getHistoricalConversions();
      
      // Machine learning placeholder - would use actual ML model
      const baseProbability = scoring.score / 100;
      const adjustedProbability = this.adjustProbabilityWithHistorical(baseProbability, historicalData);

      return {
        leadId,
        conversionProbability: Math.round(adjustedProbability * 100),
        confidence: scoring.confidence,
        timeToConversion: this.estimateTimeToConversion(scoring.score),
        factors: scoring.factors,
        recommendations: [
          ...scoring.recommendation,
          this.getProbabilityRecommendations(adjustedProbability)
        ].flat()
      };

    } catch (error) {
      console.error('Error predicting conversion probability:', error);
      throw error;
    }
  }

  /**
   * Generate advanced funnel analysis
   */
  async generateAdvancedFunnelAnalysis(dateRange = null, filters = {}) {
    try {
      const basicFunnel = await analyticsModel.getConversionFunnel(dateRange, filters);
      
      // Add advanced analysis
      const advancedAnalysis = {
        ...basicFunnel,
        cohortAnalysis: await this.generateCohortAnalysis(dateRange),
        attributionModel: await this.generateAttributionModel(dateRange),
        customerJourney: await this.analyzeCustomerJourney(dateRange),
        bottleneckAnalysis: this.identifyBottlenecks(basicFunnel),
        optimizationOpportunities: this.identifyOptimizations(basicFunnel)
      };

      return advancedAnalysis;

    } catch (error) {
      console.error('Error generating advanced funnel analysis:', error);
      throw error;
    }
  }

  // Helper methods for lead scoring

  calculateIndustryScore(industry) {
    const industryScores = {
      'Technology': 0.85,
      'Healthcare': 0.80,
      'Financial Services': 0.75,
      'Manufacturing': 0.70,
      'Marketing': 0.65,
      'Venture Capital': 0.90
    };
    return industryScores[industry] || 0.60;
  }

  calculateCompanySizeScore(size) {
    const sizeScores = {
      '1-10': 0.60,
      '10-50': 0.75,
      '50-200': 0.85,
      '200-500': 0.80,
      '500+': 0.70
    };
    return sizeScores[size] || 0.65;
  }

  calculateSourceScore(source) {
    const sourceScores = {
      'Referral': 0.90,
      'Website': 0.80,
      'LinkedIn': 0.75,
      'Cold Call': 0.65,
      'Trade Show': 0.85,
      'Email Campaign': 0.60
    };
    return sourceScores[source] || 0.55;
  }

  calculateEngagementScore(calls) {
    if (calls.length === 0) return 0.30;
    
    const avgQuality = calls.reduce((sum, call) => sum + (call.quality_score || 0), 0) / calls.length;
    const positiveOutcomes = calls.filter(call => 
      ['Interested', 'Qualified', 'Information Requested'].includes(call.outcome)
    ).length;
    
    const engagementRate = positiveOutcomes / calls.length;
    return (avgQuality / 5) * 0.6 + engagementRate * 0.4;
  }

  calculateBehavioralScore(lead, calls) {
    let score = 0.50; // Base score
    
    // Recent activity boost
    const recentCalls = calls.filter(call => {
      const callDate = new Date(call.created_at);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return callDate > sevenDaysAgo;
    });
    
    if (recentCalls.length > 0) score += 0.20;
    
    // Response rate
    const answeredCalls = calls.filter(call => call.outcome !== 'Voicemail' && call.outcome !== 'No Answer');
    const responseRate = calls.length > 0 ? answeredCalls.length / calls.length : 0;
    score += responseRate * 0.30;
    
    return Math.min(score, 1.0);
  }

  calculateTimingScore(lead) {
    const now = new Date();
    const createdDate = new Date(lead.created_at);
    const daysSinceCreated = (now - createdDate) / (24 * 60 * 60 * 1000);
    
    // Sweet spot is 1-14 days
    if (daysSinceCreated <= 1) return 0.60;
    if (daysSinceCreated <= 7) return 0.90;
    if (daysSinceCreated <= 14) return 0.80;
    if (daysSinceCreated <= 30) return 0.60;
    return 0.40;
  }

  generateLeadRecommendation(score, factors) {
    const recommendations = [];
    
    if (score >= 0.80) {
      recommendations.push('High priority - schedule immediate follow-up call');
      recommendations.push('Assign to top performing agent');
    } else if (score >= 0.60) {
      recommendations.push('Medium priority - follow up within 24 hours');
      if (factors.engagementScore < 0.60) {
        recommendations.push('Focus on building rapport and trust');
      }
    } else {
      recommendations.push('Low priority - add to nurturing campaign');
      recommendations.push('Focus on education and value demonstration');
    }
    
    return recommendations;
  }

  calculateConfidence(factors) {
    // Calculate confidence based on data availability
    const dataPoints = Object.values(factors).filter(f => f > 0).length;
    return Math.min(dataPoints / 6 * 100, 95); // Max 95% confidence
  }

  getNextBestAction(score, lead, calls) {
    if (score >= 0.80) return 'Schedule demo or proposal meeting';
    if (score >= 0.60) return 'Follow up with personalized value proposition';
    if (calls.length === 0) return 'Initial outreach call';
    return 'Add to email nurturing sequence';
  }

  // Placeholder methods for advanced analytics

  async getHistoricalConversions() {
    // Would implement actual historical analysis
    return { conversionRate: 0.15, sampleSize: 1000 };
  }

  adjustProbabilityWithHistorical(baseProbability, historical) {
    // Simple adjustment - would use ML model
    return baseProbability * 0.8 + historical.conversionRate * 0.2;
  }

  estimateTimeToConversion(score) {
    if (score >= 0.80) return '1-2 weeks';
    if (score >= 0.60) return '2-4 weeks';
    return '1-2 months';
  }

  getProbabilityRecommendations(probability) {
    if (probability >= 0.70) return 'Focus on closing - high conversion likelihood';
    if (probability >= 0.40) return 'Continue nurturing - moderate conversion potential';
    return 'Consider qualification criteria - low conversion likelihood';
  }

  async generateCohortAnalysis(dateRange) {
    return { message: 'Cohort analysis coming soon' };
  }

  async generateAttributionModel(dateRange) {
    return { message: 'Attribution modeling coming soon' };
  }

  async analyzeCustomerJourney(dateRange) {
    return { message: 'Customer journey analysis coming soon' };
  }

  identifyBottlenecks(funnelData) {
    const bottlenecks = [];
    
    if (funnelData.dropOffAnalysis.contactRate < 70) {
      bottlenecks.push({
        stage: 'Contact',
        issue: 'Low contact rate',
        impact: 'High',
        suggestion: 'Update contact information and calling times'
      });
    }
    
    if (funnelData.dropOffAnalysis.answerRate < 25) {
      bottlenecks.push({
        stage: 'Answer',
        issue: 'Low answer rate',
        impact: 'High',
        suggestion: 'Optimize calling times and frequency'
      });
    }
    
    return bottlenecks;
  }

  identifyOptimizations(funnelData) {
    const optimizations = [];
    
    optimizations.push({
      area: 'Lead Quality',
      recommendation: 'Implement lead scoring to prioritize high-value prospects',
      expectedImpact: '15-25% improvement in conversion rates'
    });
    
    optimizations.push({
      area: 'Agent Training',
      recommendation: 'Provide training on objection handling and closing techniques',
      expectedImpact: '10-20% improvement in qualification rates'
    });
    
    return optimizations;
  }
}

module.exports = new AnalyticsService();