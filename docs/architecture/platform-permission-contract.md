# Platform Permission Contract (Authoritative)

## Overview

This document defines the authoritative contract for Platform Permissions. This contract is **LOCKED** and must not be violated.

## What Platform Permissions ARE

Platform Permissions are:

1. **A canonical vocabulary of actions**
   - Defines WHAT actions exist in the platform
   - Provides human-readable descriptions
   - Establishes shared terminology

2. **A read-only explanation layer**
   - Explains WHY actions may or may not be allowed
   - Derives explanations from contextual signals
   - Provides UI-facing explanations only

3. **UI-facing only**
   - Exists solely for user interface explanation
   - Does not interact with backend systems
   - Does not perform API calls

4. **Deterministic and state-derived**
   - Explanations are computed from existing state
   - No external dependencies
   - Pure functions only

5. **Safe to import anywhere**
   - No side effects
   - No state mutations
   - No external dependencies

## What Platform Permissions are NOT

Platform Permissions **MUST NEVER**:

- ❌ **Enforce access**
  - Do not block users from actions
  - Do not prevent API calls
  - Do not replace backend authorization

- ❌ **Block actions**
  - Do not prevent button clicks
  - Do not stop form submissions
  - Do not interrupt workflows

- ❌ **Disable buttons**
  - Do not set `disabled` attributes
  - Do not conditionally disable UI elements
  - Do not hide interactive elements

- ❌ **Hide UI**
  - Do not conditionally render buttons
  - Do not hide form fields
  - Do not remove navigation options

- ❌ **Replace role checks**
  - Do not check user roles
  - Do not validate permissions
  - Do not enforce policies

- ❌ **Replace backend authorization**
  - Do not perform authorization logic
  - Do not validate access tokens
  - Do not check API permissions

- ❌ **Be used in create / edit / execution flows**
  - Do not appear in create forms
  - Do not appear in edit forms
  - Do not appear in execution surfaces

- ❌ **Perform API calls**
  - Do not fetch permission data
  - Do not sync with backend
  - Do not validate with server

- ❌ **Know about users, roles, or tenants**
  - Do not reference user context
  - Do not check role assignments
  - Do not validate tenant access

## Current Contract (LOCKED)

**Platform Permissions are explanation-only and non-authoritative.**

This contract is locked. Platform Permissions:
- Explain why actions may or may not be allowed
- Do not enforce whether actions are allowed
- Do not block or prevent actions
- Do not replace backend authorization

## Single Allowed Evolution Path

If enforcement is ever required in the future:

### A new system must be created

The new enforcement system **MUST**:

1. **Live in a different folder**
   - Not in `platform/permissions/`
   - Separate directory structure
   - Clear separation of concerns

2. **Have a different name**
   - Not "Platform Permissions"
   - Distinct naming convention
   - Clear identity separation

3. **Have explicit backend ownership**
   - Backend API endpoints
   - Server-side validation
   - Authoritative permission checks

### Platform Permissions relationship:

- **MAY** be used as vocabulary
  - The new system may reference Platform Permission actions
  - The new system may use Platform Permission types
  - The new system may import Platform Permission vocabulary

- **MUST NOT** be upgraded in place
  - Platform Permissions must remain explanation-only
  - No enforcement logic may be added to Platform Permissions
  - No role checks may be added to Platform Permissions

### Explicit Rule

**Platform Permissions may be referenced by an enforcement system, but must never become one.**

## Why This Lock Exists

This contract lock exists to:

1. **Prevent double-auth systems**
   - Avoids UI and backend having different permission logic
   - Prevents conflicts between systems
   - Ensures single source of truth

2. **Prevent UI/backend drift**
   - Keeps UI explanations aligned with backend reality
   - Prevents stale permission logic
   - Maintains consistency

3. **Keep reasoning explainable**
   - Explanations remain clear and understandable
   - No complex enforcement logic to debug
   - Simple, deterministic behavior

4. **Keep enforcement testable**
   - Backend enforcement can be tested independently
   - UI explanations can be tested independently
   - Clear separation of concerns

## ❗ If You Think You Need Enforcement

### Checklist

Before adding any enforcement logic, ask:

- [ ] Are you trying to hide a button?
- [ ] Are you trying to block a mutation?
- [ ] Are you duplicating backend logic?
- [ ] Are you checking roles here?

**If any answer is "yes" → STOP.**

### What to Do Instead

1. **Use backend authorization**
   - Backend API should enforce permissions
   - Backend should return appropriate errors
   - Backend should validate access

2. **Use existing auth system**
   - Check existing authentication/authorization systems
   - Use role-based access control (RBAC) if available
   - Use policy engine if available

3. **Create a new enforcement system**
   - If no enforcement system exists, create one
   - Follow the "Single Allowed Evolution Path" above
   - Keep Platform Permissions separate

### Links to Related Systems

- **Auth system**: See authentication/authorization documentation
- **Backend permission enforcement**: See API documentation
- **API gateway**: See gateway documentation
- **Policy engine**: See policy documentation (if exists)

## Explicitly Forbidden

The following are **explicitly forbidden**:

- ❌ Adding flags like `enforce: true`
- ❌ Adding role awareness
- ❌ Adding backend sync
- ❌ Adding permission caching
- ❌ Adding user context
- ❌ Adding "temporary" exceptions
- ❌ Adding TODO comments that violate the contract

**No exceptions. No TODOs that violate the contract.**

## Contract References

All Platform Permission files must reference this contract:

```typescript
// CONTRACT-LOCKED:
// See docs/architecture/platform-permission-contract.md
// This file MUST remain explanatory-only.
```

## Enforcement

Violations of this contract are architectural violations. The contract is enforced through:

1. **Documentation** (this file)
2. **Code comments** (contract-locked comments in files)
3. **DEV-only guards** (runtime assertions)
4. **Code review** (architectural review required)

## Summary

Platform Permissions are:
- ✅ **Explanation-only**
- ✅ **Non-authoritative**
- ✅ **UI-facing**
- ✅ **Deterministic**
- ❌ **NOT enforcement**
- ❌ **NOT authorization**
- ❌ **NOT blocking**

This contract is **LOCKED** and must not be violated.
