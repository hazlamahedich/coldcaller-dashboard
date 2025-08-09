/**
 * Metadata Extractor for RAG Chatbot
 * 
 * Extracts and enriches metadata from document chunks
 * Handles semantic analysis, intent detection, and contextual information
 */

const fs = require('fs').promises;
const path = require('path');

class MetadataExtractor {
  constructor() {
    this.intentPatterns = {
      'how-to': [
        /how\s+to/i,
        /step\s+by\s+step/i,
        /tutorial/i,
        /guide/i,
        /instructions/i,
        /setup/i,
        /configure/i,
        /install/i
      ],
      'troubleshooting': [
        /error/i,
        /problem/i,
        /issue/i,
        /troubleshoot/i,
        /fix/i,
        /debug/i,
        /resolve/i,
        /solution/i,
        /warning/i,
        /fails?/i
      ],
      'reference': [
        /api/i,
        /endpoint/i,
        /specification/i,
        /documentation/i,
        /reference/i,
        /schema/i,
        /interface/i,
        /parameters/i
      ],
      'explanation': [
        /overview/i,
        /introduction/i,
        /concept/i,
        /architecture/i,
        /design/i,
        /theory/i,
        /background/i
      ]
    };

    this.topicCategories = {
      'authentication': ['auth', 'login', 'token', 'jwt', 'session', 'oauth', 'security'],
      'database': ['db', 'database', 'sql', 'postgres', 'supabase', 'migration', 'schema'],
      'api': ['api', 'endpoint', 'rest', 'graphql', 'webhook', 'request', 'response'],
      'frontend': ['react', 'component', 'ui', 'interface', 'client', 'browser', 'css'],
      'backend': ['server', 'nodejs', 'express', 'service', 'middleware', 'controller'],
      'deployment': ['deploy', 'production', 'environment', 'docker', 'kubernetes', 'hosting'],
      'testing': ['test', 'jest', 'testing', 'unit', 'integration', 'e2e', 'coverage'],
      'security': ['security', 'encryption', 'vulnerability', 'audit', 'firewall', 'cors'],
      'performance': ['performance', 'optimization', 'speed', 'cache', 'memory', 'cpu'],
      'voip': ['voip', 'twilio', 'sip', 'call', 'phone', 'voice', 'webrtc'],
      'leads': ['lead', 'crm', 'contact', 'prospect', 'customer', 'sales'],
      'analytics': ['analytics', 'metrics', 'tracking', 'reporting', 'dashboard', 'stats']
    };

    this.complexityIndicators = {
      high: ['architecture', 'integration', 'advanced', 'complex', 'enterprise'],
      medium: ['configuration', 'setup', 'development', 'implementation'],
      low: ['basic', 'simple', 'introduction', 'getting started', 'quickstart']
    };
  }

  /**
   * Extract comprehensive metadata from a document chunk
   * @param {Object} chunk - Document chunk from ContentChunker
   * @param {Object} document - Original document object
   * @returns {Object} Enhanced chunk with metadata
   */
  extractChunkMetadata(chunk, document) {
    const content = chunk.content;
    const lowerContent = content.toLowerCase();

    // Basic metadata from chunk
    const baseMetadata = {
      ...chunk,
      // Enhanced content analysis
      wordCount: this.countWords(content),
      readingTime: this.calculateReadingTime(content),
      codeBlockCount: this.countCodeBlocks(content),
      linkCount: this.countLinks(content),
      
      // Semantic analysis
      primaryTopic: this.extractPrimaryTopic(content),
      topics: this.extractTopics(content),
      complexity: this.assessComplexity(content),
      intent: this.detectIntent(content),
      
      // Context and structure
      hasCodeExamples: this.hasCodeExamples(content),
      hasLists: this.hasLists(content),
      hasTables: this.hasTables(content),
      hasImages: this.hasImages(content),
      
      // Content quality indicators
      informationDensity: this.calculateInformationDensity(content),
      technicalDepth: this.assessTechnicalDepth(content),
      actionability: this.assessActionability(content),
      
      // Search and retrieval optimization
      searchKeywords: this.extractSearchKeywords(content),
      semanticTags: this.generateSemanticTags(content),
      questionAnswers: this.extractQuestionAnswers(content),
      
      // Document context
      documentMetadata: {
        documentTitle: document.title,
        documentType: document.contentType,
        documentTags: document.tags,
        fileSize: document.metadata?.fileSize,
        lastModified: document.metadata?.lastModified
      }
    };

    // Enhance with section-specific metadata
    if (chunk.section) {
      baseMetadata.sectionMetadata = this.extractSectionMetadata(chunk.section, content);
    }

    // Add quality score
    baseMetadata.qualityScore = this.calculateQualityScore(baseMetadata);

    return baseMetadata;
  }

