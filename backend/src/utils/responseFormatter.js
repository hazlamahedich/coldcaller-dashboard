/**
 * Standard API response formatter
 */
class ResponseFormatter {
  /**
   * Success response
   */
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error response
   */
  static error(res, message = 'Error occurred', statusCode = 500, details = null) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        status: statusCode,
        ...(details && { details }),
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Validation error response
   */
  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        status: 400,
        details: errors,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Not found response
   */
  static notFound(res, resource = 'Resource') {
    return res.status(404).json({
      success: false,
      error: {
        message: `${resource} not found`,
        status: 404,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Paginated response
   */
  static paginated(res, data, page, limit, total, message = 'Success') {
    const totalPages = Math.ceil(total / limit);
    
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ResponseFormatter;