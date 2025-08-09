#!/usr/bin/env node

// Debug script to test POST /calls/start API endpoint
// This will help identify the exact 400 Bad Request issue

const axios = require('axios');

// Test different payload variations
const testPayloads = [
  // 1. Current frontend payload (what DialPad sends)
  {
    name: "Frontend payload (current)",
    payload: {
      phoneNumber: "+15551234567",
      timestamp: new Date().toISOString(),
      leadId: 1,
      leadName: "Test Lead",
      company: "Test Company",
      notes: "Test notes",
      priority: "high"
    }
  },
  
  // 2. Backend expected payload (from validation rules)
  {
    name: "Backend expected payload",
    payload: {
      phoneNumber: "+15551234567", // E.164 format required
      leadId: 1,
      agentId: "test-agent",
      campaignId: "test-campaign"
    }
  },
  
  // 3. Minimal required payload
  {
    name: "Minimal payload",
    payload: {
      phoneNumber: "+15551234567"
    }
  },
  
  // 4. Invalid phone number format
  {
    name: "Invalid phone format",
    payload: {
      phoneNumber: "555-123-4567", // Not E.164 format
      leadId: 1
    }
  }
];

async function testAPIEndpoint() {
  const baseURL = 'http://localhost:3001/api';
  
  console.log('🔍 Testing POST /calls/start API endpoint');
  console.log('=' .repeat(50));
  
  for (const test of testPayloads) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log('Payload:', JSON.stringify(test.payload, null, 2));
    
    try {
      const response = await axios.post(`${baseURL}/calls/start`, test.payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('✅ SUCCESS:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log('❌ ERROR:', error.response?.status || 'Network Error');
      
      if (error.response?.data) {
        console.log('Error Details:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('Error Message:', error.message);
      }
      
      // Log validation errors specifically
      if (error.response?.data?.error?.details) {
        console.log('🚨 Validation Errors:');
        error.response.data.error.details.forEach((detail, idx) => {
          console.log(`  ${idx + 1}. Field: ${detail.path || detail.param}`);
          console.log(`     Value: ${detail.value}`);
          console.log(`     Error: ${detail.msg}`);
        });
      }
    }
    
    console.log('-'.repeat(40));
  }
  
  console.log('\n🎯 Debugging Summary:');
  console.log('1. Check phone number format - must be E.164 (+1234567890)');
  console.log('2. Check required vs optional fields in validation');  
  console.log('3. Check if middleware is interfering with request');
  console.log('4. Check if Content-Type header is properly set');
}

// Run the test
testAPIEndpoint().catch(console.error);