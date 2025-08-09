/**
 * Authentication Test Runner
 * Manual testing utility for authentication flows
 */

import authService from '../../services/authService.js';
import api from '../../services/api.js';
import { leadsService } from '../../services/leadsService.js';

// Test configuration
const TEST_CREDENTIALS = {
  valid: {
    email: 'admin@coldcaller.com',
    password: 'Admin@123'
  },
  invalid: {
    email: 'wrong@email.com',
    password: 'wrongpassword'
  }
};

// Test utilities
const testLogger = {
  start: (testName) => {
    console.log(`\n🧪 ${testName}`);
    console.log('='.repeat(50));
  },
  
  success: (message) => {
    console.log(`✅ ${message}`);
  },
  
  error: (message, error) => {
    console.log(`❌ ${message}`);
    if (error) {
      console.error('Error details:', error);
    }
  },
  
  info: (message, data) => {
    console.log(`ℹ️  ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  },
  
  complete: (testName, passed, failed) => {
    console.log(`\n📊 ${testName} Complete: ${passed} passed, ${failed} failed\n`);
  }
};

// Test suite
const authTests = {
  async testLogin() {
    testLogger.start('Login Flow Test');
    let passed = 0, failed = 0;
    
    try {
      // Test successful login
      testLogger.info('Testing valid credentials...');
      const loginResult = await authService.login(
        TEST_CREDENTIALS.valid.email,
        TEST_CREDENTIALS.valid.password
      );
      
      if (loginResult.success) {
        testLogger.success('Valid login successful');
        testLogger.info('User data', loginResult.data.user);
        testLogger.info('Token received', {
          hasAccessToken: !!loginResult.data.accessToken,
          hasRefreshToken: !!loginResult.data.refreshToken,
          tokenLength: loginResult.data.accessToken?.length
        });
        passed++;
      } else {
        testLogger.error('Valid login failed', loginResult.error);
        failed++;
      }
      
      // Test invalid credentials
      testLogger.info('Testing invalid credentials...');
      const invalidResult = await authService.login(
        TEST_CREDENTIALS.invalid.email,
        TEST_CREDENTIALS.invalid.password
      );
      
      if (!invalidResult.success) {
        testLogger.success('Invalid login correctly rejected');
        testLogger.info('Error message', invalidResult.error);
        passed++;
      } else {
        testLogger.error('Invalid login should have failed');
        failed++;
      }
      
    } catch (error) {
      testLogger.error('Login test failed with exception', error);
      failed++;
    }
    
    testLogger.complete('Login Test', passed, failed);
    return { passed, failed };
  },

  async testTokenManagement() {
    testLogger.start('Token Management Test');
    let passed = 0, failed = 0;
    
    try {
      // First login to get tokens
      const loginResult = await authService.login(
        TEST_CREDENTIALS.valid.email,
        TEST_CREDENTIALS.valid.password
      );
      
      if (!loginResult.success) {
        testLogger.error('Prerequisites failed: could not login');
        failed++;
        return { passed, failed };
      }
      
      // Test token storage
      const storedToken = localStorage.getItem('authToken');
      const storedRefresh = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedRefresh && storedUser) {
        testLogger.success('Tokens stored in localStorage');
        passed++;
      } else {
        testLogger.error('Tokens not stored correctly');
        failed++;
      }
      
      // Test token refresh
      testLogger.info('Testing token refresh...');
      const refreshResult = await authService.refreshToken();
      
      if (refreshResult.success) {
        testLogger.success('Token refresh successful');
        passed++;
      } else {
        testLogger.error('Token refresh failed', refreshResult.error);
        failed++;
      }
      
      // Test logout (token clearing)
      testLogger.info('Testing logout...');
      const logoutResult = await authService.logout();
      
      if (logoutResult.success) {
        const clearedToken = localStorage.getItem('authToken');
        const clearedRefresh = localStorage.getItem('refreshToken');
        const clearedUser = localStorage.getItem('user');
        
        if (!clearedToken && !clearedRefresh && !clearedUser) {
          testLogger.success('Logout successful - tokens cleared');
          passed++;
        } else {
          testLogger.error('Logout failed - tokens not cleared');
          failed++;
        }
      } else {
        testLogger.error('Logout failed', logoutResult.error);
        failed++;
      }
      
    } catch (error) {
      testLogger.error('Token management test failed', error);
      failed++;
    }
    
    testLogger.complete('Token Management Test', passed, failed);
    return { passed, failed };
  },

  async testProtectedRoutes() {
    testLogger.start('Protected Routes Test');
    let passed = 0, failed = 0;
    
    try {
      // First, test without authentication
      testLogger.info('Testing protected route without authentication...');
      try {
        const unauthResult = await leadsService.getAllLeads();
        if (!unauthResult.success) {
          testLogger.success('Unauthenticated request correctly blocked');
          passed++;
        } else {
          testLogger.error('Unauthenticated request should have failed');
          failed++;
        }
      } catch (error) {
        if (error.response?.status === 401) {
          testLogger.success('Unauthenticated request correctly blocked with 401');
          passed++;
        } else {
          testLogger.error('Unexpected error for unauthenticated request', error);
          failed++;
        }
      }
      
      // Login first
      testLogger.info('Logging in for protected route test...');
      const loginResult = await authService.login(
        TEST_CREDENTIALS.valid.email,
        TEST_CREDENTIALS.valid.password
      );
      
      if (!loginResult.success) {
        testLogger.error('Could not login for protected route test');
        failed++;
        return { passed, failed };
      }
      
      // Test authenticated request
      testLogger.info('Testing protected route with authentication...');
      const authResult = await leadsService.getAllLeads();
      
      if (authResult.success) {
        testLogger.success('Authenticated request successful');
        testLogger.info('Leads data', {
          hasData: !!authResult.data,
          dataType: Array.isArray(authResult.data) ? 'array' : typeof authResult.data,
          count: Array.isArray(authResult.data) ? authResult.data.length : 'N/A'
        });
        passed++;
      } else {
        testLogger.error('Authenticated request failed', authResult);
        failed++;
      }
      
    } catch (error) {
      testLogger.error('Protected routes test failed', error);
      failed++;
    }
    
    testLogger.complete('Protected Routes Test', passed, failed);
    return { passed, failed };
  },

  async testDataSynchronization() {
    testLogger.start('Data Synchronization Test');
    let passed = 0, failed = 0;
    
    try {
      // Login
      const loginResult = await authService.login(
        TEST_CREDENTIALS.valid.email,
        TEST_CREDENTIALS.valid.password
      );
      
      if (!loginResult.success) {
        testLogger.error('Could not login for data sync test');
        failed++;
        return { passed, failed };
      }
      
      // Test multiple requests for consistent data
      testLogger.info('Testing data consistency across multiple requests...');
      const requests = await Promise.allSettled([
        leadsService.getAllLeads(),
        leadsService.getAllLeads(),
        leadsService.getAllLeads()
      ]);
      
      const results = requests
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      if (results.length === 3) {
        const firstCount = Array.isArray(results[0].data) ? results[0].data.length : 0;
        const allSameCount = results.every(r => 
          Array.isArray(r.data) && r.data.length === firstCount
        );
        
        if (allSameCount) {
          testLogger.success(`Data consistency verified: ${firstCount} leads across all requests`);
          passed++;
        } else {
          testLogger.error('Data inconsistency detected across requests');
          testLogger.info('Results', results.map(r => ({
            success: r.success,
            count: Array.isArray(r.data) ? r.data.length : 'N/A'
          })));
          failed++;
        }
      } else {
        testLogger.error(`Only ${results.length}/3 requests succeeded`);
        failed++;
      }
      
      // Test user profile consistency
      testLogger.info('Testing user profile consistency...');
      const profileResult = await authService.getProfile();
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (profileResult.success && profileResult.data.user.id === storedUser.id) {
        testLogger.success('User profile data is consistent');
        passed++;
      } else {
        testLogger.error('User profile inconsistency detected');
        testLogger.info('Profile result', profileResult.data?.user);
        testLogger.info('Stored user', storedUser);
        failed++;
      }
      
    } catch (error) {
      testLogger.error('Data synchronization test failed', error);
      failed++;
    }
    
    testLogger.complete('Data Synchronization Test', passed, failed);
    return { passed, failed };
  },

  async testErrorHandling() {
    testLogger.start('Error Handling Test');
    let passed = 0, failed = 0;
    
    try {
      // Test network error simulation
      testLogger.info('Testing error handling...');
      
      // Test with invalid token
      localStorage.setItem('authToken', 'invalid-token');
      
      try {
        const result = await authService.getProfile();
        if (!result.success) {
          testLogger.success('Invalid token correctly handled');
          passed++;
        } else {
          testLogger.error('Invalid token should have failed');
          failed++;
        }
      } catch (error) {
        testLogger.success('Invalid token correctly threw error');
        passed++;
      }
      
      // Clear invalid token
      localStorage.removeItem('authToken');
      
      // Test missing token
      try {
        const result = await leadsService.getAllLeads();
        if (!result.success || result.data?.length === 0) {
          testLogger.success('Missing token correctly handled');
          passed++;
        } else {
          testLogger.error('Missing token should have failed or returned empty data');
          failed++;
        }
      } catch (error) {
        if (error.response?.status === 401) {
          testLogger.success('Missing token correctly returned 401');
          passed++;
        } else {
          testLogger.error('Unexpected error for missing token', error);
          failed++;
        }
      }
      
    } catch (error) {
      testLogger.error('Error handling test failed', error);
      failed++;
    }
    
    testLogger.complete('Error Handling Test', passed, failed);
    return { passed, failed };
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Authentication Flow Tests');
  console.log('====================================');
  
  const results = {
    totalPassed: 0,
    totalFailed: 0,
    testResults: []
  };
  
  const tests = [
    { name: 'Login Flow', fn: authTests.testLogin },
    { name: 'Token Management', fn: authTests.testTokenManagement },
    { name: 'Protected Routes', fn: authTests.testProtectedRoutes },
    { name: 'Data Synchronization', fn: authTests.testDataSynchronization },
    { name: 'Error Handling', fn: authTests.testErrorHandling }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.testResults.push({ name: test.name, ...result });
      results.totalPassed += result.passed;
      results.totalFailed += result.failed;
    } catch (error) {
      testLogger.error(`Test ${test.name} crashed`, error);
      results.testResults.push({ name: test.name, passed: 0, failed: 1 });
      results.totalFailed += 1;
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final summary
  console.log('\n🎯 FINAL SUMMARY');
  console.log('================');
  results.testResults.forEach(result => {
    const status = result.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.passed} passed, ${result.failed} failed`);
  });
  
  console.log(`\n📊 OVERALL RESULTS`);
  console.log(`Total Passed: ${results.totalPassed}`);
  console.log(`Total Failed: ${results.totalFailed}`);
  console.log(`Success Rate: ${((results.totalPassed / (results.totalPassed + results.totalFailed)) * 100).toFixed(1)}%`);
  
  return results;
};

// Export for use in other modules
export { authTests, runAllTests, testLogger };
export default { authTests, runAllTests, testLogger };