/**
 * ============================================================================
 * PEOPLE PERMISSIONS — BACKEND CANONICAL MAP
 * ============================================================================
 * 
 * Must stay in sync with client/src/platform/permissions/peoplePermissions.ts
 * 
 * This file defines the ONLY allowed permission keys for People-related actions.
 * Backend routes and middleware must consume from here.
 * No inline permission strings elsewhere.
 * 
 * ============================================================================
 */

module.exports = {
  VIEW: 'people.view',
  EDIT_IDENTITY: 'people.edit',

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

  LIFECYCLE: {
    BASE: 'people.lifecycle.manage',
    SALES: 'people.lifecycle.manage.sales',
    MARKETING: 'people.lifecycle.manage.marketing',
  },
};
