/**
 * API Validation Pattern Testing
 * Comprehensive tests to identify exact error patterns for /calls/start endpoint
 */

const axios = require('axios');
const baseURL = 'http://localhost:5000/api';

// Test configuration
const API_ENDPOINT = `${baseURL}/calls/start`;
const TEST_RESULTS = {
  passed: [],
  failed: [],
  errors: []
};

/**
 * Utility function to make API requests and capture responses
 */
async function testAPICall(testName, payload, expectedStatus = null) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));
  
  try {
    const response = await axios.post(API_ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Validation-Test/1.0'
      },
      validateStatus: () => true // Accept all status codes
    });
    
    const result = {
      testName,
      payload,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    };
    
    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📥 Response Data:`, JSON.stringify(response.data, null, 2));
    
    if (expectedStatus && response.status === expectedStatus) {
      TEST_RESULTS.passed.push(result);
      console.log(`✅ Test passed (expected status ${expectedStatus})`);
    } else if (!expectedStatus) {
      TEST_RESULTS.passed.push(result);
      console.log(`✅ Test completed`);
    } else {
      TEST_RESULTS.failed.push(result);
      console.log(`❌ Test failed (expected ${expectedStatus}, got ${response.status})`);
    }
    
    return result;
    
  } catch (error) {
    const errorResult = {
      testName,
      payload,
      error: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null
    };
    
    TEST_RESULTS.errors.push(errorResult);
    console.log(`💥 Error:`, error.message);
    
    return errorResult;
  }
}

/**
 * Phone Number Format Tests
 */
async function runPhoneNumberTests() {
  console.log('\n🔍 === PHONE NUMBER FORMAT TESTS ===');
  
  const phoneTestCases = [
    // Valid formats
    { name: 'Valid US number with country code', phone: '+15551234567', expected: 200 },
    { name: 'Valid US number with parentheses', phone: '(555) 123-4567', expected: 200 },
    { name: 'Valid US number with dashes', phone: '555-123-4567', expected: 200 },
    { name: 'Valid US number with spaces', phone: '555 123 4567', expected: 200 },
    { name: 'Valid US number with dots', phone: '555.123.4567', expected: 200 },
    { name: 'Valid international number', phone: '+44 20 7946 0958', expected: 200 },
    { name: 'Valid long international', phone: '+86 138 0013 8000', expected: 200 },
    
    // Edge cases that might trigger security
    { name: 'Phone with plus only', phone: '+', expected: 400 },
    { name: 'Phone with special chars', phone: '+1(555)123-4567;', expected: 400 },
    { name: 'Phone with SQL-like chars', phone: '+1555123\'4567', expected: 400 },
    { name: 'Phone with HTML chars', phone: '+1<script>5551234567', expected: 400 },
    { name: 'Phone too short', phone: '123', expected: 400 },
    { name: 'Phone too long', phone: '+123456789012345678901234567890', expected: 400 },
    { name: 'Empty phone number', phone: '', expected: 400 },
    { name: 'Phone with injection attempt', phone: '+1555\'; DROP TABLE calls; --', expected: 400 },
    { name: 'Phone with union attempt', phone: '+1555 UNION SELECT 1,2,3', expected: 400 }
  ];
  
  for (const testCase of phoneTestCases) {
    await testAPICall(
      testCase.name,
      { phoneNumber: testCase.phone, agentId: 'test-agent' },
      testCase.expected
    );
  }
}

/**
 * SQL Injection Pattern Tests
 */
async function runSQLInjectionTests() {
  console.log('\n🔍 === SQL INJECTION PATTERN TESTS ===');
  
  const sqlTestCases = [
    // Basic SQL injection attempts
    { name: 'SELECT statement', payload: { phoneNumber: '+15551234567', agentId: 'SELECT * FROM users' }, expected: 400 },
    { name: 'INSERT statement', payload: { phoneNumber: '+15551234567', agentId: 'INSERT INTO users' }, expected: 400 },
    { name: 'UPDATE statement', payload: { phoneNumber: '+15551234567', agentId: 'UPDATE users SET' }, expected: 400 },
    { name: 'DELETE statement', payload: { phoneNumber: '+15551234567', agentId: 'DELETE FROM users' }, expected: 400 },
    { name: 'DROP statement', payload: { phoneNumber: '+15551234567', agentId: 'DROP TABLE users' }, expected: 400 },
    { name: 'UNION statement', payload: { phoneNumber: '+15551234567', agentId: 'UNION SELECT 1,2' }, expected: 400 },
    
    // OR/AND patterns
    { name: 'OR 1=1 pattern', payload: { phoneNumber: '+15551234567', agentId: 'agent\' OR 1=1 --' }, expected: 400 },
    { name: 'AND 1=1 pattern', payload: { phoneNumber: '+15551234567', agentId: 'agent\' AND 1=1 --' }, expected: 400 },
    
    // Quote patterns
    { name: 'Single quotes', payload: { phoneNumber: '+15551234567', agentId: 'agent\'\'\'' }, expected: 400 },
    { name: 'Double quotes', payload: { phoneNumber: '+15551234567', agentId: 'agent"""' }, expected: 400 },
    
    // Special characters that might trigger SQL protection
    { name: 'Semicolon injection', payload: { phoneNumber: '+15551234567', agentId: 'agent; DROP TABLE users' }, expected: 400 },
    { name: 'Pipe character', payload: { phoneNumber: '+15551234567', agentId: 'agent|test' }, expected: 400 },
    { name: 'Ampersand character', payload: { phoneNumber: '+15551234567', agentId: 'agent&test' }, expected: 400 },
    { name: 'Dollar sign', payload: { phoneNumber: '+15551234567', agentId: 'agent$test' }, expected: 400 },
    
    // Comment patterns
    { name: 'SQL comment --', payload: { phoneNumber: '+15551234567', agentId: 'agent-- comment' }, expected: 400 },
    { name: 'SQL comment /**/', payload: { phoneNumber: '+15551234567', agentId: 'agent/* comment */' }, expected: 400 },
    
    // Function calls
    { name: 'SLEEP function', payload: { phoneNumber: '+15551234567', agentId: 'SLEEP(5)' }, expected: 400 },
    { name: 'BENCHMARK function', payload: { phoneNumber: '+15551234567', agentId: 'BENCHMARK(1000000,1)' }, expected: 400 },
    { name: 'SYSTEM function', payload: { phoneNumber: '+15551234567', agentId: 'SYSTEM(\'ls\')' }, expected: 400 }
  ];
  
  for (const testCase of sqlTestCases) {
    await testAPICall(testCase.name, testCase.payload, testCase.expected);
  }
}

/**
 * XSS Pattern Tests
 */
async function runXSSTests() {
  console.log('\n🔍 === XSS PATTERN TESTS ===');
  
  const xssTestCases = [
    { name: 'Script tag', payload: { phoneNumber: '+15551234567', agentId: '<script>alert("xss")</script>' }, expected: 200 }, // Should be sanitized
    { name: 'JavaScript protocol', payload: { phoneNumber: '+15551234567', agentId: 'javascript:alert("xss")' }, expected: 200 },
    { name: 'Iframe tag', payload: { phoneNumber: '+15551234567', agentId: '<iframe src="evil.com"></iframe>' }, expected: 200 },
    { name: 'On event handler', payload: { phoneNumber: '+15551234567', agentId: '<img onload="alert(1)">' }, expected: 200 },
    { name: 'Data URI', payload: { phoneNumber: '+15551234567', agentId: 'data:text/html,<script>alert(1)</script>' }, expected: 200 }
  ];
  
  for (const testCase of xssTestCases) {
    await testAPICall(testCase.name, testCase.payload, testCase.expected);
  }
}

/**
 * Input Size Tests
 */
async function runInputSizeTests() {
  console.log('\n🔍 === INPUT SIZE VALIDATION TESTS ===');
  
  const sizeTestCases = [
    { 
      name: 'Very long agent ID', 
      payload: { 
        phoneNumber: '+15551234567', 
        agentId: 'a'.repeat(100) // Should exceed 50 char limit
      }, 
      expected: 400 
    },
    {
      name: 'Very long phone number',
      payload: {
        phoneNumber: '+1555123456789012345678901234567890', // Very long
        agentId: 'test-agent'
      },
      expected: 400
    },
    {
      name: 'Large notes field',
      payload: {
        phoneNumber: '+15551234567',
        agentId: 'test-agent',
        notes: 'x'.repeat(600) // Should exceed notes limit if any
      },
      expected: null // Check what happens
    }
  ];
  
  for (const testCase of sizeTestCases) {
    await testAPICall(testCase.name, testCase.payload, testCase.expected);
  }
}

/**
 * Valid Request Tests
 */
async function runValidRequestTests() {
  console.log('\n🔍 === VALID REQUEST TESTS ===');
  
  const validTestCases = [
    {
      name: 'Minimal valid request',
      payload: { phoneNumber: '+15551234567' },
      expected: 200
    },
    {
      name: 'Complete valid request',
      payload: {
        phoneNumber: '+15551234567',
        agentId: 'test-agent-001',
        campaignId: 'campaign-001',
        leadId: 123
      },
      expected: 200
    },
    {
      name: 'International number',
      payload: {
        phoneNumber: '+44 20 7946 0958',
        agentId: 'uk-agent'
      },
      expected: 200
    }
  ];
  
  for (const testCase of validTestCases) {
    await testAPICall(testCase.name, testCase.payload, testCase.expected);
  }
}

/**
 * Generate comprehensive test report
 */
function generateTestReport() {
  console.log('\n📊 === TEST EXECUTION SUMMARY ===');
  console.log(`✅ Passed: ${TEST_RESULTS.passed.length}`);
  console.log(`❌ Failed: ${TEST_RESULTS.failed.length}`);
  console.log(`💥 Errors: ${TEST_RESULTS.errors.length}`);
  
  // Analyze patterns in failures
  console.log('\n🔍 === SECURITY PATTERN ANALYSIS ===');
  
  const securityBlocked = TEST_RESULTS.passed.filter(result => 
    result.status === 400 && 
    result.data && 
    result.data.error && 
    result.data.error.code === 'SECURITY_VIOLATION'
  );
  
  const validationFailed = TEST_RESULTS.passed.filter(result =>
    result.status === 400 &&
    result.data &&
    result.data.error &&
    !result.data.error.code
  );
  
  console.log(`🛡️  Security blocks: ${securityBlocked.length}`);
  console.log(`📝 Validation failures: ${validationFailed.length}`);
  
  if (securityBlocked.length > 0) {
    console.log('\n🛡️  SECURITY BLOCKED REQUESTS:');
    securityBlocked.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Payload: ${JSON.stringify(result.payload)}`);
      console.log(`   Message: ${result.data.error.message}`);
    });
  }
  
  if (validationFailed.length > 0) {
    console.log('\n📝 VALIDATION FAILED REQUESTS:');
    validationFailed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Payload: ${JSON.stringify(result.payload)}`);
      console.log(`   Message: ${result.data.error ? result.data.error.message : 'Unknown error'}`);
    });
  }
  
  if (TEST_RESULTS.errors.length > 0) {
    console.log('\n💥 CONNECTION/REQUEST ERRORS:');
    TEST_RESULTS.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.testName}`);
      console.log(`   Error: ${error.error}`);
    });
  }
  
  return {
    summary: {
      passed: TEST_RESULTS.passed.length,
      failed: TEST_RESULTS.failed.length,
      errors: TEST_RESULTS.errors.length
    },
    securityBlocked: securityBlocked.length,
    validationFailed: validationFailed.length,
    details: TEST_RESULTS
  };
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log('🚀 Starting API Validation Pattern Testing');
  console.log(`📍 Testing endpoint: ${API_ENDPOINT}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  try {
    // Run test suites
    await runValidRequestTests();
    await runPhoneNumberTests();
    await runSQLInjectionTests();
    await runXSSTests();
    await runInputSizeTests();
    
    // Generate report
    const report = generateTestReport();
    
    console.log('\n🏁 Testing Complete!');
    return report;
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    throw error;
  }
}

// Export for potential use in other test files
module.exports = {
  testAPICall,
  runAllTests,
  generateTestReport,
  TEST_RESULTS
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(report => {
      console.log('\n✨ All tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}