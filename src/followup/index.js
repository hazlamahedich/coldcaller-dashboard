const express = require('express');
const followupRoutes = require('./routes/followup.routes');
const taskRoutes = require('./routes/task.routes');
const reminderProcessorJob = require('./jobs/reminder-processor.job');

/**
 * Follow-up Module Entry Point
 * Configures and exports the complete follow-up management system
 */

const router = express.Router();

// Mount routes
router.use('/followups', followupRoutes);
router.use('/tasks', taskRoutes);

// Module initialization
const initializeFollowupModule = async () => {
  try {
    console.log('Initializing follow-up management module...');

    // Start background job processors
    await reminderProcessorJob.start();

    console.log('Follow-up management module initialized successfully');

    return {
      success: true,
      message: 'Follow-up management module is ready',
      features: [
        'Automated follow-up scheduling',
        'Smart task management with priority queuing',
        'Multi-channel notifications (email, push, SMS, desktop)',
        'Calendar integration (Google, Outlook)',
        'Performance analytics and ROI tracking',
        'Escalation management',
        'Background job processing',
        'A/B testing framework for follow-up strategies'
      ]
    };

  } catch (error) {
    console.error('Error initializing follow-up management module:', error);
    throw error;
  }
};

// Module cleanup
const shutdownFollowupModule = async () => {
  try {
    console.log('Shutting down follow-up management module...');

    // Stop background jobs
    await reminderProcessorJob.stop();

    console.log('Follow-up management module shut down successfully');

  } catch (error) {
    console.error('Error shutting down follow-up management module:', error);
    throw error;
  }
};

module.exports = {
  router,
  initialize: initializeFollowupModule,
  shutdown: shutdownFollowupModule,
  
  // Export services for direct use
  services: {
    followupScheduler: require('./services/followup-scheduler.service'),
    taskManagement: require('./services/task-management.service'),
    notification: require('./services/notification.service'),
    calendar: require('./services/calendar.service'),
    performanceAnalytics: require('./services/performance-analytics.service')
  },

  // Export models
  models: {
    Followup: require('./models/followup.model'),
    Task: require('./models/task.model'),
    AutomationRule: require('./models/automation-rule.model'),
    FollowupSequence: require('./models/followup-sequence.model')
  },

  // Export jobs
  jobs: {
    reminderProcessor: reminderProcessorJob
  }
};