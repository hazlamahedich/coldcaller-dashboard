const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Document Processor Service
 * Processes various document types for RAG system indexing
 */
class DocumentProcessor {
  constructor() {
    this.supportedExtensions = ['.md', '.txt', '.json'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.chunkSize = 2000; // Characters per chunk
    this.chunkOverlap = 200; // Overlap between chunks
  }

  /**
   * Process all documentation files in the project
   * @param {string} rootPath - Root path to search for documents
   * @returns {Array} - Array of processed documents
   */
  async processAllDocuments(rootPath = null) {
    try {
      const projectRoot = rootPath || path.join(__dirname, '../../../');
      const documents = [];

      // Define documentation sources
      const documentSources = [
        {
          path: path.join(projectRoot, 'README.md'),
          source: 'project-readme',
          intent: 'explanation',
          priority: 'high'
        },
        {
          path: path.join(projectRoot, 'START_GUIDE.md'),
          source: 'getting-started',
          intent: 'how-to',
          priority: 'high'
        },
        {
          path: path.join(projectRoot, 'TWILIO_SETUP_GUIDE.md'),
          source: 'twilio-setup',
          intent: 'how-to',
          priority: 'high'
        },
        {
          path: path.join(projectRoot, 'TWILIO_INTEGRATION_SUMMARY.md'),
          source: 'twilio-integration',
          intent: 'reference',
          priority: 'medium'
        },
        {
          path: path.join(projectRoot, 'QUICK_TWILIO_START.md'),
          source: 'twilio-quickstart',
          intent: 'how-to',
          priority: 'high'
        },
        {
          path: path.join(projectRoot, 'RAG_CHATBOT_SPECIFICATION_UPDATED.md'),
          source: 'chatbot-docs',
          intent: 'reference',
          priority: 'medium'
        }
      ];

      // Process defined documents
      for (const sourceConfig of documentSources) {
        if (await fs.pathExists(sourceConfig.path)) {
          const processedDocs = await this.processDocument(sourceConfig.path, {
            source: sourceConfig.source,
            intent: sourceConfig.intent,
            priority: sourceConfig.priority
          });
          documents.push(...processedDocs);
        } else {
          logger.warn(`Document not found: ${sourceConfig.path}`);
        }
      }

      // Process additional markdown files in docs directories
      const additionalPaths = [
        path.join(projectRoot, 'docs'),
        path.join(projectRoot, 'backend/docs'),
        path.join(projectRoot, 'frontend/docs'),
        path.join(projectRoot, '.superdesign')
      ];

      for (const dirPath of additionalPaths) {
        if (await fs.pathExists(dirPath)) {
          const dirDocs = await this.processDirectory(dirPath, {
            source: `docs-${path.basename(dirPath)}`,
            intent: 'reference',
            priority: 'low'
          });
          documents.push(...dirDocs);
        }
      }

      logger.info(`Processed ${documents.length} total document chunks from ${documentSources.length} sources`);
      return documents;

    } catch (error) {
      logger.error('Error processing all documents:', error);
      throw new Error(`Failed to process documents: ${error.message}`);
    }
  }

  /**
   * Process a single document file
   * @param {string} filePath - Path to the document file
   * @param {Object} metadata - Additional metadata
   * @returns {Array} - Array of document chunks
   */
  async processDocument(filePath, metadata = {}) {
    try {
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      const stats = await fs.stat(filePath);
      if (stats.size > this.maxFileSize) {
        throw new Error(`File too large: ${filePath} (${stats.size} bytes)`);
      }

      const extension = path.extname(filePath).toLowerCase();
      if (!this.supportedExtensions.includes(extension)) {
        logger.warn(`Unsupported file type: ${filePath}`);
        return [];
      }

      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath, extension);

      // Extract basic metadata from content
      const extractedMetadata = this.extractMetadata(content, extension);

      // Create base document info
      const baseMetadata = {
        source: metadata.source || path.basename(path.dirname(filePath)),
        intent: metadata.intent || this.inferIntent(fileName, content),
        priority: metadata.priority || 'medium',
        filePath: filePath,
        fileName: fileName,
        fileExtension: extension,
        fileSize: stats.size,
        lastModified: stats.mtime.toISOString(),
        ...extractedMetadata
      };

      // Split content into chunks
      const chunks = this.splitIntoChunks(content);
      const documents = [];

      chunks.forEach((chunk, index) => {
        documents.push({
          content: chunk.text,
          title: `${fileName}${chunks.length > 1 ? ` (Part ${index + 1})` : ''}`,
          section: chunk.section || null,
          metadata: {
            ...baseMetadata,
            chunkIndex: index,
            totalChunks: chunks.length,
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition
          },
          source: baseMetadata.source,
          tags: this.extractTags(chunk.text),
          keywords: this.extractKeywords(chunk.text),
          topics: this.extractTopics(chunk.text),
          intent: baseMetadata.intent
        });
      });

      logger.info(`Processed document: ${filePath} -> ${documents.length} chunks`);
      return documents;

    } catch (error) {
      logger.error(`Error processing document ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Process all documents in a directory
   * @param {string} dirPath - Directory path
   * @param {Object} metadata - Base metadata for all files
   * @returns {Array} - Array of processed documents
   */
  async processDirectory(dirPath, metadata = {}) {
    try {
      const documents = [];
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(dirPath, file.name);
          const extension = path.extname(file.name).toLowerCase();

          if (this.supportedExtensions.includes(extension)) {
            try {
              const fileDocs = await this.processDocument(filePath, metadata);
              documents.push(...fileDocs);
            } catch (error) {
              logger.warn(`Failed to process file ${filePath}:`, error.message);
            }
          }
        } else if (file.isDirectory() && !file.name.startsWith('.')) {
          // Recursively process subdirectories
          const subDirPath = path.join(dirPath, file.name);
          const subDirDocs = await this.processDirectory(subDirPath, {
            ...metadata,
            source: `${metadata.source}-${file.name}`
          });
          documents.push(...subDirDocs);
        }
      }

      return documents;
    } catch (error) {
      logger.error(`Error processing directory ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Split content into chunks with overlap
   * @param {string} content - Document content
   * @returns {Array} - Array of content chunks
   */
  splitIntoChunks(content) {
    if (!content || content.length <= this.chunkSize) {
      return [{
        text: content,
        startPosition: 0,
        endPosition: content.length,
        section: this.extractFirstSection(content)
      }];
    }

    const chunks = [];
    let start = 0;

    while (start < content.length) {
      let end = Math.min(start + this.chunkSize, content.length);

      // Try to break at a paragraph boundary
      if (end < content.length) {
        const paragraphBreak = content.lastIndexOf('\n\n', end);
        const sentenceBreak = content.lastIndexOf('.', end);
        
        if (paragraphBreak > start + (this.chunkSize * 0.5)) {
          end = paragraphBreak + 2;
        } else if (sentenceBreak > start + (this.chunkSize * 0.7)) {
          end = sentenceBreak + 1;
        }
      }

      const chunkText = content.substring(start, end);
      
      chunks.push({
        text: chunkText.trim(),
        startPosition: start,
        endPosition: end,
        section: this.extractFirstSection(chunkText)
      });

      // Move start position with overlap
      start = Math.max(start + this.chunkSize - this.chunkOverlap, end);
    }

    return chunks;
  }

  /**
   * Extract metadata from document content
   * @param {string} content - Document content
   * @param {string} extension - File extension
   * @returns {Object} - Extracted metadata
   */
  extractMetadata(content, extension) {
    const metadata = {};

    if (extension === '.md') {
      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        metadata.title = titleMatch[1].trim();
      }

      // Extract description from content
      const descMatch = content.match(/^[^#\n]+/m);
      if (descMatch) {
        metadata.description = descMatch[0].trim().substring(0, 200);
      }
    }

    return metadata;
  }

  /**
   * Extract first section heading from content
   * @param {string} content - Content to analyze
   * @returns {string|null} - Section name or null
   */
  extractFirstSection(content) {
    const sectionMatch = content.match(/^#+\s+(.+)$/m);
    return sectionMatch ? sectionMatch[1].trim() : null;
  }

  /**
   * Infer document intent from filename and content
   * @param {string} fileName - File name
   * @param {string} content - File content
   * @returns {string} - Inferred intent
   */
  inferIntent(fileName, content) {
    const lowerName = fileName.toLowerCase();
    const lowerContent = content.toLowerCase();

    // How-to documents
    if (lowerName.includes('guide') || lowerName.includes('setup') || 
        lowerName.includes('tutorial') || lowerName.includes('quickstart') ||
        lowerContent.includes('how to') || lowerContent.includes('step by step')) {
      return 'how-to';
    }

    // Troubleshooting documents
    if (lowerName.includes('troubleshoot') || lowerName.includes('error') ||
        lowerName.includes('debug') || lowerContent.includes('problem') ||
        lowerContent.includes('issue') || lowerContent.includes('fix')) {
      return 'troubleshooting';
    }

    // Reference documents
    if (lowerName.includes('api') || lowerName.includes('reference') ||
        lowerName.includes('spec') || lowerContent.includes('function') ||
        lowerContent.includes('parameter')) {
      return 'reference';
    }

    // Default to explanation
    return 'explanation';
  }

  /**
   * Extract relevant tags from content
   * @param {string} content - Content to analyze
   * @returns {Array} - Array of tags
   */
  extractTags(content) {
    const tags = new Set();
    const lowerContent = content.toLowerCase();

    // Technology tags
    const techKeywords = [
      'twilio', 'sip', 'voip', 'webrtc', 'api', 'rest', 'websocket',
      'react', 'node', 'javascript', 'supabase', 'database', 'sql',
      'authentication', 'auth', 'jwt', 'oauth', 'security',
      'crm', 'leads', 'calls', 'analytics', 'dashboard'
    ];

    techKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        tags.add(keyword);
      }
    });

    // Feature tags
    const featureKeywords = [
      'calling', 'lead-management', 'analytics', 'reporting',
      'integration', 'setup', 'configuration', 'monitoring',
      'backup', 'security', 'performance', 'troubleshooting'
    ];

    featureKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword.replace('-', ' '))) {
        tags.add(keyword);
      }
    });

    return Array.from(tags);
  }

  /**
   * Extract keywords from content
   * @param {string} content - Content to analyze
   * @returns {Array} - Array of keywords
   */
  extractKeywords(content) {
    // Simple keyword extraction based on frequency and importance
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Sort by frequency and take top keywords
    const keywords = Object.entries(wordCount)
      .filter(([word, count]) => count > 1 && !this.isStopWord(word))
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return keywords;
  }

  /**
   * Extract topics from content
   * @param {string} content - Content to analyze
   * @returns {Array} - Array of topics
   */
  extractTopics(content) {
    const topics = new Set();
    const lowerContent = content.toLowerCase();

    // Define topic patterns
    const topicPatterns = {
      'user-management': ['user', 'account', 'profile', 'authentication', 'login'],
      'call-management': ['call', 'phone', 'dialing', 'voip', 'sip'],
      'lead-management': ['lead', 'prospect', 'contact', 'customer'],
      'integration': ['api', 'webhook', 'integration', 'connect', 'sync'],
      'analytics': ['analytics', 'report', 'metric', 'dashboard', 'chart'],
      'setup-configuration': ['setup', 'config', 'install', 'configure', 'setting'],
      'troubleshooting': ['error', 'issue', 'problem', 'debug', 'fix', 'troubleshoot']
    };

    Object.entries(topicPatterns).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        topics.add(topic);
      }
    });

    return Array.from(topics);
  }

  /**
   * Check if word is a stop word
   * @param {string} word - Word to check
   * @returns {boolean} - True if stop word
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'shall', 'should', 'will', 'would'
    ]);

    return stopWords.has(word);
  }

  /**
   * Get processing statistics
   * @param {string} rootPath - Root path to analyze
   * @returns {Object} - Processing statistics
   */
  async getProcessingStats(rootPath = null) {
    try {
      const projectRoot = rootPath || path.join(__dirname, '../../../');
      const stats = {
        totalFiles: 0,
        supportedFiles: 0,
        totalSize: 0,
        fileTypes: {},
        largestFile: { path: null, size: 0 },
        oldestFile: { path: null, date: null },
        newestFile: { path: null, date: null }
      };

      const checkPath = async (dirPath) => {
        if (!await fs.pathExists(dirPath)) return;

        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
          const filePath = path.join(dirPath, file.name);

          if (file.isFile()) {
            const fileStat = await fs.stat(filePath);
            const extension = path.extname(file.name).toLowerCase();

            stats.totalFiles++;
            stats.totalSize += fileStat.size;

            // Track file types
            stats.fileTypes[extension] = (stats.fileTypes[extension] || 0) + 1;

            // Check if supported
            if (this.supportedExtensions.includes(extension)) {
              stats.supportedFiles++;
            }

            // Track largest file
            if (fileStat.size > stats.largestFile.size) {
              stats.largestFile = { path: filePath, size: fileStat.size };
            }

            // Track oldest/newest files
            const fileDate = fileStat.mtime;
            if (!stats.oldestFile.date || fileDate < stats.oldestFile.date) {
              stats.oldestFile = { path: filePath, date: fileDate };
            }
            if (!stats.newestFile.date || fileDate > stats.newestFile.date) {
              stats.newestFile = { path: filePath, date: fileDate };
            }

          } else if (file.isDirectory() && !file.name.startsWith('.')) {
            await checkPath(filePath);
          }
        }
      };

      // Check main documentation paths
      const pathsToCheck = [
        projectRoot,
        path.join(projectRoot, 'docs'),
        path.join(projectRoot, 'backend/docs'),
        path.join(projectRoot, 'frontend/docs')
      ];

      for (const checkDir of pathsToCheck) {
        await checkPath(checkDir);
      }

      return stats;
    } catch (error) {
      logger.error('Error getting processing stats:', error);
      throw error;
    }
  }
}

module.exports = DocumentProcessor;