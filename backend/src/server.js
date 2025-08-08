const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

// Route imports
const leadsRoutes = require('./routes/leads');
const scriptsRoutes = require('./routes/scripts');
const audioRoutes = require('./routes/audio');
const enhancedAudioRoutes = require('./routes/enhancedAudio');
const callsRoutes = require('./routes/calls');
const sipRoutes = require('./routes/sip');
const healthRoutes = require('./routes/healthDetailed');
const analyticsRoutes = require('./routes/analytics');
const callAnalyticsRoutes = require('./routes/callAnalytics');
const CallMonitoringMiddleware = require('./middleware/callMonitoring');

// Services
const WebSocketManager = require('./services/webSocketManager');
const SIPManager = require('./services/sipManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow audio streaming
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      mediaSrc: ["'self'", "data:", "blob:"], // Allow audio/video content
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'], // For audio streaming
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'] // Support range requests
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));
app.use(requestLogger);

// Call monitoring middleware
app.use('/api/calls', CallMonitoringMiddleware.trackCallRequest);
app.use('/api/calls', CallMonitoringMiddleware.monitorCallQuality);
app.use('/api/sip', CallMonitoringMiddleware.logSIPEvents);
app.use(CallMonitoringMiddleware.performanceMonitor);
app.use(CallMonitoringMiddleware.memoryMonitor);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/leads', leadsRoutes);
app.use('/api/scripts', scriptsRoutes);

// Audio routes - Enhanced routes take precedence for file operations
app.use('/api/audio', enhancedAudioRoutes);

app.use('/api/calls', callsRoutes);
app.use('/api/sip', sipRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/call-analytics', callAnalyticsRoutes);

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