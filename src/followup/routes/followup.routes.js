const express = require('express');
const followupController = require('../controllers/followup.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { body, param, query } = require('express-validator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Validation schemas
 */
const createFollowupValidation = [
  body('leadId').isUUID().withMessage('Valid lead ID is required'),
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('scheduledFor').isISO8601().withMessage('Valid scheduled date is required'),
  body('type').optional().isIn(['call', 'email', 'sms', 'meeting', 'demo', 'proposal', 'quote', 'contract', 'followup_call', 'nurture', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('duration').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('callId').optional().isUUID(),
  body('templateId').optional().isUUID(),
  body('description').optional().trim(),
  validateRequest
];

const updateFollowupValidation = [
  param('id').isUUID().withMessage('Valid follow-up ID is required'),
  body('title').optional().notEmpty().trim(),
  body('scheduledFor').optional().isISO8601(),
  body('type').optional().isIn(['call', 'email', 'sms', 'meeting', 'demo', 'proposal', 'quote', 'contract', 'followup_call', 'nurture', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'overdue', 'rescheduled']),
  body('duration').optional().isInt({ min: 1, max: 480 }),
  body('description').optional().trim(),
  validateRequest
];

const rescheduleValidation = [
  param('id').isUUID().withMessage('Valid follow-up ID is required'),
  body('newDate').isISO8601().withMessage('Valid new date is required'),
  body('reason').optional().trim(),
  validateRequest
];

const completeFollowupValidation = [
  param('id').isUUID().withMessage('Valid follow-up ID is required'),
  body('outcome').isIn(['successful', 'no_answer', 'voicemail', 'callback_requested', 'not_interested', 'follow_up_scheduled', 'meeting_scheduled', 'demo_scheduled', 'proposal_requested', 'closed_won', 'closed_lost', 'other']).withMessage('Valid outcome is required'),
  body('notes').optional().trim(),
  validateRequest
];

const bulkCreateValidation = [
  body('followups').isArray({ min: 1 }).withMessage('Array of follow-ups is required'),
  body('followups.*.leadId').isUUID().withMessage('Valid lead ID is required for each follow-up'),
  body('followups.*.title').notEmpty().withMessage('Title is required for each follow-up'),
  body('followups.*.scheduledFor').isISO8601().withMessage('Valid scheduled date is required for each follow-up'),
  validateRequest
];

/**
 * Routes
 */

// GET /api/followups - Get all follow-ups with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'overdue', 'rescheduled']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('type').optional().isIn(['call', 'email', 'sms', 'meeting', 'demo', 'proposal', 'quote', 'contract', 'followup_call', 'nurture', 'other']),
  query('userId').optional().isUUID(),
  query('leadId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('sortBy').optional().isIn(['scheduledFor', 'createdAt', 'priority', 'status', 'type']),
  query('sortOrder').optional().isIn(['ASC', 'DESC']),
  validateRequest
], followupController.getFollowups);

// GET /api/followups/upcoming - Get upcoming follow-ups for user
router.get('/upcoming', [
  query('days').optional().isInt({ min: 1, max: 30 }),
  validateRequest
], followupController.getUpcomingFollowups);

// GET /api/followups/overdue - Get overdue follow-ups for user
router.get('/overdue', followupController.getOverdueFollowups);

// GET /api/followups/statistics - Get follow-up statistics
router.get('/statistics', [
  query('timeframe').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('userId').optional().isUUID(),
  validateRequest
], followupController.getFollowupStatistics);

// POST /api/followups - Create new follow-up
router.post('/', createFollowupValidation, followupController.createFollowup);

// POST /api/followups/from-call - Create follow-up from call outcome
router.post('/from-call', [
  body('callId').isUUID().withMessage('Valid call ID is required'),
  body('outcome').notEmpty().withMessage('Outcome is required'),
  body('options').optional().isObject(),
  validateRequest
], followupController.createFollowupFromCall);

// POST /api/followups/bulk - Bulk create follow-ups
router.post('/bulk', bulkCreateValidation, followupController.bulkCreateFollowups);

// GET /api/followups/:id - Get single follow-up by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Valid follow-up ID is required'),
  validateRequest
], followupController.getFollowup);

// PUT /api/followups/:id - Update follow-up
router.put('/:id', updateFollowupValidation, followupController.updateFollowup);

// PUT /api/followups/:id/reschedule - Reschedule follow-up
router.put('/:id/reschedule', rescheduleValidation, followupController.rescheduleFollowup);

// PUT /api/followups/:id/complete - Complete follow-up
router.put('/:id/complete', completeFollowupValidation, followupController.completeFollowup);

// DELETE /api/followups/:id - Delete follow-up
router.delete('/:id', [
  param('id').isUUID().withMessage('Valid follow-up ID is required'),
  validateRequest
], authorize(['admin', 'manager']), followupController.deleteFollowup);

module.exports = router;