/**
 * ============================================================================
 * FORM SETTINGS FIELD MAPPING
 * ============================================================================
 * 
 * This file maps Form schema fields to Form Settings tabs.
 * It does not define behavior or enforcement.
 * 
 * PURPOSE:
 * - Provide a canonical mapping of Form schema fields to Settings tabs
 * - Document which fields are editable vs read-only
 * - Document field ownership (settings, builder, execution)
 * - Enable structured display in Form Settings UI
 * 
 * DO NOT:
 * - Define API calls or mutations
 * - Add validation or guards
 * - Change backend behavior
 * - Enable new editing capabilities
 * 
 * See: docs/architecture/form-settings-doctrine.md
 * ============================================================================
 */

export interface FormFieldMapping {
  /** Schema path (dot notation allowed for nested fields) */
  key: string;
  /** Human-readable label */
  label: string;
  /** Whether this field can be edited in Settings (read-only display if false) */
  editable: boolean;
  /** Source domain: settings, builder, or execution */
  source: 'settings' | 'builder' | 'execution';
  /** Optional human explanation */
  notes?: string;
  /** Whether this is a system field (cannot be modified, removed, or reordered) */
  isSystem?: boolean;
  /** Whether this is a fixed position field (cannot be reordered, must stay at top) */
  isFixed?: boolean;
}

export interface FormSettingsTabsMap {
  moduleDetails: FormFieldMapping[];
  metadataFields: FormFieldMapping[];
  logicAndRules: FormFieldMapping[];
  outcomes: FormFieldMapping[];
  access: FormFieldMapping[];
  relationships: FormFieldMapping[];
}

/**
 * Canonical mapping of Form schema fields to Form Settings tabs.
 * 
 * This is the SINGLE SOURCE OF TRUTH for field-to-tab mapping.
 * All Form Settings UI should reference this mapping.
 */
