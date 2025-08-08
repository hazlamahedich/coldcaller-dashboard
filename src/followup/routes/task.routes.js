const express = require('express');
const taskController = require('../controllers/task.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { body, param, query } = require('express-validator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Validation schemas
 */
const createTaskValidation = [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('type').optional().isIn(['call', 'email', 'research', 'preparation', 'follow_up', 'meeting', 'demo', 'proposal', 'contract', 'administrative', 'data_entry', 'analysis', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignedTo').optional().isUUID().withMessage('Valid user ID required'),
  body('leadId').optional().isUUID().withMessage('Valid lead ID required'),
  body('callId').optional().isUUID().withMessage('Valid call ID required'),
  body('followupId').optional().isUUID().withMessage('Valid follow-up ID required'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date required'),
  body('estimatedDuration').optional().isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('parentTaskId').optional().isUUID().withMessage('Valid parent task ID required'),
  body('tags').optional().isArray(),
  body('tags.*').optional().isString().trim(),
  body('customFields').optional().isObject(),
  body('description').optional().trim(),
  body('category').optional().trim(),
  validateRequest
];

const updateTaskValidation = [
  param('id').isUUID().withMessage('Valid task ID is required'),
  body('title').optional().notEmpty().trim(),
  body('type').optional().isIn(['call', 'email', 'research', 'preparation', 'follow_up', 'meeting', 'demo', 'proposal', 'contract', 'administrative', 'data_entry', 'analysis', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled', 'blocked', 'on_hold', 'deferred']),
  body('assignedTo').optional().isUUID(),
  body('dueDate').optional().isISO8601(),
  body('estimatedDuration').optional().isInt({ min: 1, max: 480 }),
  body('progressPercentage').optional().isInt({ min: 0, max: 100 }),
  body('description').optional().trim(),
  body('category').optional().trim(),
  body('tags').optional().isArray(),
  body('customFields').optional().isObject(),
  validateRequest
];

const assignTaskValidation = [
  param('id').isUUID().withMessage('Valid task ID is required'),
  body('userId').isUUID().withMessage('Valid user ID is required'),
  validateRequest
];

const completeTaskValidation = [
  param('id').isUUID().withMessage('Valid task ID is required'),
  body('outcome').isIn(['successful', 'partial', 'unsuccessful', 'cancelled', 'deferred', 'blocked', 'escalated']).withMessage('Valid outcome is required'),
  body('notes').optional().trim(),
  validateRequest
];

const escalateTaskValidation = [
  param('id').isUUID().withMessage('Valid task ID is required'),
  body('escalateTo').isUUID().withMessage('Valid user ID for escalation is required'),
  body('reason').optional().trim(),
  validateRequest
];

const bulkCreateValidation = [
  body('tasks').isArray({ min: 1 }).withMessage('Array of tasks is required'),
  body('tasks.*.title').notEmpty().withMessage('Title is required for each task'),
  body('tasks.*.assignedTo').optional().isUUID(),
  validateRequest
];

const collaboratorValidation = [
  param('id').isUUID().withMessage('Valid task ID is required'),
  body('userId').isUUID().withMessage('Valid user ID is required'),
  validateRequest
];

/**
 * Routes
 */

// GET /api/tasks - Get all tasks with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled', 'blocked', 'on_hold', 'deferred']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('type').optional().isIn(['call', 'email', 'research', 'preparation', 'follow_up', 'meeting', 'demo', 'proposal', 'contract', 'administrative', 'data_entry', 'analysis', 'other']),
  query('category').optional().trim(),
  query('assignedTo').optional().isUUID(),
  query('createdBy').optional().isUUID(),
  query('leadId').optional().isUUID(),
  query('dueDateStart').optional().isISO8601(),
  query('dueDateEnd').optional().isISO8601(),
  query('sortBy').optional().isIn(['dueDate', 'createdAt', 'priority', 'status', 'type', 'title']),
  query('sortOrder').optional().isIn(['ASC', 'DESC']),
  validateRequest
], taskController.getTasks);

// GET /api/tasks/upcoming - Get upcoming tasks for user
router.get('/upcoming', [
  query('days').optional().isInt({ min: 1, max: 30 }),
  validateRequest
], taskController.getUpcomingTasks);

// GET /api/tasks/overdue - Get overdue tasks for user
router.get('/overdue', taskController.getOverdueTasks);

// GET /api/tasks/next - Get next task from priority queue
router.get('/next', taskController.getNextTask);

// GET /api/tasks/priority/:priority - Get tasks by priority
router.get('/priority/:priority', [
  param('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
  validateRequest
], taskController.getTasksByPriority);

// GET /api/tasks/statistics - Get task statistics
router.get('/statistics', [
  query('timeframe').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('userId').optional().isUUID(),
  validateRequest
], taskController.getTaskStatistics);

// POST /api/tasks - Create new task
router.post('/', createTaskValidation, taskController.createTask);

// POST /api/tasks/from-call - Create task from call outcome
router.post('/from-call', [
  body('callId').isUUID().withMessage('Valid call ID is required'),
  body('outcome').notEmpty().withMessage('Outcome is required'),
  body('taskData').optional().isObject(),
  validateRequest
], taskController.createTaskFromCall);

// POST /api/tasks/bulk - Bulk create tasks
router.post('/bulk', bulkCreateValidation, taskController.bulkCreateTasks);

// GET /api/tasks/:id - Get single task by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Valid task ID is required'),
  validateRequest
], taskController.getTask);

// PUT /api/tasks/:id - Update task
router.put('/:id', updateTaskValidation, taskController.updateTask);

// PUT /api/tasks/:id/assign - Assign task to user
router.put('/:id/assign', assignTaskValidation, taskController.assignTask);

// PUT /api/tasks/:id/start - Start task
router.put('/:id/start', [
  param('id').isUUID().withMessage('Valid task ID is required'),
  validateRequest
], taskController.startTask);

// PUT /api/tasks/:id/complete - Complete task
router.put('/:id/complete', completeTaskValidation, taskController.completeTask);

// PUT /api/tasks/:id/escalate - Escalate task
router.put('/:id/escalate', escalateTaskValidation, taskController.escalateTask);

// POST /api/tasks/:id/collaborators - Add collaborator to task
router.post('/:id/collaborators', collaboratorValidation, taskController.addCollaborator);

// POST /api/tasks/:id/watchers - Add watcher to task
router.post('/:id/watchers', collaboratorValidation, taskController.addWatcher);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', [
  param('id').isUUID().withMessage('Valid task ID is required'),
  validateRequest
], authorize(['admin', 'manager']), taskController.deleteTask);

module.exports = router;