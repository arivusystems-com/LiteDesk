const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizePeopleTypeDefsForSave } = require('../tenantMetadata');

test('sanitizePeopleTypeDefsForSave: fields validated against allowedFieldKeys', () => {
  const allowed = new Set(['lead_status', 'contact_status']);
  const r = sanitizePeopleTypeDefsForSave(
    [{ value: 'Lead', color: 'indigo', fields: ['lead_status'] }],
    { allowedFieldKeys: allowed }
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.typeDefs[0].fields, ['lead_status']);
});

test('sanitizePeopleTypeDefsForSave: rejects unknown field when allowlist non-empty', () => {
  const allowed = new Set(['lead_status']);
  const r = sanitizePeopleTypeDefsForSave(
    [{ value: 'Lead', color: 'indigo', fields: ['not_a_field'] }],
    { allowedFieldKeys: allowed }
  );
  assert.equal(r.ok, false);
  assert.match(String(r.message), /Invalid field/);
});

test('sanitizePeopleTypeDefsForSave: canonicalizes field key casing from allowlist', () => {
  const allowed = new Set(['lead_status']);
  const r = sanitizePeopleTypeDefsForSave(
    [{ value: 'Lead', color: 'indigo', fields: ['LEAD_STATUS'] }],
    { allowedFieldKeys: allowed }
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.typeDefs[0].fields, ['lead_status']);
});

test('sanitizePeopleTypeDefsForSave: dedupes fields case-insensitively', () => {
  const allowed = new Set(['lead_status', 'contact_status']);
  const r = sanitizePeopleTypeDefsForSave(
    [{ value: 'Lead', color: 'indigo', fields: ['lead_status', 'Lead_Status'] }],
    { allowedFieldKeys: allowed }
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.typeDefs[0].fields, ['lead_status']);
});

test('sanitizePeopleTypeDefsForSave: empty fields array persists explicit empty list', () => {
  const allowed = new Set(['lead_status']);
  const r = sanitizePeopleTypeDefsForSave(
    [{ value: 'Lead', color: 'indigo', fields: [] }],
    { allowedFieldKeys: allowed }
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.typeDefs[0].fields, []);
});

test('sanitizePeopleTypeDefsForSave: non-empty fields with empty allowlist fails', () => {
  const r = sanitizePeopleTypeDefsForSave(
    [{ value: 'Lead', color: 'indigo', fields: ['lead_status'] }],
    { allowedFieldKeys: new Set() }
  );
  assert.equal(r.ok, false);
  assert.match(String(r.message), /not available/);
});

test('sanitizePeopleTypeDefsForSave: string entries unchanged (no fields)', () => {
  const allowed = new Set(['lead_status']);
  const r = sanitizePeopleTypeDefsForSave(['Lead', 'Contact'], { allowedFieldKeys: allowed });
  assert.equal(r.ok, true);
  assert.equal(r.typeDefs.length, 2);
  assert.equal(Object.prototype.hasOwnProperty.call(r.typeDefs[0], 'fields'), false);
});
