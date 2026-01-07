/**
 * ============================================================================
 * App Registry: Single Source of Truth for App Configuration
 * ============================================================================
 * 
 * This file defines:
 * - Which roles belong to which app
 * - Which userTypes can access which apps
 * - Default role per app
 * - Future app extensibility
 * 
 * ⚠️ IMPORTANT: No role validation should be hardcoded elsewhere.
 *    All role validation must read from this registry.
 * 
 * ============================================================================
 */

module.exports = {
  CRM: {
    roles: ['ADMIN', 'MANAGER', 'USER'],
    userTypesAllowed: ['INTERNAL'],
    defaultRole: 'USER'
  },

  AUDIT: {
    roles: ['AUDITOR'],
    userTypesAllowed: ['INTERNAL', 'EXTERNAL'],
    defaultRole: 'AUDITOR'
  },

  PORTAL: {
    roles: ['CUSTOMER', 'VIEWER'],
    userTypesAllowed: ['EXTERNAL'],
    defaultRole: 'CUSTOMER'
  }
};

