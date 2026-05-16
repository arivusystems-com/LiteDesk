const emailService = require('../../../services/emailService');
const ociEmailDelivery = require('../../../services/emailProviders/ociEmailDelivery');
const EMAIL_PROVIDER_KEY = emailService.EMAIL_PROVIDER_KEY || 'email-provider';

function getActiveProviderKey() {
  if (!emailService.isConfigured()) return 'none';
  const explicitProvider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (explicitProvider) return explicitProvider;

  if (process.env.OCI_EMAIL_REGION || process.env.OCI_REGION) return ociEmailDelivery.PROVIDER_KEY;

  if (process.env.AWS_SES_REGION) return 'aws-ses';

  const smtpHost = (process.env.SMTP_HOST || '').toLowerCase();
  if (smtpHost.includes('resend.com')) return 'resend';
  if (smtpHost.includes('oraclecloud.com')) return ociEmailDelivery.PROVIDER_KEY;

  return 'smtp';
}

async function sendEmail(payload) {
  const result = await emailService.sendEmail(payload);
  return {
    ...result,
    provider: result.provider || getActiveProviderKey()
  };
}

async function isConfigured(context = {}) {
  if (context.organizationId) {
    return emailService.isConfiguredForOrganization(context.organizationId);
  }
  return emailService.isConfigured();
}

module.exports = {
  EMAIL_PROVIDER_KEY,
  getActiveProviderKey,
  isConfigured,
  sendEmail
};
