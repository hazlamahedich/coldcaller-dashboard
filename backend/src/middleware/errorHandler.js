const { validationResult } = require('express-validator');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error status and message
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
  }

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }

  // Send error response
  res.status(status).json({
    success: false,
    error: {
      message: message,
      status: status,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
      status: 404
    }
  });
};

/**
 * Enhanced validation error handler middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Enhanced logging for debugging
    console.warn('Validation errors occurred:', {
      endpoint: req.path,
      method: req.method,
      errors: errors.array(),
      requestBody: req.body,
      requestQuery: req.query,
      requestParams: req.params,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Format errors with better structure
    const formattedErrors = errors.array().map(error => ({
      field: error.param || error.path,
      message: error.msg,
      value: error.value,
      code: 'VALIDATION_ERROR',
      location: error.location || 'body'
    }));

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        status: 400,
        details: formattedErrors,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            endpoint: req.path,
            method: req.method,
            totalErrors: formattedErrors.length
          }
        })
      }
    });
  }
  next();
};

module.exports = {
  errorHandler,
  notFoundHandler,
  handleValidationErrors
};