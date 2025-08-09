/**
 * Jest Test Results Processor
 * Post-processes test results for additional reporting and analysis
 */

module.exports = (results) => {
  // Basic result processing
  const processedResults = {
    ...results,
    processedAt: new Date().toISOString(),
    summary: {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      pendingTests: results.numPendingTests,
      success: results.success,
      testResults: results.testResults?.length || 0
    }
  };

  // Log summary to console
  console.log('\n🧪 Test Results Summary:');
  console.log(`✅ Passed: ${processedResults.summary.passedTests}`);
  console.log(`❌ Failed: ${processedResults.summary.failedTests}`);
  console.log(`⏸️  Pending: ${processedResults.summary.pendingTests}`);
  console.log(`📊 Total: ${processedResults.summary.totalTests}`);
  console.log(`🎯 Success: ${processedResults.summary.success ? 'YES' : 'NO'}\n`);

  return processedResults;
};