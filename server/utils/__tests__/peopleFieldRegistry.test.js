'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  getPeopleFieldQueryPath,
  PEOPLE_SALES_ROLE_PATH,
  PEOPLE_HELPDESK_ROLE_PATH,
} = require('../peopleFieldRegistry');
const { extractSalesFromUpdate } = require('../syncSalesParticipation');

describe('peopleFieldRegistry — query path stability (DB / reporting contract)', () => {
  it('query paths remain stable', () => {
    assert.strictEqual(getPeopleFieldQueryPath('sales_type'), 'participations.SALES.role');
    assert.strictEqual(getPeopleFieldQueryPath('type'), 'type');
    assert.strictEqual(getPeopleFieldQueryPath('helpdesk_role'), 'participations.HELPDESK.role');
    assert.strictEqual(PEOPLE_SALES_ROLE_PATH, 'participations.SALES.role');
    assert.strictEqual(PEOPLE_HELPDESK_ROLE_PATH, 'participations.HELPDESK.role');
  });
});

describe('peopleFieldRegistry.getPeopleFieldQueryPath', () => {
  it('maps sales_type to participations.SALES.role', () => {
    assert.strictEqual(getPeopleFieldQueryPath('sales_type'), 'participations.SALES.role');
    assert.strictEqual(getPeopleFieldQueryPath('type'), 'type');
  });

  it('maps helpdesk_role to participations.HELPDESK.role', () => {
    assert.strictEqual(getPeopleFieldQueryPath('helpdesk_role'), 'participations.HELPDESK.role');
  });

  it('normalizes lookup keys (case-insensitive snake keys)', () => {
    assert.strictEqual(getPeopleFieldQueryPath('Sales_Type'), 'participations.SALES.role');
    assert.strictEqual(getPeopleFieldQueryPath('TYPE'), 'TYPE');
    assert.strictEqual(getPeopleFieldQueryPath('Helpdesk_Role'), 'participations.HELPDESK.role');
  });

  it('passes through unknown field keys', () => {
    assert.strictEqual(getPeopleFieldQueryPath('email'), 'email');
    assert.strictEqual(getPeopleFieldQueryPath('custom_x'), 'custom_x');
  });
});

describe('syncSalesParticipation.extractSalesFromUpdate', () => {
  it('prefers sales_type over type for role; strips both from cleaned payload', () => {
    const { sales, cleaned } = extractSalesFromUpdate({
      sales_type: 'Contact',
      type: 'Lead',
      lead_status: 'New',
      contact_status: null,
      first_name: 'A',
    });
    assert.notStrictEqual(sales, null);
    assert.strictEqual(sales.role, 'Contact');
    assert.strictEqual(sales.lead_status, 'New');
    assert.strictEqual(sales.contact_status, null);
    assert.strictEqual(cleaned.first_name, 'A');
    assert.strictEqual('type' in cleaned, false);
    assert.strictEqual('sales_type' in cleaned, false);
    assert.strictEqual('lead_status' in cleaned, false);
    assert.strictEqual('contact_status' in cleaned, false);
  });

  it('legacy top-level type alone does not set sales role; stripped from cleaned', () => {
    const { sales, cleaned } = extractSalesFromUpdate({ type: 'Lead', first_name: 'x' });
    assert.strictEqual(sales, null);
    assert.strictEqual('type' in cleaned, false);
    assert.strictEqual(cleaned.first_name, 'x');
  });

  it('throws or ignores invalid values', () => {
    const { cleaned } = extractSalesFromUpdate({ sales_type: null });
    assert.strictEqual(cleaned.sales_type, undefined);
  });

  it('does not mutate original object', () => {
    const input = { sales_type: 'Lead' };
    const copy = { ...input };

    extractSalesFromUpdate(input);

    assert.deepStrictEqual(input, copy);
  });

  it('does not treat helpdesk_role as sales role', () => {
    const { sales, cleaned } = extractSalesFromUpdate({ helpdesk_role: 'Customer' });
    assert.strictEqual(sales, null);
    assert.strictEqual(cleaned.helpdesk_role, 'Customer');
  });

  it('returns sales null when payload has no SALES keys', () => {
    const { sales, cleaned } = extractSalesFromUpdate({ first_name: 'Pat' });
    assert.strictEqual(sales, null);
    assert.strictEqual(cleaned.first_name, 'Pat');
  });
});
