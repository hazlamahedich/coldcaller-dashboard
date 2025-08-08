/**
 * Note Templates Controller - Handle template management operations
 */

const { NoteTemplate } = require('../database/models');
const { successResponse, errorResponse } = require('../utils/response');
const { validateUUID, validatePagination } = require('../utils/validation');

class NoteTemplatesController {
  // Get all templates with optional filtering
  static async getTemplates(req, res) {
    try {
      const {
        category,
        isPublic,
        creatorId,
        includeInactive = false,
        search,
        page = 1,
        limit = 20,
        orderBy = 'usageCount',
        orderDirection = 'DESC'
      } = req.query;

      const { offset, validLimit } = validatePagination(page, limit);

      const searchOptions = {
        category,
        isPublic: isPublic !== undefined ? isPublic === 'true' : undefined,
        creatorId,
        includeInactive: includeInactive === 'true',
        limit: validLimit,
        offset,
        orderBy,
        orderDirection: orderDirection.toUpperCase()
      };

      const result = await NoteTemplate.searchTemplates(search, searchOptions);

      return successResponse(res, 'Templates retrieved successfully', {
        templates: result.rows,
        pagination: {
          total: result.count,
          page: parseInt(page),
          limit: validLimit,
          totalPages: Math.ceil(result.count / validLimit)
        }
      });
    } catch (error) {
      console.error('Get templates error:', error);
      return errorResponse(res, 'Failed to retrieve templates', 500);
    }
  }

  // Get a single template by ID
  static async getTemplateById(req, res) {
    try {
      const { templateId } = req.params;

      if (!validateUUID(templateId)) {
        return errorResponse(res, 'Invalid template ID format', 400);
      }

      const template = await NoteTemplate.findByPk(templateId);

      if (!template) {
        return errorResponse(res, 'Template not found', 404);
      }

      return successResponse(res, 'Template retrieved successfully', template);
    } catch (error) {
      console.error('Get template by ID error:', error);
      return errorResponse(res, 'Failed to retrieve template', 500);
    }
  }

  // Get template by slug
  static async getTemplateBySlug(req, res) {
    try {
      const { slug } = req.params;

      const template = await NoteTemplate.findOne({
        where: { slug, isActive: true }
      });

      if (!template) {
        return errorResponse(res, 'Template not found', 404);
      }

      // Increment usage count
      await template.incrementUsage();

      return successResponse(res, 'Template retrieved successfully', template);
    } catch (error) {
      console.error('Get template by slug error:', error);
      return errorResponse(res, 'Failed to retrieve template', 500);
    }
  }

  // Create a new template
  static async createTemplate(req, res) {
    try {
      const {
        name,
        description,
        icon,
        category,
        fields,
        isPublic,
        isActive = true
      } = req.body;

      // Validate required fields
      if (!name || !category || !fields) {
        return errorResponse(res, 'Name, category, and fields are required', 400);
      }

      if (!Array.isArray(fields) || fields.length === 0) {
        return errorResponse(res, 'At least one field is required', 400);
      }

      // Validate template data
      const templateData = {
        name: name.trim(),
        description: description?.trim() || '',
        icon: icon || '📝',
        category,
        fields,
        isPublic: !!isPublic,
        isActive: !!isActive,
        creatorId: req.user?.id || null,
        creatorName: req.user?.name || null,
        isSystem: false
      };

      const { error } = NoteTemplate.validateData(templateData);
      if (error) {
        return errorResponse(res, `Validation error: ${error.details[0].message}`, 400);
      }

      // Check for duplicate name
      const existingTemplate = await NoteTemplate.findOne({
        where: { name: templateData.name }
      });

      if (existingTemplate) {
        return errorResponse(res, 'A template with this name already exists', 409);
      }

      // Create the template
      const template = await NoteTemplate.create(templateData);

      return successResponse(res, 'Template created successfully', template, 201);
    } catch (error) {
      console.error('Create template error:', error);
      return errorResponse(res, 'Failed to create template', 500);
    }
  }

  // Update an existing template
  static async updateTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const {
        name,
        description,
        icon,
        category,
        fields,
        isPublic,
        isActive
      } = req.body;

      if (!validateUUID(templateId)) {
        return errorResponse(res, 'Invalid template ID format', 400);
      }

      const template = await NoteTemplate.findByPk(templateId);
      if (!template) {
        return errorResponse(res, 'Template not found', 404);
      }

      // Check if user can modify this template
      if (template.isSystem) {
        return errorResponse(res, 'Cannot modify system templates', 403);
      }

