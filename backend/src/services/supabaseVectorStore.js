const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

/**
 * Supabase Vector Store Service
 * Manages document storage and vector similarity search using Supabase pgvector
 */
class SupabaseVectorStore {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ 
      model: process.env.GOOGLE_AI_EMBEDDING_MODEL || "text-embedding-004" 
    });

    this.isInitialized = false;
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the vector store
   */
  async initialize() {
    try {
      // Test Supabase connection
      const { data, error } = await this.supabase
        .from('chatbot_documents')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // Table doesn't exist
        logger.warn('Chatbot documents table not found. Please run database migrations.');
        throw new Error('Vector store not properly initialized. Run database migrations first.');
      }

      this.isInitialized = true;
      logger.info('Supabase Vector Store initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Supabase Vector Store:', error);
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
   * Generate embedding for text using Google Gemini
   * @param {string} text - Text to embed
   * @returns {Array<number>} - 768-dimensional vector
   */
  async generateEmbedding(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Text must be a non-empty string');
      }

      const result = await this.embeddingModel.embedContent(text);
      const embedding = result.embedding.values;

      if (!embedding || embedding.length !== 768) {
        throw new Error('Invalid embedding dimensions received from Google AI');
      }

      return embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Add a single document to the vector store
   * @param {Object} document - Document object
   * @returns {Object} - Created document
   */
  async addDocument(document) {
    await this.ensureInitialized();

    try {
      // Validate required fields
      if (!document.content || !document.source) {
        throw new Error('Document must have content and source');
      }

      // Generate embedding for the document content
      const embedding = await this.generateEmbedding(document.content);

      // Prepare document data
      const documentData = {
        content: document.content,
        embedding: embedding,
        metadata: document.metadata || {},
        source: document.source,
        title: document.title || null,
        section: document.section || null,
        tags: document.tags || [],
        keywords: document.keywords || [],
        topics: document.topics || [],
        intent: document.intent || null,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      // Insert document into Supabase
      const { data, error } = await this.supabase
        .from('chatbot_documents')
        .insert(documentData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`Document added to vector store: ${data.id}`);
      return data;
    } catch (error) {
      logger.error(`Error adding document: ${error.message}`);
      throw new Error(`Failed to add document: ${error.message}`);
    }
  }

  /**
   * Add multiple documents in batch
   * @param {Array} documents - Array of document objects
   * @returns {Array} - Array of created documents
   */
  async batchAddDocuments(documents) {
    await this.ensureInitialized();

    if (!Array.isArray(documents)) {
      throw new Error('Documents must be an array');
    }

    const results = [];
    const errors = [];

    logger.info(`Starting batch processing of ${documents.length} documents`);

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      try {
        const result = await this.addDocument(doc);
        results.push(result);
        
        // Log progress every 10 documents
        if ((i + 1) % 10 === 0) {
          logger.info(`Processed ${i + 1}/${documents.length} documents`);
        }
      } catch (error) {
        const errorInfo = {
          index: i,
          title: doc.title || 'Unknown',
          source: doc.source || 'Unknown',
          error: error.message
        };
        errors.push(errorInfo);
        logger.error(`Error processing document ${i + 1}:`, errorInfo);
      }
    }

    logger.info(`Batch processing completed: ${results.length} successful, ${errors.length} failed`);
    
    return {
      successful: results,
      errors: errors,
      totalProcessed: documents.length,
      successCount: results.length,
      errorCount: errors.length
    };
  }

  /**
   * Perform similarity search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} - Array of matching documents
   */
  async similaritySearch(query, options = {}) {
    await this.ensureInitialized();

    try {
      const {
        matchThreshold = 0.7,
        matchCount = 5,
        source = null,
        intent = null,
        tags = null
      } = options;

      // Validate parameters
      if (!query || typeof query !== 'string') {
        throw new Error('Query must be a non-empty string');
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Perform vector similarity search using the database function
      const { data, error } = await this.supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) {
        throw error;
      }

      // Additional client-side filtering if specified
      let filteredData = data || [];
      
      if (source) {
        filteredData = filteredData.filter(doc => 
          doc.source && doc.source.toLowerCase().includes(source.toLowerCase())
        );
      }
      
      if (intent) {
        filteredData = filteredData.filter(doc => doc.intent === intent);
      }
      
      if (tags && Array.isArray(tags)) {
        filteredData = filteredData.filter(doc => 
          doc.tags && tags.some(tag => doc.tags.includes(tag))
        );
      }

      logger.info(`Similarity search completed: ${filteredData.length} matches for query: "${query}"`);
      return filteredData;
    } catch (error) {
      logger.error('Error performing similarity search:', error);
      throw new Error(`Similarity search failed: ${error.message}`);
    }
  }

  /**
   * Delete document by ID
   * @param {string} documentId - Document UUID
   * @returns {boolean} - Success status
   */
  async deleteDocument(documentId) {
    await this.ensureInitialized();

    try {
      const { error } = await this.supabase
        .from('chatbot_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        throw error;
      }

      logger.info(`Document deleted: ${documentId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting document ${documentId}:`, error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Update document content and regenerate embedding
   * @param {string} documentId - Document UUID
   * @param {Object} updates - Updates to apply
   * @returns {Object} - Updated document
   */
  async updateDocument(documentId, updates) {
    await this.ensureInitialized();

    try {
      const updateData = { ...updates };

      // If content is being updated, regenerate embedding
      if (updates.content) {
        updateData.embedding = await this.generateEmbedding(updates.content);
      }

      updateData.last_updated = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('chatbot_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`Document updated: ${documentId}`);
      return data;
    } catch (error) {
      logger.error(`Error updating document ${documentId}:`, error);
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * Get document count by source
   * @param {string} source - Source filter (optional)
   * @returns {number} - Document count
   */
  async getDocumentCount(source = null) {
    await this.ensureInitialized();

    try {
      let query = this.supabase
        .from('chatbot_documents')
        .select('*', { count: 'exact', head: true });

      if (source) {
        query = query.eq('source', source);
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error getting document count:', error);
      throw new Error(`Failed to get document count: ${error.message}`);
    }
  }

  /**
   * Clear all documents (use with caution)
   * @param {string} source - Optional source filter
   * @returns {number} - Number of deleted documents
   */
  async clearDocuments(source = null) {
    await this.ensureInitialized();

    try {
      let query = this.supabase.from('chatbot_documents').delete();

      if (source) {
        query = query.eq('source', source);
      }

      const { error, count } = await query;

      if (error) {
        throw error;
      }

      logger.warn(`Cleared ${count} documents${source ? ` from source: ${source}` : ''}`);
      return count || 0;
    } catch (error) {
      logger.error('Error clearing documents:', error);
      throw new Error(`Failed to clear documents: ${error.message}`);
    }
  }

  /**
   * Get health status of the vector store
   * @returns {Object} - Health status information
   */
  async getHealth() {
    try {
      const documentCount = await this.getDocumentCount();
      
      // Test embedding generation
      const testEmbedding = await this.generateEmbedding('test');
      const embeddingWorking = testEmbedding && testEmbedding.length === 768;

      // Test similarity search
      const testSearch = await this.supabase.rpc('match_documents', {
        query_embedding: testEmbedding,
        match_threshold: 0.5,
        match_count: 1
      });

      return {
        status: 'healthy',
        initialized: this.isInitialized,
        documentCount,
        embeddingService: embeddingWorking ? 'operational' : 'error',
        vectorSearch: testSearch.error ? 'error' : 'operational',
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

module.exports = SupabaseVectorStore;