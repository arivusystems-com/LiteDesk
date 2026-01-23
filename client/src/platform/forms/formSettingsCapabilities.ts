/**
 * ============================================================================
 * FORM SETTINGS CAPABILITIES
 * ============================================================================
 * 
 * This file declares Form Settings capabilities.
 * It does NOT enable behavior.
 * It does NOT enforce permissions.
 * It exists to make scope explicit and future-safe.
 * 
 * PURPOSE:
 * - Explicitly declare what Form Settings CAN and CANNOT do
 * - Prevent accidental feature enablement
 * - Provide clear scope boundaries for future contributors
 * - Enable controlled expansion without refactors
 * 
 * USAGE:
 * - Import in UI components for visual indicators (badges, labels, helper text)
 * - Use for DEV-only safety assertions
 * - Reference in architectural documentation
 * 
 * DO NOT:
 * - Use flags to conditionally enable/disable features
 * - Use flags for permission checks
 * - Use flags for feature toggles
 * - Use flags for environment branching
 * 
 * See: docs/architecture/form-settings-doctrine.md
 * ============================================================================
 */

/**
 * Form Settings Capability Flags
 * 
 * These flags explicitly declare what Form Settings can and cannot do.
 * They are descriptive declarations, not functional controls.
 * 
 * When adding new capabilities:
 * 1. Update this interface
 * 2. Update the constant below
 * 3. Add DEV-only assertions if capability is locked
 * 4. Update form-settings-doctrine.md if scope changes
 */
export interface FormSettingsCapabilities {
  // ============================================================================
  // ENABLED CAPABILITIES
  // ============================================================================
  // These capabilities are available in Form Settings today.
  
  /** Can edit form metadata fields (name, description, tags, assignedTo, etc.) */
  metadataEditable: boolean;
  
  /** Can configure form lifecycle (status, visibility, expiry) */
  lifecycleConfigurable: boolean;
  
  /** Can configure form access (public links, approval workflows) */
  accessConfigurable: boolean;
  
  /** Can configure form behavior rules (auto-assignment, workflow triggers) */
  behaviorRulesConfigurable: boolean;
  
  /** Can configure form outcomes (audit rules, reporting metrics, signals) */
  outcomesConfigurable: boolean;
  
  /** Can view form relationships (read-only display) */
  relationshipsViewable: boolean;

  // ============================================================================
  // EXPLICITLY DISABLED CAPABILITIES (LOCKED)
  // ============================================================================
  // These capabilities are explicitly NOT available in Form Settings.
  // They belong to other domains (Form Builder, Execution, etc.).
  
  /** CANNOT edit form structure (sections, subsections, questions) */
  builderEditable: boolean;
  
  /** CANNOT edit scoring weights at question/section level */
  scoringEditable: boolean;
  
  /** CANNOT edit question-level conditional logic */
  questionLogicEditable: boolean;
  
  /** CANNOT control execution behavior (submission, workflows) */
  executionBehaviorEditable: boolean;
  
  /** CANNOT execute or mutate workflow state */
  workflowExecutionEditable: boolean;
  
  /** CANNOT mutate form submissions or responses */
  submissionMutationAllowed: boolean;
  
  /** CANNOT edit form content (question text, options, types) */
  contentEditable: boolean;
  
  /** CANNOT bypass audit workflow rules */
  auditWorkflowBypassAllowed: boolean;
}

/**
 * Form Settings Capability Declaration
 * 
 * This is the SINGLE SOURCE OF TRUTH for Form Settings capabilities.
 * All capability checks should reference this constant.
 * 
 * ARCHITECTURAL RATIONALE:
 * - Form Builder owns structure & content (sections, questions, scoring weights)
 * - Form Execution owns execution & submission (workflows, state mutations)
 * - Form Settings owns configuration only (behavior, lifecycle, access, outcomes)
 * 
 * See: docs/architecture/form-settings-doctrine.md Section 3 (Ownership & Authority)
 */
export const FORM_SETTINGS_CAPABILITIES: FormSettingsCapabilities = {
  // ============================================================================
  // ENABLED CAPABILITIES
  // ============================================================================
  
  metadataEditable: true,
  lifecycleConfigurable: true,
  accessConfigurable: true,
  behaviorRulesConfigurable: true,
  outcomesConfigurable: true,
  relationshipsViewable: true,

  // ============================================================================
  // EXPLICITLY DISABLED CAPABILITIES (LOCKED)
  // ============================================================================
  
  builderEditable: false,
  scoringEditable: false,
  questionLogicEditable: false,
  executionBehaviorEditable: false,
  workflowExecutionEditable: false,
  submissionMutationAllowed: false,
  contentEditable: false,
  auditWorkflowBypassAllowed: false,
};

