const DEFAULT_TENANT_BASE_DOMAINS = [
  'app.arivusystems.com',
  'litedesk.com',
];

function getTenantBaseDomains() {
  const raw = process.env.TENANT_BASE_DOMAIN || process.env.BASE_DOMAIN;
  if (!raw) return DEFAULT_TENANT_BASE_DOMAINS;
  return String(raw)
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function getTenantBaseDomain() {
  return getTenantBaseDomains()[0];
}

function buildTenantFrontendUrl(subdomain) {
  const domain = getTenantBaseDomain();
  return `https://${subdomain}.${domain}`;
}

function buildTenantApiUrl(subdomain) {
  return `${buildTenantFrontendUrl(subdomain)}/api`;
}

function isTenantSubdomainOrigin(origin) {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();

    // Always allow tenant hosts in the form: <slug>.app.arivusystems.com
    if (/^[a-z0-9-]+\.app\.arivusystems\.com$/.test(hostname)) {
      return true;
    }

    const domains = getTenantBaseDomains();
    return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch (_error) {
    return false;
  }
}

module.exports = {
  getTenantBaseDomain,
  buildTenantFrontendUrl,
  buildTenantApiUrl,
  isTenantSubdomainOrigin
};
