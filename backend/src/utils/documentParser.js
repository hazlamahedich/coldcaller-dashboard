/**
 * Document Parser for RAG Chatbot
 * 
 * Parses markdown documents and extracts meaningful content for indexing
 * Handles multiple markdown formats, sections, and content types
 */

const fs = require('fs').promises;
const path = require('path');

class DocumentParser {
  constructor() {
    this.supportedExtensions = ['.md', '.txt'];
    this.excludePatterns = [
      /node_modules/,
      /\.git/,
      /build/,
      /dist/,
      /coverage/,
      /\.next/,
      /test-results/
    ];
  }

  /**
   * Parse a single markdown file and extract structured content
   * @param {string} filePath - Path to the markdown file
   * @returns {Promise<Object>} Parsed document with metadata
   */
  async parseDocument(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(process.cwd(), filePath);

      // Extract metadata from file and content
      const metadata = await this.extractMetadata(filePath, content);
      
      // Parse sections
      const sections = this.parseSections(content);
      
      // Generate document structure
      const document = {
        source: relativePath,
        fileName,
        title: metadata.title,
        rawContent: content,
        sections: sections,
        metadata: {
          ...metadata,
          fileSize: content.length,
          lastModified: await this.getLastModified(filePath),
          wordCount: this.countWords(content),
          estimatedReadTime: Math.ceil(this.countWords(content) / 200) // 200 wpm
        },
        contentType: this.detectContentType(fileName, content),
        tags: this.extractTags(content),
        keywords: this.extractKeywords(content),
        topics: this.extractTopics(content),
        intent: this.detectIntent(fileName, content)
      };

      return document;
    } catch (error) {
      console.error(`Error parsing document ${filePath}:`, error);
      throw new Error(`Failed to parse document: ${error.message}`);
    }
  }

  /**
   * Parse markdown content into structured sections
   * @param {string} content - Raw markdown content
   * @returns {Array} Array of section objects
   */
  parseSections(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;
    let currentContent = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track code blocks
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        currentContent.push(line);
        continue;
      }

      // Skip processing headers inside code blocks
      if (inCodeBlock) {
        currentContent.push(line);
        continue;
      }

      // Detect headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          if (currentSection.content) {
            sections.push(currentSection);
          }
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        
        currentSection = {
          level,
          title,
          anchor: this.generateAnchor(title),
          content: '',
          type: this.classifySection(title, level),
          startLine: i + 1
        };
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Add final section
    if (currentSection && currentContent.length > 0) {
      currentSection.content = currentContent.join('\n').trim();
      if (currentSection.content) {
        sections.push(currentSection);
      }
    }

    return sections.filter(section => section.content && section.content.length > 50);
  }

  /**
   * Extract metadata from document content and file path
   * @param {string} filePath - File path
   * @param {string} content - Document content
   * @returns {Object} Extracted metadata
   */
  async extractMetadata(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Extract title (first H1 or from filename)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch 
      ? titleMatch[1].replace(/[#️⚡🎯📋🚀🛠📁🔧💻🧪📝🔄📦🌐📱🏗️🧩]/g, '').trim()
      : this.fileNameToTitle(fileName);

    // Extract description (content after title)
    const description = this.extractDescription(content);
    
    // Extract frontmatter if exists
    const frontmatter = this.extractFrontmatter(content);

    return {
      title,
      description,
      fileName,
      directory: path.dirname(filePath),
      ...frontmatter
    };
  }

  /**
   * Extract description from document content
   * @param {string} content - Document content
   * @returns {string} Description text
   */
  extractDescription(content) {
    // Look for description after title
    const lines = content.split('\n');
    let titleFound = false;
    
    for (const line of lines) {
      if (line.match(/^#\s+/)) {
        titleFound = true;
        continue;
      }
      
      if (titleFound && line.trim() && !line.startsWith('#') && !line.startsWith('```')) {
        return line.trim().substring(0, 200);
      }
    }
    
    return '';
  }

  /**
   * Extract frontmatter from document
   * @param {string} content - Document content
   * @returns {Object} Frontmatter data
   */
  extractFrontmatter(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return {};

    try {
      // Simple YAML-like parsing for basic frontmatter
      const frontmatterText = frontmatterMatch[1];
      const metadata = {};
      
      frontmatterText.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          metadata[key.trim()] = value.replace(/^['"]|['"]$/g, '');
        }
      });
      
      return metadata;
    } catch (error) {
      console.warn('Failed to parse frontmatter:', error);
      return {};
    }
  }

  /**
   * Detect document content type based on filename and content
   * @param {string} fileName - File name
   * @param {string} content - Document content
   * @returns {string} Content type
   */
  detectContentType(fileName, content) {
    const lowerName = fileName.toLowerCase();
    const lowerContent = content.toLowerCase();

    if (lowerName.includes('api') || lowerContent.includes('openapi') || lowerContent.includes('endpoint')) {
      return 'api-documentation';
    }
    if (lowerName.includes('setup') || lowerName.includes('install') || lowerName.includes('start')) {
      return 'setup-guide';
    }
    if (lowerName.includes('test') || lowerContent.includes('testing')) {
      return 'testing-guide';
    }
    if (lowerName.includes('security') || lowerContent.includes('security')) {
      return 'security-guide';
    }
    if (lowerName.includes('troubleshoot') || lowerName.includes('faq')) {
      return 'troubleshooting';
    }
    if (lowerName.includes('architecture') || lowerContent.includes('architecture')) {
      return 'architecture-guide';
    }
    if (lowerName.includes('readme')) {
      return 'overview';
    }
    
    return 'documentation';
  }

  /**
   * Extract tags from document content
   * @param {string} content - Document content
   * @returns {Array<string>} Array of tags
   */
  extractTags(content) {
    const tags = new Set();
    const lowerContent = content.toLowerCase();

    // Technology tags
    const techTags = ['react', 'nodejs', 'express', 'supabase', 'twilio', 'postgresql', 'javascript', 'css', 'tailwind', 'voip', 'sip', 'webrtc'];
    techTags.forEach(tag => {
      if (lowerContent.includes(tag)) {
        tags.add(tag);
      }
    });

    // Feature tags
    const featureTags = ['authentication', 'database', 'api', 'frontend', 'backend', 'testing', 'deployment', 'security'];
    featureTags.forEach(tag => {
      if (lowerContent.includes(tag)) {
        tags.add(tag);
      }
    });

    return Array.from(tags);
  }

  /**
   * Extract keywords from document content
   * @param {string} content - Document content
   * @returns {Array<string>} Array of keywords
   */
  extractKeywords(content) {
    // Extract common technical keywords
    const keywords = new Set();
    const text = content.toLowerCase();
    
    const commonKeywords = [
      'setup', 'configuration', 'installation', 'deployment', 'testing',
      'authentication', 'authorization', 'database', 'api', 'endpoint',
      'frontend', 'backend', 'component', 'service', 'middleware',
      'security', 'performance', 'optimization', 'monitoring', 'logging',
      'webhook', 'integration', 'migration', 'backup', 'restore'
    ];

    commonKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.add(keyword);
      }
    });

    return Array.from(keywords);
  }

  /**
   * Extract topics from document structure
   * @param {string} content - Document content
   * @returns {Array<string>} Array of topics
   */
  extractTopics(content) {
    const topics = [];
    const headers = content.match(/^#+\s+(.+)$/gm) || [];
    
    headers.forEach(header => {
      const topic = header.replace(/^#+\s+/, '').replace(/[#️⚡🎯📋🚀🛠📁🔧💻🧪📝🔄📦🌐📱🏗️🧩]/g, '').trim();
      if (topic && topic.length > 3) {
        topics.push(topic);
      }
    });

    return topics.slice(0, 10); // Limit to 10 topics
  }

  /**
   * Detect document intent based on content and filename
   * @param {string} fileName - File name
   * @param {string} content - Document content
   * @returns {string} Intent category
   */
  detectIntent(fileName, content) {
    const lowerName = fileName.toLowerCase();
    const lowerContent = content.toLowerCase();

    if (lowerName.includes('troubleshoot') || lowerName.includes('faq') || 
        lowerContent.includes('error') || lowerContent.includes('problem')) {
      return 'troubleshooting';
    }
    if (lowerName.includes('guide') || lowerName.includes('tutorial') || 
        lowerContent.includes('step') || lowerContent.includes('how to')) {
      return 'how-to';
    }
    if (lowerName.includes('api') || lowerName.includes('reference')) {
      return 'reference';
    }
    
    return 'explanation';
  }

  /**
   * Classify section type based on title and level
   * @param {string} title - Section title
   * @param {number} level - Header level (1-6)
   * @returns {string} Section type
   */
  classifySection(title, level) {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('install') || lowerTitle.includes('setup')) {
      return 'installation';
    }
    if (lowerTitle.includes('configuration') || lowerTitle.includes('config')) {
      return 'configuration';
    }
    if (lowerTitle.includes('api') || lowerTitle.includes('endpoint')) {
      return 'api';
    }
    if (lowerTitle.includes('example') || lowerTitle.includes('usage')) {
      return 'example';
    }
    if (lowerTitle.includes('troubleshoot') || lowerTitle.includes('error')) {
      return 'troubleshooting';
    }
    
    return level <= 2 ? 'main-section' : 'subsection';
  }

  /**
   * Generate URL-friendly anchor from title
   * @param {string} title - Section title
   * @returns {string} URL anchor
   */
  generateAnchor(title) {
    return title
      .toLowerCase()
      .replace(/[#️⚡🎯📋🚀🛠📁🔧💻🧪📝🔄📦🌐📱🏗️🧩]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  /**
   * Convert filename to readable title
   * @param {string} fileName - File name
   * @returns {string} Readable title
   */
  fileNameToTitle(fileName) {
    return fileName
      .replace(/\.[^.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' ')   // Replace dashes and underscores
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize words
      .trim();
  }

  /**
   * Count words in content
   * @param {string} content - Text content
   * @returns {number} Word count
   */
  countWords(content) {
    return content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  /**
   * Get file last modified time
   * @param {string} filePath - File path
   * @returns {Promise<Date>} Last modified date
   */
  async getLastModified(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime;
    } catch (error) {
      return new Date();
    }
  }

  /**
   * Check if file should be excluded from processing
   * @param {string} filePath - File path to check
   * @returns {boolean} True if should be excluded
   */
  shouldExcludeFile(filePath) {
    return this.excludePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if file is supported
   * @param {string} filePath - File path to check
   * @returns {boolean} True if supported
   */
  isSupportedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }
}

module.exports = DocumentParser;