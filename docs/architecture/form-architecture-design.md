# Form Architecture Design Document

**Version:** 1.0  
**Date:** 2026-01-25  
**Status:** Design Phase  
**Purpose:** Define future-proof Form architecture aligned with Field Metadata, Registry, and Policy system

---

## Executive Summary

Forms are **NOT regular modules** and must **NOT** be modeled like People, Deal, or Item. Forms require a two-layer architecture:

1. **FormDefinition** (Schema Layer) - Describes what a form *is*
2. **FormResponse** (Instance Layer) - Stores what a form *contains*

This document defines the architecture, boundaries, and integration points for Forms without forcing them into the existing `*FieldModel.ts` pattern.

---

## PART 1: The Two Core Concepts

### 1.1 FormDefinition

**Purpose:** Represents the structure and schema of a form.

**Represents:**
- The structure of a form (sections, subsections, questions)
- Field definitions (what questions exist)
- Validation rules (required fields, value constraints)
- Layout/order (how fields are organized)
- Visibility/editability rules (conditional logic)
- Scoring configuration (for audit forms)
- Form-level metadata (name, type, status, visibility)

**Key Characteristics:**
- **User-defined:** Forms are created by users, not hardcoded
- **Dynamic schema:** Each form can have different fields
- **Versioned:** Forms may evolve over time
- **Reusable:** One definition can generate many responses

**Example:**
```typescript
{
  formId: "FRM-001",
  name: "Store Audit Checklist",
  formType: "Audit",
  status: "Active",
  sections: [
    {
      sectionId: "sec-1",
      name: "Store Readiness",
      weightage: 40,
      questions: [
        {
          fieldKey: "exterior_clean",
          label: "Is the exterior clean?",
          fieldType: "yes-no",
          required: true,
          intent: "question",
          scoring: { passValue: "Yes", weightage: 10 }
        }
      ]
    }
  ]
}
```

### 1.2 FormResponse

**Purpose:** Represents a single submission or filled form instance.

**Represents:**
- Field values (answers to questions)
- Respondent information (who filled it out)
- Timestamps (when it was submitted)
- Status (draft/submitted/reviewed/approved)
- Metadata (linked records, attachments)

**Key Characteristics:**
- **Instance data:** Each response is a unique submission
- **References FormDefinition:** Always linked to a form definition
- **Untyped values:** Values are stored generically, validated against definition
- **Immutable after submission:** Once submitted, responses are locked

**Example:**
```typescript
{
  responseId: "RESP-001",
  formId: "FRM-001",
  submittedBy: "user-123",
  submittedAt: "2026-01-25T10:30:00Z",
  status: "submitted",
  values: {
    "exterior_clean": "Yes",
    "interior_organized": "No",
    "staff_present": 3
  }
}
```

---

## PART 2: Form Definition Field Model (Schema Layer)

### 2.1 Purpose

`FormDefinitionFieldModel.ts` describes what a form field *is*, not what values it contains.

**Key Distinction:**
- Platform Field Models (People, Deal, Item): Fixed schema, registered in FieldRegistry
- Form Definition Fields: Dynamic schema, NOT registered in FieldRegistry

### 2.2 Architecture

**File:** `/client/src/platform/forms/FormDefinitionFieldModel.ts`

**Core Interface:**
```typescript
interface FormDefinitionField {
  // REQUIRED
  fieldKey: string;              // Stable identifier (e.g., "exterior_clean")
  label: string;                  // Human-readable label
  fieldType: FormFieldType;       // text, number, select, checkbox, date, file, user, etc.
  required: boolean;              // Whether field must be filled
  owner: FormFieldOwner;          // system | org | user
  intent: FormFieldIntent;        // question | identity | audit | scoring | system
  
  // OPTIONAL
  options?: string[];             // For select/multi-select fields
  validationRules?: ValidationRule[];
  defaultValue?: unknown;        // Default value for the field
  helpText?: string;              // Helper text shown to users
  visibilityRules?: VisibilityRule[];
  editableRules?: EditableRule[];
  layout?: {
    section?: string;             // Section ID
    subsection?: string;          // Subsection ID
    order?: number;               // Display order
    column?: number;               // Column position (for multi-column layouts)
  };
  
  // SCORING (for audit forms)
  scoring?: {
    enabled: boolean;
    weightage: number;            // Weight in scoring calculation
    passValue?: unknown;          // Value that counts as "pass"
    failValue?: unknown;          // Value that counts as "fail"
  };
  
  // CONDITIONAL LOGIC
  conditionalLogic?: {
    showIf?: ConditionalRule[];
    requireIf?: ConditionalRule[];
  };
}
```