  /**
   * Detect the primary intent of content
   * @param {string} content - Content to analyze
   * @returns {string} Detected intent
   */
  detectIntent(content) {
    const lowerContent = content.toLowerCase();
    let maxScore = 0;
    let detectedIntent = 'explanation';

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      let score = 0;
      patterns.forEach(pattern => {
        const matches = lowerContent.match(pattern);
        if (matches) {
          score += matches.length;
        }
      });

      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intent;
      }
    }

    return detectedIntent;
  }

  /**
   * Extract primary topic from content
   * @param {string} content - Content to analyze
   * @returns {string} Primary topic
   */
  extractPrimaryTopic(content) {
    const lowerContent = content.toLowerCase();
    let maxScore = 0;
    let primaryTopic = 'general';

    for (const [topic, keywords] of Object.entries(this.topicCategories)) {
      let score = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerContent.match(regex);
        if (matches) {
          score += matches.length;
        }
      });

      if (score > maxScore) {
        maxScore = score;
        primaryTopic = topic;
      }
    }

    return primaryTopic;
  }

  /**
   * Extract all relevant topics from content
   * @param {string} content - Content to analyze
   * @returns {Array<string>} Array of topics
   */
  extractTopics(content) {
    const lowerContent = content.toLowerCase();
    const topics = [];

    for (const [topic, keywords] of Object.entries(this.topicCategories)) {
      let score = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerContent.match(regex);
        if (matches) {
          score += matches.length;
        }
      });

      if (score > 0) {
        topics.push({ topic, score });
      }
    }

    return topics
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.topic);
  }

  /**
   * Assess content complexity
   * @param {string} content - Content to analyze
   * @returns {string} Complexity level
   */
  assessComplexity(content) {
    const lowerContent = content.toLowerCase();
    const scores = { high: 0, medium: 0, low: 0 };

    for (const [level, indicators] of Object.entries(this.complexityIndicators)) {
      indicators.forEach(indicator => {
        const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
        const matches = lowerContent.match(regex);
        if (matches) {
          scores[level] += matches.length;
        }
      });
    }

    // Additional complexity indicators
    const codeBlockCount = this.countCodeBlocks(content);
    const technicalTerms = this.countTechnicalTerms(content);
    const wordCount = this.countWords(content);

    if (codeBlockCount > 2) scores.high += 2;
    if (technicalTerms > 10) scores.high += 1;
    if (wordCount > 800) scores.medium += 1;

    // Determine complexity level
    const maxScore = Math.max(scores.high, scores.medium, scores.low);
    if (maxScore === 0) return 'medium';
    
    return Object.entries(scores).find(([level, score]) => score === maxScore)[0];
  }

  /**
   * Extract section-specific metadata
   * @param {string} sectionTitle - Section title
   * @param {string} content - Section content
   * @returns {Object} Section metadata
   */
  extractSectionMetadata(sectionTitle, content) {
    const lowerTitle = sectionTitle.toLowerCase();
    
    return {
      isIntroduction: lowerTitle.includes('introduction') || lowerTitle.includes('overview'),
      isConfiguration: lowerTitle.includes('config') || lowerTitle.includes('setup'),
      isInstallation: lowerTitle.includes('install') || lowerTitle.includes('setup'),
      isExample: lowerTitle.includes('example') || lowerTitle.includes('usage'),
      isTroubleshooting: lowerTitle.includes('troubleshoot') || lowerTitle.includes('error'),
      isReference: lowerTitle.includes('api') || lowerTitle.includes('reference'),
      hasPrerequisites: content.toLowerCase().includes('prerequisit') || content.toLowerCase().includes('requirement'),
      hasWarnings: content.toLowerCase().includes('warning') || content.toLowerCase().includes('caution'),
      hasSteps: /\d+\.\s/.test(content) || /step\s+\d+/i.test(content)
    };
  }

  /**
   * Extract search keywords optimized for retrieval
   * @param {string} content - Content to analyze
   * @returns {Array<string>} Search keywords
   */
  extractSearchKeywords(content) {
    const keywords = new Set();
    
    // Extract technical terms and proper nouns
    const technicalTerms = content.match(/\b[A-Z][a-z]*(?:[A-Z][a-z]*)*\b/g) || [];
    technicalTerms.forEach(term => {
      if (term.length > 2 && term.length < 20) {
        keywords.add(term.toLowerCase());
      }
    });

    // Extract important phrases from headers
    const headers = content.match(/^#+\s+(.+)$/gm) || [];
    headers.forEach(header => {
      const text = header.replace(/^#+\s+/, '').toLowerCase();
      const words = text.split(/\s+/).filter(word => word.length > 3);
      words.forEach(word => keywords.add(word));
    });

    // Extract quoted strings and code terms
    const quotedStrings = content.match(/`([^`]+)`/g) || [];
    quotedStrings.forEach(quoted => {
      const term = quoted.replace(/`/g, '');
      if (term.length > 2 && term.length < 30) {
        keywords.add(term.toLowerCase());
      }
    });

    return Array.from(keywords).slice(0, 20);
  }

  /**
   * Generate semantic tags for better categorization
   * @param {string} content - Content to analyze
   * @returns {Array<string>} Semantic tags
   */
  generateSemanticTags(content) {
    const tags = new Set();
    const lowerContent = content.toLowerCase();

    // Process indicators
    if (lowerContent.includes('step') || lowerContent.includes('tutorial')) {
      tags.add('tutorial');
    }
    if (lowerContent.includes('error') || lowerContent.includes('troubleshoot')) {
      tags.add('troubleshooting');
    }
    if (lowerContent.includes('example') || lowerContent.includes('demo')) {
      tags.add('example');
    }
    if (lowerContent.includes('api') || lowerContent.includes('endpoint')) {
      tags.add('api');
    }
    if (lowerContent.includes('config') || lowerContent.includes('setup')) {
      tags.add('configuration');
    }

    // Content type indicators
    if (this.hasCodeExamples(content)) {
      tags.add('code-examples');
    }
    if (this.hasLists(content)) {
      tags.add('structured');
    }
    if (this.hasTables(content)) {
      tags.add('reference-data');
    }

    return Array.from(tags);
  }

  /**
   * Extract potential question-answer pairs
   * @param {string} content - Content to analyze
   * @returns {Array<Object>} Question-answer pairs
   */
  extractQuestionAnswers(content) {
    const qaPairs = [];
    
    // Look for explicit Q&A patterns with simpler regex
    const lines = content.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
      
      // Check for Q: or Question: patterns
      if (/^(?:Q:|Question:|\*\*Q:\*\*)/i.test(line) && 
          /^(?:A:|Answer:|\*\*A:\*\*)/i.test(nextLine)) {
        const question = line.replace(/^(?:Q:|Question:|\*\*Q:\*\*)\s*/i, '').trim();
        const answer = nextLine.replace(/^(?:A:|Answer:|\*\*A:\*\*)\s*/i, '').trim();
        
        if (question && answer) {
          qaPairs.push({
            question,
            answer: answer.substring(0, 500), // Limit answer length
            type: 'explicit'
          });
        }
      }
    }

    // Look for header-content pairs that might be Q&A
    const headerPattern = /^#+\s+(.+?)\n((?:(?!^#+).|\n)*?)(?=^#+|\n*$)/gm;
    let match;
    while ((match = headerPattern.exec(content)) !== null) {
      const header = match[1].trim();
      const contentText = match[2].trim();
      
      if (header.includes('?') || /^(how|what|where|when|why|which)/i.test(header)) {
        qaPairs.push({
          question: header,
          answer: contentText.substring(0, 500), // Limit answer length
          type: 'inferred'
        });
      }
    }

    return qaPairs.slice(0, 5); // Limit to 5 pairs
  }

  /**
   * Calculate information density of content
   * @param {string} content - Content to analyze
   * @returns {number} Information density score (0-1)
   */
  calculateInformationDensity(content) {
    const wordCount = this.countWords(content);
    const uniqueWords = new Set(
      content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
    ).size;
    
    const codeBlocks = this.countCodeBlocks(content);
    const links = this.countLinks(content);
    const technicalTerms = this.countTechnicalTerms(content);
    
    // Calculate density score
    let score = (uniqueWords / wordCount) * 0.4;
    score += Math.min(codeBlocks * 0.1, 0.3);
    score += Math.min(links * 0.05, 0.2);
    score += Math.min(technicalTerms * 0.01, 0.1);
    
    return Math.min(1, Math.max(0, score));
  }

  /**
   * Assess technical depth of content
   * @param {string} content - Content to analyze
   * @returns {number} Technical depth score (0-1)
   */
  assessTechnicalDepth(content) {
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    // Technical indicators
    const technicalPatterns = [
      /\b(?:class|function|method|variable|parameter|argument)\b/g,
      /\b(?:database|sql|query|schema|migration)\b/g,
      /\b(?:api|endpoint|request|response|http)\b/g,
      /\b(?:authentication|authorization|security|encryption)\b/g,
      /\b(?:deployment|production|environment|configuration)\b/g
    ];
    
    technicalPatterns.forEach(pattern => {
      const matches = lowerContent.match(pattern);
      if (matches) {
        score += matches.length * 0.02;
      }
    });
    
    // Code blocks increase technical depth
    score += this.countCodeBlocks(content) * 0.1;
    
    return Math.min(1, score);
  }

  /**
   * Assess how actionable the content is
   * @param {string} content - Content to analyze
   * @returns {number} Actionability score (0-1)
   */
  assessActionability(content) {
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    // Action words
    const actionWords = ['install', 'configure', 'setup', 'create', 'run', 'execute', 'implement', 'deploy'];
    actionWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerContent.match(regex);
      if (matches) {
        score += matches.length * 0.05;
      }
    });
    
    // Step indicators
    if (/step\s+\d+|^\d+\./m.test(content)) {
      score += 0.3;
    }
    
    // Code examples
    if (this.hasCodeExamples(content)) {
      score += 0.2;
    }
    
    // Command line examples
    if (content.includes('```bash') || content.includes('```sh')) {
      score += 0.2;
    }
    
    return Math.min(1, score);
  }

  /**
   * Calculate overall quality score for the chunk
   * @param {Object} metadata - Chunk metadata
   * @returns {number} Quality score (0-1)
   */
  calculateQualityScore(metadata) {
    let score = 0.5; // Base score
    
    // Content length (optimal range)
    const wordCount = metadata.wordCount;
    if (wordCount >= 100 && wordCount <= 300) {
      score += 0.2;
    } else if (wordCount >= 50 && wordCount <= 500) {
      score += 0.1;
    }
    
    // Information density
    score += metadata.informationDensity * 0.2;
    
    // Technical depth (moderate is good)
    const techDepth = metadata.technicalDepth;
    if (techDepth >= 0.3 && techDepth <= 0.7) {
      score += 0.1;
    }
    
    // Actionability
    score += metadata.actionability * 0.1;
    
    // Code examples add value
    if (metadata.hasCodeExamples) {
      score += 0.1;
    }
    
    // Structure indicators
    if (metadata.hasLists || metadata.hasTables) {
      score += 0.05;
    }
    
    return Math.min(1, Math.max(0, score));
  }

  // Utility methods
  countWords(content) {
    return content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  calculateReadingTime(content) {
    return Math.ceil(this.countWords(content) / 200); // 200 WPM
  }

  countCodeBlocks(content) {
    return (content.match(/```/g) || []).length / 2;
  }

  countLinks(content) {
    return (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;
  }

  countTechnicalTerms(content) {
    const technicalPattern = /\b[A-Z][a-z]*(?:[A-Z][a-z]*)*\b/g;
    return (content.match(technicalPattern) || []).length;
  }

  hasCodeExamples(content) {
    return /```/.test(content) || /`[^`]+`/.test(content);
  }

  hasLists(content) {
    return /^\s*[-*+•]\s+/m.test(content) || /^\s*\d+\.\s+/m.test(content);
  }

  hasTables(content) {
    return /\|.*\|/.test(content);
  }

  hasImages(content) {
    return /!\[([^\]]*)\]\([^)]+\)/.test(content);
  }
}

module.exports = MetadataExtractor;