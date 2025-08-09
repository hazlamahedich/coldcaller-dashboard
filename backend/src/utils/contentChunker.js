/**
 * Content Chunker for RAG Chatbot
 * 
 * Splits document content into optimal chunks for vector embeddings
 * Handles semantic chunking, overlap, and metadata preservation
 */

class ContentChunker {
  constructor(options = {}) {
    this.maxChunkSize = options.maxChunkSize || 1000;
    this.minChunkSize = options.minChunkSize || 500;
    this.chunkOverlap = options.chunkOverlap || 100;
    this.preserveStructure = options.preserveStructure !== false;
    this.splitPatterns = {
      section: /\n#{1,6}\s+/,
      paragraph: /\n\s*\n/,
      sentence: /[.!?]+\s+/,
      clause: /[,;:]\s+/
    };
  }

  /**
   * Chunk a parsed document into optimal pieces for embeddings
   * @param {Object} document - Parsed document from DocumentParser
   * @returns {Array<Object>} Array of document chunks
   */
  chunkDocument(document) {
    const chunks = [];
    
    // Process each section separately to maintain context
    for (const section of document.sections) {
      const sectionChunks = this.chunkSection(document, section);
      chunks.push(...sectionChunks);
    }

    // If no sections, chunk the raw content
    if (chunks.length === 0 && document.rawContent) {
      const fallbackChunks = this.chunkText(document.rawContent, {
        source: document.source,
        title: document.title,
        section: 'Document Content',
        metadata: document.metadata
      });
      chunks.push(...fallbackChunks);
    }

    return chunks.map((chunk, index) => ({
      ...chunk,
      chunkId: `${this.generateChunkId(document.source)}-${index + 1}`,
      chunkIndex: index,
      totalChunks: chunks.length
    }));
  }

  /**
   * Chunk a document section into smaller pieces
   * @param {Object} document - Full document object
   * @param {Object} section - Section to chunk
   * @returns {Array<Object>} Array of section chunks
   */
  chunkSection(document, section) {
    const baseContext = {
      source: document.source,
      title: document.title,
      section: section.title,
      sectionType: section.type,
      metadata: {
        ...document.metadata,
        sectionLevel: section.level,
        sectionAnchor: section.anchor
      }
    };

    // For small sections, keep as single chunk
    if (section.content.length <= this.maxChunkSize) {
      return [{
        content: section.content.trim(),
        ...baseContext
      }];
    }

    // For larger sections, split intelligently
    return this.chunkText(section.content, baseContext);
  }

  /**
   * Split text into chunks using semantic boundaries
   * @param {string} text - Text to chunk
   * @param {Object} context - Base context for chunks
   * @returns {Array<Object>} Array of text chunks
   */
  chunkText(text, context) {
    const chunks = [];
    
    // Clean and prepare text
    const cleanText = this.cleanText(text);
    if (cleanText.length < this.minChunkSize) {
      return [{
        content: cleanText,
        ...context
      }];
    }

    // Try different splitting strategies
    const splitChunks = this.semanticSplit(cleanText);
    
    for (const chunk of splitChunks) {
      if (chunk.length >= this.minChunkSize) {
        chunks.push({
          content: chunk.trim(),
          ...context
        });
      } else if (chunks.length > 0) {
        // Merge small chunks with previous chunk
        const lastChunk = chunks[chunks.length - 1];
        if (lastChunk.content.length + chunk.length <= this.maxChunkSize) {
          lastChunk.content += '\n\n' + chunk.trim();
        } else {
          chunks.push({
            content: chunk.trim(),
            ...context
          });
        }
      } else {
        chunks.push({
          content: chunk.trim(),
          ...context
        });
      }
    }

    // Add overlap between chunks for better context
    return this.addOverlap(chunks);
  }

