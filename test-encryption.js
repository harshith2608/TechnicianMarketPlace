#!/usr/bin/env node

/**
 * Simple standalone test runner for encryption utils
 * This runs outside of Jest to avoid Expo dependency issues
 */

const {
  encryptPayoutData,
  decryptPayoutData,
  encryptValue,
  decryptValue,
} = require('./src/utils/encryptionUtils');

let passedTests = 0;
let failedTests = 0;
const results = [];

function assert(condition, testName) {
  if (condition) {
    passedTests++;
    results.push(`✅ ${testName}`);
  } else {
    failedTests++;
    results.push(`❌ ${testName}`);
  }
}

function assertEqual(actual, expected, testName) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passedTests++;
    results.push(`✅ ${testName}`);
  } else {
    failedTests++;
    results.push(`❌ ${testName} - Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('\n========================================');
console.log('  Encryption Utility Test Suite');
console.log('========================================\n');

// Test 1: Encrypt and decrypt bank account data
try {
  const testData = {
    accountNumber: '123456789012345',
    ifscCode: 'HDFC0000001',
    accountHolderName: 'John Doe',
    method: 'bank',
    autoPayoutEnabled: true,
    updatedAt: '2024-01-20T10:00:00Z',
  };

  const encrypted = encryptPayoutData(testData);
  const decrypted = decryptPayoutData(encrypted);

  assertEqual(decrypted, testData, '1. Bank account data round-trip');
} catch (e) {
  failedTests++;
  results.push(`❌ 1. Bank account data round-trip - ${e.message}`);
}

// Test 2: Encrypt and decrypt UPI data
try {
  const testData = {
    upiId: 'john@okhdfcbank',
    method: 'upi',
    autoPayoutEnabled: false,
    updatedAt: '2024-01-20T10:00:00Z',
  };

  const encrypted = encryptPayoutData(testData);
  const decrypted = decryptPayoutData(encrypted);

  assertEqual(decrypted, testData, '2. UPI data round-trip');
} catch (e) {
  failedTests++;
  results.push(`❌ 2. UPI data round-trip - ${e.message}`);
}

// Test 3: Verify encrypted data is different from original
try {
  const testData = {
    accountNumber: '9876543210123',
    method: 'bank',
  };

  const encrypted = encryptPayoutData(testData);

  assert(
    encrypted.accountNumber !== testData.accountNumber,
    '3. Encrypted data differs from original'
  );
} catch (e) {
  failedTests++;
  results.push(`❌ 3. Encrypted data differs from original - ${e.message}`);
}

// Test 4: Single value encryption/decryption
try {
  const value = '123456789012345';
  const encrypted = encryptValue(value);
  const decrypted = decryptValue(encrypted);

  assertEqual(decrypted, value, '4. Single value encryption/decryption');
} catch (e) {
  failedTests++;
  results.push(`❌ 4. Single value encryption/decryption - ${e.message}`);
}

// Test 5: Special characters handling
try {
  const value = 'test@bank-with_special.chars!';
  const encrypted = encryptValue(value);
  const decrypted = decryptValue(encrypted);

  assertEqual(decrypted, value, '5. Special characters handling');
} catch (e) {
  failedTests++;
  results.push(`❌ 5. Special characters handling - ${e.message}`);
}

// Test 6: Numeric string handling
try {
  const value = '123456789';
  const encrypted = encryptValue(value);
  const decrypted = decryptValue(encrypted);

  assertEqual(decrypted, value, '6. Numeric string handling');
} catch (e) {
  failedTests++;
  results.push(`❌ 6. Numeric string handling - ${e.message}`);
}

// Test 7: Null data should throw error
try {
  encryptPayoutData(null);
  failedTests++;
  results.push(`❌ 7. Null data validation - Should have thrown error`);
} catch (e) {
  passedTests++;
  results.push(`✅ 7. Null data validation`);
}

// Test 8: Empty value should throw error
try {
  encryptValue('');
  failedTests++;
  results.push(`❌ 8. Empty value validation - Should have thrown error`);
} catch (e) {
  passedTests++;
  results.push(`✅ 8. Empty value validation`);
}

// Test 9: Multiple iterations should maintain data integrity
try {
  const original = {
    accountNumber: '9876543210123456',
    ifscCode: 'HDFC0000123',
    accountHolderName: 'Test User',
    method: 'bank',
    autoPayoutEnabled: false,
  };

  let data = original;
  for (let i = 0; i < 3; i++) {
    const encrypted = encryptPayoutData(data);
    data = decryptPayoutData(encrypted);
  }

  assertEqual(data, original, '9. Multiple iteration data integrity');
} catch (e) {
  failedTests++;
  results.push(`❌ 9. Multiple iteration data integrity - ${e.message}`);
}

// Test 10: Unicode characters handling
try {
  const value = 'John Döe 张三 مجموعة';
  const encrypted = encryptValue(value);
  const decrypted = decryptValue(encrypted);

  assertEqual(decrypted, value, '10. Unicode characters handling');
} catch (e) {
  failedTests++;
  results.push(`❌ 10. Unicode characters handling - ${e.message}`);
}

// Print results
console.log(results.join('\n'));

console.log('\n========================================');
console.log(`Total Tests: ${passedTests + failedTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log('========================================\n');

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);
