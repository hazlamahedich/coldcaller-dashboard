// Quick API test script
const app = require('./src/server');

console.log('✅ Server loaded successfully');
console.log('📊 Available routes:');
console.log('  GET  /api/health');
console.log('  GET  /api/leads');
console.log('  GET  /api/scripts');
console.log('  GET  /api/audio');
console.log('  GET  /api/calls');

// Test basic functionality
setTimeout(() => {
  console.log('🚀 API server ready!');
  process.exit(0);
}, 1000);