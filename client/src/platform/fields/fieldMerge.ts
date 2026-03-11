/**
 * ============================================================================
 * FIELD MERGE UTILITY
 * ============================================================================
 *
 * Merges metadata-defined fields with backend-stored fields for Field Configuration.
 * Metadata is source of truth for system fields; backend overrides order, visibility,
 * and custom fields only.
 *
 * Rules:
 * - Metadata defines which system fields exist
 * - Backend provides: order, visibility, custom fields
 * - If backend is missing a metadata system field → inject from metadata
 * - Use field key (case-insensitive) as unique identifier
 * - No duplicates
 *
 * ============================================================================
 */

import type { BaseFieldMetadata } from './BaseFieldModel';
import { getIsVisibleInConfigBase, getIsEditableBase } from './BaseFieldModel';

/**
 * Minimal field shape expected from backend or metadata.
 * Matches the structure used in module.fields.
 */
export interface MergeableField {
  key: string;
  label?: string;
  dataType?: string;
  order?: number;
  visibility?: { list?: boolean; detail?: boolean };
  [key: string]: unknown;
}

/**
 * Options for mergeFields.
 */
export interface MergeFieldsOptions {
  /** Module key for metadata lookup (e.g. 'tasks', 'deals') */
  moduleKey: string;
  /** Function to get metadata for a field key */
  getMetadata: (fieldKey: string) => BaseFieldMetadata | undefined;
  /** Function to build a field object from metadata (for injecting missing system fields) */
  buildFieldFromMetadata?: (fieldKey: string, metadata: BaseFieldMetadata) => MergeableField;
}

/**
 * Default field builder from metadata.
 * Creates a minimal field object for system fields not in backend.
 */
function defaultBuildFieldFromMetadata(
  fieldKey: string,
  metadata: BaseFieldMetadata
): MergeableField {
  const keyLower = (fieldKey || '').toLowerCase();
  const dataTypeMap: Record<string, string> = {
    createdat: 'Date-Time',
    updatedat: 'Date-Time',
    createdby: 'Lookup (Relationship)',
    modifiedby: 'Lookup (Relationship)',
    assignedby: 'Lookup (Relationship)',
    organizationid: 'Lookup (Relationship)',
    derivedstatus: 'Text',
    reminderdate: 'Date',
    reminderSent: 'Checkbox',
    completeddate: 'Date',
    completedat: 'Date-Time',
    activitylogs: 'Text-Area',
    item_id: 'Text',
  };
  const labelMap: Record<string, string> = {
    createdat: 'Created At',
    updatedat: 'Updated At',
    createdby: 'Created By',
    modifiedby: 'Modified By',
    assignedby: 'Assigned By',
    derivedstatus: 'Derived Status',
    reminderdate: 'Reminder Date',
    remindersent: 'Reminder Sent',
    completeddate: 'Completed Date',
    completedat: 'Completed At',
    activitylogs: 'Activity Logs',
    item_id: 'Item ID',
  };
  const label = labelMap[keyLower] || fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  const dataType = dataTypeMap[keyLower] || 'Text';
  return {
    key: fieldKey,
    label,
    dataType,
    order: 9999,
    visibility: { list: false, detail: true },
    isSystem: true,
    editable: false,
  };
}

/**
 * Merge metadata-defined fields with backend-stored fields.
 *
 * @param metadata - Metadata map (fieldKey -> metadata)
 * @param backendFields - Fields from backend (module.fields)
 * @param options - Merge options
 * @returns Merged, deduplicated fields array
 */
/** Canonical key for dedup: lowercase, trim, strip spaces and hyphens (so "deleted-by", "deletedBy", "Deleted By" all match) */
function canonicalKey(k: string): string {
  return String(k || '').toLowerCase().trim().replace(/\s+/g, '').replace(/-/g, '');
}

export function mergeFields(
  metadata: Record<string, BaseFieldMetadata>,
  backendFields: MergeableField[],
  options: MergeFieldsOptions
): MergeableField[] {
  const { getMetadata, buildFieldFromMetadata = defaultBuildFieldFromMetadata } = options;

  // Pre-dedupe backend fields by canonical key, preferring programmatic keys (no spaces), preserving order
  const dedupedBackend: MergeableField[] = [];
  const seenCanonical = new Map<string, number>();
  for (const f of backendFields || []) {
    if (!f?.key) continue;
    const k = canonicalKey(f.key);
    const idx = seenCanonical.get(k);
    if (idx !== undefined) {
      const existing = dedupedBackend[idx];
      if (!existing) {
        continue;
      }
      if ((f.key || '').indexOf(' ') === -1 && (existing.key || '').indexOf(' ') !== -1) {
        dedupedBackend[idx] = f;
      }
      continue;
    }
    seenCanonical.set(k, dedupedBackend.length);
    dedupedBackend.push(f);
  }

  const seenKeys = new Set<string>();
  const result: MergeableField[] = [];

  // 1. All backend fields first (preserves order), dedupe by canonical key
  for (const f of dedupedBackend) {
    if (!f?.key) continue;
    const k = canonicalKey(f.key);
    if (seenKeys.has(k)) continue;
    const meta = getMetadata(f.key);
    const visibleInConfig = meta !== undefined
      ? getIsVisibleInConfigBase(meta, f.key)
      : true;
    if (!visibleInConfig) continue; // Skip infrastructure fields
    seenKeys.add(k);
    const merged = { ...f };
    if (meta !== undefined) {
      merged.editable = getIsEditableBase(meta);
    }
    result.push(merged);
  }

  // 2. Inject metadata system fields missing from backend
  for (const [fieldKey, meta] of Object.entries(metadata)) {
    if (!meta || meta.owner !== 'system') continue;
    const k = canonicalKey(fieldKey);
    if (seenKeys.has(k)) continue;
    const visibleInConfig = getIsVisibleInConfigBase(meta, fieldKey);
    if (!visibleInConfig) continue;
    const built = buildFieldFromMetadata(fieldKey, meta);
    seenKeys.add(k);
    result.push(built);
  }

  return result;
}

/**
 * Filter fields to only those visible in Field Configuration.
 * Metadata-driven; no hardcoded key lists.
 */
export function filterToVisibleInConfig<T extends Record<string, unknown> & { key?: string }>(
  fields: T[],
  getMetadata: (fieldKey: string) => BaseFieldMetadata | undefined
): T[] {
  if (!Array.isArray(fields)) return fields;
  return fields.filter((f) => {
    if (!f?.key) return true;
    const meta = getMetadata(f.key);
    return getIsVisibleInConfigBase(meta, f.key);
  });
}

/** Infrastructure field keys that should never appear in config (Forms/fallback). */
const INFRASTRUCTURE_KEYS = new Set([
  '_id', '__v', 'organizationid', 'formid', 'formversion', 'eventid',
  'createdtime', 'modifiedtime', 'audithistory', 'legacycontactid', 'legacyorganizationid'
]);

/**
 * Fallback getMetadata for modules without full metadata (e.g. Forms).
 * Returns minimal metadata for known infrastructure keys.
 */
export function getFallbackMetadataForVisibleInConfig(fieldKey: string): Partial<BaseFieldMetadata> | undefined {
  const k = (fieldKey || '').toLowerCase();
  if (INFRASTRUCTURE_KEYS.has(k) || k.startsWith('_')) {
    return { isVisibleInConfig: false };
  }
  return undefined;
}