### 2.3 Field Types

```typescript
type FormFieldType =
  | 'text'           // Single-line text input
  | 'text-area'       // Multi-line text input
  | 'number'          // Numeric input
  | 'select'          // Single selection dropdown
  | 'multi-select'    // Multiple selection
  | 'checkbox'        // Boolean checkbox
  | 'yes-no'          // Yes/No toggle
  | 'date'            // Date picker
  | 'date-time'       // Date and time picker
  | 'file'            // File upload
  | 'signature'       // Signature capture
  | 'rating'          // Star rating (1-5)
  | 'user'            // User picker (references platform User)
  | 'entity';         // Entity reference (references platform entities)
```

### 2.4 Field Ownership

```typescript
type FormFieldOwner =
  | 'system'    // Platform-managed fields (formId, createdAt, etc.)
  | 'org'       // Organization-level fields (custom fields defined by org)
  | 'user';     // User-defined fields (created by form builder)
```

### 2.5 Field Intent

```typescript
type FormFieldIntent =
  | 'question'   // Regular question field
  | 'identity'   // Identifies the respondent (name, email, etc.)
  | 'audit'      // Audit-specific field (evidence, compliance)
  | 'scoring'    // Field used in scoring calculation
  | 'system';    // System-managed field (timestamps, IDs)
```

### 2.6 What FormDefinitionFieldModel Does NOT Do

**DO NOT:**
- ❌ Extend `BaseFieldMetadata` directly
- ❌ Register fields in `FieldRegistry`
- ❌ Treat form fields as platform entity fields
- ❌ Apply platform field policies automatically
- ❌ Store user-entered values

**These are FORM-SCHEMA fields, not ENTITY fields.**

---

## PART 3: Form Response Model (Instance Layer)

### 3.1 Purpose

`FormResponseModel.ts` stores values for submitted forms, referencing FormDefinitionField keys.

### 3.2 Architecture

**File:** `/client/src/platform/forms/FormResponseModel.ts`

**Core Interface:**
```typescript
interface FormResponse {
  // IDENTIFICATION
  responseId: string;            // Unique response identifier
  formId: string;                // Reference to FormDefinition
  
  // METADATA
  submittedBy: string;           // User ID who submitted
  submittedAt: Date;             // Submission timestamp
  status: FormResponseStatus;    // draft | submitted | reviewed | approved | rejected
  
  // VALUES
  values: Record<string, unknown>;  // fieldKey -> value mapping
  
  // CONTEXT
  linkedRecord?: {
    module: string;              // 'deal', 'task', 'organization', etc.
    recordId: string;            // ID of linked record
  };
  
  // ATTACHMENTS
  attachments?: Attachment[];
  
  // SCORING (computed from FormDefinition)
  score?: {
    total: number;
    passed: number;
    failed: number;
    percentage: number;
  };
  
  // REVIEW
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComments?: string;
}
```

### 3.3 Response Status

```typescript
type FormResponseStatus =
  | 'draft'      // In progress, not yet submitted
  | 'submitted'  // Submitted, awaiting review
  | 'reviewed'   // Reviewed but not approved/rejected
  | 'approved'   // Approved by reviewer
  | 'rejected';  // Rejected by reviewer
```

### 3.4 Value Storage Rules

**Key Principles:**
1. **Values are untyped at platform level:** Values stored as `unknown` or `any`
2. **Validation happens using FormDefinition:** FormDefinition provides the schema
3. **Policies apply at submission time:** Not at definition time
4. **Type safety via FormDefinition:** TypeScript types derived from FormDefinition

**Example:**
```typescript
// FormDefinition says fieldKey "exterior_clean" is type "yes-no"
// FormResponse stores: values.exterior_clean = "Yes" (string)
// Validation checks: value must be "Yes" or "No" (from FormDefinition)
```

---

## PART 4: Relationship to Existing Field Architecture

### 4.1 Platform Field Models (People, Deal, Item)

**Characteristics:**
- ✅ Fixed schema (defined in code)
- ✅ Registered in `FieldRegistry`
- ✅ Used by policies (`DefaultFilterPolicy`, `FieldEditabilityPolicy`)
- ✅ Extend `BaseFieldMetadata`
- ✅ Module-specific (`peopleFieldModel.ts`, `itemFieldModel.ts`)

