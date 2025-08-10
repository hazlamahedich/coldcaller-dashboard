#!/usr/bin/env node

/**
 * Test script to verify audio upload and custom category functionality
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testAudioUpload() {
  console.log('🧪 Testing Audio Upload with Custom Category\n');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Create a simple test audio blob (just empty file for testing)
    const testAudioData = Buffer.from('test audio data');
    
    // Create FormData with correct field name
    const formData = new FormData();
    formData.append('audioFiles', testAudioData, 'test-recording.wav');
    formData.append('name', 'Test Custom Recording');
    formData.append('category', 'custom');
    formData.append('description', 'Test recording for custom category');
    formData.append('recordedAt', new Date().toISOString());
    
    console.log('📤 Uploading test recording to /api/audio/upload...');
    console.log('   - Field name: audioFiles (should match backend expectation)');
    console.log('   - Category: custom (should be allowed now)');
    console.log('   - Backend URL: http://localhost:3001/api/audio/upload');
    
    const response = await fetch('http://localhost:3001/api/audio/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.text();
    console.log('\n📊 Upload Response:');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Body:', result);
    
    if (response.ok) {
      console.log('\n✅ SUCCESS: Audio upload completed without MulterError!');
      console.log('🎯 Custom category should now work in the audio library.');
    } else {
      console.log('\n❌ Upload failed. Response details:');
      console.log('   Status:', response.status);
      console.log('   Headers:', Object.fromEntries(response.headers));
    }
    
    // Test fetching audio files to see if custom category appears
    console.log('\n🔍 Testing audio files retrieval...');
    const filesResponse = await fetch('http://localhost:3001/api/audio/files');
    const filesResult = await filesResponse.text();
    
    console.log('📋 Files API Response:');
    console.log('   Status:', filesResponse.status, filesResponse.statusText);
    
    if (filesResponse.ok) {
      try {
        const filesData = JSON.parse(filesResult);
        console.log('   Files found:', filesData.data ? filesData.data.length : 0);
        
        // Check if any custom category files exist
        const customFiles = filesData.data ? filesData.data.filter(file => file.category === 'custom') : [];
        console.log('   Custom category files:', customFiles.length);
        
        if (customFiles.length > 0) {
          console.log('✅ Custom category files found in API response!');
          customFiles.forEach(file => {
            console.log(`   - ${file.name} (ID: ${file.id})`);
          });
        }
      } catch (e) {
        console.log('   Raw response:', filesResult.substring(0, 200) + '...');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testAudioUpload();