# Communication Platform Phase Plan

This document tracks progressive implementation of the shared communication platform.

## Phase 0 - Foundation Alignment

Status: Completed

Completed in this iteration:

- Added `platform/communication` module boundary:
  - `api/communicationPlatformService.js`
  - `domain/sendEmailContract.js`
  - `providers/emailProviderGateway.js`
  - `queues/emailDispatchQueue.js`
- Centralized outbound payload normalization + validation in one contract module.
- Updated `communicationsController` to use the platform API boundary for:
  - payload validation
  - send capability check
  - queue dispatch
- Updated outbound send metadata to store provider from gateway instead of hardcoded value.
- Updated notification email channel to use the platform provider gateway.
- Provider metadata now supports Resend-first identification:
  - `EMAIL_PROVIDER=resend` (recommended explicit setting), or
  - automatic detection when `SMTP_HOST` uses Resend SMTP endpoint.

Completed in this iteration:

- Added append-only communication event collection + writer:
  - `models/CommunicationEvent.js`
  - `services/communicationEventWriter.js`
  - Events emitted across request + worker paths (`accepted`, `queued`, `sent`, `failed`, `idempotency_replay`)
- Added idempotency key support for outbound send path:
  - Accepts `X-Idempotency-Key` (or `idempotencyKey` in request body)
  - Stores `idempotencyKey` and `idempotencyKeyHash` on communication
  - Replays existing response safely when duplicate key is detected
- Added dedicated per-tenant communication config schema and runtime policy resolver:
  - `models/CommunicationConfig.js`
  - `platform/communication/config/communicationConfigService.js`
  - Enforces outbound policy gates (`enabled`, `requireIdempotencyKey`, `allowedModuleKeys`, `maxRecipientsPerMessage`)

## Phase 1 - Core Sending Pipeline

Planned next implementation:

- Introduce request-level idempotency key (`X-Idempotency-Key`) for `/api/communications/email`.
- Persist send request lifecycle events (`accepted`, `queued`, `sent`, `failed`).
- Add first-class communication worker queue names and retry profiles.
- Add minimal observability counters (queue depth, send success/failure, latency).

Status: Completed

Completed in this iteration:

- Added queue/retry profile constants and queue depth stats for communication send worker.
- Added pipeline metrics endpoint (`/api/communications/pipeline-metrics`).
- Added diagnostics endpoint (`/api/communications/pipeline-diagnostics`) and settings UI panel for event/failure visibility.
- Added explicit worker lifecycle event (`processing`) and richer failure taxonomy.

## Phase 2 - Delivery & Webhook Intelligence

Status: In progress

Completed in this iteration:

- Extended SES webhook handling to update communication status and append normalized communication events.
- Added generic provider webhook endpoint (`POST /api/webhooks/email/events`) for provider-agnostic event ingestion.
- Added webhook metadata persistence on communication records for traceability.
- Added webhook replay protection (duplicate provider event IDs are ignored).
- Added optional webhook token auth gate for generic provider events (`EMAIL_EVENTS_WEBHOOK_TOKEN`).
- Hardened inbound reply correlation with normalized `In-Reply-To`/`References` parsing and fallback matching to recent outbound thread context.
- Added tenant-aware email suppression model for bounced/complained recipients.
- Wired SES + generic webhook handlers to automatically upsert suppression entries on bounce/complaint events.
- Enforced suppression at send-time in communications API to prevent delivery attempts to suppressed recipients.
- Added suppression management APIs (`GET /api/communications/suppressions`, `DELETE /api/communications/suppressions/:email`).
- Added settings UI panel to inspect and remove suppressed recipients (owner-only remove).
- Added tenant-level suppression policy controls (`autoSuppressOnBounce`, `autoSuppressOnComplaint`) in communication config.
- Updated SES and generic webhook processors to enforce suppression policy before creating suppression entries.
- Added suppression stats endpoint (`GET /api/communications/suppressions/stats`) for dashboard cards.
- Added organization activity audit log on manual unsuppress actions.
- Enhanced suppression settings UI with search, reason filter, and quick stats cards.
