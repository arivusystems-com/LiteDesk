# Platform Field Metadata & Policy Architecture

**Version:** 1.0  
**Last Updated:** 2026-01-25  
**Status:** Authoritative

---

## 1. Why This Exists

### Problems Solved

**Before:** Field definitions were scattered across UI components, leading to:
- Inconsistent field behavior across modules
- Duplicated field logic in multiple places
- No single source of truth for field properties
- Difficult to reason about cross-module features (filters, permissions, validation)
- Architectural drift as modules evolved independently

**After:** Centralized field metadata and policy system provides:
- Single source of truth for all field definitions
- Consistent behavior across modules
- Platform-scale features (default filters, role-based editability) without duplication
- Clear separation between field definition and field usage
- Deterministic, explainable behavior

### Platform-Scale Concerns

As the platform grows, certain concerns span all modules:
- **Filtering:** Which fields should appear as default filters in list views?
- **Permissions:** Which fields can be edited by which user roles?
- **Validation:** What are the rules for field values?
- **Auditability:** How do we track field-level changes?
- **Analytics:** Which fields are most commonly used?

These concerns cannot be solved module-by-module. They require a platform-level abstraction.

---

## 2. Core Principles

### Fields Are Platform Primitives, Not UI Concerns

Fields exist independently of how they are rendered. A field's semantic meaning (ownership, intent, scope) is encoded in metadata, not inferred from UI usage.

**Implication:** UI components must not define fields inline. They must import and consume field metadata.

### Metadata Is the Single Source of Truth

All field properties (ownership, intent, scope, editability, filterability) are defined once in `*FieldModel.ts` files. No other code should redefine or override these properties.

**Implication:** Field metadata is immutable at runtime. Policies read metadata; they do not modify it.

### Policies Are Non-Enforcing by Default

Policies provide suggestions and rules, but they do not automatically enforce behavior. UI and services must explicitly opt-in to use policy decisions.

**Implication:** Enabling a policy does not change existing behavior. Adoption is incremental and reversible.

### Deterministic, Explainable Behavior Over Magic

Every policy decision can be traced back to field metadata. There are no hidden rules or implicit behaviors.

**Implication:** Debugging is straightforward. Developers can understand why a field is/isn't filterable, editable, etc.

---

## 3. Layered Architecture Overview

The field system is organized in four layers, each with a clear responsibility:

