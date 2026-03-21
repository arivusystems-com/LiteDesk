import { isGlobalSystemFieldKey, isSystemField } from '@/platform/fields/fieldCapabilityEngine';
import { getFieldMetadataFromRegistry, normalizeModuleKeyForRegistry } from '@/platform/fields/FieldRegistry';

const DETAIL_SYSTEM_FIELD_KEYS = new Set([
  '_id',
  'id',
  '__v',
  'createdat',
  'createdby',
  'updatedat',
  'modifiedby',
  'deletedat',
  'deletedby',
  'deletionreason',
  'organizationid',
  'activitylogs',
  'stagehistory',
  'subtasks'
]);

const INFRA_PREFIXES = ['settings', 'security', 'database', 'subscription', 'billing', 'limits', 'preferences', 'policies'];
const INFRA_TOKENS = [
  'enabledmodules', 'enabledapps', 'moduleoverrides', 'crminitialized', 'dataregion',
  'passwordpolicy', 'sessionrules', 'integrations', 'integration', 'connectionstring',
  'logouri', 'primarycolor', 'slug', 'timezone', 'locale', 'dateformat', 'currency', 'language', 'istenant'
];

export function normalizeFieldGuardKey(key) {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isInfrastructureSystemFieldKey(key) {
  const normalized = normalizeFieldGuardKey(key);
  if (!normalized) return false;
  if (DETAIL_SYSTEM_FIELD_KEYS.has(normalized)) return true;
  if (INFRA_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  if (INFRA_TOKENS.some((token) => normalized.includes(token))) return true;
  return false;
}

export function isExplicitCustomField(field) {
  if (!field || typeof field !== 'object') return false;
  if (field.isCustom === true || field.custom === true) return true;
  const owner = String(field.owner || '').toLowerCase().trim();
  if (owner === 'custom') return true;
  const source = String(field.source || '').toLowerCase().trim();
  if (source.includes('custom')) return true;
  return false;
}

export function shouldHideDetailField(field, moduleKey, options = {}) {
  const { enforceRegistryKnown = false } = options;
  const key = String(field?.key || '').trim();
  if (!key) return true;
  const normalizedModuleKey = String(moduleKey || '').toLowerCase().trim();

  if (isInfrastructureSystemFieldKey(key) || isInfrastructureSystemFieldKey(field?.label)) return true;
  if (field?.isSystem === true || field?.system === true) return true;
  if (typeof isGlobalSystemFieldKey === 'function' && isGlobalSystemFieldKey(key)) return true;
  if (normalizedModuleKey && typeof isSystemField === 'function' && isSystemField(normalizedModuleKey, { key })) return true;

  if (enforceRegistryKnown) {
    const registryModuleKey = normalizeModuleKeyForRegistry(normalizedModuleKey);
    if (registryModuleKey) {
      const metadata = typeof getFieldMetadataFromRegistry === 'function'
        ? getFieldMetadataFromRegistry(registryModuleKey, key)
        : undefined;
      if (!metadata && !isExplicitCustomField(field)) return true;
    }
  }

  return false;
}
