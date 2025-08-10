const { LlmConfiguration, LlmUsage, LlmBudget } = require('../database/models');
const { encrypt, decrypt } = require('../utils/encryption');
const { Op, Sequelize } = require('sequelize');

class LlmController {
  constructor() {
    // Bind methods to preserve 'this' context when used as Express middleware
    this.getProviders = this.getProviders.bind(this);
    this.getConfigurations = this.getConfigurations.bind(this);
    this.getConfiguration = this.getConfiguration.bind(this);
    this.createConfiguration = this.createConfiguration.bind(this);
    this.updateConfiguration = this.updateConfiguration.bind(this);
    this.deleteConfiguration = this.deleteConfiguration.bind(this);
    this.testConfiguration = this.testConfiguration.bind(this);
    this.getUsage = this.getUsage.bind(this);
    this.getUsageStats = this.getUsageStats.bind(this);
    this.getBudgets = this.getBudgets.bind(this);
    this.createBudget = this.createBudget.bind(this);
    this.updateBudget = this.updateBudget.bind(this);
    this.deleteBudget = this.deleteBudget.bind(this);
    this.getCostAnalysis = this.getCostAnalysis.bind(this);
  }

  // Provider Information
  async getProviders(req, res) {
    try {
      const providers = [
        {
          id: 'google-gemini',
          name: 'Google Gemini',
          models: [
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast & Cost-effective)' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Most Capable)' },
            { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro (Legacy)' }
          ]
        },
        {
          id: 'openai',
          name: 'OpenAI',
          models: [
            { id: 'whisper-1', name: 'Whisper (Speech-to-Text)' },
            { id: 'gpt-4o', name: 'GPT-4o (Most Capable)' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cost-effective)' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Legacy)' }
          ]
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          models: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Most Capable)' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fast & Cost-effective)' }
          ]
        }
      ];

      res.json({
        success: true,
        data: { providers }
      });
    } catch (error) {
      console.error('Get providers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch providers'
      });
    }
  }

  // Configuration Management
  async getConfigurations(req, res) {
    try {
      const configurations = await LlmConfiguration.findAll({
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['apiKey'] } // Don't expose API keys
      });

      res.json({
        success: true,
        data: configurations
      });
    } catch (error) {
      console.error('Get LLM configurations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch LLM configurations'
      });
    }
  }

  async getConfiguration(req, res) {
    try {
      const { id } = req.params;
      const configuration = await LlmConfiguration.findByPk(id, {
        attributes: { exclude: ['apiKey'] } // Don't expose API keys
      });

      if (!configuration) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
      }

      res.json({
        success: true,
        data: configuration
      });
    } catch (error) {
      console.error('Get LLM configuration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch LLM configuration'
      });
    }
  }

  async createConfiguration(req, res) {
    try {
      const configData = req.body;

      // Encrypt API key if provided
      if (configData.apiKey) {
        configData.apiKey = encrypt(configData.apiKey);
      }

      // Validate provider-specific settings
      this.validateProviderSettings(configData);

      const configuration = await LlmConfiguration.create(configData);

      // Return without API key
      const responseData = { ...configuration.toJSON() };
      delete responseData.apiKey;

      res.status(201).json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('Create LLM configuration error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create LLM configuration'
      });
    }
  }

  async updateConfiguration(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const configuration = await LlmConfiguration.findByPk(id);
      if (!configuration) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
      }

      // Encrypt API key if provided
      if (updateData.apiKey) {
        updateData.apiKey = encrypt(updateData.apiKey);
      }

      // Validate provider-specific settings
      this.validateProviderSettings(updateData);

      await configuration.update(updateData);

      // Return without API key
      const responseData = { ...configuration.toJSON() };
      delete responseData.apiKey;

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('Update LLM configuration error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update LLM configuration'
      });
    }
  }

  async deleteConfiguration(req, res) {
    try {
      const { id } = req.params;
      const configuration = await LlmConfiguration.findByPk(id);

      if (!configuration) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
      }

      await configuration.destroy();

      res.json({
        success: true,
        message: 'Configuration deleted successfully'
      });
    } catch (error) {
      console.error('Delete LLM configuration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete LLM configuration'
      });
    }
  }

  async testConfiguration(req, res) {
    try {
      const { id } = req.params;
      const configuration = await LlmConfiguration.findByPk(id);

      if (!configuration) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
      }

      // Test the configuration with a simple request
      const testResult = await this.performConfigurationTest(configuration);

      res.json({
        success: true,
        data: testResult
      });
    } catch (error) {
      console.error('Test LLM configuration error:', error);
      res.status(500).json({
        success: false,
        error: 'Configuration test failed',
        details: error.message
      });
    }
  }

  // Usage Tracking
  async getUsage(req, res) {
    try {
      const {
        provider,
        model,
        useCase,
        startDate,
        endDate,
        page = 1,
        limit = 50,
        groupBy
      } = req.query;

      const whereClause = {};
      if (provider) whereClause.provider = provider;
      if (model) whereClause.model = model;
      if (useCase) whereClause.useCase = useCase;
      
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      let result;

      if (groupBy) {
        result = await this.getGroupedUsage(whereClause, groupBy);
      } else {
        const offset = (page - 1) * limit;
        const { count, rows } = await LlmUsage.findAndCountAll({
          where: whereClause,
          limit: parseInt(limit),
          offset,
          order: [['createdAt', 'DESC']],
          attributes: { exclude: ['prompt', 'response'] } // Exclude large text fields for list view
        });

        result = {
          usage: rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        };
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get LLM usage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch LLM usage'
      });
    }
  }

  async getUsageStats(req, res) {
    try {
      const { period = 'month', provider, useCase } = req.query;
      
      const whereClause = {};
      if (provider) whereClause.provider = provider;
      if (useCase) whereClause.useCase = useCase;

      // Calculate date range based on period
      const now = new Date();
      let startDate;
      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      whereClause.createdAt = {
        [Op.gte]: startDate
      };

      const stats = await LlmUsage.findOne({
        where: whereClause,
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalRequests'],
          [Sequelize.fn('SUM', Sequelize.col('inputTokens')), 'totalInputTokens'],
          [Sequelize.fn('SUM', Sequelize.col('outputTokens')), 'totalOutputTokens'],
          [Sequelize.fn('SUM', Sequelize.col('totalTokens')), 'totalTokens'],
          [Sequelize.fn('SUM', Sequelize.col('totalCost')), 'totalCost'],
          [Sequelize.fn('AVG', Sequelize.col('responseTime')), 'avgResponseTime'],
          [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN success = 1 THEN 1 END')), 'successfulRequests'],
        ],
        raw: true
      });

      // Calculate success rate
      const successRate = stats.totalRequests > 0 ? 
        (stats.successfulRequests / stats.totalRequests) * 100 : 0;

      res.json({
        success: true,
        data: {
          ...stats,
          successRate: Math.round(successRate * 100) / 100,
          period,
          periodStart: startDate
        }
      });
    } catch (error) {
      console.error('Get LLM usage stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch usage statistics'
      });
    }
  }

  // Budget Management
  async getBudgets(req, res) {
    try {
      const budgets = await LlmBudget.findAll({
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: budgets
      });
    } catch (error) {
      console.error('Get LLM budgets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch LLM budgets'
      });
    }
  }

  async createBudget(req, res) {
    try {
      const budget = await LlmBudget.create(req.body);

      res.status(201).json({
        success: true,
        data: budget
      });
    } catch (error) {
      console.error('Create LLM budget error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create LLM budget'
      });
    }
  }

  async updateBudget(req, res) {
    try {
      const { id } = req.params;
      const budget = await LlmBudget.findByPk(id);

      if (!budget) {
        return res.status(404).json({
          success: false,
          error: 'Budget not found'
        });
      }

      await budget.update(req.body);

      res.json({
        success: true,
        data: budget
      });
    } catch (error) {
      console.error('Update LLM budget error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update LLM budget'
      });
    }
  }

  async deleteBudget(req, res) {
    try {
      const { id } = req.params;
      const budget = await LlmBudget.findByPk(id);

      if (!budget) {
        return res.status(404).json({
          success: false,
          error: 'Budget not found'
        });
      }

      await budget.destroy();

      res.json({
        success: true,
        message: 'Budget deleted successfully'
      });
    } catch (error) {
      console.error('Delete LLM budget error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete LLM budget'
      });
    }
  }

  // Cost Analysis
  async getCostAnalysis(req, res) {
    try {
      const { period = 'month', groupBy = 'day' } = req.query;
      
      const analysis = await this.generateCostAnalysis(period, groupBy);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Get cost analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate cost analysis'
      });
    }
  }

  // Helper methods
  validateProviderSettings(config) {
    const { provider, model } = config;
    
    switch (provider) {
      case 'google-gemini':
        if (!model || !model.startsWith('gemini')) {
          throw new Error('Invalid model for Google Gemini provider');
        }
        break;
      case 'openai':
        if (!model || (!model.startsWith('gpt') && !model.startsWith('text') && !model.startsWith('whisper'))) {
          throw new Error('Invalid model for OpenAI provider');
        }
        break;
      case 'anthropic':
        if (!model || !model.startsWith('claude')) {
          throw new Error('Invalid model for Anthropic provider');
        }
        break;
    }
  }

  async performConfigurationTest(configuration) {
    // This is a placeholder - implement actual provider testing
    return {
      provider: configuration.provider,
      model: configuration.model,
      status: 'success',
      latency: Math.floor(Math.random() * 1000) + 100, // Mock latency
      timestamp: new Date()
    };
  }

  async getGroupedUsage(whereClause, groupBy) {
    // Implementation for grouped usage queries
    const attributes = [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      [Sequelize.fn('SUM', Sequelize.col('totalCost')), 'totalCost'],
      [Sequelize.fn('SUM', Sequelize.col('totalTokens')), 'totalTokens']
    ];

    if (groupBy === 'provider') {
      attributes.unshift('provider');
      return await LlmUsage.findAll({
        where: whereClause,
        attributes,
        group: ['provider'],
        raw: true
      });
    }
    // Add more groupBy options as needed
    return [];
  }

  async generateCostAnalysis(period, groupBy) {
    // Implementation for cost analysis
    return {
      totalCost: 0,
      costByProvider: [],
      costTrend: [],
      projectedCost: 0
    };
  }
}

module.exports = new LlmController();