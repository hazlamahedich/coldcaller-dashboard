#!/usr/bin/env node

/**
 * Test Script for Documentation Processing System
 * 
 * Tests all components of the documentation processing pipeline
 * without requiring API keys or database connections
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;

// Import our processing utilities
const DocumentParser = require('../src/utils/documentParser');
const ContentChunker = require('../src/utils/contentChunker');
const MetadataExtractor = require('../src/utils/metadataExtractor');

class DocumentProcessingTester {
  constructor() {
    this.documentParser = new DocumentParser();
    this.contentChunker = new ContentChunker({
      maxChunkSize: 800, // Smaller for testing
      minChunkSize: 400,
      chunkOverlap: 80
    });
    this.metadataExtractor = new MetadataExtractor();
    this.projectRoot = path.resolve(__dirname, '../..');
    this.testResults = {
      parser: { passed: 0, failed: 0, tests: [] },
      chunker: { passed: 0, failed: 0, tests: [] },
      metadata: { passed: 0, failed: 0, tests: [] }
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting Documentation Processing Tests...\n');

    try {
      // Test Document Parser
      console.log('📄 Testing Document Parser...');
      await this.testDocumentParser();
      
      // Test Content Chunker
      console.log('\n✂️ Testing Content Chunker...');
      await this.testContentChunker();
      
      // Test Metadata Extractor
      console.log('\n🏷️ Testing Metadata Extractor...');
      await this.testMetadataExtractor();
      
      // Integration Test
      console.log('\n🔗 Running Integration Test...');
      await this.testFullPipeline();

      // Print Results
      this.printResults();

    } catch (error) {
      console.error('💥 Test suite failed:', error);
    }
  }

  /**
   * Test the Document Parser
   */
  async testDocumentParser() {
    // Test 1: Parse a real documentation file
    try {
      const readmePath = path.join(this.projectRoot, 'README.md');
      const document = await this.documentParser.parseDocument(readmePath);
      
      this.assert(document.title, 'Document should have a title', 'parser');
      this.assert(document.sections.length > 0, 'Document should have sections', 'parser');
      this.assert(document.metadata, 'Document should have metadata', 'parser');
      this.assert(document.contentType, 'Document should have content type', 'parser');
      
      console.log(`  ✅ Parsed README.md: ${document.sections.length} sections, type: ${document.contentType}`);
    } catch (error) {
      this.recordFailure('parser', `Failed to parse README.md: ${error.message}`);
    }

    // Test 2: Parse API documentation
    try {
      const apiDocPath = path.join(this.projectRoot, 'docs/API_DOCUMENTATION_ENHANCED.md');
      const document = await this.documentParser.parseDocument(apiDocPath);
      
      this.assert(document.contentType === 'api-documentation', 'Should detect API documentation', 'parser');
      this.assert(document.tags.includes('api'), 'Should have api tag', 'parser');
      
      console.log(`  ✅ Parsed API docs: ${document.sections.length} sections, detected as ${document.contentType}`);
    } catch (error) {
      this.recordFailure('parser', `Failed to parse API docs: ${error.message}`);
    }

    // Test 3: Section parsing
    const testMarkdown = `
# Main Title

This is the introduction paragraph.

## Getting Started

Here's how to get started:

1. Install dependencies
2. Configure settings
3. Run the application

### Prerequisites

You need these things:
- Node.js
- npm
- Git

## API Reference

### Authentication

Use JWT tokens for authentication.

\`\`\`javascript
const token = jwt.sign(payload, secret);
\`\`\`

## Troubleshooting

If you encounter errors:

- Check your configuration
- Verify dependencies
- Review logs
`;

    try {
      const testPath = path.join(__dirname, 'test-doc.md');
      await fs.writeFile(testPath, testMarkdown);
      
      const document = await this.documentParser.parseDocument(testPath);
      
      this.assert(document.sections.length >= 5, 'Should parse all sections', 'parser');
      this.assert(document.intent === 'how-to', 'Should detect how-to intent', 'parser');
      
      // Cleanup
      await fs.unlink(testPath);
      
      console.log(`  ✅ Section parsing test passed: ${document.sections.length} sections`);
    } catch (error) {
      this.recordFailure('parser', `Section parsing test failed: ${error.message}`);
    }
  }

  /**
   * Test the Content Chunker
   */
  async testContentChunker() {
    // Create test document
    const testDocument = {
      title: 'Test Document',
      source: 'test.md',
      contentType: 'documentation',
      metadata: { wordCount: 500 },
      sections: [
        {
          title: 'Introduction',
          content: 'This is a long introduction section that should be chunked appropriately. '.repeat(30),
          type: 'main-section',
          level: 1
        },
        {
          title: 'Setup Guide',
          content: 'Here is the setup guide with detailed steps. '.repeat(50),
          type: 'installation',
          level: 2
        },
        {
          title: 'API Reference',
          content: 'API documentation with code examples and parameters. '.repeat(40),
          type: 'api',
          level: 2
        }
      ],
      rawContent: 'Complete document content here...'
    };

    try {
      const chunks = this.contentChunker.chunkDocument(testDocument);
      
      this.assert(chunks.length > 0, 'Should create chunks', 'chunker');
      this.assert(chunks.every(c => c.content.length >= 100), 'All chunks should have reasonable length', 'chunker');
      this.assert(chunks.every(c => c.chunkId), 'All chunks should have IDs', 'chunker');
      this.assert(chunks.every(c => c.source === testDocument.source), 'All chunks should preserve source', 'chunker');
      
      console.log(`  ✅ Chunking test passed: ${chunks.length} chunks created`);
      
      // Test chunk quality
      chunks.forEach((chunk, i) => {
        const validation = this.contentChunker.validateChunk(chunk);
        console.log(`    📊 Chunk ${i + 1}: quality=${validation.quality}, score=${validation.score.toFixed(2)}`);
      });
      
    } catch (error) {
      this.recordFailure('chunker', `Chunking test failed: ${error.message}`);
    }

    // Test with real document
    try {
      const readmePath = path.join(this.projectRoot, 'README.md');
      const document = await this.documentParser.parseDocument(readmePath);
      const chunks = this.contentChunker.chunkDocument(document);
      
      this.assert(chunks.length > 0, 'Should chunk real document', 'chunker');
      console.log(`  ✅ Real document chunking: ${chunks.length} chunks from README.md`);
      
    } catch (error) {
      this.recordFailure('chunker', `Real document chunking failed: ${error.message}`);
    }
  }

  /**
   * Test the Metadata Extractor
   */
  async testMetadataExtractor() {
    // Create test chunk
    const testChunk = {
      content: `
# How to Set Up Authentication

This guide explains how to configure JWT authentication in your application.

## Prerequisites

Before starting, ensure you have:
- Node.js installed
- A database configured
- Environment variables set up

## Installation Steps

1. Install the required packages:

\`\`\`bash
npm install jsonwebtoken bcrypt
\`\`\`

2. Configure your environment:

\`\`\`javascript
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
\`\`\`

3. Implement authentication middleware

## Troubleshooting

If you encounter errors with token validation:
- Check your secret key
- Verify token expiration
- Review CORS settings
      `,
      source: 'auth-guide.md',
      title: 'Authentication Setup',
      section: 'Setup Guide'
    };

    const testDocument = {
      title: 'Authentication Guide',
      contentType: 'setup-guide',
      tags: ['authentication', 'security', 'nodejs'],
      metadata: { fileSize: 1500, wordCount: 200 }
    };

    try {
      const metadata = this.metadataExtractor.extractChunkMetadata(testChunk, testDocument);
      
      // Test intent detection
      this.assert(metadata.intent === 'how-to', 'Should detect how-to intent', 'metadata');
      
      // Test topic extraction
      this.assert(metadata.primaryTopic === 'authentication', 'Should detect authentication topic', 'metadata');
      this.assert(metadata.topics.includes('authentication'), 'Should include authentication in topics', 'metadata');
      
      // Test complexity assessment
      this.assert(metadata.complexity, 'Should assess complexity', 'metadata');
      
      // Test actionability
      this.assert(metadata.actionability > 0.5, 'Should detect high actionability', 'metadata');
      
      // Test code detection
      this.assert(metadata.hasCodeExamples, 'Should detect code examples', 'metadata');
      
      console.log(`  ✅ Metadata extraction passed:`);
      console.log(`    🎯 Intent: ${metadata.intent}`);
      console.log(`    📋 Primary topic: ${metadata.primaryTopic}`);
      console.log(`    🔢 Complexity: ${metadata.complexity}`);
      console.log(`    ⚡ Actionability: ${metadata.actionability.toFixed(2)}`);
      console.log(`    📊 Quality score: ${metadata.qualityScore.toFixed(2)}`);
      
    } catch (error) {
      this.recordFailure('metadata', `Metadata extraction failed: ${error.message}`);
    }

    // Test with different content types
    const troubleshootingChunk = {
      content: `
# Fixing Common Errors

## Error: Connection Refused

This error occurs when the database connection fails.

**Solution:**
1. Check database connection string
2. Verify database is running
3. Check firewall settings

## Error: Authentication Failed

Invalid credentials or expired tokens.

**Solution:**
- Verify API key
- Check token expiration
- Review user permissions
      `,
      source: 'troubleshooting.md',
      title: 'Error Solutions',
      section: 'Common Problems'
    };

    try {
      const troubleshootingMetadata = this.metadataExtractor.extractChunkMetadata(
        troubleshootingChunk, 
        { ...testDocument, contentType: 'troubleshooting' }
      );
      
      this.assert(troubleshootingMetadata.intent === 'troubleshooting', 'Should detect troubleshooting intent', 'metadata');
      console.log(`  ✅ Troubleshooting content detected: intent=${troubleshootingMetadata.intent}`);
      
    } catch (error) {
      this.recordFailure('metadata', `Troubleshooting metadata test failed: ${error.message}`);
    }
  }

  /**
   * Test the full pipeline integration
   */
  async testFullPipeline() {
    try {
      // Use a real documentation file
      const startGuidePath = path.join(this.projectRoot, 'START_GUIDE.md');
      
      console.log('  📄 Processing START_GUIDE.md through full pipeline...');
      
      // Step 1: Parse document
      const document = await this.documentParser.parseDocument(startGuidePath);
      console.log(`    ✅ Parsed: ${document.sections.length} sections`);
      
      // Step 2: Chunk document
      const chunks = this.contentChunker.chunkDocument(document);
      console.log(`    ✅ Chunked: ${chunks.length} chunks`);
      
      // Step 3: Extract metadata for each chunk
      const processedChunks = chunks.map(chunk => {
        return this.metadataExtractor.extractChunkMetadata(chunk, document);
      });
      console.log(`    ✅ Metadata extracted for all chunks`);
      
      // Initialize integration test results if not exists
      if (!this.testResults.integration) {
        this.testResults.integration = { passed: 0, failed: 0, tests: [] };
      }

      // Validate final output structure
      processedChunks.forEach((chunk, i) => {
        this.assert(chunk.content, `Chunk ${i} should have content`, 'integration');
        this.assert(chunk.intent, `Chunk ${i} should have intent`, 'integration');
        this.assert(chunk.primaryTopic, `Chunk ${i} should have primary topic`, 'integration');
        this.assert(typeof chunk.qualityScore === 'number', `Chunk ${i} should have quality score`, 'integration');
      });
      
      // Show sample results
      console.log('\n    📊 Sample Processing Results:');
      processedChunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`    Chunk ${i + 1}:`);
        console.log(`      📝 Content: ${chunk.content.substring(0, 100)}...`);
        console.log(`      🎯 Intent: ${chunk.intent}`);
        console.log(`      📋 Topic: ${chunk.primaryTopic}`);
        console.log(`      ⭐ Quality: ${chunk.qualityScore.toFixed(2)}`);
        console.log(`      📖 Words: ${chunk.wordCount}`);
        console.log('');
      });
      
      console.log('  ✅ Full pipeline integration test passed!');
      
    } catch (error) {
      this.recordFailure('integration', `Full pipeline test failed: ${error.message}`);
    }
  }

  /**
   * Test helper to assert conditions
   */
  assert(condition, message, category) {
    if (condition) {
      this.testResults[category].passed++;
      this.testResults[category].tests.push({ status: 'PASS', message });
    } else {
      this.testResults[category].failed++;
      this.testResults[category].tests.push({ status: 'FAIL', message });
      console.log(`    ❌ ASSERTION FAILED: ${message}`);
    }
  }

  /**
   * Record a test failure
   */
  recordFailure(category, message) {
    if (!this.testResults[category]) {
      this.testResults[category] = { passed: 0, failed: 0, tests: [] };
    }
    this.testResults[category].failed++;
    this.testResults[category].tests.push({ status: 'FAIL', message });
    console.log(`    ❌ ${message}`);
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    Object.entries(this.testResults).forEach(([category, results]) => {
      const total = results.passed + results.failed;
      const percentage = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
      
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  ✅ Passed: ${results.passed}`);
      console.log(`  ❌ Failed: ${results.failed}`);
      console.log(`  📈 Success Rate: ${percentage}%`);
      
      totalPassed += results.passed;
      totalFailed += results.failed;
    });
    
    const overallTotal = totalPassed + totalFailed;
    const overallPercentage = overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : 0;
    
    console.log('\n🏆 OVERALL RESULTS:');
    console.log(`   Total Tests: ${overallTotal}`);
    console.log(`   Passed: ${totalPassed}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Success Rate: ${overallPercentage}%`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed! The documentation processing system is ready.');
    } else {
      console.log(`\n⚠️  ${totalFailed} tests failed. Please review the errors above.`);
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Set up environment variables (GOOGLE_AI_API_KEY, SUPABASE_*)');
    console.log('   2. Run database migrations to create chatbot_documents table');
    console.log('   3. Execute: node scripts/indexDocuments.js process');
    console.log('   4. Test the indexing: node scripts/indexDocuments.js stats');
  }
}

// Run tests
async function main() {
  const tester = new DocumentProcessingTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main();
}

module.exports = DocumentProcessingTester;