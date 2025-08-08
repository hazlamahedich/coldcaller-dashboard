/**
 * Standardized API response utilities
 */

/**
 * Success response helper
 * @param {object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  // Remove null data from response
  if (data === null) {
    delete response.data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error response helper
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {any} errors - Detailed error information
 */
const sendError = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    error: {
      message,
      status: statusCode,
    },
    timestamp: new Date().toISOString(),
  };

  // Add detailed errors if provided
  if (errors) {
    response.error.details = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Validation error response helper
 * @param {object} res - Express response object
 * @param {array} errors - Array of validation errors
 */
const sendValidationError = (res, errors) => {
  return sendError(res, 'Validation failed', 400, errors);
};

/**
 * Not found response helper
 * @param {object} res - Express response object
 * @param {string} resource - Resource that was not found
 */
const sendNotFound = (res, resource = 'Resource') => {
  return sendError(res, `${resource} not found`, 404);
};

/**
 * Unauthorized response helper
 * @param {object} res - Express response object
 * @param {string} message - Unauthorized message
 */
const sendUnauthorized = (res, message = 'Unauthorized access') => {
  return sendError(res, message, 401);
};

/**
 * Forbidden response helper
 * @param {object} res - Express response object
 * @param {string} message - Forbidden message
 */
const sendForbidden = (res, message = 'Access forbidden') => {
  return sendError(res, message, 403);
};

/**
 * Paginated response helper
 * @param {object} res - Express response object
 * @param {array} data - Array of items
 * @param {object} pagination - Pagination metadata
 * @param {string} message - Success message
 */
const sendPaginated = (res, data, pagination, message = 'Data retrieved successfully') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: pagination.page || 1,
      totalPages: pagination.totalPages || 1,
      totalItems: pagination.totalItems || data.length,
      itemsPerPage: pagination.limit || data.length,
      hasNextPage: pagination.hasNextPage || false,
      hasPrevPage: pagination.hasPrevPage || false,
    },
    timestamp: new Date().toISOString(),
  });
};

// For backward compatibility - support both import styles
const sendResponse = sendSuccess;

module.exports = {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendPaginated,
  sendResponse
};