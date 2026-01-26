/**
 * ============================================================================
 * FORM DEFINITION FIELD MODEL
 * ============================================================================
 * 
 * Describes what a form field *is* (schema/metadata), NOT what values it contains.
 * 
 * ⚠️ ARCHITECTURAL CONTRACT:
 * 
 * 1. Form Definition Fields are NOT platform entity fields
 *    - Do NOT extend BaseFieldMetadata
 *    - Do NOT register in FieldRegistry
 *    - Do NOT use platform field policies directly
 * 
 * 2. Form Definition Fields are dynamic and user-defined
 *    - Created by users via Form Builder
 *    - Schema is stored in database, not code
 *    - Each form can have different fields
 * 
 * 3. Form Definition Fields CAN reference platform fields
 *    - Entity references (user, deal, task, etc.)
 *    - Validation uses FieldRegistry to verify entity types
 *    - But the Form field itself remains outside FieldRegistry
 * 
 * 4. This is the SCHEMA layer, not the DATA layer
 *    - FormDefinitionFieldModel describes structure
 *    - FormResponseModel stores instance values
 * 
 * ============================================================================
 * 
 * USAGE:
 * 
 * ```typescript
 * // Define a form field
 * const field: FormDefinitionField = {
 *   fieldKey: "customer_satisfaction",
 *   label: "How satisfied are you?",
 *   fieldType: "rating",
 *   required: true,
 *   owner: "user",
 *   intent: "question",
 *   scoring: { enabled: true, weightage: 10 }
 * };
 * 
 * // Validate a form definition
 * validateFormDefinition(formDefinition);
 * ```
 * 
 * ============================================================================
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Form field type classification.
 * Determines the UI component and validation rules.
 */
export type FormFieldType =
  | 'text'           // Single-line text input
  | 'text-area'      // Multi-line text input
  | 'number'         // Numeric input (integer or decimal)
  | 'select'         // Single selection dropdown
  | 'multi-select'   // Multiple selection
  | 'checkbox'       // Boolean checkbox
  | 'yes-no'         // Yes/No toggle
  | 'date'           // Date picker
  | 'date-time'      // Date and time picker
  | 'file'           // File upload
  | 'signature'      // Signature capture
  | 'rating'         // Star rating (1-5 or custom scale)
  | 'user'           // User picker (references platform User)
  | 'entity';        // Entity reference (references platform entities)

/**
 * Form field ownership classification.
 * Determines who controls the field definition.
 */
export type FormFieldOwner =
  | 'system'    // Platform-managed fields (formId, createdAt, etc.)
  | 'org'       // Organization-level fields (custom fields defined by org)
  | 'user';     // User-defined fields (created by form builder)

/**
 * Form field intent classification.
 * Describes the semantic purpose of the field.
 */
export type FormFieldIntent =
  | 'question'   // Regular question field
  | 'identity'   // Identifies the respondent (name, email, etc.)
  | 'audit'      // Audit-specific field (evidence, compliance)
  | 'scoring'    // Field used in scoring calculation
  | 'system';    // System-managed field (timestamps, IDs)

/**
 * Validation rule for form fields.
 */
export interface ValidationRule {
  /**
   * Type of validation rule.
   */
  type: 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  
  /**
   * Value for the validation rule.
   */
  value: unknown;
  
  /**
   * Error message to display if validation fails.
   */
  message: string;
}

/**
 * Conditional rule for visibility/editability.
 */
export interface ConditionalRule {
  /**
   * Field key to check.
   */
  fieldKey: string;
  
  /**
   * Operator for comparison.
   */
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  
  /**
   * Value to compare against.
   */
  value: unknown;
}

/**
 * Visibility rule for form fields.
 */
export interface VisibilityRule {
  /**
   * Conditions that must be met for field to be visible.
   */
  showIf?: ConditionalRule[];
  
  /**
   * Conditions that hide the field if met.
   */
  hideIf?: ConditionalRule[];
}

/**
 * Editability rule for form fields.
 */
export interface EditableRule {
  /**
   * Conditions that make field editable.
   */
  editableIf?: ConditionalRule[];
  
  /**
   * Conditions that make field read-only.
   */
  readOnlyIf?: ConditionalRule[];
  
  /**
   * Whether field is editable based on response status.
   */
  editableWhenStatus?: FormResponseStatus[];
}

/**
 * Response status.
 * Defined here to avoid circular dependency with FormResponseModel.
 * FormResponseModel should use this same type.
 */
export type FormResponseStatus =
  | 'draft'
  | 'submitted'
  | 'reviewed'
  | 'approved'
  | 'rejected';

/**
 * Scoring configuration for audit forms.
 */
export interface ScoringConfig {
  /**
   * Whether scoring is enabled for this field.
   */
  enabled: boolean;
  
