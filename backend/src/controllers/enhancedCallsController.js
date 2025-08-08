/**
 * Enhanced Calls Controller - Advanced call logging with documentation and coaching
 */

const { Op } = require('sequelize');
const ResponseFormatter = require('../utils/responseFormatter');
const { defineEnhancedCallLogModel, enhancedCallLogValidationSchema } = require('../database/models/EnhancedCallLog');
const SIPManager = require('../services/sipManager');
const TranscriptionService = require('../services/transcriptionService');
const SpeechAnalyticsService = require('../services/speechAnalyticsService');
const CRMIntegrationService = require('../services/crmIntegrationService');
const CoachingAnalyticsService = require('../services/coachingAnalyticsService');
const { v4: uuidv4 } = require('uuid');

// Initialize model (this would typically be done in database setup)
let EnhancedCallLog;

const initializeModel = (sequelize) => {
  if (!EnhancedCallLog) {
    EnhancedCallLog = defineEnhancedCallLogModel(sequelize);
  }
  return EnhancedCallLog;
};

/**
 * Comprehensive call logging with advanced documentation
 * POST /api/calls/log
 */
const logCall = async (req, res) => {
  try {
    const { error, value } = enhancedCallLogValidationSchema.validate(req.body);
    
    if (error) {
      return ResponseFormatter.error(
        res,
        'Validation failed',
        400,
        error.details.map(detail => detail.message)
      );
    }

    const callLog = await EnhancedCallLog.create(value);
    
    // Trigger CRM sync in background
    if (callLog.leadId) {
      CRMIntegrationService.syncCallLog(callLog.id).catch(err => 
        console.error('CRM sync failed:', err)
      );
    }

    return ResponseFormatter.success(
      res,
      callLog,
      'Call logged successfully with enhanced documentation',
      201
    );
  } catch (error) {
    console.error('Error logging call:', error);
    return ResponseFormatter.error(res, 'Failed to log call');
  }
};

/**
 * Get call history with advanced filtering
 * GET /api/calls/history
 */
const getCallHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      leadId,
      agentId,
      outcome,
      disposition,
      category,
      priority,
      dateFrom,
      dateTo,
      hasRecording,
      hasTranscription,
      qualityMin,
      qualityMax,
      includeCoaching,
      sortBy = 'initiatedAt',
      sortOrder = 'DESC'
    } = req.query;

    const whereClause = {};
    
    // Apply filters
    if (leadId) whereClause.leadId = leadId;
    if (agentId) whereClause.agentId = agentId;
    if (outcome) whereClause.outcome = outcome;
    if (disposition) whereClause.disposition = disposition;
    if (category) whereClause.category = category;
    if (priority) whereClause.priority = priority;
    
    if (dateFrom || dateTo) {
      whereClause.initiatedAt = {};
      if (dateFrom) whereClause.initiatedAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.initiatedAt[Op.lte] = new Date(dateTo);
    }
    
    if (hasRecording === 'true') {
      whereClause['$recordingMetadata.recordingUrl$'] = { [Op.ne]: null };
    }
    
    if (hasTranscription === 'true') {
      whereClause['$recordingMetadata.transcriptionStatus$'] = 'completed';
    }
    
    if (qualityMin || qualityMax) {
      whereClause['$callQuality.overallScore$'] = {};
      if (qualityMin) whereClause['$callQuality.overallScore$'][Op.gte] = parseFloat(qualityMin);
      if (qualityMax) whereClause['$callQuality.overallScore$'][Op.lte] = parseFloat(qualityMax);
    }

    const { count, rows } = await EnhancedCallLog.findAndCountAll({
      where: whereClause,
      include: [{
        model: sequelize.models.Lead,
        as: 'lead',
        attributes: ['firstName', 'lastName', 'company', 'status']
      }],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      attributes: includeCoaching === 'true' ? undefined : { exclude: ['coachingFeedback'] }
    });

    return ResponseFormatter.paginated(
      res,
      rows,
      page,
      limit,
      count,
      'Call history retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching call history:', error);
    return ResponseFormatter.error(res, 'Failed to fetch call history');
  }
};

/**
 * Update call notes and outcomes
 * PUT /api/calls/:id/notes
 */
const updateCallNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { callNotes, outcome, disposition, tags, priority } = req.body;

    const callLog = await EnhancedCallLog.findByPk(id);
    if (!callLog) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    // Update fields
    if (callNotes) {
      callLog.callNotes = {
        ...callLog.callNotes,
        ...callNotes,
        lastUpdated: new Date()
      };
    }
    
    if (outcome) callLog.outcome = outcome;
    if (disposition) callLog.disposition = disposition;
    if (tags) callLog.tags = [...new Set([...callLog.tags, ...tags])];
    if (priority) callLog.priority = priority;

    await callLog.save();

    // Trigger CRM sync
    CRMIntegrationService.syncCallLog(callLog.id).catch(err => 
      console.error('CRM sync failed:', err)
    );

    return ResponseFormatter.success(
      res,
      callLog,
      'Call notes updated successfully'
    );
  } catch (error) {
    console.error('Error updating call notes:', error);
    return ResponseFormatter.error(res, 'Failed to update call notes');
  }
};

/**
 * Schedule follow-up actions
 * POST /api/calls/:id/follow-up
 */
const scheduleFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, description, scheduledDate, priority, assignedTo } = req.body;

    const callLog = await EnhancedCallLog.findByPk(id);
    if (!callLog) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    const followUpAction = await callLog.addFollowUpAction({
      type,
      title,
      description: description || '',
      scheduledDate: new Date(scheduledDate),
      priority: priority || 'medium',
      assignedTo: assignedTo || callLog.agentId,
      status: 'pending',
      reminderSet: true
    });

    // Trigger calendar integration if available
    // CalendarService.createReminder(followUpAction).catch(err => 
    //   console.error('Calendar integration failed:', err)
    // );

    return ResponseFormatter.success(
      res,
      { callLog, followUpAction },
      'Follow-up action scheduled successfully'
    );
  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    return ResponseFormatter.error(res, 'Failed to schedule follow-up');
  }
};

/**
 * Get call analytics with coaching insights
 * GET /api/calls/analytics
 */
const getCallAnalytics = async (req, res) => {
  try {
    const {
      period = 'month',
      agentId,
      category,
      includeCoaching = false,
      groupBy = 'day'
    } = req.query;

    const dateRange = getDateRangeForPeriod(period);
    const filters = { dateRange };
    if (agentId) filters.agentId = agentId;
    if (category) filters.category = category;

    const [basicStats, coachingInsights, trends] = await Promise.all([
      EnhancedCallLog.getDetailedCallStats(filters),
      includeCoaching && agentId ? EnhancedCallLog.getCoachingInsights(agentId, dateRange) : null,
      getCallTrends(filters, groupBy)
    ]);

    const analytics = {
      summary: basicStats,
      trends,
      coaching: coachingInsights,
      period,
      dateRange,
      generatedAt: new Date()
    };

    return ResponseFormatter.success(
      res,
      analytics,
      'Call analytics retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching call analytics:', error);
    return ResponseFormatter.error(res, 'Failed to fetch call analytics');
  }
};

/**
 * Start call transcription processing
 * POST /api/calls/:id/transcribe
 */
const transcribeCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { provider = 'whisper', language = 'en', includeAnalytics = true } = req.body;

    const callLog = await EnhancedCallLog.findByPk(id);
    if (!callLog) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    if (!callLog.recordingMetadata?.recordingUrl) {
      return ResponseFormatter.error(res, 'No recording found for this call', 400);
    }

    if (callLog.recordingMetadata.transcriptionStatus === 'processing') {
      return ResponseFormatter.error(res, 'Transcription already in progress', 400);
    }

    // Update status to processing
    callLog.recordingMetadata.transcriptionStatus = 'processing';
    await callLog.save();

    // Start transcription process (async)
    TranscriptionService.transcribeRecording({
      callId: id,
      recordingUrl: callLog.recordingMetadata.recordingUrl,
      provider,
      language,
      includeAnalytics
    }).then(async (transcriptionResult) => {
      await callLog.addTranscription(transcriptionResult);
      
      // Trigger coaching analysis if transcription includes analytics
      if (includeAnalytics && transcriptionResult.analytics) {
        CoachingAnalyticsService.analyzeCallPerformance(id, transcriptionResult)
          .catch(err => console.error('Coaching analysis failed:', err));
      }
    }).catch(async (error) => {
      console.error('Transcription failed:', error);
      callLog.recordingMetadata.transcriptionStatus = 'failed';
      await callLog.save();
    });

    return ResponseFormatter.success(
      res,
      { 
        callId: id, 
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      },
      'Call transcription started successfully'
    );
  } catch (error) {
    console.error('Error starting transcription:', error);
    return ResponseFormatter.error(res, 'Failed to start call transcription');
  }
};

