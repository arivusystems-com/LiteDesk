# Contributor Checklist: Fields, Registry & Policies

**Version:** 1.0  
**Last Updated:** 2026-01-25  
**Status:** Authoritative — Deviations require explicit review

---

## ⚠️ Before You Start (Required Reading)

**If you are touching fields, filters, forms, or permissions, you MUST read these documents first:**

1. **[Platform Field Metadata & Policy Architecture](../../docs/architecture/field-metadata-and-policies.md)**
   - Explains the "why" and "how" of the system
   - Defines architectural layers and contracts
   - Required reading for any field-related work

2. **[Field Metadata & Policy Architecture Audit Report](../../docs/architecture/field-metadata-policy-audit.md)**
   - Documents current system state
   - Confirms readiness and identifies patterns
   - Reference for understanding what "good" looks like

**Why this matters:** Understanding the architecture prevents architectural drift and reduces review cycles. These documents encode platform decisions that took significant effort to establish.

---

## 🚨 Golden Rules (Non-Negotiable)

These rules are **not optional**. Violations will be caught in review and must be fixed.

### ❌ Never Do These

1. **Never define fields inline in UI components**
   - Fields belong in `*FieldModel.ts` files, not in Vue components
   - UI components import and consume field metadata
   - Example violation: `const coreFields = ['title', 'status', 'priority']` in a Vue component

2. **Never hardcode permissions in components**
   - Use `FieldEditabilityPolicy` for editability decisions
   - Use role-based policies, not component-level checks
   - Example violation: `if (user.role === 'admin') { field.editable = true }` in a template

3. **Never mutate field metadata**
   - Field metadata is read-only (`const` and `as const`)
   - Policies read metadata, they don't modify it
   - Example violation: `metadata.editable = false` at runtime

4. **Never auto-apply policies**
   - Policies suggest behavior, they don't enforce it
   - UI must explicitly opt-in to policy decisions
   - Example violation: Automatically applying default filters on page load

### ✅ Always Do These

1. **Always use metadata + policies**
   - Define fields in `*FieldModel.ts`
   - Query fields via `FieldRegistry`
   - Use policies for cross-module decisions

2. **Always preserve backward compatibility**
   - Don't remove exports (use `@deprecated` instead)
   - Don't change function signatures
   - Don't change default behavior without explicit opt-in

---

## ✅ Adding or Modifying Fields (Checklist)

When adding a new field or modifying an existing field's metadata:

- [ ] **Is this field defined in `*FieldModel.ts`?**
  - All fields must be in the module's field model file
  - No exceptions for "simple" or "temporary" fields

- [ ] **Does it extend `BaseFieldMetadata`?**
  - Use the base interface, don't create custom field types
  - Module-specific intents are allowed (e.g., `TaskFieldIntent`)

- [ ] **Are `owner`, `intent`, and `scope` set intentionally?**
  - Don't guess or copy-paste from other fields
  - Review the classification hierarchy in `BaseFieldModel.ts`
  - Ask: "Who owns this field? What is its purpose? What scope does it belong to?"

- [ ] **Is `editable` explicitly set?**
  - Must be `true` or `false`, never `undefined`
  - System fields are typically `editable: false`
  - Core and participation fields are typically `editable: true`

- [ ] **Is `isProtected` set if needed?**
  - Protected fields cannot be deleted
  - Use for essential fields (e.g., `title`, `organizationId`)
  - Default is `false` (not protected)

- [ ] **Does validation pass?**
  - Run the module to trigger validation
  - Fix validation errors before committing
  - Validation runs on module load (fail-fast)

- [ ] **Are existing exports preserved?**
  - Don't remove or rename existing exports
  - Use `@deprecated` for exports you want to phase out
  - Maintain backward compatibility

**Example: Adding a new field**

```typescript
// ✅ CORRECT: In taskFieldModel.ts
export const TASK_FIELD_METADATA: Record<string, TaskFieldMetadata> = {
  // ... existing fields ...
  newField: {
    owner: 'core',              // ✅ Explicit
    intent: 'detail',           // ✅ Explicit
    fieldScope: 'CORE',         // ✅ Explicit
    editable: true,             // ✅ Explicit boolean
    isProtected: false,         // ✅ Explicit (optional, defaults to false)
    filterable: true,           // ✅ Explicit (optional)
    filterType: 'text',         // ✅ Explicit (required if filterable)
    filterPriority: 10,         // ✅ Explicit (optional)
  },
};
```

```typescript
// ❌ WRONG: In a Vue component
const newField = {
  name: 'newField',
  editable: true,  // ❌ Not in field model
};
```

---

## ✅ Adding a New Module (Checklist)

When adding field metadata support for a new module:

