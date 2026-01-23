/**
 * ============================================================================
 * PLATFORM FIELD MODEL: People
 * ============================================================================
 * 
 * Canonical field metadata for People entity.
 * 
 * This file encodes the authoritative field classification as defined in:
 * docs/architecture/field-model.md
 * 
 * ⚠️ IMPORTANT:
 * - Field ownership, intent, and scope are FINALIZED
 * - Do NOT infer, reinterpret, or reclassify any field
 * - This is DATA-MEANING encoding, not UI or schema redesign
 * 
 * ============================================================================
 * 
 * ARCHITECTURAL NOTES:
 * 
 * 1. People has NO global type
 *    - The `type` field (Lead/Contact) is SALES-participation-scoped
 *    - Other apps may define their own `type` fields independently
 *    - Shared labels do NOT imply shared semantics
 * 
 * 2. Classification fields are participation-scoped
 *    - `type`, `lead_status`, `contact_status` are SALES-specific
 *    - These fields exist only because of SALES app participation
 *    - They are NOT core identity attributes
 * 
 * 3. Core identity fields are platform-scoped
 *    - `first_name`, `last_name`, `email`, `phone`, etc.
 *    - These exist independently of any app participation
 *    - fieldScope: 'CORE' indicates platform-level ownership
 * 
 * 4. System fields are infrastructure-scoped
 *    - `createdBy`, `assignedTo`, `createdAt`, `updatedAt`, etc.
 *    - Managed by the platform, never user-editable
 *    - fieldScope: 'CORE' indicates platform-level ownership
 * 
 * ============================================================================
 */

/**
 * Field metadata structure
 */
export type FieldOwner = 'core' | 'participation' | 'system';
export type FieldIntent = 'identity' | 'state' | 'detail' | 'system';
export type FieldScope = 'CORE' | 'SALES' | string; // CORE = platform, SALES = Sales app, future: other apps

export type FilterType = 'text' | 'select' | 'multi-select' | 'boolean' | 'user' | 'entity' | 'date';

export interface FieldMetadata {
  owner: FieldOwner;
  intent: FieldIntent; // Required for all fields (system fields use 'system')
  fieldScope: FieldScope; // Required for all fields
  editable: boolean; // Explicit editability flag
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
  requiredFor?: string[]; // Optional: array of app keys that require this field
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
   * Only allowed on system fields.
   * Absence means "not allowed at creation".
   * Core identity fields are implicitly allowed at creation (no need to declare).
   */
  allowOnCreate?: boolean; // Optional: allows field at creation time (system fields only)
  
  /**
   * Filter metadata - schema-driven filter configuration
   * 
   * Controls whether and how a field appears as a filter in list views.
   * Default: filterable = false (fields are NOT filterable by default)
   */
  filterable?: boolean; // Optional: whether this field can be used as a filter
  filterType?: FilterType; // Optional: type of filter UI to render
  filterPriority?: number; // Optional: sort order for filters (lower = higher priority, default visible filters are top N)
}

/**
 * Field metadata map - single source of truth
 * 
 * Every People field MUST be classified here.
 * Missing fields will cause runtime errors.
 */
