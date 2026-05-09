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

Status: Completed

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

## Phase 3 - Inbound Threading & Conversation Intelligence

Status: Completed

Goal: bring the inbound side up to the same platform-grade reliability as
outbound. Move parse/route/persist work off the webhook hot path, give
inbound its own queue + dead-letter, surface lifecycle events, and clean up
displayed reply bodies.

Completed in this iteration:

- Added `platform/communication/inbound/` module:
  - `inboundParser.js` — normalizes raw MIME via `mailparser` into a
    deterministic payload (addresses, headers, attachments, raw size).
  - `threadResolver.js` — RFC In-Reply-To/References matching, with
    fallbacks to recent-related-record and subject normalization
    (`Re:`/`Fwd:` stripped) over a 30-day window.
  - `replyContentNormalizer.js` — quoted-reply + signature stripping for
    Gmail / Outlook / generic clients; preserves the original body and
    flags whether anything was stripped.
  - `inboundDispatcher.js` — single entry point that runs parse → tenant
    resolve → record resolve → thread resolve → body normalize → persist
    → activity log → lifecycle events; raises `InboundDispatchError`
    with stage metadata for upstream dead-letter handling.
- Added inbound platform queue:
  - `services/inboundEmailQueueService.js` — Bull queue
    `communication:email:inbound`, exponential backoff retry profile,
    dead-letter persistence on terminal failure, sync fallback when
    Redis is not configured.
  - `platform/communication/queues/inboundProcessingQueue.js` — thin
    platform boundary used by the controller.
- Added `models/InboundDeadLetter.js` — captures stage, reason, error,
  parsed summary, and (when ≤ 5 MB) the original raw MIME for replay.
- Added inbound lifecycle event types to `CommunicationEvent` enum:
  `inbound_received`, `inbound_queued`, `inbound_parsed`,
  `inbound_threaded`, `inbound_routed`, `inbound_failed`,
  `inbound_replayed`.
- Refactored `controllers/inboundEmailController.js`:
  - Webhook now ACKs `202 Accepted` after enqueuing; processing happens
    on the worker.
  - Sync fallback path used when Redis is unavailable so dev/local keeps
    working without infra.
  - Failures route to `InboundDeadLetter` with the original MIME so they
    are replayable.
- Added inbound observability + recovery endpoints:
  - `GET /api/communications/inbound/diagnostics` — queue stats, recent
    inbound lifecycle events, thread-strategy breakdown, open
    dead-letter count, recent dead-letters.
  - `GET /api/communications/inbound/dead-letter` — list dead-letters
    (open by default, `?includeResolved=true` to widen).
  - `POST /api/communications/inbound/dead-letter/:id/replay` — owner-only
    replay; resolved on success, replay-counter bumped on failure with
    the dead-letter remaining open.
- Updated `worker.js` to start the inbound worker alongside the outbound
  worker and to close both queues on shutdown.

Remaining for this phase:

- Settings UI panel for inbound diagnostics + dead-letter inspector
  (mirrors the existing outbound pipeline diagnostics panel).
- Backfill / migration considerations for historical inbound records
  (existing inbound rows pre-date the lifecycle events; not blocking).
- Optional: signed webhook verification for inbound (out of scope here,
  candidate for the webhook-hardening track).

## Phase 3 - Inbox & Reply Productivity

Status: In progress

Completed in this iteration:

- Added inline reply action on email thread cards in record activity timelines.
- Added reply draft prefill support in `EmailComposeDrawer` (to, subject, quoted body).
- Wired reply sends to include `parentCommunicationId` for proper thread continuity.
- Enabled reply flow through activity adapters for generic, deal, and task record surfaces.
- Added recipient intelligence for reply drafts (`Reply all` with smart CC prefill excluding current user).
- Added contextual quoted header in reply drafts and auto-expand Cc/Bcc fields when prefilled.
- Added per-user thread workflow state (`done/reopen`) on top of thread view state.
- Added thread-done API endpoint (`PATCH /api/communications/threads/:threadId/done`) and done-aware thread listing (`includeDone=true`).
- Added UI actions to mark thread done/reopen across activity timeline surfaces.
- Added dedicated done-thread visibility filter in activity surfaces.
- Added keyboard shortcuts on focused thread cards (`r` reply, `a` reply all, `d` done/reopen).
- Added inbox productivity quick actions on email thread cards: `Create task` and `Create case`.
- Added API endpoint to create a helpdesk case from an email (`POST /api/communications/:communicationId/create-case`) with case activity logging metadata.
- Added thread triage hints (`priorityHint`, `slaHint`, `riskFlags`) in thread API response to support inbox prioritization.
- Added subtle triage chips in email thread headers (high priority, reply due soon/overdue, delivery risk).
- Added thread ownership + tags metadata with APIs to assign/unassign and tag threads.
- Added quick actions in email thread `+` menu for `Assign to me`, `Unassign`, and `Add tag`, with organization activity audit logging.
- Added Esc-to-close behavior for thread tag popover in email thread cards (outside-click + Escape both close).
- Replaced blocking `alert()` usage with non-blocking toast notifications for thread actions (assign/unassign, tag add/remove, done/reopen) across generic, deal, and task record surfaces.
- Added controller-level API tests for thread ownership/tag actions (`assignThreadOwner`, `updateThreadTags`) in `server/tests/communicationsThreadActions.controller.test.js`.

## Phase 4 - Inbox Operations & Reliability UX

Status: Next

Planned next implementation:

- Add an inbound diagnostics panel in settings to surface queue health, recent inbound lifecycle events, and dead-letter counts.
- Add a dead-letter inspector UI with replay action (owner-only), including event context and error stage details.
- Add API tests for negative paths on thread actions (missing threadId, invalid tag/action, workspace-boundary validation).
- Add a lightweight Phase 3 regression checklist in docs for reply, threading actions, chip visibility, and done/reopen filters.
