/**
 * PostHog user identity + event helpers.
 *
 * Must NOT statically import `posthog-js` here: `auth.js` imports this file on the
 * critical path (App → auth store) during router/plugin bootstrap. A top-level
 * `import 'posthog-js'` interleaves a huge module graph (Preact, OTel, etc.) with
 * Vue / vue-router and can produce ESM TDZ: "Cannot access 'X' before initialization"
 * in production minified bundles, often with vue-router in the stack.
 *
 * `posthog.init` runs in `initClientObservability` (see main.ts) before mount; these
 * helpers use dynamic `import('posthog-js')` the same way as `observability.client.ts`.
 */
type PostHog = typeof import('posthog-js').default

let posthogModulePromise: Promise<PostHog> | null = null

function loadPosthog(): Promise<PostHog> {
  if (!posthogModulePromise) {
    posthogModulePromise = import('posthog-js').then((m) => m.default)
  }
  return posthogModulePromise
}

export function identifyProductUser(
  user: {
    _id?: string
    email?: string
    organizationId?: string
  } | null
) {
  if (!user?._id || !import.meta.env.VITE_POSTHOG_KEY) return
  void loadPosthog().then((posthog) => {
    try {
      posthog.identify(String(user._id), {
        email: user.email,
        organizationId: user.organizationId ? String(user.organizationId) : undefined,
      })
    } catch {
      /* optional */
    }
  })
}

export function resetPosthog() {
  void loadPosthog().then((posthog) => {
    try {
      if (typeof posthog.reset === 'function') posthog.reset()
    } catch {
      /* optional */
    }
  })
}

export function captureUserLoggedIn(payload?: { method?: string }) {
  if (!import.meta.env.VITE_POSTHOG_KEY) return
  void loadPosthog().then((posthog) => {
    try {
      posthog.capture('user_logged_in', { method: payload?.method || 'password' })
    } catch {
      /* optional */
    }
  })
}
