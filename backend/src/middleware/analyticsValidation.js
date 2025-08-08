/**
 * Analytics-specific validation middleware
 */

/**
 * Helper function to check if date is valid
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && 
         (dateString.match(/^\d{4}-\d{2}-\d{2}$/) || dateString.includes('T'));
};

/**
 * Validate analytics query parameters
 */
const validateAnalyticsParams = (req, res, next) => {
  const { start_date, end_date, forecast_period } = req.query;

  // Validate date format if provided
  if (start_date && !isValidDate(start_date)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid start_date format. Use YYYY-MM-DD or ISO 8601 format'
    });
  }

  if (end_date && !isValidDate(end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid end_date format. Use YYYY-MM-DD or ISO 8601 format'
    });
  }

  // Validate date range logic
  if (start_date && end_date) {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'start_date must be before end_date'
      });
    }
  }

  // Validate forecast period
  if (forecast_period) {
    const period = parseInt(forecast_period);
    if (isNaN(period) || period < 1 || period > 365) {
      return res.status(400).json({
        success: false,
        message: 'forecast_period must be a number between 1 and 365'
      });
    }
  }

  next();
};

/**
 * Validate custom report request
 */
const validateReportRequest = (req, res, next) => {
  const { reportType, sections, format } = req.body;

  // Required fields
  if (!reportType) {
    return res.status(400).json({
      success: false,
      message: 'reportType is required'
    });
  }

  // Valid report types
  const validReportTypes = ['summary', 'detailed', 'executive', 'operational', 'custom'];
  if (!validReportTypes.includes(reportType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid reportType. Must be one of: ${validReportTypes.join(', ')}`
    });
  }

  // Valid sections
  if (sections && Array.isArray(sections)) {
    const validSections = ['leads', 'conversion', 'sources', 'agents', 'forecasting'];
    const invalidSections = sections.filter(section => !validSections.includes(section));
    
    if (invalidSections.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid sections: ${invalidSections.join(', ')}. Valid sections: ${validSections.join(', ')}`
      });
    }
  }

  // Valid formats
  if (format) {
    const validFormats = ['json', 'pdf', 'csv', 'excel'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}`
      });
    }
  }

  next();
};

/**
 * Validate export parameters
 */
const validateExportParams = (req, res, next) => {
  const { type } = req.params;
  const { format } = req.query;

  // Valid export types
  const validTypes = ['leads', 'agents', 'sources', 'dashboard', 'calls'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid export type. Must be one of: ${validTypes.join(', ')}`
    });
  }

  // Valid formats
  if (format) {
    const validFormats = ['json', 'csv', 'excel'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}`
      });
    }
  }

  next();
};

module.exports = {
  validateAnalyticsParams,
  validateReportRequest,
  validateExportParams
};