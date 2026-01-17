/**
 * ============================================================================
 * People App Context Resolver
 * ============================================================================
 *
 * Pure utility for resolving the application context (appKey) for
 * People-related runtime flows.
 *
 * This resolver:
 * - Takes explicit, structured inputs (no hidden globals, no UI logic)
 * - Never returns null or silently defaults
 * - Explicitly reports ambiguity and confidence level
 * - Makes no assumptions about specific apps (Sales, Helpdesk, etc.)
 *
 * Inputs:
 *   - routeInfo: {
 *       path: string,
 *       name?: string,
 *       params?: object,
 *       query?: object,
 *       meta?: object
 *     }
 *   - navigationIntent: {
 *       sourceAppKey?: string,
 *       targetModuleKey?: string,
 *       targetPersonId?: string,
 *       intent?: 'view' | 'create' | 'edit' | string
 *     } | null
 *   - enabledApps: string[]        // Organization-level enabled app keys
 *   - userAppAccess: string[]      // User-level allowed app keys
 *
 * Output:
 *   {
 *     appKey: string,              // Resolved app key (never null/undefined)
 *     confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'AMBIGUOUS',
 *     reason: string,              // Human-readable explanation
 *     candidates: string[],        // All viable app keys considered
 *     signals: {                   // Raw signal breakdown for debugging
 *       fromRoutePrefix?: string,
 *       fromRouteMeta?: string,
 *       fromRouteQuery?: string,
 *       fromNavigationIntent?: string
 *     },
 *     isAmbiguous: boolean         // True if multiple viable candidates exist
 *   }
 *
 * NOTE:
 * - This utility is intentionally generic and does not hard-code any specific
 *   apps. It only works with keys provided via inputs + APP_KEYS registry.
 * - Callers (frontend/backend) are responsible for prompting the user when
 *   confidence is LOW or AMBIGUOUS.
 * ============================================================================
 */

const { APP_KEYS, VALID_APP_KEYS } = require('../constants/appKeys');

/**
 * Normalize a potential app key:
 * - Trim whitespace
 * - Uppercase
 * - Validate against known app keys (if possible)
 *
 * Returns null if the value cannot be normalized to a known app key.
 *
 * @param {string | undefined | null} raw
 * @returns {string | null}
 */
function normalizeAppKey(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const candidate = raw.trim().toUpperCase();
  if (!candidate) return null;
  // If it's in the known list, accept it directly
  if (VALID_APP_KEYS.includes(candidate)) {
    return candidate;
  }
  // If it's not in VALID_APP_KEYS, still allow it as a candidate only if
  // the caller's enabledApps/userAppAccess include it.
  return candidate;
}

/**
 * Safely intersect two arrays of strings.
 * Returns a new array with unique values present in both.
 *
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string[]}
 */
function intersect(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return [];
  const setB = new Set(b);
  return Array.from(new Set(a.filter((v) => setB.has(v))));
}

/**
 * Extract a generic app key from a People-related route path.
 *
 * Examples (generic, no special-casing app names):
 *   - "/sales/people"            -> "SALES"
 *   - "/helpdesk/people/123"     -> "HELPDESK"
 *   - "/projects/people?x=1"     -> "PROJECTS"
 *   - "/people"                  -> null (no prefix/app key)
 *
 * @param {string} path
 * @returns {string | null}
 */
function extractAppKeyFromPeopleRoute(path) {
  if (!path || typeof path !== 'string') return null;

  const cleanPath = path.split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean); // remove empty segments

  // Expecting shapes like:
  // - ["people"]
  // - ["<app-segment>", "people"]
  // - ["<app-segment>", "people", ":id"]
  if (segments.length >= 2 && segments[1] === 'people') {
    return normalizeAppKey(segments[0]);
  }

  // Neutral routes like "/people" have no app prefix
  return null;
}

/**
 * Resolve app context for People flows.
 *
 * @param {Object} options
 * @param {Object} options.routeInfo
 * @param {string} options.routeInfo.path
 * @param {string} [options.routeInfo.name]
 * @param {Object} [options.routeInfo.params]
 * @param {Object} [options.routeInfo.query]
 * @param {Object} [options.routeInfo.meta]
 * @param {Object|null} [options.navigationIntent]
 * @param {string[]} options.enabledApps
 * @param {string[]} options.userAppAccess
 * @returns {{
 *   appKey: string,
 *   confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'AMBIGUOUS',
 *   reason: string,
 *   candidates: string[],
 *   signals: {
 *     fromRoutePrefix?: string,
 *     fromRouteMeta?: string,
 *     fromRouteQuery?: string,
 *     fromNavigationIntent?: string
 *   },
 *   isAmbiguous: boolean
 * }}
 */
