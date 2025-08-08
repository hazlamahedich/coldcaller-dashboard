/**
 * Common utility functions for the Cold Calling Dashboard
 * Provides helper functions for data processing, formatting, and calculations
 */

const fs = require('fs');
const path = require('path');

/**
 * Date and time utilities
 */
const DateUtils = {
  /**
   * Format date to ISO string with timezone
   * @param {Date|string} date - Date to format
   * @param {string} timezone - Timezone (default: UTC)
   * @returns {string} Formatted ISO date string
   */
  toISOString(date = new Date(), timezone = 'UTC') {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString();
  },

  /**
   * Format date for display
   * @param {Date|string} date - Date to format
   * @param {string} format - Format type ('short', 'long', 'time')
   * @returns {string} Formatted date string
   */
  formatDate(date, format = 'short') {
    const d = date instanceof Date ? date : new Date(date);
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString('en-US');
      case 'long':
        return d.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'time':
        return d.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      case 'datetime':
        return `${this.formatDate(d, 'short')} ${this.formatDate(d, 'time')}`;
      default:
        return d.toLocaleDateString('en-US');
    }
  },

  /**
   * Calculate days between dates
   * @param {Date|string} date1 - Start date
   * @param {Date|string} date2 - End date
   * @returns {number} Days difference
   */
  daysBetween(date1, date2) {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    const timeDiff = Math.abs(d2 - d1);
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  },

  /**
   * Check if date is today
   * @param {Date|string} date - Date to check
   * @returns {boolean} Is today
   */
  isToday(date) {
    const d = date instanceof Date ? date : new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  },

  /**
   * Check if date is within last N days
   * @param {Date|string} date - Date to check
   * @param {number} days - Number of days
   * @returns {boolean} Is within range
   */
  isWithinDays(date, days) {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffTime = now - d;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= days;
  }
};

/**
 * String utilities
 */
