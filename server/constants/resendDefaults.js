'use strict';

/** Resend — default CRM / platform agent email when no user mailbox is connected. */
const RESEND_PROVIDER = 'resend';

const RESEND_SMTP_DEFAULTS = Object.freeze({
  provider: RESEND_PROVIDER,
  smtpHost: 'smtp.resend.com',
  smtpPort: 587,
  smtpUser: 'resend',
  smtpSecure: false
});

function normalizeProvider(value) {
  return String(value || '').trim().toLowerCase();
}

function isResendProvider(runtimeConfig = {}) {
  const provider = normalizeProvider(runtimeConfig.provider);
  if (provider === RESEND_PROVIDER) return true;
  const host = String(runtimeConfig.smtpHost || '').toLowerCase();
  const user = String(runtimeConfig.smtpUser || '').toLowerCase();
  return host.includes('resend.com') || user === 'resend';
}

/**
 * Merge Resend SMTP defaults (non-destructive).
 * @param {object} config
 */
function applyResendDefaults(config = {}) {
  const provider = normalizeProvider(config.provider) || RESEND_PROVIDER;
  if (provider !== RESEND_PROVIDER && !isResendProvider({ ...config, provider })) {
    return { ...config };
  }

  const smtpPass =
    config.smtpPass ||
    process.env.SMTP_PASS ||
    process.env.RESEND_API_KEY ||
    '';

  return {
    ...config,
    provider: RESEND_PROVIDER,
    smtpHost: config.smtpHost || RESEND_SMTP_DEFAULTS.smtpHost,
    smtpPort: Number(config.smtpPort) || RESEND_SMTP_DEFAULTS.smtpPort,
    smtpUser: config.smtpUser || RESEND_SMTP_DEFAULTS.smtpUser,
    smtpSecure: config.smtpSecure === true,
    smtpPass
  };
}

module.exports = {
  RESEND_PROVIDER,
  RESEND_SMTP_DEFAULTS,
  isResendProvider,
  applyResendDefaults
};
