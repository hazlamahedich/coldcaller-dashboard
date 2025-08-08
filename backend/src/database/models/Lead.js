/**
 * Lead Model - Comprehensive lead management with validation and relationships
 */

const { DataTypes } = require('sequelize');
const Joi = require('joi');

// Validation schema
const leadValidationSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().max(255).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).max(20).required(),
  company: Joi.string().max(255).required(),
  title: Joi.string().max(100).allow(null, ''),
  industry: Joi.string().max(100).allow(null, ''),
  companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+').allow(null),
  
  // Status and priority
  status: Joi.string().valid('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing').default('new'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  leadSource: Joi.string().max(100).allow(null, ''),
  
  // Contact information
  alternatePhone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).max(20).allow(null, ''),
  website: Joi.string().uri().max(255).allow(null, ''),
  
  // Address
  addressStreet: Joi.string().max(255).allow(null, ''),
  addressCity: Joi.string().max(100).allow(null, ''),
  addressState: Joi.string().max(50).allow(null, ''),
  addressZip: Joi.string().max(20).allow(null, ''),
  addressCountry: Joi.string().max(50).default('USA'),
  
  // Lead scoring and tracking
  leadScore: Joi.number().integer().min(0).max(100).default(0),
  conversionProbability: Joi.number().min(0).max(1).default(0),
  estimatedValue: Joi.number().min(0).allow(null),
  
  // Timing and follow-up
  lastContactDate: Joi.date().allow(null),
  nextFollowUpDate: Joi.date().allow(null),
  timeZone: Joi.string().max(50).default('UTC'),
  bestCallTime: Joi.string().max(100).allow(null, ''),
  
  // Notes and tags
  notes: Joi.string().max(2000).allow(null, ''),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  
  // Assignment and ownership
  assignedTo: Joi.string().max(100).allow(null, ''),
  teamId: Joi.string().max(100).allow(null, ''),
  
  // Tracking metrics
  callAttempts: Joi.number().integer().min(0).default(0),
  emailsSent: Joi.number().integer().min(0).default(0),
  meetingsScheduled: Joi.number().integer().min(0).default(0),
  
  // Data quality and deduplication
  dataQualityScore: Joi.number().min(0).max(100).default(50),
  duplicateCheckHash: Joi.string().max(255).allow(null),
  
  // GDPR and compliance
  consentGiven: Joi.boolean().default(false),
  consentDate: Joi.date().allow(null),
  doNotCall: Joi.boolean().default(false),
  doNotEmail: Joi.boolean().default(false),
  
  // Lifecycle tracking
  isActive: Joi.boolean().default(true),
  archivedAt: Joi.date().allow(null),
  archivedReason: Joi.string().max(255).allow(null, '')
});