**Example:**
```typescript
// In peopleFieldModel.ts
export const PEOPLE_FIELD_METADATA = {
  email: {
    owner: 'core',
    intent: 'identity',
    fieldScope: 'CORE',
    editable: true,
    // ...
  }
};
```

### 4.2 Form Definition Fields

**Characteristics:**
- ✅ Dynamic schema (user-defined)
- ❌ NOT registered in `FieldRegistry`
- ❌ NOT used by platform policies directly
- ❌ Do NOT extend `BaseFieldMetadata`
- ✅ Form-specific (`FormDefinitionFieldModel.ts`)

**Example:**
```typescript
// In FormDefinitionFieldModel.ts
interface FormDefinitionField {
  fieldKey: "customer_satisfaction",
  label: "How satisfied are you?",
  fieldType: "rating",
  required: true,
  owner: "user",
  intent: "question",
  // ...
}
```

### 4.3 Form Responses

**Characteristics:**
- ✅ Data instances (not metadata)
- ❌ No metadata logic
- ✅ Values validated against FormDefinition
- ✅ Can reference platform fields (via entity references)

### 4.4 Forms as Consumers of Platform Fields

**Key Insight:** Forms are **consumers** of platform fields, not peers.

**Example:**
```typescript
// A Form field can reference platform fields
{
  fieldKey: "assigned_user",
  fieldType: "user",
  // This uses FieldRegistry to validate user references
  // But the Form field itself is NOT in FieldRegistry
}

// A Form field can reference platform entities
{
  fieldKey: "linked_deal",
  fieldType: "entity",
  entityType: "deal",
  // This uses FieldRegistry to validate deal references
  // But the Form field itself is NOT in FieldRegistry
}
```

**Architecture Diagram:**
```
┌─────────────────────────────────────────────────────────┐
│              Platform Field Models                      │
│  (People, Deal, Item, Task, Event, Organization)       │
│                                                         │
│  - Fixed schema                                        │
│  - Registered in FieldRegistry                         │
│  - Used by policies                                    │
└─────────────────────────────────────────────────────────┘
                    ↑
                    │ references
                    │
┌─────────────────────────────────────────────────────────┐
│              Form Definition Fields                     │
│  (Dynamic, user-defined schema)                        │
│                                                         │
│  - NOT in FieldRegistry                                │
│  - Can reference platform fields                       │
│  - Form-specific metadata                              │
└─────────────────────────────────────────────────────────┘
                    ↑
                    │ validates
                    │
┌─────────────────────────────────────────────────────────┐
│              Form Responses                             │
│  (Instance data)                                       │
│                                                         │
│  - Values stored generically                           │
│  - Validated against FormDefinition                    │
│  - Can link to platform records                       │
└─────────────────────────────────────────────────────────┘
```

---

## PART 5: Integration Touchpoints (Design Only)

### 5.1 Form Fields Referencing Platform Fields

**Design:**
- Form fields of type `user` or `entity` can reference platform fields
- Validation uses `FieldRegistry` to verify entity types exist
- Form fields themselves remain outside `FieldRegistry`

**Example:**
```typescript
// FormDefinitionField
{
  fieldKey: "assigned_to",
  fieldType: "user",
  // Validation: Check that "user" module exists in FieldRegistry
  // But this field is NOT registered in FieldRegistry
}
```

**Implementation Notes:**
- Use `FieldRegistry.hasField()` to validate entity types
- Use `FieldRegistry.getFieldMetadata()` to get entity field info
- Form fields remain independent of platform field registration

### 5.2 DefaultFilterPolicy for Form Responses

**Design:**
- Form responses can be filtered, but filters are form-specific
- Cannot use `DefaultFilterPolicy` directly (forms not in FieldRegistry)
- Need form-specific filter policy that uses FormDefinition

**Example:**
```typescript
// Form-specific filter policy
function getFormResponseFilters(formDefinition: FormDefinition): string[] {
  // Return filterable fields from FormDefinition
  // NOT from FieldRegistry
  return formDefinition.fields
    .filter(f => f.filterable)
    .map(f => f.fieldKey);
}
```

**Implementation Notes:**
- Create `FormResponseFilterPolicy.ts` (separate from `DefaultFilterPolicy`)
- Uses FormDefinition, not FieldRegistry
- Similar ranking logic, but form-specific

