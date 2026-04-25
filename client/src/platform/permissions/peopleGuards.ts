/**
 * ============================================================================
 * PEOPLE PERMISSION GUARDS — EXECUTION-TIME ENFORCEMENT
 * ============================================================================
 *
 * Defense-in-depth: Execution guards prevent unauthorized actions even if
 * UI gating fails or is bypassed.
 *
 * These guards are fail-fast assertions that throw errors if permissions
 * are missing. They protect against:
 * - Direct method calls
 * - Keyboard shortcuts
 * - DevTools manipulation
 * - Future refactors
 * - Reused components
 *
 * ⚠️ IMPORTANT:
 * - No UI handling here
 * - No user messaging
 * - Pure guardrail
 * - Errors bubble to console
 *
 * ============================================================================
 */

import type { PeoplePermission } from './peoplePermissions';
import { PEOPLE_PERMISSIONS } from './peoplePermissions';
import { hasPeoplePermission } from './peoplePermissionHelper';
import { useAuthStore } from '@/stores/authRegistry';

function isKeyOf<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

/**
 * Assert that user has a specific People permission
 * 
 * Throws an error if permission is missing.
 * This is a fail-fast guardrail.
 * 
 * @param permission - Canonical permission key from PEOPLE_PERMISSIONS
 * @throws Error if permission is missing
 */
export function assertPeoplePermission(permission: PeoplePermission): void {
  const authStore = useAuthStore();
  
  if (!hasPeoplePermission(permission, authStore)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Guard for Attach to App action
 * 
 * @param appKey - App key (e.g., 'SALES', 'MARKETING', 'HELPDESK')
 * @throws Error if permission is missing
 */
export function assertAttachPermission(appKey: string): void {
  const candidate = appKey.toUpperCase();
  const permissionKey = isKeyOf(PEOPLE_PERMISSIONS.ATTACH, candidate)
    ? PEOPLE_PERMISSIONS.ATTACH[candidate]
    : PEOPLE_PERMISSIONS.ATTACH.BASE;
  assertPeoplePermission(permissionKey);
}

/**
 * Guard for Edit Participation action
 * 
 * @param appKey - App key (e.g., 'SALES', 'MARKETING', 'HELPDESK')
 * @throws Error if permission is missing
 */
export function assertEditParticipationPermission(appKey: string): void {
  const candidate = appKey.toUpperCase();
  const permissionKey = isKeyOf(PEOPLE_PERMISSIONS.EDIT_PARTICIPATION, candidate)
    ? PEOPLE_PERMISSIONS.EDIT_PARTICIPATION[candidate]
    : PEOPLE_PERMISSIONS.EDIT_PARTICIPATION.BASE;
  assertPeoplePermission(permissionKey);
}

/**
 * Guard for Lifecycle actions (Convert, Detach)
 * 
 * @param appKey - App key (e.g., 'SALES', 'MARKETING')
 * @throws Error if permission is missing
 */
export function assertLifecyclePermission(appKey: string): void {
  const candidate = appKey.toUpperCase();
  const permissionKey = isKeyOf(PEOPLE_PERMISSIONS.LIFECYCLE, candidate)
    ? PEOPLE_PERMISSIONS.LIFECYCLE[candidate]
    : PEOPLE_PERMISSIONS.LIFECYCLE.BASE;
  assertPeoplePermission(permissionKey);
}

