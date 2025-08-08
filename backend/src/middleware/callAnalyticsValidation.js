/**
 * Call Analytics Validation Middleware
 * Validates request parameters for call analytics endpoints
 */

const { body, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

// Validation rules for analytics parameters
const validateAnalyticsParams = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in YYYY-MM-DD format'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be in YYYY-MM-DD format')
    .custom((value, { req }) => {
      if (req.query.start_date && value) {
        const startDate = new Date(req.query.start_date);
        const endDate = new Date(value);
        if (endDate < startDate) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),

  query('agent_id')
    .optional()
    .isString()
    .trim()
    .withMessage('Agent ID must be a string'),

  query('lead_source')
    .optional()
    .isString()
    .trim()
    .withMessage('Lead source must be a string'),

  query('outcome')
    .optional()
    .isIn([
      'No Answer', 'Voicemail', 'Busy', 'Not Interested', 'Interested', 
      'Qualified', 'Information Requested', 'Demo Scheduled', 'Callback Requested'
    ])
    .withMessage('Invalid call outcome'),

  query('quality_threshold')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Quality threshold must be between 1 and 5'),

  query('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a valid string'),

  query('granularity')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Granularity must be daily, weekly, or monthly'),

  // Middleware function to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }
    next();
  }
];

// Validation rules for report generation
const validateReportRequest = [
  body('reportType')
    .isIn(['daily_performance', 'weekly_scorecard', 'monthly_analysis', 'agent_coaching'])
    .withMessage('Invalid report type'),

  body('schedule')
    .isObject()
    .withMessage('Schedule must be an object')
    .custom((schedule) => {
      const requiredFields = ['frequency', 'time'];
      const validFrequencies = ['daily', 'weekly', 'monthly'];
      
      if (!requiredFields.every(field => field in schedule)) {
        throw new Error('Schedule must include frequency and time');
      }
      
      if (!validFrequencies.includes(schedule.frequency)) {
        throw new Error('Schedule frequency must be daily, weekly, or monthly');
      }
      
      return true;
    }),

  body('recipients')
    .isArray({ min: 1 })
    .withMessage('Recipients must be a non-empty array')
    .custom((recipients) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = recipients.filter(email => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        throw new Error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      }
      
      return true;
    }),

  body('customizations')
    .optional()
    .isObject()
    .withMessage('Customizations must be an object'),

  body('deliveryFormat')
    .optional()
    .isIn(['email', 'pdf', 'excel'])
    .withMessage('Delivery format must be email, pdf, or excel'),

  // Middleware function to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }
    next();
  }
];

// Validation rules for export requests
const validateExportParams = [
  query('format')
    .optional()
    .isIn(['json', 'csv', 'excel'])
    .withMessage('Export format must be json, csv, or excel'),

  body('exportType')
    .optional()
    .isIn(['performance', 'scorecards', 'quality', 'dashboard'])
    .withMessage('Export type must be performance, scorecards, quality, or dashboard'),

  body('includeCharts')
    .optional()
    .isBoolean()
    .withMessage('Include charts must be a boolean'),

  body('dateRange')
    .optional()
    .isObject()
    .withMessage('Date range must be an object')
    .custom((dateRange) => {
      if (dateRange && (dateRange.start || dateRange.end)) {
        if (dateRange.start && !/^\d{4}-\d{2}-\d{2}$/.test(dateRange.start)) {
          throw new Error('Start date must be in YYYY-MM-DD format');
        }
        if (dateRange.end && !/^\d{4}-\d{2}-\d{2}$/.test(dateRange.end)) {
          throw new Error('End date must be in YYYY-MM-DD format');
        }
        if (dateRange.start && dateRange.end && new Date(dateRange.end) < new Date(dateRange.start)) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),

  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),

  // Middleware function to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }
    next();
  }
];

// Validation rules for advanced filtering
const validateAdvancedFiltering = [
  query('agents')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return true; // Single agent
      }
      if (Array.isArray(value)) {
        return value.every(agent => typeof agent === 'string');
      }
      throw new Error('Agents must be a string or array of strings');
    }),

  query('outcomes')
    .optional()
    .custom((value) => {
      const validOutcomes = [
        'No Answer', 'Voicemail', 'Busy', 'Not Interested', 'Interested', 
        'Qualified', 'Information Requested', 'Demo Scheduled', 'Callback Requested'
      ];
      
      if (typeof value === 'string') {
        if (!validOutcomes.includes(value)) {
          throw new Error(`Invalid outcome: ${value}`);
        }
        return true;
      }
      if (Array.isArray(value)) {
        const invalidOutcomes = value.filter(outcome => !validOutcomes.includes(outcome));
        if (invalidOutcomes.length > 0) {
          throw new Error(`Invalid outcomes: ${invalidOutcomes.join(', ')}`);
        }
        return true;
      }
      throw new Error('Outcomes must be a string or array of strings');
    }),

  query('quality_range')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed.min && (parsed.min < 1 || parsed.min > 5)) {
            throw new Error('Quality range min must be between 1 and 5');
          }
          if (parsed.max && (parsed.max < 1 || parsed.max > 5)) {
            throw new Error('Quality range max must be between 1 and 5');
          }
          if (parsed.min && parsed.max && parsed.min > parsed.max) {
            throw new Error('Quality range min must be less than max');
          }
          return true;
        } catch (error) {
          throw new Error('Quality range must be valid JSON object');
        }
      }
      return true;
    }),

  query('duration_range')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed.min && parsed.min < 0) {
            throw new Error('Duration range min must be positive');
          }
          if (parsed.max && parsed.max < 0) {
            throw new Error('Duration range max must be positive');
          }
          if (parsed.min && parsed.max && parsed.min > parsed.max) {
            throw new Error('Duration range min must be less than max');
          }
          return true;
        } catch (error) {
          throw new Error('Duration range must be valid JSON object');
        }
      }
      return true;
    }),

  query('group_by')
    .optional()
    .isIn(['agent', 'outcome', 'source', 'industry', 'day', 'hour'])
    .withMessage('Group by must be agent, outcome, source, industry, day, or hour'),

  // Middleware function to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }
    next();
  }
];

// Validation for coaching insights requests
const validateCoachingRequest = [
  query('agent_id')
    .notEmpty()
    .withMessage('Agent ID is required for coaching insights')
    .isString()
    .trim()
    .withMessage('Agent ID must be a string'),

  query('focus_area')
    .optional()
    .isIn(['connection_rate', 'conversion_rate', 'quality_score', 'objection_handling', 'closing'])
    .withMessage('Focus area must be a valid coaching area'),

  // Middleware function to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }
    next();
  }
];

module.exports = {
  validateAnalyticsParams,
  validateReportRequest,
  validateExportParams,
  validateAdvancedFiltering,
  validateCoachingRequest
};