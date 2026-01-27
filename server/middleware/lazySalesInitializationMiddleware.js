/**
 * ============================================================================
 * Lazy Sales Initialization Middleware (Multi-Pod Safe)
 * ============================================================================
 * 
 * Initializes Sales modules on first Sales access for an organization.
 * 
 * Behavior:
 * - Checks organization.crmInitialized as source of truth
 * - If false, attempts initialization atomically
 * - After successful initialization, atomically sets crmInitialized = true
 * - Prevents double initialization across pods
 * - Returns 503 Service Unavailable if initialization fails
 * 
 * Middleware Chain Position:
 * - Runs AFTER requireAppEntitlement (user is entitled to Sales)
 * - Runs BEFORE requireSalesApp (app context is Sales)
 * - Runs BEFORE Sales business logic
 * 
 * Idempotency (Multi-Pod Safe):
 * - Uses organization.crmInitialized as persistent source of truth
 * - Atomic findOneAndUpdate prevents double initialization across pods
 * - In-memory lock is optimization only, not relied on for correctness
 * - Multiple requests/pods wait for single initialization
 * 
 * ============================================================================
 */

const salesInitializer = require('../services/salesAppInitializer');
const Organization = require('../models/Organization');
const { APP_KEYS } = require('../constants/appKeys');
const { resolveAppAccess } = require('../services/accessResolutionService');

// In-memory lock to prevent concurrent initialization for the same organization
// OPTIMIZATION ONLY: Not relied on for correctness across pods
// Maps organizationId -> Promise<boolean> (initialization promise)
const initializationLocks = new Map();

/**
 * Lazy Sales Initialization Middleware (Multi-Pod Safe)
 * 
 * Checks organization.crmInitialized as source of truth.
 * Atomically initializes Sales if needed, preventing double initialization across pods.
 * Returns 503 if initialization fails.
 */
