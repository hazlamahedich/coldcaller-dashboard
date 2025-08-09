// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { authenticate } = require('./middleware/auth');
const { 
  xssProtection, 
  sqlInjectionProtection, 
  inputSizeValidation,
  createAdvancedRateLimit,
  secureFileUpload,
  getCSPDirectives
} = require('./middleware/security');

// Route imports
const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const scriptsRoutes = require('./routes/scripts');
const audioRoutes = require('./routes/audio');
const enhancedAudioRoutes = require('./routes/enhancedAudio');
const callsRoutes = require('./routes/calls');
const sipRoutes = require('./routes/sip');
const healthRoutes = require('./routes/healthDetailed');
const analyticsRoutes = require('./routes/analytics');
const callAnalyticsRoutes = require('./routes/callAnalytics');
const twilioRoutes = require('./routes/twilio');
const twilioTestRoutes = require('./routes/twilio-test');
const ragChatRoutes = require('./routes/ragChat');
const chatRoutes = require('./routes/chat_existing');
const documentsRoutes = require('./routes/documents');
const CallMonitoringMiddleware = require('./middleware/callMonitoring');

// Services
const WebSocketManager = require('./services/webSocketManager');
const SIPManager = require('./services/sipManager');
const { testEncryption } = require('./utils/encryption');

const app = express();
const PORT = process.env.PORT || 3001;

// Test encryption on startup
const encryptionTest = testEncryption();
if (!encryptionTest.success) {
  console.error('🚨 Encryption system failed:', encryptionTest.error);
  process.exit(1);
} else {
  console.log('🔐 Encryption system initialized successfully');
}

// Enhanced security middleware configuration
const isProduction = process.env.NODE_ENV === 'production';

// Comprehensive helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: getCSPDirectives(),
    reportOnly: !isProduction // Report-only in development
  },
  crossOriginEmbedderPolicy: false, // Allow audio streaming
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
}));

// CORS configuration with security enhancements
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001', // Allow backend self-requests (proxy issue)
      'http://localhost:3002', // Allow React dev server on port 3002
      'http://localhost:3003', // Allow React dev server on port 3003
      'https://coldcaller.com',
      'https://app.coldcaller.com'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('SECURITY_ALERT:', {
        type: 'CORS_VIOLATION',
        origin,
        timestamp: new Date().toISOString()
      });
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Range',
    'X-Requested-With',
    'X-API-Key'
  ],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Compression for better performance
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Advanced rate limiting with progressive delays
const [authSlowDown, authLimiter] = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per window
  delayAfter: 2,
  delayMs: 1000,
  message: 'Too many authentication attempts'
});

const [apiSlowDown, apiLimiter] = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 API requests per window
  delayAfter: 250,
  delayMs: 100,
  message: 'Too many API requests'
});

// Apply rate limiting to different endpoints
app.use('/api/auth/login', authSlowDown, authLimiter);
app.use('/api/auth/register', authSlowDown, authLimiter);
app.use('/api/', apiSlowDown, apiLimiter);

// Raw body parser for webhook signatures
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Test endpoints (before security middleware to avoid blocking)
app.use('/api/test-call', require('./routes/simple-call-test')); // Simple call test endpoints without authentication

// Security middleware stack
app.use(xssProtection);
app.use(sqlInjectionProtection);
app.use(inputSizeValidation);

// Logging middleware with security enhancements
const morganFormat = isProduction ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  skip: (req, res) => {
    // Skip logging health checks in production
    return isProduction && req.url.startsWith('/api/health');
  }
}));
app.use(requestLogger);

// Call monitoring middleware
app.use('/api/calls', CallMonitoringMiddleware.trackCallRequest);
app.use('/api/calls', CallMonitoringMiddleware.monitorCallQuality);
app.use('/api/sip', CallMonitoringMiddleware.logSIPEvents);
app.use(CallMonitoringMiddleware.performanceMonitor);
app.use(CallMonitoringMiddleware.memoryMonitor);

// Public health check endpoint (no authentication required)
app.get('/api/health', (req, res) => {
  const encryptionStatus = testEncryption();
  res.json({ 
    status: 'ok',  // Frontend expects lowercase 'ok'
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    security: {
      encryption: encryptionStatus.success ? 'operational' : 'failed',
      https: req.secure || req.headers['x-forwarded-proto'] === 'https'
    }
  });
});

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Public endpoints for dashboard stats (no auth required)
const { getCallStats, getAllCallLogs } = require('./controllers/callsController');

app.get('/api/calls/stats/today', (req, res) => {
  req.query.period = 'today';
  getCallStats(req, res);
});

app.get('/api/calls/recent', (req, res) => {
  const { limit = 10 } = req.query;
  req.query.limit = limit;
  req.query.page = 1;
  getAllCallLogs(req, res);
});

// Protected API routes (require authentication)
app.use('/api/leads', authenticate, leadsRoutes);
app.use('/api/scripts', authenticate, scriptsRoutes);
app.use('/api/rag', ragChatRoutes); // RAG chat routes for AI-powered help
app.use('/api/chat', chatRoutes); // Existing chat routes
app.use('/api/documents', documentsRoutes); // Document serving routes for chatbot sources

// Audio routes with file upload security
app.use('/api/audio', authenticate, secureFileUpload, enhancedAudioRoutes);

app.use('/api/calls', authenticate, callsRoutes);
app.use('/api/sip', authenticate, sipRoutes);
app.use('/api/twilio', twilioRoutes); // Twilio webhooks need to be accessible without auth
app.use('/api/health', authenticate, healthRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/call-analytics', authenticate, callAnalyticsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚀 Cold Caller API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📞 SIP Management: http://localhost:${PORT}/api/sip/status`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
});

// Initialize WebSocket server
WebSocketManager.initialize(server);

// Set up real-time metrics broadcasting
setInterval(() => {
  const metrics = {
    timestamp: new Date().toISOString(),
    sipStatus: SIPManager.getRegistrationStatus(),
    activeCalls: SIPManager.getActiveCalls().length,
    systemUptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  };
  WebSocketManager.sendMetricsUpdate(metrics);
}, 10000); // Every 10 seconds

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  WebSocketManager.close();
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  WebSocketManager.close();
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;