// Define the Lead model
const defineLeadModel = (sequelize) => {
  const Lead = sequelize.define('Lead', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Basic information
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.firstName} ${this.lastName}`;
      }
    },
    
    // Contact information
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[\+]?[1-9][\d]{0,15}$/
      },
      set(value) {
        // Normalize phone number
        const normalized = value.replace(/[^\d+]/g, '');
        this.setDataValue('phone', normalized);
      }
    },
    alternatePhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[\+]?[1-9][\d]{0,15}$/
      }
    },
    
    // Company information
    company: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    industry: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    companySize: {
      type: DataTypes.ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
      allowNull: true
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    
    // Status and priority
    status: {
      type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing'),
      defaultValue: 'new',
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
      allowNull: false
    },
    leadSource: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Address
    addressStreet: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    addressCity: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    addressState: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    addressZip: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    addressCountry: {
      type: DataTypes.STRING(50),
      defaultValue: 'USA',
      allowNull: false
    },
    fullAddress: {
      type: DataTypes.VIRTUAL,
      get() {
        const parts = [
          this.addressStreet,
          this.addressCity,
          this.addressState,
          this.addressZip,
          this.addressCountry
        ].filter(part => part && part.trim());
        return parts.join(', ');
      }
    },
    
    // Scoring and metrics
    leadScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    conversionProbability: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 1
      }
    },
    estimatedValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    
    // Timing and follow-up
    lastContactDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextFollowUpDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    timeZone: {
      type: DataTypes.STRING(50),
      defaultValue: 'UTC'
    },
    bestCallTime: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Notes and tags
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000]
      }
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false
    },
    
    // Assignment
    assignedTo: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    teamId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Tracking metrics
    callAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    emailsSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    meetingsScheduled: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    
    // Data quality
    dataQualityScore: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: {
        min: 0,
        max: 100
      }
    },
    duplicateCheckHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    
    // Compliance
    consentGiven: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    consentDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    doNotCall: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    doNotEmail: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    
    // Lifecycle
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    archivedReason: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'leads',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        fields: ['email'],
        unique: true
      },
      {
        fields: ['phone']
      },
      {
        fields: ['company']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['assignedTo']
      },
      {
        fields: ['leadScore']
      },
      {
        fields: ['nextFollowUpDate']
      },
      {
        fields: ['duplicateCheckHash'],
        unique: true,
        where: {
          duplicateCheckHash: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      }
    ],
    
    // Hooks for data processing
    hooks: {
      beforeCreate: async (lead) => {
        await lead.calculateDataQualityScore();
        await lead.generateDuplicateHash();
      },
      beforeUpdate: async (lead) => {
        if (lead.changed()) {
          await lead.calculateDataQualityScore();
          await lead.generateDuplicateHash();
        }
      }
    }
  });
  
  // Instance methods
  Lead.prototype.calculateDataQualityScore = async function() {
    let score = 0;
    const weights = {
      firstName: 10,
      lastName: 10,
      email: 15,
      phone: 15,
      company: 10,
      title: 5,
      industry: 5,
      addressStreet: 5,
      addressCity: 5,
      addressState: 5,
      addressZip: 5,
      notes: 5,
      leadSource: 5
    };
    
    for (const [field, weight] of Object.entries(weights)) {
      if (this[field] && this[field].toString().trim()) {
        score += weight;
      }
    }
    
    this.dataQualityScore = Math.min(score, 100);
  };
  
  Lead.prototype.generateDuplicateHash = async function() {
    const crypto = require('crypto');
    const normalizedEmail = this.email.toLowerCase().trim();
    const normalizedPhone = this.phone.replace(/[^\d]/g, '');
    const hashString = `${normalizedEmail}_${normalizedPhone}_${this.company.toLowerCase().trim()}`;
    this.duplicateCheckHash = crypto.createHash('md5').update(hashString).digest('hex');
  };
  
  Lead.prototype.markContacted = async function(method = 'call') {
    this.lastContactDate = new Date();
    if (method === 'call') {
      this.callAttempts += 1;
    } else if (method === 'email') {
      this.emailsSent += 1;
    }
    await this.save();
  };
  
  Lead.prototype.scheduleFollowUp = async function(followUpDate, notes = '') {
    this.nextFollowUpDate = followUpDate;
    if (notes) {
      this.notes = this.notes ? `${this.notes}\n\n${notes}` : notes;
    }
    await this.save();
  };
  
  // Class methods
  Lead.validateData = (data) => {
    return leadValidationSchema.validate(data, { abortEarly: false });
  };
  
  Lead.findDuplicates = async function(email, phone, company) {
    const crypto = require('crypto');
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.replace(/[^\d]/g, '');
    const hashString = `${normalizedEmail}_${normalizedPhone}_${company.toLowerCase().trim()}`;
    const hash = crypto.createHash('md5').update(hashString).digest('hex');
    
    return await Lead.findAll({
      where: {
        duplicateCheckHash: hash,
        isActive: true
      }
    });
  };
  
  return Lead;
};

module.exports = { defineLeadModel, leadValidationSchema };