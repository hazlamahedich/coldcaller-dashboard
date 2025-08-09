#!/usr/bin/env node

// Test the specific pattern matching logic from our security middleware

const phoneNumberFields = ['phoneNumber', 'phone'];

const isPhoneField = (path) => {
  const fieldName = path.split('.').pop();
  return phoneNumberFields.includes(fieldName);
};

const isValidPhoneNumber = (value) => {
  // E.164 format: +1234567890 to +123456789012345
  return /^\+[1-9]\d{1,14}$/.test(value);
};

// Test the payload structure
const testPayload = {
  phoneNumber: "+15551234567",
  timestamp: "2025-08-09T03:21:18.206Z",
  leadId: 1,
  leadName: "Test Lead",
  company: "Test Company",
  notes: "Test notes",
  priority: "high"
};

const sqlPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /('(''|[^'])*')/gi,
  /(;|\||&|\$|\+|,|\(|\)|'|"|`)/gi,
  /(\b(SLEEP|BENCHMARK|WAITFOR)\s*\()/gi,
  /(\/\*[\s\S]*?\*\/)/gi,
  /(--[\s\S]*$)/gmi,
  /(\bINTO\s+(OUTFILE|DUMPFILE))/gi,
  /(\bLOAD_FILE\s*\()/gi,
  /(\bSYSTEM\s*\()/gi
];

const checkForSqlInjection = (obj, path = '') => {
  if (typeof obj === 'string') {
    console.log(`\n🔍 Checking "${obj}" at path "${path}"`);
    console.log(`   Is phone field: ${isPhoneField(path)}`);
    if (isPhoneField(path)) {
      console.log(`   Is valid phone: ${isValidPhoneNumber(obj)}`);
    }
    
    for (let i = 0; i < sqlPatterns.length; i++) {
      const pattern = sqlPatterns[i];
      
      // Special handling for phone number fields and the special character pattern
      if (i === 3 && isPhoneField(path)) { // Pattern 4: special characters
        // If this is a phone field and contains a valid phone number, skip the + check
        if (isValidPhoneNumber(obj)) {
          console.log(`   ✅ Skipping pattern ${i + 1} for valid phone number`);
          continue; // Skip this pattern for valid phone numbers
        }
      }
      
      if (pattern.test(obj)) {
        console.log(`   ❌ MATCHED Pattern ${i + 1}: ${pattern}`);
        return { matched: true, pattern: i + 1, path, value: obj };
        
        // Reset regex for next test
        pattern.lastIndex = 0;
      } else {
        // Reset regex for next test anyway
        pattern.lastIndex = 0;
      }
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = checkForSqlInjection(obj[i], `${path}[${i}]`);
      if (result) return result;
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const result = checkForSqlInjection(value, path ? `${path}.${key}` : key);
      if (result) return result;
    }
  }
  return null;
};

console.log('🧪 Testing security middleware logic');
console.log('=' .repeat(50));

const result = checkForSqlInjection(testPayload, 'body');

if (result) {
  console.log('\n🚨 SECURITY VIOLATION FOUND:');
  console.log(`   Pattern: ${result.pattern}`);
  console.log(`   Path: ${result.path}`);
  console.log(`   Value: ${result.value}`);
} else {
  console.log('\n✅ No security violations detected');
}