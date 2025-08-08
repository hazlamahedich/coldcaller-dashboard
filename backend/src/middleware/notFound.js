/**
 * 404 Not Found middleware
 * Handles requests to undefined routes
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  
  // Log the 404 in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(`🔍 404 - Route not found: ${req.method} ${req.originalUrl}`);
  }

  // Create 404 response
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      status: 404,
      suggestions: [
        'Check the URL spelling',
        'Verify the HTTP method (GET, POST, etc.)',
        'Visit /api for available endpoints',
        'Check API documentation'
      ],
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  });
};