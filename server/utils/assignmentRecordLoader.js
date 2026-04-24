const mongoose = require('mongoose');
const Case = require('../models/Case');
const People = require('../models/People');
const Deal = require('../models/Deal');
const Task = require('../models/Task');
const Organization = require('../models/Organization');
const User = require('../models/User');

/**
 * Load a record for an assignment schedule job (tenant-scoped).
 * @param {import('mongoose').Document} job
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function loadRecordForAssignmentJob(job) {
  const organizationId = job.organizationId;
  const recordId = job.recordId;
  const appKey = String(job.appKey || '').toUpperCase();
  const moduleKey = String(job.moduleKey || '').toLowerCase();

  if (!mongoose.Types.ObjectId.isValid(recordId)) return null;

  if (appKey === 'HELPDESK' && moduleKey === 'cases') {
    return Case.findOne({
      _id: recordId,
      organizationId,
      deletedAt: null
    });
  }

  if (appKey === 'SALES') {
    if (moduleKey === 'people') {
      return People.findOne({ _id: recordId, organizationId, deletedAt: null });
    }
    if (moduleKey === 'deals') {
      return Deal.findOne({ _id: recordId, organizationId, deletedAt: null });
    }
    if (moduleKey === 'tasks') {
      return Task.findOne({ _id: recordId, organizationId, deletedAt: null });
    }
    if (moduleKey === 'organizations') {
      const org = await Organization.findOne({
        _id: recordId,
        isTenant: false,
        deletedAt: null
      });
      if (!org) return null;
      const allowed = await User.exists({
        _id: org.createdBy,
        organizationId
      });
      return allowed ? org : null;
    }
  }

  return null;
}

module.exports = {
  loadRecordForAssignmentJob
};
