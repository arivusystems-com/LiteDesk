const test = require('node:test');
const assert = require('node:assert/strict');
const ModuleDefinition = require('../../models/ModuleDefinition');
const TenantModuleConfiguration = require('../../models/TenantModuleConfiguration');

const ORG_ID = '507f1f77bcf86cd799439011';

test('collectAllowedPeopleParticipationFieldKeys: platform + tenant, excludes virtual type pickers', async (t) => {
  const origMd = ModuleDefinition.findOne;
  const origTm = TenantModuleConfiguration.find;
  t.after(() => {
    ModuleDefinition.findOne = origMd;
    TenantModuleConfiguration.find = origTm;
  });

  ModuleDefinition.findOne = () => ({
    select() {
      return {
        lean: async () => ({
          fields: [
            { key: 'sales_type', appKey: 'SALES' },
            { key: 'lead_status', appKey: 'SALES' },
            { key: 'tenant_custom', appKey: 'SALES' }
          ]
        })
      };
    }
  });
  TenantModuleConfiguration.find = () => ({
    select() {
      return {
        lean: async () => [{ fields: [{ key: 'from_tenant', appKey: 'SALES' }] }]
      };
    }
  });

  const { collectAllowedPeopleParticipationFieldKeys } = require('../tenantMetadata');
  const set = await collectAllowedPeopleParticipationFieldKeys(ORG_ID, 'SALES');

  assert.equal(set.has('sales_type'), false);
  assert.equal(set.has('lead_status'), true);
  assert.equal(set.has('tenant_custom'), true);
  assert.equal(set.has('from_tenant'), true);
  assert.equal(set.has('contact_status'), true);
});

test('collectAllowedPeopleParticipationFieldKeys: scopes keys to requested appKey', async (t) => {
  const origMd = ModuleDefinition.findOne;
  const origTm = TenantModuleConfiguration.find;
  t.after(() => {
    ModuleDefinition.findOne = origMd;
    TenantModuleConfiguration.find = origTm;
  });

  ModuleDefinition.findOne = () => ({
    select() {
      return {
        lean: async () => ({
          fields: [
            { key: 'lead_status', appKey: 'SALES' },
            { key: 'hd_only', appKey: 'HELPDESK' }
          ]
        })
      };
    }
  });
  TenantModuleConfiguration.find = () => ({
    select() {
      return {
        lean: async () => []
      };
    }
  });

  const { collectAllowedPeopleParticipationFieldKeys } = require('../tenantMetadata');
  const set = await collectAllowedPeopleParticipationFieldKeys(ORG_ID, 'HELPDESK');

  assert.equal(set.has('lead_status'), false);
  assert.equal(set.has('hd_only'), true);
});
