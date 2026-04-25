# Monitoring and product analytics — operational use

Packages alone are not enough: this runbook describes **how to verify** Sentry and PostHog for internal beta and UAT.

## Sentry (errors + performance)

### Server

- Requires `SENTRY_DSN` in the Node process. Initialization is centralized (see `server/lib/sentryNode.js`).
- Authenticated requests can attach **user** and **organization** context when Sentry is enabled (see `server/middleware/authMiddleware.js` after `protect`): user id, email when present, and tag `organizationId` for tenant scoping.

### Client (Vue)

- Requires `VITE_SENTRY_DSN` at build time. Initialization: `client/src/config/observability.client.ts` (`initClientObservability`).
- Set `VITE_SENTRY_ENVIRONMENT` (e.g. `internal-beta`, `uat`) so issues separate from production.

### Verification (do this once per environment)

1. Deploy UAT with valid DSNs for a **non-production** Sentry project (or environment).
2. **Backend:** trigger a controlled error (e.g. temporary `throw new Error('sentry-uat-test')` in a dev-only route, or use Sentry’s test endpoint if you add one). Confirm the event appears with **release/environment** and, after an authenticated call, **user/org** tags where applicable.
3. **Frontend:** in the browser console on the UAT origin, after app load:  
   `throw new Error('sentry-client-uat-test')`  
   (or use a dev-only button) and confirm the issue in Sentry with correct `environment` and URL.
4. Remove test throws before wide testing.

### Useful context checklist

- [ ] `environment` distinguishes UAT vs production.
- [ ] User id (and org id on the server) present for authenticated errors.
- [ ] Source maps uploaded for the corresponding release (Vercel/Sentry integration) if you need readable stack traces.

## PostHog (analytics)

### Client

- `VITE_POSTHOG_KEY` enables PostHog; optional `VITE_POSTHOG_HOST` (defaults to US cloud).
- **Pageviews:** `capture_pageview` is disabled in init; **manual** `$pageview` is sent in `router.afterEach` with `path` and route `name` (`observability.client.ts`).
- **Identification:** when a user is set in the auth store or on app mount after refresh, `identifyProductUser` runs with user id, email, and `organizationId` where available (`client/src/stores/auth.js`, `client/src/App.vue`).
- **Key workflow signal:** on successful password login, `user_logged_in` is captured.
- On logout, `posthog.reset()` runs to avoid person bleed across accounts (`clearUser`).

### Verification

1. In PostHog (UAT project), use **Live events** with filter on your test email or `distinct_id` = user `_id`.
2. Open UAT, log in, navigate a few pages: expect `$pageview` with paths and `user_logged_in` after login.
3. Log out and log in as another user: expect a new distinct id / person after identify.

### Product review

- For beta review, create **Dashboards** or **Insights** in PostHog on: login funnel, key routes (`$pageview` by `path`), and `user_logged_in` volume by day.
- If you add custom `posthog.capture` calls for specific workflows, document the event names in this file as you add them.

## What “good” looks like

- Every serious error in UAT is **actionable in Sentry** (environment, user/tenant when auth’d, stack).
- You can answer “did testers hit the deal pipeline this week?” from PostHog using pageviews + identity, without guessing from random SQL or logs.
