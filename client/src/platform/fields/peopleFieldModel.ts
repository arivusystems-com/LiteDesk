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

import type {
  BaseFieldMetadata,
  BaseFieldOwner,
  BaseFieldIntent,
  BaseFieldScope,
  BaseFilterType,
} from './BaseFieldModel';
import { validateBaseFieldMetadata } from './BaseFieldModel';

// =============================================================================
// PEOPLE-SPECIFIC TYPE ALIASES (for backward compatibility)
// =============================================================================

/**
 * Field ownership classification for People.
 * @deprecated Use BaseFieldOwner from BaseFieldModel.ts
 */
export type FieldOwner = BaseFieldOwner;

/**
 * Field intent classification for People.
 * People module uses 'identity' for core fields instead of 'primary'.
 */
export type FieldIntent = 'identity' | 'state' | 'detail' | 'system';

/**
 * Field scope classification for People.
 * @deprecated Use BaseFieldScope from BaseFieldModel.ts
 */
export type FieldScope = BaseFieldScope;

/**
 * Filter type classification for People.
 * @deprecated Use BaseFilterType from BaseFieldModel.ts
 */
export type FilterType = BaseFilterType;

// =============================================================================
// PEOPLE FIELD METADATA INTERFACE
// =============================================================================

/**
 * People-specific field metadata interface.
 * Extends BaseFieldMetadata with People-specific intent types.
 */
export interface FieldMetadata extends Omit<BaseFieldMetadata, 'intent'> {
  /**
   * Field intent classification.
   * People uses 'identity' for core fields (vs 'primary' in base model).
   */
  intent: FieldIntent;
}

// =============================================================================
// FIELD METADATA DEFINITIONS
// =============================================================================

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
  derivedStatus: {
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

// =============================================================================
// VALIDATION & GUARDRAILS
// =============================================================================

/**
 * Validates People-specific field metadata for correctness.
 * Extends base validation with People-specific rules.
 * Throws if invalid combinations are detected.
 */
function validatePeopleFieldMetadata(fieldName: string, metadata: FieldMetadata): void {
  // Run base validation first (cast to BaseFieldMetadata for compatibility)
  validateBaseFieldMetadata(fieldName, metadata as unknown as BaseFieldMetadata);

  const { owner, intent, allowOnCreate } = metadata;

  // People-specific: Core fields must have intent: 'identity'
  if (owner === 'core' && intent !== 'identity') {
    throw new Error(
      `Field "${fieldName}": People core fields must have intent: 'identity'. Found: ${intent}`
    );
  }

  // People-specific: Participation fields must have intent: 'state' or 'detail'
  if (owner === 'participation' && intent !== 'state' && intent !== 'detail') {
    throw new Error(
      `Field "${fieldName}": People participation fields must have intent: 'state' or 'detail'. Found: ${intent}`
    );
  }

  // People-specific: allowOnCreate is only allowed on system fields
  if (allowOnCreate !== undefined && owner !== 'system') {
    throw new Error(
      `Field "${fieldName}": allowOnCreate is only allowed on system fields. Found on: ${owner}`
    );
  }
}

/**
 * Validates all field metadata on module load
 * Fails fast if any field has invalid classification
 */
function validateAllMetadata(): void {
  for (const [fieldName, metadata] of Object.entries(PEOPLE_FIELD_METADATA)) {
    validatePeopleFieldMetadata(fieldName, metadata);
  }
}

// Run validation on module load
validateAllMetadata();

// =============================================================================
// HELPER UTILITIES
// =============================================================================

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
