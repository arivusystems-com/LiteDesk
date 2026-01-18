# Notifications — Architecture & Flow

**Document purpose:** This document describes the current end-to-end Notifications architecture: how notifications are created, how preferences and rules are resolved, how delivery works (real-time + digests), how failures are handled, and how app isolation is enforced. It is written for engineer onboarding, debugging/audits, and long-term maintainability.

## 1. Overview

The Notifications system captures notable events and delivers them to users across multiple channels. It is non-blocking, preference-driven, app-scoped, multi-channel, and real-time capable.

Core principles:

- Non-blocking
- Preference-driven
- App-scoped
- Multi-channel
- Real-time capable

At a high level:

- Events are emitted from the server after business logic completes successfully.
- The notification engine resolves recipients and applies per-user channel preferences.
- Notifications are persisted as durable records and then delivered via real-time (SSE) and/or channel adapters.

## 2. Event Sources

Notifications originate from two sources:

- **System-defined events:** Domain/system events that have a configured system notification rule.
- **User-defined rule triggers:** Per-user `NotificationRule` records that match a domain event and rule conditions.

The system processes events in a non-blocking way:

- Notifications are emitted after business logic succeeds.
- Notification failures do not affect business flows. Failures are caught and logged.

## 3. Notification Engine Flow

This is the end-to-end server-side flow when an event is emitted.

1. **Event emitted**
   - Entry point: `server/services/notificationEngine.js` (`emitNotification`)
   - Unknown event types are logged and skipped.

2. **Recipient resolution**
   - System notifications resolve recipients using: `server/services/notificationRecipientResolver.js`
   - Recipient definitions are semantic keys (for example: `EVENT_AUDITOR`, `USER_SELF`) that resolve to concrete user IDs within an organization and app context.

3. **Rule evaluation**
   - **User-defined rules are evaluated first** (non-blocking): `server/services/notificationRuleEngine.js`
   - Rule evaluation maps a domain event into a rule context (module + rule eventType), loads matching user rules, evaluates conditions against the loaded entity, and creates notifications when matched.

4. **Preference resolution**
   - Preferences are per-user and per-app, stored in `NotificationPreference`.
   - Before reading preferences, the engine bootstraps defaults (idempotent): `server/services/notificationPreferenceBootstrap.js` (`ensureDefaultPreferences`)

5. **Channel dispatch**
   - Notifications are created per channel and persisted.
   - After persistence, dispatch runs per notification through the channel adapters:
     - `server/services/notificationChannels/inAppChannel.js`
     - `server/services/notificationChannels/emailChannel.js`
     - `server/services/notificationChannels/pushChannel.js`
     - `server/services/notificationChannels/whatsappChannel.js`
     - `server/services/notificationChannels/smsChannel.js`

6. **Persistence**
   - Notifications are persisted in `Notification` (MongoDB) via `insertMany`.
   - Read state is persisted via `readAt`.

## 4. Preference Resolution Order

Preference resolution determines **delivery**, not event creation.

Precedence and application in current code:

1. **User-defined notification rules**
   - Evaluated first for each emitted domain event: `notificationRuleEngine.js`
   - When a rule matches, it creates notifications with `source: 'USER_RULE'` and `ruleId`.

2. **User channel preferences**
   - Applied at delivery-time using `NotificationPreference.events[eventType]`.
   - If all channels resolve to disabled/unavailable for an event, no notifications are created for that recipient.

3. **App defaults**
   - Ensured (created once, then only missing keys are filled) by `ensureDefaultPreferences` in `notificationPreferenceBootstrap.js`.
   - Defaults are app-scoped and event-scoped.

4. **System defaults**
   - System notification rules define default channel behavior for system notifications (`defaultChannels` and `channels` metadata inside `server/constants/notificationRules`).
   - The system fallback channel list is `['IN_APP']` inside `notificationEngine.js`.

Clarifications:

- Preferences disable delivery, not event creation.
- Events can be emitted even when all channels are off; delivery is filtered during notification creation.

## 5. Notification Persistence Model

### What is stored

Persistent models:

- **`Notification`** (`server/models/Notification.js`)
  - `userId`, `organizationId`
  - `appKey` and `sourceAppKey` (app scoping and provenance)
  - `eventType`, `title`, `body`, `priority`
  - optional `entity` reference (`type`, `id`)
  - `channel` (IN_APP / EMAIL / PUSH / WHATSAPP / SMS)
  - `readAt`
  - user-rule metadata: `source` (SYSTEM / USER_RULE), `ruleId`

- **`NotificationPreference`** (`server/models/NotificationPreference.js`)
  - per-user, per-app `events` map
  - per-event channel flags (`inApp`, `email`, and external channel `{ enabled, available }`)

- **`NotificationRule`** (`server/models/NotificationRule.js`)
  - per-user, per-organization, per-app rules
  - rule target (`moduleKey` / legacy `entityType`) and `eventType`
  - conditions and channel selections

### What is transient

- Real-time fan-out state (SSE subscribers) is in-memory only: `server/services/notificationSSEHub.js`.
- UI-only behaviors such as snooze and grouping are not persisted as part of the notification record. See `docs/architecture/notifications-hardening.md` for the UX contract definitions.

### Read/unread semantics

