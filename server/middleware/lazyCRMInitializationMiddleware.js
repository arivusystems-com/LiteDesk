/**
 * ============================================================================
 * Lazy CRM Initialization Middleware (Multi-Pod Safe)
 * ============================================================================
 * 
 * Initializes CRM modules on first CRM access for an organization.
 * 
 * Behavior:
 * - Checks organization.crmInitialized as source of truth
 * - If false, attempts initialization atomically
 * - After successful initialization, atomically sets crmInitialized = true
 * - Prevents double initialization across pods
 * - Returns 503 Service Unavailable if initialization fails
 * 
 * Middleware Chain Position:
 * - Runs AFTER requireAppEntitlement (user is entitled to CRM)
 * - Runs BEFORE requireCRMApp (app context is CRM)
 * - Runs BEFORE CRM business logic
 * 
 * Idempotency (Multi-Pod Safe):
 * - Uses organization.crmInitialized as persistent source of truth
 * - Atomic findOneAndUpdate prevents double initialization across pods
 * - In-memory lock is optimization only, not relied on for correctness
 * - Multiple requests/pods wait for single initialization
 * 
 * ============================================================================
 */

const crmInitializer = require('../services/crmAppInitializer');
const Organization = require('../models/Organization');
const { APP_KEYS } = require('../constants/appKeys');

// In-memory lock to prevent concurrent initialization for the same organization
// OPTIMIZATION ONLY: Not relied on for correctness across pods
// Maps organizationId -> Promise<boolean> (initialization promise)
const initializationLocks = new Map();

/**
 * Lazy CRM Initialization Middleware (Multi-Pod Safe)
 * 
 * Checks organization.crmInitialized as source of truth.
 * Atomically initializes CRM if needed, preventing double initialization across pods.
 * Returns 503 if initialization fails.
 */
