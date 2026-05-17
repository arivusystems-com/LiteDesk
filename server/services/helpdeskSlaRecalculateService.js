'use strict';

const Case = require('../models/Case');
const { applySlaTargetsToCycle } = require('./helpdeskSlaService');

function buildSlaContextFromCase(row) {
  return {
    caseType: row.caseType,
    priority: row.priority,
    channel: row.channel
  };
}

/**
 * Recompute SLA targets for open cases after schedule changes.
 */
async function recalculateOpenCaseSlas(organizationId, { limit = 500 } = {}) {
  const rows = await Case.find({
    organizationId,
    deletedAt: null,
    status: { $nin: ['Resolved', 'Closed'] },
    'currentSlaCycle.status': { $in: ['running', 'paused'] }
  })
    .select('_id caseType priority channel currentSlaCycle')
    .limit(Math.max(1, Math.min(Number(limit) || 500, 2000)))
    .lean();

  let updated = 0;
  const errors = [];

  for (const row of rows) {
    try {
      const cycle = row.currentSlaCycle;
      if (!cycle) continue;

      const nextCycle = await applySlaTargetsToCycle({
        organizationId,
        cycle,
        context: buildSlaContextFromCase(row),
        startedAt: cycle.startedAt
      });

      await Case.updateOne(
        { _id: row._id, organizationId },
        { $set: { currentSlaCycle: nextCycle } }
      );
      updated += 1;
    } catch (err) {
      errors.push({ caseId: String(row._id), message: err.message });
    }
  }

  return {
    scanned: rows.length,
    updated,
    errors
  };
}

module.exports = {
  recalculateOpenCaseSlas
};
