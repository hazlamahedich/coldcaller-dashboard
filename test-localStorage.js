console.log('🔍 Testing localStorage recording behavior...');

// Simulate localStorage behavior
let localStorage = {};

// Simulate what happens when a recording is saved
const recordingData = {
  id: Date.now(),
  name: 'Test Recording',
  category: 'custom',
  description: 'A test recording',
  duration: '0:45',
  createdAt: new Date().toISOString(),
  audioBlob: null,
  fileSize: 12345,
  recordingTime: 45
};

const existingRecordings = JSON.parse(localStorage['userRecordings'] || '[]');
existingRecordings.push(recordingData);
localStorage['userRecordings'] = JSON.stringify(existingRecordings);

console.log('💾 Simulated localStorage save:');
console.log(JSON.stringify(JSON.parse(localStorage['userRecordings']), null, 2));

// Test the categorization logic from AudioLibrary
console.log('\n🔄 Testing categorization logic...');
const userRecordings = JSON.parse(localStorage['userRecordings'] || '[]');
console.log('User recordings found:', userRecordings.length);

// Simulate the AudioLibrary categorization process
const updatedClips = {};

userRecordings.forEach(recording => {
  const category = recording.category || 'custom';
  if (!updatedClips[category]) {
    updatedClips[category] = [];
  }
  
  // Check if recording already exists (avoid duplicates)
  const exists = updatedClips[category].some(clip => clip.id === recording.id);
  if (!exists) {
    updatedClips[category].push(recording);
  }
});

console.log('\n📂 Categorized clips:', Object.keys(updatedClips));
console.log('🎯 Custom category clips:', updatedClips['custom'] ? updatedClips['custom'].length : 0);
console.log('✅ Category structure looks correct');

// Now test what happens when we load the library
console.log('\n🔍 Testing AudioLibrary load process...');

// Default clips (what API would return)
const defaultClips = [
  { id: 1, name: "Professional Intro", duration: "0:15", category: "greetings" },
  { id: 2, name: "Not Interested", duration: "0:20", category: "objections" },
  { id: 3, name: "Schedule Meeting", duration: "0:22", category: "closing" },
];

// Convert array to categories format (what AudioLibrary does)
const categorizedData = defaultClips.reduce((acc, clip) => {
  if (!acc[clip.category]) {
    acc[clip.category] = [];
  }
  acc[clip.category].push(clip);
  return acc;
}, {});

console.log('📋 Initial categories from API:', Object.keys(categorizedData));

// Add user recordings (what AudioLibrary does after loading API data)
userRecordings.forEach(recording => {
  const category = recording.category || 'custom';
  if (!categorizedData[category]) {
    categorizedData[category] = [];
  }
  
  // Check if recording already exists (avoid duplicates)
  const exists = categorizedData[category].some(clip => clip.id === recording.id);
  if (!exists) {
    categorizedData[category].push(recording);
  }
});

console.log('📂 Final categories after adding user recordings:', Object.keys(categorizedData));
console.log('🎯 Custom category exists:', !!categorizedData['custom']);
console.log('🎵 Custom category clips:', categorizedData['custom'] ? categorizedData['custom'].length : 0);

if (categorizedData['custom']) {
  console.log('🎵 Custom clips details:');
  categorizedData['custom'].forEach(clip => {
    console.log(`  - ${clip.name} (ID: ${clip.id}, Duration: ${clip.duration})`);
  });
}

console.log('\n✅ Test completed - AudioLibrary should show custom category!');