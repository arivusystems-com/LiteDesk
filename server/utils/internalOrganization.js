/**
 * ============================================================================
 * Internal Organization Helpers
 * ============================================================================
 *
 * "Internal" organizations are Arivu's own tenants (e.g. the Arivu Systems
 * master org). They are flagged via `Instance.isInternal = true` and must:
 *   - never be billed
 *   - never be seat-limited
 *   - never sit in TRIAL on any app
 *
 * Subscription bootstrap / sync code calls `isInternalOrganization(orgId)` to
 * decide whether to short-circuit normal plan resolution and provision the
 * canonical ENTERPRISE entitlement instead.
 *
 * Fails closed: any lookup error returns false (i.e. treats the org as a
 * regular paying tenant). That preserves seat counting if the master DB is
 * briefly unreachable.
 * ============================================================================
 */

const Instance = require('../models/Instance');
const appPricingRegistry = require('../constants/appPricingRegistry');

const ENTERPRISE_PLAN_KEY = 'ENTERPRISE';

/**
 * Is this organization flagged as an internal (Arivu-owned) tenant?
 *
 * @param {string|import('mongoose').Types.ObjectId|null|undefined} orgId
 * @returns {Promise<boolean>}
 */
async function isInternalOrganization(orgId) {
    if (!orgId) return false;
    try {
        const instance = await Instance.findOne({ organizationId: orgId })
            .select('isInternal')
            .lean();
        return !!(instance && instance.isInternal);
    } catch (err) {
        console.warn('[InternalOrganization] Failed to resolve isInternal for org', {
            orgId: String(orgId),
            error: err?.message
        });
        return false;
    }
}

/**
 * Return the canonical "ENTERPRISE / unlimited / ACTIVE" app subscription
 * entry shape for an internal org. The seat limit is taken from the pricing
 * registry's ENTERPRISE plan (typically `null` = unlimited).
 *
 * Callers should never put internal orgs into TRIAL, so `trialEndsAt` is null.
 *
 * @param {string} appKey
 * @returns {{
 *   appKey: string,
 *   planKey: 'ENTERPRISE',
 *   seatLimit: number|null,
 *   seatsUsed: number,
 *   status: 'ACTIVE',
 *   trialEndsAt: null,
 *   startedAt: Date
 * }}
 */
function buildEnterpriseAppSubscription(appKey) {
    const pricing = appPricingRegistry[appKey] || {};
    const enterpriseSeatLimit = pricing.plans?.[ENTERPRISE_PLAN_KEY]?.seatLimit ?? null;

    return {
        appKey,
        planKey: ENTERPRISE_PLAN_KEY,
        seatLimit: enterpriseSeatLimit,
        seatsUsed: 0,
        status: 'ACTIVE',
        trialEndsAt: null,
        startedAt: new Date()
    };
}

/**
 * Mutate an existing OrganizationSubscription.apps[] entry in place so it
 * matches the canonical internal-org shape (ENTERPRISE / unlimited / ACTIVE).
 *
 * @param {object} existing - subdocument from OrganizationSubscription.apps
 * @returns {boolean} true if anything was modified, false if it was already aligned
 */
function normalizeExistingEntryForInternalOrg(existing) {
    if (!existing) return false;
    const pricing = appPricingRegistry[existing.appKey] || {};
    const enterpriseSeatLimit = pricing.plans?.[ENTERPRISE_PLAN_KEY]?.seatLimit ?? null;

    let changed = false;
    if (existing.planKey !== ENTERPRISE_PLAN_KEY) {
        existing.planKey = ENTERPRISE_PLAN_KEY;
        changed = true;
    }
    if (existing.seatLimit !== enterpriseSeatLimit) {
        existing.seatLimit = enterpriseSeatLimit;
        changed = true;
    }
    if (existing.status !== 'ACTIVE') {
        existing.status = 'ACTIVE';
        changed = true;
    }
    if (existing.trialEndsAt) {
        existing.trialEndsAt = null;
        changed = true;
    }
    return changed;
}

module.exports = {
    ENTERPRISE_PLAN_KEY,
    isInternalOrganization,
    buildEnterpriseAppSubscription,
    normalizeExistingEntryForInternalOrg
};
