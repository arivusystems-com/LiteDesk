const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  canManageGmailInboxSync,
  canRunGmailInboxSync,
  assertGmailSyncManageAccess,
  assertGmailSyncRunAccess
} = require('../mailboxAccessService');

const admin = { _id: 'u1', role: 'admin', isOwner: false };
const member = { _id: 'u2', role: 'user', isOwner: false };
const owner = { _id: 'u3', role: 'user', isOwner: false };

const personalMb = {
  kind: 'personal',
  ownerUserId: 'u3',
  memberUserIds: []
};

const groupMb = {
  kind: 'group',
  ownerUserId: null,
  memberUserIds: ['u2']
};

describe('mailboxAccessService (R1)', () => {
  it('allows personal owner to manage Gmail sync', () => {
    assert.equal(canManageGmailInboxSync(owner, personalMb), true);
    assert.equal(assertGmailSyncManageAccess(personalMb, owner), null);
  });

  it('denies non-owner from managing personal Gmail sync', () => {
    assert.equal(canManageGmailInboxSync(member, personalMb), false);
    assert.match(assertGmailSyncManageAccess(personalMb, member), /owner/i);
  });

  it('allows admin to manage group Gmail sync', () => {
    assert.equal(canManageGmailInboxSync(admin, groupMb), true);
    assert.equal(assertGmailSyncManageAccess(groupMb, admin), null);
  });

  it('denies member from managing group Gmail sync', () => {
    assert.equal(canManageGmailInboxSync(member, groupMb), false);
    assert.match(assertGmailSyncManageAccess(groupMb, member), /admin/i);
  });

  it('allows group member to run sync but not connect', () => {
    assert.equal(canRunGmailInboxSync(member, groupMb), true);
    assert.equal(assertGmailSyncRunAccess(groupMb, member), null);
    assert.notEqual(assertGmailSyncManageAccess(groupMb, member), null);
  });
});
