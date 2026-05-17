'use strict';

/**
 * Per-mailbox Gmail SMTP send (tenant org provides relay host; user provides App Password).
 */

const Mailbox = require('../models/Mailbox');
const Organization = require('../models/Organization');
const { encryptTenantSecret, decryptTenantSecret } = require('../utils/tenantSecretCrypto');
const {
  GMAIL_SMTP_PROVIDER,
  isGmailSmtpProvider,
  applyGmailSmtpDefaults
} = require('../constants/gmailSmtpDefaults');

const EMAIL_PROVIDER_KEY = 'email-provider';

async function getOrganizationGmailSmtpRelay(organizationId) {
  if (!organizationId) return null;
  const org = await Organization.findById(organizationId).select('integrations').lean();
  const raw = org?.integrations?.[EMAIL_PROVIDER_KEY]?.config || {};
  const cfg = applyGmailSmtpDefaults(raw);
  if (!isGmailSmtpProvider(cfg.provider)) return null;
  if (!cfg.smtpHost || !cfg.smtpPort) return null;
  return cfg;
}

function isMailboxGmailSmtpReady(mailboxLean) {
  if (!mailboxLean) return false;
  const enc = String(mailboxLean.smtpOutboundEncryptedAppPassword || '').trim();
  if (!enc) return false;
  const email = String(mailboxLean.emailAddress || mailboxLean.inboxSyncAccountEmail || '')
    .trim()
    .toLowerCase();
  return Boolean(email && email.includes('@'));
}

function resolveMailboxSmtpCredentials(mailboxLean) {
  const enc = mailboxLean.smtpOutboundEncryptedAppPassword;
  if (!enc) return { user: null, pass: null, error: 'GMAIL_SMTP_NOT_CONNECTED' };
  const pass = decryptTenantSecret(enc);
  if (!pass) {
    return { user: null, pass: null, error: 'GMAIL_SMTP_DECRYPT_FAILED' };
  }
  const user = String(mailboxLean.emailAddress || mailboxLean.inboxSyncAccountEmail || '')
    .trim()
    .toLowerCase();
  if (!user) {
    return { user: null, pass: null, error: 'MAILBOX_NO_FROM' };
  }
  return { user, pass, error: null };
}

async function verifyGmailSmtpCredentials(relayConfig, user, pass) {
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: relayConfig.smtpHost,
    port: relayConfig.smtpPort,
    secure: relayConfig.smtpSecure === true,
    auth: { user, pass }
  });
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  } finally {
    try {
      transport.close();
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {object} params
 * @param {string} params.organizationId
 * @param {string} params.mailboxId
 * @param {string} params.emailAddress
 * @param {string} params.appPassword
 */
async function connectMailboxGmailSmtp({ organizationId, mailboxId, emailAddress, appPassword }) {
  const relay = await getOrganizationGmailSmtpRelay(organizationId);
  if (!relay) {
    return {
      ok: false,
      error:
        'Gmail SMTP is not configured for this organization. Ask an admin to set Provider to Gmail SMTP under Settings → Integrations → Email.',
      code: 'GMAIL_SMTP_ORG_NOT_CONFIGURED'
    };
  }

  const email = String(emailAddress || '').trim().toLowerCase();
  const pass = String(appPassword || '').replace(/\s/g, '');
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'A valid email address is required', code: 'INVALID_EMAIL' };
  }
  if (!pass || pass.length < 8) {
    return { ok: false, error: 'Google App Password is required', code: 'INVALID_APP_PASSWORD' };
  }

  const verify = await verifyGmailSmtpCredentials(relay, email, pass);
  if (!verify.ok) {
    return {
      ok: false,
      error: verify.error || 'Gmail SMTP verification failed',
      code: 'GMAIL_SMTP_VERIFY_FAILED'
    };
  }

  await Mailbox.updateOne(
    { _id: mailboxId, organizationId },
    {
      $set: {
        emailAddress: email,
        outboundChannel: 'gmail_smtp',
        smtpOutboundEncryptedAppPassword: encryptTenantSecret(pass),
        smtpOutboundVerifiedAt: new Date(),
        syncStatus: 'connected',
        status: 'active',
        lastInboxSyncError: ''
      }
    }
  );

  return { ok: true, emailAddress: email };
}

async function disconnectMailboxGmailSmtp(mailboxId, organizationId) {
  await Mailbox.updateOne(
    { _id: mailboxId, organizationId },
    {
      $set: {
        outboundChannel: 'none',
        smtpOutboundEncryptedAppPassword: '',
        smtpOutboundVerifiedAt: null
      }
    }
  );
  return { ok: true };
}

/**
 * Send via Gmail SMTP using org relay + mailbox app password.
 * @param {object} doc — Communication lean
 * @param {object} mailboxLean
 * @param {{ replyTo?: string, attachments?: Array<{ filename: string, content: Buffer }> }} [extras]
 */
async function sendViaMailboxGmailSmtp(doc, mailboxLean, extras = {}) {
  const relay = await getOrganizationGmailSmtpRelay(mailboxLean.organizationId);
  if (!relay) {
    return {
      success: false,
      provider: GMAIL_SMTP_PROVIDER,
      error: 'Organization Gmail SMTP is not configured',
      code: 'GMAIL_SMTP_ORG_NOT_CONFIGURED'
    };
  }

  const creds = resolveMailboxSmtpCredentials(mailboxLean);
  if (creds.error) {
    return {
      success: false,
      provider: GMAIL_SMTP_PROVIDER,
      error: 'Mailbox Gmail SMTP credentials are missing or invalid',
      code: creds.error
    };
  }

  const textBody = (doc.body || '').replace(/<[^>]+>/g, '');

  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: relay.smtpHost,
    port: relay.smtpPort,
    secure: relay.smtpSecure === true,
    auth: { user: creds.user, pass: creds.pass }
  });

  try {
    const info = await transport.sendMail({
      from: creds.user,
      to: doc.toAddresses,
      cc: doc.ccAddresses?.length ? doc.ccAddresses : undefined,
      bcc: doc.bccAddresses?.length ? doc.bccAddresses : undefined,
      subject: doc.subject || '',
      html: doc.body || undefined,
      text: textBody || undefined,
      replyTo: extras.replyTo || undefined,
      inReplyTo: doc.inReplyTo || undefined,
      references: doc.references || undefined,
      messageId: doc.messageId || undefined,
      attachments: extras.attachments?.length ? extras.attachments : undefined
    });
    return {
      success: true,
      provider: GMAIL_SMTP_PROVIDER,
      messageId: info.messageId || null,
      threadId: null,
      providerMessageKey: null
    };
  } catch (err) {
    const msg = err?.message || String(err);
    const code = /invalid_grant|authentication|535|534/i.test(msg)
      ? 'GMAIL_SMTP_AUTH_FAILED'
      : 'GMAIL_SMTP_SEND_FAILED';
    return {
      success: false,
      provider: GMAIL_SMTP_PROVIDER,
      error: msg,
      code
    };
  } finally {
    try {
      transport.close();
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  GMAIL_SMTP_PROVIDER,
  getOrganizationGmailSmtpRelay,
  isMailboxGmailSmtpReady,
  connectMailboxGmailSmtp,
  disconnectMailboxGmailSmtp,
  sendViaMailboxGmailSmtp,
  verifyGmailSmtpCredentials
};
