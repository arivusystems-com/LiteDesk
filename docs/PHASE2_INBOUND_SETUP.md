# Phase 2: Inbound Email Setup Guide

## What's Implemented

- **Reply-To token** (`server/services/replyToTokenService.js`): Opaque HMAC-signed tokens in `replies+{token}@domain` format
- **Outbound**: All sent emails now include a Reply-To address with token for routing replies
- **Webhook** `POST /api/webhooks/email/inbound`: Parses raw MIME, resolves record from token, creates inbound Communication and activity log
- **Activity**: Inbound emails appear in the timeline as "Received email from X"

## Dependencies

```bash
cd server && npm install mailparser
```

## Environment Variables

Add to `.env`:

```env
# Phase 2 Inbound
EMAIL_REPLY_TO_DOMAIN=litedesk.local          # Domain for Reply-To (e.g. replies+token@litedesk.local)
EMAIL_INBOUND_ADDRESS=replies@litedesk.local  # Inbound receiving address
EMAIL_REPLY_TOKEN_SECRET=<generate with: openssl rand -hex 32>
```

Without `EMAIL_REPLY_TOKEN_SECRET`, outbound still works but Reply-To falls back to `EMAIL_REPLY_TO`.

## Testing the Webhook Locally

### Option 1: Raw MIME (message/rfc822)

```bash
curl -X POST http://localhost:3000/api/webhooks/email/inbound \
  -H "Content-Type: message/rfc822" \
  --data-binary @test-email.eml
```

### Option 2: JSON with base64-encoded MIME

```bash
# Encode a .eml file to base64
RAW=$(base64 -i test-email.eml)

curl -X POST http://localhost:3000/api/webhooks/email/inbound \
  -H "Content-Type: application/json" \
  -d "{\"rawMime\": \"$RAW\"}"
```

### Test Email Requirements

The test `.eml` must have a recipient address containing the token, e.g.:

```
To: replies+<payload>.<signature>@litedesk.local
From: sender@example.com
Subject: Test reply
```

To generate a valid token, use the replyToTokenService (e.g. via a small script or the app when sending an email—the Reply-To in the sent email will have the token).

## SES / Production Setup (DevOps)

1. **SES Receiving**: Configure SES to receive at your inbound domain
2. **SNS**: Create an SNS topic; configure SES to publish received emails
3. **Lambda or HTTP**: Either:
   - Lambda subscribes to SNS, fetches raw email from S3, POSTs to your webhook
   - Or use a service like Mailgun/SendGrid that POSTs raw MIME directly to your webhook

The webhook accepts:
- `Content-Type: message/rfc822` with raw MIME body
- `Content-Type: application/json` with `{ "rawMime": "<base64>" }`
