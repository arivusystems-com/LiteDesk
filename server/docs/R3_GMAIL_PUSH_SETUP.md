# R3.1 — Gmail Pub/Sub push setup

Realtime inbox uses **SSE** after sync. Pub/Sub triggers sync when Gmail receives mail (optional).

## Prerequisites

1. Google Cloud project with **Gmail API** enabled (same app as OAuth).
2. **Pub/Sub API** enabled.
3. Pub/Sub topic, e.g. `projects/YOUR_PROJECT/topics/litedesk-gmail-inbox`.

## Google Cloud

1. Create topic `litedesk-gmail-inbox`.
2. Grant Gmail publish rights on the topic:
   ```bash
   gcloud pubsub topics add-iam-policy-binding litedesk-gmail-inbox \
     --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
     --role=roles/pubsub.publisher
   ```
3. Create a **push subscription** to your API:
   - URL: `https://YOUR_API_HOST/api/webhooks/email/gmail/push`
   - Optional: set custom header `Authorization: Bearer <GMAIL_PUSH_WEBHOOK_SECRET>`.

## LiteDesk `.env`

```bash
ENABLE_GMAIL_PUSH=true
GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT/topics/litedesk-gmail-inbox
# Optional shared secret (match Pub/Sub push auth header)
GMAIL_PUSH_WEBHOOK_SECRET=your-long-random-secret
# Optional verification token for subscription setup GET
GMAIL_PUBSUB_VERIFY_TOKEN=
GMAIL_WATCH_RENEW_CRON=15 4 * * *
```

## Behaviour

- On **Gmail OAuth connect**, the server calls `users.watch` when `GMAIL_PUBSUB_TOPIC` is set.
- **Pub/Sub POST** decodes `emailAddress` + `historyId`, finds matching mailboxes (all tenant DBs), runs inbox sync.
- **SSE** (`/api/communications/inbox/stream`) refreshes the Inbox UI after sync.
- **Cron** (`GMAIL_WATCH_RENEW_CRON`) renews watches before expiry.
- If push is disabled, **5-minute Gmail poll** (`GMAIL_INBOX_SYNC_CRON`) remains the fallback.

## Reconnect after scope change

After adding `gmail.send`, users must **disconnect and reconnect** Gmail on each mailbox.
