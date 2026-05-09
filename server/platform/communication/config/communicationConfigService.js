const CommunicationConfig = require('../../../models/CommunicationConfig');
const { SUPPORTED_MODULES } = require('../domain/sendEmailContract');

const DEFAULT_CONFIG = Object.freeze({
  outboundEmail: {
    enabled: true,
    requireIdempotencyKey: false,
    maxRecipientsPerMessage: 50,
    allowedModuleKeys: Array.from(SUPPORTED_MODULES)
  }
});

function normalizeAllowedModules(modules) {
  if (!Array.isArray(modules) || modules.length === 0) {
    return Array.from(SUPPORTED_MODULES);
  }
  const normalized = modules
    .map((m) => String(m || '').trim().toLowerCase())
    .filter((m) => SUPPORTED_MODULES.has(m));
  return normalized.length > 0 ? Array.from(new Set(normalized)) : Array.from(SUPPORTED_MODULES);
}

async function getCommunicationConfigForOrganization(organizationId) {
  if (!organizationId) return DEFAULT_CONFIG;
  const configDoc = await CommunicationConfig.findOne({ organizationId }).lean();
  if (!configDoc) return DEFAULT_CONFIG;

  const maxRecipientsRaw = Number(configDoc?.outboundEmail?.maxRecipientsPerMessage);
  const maxRecipientsPerMessage = Number.isFinite(maxRecipientsRaw) && maxRecipientsRaw > 0
    ? Math.min(1000, Math.max(1, maxRecipientsRaw))
    : DEFAULT_CONFIG.outboundEmail.maxRecipientsPerMessage;

  return {
    outboundEmail: {
      enabled: configDoc?.outboundEmail?.enabled !== false,
      requireIdempotencyKey: configDoc?.outboundEmail?.requireIdempotencyKey === true,
      maxRecipientsPerMessage,
      allowedModuleKeys: normalizeAllowedModules(configDoc?.outboundEmail?.allowedModuleKeys)
    }
  };
}

async function upsertCommunicationConfigForOrganization(organizationId, policyInput = {}) {
  if (!organizationId) return DEFAULT_CONFIG;
  const outboundInput = policyInput.outboundEmail || {};
  const maxRecipientsRaw = Number(outboundInput.maxRecipientsPerMessage);
  const maxRecipientsPerMessage = Number.isFinite(maxRecipientsRaw) && maxRecipientsRaw > 0
    ? Math.min(1000, Math.max(1, Math.floor(maxRecipientsRaw)))
    : DEFAULT_CONFIG.outboundEmail.maxRecipientsPerMessage;

  const update = {
    outboundEmail: {
      enabled: outboundInput.enabled !== false,
      requireIdempotencyKey: outboundInput.requireIdempotencyKey === true,
      maxRecipientsPerMessage,
      allowedModuleKeys: normalizeAllowedModules(outboundInput.allowedModuleKeys)
    }
  };

  await CommunicationConfig.findOneAndUpdate(
    { organizationId },
    { $set: update, $setOnInsert: { organizationId } },
    { upsert: true, new: true, runValidators: true }
  );

  return getCommunicationConfigForOrganization(organizationId);
}

module.exports = {
  getCommunicationConfigForOrganization,
  upsertCommunicationConfigForOrganization,
  DEFAULT_CONFIG
};