const lazyCRMInitialization = async (req, res, next) => {
    // Only run for CRM app context
    if (req.appKey !== 'CRM') {
        return next();
    }

    // Get organization ID (should be set by organizationIsolation middleware)
    // But we might run before that, so check req.user.organizationId
    const organizationId = req.user?.organizationId || req.organization?._id;
    
    if (!organizationId) {
        // Organization context not available yet, skip initialization
        // This should not happen in normal flow, but fail gracefully
        console.warn('[LazyCRMInit] Organization ID not available, skipping CRM initialization check');
        return next();
    }

    const orgIdString = organizationId.toString();

    try {
        // STEP 1: Check persistent source of truth (organization.crmInitialized)
        // Also check enabledApps to ensure CRM is enabled
        const organization = await Organization.findById(organizationId).select('crmInitialized enabledApps');
        
        if (!organization) {
            console.error(`[LazyCRMInit] Organization not found: ${orgIdString}`);
            return res.status(404).json({
                success: false,
                message: 'Organization not found',
                code: 'ORGANIZATION_NOT_FOUND'
            });
        }

        // Check if CRM app is enabled for the organization
        // Backward compatibility: If enabledApps is missing/undefined/null, treat as CRM enabled
        // This handles legacy organizations that don't have enabledApps field persisted
        // Empty array [] is treated as explicit (no apps enabled)
        const enabledApps = organization.enabledApps;
        
        let isCRMEnabled = false;
        
        // Backward compatibility: If enabledApps is missing/undefined/null, default to CRM enabled
        if (enabledApps === undefined || enabledApps === null) {
            isCRMEnabled = true; // Legacy orgs: default to CRM enabled
        } else {
            // Use appAccessUtils to check if CRM is enabled (handles both object and string formats)
            const { isAppEnabledForOrg } = require('../utils/appAccessUtils');
            isCRMEnabled = isAppEnabledForOrg(organization, APP_KEYS.CRM);
        }
        
        if (!isCRMEnabled) {
            // CRM app is not enabled for this organization
            return res.status(403).json({
                success: false,
                message: 'CRM application is not enabled for your organization',
                code: 'CRM_APP_NOT_ENABLED',
                enabledApps: effectiveEnabledApps
            });
        }

        // If already initialized, continue immediately
        if (organization.crmInitialized) {
            return next();
        }

        // Backward compatibility: Check if CRM modules already exist (existing orgs)
        // If modules exist but flag is false, set flag to true and continue
        const hasExistingCRM = await crmInitializer.isCRMInitialized(organizationId);
        if (hasExistingCRM) {
            // CRM already initialized (existing org), just set the flag
            await Organization.findByIdAndUpdate(
                organizationId,
                { $set: { crmInitialized: true } },
                { runValidators: false }
            );
            console.log(`[LazyCRMInit] Detected existing CRM modules for org: ${orgIdString}, set crmInitialized flag`);
            return next();
        }

        // STEP 2: Check in-memory lock (optimization only)
        let initPromise = initializationLocks.get(orgIdString);
        
        if (initPromise) {
            // Initialization already in progress (same pod)
            // Wait for it to complete
            console.log(`[LazyCRMInit] Waiting for ongoing CRM initialization for org: ${orgIdString}`);
            try {
                const success = await initPromise;
                if (success) {
                    return next();
                } else {
                    // Initialization failed
                    return res.status(503).json({
                        success: false,
                        message: 'CRM is initializing. Please retry.',
                        code: 'CRM_INITIALIZATION_IN_PROGRESS',
                        retryAfter: 5 // seconds
                    });
                }
            } catch (error) {
                // Initialization failed
                console.error(`[LazyCRMInit] Initialization failed for org: ${orgIdString}:`, error.message);
                return res.status(503).json({
                    success: false,
                    message: 'CRM is initializing. Please retry.',
                    code: 'CRM_INITIALIZATION_FAILED',
                    retryAfter: 5
                });
            }
        }

        // STEP 3: Attempt atomic initialization claim
        // Try to atomically claim initialization (only one pod succeeds)
        // Use findOneAndUpdate with condition to ensure only one pod can claim
        const claimed = await Organization.findOneAndUpdate(
            { 
                _id: organizationId,
                crmInitialized: false // Only claim if not already initialized
            },
            { 
                $set: { crmInitialized: false } // No-op update, but ensures atomic check
            },
            { 
                new: false, // Return original document (before update)
                runValidators: false
            }
        );

        // If update returned null, another pod already initialized or claimed it
        if (!claimed) {
            // Another pod may have initialized it, check again
            const updatedOrg = await Organization.findById(organizationId).select('crmInitialized');
            if (updatedOrg && updatedOrg.crmInitialized) {
                // Already initialized by another pod
                console.log(`[LazyCRMInit] CRM already initialized by another pod for org: ${orgIdString}`);
                return next();
            }
            // Another pod is initializing, wait a bit and retry
            console.log(`[LazyCRMInit] Another pod is initializing CRM for org: ${orgIdString}, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            // Check again
            const retryOrg = await Organization.findById(organizationId).select('crmInitialized');
            if (retryOrg && retryOrg.crmInitialized) {
                return next();
            }
            
            // Still not initialized, return 503
            return res.status(503).json({
                success: false,
                message: 'CRM is initializing. Please retry.',
                code: 'CRM_INITIALIZATION_IN_PROGRESS',
                retryAfter: 5
            });
        }

        // STEP 4: This pod claimed initialization - proceed
        console.log(`[LazyCRMInit] Starting CRM initialization for org: ${orgIdString} (claimed by this pod)`);
        
        // Create initialization promise and store in lock map (optimization)
        initPromise = (async () => {
            try {
                const result = await crmInitializer.initializeCRM(organizationId);
                
                if (result.success) {
                    // Atomically set crmInitialized = true after successful initialization
                    await Organization.findByIdAndUpdate(
                        organizationId,
                        { $set: { crmInitialized: true } },
                        { runValidators: false }
                    );
                    console.log(`[LazyCRMInit] ✅ CRM initialized successfully for org: ${orgIdString}`);
                    return true;
                } else {
                    // Initialization failed - log but don't set flag
                    console.error(`[LazyCRMInit] ❌ CRM initialization failed for org: ${orgIdString}:`, result.errors);
                    // Reset the flag so it can be retried
                    await Organization.findByIdAndUpdate(
                        organizationId,
                        { $set: { crmInitialized: false } },
                        { runValidators: false }
                    );
                    return false;
                }
            } catch (error) {
                console.error(`[LazyCRMInit] ❌ CRM initialization failed for org: ${orgIdString}:`, error.message);
                // Reset the flag so it can be retried
                await Organization.findByIdAndUpdate(
                    organizationId,
                    { $set: { crmInitialized: false } },
                    { runValidators: false }
                );
                throw error;
            } finally {
                // Remove in-memory lock after initialization completes
                setTimeout(() => {
                    initializationLocks.delete(orgIdString);
                }, 1000);
            }
        })();

        // Store promise in lock map (optimization)
        initializationLocks.set(orgIdString, initPromise);

        // Wait for initialization to complete
        try {
            const success = await initPromise;
            if (success) {
                return next();
            } else {
                return res.status(503).json({
                    success: false,
                    message: 'CRM is initializing. Please retry.',
                    code: 'CRM_INITIALIZATION_FAILED',
                    retryAfter: 5
                });
            }
        } catch (error) {
            // Initialization failed
            console.error(`[LazyCRMInit] Initialization error for org: ${orgIdString}:`, error.message);
            return res.status(503).json({
                success: false,
                message: 'CRM is initializing. Please retry.',
                code: 'CRM_INITIALIZATION_FAILED',
                retryAfter: 5
            });
        }

    } catch (error) {
        // Unexpected error during initialization check
        console.error(`[LazyCRMInit] Unexpected error during CRM initialization check for org: ${orgIdString}:`, error);
        return res.status(503).json({
            success: false,
            message: 'CRM is initializing. Please retry.',
            code: 'CRM_INITIALIZATION_ERROR',
            retryAfter: 5
        });
    }
};

module.exports = {
    lazyCRMInitialization
};

