/**
 * Security Audit Logging Middleware
 * Comprehensive logging system for security events and compliance
 */

const fs = require('fs').promises;
const path = require('path');
const { createHMAC } = require('../utils/encryption');

// Audit log configuration
const AUDIT_LOG_DIR = process.env.AUDIT_LOG_DIR || path.join(__dirname, '../../logs/audit');
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS) || 90;
const LOG_MAX_SIZE = parseInt(process.env.LOG_MAX_SIZE) || 10 * 1024 * 1024; // 10MB
const AUDIT_SECRET = process.env.AUDIT_SECRET || 'audit-secret-change-in-production';

// Event severity levels
const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Event categories for GDPR and compliance
const EVENT_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization', 
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  SYSTEM_ACCESS: 'system_access',
  SECURITY_VIOLATION: 'security_violation',
  PRIVACY_EVENT: 'privacy_event',
  ADMIN_ACTION: 'admin_action',
  ERROR: 'error'
};

// Initialize audit logging directory
const initializeAuditLogging = async () => {
  try {
    await fs.mkdir(AUDIT_LOG_DIR, { recursive: true });
    console.log(`📋 Audit logging initialized: ${AUDIT_LOG_DIR}`);
  } catch (error) {
    console.error('Failed to initialize audit logging:', error);
    throw error;
  }
};

/**
 * Create audit log entry
 */
const createAuditEntry = (event, severity, category, details, user = null, request = null) => {
  const timestamp = new Date().toISOString();
  const sessionId = request?.sessionID || 'anonymous';
  
  const auditEntry = {
    // Core event data
    timestamp,
    event,
    severity,
    category,
    sessionId,
    
    // User information
    user: user ? {
      id: user.id,
      email: user.email,
      role: user.role
    } : null,
    
    // Request information
    request: request ? {
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.get('User-Agent'),
      method: request.method,
      url: request.originalUrl || request.url,
      referer: request.get('Referer'),
      origin: request.get('Origin')
    } : null,
    
    // Event details
    details: typeof details === 'object' ? details : { message: details },
    
    // Compliance metadata
    compliance: {
      gdprRelevant: isGDPRRelevant(category, details),
      retentionPeriod: getRetentionPeriod(category),
      dataController: 'ColdCaller Application'
    }
  };
  
  // Add integrity signature
  auditEntry.signature = createHMAC(JSON.stringify(auditEntry), AUDIT_SECRET);
  
  return auditEntry;
};

/**
 * Write audit log entry to file
 */
const writeAuditLog = async (auditEntry) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(AUDIT_LOG_DIR, `audit-${date}.jsonl`);
    const logLine = JSON.stringify(auditEntry) + '\n';
    
    await fs.appendFile(logFile, logLine, 'utf8');
    
    // Check and rotate log file if needed
    await rotateLogIfNeeded(logFile);
    
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw error to avoid disrupting application flow
  }
};

/**
 * Rotate log file if it exceeds maximum size
 */
const rotateLogIfNeeded = async (logFile) => {
  try {
    const stats = await fs.stat(logFile);
    if (stats.size > LOG_MAX_SIZE) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = logFile.replace('.jsonl', `-${timestamp}.jsonl`);
      await fs.rename(logFile, rotatedFile);
      console.log(`📋 Audit log rotated: ${rotatedFile}`);
    }
  } catch (error) {
    // File might not exist yet, which is fine
    if (error.code !== 'ENOENT') {
      console.error('Failed to rotate audit log:', error);
    }
  }
};

/**
 * Clean up old audit logs based on retention policy
 */
