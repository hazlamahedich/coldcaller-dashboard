/**
 * Chatbot Database Validation Script
 * Tests the RAG chatbot database schema and functionality
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { chatbotDatabase } = require('../services/chatbotDatabase');
const { v4: uuidv4 } = require('uuid');

// Sample test data
const sampleDocuments = [
  {
    content: "To set up Twilio integration in Cold Caller, first navigate to the Settings page and click on 'Integrations'. Then, enter your Twilio Account SID and Auth Token. Make sure to verify your phone number before making calls.",
    source: "user-guide",
    title: "Twilio Integration Setup",
    section: "Getting Started",
    intent: "how-to",
    tags: ["twilio", "setup", "integration"],
    keywords: ["twilio", "setup", "account", "phone", "calls"],
    topics: ["integration", "setup"],
    metadata: {
      category: "setup",
      difficulty: "beginner",
      last_reviewed: "2024-01-15"
    }
  },
  {
    content: "If you're experiencing call quality issues, check your internet connection first. Make sure you have at least 100 kbps upload/download speed. Also, disable any VPN connections and close bandwidth-heavy applications.",
    source: "troubleshooting-guide",
    title: "Call Quality Issues",
    section: "Troubleshooting",
    intent: "troubleshooting",
    tags: ["calls", "quality", "troubleshooting"],
    keywords: ["call", "quality", "internet", "bandwidth", "vpn"],
    topics: ["troubleshooting", "network"],
    metadata: {
      category: "troubleshooting",
      severity: "medium",
      reported_count: 15
    }
  },
  {
    content: "The Lead Management system allows you to organize contacts into different stages: New, Contacted, Qualified, Proposal, Negotiation, Closed Won, Closed Lost, and Nurturing. You can drag and drop leads between stages on the Kanban board.",
    source: "feature-documentation",
    title: "Lead Management Stages",
    section: "CRM Features",
    intent: "explanation",
    tags: ["leads", "management", "crm", "stages"],
    keywords: ["lead", "management", "stages", "kanban", "crm"],
    topics: ["crm", "lead-management"],
    metadata: {
      category: "features",
      feature_version: "2.0",
      usage_frequency: "high"
    }
  }
];

// Mock embedding function (in real implementation, this would call Gemini API)
function generateMockEmbedding() {
  return Array(768).fill(0).map(() => Math.random() * 2 - 1); // Random values between -1 and 1
}

async function runValidationTests() {
  console.log('🚀 Starting Chatbot Database Validation Tests\n');

  try {
    // Test 1: Service Initialization
    console.log('📋 Test 1: Service Initialization');
    const initResult = await chatbotDatabase.initialize();
    console.log('✅ Service initialized:', JSON.stringify(initResult, null, 2));

    // Test 2: Health Check
    console.log('\n📋 Test 2: Health Check');
    const healthStatus = await chatbotDatabase.healthCheck();
    console.log('✅ Health check result:', JSON.stringify(healthStatus, null, 2));

    // Test 3: Add Documents
    console.log('\n📋 Test 3: Adding Sample Documents');
    
    // Add embeddings to sample documents
    const documentsWithEmbeddings = sampleDocuments.map(doc => ({
      ...doc,
      embedding: generateMockEmbedding()
    }));

    const addedDocs = await chatbotDatabase.addDocuments(documentsWithEmbeddings);
    console.log(`✅ Added ${addedDocs.length} documents`);

    // Test 4: Vector Search (if supported)
    console.log('\n📋 Test 4: Vector Similarity Search');
    const queryEmbedding = generateMockEmbedding();
    const searchResults = await chatbotDatabase.searchSimilarDocuments(queryEmbedding, {
      threshold: 0.1, // Lower threshold for mock data
      limit: 3
    });
    console.log(`✅ Found ${searchResults.results.length} similar documents`);
    searchResults.results.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.title} (similarity: ${doc.similarity?.toFixed(3) || 'N/A'})`);
    });

    // Test 5: Conversation Management
    console.log('\n📋 Test 5: Conversation Management');
    
    const sessionId = `test_session_${Date.now()}`;
    const userId = uuidv4();

    // Create conversation
    const conversation = await chatbotDatabase.createConversation({
      sessionId,
      userId,
      userAgent: 'test-agent/1.0',
      ipAddress: '127.0.0.1'
    });
    console.log(`✅ Created conversation: ${conversation.session_id}`);

    // Add messages
    await chatbotDatabase.addMessageToConversation(
      sessionId,
      'user',
      'How do I set up Twilio integration?'
    );

    await chatbotDatabase.addMessageToConversation(
      sessionId,
      'assistant',
      'To set up Twilio integration in Cold Caller, first navigate to the Settings page...',
      {
        sources: [{ title: 'Twilio Integration Setup', source: 'user-guide' }],
        confidence: 0.95
      }
    );

    console.log('✅ Added messages to conversation');

    // Test 6: Search Analytics
    console.log('\n📋 Test 6: Search Analytics Recording');
    
    await chatbotDatabase.recordSearch({
      query: 'How to setup Twilio?',
      results: searchResults.results,
      responseTimeMs: searchResults.responseTime,
      userId,
      sessionId
    });
    
    console.log('✅ Recorded search analytics');

    // Test 7: Statistics
    console.log('\n📋 Test 7: Database Statistics');
    const stats = await chatbotDatabase.getStatistics();
    console.log('✅ Statistics retrieved:');
    console.log(`   Documents: ${stats.documents?.overview?.total_documents || 0} total`);
    console.log(`   Conversations: ${stats.conversations?.overview?.total_conversations || 0} total`);
    console.log(`   Analytics records: ${stats.analytics?.overview?.total_searches || 0} total`);

    // Test 8: Data Export (sample)
    console.log('\n📋 Test 8: Data Export');
    const exportData = await chatbotDatabase.exportData({
      includeDocuments: true,
      includeConversations: true,
      includeAnalytics: false
    });
    
    console.log(`✅ Export completed:`);
    console.log(`   Documents: ${exportData.documents?.length || 0}`);
    console.log(`   Conversations: ${exportData.conversations?.length || 0}`);

    // Test 9: Database Schema Validation
    console.log('\n📋 Test 9: Schema Validation');
    
    // Check if all required tables exist with proper structure
    const { sequelize } = require('../database/config/database');
    const queryInterface = sequelize.getQueryInterface();
    
    const tables = await queryInterface.showAllTables();
    const requiredTables = ['chatbot_documents', 'chatbot_conversations', 'chatbot_search_analytics'];
    
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }

    // Check document table structure
    const documentColumns = await queryInterface.describeTable('chatbot_documents');
    const requiredDocColumns = ['id', 'content', 'embedding', 'source', 'title', 'intent'];
    
    for (const col of requiredDocColumns) {
      if (!documentColumns[col]) {
        throw new Error(`Missing column ${col} in chatbot_documents table`);
      }
    }

    console.log('✅ Schema validation passed');

    // Final Summary
    console.log('\n🎉 All validation tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Database: ${initResult.database}`);
    console.log(`   ✅ Tables: ${initResult.tables.length} chatbot tables created`);
    console.log(`   ✅ Vector Support: ${initResult.vectorSupport}`);
    console.log(`   ✅ Health Status: ${healthStatus.status}`);
    console.log(`   ✅ Test Documents: ${addedDocs.length} added successfully`);
    console.log(`   ✅ Vector Search: ${searchResults.results.length} results found`);
    console.log(`   ✅ Conversations: Created and managed successfully`);
    console.log(`   ✅ Analytics: Search tracking working`);
    console.log(`   ✅ Schema: All required tables and columns present`);

  } catch (error) {
    console.error('❌ Validation test failed:', error);
    console.error('\nError details:', error.stack);
    process.exit(1);
  }
}

// Performance test
async function runPerformanceTest() {
  console.log('\n🚀 Running Performance Tests\n');

  try {
    const startTime = Date.now();
    
    // Test batch document insertion
    const batchDocs = Array(50).fill(null).map((_, idx) => ({
      content: `Test document ${idx + 1} with sample content for performance testing. This document contains information about feature ${idx + 1} of the Cold Caller application.`,
      source: 'performance-test',
      title: `Performance Test Document ${idx + 1}`,
      intent: 'reference',
      embedding: generateMockEmbedding(),
      metadata: { test: true, index: idx }
    }));

    const batchResults = await chatbotDatabase.addDocuments(batchDocs);
    const batchTime = Date.now() - startTime;
    
    console.log(`✅ Batch insert: ${batchResults.length} documents in ${batchTime}ms`);
    console.log(`   Average: ${(batchTime / batchResults.length).toFixed(2)}ms per document`);

    // Test multiple searches
    const searchStartTime = Date.now();
    const searchPromises = Array(10).fill(null).map(() => 
      chatbotDatabase.searchSimilarDocuments(generateMockEmbedding(), {
        threshold: 0.1,
        limit: 5
      })
    );
    
    const searchResults = await Promise.all(searchPromises);
    const totalSearchTime = Date.now() - searchStartTime;
    
    console.log(`✅ Multiple searches: 10 searches in ${totalSearchTime}ms`);
    console.log(`   Average: ${(totalSearchTime / 10).toFixed(2)}ms per search`);

    // Cleanup test data
    const { ChatbotDocument } = require('../services/chatbotDatabase');
    await ChatbotDocument.destroy({
      where: { source: 'performance-test' }
    });
    console.log('✅ Cleaned up performance test data');

  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const includePerformanceTest = args.includes('--performance') || args.includes('-p');

  try {
    await runValidationTests();
    
    if (includePerformanceTest) {
      await runPerformanceTest();
    }
    
    console.log('\n🎯 Validation Complete! The RAG chatbot database is ready for use.');
    console.log('\nNext steps:');
    console.log('  1. Set up Google Gemini API credentials');
    console.log('  2. Create document processor for indexing your documentation');
    console.log('  3. Implement the chat API endpoints');
    console.log('  4. Add the floating chat component to your frontend');
    console.log('  5. For production, consider migrating to PostgreSQL with pgvector');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    const { sequelize } = require('../database/config/database');
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runValidationTests,
  runPerformanceTest
};