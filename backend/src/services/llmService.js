const { LlmConfiguration, LlmUsage, LlmBudget } = require('../database/models');
const { decrypt } = require('../utils/encryption');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

class LlmService {
  constructor() {
    this.activeConfigurations = new Map();
    this.rateLimiters = new Map();
    this.initializeService();
  }

  async initializeService() {
    try {
      // Load active configurations
      const configs = await LlmConfiguration.findAll({
        where: { isActive: true }
      });

      for (const config of configs) {
        await this.loadConfiguration(config);
      }

      console.log(`🤖 LLM Service initialized with ${configs.length} active configurations`);
    } catch (error) {
      console.error('Failed to initialize LLM service:', error);
    }
  }

  async loadConfiguration(config) {
    try {
      let client;
      const decryptedKey = config.apiKey ? decrypt(config.apiKey) : null;

      switch (config.provider) {
        case 'google-gemini':
          if (decryptedKey) {
            const genAI = new GoogleGenerativeAI(decryptedKey);
            client = genAI.getGenerativeModel({ model: config.model });
          }
          break;
        // Add other providers here
        case 'openai':
          // TODO: Implement OpenAI client
          break;
        case 'anthropic':
          // TODO: Implement Anthropic client
          break;
      }

      if (client) {
        this.activeConfigurations.set(config.id, {
          config,
          client,
          rateLimiter: this.createRateLimiter(config)
        });
      }
    } catch (error) {
      console.error(`Failed to load configuration ${config.id}:`, error);
    }
  }

  createRateLimiter(config) {
    return {
      minuteRequests: 0,
      dayRequests: 0,
      lastMinuteReset: Date.now(),
      lastDayReset: Date.now(),
      maxPerMinute: config.rateLimitPerMinute,
      maxPerDay: config.rateLimitPerDay
    };
  }

  async checkRateLimit(configId) {
    const limiter = this.rateLimiters.get(configId);
    if (!limiter) return true;

    const now = Date.now();
    
    // Reset minute counter
    if (now - limiter.lastMinuteReset > 60000) {
      limiter.minuteRequests = 0;
      limiter.lastMinuteReset = now;
    }
    
    // Reset day counter
    if (now - limiter.lastDayReset > 86400000) {
      limiter.dayRequests = 0;
      limiter.lastDayReset = now;
    }

    // Check limits
    if (limiter.minuteRequests >= limiter.maxPerMinute) {
      throw new Error('Rate limit exceeded: requests per minute');
    }
    if (limiter.dayRequests >= limiter.maxPerDay) {
      throw new Error('Rate limit exceeded: requests per day');
    }

    limiter.minuteRequests++;
    limiter.dayRequests++;
    return true;
  }

