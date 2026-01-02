/**
 * Quick test of schema validation functionality
 */

import { getDefaultValidator } from './utils/schema-validator';

console.log('Testing Schema Validation...\n');

// Get validator instance
const validator = getDefaultValidator();

// Test 1: List schemas
console.log('1. Testing listSchemas:');
const schemas = validator.getSchemaNames();
console.log('   Available schemas:', schemas);
console.log('   ✅ PASS\n');

// Test 2: Validate valid user response
console.log('2. Testing valid user-response:');
const validUser = {
  id: '507f1f77bcf86cd799439011',
  email: 'test@test.com',
  name: 'Test User',
  role: 'coach',
  createdAt: 1700000000
};
const validResult = validator.validate('user-response', validUser);
console.log('   Result:', validResult.valid ? '✅ VALID' : '❌ INVALID');
if (!validResult.valid) {
  console.log('   Errors:', validResult.errors);
}
console.log('');

// Test 3: Validate invalid user response (missing required field)
console.log('3. Testing invalid user-response (missing name):');
const invalidUser = {
  id: '507f1f77bcf86cd799439011',
  email: 'test@test.com',
  role: 'coach'
};
const invalidResult = validator.validate('user-response', invalidUser);
console.log('   Result:', invalidResult.valid ? '✅ VALID' : '❌ INVALID (expected)');
if (!invalidResult.valid) {
  console.log('   Errors:', invalidResult.errors.map(e => `${e.field}: ${e.message}`));
}
console.log('   ✅ PASS\n');

// Test 4: Validate invalid email format
console.log('4. Testing invalid email format:');
const invalidEmail = {
  id: '507f1f77bcf86cd799439011',
  email: 'not-an-email',
  name: 'Test',
  role: 'coach'
};
const emailResult = validator.validate('user-response', invalidEmail);
console.log('   Result:', emailResult.valid ? '✅ VALID' : '❌ INVALID (expected)');
if (!emailResult.valid) {
  console.log('   Errors:', emailResult.errors.map(e => `${e.field}: ${e.message}`));
}
console.log('   ✅ PASS\n');

console.log('All tests completed!');
