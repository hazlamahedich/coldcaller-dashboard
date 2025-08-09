#!/usr/bin/env node

// Test which specific SQL pattern is matching phone numbers

const sqlPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /('(''|[^'])*')/gi,
  /(;|\||&|\$|\+|,|\(|\)|'|"|`)/gi,  // <-- This one!
  /(\b(SLEEP|BENCHMARK|WAITFOR)\s*\()/gi,
  /(\/\*[\s\S]*?\*\/)/gi,
  /(--[\s\S]*$)/gmi,
  /(\bINTO\s+(OUTFILE|DUMPFILE))/gi,
  /(\bLOAD_FILE\s*\()/gi,
  /(\bSYSTEM\s*\()/gi
];

const testInputs = [
  "+15551234567",      // E.164 phone with +
  "15551234567",       // Phone without +  
  "555-123-4567",      // Phone with dashes
  "(555) 123-4567",    // Phone with parens
  "test-agent",        // Agent ID
  "test-campaign"      // Campaign ID
];

console.log('🔍 Testing SQL injection patterns against common inputs');
console.log('=' .repeat(60));

testInputs.forEach(input => {
  console.log(`\n📱 Testing: "${input}"`);
  
  sqlPatterns.forEach((pattern, index) => {
    if (pattern.test(input)) {
      console.log(`❌ MATCHED Pattern ${index + 1}: ${pattern}`);
      
      // Reset regex for next test
      pattern.lastIndex = 0;
    }
  });
});

console.log('\n🎯 Analysis:');
console.log('Pattern 4: /(;|\\||&|\\$|\\+|,|\\(|\\)|\'|"|`)/gi');
console.log('This pattern blocks ANY string containing: ; | & $ + , ( ) \' " `');
console.log('Phone numbers with + prefix will ALWAYS fail this check');
console.log('');
console.log('💡 Solution: Exclude phone number fields from this specific pattern');
console.log('   OR: Make pattern context-aware to allow + in phone numbers');