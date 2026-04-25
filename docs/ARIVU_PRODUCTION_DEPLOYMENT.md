# Arivu — production deployment (Arivu Systems)

This runbook matches the product split:

| Surface | Hostname | Platform |
|--------|-----------|----------|
| Marketing / website | `arivusystems.com` | Your static site (not this repo) or a separate Vercel project |
| **Web app (Vue)** | `app.arivusystems.com` | **Vercel** — deploy from the `client/` app |
| **API + workers** | e.g. `api.arivusystems.com` (custom domain on Railway) | **Railway** — deploy from the `server/` app |
| Database | — | **MongoDB Atlas** |
| Queue / cache | — | **Upstash Redis** (or Railway Redis) — set `REDIS_URL` (often `rediss://…`) |
| Object storage | — | **AWS S3** (see `server/config/awsConfig.js`; uploads today are primarily local with a clear path to S3) |
| Email | — | **AWS SES** (see `server/services/emailService.js`) |
| DNS / TLS | — | **Cloudflare** in front of Vercel + Railway |
| Errors | — | **Sentry** (`SENTRY_DSN` server, `VITE_SENTRY_DSN` client) |
| Product analytics | — | **PostHog** (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` optional) |

Kubernetes is **not** part of this design.

## Backend (Railway)

1. **Root directory:** `server` (or a monorepo sub-service pointing at that folder).
2. **Start command:** `node server.js` (default `npm start`).
3. **Health checks:** use `https://<your-api>/health/ready` (readiness) or `GET /health/live` (liveness). Configure Railway / Cloudflare to hit readiness for dependency checks.
4. **Trust proxy:** `app.set('trust proxy', 1)` is enabled in production so `X-Forwarded-Proto` and secure cookies/headers work behind Cloudflare and Railway.
5. **Bull + workers:** the API process runs the email queue consumer by default. If you add a **second** Railway service for background work:
   - Start command: `node worker.js` (see `package.json` → `npm run worker`).
   - On the **web** service, set `ENABLE_BULL_IN_WEB=false` to avoid two consumers for the same queue unless you intend to scale workers horizontally.
6. **CORS:** production defaults allow `https://arivusystems.com`, `https://www.arivusystems.com`, and `https://app.arivusystems.com`. Override with `CORS_ORIGINS` (comma-separated) if you add staging hosts.
7. **Required env (production):** `NODE_ENV=production`, `MONGODB_URI` (Atlas), `JWT_SECRET` (strong random, long), plus SES/Redis as you enable them. See `server/.env.production.example`.

## Frontend (Vercel)

1. **Project root:** `client/`.
2. **Build:** `npm run build` (default for Vite).
3. **Domains:** connect `app.arivusystems.com` in the Vercel project.
4. **API routing:** `client/vercel.json` rewrites `/api/*` to `https://api.arivusystems.com/…` and matches the same **portal** API prefixes as the Vite dev proxy. If your real API host differs, **edit the destinations** in that file (or set equivalent rewrites in the Vercel dashboard).
5. **Split API host without rewrites:** set `VITE_API_ORIGIN=https://api.yourdomain.com` at build time. The app applies this via `getApiUrlForFetch` / the fetch shim in `main.ts` for `/api` and `/portal` API paths. Keep `CORS_ORIGINS` on the API in sync.
6. **Sentry + PostHog:** set the `VITE_*` variables in Vercel for **Production**; source maps are enabled in Vite for upload to Sentry (configure release + auth token in your CI or Sentry project).

## Cloudflare (recommended)

- **app:** CNAME to Vercel; **api:** CNAME to Railway; SSL mode **Full (strict)**.
- Consider WAF, bot management, and rate limits at the edge; the API also runs `express-rate-limit` for application-level limits.

## See also (internal beta / UAT)

- [UAT_DEV_ENVIRONMENT.md](./UAT_DEV_ENVIRONMENT.md) — `dev.arivusystems.com` isolation and env matrix  
- [INTERNAL_BETA_TEST_FLOWS.md](./INTERNAL_BETA_TEST_FLOWS.md) — structured teammate review  
- [MONITORING_OBSERVABILITY.md](./MONITORING_OBSERVABILITY.md) — Sentry + PostHog checks  
- [BACKUP_AND_ROLLBACK.md](./BACKUP_AND_ROLLBACK.md) — Atlas, S3, secrets, rollback

## Environment files

- `server/.env.production.example` — reference for the Node API and worker.
- `client/.env.production.example` — reference for the Vite build on Vercel.

Copy to real `.env` or configure variables only in the host UI (do not commit secrets).

## CI/CD (next step)

- Add a workflow that: installs dependencies, runs `client` `npm run type-check` / `npm run test`, `server` unit tests, and (optionally) `npm run security:check` in `server`. Deploy remains via Vercel and Railway’s Git integrations.

## npm cache / install issues

If `npm install` fails with EACCES on the global cache, run `sudo chown -R "$(whoami)" ~/.npm` once, or use a project-local cache: `npm install --cache .npm-cache`.
