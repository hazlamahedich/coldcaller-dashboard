/**
 * CORRECTED PORT - API Validation Testing
 * Tests the actual backend server running on port 3001, not 5000
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

// CORRECTED: Backend runs on port 3001, not 5000!
const baseURL = 'http://localhost:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-in-production';

const TEST_RESULTS = {
  security: [],
  validation: [],
  success: [],
  errors: []
};

/**
 * Generate valid JWT token
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
async function testValidationEndpoint(testName, payload) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));
  
  try {
    const token = generateTestToken();
    
    const response = await axios.post(`${baseURL}/calls/start`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': 'http://localhost:3000',
        'User-Agent': 'ValidationTest/1.0'
      },
      validateStatus: () => true,
      timeout: 10000
    });
    
    console.log(`📥 Status: ${response.status} ${response.statusText}`);
    console.log(`📥 Data:`, JSON.stringify(response.data, null, 2));
    
    const result = {
      testName,
      payload,
      status: response.status,
      data: response.data,
      success: response.status >= 200 && response.status < 300
    };
    
    // Categorize results
    if (response.status === 400 && response.data?.error?.code === 'SECURITY_VIOLATION') {
      TEST_RESULTS.security.push(result);
      console.log(`🛡️  SECURITY BLOCK: ${response.data.error.message}`);
    } else if (response.status >= 400) {
      TEST_RESULTS.validation.push(result);
      console.log(`📝 VALIDATION ERROR: ${response.data?.error?.message || 'Unknown'}`);
    } else if (response.status >= 200 && response.status < 300) {
      TEST_RESULTS.success.push(result);
      console.log(`✅ SUCCESS: Request accepted`);
    }
    
    return result;
    
  } catch (error) {
    const errorResult = {
      testName,
      payload,
      error: error.message
    };
    
    TEST_RESULTS.errors.push(errorResult);
    console.log(`💥 ERROR: ${error.message}`);
    
    return errorResult;
  }
}

/**
 * Test basic connectivity first
 */
async function testConnectivity() {
  console.log('\n🔗 === CONNECTIVITY TEST ===');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log(`✅ Health Check: ${healthResponse.status} - Server is running!`);
    
    // Test public stats endpoint  
    const statsResponse = await axios.get(`${baseURL}/calls/stats/today`);
    console.log(`✅ Stats Check: ${statsResponse.status} - Public endpoints work!`);
    
    return true;
  } catch (error) {
    console.log(`❌ Connectivity failed: ${error.message}`);
    return false;
  }
}

/**
 * Test SQL injection in phone numbers (special handling)
 */
async function testPhoneNumberSQLInjection() {
  console.log('\n🛡️ === PHONE NUMBER SQL INJECTION TESTS ===');
  
  const phoneTests = [
    { name: 'Valid phone number', phone: '+15551234567', expectSuccess: true },
    { name: 'Phone with SQL quotes', phone: '+1555123\'4567', expectSecurity: true },
    { name: 'Phone with semicolon', phone: '+1555123;4567', expectSecurity: true },
    { name: 'Phone with DROP TABLE', phone: '+1555\'; DROP TABLE calls; --', expectSecurity: true },
    { name: 'Phone with UNION SELECT', phone: '+1555 UNION SELECT 1,2,3', expectSecurity: true },
    { name: 'Phone with OR injection', phone: '+1555\' OR 1=1 --', expectSecurity: true }
  ];
  
  for (const test of phoneTests) {
    await testValidationEndpoint(test.name, {
      phoneNumber: test.phone,
      agentId: 'test-agent'
    });
  }
}

/**
 * Test SQL injection in other fields
 */
async function testFieldSQLInjection() {
  console.log('\n🛡️ === FIELD SQL INJECTION TESTS ===');
  
  const fieldTests = [
    { name: 'Clean agentId', agentId: 'clean-agent-123', expectSuccess: true },
    { name: 'SELECT in agentId', agentId: 'SELECT * FROM users', expectSecurity: true },
    { name: 'DROP in agentId', agentId: 'DROP TABLE users', expectSecurity: true },
    { name: 'OR injection in agentId', agentId: 'agent\' OR 1=1 --', expectSecurity: true },
    { name: 'Semicolon in agentId', agentId: 'agent; DROP TABLE users', expectSecurity: true },
    { name: 'Special chars in agentId', agentId: 'agent|test&more$stuff', expectSecurity: true },
    { name: 'SQL comment in agentId', agentId: 'agent-- comment', expectSecurity: true },
    { name: 'SLEEP function', agentId: 'SLEEP(5)', expectSecurity: true },
    { name: 'BENCHMARK function', agentId: 'BENCHMARK(1000000,1)', expectSecurity: true }
  ];
  
  for (const test of fieldTests) {
    await testValidationEndpoint(test.name, {
      phoneNumber: '+15551234567',
      agentId: test.agentId
    });
  }
}

/**
 * Test phone number validation patterns
 */
