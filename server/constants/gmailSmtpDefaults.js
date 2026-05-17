'use strict';

/** Google Gmail SMTP relay (App Password). */
const GMAIL_SMTP_PROVIDER = 'gmail-smtp';

const GMAIL_SMTP_DEFAULTS = Object.freeze({
  provider: GMAIL_SMTP_PROVIDER,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpSecure: false
});

function isGmailSmtpProvider(provider) {
  return String(provider || '').trim().toLowerCase() === GMAIL_SMTP_PROVIDER;
}

function applyGmailSmtpDefaults(config = {}) {
  if (!isGmailSmtpProvider(config.provider)) {
    return config;
  }
  return {
    ...config,
    provider: GMAIL_SMTP_PROVIDER,
    smtpHost: config.smtpHost || GMAIL_SMTP_DEFAULTS.smtpHost,
    smtpPort: Number(config.smtpPort) || GMAIL_SMTP_DEFAULTS.smtpPort,
    smtpSecure: config.smtpSecure === true
  };
}

module.exports = {
  GMAIL_SMTP_PROVIDER,
  GMAIL_SMTP_DEFAULTS,
  isGmailSmtpProvider,
  applyGmailSmtpDefaults
};