/**
 * Add coaching feedback
 * POST /api/calls/:id/coaching
 */
const addCoachingFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      callQuality, 
      coachingFeedback,
      reviewerId 
    } = req.body;

    const callLog = await EnhancedCallLog.findByPk(id);
    if (!callLog) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    // Update call quality scores
    if (callQuality) {
      await callLog.updateCallQuality(callQuality);
    }

    // Add coaching feedback
    if (coachingFeedback) {
      await callLog.addCoachingFeedback(coachingFeedback, reviewerId);
    }

    // Generate coaching recommendations
    const recommendations = await CoachingAnalyticsService.generateRecommendations(
      callLog.agentId,
      { callQuality, coachingFeedback }
    );

    return ResponseFormatter.success(
      res,
      { 
        callLog, 
        recommendations 
      },
      'Coaching feedback added successfully'
    );
  } catch (error) {
    console.error('Error adding coaching feedback:', error);
    return ResponseFormatter.error(res, 'Failed to add coaching feedback');
  }
};

/**
 * Get coaching dashboard for agent
 * GET /api/calls/coaching/:agentId
 */
const getCoachingDashboard = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { period = 'month' } = req.query;

    const dateRange = getDateRangeForPeriod(period);
    
    const [
      coachingInsights,
      recentCalls,
      performanceTrends,
      improvementAreas
    ] = await Promise.all([
      EnhancedCallLog.getCoachingInsights(agentId, dateRange),
      getRecentCallsWithCoaching(agentId, 10),
      getPerformanceTrends(agentId, dateRange),
      getImprovementAreas(agentId, dateRange)
    ]);

    const dashboard = {
      agentId,
      period,
      dateRange,
      insights: coachingInsights,
      recentCalls,
      performanceTrends,
      improvementAreas,
      generatedAt: new Date()
    };

    return ResponseFormatter.success(
      res,
      dashboard,
      'Coaching dashboard retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching coaching dashboard:', error);
    return ResponseFormatter.error(res, 'Failed to fetch coaching dashboard');
  }
};

/**
 * Bulk call import/export
 * POST /api/calls/bulk-import
 */
const bulkImportCalls = async (req, res) => {
  try {
    const { calls, validateOnly = false } = req.body;

    if (!Array.isArray(calls) || calls.length === 0) {
      return ResponseFormatter.error(res, 'No calls provided for import', 400);
    }

    const validationResults = [];
    const validCalls = [];
    const errors = [];

    // Validate all calls
    for (let i = 0; i < calls.length; i++) {
      const { error, value } = enhancedCallLogValidationSchema.validate(calls[i]);
      
      if (error) {
        errors.push({
          index: i,
          call: calls[i],
          errors: error.details.map(detail => detail.message)
        });
      } else {
        validCalls.push(value);
        validationResults.push({ index: i, status: 'valid' });
      }
    }

    // If validation only, return results
    if (validateOnly) {
      return ResponseFormatter.success(
        res,
        {
          validCalls: validCalls.length,
          totalCalls: calls.length,
          errors: errors.length,
          validationResults,
          errorDetails: errors
        },
        'Bulk validation completed'
      );
    }

    // Import valid calls
    const importedCalls = [];
    const importErrors = [];

    for (const callData of validCalls) {
      try {
        const callLog = await EnhancedCallLog.create(callData);
        importedCalls.push(callLog);
        
        // Trigger CRM sync for each call
        CRMIntegrationService.syncCallLog(callLog.id).catch(err => 
          console.error(`CRM sync failed for call ${callLog.id}:`, err)
        );
      } catch (createError) {
        importErrors.push({
          call: callData,
          error: createError.message
        });
      }
    }

    return ResponseFormatter.success(
      res,
      {
        imported: importedCalls.length,
        failed: importErrors.length,
        validationErrors: errors.length,
        totalProcessed: calls.length,
        importedCalls: importedCalls.map(call => ({ id: call.id, leadId: call.leadId })),
        importErrors,
        validationErrors: errors
      },
      'Bulk call import completed'
    );
  } catch (error) {
    console.error('Error during bulk import:', error);
    return ResponseFormatter.error(res, 'Failed to import calls');
  }
};