- [ ] **Create `*FieldModel.ts`**
  - File name: `{moduleName}FieldModel.ts` (e.g., `eventFieldModel.ts`)
  - Location: `/client/src/platform/fields/`
  - Follow the pattern from `peopleFieldModel.ts` or `taskFieldModel.ts`

- [ ] **Use `BaseFieldMetadata`**
  - Import and extend `BaseFieldMetadata`
  - Use base types: `BaseFieldOwner`, `BaseFieldScope`, `BaseFilterType`
  - Module-specific intents are allowed (e.g., `EventFieldIntent`)

- [ ] **Validate metadata on load**
  - Call `validateBaseFieldMetadata` in your validation function
  - Add module-specific validation rules if needed
  - Run validation on module load: `validateAllMetadata()` at module level

- [ ] **Register module in `FieldRegistry`**
  - Add module key to `ModuleKey` type
  - Add module to `MODULE_KEYS` array
  - Add module to `FIELD_REGISTRY` map
  - Import the module's `*_FIELD_METADATA` constant

- [ ] **Do NOT refactor UI yet**
  - Adding field model doesn't require immediate UI changes
  - UI can adopt field model incrementally
  - Don't break existing UI behavior

- [ ] **Opt-in to policies explicitly (optional)**
  - Policies work automatically once module is registered
  - UI must explicitly opt-in to use policies
  - Don't auto-apply policies in UI

**Example: Registering a new module**

```typescript
// ✅ CORRECT: In FieldRegistry.ts
export type ModuleKey = 'people' | 'tasks' | 'events';  // ✅ Add module key

export const MODULE_KEYS: readonly ModuleKey[] = [
  'people',
  'tasks',
  'events',  // ✅ Add to array
] as const;

import { EVENT_FIELD_METADATA } from './eventFieldModel';  // ✅ Import metadata

const FIELD_REGISTRY: FieldRegistryMap = {
  people: PEOPLE_FIELD_METADATA,
  tasks: TASK_FIELD_METADATA,
  events: EVENT_FIELD_METADATA,  // ✅ Register in map
} as const;
```

---

## ✅ Working With Policies (Checklist)

When creating or modifying policies (DefaultFilterPolicy, FieldEditabilityPolicy, etc.):

- [ ] **Policies must be pure and deterministic**
  - No side effects (no mutations, no API calls, no persistence)
  - Same input always produces same output
  - No randomness or time-dependent behavior

- [ ] **Policies must NOT enforce behavior**
  - Policies suggest decisions, they don't enforce them
  - UI and services explicitly opt-in to use policy decisions
  - Policies don't block actions or throw errors

- [ ] **Policies must use `FieldRegistry`**
  - Don't import field models directly
  - Use `getFieldMetadataMap()`, `getFieldMetadata()`, etc.
  - This ensures policies work across all modules

- [ ] **Policies must fail closed**
  - Invalid inputs return safe defaults (empty arrays, `false`, etc.)
  - Unknown fields/roles default to most restrictive behavior
  - Never throw errors for invalid inputs (return safe defaults)

- [ ] **Explainability helpers preferred**
  - Provide `get*Details()` functions for debugging
  - Return objects with `reason` or `wouldBeDefault` properties
  - Make policy decisions explainable

**Example: Policy function**

```typescript
// ✅ CORRECT: Pure, deterministic, non-enforcing
export function getDefaultFiltersForModule(
  moduleKey: ModuleKey,
  options: DefaultFilterOptions = {}
): string[] {
  // ✅ Uses FieldRegistry
  const metadataMap = getFieldMetadataMap(moduleKey);
  if (!metadataMap) return [];  // ✅ Fails closed
  
  // ✅ Pure logic, no side effects
  const eligibleFields = Object.entries(metadataMap)
    .filter(([_, m]) => m.filterable === true)
    .map(([key]) => key);
  
  // ✅ Deterministic ranking
  eligibleFields.sort(compareFields);
  
  // ✅ Returns suggestion, doesn't enforce
  return eligibleFields.slice(0, options.maxFilters ?? 5);
}
```

```typescript
// ❌ WRONG: Enforcing, side effects, direct imports
export function getDefaultFiltersForModule(moduleKey: ModuleKey): string[] {
  // ❌ Direct import instead of FieldRegistry
  const metadata = PEOPLE_FIELD_METADATA;  // ❌ Module-specific
  
  // ❌ Side effect: applying filters
  applyFilters(metadata);  // ❌ Should not enforce
  
  // ❌ Throwing errors instead of failing closed
  if (!metadata) throw new Error('No metadata');  // ❌ Should return []
}
```

---

## ✅ UI Integration Rules (Checklist)

