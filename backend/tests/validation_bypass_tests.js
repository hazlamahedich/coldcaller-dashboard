/**
 * Validation Pattern Testing - Bypass Authentication
 * Creates valid JWT tokens to test the actual validation middleware
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const baseURL = 'http://localhost:5000/api';

// JWT configuration from auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-in-production';

// Test configuration
const API_ENDPOINT = `${baseURL}/calls/start`;
const TEST_RESULTS = {
  validationTests: [],
  securityBlocks: [],
  errors: []
};

/**
 * Generate a valid JWT token for testing
 */
function generateTestToken() {
  const payload = {
    id: 1,
    email: 'test@example.com',
    role: 'agent',
    permissions: ['call:create', 'call:read', 'call:update']
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h',
    issuer: 'coldcaller-api',
    subject: '1'
  });
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest(testName, payload) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));
  
  try {
    const token = generateTestToken();
    
    const response = await axios.post(API_ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Validation-Test/1.0'
      },
      validateStatus: () => true // Accept all status codes
    });
    
    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📥 Response Data:`, JSON.stringify(response.data, null, 2));
    
    const result = {
      testName,
      payload,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      success: response.status < 400
    };
    
    // Categorize results
    if (response.status === 400 && response.data?.error?.code === 'SECURITY_VIOLATION') {
      TEST_RESULTS.securityBlocks.push(result);
      console.log(`🛡️  Security block detected`);
    } else {
      TEST_RESULTS.validationTests.push(result);
    }
    
    return result;
    
  } catch (error) {
    const errorResult = {
      testName,
      payload,
      error: error.message,
      code: error.code
    };
    
    TEST_RESULTS.errors.push(errorResult);
    console.log(`💥 Error:`, error.message);
    
    return errorResult;
  }
}

/**
 * Test valid phone number formats
 */
async function testValidPhoneFormats() {
  console.log('\n🔍 === VALID PHONE FORMAT TESTS ===');
  
  const validPhoneTests = [
    { name: 'US E.164 format', phone: '+15551234567' },
    { name: 'US with parentheses', phone: '(555) 123-4567' },
    { name: 'US with dashes', phone: '555-123-4567' },
    { name: 'US with spaces', phone: '555 123 4567' },
    { name: 'US with dots', phone: '555.123.4567' },
    { name: 'International UK', phone: '+44 20 7946 0958' },
    { name: 'International Germany', phone: '+49 30 12345678' },
    { name: 'International China', phone: '+86 138 0013 8000' }
  ];
  
  for (const test of validPhoneTests) {
    await makeAuthenticatedRequest(test.name, {
      phoneNumber: test.phone,
      agentId: 'test-agent'
    });
  }
}

/**
 * Test phone number edge cases that should fail validation
 */
async function testInvalidPhoneFormats() {
  console.log('\n🔍 === INVALID PHONE FORMAT TESTS ===');
  
  const invalidPhoneTests = [
    { name: 'Empty phone number', phone: '' },
    { name: 'Phone too short', phone: '123' },
    { name: 'Phone too long', phone: '+123456789012345678901234567890' },
    { name: 'Only plus sign', phone: '+' },
    { name: 'Invalid characters', phone: '+1-555-abc-defg' },
    { name: 'Starting with zero after plus', phone: '+0555123456' },
    { name: 'No digits', phone: '+abc-def-ghij' }
  ];
  
  for (const test of invalidPhoneTests) {
    await makeAuthenticatedRequest(test.name, {
      phoneNumber: test.phone,
      agentId: 'test-agent'
    });
  }
}

/**
 * Test SQL injection patterns in phone numbers
 */
async function testPhoneNumberSQLInjection() {
  console.log('\n🔍 === PHONE NUMBER SQL INJECTION TESTS ===');
  
  const sqlInjectionTests = [
    { name: 'SQL in phone - quotes', phone: '+1555123\'4567' },
    { name: 'SQL in phone - semicolon', phone: '+1555123;4567' },
    { name: 'SQL in phone - DROP TABLE', phone: '+1555\'; DROP TABLE calls; --' },
    { name: 'SQL in phone - UNION SELECT', phone: '+1555 UNION SELECT 1,2,3' },
    { name: 'SQL in phone - OR 1=1', phone: '+1555\' OR 1=1 --' }
  ];
  
  for (const test of sqlInjectionTests) {
    await makeAuthenticatedRequest(test.name, {
      phoneNumber: test.phone,
      agentId: 'test-agent'
    });
  }
}

/**
 * Test SQL injection patterns in other fields
 */
async function testFieldSQLInjection() {
  console.log('\n🔍 === FIELD SQL INJECTION TESTS ===');
  
  const fieldInjectionTests = [
    { name: 'SQL in agentId - SELECT', payload: { phoneNumber: '+15551234567', agentId: 'SELECT * FROM users' } },
    { name: 'SQL in agentId - INSERT', payload: { phoneNumber: '+15551234567', agentId: 'INSERT INTO users' } },
    { name: 'SQL in agentId - UPDATE', payload: { phoneNumber: '+15551234567', agentId: 'UPDATE users SET' } },
    { name: 'SQL in agentId - DELETE', payload: { phoneNumber: '+15551234567', agentId: 'DELETE FROM users' } },
    { name: 'SQL in agentId - DROP', payload: { phoneNumber: '+15551234567', agentId: 'DROP TABLE users' } },
    { name: 'SQL in agentId - UNION', payload: { phoneNumber: '+15551234567', agentId: 'UNION SELECT 1,2' } },
    { name: 'SQL in agentId - OR 1=1', payload: { phoneNumber: '+15551234567', agentId: 'agent\' OR 1=1 --' } },
    { name: 'SQL in agentId - AND 1=1', payload: { phoneNumber: '+15551234567', agentId: 'agent\' AND 1=1 --' } },
    { name: 'SQL in agentId - quotes', payload: { phoneNumber: '+15551234567', agentId: 'agent\'\'\'' } },
    { name: 'SQL in agentId - semicolon', payload: { phoneNumber: '+15551234567', agentId: 'agent; DROP TABLE users' } },
    { name: 'SQL in agentId - pipe', payload: { phoneNumber: '+15551234567', agentId: 'agent|test' } },
    { name: 'SQL in agentId - ampersand', payload: { phoneNumber: '+15551234567', agentId: 'agent&test' } },
    { name: 'SQL in agentId - dollar', payload: { phoneNumber: '+15551234567', agentId: 'agent$test' } },
    { name: 'SQL in agentId - comment', payload: { phoneNumber: '+15551234567', agentId: 'agent-- comment' } },
    { name: 'SQL in agentId - SLEEP', payload: { phoneNumber: '+15551234567', agentId: 'SLEEP(5)' } },
    { name: 'SQL in agentId - BENCHMARK', payload: { phoneNumber: '+15551234567', agentId: 'BENCHMARK(1000000,1)' } }
  ];
  
  for (const test of fieldInjectionTests) {
    await makeAuthenticatedRequest(test.name, test.payload);
  }
}

/**
 * Test XSS patterns
 */
async function testXSSPatterns() {
  console.log('\n🔍 === XSS PATTERN TESTS ===');
  
  const xssTests = [
    { name: 'Script tag in agentId', payload: { phoneNumber: '+15551234567', agentId: '<script>alert("xss")</script>' } },
    { name: 'JavaScript protocol', payload: { phoneNumber: '+15551234567', agentId: 'javascript:alert("xss")' } },
    { name: 'Iframe tag', payload: { phoneNumber: '+15551234567', agentId: '<iframe src="evil.com"></iframe>' } },
    { name: 'On event handler', payload: { phoneNumber: '+15551234567', agentId: '<img onload="alert(1)">' } },
    { name: 'Data URI', payload: { phoneNumber: '+15551234567', agentId: 'data:text/html,<script>alert(1)</script>' } }
  ];
  
  for (const test of xssTests) {
    await makeAuthenticatedRequest(test.name, test.payload);
  }
}

/**
 * Test input size limits
 */
async function testInputSizeLimits() {
  console.log('\n🔍 === INPUT SIZE LIMIT TESTS ===');
  
  const sizeTests = [
    { 
      name: 'Very long agentId (100 chars)', 
      payload: { 
        phoneNumber: '+15551234567', 
        agentId: 'a'.repeat(100) 
      } 
    },
    { 
      name: 'Maximum agentId (50 chars)', 
      payload: { 
        phoneNumber: '+15551234567', 
        agentId: 'a'.repeat(50) 
      } 
    },
    { 
      name: 'Normal agentId (20 chars)', 
      payload: { 
        phoneNumber: '+15551234567', 
        agentId: 'a'.repeat(20) 
      } 
    },
    {
      name: 'Very long campaignId (100 chars)',
      payload: {
        phoneNumber: '+15551234567',
        agentId: 'test',
        campaignId: 'c'.repeat(100)
      }
    }
  ];
  
  for (const test of sizeTests) {
    await makeAuthenticatedRequest(test.name, test.payload);
  }
}

/**
 * Test clean, valid requests
 */
async function testValidRequests() {
  console.log('\n🔍 === VALID REQUEST TESTS ===');
  
  const validTests = [
    { 
      name: 'Minimal valid request', 
      payload: { phoneNumber: '+15551234567' } 
    },
    { 
      name: 'Complete valid request', 
      payload: { 
        phoneNumber: '+15551234567',
        agentId: 'agent-001',
        campaignId: 'campaign-001',
        leadId: 123
      } 
    },
    { 
      name: 'Clean alphanumeric agentId', 
      payload: { 
        phoneNumber: '+15551234567',
        agentId: 'clean-agent-123'
      } 
    }
  ];
  
  for (const test of validTests) {
    await makeAuthenticatedRequest(test.name, test.payload);
  }
}

/**
 * Generate comprehensive validation report
 */
function generateValidationReport() {
  console.log('\n📊 === VALIDATION ANALYSIS REPORT ===');
  
  const totalTests = TEST_RESULTS.validationTests.length + TEST_RESULTS.securityBlocks.length + TEST_RESULTS.errors.length;
  const securityBlockCount = TEST_RESULTS.securityBlocks.length;
  const validationErrorCount = TEST_RESULTS.validationTests.filter(t => t.status >= 400 && t.status < 500).length;
  const successCount = TEST_RESULTS.validationTests.filter(t => t.status >= 200 && t.status < 300).length;
  const serverErrorCount = TEST_RESULTS.validationTests.filter(t => t.status >= 500).length;
  
  console.log(`📋 Total Tests: ${totalTests}`);
  console.log(`✅ Successful: ${successCount} (${Math.round(successCount/totalTests*100)}%)`);
  console.log(`🛡️  Security Blocks: ${securityBlockCount} (${Math.round(securityBlockCount/totalTests*100)}%)`);
  console.log(`❌ Validation Errors: ${validationErrorCount} (${Math.round(validationErrorCount/totalTests*100)}%)`);
  console.log(`💥 Server Errors: ${serverErrorCount} (${Math.round(serverErrorCount/totalTests*100)}%)`);
  console.log(`🔗 Connection Errors: ${TEST_RESULTS.errors.length}`);
  
  // Analyze security patterns
  if (securityBlockCount > 0) {
    console.log('\n🛡️  === SECURITY VIOLATIONS DETECTED ===');
    TEST_RESULTS.securityBlocks.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Code: ${result.data?.error?.code}`);
      console.log(`   Message: ${result.data?.error?.message}`);
      console.log(`   Payload: ${JSON.stringify(result.payload)}`);
    });
  }
  
  // Analyze validation patterns
  const validationErrors = TEST_RESULTS.validationTests.filter(t => t.status >= 400 && t.status < 500);
  if (validationErrors.length > 0) {
    console.log('\n📝 === VALIDATION ERROR PATTERNS ===');
    validationErrors.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Error: ${result.data?.error?.message || result.data?.message || 'Unknown'}`);
      console.log(`   Code: ${result.data?.error?.code || 'N/A'}`);
    });
  }
  
  // Analyze successful requests
  const successes = TEST_RESULTS.validationTests.filter(t => t.status >= 200 && t.status < 300);
  if (successes.length > 0) {
    console.log('\n✅ === SUCCESSFUL REQUESTS ===');
    successes.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
    });
  }
  
  return {
    totalTests,
    successCount,
    securityBlockCount,
    validationErrorCount,
    serverErrorCount,
    connectionErrors: TEST_RESULTS.errors.length,
    details: TEST_RESULTS
  };
}

/**
 * Main test execution
 */
async function runValidationTests() {
  console.log('🔍 Starting Validation Pattern Testing (Authenticated)');
  console.log(`📍 Testing endpoint: ${API_ENDPOINT}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('🔑 Using generated JWT token for authentication\n');
  
  try {
    // Run all test suites
    await testValidRequests();
    await testValidPhoneFormats();
    await testInvalidPhoneFormats();
    await testPhoneNumberSQLInjection();
    await testFieldSQLInjection();
    await testXSSPatterns();
    await testInputSizeLimits();
    
    // Generate comprehensive report
    const report = generateValidationReport();
    
    console.log('\n🏁 Validation Testing Complete!');
    console.log(`📊 Summary: ${report.successCount} passed, ${report.securityBlockCount} blocked, ${report.validationErrorCount} validation errors`);
    
    return report;
    
  } catch (error) {
    console.error('💥 Validation test execution failed:', error);
    throw error;
  }
}

// Export for use in other test files
module.exports = {
  generateTestToken,
  makeAuthenticatedRequest,
  runValidationTests,
  generateValidationReport,
  TEST_RESULTS
};

// Run tests if this file is executed directly
if (require.main === module) {
  runValidationTests()
    .then(report => {
      console.log('\n✨ All validation tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Validation test execution failed:', error);
      process.exit(1);
    });
}