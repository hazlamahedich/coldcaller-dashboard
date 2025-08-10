# 🤖 RAG Chatbot Specification (Updated for Supabase + Gemini)
## Intelligent FAQ Assistant for Cold Caller Dashboard

---

## 📋 **Executive Summary**

This specification outlines the implementation of a **Retrieval-Augmented Generation (RAG) chatbot** using **Supabase's pgvector** for vector storage and **Google Gemini** for embeddings and text generation. This approach leverages your existing Supabase infrastructure while providing cost-effective AI capabilities.

---

## 🎯 **Project Overview**

### **Product Vision**
Create an intelligent, floating chatbot interface that allows users to quickly get answers about the Cold Caller Dashboard without leaving their workflow or hunting through documentation.

### **Key Objectives**
- **Reduce Support Tickets**: Provide instant answers to common questions
- **Improve User Experience**: Keep users in their workflow with contextual help
- **Increase Feature Adoption**: Help users discover and understand features
- **Accelerate Onboarding**: Guide new users through the platform

---

## 🏗️ **Updated System Architecture**

### **High-Level Architecture with Supabase + Gemini**
```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Floating Chat Icon] --> B[Chat Interface]
        B --> C[Message Handler]
        C --> D[Response Renderer]
    end
    
    subgraph "Backend Layer"
        E[Chat API] --> F[RAG Engine]
        F --> G[Supabase Vector Search]
        F --> H[Google Gemini]
        G --> I[Supabase Database]
    end
    
    subgraph "Data Layer"
        J[Documentation Sources] --> K[Text Processor]
        K --> L[Gemini Embeddings]
        L --> I
    end
    
    C --> E
    D <-- H
    
    style A fill:#4CAF50
    style I fill:#00D084
    style H fill:#4285F4
```

### **Updated Technology Stack**
- **Frontend**: React 19.1.1, Tailwind CSS, Framer Motion (animations)
- **Backend**: Node.js, Express.js, Google Gemini API
- **Vector Database**: Supabase with pgvector extension
- **Text Processing**: Langchain.js
- **Embeddings**: Google Gemini text-embedding-004 (768 dimensions)
- **Text Generation**: Google Gemini 1.5 Pro

---

## 🗄️ **Supabase Vector Database Schema**

