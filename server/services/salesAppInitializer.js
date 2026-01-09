/**
 * ============================================================================
 * Sales Application Initializer
 * ============================================================================
 * 
 * Initializes Sales-specific modules and configurations for an organization.
 * This should be called when Sales app is enabled for an organization, not during registration.
 * 
 * Responsibilities:
 * - Initialize People module definition with dependencies
 * - Initialize Pipeline Entity module definition with standardized fields
 * - Any other Sales-specific initialization
 * 
 * Usage:
 *   const salesInitializer = require('./services/salesAppInitializer');
 *   await salesInitializer.initializeSales(organizationId);
 * 
 * ============================================================================
 */

const updatePeopleModuleFields = require('../scripts/updatePeopleModuleFields');
const updateDealsModuleFields = require('../scripts/updateDealsModuleFields');

/**
 * Initialize Sales application for an organization
 * 
 * @param {ObjectId|String} organizationId - Organization ID to initialize Sales for
 * @returns {Promise<Object>} - Initialization result
 */
async function initializeSales(organizationId) {
    const results = {
        organizationId,
        success: true,
        initialized: [],
        errors: []
    };

    try {
        console.log(`[SalesInitializer] Initializing Sales for organization: ${organizationId}`);

        // Initialize People Module Definition with dependencies
        try {
            await updatePeopleModuleFields(organizationId);
            results.initialized.push('People module');
            console.log(`[SalesInitializer] ✅ People module initialized for organization: ${organizationId}`);
        } catch (moduleError) {
            results.errors.push({
                module: 'People',
                error: moduleError.message
            });
            console.error(`[SalesInitializer] ❌ Failed to initialize People module:`, moduleError.message);
            // Continue with other initializations even if one fails
        }

        // Initialize Pipeline Entity Module Definition with standardized fields
        try {
            await updateDealsModuleFields(organizationId);
            results.initialized.push('Pipeline Entity module');
            console.log(`[SalesInitializer] ✅ Pipeline Entity module initialized for organization: ${organizationId}`);
        } catch (moduleError) {
            results.errors.push({
                module: 'Pipeline Entity',
                error: moduleError.message
            });
            console.error(`[SalesInitializer] ❌ Failed to initialize Pipeline Entity module:`, moduleError.message);
            // Continue with other initializations even if one fails
        }

        if (results.errors.length > 0) {
            results.success = false;
            console.warn(`[SalesInitializer] ⚠️  Sales initialization completed with errors for organization: ${organizationId}`);
        } else {
            console.log(`[SalesInitializer] ✅ Sales initialization completed successfully for organization: ${organizationId}`);
        }

        return results;
    } catch (error) {
        console.error(`[SalesInitializer] ❌ Fatal error during Sales initialization:`, error);
        results.success = false;
        results.errors.push({
            module: 'General',
            error: error.message
        });
        throw error;
    }
}

/**
 * Check if Sales is already initialized for an organization
 * 
 * @param {ObjectId|String} organizationId - Organization ID to check
 * @returns {Promise<Boolean>} - True if Sales modules exist
 */
async function isSalesInitialized(organizationId) {
    try {
        const ModuleDefinition = require('../models/ModuleDefinition');
        
        const peopleModule = await ModuleDefinition.findOne({
            organizationId,
            key: 'people'
        });

        const dealsModule = await ModuleDefinition.findOne({
            organizationId,
            key: 'deals'
        });

        return !!(peopleModule && dealsModule);
    } catch (error) {
        console.error(`[SalesInitializer] Error checking Sales initialization status:`, error);
        return false;
    }
}

module.exports = {
    initializeSales,
    isSalesInitialized
};

