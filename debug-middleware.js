#!/usr/bin/env node

// Debug the exact middleware logic with step-by-step tracing
console.log('=== DEBUGGING SECURITY MIDDLEWARE LOGIC ===');
console.log('');

// Simulate the exact conditions from the middleware
const sqlPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /('(''|[^'])*')/gi,
  /(;|\||\&|\$|\+|,|\(|\)|'|\"|\`)/gi,  // Pattern 4 - Special characters
  /(\b(SLEEP|BENCHMARK|WAITFOR)\s*\()/gi,
  /(\/\*[\s\S]*?\*\/)/gi,
  /(--[\s\S]*$)/gmi,
  /(\bINTO\s+(OUTFILE|DUMPFILE))/gi,
  /(\bLOAD_FILE\s*\()/gi,
  /(\bSYSTEM\s*\()/gi
];

const phoneNumberFields = ['phoneNumber', 'phone'];

const isPhoneField = (path) => {
  const fieldName = path.split('.').pop();
  return phoneNumberFields.includes(fieldName);
};

const isValidPhoneNumber = (value) => {
  const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
  return /^\+[1-9]\d{1,14}$/.test(cleaned);
};

// Test the exact scenario from logs
const testObj = '+63 917 629 9291';
const path = 'body.phoneNumber';

console.log('Object to test:', testObj);
console.log('Path:', path);
console.log('');

console.log('Step 1: Check if phone field');
const isPhone = isPhoneField(path);
console.log('isPhoneField result:', isPhone);
console.log('');

console.log('Step 2: Test isValidPhoneNumber');
const phoneValid = isValidPhoneNumber(testObj);
console.log('isValidPhoneNumber result:', phoneValid);
console.log('');

console.log('Step 3: Test against each SQL pattern');
for (let i = 0; i < sqlPatterns.length; i++) {
  const pattern = sqlPatterns[i];
  console.log(`\nTesting Pattern ${i + 1}:`, pattern.toString());
  
  // Special handling for phone number fields and the special character pattern
  if (i === 3 && isPhone) { // Pattern 4: special characters
    console.log('  -> This is pattern 4 and phone field - checking phone validation');
    console.log('  -> isValidPhoneNumber result:', phoneValid);
    if (phoneValid) {
      console.log('  -> SKIPPING pattern 4 for valid phone');
      continue;
    } else {
      console.log('  -> Phone validation FAILED - will test pattern');
    }
  }
  
  // Reset pattern regex state
  pattern.lastIndex = 0;
  const matches = pattern.test(testObj);
  console.log('  -> Pattern matches:', matches);
  
  if (matches) {
    console.log('  -> ❌ WOULD TRIGGER SECURITY VIOLATION HERE');
    console.log('  -> Pattern that failed:', pattern.toString());
    break;
  } else {
    console.log('  -> ✅ Pattern passed');
  }
}

console.log('\n=== DEBUGGING COMPLETE ===');