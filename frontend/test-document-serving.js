/**
 * Comprehensive Document Serving System Test
 * Tests the document endpoint and URL generation used by the frontend
 */

// Use built-in fetch if available (Node.js 18+) or fall back to node-fetch
let fetch;
try {
  fetch = globalThis.fetch;
  if (!fetch) {
    // For older Node.js versions
    fetch = require('node-fetch');
  }
} catch (error) {
  // Alternative approach using https module
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');
  
  fetch = async (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: new Map(Object.entries(res.headers)),
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data)
          });
        });
      });
      
      req.on('error', reject);
      req.end();
    });
  };
}

// Test configuration
const BACKEND_URL = 'http://localhost:3001';
const API_BASE = `${BACKEND_URL}/api`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Document-Test-Client/1.0',
        ...options.headers
      }
    });

    const responseData = {
      status: response.status,
      statusText: response.statusText,
      headers: {},
      ok: response.ok
    };

    // Handle headers - different based on fetch implementation
    if (response.headers) {
      if (typeof response.headers.entries === 'function') {
        responseData.headers = Object.fromEntries(response.headers.entries());
      } else if (typeof response.headers.get === 'function') {
        // Create headers object manually
        const commonHeaders = ['content-type', 'content-length', 'access-control-allow-origin', 'cache-control', 'last-modified'];
        for (const header of commonHeaders) {
          const value = response.headers.get(header);
          if (value) responseData.headers[header] = value;
        }
      } else {
        responseData.headers = response.headers;
      }
    }

    // Try to get body based on content type
    const contentType = responseData.headers['content-type'] || '';
    
    try {
      if (contentType.includes('application/json')) {
        responseData.body = await response.json();
      } else if (contentType.includes('text/')) {
        responseData.body = await response.text();
      } else {
        responseData.body = '[Binary Content]';
      }
    } catch (bodyError) {
      responseData.body = '[Unable to parse body]';
      responseData.bodyError = bodyError.message;
    }

    return responseData;
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      ok: false
    };
  }
}

async function testHealthCheck() {
  log('\n=== BACKEND HEALTH CHECK ===', 'cyan');
  
  const response = await makeRequest(`${API_BASE}/health`);
  
  if (response.ok) {
    log('✅ Backend is running and healthy', 'green');
    log(`   Status: ${response.status}`, 'blue');
    log(`   Version: ${response.body.version}`, 'blue');
    log(`   Environment: ${response.body.environment}`, 'blue');
  } else {
    log('❌ Backend health check failed', 'red');
    log(`   Status: ${response.status}`, 'red');
    log(`   Error: ${response.error || 'Unknown error'}`, 'red');
    return false;
  }
  
  return true;
}