export const FORM_SETTINGS_TABS: FormSettingsTabsMap = {
  moduleDetails: [
    // Note: Core fields (name, description, formType, status, visibility, formVersion, formId) 
    // are now in metadataFields (Fields Configuration tab) to match user requirements.
    // This section can be used for module-level metadata if needed in the future.
  ],

  metadataFields: [
    // Core system fields (must appear in list, marked as fixed/system)
    // ARCHITECTURE NOTE: Forms use the same Fields Configuration model as other core modules.
    // "Metadata" is not a separate field type — these are record fields.
    // Form content structure is managed exclusively by the Form Builder.
    //
    // Core fields must always appear in the field list.
    // They may be fixed or read-only, but must never be hidden.
    // This preserves discoverability and prevents "magic fields".
    {
      key: 'name',
      label: 'Form Name',
      editable: true,
      source: 'settings',
      notes: 'Display name for the form (core field, fixed position)',
      isSystem: false,
      isFixed: true
    },
    {
      key: 'description',
      label: 'Description',
      editable: true,
      source: 'settings',
      notes: 'Form description and purpose'
    },
    // ARCHITECTURE NOTE: Form Type is a CORE domain field.
    // It is user-editable and intent-defining.
    // Built-in types are protected from deletion, not from selection or change.
    // See: client/src/platform/forms/formTypeRegistry.ts
    {
      key: 'formType',
      label: 'Form Type',
      editable: true,
      source: 'settings',
      notes: 'Form Type defines how the form is interpreted and executed. You can change the type or add new ones. Built-in types cannot be removed.',
      isSystem: false
    },
    {
      key: 'status',
      label: 'Status',
      editable: true,
      source: 'settings',
      notes: 'Form status (Draft, Ready, Active, Archived)',
      isSystem: false
    },
    {
      key: 'visibility',
      label: 'Visibility',
      editable: true,
      source: 'settings',
      notes: 'Form visibility (Internal, Partner, Public)'
    },
    {
      key: 'formVersion',
      label: 'Form Version',
      editable: false,
      source: 'settings',
      notes: 'Auto-incremented version number (increments when sections change)',
      isSystem: true
    },
    {
      key: 'formId',
      label: 'Form ID',
      editable: false,
      source: 'settings',
      notes: 'Auto-generated form identifier (e.g., FRM-001)',
      isSystem: true
    },
    {
      key: 'createdAt',
      label: 'Created At',
      editable: false,
      source: 'settings',
      notes: 'Form creation timestamp (system field)',
      isSystem: true
    },
    {
      key: 'updatedAt',
      label: 'Updated At',
      editable: false,
      source: 'settings',
      notes: 'Form last update timestamp (system field)',
      isSystem: true
    },
    {
      key: 'createdBy',
      label: 'Created By',
      editable: false,
      source: 'settings',
      notes: 'User who created the form (system field)',
      isSystem: true
    },
    {
      key: 'modifiedBy',
      label: 'Modified By',
      editable: false,
      source: 'settings',
      notes: 'User who last modified the form (system field)',
      isSystem: true
    },
    // Configurable fields
    {
      key: 'tags',
      label: 'Tags',
      editable: true,
      source: 'settings',
      notes: 'Tags for categorizing and filtering forms'
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      editable: true,
      source: 'settings',
      notes: 'User assigned to manage this form'
    },
    {
      key: 'expiryDate',
      label: 'Expiry Date',
      editable: true,
      source: 'settings',
      notes: 'Expiry date for surveys (optional)'
    }
  ],

  logicAndRules: [
    {
      key: 'approvalRequired',
      label: 'Approval Required',
      editable: true,
      source: 'settings',
      notes: 'Whether form submissions require approval'
    },
    {
      key: 'approvalWorkflow.enabled',
      label: 'Approval Workflow Enabled',
      editable: true,
      source: 'settings',
      notes: 'Enable or disable approval workflow'
    },
    {
      key: 'approvalWorkflow.approver',
      label: 'Approver',
      editable: true,
      source: 'settings',
      notes: 'User designated as approver'
    },
    {
      key: 'autoAssignment',
      label: 'Auto Assignment',
      editable: true,
      source: 'settings',
      notes: 'Automatic assignment rules for form responses'
    },
    {
      key: 'autoAssignment.enabled',
      label: 'Auto Assignment Enabled',
      editable: true,
      source: 'settings',
      notes: 'Enable automatic assignment'
    },
    {
      key: 'autoAssignment.linkTo',
      label: 'Link To',
      editable: true,
      source: 'settings',
      notes: 'Link assignments to organization or events'
    },
    {
      key: 'workflowOnSubmit',
      label: 'Workflow On Submit',
      editable: true,
      source: 'settings',
      notes: 'Workflow actions triggered on form submission'
    },
    {
      key: 'workflowOnSubmit.notify',
      label: 'Notify Users',
      editable: true,
      source: 'settings',
      notes: 'Users to notify on form submission'
    },
    {
      key: 'workflowOnSubmit.createTask',
      label: 'Create Task',
      editable: true,
      source: 'settings',
      notes: 'Create a task on form submission'
    },
    {
      key: 'workflowOnSubmit.updateField',
      label: 'Update Field',
      editable: true,
      source: 'settings',
      notes: 'Update a field value on form submission'
    },
    {
      key: 'kpiMetrics',
      label: 'KPI Metrics',
      editable: true,
      source: 'settings',
      notes: 'Key performance indicators to track (compliance, satisfaction, rating)'
    },
    {
      key: 'kpiMetrics.compliancePercentage',
      label: 'Compliance Percentage',
      editable: true,
      source: 'settings',
      notes: 'Track compliance percentage metric'
    },
    {
      key: 'kpiMetrics.satisfactionPercentage',
      label: 'Satisfaction Percentage',
      editable: true,
      source: 'settings',
      notes: 'Track satisfaction percentage metric'
    },
    {
      key: 'kpiMetrics.rating',
      label: 'Rating',
      editable: true,
      source: 'settings',
      notes: 'Track rating metric'
    },
    {
      key: 'scoringFormula',
      label: 'Scoring Formula',
      editable: true,
      source: 'settings',
      notes: 'Formula for calculating form scores'
    },
    {
      key: 'thresholds',
      label: 'Thresholds',
      editable: true,
      source: 'settings',
      notes: 'Pass and partial score thresholds'
    },
    {
      key: 'thresholds.pass',
      label: 'Pass Threshold',
      editable: true,
      source: 'settings',
      notes: 'Minimum score required to pass (0-100)'
    },
    {
      key: 'thresholds.partial',
      label: 'Partial Threshold',
      editable: true,
      source: 'settings',
      notes: 'Minimum score for partial pass (0-100)'
    }
  ],

  outcomes: [
    {
      key: 'outcomesAndRules',
      label: 'Outcomes & Rules',
      editable: false,
      source: 'settings',
      notes: 'Outcome rules configuration (read-only display)'
    },
    {
      key: 'outcomesAndRules.auditResultRule',
      label: 'Audit Result Rule',
      editable: true,
      source: 'settings',
      notes: 'Rule for determining audit results (any_section_fails, overall_score_below_threshold, critical_question_fails)'
    },
    {
      key: 'outcomesAndRules.reportingMetrics',
      label: 'Reporting Metrics',
      editable: true,
      source: 'settings',
      notes: 'Metrics to include in reports'
    },
    {
      key: 'outcomesAndRules.reportingMetrics.overallCompliance',
      label: 'Overall Compliance',
      editable: true,
      source: 'settings',
      notes: 'Include overall compliance in reports'
    },
    {
      key: 'outcomesAndRules.reportingMetrics.sectionWiseCompliance',
      label: 'Section-Wise Compliance',
      editable: true,
      source: 'settings',
      notes: 'Include section-wise compliance in reports'
    },
    {
      key: 'outcomesAndRules.reportingMetrics.evidenceCompletion',
      label: 'Evidence Completion',
      editable: true,
      source: 'settings',
      notes: 'Include evidence completion in reports'
    },
    {
      key: 'outcomesAndRules.reportingMetrics.averageRating',
      label: 'Average Rating',
      editable: true,
      source: 'settings',
      notes: 'Include average rating in reports'
    },
    {
      key: 'outcomesAndRules.postSubmissionSignals',
      label: 'Post Submission Signals',
      editable: true,
      source: 'settings',
      notes: 'Signals emitted after form submission'
    },
    {
      key: 'outcomesAndRules.postSubmissionSignals.emitOnAuditFail',
      label: 'Emit on Audit Fail',
      editable: true,
      source: 'settings',
      notes: 'Emit signal when audit fails'
    },
    {
      key: 'outcomesAndRules.postSubmissionSignals.emitOnSectionFail',
      label: 'Emit on Section Fail',
      editable: true,
      source: 'settings',
      notes: 'Emit signal when a section fails'
    },
    {
      key: 'outcomesAndRules.postSubmissionSignals.emitOnCriticalQuestionFail',
      label: 'Emit on Critical Question Fail',
      editable: true,
      source: 'settings',
      notes: 'Emit signal when a critical question fails'
    },
    {
      key: 'outcomesAndRules.postSubmissionSignals.emitOnMissingEvidence',
      label: 'Emit on Missing Evidence',
      editable: true,
      source: 'settings',
      notes: 'Emit signal when evidence is missing'
    }
  ],

  access: [
    {
      key: 'publicLink',
      label: 'Public Link',
      editable: false,
      source: 'settings',
      notes: 'Public link configuration (read-only display)'
    },
    {
      key: 'publicLink.enabled',
      label: 'Public Link Enabled',
      editable: true,
      source: 'settings',
      notes: 'Enable public access via link'
    },
    {
      key: 'publicLink.slug',
      label: 'Public Link Slug',
      editable: false,
      source: 'settings',
      notes: 'URL slug for public access (auto-generated, read-only)'
    }
    // Note: visibility is in metadataFields (Fields Configuration tab)
    // Note: approvalWorkflow is in logicAndRules tab
  ],

  relationships: [
    {
      key: 'organizationId',
      label: 'Organization',
      editable: false,
      source: 'settings',
      notes: 'Organization that owns this form (multi-tenancy)'
    },
    {
      key: 'linkedEvents',
      label: 'Linked Events',
      editable: false,
      source: 'execution',
      notes: 'Events linked to this form (managed by execution, read-only)'
    },
    {
      key: 'linkedOrganizations',
      label: 'Linked Organizations',
      editable: false,
      source: 'execution',
      notes: 'Organizations linked to this form (managed by execution, read-only)'
    }
  ]
};

