# Google Workspace → LiteDesk inbound webhook

Use this when **catch-all** delivers mail to `inbox@reply.arivusystems.com` and LiteDesk receives it via **`POST /api/webhooks/email/inbound`** (not Gmail OAuth on that mailbox).

## Flow

```
Customer reply → reply+TOKEN@reply.arivusystems.com
  → Workspace catch-all → inbox@reply.arivusystems.com
  → Relay (Apps Script / worker) POSTs raw MIME
  → LiteDesk parses token → email_threads → tenant DB → Inbox UI
```

You do **not** need to connect `inbox@reply…` as a CRM mailbox when using this path.

---

## 1. LiteDesk prerequisites

### `.env` (already set)

```env
EMAIL_REPLY_TO_DOMAIN=reply.arivusystems.com
EMAIL_INBOUND_ADDRESS=inbox@reply.arivusystems.com
EMAIL_INBOUND_WEBHOOK_SECRET=<your-secret>
EMAIL_INBOUND_REQUIRE_REPLY_TOKEN=true
EMAIL_REPLY_USE_SHORT_TOKEN=true
```

### Redis + API

- `REDIS_URL` must be reachable so inbound jobs queue (otherwise sync fallback still works, slower).
- API must be on **HTTPS** with a public hostname (Workspace relay cannot call `localhost`).

### Health check

```bash
curl -s https://YOUR_API_HOST/api/webhooks/email/inbound/health | jq
```

Expect:

- `webhookSecretConfigured: true`
- `replyTokenSecretConfigured: true`
- `inboundCatchAllAddress: "inbox@reply.arivusystems.com"`
- `requireReplyToken: true`
- `queueAvailable: true` (if Redis is up)

---

## 2. Webhook contract

| Item | Value |
|------|--------|
| **URL** | `https://YOUR_API_HOST/api/webhooks/email/inbound` |
| **Method** | `POST` |
| **Auth** | `Authorization: Bearer <EMAIL_INBOUND_WEBHOOK_SECRET>` |
| **Alt auth** | `X-Email-Inbound-Webhook-Token: <secret>` |
| **Body (preferred)** | Raw MIME, `Content-Type: message/rfc822` |
| **Body (alt)** | JSON `{ "rawMime": "<base64>" }`, `Content-Type: application/json` |
| **Success** | `202 { "success": true, "queued": true }` (async) or `200` with `communicationId` (sync) |
| **Auth failure** | `401` |
| **Bad / missing token in MIME** | `400` when `EMAIL_INBOUND_REQUIRE_REPLY_TOKEN=true` |

**Do not** rely on `X-Organization-Id` in production — routing uses `reply+…` / `replies+…` in To/Cc/Bcc.

---

## 3. Google Apps Script relay (recommended for Workspace)

Run as the **`inbox@reply.arivusystems.com`** user (or a delegated admin script with domain-wide Gmail access).

### 3.1 Create the script

