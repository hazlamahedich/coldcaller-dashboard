#!/usr/bin/env node

/**
 * Test script for RAG Chatbot implementation
 * Tests all core services without requiring environment setup
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DocumentProcessor = require('../services/documentProcessor');
const { 
  cosineSimilarity, 
  validateEmbedding, 
  calculateEmbeddingStats,
  batchProcessEmbeddings 
} = require('../utils/embeddingUtils');
const logger = require('../utils/logger');

async function testDocumentProcessor() {
  console.log('\n🔍 Testing Document Processor...');
  
  try {
    const processor = new DocumentProcessor();
    
    // Test processing statistics
    const stats = await processor.getProcessingStats();
    console.log(`📊 Processing Stats:`, {
      totalFiles: stats.totalFiles,
      supportedFiles: stats.supportedFiles,
      totalSize: Math.round(stats.totalSize / 1024) + ' KB'
    });

    // Test processing a specific document if it exists
    const testDocPath = path.join(__dirname, '../../../README.md');
    try {
      const documents = await processor.processDocument(testDocPath, {
        source: 'test',
        intent: 'explanation'
      });
      console.log(`✅ Successfully processed README.md into ${documents.length} chunks`);
      
      if (documents.length > 0) {
        console.log(`📄 First chunk preview:`, {
          title: documents[0].title,
          contentLength: documents[0].content.length,
          tags: documents[0].tags,
          topics: documents[0].topics
        });
      }
    } catch (docError) {
      console.log('ℹ️  README.md not found, skipping document test');
    }

    return true;
  } catch (error) {
    console.error('❌ Document Processor test failed:', error.message);
    return false;
  }
}

function testEmbeddingUtils() {
  console.log('\n🔢 Testing Embedding Utilities...');
  
  try {
    // Test vectors
    const vectorA = new Array(768).fill(0).map(() => Math.random() - 0.5);
    const vectorB = new Array(768).fill(0).map(() => Math.random() - 0.5);
    const vectorC = vectorA.map(v => v + (Math.random() - 0.5) * 0.1); // Similar to A

    // Test cosine similarity
    const simAB = cosineSimilarity(vectorA, vectorB);
    const simAC = cosineSimilarity(vectorA, vectorC);
    
    console.log(`📊 Similarity Tests:`);
    console.log(`  Random vectors A-B: ${simAB.toFixed(3)}`);
    console.log(`  Similar vectors A-C: ${simAC.toFixed(3)}`);
    console.log(`  ✅ Similar vectors should be more similar: ${simAC > simAB ? 'PASS' : 'FAIL'}`);

    // Test validation
    const validVector = new Array(768).fill(0.5);
    const invalidVector = new Array(512).fill(0.5);
    
    console.log(`🔍 Validation Tests:`);
    console.log(`  Valid 768-dim vector: ${validateEmbedding(validVector) ? 'PASS' : 'FAIL'}`);
    console.log(`  Invalid 512-dim vector: ${!validateEmbedding(invalidVector) ? 'PASS' : 'FAIL'}`);

    // Test statistics
    const vectors = [vectorA, vectorB, vectorC];
    const stats = calculateEmbeddingStats(vectors);
    console.log(`📈 Statistics:`, {
      count: stats.count,
      dimension: stats.dimension,
      totalMagnitude: stats.totalMagnitude.toFixed(3)
    });

    return true;
  } catch (error) {
    console.error('❌ Embedding Utils test failed:', error.message);
    return false;
  }
}

async function testServiceInitialization() {
  console.log('\n🚀 Testing Service Initialization...');
  
  // Test without environment variables (should handle gracefully)
  const hasGoogleAI = !!process.env.GOOGLE_AI_API_KEY;
  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
  
  console.log(`🔑 Configuration Status:`);
  console.log(`  Google AI API Key: ${hasGoogleAI ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Supabase Config: ${hasSupabase ? '✅ Set' : '❌ Missing'}`);
  
  if (!hasGoogleAI || !hasSupabase) {
    console.log(`ℹ️  Skipping service tests - missing required environment variables`);
    console.log(`   Add GOOGLE_AI_API_KEY, SUPABASE_URL, and SUPABASE_SERVICE_KEY to .env file`);
    return false;
  }

  try {
    // Only test if environment is set up
    const SupabaseVectorStore = require('../services/supabaseVectorStore');
    const GeminiResponseGenerator = require('../services/geminiResponseGenerator');

    console.log('🔄 Testing service instantiation...');
    const vectorStore = new SupabaseVectorStore();
    const responseGenerator = new GeminiResponseGenerator();
    
    console.log('✅ Services instantiated successfully');
    
    // Test health checks
    try {
      const vectorHealth = await vectorStore.getHealth();
      console.log(`🏥 Vector Store Health: ${vectorHealth.status}`);
    } catch (healthError) {
      console.log(`⚠️  Vector Store Health Check Failed: ${healthError.message}`);
    }

    try {
      const genHealth = await responseGenerator.getHealth();
      console.log(`🏥 Response Generator Health: ${genHealth.status}`);
    } catch (healthError) {
      console.log(`⚠️  Response Generator Health Check Failed: ${healthError.message}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Service initialization test failed:', error.message);
    return false;
  }
}

async function testBatchProcessing() {
  console.log('\n⚡ Testing Batch Processing...');
  
  try {
    // Mock batch processing
    const items = Array.from({ length: 25 }, (_, i) => `item-${i}`);
    
    const mockProcessor = async (item) => {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 10));
      return { processed: item, timestamp: Date.now() };
    };

    const startTime = Date.now();
    const result = await batchProcessEmbeddings(items, mockProcessor, {
      batchSize: 5,
      delayBetweenBatches: 50,
      maxRetries: 1
    });

    const duration = Date.now() - startTime;
    
    console.log(`📊 Batch Processing Results:`);
    console.log(`  Processed: ${result.results.length}/${items.length} items`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Rate: ${(result.results.length / duration * 1000).toFixed(1)} items/sec`);

    return result.results.length === items.length;
  } catch (error) {
    console.error('❌ Batch processing test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 RAG Chatbot Implementation Test Suite');
  console.log('='.repeat(50));
  
  const tests = [
    { name: 'Document Processor', test: testDocumentProcessor },
    { name: 'Embedding Utils', test: testEmbeddingUtils },
    { name: 'Batch Processing', test: testBatchProcessing },
    { name: 'Service Initialization', test: testServiceInitialization }
  ];

  const results = [];
  
  for (const { name, test } of tests) {
    console.log(`\n🧪 Running ${name} tests...`);
    const startTime = Date.now();
    
    try {
      const passed = await test();
      const duration = Date.now() - startTime;
      results.push({ name, passed, duration });
      
      console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      results.push({ name, passed: false, duration, error: error.message });
      console.log(`❌ ${name}: FAILED (${duration}ms) - ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });

  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${(passed/total*100).toFixed(0)}%)`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! RAG Chatbot implementation is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above for details.');
  }

  return passed === total;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };