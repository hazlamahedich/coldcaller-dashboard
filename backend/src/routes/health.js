const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', asyncHandler(async (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB',
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    },
  };

  res.status(200).json({
    success: true,
    data: healthData,
  });
}));

/**
 * Detailed health check with dependencies
 * GET /health/detailed
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const checks = {
    server: 'healthy',
    database: 'not_configured', // Will be updated when database is added
    redis: 'not_configured',    // Will be updated when Redis is added
    external_apis: 'not_configured', // Will be updated when external APIs are added
  };

  const overallStatus = Object.values(checks).every(status => 
    status === 'healthy' || status === 'not_configured'
  ) ? 'healthy' : 'degraded';

  const detailedHealth = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    checks,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      architecture: process.arch,
    },
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    success: overallStatus === 'healthy',
    data: detailedHealth,
  });
}));

module.exports = router;