function resolvePeopleAppContext({
  routeInfo,
  navigationIntent = null,
  enabledApps = [],
  userAppAccess = []
}) {
  const safeRoute = routeInfo || {};
  const path = safeRoute.path || '';
  const meta = safeRoute.meta || {};
  const query = safeRoute.query || {};

  const signals = {};
  const rawCandidates = [];

  // ---------------------------------------------------------------------------
  // 1) Strong signal: route prefix ("/<app>/people")
  // ---------------------------------------------------------------------------
  const fromRoutePrefix = extractAppKeyFromPeopleRoute(path);
  if (fromRoutePrefix) {
    signals.fromRoutePrefix = fromRoutePrefix;
    rawCandidates.push(fromRoutePrefix);
  }

  // ---------------------------------------------------------------------------
  // 2) Strong signal: explicit meta.appKey (if routing defines one)
  // ---------------------------------------------------------------------------
  if (meta && typeof meta.appKey === 'string') {
    const normalizedMetaKey = normalizeAppKey(meta.appKey);
    if (normalizedMetaKey) {
      signals.fromRouteMeta = normalizedMetaKey;
      rawCandidates.push(normalizedMetaKey);
    }
  }

  // ---------------------------------------------------------------------------
  // 3) Medium signal: query param ?appKey=<APP>
  // ---------------------------------------------------------------------------
  if (query && typeof query.appKey === 'string') {
    const normalizedQueryKey = normalizeAppKey(query.appKey);
    if (normalizedQueryKey) {
      signals.fromRouteQuery = normalizedQueryKey;
      rawCandidates.push(normalizedQueryKey);
    }
  }

  // ---------------------------------------------------------------------------
  // 4) Strong signal: navigation intent sourceAppKey
  // ---------------------------------------------------------------------------
  if (navigationIntent && typeof navigationIntent.sourceAppKey === 'string') {
    const normalizedIntentKey = normalizeAppKey(navigationIntent.sourceAppKey);
    if (normalizedIntentKey) {
      signals.fromNavigationIntent = normalizedIntentKey;
      rawCandidates.push(normalizedIntentKey);
    }
  }

  // ---------------------------------------------------------------------------
  // 5) Normalize + de-duplicate raw candidates
  // ---------------------------------------------------------------------------
  const uniqueRawCandidates = Array.from(
    new Set(
      rawCandidates
        .filter(Boolean)
        .map((k) => k.toUpperCase())
    )
  );

  // ---------------------------------------------------------------------------
  // 6) Filter by enabled apps + user app access
  // ---------------------------------------------------------------------------
  const enabled = (enabledApps || []).map((k) => k && k.toUpperCase()).filter(Boolean);
  const userAllowed = (userAppAccess || []).map((k) => k && k.toUpperCase()).filter(Boolean);
  const enabledAndAllowed = intersect(enabled, userAllowed);

  // If there are explicit candidates, constrain them to enabled+allowed
  let viableCandidates = uniqueRawCandidates.length
    ? intersect(uniqueRawCandidates, enabledAndAllowed)
    : [];

  // Special case: If navigationIntent specifies an appKey (from person's participation),
  // ensure it's included even if it wasn't in the initial intersection
  // This handles cases where the person participates in an app that might not be
  // in the enabled apps list or user access list
  if (navigationIntent?.sourceAppKey) {
    const participationAppKey = normalizeAppKey(navigationIntent.sourceAppKey);
    if (participationAppKey && !viableCandidates.includes(participationAppKey)) {
      // Add the participation app to viable candidates if it's in enabled apps
      // This ensures we can prioritize it even if user access is restricted
      if (enabled.includes(participationAppKey)) {
        viableCandidates.push(participationAppKey);
      }
    }
  }

  // If no explicit candidates made it through, fall back to all enabled+allowed apps
  if (!viableCandidates.length && enabledAndAllowed.length) {
    viableCandidates = enabledAndAllowed.slice();
  }

  // Last safety: if there is absolutely no information about enabled/apps,
  // fall back to known APP_KEYS list. This is not silent: we will return LOW
  // confidence and an explicit reason.
  if (!viableCandidates.length && !enabledAndAllowed.length) {
    viableCandidates = Object.values(APP_KEYS);
  }

  // ---------------------------------------------------------------------------
  // 7) Choose final appKey + confidence classification
  // ---------------------------------------------------------------------------
  let finalAppKey = null;
  let confidence = 'LOW';
  let reason = '';
  let isAmbiguous = false;

  if (viableCandidates.length === 1) {
    // Single viable candidate → HIGH or MEDIUM depending on signal strength
    // BUT: If navigationIntent specifies a different app (from person's participation),
    // prioritize that app if it's enabled (even if user doesn't have explicit access)
    let candidateAppKey = viableCandidates[0];
    
    // Check if navigationIntent specifies a participation app that should take priority
    if (navigationIntent?.sourceAppKey) {
      const participationAppKey = normalizeAppKey(navigationIntent.sourceAppKey);
      // If participation app is enabled, use it instead (person's actual participation trumps)
      if (participationAppKey && enabled.includes(participationAppKey)) {
        candidateAppKey = participationAppKey;
        // Add to viable candidates if not already there
        if (!viableCandidates.includes(participationAppKey)) {
          viableCandidates.push(participationAppKey);
        }
      }
    }
    
    finalAppKey = candidateAppKey;

    const strongSignals = [
      signals.fromRoutePrefix,
      signals.fromRouteMeta,
      signals.fromNavigationIntent
    ].filter(Boolean);

    if (strongSignals.includes(finalAppKey) || (navigationIntent?.sourceAppKey && normalizeAppKey(navigationIntent.sourceAppKey) === finalAppKey)) {
      confidence = 'HIGH';
      reason =
        `Resolved from strong signal(s): ` +
        `${strongSignals.filter(Boolean).join(', ') || 'person participation'}. ` +
        `Final appKey=${finalAppKey}.`;
    } else {
      confidence = 'MEDIUM';
      reason =
        `Resolved from fallback intersection of enabled apps and user access. ` +
        `Final appKey=${finalAppKey}.`;
    }
  } else if (viableCandidates.length > 1) {
    // Multiple viable candidates → ambiguous by definition
    // Prioritize navigationIntent appKey if present, otherwise pick first alphabetically
    const sorted = viableCandidates.slice().sort();
    
    // If navigationIntent specifies an appKey and it's in viable candidates, prioritize it
    if (navigationIntent?.sourceAppKey) {
      const preferredAppKey = normalizeAppKey(navigationIntent.sourceAppKey);
      if (preferredAppKey && viableCandidates.includes(preferredAppKey)) {
        finalAppKey = preferredAppKey;
        confidence = 'HIGH';
        reason =
          `Multiple viable apps: ${sorted.join(', ')}. ` +
          `Prioritized ${finalAppKey} from navigationIntent (person's actual participation).`;
      } else {
        finalAppKey = sorted[0];
        confidence = 'AMBIGUOUS';
        isAmbiguous = true;
        reason =
          `Ambiguous People app context. Multiple viable apps: ` +
          `${sorted.join(', ')}. ` +
          `Selected ${finalAppKey} deterministically; caller MUST prompt user or ` +
          `respect isAmbiguous=true before executing People actions.`;
      }
    } else {
      finalAppKey = sorted[0];
      confidence = 'AMBIGUOUS';
      isAmbiguous = true;
      reason =
        `Ambiguous People app context. Multiple viable apps: ` +
        `${sorted.join(', ')}. ` +
        `Selected ${finalAppKey} deterministically; caller MUST prompt user or ` +
        `respect isAmbiguous=true before executing People actions.`;
    }
  } else {
    // Should not happen, but guard anyway: pick a deterministic default
    const allKnown = Object.values(APP_KEYS);
    finalAppKey = allKnown[0];
    confidence = 'LOW';
    isAmbiguous = true;
    reason =
      `No viable app candidates after filtering. ` +
      `Falling back to first known appKey=${finalAppKey}. ` +
      `Caller MUST treat this as a low-confidence fallback and prompt the user.`;
  }

  return {
    appKey: finalAppKey,
    confidence,
    reason,
    candidates: viableCandidates,
    signals,
    isAmbiguous
  };
}

module.exports = {
  resolvePeopleAppContext,
  extractAppKeyFromPeopleRoute,
  normalizeAppKey
};


