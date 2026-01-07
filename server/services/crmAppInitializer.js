/**
 * ============================================================================
 * CRM Application Initializer
 * ============================================================================
 * 
 * Initializes CRM-specific modules and configurations for an organization.
 * This should be called when CRM app is enabled for an organization, not during registration.
 * 
 * Responsibilities:
 * - Initialize People module definition with dependencies
 * - Initialize Deals module definition with standardized fields
 * - Any other CRM-specific initialization
 * 
 * Usage:
 *   const crmInitializer = require('./services/crmAppInitializer');
 *   await crmInitializer.initializeCRM(organizationId);
 * 
 * ============================================================================
 */

const updatePeopleModuleFields = require('../scripts/updatePeopleModuleFields');
const updateDealsModuleFields = require('../scripts/updateDealsModuleFields');

/**
 * Initialize CRM application for an organization
 * 
 * @param {ObjectId|String} organizationId - Organization ID to initialize CRM for
 * @returns {Promise<Object>} - Initialization result
 */
async function initializeCRM(organizationId) {
    const results = {
        organizationId,
        success: true,
        initialized: [],
        errors: []
    };

    try {
        console.log(`[CRMInitializer] Initializing CRM for organization: ${organizationId}`);

        // Initialize People Module Definition with dependencies
        try {
            await updatePeopleModuleFields(organizationId);
            results.initialized.push('People module');
            console.log(`[CRMInitializer] ✅ People module initialized for organization: ${organizationId}`);
        } catch (moduleError) {
            results.errors.push({
                module: 'People',
                error: moduleError.message
            });
            console.error(`[CRMInitializer] ❌ Failed to initialize People module:`, moduleError.message);
            // Continue with other initializations even if one fails
        }

        // Initialize Deals Module Definition with standardized fields
        try {
            await updateDealsModuleFields(organizationId);
            results.initialized.push('Deals module');
            console.log(`[CRMInitializer] ✅ Deals module initialized for organization: ${organizationId}`);
        } catch (moduleError) {
            results.errors.push({
                module: 'Deals',
                error: moduleError.message
            });
            console.error(`[CRMInitializer] ❌ Failed to initialize Deals module:`, moduleError.message);
            // Continue with other initializations even if one fails
        }

        if (results.errors.length > 0) {
            results.success = false;
            console.warn(`[CRMInitializer] ⚠️  CRM initialization completed with errors for organization: ${organizationId}`);
        } else {
            console.log(`[CRMInitializer] ✅ CRM initialization completed successfully for organization: ${organizationId}`);
        }

        return results;
    } catch (error) {
        console.error(`[CRMInitializer] ❌ Fatal error during CRM initialization:`, error);
        results.success = false;
        results.errors.push({
            module: 'General',
            error: error.message
        });
        throw error;
    }
}

/**
 * Check if CRM is already initialized for an organization
 * 
 * @param {ObjectId|String} organizationId - Organization ID to check
 * @returns {Promise<Boolean>} - True if CRM modules exist
 */
async function isCRMInitialized(organizationId) {
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
        console.error(`[CRMInitializer] Error checking CRM initialization status:`, error);
        return false;
    }
}

module.exports = {
    initializeCRM,
    isCRMInitialized
};

