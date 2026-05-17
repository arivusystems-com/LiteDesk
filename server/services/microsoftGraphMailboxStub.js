'use strict';

/**
 * Microsoft Graph mailbox integration (Phase 2).
 * Shared + personal Outlook / Microsoft 365 OAuth sync and send.
 *
 * @see server/docs/CRM_EMAIL_ENTERPRISE_ARCHITECTURE.md
 */

const NOT_IMPLEMENTED = 'Microsoft Graph mailbox sync is not implemented yet (Phase 2).';

async function connectSharedMailbox() {
  throw new Error(NOT_IMPLEMENTED);
}

async function connectPersonalMailbox() {
  throw new Error(NOT_IMPLEMENTED);
}

async function syncInbox() {
  throw new Error(NOT_IMPLEMENTED);
}

async function syncSent() {
  throw new Error(NOT_IMPLEMENTED);
}

async function sendMessage() {
  throw new Error(NOT_IMPLEMENTED);
}

module.exports = {
  NOT_IMPLEMENTED,
  connectSharedMailbox,
  connectPersonalMailbox,
  syncInbox,
  syncSent,
  sendMessage
};