const StringUtils = {
  /**
   * Capitalize first letter of each word
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize(str) {
    if (!str) return '';
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  /**
   * Generate slug from string
   * @param {string} str - String to convert
   * @returns {string} URL-safe slug
   */
  slugify(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  },

  /**
   * Truncate string with ellipsis
   * @param {string} str - String to truncate
   * @param {number} length - Max length
   * @returns {string} Truncated string
   */
  truncate(str, length = 100) {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - 3) + '...';
  },

  /**
   * Extract variables from template string
   * @param {string} template - Template string with [VARIABLE] placeholders
   * @returns {Array} Array of variable names
   */
  extractVariables(template) {
    if (!template) return [];
    const matches = template.match(/\[([^\]]+)\]/g) || [];
    return matches.map(match => match.replace(/[\[\]]/g, ''));
  },

  /**
   * Replace variables in template
   * @param {string} template - Template string
   * @param {Object} variables - Variable values
   * @returns {string} String with variables replaced
   */
  replaceVariables(template, variables = {}) {
    if (!template) return '';
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\[${key}\\]`, 'gi');
      result = result.replace(regex, value || `[${key}]`);
    });
    return result;
  },

  /**
   * Generate random string
   * @param {number} length - Length of string
   * @param {string} charset - Character set to use
   * @returns {string} Random string
   */
  randomString(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }
};

/**
 * Number and calculation utilities
 */
const NumberUtils = {
  /**
   * Format number as percentage
   * @param {number} value - Number to format (0-1 range)
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted percentage
   */
  toPercentage(value, decimals = 1) {
    if (typeof value !== 'number' || isNaN(value)) return '0%';
    return (value * 100).toFixed(decimals) + '%';
  },

  /**
   * Format number as currency
   * @param {number} value - Number to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency
   */
  toCurrency(value, currency = 'USD') {
    if (typeof value !== 'number' || isNaN(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  },

  /**
   * Format large numbers with K/M suffixes
   * @param {number} value - Number to format
   * @returns {string} Formatted number
   */
  formatLargeNumber(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  },

  /**
   * Calculate percentage change
   * @param {number} oldValue - Previous value
   * @param {number} newValue - New value
   * @returns {number} Percentage change (-1 to 1 range)
   */
  percentageChange(oldValue, newValue) {
    if (!oldValue || oldValue === 0) return newValue > 0 ? 1 : 0;
    return (newValue - oldValue) / oldValue;
  },

  /**
   * Round to specified decimal places
   * @param {number} value - Number to round
   * @param {number} decimals - Decimal places
   * @returns {number} Rounded number
   */
  round(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },

  /**
   * Calculate average of array
   * @param {Array<number>} numbers - Array of numbers
   * @returns {number} Average value
   */
  average(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) return 0;
    const valid = numbers.filter(n => typeof n === 'number' && !isNaN(n));
    if (valid.length === 0) return 0;
    return valid.reduce((sum, n) => sum + n, 0) / valid.length;
  }
};

/**
 * Array and data utilities
 */
const ArrayUtils = {
  /**
   * Group array by property
   * @param {Array} array - Array to group
   * @param {string|function} key - Property name or function
   * @returns {Object} Grouped object
   */
  groupBy(array, key) {
    if (!Array.isArray(array)) return {};
    
    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key];
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
      return groups;
    }, {});
  },

  /**
   * Sort array by multiple criteria
   * @param {Array} array - Array to sort
   * @param {Array} criteria - Array of {field, direction} objects
   * @returns {Array} Sorted array
   */
  multiSort(array, criteria) {
    if (!Array.isArray(array) || !Array.isArray(criteria)) return array;
    
    return [...array].sort((a, b) => {
      for (const { field, direction = 'asc' } of criteria) {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  },

  /**
   * Find unique values in array
   * @param {Array} array - Source array
   * @param {string} key - Property to check (optional)
   * @returns {Array} Array of unique values
   */
  unique(array, key) {
    if (!Array.isArray(array)) return [];
    
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }
    
    return [...new Set(array)];
  },

  /**
   * Paginate array
   * @param {Array} array - Array to paginate
   * @param {number} page - Page number (1-based)
   * @param {number} pageSize - Items per page
   * @returns {Object} Pagination result
   */
  paginate(array, page = 1, pageSize = 10) {
    if (!Array.isArray(array)) return { items: [], pagination: {} };
    
    const total = array.length;
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const items = array.slice(startIndex, endIndex);
    
    return {
      items,
      pagination: {
        currentPage,
        pageSize,
        total,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
        startIndex: startIndex + 1,
        endIndex
      }
    };
  }
};

/**
 * Duration utilities
 */
const DurationUtils = {
  /**
   * Parse duration string to seconds
   * @param {string} duration - Duration in format "MM:SS" or "HH:MM:SS"
   * @returns {number} Duration in seconds
   */
  parseToSeconds(duration) {
    if (!duration || typeof duration !== 'string') return 0;
    
    const parts = duration.split(':').map(p => parseInt(p, 10));
    
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    
    return 0;
  },

  /**
   * Format seconds to duration string
   * @param {number} seconds - Seconds to format
   * @param {boolean} includeHours - Include hours in output
   * @returns {string} Formatted duration
   */
  formatSeconds(seconds, includeHours = false) {
    if (typeof seconds !== 'number' || seconds < 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (includeHours || hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  },

  /**
   * Add durations
   * @param {Array<string>} durations - Array of duration strings
   * @returns {string} Sum of durations
   */
  addDurations(durations) {
    if (!Array.isArray(durations)) return '00:00';
    
    const totalSeconds = durations.reduce((sum, duration) => {
      return sum + this.parseToSeconds(duration);
    }, 0);
    
    return this.formatSeconds(totalSeconds, true);
  }
};

/**
 * File system utilities
 */
const FileUtils = {
  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   */
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  /**
   * Get file size in bytes
   * @param {string} filePath - File path
   * @returns {number} File size or 0 if not found
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Check if file exists
   * @param {string} filePath - File path
   * @returns {boolean} File exists
   */
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }
};

/**
 * Analytics utilities
 */
const Analytics = {
  /**
   * Calculate conversion funnel
   * @param {Object} data - Data with stage counts
   * @returns {Object} Funnel analysis
   */
  calculateFunnel(data) {
    const stages = Object.entries(data).map(([stage, count]) => ({ stage, count }));
    const total = stages[0]?.count || 0;
    
    return stages.map((stage, index) => ({
      ...stage,
      rate: total > 0 ? stage.count / total : 0,
      dropOff: index > 0 ? (stages[index - 1].count - stage.count) / stages[index - 1].count : 0
    }));
  },

  /**
   * Calculate trend analysis
   * @param {Array} data - Time series data
   * @param {string} dateField - Date field name
   * @param {string} valueField - Value field name
   * @returns {Object} Trend analysis
   */
  calculateTrend(data, dateField, valueField) {
    if (!Array.isArray(data) || data.length < 2) {
      return { trend: 'stable', change: 0, direction: 0 };
    }

    const sorted = data.sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
    const first = sorted[0][valueField] || 0;
    const last = sorted[sorted.length - 1][valueField] || 0;
    const change = NumberUtils.percentageChange(first, last);
    
    return {
      trend: Math.abs(change) > 0.05 ? (change > 0 ? 'increasing' : 'decreasing') : 'stable',
      change: Math.abs(change),
      direction: change > 0 ? 1 : change < 0 ? -1 : 0,
      firstValue: first,
      lastValue: last
    };
  }
};

module.exports = {
  DateUtils,
  StringUtils,
  NumberUtils,
  ArrayUtils,
  DurationUtils,
  FileUtils,
  Analytics
};