When integrating policies into UI components:

- [ ] **Policies are opt-in only**
  - UI must explicitly call policy functions
  - Don't auto-apply policy decisions
  - User actions always take precedence

- [ ] **Feature flags required for behavior changes**
  - New policy-based features must be behind feature flags
  - Feature flags default to `false` (disabled)
  - Document how to enable the feature

- [ ] **Visual hints before enforcement**
  - Show suggestions before applying them
  - Use "Suggested filters" UI, not auto-applied filters
  - User must explicitly confirm policy decisions

- [ ] **User intent always wins**
  - Saved filters override default filters
  - User-selected filters override suggested filters
  - Policies are hints, not requirements

**Example: UI integration**

```vue
<!-- ✅ CORRECT: Opt-in, feature-flagged, visual-only -->
<template>
  <div v-if="suggestedFiltersEnabled && hasSuggestedFilters && !hasActiveFilters">
    <span>Suggested:</span>
    <button
      v-for="filterKey in suggestedFilters"
      @click="handleSuggestedFilterClick(filterKey)"
    >
      {{ filterKey }}
    </button>
  </div>
</template>

<script>
const { 
  isEnabled: suggestedFiltersEnabled,  // ✅ Feature flag check
  defaultFilters: suggestedFilters,     // ✅ Opt-in to policy
  hasDefaultFilters: hasSuggestedFilters,
} = useDefaultListFilters(props.moduleKey);

const handleSuggestedFilterClick = (fieldKey) => {
  // ✅ Opens filter UI, doesn't auto-apply
  openFilterEditor(fieldKey);
};
</script>
```

```vue
<!-- ❌ WRONG: Auto-applying, no feature flag, enforcing -->
<template>
  <div>
    <!-- ❌ Auto-applying filters -->
    <FilterChip v-for="filter in defaultFilters" :applied="true" />
  </div>
</template>

<script>
// ❌ No feature flag
const defaultFilters = getDefaultFiltersForModule('tasks');

// ❌ Auto-applying on mount
onMounted(() => {
  defaultFilters.forEach(f => applyFilter(f));  // ❌ Should not auto-apply
});
</script>
```

---

## ✅ Backward Compatibility Rules (Checklist)

When modifying existing code:

- [ ] **Do not remove exports**
  - Even if unused, keep exports for backward compatibility
  - Use `@deprecated` JSDoc tag to mark for removal
  - Document migration path in deprecation message

- [ ] **Use `@deprecated` instead of removal**
  - Mark exports as deprecated with clear message
  - Point to replacement if one exists
  - Example: `@deprecated Use BaseFieldOwner from BaseFieldModel.ts`

- [ ] **No silent behavior changes**
  - If behavior changes, require explicit opt-in
  - Use feature flags for behavior changes
  - Document breaking changes clearly

- [ ] **Migrations must be explicit**
  - Don't automatically migrate consumers
  - Provide migration guide
  - Support both old and new patterns during transition

**Example: Deprecation**

```typescript
// ✅ CORRECT: Deprecation with migration path
/**
 * Field ownership classification for People.
 * @deprecated Use BaseFieldOwner from BaseFieldModel.ts
 * This type alias is kept for backward compatibility.
 * Migration: Replace `FieldOwner` with `BaseFieldOwner`
 */
export type FieldOwner = BaseFieldOwner;
```

```typescript
// ❌ WRONG: Removing export
// export type FieldOwner = BaseFieldOwner;  // ❌ Removed, breaks consumers
```

---

## 🚫 Common Anti-Patterns (With Examples)

### 1. Inline Field Arrays in Vue Components

**❌ Wrong:**
```vue
<script>
// ❌ Defining fields inline
const coreTaskFields = ['title', 'status', 'priority', 'dueDate'];
const systemFields = ['createdBy', 'createdAt', 'organizationId'];

function isCoreField(field) {
  return coreTaskFields.includes(field.key);  // ❌ Hardcoded logic
}
</script>
```

**✅ Correct:**
```vue
<script>
import { 
  getCoreTaskFields, 
  isTaskCoreField 
} from '@/platform/fields/taskFieldModel';

// ✅ Using field model
function isCoreField(field) {
  return isTaskCoreField(field.key);  // ✅ Metadata-driven
}
</script>
```

### 2. Role Checks in Templates

**❌ Wrong:**
```vue
<template>
  <!-- ❌ Hardcoded permission check -->
  <input 
    v-if="user.role === 'admin' || user.role === 'manager'"
    v-model="field.value"
  />
</template>
```

