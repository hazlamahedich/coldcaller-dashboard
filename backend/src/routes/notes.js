/**
 * Notes API Routes
 */

const express = require('express');
const router = express.Router();
const NotesController = require('../controllers/notesController');

// Notes CRUD routes
router.post('/', NotesController.createNote);
router.get('/search', NotesController.searchNotes);
router.get('/analytics', NotesController.getNoteAnalytics);
router.post('/auto-save', NotesController.autoSaveNote);

router.get('/lead/:leadId', NotesController.getNotesByLead);
router.get('/lead/:leadId/recent', NotesController.getRecentNotes);

router.get('/:noteId', NotesController.getNoteById);
router.put('/:noteId', NotesController.updateNote);
router.delete('/:noteId', NotesController.deleteNote);
router.post('/:noteId/restore', NotesController.restoreNote);
router.post('/:noteId/tags', NotesController.updateNoteTags);
router.get('/:noteId/export', NotesController.exportNote);

module.exports = router;