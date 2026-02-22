/**
 * ============================================================================
 * FIELD CAPABILITY ENGINE
 * ============================================================================
 *
 * Centralized single source of truth for field capability decisions.
 * All capability logic flows through this engine — no component should
 * reason about metadata directly.
 *
 * ⚠️ ARCHITECTURAL CONTRACT:
 *
 * 1. Engine uses ONLY existing helpers:
 *    - getFieldMetadataFromRegistry
 *    - BaseFieldModel: getIsSystemBase, getIsEditableBase, getIsVisibleInConfigBase,
 *      getIsComputedBase, getIsHideableBase
 *
 * 2. No hardcoded field keys — all classification comes from metadata + base helpers
 *
 * 3. No permission logic yet — this is structural only
 *
 * 4. Future-ready: CapabilityContext reserved for role-based permissions,
 *    workflow-state restrictions, view-based overrides
 *
 * ============================================================================
 */

import { getFieldMetadataFromRegistry } from './FieldRegistry';
import {
  getIsSystemBase,
  getIsEditableBase,
  getIsVisibleInConfigBase,
  getIsComputedBase,
  getIsHideableBase,
} from './BaseFieldModel';

// =============================================================================
// GLOBAL SYSTEM FIELDS (never show in create/edit)
// =============================================================================
//
// Fields that exist on models but are NOT in field metadata (e.g. trash fields).
// When metadata lookup returns undefined, we still treat these as system fields.
//
// RULE: When adding new system fields to models (e.g. trash, audit), add them here
// so they NEVER appear in create/edit flows. See .cursor/rules/system-field-exclusion.mdc
//
const GLOBAL_SYSTEM_FIELD_KEYS = new Set([
  'deletedat',
  'deletedby',
  'deletionreason',
]);

/**
 * Get all system field keys that must NEVER appear in create/edit flows.
 * Use this when building exclude lists for DynamicForm, CreateRecordDrawer, etc.
 */
export function getGlobalSystemFieldKeys(): string[] {
  return Array.from(GLOBAL_SYSTEM_FIELD_KEYS);
}

/**
 * Normalize field key for system-field matching.
 * Handles "Deleted By", "deleted-by", "deletedBy" -> "deletedby".
 */
export function normalizeFieldKeyForSystemMatch(fieldKey: string): string {
  return (fieldKey || '').toLowerCase().replace(/\s/g, '').replace(/-/g, '');
}

/**
 * Check if a field key (case-insensitive) is a global system field.
 */
export function isGlobalSystemFieldKey(fieldKey: string): boolean {
  return GLOBAL_SYSTEM_FIELD_KEYS.has(normalizeFieldKeyForSystemMatch(fieldKey));
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Minimal field shape for capability lookups.
 * Engine uses only field.key for metadata lookup — never field.editable or other runtime props.
 */
export interface Field {
  key: string;
  [key: string]: unknown;
}

/**
 * Optional context for future capability overrides.
 * Not used yet — reserved for role-based permissions, workflow-state, view-type.
 */
export interface CapabilityContext {
  userRole?: string;
  viewType?: 'form' | 'table' | 'summary' | 'preview';
  recordState?: string;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check if a field is a system field (platform-managed, infrastructure).
 * Returns true if:
 *   - metadata.isSystem === true OR BaseFieldModel resolves as system
 *   - OR field key is in GLOBAL_SYSTEM_FIELD_KEYS (e.g. trash: deletedAt, deletedBy, deletionReason)
 */
export function isSystemField(moduleKey: string, field: Field): boolean {
  const metadata = getFieldMetadataFromRegistry(moduleKey, field.key);
  if (metadata) return getIsSystemBase(metadata);
  // Unknown fields that are model-level system fields (trash, etc.) - never show in create/edit
  const keyLower = (field.key || '').toLowerCase().replace(/-/g, '');
  return GLOBAL_SYSTEM_FIELD_KEYS.has(keyLower);
}

/**
 * Check if a field is visible in Field Configuration UI.
 * Returns false if metadata.isVisibleInConfig === false OR BaseFieldModel resolves false.
 * Otherwise returns true.
 */
export function isFieldVisibleInConfig(moduleKey: string, field: Field): boolean {
  const metadata = getFieldMetadataFromRegistry(moduleKey, field.key);
  return getIsVisibleInConfigBase(metadata, field.key);
}

/**
 * Check if a field is computed/derived (not stored directly).
 * Returns true if metadata.isComputed === true.
 */
export function isComputedField(moduleKey: string, field: Field): boolean {
  const metadata = getFieldMetadataFromRegistry(moduleKey, field.key);
  return getIsComputedBase(metadata);
}

/**
 * Check if a field can be edited by the user.
 * Returns false if ANY of:
 *   - metadata.isEditable === false
 *   - metadata.isSystem === true
 *   - metadata.isComputed === true
 *   - BaseFieldModel resolves non-editable
 *   - field is in GLOBAL_SYSTEM_FIELD_KEYS (trash, etc.)
 * Otherwise returns true.
 *
 * Engine does NOT use field.editable — metadata + base helpers only.
 */
export function canEditField(moduleKey: string, field: Field): boolean {
  const keyLower = (field.key || '').toLowerCase().replace(/-/g, '');
  if (GLOBAL_SYSTEM_FIELD_KEYS.has(keyLower)) return false;
  const metadata = getFieldMetadataFromRegistry(moduleKey, field.key);
  if (metadata?.isEditable === false) return false;
  if (metadata?.isSystem === true) return false;
  if (metadata?.isComputed === true) return false;
  if (!getIsEditableBase(metadata)) return false;
  return true;
}

/**
 * Check if a field can be hidden by users in list/detail views.
 * Returns based on metadata.isHideable with fallback to BaseFieldModel.
 */
export function canHideField(moduleKey: string, field: Field): boolean {
  const metadata = getFieldMetadataFromRegistry(moduleKey, field.key);
  return getIsHideableBase(metadata);
}
