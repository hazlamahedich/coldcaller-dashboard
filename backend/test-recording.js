#!/usr/bin/env node

/**
 * Recording System Test Script
 * Tests the complete recording workflow without authentication
 */

const fs = require('fs');
const path = require('path');
const CallRecordingModel = require('./src/models/callRecordingModel');

async function testRecordingSystem() {
  console.log('🎙️ Testing Call Recording System...\n');

  try {
    // Test 1: Generate recording path
    console.log('1. Testing recording path generation...');
    const callId = 'test-call-123';
    const recordingPath = CallRecordingModel.generateRecordingPath(callId, 'mp3');
    console.log(`   Generated path: ${recordingPath}`);

    // Test 2: Create recording metadata
    console.log('\n2. Testing metadata creation...');
    const metadata = CallRecordingModel.createRecordingMetadata(callId, recordingPath, {
      bitrate: '128kbps',
      sampleRate: '44100Hz',
      channels: 'mono'
    });
    console.log(`   Metadata:`, JSON.stringify(metadata, null, 2));

    // Test 3: Ensure directory exists
    console.log('\n3. Testing directory creation...');
    await CallRecordingModel.ensureRecordingDirectory(recordingPath);
    console.log('   ✅ Recording directory created');

    // Test 4: Create a mock recording file
    console.log('\n4. Creating mock recording file...');
    const mockAudioData = Buffer.from('Mock audio data - this would be actual audio in production');
    await fs.promises.writeFile(recordingPath, mockAudioData);
    console.log(`   ✅ Mock recording file created: ${path.basename(recordingPath)}`);

    // Test 5: Get recording info
    console.log('\n5. Testing recording file info...');
    const fileInfo = await CallRecordingModel.getRecordingInfo(recordingPath);
    console.log(`   File info:`, JSON.stringify(fileInfo, null, 2));

    // Test 6: Finalize recording metadata
    console.log('\n6. Testing metadata finalization...');
    const finalizedMetadata = await CallRecordingModel.finalizeRecording(metadata);
    console.log(`   Finalized metadata:`, JSON.stringify(finalizedMetadata, null, 2));

    // Test 7: List recordings
    console.log('\n7. Testing recording listing...');
    const recordingsList = await CallRecordingModel.listRecordings();
    console.log(`   Found ${recordingsList.length} recording(s)`);
    recordingsList.forEach((recording, index) => {
      console.log(`   ${index + 1}. ${recording.fileName} (${recording.fileSize} bytes)`);
    });

    // Test 8: File streaming test (verify file can be read)
    console.log('\n8. Testing file streaming capability...');
    const stats = await fs.promises.stat(recordingPath);
    console.log(`   ✅ File can be accessed for streaming (${stats.size} bytes)`);

    // Cleanup
    console.log('\n9. Cleanup (optional - comment out to keep test files)...');
    // await CallRecordingModel.deleteRecording(recordingPath);
    // console.log('   ✅ Test recording cleaned up');

    console.log('\n🎉 All recording tests passed!');
    console.log('\n📁 Test files location:');
    console.log(`   Recording: ${recordingPath}`);
    console.log('\n🔧 Next steps:');
    console.log('   - Test API endpoints with proper auth');
    console.log('   - Integrate with actual SIP recording');
    console.log('   - Test frontend recording controls');

  } catch (error) {
    console.error('\n❌ Recording test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  testRecordingSystem();
}

module.exports = { testRecordingSystem };