const EmailSuppression = require('../models/EmailSuppression');

function normalizeEmailList(addresses = []) {
  if (!Array.isArray(addresses)) return [];
  return Array.from(
    new Set(
      addresses
        .map((a) => String(a || '').trim().toLowerCase())
        .filter((a) => a.includes('@'))
    )
  );
}

async function suppressAddress({
  organizationId,
  email,
  reason,
  source = 'webhook',
  metadata = {},
  eventAt = new Date()
}) {
  if (!organizationId || !email || !reason) return null;
  const normalized = String(email).trim().toLowerCase();
  if (!normalized.includes('@')) return null;

  return EmailSuppression.findOneAndUpdate(
    { organizationId, email: normalized },
    {
      $set: {
        reason,
        active: true,
        source,
        metadata,
        lastEventAt: eventAt
      },
      $setOnInsert: {
        organizationId,
        email: normalized
      }
    },
    { upsert: true, new: true, runValidators: true }
  );
}

async function findSuppressedAddresses({ organizationId, addresses = [] }) {
  const normalized = normalizeEmailList(addresses);
  if (!organizationId || normalized.length === 0) return [];
  return EmailSuppression.find({
    organizationId,
    email: { $in: normalized },
    active: true
  })
    .select('email reason lastEventAt')
    .lean();
}

async function listSuppressedAddresses({ organizationId, limit = 100 }) {
  if (!organizationId) return [];
  const normalizedLimit = Math.min(500, Math.max(1, Number(limit) || 100));
  return EmailSuppression.find({
    organizationId,
    active: true
  })
    .sort({ lastEventAt: -1, updatedAt: -1 })
    .limit(normalizedLimit)
    .select('email reason source lastEventAt createdAt updatedAt')
    .lean();
}

async function unsuppressAddress({ organizationId, email }) {
  if (!organizationId || !email) return { updated: false };
  const normalized = String(email).trim().toLowerCase();
  if (!normalized.includes('@')) return { updated: false };
  const result = await EmailSuppression.findOneAndUpdate(
    { organizationId, email: normalized, active: true },
    {
      $set: {
        active: false
      }
    },
    { new: true }
  ).lean();
  return { updated: !!result, record: result || null };
}

async function getSuppressionStats({ organizationId }) {
  if (!organizationId) {
    return {
      activeTotal: 0,
      byReason: { bounced: 0, complained: 0 }
    };
  }
  const rows = await EmailSuppression.aggregate([
    {
      $match: {
        organizationId,
        active: true
      }
    },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 }
      }
    }
  ]);
  const byReason = { bounced: 0, complained: 0 };
  let activeTotal = 0;
  for (const row of rows) {
    const key = String(row?._id || '').toLowerCase();
    const count = Number(row?.count) || 0;
    activeTotal += count;
    if (key in byReason) byReason[key] = count;
  }
  return { activeTotal, byReason };
}

module.exports = {
  suppressAddress,
  findSuppressedAddresses,
  listSuppressedAddresses,
  unsuppressAddress,
  getSuppressionStats,
  normalizeEmailList
};
