/**
 * CORS and Authentication Debug Test
 * Specifically test CORS headers and authentication responses
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const baseURL = 'http://localhost:5000/api';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-in-production';

/**
 * Generate test JWT token
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
 * Test CORS preflight
 */
async function testCORSPreflight() {
  console.log('\n🌐 === CORS PREFLIGHT TEST ===');
  
  try {
    const response = await axios.options(`${baseURL}/calls/start`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      },
      validateStatus: () => true
    });
    
    console.log(`📥 CORS Preflight Status: ${response.status}`);
    console.log(`📥 CORS Headers:`, {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
      'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials']
    });
    
    return response;
    
  } catch (error) {
    console.log(`💥 CORS Preflight Error:`, error.message);
    return null;
  }
}

/**
 * Test authentication with detailed headers
 */
async function testDetailedAuth() {
  console.log('\n🔐 === DETAILED AUTHENTICATION TEST ===');
  
  const token = generateTestToken();
  console.log('🔑 Generated JWT Token:', token.substring(0, 50) + '...');
  
  try {
    const response = await axios.post(`${baseURL}/calls/start`, 
      { phoneNumber: '+15551234567', agentId: 'test' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Origin': 'http://localhost:3000',
          'User-Agent': 'CORS-Debug-Test/1.0',
          'Accept': 'application/json'
        },
        validateStatus: () => true,
        maxRedirects: 0 // Don't follow redirects
      }
    );
    
    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📥 Response Headers:`, {
      'content-type': response.headers['content-type'],
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'server': response.headers['server'],
      'content-length': response.headers['content-length']
    });
    console.log(`📥 Response Data:`, response.data || 'Empty');
    
    return response;
    
  } catch (error) {
    console.log(`💥 Authentication Error:`, error.message);
    if (error.response) {
      console.log(`📥 Error Status: ${error.response.status}`);
      console.log(`📥 Error Data:`, error.response.data);
    }
    return error.response || null;
  }
}

/**
 * Test various origins
 */
async function testDifferentOrigins() {
  console.log('\n🌍 === ORIGIN TESTING ===');
  
  const token = generateTestToken();
  const origins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://coldcaller.com',
    'https://app.coldcaller.com',
    null // No origin header
  ];
  
  for (const origin of origins) {
    console.log(`\n🔍 Testing origin: ${origin || 'No origin'}`);
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Origin-Test/1.0'
      };
      
      if (origin) {
        headers['Origin'] = origin;
      }
      
      const response = await axios.post(`${baseURL}/calls/start`, 
        { phoneNumber: '+15551234567' },
        {
          headers,
          validateStatus: () => true,
          timeout: 5000
        }
      );
      
      console.log(`   📥 Status: ${response.status} ${response.statusText}`);
      console.log(`   📥 CORS Allow Origin: ${response.headers['access-control-allow-origin'] || 'None'}`);
      
      if (response.status !== 403) {
        console.log(`   ✅ Origin ${origin || 'none'} works!`);
        console.log(`   📥 Data:`, response.data);
        return response;
      }
      
    } catch (error) {
      console.log(`   💥 Error with origin ${origin || 'none'}:`, error.message);
    }
  }
}

/**
 * Test without authentication
 */
async function testWithoutAuth() {
  console.log('\n🚫 === NO AUTHENTICATION TEST ===');
  
  try {
    const response = await axios.post(`${baseURL}/calls/start`, 
      { phoneNumber: '+15551234567' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000'
        },
        validateStatus: () => true
      }
    );
    
    console.log(`📥 No-Auth Status: ${response.status} ${response.statusText}`);
    console.log(`📥 No-Auth Data:`, response.data);
    
    return response;
    
  } catch (error) {
    console.log(`💥 No-Auth Error:`, error.message);
    return error.response || null;
  }
}

/**
 * Test server connectivity
 */
async function testServerConnectivity() {
  console.log('\n🔗 === SERVER CONNECTIVITY TEST ===');
  
  try {
    // Test health endpoint (should be public)
    const healthResponse = await axios.get(`${baseURL}/health`, {
      validateStatus: () => true
    });
    
    console.log(`📥 Health Check: ${healthResponse.status} ${healthResponse.statusText}`);
    console.log(`📥 Health Data:`, healthResponse.data);
    
    // Test a known public endpoint
    const statsResponse = await axios.get(`${baseURL}/calls/stats/today`, {
      validateStatus: () => true
    });
    
    console.log(`📥 Stats Check: ${statsResponse.status} ${statsResponse.statusText}`);
    console.log(`📥 Stats Data:`, statsResponse.data);
    
    return { health: healthResponse, stats: statsResponse };
    
  } catch (error) {
    console.log(`💥 Connectivity Error:`, error.message);
    return null;
  }
}

/**
 * Main debug execution
 */
async function runCORSDebug() {
  console.log('🔍 Starting CORS and Authentication Debug');
  console.log(`📍 Base URL: ${baseURL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
  
  try {
    // Test basic connectivity
    await testServerConnectivity();
    
    // Test CORS preflight
    await testCORSPreflight();
    
    // Test without authentication
    await testWithoutAuth();
    
    // Test with authentication
    await testDetailedAuth();
    
    // Test different origins
    const workingOrigin = await testDifferentOrigins();
    
    if (workingOrigin) {
      console.log('\n✅ Found working configuration!');
    } else {
      console.log('\n❌ No working authentication configuration found');
      console.log('\n🔍 DIAGNOSIS:');
      console.log('1. All requests return 403 Forbidden');
      console.log('2. Even valid JWT tokens are rejected');
      console.log('3. CORS headers may be blocking requests');
      console.log('4. Additional middleware may be interfering');
    }
    
    console.log('\n🏁 CORS Debug Complete!');
    
  } catch (error) {
    console.error('💥 Debug execution failed:', error);
  }
}

// Run debug if executed directly
if (require.main === module) {
  runCORSDebug();
}

module.exports = {
  testCORSPreflight,
  testDetailedAuth,
  testDifferentOrigins,
  runCORSDebug
};