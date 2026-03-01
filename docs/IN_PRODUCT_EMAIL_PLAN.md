# In-Product Email: Send & Receive Plan

## Executive Summary

LiteDesk currently sends **notification emails** (alerts, digests) via `emailService` + `emailChannel`. This plan extends that foundation to support **in-product email**—sending and receiving emails from within the app, tied to records (People, Organizations, Deals, Tasks, etc.).

**Scope:**
- **Send**: Compose and send emails from record context; log them as activity
- **Receive**: Inbound email parsing; associate replies with records; display threads in activity

---

## Current State

### What Exists
| Component | Status |
|-----------|--------|
| `emailService.js` | ✅ Sends via AWS SES / SMTP |
| `emailChannel.js` | ✅ Notification emails (alerts, digests) |
| People.email, User.email | ✅ Stored |
| Activity logs (People, Organization, Task) | ✅ Generic audit trail |
| Notes, attachments on records | ✅ File storage and linking |

### What’s Missing
- **Compose UI**: No “Email” / “Send email” action from record pages
- **Communication model**: No `Email` or `Communication` entity storing sent/received emails
- **Reply-to addressing**: No unique addresses for threading / inbound routing
- **Inbound ingestion**: No webhook or IMAP to receive emails

---

## Part 1: Sending Emails Inside the Product

### 1.1 User Stories

| # | Story |
|---|-------|
| S1 | As a user, I can click “Email” on a Person record and compose an email to that person’s email address |
| S2 | As a user, I can send an email from an Organization record (to a chosen contact) |
| S3 | As a user, I can send an email from a Deal record (to primary contact or chosen person) |
| S4 | Sent emails are logged as activity on the record |
| S5 | I can optionally attach files from my record to the email |

### 1.2 Data Model: Communications

Introduce a **Communication** (or Email) model for all in-product emails.

```
Communication
├── organizationId
├── kind: 'email'                    // Future: 'sms', 'whatsapp'
├── direction: 'outbound' | 'inbound'
├── threadId                        // Phase 1: first outbound → threadId = communication._id; replies inherit
├── parentCommunicationId (nullable)  // Reply chain: points to exact message being replied to. threadId = group; parentCommunicationId = hierarchy. Add now—expensive later.
├── subject
├── body (text or HTML)
├── fromAddress, toAddresses, ccAddresses, bccAddresses
├── messageId (RFC Message-ID we put in header; used for In-Reply-To / References matching)
├── inReplyTo, references (for threading)
├── externalMessageId               // SES result.messageId (outbound). CRITICAL: store now. Phase 2 inbound In-Reply-To/References reference original Message-ID; without this, threading is messy.
├── sentAt / receivedAt
├── status: 'sending' | 'sent' | 'failed' | 'delivered' | 'opened' | 'bounced'  // Phase 1: sending (insert-first), then sent/failed. Later: SES webhooks
├── relatedTo: { moduleKey, recordId }   // Polymorphic link
├── sentByUserId
├── attachments: [{ fileName, fileType, storagePath }]
├── metadata: { provider }
```

**Alternatives:**
- **Option A**: New `Communication` model (generic, future-proof)
- **Option B**: Embed in `activityLogs` with `action: 'email_sent'` and a `communication` sub-document
- **Option C**: App-specific models (`DealEmail`, `PersonEmail`)

**Recommendation**: Option A (Communication model). Gives a single place for threading, search, and future channels.

### 1.3 API Design: Send Email

```
POST /api/communications/email
{
  "relatedTo": { "moduleKey": "people", "recordId": "..." },
  "to": ["contact@example.com"],
  "cc": [],
  "bcc": [],
  "subject": "...",
  "body": "<p>...</p>",     // or text
  "attachments": [{ "fileId": "..." }]
}
```

