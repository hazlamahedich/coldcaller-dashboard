/**
 * SIP Analytics Service
 * Provides comprehensive analytics for SIP call logs and configurations
 */

const { Op, Sequelize } = require('sequelize');
const sequelize = require('../database/config/database');
const SipCallLog = require('../database/models/SipCallLog');
const SipConfiguration = require('../database/models/SipConfiguration');
const NodeCache = require('node-cache');

class SipAnalyticsService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache
  }
  
  /**
   * Get comprehensive call statistics
   */
  async getCallStatistics(configurationId = null, timeRange = '7d') {
    const cacheKey = `stats_${configurationId}_${timeRange}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    const timeRangeObj = this.parseTimeRange(timeRange);
    
    try {
      const whereClause = {
        start_time: {
          [Op.between]: [timeRangeObj.start, timeRangeObj.end]
        }
      };
      
      if (configurationId) {
        whereClause.sip_configuration_id = configurationId;
      }
      
      // Basic statistics
      const basicStats = await SipCallLog.findOne({
        where: whereClause,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalCalls'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status IN ('answered', 'connected', 'ended') THEN 1 END")), 'successfulCalls'],
          [sequelize.fn('AVG', sequelize.col('duration')), 'averageDuration'],
          [sequelize.fn('AVG', sequelize.col('mos_score')), 'averageMos'],
          [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost']
        ],
        raw: true
      });
      
      // Hourly call volume
      const hourlyVolume = await this.getHourlyCallVolume(whereClause);
      
      // Peak hours analysis
      const peakHours = await this.getPeakHours(whereClause);
      
      // Cost analysis
      const costAnalysis = await this.getCostAnalysis(whereClause);
      
      // Call status distribution
      const statusDistribution = await SipCallLog.findAll({
        where: whereClause,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });
      
      // Call outcome distribution
      const outcomeDistribution = await SipCallLog.findAll({
        where: { ...whereClause, outcome: { [Op.not]: null } },
        attributes: [
          'outcome',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['outcome'],
        raw: true
      });
      
      // Quality distribution
      const qualityDistribution = await SipCallLog.findAll({
        where: { ...whereClause, quality_rating: { [Op.not]: null } },
        attributes: [
          'quality_rating',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['quality_rating'],
        raw: true
      });
      
      // Duration by outcome
      const durationByOutcome = await SipCallLog.findAll({
        where: { ...whereClause, outcome: { [Op.not]: null } },
        attributes: [
          'outcome',
          [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['outcome'],
        raw: true
      });
      
      const result = {
        timeRange,
        period: {
          start: timeRangeObj.start,
          end: timeRangeObj.end
        },
        basic: {
          totalCalls: parseInt(basicStats.totalCalls) || 0,
          successfulCalls: parseInt(basicStats.successfulCalls) || 0,
          successRate: this.calculateSuccessRate(basicStats),
          averageDuration: parseFloat(basicStats.averageDuration) || 0,
          averageMos: parseFloat(basicStats.averageMos) || 0,
          totalCost: parseFloat(basicStats.totalCost) || 0
        },
        distributions: {
          status: this.formatDistribution(statusDistribution),
          outcome: this.formatDistribution(outcomeDistribution),
          quality: this.formatDistribution(qualityDistribution, 'quality_rating')
        },
        trends: {
          hourly: hourlyVolume,
          peakHours: peakHours,
          durationByOutcome: this.formatDurationByOutcome(durationByOutcome)
        },
        cost: costAnalysis,
        generatedAt: new Date().toISOString()
      };
      
      // Cache for 5 minutes
      this.cache.set(cacheKey, result, 300);
      
      return result;
    } catch (error) {
      console.error('Error generating call statistics:', error);
      throw error;
    }
  }
  
  /**
   * Get quality metrics and analysis
   */
  async getQualityMetrics(configurationId = null, timeRange = '7d') {
    const cacheKey = `qualityMetrics_${configurationId}_${timeRange}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    const timeRangeObj = this.parseTimeRange(timeRange);
    
    try {
      const whereClause = {
        start_time: {
          [Op.between]: [timeRangeObj.start, timeRangeObj.end]
        },
        mos_score: { [Op.not]: null }
      };
      
      if (configurationId) {
        whereClause.sip_configuration_id = configurationId;
      }
      
      // MOS distribution
      const mosDistribution = await SipCallLog.findAll({
        where: whereClause,
        attributes: [
          [sequelize.fn('ROUND', sequelize.col('mos_score'), 1), 'mosRange'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
        ],
        group: [sequelize.fn('ROUND', sequelize.col('mos_score'), 1)],
        order: [[sequelize.fn('ROUND', sequelize.col('mos_score'), 1), 'DESC']],
        raw: true
      });
      
      // Network quality trends (hourly)
      const qualityTrends = await this.getQualityTrends(whereClause);
      
      // Quality issues analysis
      const qualityIssues = await this.analyzeQualityIssues(whereClause);
      
      // Codec performance
      const codecPerformance = await SipCallLog.findAll({
        where: { ...whereClause, audio_codec: { [Op.not]: null } },
        attributes: [
          'audio_codec',
          [sequelize.fn('COUNT', sequelize.col('id')), 'callCount'],
          [sequelize.fn('AVG', sequelize.col('mos_score')), 'avgMos'],
          [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
        ],
        group: ['audio_codec'],
        order: [[sequelize.fn('AVG', sequelize.col('mos_score')), 'DESC']],
        raw: true
      });
      
      const result = {
        timeRange,
        mosStatistics: {
          distribution: mosDistribution,
          average: mosDistribution.reduce((sum, item) => 
            sum + (parseFloat(item.mosRange) * parseInt(item.count)), 0) / 
            mosDistribution.reduce((sum, item) => sum + parseInt(item.count), 0) || 0
        },
        trends: qualityTrends,
        issues: qualityIssues,
        codecPerformance: codecPerformance.map(codec => ({
          codec: codec.audio_codec,
          callCount: parseInt(codec.callCount),
          avgMos: parseFloat(codec.avgMos),
          avgDuration: parseFloat(codec.avgDuration)
        })),
        recommendations: this.generateQualityRecommendations(qualityIssues, codecPerformance),
        generatedAt: new Date().toISOString()
      };
      
      this.cache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error('Error generating quality metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get configuration performance comparison
   */
  async getConfigurationComparison(timeRange = '30d') {
    const cacheKey = `configComparison_${timeRange}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const timeRangeObj = this.parseTimeRange(timeRange);
      
      const comparison = await SipCallLog.findAll({
        where: {
          start_time: {
            [Op.between]: [timeRangeObj.start, timeRangeObj.end]
          }
        },
        attributes: [
          'sip_configuration_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalCalls'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status IN ('answered', 'connected', 'ended') THEN 1 END")), 'successfulCalls'],
          [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration'],
          [sequelize.fn('AVG', sequelize.col('mos_score')), 'avgMos'],
          [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost']
        ],
        group: ['sip_configuration_id'],
        include: [{
          model: SipConfiguration,
          as: 'sipConfiguration',
          attributes: ['id', 'name', 'provider', 'server']
        }],
        raw: false
      });
      
      const result = comparison.map(config => {
        const totalCalls = parseInt(config.get('totalCalls')) || 0;
        const successfulCalls = parseInt(config.get('successfulCalls')) || 0;
        
        return {
          configurationId: config.get('sip_configuration_id'),
          configuration: {
            id: config.sipConfiguration.id,
            name: config.sipConfiguration.name,
            provider: config.sipConfiguration.provider,
            server: config.sipConfiguration.server
          },
          metrics: {
            totalCalls,
            successfulCalls,
            successRate: totalCalls > 0 ? (successfulCalls / totalCalls * 100) : 0,
            avgDuration: parseFloat(config.get('avgDuration')) || 0,
            avgMos: parseFloat(config.get('avgMos')) || 0,
            totalCost: parseFloat(config.get('totalCost')) || 0,
            costPerCall: totalCalls > 0 ? (parseFloat(config.get('totalCost')) || 0) / totalCalls : 0
          }
        };
      }).sort((a, b) => b.metrics.successRate - a.metrics.successRate);
      
      this.cache.set(cacheKey, result, 600); // Cache for 10 minutes
      return result;
    } catch (error) {
      console.error('Error generating configuration comparison:', error);
      throw error;
    }
  }
  
  /**
   * Get system health assessment
   */
  async assessSystemHealth() {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Get recent call statistics
      const recentStats = await this.getCallStatistics(null, '24h');
      
      // Get active configurations
      const activeConfigs = await SipConfiguration.findAll({
        where: { active: true }
      });
      
      // Get recent errors
      const recentErrors = await SipCallLog.count({
        where: {
          status: 'failed',
          start_time: { [Op.gte]: last24h }
        }
      });
      
      // Calculate health score
      const totalCalls = parseInt(recentStats.basic.totalCalls) || 0;
      const successfulCalls = parseInt(recentStats.basic.successfulCalls) || 0;
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) : 1;
      const avgMos = parseFloat(recentStats.basic.averageMos) || 0;
      const errorRate = totalCalls > 0 ? (recentErrors / totalCalls) : 0;
      
      // Health score calculation (0-100)
      let healthScore = 100;
      healthScore *= successRate; // Success rate impact
      healthScore *= Math.min(avgMos / 4.0, 1); // Quality impact (normalize MOS to 0-1)
      healthScore *= (1 - errorRate); // Error rate impact
      
      // Determine health status
      let status = 'excellent';
      if (healthScore < 90) status = 'good';
      if (healthScore < 75) status = 'fair';
      if (healthScore < 60) status = 'poor';
      if (healthScore < 40) status = 'critical';
      
      const issues = [];
      const recommendations = [];
      
      // Identify issues and recommendations
      if (successRate < 0.9) {
        issues.push('Low call success rate');
        recommendations.push('Check SIP server connectivity and credentials');
      }
      
      if (avgMos < 3.5) {
        issues.push('Poor audio quality');
        recommendations.push('Check network connectivity and consider codec optimization');
      }
      
      if (errorRate > 0.1) {
        issues.push('High error rate');
        recommendations.push('Review error logs and SIP configuration');
      }
      
      if (activeConfigs.length === 0) {
        issues.push('No active SIP configurations');
        recommendations.push('Configure at least one SIP provider');
      }
      
      return {
        status,
        score: Math.round(healthScore),
        metrics: {
          totalCalls,
          successRate: Math.round(successRate * 100),
          avgMos: Math.round(avgMos * 10) / 10,
          errorRate: Math.round(errorRate * 100),
          activeConfigurations: activeConfigs.length
        },
        issues,
        recommendations,
        lastAssessment: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error assessing system health:', error);
      return {
        status: 'unknown',
        score: 0,
        error: error.message,
        lastAssessment: new Date().toISOString()
      };
    }
  }
  
  // Helper Methods
  
  parseTimeRange(timeRange) {
    const end = new Date();
    let start;
    
    switch (timeRange) {
      case '1h':
        start = new Date(end.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return { start, end };
  }
  
  timeRangeInDays(timeRange) {
    switch (timeRange) {
      case '1h': return 1;
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  }
  
  calculateSuccessRate(stats) {
    const total = parseInt(stats.totalCalls) || 0;
    const successful = parseInt(stats.successfulCalls) || 0;
    return total > 0 ? Math.round((successful / total) * 100) : 0;
  }
  
  formatDistribution(data, keyField = null) {
    return data.map(item => ({
      label: item[keyField || Object.keys(item)[0]],
      value: parseInt(item.count || item.value || 0),
      percentage: 0 // Will be calculated by frontend
    }));
  }
  
  formatDurationByOutcome(data) {
    return data.map(item => ({
      outcome: item.outcome,
      averageDuration: Math.round(parseFloat(item.avgDuration) || 0),
      callCount: parseInt(item.count) || 0
    }));
  }
  
  async getHourlyCallVolume(whereClause) {
    return await SipCallLog.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('HOUR', sequelize.col('start_time')), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'callCount'],
        [sequelize.fn('AVG', sequelize.col('mos_score')), 'avgQuality']
      ],
      group: [sequelize.fn('HOUR', sequelize.col('start_time'))],
      order: [[sequelize.fn('HOUR', sequelize.col('start_time')), 'ASC']],
      raw: true
    });
  }
  
  async getPeakHours(whereClause) {
    const hourlyData = await this.getHourlyCallVolume(whereClause);
    return hourlyData
      .sort((a, b) => parseInt(b.callCount) - parseInt(a.callCount))
      .slice(0, 3)
      .map(item => ({
        hour: parseInt(item.hour),
        callCount: parseInt(item.callCount),
        avgQuality: parseFloat(item.avgQuality) || 0
      }));
  }
  
  async getCostAnalysis(whereClause) {
    const costData = await SipCallLog.findAll({
      where: { ...whereClause, cost: { [Op.not]: null } },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost'],
        [sequelize.fn('AVG', sequelize.col('cost')), 'avgCostPerCall'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'paidCalls']
      ],
      raw: true
    });
    
    const result = costData[0] || {};
    
    return {
      totalCost: parseFloat(result.totalCost) || 0,
      avgCostPerCall: parseFloat(result.avgCostPerCall) || 0,
      paidCalls: parseInt(result.paidCalls) || 0
    };
  }
  
  async getQualityTrends(whereClause) {
    return await SipCallLog.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('start_time')), 'date'],
        [sequelize.fn('AVG', sequelize.col('mos_score')), 'avgMos'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'callCount']
      ],
      group: [sequelize.fn('DATE', sequelize.col('start_time'))],
      order: [[sequelize.fn('DATE', sequelize.col('start_time')), 'ASC']],
      raw: true
    });
  }
  
  async analyzeQualityIssues(whereClause) {
    // Find calls with poor quality (MOS < 3.0)
    const poorQualityCalls = await SipCallLog.count({
      where: { ...whereClause, mos_score: { [Op.lt]: 3.0 } }
    });
    
    // Find calls with high latency (simplified check)
    const highLatencyCalls = await SipCallLog.count({
      where: {
        ...whereClause,
        error_message: { [Op.like]: '%latency%' }
      }
    });
    
    return {
      poorQualityCalls,
      highLatencyCalls,
      totalAnalyzed: await SipCallLog.count({ where: whereClause })
    };
  }
  
  generateQualityRecommendations(issues, codecPerformance) {
    const recommendations = [];
    
    if (issues.poorQualityCalls > 0) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        title: 'Improve Audio Quality',
        description: `${issues.poorQualityCalls} calls had poor audio quality (MOS < 3.0)`,
        actions: [
          'Check network connectivity',
          'Consider upgrading bandwidth',
          'Review codec selection'
        ]
      });
    }
    
    if (codecPerformance.length > 0) {
      const bestCodec = codecPerformance[0];
      if (bestCodec.avgMos > 4.0) {
        recommendations.push({
          type: 'codec',
          priority: 'medium',
          title: 'Optimize Codec Usage',
          description: `${bestCodec.codec} codec shows best performance with MOS ${bestCodec.avgMos.toFixed(1)}`,
          actions: [
            `Prioritize ${bestCodec.codec} codec in SIP configurations`,
            'Test codec performance across different networks'
          ]
        });
      }
    }
    
    return recommendations;
  }
  
  async getAverageQuality(timeRange) {
    const timeRangeObj = this.parseTimeRange(timeRange);
    
    const result = await SipCallLog.findOne({
      where: {
        start_time: {
          [Op.between]: [timeRangeObj.start, timeRangeObj.end]
        },
        mos_score: { [Op.not]: null }
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('mos_score')), 'averageMos'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCalls']
      ],
      raw: true
    });
    
    return result || { averageMos: 0, totalCalls: 0 };
  }
}

module.exports = new SipAnalyticsService();