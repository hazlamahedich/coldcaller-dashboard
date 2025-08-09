const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

/**
 * Gemini Response Generator Service
 * Generates intelligent responses using Google Gemini AI based on retrieved context
 */
class GeminiResponseGenerator {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: process.env.GOOGLE_AI_MODEL || "gemini-1.5-pro-latest"
    });

    // Configuration
    this.maxContextLength = parseInt(process.env.CHAT_MAX_CONTEXT_LENGTH) || 4000;
    this.maxResponseLength = parseInt(process.env.CHAT_MAX_RESPONSE_LENGTH) || 500;
    this.maxSources = parseInt(process.env.CHAT_MAX_SOURCES) || 3;

    this.isInitialized = false;
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the response generator
   */
  async initialize() {
    try {
      // Skip initialization test to avoid rate limiting during startup
      // The model will be tested during the first actual query
      this.isInitialized = true;
      logger.info('Gemini Response Generator initialized successfully (test deferred)');
    } catch (error) {
      logger.error('Failed to initialize Gemini Response Generator:', error);
      throw error;
    }
  }

  /**
   * Ensure the service is initialized before operations
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initPromise;
    }
  }

  /**
   * Generate response based on query and context
   * @param {string} query - User query
   * @param {Array} context - Array of relevant documents
   * @param {Object} options - Generation options
   * @returns {Object} - Generated response with metadata
   */
  async generateResponse(query, context, options = {}) {
    await this.ensureInitialized();

    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Query must be a non-empty string');
      }

      if (!Array.isArray(context)) {
        throw new Error('Context must be an array of documents');
      }

      // Handle empty context
      if (context.length === 0) {
        return this.generateFallbackResponse(query);
      }

      // Prepare context and generate response
      const truncatedContext = this.prepareContext(context);
      
      // Check if we have external sources
      const hasExternalSources = context.some(doc => doc.type === 'external');
      const systemPrompt = this.buildSystemPrompt({
        ...options,
        hasExternalSources
      });
      
      const fullPrompt = this.buildPrompt(systemPrompt, truncatedContext, query);

      // Generate response using Gemini
      const result = await this.model.generateContent([{ text: fullPrompt }]);
      
      if (!result || !result.response) {
        throw new Error('No response generated from AI model');
      }

      const responseText = result.response.text();
      
      if (!responseText) {
        throw new Error('Empty response from AI model');
      }

      // Process and return response
      return {
        text: this.truncateResponse(responseText),
        sources: this.extractSources(context),
        confidence: this.calculateConfidence(context, query),
        model: 'gemini-1.5-pro',
        contextUsed: truncatedContext.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error generating response:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Build system prompt with configuration
   * @param {Object} options - Options for system prompt
   * @returns {string} - System prompt
   */
  buildSystemPrompt(options = {}) {
    const {
      tone = 'helpful and professional',
      domain = 'ColdCaller Dashboard',
      includeDisclaimer = true,
      hasExternalSources = false
    } = options;

    const basePrompt = `You are an intelligent assistant for the ${domain}. Your role is to help users understand and use the platform effectively.

GUIDELINES:
- Be ${tone} in your responses
- Use the provided context to answer questions accurately and comprehensively
- If you cannot find the answer in the context, clearly state that you don't have that specific information
- Always cite your sources by referencing the document titles when possible
- Be concise but thorough - aim for ${Math.floor(this.maxResponseLength * 0.8)} characters or less
- Prioritize actionable information and step-by-step instructions when appropriate
- If the query is ambiguous, ask for clarification

RESPONSE FORMAT:
- Start with a direct answer to the question
- Provide relevant details and context
- Include step-by-step instructions when applicable
- End with source references if available`;

    let disclaimer = '';
    if (includeDisclaimer) {
      if (hasExternalSources) {
        disclaimer = '\n\nIMPORTANT: Your response includes both internal documentation and external web sources. Clearly distinguish between official ColdCaller information and general web information when relevant.';
      } else {
        disclaimer = '\n\nIMPORTANT: Base your response only on the provided context documents.';
      }
    }

    return basePrompt + disclaimer;
  }

  /**
   * Build the complete prompt for generation
   * @param {string} systemPrompt - System instructions
   * @param {Array} context - Prepared context documents
   * @param {string} query - User query
   * @returns {string} - Complete prompt
   */
  buildPrompt(systemPrompt, context, query) {
    const contextText = context.map((doc, index) => {
      const sourceInfo = `${doc.title || 'Untitled'} (${doc.source || 'Unknown source'})`;
      return `Document ${index + 1} - ${sourceInfo}:\n${doc.content}\n`;
    }).join('\n');

    return `${systemPrompt}

CONTEXT DOCUMENTS:
${contextText}

USER QUESTION: ${query}

Please provide a helpful answer based on the context provided:`;
  }

  /**
   * Prepare context by truncating and prioritizing documents
   * @param {Array} context - Raw context documents
   * @returns {Array} - Prepared context
   */
  prepareContext(context) {
    // Sort by similarity score (highest first)
    const sortedContext = context.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    
    // Limit number of sources
    const limitedContext = sortedContext.slice(0, this.maxSources);

    // Truncate content to fit within context length limits
    let totalLength = 0;
    const truncatedContext = [];

    for (const doc of limitedContext) {
      const docLength = (doc.content || '').length;
      const titleLength = (doc.title || '').length;
      const sourceLength = (doc.source || '').length;
      const metadataLength = titleLength + sourceLength + 50; // Extra chars for formatting

      if (totalLength + docLength + metadataLength > this.maxContextLength) {
        // Truncate the document content to fit
        const availableSpace = this.maxContextLength - totalLength - metadataLength;
        if (availableSpace > 100) { // Only include if meaningful content can fit
          truncatedContext.push({
            ...doc,
            content: (doc.content || '').substring(0, availableSpace) + '...'
          });
        }
        break;
      }

      truncatedContext.push(doc);
      totalLength += docLength + metadataLength;
    }

    return truncatedContext;
  }

  /**
   * Generate fallback response when no context is available
   * @param {string} query - User query
   * @returns {Object} - Fallback response
   */
  generateFallbackResponse(query) {
    const fallbackResponses = [
      "I couldn't find specific information about that in the ColdCaller documentation. Could you rephrase your question or try asking about features like Twilio setup, lead management, or call analytics?",
      "I don't have specific documentation about that topic. You might want to check the help section or contact support for more detailed information about that feature.",
      "I'm not finding relevant information in the documentation for that query. Try asking about common topics like making calls, managing leads, setting up integrations, or viewing analytics."
    ];

    // Simple heuristic to choose response based on query
    let responseIndex = 0;
    if (query.toLowerCase().includes('how') || query.toLowerCase().includes('setup')) {
      responseIndex = 1;
    } else if (query.toLowerCase().includes('feature') || query.toLowerCase().includes('can')) {
      responseIndex = 2;
    }

    return {
      text: fallbackResponses[responseIndex],
      sources: [],
      confidence: 0,
      model: 'fallback',
      contextUsed: 0,
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }

  /**
   * Extract source information from context
   * @param {Array} context - Context documents
   * @returns {Array} - Source information
   */
  extractSources(context) {
    return context.map(doc => ({
      title: doc.title || 'Untitled Document',
      source: doc.source || 'Unknown Source',
      section: doc.section || null,
      similarity: doc.similarity || 0,
      id: doc.id || null,
      type: doc.type || 'internal',
      url: doc.url || null,
      searchType: doc.searchType || null
    })).slice(0, this.maxSources);
  }

  /**
   * Calculate confidence score based on context quality
   * @param {Array} context - Context documents
   * @param {string} query - User query
   * @returns {number} - Confidence score (0-1)
   */
  calculateConfidence(context, query) {
    if (!context.length) return 0;

    // Base confidence on similarity scores
    const avgSimilarity = context.reduce((sum, doc) => 
      sum + (doc.similarity || 0), 0) / context.length;

    // Boost confidence based on number of relevant sources
    const sourceCountFactor = Math.min(context.length / 3, 1);

    // Boost confidence if query keywords appear in context
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    let keywordMatches = 0;
    
    context.forEach(doc => {
      const docText = (doc.content || '').toLowerCase();
      queryWords.forEach(word => {
        if (docText.includes(word)) {
          keywordMatches++;
        }
      });
    });

    const keywordFactor = Math.min(keywordMatches / (queryWords.length * context.length), 1);

    // Combine factors
    const confidence = (avgSimilarity * 0.6) + (sourceCountFactor * 0.2) + (keywordFactor * 0.2);
    
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Truncate response to maximum length
   * @param {string} response - Generated response
   * @returns {string} - Truncated response
   */
  truncateResponse(response) {
    if (!response) return '';
    
    if (response.length <= this.maxResponseLength) {
      return response;
    }

    // Try to truncate at sentence boundary
    const truncated = response.substring(0, this.maxResponseLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > this.maxResponseLength * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    }

    // Fallback to character limit with ellipsis
    return truncated.substring(0, this.maxResponseLength - 3) + '...';
  }

  /**
   * Generate streaming response (for future implementation)
   * @param {string} query - User query
   * @param {Array} context - Context documents
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Promise} - Streaming promise
   */
  async generateStreamingResponse(query, context, onChunk) {
    await this.ensureInitialized();
    
    // This is a placeholder for future streaming implementation
    // Google Generative AI SDK may support streaming in future versions
    const response = await this.generateResponse(query, context);
    
    // Simulate streaming by chunking the response
    const words = response.text.split(' ');
    const chunkSize = 3;
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';
      await onChunk(chunk);
      
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return response;
  }

  /**
   * Get health status of the response generator
   * @returns {Object} - Health status information
   */
  async getHealth() {
    try {
      // Test basic generation
      const testResponse = await this.generateResponse(
        'test query',
        [{
          content: 'This is test content for health check',
          title: 'Test Document',
          source: 'health-check',
          similarity: 0.9
        }]
      );

      return {
        status: 'healthy',
        initialized: this.isInitialized,
        modelAvailable: true,
        lastTestResponse: testResponse.text.length > 0,
        configuration: {
          model: process.env.GOOGLE_AI_MODEL || "gemini-1.5-pro-latest",
          maxContextLength: this.maxContextLength,
          maxResponseLength: this.maxResponseLength,
          maxSources: this.maxSources
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        initialized: this.isInitialized,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = GeminiResponseGenerator;