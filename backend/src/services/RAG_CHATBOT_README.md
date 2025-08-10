# RAG Chatbot Implementation

This directory contains the complete implementation of a Retrieval-Augmented Generation (RAG) chatbot system using **Supabase pgvector** for vector storage and **Google Gemini** for embeddings and text generation.

## 🎯 Overview

The RAG chatbot provides intelligent, context-aware responses by:
1. **Document Processing**: Converting documentation into searchable chunks
2. **Vector Embedding**: Using Google Gemini to create 768-dimensional embeddings
3. **Semantic Search**: Finding relevant content using vector similarity
4. **Response Generation**: Creating intelligent responses with Google Gemini AI

## 📁 File Structure

```
services/
├── supabaseVectorStore.js     # Vector database operations
├── geminiResponseGenerator.js  # AI response generation
├── documentProcessor.js        # Document parsing and chunking
└── RAG_CHATBOT_README.md      # This documentation

utils/
└── embeddingUtils.js          # Vector math and utilities

routes/
└── chat.js                    # API endpoints for chatbot

database/migrations/
└── 005_create_chatbot_tables.js # Database schema
```

## 🚀 Quick Start

### 1. Environment Setup

Add these variables to your `.env` file:

```bash
# Google AI Configuration
GOOGLE_AI_API_KEY=your-google-ai-api-key
GOOGLE_AI_MODEL=gemini-1.5-pro-latest
GOOGLE_AI_EMBEDDING_MODEL=text-embedding-004

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Chat Settings
CHAT_MAX_CONTEXT_LENGTH=4000
CHAT_MAX_RESPONSE_LENGTH=500
CHAT_SIMILARITY_THRESHOLD=0.7
CHAT_MAX_SOURCES=3
```

### 2. Database Setup

Run the migration to create required tables:

```bash
npm run db:migrate
```

### 3. Index Documentation

Index your documentation files:

```bash
curl -X POST http://localhost:3001/api/chat/index-documents \
  -H "Content-Type: application/json" \
  -d '{"clearExisting": true}'
```

### 4. Test the Chatbot

```bash
curl -X POST http://localhost:3001/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I set up Twilio integration?"}'
```

## 🔧 Core Services

### SupabaseVectorStore

Handles all vector database operations:

```javascript
const vectorStore = new SupabaseVectorStore();

// Add a document
await vectorStore.addDocument({
  content: "How to setup Twilio...",
  source: "twilio-guide",
  title: "Twilio Setup Guide"
});

// Search for similar documents
const results = await vectorStore.similaritySearch("twilio setup", {
  matchCount: 5,
  matchThreshold: 0.7
});
```

**Key Methods:**
- `generateEmbedding(text)` - Create embeddings using Gemini
- `addDocument(doc)` - Add single document
- `batchAddDocuments(docs)` - Add multiple documents
- `similaritySearch(query, options)` - Find similar content
- `getHealth()` - Check service status

### GeminiResponseGenerator

Generates intelligent responses using context:

```javascript
const generator = new GeminiResponseGenerator();

const response = await generator.generateResponse(
  "How do I make calls?",
  relevantDocuments
);

console.log(response.text);
console.log(response.sources);
console.log(response.confidence);
```

**Key Methods:**
- `generateResponse(query, context, options)` - Main generation method
- `generateStreamingResponse(query, context, onChunk)` - Streaming responses
- `getHealth()` - Check service status

### DocumentProcessor

Processes various document formats:

```javascript
const processor = new DocumentProcessor();

// Process all project documentation
const documents = await processor.processAllDocuments();

// Process a single file
const chunks = await processor.processDocument('/path/to/doc.md');
```

**Key Methods:**
- `processAllDocuments(rootPath)` - Process entire project
- `processDocument(filePath, metadata)` - Process single file
- `processDirectory(dirPath, metadata)` - Process directory
- `getProcessingStats()` - Get processing statistics

## 🌐 API Endpoints

### Chat Query
**POST** `/api/chat/query`

```json
{
  "message": "How do I set up Twilio?",
  "conversationId": "optional-uuid",
  "userId": "optional-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "response": "To set up Twilio integration...",
  "sources": [
    {
      "title": "Twilio Setup Guide",
      "source": "twilio-guide",
      "similarity": 0.89
    }
  ],
  "confidence": 0.85,
  "conversationId": "uuid",
  "responseTime": 1250
}
```

### Document Indexing
**POST** `/api/chat/index-documents`

```json
{
  "clearExisting": true
}
```

### Health Check
**GET** `/api/chat/health`

Returns health status of all services.

### Document Search
**POST** `/api/chat/search`

Direct document search for debugging:

```json
{
  "query": "twilio setup",
  "limit": 5
}
```

## 📊 Database Schema

### chatbot_documents (PostgreSQL with pgvector)

