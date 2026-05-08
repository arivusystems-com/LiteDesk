function getTenantBaseDomain() {
  return (process.env.TENANT_BASE_DOMAIN || process.env.BASE_DOMAIN || 'litedesk.com')
    .trim()
    .toLowerCase();
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
    const domain = getTenantBaseDomain();
    return hostname === domain || hostname.endsWith(`.${domain}`);
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