  /**
   * Weight of this field in scoring calculation (0-100).
   */
  weightage: number;
  
  /**
   * Value that counts as "pass" for scoring.
   */
  passValue?: unknown;
  
  /**
   * Value that counts as "fail" for scoring.
   */
  failValue?: unknown;
  
  /**
   * Custom scoring formula (optional).
   */
  formula?: string;
}

/**
 * Layout configuration for form fields.
 */
export interface FieldLayout {
  /**
   * Section ID this field belongs to.
   */
  section?: string;
  
  /**
   * Subsection ID this field belongs to.
   */
  subsection?: string;
  
  /**
   * Display order within section/subsection.
   */
  order?: number;
  
  /**
   * Column position (for multi-column layouts).
   */
  column?: number;
  
  /**
   * Width (for flexible layouts).
   */
  width?: 'full' | 'half' | 'third' | 'quarter';
}

/**
 * Entity reference configuration (for entity-type fields).
 */
export interface EntityReferenceConfig {
  /**
   * Module type to reference (e.g., 'deal', 'task', 'organization').
   */
  module: string;
  
  /**
   * Whether multiple entities can be selected.
   */
  multiple?: boolean;
  
  /**
   * Filter criteria for entity selection.
   */
  filters?: Record<string, unknown>;
}

// =============================================================================
// FORM DEFINITION FIELD INTERFACE
// =============================================================================

/**
 * Form Definition Field metadata.
 * Describes what a form field *is*, not what values it contains.
 * 
 * This is the schema layer - see FormResponseModel for the data layer.
 */
export interface FormDefinitionField {
  /**
   * REQUIRED: Stable identifier for the field.
   * Must be unique within a form definition.
   * Examples: "exterior_clean", "customer_satisfaction", "assigned_user"
   */
  fieldKey: string;
  
  /**
   * REQUIRED: Human-readable label for the field.
   * Displayed to users in the form UI.
   */
  label: string;
  
  /**
   * REQUIRED: Field type classification.
   * Determines UI component and validation rules.
   */
  fieldType: FormFieldType;
  
  /**
   * REQUIRED: Whether field must be filled.
   * If true, validation will fail if field is empty.
   */
  required: boolean;
  
  /**
   * REQUIRED: Field ownership classification.
   * Determines who controls the field definition.
   */
  owner: FormFieldOwner;
  
  /**
   * REQUIRED: Field intent classification.
   * Describes the semantic purpose of the field.
   */
  intent: FormFieldIntent;
  
  /**
   * OPTIONAL: Options for select/multi-select fields.
   * Array of option values (strings).
   */
  options?: string[];
  
  /**
   * OPTIONAL: Validation rules for the field.
   * Applied when form is submitted.
   */
  validationRules?: ValidationRule[];
  
  /**
   * OPTIONAL: Default value for the field.
   * Used when form is first loaded.
   */
  defaultValue?: unknown;
  
  /**
   * OPTIONAL: Helper text shown to users.
   * Displayed below the field label.
   */
  helpText?: string;
  
  /**
   * OPTIONAL: Visibility rules.
   * Controls when field is shown/hidden.
   */
  visibilityRules?: VisibilityRule;
  
  /**
   * OPTIONAL: Editability rules.
   * Controls when field is editable/read-only.
   */
  editableRules?: EditableRule;
  
  /**
   * OPTIONAL: Layout configuration.
   * Controls field position and layout.
   */
  layout?: FieldLayout;
  
  /**
   * OPTIONAL: Scoring configuration (for audit forms).
   * Defines how field contributes to form score.
   */
  scoring?: ScoringConfig;
  
  /**
   * OPTIONAL: Conditional logic.
   * Controls field visibility and requirements based on other fields.
   */
  conditionalLogic?: {
    /**
     * Show field if conditions are met.
     */
    showIf?: ConditionalRule[];
    
    /**
     * Require field if conditions are met.
     */
    requireIf?: ConditionalRule[];
  };
  
  /**
   * OPTIONAL: Entity reference configuration (for entity-type fields).
   * Defines which entities can be referenced.
   */
  entityConfig?: EntityReferenceConfig;
  
  /**
   * OPTIONAL: Whether field can be used as a filter.
   * Default: false
   */
  filterable?: boolean;
  
  /**
   * OPTIONAL: Whether field can be sorted.
   * Default: false
   */
  sortable?: boolean;
  
  /**
   * OPTIONAL: Whether field is protected (cannot be deleted).
   * Default: false
   */
  isProtected?: boolean;
  
  /**
   * OPTIONAL: Human-readable description.
   * Used in tooltips and documentation.
   */
  description?: string;
}

// =============================================================================
// FORM DEFINITION INTERFACE
// =============================================================================

/**
 * Complete form definition.
 * Contains all fields, sections, and metadata for a form.
 */
