/**
 * Shared access rules for mailboxes (threads, outbound, admin edits).
 */

function isTenantAdmin(user) {
  if (!user) return false;
  if (user.isOwner) return true;
  const r = String(user.role || '').toLowerCase();
  return r === 'admin' || r === 'platform_admin';
}

/**
 * Who may see threads scoped to this mailbox in workspace inbox / APIs.
 * - personal: owner or tenant admin
 * - group: all org users if memberUserIds is empty; else listed members + admins
 */
function canUserAccessMailboxThreads(user, mailboxLean) {
  if (!mailboxLean || !user) return false;
  if (isTenantAdmin(user)) return true;
  if (mailboxLean.kind === 'personal') {
    return String(mailboxLean.ownerUserId || '') === String(user._id);
  }
  const members = mailboxLean.memberUserIds || [];
  if (!Array.isArray(members) || members.length === 0) {
    return true;
  }
  return members.some((id) => String(id) === String(user._id));
}

module.exports = {
  isTenantAdmin,
  canUserAccessMailboxThreads
};