export const PEOPLE_FIELD_METADATA: Record<string, FieldMetadata> = {
  // ==========================================================================
  // SYSTEM FIELDS (platform-managed, read-only, infrastructure-scoped)
  // ==========================================================================
  organizationId: {
    owner: 'system',
    intent: 'system',
    fieldScope: 'CORE',
    editable: false,
  },
  createdBy: {
    owner: 'system',
    intent: 'system',
    fieldScope: 'CORE',
    editable: false,
  },
  assignedTo: {
    owner: 'system',
    intent: 'system',
    fieldScope: 'CORE',
    editable: true,
    allowOnCreate: true, // Explicitly allowed at creation time
    filterable: true,
    filterType: 'user',
    filterPriority: 1,
  },
  legacyContactId: {
    owner: 'system',
    intent: 'system',
    fieldScope: 'CORE',
    editable: false,
  },
  createdAt: {
    owner: 'system',
    intent: 'system',
    fieldScope: 'CORE',
    editable: false,
  },
  updatedAt: {
    owner: 'system',
    intent: 'system',
    fieldScope: 'CORE',
    editable: false,
  },
  activityLogs: {
    owner: 'system',
    intent: 'system',
    fieldScope: 'CORE',
    editable: false,
  },
  notes: {
    owner: 'system',
    intent: 'system',
    fieldScope: 'CORE',
    editable: false,
  },
  attachments: {
    owner: 'system',
    intent: 'system',
    fieldScope: 'CORE',
    editable: false,
  },

  // ==========================================================================
  // CORE IDENTITY FIELDS (platform-scoped, app-agnostic)
  // ==========================================================================
  first_name: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
  },
  last_name: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
  },
  email: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
  },
  phone: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
  },
  mobile: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
  },
  tags: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
  },
  do_not_contact: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
    filterable: true,
    filterType: 'boolean',
    filterPriority: 3,
  },
  source: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
  },
  organization: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
    filterable: true,
    filterType: 'entity',
    filterPriority: 4,
  },

  // ==========================================================================
  // SALES PARTICIPATION — STATE FIELDS
  // These fields define workflow/lifecycle state and cannot be hidden.
  // DB field: `type` (enum: 'Lead' | 'Contact')
  // ==========================================================================
  type: {
    owner: 'participation',
    intent: 'state',
    fieldScope: 'SALES',
    editable: true,
    requiredFor: ['SALES'], // Declarative: SALES app requires this field
    filterable: true,
    filterType: 'multi-select',
    filterPriority: 2,
  },
  lead_status: {
    owner: 'participation',
    intent: 'state',
    fieldScope: 'SALES',
    editable: true,
    requiredFor: ['SALES'], // Declarative: SALES app requires this field
  },
  contact_status: {
    owner: 'participation',
    intent: 'state',
    fieldScope: 'SALES',
    editable: true,
    requiredFor: ['SALES'], // Declarative: SALES app requires this field
  },

  // ==========================================================================
  // SALES PARTICIPATION — DETAIL FIELDS
  // These fields provide contextual information and can be hidden.
  // ==========================================================================
  lead_owner: {
    owner: 'participation',
    intent: 'detail',
    fieldScope: 'SALES',
    editable: true,
  },
  lead_score: {
    owner: 'participation',
    intent: 'detail',
    fieldScope: 'SALES',
    editable: true,
  },
  interest_products: {
    owner: 'participation',
    intent: 'detail',
    fieldScope: 'SALES',
    editable: true,
  },
  qualification_date: {
    owner: 'participation',
    intent: 'detail',
    fieldScope: 'SALES',
    editable: true,
  },
  qualification_notes: {
    owner: 'participation',
    intent: 'detail',
    fieldScope: 'SALES',
    editable: true,
  },
  estimated_value: {
    owner: 'participation',
    intent: 'detail',
    fieldScope: 'SALES',
    editable: true,
  },
  role: {
    owner: 'participation',
    intent: 'detail',
    fieldScope: 'SALES',
    editable: true,
  },
  birthday: {
    owner: 'participation',
    intent: 'detail',
    fieldScope: 'SALES',
    editable: true,
  },
  preferred_contact_method: {
    owner: 'participation',
    intent: 'detail',
    fieldScope: 'SALES',
    editable: true,
  },
};

/**
 * ============================================================================
 * VALIDATION & GUARDRAILS
 * ============================================================================
 */

/**
 * Validates field metadata for correctness
 * Throws if invalid combinations are detected
 */
