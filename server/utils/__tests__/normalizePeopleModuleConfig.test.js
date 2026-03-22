const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePeopleModuleFields,
  migratePeopleQuickCreateKeys,
  migratePeopleQuickCreateLayoutKeys,
} = require('../normalizePeopleModuleConfig');

test('normalizePeopleModuleFields drops legacy type when sales_type exists', () => {
  const fields = [
    { key: 'first_name', label: 'First' },
    { key: 'sales_type', label: 'Type', isVirtual: true, appKey: 'SALES' },
    { key: 'type', label: 'Old', options: ['Lead'] },
  ];
  const out = normalizePeopleModuleFields(fields);
  assert.equal(out.some((f) => String(f.key).toLowerCase() === 'type'), false);
  assert.equal(out.some((f) => String(f.key).toLowerCase() === 'sales_type'), true);
});

test('normalizePeopleModuleFields renames lone type to sales_type', () => {
  const fields = [{ key: 'type', label: 'Role', required: true }];
  const out = normalizePeopleModuleFields(fields);
  assert.equal(out.length, 1);
  assert.equal(out[0].key, 'sales_type');
  assert.equal(out[0].isVirtual, true);
  assert.equal(out[0].appKey, 'SALES');
  assert.equal(out[0].required, true);
});

test('migratePeopleQuickCreateKeys maps type to sales_type and dedupes', () => {
  assert.deepEqual(migratePeopleQuickCreateKeys(['first_name', 'type']), ['first_name', 'sales_type']);
  assert.deepEqual(migratePeopleQuickCreateKeys(['type', 'sales_type']), ['sales_type']);
});

test('migratePeopleQuickCreateLayoutKeys rewrites fieldKey type', () => {
  const layout = {
    version: 1,
    rows: [{ cols: [{ fieldKey: 'type', widget: 'x' }] }],
  };
  const out = migratePeopleQuickCreateLayoutKeys(layout);
  assert.equal(out.rows[0].cols[0].fieldKey, 'sales_type');
  assert.equal(out.rows[0].cols[0].widget, 'x');
});
