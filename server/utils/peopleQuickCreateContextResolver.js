/**
 * ============================================================================
 * People Quick Create Context Resolver
 * ============================================================================
 *
 * Pure utility for resolving the final app context for People Quick Create flows.
 *
 * Requirements:
 * - Input: selected people type, owning apps, resolved app context
 * - Output: final appKey OR requiresUserChoice flag
 * - Must block execution on ambiguity
 * - Must never merge app configurations
 *
 * This resolver:
 * - Takes explicit inputs (selected type, owning apps, resolved app context)
 * - Never merges configurations from multiple apps
 * - Explicitly flags when user choice is required
 * - Blocks execution when ambiguity cannot be resolved
 *
 * It does NOT:
 * - Merge app configurations
 * - Silently default to any app
 * - Assume anything about specific apps
 * - Perform any UI logic
 * ============================================================================
 */

/**
 * Normalize a type key to uppercase.
 *
 * @param {string | undefined | null} raw
 * @returns {string | null}
 */
function normalizeTypeKey(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  return normalized || null;
}

/**
 * Normalize an app key to uppercase.
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
 * Resolve the final app context for People Quick Create.
 *
 * Resolution Logic:
 * 1. If a type is selected:
 *    a. If type has exactly one owning app → use that app (HIGH confidence)
 *    b. If type has multiple owning apps:
 *       - If resolved app context matches one of them → use that (HIGH confidence)
 *       - Otherwise → requiresUserChoice = true (block execution)
 * 2. If no type is selected:
 *    a. If resolved app context is unambiguous → use that (MEDIUM confidence)
 *    b. Otherwise → requiresUserChoice = true (block execution)
 *
 * Key Principles:
 * - Never merge app configurations
 * - Always pick exactly one app context
 * - Block execution when ambiguity cannot be resolved
 *
 * @param {Object} options
 * @param {string | null | undefined} options.selectedType
 *   The People type selected by the user (e.g., 'LEAD', 'CONTACT', 'MEMBER').
 *   If null/undefined, no type is selected.
 *
 * @param {string[]} options.owningApps
 *   Array of app keys that own/declare the selected type.
 *   Example: ['SALES', 'HELPDESK'] if CONTACT is owned by both.
 *   If selectedType is null, this should be empty or ignored.
 *
 * @param {Object} options.resolvedAppContext
 *   Result from resolvePeopleAppContext() or equivalent:
 *   {
 *     appKey: string,              // Resolved app key (never null)
 *     confidence: string,          // 'HIGH' | 'MEDIUM' | 'LOW' | 'AMBIGUOUS'
 *     isAmbiguous: boolean,       // True if multiple candidates exist
 *     candidates?: string[]        // All viable app keys considered
 *   }
 *
 * @returns {{
 *   appKey: string | null,        // Final app key (null if requiresUserChoice)
 *   requiresUserChoice: boolean,  // True if user must select an app
 *   reason: string,               // Human-readable explanation
 *   confidence: 'HIGH' | 'MEDIUM' | 'BLOCKED',
 *   candidates?: string[]          // App keys user can choose from (if requiresUserChoice)
 * }}
 */
function resolveQuickCreateContext({
  selectedType = null,
  owningApps = [],
  resolvedAppContext = null
}) {
  const normalizedType = normalizeTypeKey(selectedType);
  const normalizedOwningApps = (owningApps || [])
    .map(normalizeAppKey)
    .filter(Boolean);

  // Validate resolvedAppContext structure
  const safeContext = resolvedAppContext || {};
  const contextAppKey = normalizeAppKey(safeContext.appKey);
  const contextIsAmbiguous = safeContext.isAmbiguous === true;
  const contextCandidates = Array.isArray(safeContext.candidates)
    ? safeContext.candidates.map(normalizeAppKey).filter(Boolean)
    : [];

  // ---------------------------------------------------------------------------
  // Case 1: Type is selected
  // ---------------------------------------------------------------------------
  if (normalizedType) {
    if (normalizedOwningApps.length === 0) {
      // Type selected but no owning apps provided → invalid state
      return {
        appKey: null,
        requiresUserChoice: true,
        reason:
          `Selected type '${normalizedType}' has no owning apps. ` +
          `Cannot determine app context for Quick Create. User must select an app.`,
        confidence: 'BLOCKED',
        candidates: []
      };
    }

    if (normalizedOwningApps.length === 1) {
      // Type has exactly one owning app → use that app (HIGH confidence)
      const singleApp = normalizedOwningApps[0];
      return {
        appKey: singleApp,
        requiresUserChoice: false,
        reason:
          `Selected type '${normalizedType}' is owned by exactly one app: ${singleApp}. ` +
          `Using ${singleApp} as app context for Quick Create.`,
        confidence: 'HIGH'
      };
    }

    // Type has multiple owning apps → check if resolved context matches one
    if (normalizedOwningApps.length > 1) {
      if (contextAppKey && normalizedOwningApps.includes(contextAppKey)) {
        // Resolved app context matches one of the owning apps → use that (HIGH confidence)
        return {
          appKey: contextAppKey,
          requiresUserChoice: false,
          reason:
            `Selected type '${normalizedType}' is owned by multiple apps: ` +
            `${normalizedOwningApps.join(', ')}. ` +
            `Resolved app context (${contextAppKey}) matches one of them. ` +
            `Using ${contextAppKey} as app context for Quick Create.`,
          confidence: 'HIGH'
        };
      }

      // Resolved context doesn't match any owning app → require user choice
      return {
        appKey: null,
        requiresUserChoice: true,
        reason:
          `Selected type '${normalizedType}' is owned by multiple apps: ` +
          `${normalizedOwningApps.join(', ')}. ` +
          `Resolved app context (${contextAppKey || 'none'}) does not match any of them. ` +
          `User must select which app to use for Quick Create.`,
        confidence: 'BLOCKED',
        candidates: normalizedOwningApps.slice().sort()
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Case 2: No type is selected
  // ---------------------------------------------------------------------------
  if (!normalizedType) {
    if (!contextAppKey) {
      // No type, no resolved context → require user choice
      return {
        appKey: null,
        requiresUserChoice: true,
        reason:
          `No type selected and no app context resolved. ` +
          `User must select an app for Quick Create.`,
        confidence: 'BLOCKED',
        candidates: contextCandidates.length > 0 ? contextCandidates : []
      };
    }

    if (contextIsAmbiguous) {
      // No type, but resolved context is ambiguous → require user choice
      return {
        appKey: null,
        requiresUserChoice: true,
        reason:
          `No type selected. Resolved app context is ambiguous with multiple candidates: ` +
          `${contextCandidates.join(', ')}. ` +
          `User must select which app to use for Quick Create.`,
        confidence: 'BLOCKED',
        candidates: contextCandidates.length > 0 ? contextCandidates : []
      };
    }

    // No type, but resolved context is unambiguous → use that (MEDIUM confidence)
    return {
      appKey: contextAppKey,
      requiresUserChoice: false,
      reason:
        `No type selected. Using resolved app context: ${contextAppKey}. ` +
        `Confidence: ${safeContext.confidence || 'MEDIUM'}.`,
      confidence: 'MEDIUM'
    };
  }

  // Should not reach here, but guard anyway
  return {
    appKey: null,
    requiresUserChoice: true,
    reason: `Unexpected state in Quick Create context resolution. User must select an app.`,
    confidence: 'BLOCKED',
    candidates: []
  };
}

module.exports = {
  resolveQuickCreateContext,
  normalizeTypeKey,
  normalizeAppKey
};

