# Form Settings Doctrine

**Version:** 1.0  
**Date:** January 2026  
**Status:** Architectural Doctrine (Locked)  
**Type:** Platform Architecture Doctrine

---

## Executive Summary

Form Settings is the **SINGLE SOURCE OF TRUTH** for form behavior, lifecycle, access, and outcomes configuration across the LiteDesk platform. This doctrine defines the architectural principles, invariants, and boundaries that govern Form Settings.

**Key Principle:** Form Settings configure **structure and behavior only**. They do not manage form content, execution, submission, or responses.

**Canonical Reference:** People Settings (`/settings?tab=core-modules&moduleKey=people`)  
**Settings Location:** `/settings?tab=core-modules&moduleKey=forms`  
**Related Documents:** `module-settings-doctrine.md`, `task-settings.md`, `event-settings-doctrine.md`

---

## 1. Purpose

### What Form Settings IS

Form Settings is the **central configuration surface** for:

1. **Form Behavior Configuration**
   - Form lifecycle settings (status, visibility, assignedTo)
   - Approval workflow configuration
   - Auto-assignment rules
   - Public link access settings

2. **Logic & Rules Configuration**
   - KPI metrics selection
   - Scoring formula configuration
   - Threshold definitions (pass/partial)
   - Auto-assignment rules

3. **Outcomes Configuration**
   - Audit result rules
   - Reporting metrics configuration
   - Post-submission signal rules

4. **Access Configuration**
   - Public link enablement and slug
   - Approval workflow settings
   - Visibility controls

5. **Metadata Fields**
   - Form metadata field definitions
   - Field visibility and requirements
   - Field ordering and grouping

**Scope:** Form Settings apply across all apps using forms (Audit, Survey, Inspection, etc.). They configure how forms behave, not what forms contain.

---

## 2. Non-Goals (CRITICAL)

### Form Settings MUST NEVER

Form Settings **MUST NEVER** configure:

1. **Form Content**
   - Edit form sections, subsections, or questions
   - Modify question text, types, or options
   - Change question order within sections
   - Add or remove sections/subsections
   - Modify scoring weights at question/section level

2. **Form Execution**
   - Control form submission
   - Execute workflows
   - Run scoring calculations
   - Process form responses
   - Mutate form execution state

3. **Form Builder Functionality**
   - Replace the Form Builder
   - Duplicate Form Builder features
   - Edit form structure or content
   - Modify form templates

4. **Response Management**
   - Act as a response editor
   - View or edit form responses
   - Modify response data
   - Process response analytics

5. **Audit Workflow Control**
   - Bypass audit workflow rules
   - Override audit state transitions
   - Control audit approval flows
   - Modify audit lifecycle

**Rationale:** These boundaries prevent architectural confusion and maintain clear separation of concerns. Form Builder owns content, Event Execution owns execution, and Form Settings owns configuration.

---

## 3. Ownership & Authority

### Domain Ownership Map

| Domain | Owner | Responsibility |
|--------|-------|----------------|
| **Form Settings** | Platform | Configure form behavior, lifecycle, access, outcomes |
| **Form Builder** | Platform | Edit form structure, sections, questions, scoring weights |
| **Form Execution** | Event Execution / Work Interfaces | Submit forms, execute workflows, process responses |
| **Audit Workflow** | Audit App / Work Components | Manage audit lifecycle, approvals, state transitions |
| **Response Management** | Form Responses / Analytics | View, edit, analyze form responses |

### Authority Boundaries

- **Form Settings** can configure behavior settings but cannot edit form content
- **Form Builder** can edit form content but cannot configure behavior settings
- **Form Execution** can execute forms but cannot configure settings or edit content
- **Audit Workflow** can manage audit lifecycle but cannot bypass Settings configuration

---

## 4. Schema Ownership Map

### Form Schema Field Classification

The Form model (`server/models/Form.js`) contains fields that belong to different domains. This section explicitly documents which fields belong to which domain.

#### Settings (Editable)

These fields can be configured in Form Settings:

- `visibility` - Form visibility (Internal, Partner, Public)
- `status` - Form status (Draft, Ready, Active, Archived)
- `assignedTo` - Form assignee
- `approvalRequired` - Whether approval is required
- `kpiMetrics` - KPI metrics selection
- `scoringFormula` - Scoring formula configuration
- `thresholds` - Pass/partial thresholds
- `autoAssignment` - Auto-assignment rules
- `approvalWorkflow` - Approval workflow configuration
- `publicLink.enabled` - Public link enablement
- `publicLink.slug` - Public link slug
- `outcomesAndRules.auditResultRule` - Audit result rule
- `outcomesAndRules.reportingMetrics` - Reporting metrics configuration
- `outcomesAndRules.postSubmissionSignals` - Post-submission signal rules

#### Settings (Read-Only)

These fields are visible in Form Settings but cannot be edited:

- `formId` - Auto-generated form identifier
- `formType` - Form type (set during creation)
- `formVersion` - Form version (auto-incremented)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp
- `createdBy` - Creator user reference
- `organizationId` - Organization reference

#### Builder-Only

These fields can only be edited in Form Builder:

- `sections` - Form sections, subsections, and questions
- `sections[].name` - Section names
- `sections[].weightage` - Section weightage
- `sections[].sectionScoring` - Section-level scoring
- `sections[].subsections[].name` - Subsection names
- `sections[].subsections[].weightage` - Subsection weightage
- `sections[].subsections[].subsectionScoring` - Subsection-level scoring
- `sections[].subsections[].questions[]` - All question properties
- `sections[].subsections[].questions[].scoring` - Question-level scoring weights
- `sections[].subsections[].questions[].scoring.weight` - Question scoring weight
- `responseTemplate` - Response template configuration

