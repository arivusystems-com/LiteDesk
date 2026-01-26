/**
 * ============================================================================
 * FORM RESPONSE MODEL
 * ============================================================================
 * 
 * Stores values for submitted forms, referencing FormDefinitionField keys.
 * 
 * ⚠️ ARCHITECTURAL CONTRACT:
 * 
 * 1. Form Responses are instance data, not metadata
 *    - Store actual user-entered values
 *    - Reference FormDefinition for schema
 *    - No metadata logic here
 * 
 * 2. Values are untyped at platform level
 *    - Values stored as Record<string, unknown>
 *    - Validation happens using FormDefinition
 *    - Type safety via FormDefinition, not Response
 * 
 * 3. Policies apply at submission time
 *    - Not at definition time
 *    - Validation uses FormDefinition
 *    - Editability uses FormDefinition + Response status
 * 
 * 4. This is the DATA layer, not the SCHEMA layer
 *    - FormResponseModel stores instance values
 *    - FormDefinitionFieldModel describes structure
 * 
 * ============================================================================
 * 
 * USAGE:
 * 
 * ```typescript
 * // Create a form response
 * const response: FormResponse = {
 *   responseId: "RESP-001",
 *   formId: "FRM-001",
 *   submittedBy: "user-123",
 *   submittedAt: new Date(),
 *   status: "submitted",
 *   values: {
 *     "customer_satisfaction": 5,
 *     "comments": "Great service!"
 *   }
 * };
 * 
 * // Validate response against definition
 * validateFormResponse(response, formDefinition);
 * ```
 * 
 * ============================================================================
 */

import type { FormDefinition, FormDefinitionField, FormResponseStatus } from './FormDefinitionFieldModel';

// Re-export for convenience
export type { FormResponseStatus };

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Attachment metadata.
 */
export interface Attachment {
  /**
   * Attachment ID.
   */
  attachmentId: string;
  
  /**
   * File name.
   */
  fileName: string;
  
  /**
   * File URL or path.
   */
  fileUrl: string;
  
  /**
   * File size in bytes.
   */
  fileSize?: number;
  
  /**
   * MIME type.
   */
  mimeType?: string;
  
  /**
   * Upload timestamp.
   */
  uploadedAt: Date;
  
  /**
   * Field key this attachment belongs to (if field-specific).
   */
  fieldKey?: string;
}

/**
 * Linked record reference.
 * Links form response to a platform record.
 */
export interface LinkedRecord {
  /**
   * Module type (e.g., 'deal', 'task', 'organization').
   */
  module: string;
  
  /**
   * Record ID.
   */
  recordId: string;
  
  /**
   * Record name (for display).
   */
  recordName?: string;
}

/**
 * Scoring result (computed from FormDefinition).
 */
export interface ScoreResult {
  /**
   * Total possible score.
   */
  total: number;
  
  /**
   * Points earned.
   */
  earned: number;
  
  /**
   * Percentage score (0-100).
   */
  percentage: number;
  
  /**
   * Number of questions passed.
   */
  passed: number;
  
  /**
   * Number of questions failed.
   */
  failed: number;
  
  /**
   * Whether form passed threshold (for audit forms).
   */
  passedThreshold?: boolean;
}

/**
 * Review information.
 */
export interface ReviewInfo {
  /**
   * User ID who reviewed.
   */
  reviewedBy: string;
  
  /**
   * Review timestamp.
   */
  reviewedAt: Date;
  
  /**
   * Review comments.
   */
  comments?: string;
  
  /**
   * Review decision (approved/rejected).
   */
  decision?: 'approved' | 'rejected';
}

// =============================================================================
// FORM RESPONSE INTERFACE
// =============================================================================

/**
 * Form Response data.
 * Stores values for a submitted form instance.
 * 
 * This is the data layer - see FormDefinitionFieldModel for the schema layer.
 */
export interface FormResponse {
  /**
   * REQUIRED: Unique response identifier.
   * Examples: "RESP-001", "RESP-2026-001"
   */
  responseId: string;
  
  /**
   * REQUIRED: Reference to FormDefinition.
   * Links response to its form schema.
   */
  formId: string;
  
  /**
   * REQUIRED: User ID who submitted the response.
   */
  submittedBy: string;
  
  /**
   * REQUIRED: Submission timestamp.
   */
  submittedAt: Date;
  
  /**
   * REQUIRED: Response status.
   * Tracks lifecycle of the submission.
   */
  status: FormResponseStatus;
  
  /**
   * REQUIRED: Field values.
   * Maps fieldKey -> value.
   * Values are untyped at platform level.
   */
  values: Record<string, unknown>;
  
