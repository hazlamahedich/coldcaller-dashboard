/**
 * Test script to verify custom category functionality
 */

const { dummyAudioClipsArray, convertAudioClipsToCategories } = require('./src/data/dummyData.js');

console.log('🧪 Testing Custom Category Functionality\n');

console.log('📋 Original dummy clips array length:', dummyAudioClipsArray.length);
console.log('📋 Categories in array:');
const categories = [...new Set(dummyAudioClipsArray.map(clip => clip.category))];
categories.forEach(category => {
  const count = dummyAudioClipsArray.filter(clip => clip.category === category).length;
  console.log(`  - ${category}: ${count} clips`);
});

console.log('\n🔄 Converting to categorized format...');
const categorizedData = convertAudioClipsToCategories(dummyAudioClipsArray);

console.log('📂 Categories in converted data:');
Object.keys(categorizedData).forEach(category => {
  console.log(`  - ${category}: ${categorizedData[category].length} clips`);
  categorizedData[category].forEach(clip => {
    console.log(`    * ${clip.name} (ID: ${clip.id})`);
  });
});

// Test custom category specifically
console.log('\n🎯 Custom category test:');
if (categorizedData['custom']) {
  console.log('✅ Custom category exists!');
  console.log('🎤 Custom clips:');
  categorizedData['custom'].forEach(clip => {
    console.log(`  - ${clip.name} (${clip.duration})`);
  });
} else {
  console.log('❌ Custom category not found');
}

console.log('\n📊 Summary:');
console.log(`Total categories: ${Object.keys(categorizedData).length}`);
console.log(`Total clips: ${Object.values(categorizedData).flat().length}`);
console.log(`Custom category clips: ${categorizedData['custom'] ? categorizedData['custom'].length : 0}`);

console.log('\n✅ Test completed - Custom category should now appear in AudioClips component!');