**Flow (safer: Insert → Send → Update):**
1. Validate `relatedTo` and user has access
2. Resolve sender: `req.user.email` or `EMAIL_FROM`
3. Generate RFC `Message-ID` for header; set `In-Reply-To`, `References` if replying
4. **Insert** `Communication` with `direction: 'outbound'`, `status: 'sending'`, `threadId`, `parentCommunicationId` (if reply). Record exists before send.
5. `emailService.sendEmail(...)` → get `result.messageId` (SES MessageId)
6. **Update** `Communication`: `status: 'sent' | 'failed'`, `externalMessageId: result.messageId`, `sentAt`
7. Add activity log to related record

**Why Insert-first?** If send succeeds but DB write fails, you lose the email record. Insert → Send → Update avoids that: record exists; worst case we update to `failed`. Also makes async migration easier (record created; queue job handles send + update).

**Critical**: Save `result.messageId` as `externalMessageId` on update. Phase 2 inbound uses `In-Reply-To` / `References`; without storing outbound IDs, threading breaks.

### 1.4 UI Placement

| Surface | Entry Point |
|---------|-------------|
| Person record | “Email” button in header or activity section |
| Organization record | “Email contact” → pick contact from org |
| Deal record | “Email” → pick primary contact |
| Task record | “Email assignee” or “Email related contact” |

**Compose UX:**
- Modal or slide-over composer (similar to Gmail compose)
- **To field**: Pre-filled from record’s primary email, **editable**. CRM users often email alternative addresses (personal, second work address).
- Subject, body (rich text or plain)
- Attach files (from record attachments or upload)
- “Send” → call API → close and refresh activity

### 1.5 Dependencies

