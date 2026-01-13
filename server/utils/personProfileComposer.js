/**
 * ============================================================================
 * Person Profile Composer
 * ============================================================================
 *
 * Pure logic utility for composing a structured Person profile from:
 * - Raw person data (People model document or plain object)
 * - Resolved app context
 * - Enabled apps
 * - Permission snapshot
 *
 * Requirements:
 * - Input: person data, resolved app context, enabled apps, permissions
 * - Output: structured profile sections with read/write flags
 * - Core fields shared and consistent
 * - App fields isolated per app
 * - No UI rendering
 *
 * This utility does NOT:
 * - Hit the database
 * - Perform any UI rendering
 * - Merge app configurations
 * - Infer permissions (all permission flags are inputs)
 * ============================================================================
 */

const { APP_KEYS } = require('../constants/appKeys');

// ---------------------------------------------------------------------------
// Field classifications
// ---------------------------------------------------------------------------

/**
 * Core fields for People.
 * These are shared and consistent across all apps.
 *
 * NOTE:
 * - Field names are aligned with People.js schema
 * - Does not include app-specific lead/contact fields
 */
const CORE_FIELD_KEYS = [
  // Identity & contact
  'first_name',
  'last_name',
  'email',
  'phone',
  'mobile',

  // Classification & flags
  'source',
  'tags',
  'do_not_contact',

  // Relationships (CRM organization link, not tenant)
  'organization',

  // System / audit
  'organizationId',
  'createdBy',
  'assignedTo',
  'legacyContactId',

  // Notes & activity
  'notes',
  'activityLogs',

  // Timestamps (from Mongoose timestamps option)
  'createdAt',
  'updatedAt'
];

/**
 * App-specific fields for People, keyed by appKey.
 *
 * IMPORTANT:
 * - These are isolated per app
 * - They are NOT shared across apps
 * - They must never be merged into a single configuration
 *
 * This map can be safely extended with additional apps in the future without
 * changing the core composition logic.
 */
const APP_FIELD_KEYS_BY_APP = {
  [APP_KEYS.SALES]: [
    // Lead/Contact type
    'type',

    // Lead-specific (CRM-specific)
    'lead_status',
    'lead_owner',
    'lead_score',
    'interest_products',
    'qualification_date',
    'qualification_notes',
    'estimated_value',

    // Contact-specific (CRM-specific)
    'contact_status',
    'role',
    'birthday',
    'preferred_contact_method'
  ]

  // Other apps (HELPDESK, PROJECTS, AUDIT, PORTAL, etc.) can be added here
  // when they introduce app-specific People fields.
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a raw app key to uppercase, or null if invalid.
 *
 * @param {string | undefined | null} raw
 * @returns {string | null}
 */
function normalizeAppKey(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  return normalized || null;
}

/**
 * Shallow-pick a set of keys from a source object.
 *
 * @param {Object} source
 * @param {string[]} keys
 * @returns {Object}
 */
function pickFields(source, keys) {
  const result = {};
  if (!source || typeof source !== 'object') return result;

  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key];
    }
  });

  return result;
}

/**
 * Compose a structured Person profile.
 *
 * @param {Object} options
 * @param {Object} options.person
 *   Person data, either a Mongoose People document or a plain object.
 *
 * @param {Object} options.resolvedAppContext
 *   Resolved app context (e.g. from resolvePeopleAppContext):
 *   {
 *     appKey: string,
 *     confidence?: string,
 *     isAmbiguous?: boolean
 *   }
 *
 * @param {string[]} options.enabledApps
 *   Organization-level enabled app keys.
 *
 * @param {Object} options.permissions
 *   Permission snapshot with minimal expected shape:
 *   {
 *     core: {
 *       canView: boolean,
 *       canEdit: boolean
 *     },
 *     apps: {
 *       [appKey: string]: {
 *         canView: boolean,
 *         canEdit: boolean
 *       }
 *     }
 *   }
 *
 * @returns {{
 *   core: {
 *     appKey: 'PLATFORM',
 *     fields: Object,
 *     canView: boolean,
 *     canEdit: boolean
 *   },
 *   apps: {
 *     [appKey: string]: {
 *       appKey: string,
 *       fields: Object,
 *       canView: boolean,
 *       canEdit: boolean
 *     }
 *   }
 * }}
 */
function composePersonProfile({
  person,
  resolvedAppContext = {},
  enabledApps = [],
  permissions = {}
}) {
  // Normalize person data to a plain object
  const rawPerson =
    person && typeof person.toObject === 'function'
      ? person.toObject()
      : person || {};

  const contextAppKey = normalizeAppKey(resolvedAppContext.appKey);
  const normalizedEnabledApps = (enabledApps || [])
    .map(normalizeAppKey)
    .filter(Boolean);

  const corePerms = permissions.core || {};
  const appPerms = permissions.apps || {};

  // ---------------------------------------------------------------------------
  // Core section (shared & consistent)
  // ---------------------------------------------------------------------------
  const coreFields = pickFields(rawPerson, CORE_FIELD_KEYS);

  const coreSection = {
    appKey: 'PLATFORM',
    fields: coreFields,
    canView: !!corePerms.canView,
    canEdit: !!corePerms.canEdit
  };

  // ---------------------------------------------------------------------------
  // App-specific sections (isolated per app)
  // ---------------------------------------------------------------------------
  const appsSections = {};

  Object.entries(APP_FIELD_KEYS_BY_APP).forEach(([rawAppKey, fieldKeys]) => {
    const appKey = normalizeAppKey(rawAppKey);
    if (!appKey) return;

    // App must be enabled at org level
    if (!normalizedEnabledApps.includes(appKey)) {
      return;
    }

    const fields = pickFields(rawPerson, fieldKeys);

    // If there are no app-specific fields present on this person, skip section
    if (Object.keys(fields).length === 0) {
      return;
    }

    const perms = appPerms[appKey] || {};

    appsSections[appKey] = {
      appKey,
      fields,
      canView: !!perms.canView,
      // App fields are editable only when:
      // - User has canEdit for that app
      // - Current resolved app context matches the app
      canEdit: !!perms.canEdit && contextAppKey === appKey
    };
  });

  return {
    core: coreSection,
    apps: appsSections
  };
}

module.exports = {
  composePersonProfile
};


