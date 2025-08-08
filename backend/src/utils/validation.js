/**
 * Validation utilities for data integrity and input sanitization
 * Provides schema validation and data sanitization functions
 */

const validator = require('validator');

/**
 * Lead data validation schema
 */
const leadSchema = {
  name: { 
    required: true, 
    type: 'string', 
    minLength: 1, 
    maxLength: 100,
    sanitize: 'escape'
  },
  company: { 
    required: true, 
    type: 'string', 
    minLength: 1, 
    maxLength: 200,
    sanitize: 'escape'
  },
  phone: { 
    required: true, 
    type: 'string', 
    format: 'phone',
    sanitize: 'normalizePhone'
  },
  email: { 
    required: true, 
    type: 'string', 
    format: 'email',
    sanitize: 'normalizeEmail'
  },
  status: { 
    required: true, 
    type: 'string', 
    enum: ['New', 'Follow-up', 'Qualified', 'Not Interested', 'Converted']
  },
  priority: { 
    required: false, 
    type: 'string', 
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  industry: { 
    required: false, 
    type: 'string', 
    maxLength: 100,
    sanitize: 'escape'
  },
  company_size: { 
    required: false, 
    type: 'string', 
    enum: ['1-10', '10-50', '50-200', '200-500', '500+']
  },
  title: { 
    required: false, 
    type: 'string', 
    maxLength: 100,
    sanitize: 'escape'
  },
  notes: { 
    required: false, 
    type: 'string', 
    maxLength: 1000,
    sanitize: 'escape'
  },
  tags: { 
    required: false, 
    type: 'array', 
    itemType: 'string',
    maxItems: 10
  },
  conversion_probability: { 
    required: false, 
    type: 'number', 
    min: 0, 
    max: 1
  }
};

/**
 * Script data validation schema
 */
const scriptSchema = {
  title: { 
    required: true, 
    type: 'string', 
    minLength: 1, 
    maxLength: 100,
    sanitize: 'escape'
  },
  category: { 
    required: true, 
    type: 'string', 
    enum: ['opening', 'gatekeeper', 'objection', 'closing', 'follow-up']
  },
  text: { 
    required: true, 
    type: 'string', 
    minLength: 10, 
    maxLength: 2000,
    sanitize: 'escape'
  },
  color: { 
    required: false, 
    type: 'string', 
    enum: ['blue', 'green', 'yellow', 'red', 'purple', 'gray']
  },
  variables: { 
    required: false, 
    type: 'array', 
    itemType: 'string'
  },
  tags: { 
    required: false, 
    type: 'array', 
    itemType: 'string',
    maxItems: 10
  },
  is_active: { 
    required: false, 
    type: 'boolean', 
    default: true
  },
  language: { 
    required: false, 
    type: 'string', 
    enum: ['en', 'es', 'fr', 'de'],
    default: 'en'
  },
  industry_specific: { 
    required: false, 
    type: 'boolean', 
    default: false
  }
};

/**
 * Call log validation schema
 */
const callLogSchema = {
  lead_id: { 
    required: true, 
    type: 'string', 
    minLength: 1
  },
  lead_name: { 
    required: true, 
    type: 'string', 
    minLength: 1, 
    maxLength: 100,
    sanitize: 'escape'
  },
  phone: { 
    required: true, 
    type: 'string', 
    format: 'phone',
    sanitize: 'normalizePhone'
  },
  agent_id: { 
    required: true, 
    type: 'string', 
    minLength: 1
  },
  agent_name: { 
    required: true, 
    type: 'string', 
    minLength: 1, 
    maxLength: 100,
    sanitize: 'escape'
  },
  date: { 
    required: true, 
    type: 'string', 
    format: 'date'
  },
  duration: { 
    required: true, 
    type: 'string', 
    format: 'duration'
  },
  outcome: { 
    required: true, 
    type: 'string', 
    enum: ['Connected', 'Voicemail', 'No Answer', 'Busy', 'Interested', 'Not Interested', 'Qualified', 'Callback Requested']
  },
  call_type: { 
    required: false, 
    type: 'string', 
    enum: ['inbound', 'outbound'],
    default: 'outbound'
  },
  disposition: { 
    required: false, 
    type: 'string', 
    enum: ['connected', 'no_answer', 'voicemail', 'busy', 'interested', 'not_interested', 'qualified', 'callback_requested']
  },
  notes: { 
    required: false, 
    type: 'string', 
    maxLength: 1000,
    sanitize: 'escape'
  },
  quality_score: { 
    required: false, 
    type: 'number', 
    min: 0, 
    max: 5
  },
  sentiment: { 
    required: false, 
    type: 'string', 
    enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
  }
};

/**
 * Audio clip validation schema
 */
const audioClipSchema = {
  name: { 
    required: true, 
    type: 'string', 
    minLength: 1, 
    maxLength: 100,
    sanitize: 'escape'
  },
  category: { 
    required: true, 
    type: 'string', 
    enum: ['greetings', 'objections', 'closing', 'follow-up']
  },
  duration: { 
    required: true, 
    type: 'string', 
    format: 'duration'
  },
  file_path: { 
    required: true, 
    type: 'string', 
    minLength: 1
  },
  format: { 
    required: false, 
    type: 'string', 
    enum: ['mp3', 'wav', 'm4a'],
    default: 'mp3'
  },
  script_id: { 
    required: false, 
    type: 'string'
  },
  speaker: { 
    required: false, 
    type: 'string'
  },
  tone: { 
    required: false, 
    type: 'string', 
    enum: ['professional', 'casual', 'authoritative', 'friendly', 'empathetic']
  },
  language: { 
    required: false, 
    type: 'string', 
    enum: ['en', 'es', 'fr', 'de'],
    default: 'en'
  },
  is_active: { 
    required: false, 
    type: 'boolean', 
    default: true
  }
};

/**
 * Available schemas
 */
const schemas = {
  leads: leadSchema,
  scripts: scriptSchema,
  callLogs: callLogSchema,
  audioClips: audioClipSchema
};

/**
 * Validate data against schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result with errors and sanitized data
 */
function validateData(data, schema) {
  const errors = [];
  const sanitized = {};

  // Check required fields
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check if required field is missing
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }

    // Skip validation for optional missing fields
    if (!rules.required && (value === undefined || value === null)) {
      if (rules.default !== undefined) {
        sanitized[field] = rules.default;
      }
      continue;
    }

    // Type validation
    if (!validateType(value, rules.type)) {
      errors.push(`Field '${field}' must be of type ${rules.type}`);
      continue;
    }

    // Format validation
    if (rules.format && !validateFormat(value, rules.format)) {
      errors.push(`Field '${field}' has invalid format for ${rules.format}`);
      continue;
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}`);
      continue;
    }

    // String length validation
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
        continue;
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Field '${field}' must be no more than ${rules.maxLength} characters`);
        continue;
      }
    }

    // Number range validation
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Field '${field}' must be at least ${rules.min}`);
        continue;
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Field '${field}' must be no more than ${rules.max}`);
        continue;
      }
    }

    // Array validation
    if (rules.type === 'array') {
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`Field '${field}' must have no more than ${rules.maxItems} items`);
        continue;
      }
      if (rules.itemType && !value.every(item => validateType(item, rules.itemType))) {
        errors.push(`Field '${field}' items must be of type ${rules.itemType}`);
        continue;
      }
    }

    // Sanitize value
    sanitized[field] = sanitizeValue(value, rules.sanitize);
  }

  // Add any extra fields that aren't in schema
  for (const [field, value] of Object.entries(data)) {
    if (!schema[field]) {
      sanitized[field] = value;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: sanitized
  };
}

