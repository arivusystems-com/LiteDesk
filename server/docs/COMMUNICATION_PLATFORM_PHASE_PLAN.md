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
