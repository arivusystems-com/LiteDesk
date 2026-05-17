'use strict';

/**
 * Run async work in the tenant DB context for an organization (when dedicated DB exists).
 */

const Organization = require('../models/Organization');
const dbConnectionManager = require('./databaseConnectionManager');
const { runWithTenantContext } = require('./tenantContext');

/**
 * @param {string|import('mongoose').Types.ObjectId} organizationId
 * @param {() => Promise<*>} fn
 */
async function runWithOrganizationTenantContext(organizationId, fn) {
  if (!organizationId) {
    throw new Error('organizationId is required for tenant context');
  }

  const organization = await Organization.findById(organizationId).select('database').lean();
  const dbName = organization?.database?.name;
  const initialized = organization?.database?.initialized;

  if (!dbName || !initialized) {
    return fn();
  }

  const connection = await dbConnectionManager.getOrganizationConnection(dbName);
  if (connection.readyState !== 1 && typeof connection.asPromise === 'function') {
    await connection.asPromise();
  }

  return runWithTenantContext(
    {
      organizationId,
      connection,
      databaseName: dbName
    },
    fn
  );
}

module.exports = {
  runWithOrganizationTenantContext
};