/**
 * Builder-only fields (explicitly excluded from Settings).
 * These fields can ONLY be edited in Form Builder.
 */
export const BUILDER_ONLY_FIELDS: string[] = [
  'sections',
  'sections[].sectionId',
  'sections[].name',
  'sections[].weightage',
  'sections[].order',
  'sections[]._isRootSection',
  'sections[].sectionScoring',
  'sections[].sectionScoring.weight',
  'sections[].sectionScoring.threshold',
  'sections[].subsections',
  'sections[].subsections[].subsectionId',
  'sections[].subsections[].name',
  'sections[].subsections[].weightage',
  'sections[].subsections[].order',
  'sections[].subsections[].subsectionScoring',
  'sections[].subsections[].subsectionScoring.weight',
  'sections[].subsections[].subsectionScoring.threshold',
  'sections[].subsections[].questions',
  'sections[].subsections[].questions[].questionId',
  'sections[].subsections[].questions[].questionText',
  'sections[].subsections[].questions[].type',
  'sections[].subsections[].questions[].options',
  'sections[].subsections[].questions[].mandatory',
  'sections[].subsections[].questions[].helpText',
  'sections[].subsections[].questions[].evidence',
  'sections[].subsections[].questions[].scoring',
  'sections[].subsections[].questions[].scoring.enabled',
  'sections[].subsections[].questions[].scoring.weight',
  'sections[].subsections[].questions[].scoring.passCondition',
  'sections[].subsections[].questions[].scoring.critical',
  'sections[].subsections[].questions[].scoringLogic',
  'sections[].subsections[].questions[].conditionalLogic',
  'sections[].subsections[].questions[].attachmentAllowance',
  'sections[].subsections[].questions[].passFailDefinition',
  'sections[].subsections[].questions[].order',
  'sections[].questions',
  'responseTemplate'
];

