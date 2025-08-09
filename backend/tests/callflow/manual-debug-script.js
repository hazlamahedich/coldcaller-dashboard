#!/usr/bin/env node

/**
 * Manual Call Flow Debug Script
 * 
 * This script runs a series of manual tests to identify exactly where
 * the call flow breaks down. Run this script independently to debug
 * call issues without the full test suite.
 * 
 * Usage: node manual-debug-script.js
 */

const path = require('path');
const fs = require('fs');

// Setup environment
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const TwilioService = require('../../src/services/twilioService');
const SIPManager = require('../../src/services/sipManager');

console.log('🔍 VOIP Call Flow Manual Debug Script');
console.log('=====================================\n');

async function debugStep(stepName, debugFunc) {
  console.log(`🔍 ${stepName}`);
  console.log('-'.repeat(50));
  
  try {
    await debugFunc();
    console.log(`✅ ${stepName} - PASSED\n`);
  } catch (error) {
    console.log(`❌ ${stepName} - FAILED`);
    console.log(`Error: ${error.message}`);
    console.log(`Stack: ${error.stack}\n`);
    return false;
  }
  return true;
}

async function main() {
  const results = {};

  // Step 1: Environment Check
  results.environment = await debugStep('Environment Variables Check', async () => {
    const requiredVars = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN', 
      'TWILIO_PHONE_NUMBER',
      'TWILIO_API_KEY',
      'TWILIO_API_SECRET',
      'TWILIO_TWIML_APP_SID'
    ];

    const missing = [];
    const present = [];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        present.push(varName);
        console.log(`✓ ${varName}: ${value.substring(0, 10)}...`);
      } else {
        missing.push(varName);
        console.log(`✗ ${varName}: NOT SET`);
      }
    });

    console.log(`\nSummary: ${present.length}/${requiredVars.length} variables set`);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  });

  // Step 2: Twilio Service Health
  results.twilioHealth = await debugStep('Twilio Service Health Check', async () => {
    console.log('Testing Twilio service initialization...');
    
    const health = await TwilioService.healthCheck();
    console.log('Health check result:', JSON.stringify(health, null, 2));
    
    if (health.status !== 'healthy') {
      throw new Error(`Twilio service unhealthy: ${health.error || health.message}`);
    }

    console.log(`Account SID: ${health.accountSid}`);
    console.log(`Account Status: ${health.accountStatus}`);
    console.log(`Account Type: ${health.type}`);
  });

  // Step 3: Phone Number Validation
  results.phoneValidation = await debugStep('Phone Number Validation Test', async () => {
    const testNumbers = [
      '+1234567890',
      '1234567890',
      '+44207123456789',
      '(555) 123-4567'
    ];

    console.log('Testing phone number validation...');
    
    for (const phoneNumber of testNumbers) {
      try {
        const validation = await TwilioService.validatePhoneNumber(phoneNumber);
        console.log(`${phoneNumber}: ${validation.success && validation.valid ? '✓ Valid' : '✗ Invalid'}`);
        
        if (!validation.success) {
          console.log(`  Error: ${validation.error}`);
        }
      } catch (error) {
        console.log(`${phoneNumber}: ✗ Exception - ${error.message}`);
      }
    }
  });

  // Step 4: Access Token Generation
  results.accessToken = await debugStep('Access Token Generation', async () => {
    console.log('Testing access token generation...');
    
    const identity = 'debug-user-' + Date.now();
    const tokenData = TwilioService.getClientConfig(identity);
    
    console.log('Token data structure:', {
      hasAccessToken: !!tokenData.accessToken,
      identity: tokenData.identity,
      expires: tokenData.expires,
      configKeys: Object.keys(tokenData.config || {})
    });

    if (!tokenData.accessToken) {
      throw new Error('Access token generation failed');
    }

    // Try to decode JWT token (basic validation)
    const tokenParts = tokenData.accessToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid JWT token format');
    }

    console.log('✓ JWT token has valid structure (3 parts)');
  });

  // Step 5: SIP Manager Test
  results.sipManager = await debugStep('SIP Manager Integration', async () => {
    console.log('Testing SIP Manager...');
    
    // Test registration status
    const regStatus = await SIPManager.getRegistrationStatus();
    console.log('Registration status:', JSON.stringify(regStatus, null, 2));

    // Test call initiation
    const testCallData = {
      id: 'debug-call-' + Date.now(),
      phoneNumber: '+1234567890'
    };

    console.log('Initiating test call...');
    const callResult = await SIPManager.initiateCall(testCallData);
    console.log('Call initiation result:', JSON.stringify(callResult, null, 2));

    if (!callResult.success) {
      throw new Error(`SIP call initiation failed: ${callResult.error}`);
    }

    // Test call metrics
    const metrics = SIPManager.getCallMetrics();
    console.log('Call metrics:', JSON.stringify(metrics, null, 2));

    // Clean up - end the test call
    setTimeout(async () => {
      try {
        await SIPManager.endCall(testCallData.id);
        console.log('Test call cleaned up');
      } catch (e) {
        console.log('Call cleanup error:', e.message);
      }
    }, 1000);
  });

  // Step 6: TwiML Generation
  results.twiml = await debugStep('TwiML Generation', async () => {
    console.log('Testing TwiML generation...');
    
    const testActions = [
      {
        type: 'say',
        text: 'Hello, this is a test call from ColdCaller.',
        options: { voice: 'alice', language: 'en-US' }
      },
      {
        type: 'dial',
        options: { timeout: 30, record: 'record-from-answer' },
        number: '+1234567890'
      }
    ];

    const twiml = TwilioService.generateTwiML(testActions);
    console.log('Generated TwiML:');
    console.log(twiml);

    // Basic validation
    if (!twiml.includes('<Response>')) {
      throw new Error('TwiML missing Response element');
    }

    if (!twiml.includes('<Say>')) {
      throw new Error('TwiML missing Say element');
    }

    if (!twiml.includes('<Dial>')) {
      throw new Error('TwiML missing Dial element');
    }

    console.log('✓ TwiML structure validation passed');
  });

  // Step 7: Real Twilio API Test (if credentials are valid)
  if (results.twilioHealth) {
    results.twilioApi = await debugStep('Real Twilio API Call Test', async () => {
      console.log('⚠️ This will make a real Twilio API call (may incur charges)');
      console.log('Testing with a test phone number that should fail gracefully...');
      
      // Use a test number that Twilio recognizes but won't actually call
      const testNumber = '+15005550006'; // Twilio test number for invalid phone
      
      const callResult = await TwilioService.makeCall(
        process.env.TWILIO_PHONE_NUMBER,
        testNumber,
        {
          url: 'https://demo.twilio.com/docs/voice.xml', // Twilio demo TwiML
          timeout: 10
        }
      );

      console.log('Twilio API call result:', JSON.stringify(callResult, null, 2));
      
      // This test is successful if we get a proper response structure,
      // even if the call fails due to invalid number
      if (callResult.hasOwnProperty('success')) {
        if (callResult.success) {
          console.log('✓ Twilio API call succeeded');
          console.log(`Call SID: ${callResult.callSid}`);
        } else {
          console.log('✓ Twilio API responded properly (call failed as expected for test number)');
          console.log(`Error: ${callResult.error}`);
          console.log(`Code: ${callResult.code}`);
        }
      } else {
        throw new Error('Unexpected Twilio API response format');
      }
    });
  }

  // Summary Report
  console.log('\n🎯 DEBUG SUMMARY REPORT');
  console.log('='.repeat(50));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((passedTests/totalTests) * 100)}%\n`);

  Object.entries(results).forEach(([testName, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${testName}`);
  });

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Call flow should be working.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the failed tests above for issues.');
    
    // Specific recommendations based on failures
    if (!results.environment) {
      console.log('\n💡 Recommendation: Set up missing Twilio environment variables');
    }
    
    if (!results.twilioHealth) {
      console.log('\n💡 Recommendation: Check Twilio account status and credentials');
    }
    
    if (!results.phoneValidation) {
      console.log('\n💡 Recommendation: Review phone number validation logic');
    }
    
    if (!results.accessToken) {
      console.log('\n💡 Recommendation: Check Twilio API keys for Voice SDK');
    }
    
    if (!results.sipManager) {
      console.log('\n💡 Recommendation: Review SIP Manager implementation');
    }
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Fix any failed tests above');
  console.log('2. Run the comprehensive test suite: npm test');
  console.log('3. Test actual call flow with real phone numbers');
  console.log('4. Monitor Twilio console for call logs and errors');
}

// Run the debug script
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Debug script crashed:', error.message);
    process.exit(1);
  });
}

module.exports = { main, debugStep };