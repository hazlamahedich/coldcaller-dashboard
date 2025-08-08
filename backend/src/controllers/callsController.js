const { callLogs, leads, generateId } = require('../data/dataStore');
const ResponseFormatter = require('../utils/responseFormatter');

/**
 * Get all call logs with optional filtering and pagination
 */
const getAllCallLogs = (req, res) => {
  try {
    const { outcome, leadId, date, page = 1, limit = 10 } = req.query;
    
    let filteredLogs = [...callLogs];
    
    // Filter by outcome
    if (outcome) {
      filteredLogs = filteredLogs.filter(log => 
        log.outcome.toLowerCase() === outcome.toLowerCase()
      );
    }
    
    // Filter by lead ID
    if (leadId) {
      filteredLogs = filteredLogs.filter(log => 
        log.leadId === parseInt(leadId)
      );
    }
    
    // Filter by date
    if (date) {
      filteredLogs = filteredLogs.filter(log => log.date === date);
    }
    
    // Sort by date and time (most recent first)
    filteredLogs.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateB - dateA;
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    
    return ResponseFormatter.paginated(
      res,
      paginatedLogs,
      page,
      limit,
      filteredLogs.length,
      'Call logs retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return ResponseFormatter.error(res, 'Failed to fetch call logs');
  }
};

/**
 * Get a specific call log by ID
 */
const getCallLogById = (req, res) => {
  try {
    const { id } = req.params;
    const callLog = callLogs.find(log => log.id === parseInt(id));
    
    if (!callLog) {
      return ResponseFormatter.notFound(res, 'Call log');
    }
    
    return ResponseFormatter.success(res, callLog, 'Call log retrieved successfully');
  } catch (error) {
    console.error('Error fetching call log:', error);
    return ResponseFormatter.error(res, 'Failed to fetch call log');
  }
};

/**
 * Create a new call log
 */
const createCallLog = (req, res) => {
  try {
    const { leadId, leadName, phone, duration, outcome, notes } = req.body;
    
    // Validate lead exists
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        return ResponseFormatter.error(res, 'Lead not found', 404);
      }
    }
    
    const now = new Date();
    const newCallLog = {
      id: generateId(),
      leadId: leadId || null,
      leadName: leadName || 'Unknown',
      phone: phone || 'Unknown',
      date: now.toISOString().split('T')[0], // YYYY-MM-DD
      time: now.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: 'numeric', 
        minute: '2-digit' 
      }),
      duration: duration || '0:00',
      outcome: outcome || 'No Answer',
      notes: notes || '',
      createdAt: now.toISOString()
    };
    
    callLogs.push(newCallLog);
    
    // Update lead's last contact if leadId provided
    if (leadId) {
      const leadIndex = leads.findIndex(l => l.id === leadId);
      if (leadIndex !== -1) {
        leads[leadIndex].lastContact = newCallLog.date;
        leads[leadIndex].updatedAt = now.toISOString();
      }
    }
    
    return ResponseFormatter.success(
      res,
      newCallLog,
      'Call log created successfully',
      201
    );
  } catch (error) {
    console.error('Error creating call log:', error);
    return ResponseFormatter.error(res, 'Failed to create call log');
  }
};

/**
 * Update a call log
 */
const updateCallLog = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const logIndex = callLogs.findIndex(log => log.id === parseInt(id));
    if (logIndex === -1) {
      return ResponseFormatter.notFound(res, 'Call log');
    }
    
    // Update the call log
    const updatedLog = {
      ...callLogs[logIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    callLogs[logIndex] = updatedLog;
    
    return ResponseFormatter.success(res, updatedLog, 'Call log updated successfully');
  } catch (error) {
    console.error('Error updating call log:', error);
    return ResponseFormatter.error(res, 'Failed to update call log');
  }
};

/**
 * Delete a call log
 */
