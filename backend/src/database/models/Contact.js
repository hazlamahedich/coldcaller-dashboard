/**
 * Contact Model - Multiple contact points for leads (phone numbers, emails, addresses)
 */

const { DataTypes } = require('sequelize');
const Joi = require('joi');

// Validation schema
const contactValidationSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  type: Joi.string().valid('phone', 'email', 'address', 'social').required(),
  value: Joi.string().max(500).required(),
  label: Joi.string().max(100).allow(null, ''),
  isPrimary: Joi.boolean().default(false),
  isVerified: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  metadata: Joi.object().default({})
});

const defineContactModel = (sequelize) => {
  const Contact = sequelize.define('Contact', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Foreign key to Lead
    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'leads',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    
    // Contact type (phone, email, address, social)
    type: {
      type: DataTypes.ENUM('phone', 'email', 'address', 'social'),
      allowNull: false
    },
    
    // Contact value (phone number, email address, etc.)
    value: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    
    // Label for this contact (e.g., "work", "mobile", "home", "linkedin")
    label: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    
    // Primary contact for this type
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    
    // Verification status
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    
    // Active status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    
    // Additional metadata (JSON field for flexible data)
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: false
    },
    
    // Last verification attempt
    lastVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Verification attempts count
    verificationAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    }
  }, {
    tableName: 'contacts',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        fields: ['leadId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['value']
      },
      {
        fields: ['isPrimary']
      },
      {
        fields: ['isVerified']
      },
      {
        fields: ['isActive']
      },
      {
        // Unique constraint for primary contacts per lead per type
        fields: ['leadId', 'type', 'isPrimary'],
        unique: true,
        where: {
          isPrimary: true
        }
      }
    ],
    
    // Hooks for data processing
    hooks: {
      beforeCreate: async (contact) => {
        await contact.normalizeValue();
        await contact.ensurePrimaryUniqueness();
      },
      beforeUpdate: async (contact) => {
        if (contact.changed('value')) {
          await contact.normalizeValue();
        }
        if (contact.changed('isPrimary')) {
          await contact.ensurePrimaryUniqueness();
        }
      }
    }
  });
  
  // Instance methods
  Contact.prototype.normalizeValue = async function() {
    switch (this.type) {
      case 'phone':
        // Normalize phone number
        this.value = this.value.replace(/[^\d+]/g, '');
        break;
      case 'email':
        // Normalize email
        this.value = this.value.toLowerCase().trim();
        break;
      case 'address':
        // Trim address
        this.value = this.value.trim();
        break;
      case 'social':
        // Normalize social media URLs/handles
        this.value = this.value.toLowerCase().trim();
        break;
    }
  };
  
  Contact.prototype.ensurePrimaryUniqueness = async function() {
    if (this.isPrimary) {
      // Set all other contacts of the same type for this lead to non-primary
      await Contact.update(
        { isPrimary: false },
        {
          where: {
            leadId: this.leadId,
            type: this.type,
            id: { [sequelize.Sequelize.Op.ne]: this.id }
          }
        }
      );
    }
  };
  
  Contact.prototype.verify = async function(verified = true) {
    this.isVerified = verified;
    this.lastVerifiedAt = new Date();
    this.verificationAttempts += 1;
    await this.save();
  };
  
  // Class methods
  Contact.validateData = (data) => {
    return contactValidationSchema.validate(data, { abortEarly: false });
  };
  
  Contact.findByLeadAndType = async function(leadId, type) {
    return await Contact.findAll({
      where: {
        leadId,
        type,
        isActive: true
      },
      order: [
        ['isPrimary', 'DESC'],
        ['createdAt', 'ASC']
      ]
    });
  };
  
  Contact.getPrimaryContact = async function(leadId, type) {
    return await Contact.findOne({
      where: {
        leadId,
        type,
        isPrimary: true,
        isActive: true
      }
    });
  };
  
  // Define associations
  Contact.associate = (models) => {
    Contact.belongsTo(models.Lead, {
      foreignKey: 'leadId',
      as: 'lead',
      onDelete: 'CASCADE'
    });
  };
  
  return Contact;
};

module.exports = { defineContactModel, contactValidationSchema };