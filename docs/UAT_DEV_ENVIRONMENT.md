# Internal beta / UAT — `dev.arivusystems.com`

This document describes how to run a **dedicated internal beta** environment that is **separate from production** (`app.arivusystems.com` and its API) and safe for aggressive teammate testing and partner demos.

For production topology, see [ARIVU_PRODUCTION_DEPLOYMENT.md](./ARIVU_PRODUCTION_DEPLOYMENT.md). This file does **not** add new infrastructure; it encodes **how to configure** a second environment.

## Goals

| Goal | How |
|------|-----|
| Isolation from production | Separate Vercel project (or Preview-only) + separate Railway service, **different** MongoDB database(s), **different** Redis, **different** JWT and API secrets |
| Production-like behavior | `NODE_ENV=production` on API, real TLS, same build pipeline, same env variable *names* (different *values*) |
| No cross-talk with `app.*` | Never point UAT `MONGODB_URI` at the production Atlas cluster/database used by live customers (use a different cluster or at minimum a different database name and users) |
| DNS | App: `dev.arivusystems.com` → Vercel `client/`. API: e.g. `api-dev.arivusystems.com` → Railway `server/` (or your chosen staging API host) |

## Environment variable matrix (conceptual)

Configure these in the **UAT** Vercel + Railway projects only. Do not copy production secret values.

| Area | Production (example) | UAT (`dev.*`) |
|------|----------------------|---------------|
| App URL | `https://app.arivusystems.com` | `https://dev.arivusystems.com` |
| API URL | `https://api.arivusystems.com` | `https://api-dev.arivusystems.com` (example) |
| `MONGODB_URI` / org DB | Production Atlas | **Dedicated** UAT/staging Atlas (or cluster + DBs) |
| `JWT_SECRET` | Production secret | **New** random secret |
| `REDIS_URL` | Production queue | UAT Redis (e.g. separate Upstash DB) |
| `CORS_ORIGINS` | Production app origins | Include `https://dev.arivusystems.com` |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Production Sentry project | **Separate** Sentry project or environment = `uat` / `internal-beta` |
| `VITE_POSTHOG_KEY` | Production PostHog project | **Separate** PostHog project (or same project with `property` / `environment` filter) |
| Email (SES) | Live sending | Use sandbox / test inboxes / suppressed domains as appropriate |

## Client build

- Set `VITE_API_ORIGIN` (or equivalent used by your build) to the **UAT API** base URL so the browser calls the UAT stack, not production.
- Update `client/vercel.json` rewrites for the **UAT** Vercel project so `/api` targets the UAT API host (or rely on `VITE_API_ORIGIN` if that is how you route).
- Deploy from the same `client/` branch/commit you intend to test; tag releases for UAT if you need traceability.

## Server

- Use `GET /health/ready` for Railway health checks against UAT dependencies.
- Keep `CORS_ORIGINS` in sync with the exact `https://dev.arivusystems.com` origin (no trailing slash mismatch).

## Data

- Run the internal beta seed against the **UAT** database only: `npm run seed:internal-beta` from `server/` (see script header in `server/scripts/seedInternalBetaData.js`).
- Do not run seed scripts against production.

## Checklist before “we’re live on dev”

- [ ] UAT Mongo is not production Mongo.
- [ ] UAT JWT and third-party keys are unique.
- [ ] Client build points API to UAT.
- [ ] CORS allows the dev app origin.
- [ ] Sentry/PostHog receive events in non-production projects or tagged environments (see [MONITORING_OBSERVABILITY.md](./MONITORING_OBSERVABILITY.md)).