**✅ Correct:**
```vue
<script>
import { canEditField } from '@/platform/fields/FieldEditabilityPolicy';

const canEdit = computed(() => 
  canEditField('tasks', field.key, user.role)  // ✅ Policy-driven
);
</script>

<template>
  <!-- ✅ Using policy decision -->
  <input v-if="canEdit" v-model="field.value" />
</template>
```

### 3. Applying Default Filters Automatically

**❌ Wrong:**
```typescript
// ❌ Auto-applying filters
onMounted(() => {
  const defaultFilters = getDefaultFiltersForModule('tasks');
  defaultFilters.forEach(filter => {
    filters[filter] = getDefaultValue(filter);  // ❌ Auto-applying
  });
});
```

**✅ Correct:**
```typescript
// ✅ Showing suggestions only
const { defaultFilters, isEnabled } = useDefaultListFilters('tasks');

// ✅ User must click to apply
const handleSuggestedFilterClick = (fieldKey) => {
  openFilterEditor(fieldKey);  // ✅ Opens UI, doesn't apply
};
```

### 4. Module-Specific Hacks in Policies

**❌ Wrong:**
```typescript
// ❌ Module-specific logic in policy
export function getDefaultFiltersForModule(moduleKey: ModuleKey): string[] {
  if (moduleKey === 'tasks') {
    return ['title', 'status'];  // ❌ Hardcoded for specific module
  }
  if (moduleKey === 'people') {
    return ['assignedTo', 'type'];  // ❌ Hardcoded for specific module
  }
  return [];
}
```

**✅ Correct:**
```typescript
// ✅ Metadata-driven, works for all modules
export function getDefaultFiltersForModule(moduleKey: ModuleKey): string[] {
  const metadataMap = getFieldMetadataMap(moduleKey);  // ✅ Uses registry
  if (!metadataMap) return [];
  
  // ✅ Uses metadata properties, not module-specific logic
  return Object.entries(metadataMap)
    .filter(([_, m]) => m.filterable === true)
    .map(([key]) => key);
}
```

---

## 🤔 When in Doubt

Follow these principles when you're unsure:

1. **Prefer platform primitives over local logic**
   - Use `FieldRegistry` instead of direct imports
   - Use policies instead of component-level checks
   - Use field metadata instead of hardcoded arrays

2. **Ask for review before enforcing behavior**
   - If you're adding enforcement (blocking, auto-applying, etc.), get review first
   - Policies suggest, they don't enforce
   - UI opt-in is always safer than auto-application

3. **Optimize for explainability, not cleverness**
   - Clear code is better than clever code
   - Add `get*Details()` helpers for debugging
   - Document why decisions are made, not just what they are

4. **Fail closed, not open**
   - Unknown fields/roles default to most restrictive behavior
   - Return empty arrays, `false`, or safe defaults
   - Never throw errors for invalid inputs in policies

5. **Preserve backward compatibility**
   - When in doubt, keep existing exports
   - Use `@deprecated` instead of removal
   - Support both old and new patterns during transition

---

## 📋 Quick Reference

### File Locations

- **Field Models:** `/client/src/platform/fields/*FieldModel.ts`
- **Base Model:** `/client/src/platform/fields/BaseFieldModel.ts`
- **Registry:** `/client/src/platform/fields/FieldRegistry.ts`
- **Policies:** `/client/src/platform/fields/*Policy.ts`
- **Composables:** `/client/src/composables/useDefaultListFilters.ts`

### Key Functions

- **Get field metadata:** `getFieldMetadata(moduleKey, fieldKey)`
- **Get all fields:** `getFieldsForModule(moduleKey)`
- **Get filterable fields:** `getFilterableFieldsForModule(moduleKey)`
- **Check editability:** `canEditField(moduleKey, fieldKey, role)`
- **Get default filters:** `getDefaultFiltersForModule(moduleKey)`

### Key Types

- **ModuleKey:** `'people' | 'tasks' | ...`
- **BaseFieldOwner:** `'core' | 'participation' | 'system'`
- **BaseFieldIntent:** `'primary' | 'identity' | 'state' | ...`
- **BaseFieldScope:** `'CORE' | 'SALES' | 'HELPDESK' | ...`
- **UserRole:** `'admin' | 'manager' | 'member' | 'viewer'`

---

## ⚖️ Final Statement

**This checklist is authoritative.**

Deviations require explicit review and justification. If you find yourself wanting to break these rules, ask:

1. Why does this rule not apply in my case?
2. What is the long-term cost of breaking this rule?
3. Can I achieve my goal while following the rule?

If you still need to deviate, document your reasoning and get explicit approval from a tech lead or architect.

**Platform integrity > Local convenience.**

---

**Last Updated:** 2026-01-25  
**Maintained By:** Platform Architecture Team  
**Questions?** Review the architecture documents or ask in #platform-architecture