```
┌─────────────────────────────────────────────────────────────┐
│                    UI / Services Layer                      │
│  (Opt-in, feature-flagged, explicit adoption)             │
│  - Composables (useDefaultListFilters)                      │
│  - UI components (ListView, forms, etc.)                    │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ queries
┌─────────────────────────────────────────────────────────────┐
│                      Policy Layer                           │
│  (Pure functions, deterministic, non-enforcing)            │
│  - DefaultFilterPolicy                                      │
│  - FieldEditabilityPolicy                                   │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ reads
┌─────────────────────────────────────────────────────────────┐
│                    Field Registry Layer                     │
│  (Read-only, stateless, cross-module access)                │
│  - FieldRegistry.ts                                         │
│  - Module field queries                                      │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ imports
┌─────────────────────────────────────────────────────────────┐
│                  Field Definition Layer                     │
│  (Authoritative, immutable, module-specific)                │
│  - BaseFieldModel.ts                                         │
│  - peopleFieldModel.ts                                       │
│  - taskFieldModel.ts                                         │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1: Field Definition Layer

**Purpose:** Define what fields exist and their semantic properties.

**Files:**
- `BaseFieldModel.ts` - Shared types and base interface
- `peopleFieldModel.ts` - People module field definitions
- `taskFieldModel.ts` - Tasks module field definitions

**What Belongs Here:**
- Field ownership (`core`, `participation`, `system`)
- Field intent (`identity`, `state`, `detail`, `system`, etc.)
- Field scope (`CORE`, `SALES`, `HELPDESK`, etc.)
- Editability flags
- Filterability flags
- Protected status

**What Does NOT Belong Here:**
- UI rendering logic
- Permission enforcement
- Business logic
- Module-specific hacks

### Layer 2: Field Registry Layer

**Purpose:** Provide centralized, read-only access to field metadata across modules.

**File:** `FieldRegistry.ts`

**Characteristics:**
- **Read-only:** Never mutates field metadata
- **Stateless:** No caching or memoization
- **Deterministic:** Same input always produces same output
- **Cross-module:** Single API for querying fields from any module

**When to Use:**
- Cross-module field queries
- Aggregating fields across modules
- Policy implementations

**When NOT to Use:**
- Single-module field access (direct import is fine)
- UI components (use composables instead)

### Layer 3: Policy Layer

**Purpose:** Provide metadata-driven rules and suggestions.

**Files:**
- `DefaultFilterPolicy.ts` - Suggests default filters for list views
- `FieldEditabilityPolicy.ts` - Determines field editability by role

**Characteristics:**
- **Pure functions:** No side effects, no mutations
- **Non-enforcing:** Policies suggest, they do not enforce
- **Opt-in:** UI must explicitly use policy decisions
- **Explainable:** Every decision can be traced to metadata

**What Policies Can Do:**
- Query field metadata
- Apply ranking/ordering logic
- Return suggestions or decisions
- Provide debugging information

**What Policies Cannot Do:**
- Modify field metadata
- Enforce permissions automatically
- Mutate UI state
- Persist or cache decisions

### Layer 4: UI Integration Layer

**Purpose:** Bridge policies to UI components.

**Files:**
- `useDefaultListFilters.ts` - Composable for default filter suggestions
- UI components (ListView.vue, etc.)

**Characteristics:**
- **Feature-flagged:** Controlled by explicit flags
- **Opt-in:** Components must explicitly adopt policies
- **Non-breaking:** Disabling flags restores original behavior

**Integration Pattern:**
1. Import composable
2. Initialize with module key
3. Check feature flag
4. Use policy suggestions (if enabled)
5. Never auto-apply without user action

---

## 4. Default Filter Policy

### What It Does

The Default Filter Policy suggests which fields should appear as default filters in list views based on field metadata.

**Key Properties:**
- `filterable === true` (required)
- `isProtected !== true` (excluded by default)
- Ranked by `filterPriority`, then `intent`, then `owner`
- Hard cap: Maximum 5 filters per module (configurable)

### What It Explicitly Does NOT Do

- ❌ Auto-apply filters
- ❌ Override saved filter configurations
- ❌ Modify filter state
- ❌ Change initial list queries
- ❌ Enforce filter visibility

### Ranking Logic

Fields are ranked in this order:

1. **filterPriority** (ascending, lower = higher priority)
   - Fields with explicit `filterPriority` rank first
   - Default: 999 for fields without priority

2. **intent** (if filterPriority is equal)
   - `primary` (1) > `identity` (2) > `state` (3) > `scheduling` (4) > `tracking` (5) > `detail` (6) > `system` (7)

3. **owner** (if intent is equal)
   - `core` (1) > `participation` (2) > `system` (3)

4. **Alphabetical** (stable sort tiebreaker)

### Why It Is Opt-In

Default filters are suggestions, not requirements. Users may have different preferences, and saved filter configurations should always take precedence. The policy provides helpful defaults without forcing them.

---

## 5. Field Editability Policy

### Supported Roles

```typescript
type UserRole = 'admin' | 'manager' | 'member' | 'viewer';
```

### Base Rules (Always Applied)

These rules apply regardless of role:

1. If `field.editable === false` → return `false`
2. If `field.isProtected === true` → return `false` (unless `includeProtected: true`)

### Role Rules

Applied after base rules:

| Role | Can Edit |
|------|----------|
| **admin** | All non-protected fields (including system fields by default) |
| **manager** | Core and participation fields (NOT system-owned) |
| **member** | Participation fields + Core fields (NOT system-owned, NOT system intent) |
| **viewer** | No fields |

### Explainability and Debugging

The policy provides `getEditabilityDetails()` function that returns:
- `canEdit`: Boolean decision
- `reason`: Human-readable explanation
- `fieldEditable`: Raw metadata value
- `fieldProtected`: Raw metadata value
- `fieldOwner`: Field ownership classification
- `role`: User role

This makes debugging straightforward: developers can understand exactly why a field is/isn't editable.

### Why Enforcement Is Intentionally Deferred

The policy provides rules, but does not enforce them. Enforcement is a separate concern that may involve:
- Backend API validation
- UI component behavior
- Permission middleware
- Audit logging

By separating rules from enforcement, we maintain flexibility and allow incremental adoption.

---

## 6. What NOT To Do (Anti-Patterns)

### ❌ Defining Fields Inline in UI

**Bad:**
```typescript
// In ListView.vue
const coreFields = ['title', 'status', 'priority'];
```

**Good:**
```typescript
// In taskFieldModel.ts
export const TASK_FIELD_METADATA = {
  title: { owner: 'core', intent: 'primary', ... },
  // ...
};
```

### ❌ Hardcoding Permissions in Components

**Bad:**
```typescript
// In TaskForm.vue
if (userRole === 'member' && fieldKey === 'createdBy') {
  return false; // Can't edit
}
```

**Good:**
```typescript
// Use FieldEditabilityPolicy
const canEdit = canEditField('tasks', fieldKey, userRole);
```

### ❌ Applying Policies Automatically

**Bad:**
```typescript
// Auto-applying default filters
useEffect(() => {
  const defaults = getDefaultFiltersForModule('tasks');
  applyFilters(defaults); // ❌ Never do this
}, []);
```

**Good:**
```typescript
// Showing suggestions only
const { defaultFilters, isEnabled } = useDefaultListFilters('tasks');
if (isEnabled.value) {
  // Show suggestions UI, user clicks to apply
}
```

### ❌ Mutating Field Metadata

**Bad:**
```typescript
// Never mutate metadata
TASK_FIELD_METADATA.title.editable = false; // ❌
```

**Good:**
```typescript
// Metadata is immutable
// Changes require updating the field model file
```

### ❌ Module-Specific Hacks in Policies

**Bad:**
```typescript
// In DefaultFilterPolicy.ts
if (moduleKey === 'tasks') {
  // Special case for tasks ❌
}
```

**Good:**
```typescript
// Policies use metadata only
// Module-specific behavior belongs in field metadata
```

---

## 7. Adding a New Module (Step-by-Step)

### Step 1: Create Field Model File

Create `/client/src/platform/fields/{module}FieldModel.ts`:

```typescript
import type { BaseFieldMetadata } from './BaseFieldModel';
import { validateBaseFieldMetadata } from './BaseFieldModel';

