#!/usr/bin/env node

/**
 * Simple test runner for field governance tests
 * 
 * Run with: node tests/runFieldGovernanceTests.js
 */

const {
  canReadField,
  canWriteField,
  filterFieldsByReadAccess,
  filterFieldsByWriteAccess,
  validateFieldWrite
} = require('../utils/fieldAccessControl');

// Test utilities
const createField = (key, owner, context) => ({ key, owner, context });
const createUser = (isOwner, permissions = {}, appAccess = []) => ({
  isOwner,
  permissions,
  appAccess
});

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || (typeof result === 'object' && result.allowed === true)) {
      testsPassed++;
      console.log(`✅ ${name}`);
      return true;
    } else {
      testsFailed++;
      console.log(`❌ ${name}`);
      return false;
    }
  } catch (error) {
    testsFailed++;
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('🧪 Field Governance Tests\n');
console.log('='.repeat(60));

// 1. Field Ownership Rules
console.log('\n1. Field Ownership Rules');
console.log('-'.repeat(60));

const platformField = createField('platformField', 'platform', 'global');
const appField = createField('appField', 'app', 'sales');
const orgField = createField('orgField', 'org', 'global');

test('Platform: Owners can read', () => {
  const owner = createUser(true);
  return canReadField(platformField, owner, 'people');
});

test('Platform: Owners can write', () => {
  const owner = createUser(true);
  return canWriteField(platformField, owner, 'people');
});

test('Platform: Regular users CANNOT write', () => {
  const user = createUser(false, { contacts: { edit: true } });
  return !canWriteField(platformField, user, 'people');
});

test('App: Users with app access can write', () => {
  const user = createUser(false, 
    { contacts: { edit: true } },
    [{ appKey: 'SALES', status: 'ACTIVE' }]
  );
  return canWriteField(appField, user, 'people');
});

test('App: Users without app access CANNOT write', () => {
  const user = createUser(false, { contacts: { edit: true } });
  return !canWriteField(appField, user, 'people');
});

test('Org: Users with edit permission can write', () => {
  const user = createUser(false, { contacts: { edit: true } });
  return canWriteField(orgField, user, 'people');
});

test('Org: Users without edit permission CANNOT write', () => {
  const user = createUser(false, { contacts: { view: true } });
  return !canWriteField(orgField, user, 'people');
});

// 2. Access Control Rules
console.log('\n2. Access Control Rules');
console.log('-'.repeat(60));

const fields = [platformField, appField, orgField];

test('READ: Owners can read all fields', () => {
  const owner = createUser(true);
  const filtered = filterFieldsByReadAccess(fields, owner, 'people');
  return filtered.length === 3;
});

test('READ: Users with view permission can read all fields', () => {
  const user = createUser(false, { contacts: { view: true } });
  const filtered = filterFieldsByReadAccess(fields, user, 'people');
  return filtered.length === 3;
});

test('READ: Users without view permission cannot read', () => {
  const user = createUser(false, {});
  const filtered = filterFieldsByReadAccess(fields, user, 'people');
  return filtered.length === 0;
});

test('WRITE: Owners can write all fields', () => {
  const owner = createUser(true);
  const filtered = filterFieldsByWriteAccess(fields, owner, 'people');
  return filtered.length === 3;
});

test('WRITE: Users can only write app/org fields (not platform)', () => {
  const user = createUser(false, 
    { contacts: { edit: true } },
    [{ appKey: 'SALES', status: 'ACTIVE' }]
  );
  const filtered = filterFieldsByWriteAccess(fields, user, 'people');
  return filtered.length === 2 && 
         filtered.some(f => f.key === 'appField') &&
         filtered.some(f => f.key === 'orgField');
});

// 3. Field Write Validation
console.log('\n3. Field Write Validation');
console.log('-'.repeat(60));

test('Validation: Owner can write platform field', () => {
  const owner = createUser(true);
  const result = validateFieldWrite('platformField', fields, owner, 'people');
  return result.allowed === true;
});

test('Validation: User CANNOT write platform field', () => {
  const user = createUser(false, { contacts: { edit: true } });
  const result = validateFieldWrite('platformField', fields, user, 'people');
  return result.allowed === false && result.reason.includes('Platform');
});

test('Validation: User CAN write org field', () => {
  const user = createUser(false, { contacts: { edit: true } });
  const result = validateFieldWrite('orgField', fields, user, 'people');
  return result.allowed === true;
});

test('Validation: User with app access CAN write app field', () => {
  const user = createUser(false, 
    { contacts: { edit: true } },
    [{ appKey: 'SALES', status: 'ACTIVE' }]
  );
  const result = validateFieldWrite('appField', fields, user, 'people');
  return result.allowed === true;
});

test('Validation: User without app access CANNOT write app field', () => {
  const user = createUser(false, { contacts: { edit: true } });
  const result = validateFieldWrite('appField', fields, user, 'people');
  return result.allowed === false && result.reason.includes('App-managed');
});

// 4. Edge Cases
console.log('\n4. Edge Cases');
console.log('-'.repeat(60));

test('Edge: Missing user denies access', () => {
  return !canReadField(platformField, null, 'people') &&
         !canWriteField(platformField, null, 'people');
});

test('Edge: Missing field returns false', () => {
  const user = createUser(false, { contacts: { view: true, edit: true } });
  return !canReadField(null, user, 'people') &&
         !canWriteField(null, user, 'people');
});

test('Edge: Empty fields array returns empty', () => {
  const user = createUser(false, { contacts: { view: true } });
  const readFiltered = filterFieldsByReadAccess([], user, 'people');
  const writeFiltered = filterFieldsByWriteAccess([], user, 'people');
  return readFiltered.length === 0 && writeFiltered.length === 0;
});

test('Edge: Unknown field returns allowed (backward compatibility)', () => {
  const user = createUser(false, { contacts: { edit: true } });
  const result = validateFieldWrite('unknownField', fields, user, 'people');
  return result.allowed === true;
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Summary:');
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);
console.log(`   📈 Total:  ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the output above.');
  process.exit(1);
}