### 5.3 FieldEditabilityPolicy for Form Fields

**Design:**
- Form fields have their own editability rules (from FormDefinition)
- Cannot use `FieldEditabilityPolicy` directly
- Need form-specific editability policy

**Example:**
```typescript
// Form-specific editability policy
function canEditFormField(
  formDefinition: FormDefinition,
  fieldKey: string,
  role: UserRole,
  responseStatus: FormResponseStatus
): boolean {
  const field = formDefinition.fields.find(f => f.fieldKey === fieldKey);
  if (!field) return false;
  
  // Form-specific rules:
  // - Draft responses: editable
  // - Submitted responses: not editable (unless admin)
  // - Use field.editableRules from FormDefinition
}
```

**Implementation Notes:**
- Create `FormFieldEditabilityPolicy.ts` (separate from `FieldEditabilityPolicy`)
- Uses FormDefinition, not FieldRegistry
- Considers response status (draft vs submitted)

### 5.4 Audit / Sales Apps Extending Forms

**Design:**
- Apps can extend FormDefinition with app-specific metadata
- Apps can add app-specific validation rules
- Apps can customize scoring logic
- Core FormDefinition remains app-agnostic

**Example:**
```typescript
// Audit app extension
interface AuditFormDefinition extends FormDefinition {
  auditMetadata: {
    complianceThreshold: number;
    evidenceRequired: boolean;
    autoApprove: boolean;
  };
}

// Sales app extension
interface SalesFormDefinition extends FormDefinition {
  salesMetadata: {
    linkedToDeal: boolean;
    syncToCRM: boolean;
  };
}
```

**Implementation Notes:**
- Use TypeScript interfaces to extend FormDefinition
- App-specific logic in app-specific files
- Core FormDefinition remains platform-agnostic

---

## PART 6: Explicit Non-Goals (Very Important)

### 6.1 DO NOT Migrate Existing Forms Now

**Rationale:** This is architecture design only. Migration requires:
- Data migration scripts
- UI refactoring
- Testing
- User communication

**Status:** Future work, not part of this design.

### 6.2 DO NOT Refactor Form UI

**Rationale:** UI refactoring is separate from architecture design.

**Status:** Future work, not part of this design.

### 6.3 DO NOT Enforce Permissions

**Rationale:** Permission enforcement requires:
- Backend API integration
- Role management
- Audit logging

**Status:** Future work, not part of this design.

### 6.4 DO NOT Apply Policies Automatically

**Rationale:** Policies are opt-in. Automatic application would:
- Break existing behavior
- Require extensive testing
- Risk user disruption

**Status:** Future work, not part of this design.

### 6.5 DO NOT Store Form Fields in FieldRegistry

**Rationale:** Forms are fundamentally different:
- Dynamic vs fixed schema
- User-defined vs code-defined
- Instance data vs entity data

**Status:** Explicitly excluded from FieldRegistry.

---

## PART 7: Architecture Diagrams

### 7.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Platform Modules                         │
│  (People, Deal, Item, Task, Event, Organization)           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Field Models (*FieldModel.ts)                      │   │
│  │  - Fixed schema                                     │   │
│  │  - Registered in FieldRegistry                      │   │
│  │  - Used by policies                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FieldRegistry                                      │   │
│  │  - Centralized access                              │   │
│  │  - Cross-module queries                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Policies                                           │   │
│  │  - DefaultFilterPolicy                              │   │
│  │  - FieldEditabilityPolicy                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ references
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Forms Module                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FormDefinitionFieldModel.ts                        │   │
│  │  - Dynamic schema                                   │   │
│  │  - NOT in FieldRegistry                             │   │
│  │  - Can reference platform fields                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FormResponseModel.ts                               │   │
│  │  - Instance data                                    │   │
│  │  - Validated against FormDefinition                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Form-Specific Policies                             │   │
│  │  - FormResponseFilterPolicy                         │   │
│  │  - FormFieldEditabilityPolicy                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Data Flow

```
┌─────────────────┐
│  Form Builder   │
│  (UI)           │
└────────┬────────┘
         │ creates
         ▼
┌─────────────────────────┐
│  FormDefinition         │
│  - Schema               │
│  - Fields               │
│  - Validation           │
└────────┬────────────────┘
         │
         │ used by
         ▼
┌─────────────────────────┐
│  Form Response          │
│  - Values               │
│  - Status               │
│  - Metadata             │
└─────────────────────────┘
```

