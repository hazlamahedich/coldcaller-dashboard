const { DataTypes } = require('sequelize');

const defineLlmUsageModel = (sequelize) => {
  const LlmUsage = sequelize.define('LlmUsage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  configId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow null for legacy records
    references: {
      model: 'llm_configurations',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  provider: {
    type: DataTypes.ENUM('google-gemini', 'openai', 'anthropic', 'local'),
    allowNull: false
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false
  },
  useCase: {
    type: DataTypes.ENUM(
      'data_parsing', 
      'lead_scoring', 
      'chat_assistance',
      'transcription',
      'analysis',
      'content_generation',
      'classification'
    ),
    allowNull: false
  },
  requestId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  inputTokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  outputTokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalTokens: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  inputCost: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    defaultValue: 0
  },
  outputCost: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    defaultValue: 0
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    defaultValue: 0
  },
  responseTime: {
    type: DataTypes.INTEGER, // milliseconds
    allowNull: true
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  errorType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true // For user-specific tracking
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'llm_usage',
  timestamps: true,
  indexes: [
    {
      fields: ['provider']
    },
    {
      fields: ['model']
    },
    {
      fields: ['useCase']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['success']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['configId']
    },
    {
      fields: ['requestId']
    },
    {
      fields: ['totalCost']
    }
  ]
});

  // Add computed field for cost analysis
  LlmUsage.prototype.getCostPerToken = function() {
    if (this.totalTokens === 0) return 0;
    return this.totalCost / this.totalTokens;
  };

  return LlmUsage;
};

module.exports = { defineLlmUsageModel };