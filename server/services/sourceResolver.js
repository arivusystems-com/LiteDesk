/**
 * Centralized assignment for the system-managed `source` field.
 * Client-supplied `source` must never be trusted — strip and resolve server-side.
 */

const { DEFAULT_RECORD_SOURCE, RECORD_SOURCE_SET } = require('../constants/recordSource');

/**
 * How the record was created (server-side only).
 * @typedef {'ui'|'api'|'import'|'web_form'|'automation'|'ai'|'email'|'phone'|'chat'|'whatsapp'|'facebook'|'linkedin'|'referral'|'campaign'|'integration'} CreationChannel
 */

/** @type {Record<string, string>} */
const CHANNEL_TO_SOURCE = {
  ui: 'Direct',
  manual: 'Direct',
  api: 'API',
  import: 'Import',
  web_form: 'Web Form',
  automation: 'Automation',
  ai: 'AI',
  email: 'Email',
  phone: 'Phone',
  chat: 'Chat',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  referral: 'Referral',
  campaign: 'Campaign',
  integration: 'Integration'
};

/**
 * Resolve canonical source string for a creation channel.
 * @param {string} [channel]
 * @returns {string}
 */
function resolveSource(channel) {
  const key = channel == null ? '' : String(channel).trim().toLowerCase();
  const mapped = key ? CHANNEL_TO_SOURCE[key] : null;
  const value = mapped || DEFAULT_RECORD_SOURCE;
  return RECORD_SOURCE_SET.has(value) ? value : DEFAULT_RECORD_SOURCE;
}

/**
 * Remove client-provided source from a plain object (mutation).
 * @param {Record<string, unknown>|null|undefined} body
 */
function stripClientSource(body) {
  if (!body || typeof body !== 'object') return;
  delete body.source;
}

/**
 * Assign resolved source on a create payload (mutation).
 * @param {Record<string, unknown>} payload
 * @param {string} [channel]
 */
function assignResolvedSource(payload, channel) {
  if (!payload || typeof payload !== 'object') return;
  payload.source = resolveSource(channel);
}

module.exports = {
  CHANNEL_TO_SOURCE,
  resolveSource,
  stripClientSource,
  assignResolvedSource
};