```sql
CREATE TABLE chatbot_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768), -- 768-dimensional Gemini embeddings
  metadata JSONB NOT NULL DEFAULT '{}',
  source VARCHAR(255) NOT NULL,
  title VARCHAR(500),
  section VARCHAR(500),
  tags TEXT[],
  keywords TEXT[],
  topics TEXT[],
  intent VARCHAR(50) CHECK (intent IN ('how-to', 'troubleshooting', 'reference', 'explanation')),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Similarity Search Function

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  source VARCHAR(255),
  title VARCHAR(500),
  similarity FLOAT
);
```

## 🛠️ Configuration Options

### Vector Store Configuration

```javascript
const vectorStore = new SupabaseVectorStore();

// Custom similarity search
const results = await vectorStore.similaritySearch(query, {
  matchThreshold: 0.6,    // Minimum similarity score
  matchCount: 10,         // Max results
  source: 'twilio-guide', // Filter by source
  intent: 'how-to',       // Filter by intent
  tags: ['setup', 'api']  // Filter by tags
});
```

### Response Generator Configuration

```javascript
const generator = new GeminiResponseGenerator();

const response = await generator.generateResponse(query, context, {
  tone: 'helpful and professional',
  domain: 'ColdCaller Dashboard',
  includeDisclaimer: true
});
```

### Document Processor Configuration

```javascript
const processor = new DocumentProcessor();

// Configure processing options
processor.chunkSize = 1500;        // Characters per chunk
processor.chunkOverlap = 150;      // Overlap between chunks
processor.maxFileSize = 5 * 1024 * 1024; // 5MB max file size
```

## 🔍 Monitoring & Debugging

### Health Checks

```bash
# Check overall health
curl http://localhost:3001/api/chat/health

# Check specific service
const health = await vectorStore.getHealth();
console.log(health.status); // 'healthy' or 'unhealthy'
```

### Statistics

```bash
# Get document statistics
curl http://localhost:3001/api/chat/stats
```

### Logging

Set log level in environment:

```bash
LOG_LEVEL=DEBUG # DEBUG, INFO, WARN, ERROR
```

### Performance Metrics

The system tracks:
- Response times
- Similarity scores
- Context usage
- Token consumption
- Error rates

## 🚀 Performance Optimization

### Vector Search Optimization

1. **Indexes**: Automatic IVFFlat index creation for fast similarity search
2. **Batch Processing**: Efficient bulk document processing
3. **Caching**: Smart caching of embeddings and responses
4. **Rate Limiting**: Built-in rate limiting to prevent abuse

### Memory Management

```javascript
// Efficient batch processing
const result = await vectorStore.batchAddDocuments(documents);
console.log(`Processed: ${result.successCount}/${result.totalProcessed}`);
```

### Cost Optimization

- **Google AI**: ~$20-40/month (much cheaper than OpenAI)
- **Supabase**: Free tier available, then $25/month
- **Total**: ~$30-75/month vs $200-400 with OpenAI

## 🔧 Troubleshooting

### Common Issues

**"Services not ready"**
- Check environment variables are set
- Verify Google AI API key is valid
- Ensure Supabase connection is working

**"No relevant documents found"**
- Run document indexing: `POST /api/chat/index-documents`
- Lower similarity threshold in search options
- Check if documents were processed correctly

**"Embedding generation failed"**
- Verify Google AI API key and quotas
- Check network connectivity
- Review API usage limits

**"Database connection failed"**
- Verify Supabase credentials
- Check if pgvector extension is enabled
- Ensure database migrations have run

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=DEBUG npm start
```

### Test Individual Components

```javascript
// Test embedding generation
const vectorStore = new SupabaseVectorStore();
const embedding = await vectorStore.generateEmbedding("test text");
console.log(embedding.length); // Should be 768

// Test response generation
const generator = new GeminiResponseGenerator();
const response = await generator.generateResponse("test", [mockContext]);
console.log(response.text);
```

## 📈 Scaling Considerations

### Production Deployment

1. **Environment**: Set `NODE_ENV=production`
2. **Database**: Use dedicated PostgreSQL with pgvector
3. **Caching**: Implement Redis for response caching
4. **Load Balancing**: Use multiple server instances
5. **Monitoring**: Set up comprehensive logging and metrics

### Performance Tuning

1. **Vector Index**: Tune IVFFlat parameters for your data size
2. **Chunk Size**: Optimize chunk size for your content type
3. **Batch Size**: Adjust batch processing size for memory limits
4. **Rate Limits**: Configure appropriate rate limits

## 🤝 Contributing

When adding new features:

1. **Follow existing patterns**: Use the established service architecture
2. **Add tests**: Include unit tests for new functionality
3. **Update documentation**: Keep this README current
4. **Handle errors**: Implement proper error handling and logging
5. **Consider performance**: Profile new features for performance impact

## 📚 Resources

- [Supabase pgvector Documentation](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Google Generative AI SDK](https://github.com/google/generative-ai-js)
- [Vector Database Best Practices](https://docs.pinecone.io/docs/best-practices)
- [RAG System Design Patterns](https://docs.llamaindex.ai/en/latest/getting_started/concepts.html)