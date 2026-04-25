import { getApiOrigin, withApiOrigin } from './apiBase'

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
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && shouldRewrite(input)) {
      return orig(base + input, init)
    }
    if (input instanceof Request) {
      try {
        const u = new URL(input.url, window.location.origin)
        if (u.origin === window.location.origin && shouldRewrite(u.pathname + (u.search || ''))) {
          return orig(new Request(base + u.pathname + (u.search || ''), input), init)
        }
      } catch {
        /* ignore */
      }
    }
    return orig(input, init)
  }
}

/**
 * Expose for img/src or <a> that are not using fetch
 */
export { withApiOrigin }