- **Unread:** `readAt` is `null`
- **Read:** `readAt` is set to a timestamp via API updates
- **Dismiss vs read vs snooze:** The persisted model records read-state only (`readAt`). UI-only behaviors (for example: snooze) are not persisted. See `docs/architecture/notifications-hardening.md`.

## 6. Real-Time Delivery (SSE)

Real-time in-app delivery uses Server-Sent Events:

- SSE provides a one-way, server-to-client stream for best-effort, low-overhead delivery of in-app notifications.
- Server endpoint: `GET /api/notifications/stream?appKey=...&token=...`
  - Controller: `server/controllers/notificationStreamController.js`
  - Token is passed via query string because `EventSource` does not send Authorization headers.
  - The stream validates the user and validates access to the requested `appKey`.

SSE hub behavior:

- Hub implementation: `server/services/notificationSSEHub.js`
- Subscribers are keyed by **organizationId + userId + appKey**.
- Connection limits are enforced per user/app and per organization.
- Heartbeats and cleanup remove inactive connections.

Client integration:

- Client stream connector: `client/src/composables/useNotificationStream.js`
- The client reconnects with exponential backoff and caps reconnect attempts. When reconnect stops, notifications remain available via list API polling.

## 7. Digest Generation

Digests are generated by scheduled jobs and delivered via the existing notification pipeline.

- Scheduler entry point: `server/services/scheduledJobs.js`
  - Daily digest runs at 09:00 (configured timezone).
  - Weekly digest runs on Monday at 09:00 (configured timezone).
- Digest run logic: `server/services/digestScheduler.js`
  - Iterates active users.
  - Derives the user’s app keys from `appAccess` or `allowedApps`.
  - Checks `NotificationPreference` for digest event enablement.
  - Applies idempotency checks by searching for an existing digest notification in the same period.
  - Emits digest events through `emitNotification`.

Digest content generation:

- Digest content is computed in `notificationRecipientResolver.js` for digest events using:
  - `server/services/notificationDigestService.js` (`aggregateDigest`)
- The digest summarizes **unread** notifications in a time window; it is app-scoped.

Digests and real-time delivery are independent:

- Digests summarize unread notifications only.
- Digests do not replace real-time in-app notifications.
- Digests use the same persistence + dispatch pipeline as other notifications; channel use follows the digest event preferences (daily checks in-app/email; weekly checks email).

## 8. Channel Dispatch

Supported channels in current server code:

- **In-app** (`IN_APP`)
  - Persisted as `Notification` records and published via SSE for real-time delivery.
- **Email** (`EMAIL`)
  - Adapter: `server/services/notificationChannels/emailChannel.js`
  - Uses `emailService` when present; otherwise logs a “would send” fallback.
- **Push** (`PUSH`)
  - Adapter: `server/services/notificationChannels/pushChannel.js`
  - Enforced constraints include priority gating and subscription/service availability checks.
- **WhatsApp** (`WHATSAPP`)
  - Adapter: `server/services/notificationChannels/whatsappChannel.js`
  - Sending depends on the underlying WhatsApp service enablement and user preference availability.
- **SMS** (`SMS`)
  - Adapter: `server/services/notificationChannels/smsChannel.js`
  - Implemented as a fallback pathway guarded by SMS service enablement and preference gating.

Channel availability is app-scoped via preference defaults and adapter checks.
Each adapter is failure-isolated and does not throw into the engine.
Retry behavior is delegated to the underlying channel service (if any). The adapters log failures and return without throwing.

## 9. Failure Handling & Safety

The system is designed to be non-throwing and failure-isolated:

- `emitNotification` catches and logs failures and does not throw to callers.
- Unknown `eventType` values are logged and skipped.
- Recipient resolution failures log and stop processing for that event.
- Persistence failures are caught and logged.
- SSE publish is best-effort and fire-and-forget.
- Channel adapter dispatch is best-effort; adapter failures are logged and do not affect other channels.

Partial failure behavior:

- A subset of channels can fail while others succeed for the same event.
- A subset of recipients can fail while others succeed.

Key principle: Notifications never break user workflows.

## 10. App Isolation Model

App isolation is enforced across data, preferences, rules, APIs, and real-time streams.

- **App-scoped notifications**
  - `Notification.appKey` scopes storage and retrieval.
  - `Notification.sourceAppKey` records the originating app context when applicable.
- **App-scoped preferences**
  - `NotificationPreference` is keyed by `(userId, appKey)`.
  - Preferences are bootstrapped per app key via `ensureDefaultPreferences`.
- **App-scoped rules**
  - `NotificationRule` is keyed by `(userId, organizationId, appKey)`.
- **API scoping**
  - Listing and read-state updates filter by `userId`, `organizationId`, and `appKey` (`server/controllers/notificationController.js`).
- **SSE scoping**
  - SSE subscribers and publish fan-out are keyed by `organizationId + userId + appKey` (`notificationSSEHub.js`).
  - The SSE endpoint validates the user and validates access to the requested app key (`notificationStreamController.js`).

## 11. What Is Intentionally Out of Scope

- Notifications do not mutate domain data
- Notifications do not enforce workflows
- Notifications do not replace permissions
- Notifications do not auto-resolve entities

Reference: `docs/architecture/notifications-hardening.md`

## 12. Document Ownership & Change Policy

This document reflects the current architecture.
Behavioral changes update `docs/architecture/notifications-hardening.md` first.
Updates to this document are descriptive only and track what exists in code.