/**
 * Export calls data
 * GET /api/calls/export
 */
const exportCalls = async (req, res) => {
  try {
    const {
      format = 'json',
      dateFrom,
      dateTo,
      agentId,
      includeRecordings = false,
      includeTranscriptions = false,
      includeCoaching = false
    } = req.query;

    const whereClause = {};
    
    if (dateFrom || dateTo) {
      whereClause.initiatedAt = {};
      if (dateFrom) whereClause.initiatedAt[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.initiatedAt[Op.lte] = new Date(dateTo);
    }
    
    if (agentId) whereClause.agentId = agentId;

    const excludeFields = [];
    if (!includeRecordings) excludeFields.push('recordingMetadata');
    if (!includeCoaching) excludeFields.push('coachingFeedback');

    const calls = await EnhancedCallLog.findAll({
      where: whereClause,
      include: [{
        model: sequelize.models.Lead,
        as: 'lead',
        attributes: ['firstName', 'lastName', 'company', 'email']
      }],
      attributes: excludeFields.length > 0 ? { exclude: excludeFields } : undefined,
      order: [['initiatedAt', 'DESC']]
    });

    // Process data based on format
    let exportData;
    let contentType;
    let filename;

    switch (format) {
      case 'csv':
        exportData = convertToCSV(calls, includeTranscriptions);
        contentType = 'text/csv';
        filename = `calls-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'excel':
        exportData = await convertToExcel(calls, includeTranscriptions);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `calls-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        break;
      default:
        exportData = JSON.stringify(calls, null, 2);
        contentType = 'application/json';
        filename = `calls-export-${new Date().toISOString().split('T')[0]}.json`;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    
    return res.send(exportData);
  } catch (error) {
    console.error('Error exporting calls:', error);
    return ResponseFormatter.error(res, 'Failed to export calls');
  }
};

// Helper functions

function getDateRangeForPeriod(period) {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setMonth(now.getMonth() - 1);
  }

  return { start, end: now };
}

async function getCallTrends(filters, groupBy) {
  // Implementation for call trends analysis
  // This would group calls by day/week/month and show trends
  return {
    callVolume: [],
    qualityTrends: [],
    outcomeDistribution: []
  };
}

async function getRecentCallsWithCoaching(agentId, limit) {
  return await EnhancedCallLog.findAll({
    where: { agentId },
    include: [{
      model: sequelize.models.Lead,
      as: 'lead',
      attributes: ['firstName', 'lastName', 'company']
    }],
    order: [['initiatedAt', 'DESC']],
    limit,
    attributes: { exclude: ['recordingMetadata'] }
  });
}

async function getPerformanceTrends(agentId, dateRange) {
  // Implementation for performance trend analysis
  return {
    qualityScores: [],
    callVolume: [],
    conversionRates: []
  };
}

async function getImprovementAreas(agentId, dateRange) {
  // Implementation for improvement area identification
  return {
    topAreas: [],
    recommendations: [],
    progress: []
  };
}

function convertToCSV(calls, includeTranscriptions) {
  // CSV conversion implementation
  const headers = [
    'ID', 'Lead Name', 'Phone', 'Agent', 'Date', 'Duration',
    'Outcome', 'Disposition', 'Quality Score', 'Notes Summary'
  ];
  
  if (includeTranscriptions) {
    headers.push('Transcription');
  }
  
  const rows = calls.map(call => {
    const row = [
      call.id,
      call.lead ? `${call.lead.firstName} ${call.lead.lastName}` : '',
      call.phoneNumber,
      call.agentName || '',
      call.initiatedAt.toISOString().split('T')[0],
      call.duration || 0,
      call.outcome || '',
      call.disposition || '',
      call.callQuality?.overallScore || '',
      call.callNotes?.summary || ''
    ];
    
    if (includeTranscriptions) {
      row.push(call.recordingMetadata?.transcriptionText || '');
    }
    
    return row.join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

async function convertToExcel(calls, includeTranscriptions) {
  // Excel conversion would require a library like 'exceljs'
  // For now, return CSV format
  return convertToCSV(calls, includeTranscriptions);
}

module.exports = {
  initializeModel,
  logCall,
  getCallHistory,
  updateCallNotes,
  scheduleFollowUp,
  getCallAnalytics,
  transcribeCall,
  addCoachingFeedback,
  getCoachingDashboard,
  bulkImportCalls,
  exportCalls
};