/**
 * ============================================================================
 * Tenant Context Middleware
 * ============================================================================
 *
 * Opens the active tenant's mongoose Connection (when the org has a dedicated
 * database) and runs the rest of the request inside an AsyncLocalStorage
 * context, so tenant-scoped models (Deal, Task, Event, Person, ...) route
 * their queries to the tenant DB instead of master.
 *
 * Mount AFTER `protect` and `organizationIsolation` so `req.user` and
 * `req.organization` are already populated. For organizations without a
 * dedicated DB (e.g. the master org), the middleware is a no-op and tenant
 * models continue to fall back to the master mongoose connection.
 *
 * Tenant context is also exposed on the request as:
 *
 *   req.tenantConnection   - mongoose Connection (or null)
 *   req.tenantDatabaseName - 'arivu_<slug>' (or null)
 * ============================================================================
 */

const dbConnectionManager = require('../utils/databaseConnectionManager');
const { enterTenantContext } = require('../utils/tenantContext');

const tenantContext = async (req, res, next) => {
    try {
        const organization = req.organization || null;
        const dedicatedDbName = organization?.database?.name;
        const dedicatedInitialized = organization?.database?.initialized;

        if (!organization || !dedicatedDbName || !dedicatedInitialized) {
            // No tenant DB — tenant models use master (arivu_master).
            return next();
        }

        let connection;
        try {
            connection = await dbConnectionManager.getOrganizationConnection(dedicatedDbName);
            if (connection.readyState !== 1 && typeof connection.asPromise === 'function') {
                await connection.asPromise();
            }
        } catch (err) {
            console.error('[tenantContext] Failed to open tenant DB connection:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to open tenant database connection',
                code: 'TENANT_DB_UNAVAILABLE'
            });
        }

        req.tenantConnection = connection;
        req.tenantDatabaseName = dedicatedDbName;

        return enterTenantContext(
            {
                organizationId: organization._id,
                connection,
                databaseName: dedicatedDbName
            },
            next
        );
    } catch (err) {
        console.error('[tenantContext] Unexpected error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error establishing tenant context',
            code: 'TENANT_CONTEXT_ERROR'
        });
    }
};

module.exports = { tenantContext };