  /**
   * Perform semantic splitting of text
   * @param {string} text - Text to split
   * @returns {Array<string>} Array of text chunks
   */
  semanticSplit(text) {
    // Try splitting by sections first
    let chunks = this.splitByPattern(text, this.splitPatterns.section);
    
    // If chunks are too large, split by paragraphs
    const refinedChunks = [];
    for (const chunk of chunks) {
      if (chunk.length > this.maxChunkSize) {
        const paragraphChunks = this.splitByPattern(chunk, this.splitPatterns.paragraph);
        refinedChunks.push(...paragraphChunks);
      } else {
        refinedChunks.push(chunk);
      }
    }

    // Final pass: split oversized chunks by sentences
    const finalChunks = [];
    for (const chunk of refinedChunks) {
      if (chunk.length > this.maxChunkSize) {
        const sentenceChunks = this.splitByPattern(chunk, this.splitPatterns.sentence);
        finalChunks.push(...sentenceChunks);
      } else {
        finalChunks.push(chunk);
      }
    }

    return finalChunks.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * Split text by a specific pattern
   * @param {string} text - Text to split
   * @param {RegExp} pattern - Splitting pattern
   * @returns {Array<string>} Split chunks
   */
  splitByPattern(text, pattern) {
    const parts = text.split(pattern);
    const chunks = [];
    let currentChunk = '';

    for (const part of parts) {
      const testChunk = currentChunk + (currentChunk ? '\n' : '') + part;
      
      if (testChunk.length <= this.maxChunkSize) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = part;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 1 ? chunks : [text];
  }

  /**
   * Add overlap between consecutive chunks for better context
   * @param {Array<Object>} chunks - Array of chunks
   * @returns {Array<Object>} Chunks with overlap added
   */
  addOverlap(chunks) {
    if (chunks.length <= 1 || this.chunkOverlap <= 0) {
      return chunks;
    }

    const overlappedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = { ...chunks[i] };
      
      // Add overlap from previous chunk
      if (i > 0) {
        const previousChunk = chunks[i - 1];
        const overlapText = this.getOverlapText(previousChunk.content, false);
        if (overlapText) {
          chunk.content = overlapText + '\n\n' + chunk.content;
          chunk.hasOverlapBefore = true;
        }
      }
      
      // Add overlap from next chunk
      if (i < chunks.length - 1) {
        const nextChunk = chunks[i + 1];
        const overlapText = this.getOverlapText(nextChunk.content, true);
        if (overlapText) {
          chunk.content = chunk.content + '\n\n' + overlapText;
          chunk.hasOverlapAfter = true;
        }
      }
      
      overlappedChunks.push(chunk);
    }

    return overlappedChunks;
  }

  /**
   * Get overlap text from a chunk
   * @param {string} content - Chunk content
   * @param {boolean} fromStart - Whether to get text from start or end
   * @returns {string} Overlap text
   */
  getOverlapText(content, fromStart = false) {
    if (content.length <= this.chunkOverlap) {
      return content;
    }

    if (fromStart) {
      return content.substring(0, this.chunkOverlap);
    } else {
      return content.substring(content.length - this.chunkOverlap);
    }
  }

  /**
   * Clean text content for processing
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove empty lines (more than 2 consecutive newlines)
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Clean up code blocks (preserve but clean)
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/\n\s+/g, '\n');
      })
      // Remove excessive punctuation
      .replace(/\.{3,}/g, '...')
      // Clean up list formatting
      .replace(/^\s*[-*+]\s+/gm, '• ')
      // Clean up numbered lists
      .replace(/^\s*\d+\.\s+/gm, (match, offset, string) => {
        const num = match.match(/\d+/)[0];
        return `${num}. `;
      })
      .trim();
  }

  /**
   * Generate a unique chunk ID
   * @param {string} source - Source document path
   * @returns {string} Unique chunk ID
   */
  generateChunkId(source) {
    const baseName = source
      .replace(/[\/\\]/g, '-')
      .replace(/[^\w-]/g, '')
      .toLowerCase();
    
    return baseName + '-' + Date.now().toString(36);
  }

  /**
   * Merge small adjacent chunks
   * @param {Array<Object>} chunks - Array of chunks
   * @returns {Array<Object>} Merged chunks
   */
  mergeSmallChunks(chunks) {
    const mergedChunks = [];
    let currentChunk = null;

    for (const chunk of chunks) {
      if (!currentChunk) {
        currentChunk = { ...chunk };
      } else if (
        chunk.content.length < this.minChunkSize &&
        currentChunk.content.length + chunk.content.length <= this.maxChunkSize &&
        chunk.section === currentChunk.section
      ) {
        // Merge with current chunk
        currentChunk.content += '\n\n' + chunk.content;
      } else {
        // Start new chunk
        mergedChunks.push(currentChunk);
        currentChunk = { ...chunk };
      }
    }

    if (currentChunk) {
      mergedChunks.push(currentChunk);
    }

    return mergedChunks;
  }

  /**
   * Validate chunk quality
   * @param {Object} chunk - Chunk to validate
   * @returns {Object} Validation result with quality score
   */
  validateChunk(chunk) {
    let score = 1.0;
    const issues = [];

    // Check size
    if (chunk.content.length < this.minChunkSize) {
      score -= 0.2;
      issues.push('chunk_too_small');
    } else if (chunk.content.length > this.maxChunkSize) {
      score -= 0.3;
      issues.push('chunk_too_large');
    }

    // Check completeness (ends with proper punctuation)
    if (!/[.!?]$/.test(chunk.content.trim())) {
      score -= 0.1;
      issues.push('incomplete_sentence');
    }

    // Check for code blocks (should be preserved)
    const codeBlocks = chunk.content.match(/```[\s\S]*?```/g) || [];
    if (codeBlocks.length > 0) {
      score += 0.1; // Code blocks add value
    }

    // Check for structure (headers, lists)
    const hasHeaders = /^#+\s+/m.test(chunk.content);
    const hasLists = /^\s*[-*+•]\s+/m.test(chunk.content);
    if (hasHeaders || hasLists) {
      score += 0.1; // Structure adds value
    }

    return {
      score: Math.max(0, Math.min(1, score)),
      issues,
      quality: score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low'
    };
  }
}

module.exports = ContentChunker;