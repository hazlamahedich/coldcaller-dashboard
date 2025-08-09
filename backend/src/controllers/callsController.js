const { callLogs, leads, generateId } = require('../data/dataStore');
const ResponseFormatter = require('../utils/responseFormatter');
const SIPManager = require('../services/sipManager');
const TwilioService = require('../services/twilioService');
const CallRecordingModel = require('../models/callRecordingModel');
const fs = require('fs');
const path = require('path');

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
    
    // Calculate statistics with frontend-compatible field names
    const connectedCount = filteredLogs.filter(log => 
      ['Interested', 'Not Interested', 'Callback Requested'].includes(log.outcome)
    ).length;
    const appointmentCount = filteredLogs.filter(log => 
      ['Interested', 'Qualified', 'Callback Requested'].includes(log.outcome)
    ).length;

    const stats = {
      totalCalls: filteredLogs.length,
      callsMade: filteredLogs.length,  // Frontend compatibility
      connected: connectedCount,
      contactsReached: connectedCount, // Frontend compatibility
      appointments: appointmentCount,
      appointmentsSet: appointmentCount, // Frontend compatibility
      byOutcome: {
        connected: connectedCount,
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

/**
 * Start a new call with SIP integration
 */
const startCall = async (req, res) => {
  try {
    const { leadId, phoneNumber, agentId, campaignId } = req.body;
    
    // Enhanced input validation with detailed error messages
    const validationErrors = [];
    
    // Validate phone number
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      validationErrors.push({
        field: 'phoneNumber',
        message: 'Phone number is required',
        code: 'MISSING_PHONE_NUMBER'
      });
    } else {
      // More flexible phone number validation for international numbers
      // Allow: +, digits, spaces, dashes, dots, parentheses
      const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{8,20}$/;
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
      
      // Must start with digit 1-9 after cleaning, and have appropriate length
      if (!phoneRegex.test(phoneNumber) || !/^[\+]?[1-9]\d*$/.test(cleanPhone) || cleanPhone.length < 8 || cleanPhone.length > 16) {
        validationErrors.push({
          field: 'phoneNumber',
          message: 'Invalid phone number format. Must be 8-16 digits, optionally starting with + and may contain spaces, dashes, dots, or parentheses',
          code: 'INVALID_PHONE_FORMAT',
          received: phoneNumber
        });
      }
    }
    
    // Validate leadId if provided
    let lead = null;
    if (leadId !== null && leadId !== undefined) {
      if (!Number.isInteger(leadId) || leadId <= 0) {
        validationErrors.push({
          field: 'leadId',
          message: 'Lead ID must be a positive integer',
          code: 'INVALID_LEAD_ID',
          received: leadId
        });
      } else {
        lead = leads.find(l => l.id === leadId);
        if (!lead) {
          validationErrors.push({
            field: 'leadId',
            message: `Lead with ID ${leadId} not found`,
            code: 'LEAD_NOT_FOUND',
            received: leadId
          });
        }
      }
    }
    
    // Validate agentId if provided
    if (agentId !== null && agentId !== undefined) {
      if (typeof agentId !== 'string' || agentId.trim().length === 0) {
        validationErrors.push({
          field: 'agentId',
          message: 'Agent ID must be a non-empty string',
          code: 'INVALID_AGENT_ID',
          received: agentId
        });
      } else if (agentId.length > 50) {
        validationErrors.push({
          field: 'agentId',
          message: 'Agent ID cannot exceed 50 characters',
          code: 'AGENT_ID_TOO_LONG',
          received: agentId.length
        });
      }
    }
    
    // Validate campaignId if provided
    if (campaignId !== null && campaignId !== undefined) {
      if (typeof campaignId !== 'string' || campaignId.trim().length === 0) {
        validationErrors.push({
          field: 'campaignId',
          message: 'Campaign ID must be a non-empty string',
          code: 'INVALID_CAMPAIGN_ID',
          received: campaignId
        });
      } else if (campaignId.length > 50) {
        validationErrors.push({
          field: 'campaignId',
          message: 'Campaign ID cannot exceed 50 characters',
          code: 'CAMPAIGN_ID_TOO_LONG',
          received: campaignId.length
        });
      }
    }
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
      console.warn('Call start validation failed:', {
        errors: validationErrors,
        requestBody: req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      
      return ResponseFormatter.validationError(res, validationErrors);
    }

    const callId = generateId();
    const now = new Date();
    
    // Create initial call log
    const newCall = {
      id: callId,
      leadId: leadId || null,
      leadName: lead ? lead.name : 'Unknown',
      company: lead ? lead.company : 'Unknown',
      phone: phoneNumber,
      agentId: agentId || null,
      agentName: 'Current User',
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      duration: '00:00:00',
      outcome: null,
      callType: 'outbound',
      callDirection: leadId ? 'follow_up' : 'cold_call',
      disposition: 'connecting',
      status: 'connecting',
      campaignId: campaignId || null,
      leadTemperature: lead ? lead.status : 'cold',
      callAttempts: 1,
      quality: {
        latency: 0,
        jitter: 0,
        packetLoss: 0,
        mos: 0
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      startTime: now.toISOString(),
      endTime: null,
      notes: '',
      tags: [],
      recordings: null,
      sentiment: null,
      objections: [],
      nextActions: []
    };

    // Use Twilio for real calls instead of mock SIP
    const twilioResult = await TwilioService.makeCall(
      process.env.TWILIO_PHONE_NUMBER, 
      phoneNumber,
      {
        record: false,
        statusCallback: `${process.env.TWILIO_STATUS_WEBHOOK_URL}?callId=${callId}`,
        recordingStatusCallback: process.env.TWILIO_RECORDING_WEBHOOK_URL
      }
    );

    if (!twilioResult.success) {
      newCall.status = 'failed';
      newCall.outcome = 'Failed';
      newCall.disposition = 'system_error';
      newCall.notes = `Twilio Error: ${twilioResult.error}`;
      
      // Log the specific error for debugging
      console.error('Twilio call failed:', {
        callId,
        phoneNumber,
        error: twilioResult.error,
        code: twilioResult.code
      });
    } else {
      // Store Twilio call SID for tracking
      newCall.twilioCallSid = twilioResult.callSid;
      newCall.notes = `Call initiated via Twilio (SID: ${twilioResult.callSid})`;
      
      console.log('✅ Twilio call initiated:', {
        callId,
        twilioCallSid: twilioResult.callSid,
        from: twilioResult.from,
        to: twilioResult.to,
        status: twilioResult.status
      });
    }

    callLogs.push(newCall);

    return ResponseFormatter.success(
      res,
      {
        call: newCall,
        twilio: twilioResult
      },
      'Call initiated successfully',
      201
    );
  } catch (error) {
    console.error('Error starting call:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // Handle specific error types with detailed messages
    if (error.name === 'ValidationError') {
      return ResponseFormatter.validationError(res, [{
        field: 'validation',
        message: error.message,
        code: 'VALIDATION_ERROR'
      }]);
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return ResponseFormatter.error(res, 'Unable to connect to call service. Please try again later.', 503, {
        code: 'SERVICE_UNAVAILABLE',
        type: 'CONNECTION_ERROR'
      });
    }
    
    if (error.message && error.message.includes('phone')) {
      return ResponseFormatter.error(res, `Phone number validation failed: ${error.message}`, 400, {
        code: 'PHONE_VALIDATION_ERROR',
        type: 'VALIDATION_ERROR'
      });
    }
    
    // Generic error with more helpful message
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Call initiation failed: ${error.message}`
      : 'Unable to start call. Please check your input and try again.';
      
    return ResponseFormatter.error(res, errorMessage, 500, {
      code: 'CALL_START_ERROR',
      type: 'SYSTEM_ERROR'
    });
  }
};

/**
 * Update call status and metrics in real-time
 */
const updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, quality, notes, outcome, disposition } = req.body;
    
    const callIndex = callLogs.findIndex(log => log.id === id);
    if (callIndex === -1) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    const call = callLogs[callIndex];
    
    // Update call properties
    if (status) call.status = status;
    if (quality) call.quality = { ...call.quality, ...quality };
    if (notes) call.notes = notes;
    if (outcome) call.outcome = outcome;
    if (disposition) call.disposition = disposition;
    
    call.updatedAt = new Date().toISOString();

    // Calculate duration if call is connected
    if (status === 'connected' && !call.connectedAt) {
      call.connectedAt = new Date().toISOString();
    }

    if (call.connectedAt) {
      const start = new Date(call.connectedAt);
      const now = new Date();
      const durationMs = now - start;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      call.duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    callLogs[callIndex] = call;

    return ResponseFormatter.success(res, call, 'Call status updated successfully');
  } catch (error) {
    console.error('Error updating call status:', error);
    return ResponseFormatter.error(res, 'Failed to update call status');
  }
};

/**
 * End active call and finalize logging
 */
const endCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, disposition, notes, tags = [], objections = [], nextActions = [] } = req.body;
    
    const callIndex = callLogs.findIndex(log => log.id === id);
    if (callIndex === -1) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    const call = callLogs[callIndex];
    const now = new Date();
    
    // End Twilio call if it has a Twilio SID
    if (call.twilioCallSid) {
      try {
        const hangupResult = await TwilioService.updateCall(call.twilioCallSid, { status: 'completed' });
        console.log('📞 Twilio call ended:', { 
          callId: id, 
          twilioCallSid: call.twilioCallSid, 
          success: hangupResult.success 
        });
      } catch (error) {
        console.warn('⚠️ Could not end Twilio call:', error.message);
      }
    } else {
      // Fallback to SIP manager for backward compatibility
      await SIPManager.endCall(id);
    }
    
    // Finalize call data
    call.status = 'ended';
    call.endTime = now.toISOString();
    call.outcome = outcome || 'No Answer';
    call.disposition = disposition || 'ended';
    call.notes = notes || call.notes;
    call.tags = [...new Set([...call.tags, ...tags])];
    call.objections = [...new Set([...call.objections, ...objections])];
    call.nextActions = [...new Set([...call.nextActions, ...nextActions])];
    call.updatedAt = now.toISOString();

    // Calculate final duration
    if (call.connectedAt) {
      const start = new Date(call.connectedAt);
      const durationMs = now - start;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
      call.duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update lead information if applicable
    if (call.leadId) {
      const leadIndex = leads.findIndex(l => l.id === call.leadId);
      if (leadIndex !== -1) {
        leads[leadIndex].lastContact = call.date;
        leads[leadIndex].updatedAt = now.toISOString();
        
        // Update lead temperature based on outcome
        if (outcome === 'Interested') {
          leads[leadIndex].status = 'warm';
        } else if (outcome === 'Qualified') {
          leads[leadIndex].status = 'hot';
        }
      }
    }

    callLogs[callIndex] = call;

    return ResponseFormatter.success(res, call, 'Call ended successfully');
  } catch (error) {
    console.error('Error ending call:', error);
    return ResponseFormatter.error(res, 'Failed to end call');
  }
};

/**
 * Start call recording
 */
const startRecording = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'mp3' } = req.body;
    
    const call = callLogs.find(log => log.id === id);
    if (!call) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    if (call.status !== 'connected') {
      return ResponseFormatter.error(res, 'Call must be connected to start recording', 400);
    }

    // Generate recording path
    const recordingPath = CallRecordingModel.generateRecordingPath(id, format);
    
    // Create recording metadata
    const recordingMetadata = CallRecordingModel.createRecordingMetadata(id, recordingPath, {
      format,
      bitrate: '128kbps'
    });

    // Start SIP recording
    const result = await SIPManager.startRecording(id, recordingPath);
    
    if (result.success) {
      call.recordings = recordingMetadata;
      call.updatedAt = new Date().toISOString();
      
      return ResponseFormatter.success(res, recordingMetadata, 'Recording started successfully');
    } else {
      return ResponseFormatter.error(res, `Failed to start recording: ${result.error}`);
    }
  } catch (error) {
    console.error('Error starting recording:', error);
    return ResponseFormatter.error(res, 'Failed to start recording');
  }
};

/**
 * Stop call recording
 */
const stopRecording = async (req, res) => {
  try {
    const { id } = req.params;
    
    const call = callLogs.find(log => log.id === id);
    if (!call) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    if (!call.recordings || call.recordings.status !== 'recording') {
      return ResponseFormatter.error(res, 'No active recording found', 400);
    }

    // Stop SIP recording
    const result = await SIPManager.stopRecording(id);
    
    if (result.success) {
      // Finalize recording metadata
      await CallRecordingModel.finalizeRecording(call.recordings);
      call.updatedAt = new Date().toISOString();
      
      return ResponseFormatter.success(res, call.recordings, 'Recording stopped successfully');
    } else {
      return ResponseFormatter.error(res, `Failed to stop recording: ${result.error}`);
    }
  } catch (error) {
    console.error('Error stopping recording:', error);
    return ResponseFormatter.error(res, 'Failed to stop recording');
  }
};

/**
 * Stream or download call recording
 */
const getRecording = async (req, res) => {
  try {
    const { id } = req.params;
    const { download = false } = req.query;
    
    const call = callLogs.find(log => log.id === id);
    if (!call) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    if (!call.recordings) {
      return ResponseFormatter.error(res, 'No recording found for this call', 404);
    }

    const filePath = call.recordings.filePath;
    
    // Check if file exists
    const fileInfo = await CallRecordingModel.getRecordingInfo(filePath);
    if (!fileInfo.exists) {
      return ResponseFormatter.error(res, 'Recording file not found', 404);
    }

    // Set appropriate headers
    const fileName = path.basename(filePath);
    const mimeType = `audio/${call.recordings.format}`;
    
    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Accept-Ranges', 'bytes');
    }
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', fileInfo.fileSize);
    
    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('Error streaming recording:', error);
      if (!res.headersSent) {
        return ResponseFormatter.error(res, 'Failed to stream recording');
      }
    });
  } catch (error) {
    console.error('Error getting recording:', error);
    return ResponseFormatter.error(res, 'Failed to get recording');
  }
};

/**
 * Get all call recordings with metadata
 */
const getAllRecordings = async (req, res) => {
  try {
    const { page = 1, limit = 10, format, dateFrom, dateTo } = req.query;
    
    // Get all calls with recordings
    let recordedCalls = callLogs.filter(call => call.recordings);
    
    // Filter by format if specified
    if (format) {
      recordedCalls = recordedCalls.filter(call => 
        call.recordings.format === format.toLowerCase()
      );
    }
    
    // Filter by date range if specified
    if (dateFrom) {
      recordedCalls = recordedCalls.filter(call => call.date >= dateFrom);
    }
    if (dateTo) {
      recordedCalls = recordedCalls.filter(call => call.date <= dateTo);
    }
    
    // Sort by most recent first
    recordedCalls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRecordings = recordedCalls.slice(startIndex, endIndex);
    
    // Format response with recording metadata
    const recordings = paginatedRecordings.map(call => ({
      callId: call.id,
      leadName: call.leadName,
      phone: call.phone,
      date: call.date,
      time: call.time,
      duration: call.duration,
      outcome: call.outcome,
      recording: call.recordings
    }));
    
    return ResponseFormatter.paginated(
      res,
      recordings,
      page,
      limit,
      recordedCalls.length,
      'Call recordings retrieved successfully'
    );
  } catch (error) {
    console.error('Error getting recordings:', error);
    return ResponseFormatter.error(res, 'Failed to get recordings');
  }
};

/**
 * Delete call recording file
 */
const deleteRecording = async (req, res) => {
  try {
    const { id } = req.params;
    
    const call = callLogs.find(log => log.id === id);
    if (!call) {
      return ResponseFormatter.notFound(res, 'Call log');
    }

    if (!call.recordings) {
      return ResponseFormatter.error(res, 'No recording found for this call', 404);
    }

    // Delete the recording file
    await CallRecordingModel.deleteRecording(call.recordings.filePath);
    
    // Remove recording metadata from call log
    call.recordings = null;
    call.updatedAt = new Date().toISOString();
    
    return ResponseFormatter.success(res, { callId: id }, 'Recording deleted successfully');
  } catch (error) {
    console.error('Error deleting recording:', error);
    return ResponseFormatter.error(res, 'Failed to delete recording');
  }
};

/**
 * Get comprehensive call analytics and reporting
 */
const getCallAnalytics = async (req, res) => {
  try {
    const { period = 'all', agentId, campaignId, outcome } = req.query;
    
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
    
    // Additional filters
    if (agentId) {
      filteredLogs = filteredLogs.filter(log => log.agentId === agentId);
    }
    if (campaignId) {
      filteredLogs = filteredLogs.filter(log => log.campaignId === campaignId);
    }
    if (outcome) {
      filteredLogs = filteredLogs.filter(log => log.outcome === outcome);
    }
    
    // Calculate comprehensive analytics
    const analytics = {
      summary: {
        totalCalls: filteredLogs.length,
        connectedCalls: filteredLogs.filter(log => log.status === 'connected' || log.connectedAt).length,
        recordedCalls: filteredLogs.filter(log => log.recordings).length,
        averageCallDuration: calculateAverageCallDuration(filteredLogs),
        conversionRate: calculateConversionRate(filteredLogs),
        connectionRate: calculateConnectionRate(filteredLogs)
      },
      outcomes: {
        interested: filteredLogs.filter(log => log.outcome === 'Interested').length,
        notInterested: filteredLogs.filter(log => log.outcome === 'Not Interested').length,
        voicemail: filteredLogs.filter(log => log.outcome === 'Voicemail').length,
        noAnswer: filteredLogs.filter(log => log.outcome === 'No Answer').length,
        busy: filteredLogs.filter(log => log.outcome === 'Busy').length,
        callbackRequested: filteredLogs.filter(log => log.outcome === 'Callback Requested').length,
        qualified: filteredLogs.filter(log => log.outcome === 'Qualified').length
      },
      quality: {
        averageLatency: calculateAverageQualityMetric(filteredLogs, 'latency'),
        averageJitter: calculateAverageQualityMetric(filteredLogs, 'jitter'),
        averagePacketLoss: calculateAverageQualityMetric(filteredLogs, 'packetLoss'),
        averageMOS: calculateAverageQualityMetric(filteredLogs, 'mos')
      },
      trends: {
        callsPerDay: calculateCallsPerDay(filteredLogs),
        peakHours: calculatePeakHours(filteredLogs),
        successTrend: calculateSuccessTrend(filteredLogs)
      },
      agents: calculateAgentPerformance(filteredLogs),
      campaigns: calculateCampaignPerformance(filteredLogs)
    };
    
    return ResponseFormatter.success(res, analytics, `Call analytics for ${period} retrieved successfully`);
  } catch (error) {
    console.error('Error getting call analytics:', error);
    return ResponseFormatter.error(res, 'Failed to get call analytics');
  }
};

/**
 * Get real-time call metrics and system status
 */
const getRealTimeMetrics = async (req, res) => {
  try {
    const sipStatus = await SIPManager.getRegistrationStatus();
    const activeCalls = SIPManager.getActiveCalls();
    const callMetrics = SIPManager.getCallMetrics();
    
    // Current system metrics
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayCalls = callLogs.filter(log => log.date === today);
    
    const metrics = {
      system: {
        status: sipStatus.registered ? 'online' : 'offline',
        sipRegistered: sipStatus.registered,
        server: sipStatus.server,
        connectionQuality: sipStatus.connectionQuality,
        lastRegistration: sipStatus.lastRegistration,
        uptime: process.uptime()
      },
      calls: {
        active: activeCalls.length,
        total: callMetrics.totalCalls,
        todayTotal: todayCalls.length,
        connecting: activeCalls.filter(call => call.status === 'connecting').length,
        connected: activeCalls.filter(call => call.status === 'connected').length,
        recording: activeCalls.filter(call => call.recording && call.recording.active).length
      },
      performance: {
        averageLatency: callMetrics.averageLatency,
        packetLoss: callMetrics.packetLoss,
        callQuality: sipStatus.connectionQuality,
        systemLoad: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal
      },
      today: {
        totalCalls: todayCalls.length,
        connectedCalls: todayCalls.filter(log => log.connectedAt).length,
        interestedLeads: todayCalls.filter(log => log.outcome === 'Interested').length,
        recordedCalls: todayCalls.filter(log => log.recordings).length
      },
      activeCalls: activeCalls.map(call => ({
        id: call.id,
        phoneNumber: call.phoneNumber,
        status: call.status,
        duration: call.connectedAt ? Math.floor((Date.now() - Date.parse(call.connectedAt)) / 1000) : 0,
        quality: call.quality,
        recording: call.recording ? call.recording.active : false
      }))
    };
    
    return ResponseFormatter.success(res, metrics, 'Real-time metrics retrieved successfully');
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    return ResponseFormatter.error(res, 'Failed to get real-time metrics');
  }
};

// Helper functions for analytics
function calculateConnectionRate(logs) {
  if (logs.length === 0) return 0;
  const connectedCalls = logs.filter(log => log.connectedAt).length;
  return Math.round((connectedCalls / logs.length) * 100 * 10) / 10;
}

function calculateAverageQualityMetric(logs, metric) {
  const validLogs = logs.filter(log => log.quality && log.quality[metric] !== undefined);
  if (validLogs.length === 0) return 0;
  
  const sum = validLogs.reduce((total, log) => total + log.quality[metric], 0);
  return Math.round((sum / validLogs.length) * 100) / 100;
}

function calculatePeakHours(logs) {
  const hours = {};
  logs.forEach(log => {
    const hour = parseInt(log.time.split(':')[0]);
    hours[hour] = (hours[hour] || 0) + 1;
  });
  
  return Object.entries(hours)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: parseInt(hour), calls: count }));
}

function calculateSuccessTrend(logs) {
  const dailyStats = {};
  logs.forEach(log => {
    if (!dailyStats[log.date]) {
      dailyStats[log.date] = { total: 0, interested: 0 };
    }
    dailyStats[log.date].total++;
    if (log.outcome === 'Interested' || log.outcome === 'Qualified') {
      dailyStats[log.date].interested++;
    }
  });
  
  return Object.entries(dailyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      total: stats.total,
      interested: stats.interested,
      rate: stats.total > 0 ? Math.round((stats.interested / stats.total) * 100) : 0
    }));
}

function calculateAgentPerformance(logs) {
  const agents = {};
  logs.forEach(log => {
    const agentId = log.agentId || 'unknown';
    if (!agents[agentId]) {
      agents[agentId] = {
        agentId,
        agentName: log.agentName || 'Unknown',
        totalCalls: 0,
        connectedCalls: 0,
        interestedCalls: 0,
        qualifiedCalls: 0,
        averageDuration: '0:00'
      };
    }
    
    agents[agentId].totalCalls++;
    if (log.connectedAt) agents[agentId].connectedCalls++;
    if (log.outcome === 'Interested') agents[agentId].interestedCalls++;
    if (log.outcome === 'Qualified') agents[agentId].qualifiedCalls++;
  });
  
  return Object.values(agents);
}

function calculateCampaignPerformance(logs) {
  const campaigns = {};
  logs.forEach(log => {
    const campaignId = log.campaignId || 'unknown';
    if (!campaigns[campaignId]) {
      campaigns[campaignId] = {
        campaignId,
        totalCalls: 0,
        connectedCalls: 0,
        conversionRate: 0,
        averageQuality: 0
      };
    }
    
    campaigns[campaignId].totalCalls++;
    if (log.connectedAt) campaigns[campaignId].connectedCalls++;
  });
  
  return Object.values(campaigns);
}

module.exports = {
  getAllCallLogs,
  getCallLogById,
  createCallLog,
  updateCallLog,
  deleteCallLog,
  getCallStats,
  getCallLogsByLead,
  startCall,
  updateCallStatus,
  endCall,
  startRecording,
  stopRecording,
  getRecording,
  getAllRecordings,
  deleteRecording,
  getCallAnalytics,
  getRealTimeMetrics
};