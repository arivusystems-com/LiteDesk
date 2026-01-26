# PR Summary

Briefly describe what this PR changes and why.

<!-- Example:
This PR adds field metadata support for the Events module by:
1. Creating eventFieldModel.ts with all Event field definitions
2. Registering Events module in FieldRegistry
3. Updating Events list view to use field metadata for filtering

No behavior changes - this is a structural refactor only.
-->

---

## Affected Areas (check all that apply)

- [ ] Field definitions / metadata
- [ ] Field Registry
- [ ] Policies (filters, editability, etc.)
- [ ] UI (lists, forms, filters)
- [ ] New module
- [ ] Refactor only (no behavior change)

---

## Field & Metadata Checklist

**Required if touching fields, field models, or field metadata.**

- [ ] No fields are defined inline in UI components
  - All fields must be in `*FieldModel.ts` files
  - No exceptions for "simple" or "temporary" fields

- [ ] All fields extend `BaseFieldMetadata`
  - Using base interface, not custom field types
  - Module-specific intents allowed (e.g., `TaskFieldIntent`)

- [ ] `owner` / `intent` / `scope` are set intentionally
  - Not copied from other fields without review
  - Classification matches field's semantic purpose

- [ ] `editable` / `isProtected` explicitly set
  - Must be explicit booleans, never `undefined`
  - System fields: `editable: false`
  - Protected fields: `isProtected: true` for essential fields

- [ ] Validation runs on module load
  - `validateBaseFieldMetadata` called in validation function
  - Module-specific validation extends base validation
  - Validation runs at module level (fail-fast)

- [ ] Existing exports preserved (or `@deprecated` used)
  - No removed exports
  - Deprecated exports marked with `@deprecated` JSDoc
  - Migration path documented in deprecation message

**If any checkbox is unchecked, explain why:**

---

## Registry Checklist

**Required if modifying FieldRegistry or adding new modules.**

- [ ] New modules registered in `FieldRegistry`
  - Added to `ModuleKey` type
  - Added to `MODULE_KEYS` array
  - Added to `FIELD_REGISTRY` map
  - Imported `*_FIELD_METADATA` constant

- [ ] Registry remains read-only
  - No mutations to `FIELD_REGISTRY` constant
  - No mutation methods added
  - All query functions return new arrays (shallow copies)

- [ ] No mutations introduced
  - No caching or memoization added
  - No stateful behavior
  - Deterministic behavior maintained

- [ ] No circular dependencies added
  - Registry imports field models
  - Policies import Registry
  - UI imports composables/policies
  - No reverse dependencies

**If any checkbox is unchecked, explain why:**

---

## Policy Checklist

**Required if creating or modifying policies (DefaultFilterPolicy, FieldEditabilityPolicy, etc.).**

- [ ] Policy is pure and deterministic
  - No side effects (no mutations, API calls, persistence)
  - Same input always produces same output
  - No randomness or time-dependent behavior

- [ ] Policy does NOT enforce behavior
  - Policies suggest decisions, don't enforce them
  - No blocking actions or thrown errors
  - UI/services explicitly opt-in to use policy decisions

- [ ] Policy fails closed
  - Invalid inputs return safe defaults (empty arrays, `false`, etc.)
  - Unknown fields/roles default to most restrictive behavior
  - Never throws errors for invalid inputs

- [ ] Uses `FieldRegistry` (no direct field imports)
  - Uses `getFieldMetadataMap()`, `getFieldMetadata()`, etc.
  - No direct imports of `*_FIELD_METADATA` constants
  - Ensures policies work across all modules

- [ ] Explainability helpers included (if logic is non-trivial)
  - `get*Details()` functions for debugging
  - Return objects with `reason` or `wouldBeDefault` properties
  - Policy decisions are explainable

**If any checkbox is unchecked, explain why:**

---

## UI Integration Checklist

**Required if integrating policies into UI components or modifying list/form behavior.**

- [ ] Policies are opt-in only
  - UI explicitly calls policy functions
  - No auto-application of policy decisions
  - User actions always take precedence

