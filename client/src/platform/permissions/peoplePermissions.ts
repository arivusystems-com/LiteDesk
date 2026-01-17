/**
 * ============================================================================
 * PEOPLE PERMISSIONS — CANONICAL DEFINITION
 * ============================================================================
 *
 * This file defines the ONLY allowed permission keys
 * for People-related actions.
 *
 * UI, modals, and API guards must consume from here.
 * No inline permission strings elsewhere.
 * ============================================================================
 */

export const PEOPLE_PERMISSIONS = {
  // --------------------------------------------------------------------------
  // Identity
  // --------------------------------------------------------------------------
  VIEW: 'people.view',
  EDIT_IDENTITY: 'people.edit',

  // --------------------------------------------------------------------------
  // Participation
  // --------------------------------------------------------------------------
  ATTACH: {
    BASE: 'people.attach',
    SALES: 'people.attach.sales',
    MARKETING: 'people.attach.marketing',
    HELPDESK: 'people.attach.helpdesk',
  },

  EDIT_PARTICIPATION: {
    BASE: 'people.participation.edit',
    SALES: 'people.participation.edit.sales',
    MARKETING: 'people.participation.edit.marketing',
    HELPDESK: 'people.participation.edit.helpdesk',
  },

  // --------------------------------------------------------------------------
  // Lifecycle (High-Risk Actions)
  // --------------------------------------------------------------------------
  LIFECYCLE: {
    BASE: 'people.lifecycle.manage',
    SALES: 'people.lifecycle.manage.sales',
    MARKETING: 'people.lifecycle.manage.marketing',
  },
} as const;

/**
 * Type-safe permission key for People actions
 * 
 * Prevents string misuse and ensures only canonical permissions are used.
 */
export type PeoplePermission =
  | typeof PEOPLE_PERMISSIONS.VIEW
  | typeof PEOPLE_PERMISSIONS.EDIT_IDENTITY
  | typeof PEOPLE_PERMISSIONS.ATTACH[keyof typeof PEOPLE_PERMISSIONS.ATTACH]
  | typeof PEOPLE_PERMISSIONS.EDIT_PARTICIPATION[keyof typeof PEOPLE_PERMISSIONS.EDIT_PARTICIPATION]
  | typeof PEOPLE_PERMISSIONS.LIFECYCLE[keyof typeof PEOPLE_PERMISSIONS.LIFECYCLE];

/**
 * ============================================================================
 * PERMISSION PHILOSOPHY
 * ============================================================================
 *
 * 1. Identity, Participation, and Lifecycle are separate authority surfaces.
 * 2. Viewing does NOT imply editing.
 * 3. Editing participation does NOT imply lifecycle changes.
 * 4. Lifecycle permissions are intentionally rare.
 * 5. App-specific permissions must be explicit.
 *
 * No component may invent new People permissions.
 * ============================================================================
 */

