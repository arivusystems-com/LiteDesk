/**
 * ============================================================================
 * PLATFORM FIELD MODEL: Base
 * ============================================================================
 * 
 * Canonical field metadata contract for all platform modules.
 * 
 * ⚠️ ARCHITECTURAL CONTRACT:
 * 
 * 1. UI components MUST NEVER define fields inline
 *    - All field definitions live in *FieldModel.ts files
 *    - UI components import and consume field metadata
 *    - This ensures single source of truth for field classification
 * 
 * 2. All module field models MUST extend BaseFieldMetadata
 *    - People: peopleFieldModel.ts
 *    - Tasks: taskFieldModel.ts
 *    - Events: eventFieldModel.ts (future)
 *    - Organizations: organizationFieldModel.ts (future)
 *    - Forms: formFieldModel.ts (future)
 * 
 * 3. Field ownership, intent, and scope are FINALIZED at definition time
 *    - Do NOT infer, reinterpret, or reclassify any field at runtime
 *    - This is DATA-MEANING encoding, not UI or schema redesign
 * 
 * 4. Adding new fields
 *    - Add to the appropriate *FieldModel.ts file
 *    - Set all required metadata properties
 *    - Validation runs on module load - errors fail fast
 * 
 * ============================================================================
 * 
 * FIELD CLASSIFICATION HIERARCHY:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                           FIELD OWNERSHIP                               │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  system        │ Platform-managed, never user-editable                  │
 * │                │ Examples: createdBy, createdAt, organizationId         │
 * ├────────────────┼────────────────────────────────────────────────────────┤
 * │  core          │ Platform-scoped, app-agnostic identity fields          │
 * │                │ Examples: title, name, email, first_name               │
 * ├────────────────┼────────────────────────────────────────────────────────┤
 * │  participation │ App-scoped, exist because of app participation         │
 * │                │ Examples: lead_status (SALES), helpdeskSLA (HELPDESK)  │
 * └────────────────┴────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                           FIELD INTENT                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  primary       │ Core identifying field (title, name, email)            │
 * │  identity      │ Core identity attributes (first_name, last_name)       │
 * │  state         │ Workflow/lifecycle state (status, priority, type)      │
 * │  detail        │ Contextual information (description, notes, tags)      │
 * │  scheduling    │ Time-related fields (dueDate, startDate)               │
 * │  tracking      │ Metrics/progress fields (estimatedHours, actualHours)  │
 * │  system        │ Infrastructure fields (createdAt, updatedAt)           │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                           FIELD SCOPE                                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  CORE          │ Platform-level ownership (system + core fields)        │
 * │  SALES         │ Sales app ownership                                    │
 * │  HELPDESK      │ Helpdesk app ownership                                 │
 * │  AUDIT         │ Audit app ownership                                    │
 * │  <custom>      │ Future app scopes                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ============================================================================
 */

// =============================================================================
// SHARED ENUMS & TYPES
// =============================================================================

/**
 * Field ownership classification.
 * Determines who controls the field definition and behavior.
 */
export type BaseFieldOwner = 'core' | 'participation' | 'system';

/**
 * Field intent classification.
 * Describes the semantic purpose of the field.
 * 
 * Modules may extend this with module-specific intents.
 */
export type BaseFieldIntent = 
  | 'primary'     // Core identifying field (title, name)
  | 'identity'    // Identity attributes (first_name, email)
  | 'state'       // Workflow/lifecycle state (status, priority)
  | 'detail'      // Contextual information (description, notes)
  | 'scheduling'  // Time-related (dueDate, startDate)
  | 'tracking'    // Metrics/progress (estimatedHours)
  | 'system';     // Infrastructure (createdAt, updatedAt)

/**
 * Field scope classification.
 * Determines which app/context owns the field.
 * 
 * CORE = platform-level (system + core fields)
 * App scopes = app-specific participation fields
 */
export type BaseFieldScope = 'CORE' | 'SALES' | 'HELPDESK' | 'AUDIT' | string;

/**
 * Filter UI type classification.
 * Determines how the field appears in filter interfaces.
 */
export type BaseFilterType =
  | 'text'          // Free text search
  | 'select'        // Single selection dropdown
  | 'multi-select'  // Multiple selection
  | 'boolean'       // Yes/No toggle
  | 'user'          // User picker
  | 'entity'        // Entity reference picker
  | 'date'          // Date picker/range
  | 'number';       // Number range/numeric filter

/**
 * Field data type classification.
 * Determines the underlying data type and UI rendering.
 */