export interface FormDefinition {
  /**
   * Form identifier (e.g., "FRM-001").
   */
  formId: string;
  
  /**
   * Form name.
   */
  name: string;
  
  /**
   * Form description.
   */
  description?: string;
  
  /**
   * Form type (Audit, Survey, Feedback, Inspection, Custom).
   */
  formType: string;
  
  /**
   * Form status (Draft, Active, Archived).
   */
  status: 'Draft' | 'Active' | 'Archived';
  
  /**
   * Organization ID (multi-tenancy).
   */
  organizationId: string;
  
  /**
   * All fields in the form.
   */
  fields: FormDefinitionField[];
  
  /**
   * Sections (for hierarchical organization).
   */
  sections?: FormSection[];
  
  /**
   * Form-level settings.
   */
  settings?: FormSettings;
  
  /**
   * Created timestamp.
   */
  createdAt?: Date;
  
  /**
   * Updated timestamp.
   */
  updatedAt?: Date;
  
  /**
   * Created by user ID.
   */
  createdBy?: string;
  
  /**
   * Updated by user ID.
   */
  updatedBy?: string;
}

/**
 * Form section (for hierarchical organization).
 */
export interface FormSection {
  /**
   * Section identifier.
   */
  sectionId: string;
  
  /**
   * Section name.
   */
  name: string;
  
  /**
   * Section description.
   */
  description?: string;
  
  /**
   * Weightage for scoring (0-100).
   */
  weightage?: number;
  
  /**
   * Display order.
   */
  order?: number;
  
  /**
   * Subsections (nested organization).
   */
  subsections?: FormSubsection[];
  
  /**
   * Field keys belonging to this section.
   */
  fieldKeys?: string[];
}

/**
 * Form subsection (nested within section).
 */
export interface FormSubsection {
  /**
   * Subsection identifier.
   */
  subsectionId: string;
  
  /**
   * Subsection name.
   */
  name: string;
  
  /**
   * Subsection description.
   */
  description?: string;
  
  /**
   * Weightage for scoring (0-100).
   */
  weightage?: number;
  
  /**
   * Display order.
   */
  order?: number;
  
  /**
   * Field keys belonging to this subsection.
   */
  fieldKeys?: string[];
}

/**
 * Form-level settings.
 */
export interface FormSettings {
  /**
   * Whether approval is required before submission.
   */
  approvalRequired?: boolean;
  
  /**
   * Whether form allows multiple submissions.
   */
  allowMultipleSubmissions?: boolean;
  
  /**
   * Whether form is publicly accessible.
   */
  isPublic?: boolean;
  
  /**
   * Expiry date (for surveys).
   */
  expiryDate?: Date;
  
  /**
   * Scoring formula (for audit forms).
   */
  scoringFormula?: string;
  