const lazySalesInitialization = async (req, res, next) => {
    // Only run for Sales app context
    if (req.appKey !== 'SALES') {
        return next();
    }

    // Get organization ID (should be set by organizationIsolation middleware)
    // But we might run before that, so check req.user.organizationId
    const organizationId = req.user?.organizationId || req.organization?._id;
    
    if (!organizationId) {
        // Organization context not available yet, skip initialization
        // This should not happen in normal flow, but fail gracefully
        console.warn('[LazySalesInit] Organization ID not available, skipping Sales initialization check');
        return next();
    }

    const orgIdString = organizationId.toString();

    try {
        // STEP 1: Check persistent source of truth (organization.crmInitialized)
        // Use access resolution service to verify Sales access
        const organization = await Organization.findById(organizationId);
        
        if (!organization) {
            console.error(`[LazySalesInit] Organization not found: ${orgIdString}`);
            return res.status(404).json({
                success: false,
                message: 'Organization not found',
                code: 'ORGANIZATION_NOT_FOUND'
            });
        }

        // Use unified access resolution service to check Sales access
        // Intent: VIEW (just checking if user can see/enter Sales)
        const accessResult = await resolveAppAccess({
            user: req.user,
            organization: organization,
            appKey: APP_KEYS.SALES,
            intent: 'VIEW'
        });
        
        if (!accessResult.allowed) {
            // Sales app is not accessible (not enabled or user has no access)
            let enabledAppKeys = [];
            if (organization.enabledApps && organization.enabledApps.length > 0) {
                if (typeof organization.enabledApps[0] === 'object') {
                    enabledAppKeys = organization.enabledApps
                        .filter(app => app.status === 'ACTIVE')
                        .map(app => app.appKey);
                } else {
                    enabledAppKeys = organization.enabledApps;
                }
            }
            
            return res.status(403).json({
                success: false,
                message: 'Sales application is not enabled for your organization',
                code: 'SALES_APP_NOT_ENABLED',
                enabledApps: enabledAppKeys,
                reason: accessResult.reason
            });
        }

        // If already initialized, continue immediately
        if (organization.crmInitialized) {
            return next();
        }

        // Backward compatibility: Check if Sales modules already exist (existing orgs)
        // If modules exist but flag is false, set flag to true and continue
        const hasExistingSales = await salesInitializer.isSalesInitialized(organizationId);
        if (hasExistingSales) {
            // Sales already initialized (existing org), just set the flag
            await Organization.findByIdAndUpdate(
                organizationId,
                { $set: { crmInitialized: true } },
                { runValidators: false }
            );
            console.log(`[LazySalesInit] Detected existing Sales modules for org: ${orgIdString}, set crmInitialized flag`);
            return next();
        }

        // STEP 2: Check in-memory lock (optimization only)
        let initPromise = initializationLocks.get(orgIdString);
        
        if (initPromise) {
            // Initialization already in progress (same pod)
            // Wait for it to complete
            console.log(`[LazySalesInit] Waiting for ongoing Sales initialization for org: ${orgIdString}`);
            try {
                const success = await initPromise;
                if (success) {
                    return next();
                } else {
                    // Initialization failed
                    console.error(`[LazySalesInit] ❌ Sales initialization failed for org: ${orgIdString} (waited for ongoing init)`);
                    return res.status(503).json({
                        success: false,
                        message: 'Sales initialization failed. Please check server logs for details.',
                        code: 'SALES_INITIALIZATION_FAILED',
                        retryAfter: 5 // seconds
                    });
                }
            } catch (error) {
                // Initialization failed
                console.error(`[LazySalesInit] ❌ Sales initialization error for org: ${orgIdString}:`, error.message);
                console.error(`[LazySalesInit] Full error stack:`, error.stack);
                return res.status(503).json({
                    success: false,
                    message: 'Sales initialization failed. Please check server logs for details.',
                    code: 'SALES_INITIALIZATION_FAILED',
                    retryAfter: 5,
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
                console.log(`[LazySalesInit] Sales already initialized by another pod for org: ${orgIdString}`);
                return next();
            }
            // Another pod is initializing, wait a bit and retry
            console.log(`[LazySalesInit] Another pod is initializing Sales for org: ${orgIdString}, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            // Check again
            const retryOrg = await Organization.findById(organizationId).select('crmInitialized');
            if (retryOrg && retryOrg.crmInitialized) {
                return next();
            }
            
            // Still not initialized, return 503
            console.warn(`[LazySalesInit] ⚠️  Sales initialization still in progress for org: ${orgIdString} after waiting`);
            return res.status(503).json({
                success: false,
                message: 'Sales initialization is in progress. Please retry in a few seconds.',
                code: 'SALES_INITIALIZATION_IN_PROGRESS',
                retryAfter: 5
            });
        }

        // STEP 4: This pod claimed initialization - proceed
        console.log(`[LazySalesInit] Starting Sales initialization for org: ${orgIdString} (claimed by this pod)`);
        console.log(`[LazySalesInit] Organization details:`, {
            id: organizationId,
            idString: orgIdString,
            idType: typeof organizationId,
            name: organization?.name,
            enabledApps: organization?.enabledApps
        });
        
        // Create initialization promise and store in lock map (optimization)
        initPromise = (async () => {
            try {
                console.log(`[LazySalesInit] Calling salesInitializer.initializeSales with organizationId:`, organizationId);
                const result = await salesInitializer.initializeSales(organizationId);
                
                // Verify that BOTH modules were actually created before setting flag
                const isActuallyInitialized = await salesInitializer.isSalesInitialized(organizationId);
                
                if (result.success && isActuallyInitialized) {
                    // Atomically set crmInitialized = true after successful initialization
                    // Only set if BOTH modules exist
                    await Organization.findByIdAndUpdate(
                        organizationId,
                        { $set: { crmInitialized: true } },
                        { runValidators: false }
                    );
                    console.log(`[LazySalesInit] ✅ Sales initialized successfully for org: ${orgIdString}`);
                    console.log(`[LazySalesInit] Verified both People and Deals modules exist`);
                    return true;
                } else {
                    // Initialization failed or incomplete - log but don't set flag
                    console.error(`[LazySalesInit] ❌ Sales initialization failed or incomplete for org: ${orgIdString}`);
                    console.error(`[LazySalesInit] result.success: ${result.success}`);
                    console.error(`[LazySalesInit] isActuallyInitialized: ${isActuallyInitialized}`);
                    console.error(`[LazySalesInit] Initialization errors:`, JSON.stringify(result.errors, null, 2));
                    console.error(`[LazySalesInit] Initialized modules:`, result.initialized);
                    
                    // Reset the flag so it can be retried
                    await Organization.findByIdAndUpdate(
                        organizationId,
                        { $set: { crmInitialized: false } },
                        { runValidators: false }
                    );
                    return false;
                }
            } catch (error) {
                console.error(`[LazySalesInit] ❌ Sales initialization exception for org: ${orgIdString}:`, error.message);
                console.error(`[LazySalesInit] Full error stack:`, error.stack);
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
                console.error(`[LazySalesInit] ❌ Sales initialization failed for org: ${orgIdString} (result.success = false)`);
                return res.status(503).json({
                    success: false,
                    message: 'Sales initialization failed. Please check server logs for details.',
                    code: 'SALES_INITIALIZATION_FAILED',
                    retryAfter: 5
                });
            }
        } catch (error) {
            // Initialization failed
            console.error(`[LazySalesInit] ❌ Sales initialization exception for org: ${orgIdString}:`, error.message);
            console.error(`[LazySalesInit] Full error stack:`, error.stack);
            return res.status(503).json({
                success: false,
                message: 'Sales initialization failed. Please check server logs for details.',
                code: 'SALES_INITIALIZATION_FAILED',
                retryAfter: 5,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

    } catch (error) {
        // Unexpected error during initialization check
        console.error(`[LazySalesInit] ❌ Unexpected error during Sales initialization check for org: ${orgIdString}:`, error);
        console.error(`[LazySalesInit] Error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return res.status(503).json({
            success: false,
            message: 'Sales initialization error occurred. Please check server logs for details.',
            code: 'SALES_INITIALIZATION_ERROR',
            retryAfter: 5,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    lazySalesInitialization
};

