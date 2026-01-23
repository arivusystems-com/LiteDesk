# Platform Permission Explanation Layer — Usage Guidelines

> **Authoritative Contract**: See [platform-permission-contract.md](./platform-permission-contract.md) for the authoritative contract that locks Platform Permissions as explanation-only.

## Overview

The Platform Permission Explanation Layer is a **read-only, explanatory-only** system that explains why actions may or may not be allowed in a given context. It does **NOT** enforce permissions, hide UI elements, disable buttons, or block actions.

## Core Principle

**Platform Permission explanations MUST NEVER be used to hide, disable, or block actions.**

They exist only to explain why an action may not succeed.

## Allowed Usage

### ✅ Read-Only Detail Surfaces

The permission explanation layer **MAY** be used in read-only detail surfaces that:
- Display entity information
- Explain state and context
- Redirect mutations to other surfaces
- Never perform inline mutations

**Examples:**
- `OrganizationSurface.vue` ✅
- `PeopleSurface.vue` ✅
- `EventDetail.vue` (read-only only) ✅

### ✅ Explanation-Only Sections

The permission explanation layer **MAY** be used in sections that:
- Display "Action Availability" information
- Show why actions are allowed or not allowed
- Provide human-readable explanations
- Do not interact with buttons or controls

### ✅ Non-Interactive UI

The permission explanation layer **MAY** be used in UI components that:
- Display information only
- Do not contain buttons or interactive elements
- Do not mutate state
- Do not perform API calls

## Forbidden Usage

### ❌ Create / Edit Forms

The permission explanation layer **MUST NOT** be used in:
- Create forms
- Edit forms
- Inline editing components
- Form drawers or modals

**Rationale:** Forms are mutation surfaces, not explanation surfaces.

### ❌ Drawers

The permission explanation layer **MUST NOT** be used in:
- Drawer components
- Modal components
- Quick create surfaces
- Edit drawers

**Rationale:** Drawers are mutation surfaces, not explanation surfaces.

### ❌ Execution Surfaces

The permission explanation layer **MUST NOT** be used in:
- Execution surfaces (e.g., `EventExecutionSurface.vue`)
- Workflow surfaces
- Action surfaces

**Rationale:** Execution surfaces perform mutations, not explanations.

### ❌ Settings

The permission explanation layer **MUST NOT** be used in:
- Settings pages
- Configuration surfaces
- Admin surfaces

**Rationale:** Settings surfaces are mutation surfaces, not explanation surfaces.

### ❌ API Guards

The permission explanation layer **MUST NOT** be used to:
- Guard API calls
- Block API requests
- Validate API permissions
- Enforce backend permissions

**Rationale:** API guards are enforcement, not explanation.

### ❌ Button Disabling

The permission explanation layer **MUST NOT** be used to:
- Disable buttons
- Hide buttons
- Conditionally render buttons
- Block button clicks

**Rationale:** Button disabling is enforcement, not explanation.

### ❌ Command Palette Filtering

The permission explanation layer **MUST NOT** be used to:
- Filter command palette options
- Hide commands
- Disable commands
- Block command execution

**Rationale:** Command filtering is enforcement, not explanation.

### ❌ Role Enforcement

The permission explanation layer **MUST NOT** be used to:
- Check user roles
- Enforce role-based permissions
- Validate user permissions
- Block based on roles

**Rationale:** Role enforcement is policy, not explanation.

### ❌ Backend Logic

The permission explanation layer **MUST NOT** be used in:
- Backend code
- Server-side logic
- API controllers
- Database queries

**Rationale:** Backend logic is enforcement, not explanation.

## Implementation Pattern

### Required Structure

Every integration must include:

1. **Permission Context** (computed)
   ```typescript
   const permissionContext = computed(() => ({
     resource: 'resource-name',
     scope: 'RECORD',
     isReadOnly: true,  // MUST be true
     // ... other contextual signals
   }));
   ```

2. **Permission Derivation** (computed)
   ```typescript
   const permissions = computed(() =>
     derivePlatformPermissions(
       [/* actions */],
       permissionContext.value
     )
   );
   ```

3. **Action Label Helper** (function)
   ```typescript
   function getActionLabel(action) {
     // Map actions to human-readable labels
   }
   ```

4. **UI Section** (template)
   - Title: "Action Availability"
   - Lists each action with allowed/not allowed badge
   - Shows reason only when not allowed
   - No buttons, no interaction

5. **DEV-Only Assertions** (onMounted)
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     console.assert(
       permissionContext.value.isReadOnly === true,
       '[Platform Permissions] Explanation layer used on non-read-only surface'
     );
   }
   ```

## Current Integrations

### ✅ OrganizationSurface.vue
- **Status:** Integrated
- **Actions:** UPDATE, DELETE, LINK, UNLINK
- **Context:** Read-only, system-managed check

### ✅ PeopleSurface.vue
- **Status:** Integrated
- **Actions:** UPDATE, DELETE, LINK, UNLINK
- **Context:** Read-only

### ✅ EventDetail.vue
- **Status:** Integrated (read-only only)
- **Actions:** EXECUTE, COMPLETE, CANCEL, SUBMIT, APPROVE
- **Context:** Read-only, workflow-locked for audit events

## Enforcement

### Runtime Guards

Each integrated surface includes DEV-only runtime guards that:
- Validate `isReadOnly === true`
- Ensure permissions are derived
- Fail fast if misused

### Architectural Guards

This documentation serves as the architectural guard. Any violation of these rules is an architectural violation.

## Future Extensions

Before adding the permission explanation layer to any new surface:

1. Verify the surface is read-only
2. Verify the surface does not perform mutations
3. Verify the surface explains state, not enforces it
4. Add DEV-only assertions
5. Update this documentation

## Summary

The Platform Permission Explanation Layer is:
- ✅ **Explanatory only**
- ✅ **Read-only surfaces only**
- ✅ **Non-interactive UI only**
- ❌ **NOT for enforcement**
- ❌ **NOT for mutation surfaces**
- ❌ **NOT for hiding/disabling actions**