  /**
   * Pass threshold (for audit forms).
   */
  passThreshold?: number;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates a form definition field.
 * 
 * @param field - The field to validate
 * @throws Error if validation fails
 */
export function validateFormDefinitionField(field: FormDefinitionField): void {
  // Required fields
  if (!field.fieldKey || typeof field.fieldKey !== 'string') {
    throw new Error('FormDefinitionField.fieldKey is required and must be a string');
  }
  
  if (!field.label || typeof field.label !== 'string') {
    throw new Error('FormDefinitionField.label is required and must be a string');
  }
  
  if (!field.fieldType) {
    throw new Error('FormDefinitionField.fieldType is required');
  }
  
  if (typeof field.required !== 'boolean') {
    throw new Error('FormDefinitionField.required is required and must be a boolean');
  }
  
  if (!field.owner) {
    throw new Error('FormDefinitionField.owner is required');
  }
  
  if (!field.intent) {
    throw new Error('FormDefinitionField.intent is required');
  }
  
  // Field type specific validation
  if ((field.fieldType === 'select' || field.fieldType === 'multi-select') && !field.options) {
    throw new Error(`FormDefinitionField.options is required for fieldType: ${field.fieldType}`);
  }
  
  if (field.options && !Array.isArray(field.options)) {
    throw new Error('FormDefinitionField.options must be an array');
  }
  
  // Entity reference validation
  if (field.fieldType === 'entity' && !field.entityConfig) {
    throw new Error('FormDefinitionField.entityConfig is required for entity-type fields');
  }
  
  if (field.entityConfig && !field.entityConfig.module) {
    throw new Error('FormDefinitionField.entityConfig.module is required');
  }
  
  // Scoring validation
  if (field.scoring) {
    if (typeof field.scoring.enabled !== 'boolean') {
      throw new Error('FormDefinitionField.scoring.enabled must be a boolean');
    }
    
    if (field.scoring.enabled) {
      if (typeof field.scoring.weightage !== 'number' || field.scoring.weightage < 0 || field.scoring.weightage > 100) {
        throw new Error('FormDefinitionField.scoring.weightage must be a number between 0 and 100');
      }
    }
  }
  
  // Validation rules validation
  if (field.validationRules) {
    if (!Array.isArray(field.validationRules)) {
      throw new Error('FormDefinitionField.validationRules must be an array');
    }
    
    for (const rule of field.validationRules) {
      if (!rule.type || !rule.message) {
        throw new Error('ValidationRule must have type and message');
      }
    }
  }
}

/**
 * Validates a complete form definition.
 * 
 * @param definition - The form definition to validate
 * @throws Error if validation fails
 */
export function validateFormDefinition(definition: FormDefinition): void {
  // Required fields
  if (!definition.formId || typeof definition.formId !== 'string') {
    throw new Error('FormDefinition.formId is required and must be a string');
  }
  
  if (!definition.name || typeof definition.name !== 'string') {
    throw new Error('FormDefinition.name is required and must be a string');
  }
  
  if (!definition.formType || typeof definition.formType !== 'string') {
    throw new Error('FormDefinition.formType is required and must be a string');
  }
  
  if (!definition.organizationId || typeof definition.organizationId !== 'string') {
    throw new Error('FormDefinition.organizationId is required and must be a string');
  }
  
  // Fields validation
  if (!definition.fields || !Array.isArray(definition.fields)) {
    throw new Error('FormDefinition.fields is required and must be an array');
  }
  
  if (definition.fields.length === 0) {
    throw new Error('FormDefinition must have at least one field');
  }
  
  // Validate each field
  const fieldKeys = new Set<string>();
  for (const field of definition.fields) {
    validateFormDefinitionField(field);
    
    // Check for duplicate field keys
    if (fieldKeys.has(field.fieldKey)) {
      throw new Error(`Duplicate fieldKey found: ${field.fieldKey}`);
    }
    fieldKeys.add(field.fieldKey);
  }
  
  // Sections validation (if present)
  if (definition.sections) {
    if (!Array.isArray(definition.sections)) {
      throw new Error('FormDefinition.sections must be an array');
    }
    
    const sectionIds = new Set<string>();
    for (const section of definition.sections) {
      if (!section.sectionId) {
        throw new Error('FormSection.sectionId is required');
      }
      
      if (sectionIds.has(section.sectionId)) {
        throw new Error(`Duplicate sectionId found: ${section.sectionId}`);
      }
      sectionIds.add(section.sectionId);
      
      // Validate subsections if present
      if (section.subsections) {
        const subsectionIds = new Set<string>();
        for (const subsection of section.subsections) {
          if (!subsection.subsectionId) {
            throw new Error('FormSubsection.subsectionId is required');
          }
          
          if (subsectionIds.has(subsection.subsectionId)) {
            throw new Error(`Duplicate subsectionId found: ${subsection.subsectionId}`);
          }
          subsectionIds.add(subsection.subsectionId);
        }
      }
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get field by fieldKey from form definition.
 * 
 * @param definition - The form definition
 * @param fieldKey - The field key to find
 * @returns The field, or undefined if not found
 */
export function getFormField(
  definition: FormDefinition,
  fieldKey: string
): FormDefinitionField | undefined {
  return definition.fields.find(f => f.fieldKey === fieldKey);
}

/**
 * Get all required fields from form definition.
 * 
 * @param definition - The form definition
 * @returns Array of required fields
 */
export function getRequiredFields(definition: FormDefinition): FormDefinitionField[] {
  return definition.fields.filter(f => f.required === true);
}

/**
 * Get all fields by type from form definition.
 * 
 * @param definition - The form definition
 * @param fieldType - The field type to filter by
 * @returns Array of fields with the specified type
 */
export function getFieldsByType(
  definition: FormDefinition,
  fieldType: FormFieldType
): FormDefinitionField[] {
  return definition.fields.filter(f => f.fieldType === fieldType);
}

/**
 * Get all fields by intent from form definition.
 * 
 * @param definition - The form definition
 * @param intent - The intent to filter by
 * @returns Array of fields with the specified intent
 */
export function getFieldsByIntent(
  definition: FormDefinition,
  intent: FormFieldIntent
): FormDefinitionField[] {
  return definition.fields.filter(f => f.intent === intent);
}

/**
 * Get all filterable fields from form definition.
 * 
 * @param definition - The form definition
 * @returns Array of filterable fields
 */
export function getFilterableFields(definition: FormDefinition): FormDefinitionField[] {
  return definition.fields.filter(f => f.filterable === true);
}

/**
 * Check if a field exists in form definition.
 * 
 * @param definition - The form definition
 * @param fieldKey - The field key to check
 * @returns true if field exists
 */
export function hasField(definition: FormDefinition, fieldKey: string): boolean {
  return definition.fields.some(f => f.fieldKey === fieldKey);
}
