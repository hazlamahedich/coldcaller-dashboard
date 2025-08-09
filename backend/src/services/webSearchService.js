const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Web Search Service
 * Provides external web search capabilities for the RAG chatbot
 */
class WebSearchService {
  constructor() {
    // Use multiple search strategies for better results
    this.searchEngines = [
      {
        name: 'duckduckgo',
        enabled: true,
        priority: 1
      },
      {
        name: 'serper',
        enabled: !!process.env.SERPER_API_KEY,
        priority: 2
      }
    ];

    this.maxResults = parseInt(process.env.WEB_SEARCH_MAX_RESULTS) || 3;
    this.timeout = parseInt(process.env.WEB_SEARCH_TIMEOUT) || 5000;
    this.userAgent = 'ColdCaller-Bot/1.0 (+https://coldcaller.com)';
    
    this.isInitialized = false;
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the web search service
   */
  async initialize() {
    try {
      logger.info('Web Search Service initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize Web Search Service:', error);
      throw error;
    }
  }

  /**
   * Search the web for information
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} - Array of search results
   */
  async search(query, options = {}) {
    if (!this.isInitialized) {
      await this.initPromise;
    }

    try {
      const {
        maxResults = this.maxResults,
        includeContent = true,
        filterDomains = [],
        excludeDomains = []
      } = options;

      logger.info(`Web search query: "${query}"`);

      // Try different search engines in priority order
      for (const engine of this.searchEngines.filter(e => e.enabled).sort((a, b) => a.priority - b.priority)) {
        try {
          let results = [];
          
          switch (engine.name) {
            case 'duckduckgo':
              results = await this.searchDuckDuckGo(query, maxResults);
              break;
            case 'serper':
              results = await this.searchSerper(query, maxResults);
              break;
            default:
              continue;
          }

          // Filter results
          results = this.filterResults(results, filterDomains, excludeDomains);

          // Fetch content if requested
          if (includeContent && results.length > 0) {
            results = await this.enrichWithContent(results);
          }

          if (results.length > 0) {
            logger.info(`Web search completed: ${results.length} results from ${engine.name}`);
            return results;
          }

        } catch (engineError) {
          logger.warn(`Search engine ${engine.name} failed:`, engineError.message);
          continue;
        }
      }

      logger.warn(`No web search results found for: "${query}"`);
      return [];

    } catch (error) {
      logger.error('Web search error:', error);
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  /**
   * Search using DuckDuckGo Instant Answer API
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results
   * @returns {Array} - Search results
   */
  async searchDuckDuckGo(query, maxResults) {
    try {
      // Use DuckDuckGo's instant answer API
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1
        },
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent
        }
      });

      const data = response.data;
      const results = [];

      // Add abstract if available
      if (data.Abstract && data.AbstractText) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || 'https://duckduckgo.com',
          snippet: data.AbstractText,
          source: data.AbstractSource || 'DuckDuckGo',
          type: 'instant_answer',
          similarity: 0.9 // High confidence for instant answers
        });
      }

      // Add related topics
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, maxResults - results.length).forEach(topic => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo',
              type: 'related_topic',
              similarity: 0.7
            });
          }
        });
      }

      return results.slice(0, maxResults);

    } catch (error) {
      logger.warn('DuckDuckGo search failed:', error.message);
      return [];
    }
  }

  /**
   * Search using Serper API (Google Search)
   * @param {string} query - Search query  
   * @param {number} maxResults - Maximum results
   * @returns {Array} - Search results
   */
  async searchSerper(query, maxResults) {
    if (!process.env.SERPER_API_KEY) {
      throw new Error('Serper API key not configured');
    }

    try {
      const response = await axios.post('https://google.serper.dev/search', {
        q: query,
        num: maxResults
      }, {
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      const results = [];

      // Process organic results
      if (response.data.organic) {
        response.data.organic.forEach(result => {
          results.push({
            title: result.title,
            url: result.link,
            snippet: result.snippet || '',
            source: result.displayLink || new URL(result.link).hostname,
            type: 'web_result',
            similarity: 0.8
          });
        });
      }

      // Add knowledge graph if available
      if (response.data.knowledgeGraph) {
        const kg = response.data.knowledgeGraph;
        results.unshift({
          title: kg.title,
          url: kg.website || kg.descriptionLink,
          snippet: kg.description,
          source: 'Google Knowledge Graph',
          type: 'knowledge_graph',
          similarity: 0.95
        });
      }

      return results.slice(0, maxResults);

    } catch (error) {
      logger.warn('Serper search failed:', error.message);
      return [];
    }
  }

  /**
   * Filter search results based on domain rules
   * @param {Array} results - Search results
   * @param {Array} filterDomains - Domains to include
   * @param {Array} excludeDomains - Domains to exclude
   * @returns {Array} - Filtered results
   */
  filterResults(results, filterDomains = [], excludeDomains = []) {
    return results.filter(result => {
      try {
        const hostname = new URL(result.url).hostname.toLowerCase();
        
        // Exclude specific domains
        if (excludeDomains.length > 0) {
          if (excludeDomains.some(domain => hostname.includes(domain.toLowerCase()))) {
            return false;
          }
        }

        // Include only specific domains
        if (filterDomains.length > 0) {
          if (!filterDomains.some(domain => hostname.includes(domain.toLowerCase()))) {
            return false;
          }
        }

        return true;
      } catch (error) {
        logger.warn('Error filtering result:', error.message);
        return true; // Keep result if URL parsing fails
      }
    });
  }

  /**
   * Enrich search results with page content
   * @param {Array} results - Search results
   * @returns {Array} - Results with content
   */
  async enrichWithContent(results) {
    const enrichedResults = [];

    for (const result of results) {
      try {
        // Skip if we already have good content
        if (result.snippet && result.snippet.length > 200) {
          enrichedResults.push(result);
          continue;
        }

        // Skip instant answers and knowledge graphs
        if (['instant_answer', 'knowledge_graph'].includes(result.type)) {
          enrichedResults.push(result);
          continue;
        }

        // Fetch page content
        const content = await this.fetchPageContent(result.url);
        if (content) {
          enrichedResults.push({
            ...result,
            content: content,
            snippet: content.substring(0, 300) + '...'
          });
        } else {
          enrichedResults.push(result);
        }

      } catch (error) {
        logger.warn(`Failed to enrich result ${result.url}:`, error.message);
        enrichedResults.push(result);
      }
    }

    return enrichedResults;
  }

  /**
   * Fetch and extract text content from a web page
   * @param {string} url - URL to fetch
   * @returns {string} - Extracted text content
   */
  async fetchPageContent(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent
        },
        maxRedirects: 3,
        maxContentLength: 500000 // 500KB limit
      });

      // Only process HTML content
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        return null;
      }

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();
      
      // Extract main content
      let content = '';
      const mainSelectors = ['main', 'article', '.content', '#content', '.post', '.entry'];
      
      for (const selector of mainSelectors) {
        const mainContent = $(selector).first();
        if (mainContent.length > 0) {
          content = mainContent.text().trim();
          break;
        }
      }

      // Fallback to body content
      if (!content) {
        content = $('body').text().trim();
      }

      // Clean and truncate content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .substring(0, 2000);

      return content || null;

    } catch (error) {
      logger.warn(`Failed to fetch content from ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Determine if a query needs web search
   * @param {string} query - User query
   * @param {Array} internalResults - Internal document results
   * @returns {boolean} - Whether web search is needed
   */
  needsWebSearch(query, internalResults = []) {
    // Always search web if no internal results
    if (internalResults.length === 0) {
      return true;
    }

    // Search web if internal results have low confidence
    const avgSimilarity = internalResults.reduce((sum, doc) => 
      sum + (doc.similarity || 0), 0) / internalResults.length;
    
    if (avgSimilarity < 0.6) {
      return true;
    }

    // Search web for specific question types
    const needsWebSearchPatterns = [
      /what is (?!coldcaller|twilio integration|lead|call|voip)/i,
      /who is/i,
      /when (was|did|will)/i,
      /current|latest|recent|news|update/i,
      /weather|stock|price|rate/i,
      /definition|meaning|explain(?! how to)/i
    ];

    return needsWebSearchPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Get health status of the web search service
   * @returns {Object} - Health status
   */
  async getHealth() {
    try {
      const testQuery = 'test search query';
      const results = await this.search(testQuery, { maxResults: 1, includeContent: false });
      
      return {
        status: 'healthy',
        initialized: this.isInitialized,
        searchEngines: this.searchEngines.map(engine => ({
          name: engine.name,
          enabled: engine.enabled,
          priority: engine.priority
        })),
        lastTestResults: results.length,
        configuration: {
          maxResults: this.maxResults,
          timeout: this.timeout,
          userAgent: this.userAgent
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        initialized: this.isInitialized,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = WebSearchService;