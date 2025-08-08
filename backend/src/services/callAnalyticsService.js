/**
 * Call Analytics Service
 * Real-time call analytics processing and performance optimization
 */

const callAnalyticsModel = require('../models/callAnalyticsModel');
const WebSocketManager = require('./webSocketManager');
const dataManager = require('../utils/dataManager');
const NodeCache = require('node-cache');
const cron = require('node-cron');

class CallAnalyticsService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache
    this.realTimeMetrics = new Map();
    this.subscribers = new Map(); // For WebSocket connections
    this.alerts = new Map();
    this.reportSchedules = new Map();
    
    // Performance thresholds
    this.thresholds = {
      connectionRate: 70,
      answerRate: 25,
      conversionRate: 15,
      qualityScore: 3.5,
      avgCallDuration: 180 // 3 minutes
    };
    
    this.startRealTimeProcessing();
    this.initializeAutomatedReporting();
  }

  /**
   * Start real-time analytics processing and monitoring
   */
  startRealTimeProcessing() {
    // Update real-time metrics every 30 seconds
    setInterval(() => {
      this.updateRealTimeMetrics().catch(console.error);
    }, 30000);

    // Generate performance alerts every minute
    setInterval(() => {
      this.checkPerformanceAlerts().catch(console.error);
    }, 60000);

    // Update cached analytics every 5 minutes
    setInterval(() => {
      this.refreshAnalyticsCache().catch(console.error);
    }, 300000);

    // Generate hourly activity summaries
    setInterval(() => {
      this.generateHourlySummary().catch(console.error);
    }, 3600000);

    console.log('Call analytics real-time processing started');
  }

  /**
   * Initialize automated reporting schedules
   */
  initializeAutomatedReporting() {
    // Daily performance report at 8 AM
    cron.schedule('0 8 * * *', () => {
      this.generateScheduledReport('daily_performance').catch(console.error);
    });

    // Weekly scorecard report every Monday at 9 AM
    cron.schedule('0 9 * * 1', () => {
      this.generateScheduledReport('weekly_scorecard').catch(console.error);
    });

    // Monthly analysis report on the 1st of each month at 10 AM
    cron.schedule('0 10 1 * *', () => {
      this.generateScheduledReport('monthly_analysis').catch(console.error);
    });

    console.log('Automated reporting schedules initialized');
  }

  /**
   * Process real-time call event
   */
  async processCallEvent(eventType, callData) {
    try {
      const timestamp = new Date().toISOString();
      
      // Store event in real-time metrics
      const eventKey = `event_${Date.now()}`;
      this.realTimeMetrics.set(eventKey, {
        type: eventType,
        data: callData,
        timestamp
      });

      // Process different event types
      switch (eventType) {
        case 'call_started':
          await this.handleCallStarted(callData);
          break;
        case 'call_ended':
          await this.handleCallEnded(callData);
          break;
        case 'call_quality_updated':
          await this.handleQualityUpdate(callData);
          break;
        case 'agent_status_changed':
          await this.handleAgentStatusChange(callData);
          break;
      }

      // Broadcast update to WebSocket subscribers
      this.broadcastRealTimeUpdate(eventType, callData);

      // Check for immediate alerts
      await this.checkImmediateAlerts(eventType, callData);

    } catch (error) {
      console.error('Error processing call event:', error);
    }
  }

  /**
   * Update real-time metrics
   */
  async updateRealTimeMetrics() {
    try {
      const dashboardData = await callAnalyticsModel.generateRealTimeDashboard();
      
      // Store current metrics
      this.realTimeMetrics.set('current_dashboard', {
        ...dashboardData,
        updatedAt: new Date().toISOString()
      });

      // Calculate performance trends
      const trends = await this.calculateRealTimeTrends();
      this.realTimeMetrics.set('performance_trends', trends);

      // Update agent activity status
      const agentActivity = await this.updateAgentActivity();
      this.realTimeMetrics.set('agent_activity', agentActivity);

      // Broadcast updates to connected clients
      this.broadcastMetricsUpdate(dashboardData);

      console.log('Real-time metrics updated');
    } catch (error) {
      console.error('Error updating real-time metrics:', error);
    }
  }

  /**
   * Check for performance alerts
   */
  async checkPerformanceAlerts() {
    try {
      const currentMetrics = this.realTimeMetrics.get('current_dashboard');
      if (!currentMetrics) return;

      const alerts = [];

      // Connection rate alerts
      if (currentMetrics.connectionRateToday < this.thresholds.connectionRate) {
        alerts.push({
          id: `connection_rate_${Date.now()}`,
          type: 'warning',
          severity: 'medium',
          message: `Connection rate (${currentMetrics.connectionRateToday}%) below threshold (${this.thresholds.connectionRate}%)`,
          action: 'Review lead quality and calling times',
          timestamp: new Date().toISOString()
        });
      }

      // Answer rate alerts
      if (currentMetrics.answerRateToday < this.thresholds.answerRate) {
        alerts.push({
          id: `answer_rate_${Date.now()}`,
          type: 'warning',
          severity: 'high',
          message: `Answer rate (${currentMetrics.answerRateToday}%) below threshold (${this.thresholds.answerRate}%)`,
          action: 'Optimize calling frequency and timing',
          timestamp: new Date().toISOString()
        });
      }

      // Quality score alerts
      if (currentMetrics.avgQualityToday < this.thresholds.qualityScore) {
        alerts.push({
          id: `quality_score_${Date.now()}`,
          type: 'info',
          severity: 'medium',
          message: `Average quality score (${currentMetrics.avgQualityToday}) below threshold (${this.thresholds.qualityScore})`,
          action: 'Provide additional coaching and training',
          timestamp: new Date().toISOString()
        });
      }

      // Store and broadcast alerts
      if (alerts.length > 0) {
        alerts.forEach(alert => {
          this.alerts.set(alert.id, alert);
        });
        
        this.broadcastAlerts(alerts);
      }

    } catch (error) {
      console.error('Error checking performance alerts:', error);
    }
  }

  /**
   * Generate agent coaching insights
   */
  async generateCoachingInsights(agentId, dateRange = null) {
    try {
      const scorecardData = await callAnalyticsModel.generateAgentScorecards(dateRange, agentId);
      const qualityData = await callAnalyticsModel.analyzeCallQuality(dateRange, { agent_id: agentId });
      
      const agentScorecard = scorecardData.scorecards[agentId];
      if (!agentScorecard) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Advanced coaching analysis
      const coachingInsights = {
        agentId,
        agentName: agentScorecard.agentName,
        
        // Performance summary
        performanceSummary: {
          overallRank: agentScorecard.performanceRank,
          totalAgents: Object.keys(scorecardData.scorecards).length,
          strengthAreas: agentScorecard.strengths,
          improvementAreas: agentScorecard.improvementAreas
        },
        
        // Detailed coaching recommendations
        coachingRecommendations: [
          ...agentScorecard.coachingRecommendations,
          ...this.generateAdvancedCoachingRecommendations(agentScorecard, qualityData)
        ],
        
        // Skills development plan
        skillsDevelopment: this.generateSkillsDevelopmentPlan(agentScorecard, qualityData),
        
        // Performance goals
        performanceGoals: this.generatePerformanceGoals(agentScorecard, scorecardData.benchmarks),
        
        // Learning resources
        learningResources: this.recommendLearningResources(agentScorecard.improvementAreas),
        
        // Progress tracking
        progressTracking: {
          metrics: this.defineTrackingMetrics(agentScorecard),
          checkpoints: this.createProgressCheckpoints(),
          successCriteria: this.defineSuccessCriteria(agentScorecard)
        },
        
        generatedAt: new Date().toISOString()
      };

      return coachingInsights;
      
    } catch (error) {
      console.error('Error generating coaching insights:', error);
      throw error;
    }
  }

  /**
   * Generate scheduled reports
   */
  async generateScheduledReport(reportType) {
    try {
      const reportConfig = this.getReportConfiguration(reportType);
      const reportData = await callAnalyticsModel.generateAutomatedReport(
        reportType,
        reportConfig.schedule,
        reportConfig.recipients,
        reportConfig.customizations
      );

      // Format report for delivery
      const formattedReport = {
        ...reportData,
        executiveSummary: this.generateExecutiveSummary(reportData),
        keyInsights: this.extractKeyInsights(reportData),
        actionItems: this.generateActionItems(reportData),
        visualizations: this.prepareVisualizationData(reportData)
      };

      // Store report
      await this.storeReport(formattedReport);

      // Send notifications (email, webhook, etc.)
      await this.deliverReport(formattedReport);

      console.log(`Scheduled ${reportType} report generated successfully`);
      
    } catch (error) {
      console.error(`Error generating scheduled ${reportType} report:`, error);
    }
  }

  /**
   * Calculate agent performance benchmarks
   */
  async calculatePerformanceBenchmarks(dateRange = null) {
    try {
      const scorecardData = await callAnalyticsModel.generateAgentScorecards(dateRange);
      const agents = Object.values(scorecardData.scorecards);
      
      if (agents.length === 0) return null;

      const benchmarks = {
        connectionRate: {
          avg: this.calculateAverage(agents.map(a => parseFloat(a.connectionRate))),
          top25: this.calculatePercentile(agents.map(a => parseFloat(a.connectionRate)), 75),
          top10: this.calculatePercentile(agents.map(a => parseFloat(a.connectionRate)), 90)
        },
        conversionRate: {
          avg: this.calculateAverage(agents.map(a => parseFloat(a.conversionRate))),
          top25: this.calculatePercentile(agents.map(a => parseFloat(a.conversionRate)), 75),
          top10: this.calculatePercentile(agents.map(a => parseFloat(a.conversionRate)), 90)
        },
        qualityScore: {
          avg: this.calculateAverage(agents.map(a => parseFloat(a.avgQualityScore))),
          top25: this.calculatePercentile(agents.map(a => parseFloat(a.avgQualityScore)), 75),
          top10: this.calculatePercentile(agents.map(a => parseFloat(a.avgQualityScore)), 90)
        },
        callsPerDay: {
          avg: this.calculateAverage(agents.map(a => parseFloat(a.callsPerDay))),
          top25: this.calculatePercentile(agents.map(a => parseFloat(a.callsPerDay)), 75),
          top10: this.calculatePercentile(agents.map(a => parseFloat(a.callsPerDay)), 90)
        }
      };

      return benchmarks;
      
    } catch (error) {
      console.error('Error calculating performance benchmarks:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(connectionId, callback) {
    this.subscribers.set(connectionId, callback);
    console.log(`Client ${connectionId} subscribed to call analytics updates`);
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromUpdates(connectionId) {
    this.subscribers.delete(connectionId);
    console.log(`Client ${connectionId} unsubscribed from call analytics updates`);
  }

  // Event Handlers

  async handleCallStarted(callData) {
    // Track active calls
    const activeCallsKey = 'active_calls';
    const activeCalls = this.realTimeMetrics.get(activeCallsKey) || [];
    activeCalls.push({
      callId: callData.id,
      agentId: callData.agent_id,
      leadId: callData.lead_id,
      startTime: new Date().toISOString()
    });
    this.realTimeMetrics.set(activeCallsKey, activeCalls);
  }

  async handleCallEnded(callData) {
    // Remove from active calls and update metrics
    const activeCallsKey = 'active_calls';
    const activeCalls = this.realTimeMetrics.get(activeCallsKey) || [];
    const updatedActiveCalls = activeCalls.filter(call => call.callId !== callData.id);
    this.realTimeMetrics.set(activeCallsKey, updatedActiveCalls);

    // Process call outcome for real-time analytics
    await this.processCallOutcome(callData);
  }

  async handleQualityUpdate(callData) {
    // Update quality metrics in real-time
    const qualityUpdates = this.realTimeMetrics.get('quality_updates') || [];
    qualityUpdates.push({
      callId: callData.id,
      agentId: callData.agent_id,
      qualityScore: callData.quality_score,
      timestamp: new Date().toISOString()
    });
    this.realTimeMetrics.set('quality_updates', qualityUpdates.slice(-100)); // Keep last 100
  }

  // Utility Methods

  broadcastRealTimeUpdate(eventType, data) {
    const update = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    this.subscribers.forEach((callback, connectionId) => {
      try {
        callback('call_analytics_update', update);
      } catch (error) {
        console.error(`Error broadcasting to subscriber ${connectionId}:`, error);
        this.subscribers.delete(connectionId);
      }
    });
  }

  broadcastMetricsUpdate(metrics) {
    this.subscribers.forEach((callback, connectionId) => {
      try {
        callback('metrics_update', metrics);
      } catch (error) {
        console.error(`Error broadcasting metrics to subscriber ${connectionId}:`, error);
        this.subscribers.delete(connectionId);
      }
    });
  }

  broadcastAlerts(alerts) {
    this.subscribers.forEach((callback, connectionId) => {
      try {
        callback('performance_alerts', { alerts });
      } catch (error) {
        console.error(`Error broadcasting alerts to subscriber ${connectionId}:`, error);
        this.subscribers.delete(connectionId);
      }
    });
  }

  calculateAverage(values) {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  generateAdvancedCoachingRecommendations(scorecard, qualityData) {
    const recommendations = [];

    // Advanced analysis based on quality data
    if (qualityData.qualityAnalysis?.avgScore < 3.5) {
      recommendations.push({
        area: 'Call Quality',
        recommendation: 'Focus on active listening and building rapport with prospects',
        priority: 'High',
        expectedImprovement: 'Quality score improvement of 0.5-1.0 points'
      });
    }

    return recommendations;
  }

  generateSkillsDevelopmentPlan(scorecard, qualityData) {
    return {
      coreSkills: ['Active Listening', 'Objection Handling', 'Closing Techniques'],
      currentLevel: this.assessSkillLevel(scorecard),
      targetLevel: 'Advanced',
      developmentPath: [
        { skill: 'Active Listening', currentScore: 3.2, targetScore: 4.0, timeframe: '4 weeks' },
        { skill: 'Objection Handling', currentScore: 2.8, targetScore: 3.5, timeframe: '6 weeks' },
        { skill: 'Closing Techniques', currentScore: 3.0, targetScore: 3.8, timeframe: '8 weeks' }
      ]
    };
  }

  assessSkillLevel(scorecard) {
    const qualityScore = parseFloat(scorecard.avgQualityScore);
    if (qualityScore >= 4.0) return 'Advanced';
    if (qualityScore >= 3.5) return 'Intermediate';
    if (qualityScore >= 3.0) return 'Developing';
    return 'Beginner';
  }
}

module.exports = new CallAnalyticsService();