**Rationale:** Form content (sections, questions, scoring weights) belongs to Form Builder. Form Settings configure behavior, not content.

#### Execution-Only

These fields are managed by execution and workflow systems:

- `totalResponses` - Calculated response count
- `avgRating` - Calculated average rating
- `avgCompliance` - Calculated average compliance
- `responseRate` - Calculated response rate
- `lastSubmission` - Last submission timestamp
- Response data (stored separately in Response model)

**Rationale:** Execution fields are calculated or managed by runtime systems, not configuration.

---

## 5. Settings Tabs Intent

Form Settings uses a tabbed interface with the following tabs. Each tab has a specific configuration intent.

### Module Details

**Intent:** Display module metadata and app participation.

**Configuration:**
- Module name and description (read-only)
- Platform ownership indicator
- App participation (which apps use Forms)
- Module-level metadata

**NOT:**
- Form content editing
- Form creation
- Form execution

### Metadata Fields

**Intent:** Configure form metadata field definitions, visibility, and requirements.

**Configuration:**
- Field definitions (name, description, visibility, status, assignedTo, approvalRequired)
- Field visibility rules
- Field ordering
- Field requirements

**NOT:**
- Section/question field editing
- Form structure modification
- Content editing

### Logic & Rules

**Intent:** Configure form behavior rules and logic.

**Configuration:**
- KPI metrics selection
- Scoring formula configuration
- Threshold definitions (pass/partial)
- Auto-assignment rules

**NOT:**
- Question-level scoring weight editing
- Section-level scoring weight editing
- Form content modification
- Execution control

### Outcomes

**Intent:** Configure form outcomes, reporting, and post-submission behavior.

**Configuration:**
- Audit result rules
- Reporting metrics configuration
- Post-submission signal rules

**NOT:**
- Response editing
- Analytics calculation
- Execution control
- Workflow state management

### Access

**Intent:** Configure form access and approval settings.

**Configuration:**
- Public link enablement and slug
- Approval workflow settings
- Visibility controls

**NOT:**
- Permission management
- Role assignments
- Access control rules

### Relationships

**Intent:** Define relationships between Forms and other modules.

**Configuration:**
- Module-to-module relationships
- Relationship field definitions

**NOT:**
- Form content editing
- Execution control

---

## 6. Change Policy

### Adding New Editable Fields

Any new field that should be editable in Form Settings requires:

1. **Doctrine Update**
   - Document the field in Section 4 (Schema Ownership Map)
   - Classify as "Settings (Editable)" or "Settings (Read-Only)"
   - Update relevant tab intent documentation

2. **Architectural Review**
   - Verify the field does not violate domain boundaries
   - Ensure the field is not Builder-only or Execution-only
   - Confirm the field belongs to configuration, not content or execution

3. **Implementation**
   - Add field to Forms Settings UI
   - Add field to Forms module definition
   - Update field grouping logic

### Forbidden Changes

The following changes are **forbidden** in Form Settings:

1. **Execution Behavior Changes**
   - Adding execution controls
   - Modifying submission logic
   - Changing workflow state transitions
   - Bypassing audit workflow rules

2. **Content Editing Capabilities**
   - Adding section/question editing
   - Modifying form structure
   - Changing scoring weights at question/section level
   - Editing form templates

3. **Breaking Domain Boundaries**
   - Duplicating Form Builder functionality
   - Replacing Form Builder
   - Adding response editing
   - Controlling execution state

### Breaking Changes

Any breaking changes to Form Settings require:

1. **Explicit Architectural Review**
   - Document the change and rationale
   - Verify it does not violate domain boundaries
   - Update this doctrine document

2. **Stakeholder Approval**
   - Platform team approval
   - Product team approval
   - Architecture team approval

3. **Migration Plan**
   - Document migration path
   - Plan for backward compatibility
   - Update related documentation

---

## 7. Invariants

### Architectural Invariants

The following invariants must always hold:

1. **Form Settings ≠ Form Builder**
   - Form Settings never edit form content
   - Form Builder never configures behavior settings
   - Clear separation maintained at all times

2. **Form Settings ≠ Form Execution**
   - Form Settings never execute forms
   - Form Settings never process responses
   - Form Settings never mutate execution state

3. **Form Settings ≠ Audit Workflow**
   - Form Settings never bypass audit workflow rules
   - Form Settings never control audit state transitions
   - Form Settings configure rules, not execute them

4. **Configuration Only**
   - Form Settings only configure behavior
   - Form Settings never create or edit form records
   - Form Settings never view or edit responses

### Runtime Invariants

The following runtime checks are enforced:

1. **DEV-Only Guards**
   - Console assertions in development mode
   - Runtime checks for execution capabilities
   - Validation of domain boundaries

2. **Schema Validation**
   - Fields marked as Builder-only cannot be edited in Settings
   - Fields marked as Execution-only are read-only
   - Settings-editable fields are validated

---

## 8. Related Documents

- **Module Settings Doctrine** (`module-settings-doctrine.md`) - General module settings principles
- **Task Settings** (`task-settings.md`) - Task Settings architecture (reference implementation)
- **Event Settings Doctrine** (`event-settings-doctrine.md`) - Event Settings architecture (similar pattern)
- **Form Model** (`server/models/Form.js`) - Form schema definition
- **Form Settings Capabilities** (`client/src/platform/forms/formSettingsCapabilities.ts`) - Capability flags for Form Settings
- **Form Settings Permissions** (`client/src/platform/forms/formSettingsPermissions.ts`) - Permission matrix (explanatory only, mirrors Event Execution pattern)

---

## 9. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 2026 | Initial doctrine document | Platform Team |

---

**Status:** This doctrine is **LOCKED**. Any changes require explicit architectural review and stakeholder approval.