export type BaseFieldType =
  | 'text'          // Single-line text
  | 'text-area'     // Multi-line text
  | 'number'        // Integer
  | 'decimal'       // Decimal number
  | 'currency'      // Currency value
  | 'date'          // Date only
  | 'date-time'     // Date and time
  | 'select'        // Single selection
  | 'multi-select'  // Multiple selection
  | 'boolean'       // Yes/No
  | 'user'          // User reference
  | 'entity'        // Entity reference (lookup)
  | 'status'        // Status field
  | 'priority'      // Priority field
  | 'tags'          // Tags array
  | 'formula'       // Computed field
  | 'auto-number'   // Auto-incrementing number
  | 'attachment'    // File attachment
  | 'nested';       // Nested object (e.g., subtasks)

// =============================================================================
// BASE FIELD METADATA INTERFACE
// =============================================================================

/**
 * Base field metadata interface.
 * All module-specific field metadata interfaces should extend this.
 * 
 * @example
 * ```typescript
 * // In peopleFieldModel.ts
 * export interface PeopleFieldMetadata extends BaseFieldMetadata {
 *   // People-specific extensions if needed
 * }
 * ```
 */
export interface BaseFieldMetadata {
  /**
   * Field ownership classification.
   * Determines who controls the field.
   */
  owner: BaseFieldOwner;

  /**
   * Field intent classification.
   * Describes the semantic purpose.
   */
  intent: BaseFieldIntent;

  /**
   * Field scope classification.
   * Determines app/context ownership.
   */
  fieldScope: BaseFieldScope;

  /**
   * Whether the field is user-editable.
   * System fields are typically not editable.
   */
  editable: boolean;

  /**
   * Declarative app-level field requirement.
   * 
   * ⚠️ DECLARATIVE ONLY - This property declares expectation, not enforcement.
   * 
   * - Indicates which apps expect this field to be populated
   * - Does NOT block creation or editing
   * - Does NOT trigger validation errors
   * - Will be used in future for warnings, momentum signals, and contextual enforcement
   * 
   * Only allowed on participation fields.
   * Values must match the field's fieldScope.
   */
  requiredFor?: string[];

  /**
   * Declarative creation-time visibility flag.
   * 
   * ⚠️ DECLARATIVE ONLY - This property controls creation-time visibility only.
   * 
   * - Indicates whether a field should be shown and editable at record creation time
   * - Does NOT imply editability after creation
   * - Does NOT imply requirement
   * - Is NOT admin-configurable
   * - Exists to prevent Quick Create leakage of system fields
   * 
   * Core identity/primary fields are implicitly allowed at creation (no need to declare).
   */
  allowOnCreate?: boolean;

  /**
   * Whether this field can be used as a filter in list views.
   * Default: false (fields are NOT filterable by default)
   */
  filterable?: boolean;

  /**
   * Type of filter UI to render.
   * Only relevant if filterable is true.
   */
  filterType?: BaseFilterType;

  /**
   * Sort order for filters.
   * Lower = higher priority (appears first in filter list).
   */
  filterPriority?: number;

  /**
   * Whether this field cannot be deleted from the module.
   * Protected fields are essential for module functionality.
   */
  isProtected?: boolean;

  /**
   * Human-readable description of the field.
   * Used in tooltips and documentation.
   */
  description?: string;

  // ==========================================================================
  // FIELD CAPABILITY FLAGS (metadata-driven behavior)
  // Defaults: isSystem=false, isEditable=true, isVisibleInConfig=true,
  //          isComputed=false, isHideable=true (for non-system fields)
  // ==========================================================================

  /**
   * Whether this is a system field (platform-managed, infrastructure).
   * System fields are typically read-only. Default: derived from owner === 'system'.
   */
  isSystem?: boolean;

  /**
   * Whether this field is user-editable.
   * Alias for !editable for backward compatibility. Default: same as editable.
   */
  isEditable?: boolean;

  /**
   * Whether this field appears in Field Configuration UI.
   * Infrastructure fields (_id, __v, organizationId) set false.
   * Audit/computed fields (createdAt, updatedAt, etc.) set true.
   * Default: true (except infrastructure fields).
   */
  isVisibleInConfig?: boolean;

  /**
   * Whether this field is computed/derived (not stored directly).
   * Examples: derivedStatus, reminderSent, activityLogs.
   * Default: false.
   */
  isComputed?: boolean;

