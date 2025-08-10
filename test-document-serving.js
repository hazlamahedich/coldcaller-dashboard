#!/usr/bin/env node

/**
 * Document Serving Test Suite
 * Tests the specific documents mentioned in the user's chatbot interface
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3001';

// Test configuration
const TESTS = [
  {
    name: 'List All Available Documents',
    method: 'GET',
    url: '/api/documents',
    expectedStatus: 200,
    validate: (data) => {
      return data.success && Array.isArray(data.data.documents);
    }
  },
  {
    name: 'Get USER_MANUAL.md (Complete User Manual)',
    method: 'GET', 
    url: '/api/documents/USER_MANUAL.md',
    expectedStatus: 200,
    validate: (data) => {
      return typeof data === 'string' && 
             data.includes('ColdCaller Dashboard - Complete User Manual') &&
             data.includes('Sales Agent') &&
             data.includes('Greetings & Introductions');
    }
  },
  {
    name: 'Get QUICK_START_GUIDE.md (Quick Start Guide)',
    method: 'GET',
    url: '/api/documents/QUICK_START_GUIDE.md', 
    expectedStatus: 200,
    validate: (data) => {
      return typeof data === 'string' && 
             data.includes('ColdCaller Dashboard - Quick Start Guide');
    }
  },
  {
    name: 'Get User Manual Metadata',
    method: 'GET',
    url: '/api/documents/USER_MANUAL.md/metadata',
    expectedStatus: 404, // This endpoint structure doesn't exist
    validate: () => true // Just checking it doesn't crash
  },
  {
    name: 'Test Alternative URL - user-manual alias',
    method: 'GET',
    url: '/api/documents/user-manual',
    expectedStatus: 404, // Not in current document map
    validate: () => true
  },
  {
    name: 'Security Test - Path Traversal',
    method: 'GET',
    url: '/api/documents/..%2F..%2F..%2Fetc%2Fpasswd',
    expectedStatus: 403,
    validate: (data) => {
      return data.error && data.error.code === 'DOCUMENT_ACCESS_DENIED';
    }
  },
  {
    name: 'Test Non-existent Document',
    method: 'GET',
    url: '/api/documents/NON_EXISTENT.md',
    expectedStatus: 404,
    validate: (data) => {
      return data.error && data.error.code === 'DOCUMENT_NOT_FOUND';
    }
  },
  {
    name: 'Test HTML Rendering',
    method: 'GET',
    url: '/api/documents/USER_MANUAL.md?render=html',
    expectedStatus: 200,
    validate: (data) => {
      return typeof data === 'string' && 
             data.includes('<!DOCTYPE html>') &&
             data.includes('<h1>');
    }
  }
];

// Test runner
async function runTests() {
  console.log('🚀 Starting Document Serving Tests\n'.cyan.bold);
  
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of TESTS) {
    try {
      console.log(`🔍 Testing: ${test.name}`.yellow);
      
      const startTime = Date.now();
      const response = await axios({
        method: test.method,
        url: `${BASE_URL}${test.url}`,
        validateStatus: () => true, // Don't throw on non-2xx
        timeout: 5000
      });
      const duration = Date.now() - startTime;

      const statusMatch = response.status === test.expectedStatus;
      const validationPassed = test.validate ? test.validate(response.data) : true;
      
      const testPassed = statusMatch && validationPassed;
      
      if (testPassed) {
        console.log(`   ✅ PASS - ${response.status} (${duration}ms)`.green);
        passed++;
      } else {
        console.log(`   ❌ FAIL - Expected ${test.expectedStatus}, got ${response.status} (${duration}ms)`.red);
        if (!validationPassed) {
          console.log(`   📝 Validation failed for response data`.red);
        }
        failed++;
      }

      results.push({
        name: test.name,
        passed: testPassed,
        status: response.status,
        expectedStatus: test.expectedStatus,
        duration,
        dataLength: typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length
      });

    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`.red);
      failed++;
      results.push({
        name: test.name,
        passed: false,
        error: error.message
      });
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 Test Summary'.cyan.bold);
  console.log(`✅ Passed: ${passed}`.green);
  console.log(`❌ Failed: ${failed}`.red);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  // Detailed results
  console.log('\n📋 Detailed Results:'.cyan.bold);
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.status !== undefined) {
      console.log(`   Status: ${result.status} | Duration: ${result.duration}ms | Size: ${result.dataLength} chars`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`.red);
    }
  });

  // Specific checks for user's sources
  console.log('\n🎯 User Sources Verification:'.cyan.bold);
  
  const userManualResult = results.find(r => r.name.includes('USER_MANUAL.md'));
  const quickStartResult = results.find(r => r.name.includes('QUICK_START_GUIDE.md'));
  
  if (userManualResult && userManualResult.passed) {
    console.log('✅ "ColdCaller Dashboard - Complete User Manual" → ACCESSIBLE'.green);
    console.log('   → Contains "Sales Agent" section ✓');
    console.log('   → Contains "Greetings & Introductions" references ✓');
  } else {
    console.log('❌ "ColdCaller Dashboard - Complete User Manual" → NOT ACCESSIBLE'.red);
  }

  if (quickStartResult && quickStartResult.passed) {
    console.log('✅ "ColdCaller Dashboard - Quick Start Guide" → ACCESSIBLE'.green);
  } else {
    console.log('❌ "ColdCaller Dashboard - Quick Start Guide" → NOT ACCESSIBLE'.red);
  }

  console.log('\n🔗 Recommended Frontend URLs:'.cyan.bold);
  console.log(`📄 User Manual: ${BASE_URL}/api/documents/USER_MANUAL.md`.blue);
  console.log(`📄 Quick Start: ${BASE_URL}/api/documents/QUICK_START_GUIDE.md`.blue);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nTest interrupted by user'.yellow);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTests };