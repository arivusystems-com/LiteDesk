import type { App } from 'vue'
import type { Router } from 'vue-router'
import * as Sentry from '@sentry/vue'
import { browserTracingIntegration } from '@sentry/vue'
import posthog from 'posthog-js'

export function initClientObservability(app: App, router: Router) {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (dsn) {
    Sentry.init({
      app,
      dsn,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
      integrations: [browserTracingIntegration({ router })],
      tracesSampleRate: Math.min(
        1,
        Math.max(0, Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) || 0.1)
      )
    })
  }

  const phKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  if (phKey) {
    const host = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com'
    posthog.init(phKey, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false,
      persistence: 'localStorage+cookie',
      autocapture: false,
    })
    router.afterEach((to) => {
      try {
        posthog.capture('$pageview', { path: to.fullPath, name: to.name as string | undefined })
      } catch {
        /* optional */
      }
    })
  }
}

export { posthog }
