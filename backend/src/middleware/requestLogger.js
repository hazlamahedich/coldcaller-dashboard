/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`🔍 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  // Log request body for POST/PUT requests (but not passwords)
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields
    delete sanitizedBody.password;
    delete sanitizedBody.token;
    console.log('📝 Request body:', JSON.stringify(sanitizedBody, null, 2));
  }

  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    console.log(`✅ ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    // Log error responses
    if (res.statusCode >= 400) {
      console.log('❌ Error response:', JSON.stringify(data, null, 2));
    }
    
    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  requestLogger
};