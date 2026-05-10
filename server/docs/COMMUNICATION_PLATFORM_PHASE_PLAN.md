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

Follow-ups (optional, not blocking core platform):

- **Historical inbound**: records created before lifecycle events lack `CommunicationEvent` rows; a dedicated backfill script can be added if analytics need it.
- **Stronger webhook auth**: Phase 4 added optional shared secret (`EMAIL_INBOUND_WEBHOOK_SECRET`) on `POST /api/webhooks/email/inbound`. Provider-specific HMAC verification remains a separate hardening track if required.

## Phase 3 - Inbox & Reply Productivity

Status: Completed

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

### Phase 3 manual regression checklist (CRM activity / email threads)

Quick pass after changes to communications UI or adapters:

1. **Reply** — From a multi-message thread and a single-message email: composer opens with correct To and quoted history; send succeeds when policy allows.
2. **Reply all** — Shown only when extra recipients exist; Cc prefilled appropriately.
3. **Quoted collapse** — In thread body and composer, blockquotes toggle with ellipsis / Show–Hide quoted text tooltips where implemented.
4. **Done / reopen** — Toggle persists; filter “Done threads” shows or hides accordingly.
5. **Assign / unassign** — Assignee chip updates without full page reload; toast on error.
6. **Tags** — Add/remove via popover; tag chips visible; Esc closes popover; filters “Tagged” / “Untagged” behave.
7. **Create task / case** — Actions open correct destination when wired on that record surface.

## Phase 4 - Inbox Operations & Reliability UX

Status: Completed (current tranche)

Completed in this iteration:

- Added inbound diagnostics + dead-letter inspector under Settings → Integrations → Email Provider (queue snapshot, threading strategy breakdown, recent inbound lifecycle events, dead-letter list with owner-only replay).
- Replaced blocking `alert()` calls in integrations email settings with toast notifications; dead-letter replay shows compact **replay ok** / **replay failed** badges (error detail in tooltip).
- Expanded controller tests for thread assign/tags: missing `threadId`, empty tag, invalid `action`, unassign path, tenant-scoped meta filter.
- Controller tests for `markThreadDone` (missing `threadId`, scoped upsert, reopen) and `replayInboundDeadLetter` (403 non-owner, 404, 400 no MIME, 422 replay failure, 200 success). Run `npm run test:communications-threads` in `server/` (runs both communications test files).
- Documented Phase 3 manual regression checklist (reply, quoted collapse, done, assign/tag chips, task/case) in this plan.
- Dead-letter UX: jump from inbound diagnostics (open count card, recent open list + Focus) to inspector with scroll + temporary row highlight; **Export CSV** for the current inspector list.
- Optional HTTP integration tests for communications routes (see below).
- Optional **inbound webhook shared secret**: when `EMAIL_INBOUND_WEBHOOK_SECRET` is set, `POST /api/webhooks/email/inbound` requires `Authorization: Bearer …` or `X-Email-Inbound-Webhook-Token` with a constant-time match; omit in dev for an open receiver. Documented in `docs/PHASE2_INBOUND_SETUP.md`; operator hint in Email Provider integrations UI.
- **Inbound MIME webhook** panel in Email Provider settings: copies full POST URL (`origin + /api/webhooks/email/inbound`) and a sample curl (JSON body + placeholder auth/org headers).
- Initial **send email** flow from record surfaces (`GenericRecordContent`, task/deal record pages, `DealDetail`, `OrganizationSurface`) uses toast success/error instead of blocking `alert()`.

HTTP integration tests (communications):

- File: `server/tests/communications.http.integration.test.js` — native `http` + minimal Express app mounting `/api/communications`, real JWT (`protect` + `organizationIsolation`) and MongoDB.
- Run from `server/` (no `sudo` needed): `COMMUNICATIONS_HTTP_INTEGRATION=1 npm run test:communications-http-integration`. **`sudo npm run …` removes `COMMUNICATIONS_HTTP_INTEGRATION`**, so use your normal user, or preserve env (e.g. `sudo -E env COMMUNICATIONS_HTTP_INTEGRATION=1 npm run …`).
- Requires `JWT_SECRET` and a Mongo connection string: `MONGODB_URI`, `MONGO_URI`, or `MONGO_URI_LOCAL` (normally via `server/.env`). With the flag unset, the file runs one skipped-style smoke test so default CI does not need a DB.
- The suite creates a disposable tenant org + owner user, exercises assign / tags / done / dead-letter list, then deletes thread-related rows and those fixtures.

## Phase 5 - Workspace email inbox (started)

**Goal:** first-class **workspace-wide email thread** visibility (not only per-record activity), building on thread metadata, done state, and assignments.

Completed in this iteration:

