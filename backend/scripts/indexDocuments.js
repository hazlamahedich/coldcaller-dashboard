#!/usr/bin/env node

/**
 * Document Indexing Script for RAG Chatbot
 * 
 * Processes all documentation files and indexes them for the RAG chatbot system
 * Supports both batch processing and incremental updates
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import our processing utilities
const DocumentParser = require('../src/utils/documentParser');
const ContentChunker = require('../src/utils/contentChunker');
const MetadataExtractor = require('../src/utils/metadataExtractor');

class DocumentationProcessor {
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // Initialize Google AI for embeddings
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ 
      model: "text-embedding-004" 
    });

    // Initialize processors
    this.documentParser = new DocumentParser();
    this.contentChunker = new ContentChunker({
      maxChunkSize: 1000,
      minChunkSize: 500,
      chunkOverlap: 100
    });
    this.metadataExtractor = new MetadataExtractor();

    // Configuration
    this.batchSize = 10; // Process 10 documents at a time
    this.projectRoot = path.resolve(__dirname, '../..');
    this.documentSources = [
      '*.md',
      'docs/**/*.md',
      'frontend/**/*.md',
      'backend/**/*.md'
    ];
    
    this.excludePatterns = [
      '**/node_modules/**',
      '**/.git/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**'
    ];
  }

  /**
   * Main processing function - process all documentation
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processAllDocuments(options = {}) {
    const {
      force = false,      // Force reprocessing of all documents
      incremental = true, // Only process changed documents
      dryRun = false      // Don't actually index, just show what would be processed
    } = options;

    console.log('🚀 Starting documentation processing...');
    console.log(`📁 Project root: ${this.projectRoot}`);
    
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalChunks = 0;
    let errors = [];

    try {
      // Find all documentation files
      const documentFiles = await this.findDocumentFiles();
      console.log(`📚 Found ${documentFiles.length} documentation files`);

      // Filter files for processing
      const filesToProcess = incremental && !force 
        ? await this.filterChangedFiles(documentFiles)
        : documentFiles;

      console.log(`🔄 Processing ${filesToProcess.length} files...`);

      if (dryRun) {
        console.log('\n📋 DRY RUN - Files that would be processed:');
        filesToProcess.forEach(file => console.log(`  - ${file}`));
        return { processed: 0, chunks: 0, errors: [], dryRun: true };
      }

      // Process files in batches
      for (let i = 0; i < filesToProcess.length; i += this.batchSize) {
        const batch = filesToProcess.slice(i, i + this.batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(filesToProcess.length / this.batchSize)}`);
        
        const batchResults = await this.processBatch(batch);
        totalProcessed += batchResults.processed;
        totalChunks += batchResults.chunks;
        errors.push(...batchResults.errors);

        // Progress update
        const progress = Math.round(((i + batch.length) / filesToProcess.length) * 100);
        console.log(`📊 Progress: ${progress}% (${i + batch.length}/${filesToProcess.length} files)`);
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      console.log('\n✅ Processing completed!');
      console.log(`📈 Results:`);
      console.log(`   - Files processed: ${totalProcessed}`);
      console.log(`   - Chunks created: ${totalChunks}`);
      console.log(`   - Errors: ${errors.length}`);
      console.log(`   - Duration: ${duration.toFixed(2)}s`);

      if (errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        errors.forEach(error => console.log(`   - ${error}`));
      }

      return {
        processed: totalProcessed,
        chunks: totalChunks,
        errors,
        duration
      };

    } catch (error) {
      console.error('💥 Fatal error during processing:', error);
      throw error;
    }
  }

  /**
   * Process a batch of documents
   * @param {Array<string>} filePaths - Array of file paths to process
   * @returns {Promise<Object>} Batch processing results
   */
  async processBatch(filePaths) {
    let processed = 0;
    let totalChunks = 0;
    const errors = [];

    for (const filePath of filePaths) {
      try {
        console.log(`  📄 Processing: ${path.relative(this.projectRoot, filePath)}`);
        
        const result = await this.processDocument(filePath);
        if (result) {
          processed++;
          totalChunks += result.chunks;
          console.log(`    ✅ Created ${result.chunks} chunks`);
        }
      } catch (error) {
        const errorMsg = `Failed to process ${filePath}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`    ❌ ${errorMsg}`);
      }
    }

    return { processed, chunks: totalChunks, errors };
  }

  /**
   * Process a single document
   * @param {string} filePath - Path to the document
   * @returns {Promise<Object|null>} Processing result
   */
  async processDocument(filePath) {
    try {
      // Parse document
      const document = await this.documentParser.parseDocument(filePath);
      
      // Skip empty documents
      if (!document.rawContent || document.rawContent.trim().length < 100) {
        console.log(`    ⚠️ Skipping empty/small document`);
        return null;
      }

      // Chunk document
      const chunks = this.contentChunker.chunkDocument(document);
      
      if (chunks.length === 0) {
        console.log(`    ⚠️ No chunks generated`);
        return null;
      }

      // Extract metadata and generate embeddings for each chunk
      const processedChunks = [];
      for (const chunk of chunks) {
        const enhancedChunk = this.metadataExtractor.extractChunkMetadata(chunk, document);
        
        // Generate embedding
        const embedding = await this.generateEmbedding(enhancedChunk.content);
        
        const finalChunk = {
          content: enhancedChunk.content,
          embedding,
          metadata: {
            source: enhancedChunk.source,
            title: enhancedChunk.title || document.title,
            section: enhancedChunk.section,
            chunkId: enhancedChunk.chunkId,
            chunkIndex: enhancedChunk.chunkIndex,
            totalChunks: enhancedChunk.totalChunks,
            wordCount: enhancedChunk.wordCount,
            readingTime: enhancedChunk.readingTime,
            primaryTopic: enhancedChunk.primaryTopic,
            complexity: enhancedChunk.complexity,
            informationDensity: enhancedChunk.informationDensity,
            technicalDepth: enhancedChunk.technicalDepth,
            actionability: enhancedChunk.actionability,
            qualityScore: enhancedChunk.qualityScore,
            hasCodeExamples: enhancedChunk.hasCodeExamples,
            documentType: document.contentType,
            lastModified: document.metadata?.lastModified
          },
          tags: enhancedChunk.topics || [],
          keywords: enhancedChunk.searchKeywords || [],
          topics: enhancedChunk.topics || [],
          intent: enhancedChunk.intent,
          source: enhancedChunk.source,
          title: enhancedChunk.title || document.title,
          section: enhancedChunk.section
        };

        processedChunks.push(finalChunk);
      }

      // Store in database
      await this.storeChunks(processedChunks, filePath);

      return {
        chunks: processedChunks.length,
        document: document.title
      };

    } catch (error) {
      console.error(`Error processing document ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Generate embedding for text using Google AI
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      // Clean and truncate text if needed
      const cleanText = text.substring(0, 10000); // Limit to 10k characters
      
      const result = await this.embeddingModel.embedContent(cleanText);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return a zero vector as fallback
      return new Array(768).fill(0);
    }
  }

  /**
   * Store processed chunks in Supabase
   * @param {Array<Object>} chunks - Processed chunks
   * @param {string} filePath - Source file path
   */
  async storeChunks(chunks, filePath) {
    try {
      // First, delete existing chunks for this document
      const relativePath = path.relative(this.projectRoot, filePath);
      const { error: deleteError } = await this.supabase
        .from('chatbot_documents')
        .delete()
        .eq('source', relativePath);

      if (deleteError) {
        console.warn(`Warning: Could not delete existing chunks for ${relativePath}:`, deleteError);
      }

      // Insert new chunks
      const { error: insertError } = await this.supabase
        .from('chatbot_documents')
        .insert(chunks);

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }

    } catch (error) {
      console.error('Error storing chunks:', error);
      throw error;
    }
  }

  /**
   * Find all documentation files in the project
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async findDocumentFiles() {
    const files = [];
    
    // Use glob patterns to find files
    const glob = require('glob').glob;
    
    for (const pattern of this.documentSources) {
      const patternFiles = await glob(pattern, {
        cwd: this.projectRoot,
        absolute: true,
        ignore: this.excludePatterns
      });
      files.push(...patternFiles);
    }

    // Remove duplicates and filter supported files
    const uniqueFiles = [...new Set(files)];
    return uniqueFiles.filter(file => this.documentParser.isSupportedFile(file));
  }

  /**
   * Filter files that have changed since last indexing
   * @param {Array<string>} files - All document files
   * @returns {Promise<Array<string>>} Files that need processing
   */
  async filterChangedFiles(files) {
    const changedFiles = [];

    for (const filePath of files) {
      try {
        const stats = await fs.stat(filePath);
        const relativePath = path.relative(this.projectRoot, filePath);

        // Check if document exists in database
        const { data: existing } = await this.supabase
          .from('chatbot_documents')
          .select('metadata')
          .eq('source', relativePath)
          .limit(1);

        if (!existing || existing.length === 0) {
          changedFiles.push(filePath);
          continue;
        }

        // Check if file was modified
        const dbLastModified = new Date(existing[0].metadata?.lastModified || 0);
        if (stats.mtime > dbLastModified) {
          changedFiles.push(filePath);
        }

      } catch (error) {
        // If we can't check, include the file
        changedFiles.push(filePath);
      }
    }

    return changedFiles;
  }

  /**
   * Initialize database tables if they don't exist
   */
  async initializeDatabase() {
    console.log('🔧 Initializing database...');
    
    try {
      // Check if tables exist
      const { data: tables, error } = await this.supabase
        .from('chatbot_documents')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        console.log('📊 Creating database tables...');
        // Tables don't exist, but we can't create them with the client
        // This should be done via migration or admin interface
        console.log('❗ Please run the database migration to create the chatbot_documents table');
        throw new Error('Database tables not found. Please run migrations first.');
      }

      console.log('✅ Database initialized');
    } catch (error) {
      console.error('💥 Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get processing statistics
   * @returns {Promise<Object>} Statistics about processed documents
   */
  async getStats() {
    try {
      const { data, error } = await this.supabase
        .from('chatbot_documents')
        .select('source, metadata, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const stats = {
        totalChunks: data.length,
        uniqueDocuments: new Set(data.map(d => d.source)).size,
        lastProcessed: data[0]?.created_at,
        documentTypes: {},
        intentDistribution: {}
      };

      // Analyze document types and intents
      data.forEach(doc => {
        const docType = doc.metadata?.documentType || 'unknown';
        const intent = doc.metadata?.intent || 'unknown';
        
        stats.documentTypes[docType] = (stats.documentTypes[docType] || 0) + 1;
        stats.intentDistribution[intent] = (stats.intentDistribution[intent] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'process';
  
  const processor = new DocumentationProcessor();

  try {
    await processor.initializeDatabase();

    switch (command) {
      case 'process':
        const options = {
          force: args.includes('--force'),
          incremental: !args.includes('--no-incremental'),
          dryRun: args.includes('--dry-run')
        };
        await processor.processAllDocuments(options);
        break;

      case 'stats':
        const stats = await processor.getStats();
        if (stats) {
          console.log('\n📊 Processing Statistics:');
          console.log(`   Total chunks: ${stats.totalChunks}`);
          console.log(`   Unique documents: ${stats.uniqueDocuments}`);
          console.log(`   Last processed: ${stats.lastProcessed || 'Never'}`);
          console.log('\n📋 Document types:');
          Object.entries(stats.documentTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
          });
          console.log('\n🎯 Intent distribution:');
          Object.entries(stats.intentDistribution).forEach(([intent, count]) => {
            console.log(`   ${intent}: ${count}`);
          });
        }
        break;

      case 'help':
        console.log(`
📚 Documentation Processing Script

Usage: node indexDocuments.js [command] [options]

Commands:
  process    Process all documentation files (default)
  stats      Show processing statistics
  help       Show this help message

Options for 'process':
  --force           Force reprocessing of all files
  --no-incremental  Disable incremental processing
  --dry-run         Show what would be processed without actually doing it

Examples:
  node indexDocuments.js process
  node indexDocuments.js process --force
  node indexDocuments.js process --dry-run
  node indexDocuments.js stats
        `);
        break;

      default:
        console.log(`Unknown command: ${command}. Use 'help' for available commands.`);
        process.exit(1);
    }

  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = DocumentationProcessor;

// Run as CLI if executed directly
if (require.main === module) {
  main();
}