const cleanupOldLogs = async () => {
  try {
    const files = await fs.readdir(AUDIT_LOG_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);
    
    for (const file of files) {
      if (file.startsWith('audit-') && file.endsWith('.jsonl')) {
        const filePath = path.join(AUDIT_LOG_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`📋 Deleted old audit log: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old audit logs:', error);
  }
};

/**
 * Determine if event is GDPR relevant
 */
const isGDPRRelevant = (category, details) => {
  const gdprCategories = [
    EVENT_CATEGORIES.DATA_ACCESS,
    EVENT_CATEGORIES.DATA_MODIFICATION,
    EVENT_CATEGORIES.PRIVACY_EVENT,
    EVENT_CATEGORIES.AUTHENTICATION
  ];
  
  return gdprCategories.includes(category) ||
    (details && (
      details.personalData ||
      details.pii ||
      details.email ||
      details.phone
    ));
};

/**
 * Get retention period for event category
 */
const getRetentionPeriod = (category) => {
  const retentionPeriods = {
    [EVENT_CATEGORIES.AUTHENTICATION]: '2 years',
    [EVENT_CATEGORIES.AUTHORIZATION]: '2 years',
    [EVENT_CATEGORIES.DATA_ACCESS]: '1 year',
    [EVENT_CATEGORIES.DATA_MODIFICATION]: '7 years',
    [EVENT_CATEGORIES.SECURITY_VIOLATION]: '7 years',
    [EVENT_CATEGORIES.PRIVACY_EVENT]: '3 years',
    [EVENT_CATEGORIES.ADMIN_ACTION]: '7 years',
    [EVENT_CATEGORIES.ERROR]: '90 days'
  };
  
  return retentionPeriods[category] || '1 year';
};

/**
 * Main audit logging function
 */
const auditLog = async (event, severity, category, details, req) => {
  try {
    const user = req.user || null;
    const auditEntry = createAuditEntry(event, severity, category, details, user, req);
    
    // Write to file
    await writeAuditLog(auditEntry);
    
    // For critical events, also send to external logging service
    if (severity === SEVERITY.CRITICAL) {
      await sendToExternalLogging(auditEntry);
    }
    
    // For high/critical security violations, trigger alerts
    if ((severity === SEVERITY.HIGH || severity === SEVERITY.CRITICAL) &&
        category === EVENT_CATEGORIES.SECURITY_VIOLATION) {
      await triggerSecurityAlert(auditEntry);
    }
    
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
};

/**
 * Send critical events to external logging service
 */
const sendToExternalLogging = async (auditEntry) => {
  // TODO: Implement integration with external SIEM/logging service
  // Examples: Splunk, ELK Stack, Datadog, CloudWatch
  console.log('CRITICAL_AUDIT_EVENT:', auditEntry);
};

/**
 * Trigger security alerts for high-severity events
 */
const triggerSecurityAlert = async (auditEntry) => {
  // TODO: Implement alerting mechanism
  // Examples: Email, Slack, PagerDuty, SMS
  console.warn('SECURITY_ALERT_TRIGGERED:', {
    event: auditEntry.event,
    severity: auditEntry.severity,
    timestamp: auditEntry.timestamp,
    user: auditEntry.user?.email,
    ip: auditEntry.request?.ip
  });
};

/**
 * Middleware factory for common audit events
 */
const auditMiddleware = {
  
  // Log all authentication attempts
  authentication: (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 300;
      
      const event = isSuccess ? 'AUTHENTICATION_SUCCESS' : 'AUTHENTICATION_FAILED';
      const severity = isSuccess ? SEVERITY.LOW : SEVERITY.MEDIUM;
      
      auditLog(event, severity, EVENT_CATEGORIES.AUTHENTICATION, {
        success: isSuccess,
        statusCode,
        endpoint: req.originalUrl
      }, req);
      
      return originalSend.call(this, data);
    };
    
    next();
  },
  
  // Log data access events
  dataAccess: (resourceType) => {
    return (req, res, next) => {
      auditLog('DATA_ACCESS', SEVERITY.LOW, EVENT_CATEGORIES.DATA_ACCESS, {
        resourceType,
        action: req.method,
        resourceId: req.params.id
      }, req);
      
      next();
    };
  },
  
  // Log data modification events
  dataModification: (resourceType) => {
    return (req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        const statusCode = res.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        
        if (isSuccess && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          auditLog('DATA_MODIFICATION', SEVERITY.MEDIUM, EVENT_CATEGORIES.DATA_MODIFICATION, {
            resourceType,
            action: req.method,
            resourceId: req.params.id,
            success: true
          }, req);
        }
        
        return originalSend.call(this, data);
      };
      
      next();
    };
  },
  
  // Log security violations
  securityViolation: (violationType, details) => {
    return (req, res, next) => {
      auditLog('SECURITY_VIOLATION', SEVERITY.HIGH, EVENT_CATEGORIES.SECURITY_VIOLATION, {
        violationType,
        ...details
      }, req);
      
      next();
    };
  },
  
  // Log administrative actions
  adminAction: (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
      auditLog('ADMIN_ACTION', SEVERITY.MEDIUM, EVENT_CATEGORIES.ADMIN_ACTION, {
        action: `${req.method} ${req.originalUrl}`,
        adminUser: req.user.email
      }, req);
    }
    
    next();
  }
};

/**
 * Query audit logs
 */
const queryAuditLogs = async (filters = {}) => {
  const {
    startDate,
    endDate,
    user,
    category,
    severity,
    event,
    limit = 100
  } = filters;
  
  try {
    const results = [];
    const files = await fs.readdir(AUDIT_LOG_DIR);
    const logFiles = files.filter(f => f.startsWith('audit-') && f.endsWith('.jsonl'));
    
    for (const file of logFiles.sort().reverse()) {
      if (results.length >= limit) break;
      
      const filePath = path.join(AUDIT_LOG_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      
      for (const line of lines) {
        if (results.length >= limit) break;
        
        try {
          const entry = JSON.parse(line);
          
          // Apply filters
          if (startDate && new Date(entry.timestamp) < new Date(startDate)) continue;
          if (endDate && new Date(entry.timestamp) > new Date(endDate)) continue;
          if (user && entry.user?.email !== user) continue;
          if (category && entry.category !== category) continue;
          if (severity && entry.severity !== severity) continue;
          if (event && entry.event !== event) continue;
          
          results.push(entry);
        } catch (parseError) {
          console.error('Failed to parse audit log line:', parseError);
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    throw error;
  }
};

// Initialize audit logging on startup
initializeAuditLogging().catch(console.error);

// Cleanup old logs daily
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

module.exports = {
  auditLog,
  auditMiddleware,
  queryAuditLogs,
  SEVERITY,
  EVENT_CATEGORIES,
  initializeAuditLogging,
  cleanupOldLogs
};