function getTenantApiOriginFromLocation(): string {
  if (typeof window === 'undefined') return ''

  const hostname = window.location.hostname.toLowerCase()
  const match = hostname.match(/^([a-z0-9-]+)\.app\.(.+)$/)
  if (!match) return ''

  const [, slug, baseDomain] = match
  if (!slug || !baseDomain) return ''

  return `${window.location.protocol}//${slug}.api.${baseDomain}`
}

/**
 * Public API / backend origin for production (optional).
 * - Tenant app hosts (`https://<slug>.app.example.com`) resolve to
 *   `https://<slug>.api.example.com`.
 * - Empty: same-origin requests (Vercel rewrites to Railway, or local Vite proxy).
 * - Set VITE_API_ORIGIN to your API base (e.g. https://api.arivusystems.com) when the SPA and API are on different origins.
 */
export function getApiOrigin(): string {
  const tenantApiOrigin = getTenantApiOriginFromLocation()
  if (tenantApiOrigin) return tenantApiOrigin

  const explicitOrigin = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, '')
  if (explicitOrigin) return explicitOrigin

  // Backward compatibility: older envs use VITE_API_URL and may include trailing /api.
  const legacyUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  if (!legacyUrl) return ''
  return legacyUrl.replace(/\/api$/, '')
}

export function withApiOrigin(path: string): string {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const origin = getApiOrigin()
  const p = path.startsWith('/') ? path : `/${path}`
  return origin ? `${origin}${p}` : p
}

/**
 * Coerce to a single /api/... path (avoids /api/api/ when callers pass /api/... from legacy call sites).
 */
export function normalizeToApiPath(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/api/') || url === '/api') return url
  return '/api' + (url.startsWith('/') ? url : `/${url}`)
}

export function getApiUrlForFetch(url: string): string {
  return withApiOrigin(normalizeToApiPath(url))
}
