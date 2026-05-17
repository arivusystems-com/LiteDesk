'use strict';

/**
 * Run a function inside the tenant mongoose context for an organization
 * (OAuth callbacks, background workers, schedulers).
 */

const Organization = require('../models/Organization');
const dbConnectionManager = require('./databaseConnectionManager');
const { runWithTenantContext } = require('./tenantContext');

async function runWithOrganizationTenantContext(organizationId, fn) {
  const org = await Organization.findById(organizationId).select('database').lean();
  if (!org?.database?.name || !org.database.initialized) {
    return fn();
  }
  const conn = await dbConnectionManager.getOrganizationConnection(org.database.name);
  if (conn.readyState !== 1 && typeof conn.asPromise === 'function') {
    await conn.asPromise();
  }
  return runWithTenantContext(
    { organizationId: org._id, connection: conn, databaseName: org.database.name },
    fn
  );
}

module.exports = {
  runWithOrganizationTenantContext
};
