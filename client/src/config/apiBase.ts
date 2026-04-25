/**
 * Public API / backend origin for production (optional).
 * - Empty: same-origin requests (Vercel rewrites to Railway, or local Vite proxy).
 * - Set VITE_API_ORIGIN to your API base (e.g. https://api.arivusystems.com) when the SPA and API are on different origins.
 */
export function getApiOrigin(): string {
  return (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, '') ?? ''
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
