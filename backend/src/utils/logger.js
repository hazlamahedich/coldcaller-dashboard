/**
 * Simple Logger Utility
 * Provides consistent logging across the application
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  RESET: '\x1b[0m'
};

class Logger {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.enableColors = process.env.NODE_ENV !== 'production';
  }

  getLogLevel() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    return LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : LOG_LEVELS.INFO;
  }

  formatMessage(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    const prefix = this.enableColors ? 
      `${COLORS[level]}[${timestamp}] ${level}${COLORS.RESET}` :
      `[${timestamp}] ${level}`;
    
    let formattedMessage = `${prefix}: ${message}`;
    
    if (meta) {
      if (typeof meta === 'object') {
        formattedMessage += '\n' + JSON.stringify(meta, null, 2);
      } else {
        formattedMessage += ` ${meta}`;
      }
    }
    
    return formattedMessage;
  }

  error(message, meta = null) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      const formatted = this.formatMessage('ERROR', message, meta);
      console.error(formatted);
    }
  }

  warn(message, meta = null) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      const formatted = this.formatMessage('WARN', message, meta);
      console.warn(formatted);
    }
  }

  info(message, meta = null) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      const formatted = this.formatMessage('INFO', message, meta);
      console.log(formatted);
    }
  }

  debug(message, meta = null) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      const formatted = this.formatMessage('DEBUG', message, meta);
      console.log(formatted);
    }
  }

  // Convenience methods for specific use cases
  apiRequest(method, path, statusCode, responseTime) {
    this.info(`${method} ${path} - ${statusCode} (${responseTime}ms)`);
  }

  apiError(method, path, error) {
    this.error(`${method} ${path} - Error: ${error.message}`, {
      stack: error.stack,
      code: error.code
    });
  }

  dbQuery(query, duration) {
    this.debug(`DB Query (${duration}ms): ${query}`);
  }

  serviceCall(service, method, duration, success = true) {
    const status = success ? 'SUCCESS' : 'FAILED';
    this.debug(`Service Call - ${service}.${method} - ${status} (${duration}ms)`);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;