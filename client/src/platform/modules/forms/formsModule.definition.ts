/**
 * ============================================================================
 * FORMS MODULE — SETTINGS DEFINITION
 * ============================================================================
 * 
 * See docs/architecture/form-settings-doctrine.md
 * Form Settings are configuration-only and must respect domain boundaries
 * 
 * See client/src/platform/forms/formSettingsCapabilities.ts
 * Capability flags explicitly declare what Form Settings can and cannot do
 * 
 * Forms Settings configure structure & behavior ONLY.
 *
 * MUST NOT:
 * - Edit sections/questions
 * - Edit responses
 * - Execute workflows
 * - Run scoring
 *
 * This module is configuration-only.
 * ============================================================================
 */

export const FormsModuleDefinition = {
  key: 'forms',
  ownership: {
    core: [
      'name',
      'description',
      'visibility',
      'status',
      'assignedTo',
      'approvalRequired',
    ],
    system: [
      'formId',
      'formType',
      'formVersion',
      'createdAt',
      'updatedAt',
    ],
    appParticipation: [],
  },

  exclusions: {
    quickCreate: true,
    creation: true,
    execution: true,
    responses: true,
  },
};