  /**
   * Whether this field can be hidden by users in list/detail views.
   * System fields are typically not hideable. Default: true for non-system.
   */
  isHideable?: boolean;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates base field metadata for correctness.
 * Module-specific validators should call this first, then add their own rules.
 * 
 * @param fieldName - The field key being validated
 * @param metadata - The field metadata to validate
 * @throws Error if validation fails
 */
export function validateBaseFieldMetadata(fieldName: string, metadata: BaseFieldMetadata): void {
  const { owner, intent, fieldScope, editable, requiredFor, allowOnCreate } = metadata;

  // All fields must have explicit intent
  if (!intent) {
    throw new Error(
      `Field "${fieldName}": All fields must have explicit intent`
    );
  }

  // All fields must have explicit fieldScope
  if (!fieldScope) {
    throw new Error(
      `Field "${fieldName}": All fields must have explicit fieldScope`
    );
  }

  // All fields must have explicit editable flag
  if (typeof editable !== 'boolean') {
    throw new Error(
      `Field "${fieldName}": All fields must have explicit editable flag (boolean)`
    );
  }

  // System fields must use 'system' intent
  if (owner === 'system' && intent !== 'system') {
    throw new Error(
      `Field "${fieldName}": System fields must have intent: 'system'. Found: ${intent}`
    );
  }

  // System fields must have fieldScope: 'CORE'
  if (owner === 'system' && fieldScope !== 'CORE') {
    throw new Error(
      `Field "${fieldName}": System fields must have fieldScope: 'CORE'. Found: ${fieldScope}`
    );
  }

  // System fields must not be editable (unless allowOnCreate is true)
  if (owner === 'system' && editable !== false && allowOnCreate !== true) {
    throw new Error(
      `Field "${fieldName}": System fields must have editable: false (unless allowOnCreate: true)`
    );
  }

  // Core fields must have fieldScope: 'CORE'
  if (owner === 'core' && fieldScope !== 'CORE') {
    throw new Error(
      `Field "${fieldName}": Core fields must have fieldScope: 'CORE'. Found: ${fieldScope}`
    );
  }

  // Participation fields must have app-scoped fieldScope (not 'CORE')
  if (owner === 'participation' && fieldScope === 'CORE') {
    throw new Error(
      `Field "${fieldName}": Participation fields must have app-scoped fieldScope (e.g. 'SALES'), not 'CORE'`
    );
  }

  // requiredFor is only allowed on participation fields
  if (requiredFor !== undefined && owner !== 'participation') {
    throw new Error(
      `Field "${fieldName}": requiredFor is only allowed on participation fields. Found on: ${owner}`
    );
  }

  // If requiredFor is present, it must be a non-empty array
  if (requiredFor !== undefined) {
    if (!Array.isArray(requiredFor) || requiredFor.length === 0) {
      throw new Error(
        `Field "${fieldName}": requiredFor must be a non-empty array of app keys`
      );
    }

    // All values in requiredFor must match the field's fieldScope
    if (owner === 'participation' && !requiredFor.includes(fieldScope)) {
      throw new Error(
        `Field "${fieldName}": requiredFor must include the field's fieldScope "${fieldScope}". Found: [${requiredFor.join(', ')}]`
      );
    }

    // Ensure all values in requiredFor are strings
    for (const appKey of requiredFor) {
      if (typeof appKey !== 'string' || !appKey.trim()) {
        throw new Error(
          `Field "${fieldName}": requiredFor must contain only non-empty string app keys. Found invalid value: ${appKey}`
        );
      }
    }
  }
}

/**
 * Validates all field metadata in a record.
 * 
 * @param metadata - Record of field name to metadata
 * @param moduleName - Name of the module (for error messages)
 * @throws Error if any field fails validation
 */
export function validateAllFieldMetadata<T extends BaseFieldMetadata>(
  metadata: Record<string, T>,
  moduleName: string
): void {
  for (const [fieldName, fieldMetadata] of Object.entries(metadata)) {
    try {
      validateBaseFieldMetadata(fieldName, fieldMetadata);
    } catch (error) {
      throw new Error(`[${moduleName}] ${(error as Error).message}`);
    }
  }
}

// =============================================================================
// HELPER UTILITIES
// =============================================================================

/**
 * Normalize a field key for metadata lookup.
 * Use in all get*FieldMetadata functions so API keys (e.g. "related-to") match
 * metadata keys (e.g. "relatedTo"). Prevents misclassification as 'system'.
 * @see .cursor/rules/field-configuration-selection.mdc
 */
export function normalizeFieldKeyForMetadataLookup(key: string): string {
  return (key || '').toLowerCase().replace(/[\s_-]/g, '');
}

/**
 * Check if a field is a system field.
 */
export function isSystemFieldBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): boolean {
  return metadata?.owner === 'system';
}

/**
 * Check if a field is a core field.
 */
export function isCoreFieldBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): boolean {
  return metadata?.owner === 'core';
}

/**
 * Check if a field is a participation field.
 */
export function isParticipationFieldBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): boolean {
  return metadata?.owner === 'participation';
}

/**
 * Check if a field is protected (cannot be deleted).
 */
export function isProtectedFieldBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): boolean {
  return metadata?.isProtected === true;
}