### **Database Setup**
```sql
-- Enable the pgvector extension in Supabase
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the documents table with vector column
CREATE TABLE chatbot_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768), -- Gemini embeddings are 768-dimensional
  metadata JSONB NOT NULL DEFAULT '{}',
  source VARCHAR(255) NOT NULL,
  title VARCHAR(500),
  section VARCHAR(500),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[],
  keywords TEXT[],
  topics TEXT[],
  intent VARCHAR(50) CHECK (intent IN ('how-to', 'troubleshooting', 'reference', 'explanation')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for optimal performance
CREATE INDEX ON chatbot_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON chatbot_documents USING GIN (metadata);
CREATE INDEX ON chatbot_documents (source);
CREATE INDEX ON chatbot_documents (intent);
CREATE INDEX ON chatbot_documents USING GIN (tags);

-- Create conversation history table
CREATE TABLE chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255) NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function for similarity search
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
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    chatbot_documents.id,
    chatbot_documents.content,
    chatbot_documents.metadata,
    chatbot_documents.source,
    chatbot_documents.title,
    1 - (chatbot_documents.embedding <=> query_embedding) AS similarity
  FROM chatbot_documents
  WHERE 1 - (chatbot_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY chatbot_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 🔧 **Implementation with Supabase + Gemini**

### **Phase 1: Supabase Vector Store Implementation**

```javascript
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class SupabaseVectorStore {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({ 
      model: "text-embedding-004" 
    });
  }
  
  async generateEmbedding(text) {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values; // 768-dimensional vector
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
  
  async addDocument(document) {
    const embedding = await this.generateEmbedding(document.content);
    
    const { data, error } = await this.supabase
      .from('chatbot_documents')
      .insert({
        content: document.content,
        embedding: embedding,
        metadata: document.metadata || {},
        source: document.source,
        title: document.title,
        section: document.section,
        tags: document.tags || [],
        keywords: document.keywords || [],
        topics: document.topics || [],
        intent: document.intent
      })
      .select();
      
    if (error) throw error;
    return data[0];
  }
  
  async batchAddDocuments(documents) {
    const results = [];
    for (const doc of documents) {
      try {
        const result = await this.addDocument(doc);
        results.push(result);
      } catch (error) {
        console.error(`Error adding document: ${doc.title}`, error);
      }
    }
    return results;
  }
  
  async similaritySearch(query, options = {}) {
    const {
      matchThreshold = 0.7,
      matchCount = 5,
      source = null,
      intent = null
    } = options;
    
    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Perform vector similarity search
    const { data, error } = await this.supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    });
    
    if (error) throw error;
    
    // Additional filtering if specified
    let filteredData = data;
    if (source) {
      filteredData = filteredData.filter(doc => doc.source.includes(source));
    }
    if (intent) {
      filteredData = filteredData.filter(doc => doc.intent === intent);
    }
    
    return filteredData;
  }
}
```

### **Phase 2: Gemini Response Generation**

```javascript
class GeminiResponseGenerator {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro-latest" 
    });
  }
  
  async generateResponse(query, context) {
    const systemPrompt = `You are a helpful assistant for the ColdCaller Dashboard. 
                         Use the provided context to answer questions accurately.
                         If you cannot find the answer in the context, say so clearly.
                         Always cite your sources by referencing the document titles.
                         Be concise but comprehensive.`;
    
    const contextText = context.map((doc, index) => 
      `Document ${index + 1} (${doc.title} - ${doc.source}):\n${doc.content}`
    ).join('\n\n');
    
    const prompt = `${systemPrompt}

Context:
${contextText}

Question: ${query}

Please provide a helpful answer based on the context provided:`;

    try {
      const result = await this.model.generateContent([{ text: prompt }]);
      
      return {
        text: result.response.text(),
        sources: this.extractSources(context),
        confidence: this.calculateConfidence(context, query),
        model: 'gemini-1.5-pro'
      };
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
  
  extractSources(context) {
    return context.map(doc => ({
      title: doc.title,
      source: doc.source,
      section: doc.section,
      similarity: doc.similarity
    }));
  }
  
  calculateConfidence(context, query) {
    if (!context.length) return 0;
    
    const avgSimilarity = context.reduce((sum, doc) => 
      sum + doc.similarity, 0) / context.length;
    
    // Confidence based on similarity scores and number of relevant docs
    const sourceCount = Math.min(context.length / 3, 1); // More sources = higher confidence
    return Math.round((avgSimilarity * 0.8 + sourceCount * 0.2) * 100) / 100;
  }
}
```

### **Phase 3: API Endpoints**

```javascript
const express = require('express');
const router = express.Router();

// Initialize services
const vectorStore = new SupabaseVectorStore();
const responseGenerator = new GeminiResponseGenerator();

// Chat query endpoint
router.post('/query', async (req, res) => {
  try {
    const { message, conversationId, userId } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // Search for relevant documents
    const relevantDocs = await vectorStore.similaritySearch(message, {
      matchCount: 5,
      matchThreshold: 0.6
    });
    
    if (relevantDocs.length === 0) {
      return res.json({
        success: true,
        response: "I couldn't find specific information about that in the ColdCaller documentation. Could you rephrase your question or try asking about features like Twilio setup, lead management, or call analytics?",
        sources: [],
        conversationId: conversationId || generateConversationId(),
        confidence: 0
      });
    }
    
    // Generate response using Gemini
    const aiResponse = await responseGenerator.generateResponse(message, relevantDocs);
    
    // Store conversation
    if (conversationId) {
      await storeConversationMessage(conversationId, userId, message, aiResponse);
    }
    
    res.json({
      success: true,
      response: aiResponse.text,
      sources: aiResponse.sources,
      conversationId: conversationId || generateConversationId(),
      confidence: aiResponse.confidence
    });
    
  } catch (error) {
    console.error('Chat query error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Document indexing endpoint (for admin use)
router.post('/index-documents', async (req, res) => {
  try {
    const documentProcessor = new DocumentationProcessor();
    
    // Process all documentation files
    const documents = await documentProcessor.processAllDocuments();
    
    // Add to vector store
    const results = await vectorStore.batchAddDocuments(documents);
    
    res.json({
      success: true,
      message: `Indexed ${results.length} documents`,
      results
    });
  } catch (error) {
    console.error('Indexing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to index documents'
    });
  }
});

async function storeConversationMessage(conversationId, userId, userMessage, aiResponse) {
  const { data: conversation } = await supabase
    .from('chatbot_conversations')
    .select('messages')
    .eq('session_id', conversationId)
    .single();
  
  const messages = conversation?.messages || [];
  messages.push(
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { 
      role: 'assistant', 
      content: aiResponse.text, 
      sources: aiResponse.sources,
      confidence: aiResponse.confidence,
      timestamp: new Date().toISOString() 
    }
  );
  
  await supabase
    .from('chatbot_conversations')
    .upsert({
      session_id: conversationId,
      user_id: userId,
      messages,
      updated_at: new Date().toISOString()
    });
}

module.exports = router;
```

---

## 🎨 **Updated Frontend Implementation**

### **Floating Chat Component with Supabase Integration**

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState({ width: 380, height: 500 });
  
  const supabase = useSupabaseClient();
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    
    // Add user message to UI
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage, 
      timestamp: Date.now() 
    }]);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await fetch('/api/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          userId: user?.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConversationId(result.conversationId);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.response,
          sources: result.sources,
          confidence: result.confidence,
          timestamp: Date.now()
        }]);
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const quickActions = [
    { label: "Getting Started", query: "How do I get started with ColdCaller?" },
    { label: "Twilio Setup", query: "How do I set up Twilio integration?" },
    { label: "Making Calls", query: "How do I make calls using the dashboard?" },
    { label: "Lead Management", query: "How do I manage leads effectively?" }
  ];
  
  return (
    <div 
      className="fixed z-[9999]" 
      style={{ right: position.x, bottom: position.y }}
    >
      {/* Floating Chat Icon */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${isOpen ? 'scale-95' : 'scale-100 hover:scale-110'}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </motion.button>
      
      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
            style={{ width: size.width, height: size.height }}
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">ColdCaller Assistant</h3>
                <p className="text-blue-100 text-sm">Powered by Gemini AI</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-blue-100 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-80">
              {messages.length === 0 && (
                <div className="text-center text-gray-500">
                  <p>👋 Hi! I'm here to help you with ColdCaller.</p>
                  <p className="text-sm mt-2">Try one of the quick actions below or ask me anything!</p>
                </div>
              )}
              
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : message.error 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs text-gray-600 mb-1">Sources:</p>
                        {message.sources.map((source, idx) => (
                          <p key={idx} className="text-xs text-blue-600 truncate">
                            📄 {source.title}
                          </p>
                        ))}
                      </div>
                    )}
                    {message.confidence !== undefined && (
                      <p className="text-xs mt-1 opacity-70">
                        Confidence: {Math.round(message.confidence * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Quick Actions */}
            {messages.length === 0 && (
              <div className="px-4 py-2 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputValue(action.query);
                        sendMessage();
                      }}
                      className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded border transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Input Area */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask me anything about ColdCaller..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingChatbot;
```

---

## ⚙️ **Environment Configuration**

### **Environment Variables**
```bash
# Google AI Configuration
GOOGLE_AI_API_KEY=your-google-ai-api-key
GOOGLE_AI_MODEL=gemini-1.5-pro-latest
GOOGLE_AI_EMBEDDING_MODEL=text-embedding-004

# Supabase Configuration (you already have these)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Chat Settings
CHAT_MAX_CONTEXT_LENGTH=4000
CHAT_MAX_RESPONSE_LENGTH=500
CHAT_SIMILARITY_THRESHOLD=0.7
CHAT_MAX_SOURCES=3
```

### **Package Dependencies**
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.7.1",
    "@supabase/supabase-js": "^2.38.5",
    "framer-motion": "^10.16.16"
  }
}
```

---

## 💰 **Updated Cost Analysis**

### **Monthly Operating Costs (Major Savings!)**
- **Google AI API**: ~$20-40/month (much cheaper than OpenAI)
- **Supabase**: $0-25/month (free tier up to 500MB, then $25/month)
- **Additional Compute**: ~$10/month
- **Total**: ~$30-75/month (**60% cost reduction!**)

### **Why This Stack is Better:**
1. **Cost Efficiency**: Google AI pricing is significantly lower than OpenAI
2. **Existing Infrastructure**: You're already using Supabase
3. **Unified Database**: Vector storage in the same database as your app data
4. **Better Performance**: Lower latency with Supabase's global edge network
5. **Simplified Architecture**: One less service to manage and monitor

---

## 🚀 **Next Steps**

1. **Enable pgvector** in your Supabase project
2. **Set up Google AI API** key
3. **Run the database migrations** to create the chatbot tables
4. **Index your documentation** using the document processor
5. **Deploy the chat API** endpoints
6. **Integrate the floating chat component** into your React app

The updated specification leverages your existing Supabase infrastructure while providing cost-effective AI capabilities through Google Gemini. This approach will save you money while giving you more control over your data and better integration with your existing system.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "update-vector-db-spec", "content": "Update specification to use Supabase vector database", "status": "completed", "priority": "high"}, {"id": "update-embedding-model", "content": "Update specification to use Google Gemini embeddings", "status": "completed", "priority": "high"}, {"id": "research-supabase-vector", "content": "Research Supabase vector capabilities and implementation", "status": "completed", "priority": "medium"}, {"id": "research-gemini-embeddings", "content": "Research Google Gemini embedding API and capabilities", "status": "completed", "priority": "medium"}, {"id": "update-cost-estimates", "content": "Update cost estimates for Supabase + Gemini stack", "status": "completed", "priority": "medium"}, {"id": "create-updated-spec", "content": "Create comprehensive updated specification document", "status": "completed", "priority": "high"}, {"id": "provide-implementation-guidance", "content": "Provide step-by-step implementation guidance", "status": "completed", "priority": "medium"}]