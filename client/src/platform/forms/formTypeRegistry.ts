/**
 * ============================================================================
 * FORM TYPE REGISTRY (CANONICAL, UI-FACING)
 * ============================================================================
 * 
 * This file defines the canonical Form Type registry for the platform.
 * It is UI-facing and explanatory only.
 * 
 * PURPOSE:
 * - Define built-in form types (Audit, Survey, Feedback)
 * - Allow extensibility for custom form types
 * - Provide type definitions for Form Settings UI
 * 
 * ARCHITECTURAL RATIONALE:
 * - Form Type is a CORE domain field (intent-defining), not a system field
 * - Users must be able to edit form type and add custom types
 * - Built-in types (Audit, Survey, Feedback) are protected from deletion
 * - Form Type defines how the form is interpreted and executed
 * 
 * This registry:
 * - Does NOT enforce backend validation
 * - Does NOT block execution
 * - Does NOT mutate backend enums
 * - Only provides UI-facing definitions
 * 
 * See: docs/architecture/form-settings-doctrine.md
 * ============================================================================
 */

/**
 * Form Type Definition
 * 
 * Defines a form type that can be used in Form Settings.
 */
export interface FormTypeDefinition {
  /** Unique key (e.g., 'audit', 'survey', 'feedback', 'webform') */
  key: string;
  
  /** Human-readable label */
  label: string;
  
  /** Whether this is a built-in type (cannot be deleted) */
  builtIn: boolean;
  
  /** Optional description */
  description?: string;
}

/**
 * Canonical Form Type Registry
 * 
 * This is the SINGLE SOURCE OF TRUTH for form types in the UI.
 * Built-in types (Audit, Survey, Feedback) are protected from deletion.
 * Custom types can be added by users.
 */
export const FORM_TYPE_DEFINITIONS: FormTypeDefinition[] = [
  {
    key: 'audit',
    label: 'Audit',
    builtIn: true,
    description: 'Structured assessment forms for compliance and quality audits'
  },
  {
    key: 'survey',
    label: 'Survey',
    builtIn: true,
    description: 'Data collection forms for gathering feedback and responses'
  },
  {
    key: 'feedback',
    label: 'Feedback',
    builtIn: true,
    description: 'Forms for collecting user feedback and suggestions'
  }
];

/**
 * Get all form type definitions
 */
export function getFormTypeDefinitions(): FormTypeDefinition[] {
  return [...FORM_TYPE_DEFINITIONS];
}

/**
 * Get only built-in form types
 */
export function getBuiltInFormTypes(): FormTypeDefinition[] {
  return FORM_TYPE_DEFINITIONS.filter(type => type.builtIn);
}

/**
 * Get only custom (user-created) form types
 */
export function getCustomFormTypes(): FormTypeDefinition[] {
  return FORM_TYPE_DEFINITIONS.filter(type => !type.builtIn);
}

/**
 * Check if a form type is built-in
 */
export function isBuiltInFormType(key: string): boolean {
  const definition = FORM_TYPE_DEFINITIONS.find(t => t.key === key);
  return definition?.builtIn === true;
}

/**
 * Get a form type definition by key
 */
export function getFormTypeDefinition(key: string): FormTypeDefinition | undefined {
  return FORM_TYPE_DEFINITIONS.find(t => t.key === key);
}

/**
 * Add a custom form type to the registry
 * 
 * NOTE: This is frontend-only. Backend remains unchanged.
 * Custom types are stored in-memory or in settings-backed store.
 */
export function addCustomFormType(definition: Omit<FormTypeDefinition, 'builtIn'>): FormTypeDefinition {
  const newType: FormTypeDefinition = {
    ...definition,
    builtIn: false
  };
  
  // Check if type already exists
  const existing = FORM_TYPE_DEFINITIONS.find(t => t.key === newType.key);
  if (existing) {
    throw new Error(`Form type "${newType.key}" already exists`);
  }
  
  FORM_TYPE_DEFINITIONS.push(newType);
  return newType;
}

/**
 * Remove a custom form type from the registry
 * 
 * Built-in types (Audit, Survey, Feedback) cannot be removed.
 */
export function removeCustomFormType(key: string): boolean {
  const index = FORM_TYPE_DEFINITIONS.findIndex(t => t.key === key);
  if (index === -1) return false;
  
  const type = FORM_TYPE_DEFINITIONS[index];
  if (!type) return false;
  
  // Prevent removal of built-in types
  if (type.builtIn) {
    throw new Error(`Cannot remove built-in form type "${key}"`);
  }
  
  // Additional safeguard: explicitly prevent removal of audit, survey, feedback (case-insensitive)
  const normalizedKey = String(key).toLowerCase();
  const protectedTypes = ['audit', 'survey', 'feedback'];
  if (protectedTypes.includes(normalizedKey)) {
    throw new Error(`Cannot remove built-in form type "${key}" (Audit, Survey, Feedback are protected)`);
  }
  
  FORM_TYPE_DEFINITIONS.splice(index, 1);
  return true;
}

// ============================================================================
// DEV-ONLY ASSERTIONS
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  // Assert: No duplicate keys
  const keys = FORM_TYPE_DEFINITIONS.map(t => t.key);
  const uniqueKeys = new Set(keys);
  console.assert(
    keys.length === uniqueKeys.size,
    '[Form Type Registry] Duplicate form type keys found',
    { keys, uniqueKeys: Array.from(uniqueKeys) }
  );
  
  // Assert: Built-in types must always include: audit, survey, feedback
  const requiredBuiltInTypes = ['audit', 'survey', 'feedback'];
  const builtInKeys = FORM_TYPE_DEFINITIONS.filter(t => t.builtIn).map(t => t.key);
  requiredBuiltInTypes.forEach(requiredKey => {
    console.assert(
      builtInKeys.includes(requiredKey),
      `[Form Type Registry] Required built-in form type "${requiredKey}" is missing`,
      { builtInKeys, requiredKey }
    );
  });
  
  // Assert: All built-in types are marked correctly
  FORM_TYPE_DEFINITIONS.forEach(type => {
    if (requiredBuiltInTypes.includes(type.key)) {
      console.assert(
        type.builtIn === true,
        `[Form Type Registry] Required built-in type "${type.key}" must have builtIn: true`,
        { type }
      );
    }
  });
}
