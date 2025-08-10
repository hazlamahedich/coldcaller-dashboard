const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * API root endpoint
 * GET /api
 */
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Cold Calling Dashboard API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      rag_chat: '/api/rag',
      chat: '/api/chat',
      documents: '/api/documents',
      twilio: '/api/twilio',
      twilio_analytics: '/api/twilio-analytics',
      integrations: '/api/integrations',
      oauth_admin: '/api/oauth/admin',
      integration_testing: '/api/integrations/test',
      leads: '/api/leads (coming soon)',
      calls: '/api/calls (coming soon)',
      scripts: '/api/scripts (coming soon)',
      analytics: '/api/analytics (coming soon)',
    },
    documentation: 'API documentation will be available soon',
  });
}));

/**
 * API status endpoint
 * GET /api/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: {
        chat_api: 'operational',
        rag_chatbot: 'operational',
        twilio_voice: 'operational',
        twilio_cost_monitoring: 'operational',
        leads_management: 'coming_soon',
        call_logging: 'coming_soon', 
        script_management: 'coming_soon',
        analytics_dashboard: 'coming_soon',
        audio_playbook: 'coming_soon',
      },
    },
  });
}));

// Route imports
const chatRoutes = require('./ragChat');
const documentRoutes = require('./documents');
const twilioRoutes = require('./twilio');
const twilioAnalyticsRoutes = require('./twilioAnalytics');
const integrationsRoutes = require('./integrations');
const oauthAdminRoutes = require('./oauthAdmin');
const integrationTestingRoutes = require('./integrationTesting');

// Route usage - Mount RAG routes at /rag path
router.use('/rag', chatRoutes);
router.use('/chat', chatRoutes); // Keep both for backward compatibility
router.use('/documents', documentRoutes);
router.use('/twilio', twilioRoutes);
router.use('/twilio-analytics', twilioAnalyticsRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/oauth/admin', oauthAdminRoutes);
router.use('/integrations/test', integrationTestingRoutes);

// Future route imports will go here:
// import leadsRoutes from './leads.js';
// import callsRoutes from './calls.js';
// import scriptsRoutes from './scripts.js';
// import analyticsRoutes from './analytics.js';

// Future route usage:
// router.use('/leads', leadsRoutes);
// router.use('/calls', callsRoutes);
// router.use('/scripts', scriptsRoutes);
// router.use('/analytics', analyticsRoutes);

module.exports = router;