/**
 * Check if a field is allowed at creation time.
 */
export function isAllowedOnCreateBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): boolean {
  if (!metadata) return false;
  
  // Explicit allowOnCreate flag
  if (metadata.allowOnCreate === true) return true;
  
  // Core identity/primary fields are implicitly allowed
  if (metadata.owner === 'core' && 
      (metadata.intent === 'identity' || metadata.intent === 'primary')) {
    return true;
  }
  
  return false;
}

/**
 * Get effective isSystem flag with fallback.
 * Default: owner === 'system'.
 */
export function getIsSystemBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): boolean {
  if (!metadata) return false;
  return metadata.isSystem ?? metadata.owner === 'system';
}

/**
 * Get effective isEditable flag with fallback.
 * Default: same as editable.
 */
export function getIsEditableBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): boolean {
  if (!metadata) return true;
  return metadata.isEditable ?? metadata.editable;
}

/**
 * Get effective isVisibleInConfig flag with fallback.
 * Default: true except for infrastructure fields (_id, __v, organizationId).
 */
export function getIsVisibleInConfigBase<T extends BaseFieldMetadata>(
  metadata: T | undefined,
  fieldKey: string
): boolean {
  if (!metadata) return true;
  if (metadata.isVisibleInConfig !== undefined) return metadata.isVisibleInConfig;
  // Infrastructure fields: never visible in config
  const keyLower = (fieldKey || '').toLowerCase();
  if (keyLower === '_id' || keyLower === '__v' || keyLower === 'organizationid') {
    return false;
  }
  return true;
}

/**
 * Get effective isComputed flag with fallback.
 * Default: false.
 */
export function getIsComputedBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): boolean {
  if (!metadata) return false;
  return metadata.isComputed ?? false;
}

/**
 * Get effective isHideable flag with fallback.
 * Default: true for non-system fields, false for system fields.
 */
export function getIsHideableBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): boolean {
  if (!metadata) return true;
  if (metadata.isHideable !== undefined) return metadata.isHideable;
  return metadata.owner !== 'system';
}

/**
 * Get fields by owner type.
 */
export function getFieldsByOwner<T extends BaseFieldMetadata>(
  metadata: Record<string, T>,
  owner: BaseFieldOwner
): string[] {
  return Object.entries(metadata)
    .filter(([_, m]) => m.owner === owner)
    .map(([fieldName]) => fieldName);
}

/**
 * Get fields by scope.
 */
export function getFieldsByScope<T extends BaseFieldMetadata>(
  metadata: Record<string, T>,
  scope: BaseFieldScope
): string[] {
  return Object.entries(metadata)
    .filter(([_, m]) => m.fieldScope === scope)
    .map(([fieldName]) => fieldName);
}

/**
 * Get filterable fields.
 */
export function getFilterableFields<T extends BaseFieldMetadata>(
  metadata: Record<string, T>
): string[] {
  return Object.entries(metadata)
    .filter(([_, m]) => m.filterable === true)
    .map(([fieldName]) => fieldName);
}

/**
 * Get protected fields.
 */
export function getProtectedFields<T extends BaseFieldMetadata>(
  metadata: Record<string, T>
): string[] {
  return Object.entries(metadata)
    .filter(([_, m]) => m.isProtected === true)
    .map(([fieldName]) => fieldName);
}

/**
 * Classify a field into its group for UI display.
 * Returns: 'core' | 'system' | app scope (e.g., 'SALES', 'HELPDESK', 'AUDIT')
 */
export function classifyFieldBase<T extends BaseFieldMetadata>(
  metadata: T | undefined
): string {
  if (!metadata) return 'system'; // Unknown fields default to system
  
  if (metadata.owner === 'system') return 'system';
  if (metadata.owner === 'core') return 'core';
  
  // Participation fields return their app scope
  return metadata.fieldScope;
}

/**
 * Group fields by their classification.
 * Used for UI rendering in settings components.
 */
export function groupFieldsByClassification<T extends BaseFieldMetadata>(
  fieldKeys: string[],
  getMetadata: (fieldKey: string) => T | undefined
): {
  core: string[];
  participation: Record<string, string[]>;
  system: string[];
} {
  const core: string[] = [];
  const participation: Record<string, string[]> = {};
  const system: string[] = [];
  
  for (const fieldKey of fieldKeys) {
    const metadata = getMetadata(fieldKey);
    const classification = classifyFieldBase(metadata);
    
    if (classification === 'core') {
      core.push(fieldKey);
    } else if (classification === 'system') {
      system.push(fieldKey);
    } else {
      // Participation field - group by app scope
      if (!participation[classification]) {
        participation[classification] = [];
      }
      participation[classification].push(fieldKey);
    }
  }
  
  return { core, participation, system };
}
