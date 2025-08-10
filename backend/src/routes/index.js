const express = require('express');

const router = express.Router();

/**
 * API root endpoint
 * GET /api
 */
router.get('/', async (req, res) => {
  try {
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
        batch_processing: '/api/batch',
        lead_scoring: '/api/lead-scoring',
        meetings: '/api/meetings',
        leads: '/api/leads',
        email: '/api/email',
        calls: '/api/calls (coming soon)',
        scripts: '/api/scripts (coming soon)',
        analytics: '/api/analytics (coming soon)',
      },
      documentation: 'API documentation will be available soon',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API status endpoint
 * GET /api/status
 */
router.get('/status', async (req, res) => {
  try {
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
          batch_lead_processing: 'operational',
          ai_lead_scoring: 'operational',
          meeting_scheduling: 'operational',
          leads_management: 'operational',
          email_management: 'operational',
          call_logging: 'coming_soon', 
          script_management: 'coming_soon',
          analytics_dashboard: 'coming_soon',
          audio_playbook: 'coming_soon',
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route imports
const chatRoutes = require('./ragChat');
const documentRoutes = require('./documents');
const twilioRoutes = require('./twilio');
const twilioAnalyticsRoutes = require('./twilioAnalytics');
const integrationsRoutes = require('./integrations');
const oauthAdminRoutes = require('./oauthAdmin');
const integrationTestingRoutes = require('./integrationTesting');
const batchRoutes = require('./batch');
const leadScoringRoutes = require('./leadScoring');
const meetingsRoutes = require('./meetings');
const leadsRoutes = require('./leads');
const emailRoutes = require('./email');

// Route usage - Mount RAG routes at /rag path
router.use('/rag', chatRoutes);
router.use('/chat', chatRoutes); // Keep both for backward compatibility
router.use('/documents', documentRoutes);
router.use('/twilio', twilioRoutes);
router.use('/twilio-analytics', twilioAnalyticsRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/oauth/admin', oauthAdminRoutes);
router.use('/integrations/test', integrationTestingRoutes);
router.use('/batch', batchRoutes);
router.use('/lead-scoring', leadScoringRoutes);
router.use('/meetings', meetingsRoutes);
router.use('/leads', leadsRoutes);
router.use('/email', emailRoutes);

// Future route imports will go here:
// import callsRoutes from './calls.js';
// import scriptsRoutes from './scripts.js';
// import analyticsRoutes from './analytics.js';

// Future route usage:
// router.use('/calls', callsRoutes);
// router.use('/scripts', scriptsRoutes);
// router.use('/analytics', analyticsRoutes);

module.exports = router;