### 7.3 Validation Flow

```
FormResponse.values
    │
    ▼
FormDefinition.fields (schema)
    │
    ├─► fieldType validation
    ├─► required validation
    ├─► validationRules
    └─► conditionalLogic
```

---

## PART 8: Implementation Checklist

### Phase 1: Core Models (Current Phase)

- [x] Design FormDefinitionFieldModel.ts
- [x] Design FormResponseModel.ts
- [x] Document relationships to platform fields
- [x] Define integration touchpoints
- [x] Create architecture design document

### Phase 2: Model Implementation (Future)

- [ ] Implement FormDefinitionFieldModel.ts
- [ ] Implement FormResponseModel.ts
- [ ] Add TypeScript types and interfaces
- [ ] Add validation utilities
- [ ] Add helper functions

### Phase 3: Form-Specific Policies (Future)

- [ ] Implement FormResponseFilterPolicy.ts
- [ ] Implement FormFieldEditabilityPolicy.ts
- [ ] Add form-specific ranking logic
- [ ] Add form-specific validation rules

### Phase 4: Integration (Future)

- [ ] Integrate with FieldRegistry for entity references
- [ ] Add form builder UI integration
- [ ] Add form response UI integration
- [ ] Add validation at submission time

### Phase 5: Migration (Future)

- [ ] Create migration plan for existing forms
- [ ] Create data migration scripts
- [ ] Test migration with sample data
- [ ] Execute migration

---

## PART 9: Key Architectural Decisions

### 9.1 Forms Are NOT in FieldRegistry

**Decision:** Form fields are NOT registered in FieldRegistry.

**Rationale:**
- Forms have dynamic, user-defined schemas
- FieldRegistry is for fixed, code-defined schemas
- Mixing them would break the registry's assumptions

**Impact:**
- Form-specific policies needed (cannot reuse platform policies directly)
- Form fields cannot be queried via FieldRegistry
- Forms remain separate from platform modules

### 9.2 Form Fields Can Reference Platform Fields

**Decision:** Form fields can reference platform fields via entity types.

**Rationale:**
- Forms need to link to platform records (Deal, Task, etc.)
- Forms need user pickers
- Forms should integrate with platform, not duplicate it

**Impact:**
- Form validation uses FieldRegistry to verify entity types
- Form fields remain independent but can reference platform

### 9.3 Two-Layer Architecture (Definition + Response)

**Decision:** Separate FormDefinition (schema) from FormResponse (data).

**Rationale:**
- Clear separation of concerns
- One definition can generate many responses
- Schema evolution independent of data

**Impact:**
- Two model files needed
- Validation happens at response time using definition
- Versioning can be handled at definition level

### 9.4 Form Fields Do NOT Extend BaseFieldMetadata

**Decision:** FormDefinitionField does NOT extend BaseFieldMetadata.

**Rationale:**
- Different use case (dynamic vs fixed schema)
- Different ownership model (user-defined vs code-defined)
- Different intent model (question vs entity field)

**Impact:**
- Form-specific metadata structure
- Form-specific policies
- No automatic policy application

---

## PART 10: Future Considerations

### 10.1 Form Versioning

**Future Work:**
- How to handle form definition changes after responses exist?
- Versioning strategy for FormDefinition
- Migration path for existing responses

### 10.2 Form Templates

**Future Work:**
- Pre-built form templates
- Template marketplace
- Template sharing across organizations

### 10.3 Form Analytics

**Future Work:**
- Response analytics
- Field usage analytics
- Completion rate tracking
- Scoring trends

### 10.4 Form Workflows

**Future Work:**
- Approval workflows
- Auto-assignment rules
- Notification triggers
- Integration with platform workflows

---

## Conclusion

This architecture design provides:

✅ **Clear separation** between FormDefinition (schema) and FormResponse (data)  
✅ **Proper boundaries** between Forms and platform modules  
✅ **Integration points** for referencing platform fields  
✅ **Future-proof design** that avoids premature refactoring  
✅ **Explicit non-goals** to prevent scope creep  

Forms have a first-class, correct architecture that:
- Does NOT force Forms into the entity field model pattern
- Does NOT register Forms in FieldRegistry
- Does NOT break existing platform field architecture
- Provides a clear path for future implementation

---

**Document Status:** Design Complete  
**Next Steps:** Implementation (Phase 2)  
**Review Date:** TBD