async function testCORSConfiguration() {
  log('\n=== CORS CONFIGURATION TEST ===', 'cyan');
  
  const origins = [
    'http://localhost:3000', // Default React dev server
    'http://localhost:3002', // Alternative React dev server  
    'http://localhost:3003', // Another alternative
    'https://badorigin.com'   // Should be blocked
  ];
  
  for (const origin of origins) {
    const response = await makeRequest(`${API_BASE}/documents`, {
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    const corsHeader = response.headers['access-control-allow-origin'];
    const shouldAllow = origin.includes('localhost');
    
    if (shouldAllow) {
      if (corsHeader === origin || corsHeader === '*') {
        log(`✅ CORS allows ${origin}`, 'green');
      } else {
        log(`❌ CORS should allow ${origin} but doesn't`, 'red');
        log(`   Expected: ${origin}, Got: ${corsHeader}`, 'yellow');
      }
    } else {
      if (!corsHeader || corsHeader !== origin) {
        log(`✅ CORS correctly blocks ${origin}`, 'green');
      } else {
        log(`❌ CORS should block ${origin} but allows it`, 'red');
      }
    }
  }
}

async function testDocumentListing() {
  log('\n=== DOCUMENT LISTING TEST ===', 'cyan');
  
  const response = await makeRequest(`${API_BASE}/documents`);
  
  if (response.ok) {
    log('✅ Document listing endpoint works', 'green');
    log(`   Status: ${response.status}`, 'blue');
    log(`   Documents found: ${response.body.data.documents.length}`, 'blue');
    log(`   Categories: ${response.body.data.categories.join(', ')}`, 'blue');
    
    // List available documents
    response.body.data.documents.forEach(doc => {
      log(`   - ${doc.title} (${doc.id})`, 'yellow');
    });
    
    return response.body.data.documents;
  } else {
    log('❌ Document listing failed', 'red');
    log(`   Status: ${response.status}`, 'red');
    log(`   Error: ${JSON.stringify(response.body, null, 2)}`, 'red');
    return [];
  }
}

async function testDocumentAccess(documents) {
  log('\n=== DOCUMENT ACCESS TEST ===', 'cyan');
  
  // Test predefined document IDs
  const predefinedIds = [
    'readme',
    'start-guide', 
    'twilio-setup',
    'twilio-integration',
    'quick-twilio-start',
    'chatbot-spec'
  ];
  
  for (const id of predefinedIds) {
    const response = await makeRequest(`${API_BASE}/documents/${id}`);
    
    if (response.ok) {
      log(`✅ Document ${id} accessible`, 'green');
      log(`   Status: ${response.status}`, 'blue');
      log(`   Content-Type: ${response.headers['content-type']}`, 'blue');
      log(`   Content-Length: ${response.headers['content-length'] || 'unknown'}`, 'blue');
      
      // Check if it's markdown content
      if (typeof response.body === 'string' && response.body.includes('#')) {
        log(`   Content appears to be markdown ✓`, 'yellow');
      }
    } else {
      log(`❌ Document ${id} not accessible`, 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Error: ${JSON.stringify(response.body, null, 2)}`, 'yellow');
    }
  }
}

async function testRAGSourcePaths() {
  log('\n=== RAG SOURCE PATH TEST ===', 'cyan');
  
  // Test various path formats that might be generated by the RAG system
  const ragPaths = [
    // Encoded paths
    encodeURIComponent('../README.md'),
    encodeURIComponent('../TWILIO_SETUP_GUIDE.md'),
    encodeURIComponent('../START_GUIDE.md'),
    encodeURIComponent('src/routes/documents.js'),
    encodeURIComponent('backend/src/controllers/chatController.js'),
    
    // Direct paths (some should be blocked by security)
    '../README.md',
    'TWILIO_SETUP_GUIDE.md',
    'src/routes/documents.js',
    
    // Potentially malicious paths (should be blocked)
    encodeURIComponent('../../../etc/passwd'),
    encodeURIComponent('../backend/package.json'),
    '../../../etc/passwd'
  ];
  
  for (const testPath of ragPaths) {
    const response = await makeRequest(`${API_BASE}/documents/${testPath}`);
    
    if (response.ok) {
      log(`✅ Path accessible: ${testPath}`, 'green');
      log(`   Status: ${response.status}`, 'blue');
      log(`   Content-Type: ${response.headers['content-type']}`, 'blue');
      
      // Check if content looks legitimate
      if (typeof response.body === 'string') {
        const contentPreview = response.body.substring(0, 100).replace(/\n/g, ' ');
        log(`   Content preview: ${contentPreview}...`, 'yellow');
      }
    } else if (response.status === 403) {
      log(`🔒 Path correctly blocked by security: ${testPath}`, 'yellow');
      log(`   Status: ${response.status} (Access Denied)`, 'blue');
    } else if (response.status === 404) {
      log(`❓ Path not found: ${testPath}`, 'yellow');
      log(`   Status: ${response.status} (Not Found)`, 'blue');
    } else {
      log(`❌ Unexpected response for path: ${testPath}`, 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Error: ${JSON.stringify(response.body, null, 2)}`, 'yellow');
    }
  }
}

async function testEncodingDecodingUrls() {
  log('\n=== URL ENCODING/DECODING TEST ===', 'cyan');
  
  const testCases = [
    {
      original: '../README.md',
      encoded: encodeURIComponent('../README.md'),
      description: 'Parent directory README'
    },
    {
      original: 'src/routes/documents.js',
      encoded: encodeURIComponent('src/routes/documents.js'),
      description: 'Source file path'
    },
    {
      original: '../TWILIO_SETUP_GUIDE.md',
      encoded: encodeURIComponent('../TWILIO_SETUP_GUIDE.md'),
      description: 'Twilio guide with special characters'
    }
  ];
  
  for (const testCase of testCases) {
    log(`\nTesting: ${testCase.description}`, 'blue');
    
    // Test encoded version
    const encodedResponse = await makeRequest(`${API_BASE}/documents/${testCase.encoded}`);
    
    // Test unencoded version (might be blocked by security middleware)
    const unencodedResponse = await makeRequest(`${API_BASE}/documents/${testCase.original}`);
    
    log(`  Original path: ${testCase.original}`, 'yellow');
    log(`  Encoded path:  ${testCase.encoded}`, 'yellow');
    log(`  Encoded response: ${encodedResponse.status} ${encodedResponse.statusText}`, encodedResponse.ok ? 'green' : 'red');
    log(`  Unencoded response: ${unencodedResponse.status} ${unencodedResponse.statusText}`, unencodedResponse.ok ? 'green' : 'red');
    
    // Compare responses
    if (encodedResponse.ok && unencodedResponse.ok) {
      const sameContent = encodedResponse.body === unencodedResponse.body;
      log(`  Content match: ${sameContent ? '✅ Same' : '❌ Different'}`, sameContent ? 'green' : 'red');
    }
  }
}

async function testSecurityRestrictions() {
  log('\n=== SECURITY RESTRICTIONS TEST ===', 'cyan');
  
  const maliciousPaths = [
    '../../../etc/passwd',
    '../../package.json',
    '../backend/.env',
    'node_modules/express/package.json',
    '/etc/hosts',
    'C:\\Windows\\System32\\drivers\\etc\\hosts',
    '../backend/src/middleware/auth.js',
    '../../.git/config',
  ];
  
  let blockedCount = 0;
  let allowedCount = 0;
  
  for (const maliciousPath of maliciousPaths) {
    const response = await makeRequest(`${API_BASE}/documents/${encodeURIComponent(maliciousPath)}`);
    
    if (response.status === 403) {
      log(`🔒 Correctly blocked: ${maliciousPath}`, 'green');
      blockedCount++;
    } else if (response.status === 404) {
      log(`❓ Not found (acceptable): ${maliciousPath}`, 'yellow');
      blockedCount++;
    } else if (response.ok) {
      log(`🚨 SECURITY ISSUE - Path allowed: ${maliciousPath}`, 'red');
      allowedCount++;
      if (typeof response.body === 'string') {
        const preview = response.body.substring(0, 50).replace(/\n/g, ' ');
        log(`   Content: ${preview}...`, 'red');
      }
    } else {
      log(`❌ Unexpected response: ${maliciousPath} (${response.status})`, 'red');
    }
  }
  
  log(`\nSecurity Summary:`, 'cyan');
  log(`  Blocked/NotFound: ${blockedCount}/${maliciousPaths.length}`, 'green');
  log(`  Allowed: ${allowedCount}/${maliciousPaths.length}`, allowedCount > 0 ? 'red' : 'green');
  
  if (allowedCount === 0) {
    log('✅ Security restrictions working correctly', 'green');
  } else {
    log('❌ Security restrictions have vulnerabilities', 'red');
  }
}

async function testMetadataEndpoint(documents) {
  log('\n=== DOCUMENT METADATA TEST ===', 'cyan');
  
  if (documents.length === 0) {
    log('❌ No documents to test metadata for', 'red');
    return;
  }
  
  const sampleDoc = documents[0];
  const response = await makeRequest(`${API_BASE}/documents/${sampleDoc.id}/metadata`);
  
  if (response.ok) {
    log(`✅ Metadata endpoint works for ${sampleDoc.id}`, 'green');
    log(`   Status: ${response.status}`, 'blue');
    log(`   Title: ${response.body.data.title}`, 'blue');
    log(`   Size: ${response.body.data.size} bytes`, 'blue');
    log(`   Words: ${response.body.data.wordCount}`, 'blue');
    log(`   Lines: ${response.body.data.lineCount}`, 'blue');
  } else {
    log(`❌ Metadata endpoint failed for ${sampleDoc.id}`, 'red');
    log(`   Status: ${response.status}`, 'red');
  }
}

async function testHTMLRendering() {
  log('\n=== HTML RENDERING TEST ===', 'cyan');
  
  const response = await makeRequest(`${API_BASE}/documents/readme?render=html`);
  
  if (response.ok) {
    log('✅ HTML rendering works', 'green');
    log(`   Status: ${response.status}`, 'blue');
    log(`   Content-Type: ${response.headers['content-type']}`, 'blue');
    
    if (typeof response.body === 'string') {
      const hasHTML = response.body.includes('<html>') && response.body.includes('<body>');
      log(`   Contains HTML structure: ${hasHTML ? '✅ Yes' : '❌ No'}`, hasHTML ? 'green' : 'red');
    }
  } else {
    log('❌ HTML rendering failed', 'red');
    log(`   Status: ${response.status}`, 'red');
  }
}

async function generateTestReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('DOCUMENT SERVING SYSTEM TEST REPORT', 'bright');
  log('='.repeat(60), 'cyan');
  
  try {
    // Run all tests
    const isHealthy = await testHealthCheck();
    if (!isHealthy) {
      log('❌ Backend is not running. Please start the backend server first.', 'red');
      return;
    }
    
    await testCORSConfiguration();
    const documents = await testDocumentListing();
    await testDocumentAccess(documents);
    await testRAGSourcePaths();
    await testEncodingDecodingUrls();
    await testSecurityRestrictions();
    await testMetadataEndpoint(documents);
    await testHTMLRendering();
    
    log('\n=== TEST SUMMARY ===', 'cyan');
    log('✅ All document serving tests completed', 'green');
    log('📝 Review the results above for any security issues or failed tests', 'yellow');
    log('🔍 Pay special attention to blocked malicious paths and CORS configuration', 'blue');
    
  } catch (error) {
    log(`❌ Test execution failed: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the tests
if (require.main === module) {
  generateTestReport();
}

module.exports = {
  testHealthCheck,
  testCORSConfiguration,
  testDocumentListing,
  testDocumentAccess,
  testRAGSourcePaths,
  testEncodingDecodingUrls,
  testSecurityRestrictions,
  testMetadataEndpoint,
  testHTMLRendering
};