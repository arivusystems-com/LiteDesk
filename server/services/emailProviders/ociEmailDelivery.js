/**
 * Oracle Cloud Infrastructure (OCI) Email Delivery provider helpers.
 * Uses the official SMTP submission endpoint (smtp.email.<region>.oci.oraclecloud.com).
 * @see https://docs.oracle.com/en-us/iaas/Content/Email/Concepts/setting-up-email-submission.htm
 */

const PROVIDER_KEY = 'oci-email-delivery';
/** OCI Email Delivery accepts implicit TLS on port 465 only (not STARTTLS on 587). */
const DEFAULT_SMTP_PORT = 465;

function normalizeProvider(value) {
  return String(value || '').trim().toLowerCase();
}

function isOciEmailDeliveryProvider(runtimeConfig = {}) {
  const provider = normalizeProvider(runtimeConfig.provider);
  if (provider === PROVIDER_KEY || provider === 'oci') return true;
  const host = String(runtimeConfig.smtpHost || '').toLowerCase();
  return host.includes('email.') && host.includes('.oci.oraclecloud.com');
}

function buildOciSmtpHost(region) {
  const normalized = String(region || '').trim().toLowerCase();
  if (!normalized) return '';
  return `smtp.email.${normalized}.oci.oraclecloud.com`;
}

function isOciSmtpHost(host) {
  const value = String(host || '').toLowerCase();
  return value.includes('email.') && value.includes('.oci.oraclecloud.com');
}

/** Host from another provider (e.g. Resend) that must not be used for OCI sends. */
function shouldReplaceSmtpHostForOci(host) {
  const value = String(host || '').trim().toLowerCase();
  if (!value) return true;
  if (isOciSmtpHost(value)) return false;
  return true;
}

function resolveOciRegion(runtimeConfig = {}) {
  return String(
    runtimeConfig.ociRegion ||
      process.env.OCI_EMAIL_REGION ||
      process.env.OCI_REGION ||
      ''
  ).trim().toLowerCase();
}

/**
 * Merge OCI Email Delivery defaults into a runtime config object (non-destructive).
 */
function applyOciEmailDeliveryDefaults(runtimeConfig = {}) {
  if (!isOciEmailDeliveryProvider(runtimeConfig)) {
    return { ...runtimeConfig };
  }

  const ociRegion = resolveOciRegion(runtimeConfig);
  const ociHost = buildOciSmtpHost(ociRegion);
  const existingHost = String(runtimeConfig.smtpHost || '').trim();
  let smtpHost = existingHost;
  if (ociHost && shouldReplaceSmtpHostForOci(existingHost)) {
    smtpHost = ociHost;
  }
  if (!smtpHost) {
    smtpHost = ociHost || String(process.env.SMTP_HOST || '').trim();
  }

  const smtpPortRaw = runtimeConfig.smtpPort ?? process.env.SMTP_PORT ?? DEFAULT_SMTP_PORT;
  let smtpPort = parseInt(smtpPortRaw, 10);
  if (Number.isNaN(smtpPort) || smtpPort === 587 || smtpPort === 25) {
    smtpPort = DEFAULT_SMTP_PORT;
  }

  return {
    ...runtimeConfig,
    provider: PROVIDER_KEY,
    ociRegion: ociRegion || runtimeConfig.ociRegion || '',
    smtpHost,
    smtpPort,
    smtpUser:
      runtimeConfig.smtpUser ||
      process.env.OCI_SMTP_USER ||
      process.env.SMTP_USER ||
      '',
    smtpPass:
      runtimeConfig.smtpPass ||
      process.env.OCI_SMTP_PASS ||
      process.env.SMTP_PASS ||
      '',
    // Port 465 = TLS from first byte; port 587 + secure:true causes "wrong version number".
    smtpSecure: smtpPort === 465
  };
}

function isOciEmailDeliveryConfigured(runtimeConfig = {}) {
  if (!isOciEmailDeliveryProvider(runtimeConfig)) return false;
  const merged = applyOciEmailDeliveryDefaults(runtimeConfig);
  if (!merged.fromEmail) return false;
  if (!merged.smtpHost || !merged.smtpPort) return false;
  return !!(merged.smtpUser && merged.smtpPass);
}

module.exports = {
  PROVIDER_KEY,
  DEFAULT_SMTP_PORT,
  buildOciSmtpHost,
  isOciSmtpHost,
  shouldReplaceSmtpHostForOci,
  isOciEmailDeliveryProvider,
  applyOciEmailDeliveryDefaults,
  isOciEmailDeliveryConfigured,
  resolveOciRegion
};
