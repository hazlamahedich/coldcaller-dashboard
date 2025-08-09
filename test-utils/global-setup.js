/**
 * Jest Global Setup
 * Runs once before all tests start
 */

module.exports = async () => {
  console.log('🚀 Setting up test environment...');
  
  // Set global test environment variables
  process.env.NODE_ENV = 'test';
  
  // Create test directories if needed
  const fs = require('fs').promises;
  const path = require('path');
  
  const testDirs = [
    'test-reports',
    'coverage'
  ];
  
  for (const dir of testDirs) {
    try {
      await fs.mkdir(path.join(__dirname, '..', dir), { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
  
  console.log('✅ Test environment setup complete');
};