export interface {Module}FieldMetadata extends BaseFieldMetadata {
  intent: {Module}FieldIntent; // Extend if needed
}

export const {MODULE}_FIELD_METADATA: Record<string, {Module}FieldMetadata> = {
  // Define all fields
};

// Add validation
function validateAll{Module}Metadata() {
  // Validate all fields
}
validateAll{Module}Metadata();
```

### Step 2: Extend BaseFieldMetadata

Use `BaseFieldMetadata` as the foundation. Only override `intent` if your module needs module-specific intents.

### Step 3: Register in FieldRegistry

Update `FieldRegistry.ts`:

```typescript
import { {MODULE}_FIELD_METADATA } from './{module}FieldModel';

export type ModuleKey = 'people' | 'tasks' | '{module}';

const FIELD_REGISTRY = {
  people: PEOPLE_FIELD_METADATA,
  tasks: TASK_FIELD_METADATA,
  {module}: {MODULE}_FIELD_METADATA, // Add here
} as const;
```

### Step 4: (Optional) Adopt Policies

Policies automatically work once fields are registered. No additional code needed.

### Step 5: UI Opt-In Checklist

- [ ] Import composables if using default filters
- [ ] Check feature flags before using policies
- [ ] Never auto-apply policy suggestions
- [ ] Respect user preferences and saved configurations

---

## 8. Future Extensions (Explicitly Non-Implemented)

These features are explicitly **not** implemented yet. They are documented here to prevent architectural drift:

### Backend Enforcement

**Status:** Not implemented  
**Rationale:** Enforcement requires backend API integration, which is out of scope for the current policy layer.

**Future Implementation:**
- Backend middleware that checks `canEditField()` before allowing updates
- API responses that include editability information
- Validation errors that reference policy decisions

### Role-Based Visibility

**Status:** Not implemented  
**Rationale:** Visibility rules are separate from editability rules and may have different requirements.

**Future Implementation:**
- `FieldVisibilityPolicy.ts` similar to `FieldEditabilityPolicy.ts`
- Rules for which fields appear in forms, lists, detail views
- Integration with permission system

### Template-Aware Policies

**Status:** Not implemented  
**Rationale:** Templates may override default field behavior, requiring template-specific policy logic.

**Future Implementation:**
- Template metadata that extends field metadata
- Policy functions that accept template context
- Template-specific default filters

### Analytics-Driven Defaults

**Status:** Not implemented  
**Rationale:** Analytics require data collection and analysis infrastructure.

**Future Implementation:**
- Field usage analytics
- Policy functions that incorporate usage data
- Dynamic default filter suggestions based on actual usage

---

## 9. Stability & Backward Compatibility

### Deprecation Strategy

When evolving the system:

1. **Add new properties** to `BaseFieldMetadata` (non-breaking)
2. **Mark old properties** as `@deprecated` with migration path
3. **Maintain backward compatibility** for at least one major version
4. **Provide migration guides** for breaking changes

### Why Backward Compatibility Is Preserved

Field metadata is foundational. Breaking changes ripple through the entire platform. We prioritize stability over convenience.

### How to Safely Evolve the System

1. **Extend, don't replace:** Add new properties alongside old ones
2. **Feature flags:** Gate new behavior behind flags
3. **Gradual migration:** Allow modules to adopt changes incrementally
4. **Clear documentation:** Document changes and migration paths

---

## 10. Final Notes

### This Document Is Authoritative

This document defines the architectural contract for field metadata and policies. Deviations must be:
- Justified with clear rationale
- Reviewed by tech leads
- Documented as exceptions

### Platform Consistency > Local Convenience

Short-term convenience (e.g., defining fields inline) leads to long-term maintenance burden. We prioritize platform consistency even when it requires more upfront work.

### Questions?

If you're unsure whether something belongs in field metadata, a policy, or UI:
1. Check this document
2. Look at existing implementations (People, Tasks modules)
3. Ask: "Does this apply to all modules?" → Policy
4. Ask: "Is this module-specific?" → Field metadata
5. Ask: "Is this UI-only?" → Component logic

---

**Document Maintainers:** Platform Architecture Team  
**Review Cycle:** Quarterly or when significant changes are made  
**Related Documents:**
- `/docs/architecture/field-model.md` - Original field model specification
- `/docs/architecture/task-settings.md` - Task module field configuration
- `/docs/architecture/event-settings.md` - Event module field configuration
