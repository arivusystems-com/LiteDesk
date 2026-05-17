/** Gmail errors that require reconnecting OAuth in Inbox settings. */
export const GMAIL_RECONNECT_CODES = new Set([
  'GMAIL_SEND_SCOPE_REQUIRED',
  'GMAIL_OAUTH_REVOKED',
  'GMAIL_CLIENT_ERROR',
  'GMAIL_REFRESH_TOKEN_MISSING',
  'GMAIL_REFRESH_TOKEN_DECRYPT_FAILED',
  'GMAIL_ENCRYPTION_SECRET_MISSING',
  'MAILBOX_PROVIDER_REQUIRED',
  'WORKSPACE_SMTP_DISABLED',
  'GMAIL_SMTP_ORG_NOT_CONFIGURED',
  'GMAIL_SMTP_NOT_CONNECTED',
  'GMAIL_SMTP_VERIFY_FAILED',
  'GMAIL_SMTP_AUTH_FAILED'
]);

/**
 * @param {object|string|Error|null|undefined} errOrPayload — API body, Error, or code string
 */
export function getGmailErrorCode(errOrPayload) {
  if (!errOrPayload) return '';
  if (typeof errOrPayload === 'string') return errOrPayload;
  return (
    errOrPayload.code ||
    errOrPayload?.response?.data?.code ||
    errOrPayload?.data?.code ||
    ''
  );
}

export function shouldPromptGmailReconnect(errOrPayload) {
  const code = getGmailErrorCode(errOrPayload);
  return code && GMAIL_RECONNECT_CODES.has(code);
}

export function gmailReconnectMessage(errOrPayload, fallback = 'Reconnect Gmail in Inbox settings.') {
  return (
    errOrPayload?.message ||
    errOrPayload?.response?.data?.message ||
    fallback
  );
}
