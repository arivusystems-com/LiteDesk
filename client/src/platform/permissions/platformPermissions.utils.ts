// CONTRACT-LOCKED:
// See docs/architecture/platform-permission-contract.md
// This file MUST remain explanatory-only.

/*
============================================================================
PLATFORM PERMISSIONS — EXPLANATION LAYER (READ-ONLY)
============================================================================
This file derives human-readable permission explanations for platform actions.

This layer:
- Is UI-facing and explanatory only
- Does NOT enforce permissions
- Does NOT check roles or users
- Does NOT perform API calls
- Does NOT mutate state

It answers:
"Given the current context, why might this action be allowed or not?"

Enforcement happens elsewhere.
Role evaluation happens elsewhere.

This file MUST remain:
- Pure
- Deterministic
- Side-effect free
============================================================================
*/

import type {
  PermissionAction,
  PermissionScope,
  PlatformPermission
} from './platformPermissionVocabulary.types'

/**
 * Minimal, generic context for permission explanation.
 * 
 * This context:
 * - Is NOT user-specific
 * - Is NOT role-specific
 * - Is NOT tenant-specific
 */
export interface PlatformPermissionContext {
  resource: string              // e.g. 'event', 'organization', 'people'
  scope: PermissionScope         // RECORD | MODULE | APP | PLATFORM

  // Optional contextual signals (all optional)
  isArchived?: boolean
  isReadOnly?: boolean
  isSystemManaged?: boolean
  workflowLocked?: boolean
}

/**
 * Explained permission that includes whether it's allowed and why.
 */
export interface ExplainedPlatformPermission extends PlatformPermission {
  allowed: boolean
  reason?: string  // Required when allowed === false
}

/**
 * Derives human-readable permission explanations for platform actions.
 * 
 * This is a pure, deterministic function that explains WHY an action
 * might be allowed or not, based solely on contextual signals.
 * 
 * @param actions - The actions to explain
 * @param context - The contextual signals for explanation
 * @returns Array of explained permissions (PlatformPermission with allowed and reason)
 */
export function derivePlatformPermissions(
  actions: PermissionAction[],
  context: PlatformPermissionContext
): ExplainedPlatformPermission[] {
  const permissions: ExplainedPlatformPermission[] = actions.map(action => {
    const basePermission: ExplainedPlatformPermission = {
      action,
      scope: context.scope,
      resource: context.resource,
      description: '', // Will be set by explanation rules
      allowed: true,
    }

    // READ: Always allowed
    if (action === 'READ') {
      basePermission.description = 'View this record'
      basePermission.allowed = true
      return basePermission
    }

    // CREATE: Disallowed if isReadOnly === true
    if (action === 'CREATE') {
      basePermission.description = 'Create a new record'
      if (context.isReadOnly === true) {
        basePermission.allowed = false
        basePermission.reason = 'Creation is disabled in read-only contexts'
      }
      return basePermission
    }

    // UPDATE: Disallowed if isReadOnly === true or workflowLocked === true
    if (action === 'UPDATE') {
      basePermission.description = 'Modify this record'
      if (context.isReadOnly === true) {
        basePermission.allowed = false
        basePermission.reason = 'This record is read-only'
        return basePermission
      }
      if (context.workflowLocked === true) {
        basePermission.allowed = false
        basePermission.reason = 'This record is locked by workflow'
        return basePermission
      }
      return basePermission
    }

    // DELETE: Disallowed if isSystemManaged === true
    if (action === 'DELETE') {
      basePermission.description = 'Delete this record'
      if (context.isSystemManaged === true) {
        basePermission.allowed = false
        basePermission.reason = 'System-managed records cannot be deleted'
      }
      return basePermission
    }

    // EXECUTE / COMPLETE / CANCEL: Disallowed if workflowLocked === true
    if (action === 'EXECUTE' || action === 'COMPLETE' || action === 'CANCEL') {
      basePermission.description = `${action.toLowerCase()} this record`
      if (context.workflowLocked === true) {
        basePermission.allowed = false
        basePermission.reason = 'This action is controlled by workflow'
      }
      return basePermission
    }

    // All other actions: Allowed by default
    basePermission.description = `${action.toLowerCase()} this record`
    basePermission.allowed = true
    return basePermission
  })

  // DEV-only assertions
  if (process.env.NODE_ENV === 'development') {
    permissions.forEach(p => {
      console.assert(p.action, '[PlatformPermissions] Missing action', p)
      console.assert(p.scope, '[PlatformPermissions] Missing scope', p)
      console.assert(p.resource, '[PlatformPermissions] Missing resource', p)

      if (p.allowed === false) {
        console.assert(
          p.reason,
          '[PlatformPermissions] Disallowed permission missing reason',
          p
        )
      }
    })
  }

  return permissions
}
