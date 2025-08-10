const express = require('express');
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  // Original endpoints
  configureSIP,
  getSIPSettings,
  testSIPConnection,
  getSIPStatus,
  updateSIPCredentials,
  getSIPProviders,
  registerSIPAccount,
  unregisterSIPAccount,
  
  // Enhanced analytics endpoints
  getSIPAnalytics,
  getSIPQualityMetrics,
  getRealTimeSIPMetrics,
  getSIPConfigComparison,
  
  // Monitoring endpoints
  getSIPMonitoring,
  getSIPSystemHealth,
  getSIPDiagnostics,
  runSIPNetworkTest,
  updateSIPMonitoringConfig,
  resolveSIPAlert,
  
  // Call logs endpoints
  getSIPCallLogs,
  getSIPCallDetail,
  
  // Configuration management
  getSIPProviderTemplates,
  createSIPConfigFromTemplate,
  getSIPConfigHealth
} = require('../controllers/sipController');

const router = express.Router();

// Validation rules for SIP configuration
const sipConfigValidation = [
  body('provider')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Provider name is required (1-100 characters)'),
  body('server')
    .isURL({ require_protocol: false })
    .withMessage('Valid SIP server address is required'),
  body('port')
    .isInt({ min: 1, max: 65535 })
    .withMessage('Valid port number is required (1-65535)'),
  body('username')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('SIP username is required (1-100 characters)'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('SIP password is required'),
  body('domain')
    .optional()
    .isURL({ require_protocol: false })
    .withMessage('Valid domain is required'),
  body('transport')
    .optional()
    .isIn(['UDP', 'TCP', 'TLS', 'WS', 'WSS'])
    .withMessage('Transport must be one of: UDP, TCP, TLS, WS, WSS'),
  body('enableRecording')
    .optional()
    .isBoolean()
    .withMessage('enableRecording must be a boolean'),
  body('recordingPath')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Recording path cannot exceed 500 characters')
];

// Validation for credential updates
const sipCredentialValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Username must be 1-100 characters'),
  body('password')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name cannot exceed 100 characters')
];

/**
 * @route   POST /api/sip/configure
 * @desc    Configure SIP server settings
 * @access  Private
 */
router.post('/configure', sipConfigValidation, handleValidationErrors, configureSIP);

/**
 * @route   GET /api/sip/settings
 * @desc    Get current SIP configuration (sanitized)
 * @access  Private
 */
router.get('/settings', getSIPSettings);

/**
 * @route   POST /api/sip/test
 * @desc    Test SIP connection and registration
 * @access  Private
 */
router.post('/test', testSIPConnection);

/**
 * @route   GET /api/sip/status
 * @desc    Get current SIP registration status
 * @access  Public
 */
router.get('/status', getSIPStatus);

/**
 * @route   PUT /api/sip/credentials
 * @desc    Update SIP authentication credentials
 * @access  Private
 */
router.put('/credentials', sipCredentialValidation, handleValidationErrors, updateSIPCredentials);

/**
 * @route   GET /api/sip/providers
 * @desc    Get list of supported SIP providers with default configurations
 * @access  Public
 */
router.get('/providers', getSIPProviders);

/**
 * @route   POST /api/sip/register
 * @desc    Register SIP account with current configuration
 * @access  Private
 */
router.post('/register', registerSIPAccount);

/**
 * @route   POST /api/sip/unregister
 * @desc    Unregister SIP account
 * @access  Private
 */
router.post('/unregister', unregisterSIPAccount);

// ============================================================================
// ENHANCED SIP ANALYTICS & MONITORING ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/sip/analytics
 * @desc    Get comprehensive SIP analytics
 * @access  Private
 * @query   configurationId - Filter by specific configuration
 * @query   timeRange - Time range (1h, 24h, 7d, 30d, 90d)
 */
router.get('/analytics', getSIPAnalytics);

/**
 * @route   GET /api/sip/quality-metrics
 * @desc    Get SIP quality metrics and analysis
 * @access  Private
 * @query   configurationId - Filter by specific configuration
 * @query   timeRange - Time range (1h, 24h, 7d, 30d, 90d)
 */
router.get('/quality-metrics', getSIPQualityMetrics);

