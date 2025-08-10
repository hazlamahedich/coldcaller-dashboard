#!/usr/bin/env node

/**
 * Direct RAG Test Script
 * Tests the RAG functionality directly using the services
 */

require('dotenv').config();
const SupabaseVectorStore = require('./src/services/supabaseVectorStore');
const GeminiResponseGenerator = require('./src/services/geminiResponseGenerator');

async function testRAGSystem() {
  console.log('🧪 Testing RAG System Directly...\n');

  try {
    // Initialize services
    console.log('🔧 Initializing services...');
    const vectorStore = new SupabaseVectorStore();
    const responseGenerator = new GeminiResponseGenerator();

    // Test question
    const query = "What is ColdCaller and how does it work with Twilio?";
    console.log(`❓ Question: "${query}"\n`);

    // 1. Test vector search
    console.log('🔍 Step 1: Searching for relevant documents...');
    await vectorStore.ensureInitialized();
    const searchResults = await vectorStore.similaritySearch(query, { limit: 3 });
    
    console.log(`📚 Found ${searchResults.length} relevant document chunks:`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.title} (similarity: ${result.similarity.toFixed(3)})`);
      console.log(`      Source: ${result.source}`);
      console.log(`      Preview: ${result.content.substring(0, 100)}...\n`);
    });

    // 2. Test response generation
    console.log('🤖 Step 2: Generating AI response...');
    await responseGenerator.ensureInitialized();
    
    const contextDocuments = searchResults.map(result => ({
      content: result.content,
      title: result.title,
      source: result.source,
      section: result.section,
      similarity: result.similarity
    }));
    const response = await responseGenerator.generateResponse(query, contextDocuments, 'test-conversation');

    console.log('✨ AI Response:');
    console.log('─'.repeat(60));
    console.log(response.response);
    console.log('─'.repeat(60));
    console.log(`🎯 Confidence: ${response.confidence}`);
    console.log(`📖 Sources used: ${response.sources.length}`);
    
    response.sources.forEach((source, index) => {
      console.log(`   ${index + 1}. ${source.title} (${source.section})`);
    });

    console.log('\n🎉 RAG System Test: SUCCESSFUL!');
    
  } catch (error) {
    console.error('❌ RAG System Test Failed:', error.message);
    console.error('Details:', error);
  }
}

testRAGSystem();