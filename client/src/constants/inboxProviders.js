/**
 * Inbox provider registry — extensible for Gmail, Microsoft Graph, Yahoo, IMAP, etc.
 * Backend wiring: `google` today; others are UI placeholders until Phase 6+.
 */

/** @typedef {'available' | 'coming_soon' | 'disabled'} InboxProviderStatus */

/**
 * @typedef {object} InboxProviderDefinition
 * @property {string} id — matches Mailbox.inboxProvider when connected
 * @property {string} name
 * @property {string} [subtitle]
 * @property {string} integrationLabel — e.g. "Google OAuth + Gmail API"
 * @property {InboxProviderStatus} status
 * @property {'letter' | 'icon'} iconType
 * @property {string} [iconLetter]
 * @property {string} [iconBgClass]
 * @property {string} [iconStyle] — inline CSS for brand marks
 * @property {string} [emailPlaceholder]
 * @property {string} [connectHint]
 */

/** @type {InboxProviderDefinition[]} */
export const INBOX_PROVIDERS = [
  {
    id: 'google',
    name: 'Gmail',
    subtitle: 'Google Workspace',
    integrationLabel: 'Google OAuth + Gmail API',
    status: 'available',
    iconType: 'letter',
    iconLetter: 'G',
    iconStyle:
      'background: conic-gradient(from -45deg, #ea4335, #fbbc05, #34a853, #4285f4, #ea4335)',
    emailPlaceholder: 'you@gmail.com',
    connectHint: 'Used as a hint on Google’s sign-in screen. Use the account you want to sync.'
  },
  {
    id: 'microsoft',
    name: 'Outlook',
    subtitle: 'Microsoft 365',
    integrationLabel: 'Microsoft Graph API',
    status: 'coming_soon',
    iconType: 'letter',
    iconLetter: 'O',
    iconBgClass: 'bg-[#0078d4]'
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    integrationLabel: 'Yahoo Mail API',
    status: 'coming_soon',
    iconType: 'letter',
    iconLetter: 'Y',
    iconBgClass: 'bg-[#6001d2]'
  },
  {
    id: 'imap',
    name: 'IMAP',
    subtitle: 'Any provider',
    integrationLabel: 'IMAP / SMTP',
    status: 'coming_soon',
    iconType: 'icon'
  }
];

export function getInboxProvider(id) {
  return INBOX_PROVIDERS.find((p) => p.id === id) || null;
}

export function getAvailableInboxProviders() {
  return INBOX_PROVIDERS.filter((p) => p.status === 'available');
}

/**
 * Whether a serialized personal mailbox is connected for this provider.
 * @param {object | null | undefined} mailbox
 * @param {string} providerId
 */
export function isMailboxConnectedForProvider(mailbox, providerId) {
  if (!mailbox) return false;
  if (providerId === 'google') {
    return mailbox.gmailInboxSync?.connected === true;
  }
  return false;
}
