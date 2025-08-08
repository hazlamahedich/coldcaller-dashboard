/**
 * NoteTemplate Model - Manage note templates for different call types
 */

const { DataTypes } = require('sequelize');
const Joi = require('joi');

// Validation schema for template fields
const templateFieldSchema = Joi.object({
  name: Joi.string().max(50).required(),
  label: Joi.string().max(100).required(),
  type: Joi.string().valid('text', 'textarea', 'select', 'checkbox', 'date', 'number', 'rating', 'tags').required(),
  placeholder: Joi.string().max(200).allow(''),
  options: Joi.array().items(Joi.string().max(100)).when('type', {
    is: 'select',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  required: Joi.boolean().default(false),
  validation: Joi.object().allow(null),
  order: Joi.number().min(0).default(0)
});

const noteTemplateValidationSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).allow(''),
  icon: Joi.string().max(10).default('📝'),
  category: Joi.string().valid('sales', 'support', 'follow-up', 'meeting', 'custom').required(),
  fields: Joi.array().items(templateFieldSchema).min(1).required(),
  isPublic: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  metadata: Joi.object().default({})
});

const defineNoteTemplateModel = (sequelize) => {
  const NoteTemplate = sequelize.define('NoteTemplate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Template identification
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      index: true
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    icon: {
      type: DataTypes.STRING(10),
      defaultValue: '📝',
      allowNull: false
    },
    
    // Categorization
    category: {
      type: DataTypes.ENUM('sales', 'support', 'follow-up', 'meeting', 'custom'),
      allowNull: false,
      defaultValue: 'custom',
      index: true
    },
    
    // Template structure
    fields: {
      type: DataTypes.JSON,
      allowNull: false,
      validate: {
        isValidFields(value) {
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error('Template must have at least one field');
          }
          
          // Validate each field
          value.forEach((field, index) => {
            const { error } = templateFieldSchema.validate(field);
            if (error) {
              throw new Error(`Field ${index + 1}: ${error.details[0].message}`);
            }
          });
          
          // Check for duplicate field names
          const fieldNames = value.map(f => f.name);
          const uniqueNames = new Set(fieldNames);
          if (fieldNames.length !== uniqueNames.size) {
            throw new Error('Field names must be unique within a template');
          }
        }
      }
    },
    
    // Template metadata
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    
    // Creator and sharing
    creatorId: {
      type: DataTypes.UUID,
      allowNull: true,
      index: true
    },
    
    creatorName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      index: true
    },
    
    isSystem: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      index: true
    },
    
    // Status and usage
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      index: true
    },
    
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Rating and feedback
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 5
      }
    },
    
    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    
    // Additional metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false
    },
    
    // Search optimization
    searchTags: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false
    }
    
  }, {
    tableName: 'note_templates',
    timestamps: true,
    indexes: [
      {
        fields: ['category', 'isActive']
      },
      {
        fields: ['isPublic', 'isActive']
      },
      {
        fields: ['creatorId']
      },
      {
        fields: ['usageCount']
      },
      {
        fields: ['averageRating']
      },
      {
        fields: ['slug'],
        unique: true
      },
      // Search index
      {
        name: 'template_search',
        fields: ['name', 'description']
      }
    ],
    
    hooks: {
      beforeValidate: (template) => {
        // Generate slug from name
        if (template.name && (!template.slug || template.changed('name'))) {
          template.slug = template.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        }
        
        // Generate search tags
        const searchTags = [];
        if (template.name) {
          searchTags.push(...template.name.toLowerCase().split(/\s+/));
        }
        if (template.description) {
          searchTags.push(...template.description.toLowerCase().split(/\s+/));
        }
        if (template.fields) {
          template.fields.forEach(field => {
            searchTags.push(field.name.toLowerCase());
            searchTags.push(field.label.toLowerCase().split(/\s+/));
          });
        }
        
        template.searchTags = [...new Set(searchTags.flat())];
      }
    }
  });
  
  // Instance methods
  NoteTemplate.prototype.incrementUsage = async function() {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    await this.save(['usageCount', 'lastUsedAt']);
  };
  
  NoteTemplate.prototype.addRating = async function(rating) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const currentTotal = (this.averageRating || 0) * this.ratingCount;
    const newTotal = currentTotal + rating;
    const newCount = this.ratingCount + 1;
    
    this.averageRating = (newTotal / newCount).toFixed(2);
    this.ratingCount = newCount;
    
    await this.save(['averageRating', 'ratingCount']);
  };
  
  NoteTemplate.prototype.clone = async function(creatorId, name, isPublic = false) {
    const clonedTemplate = await NoteTemplate.create({
      name: name || `${this.name} (Copy)`,
      description: this.description,
      icon: this.icon,
      category: this.category,
      fields: JSON.parse(JSON.stringify(this.fields)), // Deep copy
      creatorId,
      isPublic,
      isSystem: false,
      metadata: {
        ...this.metadata,
        clonedFrom: this.id,
        clonedAt: new Date()
      }
    });
    
    return clonedTemplate;
  };
  
  NoteTemplate.prototype.updateFields = async function(fields) {
    // Validate fields before updating
    const validation = Joi.array().items(templateFieldSchema).validate(fields);
    if (validation.error) {
      throw new Error(`Invalid fields: ${validation.error.details[0].message}`);
    }
    
    this.fields = fields;
    this.version += 1;
    await this.save(['fields', 'version']);
  };
  
  NoteTemplate.prototype.activate = async function() {
    this.isActive = true;
    await this.save(['isActive']);
  };
  
  NoteTemplate.prototype.deactivate = async function() {
    this.isActive = false;
    await this.save(['isActive']);
  };
  
  // Class methods
  NoteTemplate.validateData = (data) => {
    return noteTemplateValidationSchema.validate(data, { abortEarly: false });
  };
  
  NoteTemplate.searchTemplates = async function(query, options = {}) {
    const {
      category,
      isPublic,
      creatorId,
      includeInactive = false,
      limit = 20,
      offset = 0,
      orderBy = 'usageCount',
      orderDirection = 'DESC'
    } = options;
    
    const whereClause = {};
    
    // Basic filters
    if (category) whereClause.category = category;
    if (isPublic !== undefined) whereClause.isPublic = isPublic;
    if (creatorId) whereClause.creatorId = creatorId;
    if (!includeInactive) whereClause.isActive = true;
    
    // Text search
    if (query && query.trim()) {
      const searchTerms = query.toLowerCase().split(/\s+/);
      whereClause[sequelize.Sequelize.Op.or] = [
        {
          name: {
            [sequelize.Sequelize.Op.iLike]: `%${query}%`
          }
        },
        {
          description: {
            [sequelize.Sequelize.Op.iLike]: `%${query}%`
          }
        },
        {
          searchTags: {
            [sequelize.Sequelize.Op.overlap]: searchTerms
          }
        }
      ];
    }
    
    const templates = await NoteTemplate.findAndCountAll({
      where: whereClause,
      order: [[orderBy, orderDirection]],
      limit,
      offset
    });
    
    return templates;
  };
  
  NoteTemplate.getPopularTemplates = async function(limit = 10, category = null) {
    const whereClause = { isActive: true };
    if (category) whereClause.category = category;
    
    return await NoteTemplate.findAll({
      where: whereClause,
      order: [
        ['usageCount', 'DESC'],
        ['averageRating', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit
    });
  };
  
  NoteTemplate.getSystemTemplates = async function() {
    return await NoteTemplate.findAll({
      where: {
        isSystem: true,
        isActive: true
      },
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
  };
  
  NoteTemplate.getUserTemplates = async function(creatorId, includePublic = true) {
    const whereClause = {
      isActive: true,
      [sequelize.Sequelize.Op.or]: [
        { creatorId }
      ]
    };
    
    if (includePublic) {
      whereClause[sequelize.Sequelize.Op.or].push({ isPublic: true });
    }
    
    return await NoteTemplate.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
  };
  
  NoteTemplate.getTemplateAnalytics = async function(templateId = null) {
    const whereClause = { isActive: true };
    if (templateId) whereClause.id = templateId;
    
    const templates = await NoteTemplate.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'category',
        'usageCount',
        'averageRating',
        'ratingCount',
        'createdAt'
      ]
    });
    
    const analytics = {
      totalTemplates: templates.length,
      totalUsage: templates.reduce((sum, t) => sum + t.usageCount, 0),
      averageRating: templates.reduce((sum, t) => sum + (t.averageRating || 0), 0) / templates.length,
      templatesByCategory: {},
      mostPopular: templates.sort((a, b) => b.usageCount - a.usageCount).slice(0, 5),
      highestRated: templates.filter(t => t.ratingCount > 0).sort((a, b) => b.averageRating - a.averageRating).slice(0, 5)
    };
    
    templates.forEach(template => {
      analytics.templatesByCategory[template.category] = 
        (analytics.templatesByCategory[template.category] || 0) + 1;
    });
    
    return analytics;
  };
  
  return NoteTemplate;
};

module.exports = { defineNoteTemplateModel, noteTemplateValidationSchema, templateFieldSchema };