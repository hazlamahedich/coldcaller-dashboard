const express = require('express');
const CallMonitoringMiddleware = require('../middleware/callMonitoring');
const WebSocketManager = require('../services/webSocketManager');

// SIPManager is optional due to ES module compatibility
let SIPManager = null;
try {
  SIPManager = require('../services/sipManager');
} catch (error) {
  console.log('⚠️  SIP Manager not available in healthDetailed route:', error.message);
  // Create a stub SIPManager for graceful degradation
  SIPManager = {
    getRegistrationStatus: async () => ({ registered: false, status: 'unavailable' }),
    getCallMetrics: () => ({ totalCalls: 0, activeCalls: 0, successfulCalls: 0 }),
    getActiveCalls: () => []
  };
}

const router = express.Router();

/**
 * @route   GET /api/health/detailed
 * @desc    Comprehensive system health check
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const healthData = await CallMonitoringMiddleware.getHealthCheck();
    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/health/monitoring
 * @desc    Detailed system monitoring information
 * @access  Private
 */
router.get('/monitoring', async (req, res) => {
  try {
    const stats = CallMonitoringMiddleware.getMonitoringStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get detailed health information',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/health/websocket
 * @desc    WebSocket connection statistics
 * @access  Public
 */
router.get('/websocket', (req, res) => {
  try {
    const stats = WebSocketManager.getStats();
    res.json({
      status: 'ok',
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get WebSocket statistics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/health/sip
 * @desc    SIP system status and metrics
 * @access  Public
 */
router.get('/sip', async (req, res) => {
  try {
    const sipStatus = await SIPManager.getRegistrationStatus();
    const callMetrics = SIPManager.getCallMetrics();
    
    res.json({
      status: 'ok',
      data: {
        registration: sipStatus,
        metrics: callMetrics,
        activeCalls: SIPManager.getActiveCalls()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get SIP status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;