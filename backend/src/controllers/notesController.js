/**
 * Notes Controller - Handle all note-taking operations
 */

const { Note, NoteTemplate } = require('../database/models');
const { successResponse, errorResponse } = require('../utils/response');
const { validateUUID, validatePagination } = require('../utils/validation');

class NotesController {
  // Create a new note
  static async createNote(req, res) {
    try {
      const { leadId, callId, templateId, type, title, content, tags, followUpRequired, followUpDate, collaborators } = req.body;

      // Validate required fields
      if (!leadId || !content) {
        return errorResponse(res, 'Lead ID and content are required', 400);
      }

      // Validate lead ID format
      if (!validateUUID(leadId)) {
        return errorResponse(res, 'Invalid lead ID format', 400);
      }

      // Validate call ID if provided
      if (callId && !validateUUID(callId)) {
        return errorResponse(res, 'Invalid call ID format', 400);
      }

      // Validate note data
      const noteData = {
        leadId,
        callId: callId || null,
        templateId: templateId || null,
        type: type || 'general',
        title: title || null,
        content: content.trim(),
        tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [],
        followUpRequired: !!followUpRequired,
        followUpDate: followUpDate || null,
        collaborators: Array.isArray(collaborators) ? collaborators : [],
        authorId: req.user?.id || null,
        authorName: req.user?.name || null
      };

      const { error } = Note.validateData(noteData);
      if (error) {
        return errorResponse(res, `Validation error: ${error.details[0].message}`, 400);
      }

      // Create the note
      const note = await Note.create(noteData);

      // If template was used, increment its usage count
      if (templateId) {
        const template = await NoteTemplate.findByPk(templateId);
        if (template) {
          await template.incrementUsage();
        }
      }

      // Load the complete note with associations
      const completeNote = await Note.findByPk(note.id, {
        include: [
          {
            model: Note.sequelize.models.Lead,
            as: 'lead',
            attributes: ['firstName', 'lastName', 'company']
          },
          {
            model: Note.sequelize.models.CallLog,
            as: 'call',
            attributes: ['outcome', 'duration', 'initiatedAt']
          }
        ]
      });

      return successResponse(res, 'Note created successfully', completeNote, 201);
    } catch (error) {
      console.error('Create note error:', error);
      return errorResponse(res, 'Failed to create note', 500);
    }
  }

  // Get notes by lead ID
  static async getNotesByLead(req, res) {
    try {
      const { leadId } = req.params;
      const { page = 1, limit = 20, includeArchived = false } = req.query;

      if (!validateUUID(leadId)) {
        return errorResponse(res, 'Invalid lead ID format', 400);
      }

      const { offset, validLimit } = validatePagination(page, limit);

      const whereClause = { leadId };
      if (!includeArchived || includeArchived === 'false') {
        whereClause.isArchived = false;
      }

      const notes = await Note.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Note.sequelize.models.CallLog,
            as: 'call',
            attributes: ['outcome', 'duration', 'initiatedAt']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: validLimit,
        offset
      });

