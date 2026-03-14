/**
 * Generic record adapter for any module (people, organizations, events, items, custom).
 * Builds state fields, detail fields, and sections from module definition.
 * Same interface as deal/task adapters so SectionStack and RecordStateSection work unchanged.
 */
import DescriptionSection from '@/components/record-page/sections/DescriptionSection.vue';
import DetailsSection from '@/components/record-page/sections/DetailsSection.vue';
import RelatedSection from '@/components/record-page/sections/RelatedSection.vue';
import {
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  LinkIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/vue/24/outline';
import { getKeyFields, getFieldDisplayLabel } from '@/utils/fieldDisplay';
import { getGlobalSystemFieldKeys } from '@/platform/fields/fieldCapabilityEngine';

const KEY_SECTION_EXCLUDED = new Set(['name', 'title', 'description']);
const DETAIL_EXCLUDED = new Set([
  'name', 'title', 'description',
  'createdBy', 'createdAt', 'modifiedBy', 'updatedAt',
  'deletedAt', 'deletedBy', 'deletionReason',
  'activityLogs', 'subtasks', 'stageHistory'
]);

function resolveValue(v) {
  if (typeof v === 'function') return v();
  if (v && typeof v === 'object' && 'value' in v) return v.value;
  return v;
}

function toReadableLabel(key) {
  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function fieldTypeFromDef(field) {
  const dt = String(field?.dataType || '').toLowerCase();
  if (dt.includes('date') || dt.includes('datetime')) return 'date';
  if (dt.includes('number') || dt.includes('currency') || dt.includes('decimal')) return 'number';
  if (dt.includes('select') || dt.includes('picklist') || dt.includes('status')) return 'select';
  if (dt.includes('user') || dt.includes('lookup') || dt.includes('entity')) return 'entity';
  return 'text';
}

function iconForKey(key, field) {
  const k = String(key || '').toLowerCase();
  const dt = String(field?.dataType || '').toLowerCase();
  if (['ownerid', 'owner_id', 'assignedto', 'user'].includes(k) || dt.includes('user')) return UserIcon;
  if (['date', 'createdat', 'updatedat', 'closedate'].some((x) => k.includes(x)) || dt.includes('date')) return CalendarIcon;
  if (['amount', 'currency', 'number'].some((x) => k.includes(x)) || dt.includes('currency')) return CurrencyDollarIcon;
  if (['stage', 'status', 'tags', 'type'].some((x) => k.includes(x)) || dt.includes('select')) return TagIcon;
  if (['organization', 'account', 'company'].some((x) => k.includes(x))) return BuildingOfficeIcon;
  if (['link', 'related'].some((x) => k.includes(x))) return LinkIcon;
  return DocumentTextIcon;
}

function getStateKeys(moduleDefinition) {
  const def = resolveValue(moduleDefinition);
  const keyFields = getKeyFields(def);
  const keys = keyFields
    .map((f) => String(f?.key || '').trim())
    .filter((k) => k && !KEY_SECTION_EXCLUDED.has(k));
  if (keys.length) return keys;
  const fields = Array.isArray(def?.fields) ? def.fields : [];
  return fields
    .filter((f) => f?.key && !KEY_SECTION_EXCLUDED.has(f.key))
    .slice(0, 6)
    .map((f) => f.key);
}

function getDetailFieldKeys(moduleDefinition) {
  const def = resolveValue(moduleDefinition);
  const globalSystem = (getGlobalSystemFieldKeys && getGlobalSystemFieldKeys()) || [];
  const excluded = new Set([
    ...DETAIL_EXCLUDED,
    ...globalSystem.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '')),
    ...getStateKeys(def)
  ]);
  const fields = Array.isArray(def?.fields) ? def.fields : [];
  return fields
    .filter((f) => {
      const key = String(f?.key || '').trim();
      if (!key) return false;
      const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (excluded.has(norm)) return false;
      const vis = f?.visibility;
      return vis?.detail !== false;
    })
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
    .map((f) => f.key);
}

/**
 * Create generic record adapter for a module.
 * @param {Object} opts - formatDate, moduleDefinition, canEditDetails, saveDetailField, getRelatedGroups, openRelatedItem, canUnlinkRelated, onUnlinkRelated, handleDescriptionSave, canEditDescription, expandedLeftSection, openLeftSection
 */