  /**
   * OPTIONAL: Linked record reference.
   * Links response to a platform record (Deal, Task, etc.).
   */
  linkedRecord?: LinkedRecord;
  
  /**
   * OPTIONAL: Attachments.
   * Files uploaded with the response.
   */
  attachments?: Attachment[];
  
  /**
   * OPTIONAL: Scoring result.
   * Computed from FormDefinition scoring configuration.
   */
  score?: ScoreResult;
  
  /**
   * OPTIONAL: Review information.
   * Present if response has been reviewed.
   */
  review?: ReviewInfo;
  
  /**
   * OPTIONAL: Organization ID (multi-tenancy).
   */
  organizationId?: string;
  
  /**
   * OPTIONAL: Created timestamp.
   */
  createdAt?: Date;
  
  /**
   * OPTIONAL: Updated timestamp.
   */
  updatedAt?: Date;
  
  /**
   * OPTIONAL: Draft save timestamp (if status is 'draft').
   */
  lastSavedAt?: Date;
  
  /**
   * OPTIONAL: IP address of submitter (for audit).
   */
  ipAddress?: string;
  
  /**
   * OPTIONAL: User agent of submitter (for audit).
   */
  userAgent?: string;
  
  /**
   * OPTIONAL: Custom metadata.
   * For app-specific extensions.
   */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates a form response against its form definition.
 * 
 * @param response - The form response to validate
 * @param definition - The form definition to validate against
 * @returns Validation result with errors if any
 */
export function validateFormResponse(
  response: FormResponse,
  definition: FormDefinition
): {
  valid: boolean;
  errors: Array<{ fieldKey: string; message: string }>;
} {
  const errors: Array<{ fieldKey: string; message: string }> = [];
  
  // Check required fields
  const requiredFields = definition.fields.filter(f => f.required);
  for (const field of requiredFields) {
    const value = response.values[field.fieldKey];
    
    // Check if value is missing or empty
    if (value === undefined || value === null || value === '') {
      errors.push({
        fieldKey: field.fieldKey,
        message: `${field.label} is required`
      });
    }
  }
  
  // Validate field values against field types
  for (const [fieldKey, value] of Object.entries(response.values)) {
    const field = definition.fields.find(f => f.fieldKey === fieldKey);
    
    if (!field) {
      // Unknown field - warn but don't fail
      continue;
    }
    
    // Type-specific validation
    const typeError = validateFieldValueType(field, value);
    if (typeError) {
      errors.push({
        fieldKey: field.fieldKey,
        message: typeError
      });
    }
    
    // Custom validation rules
    if (field.validationRules) {
      for (const rule of field.validationRules) {
        const ruleError = validateFieldValueRule(field, value, rule);
        if (ruleError) {
          errors.push({
            fieldKey: field.fieldKey,
            message: ruleError
          });
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a field value against its field type.
 * 
 * @param field - The field definition
 * @param value - The value to validate
 * @returns Error message if invalid, undefined if valid
 */
function validateFieldValueType(
  field: FormDefinitionField,
  value: unknown
): string | undefined {
  switch (field.fieldType) {
    case 'number':
      if (typeof value !== 'number' && value !== null && value !== undefined) {
        return `${field.label} must be a number`;
      }
      break;
      
    case 'select':
      if (field.options && !field.options.includes(value as string)) {
        return `${field.label} must be one of: ${field.options.join(', ')}`;
      }
      break;
      
    case 'multi-select':
      if (!Array.isArray(value)) {
        return `${field.label} must be an array`;
      }
      if (field.options) {
        for (const item of value as unknown[]) {
          if (!field.options.includes(item as string)) {
            return `${field.label} contains invalid option: ${item}`;
          }
        }
      }
      break;
      
    case 'yes-no':
      if (value !== 'Yes' && value !== 'No' && value !== true && value !== false) {
        return `${field.label} must be Yes or No`;
      }
      break;
      
    case 'checkbox':
      if (typeof value !== 'boolean') {
        return `${field.label} must be a boolean`;
      }
      break;
      
    case 'date':
    case 'date-time':
      if (value && !(value instanceof Date) && typeof value !== 'string') {
        return `${field.label} must be a date`;
      }
      break;
      
    case 'rating':
      if (typeof value !== 'number' || value < 1 || value > 5) {
        return `${field.label} must be a number between 1 and 5`;
      }
      break;
  }
  
  return undefined;
}

/**
 * Validates a field value against a validation rule.
 * 
 * @param field - The field definition
 * @param value - The value to validate
 * @param rule - The validation rule
 * @returns Error message if invalid, undefined if valid
 */
function validateFieldValueRule(
  field: FormDefinitionField,
  value: unknown,
  rule: { type: string; value: unknown; message: string }
): string | undefined {
  switch (rule.type) {
    case 'min':
      if (typeof value === 'number' && value < (rule.value as number)) {
        return rule.message;
      }
      break;
      
    case 'max':
      if (typeof value === 'number' && value > (rule.value as number)) {
        return rule.message;
      }
      break;
      
    case 'minLength':
      if (typeof value === 'string' && value.length < (rule.value as number)) {
        return rule.message;
      }
      break;
      
    case 'maxLength':
      if (typeof value === 'string' && value.length > (rule.value as number)) {
        return rule.message;
      }
      break;
      
    case 'pattern':
      if (typeof value === 'string') {
        const regex = new RegExp(rule.value as string);
        if (!regex.test(value)) {
          return rule.message;
        }
      }
      break;
  }
  
  return undefined;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a field value from form response.
 * 
 * @param response - The form response
 * @param fieldKey - The field key
 * @returns The field value, or undefined if not found
 */
export function getFieldValue(
  response: FormResponse,
  fieldKey: string
): unknown {
  return response.values[fieldKey];
}

/**
 * Set a field value in form response.
 * Creates a new response object (immutable).
 * 
 * @param response - The form response
 * @param fieldKey - The field key
 * @param value - The value to set
 * @returns New form response with updated value
 */
export function setFieldValue(
  response: FormResponse,
  fieldKey: string,
  value: unknown
): FormResponse {
  return {
    ...response,
    values: {
      ...response.values,
      [fieldKey]: value
    },
    updatedAt: new Date()
  };
}

/**
 * Check if response is in draft status.
 * 
 * @param response - The form response
 * @returns true if status is 'draft'
 */
export function isDraft(response: FormResponse): boolean {
  return response.status === 'draft';
}

/**
 * Check if response is submitted.
 * 
 * @param response - The form response
 * @returns true if status is 'submitted' or later
 */
export function isSubmitted(response: FormResponse): boolean {
  return response.status !== 'draft';
}

/**
 * Check if response can be edited.
 * Draft responses can be edited, submitted responses cannot (unless admin).
 * 
 * @param response - The form response
 * @param isAdmin - Whether user is admin
 * @returns true if response can be edited
 */
export function canEditResponse(
  response: FormResponse,
  isAdmin: boolean = false
): boolean {
  if (isDraft(response)) {
    return true;
  }
  
  // Submitted responses can only be edited by admins
  return isAdmin;
}

/**
 * Calculate score for a form response.
 * Uses FormDefinition scoring configuration.
 * 
 * @param response - The form response
 * @param definition - The form definition
 * @returns Score result, or undefined if scoring not enabled
 */
export function calculateScore(
  response: FormResponse,
  definition: FormDefinition
): ScoreResult | undefined {
  let totalWeight = 0;
  let earnedWeight = 0;
  let passed = 0;
  let failed = 0;
  
  // Calculate score for each field
  for (const field of definition.fields) {
    if (!field.scoring || !field.scoring.enabled) {
      continue;
    }
    
    const value = response.values[field.fieldKey];
    const weight = field.scoring.weightage || 0;
    
    totalWeight += weight;
    
    // Check if field passed
    if (field.scoring.passValue !== undefined) {
      if (value === field.scoring.passValue) {
        earnedWeight += weight;
        passed++;
      } else {
        failed++;
      }
    } else if (field.scoring.failValue !== undefined) {
      if (value !== field.scoring.failValue) {
        earnedWeight += weight;
        passed++;
      } else {
        failed++;
      }
    }
  }
  
  if (totalWeight === 0) {
    return undefined;
  }
  
  const percentage = Math.round((earnedWeight / totalWeight) * 100);
  
  // Check if passed threshold (if defined)
  const passThreshold = definition.settings?.passThreshold;
  const passedThreshold = passThreshold !== undefined
    ? percentage >= passThreshold
    : undefined;
  
  return {
    total: totalWeight,
    earned: earnedWeight,
    percentage,
    passed,
    failed,
    passedThreshold
  };
}

/**
 * Get all responses for a form.
 * (This would typically come from a database query)
 * 
 * @param formId - The form ID
 * @param responses - Array of all responses (would come from DB)
 * @returns Filtered responses for the form
 */
export function getResponsesForForm(
  formId: string,
  responses: FormResponse[]
): FormResponse[] {
  return responses.filter(r => r.formId === formId);
}

/**
 * Get response by ID.
 * 
 * @param responseId - The response ID
 * @param responses - Array of all responses (would come from DB)
 * @returns The response, or undefined if not found
 */
export function getResponseById(
  responseId: string,
  responses: FormResponse[]
): FormResponse | undefined {
  return responses.find(r => r.responseId === responseId);
}