  async generateContent(useCase, prompt, options = {}) {
    try {
      // Find best configuration for use case
      const config = await this.getBestConfiguration(useCase, options.provider);
      if (!config) {
        throw new Error('No suitable LLM configuration found');
      }

      // Check rate limits
      await this.checkRateLimit(config.id);

      // Check budget
      await this.checkBudget(config, options.estimatedCost);

      // Generate content
      const startTime = Date.now();
      const requestId = uuidv4();

      const result = await this.callProvider(config, prompt, options, requestId);
      
      const responseTime = Date.now() - startTime;

      // Calculate costs
      const costs = this.calculateCosts(config, result.inputTokens, result.outputTokens);

      // Log usage
      await this.logUsage({
        configId: config.id,
        provider: config.provider,
        model: config.model,
        useCase,
        requestId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        inputCost: costs.inputCost,
        outputCost: costs.outputCost,
        totalCost: costs.totalCost,
        responseTime,
        success: true,
        prompt: options.logPrompt ? prompt : null,
        response: options.logResponse ? result.response : null,
        userId: options.userId,
        sessionId: options.sessionId,
        metadata: options.metadata || {}
      });

      // Update budget spending
      await this.updateBudgetSpending(costs.totalCost);

      return {
        response: result.response,
        usage: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.inputTokens + result.outputTokens,
          cost: costs.totalCost,
          responseTime
        },
        requestId,
        provider: config.provider,
        model: config.model
      };

    } catch (error) {
      // Log failed usage
      if (error.requestId) {
        await this.logUsage({
          requestId: error.requestId,
          provider: error.provider,
          model: error.model,
          useCase,
          success: false,
          errorType: error.name,
          errorMessage: error.message,
          userId: options.userId,
          sessionId: options.sessionId,
          metadata: options.metadata || {}
        });
      }

      throw error;
    }
  }

  async getBestConfiguration(useCase, preferredProvider = null) {
    const whereClause = {
      isActive: true,
      useCases: {
        [require('sequelize').Op.contains]: [useCase]
      }
    };

    if (preferredProvider) {
      whereClause.provider = preferredProvider;
    }

    const configs = await LlmConfiguration.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    if (configs.length === 0) {
      // Fallback to any active configuration
      const fallbackConfig = await LlmConfiguration.findOne({
        where: { isActive: true },
        order: [['createdAt', 'DESC']]
      });
      return fallbackConfig;
    }

    // For now, return the first matching configuration
    // TODO: Implement smart selection based on cost, performance, etc.
    return configs[0];
  }

  async callProvider(config, prompt, options, requestId) {
    const activeConfig = this.activeConfigurations.get(config.id);
    if (!activeConfig) {
      throw new Error('Configuration not loaded');
    }

    const { client } = activeConfig;

    switch (config.provider) {
      case 'google-gemini':
        return await this.callGemini(client, config, prompt, options);
      
      case 'openai':
        return await this.callOpenAI(client, config, prompt, options);
      
      case 'anthropic':
        return await this.callAnthropic(client, config, prompt, options);
      
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  async callGemini(client, config, prompt, options) {
    try {
      const generationConfig = {
        temperature: options.temperature ?? config.temperature,
        maxOutputTokens: options.maxTokens ?? config.maxTokens,
        topP: options.topP ?? config.topP,
        ...options.generationConfig
      };

      const systemInstruction = options.systemPrompt || config.systemPrompt;
      
      const contents = [{
        role: 'user',
        parts: [{ text: prompt }]
      }];

      if (systemInstruction) {
        contents.unshift({
          role: 'model',
          parts: [{ text: systemInstruction }]
        });
      }

      const result = await client.generateContent({
        contents,
        generationConfig
      });

      const response = result.response;
      const text = response.text();
      
      // Estimate token usage (Gemini doesn't always provide exact counts)
      const inputTokens = this.estimateTokens(prompt + (systemInstruction || ''));
      const outputTokens = this.estimateTokens(text);

      return {
        response: text,
        inputTokens,
        outputTokens
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  async callOpenAI(client, config, prompt, options) {
    // TODO: Implement OpenAI API call
    throw new Error('OpenAI provider not implemented yet');
  }

  async callAnthropic(client, config, prompt, options) {
    // TODO: Implement Anthropic API call
    throw new Error('Anthropic provider not implemented yet');
  }

  calculateCosts(config, inputTokens, outputTokens) {
    const inputCost = inputTokens * parseFloat(config.costPerInputToken);
    const outputCost = outputTokens * parseFloat(config.costPerOutputToken);
    const totalCost = inputCost + outputCost;

    return {
      inputCost: Math.round(inputCost * 100000000) / 100000000, // Round to 8 decimal places
      outputCost: Math.round(outputCost * 100000000) / 100000000,
      totalCost: Math.round(totalCost * 100000000) / 100000000
    };
  }

  estimateTokens(text) {
    // Simple token estimation (roughly 4 characters per token)
    return Math.ceil(text.length / 4);
  }

  async logUsage(usageData) {
    try {
      await LlmUsage.create(usageData);
    } catch (error) {
      console.error('Failed to log LLM usage:', error);
      // Don't throw error here to avoid breaking the main flow
    }
  }

  async checkBudget(config, estimatedCost = 0) {
    const activeBudgets = await LlmBudget.findAll({
      where: {
        isActive: true,
        status: 'active',
        [require('sequelize').Op.or]: [
          { providers: { [require('sequelize').Op.contains]: [] } }, // Empty array means all providers
          { providers: { [require('sequelize').Op.contains]: [config.provider] } }
        ]
      }
    });

    for (const budget of activeBudgets) {
      const remaining = budget.remaining;
      if (remaining <= 0) {
        throw new Error(`Budget exceeded: ${budget.name}`);
      }
      if (estimatedCost > remaining) {
        throw new Error(`Insufficient budget: ${budget.name}`);
      }
    }
  }

  async updateBudgetSpending(cost) {
    const activeBudgets = await LlmBudget.findAll({
      where: {
        isActive: true,
        status: 'active'
      }
    });

    for (const budget of activeBudgets) {
      await budget.addSpending(cost);
    }
  }

  // Public methods for existing integrations
  async parseData(rawData, format = 'unknown', options = {}) {
    return await this.generateContent('data_parsing', this.buildParsingPrompt(rawData, format), {
      ...options,
      logPrompt: false, // Don't log potentially large data
      logResponse: false
    });
  }

  buildParsingPrompt(rawData, format) {
    return `You are a data parsing expert. Extract lead information from any format and return structured JSON data.

Please parse the following ${format} data and extract lead information. 

Convert each record into a JSON object with these fields:
- name: Full name of the person/contact
- company: Company name
- phone: Phone number (clean format)
- email: Email address
- title: Job title/position
- industry: Industry/sector
- address: Full address if available
- notes: Any additional relevant information
- tags: Array of relevant tags
- source: Data source or origin
- priority: Priority level (high/medium/low)

Rules:
1. Return ONLY a JSON array of objects
2. Standardize phone numbers to E.164 format when possible
3. Clean and validate email addresses
4. Infer industry from company names when not explicit
5. Extract any relevant tags from the data context
6. Set reasonable priority based on data completeness
7. Handle missing fields gracefully (use null or appropriate defaults)
8. Remove duplicates within the dataset
9. Maintain data integrity and accuracy

Data to parse:
\`\`\`
${rawData}
\`\`\`

Return only the JSON array, no explanation or additional text.`;
  }
}

module.exports = new LlmService();