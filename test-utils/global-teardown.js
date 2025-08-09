/**
 * Jest Global Teardown
 * Runs once after all tests complete
 */

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up any global resources
  // (Database connections, temp files, etc.)
  
  console.log('✅ Test environment cleanup complete');
};