export function createGenericRecordAdapter(opts = {}) {
  const {
    formatDate,
    moduleDefinition,
    canEditDetails,
    saveDetailField,
    getRelatedGroups = () => [],
    openRelatedItem,
    canUnlinkRelated,
    onUnlinkRelated,
    handleDescriptionSave,
    canEditDescription = false,
    expandedLeftSection = '',
    openLeftSection
  } = opts;

  return {
    module: 'generic',

    getSections(record) {
      const expanded = String(resolveValue(expandedLeftSection) || '').trim();
      const isExpanded = expanded.length > 0;
      const keys = isExpanded ? ['description', 'details', 'related'].filter((k) => k === expanded) : ['description', 'details', 'related'];
      const sections = {
        description: {
          key: 'description',
          title: 'Description',
          component: DescriptionSection,
          className: 'pt-4 pb-2',
          actions: [!isExpanded && openLeftSection ? { key: 'expand-description', type: 'expand', label: 'Expand', handler: () => openLeftSection('description') } : null].filter(Boolean)
        },
        details: {
          key: 'details',
          title: 'Details',
          component: DetailsSection,
          className: 'pt-2 pb-2',
          actions: [!isExpanded && openLeftSection ? { key: 'expand-details', type: 'expand', label: 'Expand', handler: () => openLeftSection('details') } : null].filter(Boolean)
        },
        related: {
          key: 'related',
          title: 'Related Records',
          component: RelatedSection,
          className: 'pt-2 pb-3',
          actions: [!isExpanded && openLeftSection ? { key: 'expand-related', type: 'expand', label: 'Expand', handler: () => openLeftSection('related') } : null].filter(Boolean)
        }
      };
      return keys.map((k) => sections[k]).filter(Boolean);
    },

    shouldRenderSection() {
      return true;
    },

    getDescription(record) {
      return record?.description ?? record?.body ?? '';
    },

    canEditDescription() {
      return canEditDescription;
    },

    saveDescription(value, record) {
      if (typeof handleDescriptionSave === 'function') handleDescriptionSave(value, record);
    },

    getStateFields(record, context) {
      const def = resolveValue(moduleDefinition);
      const keys = getStateKeys(def);
      const fieldsByKey = new Map((def?.fields || []).map((f) => [String(f.key).trim(), f]));
      return keys.map((fieldKey) => {
        const field = fieldsByKey.get(fieldKey);
        const fieldType = fieldTypeFromDef(field);
        const canEdit = canEditDetails?.(null, fieldKey) === true && ['text', 'number', 'date', 'select'].includes(fieldType);
        return {
          key: fieldKey,
          label: field ? getFieldDisplayLabel(field) : toReadableLabel(fieldKey),
          icon: iconForKey(fieldKey, field),
          type: fieldType,
          options: (fieldType === 'select' && field?.options) ? (field.options || []).map((o) => ({ value: o.value ?? o.id, label: o.label ?? o.name ?? String(o.value ?? o.id) })) : [],
          canEdit,
          onSave: canEdit ? (value) => saveDetailField?.(fieldKey, value) : null,
          canOpenEditor: false,
          onEdit: null
        };
      });
    },

    getStateValues(record) {
      const def = resolveValue(moduleDefinition);
      const keys = getStateKeys(def);
      const values = {};
      for (const key of keys) {
        const v = record?.[key];
        if (v == null || v === '') {
          values[key] = null;
          continue;
        }
        if (typeof v === 'object' && (v?.name ?? v?.title ?? v?.firstName ?? v?.email)) {
          values[key] = v.name ?? v.title ?? (`${v.firstName || ''} ${v.lastName || ''}`.trim() || v.email || '—');
          continue;
        }
        if (v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}/.test(v))) {
          values[key] = String(v).slice(0, 10);
          continue;
        }
        values[key] = v;
      }
      return values;
    },

    getDetailFields(record, context) {
      if (!record) return [];
      const def = resolveValue(moduleDefinition);
      const fieldsByKey = new Map((def?.fields || []).map((f) => [String(f.key).trim(), f]));
      const detailKeys = getDetailFieldKeys(def);
      return detailKeys.map((fieldKey) => {
        const field = fieldsByKey.get(fieldKey);
        const fieldType = fieldTypeFromDef(field);
        const rawValue = record[fieldKey];
        let displayValue = rawValue;
        if (rawValue != null && typeof rawValue === 'object') {
          displayValue = rawValue.name ?? rawValue.title ?? rawValue.label ?? (`${(rawValue.firstName || '')} ${(rawValue.lastName || '')}`.trim() || rawValue.email || '—');
        } else if (rawValue != null && typeof rawValue === 'string' && /^\d{4}-\d{2}/.test(rawValue)) {
          displayValue = formatDate ? formatDate(rawValue) : rawValue.slice(0, 10);
        }
        const canEdit = canEditDetails?.(record, fieldKey) === true && ['text', 'number', 'date', 'select'].includes(fieldType);
        return {
          key: fieldKey,
          label: field ? getFieldDisplayLabel(field) : toReadableLabel(fieldKey),
          prefixIcon: iconForKey(fieldKey, field),
          value: rawValue,
          displayValue: displayValue != null ? String(displayValue) : '—',
          type: fieldType,
          options: (fieldType === 'select' && field?.options) ? (field.options || []).map((o) => ({ value: o.value ?? o.id, label: o.label ?? o.name ?? String(o.value ?? o.id) })) : [],
          canEdit,
          onSave: canEdit ? (value) => saveDetailField?.(fieldKey, value, record) : null,
          canOpenEditor: false,
          onEdit: null
        };
      });
    },

    getRelatedGroups(record) {
      const value = typeof getRelatedGroups === 'function' ? getRelatedGroups(record) : [];
      return Array.isArray(value) ? value : [];
    },

    openRelatedItem(item, group, record, ctx) {
      openRelatedItem?.(item, group, record, ctx);
    },

    canUnlinkRelated(item, group, record, ctx) {
      return typeof canUnlinkRelated === 'function' ? canUnlinkRelated(item, group, record, ctx) : false;
    },

    onUnlinkRelated(item, group, record, ctx) {
      onUnlinkRelated?.(item, group, record, ctx);
    }
  };
}
