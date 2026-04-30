import { getApiOrigin, withApiOrigin } from './apiBase'

const METADATA_CACHE_TTL_MS = 5 * 60 * 1000
const metadataCache = new Map<string, { expiresAt: number; response: Response }>()
const metadataInflight = new Map<string, Promise<Response>>()

const CACHEABLE_METADATA_PATHS = [
  /^\/api\/modules(?:$|\?)/,
  /^\/api\/settings\/core-modules(?:$|\/|\?)/,
  /^\/api\/ui\/apps(?:$|\/|\?)/,
  /^\/api\/ui\/entities(?:$|\?)/,
  /^\/api\/ui\/routes(?:$|\?)/,
]

const INVALIDATING_METADATA_PATHS = [
  /^\/api\/modules(?:$|\/|\?)/,
  /^\/api\/settings\/core-modules(?:$|\/|\?)/,
  /^\/api\/ui(?:$|\/|\?)/,
]

/**
 * When VITE_API_ORIGIN is set, prefix relative /api and /portal requests so split-origin deploys work
 * without editing every call site. EventSource is handled in useNotificationStream.
 */
export function installFetchApiBase() {
  const origin = getApiOrigin()
  if (!origin) return
  const base = origin.replace(/\/$/, '')

  const shouldRewrite = (urlStr: string) =>
    (urlStr.startsWith('/api/') ||
      urlStr.startsWith('/api?') ||
      urlStr === '/api' ||
      urlStr.startsWith('/portal/')) &&
    !urlStr.startsWith('//')

  const orig = window.fetch.bind(window)

  const pathWithSearch = (input: RequestInfo | URL) => {
    try {
      const url =
        typeof input === 'string'
          ? new URL(input, window.location.origin)
          : input instanceof Request
            ? new URL(input.url, window.location.origin)
            : new URL(input.toString(), window.location.origin)
      return `${url.pathname}${url.search || ''}`
    } catch {
      return ''
    }
  }

  const methodFor = (input: RequestInfo | URL, init?: RequestInit) => {
    return String(init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase()
  }

  const authorizationFor = (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined)
    const initHeaders = new Headers(init?.headers)
    initHeaders.forEach((value, key) => headers.set(key, value))
    return headers.get('authorization') || ''
  }

  const isCacheableMetadata = (path: string) =>
    CACHEABLE_METADATA_PATHS.some((pattern) => pattern.test(path))

  const invalidatesMetadata = (path: string) =>
    INVALIDATING_METADATA_PATHS.some((pattern) => pattern.test(path))

  const cacheKeyFor = (path: string, auth: string) => `${auth}:${path}`

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const requestPath = pathWithSearch(input)
    const method = methodFor(input, init)
    const authorization = authorizationFor(input, init)
    const cacheKey = cacheKeyFor(requestPath, authorization)

    if (method !== 'GET' && invalidatesMetadata(requestPath)) {
      metadataCache.clear()
      metadataInflight.clear()
    }

    if (method === 'GET' && isCacheableMetadata(requestPath) && init?.cache !== 'no-store') {
      const cached = metadataCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return Promise.resolve(cached.response.clone())
      }
      if (cached) {
        metadataCache.delete(cacheKey)
      }

      const inflight = metadataInflight.get(cacheKey)
      if (inflight) {
        return inflight.then((response) => response.clone())
      }
    }

    let fetchInput = input
    if (typeof input === 'string' && shouldRewrite(input)) {
      fetchInput = base + input
    }
    if (input instanceof Request) {
      try {
        const u = new URL(input.url, window.location.origin)
        if (u.origin === window.location.origin && shouldRewrite(u.pathname + (u.search || ''))) {
          fetchInput = new Request(base + u.pathname + (u.search || ''), input)
        }
      } catch {
        /* ignore */
      }
    }

    const promise = orig(fetchInput, init)
    if (method === 'GET' && isCacheableMetadata(requestPath) && init?.cache !== 'no-store') {
      const tracked = promise
        .then((response) => {
          if (response.ok) {
            metadataCache.set(cacheKey, {
              expiresAt: Date.now() + METADATA_CACHE_TTL_MS,
              response: response.clone(),
            })
          }
          return response
        })
        .finally(() => {
          metadataInflight.delete(cacheKey)
        })
      metadataInflight.set(cacheKey, tracked)
      return tracked
    }

    return promise
  }
}

/**
 * Expose for img/src or <a> that are not using fetch
 */
export { withApiOrigin }
