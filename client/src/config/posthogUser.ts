import posthog from 'posthog-js'

/**
 * PostHog user identity + event helpers.
 *
 * Kept in a **separate module** from `observability.client.ts` so the auth store
 * and router can load without importing `@sentry/vue` (avoids init-order / TDZ
 * issues in production: "Cannot access before initialization" around vue-router).
 *
 * `posthog.init` still runs in `initClientObservability` (see main.ts) before mount.
 */
export function identifyProductUser(user: {
  _id?: string
  email?: string
  organizationId?: string
} | null) {
  if (!user?._id || !import.meta.env.VITE_POSTHOG_KEY) return
  try {
    posthog.identify(String(user._id), {
      email: user.email,
      organizationId: user.organizationId ? String(user.organizationId) : undefined,
    })
  } catch {
    /* optional */
  }
}

export function resetPosthog() {
  try {
    if (typeof posthog.reset === 'function') posthog.reset()
  } catch {
    /* optional */
  }
}

export function captureUserLoggedIn(payload?: { method?: string }) {
  if (!import.meta.env.VITE_POSTHOG_KEY) return
  try {
    posthog.capture('user_logged_in', { method: payload?.method || 'password' })
  } catch {
    /* optional */
  }
}

export { posthog }