/**
 * @route   GET /api/sip/realtime-metrics
 * @desc    Get real-time SIP metrics
 * @access  Public
 */
router.get('/realtime-metrics', getRealTimeSIPMetrics);

/**
 * @route   GET /api/sip/config-comparison
 * @desc    Get SIP configuration performance comparison
 * @access  Private
 * @query   timeRange - Time range for comparison (default: 30d)
 */
router.get('/config-comparison', getSIPConfigComparison);

/**
 * @route   GET /api/sip/monitoring
 * @desc    Get SIP monitoring status and alerts
 * @access  Private
 */
router.get('/monitoring', getSIPMonitoring);

/**
 * @route   GET /api/sip/system-health
 * @desc    Get SIP system health assessment
 * @access  Private
 */
router.get('/system-health', getSIPSystemHealth);

/**
 * @route   GET /api/sip/diagnostics
 * @desc    Get SIP network diagnostics and traces
 * @access  Private
 */
router.get('/diagnostics', getSIPDiagnostics);

/**
 * @route   POST /api/sip/network-test
 * @desc    Run comprehensive SIP network test
 * @access  Private
 * @body    configurationId - Configuration to test (optional)
 */
router.post('/network-test', [
  body('configurationId')
    .optional()
    .isUUID()
    .withMessage('Configuration ID must be a valid UUID')
], handleValidationErrors, runSIPNetworkTest);

/**
 * @route   PUT /api/sip/monitoring/config
 * @desc    Update SIP monitoring configuration
 * @access  Private
 */
router.put('/monitoring/config', [
  body('thresholds')
    .optional()
    .isObject()
    .withMessage('Thresholds must be an object'),
  body('thresholds.successRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Success rate threshold must be between 0 and 100'),
  body('thresholds.mosScore')
    .optional()
    .isFloat({ min: 1.0, max: 5.0 })
    .withMessage('MOS score threshold must be between 1.0 and 5.0'),
  body('thresholds.maxLatency')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max latency must be a positive integer')
], handleValidationErrors, updateSIPMonitoringConfig);

/**
 * @route   POST /api/sip/alerts/:alertId/resolve
 * @desc    Resolve SIP alert
 * @access  Private
 */
router.post('/alerts/:alertId/resolve', resolveSIPAlert);

// ============================================================================
// SIP CALL LOGS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/sip/call-logs
 * @desc    Get SIP call logs with filtering and pagination
 * @access  Private
 * @query   configurationId - Filter by configuration
 * @query   status - Filter by call status
 * @query   direction - Filter by call direction (inbound/outbound)
 * @query   outcome - Filter by call outcome
 * @query   startDate - Filter by start date
 * @query   endDate - Filter by end date
 * @query   limit - Number of records to return (default: 50)
 * @query   offset - Number of records to skip (default: 0)
 * @query   sortBy - Sort field (default: start_time)
 * @query   sortOrder - Sort order ASC/DESC (default: DESC)
 */
router.get('/call-logs', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
], handleValidationErrors, getSIPCallLogs);

/**
 * @route   GET /api/sip/call-logs/:callId
 * @desc    Get detailed SIP call information
 * @access  Private
 */
router.get('/call-logs/:callId', getSIPCallDetail);

// ============================================================================
// SIP CONFIGURATION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/sip/provider-templates
 * @desc    Get SIP provider template configurations
 * @access  Public
 */
router.get('/provider-templates', getSIPProviderTemplates);

/**
 * @route   POST /api/sip/config/from-template
 * @desc    Create new SIP configuration from provider template
 * @access  Private
 */
router.post('/config/from-template', [
  body('templateId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Template ID is required'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Configuration name is required (1-100 characters)'),
  body('username')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('SIP username is required (1-100 characters)'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('SIP password is required'),
  body('customSettings')
    .optional()
    .isObject()
    .withMessage('Custom settings must be an object')
], handleValidationErrors, createSIPConfigFromTemplate);

/**
 * @route   GET /api/sip/config/:configId/health
 * @desc    Get SIP configuration health status
 * @access  Private
 */
router.get('/config/:configId/health', [
  query('configId')
    .isUUID()
    .withMessage('Configuration ID must be a valid UUID')
], handleValidationErrors, getSIPConfigHealth);

module.exports = router;