      return successResponse(res, 'Notes retrieved successfully', {
        notes: notes.rows,
        pagination: {
          total: notes.count,
          page: parseInt(page),
          limit: validLimit,
          totalPages: Math.ceil(notes.count / validLimit)
        }
      });
    } catch (error) {
      console.error('Get notes by lead error:', error);
      return errorResponse(res, 'Failed to retrieve notes', 500);
    }
  }

  // Search notes with advanced filters
  static async searchNotes(req, res) {
    try {
      const {
        query,
        leadId,
        callId,
        type,
        tags,
        authorId,
        qualityMin = 0,
        qualityMax = 100,
        dateFrom,
        dateTo,
        includeArchived = false,
        page = 1,
        limit = 20,
        orderBy = 'createdAt',
        orderDirection = 'DESC'
      } = req.query;

      const { offset, validLimit } = validatePagination(page, limit);

      // Validate date formats if provided
      if (dateFrom && isNaN(Date.parse(dateFrom))) {
        return errorResponse(res, 'Invalid dateFrom format', 400);
      }
      if (dateTo && isNaN(Date.parse(dateTo))) {
        return errorResponse(res, 'Invalid dateTo format', 400);
      }

      // Parse tags if provided as string
      let parsedTags = [];
      if (tags) {
        parsedTags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
      }

      const searchOptions = {
        leadId,
        callId,
        type,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        authorId,
        qualityMin: parseInt(qualityMin),
        qualityMax: parseInt(qualityMax),
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        includeArchived: includeArchived === 'true',
        limit: validLimit,
        offset,
        orderBy,
        orderDirection: orderDirection.toUpperCase()
      };

      const result = await Note.searchNotes(query, searchOptions);

      return successResponse(res, 'Search completed successfully', {
        notes: result.rows,
        pagination: {
          total: result.count,
          page: parseInt(page),
          limit: validLimit,
          totalPages: Math.ceil(result.count / validLimit)
        },
        searchQuery: query,
        filters: searchOptions
      });
    } catch (error) {
      console.error('Search notes error:', error);
      return errorResponse(res, 'Failed to search notes', 500);
    }
  }

  // Get a single note by ID
  static async getNoteById(req, res) {
    try {
      const { noteId } = req.params;

      if (!validateUUID(noteId)) {
        return errorResponse(res, 'Invalid note ID format', 400);
      }

      const note = await Note.findByPk(noteId, {
        include: [
          {
            model: Note.sequelize.models.Lead,
            as: 'lead',
            attributes: ['firstName', 'lastName', 'company', 'email', 'phone']
          },
          {
            model: Note.sequelize.models.CallLog,
            as: 'call',
            attributes: ['outcome', 'duration', 'initiatedAt']
          },
          {
            model: Note,
            as: 'versions',
            attributes: ['id', 'version', 'createdAt'],
            order: [['version', 'DESC']]
          }
        ]
      });

      if (!note) {
        return errorResponse(res, 'Note not found', 404);
      }

      // Increment view count
      await note.incrementViewCount();

      return successResponse(res, 'Note retrieved successfully', note);
    } catch (error) {
      console.error('Get note by ID error:', error);
      return errorResponse(res, 'Failed to retrieve note', 500);
    }
  }

  // Update a note
  static async updateNote(req, res) {
    try {
      const { noteId } = req.params;
      const { title, content, tags, followUpRequired, followUpDate, collaborators, type } = req.body;

      if (!validateUUID(noteId)) {
        return errorResponse(res, 'Invalid note ID format', 400);
      }

      const note = await Note.findByPk(noteId);
      if (!note) {
        return errorResponse(res, 'Note not found', 404);
      }

      // Prepare update data
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content.trim();
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [];
      if (followUpRequired !== undefined) updateData.followUpRequired = !!followUpRequired;
      if (followUpDate !== undefined) updateData.followUpDate = followUpDate || null;
      if (collaborators !== undefined) updateData.collaborators = Array.isArray(collaborators) ? collaborators : [];
      if (type !== undefined) updateData.type = type;

      // Update the note
      await note.update(updateData);

      // Load the updated note with associations
      const updatedNote = await Note.findByPk(noteId, {
        include: [
          {
            model: Note.sequelize.models.Lead,
            as: 'lead',
            attributes: ['firstName', 'lastName', 'company']
          },
          {
            model: Note.sequelize.models.CallLog,
            as: 'call',
            attributes: ['outcome', 'duration', 'initiatedAt']
          }
        ]
      });

      return successResponse(res, 'Note updated successfully', updatedNote);
    } catch (error) {
      console.error('Update note error:', error);
      return errorResponse(res, 'Failed to update note', 500);
    }
  }

  // Delete a note (soft delete - archive)
  static async deleteNote(req, res) {
    try {
      const { noteId } = req.params;

      if (!validateUUID(noteId)) {
        return errorResponse(res, 'Invalid note ID format', 400);
      }

      const note = await Note.findByPk(noteId);
      if (!note) {
        return errorResponse(res, 'Note not found', 404);
      }

      // Soft delete by archiving
      await note.archive();

      return successResponse(res, 'Note deleted successfully', { id: noteId });
    } catch (error) {
      console.error('Delete note error:', error);
      return errorResponse(res, 'Failed to delete note', 500);
    }
  }

  // Restore an archived note
  static async restoreNote(req, res) {
    try {
      const { noteId } = req.params;

      if (!validateUUID(noteId)) {
        return errorResponse(res, 'Invalid note ID format', 400);
      }

      const note = await Note.findByPk(noteId);
      if (!note) {
        return errorResponse(res, 'Note not found', 404);
      }

      await note.restore();

      return successResponse(res, 'Note restored successfully', note);
    } catch (error) {
      console.error('Restore note error:', error);
      return errorResponse(res, 'Failed to restore note', 500);
    }
  }

  // Get note analytics
  static async getNoteAnalytics(req, res) {
    try {
      const { leadId, dateFrom, dateTo } = req.query;

      let dateRange = null;
      if (dateFrom || dateTo) {
        dateRange = {
          start: dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days ago
          end: dateTo ? new Date(dateTo) : new Date()
        };
      }

      const analytics = await Note.getNoteAnalytics(leadId, dateRange);

      return successResponse(res, 'Analytics retrieved successfully', analytics);
    } catch (error) {
      console.error('Get note analytics error:', error);
      return errorResponse(res, 'Failed to retrieve analytics', 500);
    }
  }

  // Auto-save note (for real-time saving)
  static async autoSaveNote(req, res) {
    try {
      const { noteId, content, lastModified } = req.body;

      if (!content) {
        return errorResponse(res, 'Content is required for auto-save', 400);
      }

      let note;
      if (noteId && validateUUID(noteId)) {
        // Update existing note
        note = await Note.findByPk(noteId);
        if (note) {
          await note.update({ 
            content: content.trim(),
            updatedAt: new Date()
          });
        }
      } else {
        // This is a new note draft - we could store it as a draft
        // For now, we'll just return success without creating
        return successResponse(res, 'Auto-save successful', { drafted: true });
      }

      return successResponse(res, 'Auto-save successful', { 
        id: note?.id,
        lastSaved: note?.updatedAt 
      });
    } catch (error) {
      console.error('Auto-save error:', error);
      return errorResponse(res, 'Auto-save failed', 500);
    }
  }

  // Add/remove tags
  static async updateNoteTags(req, res) {
    try {
      const { noteId } = req.params;
      const { action, tag } = req.body;

      if (!validateUUID(noteId)) {
        return errorResponse(res, 'Invalid note ID format', 400);
      }

      if (!action || !tag) {
        return errorResponse(res, 'Action and tag are required', 400);
      }

      const note = await Note.findByPk(noteId);
      if (!note) {
        return errorResponse(res, 'Note not found', 404);
      }

      if (action === 'add') {
        await note.addTag(tag.trim());
      } else if (action === 'remove') {
        await note.removeTag(tag.trim());
      } else {
        return errorResponse(res, 'Invalid action. Use "add" or "remove"', 400);
      }

      return successResponse(res, `Tag ${action}ed successfully`, { 
        id: note.id, 
        tags: note.tags 
      });
    } catch (error) {
      console.error('Update note tags error:', error);
      return errorResponse(res, 'Failed to update tags', 500);
    }
  }

  // Export note in different formats
  static async exportNote(req, res) {
    try {
      const { noteId } = req.params;
      const { format = 'txt' } = req.query;

      if (!validateUUID(noteId)) {
        return errorResponse(res, 'Invalid note ID format', 400);
      }

      const note = await Note.findByPk(noteId, {
        include: [
          {
            model: Note.sequelize.models.Lead,
            as: 'lead',
            attributes: ['firstName', 'lastName', 'company']
          },
          {
            model: Note.sequelize.models.CallLog,
            as: 'call',
            attributes: ['outcome', 'duration', 'initiatedAt']
          }
        ]
      });

      if (!note) {
        return errorResponse(res, 'Note not found', 404);
      }

      let content = '';
      let mimeType = 'text/plain';
      let filename = `note-${note.id}`;

      const lead = note.lead;
      const call = note.call;

      // Generate content based on format
      switch (format.toLowerCase()) {
        case 'txt':
          content = `Call Note - ${note.title || note.type}\n`;
          content += `===============================\n\n`;
          if (lead) {
            content += `Lead: ${lead.firstName} ${lead.lastName}\n`;
            content += `Company: ${lead.company || 'N/A'}\n\n`;
          }
          if (call) {
            content += `Call Date: ${call.initiatedAt ? new Date(call.initiatedAt).toLocaleDateString() : 'N/A'}\n`;
            content += `Duration: ${call.duration || 0} seconds\n`;
            content += `Outcome: ${call.outcome || 'N/A'}\n\n`;
          }
          content += `Created: ${note.createdAt.toLocaleDateString()}\n`;
          content += `Quality Score: ${note.quality}%\n`;
          if (note.tags.length > 0) {
            content += `Tags: ${note.tags.join(', ')}\n`;
          }
          content += `\nContent:\n${note.content}\n`;
          filename += '.txt';
          break;

        case 'md':
        case 'markdown':
          content = `# Call Note - ${note.title || note.type}\n\n`;
          if (lead) {
            content += `**Lead:** ${lead.firstName} ${lead.lastName}\n`;
            content += `**Company:** ${lead.company || 'N/A'}\n\n`;
          }
          if (call) {
            content += `**Call Date:** ${call.initiatedAt ? new Date(call.initiatedAt).toLocaleDateString() : 'N/A'}\n`;
            content += `**Duration:** ${call.duration || 0} seconds\n`;
            content += `**Outcome:** ${call.outcome || 'N/A'}\n\n`;
          }
          content += `**Created:** ${note.createdAt.toLocaleDateString()}\n`;
          content += `**Quality Score:** ${note.quality}%\n`;
          if (note.tags.length > 0) {
            content += `**Tags:** ${note.tags.join(', ')}\n`;
          }
          content += `\n## Content\n\n${note.content}\n`;
          mimeType = 'text/markdown';
          filename += '.md';
          break;

        case 'json':
          content = JSON.stringify({
            note: {
              id: note.id,
              title: note.title,
              type: note.type,
              content: note.content,
              tags: note.tags,
              quality: note.quality,
              followUpRequired: note.followUpRequired,
              followUpDate: note.followUpDate,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt
            },
            lead: lead ? {
              name: `${lead.firstName} ${lead.lastName}`,
              company: lead.company
            } : null,
            call: call ? {
              outcome: call.outcome,
              duration: call.duration,
              initiatedAt: call.initiatedAt
            } : null
          }, null, 2);
          mimeType = 'application/json';
          filename += '.json';
          break;

        default:
          return errorResponse(res, 'Unsupported export format. Use txt, md, or json', 400);
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(content);
    } catch (error) {
      console.error('Export note error:', error);
      return errorResponse(res, 'Failed to export note', 500);
    }
  }

  // Get recent notes for a lead
  static async getRecentNotes(req, res) {
    try {
      const { leadId } = req.params;
      const { limit = 5 } = req.query;

      if (!validateUUID(leadId)) {
        return errorResponse(res, 'Invalid lead ID format', 400);
      }

      const notes = await Note.getRecentNotes(leadId, parseInt(limit));

      return successResponse(res, 'Recent notes retrieved successfully', notes);
    } catch (error) {
      console.error('Get recent notes error:', error);
      return errorResponse(res, 'Failed to retrieve recent notes', 500);
    }
  }
}

module.exports = NotesController;