/**
 * ============================================================================
 * Tenant Request Context (AsyncLocalStorage)
 * ============================================================================
 *
 * Carries the active tenant's mongoose Connection through the request /
 * job lifecycle without having to thread it explicitly through every
 * controller. Used by tenantModelProxy.js to redirect tenant-scoped model
 * operations (Deal.find, Task.create, Event.findOne, ...) onto the tenant
 * database instead of the master mongoose connection.
 *
 * Usage:
 *
 *   const { runWithTenantContext, getTenantConnection } = require('./tenantContext');
 *
 *   await runWithTenantContext(orgId, orgConnection, async () => {
 *       // Inside this scope, tenant-scoped models route to orgConnection
 *       const deals = await Deal.find({ ... });
 *   });
 *
 * Outside any context, tenant-scoped models fall back to the master mongoose
 * connection, preserving all existing behavior for cron jobs, scripts, and
 * public/non-tenant routes.
 * ============================================================================
 */

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

/**
 * Run `fn` with a tenant context active for the entire async lifetime of the
 * function. Nesting is allowed; the inner-most context wins.
 *
 * @param {object} ctx
 * @param {string|object} ctx.organizationId  - Tenant Organization _id (master).
 * @param {import('mongoose').Connection} ctx.connection - Tenant DB connection.
 * @param {string} [ctx.databaseName]
 * @param {Function} fn - Async or sync function to run within the context.
 */
function runWithTenantContext(ctx, fn) {
    const safeCtx = {
        organizationId: ctx?.organizationId || null,
        connection: ctx?.connection || null,
        databaseName: ctx?.databaseName || ctx?.connection?.db?.databaseName || null
    };
    return storage.run(safeCtx, fn);
}

/**
 * Express helper that wraps the rest of the middleware chain in a tenant
 * context. Calls next() inside `storage.run(...)` so all downstream async
 * operations inherit the context.
 */
function enterTenantContext(ctx, next) {
    const safeCtx = {
        organizationId: ctx?.organizationId || null,
        connection: ctx?.connection || null,
        databaseName: ctx?.databaseName || ctx?.connection?.db?.databaseName || null
    };
    return storage.run(safeCtx, next);
}

function getTenantContext() {
    return storage.getStore() || null;
}

function getTenantConnection() {
    const ctx = storage.getStore();
    return ctx?.connection || null;
}

function getTenantOrganizationId() {
    const ctx = storage.getStore();
    return ctx?.organizationId || null;
}

function getTenantDatabaseName() {
    const ctx = storage.getStore();
    return ctx?.databaseName || null;
}

/**
 * Run `fn` with no tenant context. Useful for code that legitimately needs to
 * access the master DB even from inside a tenant request (admin/cross-tenant
 * lookups, e.g. resolving Organization for the current user).
 */
function runOnMaster(fn) {
    return storage.run({ organizationId: null, connection: null, databaseName: null }, fn);
}

module.exports = {
    runWithTenantContext,
    enterTenantContext,
    runOnMaster,
    getTenantContext,
    getTenantConnection,
    getTenantOrganizationId,
    getTenantDatabaseName
};
