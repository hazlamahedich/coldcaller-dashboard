const { DataTypes } = require('sequelize');

const defineLlmConfigurationModel = (sequelize) => {
  const LlmConfiguration = sequelize.define('LlmConfiguration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  provider: {
    type: DataTypes.ENUM('google-gemini', 'openai', 'anthropic', 'local'),
    allowNull: false,
    defaultValue: 'google-gemini'
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'gemini-1.5-flash'
  },
  apiKey: {
    type: DataTypes.TEXT, // Encrypted storage
    allowNull: true
  },
  endpoint: {
    type: DataTypes.STRING,
    allowNull: true // For custom endpoints
  },
  maxTokens: {
    type: DataTypes.INTEGER,
    defaultValue: 4000
  },
  temperature: {
    type: DataTypes.FLOAT,
    defaultValue: 0.1,
    validate: {
      min: 0,
      max: 2
    }
  },
  topP: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
    validate: {
      min: 0,
      max: 1
    }
  },
  frequencyPenalty: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: -2,
      max: 2
    }
  },
  presencePenalty: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: -2,
      max: 2
    }
  },
  systemPrompt: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rateLimitPerMinute: {
    type: DataTypes.INTEGER,
    defaultValue: 60
  },
  rateLimitPerDay: {
    type: DataTypes.INTEGER,
    defaultValue: 1000
  },
  costPerInputToken: {
    type: DataTypes.DECIMAL(10, 8),
    defaultValue: 0.00000015 // Gemini 1.5 Flash pricing
  },
  costPerOutputToken: {
    type: DataTypes.DECIMAL(10, 8),
    defaultValue: 0.0000006 // Gemini 1.5 Flash pricing
  },
  monthlyBudget: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 100.00
  },
  alertThreshold: {
    type: DataTypes.INTEGER,
    defaultValue: 80 // Alert at 80% of budget
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  useCases: {
    type: DataTypes.JSON,
    defaultValue: ['data_parsing', 'lead_scoring', 'chat_assistance']
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'llm_configurations',
  timestamps: true,
  indexes: [
    {
      fields: ['provider']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['createdAt']
    }
  ]
});

  return LlmConfiguration;
};

module.exports = { defineLlmConfigurationModel };