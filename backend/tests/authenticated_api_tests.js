/**
 * Authenticated API Validation Testing
 * Tests API endpoints with proper authentication to isolate validation patterns
 */

const axios = require('axios');
const baseURL = 'http://localhost:5000/api';

// Test configuration
const API_ENDPOINT = `${baseURL}/calls/start`;
const AUTH_ENDPOINT = `${baseURL}/auth/login`;
const TEST_RESULTS = {
  auth: null,
  validation: {
    passed: [],
    failed: [],
    errors: []
  }
};

/**
 * Get authentication token
 */
async function getAuthToken() {
  console.log('🔐 Attempting to authenticate...');
  
  // Try common test credentials
  const testCredentials = [
    { email: 'admin@test.com', password: 'password123' },
    { email: 'test@test.com', password: 'test123' },
    { email: 'user@example.com', password: 'password' },
    { username: 'admin', password: 'admin123' },
    { username: 'test', password: 'test' }
  ];
  
  for (const creds of testCredentials) {
    try {
      console.log(`🔄 Trying credentials: ${JSON.stringify(creds)}`);
      const response = await axios.post(AUTH_ENDPOINT, creds, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      });
      
      console.log(`📥 Auth Response: ${response.status} - ${JSON.stringify(response.data)}`);
      
      if (response.status === 200 && response.data.token) {
        console.log('✅ Authentication successful!');
        return response.data.token;
      }
      
    } catch (error) {
      console.log(`❌ Auth error with ${JSON.stringify(creds)}: ${error.message}`);
    }
  }
  
  // If no valid credentials found, return null to test without auth
  console.log('⚠️  No valid auth credentials found, will test API key or header-based auth...');
  return null;
}

/**
 * Test API call with authentication
 */
async function testAuthenticatedCall(testName, payload, authToken = null, headers = {}) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));
  
  // Try different authentication methods
  const authMethods = [
    authToken ? { 'Authorization': `Bearer ${authToken}` } : null,
    authToken ? { 'Authorization': `Token ${authToken}` } : null,
    { 'X-API-Key': 'test-api-key-123' },
    { 'X-API-Key': 'development-key' },
    { 'X-API-Key': 'cold-caller-api-key' },
    { 'Authorization': 'Basic ' + Buffer.from('admin:admin123').toString('base64') },
    { 'X-Auth-Token': 'test-token-123' }
  ].filter(Boolean);
  
  // If we have an auth token, try Bearer first, otherwise try all methods
  const methodsToTry = authToken ? [authMethods[0], authMethods[1]] : authMethods;
  
  for (const authHeaders of methodsToTry) {
    try {
      const requestHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Validation-Test/1.0',
        ...authHeaders,
        ...headers
      };
      
      console.log(`🔑 Trying auth headers:`, authHeaders);
      
      const response = await axios.post(API_ENDPOINT, payload, {
        headers: requestHeaders,
        validateStatus: () => true
      });
      
      console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
      console.log(`📥 Response Data:`, JSON.stringify(response.data, null, 2));
      
      const result = {
        testName,
        payload,
        authHeaders,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers
      };
      
      // If we get past 403, we found working auth
      if (response.status !== 403) {
        console.log(`✅ Auth method works! Status: ${response.status}`);
        return result;
      }
      
    } catch (error) {
      console.log(`💥 Error with auth method ${JSON.stringify(authHeaders)}:`, error.message);
    }
  }
  
  // If all auth methods fail, return 403 result
  console.log(`❌ All authentication methods failed for: ${testName}`);
  return {
    testName,
    payload,
    status: 403,
    statusText: 'Forbidden',
    data: 'All authentication methods failed',
    authMethods: methodsToTry.length
  };
}

/**
 * Phone number validation tests with auth
 */
async function runAuthenticatedPhoneTests(authToken) {
  console.log('\n🔍 === AUTHENTICATED PHONE VALIDATION TESTS ===');
  
  const phoneTestCases = [
    // Valid cases
    { name: 'Valid US number', phone: '+15551234567', expectedRange: [200, 201] },
    { name: 'Valid international', phone: '+44 20 7946 0958', expectedRange: [200, 201] },
    
    // Cases that should trigger validation errors (not auth errors)
    { name: 'Phone with SQL injection', phone: '+1555\'; DROP TABLE calls; --', expectedRange: [400, 400] },
    { name: 'Phone with special chars', phone: '+1(555)123-4567;', expectedRange: [400, 400] },
    { name: 'Empty phone', phone: '', expectedRange: [400, 400] },
    { name: 'Too short phone', phone: '123', expectedRange: [400, 400] },
  ];
  
  for (const testCase of phoneTestCases) {
    const result = await testAuthenticatedCall(
      testCase.name,
      { phoneNumber: testCase.phone, agentId: 'test-agent' },
      authToken
    );
    
    const isExpectedStatus = result.status >= testCase.expectedRange[0] && 
                           result.status <= testCase.expectedRange[1];
    
    if (isExpectedStatus) {
      TEST_RESULTS.validation.passed.push(result);
      console.log(`✅ Test passed (status ${result.status} in range ${testCase.expectedRange})`);
    } else {
      TEST_RESULTS.validation.failed.push(result);
      console.log(`❌ Test failed (status ${result.status} not in range ${testCase.expectedRange})`);
    }
  }
}