async function testPhoneValidation() {
  console.log('\n📞 === PHONE NUMBER VALIDATION TESTS ===');
  
  const phoneValidationTests = [
    { name: 'Valid E.164 format', phone: '+15551234567', expectSuccess: true },
    { name: 'Valid with spaces', phone: '+1 555 123 4567', expectSuccess: true },
    { name: 'Valid with parentheses', phone: '(555) 123-4567', expectSuccess: true },
    { name: 'Valid with dashes', phone: '555-123-4567', expectSuccess: true },
    { name: 'Valid international', phone: '+44 20 7946 0958', expectSuccess: true },
    
    // These should fail validation
    { name: 'Empty phone', phone: '', expectValidation: true },
    { name: 'Too short', phone: '123', expectValidation: true },
    { name: 'Too long', phone: '+123456789012345678901234567890', expectValidation: true },
    { name: 'Invalid characters', phone: '+1-555-abc-defg', expectValidation: true },
    { name: 'Only plus sign', phone: '+', expectValidation: true },
    { name: 'No digits', phone: '+abc-def-ghij', expectValidation: true }
  ];
  
  for (const test of phoneValidationTests) {
    await testValidationEndpoint(test.name, {
      phoneNumber: test.phone,
      agentId: 'test-agent'
    });
  }
}

/**
 * Test XSS protection
 */
async function testXSSProtection() {
  console.log('\n🛡️ === XSS PROTECTION TESTS ===');
  
  const xssTests = [
    { name: 'Script tag', agentId: '<script>alert("xss")</script>' },
    { name: 'JavaScript protocol', agentId: 'javascript:alert("xss")' },
    { name: 'Iframe tag', agentId: '<iframe src="evil.com"></iframe>' },
    { name: 'On event handler', agentId: '<img onload="alert(1)">' },
    { name: 'Data URI', agentId: 'data:text/html,<script>alert(1)</script>' }
  ];
  
  for (const test of xssTests) {
    await testValidationEndpoint(test.name, {
      phoneNumber: '+15551234567',
      agentId: test.agentId
    });
  }
}

/**
 * Generate comprehensive report
 */
function generateFinalReport() {
  console.log('\n📊 === FINAL VALIDATION ANALYSIS REPORT ===');
  
  const totalTests = TEST_RESULTS.security.length + TEST_RESULTS.validation.length + TEST_RESULTS.success.length + TEST_RESULTS.errors.length;
  
  console.log(`📋 Total Tests: ${totalTests}`);
  console.log(`✅ Successful: ${TEST_RESULTS.success.length} (${Math.round(TEST_RESULTS.success.length/totalTests*100)}%)`);
  console.log(`🛡️  Security Blocks: ${TEST_RESULTS.security.length} (${Math.round(TEST_RESULTS.security.length/totalTests*100)}%)`);
  console.log(`📝 Validation Errors: ${TEST_RESULTS.validation.length} (${Math.round(TEST_RESULTS.validation.length/totalTests*100)}%)`);
  console.log(`💥 Connection Errors: ${TEST_RESULTS.errors.length}`);
  
  if (TEST_RESULTS.security.length > 0) {
    console.log('\n🛡️  === SECURITY PATTERNS DETECTED ===');
    TEST_RESULTS.security.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Pattern: ${result.data?.error?.message || 'Unknown'}`);
      console.log(`   Code: ${result.data?.error?.code || 'Unknown'}`);
      console.log(`   Input: ${JSON.stringify(result.payload)}`);
    });
  }
  
  if (TEST_RESULTS.validation.length > 0) {
    console.log('\n📝 === VALIDATION ERRORS ===');
    TEST_RESULTS.validation.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName} (${result.status})`);
      console.log(`   Error: ${result.data?.error?.message || 'Unknown'}`);
    });
  }
  
  if (TEST_RESULTS.success.length > 0) {
    console.log('\n✅ === SUCCESSFUL REQUESTS ===');
    TEST_RESULTS.success.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName} (${result.status})`);
    });
  }
  
  return {
    totalTests,
    successful: TEST_RESULTS.success.length,
    securityBlocks: TEST_RESULTS.security.length,
    validationErrors: TEST_RESULTS.validation.length,
    connectionErrors: TEST_RESULTS.errors.length
  };
}

/**
 * Main execution
 */
async function runCorrectValidationTests() {
  console.log('🔍 CORRECTED PORT - API Validation Testing');
  console.log(`📍 Correct Backend URL: ${baseURL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  try {
    // Test connectivity first
    const connected = await testConnectivity();
    if (!connected) {
      console.log('❌ Cannot connect to backend server. Exiting.');
      return;
    }
    
    // Run validation tests
    await testPhoneValidation();
    await testPhoneNumberSQLInjection();
    await testFieldSQLInjection();
    await testXSSProtection();
    
    // Generate final report
    const report = generateFinalReport();
    
    console.log('\n🏁 CORRECTED VALIDATION TESTING COMPLETE!');
    console.log(`🎯 RESULT: Found ${report.securityBlocks} security patterns, ${report.validationErrors} validation errors, ${report.successful} successful requests`);
    
    return report;
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    throw error;
  }
}

// Run tests
if (require.main === module) {
  runCorrectValidationTests()
    .then(() => {
      console.log('\n✨ All corrected validation tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runCorrectValidationTests,
  generateFinalReport,
  TEST_RESULTS
};