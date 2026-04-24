const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  validateCaseRecordId,
  normalizeRelatedItemIds,
  normalizeOptionalText
} = require('../caseApiValidators');

test('validateCaseRecordId rejects invalid id', () => {
  const result = validateCaseRecordId('not-an-id');
  assert.equal(result.valid, false);
});

test('validateCaseRecordId accepts valid object id', () => {
  const id = new mongoose.Types.ObjectId().toString();
  const result = validateCaseRecordId(id);
  assert.equal(result.valid, true);
});

test('normalizeRelatedItemIds deduplicates and validates object ids', () => {
  const id = new mongoose.Types.ObjectId().toString();
  const another = new mongoose.Types.ObjectId().toString();
  const result = normalizeRelatedItemIds([id, another, id]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.ids, [id, another]);
});

test('normalizeRelatedItemIds fails on malformed ids', () => {
  const id = new mongoose.Types.ObjectId().toString();
  const result = normalizeRelatedItemIds([id, 'broken']);
  assert.equal(result.valid, false);
});

test('normalizeOptionalText enforces max length and trimming', () => {
  const result = normalizeOptionalText('  hello  ', 20);
  assert.equal(result.valid, true);
  assert.equal(result.value, 'hello');
  const overflow = normalizeOptionalText('x'.repeat(21), 20);
  assert.equal(overflow.valid, false);
});