const deleteCallLog = (req, res) => {
  try {
    const { id } = req.params;
    const logIndex = callLogs.findIndex(log => log.id === parseInt(id));
    
    if (logIndex === -1) {
      return ResponseFormatter.notFound(res, 'Call log');
    }
    
    const deletedLog = callLogs.splice(logIndex, 1)[0];
    
    return ResponseFormatter.success(res, deletedLog, 'Call log deleted successfully');
  } catch (error) {
    console.error('Error deleting call log:', error);
    return ResponseFormatter.error(res, 'Failed to delete call log');
  }
};

/**
 * Get call statistics
 */
const getCallStats = (req, res) => {
  try {
    const { period = 'all' } = req.query;
    
    let filteredLogs = [...callLogs];
    
    // Filter by period
    if (period !== 'all') {
      const now = new Date();
      let filterDate;
      
      switch (period) {
        case 'today':
          filterDate = now.toISOString().split('T')[0];
          filteredLogs = filteredLogs.filter(log => log.date === filterDate);
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filteredLogs = filteredLogs.filter(log => new Date(log.date) >= weekAgo);
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filteredLogs = filteredLogs.filter(log => new Date(log.date) >= monthAgo);
          break;
      }
    }
    
    // Calculate statistics
    const stats = {
      totalCalls: filteredLogs.length,
      byOutcome: {
        connected: filteredLogs.filter(log => 
          ['Interested', 'Not Interested', 'Callback Requested'].includes(log.outcome)
        ).length,
        voicemail: filteredLogs.filter(log => log.outcome === 'Voicemail').length,
        noAnswer: filteredLogs.filter(log => log.outcome === 'No Answer').length,
        busy: filteredLogs.filter(log => log.outcome === 'Busy').length,
        interested: filteredLogs.filter(log => log.outcome === 'Interested').length
      },
      averageCallDuration: calculateAverageCallDuration(filteredLogs),
      callsPerDay: calculateCallsPerDay(filteredLogs),
      conversionRate: calculateConversionRate(filteredLogs)
    };
    
    return ResponseFormatter.success(res, stats, `Call statistics for ${period} retrieved successfully`);
  } catch (error) {
    console.error('Error fetching call stats:', error);
    return ResponseFormatter.error(res, 'Failed to fetch call statistics');
  }
};

/**
 * Get call logs for a specific lead
 */
const getCallLogsByLead = (req, res) => {
  try {
    const { leadId } = req.params;
    
    const leadLogs = callLogs.filter(log => log.leadId === parseInt(leadId));
    
    if (leadLogs.length === 0) {
      return ResponseFormatter.success(res, [], 'No call logs found for this lead');
    }
    
    // Sort by most recent first
    leadLogs.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateB - dateA;
    });
    
    return ResponseFormatter.success(res, leadLogs, 'Lead call logs retrieved successfully');
  } catch (error) {
    console.error('Error fetching lead call logs:', error);
    return ResponseFormatter.error(res, 'Failed to fetch lead call logs');
  }
};

// Helper functions
function calculateAverageCallDuration(logs) {
  if (logs.length === 0) return '0:00';
  
  const totalSeconds = logs.reduce((total, log) => {
    const [minutes, seconds] = log.duration.split(':').map(Number);
    return total + (minutes * 60) + seconds;
  }, 0);
  
  const avgSeconds = Math.floor(totalSeconds / logs.length);
  const minutes = Math.floor(avgSeconds / 60);
  const seconds = avgSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function calculateCallsPerDay(logs) {
  if (logs.length === 0) return 0;
  
  const dates = [...new Set(logs.map(log => log.date))];
  return Math.round(logs.length / dates.length * 10) / 10; // Round to 1 decimal
}

function calculateConversionRate(logs) {
  if (logs.length === 0) return 0;
  
  const interestedCalls = logs.filter(log => log.outcome === 'Interested').length;
  return Math.round((interestedCalls / logs.length) * 100 * 10) / 10; // Round to 1 decimal
}

module.exports = {
  getAllCallLogs,
  getCallLogById,
  createCallLog,
  updateCallLog,
  deleteCallLog,
  getCallStats,
  getCallLogsByLead
};