/**
 * Get capability label for UI display
 */
export function getCapabilityLabel(capability: keyof FormSettingsCapabilities): string {
  const labels: Record<keyof FormSettingsCapabilities, string> = {
    metadataEditable: 'Metadata Editable',
    lifecycleConfigurable: 'Lifecycle Configurable',
    accessConfigurable: 'Access Configurable',
    behaviorRulesConfigurable: 'Behavior Rules Configurable',
    outcomesConfigurable: 'Outcomes Configurable',
    relationshipsViewable: 'Relationships Viewable',
    builderEditable: 'Builder Editable',
    scoringEditable: 'Scoring Editable',
    questionLogicEditable: 'Question Logic Editable',
    executionBehaviorEditable: 'Execution Behavior Editable',
    workflowExecutionEditable: 'Workflow Execution Editable',
    submissionMutationAllowed: 'Submission Mutation Allowed',
    contentEditable: 'Content Editable',
    auditWorkflowBypassAllowed: 'Audit Workflow Bypass Allowed',
  };
  return labels[capability] || capability;
}

/**
 * Check if a capability is enabled
 */
export function hasCapability(capability: keyof FormSettingsCapabilities): boolean {
  return FORM_SETTINGS_CAPABILITIES[capability] === true;
}

/**
 * Check if a capability is explicitly disabled (locked)
 */
export function isCapabilityLocked(capability: keyof FormSettingsCapabilities): boolean {
  return FORM_SETTINGS_CAPABILITIES[capability] === false;
}

// ============================================================================
// DEV-ONLY SAFETY ASSERTIONS
// ============================================================================
// These assertions ensure critical capabilities remain locked.
// If any of these flip, Form Settings must be re-reviewed.

if (process.env.NODE_ENV === 'development') {
  // Assert: Form Builder capabilities must remain locked
  // Rationale: Form Builder owns structure & content. Form Settings must never edit form structure.
  console.assert(
    !FORM_SETTINGS_CAPABILITIES.builderEditable,
    '[Form Settings] builderEditable must remain false. Form Builder owns structure & content. See docs/architecture/form-settings-doctrine.md'
  );
  
  // Assert: Scoring capabilities must remain locked
  // Rationale: Scoring weights belong to Form Builder. Form Settings configures behavior, not content.
  console.assert(
    !FORM_SETTINGS_CAPABILITIES.scoringEditable,
    '[Form Settings] scoringEditable must remain false. Scoring weights belong to Form Builder. See docs/architecture/form-settings-doctrine.md'
  );
  
  // Assert: Execution behavior must remain locked
  // Rationale: Execution belongs to Event Execution / Work interfaces. Form Settings configures rules, not execution.
  console.assert(
    !FORM_SETTINGS_CAPABILITIES.executionBehaviorEditable,
    '[Form Settings] executionBehaviorEditable must remain false. Execution belongs to Event Execution / Work interfaces. See docs/architecture/form-settings-doctrine.md'
  );
  
  // Assert: Workflow execution must remain locked
  // Rationale: Workflow execution belongs to Audit Workflow / Work components. Form Settings configures rules, not execution.
  console.assert(
    !FORM_SETTINGS_CAPABILITIES.workflowExecutionEditable,
    '[Form Settings] workflowExecutionEditable must remain false. Workflow execution belongs to Audit Workflow / Work components. See docs/architecture/form-settings-doctrine.md'
  );
  
  // Assert: Content editing must remain locked
  // Rationale: Form content (questions, options, types) belongs to Form Builder. Form Settings configures behavior, not content.
  console.assert(
    !FORM_SETTINGS_CAPABILITIES.contentEditable,
    '[Form Settings] contentEditable must remain false. Form content belongs to Form Builder. See docs/architecture/form-settings-doctrine.md'
  );
  
  // Assert: Audit workflow bypass must remain locked
  // Rationale: Audit workflow rules are owned by Audit App. Form Settings configures form rules, not audit workflow.
  console.assert(
    !FORM_SETTINGS_CAPABILITIES.auditWorkflowBypassAllowed,
    '[Form Settings] auditWorkflowBypassAllowed must remain false. Audit workflow rules are owned by Audit App. See docs/architecture/form-settings-doctrine.md'
  );
  
  // Assert: Submission mutation must remain locked
  // Rationale: Form submissions belong to Form Responses / Analytics. Form Settings configures behavior, not responses.
  console.assert(
    !FORM_SETTINGS_CAPABILITIES.submissionMutationAllowed,
    '[Form Settings] submissionMutationAllowed must remain false. Form submissions belong to Form Responses / Analytics. See docs/architecture/form-settings-doctrine.md'
  );
}
