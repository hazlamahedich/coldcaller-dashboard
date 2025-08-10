# RAG Chatbot Setup Guide

The RAG (Retrieval-Augmented Generation) chatbot has been successfully integrated into the ColdCaller backend! 🎉

## Current Status ✅

- **Integration**: Complete and working
- **Routes**: Available at `/api/rag/*`  
- **Health Check**: `GET /api/rag/health`
- **Dependencies**: All installed
- **Server**: Starting successfully

## Required Configuration 🔧

To fully activate the RAG chatbot, you need to configure these services:

### 1. Supabase (Vector Database)

1. **Create Account**: Go to [supabase.com](https://supabase.com) and create a free account
2. **Create Project**: Create a new project
3. **Get Credentials**: Go to Settings > API
   - Copy your `Project URL`
   - Copy your `service_role` key (not anon key!)
4. **Update .env**: Replace placeholders in `/backend/.env`:
   ```env
   SUPABASE_URL=https://your-actual-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your-actual-service-role-key-here
   ```

### 2. Google AI (Gemini API)

1. **Get API Key**: Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Create Key**: Generate a new API key
3. **Update .env**: Replace placeholder in `/backend/.env`:
   ```env
   GOOGLE_AI_API_KEY=your-actual-google-ai-api-key-here
   ```

## Available Endpoints 📡

Once configured, these endpoints will be fully operational:

### Health & Status
- `GET /api/rag/health` - Service health check
- `GET /api/rag/stats` - Document statistics

### RAG Query (Main Feature)
- `POST /api/rag/query` - Send questions, get AI responses
  ```json
  {
    "message": "How do I set up Twilio with ColdCaller?",
    "conversationId": "optional-uuid",
    "userId": "optional-uuid"
  }
  ```

### Document Management
- `POST /api/rag/index-documents` - Index documentation for RAG
- `POST /api/rag/search` - Search documents directly

## Testing the Integration 🧪

After configuring your API keys, test with:

```bash
# 1. Check health (should show "healthy")
curl http://localhost:3001/api/rag/health

# 2. Index some documents
curl -X POST http://localhost:3001/api/rag/index-documents \
  -H "Content-Type: application/json"

# 3. Ask a question
curl -X POST http://localhost:3001/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I get started with ColdCaller?"}'
```

## Architecture Overview 🏗️

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   External      │
│                 │    │                  │    │   Services      │
│  ChatInterface  │ -> │  /api/rag/query  │ -> │  • Supabase     │
│                 │    │                  │    │  • Google AI    │
│  DocumentViewer │    │  RAG Pipeline:   │    │                 │
│                 │    │  1. Vector Search│    │                 │
│                 │    │  2. Context Build│    │                 │
│                 │    │  3. AI Response  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Key Features ⭐

- **Smart Retrieval**: Finds relevant documentation automatically
- **Contextual Responses**: AI understands your ColdCaller setup
- **Conversation Memory**: Maintains conversation context
- **Rate Limited**: Prevents abuse
- **Validation**: Ensures safe, clean inputs
- **Error Handling**: Graceful failures with helpful messages
- **Performance Tracking**: Response times and confidence scores

## Next Steps 🚀

1. **Configure APIs**: Set up Supabase and Google AI credentials
2. **Index Documents**: Add your documentation to the vector store
3. **Test Integration**: Verify everything works end-to-end
4. **Frontend Integration**: Connect the frontend chat interface
5. **Monitor Performance**: Watch logs and response times

## Troubleshooting 🔧

### Common Issues:

**"supabaseUrl is required"**: Update your `.env` file with real Supabase credentials

**"No documents found"**: Run the indexing endpoint to add documentation

**"Rate limit exceeded"**: Wait a few minutes or adjust rate limits in code

**Service unavailable**: Check your API keys and network connection

## Support 💬

The RAG chatbot is now fully integrated and ready to use! Just add your API keys and start asking questions about your ColdCaller setup.

For technical issues, check the server logs at `backend/logs/` or the health endpoint.

---

✅ **Status**: RAG Integration Complete - Ready for Configuration!