      // Prepare update data
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (icon !== undefined) updateData.icon = icon;
      if (category !== undefined) updateData.category = category;
      if (fields !== undefined) {
        if (!Array.isArray(fields) || fields.length === 0) {
          return errorResponse(res, 'At least one field is required', 400);
        }
        updateData.fields = fields;
      }
      if (isPublic !== undefined) updateData.isPublic = !!isPublic;
      if (isActive !== undefined) updateData.isActive = !!isActive;

      // If fields are being updated, use the special method to increment version
      if (fields !== undefined) {
        await template.updateFields(fields);
      }

      // Update other fields
      if (Object.keys(updateData).length > 0 && !updateData.fields) {
        await template.update(updateData);
      }

      return successResponse(res, 'Template updated successfully', template);
    } catch (error) {
      console.error('Update template error:', error);
      return errorResponse(res, 'Failed to update template', 500);
    }
  }

  // Delete a template
  static async deleteTemplate(req, res) {
    try {
      const { templateId } = req.params;

      if (!validateUUID(templateId)) {
        return errorResponse(res, 'Invalid template ID format', 400);
      }

      const template = await NoteTemplate.findByPk(templateId);
      if (!template) {
        return errorResponse(res, 'Template not found', 404);
      }

      // Check if user can delete this template
      if (template.isSystem) {
        return errorResponse(res, 'Cannot delete system templates', 403);
      }

      // Soft delete by deactivating
      await template.deactivate();

      return successResponse(res, 'Template deleted successfully', { id: templateId });
    } catch (error) {
      console.error('Delete template error:', error);
      return errorResponse(res, 'Failed to delete template', 500);
    }
  }

  // Clone a template
  static async cloneTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { name, isPublic = false } = req.body;

      if (!validateUUID(templateId)) {
        return errorResponse(res, 'Invalid template ID format', 400);
      }

      if (!name) {
        return errorResponse(res, 'Name is required for cloned template', 400);
      }

      const sourceTemplate = await NoteTemplate.findByPk(templateId);
      if (!sourceTemplate) {
        return errorResponse(res, 'Source template not found', 404);
      }

      // Check for duplicate name
      const existingTemplate = await NoteTemplate.findOne({
        where: { name: name.trim() }
      });

      if (existingTemplate) {
        return errorResponse(res, 'A template with this name already exists', 409);
      }

      const clonedTemplate = await sourceTemplate.clone(
        req.user?.id || null,
        name.trim(),
        !!isPublic
      );

      return successResponse(res, 'Template cloned successfully', clonedTemplate, 201);
    } catch (error) {
      console.error('Clone template error:', error);
      return errorResponse(res, 'Failed to clone template', 500);
    }
  }

  // Rate a template
  static async rateTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { rating } = req.body;

      if (!validateUUID(templateId)) {
        return errorResponse(res, 'Invalid template ID format', 400);
      }

      if (!rating || rating < 1 || rating > 5) {
        return errorResponse(res, 'Rating must be between 1 and 5', 400);
      }

      const template = await NoteTemplate.findByPk(templateId);
      if (!template) {
        return errorResponse(res, 'Template not found', 404);
      }

      await template.addRating(rating);

      return successResponse(res, 'Rating added successfully', {
        id: template.id,
        averageRating: template.averageRating,
        ratingCount: template.ratingCount
      });
    } catch (error) {
      console.error('Rate template error:', error);
      return errorResponse(res, 'Failed to rate template', 500);
    }
  }

  // Get popular templates
  static async getPopularTemplates(req, res) {
    try {
      const { limit = 10, category } = req.query;

      const templates = await NoteTemplate.getPopularTemplates(
        parseInt(limit),
        category || null
      );

      return successResponse(res, 'Popular templates retrieved successfully', templates);
    } catch (error) {
      console.error('Get popular templates error:', error);
      return errorResponse(res, 'Failed to retrieve popular templates', 500);
    }
  }

  // Get system templates
  static async getSystemTemplates(req, res) {
    try {
      const templates = await NoteTemplate.getSystemTemplates();

      return successResponse(res, 'System templates retrieved successfully', templates);
    } catch (error) {
      console.error('Get system templates error:', error);
      return errorResponse(res, 'Failed to retrieve system templates', 500);
    }
  }

  // Get user's templates
  static async getUserTemplates(req, res) {
    try {
      const { userId } = req.params;
      const { includePublic = true } = req.query;

      if (!validateUUID(userId)) {
        return errorResponse(res, 'Invalid user ID format', 400);
      }

      const templates = await NoteTemplate.getUserTemplates(
        userId,
        includePublic !== 'false'
      );

      return successResponse(res, 'User templates retrieved successfully', templates);
    } catch (error) {
      console.error('Get user templates error:', error);
      return errorResponse(res, 'Failed to retrieve user templates', 500);
    }
  }

  // Get template analytics
  static async getTemplateAnalytics(req, res) {
    try {
      const { templateId } = req.query;

      if (templateId && !validateUUID(templateId)) {
        return errorResponse(res, 'Invalid template ID format', 400);
      }

      const analytics = await NoteTemplate.getTemplateAnalytics(templateId);

      return successResponse(res, 'Template analytics retrieved successfully', analytics);
    } catch (error) {
      console.error('Get template analytics error:', error);
      return errorResponse(res, 'Failed to retrieve template analytics', 500);
    }
  }

  // Get templates by category
  static async getTemplatesByCategory(req, res) {
    try {
      const { category } = req.params;

      const validCategories = ['sales', 'support', 'follow-up', 'meeting', 'custom'];
      if (!validCategories.includes(category)) {
        return errorResponse(res, 'Invalid category', 400);
      }

      const templates = await NoteTemplate.findAll({
        where: {
          category,
          isActive: true,
          [NoteTemplate.sequelize.Op.or]: [
            { isPublic: true },
            { creatorId: req.user?.id || null }
          ]
        },
        order: [
          ['usageCount', 'DESC'],
          ['averageRating', 'DESC'],
          ['name', 'ASC']
        ]
      });

      return successResponse(res, `${category} templates retrieved successfully`, templates);
    } catch (error) {
      console.error('Get templates by category error:', error);
      return errorResponse(res, 'Failed to retrieve templates by category', 500);
    }
  }

  // Activate/deactivate template
  static async toggleTemplateStatus(req, res) {
    try {
      const { templateId } = req.params;
      const { isActive } = req.body;

      if (!validateUUID(templateId)) {
        return errorResponse(res, 'Invalid template ID format', 400);
      }

      const template = await NoteTemplate.findByPk(templateId);
      if (!template) {
        return errorResponse(res, 'Template not found', 404);
      }

      if (template.isSystem) {
        return errorResponse(res, 'Cannot modify system template status', 403);
      }

      if (isActive) {
        await template.activate();
      } else {
        await template.deactivate();
      }

      return successResponse(res, `Template ${isActive ? 'activated' : 'deactivated'} successfully`, template);
    } catch (error) {
      console.error('Toggle template status error:', error);
      return errorResponse(res, 'Failed to toggle template status', 500);
    }
  }

  // Get template usage statistics
  static async getTemplateUsage(req, res) {
    try {
      const { templateId } = req.params;
      const { dateFrom, dateTo } = req.query;

      if (!validateUUID(templateId)) {
        return errorResponse(res, 'Invalid template ID format', 400);
      }

      const template = await NoteTemplate.findByPk(templateId);
      if (!template) {
        return errorResponse(res, 'Template not found', 404);
      }

      // Get notes that used this template
      const whereClause = { templateId };
      
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt[NoteTemplate.sequelize.Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.createdAt[NoteTemplate.sequelize.Op.lte] = new Date(dateTo);
      }

      const { Note } = require('../database/models');
      const notes = await Note.findAll({
        where: whereClause,
        attributes: [
          'createdAt',
          'quality',
          'authorId',
          'authorName',
          [Note.sequelize.fn('DATE', Note.sequelize.col('createdAt')), 'date']
        ],
        order: [['createdAt', 'DESC']]
      });

      // Calculate usage statistics
      const usageStats = {
        totalUsage: notes.length,
        averageQuality: notes.length > 0 ? Math.round(
          notes.reduce((sum, note) => sum + (note.quality || 0), 0) / notes.length
        ) : 0,
        uniqueUsers: new Set(notes.map(note => note.authorId).filter(id => id)).size,
        usageByDay: {},
        recentUsers: []
      };

      // Group by day
      notes.forEach(note => {
        const date = note.getDataValue('date');
        if (!usageStats.usageByDay[date]) {
          usageStats.usageByDay[date] = 0;
        }
        usageStats.usageByDay[date]++;
      });

      // Get recent unique users
      const recentUserMap = new Map();
      notes.forEach(note => {
        if (note.authorId && note.authorName && !recentUserMap.has(note.authorId)) {
          recentUserMap.set(note.authorId, {
            id: note.authorId,
            name: note.authorName,
            lastUsed: note.createdAt
          });
        }
      });
      usageStats.recentUsers = Array.from(recentUserMap.values()).slice(0, 10);

      return successResponse(res, 'Template usage statistics retrieved successfully', {
        template: {
          id: template.id,
          name: template.name,
          category: template.category,
          usageCount: template.usageCount,
          averageRating: template.averageRating,
          ratingCount: template.ratingCount
        },
        usage: usageStats
      });
    } catch (error) {
      console.error('Get template usage error:', error);
      return errorResponse(res, 'Failed to retrieve template usage', 500);
    }
  }
}

module.exports = NoteTemplatesController;