- **API:** `GET /api/communications/workspace-threads` — discovers threads via Mongo **`$group` by thread key** (cap **`MAX_WORKSPACE_THREAD_KEYS`** distinct threads), hydrates all messages for those threads, applies unread/done/triage/assignee semantics, optional **`filter=all|unread|assigned_to_me|snoozed`**, `includeDone`, `limit`, **`mailboxId`**, **`search`** (substring on subject, participants, record label, tags, and **plain-text message bodies**), **`cursor`** / **`nextCursor`**. Snoozed threads are hidden from default folders; use **`filter=snoozed`** to list them. Each row includes **`snoozeActive`**, **`snoozedUntil`**, **`anchorCommunicationId`**, **`replyToAddress`**. Resolves `recordLabel` for linked people, deals, tasks, cases, business organizations, and **`workspace`** (tenant org name).
- **API:** `GET /api/communications/workspace-thread-ids` — same scope as the list (folder + search); returns up to **500** thread ids for “select all in folder”.
- **API:** `PATCH /api/communications/threads/:threadId/snooze` and bulk **`action: snooze`** — per-user **`ThreadView.snoozedUntil`** hides threads until that time.
- **API:** `GET /api/communications/workspace-thread-counts` — same scope as threads (no folder filter); used for counts-only refresh from the client.
- **API:** `GET /api/mailboxes?includeThreadCounts=true&includeDone=…` — adds **`threadUnreadCount`** on each mailbox plus **`allMailThreadUnread`** for the combined scope (parallel summaries; suitable for small mailbox counts).
- **API:** `POST /api/communications/email` with **`standalone: true`** — outbound email anchored to **`relatedTo: { moduleKey: 'workspace', recordId: organizationId }`** (no person/deal record). Tenant policy may opt out with **`outboundEmail.allowWorkspaceEmail: false`**. Inbound replies use the existing Reply-To token path with `moduleKey: workspace` (see `inboundDispatcher.resolveTargetRecord`).
- **UI:** **Inbox** shell surface (`/inbox`) is **mail only** (workspace threads). **Attention** (tasks + events, `GET /api/inbox`) lives at **`/platform/attention`**, as a **shell** row **below Approvals** in the sidebar. Mail: filters + “Include done”, **search**, **folder counts**, **per-mailbox unread badges**, **standalone compose** drawer, refresh list vs refresh counts. Rows with `relatedTo.moduleKey === 'workspace'` stay in Inbox (no record deep link). Other rows open the related record. Legacy `/inbox?tab=attention` redirects to `/platform/attention`.
- **Tests:** HTTP integration suite calls workspace threads, thread counts, search, and mailboxes `includeThreadCounts` when gated.

Suggested next within Phase 5:

- **Microsoft Graph / IMAP** and other providers — same pattern as Gmail (`forcedWorkspaceInbox` ingest + `providerMessageKey`); not shipped yet.
- **Background scheduled sync** (cron per connected mailbox) instead of manual “Sync now” only.
- **Snooze reminders** (notify when `snoozedUntil` elapses); today threads simply reappear on the next list load.

Completed in follow-up iterations:

- **Bulk triage:** `PATCH /api/communications/threads/bulk` (done, assign, add/remove tag) + Inbox multi-select bar.
- **Cursor pagination (API):** `GET workspace-threads` accepts **`cursor`** (opaque); returns **`nextCursor`** when more rows exist in the aggregated list (still bounded by the same recent scan until DB paging lands).
- **Mailbox unread:** single workspace summary per mailboxes list (partition unread by `thread.mailboxId`).
- **Workspace thread UX:** Inbox modal + Integrations link for workspace-only threads.
- **Policy:** `CommunicationConfig.outboundEmail.allowWorkspaceEmail` + Integrations → Communication Policy checkbox; Email Smoke Test standalone mode.
- **Test logs:** `TEST_SILENCE_ORG_LOGS=1` or `NODE_ENV=test` suppresses noisy `[OrganizationIsolation]` dev logs.
- **Thread discovery:** aggregation-ordered thread keys + body-aware search; reply fields on summaries; **`workspace-thread-ids`**; snooze model/API/UI; Inbox **reply** and **remove tag** / **select all in folder**.
- **Gmail inbox sync (personal mailboxes):** Google **OAuth Web client** credentials in **`CommunicationConfig.gmailInboxSync`** (Integrations UI) or **`GOOGLE_GMAIL_*` env fallback**; per-user **refresh token** encrypted on **`Mailbox`**; **`GET /api/mailboxes/:id/inbox-sync/google/start`**, **`GET /api/mailboxes/inbox-sync/google/callback`** (no JWT), **`POST /api/mailboxes/:id/inbox-sync/run`** imports INBOX into **`relatedTo: workspace`** with **`mailboxId`** and dedupe **`providerMessageKey`**. **`filter=snoozed`** + **`counts.snoozed`**.

---

## Historical “Suggested next” (cross-phase)

- Data: optional **backfill script** for `CommunicationEvent` on legacy inbound communications.
- Security: provider-specific **HMAC/signature** verification for inbound if the relay supports it beyond the shared Bearer token.