/**
 * SQL injection pattern tests with auth
 */
async function runAuthenticatedSQLTests(authToken) {
  console.log('\n🔍 === AUTHENTICATED SQL INJECTION TESTS ===');
  
  const sqlTestCases = [
    { name: 'SELECT in agentId', payload: { phoneNumber: '+15551234567', agentId: 'SELECT * FROM users' }, expected: 400 },
    { name: 'OR 1=1 injection', payload: { phoneNumber: '+15551234567', agentId: 'agent\' OR 1=1 --' }, expected: 400 },
    { name: 'Semicolon injection', payload: { phoneNumber: '+15551234567', agentId: 'agent; DROP TABLE users' }, expected: 400 },
    { name: 'Clean agentId', payload: { phoneNumber: '+15551234567', agentId: 'clean-agent-123' }, expected: [200, 201] }
  ];
  
  for (const testCase of sqlTestCases) {
    const result = await testAuthenticatedCall(
      testCase.name,
      testCase.payload,
      authToken
    );
    
    const expected = Array.isArray(testCase.expected) ? testCase.expected : [testCase.expected, testCase.expected];
    const isExpectedStatus = result.status >= expected[0] && result.status <= expected[1];
    
    if (isExpectedStatus) {
      TEST_RESULTS.validation.passed.push(result);
      console.log(`✅ Test passed (status ${result.status})`);
    } else {
      TEST_RESULTS.validation.failed.push(result);
      console.log(`❌ Test failed (expected ${testCase.expected}, got ${result.status})`);
    }
  }
}

/**
 * Generate test report
 */
function generateAuthTestReport() {
  console.log('\n📊 === AUTHENTICATED TEST RESULTS ===');
  console.log(`✅ Validation Passed: ${TEST_RESULTS.validation.passed.length}`);
  console.log(`❌ Validation Failed: ${TEST_RESULTS.validation.failed.length}`);
  console.log(`💥 Validation Errors: ${TEST_RESULTS.validation.errors.length}`);
  
  // Analyze security patterns
  const securityBlocked = TEST_RESULTS.validation.passed.filter(result => 
    result.status === 400 && 
    result.data && 
    result.data.error && 
    result.data.error.code === 'SECURITY_VIOLATION'
  );
  
  const validationErrors = TEST_RESULTS.validation.passed.filter(result =>
    result.status === 400 &&
    result.data &&
    result.data.error &&
    result.data.error.message
  );
  
  console.log(`🛡️  Security blocks: ${securityBlocked.length}`);
  console.log(`📝 Validation errors: ${validationErrors.length}`);
  
  if (securityBlocked.length > 0) {
    console.log('\n🛡️  SECURITY VIOLATIONS DETECTED:');
    securityBlocked.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Payload: ${JSON.stringify(result.payload)}`);
      console.log(`   Message: ${result.data.error.message}`);
    });
  }
  
  if (validationErrors.length > 0) {
    console.log('\n📝 VALIDATION ERRORS:');
    validationErrors.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Message: ${result.data.error ? result.data.error.message : 'Unknown'}`);
    });
  }
  
  return {
    summary: {
      passed: TEST_RESULTS.validation.passed.length,
      failed: TEST_RESULTS.validation.failed.length,
      errors: TEST_RESULTS.validation.errors.length
    },
    securityBlocked: securityBlocked.length,
    validationErrors: validationErrors.length,
    authToken: TEST_RESULTS.auth !== null
  };
}

/**
 * Main test execution
 */
async function runAuthenticatedTests() {
  console.log('🔐 Starting Authenticated API Validation Testing');
  console.log(`📍 Testing endpoint: ${API_ENDPOINT}`);
  console.log(`🔑 Auth endpoint: ${AUTH_ENDPOINT}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  try {
    // Get authentication token
    const authToken = await getAuthToken();
    TEST_RESULTS.auth = authToken;
    
    if (authToken) {
      console.log('✅ Using Bearer token authentication');
    } else {
      console.log('⚠️  Will test alternative authentication methods');
    }
    
    // Run authenticated tests
    await runAuthenticatedPhoneTests(authToken);
    await runAuthenticatedSQLTests(authToken);
    
    // Generate report
    const report = generateAuthTestReport();
    
    console.log('\n🏁 Authenticated Testing Complete!');
    return report;
    
  } catch (error) {
    console.error('💥 Authenticated test execution failed:', error);
    throw error;
  }
}

// Export for use in other test files
module.exports = {
  getAuthToken,
  testAuthenticatedCall,
  runAuthenticatedTests,
  generateAuthTestReport,
  TEST_RESULTS
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAuthenticatedTests()
    .then(report => {
      console.log('\n✨ All authenticated tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Authenticated test execution failed:', error);
      process.exit(1);
    });
}