/**
 * Execution-only fields (explicitly excluded from Settings).
 * These fields are managed by execution and workflow systems.
 */
export const EXECUTION_ONLY_FIELDS: string[] = [
  'totalResponses',
  'avgRating',
  'avgCompliance',
  'responseRate',
  'lastSubmission'
];

/**
 * Get all field mappings for a specific tab.
 */
export function getFieldsForTab(tab: keyof FormSettingsTabsMap): FormFieldMapping[] {
  return FORM_SETTINGS_TABS[tab] || [];
}

/**
 * Get a field mapping by key.
 */
export function getFieldMapping(key: string): FormFieldMapping | undefined {
  for (const tab of Object.values(FORM_SETTINGS_TABS)) {
    const field = tab.find(f => f.key === key);
    if (field) return field;
  }
  return undefined;
}

/**
 * Check if a field is builder-only.
 */
export function isBuilderOnlyField(key: string): boolean {
  return BUILDER_ONLY_FIELDS.some(pattern => {
    // Simple pattern matching for array notation
    const normalizedPattern = pattern.replace(/\[\]/g, '');
    const normalizedKey = key.replace(/\[\]/g, '');
    return normalizedKey.startsWith(normalizedPattern) || normalizedKey === normalizedPattern;
  });
}

/**
 * Check if a field is execution-only.
 */
export function isExecutionOnlyField(key: string): boolean {
  return EXECUTION_ONLY_FIELDS.includes(key);
}

// DEV-only assertions
if (process.env.NODE_ENV === 'development') {
  // Assert: Every mapped field has a valid tab
  const allFields = Object.values(FORM_SETTINGS_TABS).flat();
  const allKeys = allFields.map(f => f.key);
  const uniqueKeys = new Set(allKeys);
  
  // Check for duplicates and log which keys are duplicated
  if (allKeys.length !== uniqueKeys.size) {
    const duplicates = allKeys.filter((key, index) => allKeys.indexOf(key) !== index);
    const duplicateSet = new Set(duplicates);
    console.error(
      '[Form Settings Map] Duplicate field keys found:',
      Array.from(duplicateSet),
      '\nAll keys:',
      allKeys
    );
  }
  
  console.assert(
    allKeys.length === uniqueKeys.size,
    '[Form Settings Map] Duplicate field keys found. Each field key should appear only once across all tabs.'
  );

  // Assert: No builder-only field is marked editable
  allFields.forEach(field => {
    if (isBuilderOnlyField(field.key)) {
      console.assert(
        !field.editable && field.source === 'builder',
        `[Form Settings Map] Builder-only field "${field.key}" must not be editable and source must be 'builder'`
      );
    }
  });

  // Assert: No execution-only field appears editable
  allFields.forEach(field => {
    if (isExecutionOnlyField(field.key)) {
      console.assert(
        !field.editable && field.source === 'execution',
        `[Form Settings Map] Execution-only field "${field.key}" must not be editable and source must be 'execution'`
      );
    }
  });
}
