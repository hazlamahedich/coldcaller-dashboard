/**
 * Enhanced validation logging utility
 * Provides structured logging for validation failures and debugging
 */

class ValidationLogger {
  /**
   * Log validation failure with context
   */
  static logValidationFailure(req, errors, context = {}) {
    const logEntry = {
      type: 'VALIDATION_FAILURE',
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      errors: errors,
      requestData: {
        body: this.sanitizeForLogging(req.body),
        query: this.sanitizeForLogging(req.query),
        params: this.sanitizeForLogging(req.params)
      },
      ...context
    };

    console.warn('🔍 VALIDATION_FAILURE:', JSON.stringify(logEntry, null, 2));
    return logEntry;
  }

  /**
   * Log successful validation for debugging
   */
  static logValidationSuccess(req, context = {}) {
    if (process.env.NODE_ENV === 'development' && process.env.LOG_VALIDATION_SUCCESS === 'true') {
      const logEntry = {
        type: 'VALIDATION_SUCCESS',
        timestamp: new Date().toISOString(),
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
        ...context
      };

      console.log('✅ VALIDATION_SUCCESS:', JSON.stringify(logEntry, null, 2));
    }
  }

  /**
   * Log validation patterns and trends
   */
  static logValidationStats(stats) {
    console.info('📊 VALIDATION_STATS:', {
      timestamp: new Date().toISOString(),
      ...stats
    });
  }

  /**
   * Sanitize sensitive data for logging
   */
  static sanitizeForLogging(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = JSON.parse(JSON.stringify(data));
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowercaseKey = key.toLowerCase();
          
          if (sensitiveFields.some(field => lowercaseKey.includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Create validation error context for enhanced debugging
   */
  static createErrorContext(field, value, expectedFormat, actualIssue) {
    return {
      field,
      receivedValue: value,
      expectedFormat,
      actualIssue,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate validation summary for monitoring
   */
  static generateValidationSummary(failures, successes, timeWindow = '1h') {
    const total = failures + successes;
    const failureRate = total > 0 ? (failures / total * 100).toFixed(2) : 0;

    return {
      timeWindow,
      totalRequests: total,
      validationFailures: failures,
      validationSuccesses: successes,
      failureRate: `${failureRate}%`,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ValidationLogger;