/**
 * Validate data type
 * @param {*} value - Value to check
 * @param {string} type - Expected type
 * @returns {boolean} Is valid type
 */
function validateType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Validate specific formats
 * @param {*} value - Value to validate
 * @param {string} format - Format to check
 * @returns {boolean} Is valid format
 */
function validateFormat(value, format) {
  if (typeof value !== 'string') return false;

  switch (format) {
    case 'email':
      return validator.isEmail(value);
    case 'phone':
      // Accept various phone formats
      return /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''));
    case 'date':
      return validator.isISO8601(value) || validator.isDate(value);
    case 'duration':
      // Format: HH:MM:SS or MM:SS
      return /^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(value);
    case 'url':
      return validator.isURL(value);
    case 'uuid':
      return validator.isUUID(value);
    default:
      return true;
  }
}

/**
 * Sanitize value based on sanitization rule
 * @param {*} value - Value to sanitize
 * @param {string} sanitizeRule - Sanitization rule
 * @returns {*} Sanitized value
 */
function sanitizeValue(value, sanitizeRule) {
  if (!sanitizeRule || typeof value !== 'string') {
    return value;
  }

  switch (sanitizeRule) {
    case 'escape':
      return validator.escape(value);
    case 'normalizeEmail':
      return validator.normalizeEmail(value, { 
        gmail_remove_dots: false,
        gmail_remove_subaddress: false,
        outlookdotcom_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false
      });
    case 'normalizePhone':
      return value.replace(/[\s\-\(\)]/g, '');
    case 'trim':
      return value.trim();
    case 'lowercase':
      return value.toLowerCase();
    case 'uppercase':
      return value.toUpperCase();
    default:
      return value;
  }
}

/**
 * Validate record for specific collection
 * @param {string} collection - Collection name
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateRecord(collection, data) {
  const schema = schemas[collection];
  
  if (!schema) {
    throw new Error(`No validation schema found for collection: ${collection}`);
  }

  return validateData(data, schema);
}

/**
 * Batch validate multiple records
 * @param {string} collection - Collection name
 * @param {Array} records - Array of records to validate
 * @returns {Object} Batch validation result
 */
function validateBatch(collection, records) {
  const results = records.map((record, index) => ({
    index,
    ...validateRecord(collection, record)
  }));

  const validRecords = results.filter(r => r.isValid).map(r => r.data);
  const invalidRecords = results.filter(r => !r.isValid);

  return {
    isValid: invalidRecords.length === 0,
    validCount: validRecords.length,
    invalidCount: invalidRecords.length,
    validRecords,
    invalidRecords: invalidRecords.map(r => ({
      index: r.index,
      errors: r.errors
    })),
    totalProcessed: records.length
  };
}

/**
 * Clean and prepare data for storage
 * @param {Object} data - Raw data
 * @returns {Object} Cleaned data
 */
function cleanData(data) {
  const cleaned = { ...data };

  // Remove null/undefined values
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === null || cleaned[key] === undefined || cleaned[key] === '') {
      delete cleaned[key];
    }
  });

  // Ensure arrays are arrays
  ['tags', 'variables', 'scripts_used', 'audio_clips_used', 'objections', 'next_actions'].forEach(field => {
    if (cleaned[field] && !Array.isArray(cleaned[field])) {
      cleaned[field] = [cleaned[field]];
    }
  });

  return cleaned;
}

module.exports = {
  validateRecord,
  validateBatch,
  validateData,
  cleanData,
  schemas,
  validateType,
  validateFormat,
  sanitizeValue
};