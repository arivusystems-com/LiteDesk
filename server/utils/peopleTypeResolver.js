/**
 * ============================================================================
 * People Type Resolver
 * ============================================================================
 *
 * Pure logic utility for resolving visible People types across applications.
 *
 * Requirements:
 * - Input: enabled apps, app registry metadata, user permissions
 * - Output: People types with owning app(s)
 * - Support duplicate type names across apps
 * - No global configuration or overrides
 * - Pure logic, no UI
 *
 * This resolver:
 * - Reads platform-level metadata from module projections (People section)
 * - Filters by organization-enabled apps and user permissions
 * - Produces a deterministic view of which apps own which People types
 *
 * It does NOT:
 * - Mutate metadata or configuration
 * - Perform any I/O or UI logic
 * - Assume anything about specific app names
 * ============================================================================
 */

const moduleProjections = require('../constants/moduleProjections');

/**
 * Normalize string app keys to uppercase, filtering out falsy values.
 *
 * @param {string[]} maybeKeys
 * @returns {string[]}
 */
function normalizeAppKeys(maybeKeys) {
  if (!Array.isArray(maybeKeys)) return [];
  return maybeKeys
    .filter((k) => typeof k === 'string' && k.trim().length > 0)
    .map((k) => k.trim().toUpperCase());
}

/**
 * Resolve People types across apps for a given org/user context.
 *
 * @param {Object} options
 * @param {string[]} options.enabledApps
 *   Organization-level enabled app keys (e.g. ['SALES', 'HELPDESK', 'AUDIT'])
 *
 * @param {Object} options.appRegistry
 *   App registry metadata (typically from server/constants/appRegistry.js).
 *   Used for presence/validity checking only; this resolver does not mutate it.
 *
 * @param {Object} options.userPermissions
 *   User permissions snapshot by app, minimal shape:
 *   {
 *     [appKey: string]: {
 *       canViewPeople?: boolean   // true if user can see People in this app
 *       // (additional flags allowed but ignored by this resolver)
 *     }
 *   }
 *
 * @returns {{
 *   byApp: {
 *     [appKey: string]: {
 *       appKey: string,
 *       types: string[]           // People types visible in this app
 *     }
 *   },
 *   aggregated: Array<{
 *     typeKey: string,            // e.g. 'LEAD', 'CONTACT'
 *     owningApps: string[]        // apps that declare/own this type
 *   }>
 * }}
 */
function resolvePeopleTypes({
  enabledApps = [],
  appRegistry = {},
  userPermissions = {}
}) {
  const peopleProjection = moduleProjections && moduleProjections.PEOPLE;

  if (!peopleProjection || !peopleProjection.apps) {
    // No People projection metadata → return empty structure (pure + explicit)
    return {
      byApp: {},
      aggregated: []
    };
  }

  const normalizedEnabledApps = normalizeAppKeys(enabledApps);

  // Build per-app visible types based on:
  // - App present in People projection metadata
  // - App is enabled for the org
  // - App exists in registry (if provided)
  // - User has canViewPeople permission in that app
  const byApp = {};

  Object.entries(peopleProjection.apps).forEach(([rawAppKey, appConfig]) => {
    const appKey = rawAppKey.toUpperCase();

    console.log(`[PeopleTypeResolver] Processing app: ${rawAppKey} -> ${appKey}`);

    // App must be enabled at org level
    if (!normalizedEnabledApps.includes(appKey)) {
      console.log(`[PeopleTypeResolver] App ${appKey} not in enabledApps:`, normalizedEnabledApps);
      return;
    }

    // If an appRegistry is provided, only consider apps that exist there
    if (appRegistry && Object.keys(appRegistry).length > 0) {
      const normalizedRegistryKey = Object.keys(appRegistry).find(
        (k) => k.toUpperCase() === appKey
      );
      if (!normalizedRegistryKey) {
        console.log(`[PeopleTypeResolver] App ${appKey} not in appRegistry`);
        return;
      }
    }

    const perms = userPermissions[appKey] || {};
    if (!perms.canViewPeople) {
      console.log(`[PeopleTypeResolver] User cannot view People in ${appKey}`);
      // User cannot see People in this app → skip
      return;
    }

    const allowedTypes = Array.isArray(appConfig.allowedTypes)
      ? appConfig.allowedTypes
      : [];

    if (!allowedTypes.length) {
      console.log(`[PeopleTypeResolver] No allowedTypes for ${appKey}`);
      return;
    }

    console.log(`[PeopleTypeResolver] Adding types for ${appKey}:`, allowedTypes);

    byApp[appKey] = {
      appKey,
      types: Array.from(
        new Set(
          allowedTypes
            .filter((t) => typeof t === 'string' && t.trim().length > 0)
            .map((t) => t.trim().toUpperCase())
        )
      )
    };
  });

  // Aggregate by type key, supporting duplicate type names across apps.
  // Example result:
  //   CONTACT → ['SALES', 'HELPDESK', 'AUDIT', 'PORTAL']
  const typeToApps = {};

  Object.values(byApp).forEach(({ appKey, types }) => {
    types.forEach((typeKey) => {
      if (!typeToApps[typeKey]) {
        typeToApps[typeKey] = new Set();
      }
      typeToApps[typeKey].add(appKey);
    });
  });

  const aggregated = Object.entries(typeToApps).map(([typeKey, appSet]) => ({
    typeKey,
    owningApps: Array.from(appSet).sort()
  }));

  // Sort aggregated by type key for deterministic output
  aggregated.sort((a, b) => a.typeKey.localeCompare(b.typeKey));

  return {
    byApp,
    aggregated
  };
}

module.exports = {
  resolvePeopleTypes
};