1. Sign in as `inbox@reply.arivusystems.com`.
2. Open [script.google.com](https://script.google.com) → **New project**.
3. **Project settings** → enable **Show "appsscript.json" manifest file"**.
4. **Services** → add **Gmail API** (identifier `Gmail`, v1).
5. Paste the script below and set **Script properties** (Project settings → Script properties):

| Property | Example |
|----------|---------|
| `LITEDESK_INBOUND_URL` | `https://api.arivusystems.com/api/webhooks/email/inbound` |
| `LITEDESK_INBOUND_SECRET` | same as `EMAIL_INBOUND_WEBHOOK_SECRET` |
| `PROCESSED_LABEL` | `litedesk-processed` (optional) |

### 3.2 Script

```javascript
const PROPS = PropertiesService.getScriptProperties();

function processInboxToLiteDesk() {
  const url = PROPS.getProperty('LITEDESK_INBOUND_URL');
  const secret = PROPS.getProperty('LITEDESK_INBOUND_SECRET');
  const labelName = PROPS.getProperty('PROCESSED_LABEL') || 'litedesk-processed';

  if (!url || !secret) {
    throw new Error('Set LITEDESK_INBOUND_URL and LITEDESK_INBOUND_SECRET script properties');
  }

  const label = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);
  const threads = GmailApp.search('in:inbox -label:' + labelName, 0, 20);

  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      if (msg.getLabels().indexOf(labelName) >= 0) return;

      const id = msg.getId();
      const raw = Gmail.Users.Messages.get('me', id, { format: 'raw' }).raw;
      const mimeBytes = Utilities.base64DecodeWebSafe(raw);
      const mimeString = Utilities.newBlob(mimeBytes).getDataAsString();

      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'message/rfc822',
        headers: { Authorization: 'Bearer ' + secret },
        payload: mimeString,
        muteHttpExceptions: true
      });

      const code = res.getResponseCode();
      if (code === 200 || code === 202) {
        msg.addLabel(label);
      } else {
        console.error('LiteDesk inbound failed', code, res.getContentText());
      }
    });
  });
}
```

### 3.3 Trigger

1. **Triggers** → Add trigger → `processInboxToLiteDesk` → **Time-driven** → every **1** or **5** minutes.
2. First run: authorize Gmail + external URL access.

### 3.4 Limits

- Apps Script quotas apply (daily UrlFetch, runtime).
- For high volume, move relay to Cloud Run / Lambda + Gmail Pub/Sub instead.

---

## 4. Test without waiting for mail

### Local (with secret)

```bash
curl -s http://localhost:3000/api/webhooks/email/inbound/health | jq

curl -X POST http://localhost:3000/api/webhooks/email/inbound \
  -H "Content-Type: message/rfc822" \
  -H "Authorization: Bearer YOUR_EMAIL_INBOUND_WEBHOOK_SECRET" \
  --data-binary @test-reply.eml
```

`test-reply.eml` must include a valid recipient, e.g.:

```
To: reply+<token-from-sent-crm-email>@reply.arivusystems.com
From: customer@example.com
Subject: Re: Your message
Content-Type: text/plain

Thanks, this is a test reply.
```

Get `<token>` from a CRM email you sent (Reply-To header) or from `email_threads` in MongoDB.

### End-to-end

1. Send email from CRM to yourself.
2. Copy **Reply-To** address from the received message.
3. Reply from an external client to that address.
4. Confirm message in `inbox@reply…` (Gmail).
5. After relay runs (≤5 min), confirm thread in CRM Inbox.

---

## 5. Production checklist

- [ ] API on HTTPS; firewall allows relay egress to `/api/webhooks/email/inbound`
- [ ] `EMAIL_INBOUND_WEBHOOK_SECRET` matches relay Bearer token
- [ ] Redis running; `queueAvailable: true` in health
- [ ] Apps Script trigger active; test email labeled `litedesk-processed`
- [ ] `EMAIL_INBOUND_REQUIRE_REPLY_TOKEN=true`
- [ ] Monitor dead letters / server logs for `InboundDispatchError`

---

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401` | Secret mismatch between relay and `.env` |
| `400` Unknown CRM reply thread token | Reply-To token not in To/Cc; or outbound never registered `email_threads` |
| `400` No valid Reply-To token | Enable token in test MIME; or temporarily `EMAIL_INBOUND_REQUIRE_REPLY_TOKEN=false` for debugging only |
| Mail in Google, not CRM | Trigger not running; wrong URL; script not authorized |
| `queued: true` but no UI update | Redis worker not running; check inbound queue consumer |

---

## Related

- [PHASE2_INBOUND_SETUP.md](../../docs/PHASE2_INBOUND_SETUP.md)
- [R0_EMAIL_INFRA_RUNBOOK.md](./R0_EMAIL_INFRA_RUNBOOK.md)
- [CRM_EMAIL_ENTERPRISE_ARCHITECTURE.md](./CRM_EMAIL_ENTERPRISE_ARCHITECTURE.md)