- Reuse `emailService.sendEmail()` (already has `to`, `subject`, `text`, `html`, `replyTo`)
- Add `Message-ID`, `In-Reply-To`, `References` for threading (SES / nodemailer support these)
- **Reply-To**: Use a routable address for inbound (see Part 2)
- **Inbound (Phase 2)**: [mailparser](https://github.com/nodemailer/mailparser) — use for raw MIME parsing; do not build custom parsing

---

## Part 2: Receiving Emails Inside the Product

### 2.1 User Stories

| # | Story |
|---|-------|
| R1 | When someone replies to an email I sent from LiteDesk, the reply appears in the record’s activity |
| R2 | I can see an email thread (sent + received) in chronological order |
| R3 | Inbound emails can create or update records (e.g. auto-create Person from new sender) — future |

### 2.2 Inbound Routing Strategies

| Approach | Pros | Cons |
|----------|------|------|
| **A. Unique address per record** (`deals-{id}@inbound.litedesk.com`) | Direct association | Many addresses, DNS/SES config |
| **B. Single address + token in subject** (`inbound@litedesk.com` + `Re: [LD:people:abc123] Original subject`) | One address | Visible token, subject parsing |
| **C. Single address + opaque Reply-To token** (HMAC-signed payload) | One address, clean subject, no enumeration | Token encode/decode logic |
| **D. Shared address + ML/header parsing** | Flexible | Complex, less reliable |

**Recommendation for MVP**: **C — Opaque token (security must)**

- Single inbound address: `replies@yourdomain.com`
- **Do NOT encode raw IDs.** Use opaque token: `replies+Xk29as9Kz@domain.com` (example)
- Token payload (server-side only): `{ orgId, moduleKey, recordId, signature }`
- Signed with HMAC secret. Prevents enumeration—attackers cannot guess or enumerate valid addresses.

**Token format (encode on send, decode on inbound):**
1. Payload: `{ orgId, moduleKey, recordId }`
2. Sign: `signature = HMAC(secret, JSON.stringify(payload))`
3. Encode: base64url or similar → `replies+{encoded}@domain.com`
4. Decode: verify signature, parse payload → resolve record

### 2.3 Inbound Ingestion Options

| Option | Description | Effort |
|--------|-------------|--------|
| **AWS SES Receiving** | SES receives → SNS → Lambda/Webhook → your API | Medium |
| **Mailgun Inbound** | Webhook on receive | Low (if using Mailgun) |
| **SendGrid Inbound Parse** | Webhook on receive | Low (if using SendGrid) |
| **IMAP polling** | Cron job polls inbox | Medium, more infra |
| **Cloudmailin, Mailjet, etc.** | Third-party inbound services | Low |

**Recommendation**: **AWS SES Receiving** (you already use SES for sending)
- Configure SES to receive at `inbound@yourdomain.com`
- SNS topic → Lambda or direct HTTP to your API
- Parse raw MIME with **mailparser** (npm package); extract body, attachments, headers

### 2.4 Inbound Flow

```
1. Email arrives at inbound@yourdomain.com
2. SES/SNS/Lambda forwards raw MIME to: POST /api/webhooks/email/inbound
3. Parse raw MIME with mailparser (npm: mailparser) — From, To, Subject, In-Reply-To, References, Body, Attachments
4. Resolve target record from Reply-To token or References header
5. Create Communication (direction: 'inbound')
6. Add activity log to related record
7. Optionally notify assigned user
```

**Inbound parsing**: Use [mailparser](https://github.com/nodemailer/mailparser) for raw MIME. Do not build custom parsing logic.

### 2.5 Threading

- `Message-ID`: Unique per sent email
- `In-Reply-To`: Parent’s Message-ID
- `References`: Chain of Message-IDs for full thread
**Fields (add in Phase 1):**
- `threadId` = group (all messages in same thread)
- `parentCommunicationId` = exact reply chain (nullable; points to message being replied to). Without it: can group, cannot reconstruct hierarchy. Costs nothing now; expensive later.

**Thread chain:** `Message-ID` / `In-Reply-To` / `References` in headers. UI: Query by `relatedTo` + `threadId`; sort by `sentAt`/`receivedAt`

---

## Part 3: Implementation Phases

### Phase 1: Send Only (No Inbound)
**Goal**: Users can send emails from record pages; they appear in activity.

| Task | Owner | Notes |
|------|-------|-------|
| 1.1 Add `Communication` model | Backend | Schema, indexes. Include `status` (sending / sent / failed), `externalMessageId`, `threadId`, `parentCommunicationId`. Future-proof for delivered, opened, bounced |
| 1.2 `POST /api/communications/email` | Backend | Insert first (`status: 'sending'`) → send → update (`status`, `externalMessageId`). Never Send-then-Insert. |
| 1.3 Add activity log entry | Backend | `action: 'email_sent'`, link to Communication |
| 1.4 Email compose modal (Vue) | Frontend | To (pre-filled, **editable**), subject, body, send |
| 1.5 “Email” entry point on Person record | Frontend | Header or activity section |
| 1.6 Show sent emails in activity | Frontend | Render Communication in timeline, show status |

**Indexes (operational):** Inbound resolution must be fast.
- `{ organizationId, relatedTo.moduleKey, relatedTo.recordId, threadId }` — list by record
- `{ externalMessageId }` — inbound lookup by provider ID
- `{ messageId }` — inbound lookup by In-Reply-To / References
- `{ parentCommunicationId }` — reply chain traversal

**Attachment size guardrail:** Define limits upfront. Otherwise users attach 50MB PDFs, SES rejects, you debug later.
- Max per file (e.g. 10MB)
- Max total per email (e.g. 25MB)
- Validate before send; return clear error to user

**Architecture note**: Keep send flow simple (`POST → send → save`) but design so it can later become `POST → save draft → queue job → send async` without major refactors.

**Out of scope**: Inbound, threading, Reply-To encoding

### Phase 2: Reply-To + Inbound Foundation
**Goal**: Sent emails use a Reply-To that routes replies back.

| Task | Owner | Notes |
|------|-------|-------|
| 2.1 Configure Reply-To format | Backend | Opaque token: `replies+{base64(orgId,moduleKey,recordId,signature)}@domain`. HMAC-signed. No raw IDs. |
| 2.2 Set Reply-To in `emailService.sendEmail()` | Backend | Per-email, not global |
| 2.3 SES Inbound setup | DevOps | Receiving rule, SNS topic |
| 2.4 Webhook `POST /api/webhooks/email/inbound` | Backend | Use **mailparser** to parse raw MIME; auth/validate |
| 2.5 Resolve record from Reply-To token | Backend | Verify HMAC signature; decode token payload → orgId, moduleKey, recordId |
| 2.6 Create inbound Communication | Backend | direction: 'inbound'; resolve parent from In-Reply-To → set `parentCommunicationId`, inherit `threadId` |
| 2.7 Add inbound to activity | Backend | Same pattern as outbound |

### Phase 3: Threading & UX Polish
**Goal**: Full thread view, better UX.

| Task | Owner | Notes |
|------|-------|-------|
| 3.1 Thread aggregation API | Backend | Group by threadId; use parentCommunicationId for reply hierarchy |
| 3.2 Thread view in activity | Frontend | Expandable “Email thread (3 messages)” |
| 3.3 “Email” on Organization, Deal | Frontend | Extend to more record types |
| 3.4 Attachments in compose | Frontend | Reuse existing file upload |
| 3.5 Email templates (optional) | Backend | Predefined templates for common emails |

### Phase 4: Extensions (Implemented)
- **Unread indicator** ✅ Use `lastViewedAt` (per user) via `ThreadView` model. Unread = `lastMessageDirection === 'inbound' && lastActivityAt > lastViewedAt`. `PATCH /threads/:threadId/view` marks viewed. Badge shown in ActivityTimeline.
- **SES webhooks** ✅ `POST /api/webhooks/email/ses-events` receives SNS notifications. Updates Communication status: `delivered`, `bounced`, `complained`. Handles SubscriptionConfirmation.
- **Auto-create Person** ✅ When inbound email arrives from unknown sender, creates Person (Lead) with email + name from From header. Requires org to have at least one user.
- **Email-to-Task** ✅ `POST /api/communications/:communicationId/create-task` creates task from email. "Create task" button per message in thread view.
- **Async send queue**: `save draft → queue job → send` when volume or reliability demands it — *deferred*
- **BCC monitoring / multi-address per org** — *deferred*

---

## Part 4: Security & Privacy

| Concern | Mitigation |
|---------|------------|
| **Inbound spoofing** | Verify webhook signature (SES/SNS); validate sender domain |
| **Token enumeration** | **Must use opaque tokens.** Payload `{ orgId, moduleKey, recordId }` + HMAC signature. Never expose raw IDs in Reply-To. |
| **PII in logs** | Avoid logging full bodies; log only IDs and metadata |
| **Access control** | Enforce org isolation; user must have access to `relatedTo` record |
| **Bounce handling** | SES SNS notifications for bounces/complaints; soft-disable sending if needed |

---

## Part 5: Environment & Config

```env
# Existing
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com   # or use dynamic per-email

# New (Phase 2)
EMAIL_INBOUND_ADDRESS=inbound@yourdomain.com
EMAIL_INBOUND_WEBHOOK_SECRET=...          # For webhook signature verification
EMAIL_REPLY_TO_DOMAIN=yourdomain.com      # For plus-addressing (opaque token)
EMAIL_REPLY_TOKEN_SECRET=...              # HMAC secret for token signing (never expose)
```

---

## Part 6: Open Questions

1. **Reply-To format**: Opaque HMAC-signed token (decided). Open: base64 vs custom encoding for token string.
2. **Inbound provider**: SES only, or add Mailgun/SendGrid for simpler inbound?
3. **Record coverage**: Person first, or Person + Organization + Deal in Phase 1?
4. **Templates**: Include in Phase 1 or defer?
5. **Attachments size limits**: Align with existing file upload limits?

---

## Summary

| Phase | Scope | Est. Effort |
|-------|-------|-------------|
| **1** | Send from Person; log in activity | 1–2 weeks |
| **2** | Reply-To routing; inbound ingestion | 1–2 weeks |
| **3** | Threading; more record types; polish | 1 week |
| **4** | Extensions (auto-create, templates) | Backlog |

**Recommended start**: Phase 1—Communication model + send API + Person compose UI. This delivers immediate value and sets up the data model for Phase 2 inbound.
