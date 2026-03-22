/**
 * Server People field registry — Mongo dot paths for filters and queries.
 * Aligned with client/src/platform/fields/peopleFieldRegistry.ts (getQueryPath / keys).
 *
 * Canonical storage: participations.${appKey}.role
 * Use `sales_type` for SALES role filters/queries. Legacy top-level `type` is not mapped here.
 */

const PEOPLE_FIELD_REGISTRY = Object.freeze({
  first_name: {
    getQueryPath: () => 'first_name',
  },
  sales_type: {
    getQueryPath: () => 'participations.SALES.role',
  },
  helpdesk_role: {
    getQueryPath: () => 'participations.HELPDESK.role',
  },
});

const PEOPLE_SALES_ROLE_PATH = PEOPLE_FIELD_REGISTRY.sales_type.getQueryPath();
const PEOPLE_HELPDESK_ROLE_PATH = PEOPLE_FIELD_REGISTRY.helpdesk_role.getQueryPath();

/** SALES workflow fields (indexes / queries; not virtual registry fields on client) */
const PEOPLE_SALES_LEAD_STATUS_PATH = 'participations.SALES.lead_status';
const PEOPLE_SALES_CONTACT_STATUS_PATH = 'participations.SALES.contact_status';

/** Mongo $group / $eq field reference for SALES role */
const PEOPLE_SALES_ROLE_AGG_REF = `$${PEOPLE_SALES_ROLE_PATH}`;

const PEOPLE_FIELD_QUERY_PATH_BY_KEY = Object.freeze({
  first_name: 'first_name',
  sales_type: PEOPLE_SALES_ROLE_PATH,
  helpdesk_role: PEOPLE_HELPDESK_ROLE_PATH,
});

function normalizePeopleRegistryLookupKey(fieldKey) {
  return String(fieldKey || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '');
}

function getPeopleRegistryItemKey(fieldKey) {
  if (!fieldKey) return null;
  const k = String(fieldKey).trim();
  if (Object.prototype.hasOwnProperty.call(PEOPLE_FIELD_QUERY_PATH_BY_KEY, k)) return k;
  const n = normalizePeopleRegistryLookupKey(k);
  for (const key of Object.keys(PEOPLE_FIELD_QUERY_PATH_BY_KEY)) {
    if (normalizePeopleRegistryLookupKey(key) === n) return key;
  }
  return null;
}

/**
 * Map API / filter field key → Mongo path (registry keys only; otherwise returns fieldKey).
 */
function getPeopleFieldQueryPath(fieldKey) {
  const regKey = getPeopleRegistryItemKey(fieldKey);
  if (regKey) return PEOPLE_FIELD_QUERY_PATH_BY_KEY[regKey];
  return fieldKey;
}

module.exports = {
  PEOPLE_FIELD_REGISTRY,
  PEOPLE_SALES_ROLE_PATH,
  PEOPLE_HELPDESK_ROLE_PATH,
  PEOPLE_SALES_LEAD_STATUS_PATH,
  PEOPLE_SALES_CONTACT_STATUS_PATH,
  PEOPLE_SALES_ROLE_AGG_REF,
  PEOPLE_FIELD_QUERY_PATH_BY_KEY,
  normalizePeopleRegistryLookupKey,
  getPeopleRegistryItemKey,
  getPeopleFieldQueryPath,
};
