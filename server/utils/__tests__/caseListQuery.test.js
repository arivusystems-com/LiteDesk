const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCaseListQuery } = require('../caseListQuery');

const constants = {
  CASE_STATUSES: ['New', 'Assigned'],
  CASE_PRIORITIES: ['Low', 'Medium'],
  CASE_TYPES: ['Support Ticket'],
  CASE_CHANNELS: ['Email', 'Internal']
};

test('parseCaseListQuery validates filters and defaults sorting', () => {
  const result = parseCaseListQuery({}, constants);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.filters, {});
  assert.equal(result.limit, 50);
  assert.equal(result.skip, 0);
  assert.deepEqual(result.sort, { updatedAt: -1 });
});

test('parseCaseListQuery rejects unknown enum filters', () => {
  const result = parseCaseListQuery({ status: 'Closed', channel: 'Phone' }, constants);
  assert.equal(result.errors.length, 2);
});

test('parseCaseListQuery accepts valid filters and sort params', () => {
  const result = parseCaseListQuery(
    {
      status: 'New',
      priority: 'Low',
      caseType: 'Support Ticket',
      channel: 'Email',
      sortBy: 'createdAt',
      sortDir: 'asc',
      limit: '500',
      skip: '12'
    },
    constants
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.filters.status, 'New');
  assert.equal(result.limit, 200);
  assert.equal(result.skip, 12);
  assert.deepEqual(result.sort, { createdAt: 1 });
});
