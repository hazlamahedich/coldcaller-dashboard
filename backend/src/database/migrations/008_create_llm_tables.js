const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create LLM Configurations table
    await queryInterface.createTable('llm_configurations', {
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
        type: DataTypes.TEXT,
        allowNull: true
      },
      endpoint: {
        type: DataTypes.STRING,
        allowNull: true
      },
      maxTokens: {
        type: DataTypes.INTEGER,
        defaultValue: 4000
      },
      temperature: {
        type: DataTypes.FLOAT,
        defaultValue: 0.1
      },
      topP: {
        type: DataTypes.FLOAT,
        defaultValue: 1.0
      },
      frequencyPenalty: {
        type: DataTypes.FLOAT,
        defaultValue: 0
      },
      presencePenalty: {
        type: DataTypes.FLOAT,
        defaultValue: 0
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
        defaultValue: 0.00000015
      },
      costPerOutputToken: {
        type: DataTypes.DECIMAL(10, 8),
        defaultValue: 0.0000006
      },
      monthlyBudget: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 100.00
      },
      alertThreshold: {
        type: DataTypes.INTEGER,
        defaultValue: 80
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      useCases: {
        type: DataTypes.JSON,
        defaultValue: '["data_parsing", "lead_scoring", "chat_assistance"]'
      },
      metadata: {
        type: DataTypes.JSON,
        defaultValue: '{}'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create LLM Usage table
    await queryInterface.createTable('llm_usage', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      configId: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
        type: DataTypes.INTEGER,
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
        defaultValue: '{}'
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create LLM Budgets table
    await queryInterface.createTable('llm_budgets', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      budgetType: {
        type: DataTypes.ENUM('monthly', 'weekly', 'daily', 'project', 'total'),
        allowNull: false,
        defaultValue: 'monthly'
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      spent: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: DataTypes.ENUM('active', 'paused', 'exceeded', 'completed'),
        allowNull: false,
        defaultValue: 'active'
      },
      alertThresholds: {
        type: DataTypes.JSON,
        defaultValue: '[50, 75, 90, 100]'
      },
      providers: {
        type: DataTypes.JSON,
        defaultValue: '[]'
      },
      useCases: {
        type: DataTypes.JSON,
        defaultValue: '[]'
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      autoReset: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      resetFrequency: {
        type: DataTypes.ENUM('monthly', 'weekly', 'daily'),
        allowNull: true
      },
      nextResetDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      notifications: {
        type: DataTypes.JSON,
        defaultValue: '{"email": true, "dashboard": true, "webhook": false}'
      },
      metadata: {
        type: DataTypes.JSON,
        defaultValue: '{}'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('llm_configurations', ['provider']);
    await queryInterface.addIndex('llm_configurations', ['isActive']);
    await queryInterface.addIndex('llm_configurations', ['createdAt']);

    await queryInterface.addIndex('llm_usage', ['provider']);
    await queryInterface.addIndex('llm_usage', ['model']);
    await queryInterface.addIndex('llm_usage', ['useCase']);
    await queryInterface.addIndex('llm_usage', ['createdAt']);
    await queryInterface.addIndex('llm_usage', ['success']);
    await queryInterface.addIndex('llm_usage', ['userId']);
    await queryInterface.addIndex('llm_usage', ['configId']);
    await queryInterface.addIndex('llm_usage', ['requestId']);
    await queryInterface.addIndex('llm_usage', ['totalCost']);

    await queryInterface.addIndex('llm_budgets', ['budgetType']);
    await queryInterface.addIndex('llm_budgets', ['status']);
    await queryInterface.addIndex('llm_budgets', ['isActive']);
    await queryInterface.addIndex('llm_budgets', ['startDate']);
    await queryInterface.addIndex('llm_budgets', ['endDate']);
    await queryInterface.addIndex('llm_budgets', ['nextResetDate']);

    console.log('✅ LLM tables created successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('llm_budgets');
    await queryInterface.dropTable('llm_usage');
    await queryInterface.dropTable('llm_configurations');
    console.log('✅ LLM tables dropped successfully');
  }
};