/**
 * Debug script to test audio clips data loading and custom category handling
 */

const { audioService } = require('./src/services/audioService.js');

async function debugAudioClips() {
  console.log('🔍 Debugging Audio Clips Data Loading...\n');
  
  try {
    // Test 1: Load all audio clips
    console.log('📋 Test 1: Loading all audio clips from API...');
    const response = await audioService.getAllAudioClips();
    
    console.log('Response success:', response.success);
    console.log('Response data type:', typeof response.data);
    console.log('Response data length:', response.data ? response.data.length : 'N/A');
    
    if (response.success && response.data && response.data.length > 0) {
      console.log('\n📊 Audio clips data structure:');
      response.data.forEach((clip, index) => {
        console.log(`  ${index + 1}. ${clip.name} (Category: ${clip.category}, ID: ${clip.id})`);
      });
      
      // Group by categories like the component does
      const categorizedData = response.data.reduce((acc, clip) => {
        if (!acc[clip.category]) {
          acc[clip.category] = [];
        }
        acc[clip.category].push(clip);
        return acc;
      }, {});
      
      console.log('\n📂 Categories found:');
      Object.keys(categorizedData).forEach(category => {
        console.log(`  - ${category}: ${categorizedData[category].length} clips`);
      });
      
      // Check for custom category specifically
      if (categorizedData['custom']) {
        console.log('\n✅ Custom category found with clips:');
        categorizedData['custom'].forEach(clip => {
          console.log(`  - ${clip.name} (ID: ${clip.id})`);
        });
      } else {
        console.log('\n❌ Custom category not found in data');
      }
      
    } else {
      console.log('\n⚠️ No audio clips returned from API or API failed');
      console.log('Response message:', response.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error testing audio clips:', error);
    
    // Test with fallback data
    console.log('\n📋 Test 2: Testing with fallback/dummy data...');
    try {
      const fallbackResponse = await audioService.getDefaultAudioClips();
      console.log('Fallback success:', fallbackResponse.success);
      console.log('Fallback data keys:', Object.keys(fallbackResponse.data || {}));
      
      if (fallbackResponse.data && fallbackResponse.data.custom) {
        console.log('Custom category in fallback:', fallbackResponse.data.custom.length, 'clips');
      }
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }
  }
}

// Simulate a recording upload to custom category
async function simulateCustomUpload() {
  console.log('\n🎤 Test 3: Simulating custom category recording upload...\n');
  
  try {
    // Create mock form data for a custom recording
    const mockFormData = new FormData();
    
    // Create a mock audio blob (empty for testing)
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
    
    mockFormData.append('audio', mockBlob, 'test-recording.webm');
    mockFormData.append('name', 'Test Custom Recording');
    mockFormData.append('category', 'custom');
    mockFormData.append('description', 'A test recording for custom category');
    mockFormData.append('recordedAt', new Date().toISOString());
    
    console.log('📤 Mock form data prepared:');
    console.log('  - Name: Test Custom Recording');
    console.log('  - Category: custom');
    console.log('  - Description: A test recording for custom category');
    
    // Test upload
    const uploadResponse = await audioService.uploadAudioClip(mockFormData, (progress) => {
      console.log(`  Upload progress: ${progress}%`);
    });
    
    console.log('\n📨 Upload response:');
    console.log('  Success:', uploadResponse.success);
    console.log('  Message:', uploadResponse.message);
    
    if (uploadResponse.success) {
      console.log('  Uploaded clip data:', uploadResponse.data);
      
      // Reload clips to see if custom category appears
      console.log('\n🔄 Reloading clips to check for custom category...');
      await debugAudioClips();
    }
    
  } catch (error) {
    console.error('❌ Upload simulation failed:', error);
  }
}

// Run debug tests
async function runDebugTests() {
  console.log('🚀 Starting Audio Clips Debug Tests\n');
  console.log('=' .repeat(50));
  
  await debugAudioClips();
  
  console.log('\n' + '=' .repeat(50));
  
  await simulateCustomUpload();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Debug tests completed');
}

// Run if called directly
if (require.main === module) {
  runDebugTests().catch(console.error);
}

module.exports = {
  debugAudioClips,
  simulateCustomUpload,
  runDebugTests
};