- [ ] Feature flag present for behavior changes
  - New policy-based features behind feature flags
  - Feature flags default to `false` (disabled)
  - Documented how to enable the feature

- [ ] No auto-application of defaults
  - Default filters are suggestions, not auto-applied
  - User must explicitly select filter values
  - No automatic filter application on page load

- [ ] No filter or form state mutation
  - Policies don't mutate existing filter/form state
  - No automatic state updates
  - User intent preserved

- [ ] User intent preserved
  - Saved filters override default filters
  - User-selected filters override suggested filters
  - Policies are hints, not requirements

**If any checkbox is unchecked, explain why:**

---

## Backward Compatibility

**Required for all PRs.**

- [ ] No breaking export changes
  - No removed exports
  - No renamed exports
  - No signature changes to existing functions

- [ ] Deprecated APIs marked with `@deprecated`
  - Clear deprecation message
  - Points to replacement if one exists
  - Migration path documented

- [ ] No silent behavior changes
  - Behavior changes require explicit opt-in
  - Feature flags used for behavior changes
  - Breaking changes clearly documented

**If any checkbox is unchecked, explain why:**

---

## Risk Assessment

**Required for all PRs.**

- [ ] No user-visible behavior change
  - Pure refactor or internal change only
  - No UI changes
  - No API changes

- [ ] Behavior change behind feature flag
  - Feature flag defaults to `false` (disabled)
  - Can be enabled/disabled without code changes
  - Documented how to enable

- [ ] Behavior change intentional and reviewed
  - Breaking change explicitly documented
  - Migration guide provided
  - Reviewed by tech lead/architect

**Explain briefly if any risk exists:**

<!-- Example:
This PR adds a new policy that suggests default filters. Risk is low because:
1. Policy is opt-in only (feature flag defaults to false)
2. UI integration is visual-only (no auto-application)
3. User filters always take precedence
4. Can be disabled instantly via feature flag
-->

---

## Testing

**Required for all PRs.**

- [ ] Manual testing completed
  - Tested affected areas
  - Verified no regressions
  - Verified feature flag behavior (if applicable)

- [ ] Validation passes
  - Field metadata validation runs successfully
  - No validation errors on module load
  - TypeScript compilation succeeds

- [ ] Edge cases considered
  - Invalid inputs handled gracefully
  - Missing fields handled correctly
  - Unknown modules/roles fail closed

**If any checkbox is unchecked, explain why:**

---

## Documentation

**Required if adding new features or changing architecture.**

- [ ] Architecture docs updated (if applicable)
  - New modules documented
  - Policy changes documented
  - Breaking changes documented

- [ ] Code comments added (if logic is non-trivial)
  - Complex logic explained
  - Policy decisions explained
  - Edge cases documented

- [ ] Contributor checklist followed
  - Reviewed `/client/docs/contributing/fields-and-policies-checklist.md`
  - Followed all applicable checklists
  - No anti-patterns introduced

**If any checkbox is unchecked, explain why:**

---

## Reviewer Sign-off

**Reviewers: Check all that apply before approving.**

- [ ] Architecture respected
  - Follows platform field metadata architecture
  - Uses FieldRegistry correctly
  - Policies are pure and non-enforcing

- [ ] Platform boundaries maintained
  - No fields defined inline in UI
  - No hardcoded permissions
  - No metadata mutations
  - No policy enforcement

- [ ] Safe to merge
  - All checkboxes above are checked (or explained)
  - No blocking issues
  - Risk assessment acceptable
  - Backward compatibility preserved

---

### Reviewer Notes (optional)

<!-- Reviewers: Add any additional notes, concerns, or suggestions here -->

---

## Related Links

- [Platform Field Metadata & Policy Architecture](../../docs/architecture/field-metadata-and-policies.md)
- [Field Metadata & Policy Architecture Audit Report](../../docs/architecture/field-metadata-policy-audit.md)
- [Contributor Checklist: Fields, Registry & Policies](../../docs/contributing/fields-and-policies-checklist.md)

---

**Note:** This template is authoritative. All checkboxes must be checked (or explained) before PR approval. Deviations require explicit justification and tech lead approval.
