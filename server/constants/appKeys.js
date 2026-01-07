/**
 * ============================================================================
 * App Context: Application Keys
 * ============================================================================
 * 
 * Defines the available application contexts in the LiteDesk platform.
 * Each appKey represents a distinct application that can run on the platform.
 * 
 * Usage:
 *   const { APP_KEYS } = require('./constants/appKeys');
 *   if (req.appKey === APP_KEYS.CRM) { ... }
 * 
 * ============================================================================
 */

/**
 * Application Keys Enum
 * 
 * - CRM: Customer Relationship Management application
 * - PORTAL: Customer/Partner portal application
 * - AUDIT: Audit management application
 * - LMS: Learning Management System application
 */
const APP_KEYS = {
    CRM: 'CRM',
    PORTAL: 'PORTAL',
    AUDIT: 'AUDIT',
    LMS: 'LMS'
};

/**
 * Default application key (used when appKey cannot be resolved from URL)
 */
const DEFAULT_APP_KEY = APP_KEYS.CRM;

/**
 * Valid app keys array (for validation)
 */
const VALID_APP_KEYS = Object.values(APP_KEYS);

/**
 * Check if an appKey is valid
 * @param {string} appKey - The appKey to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidAppKey(appKey) {
    return VALID_APP_KEYS.includes(appKey);
}

module.exports = {
    APP_KEYS,
    DEFAULT_APP_KEY,
    VALID_APP_KEYS,
    isValidAppKey
};

