/**
 * Note Templates API Routes
 */

const express = require('express');
const router = express.Router();
const NoteTemplatesController = require('../controllers/noteTemplatesController');

// Template CRUD routes
router.get('/', NoteTemplatesController.getTemplates);
router.post('/', NoteTemplatesController.createTemplate);
router.get('/popular', NoteTemplatesController.getPopularTemplates);
router.get('/system', NoteTemplatesController.getSystemTemplates);
router.get('/analytics', NoteTemplatesController.getTemplateAnalytics);

router.get('/category/:category', NoteTemplatesController.getTemplatesByCategory);
router.get('/user/:userId', NoteTemplatesController.getUserTemplates);
router.get('/slug/:slug', NoteTemplatesController.getTemplateBySlug);

router.get('/:templateId', NoteTemplatesController.getTemplateById);
router.put('/:templateId', NoteTemplatesController.updateTemplate);
router.delete('/:templateId', NoteTemplatesController.deleteTemplate);
router.post('/:templateId/clone', NoteTemplatesController.cloneTemplate);
router.post('/:templateId/rate', NoteTemplatesController.rateTemplate);
router.post('/:templateId/toggle', NoteTemplatesController.toggleTemplateStatus);
router.get('/:templateId/usage', NoteTemplatesController.getTemplateUsage);

module.exports = router;