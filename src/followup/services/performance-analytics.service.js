const { Followup, Task, AutomationRule, User, Lead, Call } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const EventEmitter = require('events');

/**
 * Performance Analytics Service
 * Provides comprehensive analytics and performance tracking for follow-ups and tasks
 */
class PerformanceAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.logger = require('../../utils/logger');
  }

  /**
   * Get follow-up performance metrics
   */
  async getFollowupPerformanceMetrics(options = {}) {
    try {
      const {
        userId,
        teamId,
        startDate = moment().subtract(30, 'days').toDate(),
        endDate = new Date(),
        groupBy = 'day' // day, week, month
      } = options;

      const where = {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (userId) where.userId = userId;
      if (teamId) where.teamId = teamId;

      // Base metrics
      const [
        totalFollowups,
        completedFollowups,
        overdueFollowups,
        cancelledFollowups,
        averageCompletionTime,
        completionRateByType,
        outcomeDistribution,
        performanceTrend
      ] = await Promise.all([
        // Total follow-ups
        Followup.count({ where }),

        // Completed follow-ups
        Followup.count({
          where: { ...where, status: 'completed' }
        }),

        // Overdue follow-ups
        Followup.count({
          where: {
            ...where,
            scheduledFor: { [Op.lt]: new Date() },
            status: { [Op.notIn]: ['completed', 'cancelled'] }
          }
        }),

        // Cancelled follow-ups
        Followup.count({
          where: { ...where, status: 'cancelled' }
        }),

        // Average completion time
        this.calculateAverageCompletionTime(where),

        // Completion rate by type
        this.getCompletionRateByType(where),

        // Outcome distribution
        this.getOutcomeDistribution(where),

        // Performance trend over time
        this.getPerformanceTrend(where, groupBy)
      ]);

      // Calculate derived metrics
      const completionRate = totalFollowups > 0 ? (completedFollowups / totalFollowups * 100).toFixed(2) : 0;
      const overdueRate = totalFollowups > 0 ? (overdueFollowups / totalFollowups * 100).toFixed(2) : 0;
      const cancellationRate = totalFollowups > 0 ? (cancelledFollowups / totalFollowups * 100).toFixed(2) : 0;

      return {
        period: {
          startDate,
          endDate,
          durationDays: moment(endDate).diff(moment(startDate), 'days')
        },
        metrics: {
          totalFollowups,
          completedFollowups,
          overdueFollowups,
          cancelledFollowups,
          completionRate: parseFloat(completionRate),
          overdueRate: parseFloat(overdueRate),
          cancellationRate: parseFloat(cancellationRate),
          averageCompletionTimeHours: averageCompletionTime
        },
        distributions: {
          completionRateByType,
          outcomeDistribution
        },
        trends: {
          performance: performanceTrend
        }
      };

    } catch (error) {
      this.logger.error('Error getting follow-up performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get task performance metrics
   */
  async getTaskPerformanceMetrics(options = {}) {
    try {
      const {
        userId,
        teamId,
        startDate = moment().subtract(30, 'days').toDate(),
        endDate = new Date(),
        groupBy = 'day'
      } = options;

      const where = {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (userId) where.assignedTo = userId;
      if (teamId) where.teamId = teamId;

      const [
        totalTasks,
        completedTasks,
        overdueTasks,
        inProgressTasks,
        averageCompletionTime,
        averageEstimationAccuracy,
        productivityByPriority,
        taskTypeDistribution,
        performanceTrend
      ] = await Promise.all([
        // Total tasks
        Task.count({ where }),

        // Completed tasks
        Task.count({
          where: { ...where, status: 'completed' }
        }),

        // Overdue tasks
        Task.count({
          where: {
            ...where,
            dueDate: { [Op.lt]: new Date() },
            status: { [Op.notIn]: ['completed', 'cancelled'] }
          }
        }),

        // In progress tasks
        Task.count({
          where: { ...where, status: 'in_progress' }
        }),

        // Average completion time
        this.calculateTaskAverageCompletionTime(where),

        // Estimation accuracy
        this.calculateEstimationAccuracy(where),

        // Productivity by priority
        this.getProductivityByPriority(where),

        // Task type distribution
        this.getTaskTypeDistribution(where),

        // Task performance trend
        this.getTaskPerformanceTrend(where, groupBy)
      ]);

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(2) : 0;
      const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks * 100).toFixed(2) : 0;

      return {
        period: {
          startDate,
          endDate,
          durationDays: moment(endDate).diff(moment(startDate), 'days')
        },
        metrics: {
          totalTasks,
          completedTasks,
          overdueTasks,
          inProgressTasks,
          completionRate: parseFloat(completionRate),
          overdueRate: parseFloat(overdueRate),
          averageCompletionTimeHours: averageCompletionTime,
          estimationAccuracy: averageEstimationAccuracy
        },
        distributions: {
          productivityByPriority,
          taskTypeDistribution
        },
        trends: {
          performance: performanceTrend
        }
      };

    } catch (error) {
      this.logger.error('Error getting task performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get automation rule effectiveness
   */
  async getAutomationRuleEffectiveness(options = {}) {
    try {
      const {
        ruleId,
        startDate = moment().subtract(30, 'days').toDate(),
        endDate = new Date()
      } = options;

      const where = {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (ruleId) where.id = ruleId;

      const rules = await AutomationRule.findAll({
        where,
        include: [
          {
            model: Followup,
            as: 'followups',
            where: {
              createdAt: {
                [Op.between]: [startDate, endDate]
              }
            },
            required: false
          }
        ]
      });

      const effectiveness = await Promise.all(
        rules.map(async (rule) => {
          const followups = rule.followups || [];
          const totalExecutions = rule.executionCount;
          const successfulExecutions = rule.successCount;
          const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100) : 0;

          // Calculate follow-up completion rate for this rule
          const completedFollowups = followups.filter(f => f.status === 'completed').length;
          const followupCompletionRate = followups.length > 0 ? (completedFollowups / followups.length * 100) : 0;

          // Calculate average time between creation and completion
          const completedFollowupsWithTimes = followups.filter(f => 
            f.status === 'completed' && f.completedAt && f.createdAt
          );
          
          const averageCompletionTime = completedFollowupsWithTimes.length > 0 
            ? completedFollowupsWithTimes.reduce((sum, f) => {
                return sum + moment(f.completedAt).diff(moment(f.createdAt), 'hours');
              }, 0) / completedFollowupsWithTimes.length
            : 0;

          // ROI calculation (simplified)
          const estimatedTimesSaved = successfulExecutions * 0.5; // Assume 30 minutes saved per execution
          const roi = estimatedTimesSaved > 0 ? ((estimatedTimesSaved * 50) - 100) / 100 : 0; // $50/hour value

          return {
            ruleId: rule.id,
            ruleName: rule.name,
            triggerEvent: rule.triggerEvent,
            isActive: rule.isActive,
            metrics: {
              totalExecutions,
              successfulExecutions,
              successRate: parseFloat(successRate.toFixed(2)),
              followupsCreated: followups.length,
              followupCompletionRate: parseFloat(followupCompletionRate.toFixed(2)),
              averageCompletionTimeHours: parseFloat(averageCompletionTime.toFixed(2)),
              estimatedTimesSavedHours: estimatedTimesSaved,
              estimatedROI: parseFloat(roi.toFixed(2))
            },
            lastExecuted: rule.lastExecuted,
            createdAt: rule.createdAt
          };
        })
      );

      // Overall automation effectiveness
      const totalRules = effectiveness.length;
      const activeRules = effectiveness.filter(r => r.isActive).length;
      const avgSuccessRate = effectiveness.length > 0 
        ? effectiveness.reduce((sum, r) => sum + r.metrics.successRate, 0) / effectiveness.length 
        : 0;
      const totalFollowupsCreated = effectiveness.reduce((sum, r) => sum + r.metrics.followupsCreated, 0);
      const totalTimeSaved = effectiveness.reduce((sum, r) => sum + r.metrics.estimatedTimesSavedHours, 0);

      return {
        period: {
          startDate,
          endDate
        },
        summary: {
          totalRules,
          activeRules,
          averageSuccessRate: parseFloat(avgSuccessRate.toFixed(2)),
          totalFollowupsCreated,
          totalTimeSavedHours: parseFloat(totalTimeSaved.toFixed(2)),
          totalEstimatedROI: effectiveness.reduce((sum, r) => sum + r.metrics.estimatedROI, 0)
        },
        rules: effectiveness.sort((a, b) => b.metrics.successRate - a.metrics.successRate)
      };

    } catch (error) {
      this.logger.error('Error getting automation rule effectiveness:', error);
      throw error;
    }
  }

  /**
   * Get user productivity analysis
   */
  async getUserProductivityAnalysis(userId, options = {}) {
    try {
      const {
        startDate = moment().subtract(30, 'days').toDate(),
        endDate = new Date(),
        compareWithTeam = false,
        teamId
      } = options;

      const [
        followupMetrics,
        taskMetrics,
        timeDistribution,
        productivityScore,
        comparison
      ] = await Promise.all([
        // User follow-up metrics
        this.getFollowupPerformanceMetrics({ userId, startDate, endDate }),

        // User task metrics
        this.getTaskPerformanceMetrics({ userId, startDate, endDate }),

        // Time distribution analysis
        this.getTimeDistributionAnalysis(userId, startDate, endDate),

        // Overall productivity score
        this.calculateProductivityScore(userId, startDate, endDate),

        // Team comparison (if requested)
        compareWithTeam && teamId 
          ? this.getTeamComparisonMetrics(userId, teamId, startDate, endDate)
          : null
      ]);

      return {
        userId,
        period: {
          startDate,
          endDate,
          durationDays: moment(endDate).diff(moment(startDate), 'days')
        },
        followups: followupMetrics.metrics,
        tasks: taskMetrics.metrics,
        timeDistribution,
        productivityScore,
        comparison,
        insights: this.generateProductivityInsights({
          followups: followupMetrics.metrics,
          tasks: taskMetrics.metrics,
          timeDistribution,
          productivityScore
        })
      };

    } catch (error) {
      this.logger.error('Error getting user productivity analysis:', error);
      throw error;
    }
  }

  /**
   * Get A/B test results for follow-up strategies
   */
  async getABTestResults(options = {}) {
    try {
      const {
        testType = 'automation_rule', // 'automation_rule', 'followup_sequence'
        testId,
        startDate = moment().subtract(30, 'days').toDate(),
        endDate = new Date()
      } = options;

      if (testType === 'automation_rule') {
        return await this.getAutomationRuleABTest(testId, startDate, endDate);
      } else if (testType === 'followup_sequence') {
        return await this.getFollowupSequenceABTest(testId, startDate, endDate);
      }

      throw new Error(`Unsupported test type: ${testType}`);

    } catch (error) {
      this.logger.error('Error getting A/B test results:', error);
      throw error;
    }
  }

  /**
   * Calculate average completion time for follow-ups
   */
  async calculateAverageCompletionTime(where) {
    const completedFollowups = await Followup.findAll({
      where: {
        ...where,
        status: 'completed',
        scheduledFor: { [Op.not]: null },
        completedAt: { [Op.not]: null }
      },
      attributes: ['scheduledFor', 'completedAt']
    });

    if (completedFollowups.length === 0) return 0;

    const totalHours = completedFollowups.reduce((sum, followup) => {
      const scheduled = moment(followup.scheduledFor);
      const completed = moment(followup.completedAt);
      return sum + Math.abs(completed.diff(scheduled, 'hours', true));
    }, 0);

    return parseFloat((totalHours / completedFollowups.length).toFixed(2));
  }

  /**
   * Calculate average completion time for tasks
   */
  async calculateTaskAverageCompletionTime(where) {
    const completedTasks = await Task.findAll({
      where: {
        ...where,
        status: 'completed',
        startedAt: { [Op.not]: null },
        completedAt: { [Op.not]: null }
      },
      attributes: ['startedAt', 'completedAt']
    });

    if (completedTasks.length === 0) return 0;

    const totalHours = completedTasks.reduce((sum, task) => {
      const started = moment(task.startedAt);
      const completed = moment(task.completedAt);
      return sum + completed.diff(started, 'hours', true);
    }, 0);

    return parseFloat((totalHours / completedTasks.length).toFixed(2));
  }

  /**
   * Calculate estimation accuracy for tasks
   */
  async calculateEstimationAccuracy(where) {
    const completedTasks = await Task.findAll({
      where: {
        ...where,
        status: 'completed',
        estimatedDuration: { [Op.not]: null },
        actualDuration: { [Op.not]: null },
        actualDuration: { [Op.gt]: 0 }
      },
      attributes: ['estimatedDuration', 'actualDuration']
    });

    if (completedTasks.length === 0) return 0;

    const accuracyScores = completedTasks.map(task => {
      const estimated = task.estimatedDuration;
      const actual = task.actualDuration;
      const ratio = Math.min(estimated, actual) / Math.max(estimated, actual);
      return ratio * 100;
    });

    const averageAccuracy = accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length;
    return parseFloat(averageAccuracy.toFixed(2));
  }

  /**
   * Get completion rate by follow-up type
   */
  async getCompletionRateByType(where) {
    const results = await Followup.findAll({
      where,
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', '*'), 'total'],
        [require('sequelize').fn('COUNT', require('sequelize').literal("CASE WHEN status = 'completed' THEN 1 END")), 'completed']
      ],
      group: ['type']
    });

    return results.map(result => ({
      type: result.type,
      total: parseInt(result.dataValues.total),
      completed: parseInt(result.dataValues.completed),
      completionRate: parseFloat(((parseInt(result.dataValues.completed) / parseInt(result.dataValues.total)) * 100).toFixed(2))
    }));
  }

  /**
   * Get outcome distribution
   */
  async getOutcomeDistribution(where) {
    const results = await Followup.findAll({
      where: {
        ...where,
        outcome: { [Op.not]: null }
      },
      attributes: [
        'outcome',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: ['outcome']
    });

    const total = results.reduce((sum, result) => sum + parseInt(result.dataValues.count), 0);

    return results.map(result => ({
      outcome: result.outcome,
      count: parseInt(result.dataValues.count),
      percentage: parseFloat(((parseInt(result.dataValues.count) / total) * 100).toFixed(2))
    }));
  }

  /**
   * Get productivity by priority
   */
  async getProductivityByPriority(where) {
    const results = await Task.findAll({
      where,
      attributes: [
        'priority',
        [require('sequelize').fn('COUNT', '*'), 'total'],
        [require('sequelize').fn('COUNT', require('sequelize').literal("CASE WHEN status = 'completed' THEN 1 END")), 'completed']
      ],
      group: ['priority']
    });

    return results.map(result => ({
      priority: result.priority,
      total: parseInt(result.dataValues.total),
      completed: parseInt(result.dataValues.completed),
      completionRate: parseFloat(((parseInt(result.dataValues.completed) / parseInt(result.dataValues.total)) * 100).toFixed(2))
    }));
  }

  /**
   * Get task type distribution
   */
  async getTaskTypeDistribution(where) {
    const results = await Task.findAll({
      where,
      attributes: [
        'type',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: ['type']
    });

    const total = results.reduce((sum, result) => sum + parseInt(result.dataValues.count), 0);

    return results.map(result => ({
      type: result.type,
      count: parseInt(result.dataValues.count),
      percentage: parseFloat(((parseInt(result.dataValues.count) / total) * 100).toFixed(2))
    }));
  }

  /**
   * Get performance trend over time
   */
  async getPerformanceTrend(where, groupBy) {
    const dateFormat = {
      'day': '%Y-%m-%d',
      'week': '%Y-%u',
      'month': '%Y-%m'
    }[groupBy] || '%Y-%m-%d';

    const results = await Followup.findAll({
      where,
      attributes: [
        [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat), 'period'],
        [require('sequelize').fn('COUNT', '*'), 'total'],
        [require('sequelize').fn('COUNT', require('sequelize').literal("CASE WHEN status = 'completed' THEN 1 END")), 'completed']
      ],
      group: [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat)],
      order: [[require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat), 'ASC']]
    });

    return results.map(result => ({
      period: result.dataValues.period,
      total: parseInt(result.dataValues.total),
      completed: parseInt(result.dataValues.completed),
      completionRate: parseFloat(((parseInt(result.dataValues.completed) / parseInt(result.dataValues.total)) * 100).toFixed(2))
    }));
  }

  /**
   * Get task performance trend over time
   */
  async getTaskPerformanceTrend(where, groupBy) {
    const dateFormat = {
      'day': '%Y-%m-%d',
      'week': '%Y-%u',
      'month': '%Y-%m'
    }[groupBy] || '%Y-%m-%d';

    const results = await Task.findAll({
      where,
      attributes: [
        [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat), 'period'],
        [require('sequelize').fn('COUNT', '*'), 'total'],
        [require('sequelize').fn('COUNT', require('sequelize').literal("CASE WHEN status = 'completed' THEN 1 END")), 'completed']
      ],
      group: [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat)],
      order: [[require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat), 'ASC']]
    });

    return results.map(result => ({
      period: result.dataValues.period,
      total: parseInt(result.dataValues.total),
      completed: parseInt(result.dataValues.completed),
      completionRate: parseFloat(((parseInt(result.dataValues.completed) / parseInt(result.dataValues.total)) * 100).toFixed(2))
    }));
  }

  /**
   * Get time distribution analysis for a user
   */
  async getTimeDistributionAnalysis(userId, startDate, endDate) {
    const tasks = await Task.findAll({
      where: {
        assignedTo: userId,
        status: 'completed',
        startedAt: { [Op.not]: null },
        completedAt: { [Op.not]: null },
        completedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['type', 'priority', 'startedAt', 'completedAt', 'estimatedDuration', 'actualDuration']
    });

    const distribution = {
      byType: {},
      byPriority: {},
      totalTimeSpent: 0,
      averageTaskTime: 0
    };

    let totalMinutes = 0;

    tasks.forEach(task => {
      const actualMinutes = task.actualDuration || 
        moment(task.completedAt).diff(moment(task.startedAt), 'minutes');
      
      totalMinutes += actualMinutes;

      // By type
      if (!distribution.byType[task.type]) {
        distribution.byType[task.type] = { time: 0, count: 0 };
      }
      distribution.byType[task.type].time += actualMinutes;
      distribution.byType[task.type].count += 1;

      // By priority
      if (!distribution.byPriority[task.priority]) {
        distribution.byPriority[task.priority] = { time: 0, count: 0 };
      }
      distribution.byPriority[task.priority].time += actualMinutes;
      distribution.byPriority[task.priority].count += 1;
    });

    distribution.totalTimeSpent = totalMinutes;
    distribution.averageTaskTime = tasks.length > 0 ? totalMinutes / tasks.length : 0;

    // Convert to percentages and hours
    Object.keys(distribution.byType).forEach(type => {
      const data = distribution.byType[type];
      data.hours = parseFloat((data.time / 60).toFixed(2));
      data.percentage = parseFloat(((data.time / totalMinutes) * 100).toFixed(2));
      data.averageTime = parseFloat((data.time / data.count).toFixed(2));
    });

    Object.keys(distribution.byPriority).forEach(priority => {
      const data = distribution.byPriority[priority];
      data.hours = parseFloat((data.time / 60).toFixed(2));
      data.percentage = parseFloat(((data.time / totalMinutes) * 100).toFixed(2));
      data.averageTime = parseFloat((data.time / data.count).toFixed(2));
    });

    distribution.totalTimeSpentHours = parseFloat((totalMinutes / 60).toFixed(2));
    distribution.averageTaskTimeMinutes = parseFloat(distribution.averageTaskTime.toFixed(2));

    return distribution;
  }

  /**
   * Calculate overall productivity score for a user
   */
  async calculateProductivityScore(userId, startDate, endDate) {
    try {
      const [followupMetrics, taskMetrics] = await Promise.all([
        this.getFollowupPerformanceMetrics({ userId, startDate, endDate }),
        this.getTaskPerformanceMetrics({ userId, startDate, endDate })
      ]);

      // Weighted scoring system (out of 100)
      const weights = {
        followupCompletion: 25,
        taskCompletion: 25,
        timeliness: 20,
        efficiency: 15,
        quality: 15
      };

      const scores = {
        followupCompletion: Math.min(followupMetrics.metrics.completionRate, 100),
        taskCompletion: Math.min(taskMetrics.metrics.completionRate, 100),
        timeliness: Math.max(0, 100 - (followupMetrics.metrics.overdueRate + taskMetrics.metrics.overdueRate) / 2),
        efficiency: Math.min(100, taskMetrics.metrics.estimationAccuracy || 70),
        quality: 80 // Placeholder - would need quality metrics
      };

      const overallScore = Object.keys(weights).reduce((total, key) => {
        return total + (scores[key] * weights[key] / 100);
      }, 0);

      return {
        overallScore: parseFloat(overallScore.toFixed(2)),
        breakdown: scores,
        weights,
        grade: this.getPerformanceGrade(overallScore)
      };

    } catch (error) {
      this.logger.error('Error calculating productivity score:', error);
      return {
        overallScore: 0,
        breakdown: {},
        weights: {},
        grade: 'N/A'
      };
    }
  }

  /**
   * Generate productivity insights
   */
  generateProductivityInsights(metrics) {
    const insights = [];

    // Follow-up insights
    if (metrics.followups.completionRate < 70) {
      insights.push({
        type: 'warning',
        category: 'followups',
        message: 'Follow-up completion rate is below target (70%). Consider reviewing scheduling and prioritization.',
        severity: 'medium'
      });
    }

    if (metrics.followups.overdueRate > 15) {
      insights.push({
        type: 'alert',
        category: 'followups',
        message: 'High overdue rate detected. Review workload distribution and deadline management.',
        severity: 'high'
      });
    }

    // Task insights
    if (metrics.tasks.completionRate > 85) {
      insights.push({
        type: 'success',
        category: 'tasks',
        message: 'Excellent task completion rate! Keep up the good work.',
        severity: 'low'
      });
    }

    if (metrics.tasks.estimationAccuracy < 60) {
      insights.push({
        type: 'improvement',
        category: 'tasks',
        message: 'Time estimation accuracy could be improved. Consider tracking actual vs estimated time more closely.',
        severity: 'medium'
      });
    }

    // Time distribution insights
    if (metrics.timeDistribution && metrics.timeDistribution.byPriority) {
      const urgentTime = metrics.timeDistribution.byPriority.urgent?.percentage || 0;
      if (urgentTime > 40) {
        insights.push({
          type: 'warning',
          category: 'time_management',
          message: 'High percentage of time spent on urgent tasks. Consider better planning to reduce reactive work.',
          severity: 'medium'
        });
      }
    }

    // Productivity score insights
    if (metrics.productivityScore?.overallScore < 60) {
      insights.push({
        type: 'improvement',
        category: 'overall',
        message: 'Overall productivity score suggests room for improvement. Focus on completion rates and timeliness.',
        severity: 'high'
      });
    }

    return insights;
  }

  /**
   * Get performance grade based on score
   */
  getPerformanceGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'C+';
    if (score >= 65) return 'C';
    if (score >= 60) return 'D+';
    if (score >= 55) return 'D';
    return 'F';
  }

  /**
   * Get real-time performance dashboard data
   */
  async getPerformanceDashboard(userId, options = {}) {
    try {
      const today = moment().startOf('day').toDate();
      const tomorrow = moment().add(1, 'day').startOf('day').toDate();
      const thisWeek = moment().startOf('week').toDate();
      const thisMonth = moment().startOf('month').toDate();

      const [
        todayStats,
        weekStats,
        monthStats,
        upcomingItems,
        overdueItems,
        recentActivity
      ] = await Promise.all([
        // Today's stats
        Promise.all([
          Followup.count({
            where: {
              userId,
              scheduledFor: { [Op.between]: [today, tomorrow] },
              status: 'completed'
            }
          }),
          Task.count({
            where: {
              assignedTo: userId,
              dueDate: { [Op.between]: [today, tomorrow] },
              status: 'completed'
            }
          })
        ]).then(([followups, tasks]) => ({ followups, tasks })),

        // This week's stats
        this.getFollowupPerformanceMetrics({ userId, startDate: thisWeek }),

        // This month's stats
        this.getFollowupPerformanceMetrics({ userId, startDate: thisMonth }),

        // Upcoming items (next 7 days)
        Promise.all([
          Followup.count({
            where: {
              userId,
              scheduledFor: {
                [Op.between]: [new Date(), moment().add(7, 'days').toDate()]
              },
              status: { [Op.notIn]: ['completed', 'cancelled'] }
            }
          }),
          Task.count({
            where: {
              assignedTo: userId,
              dueDate: {
                [Op.between]: [new Date(), moment().add(7, 'days').toDate()]
              },
              status: { [Op.notIn]: ['completed', 'cancelled'] }
            }
          })
        ]).then(([followups, tasks]) => ({ followups, tasks })),

        // Overdue items
        Promise.all([
          Followup.count({
            where: {
              userId,
              scheduledFor: { [Op.lt]: new Date() },
              status: { [Op.notIn]: ['completed', 'cancelled'] }
            }
          }),
          Task.count({
            where: {
              assignedTo: userId,
              dueDate: { [Op.lt]: new Date() },
              status: { [Op.notIn]: ['completed', 'cancelled'] }
            }
          })
        ]).then(([followups, tasks]) => ({ followups, tasks })),

        // Recent activity (last 5 completed items)
        Promise.all([
          Followup.findAll({
            where: {
              userId,
              status: 'completed',
              completedAt: { [Op.gte]: moment().subtract(7, 'days').toDate() }
            },
            include: [{ model: Lead, as: 'lead', attributes: ['name', 'company'] }],
            order: [['completedAt', 'DESC']],
            limit: 5
          }),
          Task.findAll({
            where: {
              assignedTo: userId,
              status: 'completed',
              completedAt: { [Op.gte]: moment().subtract(7, 'days').toDate() }
            },
            include: [{ model: Lead, as: 'lead', attributes: ['name', 'company'] }],
            order: [['completedAt', 'DESC']],
            limit: 5
          })
        ]).then(([followups, tasks]) => ({ followups, tasks }))
      ];

      return {
        timestamp: new Date(),
        userId,
        today: todayStats,
        thisWeek: {
          completionRate: weekStats.metrics.completionRate,
          totalItems: weekStats.metrics.totalFollowups
        },
        thisMonth: {
          completionRate: monthStats.metrics.completionRate,
          totalItems: monthStats.metrics.totalFollowups
        },
        upcoming: upcomingItems,
        overdue: overdueItems,
        recentActivity: {
          followups: recentActivity.followups.map(f => ({
            id: f.id,
            title: f.title,
            leadName: f.lead?.name,
            completedAt: f.completedAt
          })),
          tasks: recentActivity.tasks.map(t => ({
            id: t.id,
            title: t.title,
            leadName: t.lead?.name,
            completedAt: t.completedAt
          }))
        }
      };

    } catch (error) {
      this.logger.error('Error getting performance dashboard:', error);
      throw error;
    }
  }
}

module.exports = new PerformanceAnalyticsService();