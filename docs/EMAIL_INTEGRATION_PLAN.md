# Email Integration Implementation Plan

## Current State Summary

### Settings → Integrations
- **UI**: `IntegrationsSettings.vue` shows a catalog of integrations with enable/disable
- **Registry**: `integrationRegistry.js` defines `email-provider` as first, recommended, platform-wide
- **API**: `GET/POST /api/settings/integrations` and `/:key/enable`, `/:key/disable`
- **Storage**: `Organization.integrations` stores `{ [key]: { enabled, status, connectedAt, disconnectedAt } }`

### Email Infrastructure (Partial)
- **emailChannel.js**: Notification channel that tries `require('../emailService')` → **does not exist**
- **Fallback**: When emailService fails, logs "would send" and returns `skipped: true`
- **Dependencies**: `nodemailer`, `@aws-sdk/client-ses` already in package.json
- **Env**: `.env.example` has AWS SES vars; `.env` has `ENABLE_EMAIL_NOTIFICATIONS=false`, no SES keys

### Gaps
1. No `emailService.js` – emailChannel cannot actually send
2. Enable/disable for `email-provider` does not gate email sending
3. No configuration UI for email provider (credentials, from address)
4. No org-level or platform-level email config storage

---

## Implementation Plan

### Phase 1: Email Service (Backend)

**Goal**: Create a working email service that can send via AWS SES or SMTP.

| Task | Details |
|------|---------|
| 1.1 Create `server/services/emailService.js` | Use `@aws-sdk/client-ses` when `AWS_SES_*` env vars are set; optional nodemailer SMTP fallback |
| 1.2 API: `sendEmail({ to, subject, text, html, replyTo? })` | Returns `{ success, messageId?, error? }` |
| 1.3 Health check | `isConfigured()` – true when SES or SMTP credentials present |
| 1.4 Wire emailChannel | emailChannel already calls `emailService.sendEmail()` – just create the service |

**Config source**: Environment variables (platform-wide)
- `AWS_SES_REGION`, `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`
- `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`
- Optional: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` for nodemailer fallback

---

### Phase 2: Integration Gate

**Goal**: Email sending only happens when `email-provider` integration is enabled for the org.

| Task | Details |
|------|---------|
| 2.1 Resolve org in emailChannel | emailChannel receives `notification` with `organizationId` – fetch org and check `integrations['email-provider'].enabled` |
| 2.2 Skip when disabled | If integration disabled, return `{ success: false, skipped: true, reason: 'integration_disabled' }` |
| 2.3 Optional: ENABLE_EMAIL_NOTIFICATIONS | Keep as global kill switch – if false, never send regardless of integration |

**Flow**:
```
notificationEngine.emitNotification()
  → emailChannel.send({ notification })
  → if !org.integrations['email-provider']?.enabled → skip
  → if !emailService.isConfigured() → skip (log)
  → emailService.sendEmail(...)
```

---

### Phase 3: Configuration UI (Integrations Detail)

**Goal**: When Email Provider is selected, show configuration options.

| Task | Details |
|------|---------|
| 3.1 Extend integration detail API | `GET /api/settings/integrations/email-provider` returns `configStatus: 'configured' | 'not_configured'` (based on env) |
| 3.2 Add config section in IntegrationsSettings | For `email-provider` only: show "Configuration" card with status and link to env/platform config |
| 3.3 Optional: Config form | If config is stored per-org (future), add form for provider, from address, etc. |

**Phase 3 scope**: Minimal – show "Configured via environment" or "Not configured – add AWS SES keys to .env" with link to docs. No credential form in UI initially (security).

---

### Phase 4: UX Enhancements

| Task | Details |
|------|---------|
| 4.1 Status clarity | When disabled: "Email notifications will not be sent." When enabled but not configured: "Configure AWS SES in .env to send emails." |
| 4.2 Test email | Optional: `POST /api/settings/integrations/email-provider/test` – send test email to current user |
| 4.3 Docs | Update README or add `docs/EMAIL_SETUP.md` with SES setup steps |

---

## File Changes Summary

### New Files
- `server/services/emailService.js` – SES + optional SMTP sender
- `docs/EMAIL_SETUP.md` – Setup instructions (optional)

### Modified Files
- `server/services/notificationChannels/emailChannel.js` – Add org check for integration enabled; pass orgId
- `server/services/notificationEngine.js` – Ensure `organizationId` is passed to emailChannel
- `server/controllers/settingsController.js` – For `email-provider`, include `configStatus` in detail response
- `client/src/components/settings/IntegrationsSettings.vue` – Config status display for email-provider

---

## Environment Variables (Reference)

```env
# Email (AWS SES)
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=...
AWS_SES_SECRET_ACCESS_KEY=...
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=LiteDesk CRM
EMAIL_REPLY_TO=support@yourdomain.com

# Optional: SMTP fallback
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=...
# SMTP_PASS=...

# Feature flags
ENABLE_EMAIL_NOTIFICATIONS=true
```

---

## Recommended Implementation Order

1. **Phase 1** – Create emailService.js and verify emailChannel can send (with env configured)
2. **Phase 2** – Add integration gate so enable/disable controls sending
3. **Phase 3** – Add config status to integration detail and minimal UI
4. **Phase 4** – Polish (test email, docs)

---

## Out of Scope (Future)

- **Incoming email** (parse replies, create records) – separate feature
- **Per-org email config** – credentials stored per organization (multi-tenant)
- **Multiple providers** – SendGrid, Mailgun, etc. – extend registry and config model
- **Email templates** – beyond current notification body rendering
