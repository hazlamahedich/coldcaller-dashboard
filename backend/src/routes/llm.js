const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');
const { authenticate } = require('../middleware/auth');

// Provider information (no auth needed, just metadata)
router.get('/providers', llmController.getProviders);

// Apply authentication to all other routes
router.use(authenticate);

// Configuration endpoints
router.get('/configurations', llmController.getConfigurations);
router.get('/configurations/:id', llmController.getConfiguration);
router.post('/configurations', llmController.createConfiguration);
router.put('/configurations/:id', llmController.updateConfiguration);
router.delete('/configurations/:id', llmController.deleteConfiguration);
router.post('/configurations/:id/test', llmController.testConfiguration);

// Usage tracking endpoints
router.get('/usage', llmController.getUsage);
router.get('/usage/stats', llmController.getUsageStats);

// Budget management endpoints
router.get('/budgets', llmController.getBudgets);
router.post('/budgets', llmController.createBudget);
router.put('/budgets/:id', llmController.updateBudget);
router.delete('/budgets/:id', llmController.deleteBudget);

// Cost analysis endpoints
router.get('/cost-analysis', llmController.getCostAnalysis);


module.exports = router;