function validateFieldMetadata(fieldName: string, metadata: FieldMetadata): void {
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

  // Core fields must have intent: 'identity'
  if (owner === 'core' && intent !== 'identity') {
    throw new Error(
      `Field "${fieldName}": Core fields must have intent: 'identity'. Found: ${intent}`
    );
  }

  // Participation fields must have app-scoped fieldScope (not 'CORE')
  if (owner === 'participation' && fieldScope === 'CORE') {
    throw new Error(
      `Field "${fieldName}": Participation fields must have app-scoped fieldScope (e.g. 'SALES'), not 'CORE'`
    );
  }

  // Participation fields must have intent: 'state' or 'detail'
  if (owner === 'participation' && intent !== 'state' && intent !== 'detail') {
    throw new Error(
      `Field "${fieldName}": Participation fields must have intent: 'state' or 'detail'. Found: ${intent}`
    );
  }

  // ==========================================================================
  // allowOnCreate validation (metadata structure only, NOT runtime enforcement)
  // ==========================================================================

  // allowOnCreate is only allowed on system fields
  if (allowOnCreate !== undefined && owner !== 'system') {
    throw new Error(
      `Field "${fieldName}": allowOnCreate is only allowed on system fields. Found on: ${owner}`
    );
  }

  // ==========================================================================
  // requiredFor validation (metadata structure only, NOT field value enforcement)
  // ==========================================================================

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
    // (A field can only be required for apps that own it)
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
 * Validates all field metadata on module load
 * Fails fast if any field has invalid classification
 */
function validateAllMetadata(): void {
  for (const [fieldName, metadata] of Object.entries(PEOPLE_FIELD_METADATA)) {
    validateFieldMetadata(fieldName, metadata);
  }
}

// Run validation on module load
validateAllMetadata();

/**
 * ============================================================================
 * HELPER UTILITIES
 * ============================================================================
 * 
 * These functions derive behavior from metadata only.
 * No hardcoded field names.
 */

/**
 * Get metadata for a field
 * Throws if field is not found (fail-fast)
 */
export function getFieldMetadata(fieldName: string): FieldMetadata {
  const metadata = PEOPLE_FIELD_METADATA[fieldName];
  if (!metadata) {
    throw new Error(
      `Field "${fieldName}" is missing from PEOPLE_FIELD_METADATA. ` +
      `All People fields must be classified in peopleFieldModel.ts`
    );
  }
  return metadata;
}

/**
 * Check if a field is a system field
 */
export function isSystemField(fieldName: string): boolean {
  const metadata = getFieldMetadata(fieldName);
  return metadata.owner === 'system';
}

/**
 * Get all core identity fields
 */
export function getCoreIdentityFields(): string[] {
  return Object.entries(PEOPLE_FIELD_METADATA)
    .filter(([_, metadata]) => 
      metadata.owner === 'core' && metadata.intent === 'identity'
    )
    .map(([fieldName]) => fieldName);
}

/**
 * Get all participation fields for a specific app
 */
export function getParticipationFields(appKey: string): string[] {
  return Object.entries(PEOPLE_FIELD_METADATA)
    .filter(([_, metadata]) => 
      metadata.owner === 'participation' && metadata.fieldScope === appKey
    )
    .map(([fieldName]) => fieldName);
}

/**
 * Get all state fields for a specific app
 */
export function getStateFields(appKey: string): string[] {
  return Object.entries(PEOPLE_FIELD_METADATA)
    .filter(([_, metadata]) => 
      metadata.owner === 'participation' &&
      metadata.fieldScope === appKey &&
      metadata.intent === 'state'
    )
    .map(([fieldName]) => fieldName);
}

/**
 * Get all detail fields for a specific app
 */
export function getDetailFields(appKey: string): string[] {
  return Object.entries(PEOPLE_FIELD_METADATA)
    .filter(([_, metadata]) => 
      metadata.owner === 'participation' &&
      metadata.fieldScope === appKey &&
      metadata.intent === 'detail'
    )
    .map(([fieldName]) => fieldName);
}

