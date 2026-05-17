'use strict';

/**
 * Resolve a user from a JWT access token (master DB, then tenant DB).
 * Shared by auth middleware and inbox SSE (query-token auth).
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

function getOrgUserModel(orgDbConnection) {
  if (orgDbConnection.models.User) {
    return orgDbConnection.models.User;
  }
  const UserModel = require('../models/User');
  const originalSchema = UserModel.schema;
  const UserSchema = new mongoose.Schema(originalSchema.obj, originalSchema.options);

  if (originalSchema.methods) {
    Object.keys(originalSchema.methods).forEach((methodName) => {
      UserSchema.methods[methodName] = originalSchema.methods[methodName];
    });
  }
  if (originalSchema.statics) {
    Object.keys(originalSchema.statics).forEach((staticName) => {
      UserSchema.statics[staticName] = originalSchema.statics[staticName];
    });
  }
  return orgDbConnection.model('User', UserSchema);
}

/**
 * @param {string} token - JWT access token
 * @param {{ lean?: boolean }} [options]
 * @returns {Promise<object|null>}
 */
async function resolveUserFromToken(token, options = {}) {
  const { lean = false } = options;
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  const select = '-password';
  let user = lean
    ? await User.findById(decoded.id).select(select).lean()
    : await User.findById(decoded.id).select(select);

  if (!user && decoded.organizationId) {
    try {
      const Organization = require('../models/Organization');
      const dbConnectionManager = require('../utils/databaseConnectionManager');
      const organization = await Organization.findById(decoded.organizationId).select('database').lean();
      if (organization?.database?.name && organization.database.initialized) {
        const orgDbConnection = await dbConnectionManager.getOrganizationConnection(
          organization.database.name
        );
        const OrgUser = getOrgUserModel(orgDbConnection);
        const tenantUser = lean
          ? await OrgUser.findById(decoded.id).select(select).lean()
          : await OrgUser.findById(decoded.id).select(select);
        if (tenantUser) {
          tenantUser.organizationId = decoded.organizationId;
          user = tenantUser;
        }
      }
    } catch (err) {
      console.error('[resolveUserFromToken] Tenant user lookup failed:', err.message);
    }
  }

  if (!user) return null;

  const orgId = user.organizationId || decoded.organizationId;
  if (!orgId) return null;
  if (!user.organizationId) {
    user.organizationId = orgId;
  }

  if (user.status && user.status !== 'active') {
    return null;
  }

  return user;
}

module.exports = {
  resolveUserFromToken,
  getOrgUserModel
};
