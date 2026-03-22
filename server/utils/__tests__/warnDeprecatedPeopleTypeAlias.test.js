'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { helpdeskTypeAliasViolation, peopleLegacyTopLevelTypeViolation } = require('../warnDeprecatedPeopleTypeAlias');

describe('helpdeskTypeAliasViolation', () => {
  it('returns 400 body when HELPDESK payload uses legacy type', () => {
    const v = helpdeskTypeAliasViolation('HELPDESK', { type: 'Customer' });
    assert.strictEqual(v.status, 400);
    assert.strictEqual(v.body.code, 'HELPDESK_USE_HELPDESK_ROLE');
    assert.match(v.body.message, /helpdesk_role/);
  });

  it('returns null for SALES with type (SALES uses peopleLegacyTopLevelTypeViolation)', () => {
    assert.strictEqual(helpdeskTypeAliasViolation('SALES', { type: 'Lead' }), null);
  });

  it('returns null when HELPDESK uses helpdesk_role only', () => {
    assert.strictEqual(
      helpdeskTypeAliasViolation('HELPDESK', { helpdesk_role: 'Customer' }),
      null
    );
  });
});

describe('peopleLegacyTopLevelTypeViolation', () => {
  it('returns 400 when payload has top-level type', () => {
    const v = peopleLegacyTopLevelTypeViolation({ type: 'Lead' });
    assert.strictEqual(v.status, 400);
    assert.strictEqual(v.body.code, 'PEOPLE_USE_SALES_TYPE_OR_HELPDESK_ROLE');
    assert.match(v.body.message, /sales_type/);
  });

  it('returns null when type is absent', () => {
    assert.strictEqual(peopleLegacyTopLevelTypeViolation({ sales_type: 'Lead' }), null);
    assert.strictEqual(peopleLegacyTopLevelTypeViolation(null), null);
  });

  it('returns null when type is empty string (form placeholders)', () => {
    assert.strictEqual(peopleLegacyTopLevelTypeViolation({ type: '', first_name: 'a' }), null);
  });
});
