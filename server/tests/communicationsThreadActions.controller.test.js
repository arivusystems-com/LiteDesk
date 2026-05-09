const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../controllers/communicationsController');
const User = require('../models/User');
const CommunicationThreadMeta = require('../models/CommunicationThreadMeta');
const Organization = require('../models/Organization');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function patchMethod(target, key, replacement, t) {
  const original = target[key];
  target[key] = replacement;
  t.after(() => {
    target[key] = original;
  });
}

function mockAuditLogSink(t) {
  patchMethod(Organization, 'findById', async () => ({
    activityLogs: [],
    markModified() {},
    async save() {}
  }), t);
}

test('assignThreadOwner assigns current user by default', async (t) => {
  mockAuditLogSink(t);
  patchMethod(User, 'findOne', () => ({
    select: () => ({ lean: async () => ({ _id: 'user-1' }) })
  }), t);

  let updateArgs = null;
  patchMethod(CommunicationThreadMeta, 'findOneAndUpdate', (...args) => {
    updateArgs = args;
    return {
      lean: async () => ({ assignedToUserId: 'user-1' })
    };
  }, t);

  const req = {
    params: { threadId: 'thread-123' },
    body: {},
    user: { _id: 'user-1', organizationId: 'org-1', email: 'owner@test.dev' }
  };
  const res = createRes();

  await controller.assignThreadOwner(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.data?.assignedToUserId, 'user-1');
  assert.deepEqual(updateArgs?.[0], { organizationId: 'org-1', threadId: 'thread-123' });
});

test('assignThreadOwner rejects assignee outside workspace', async (t) => {
  mockAuditLogSink(t);
  patchMethod(User, 'findOne', () => ({
    select: () => ({ lean: async () => null })
  }), t);
  patchMethod(CommunicationThreadMeta, 'findOneAndUpdate', () => ({
    lean: async () => ({})
  }), t);

  const req = {
    params: { threadId: 'thread-123' },
    body: { assignedToUserId: 'user-999' },
    user: { _id: 'user-1', organizationId: 'org-1', email: 'owner@test.dev' }
  };
  const res = createRes();

  await controller.assignThreadOwner(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body?.success, false);
  assert.match(String(res.body?.message || ''), /Invalid assignee/i);
});

test('updateThreadTags adds normalized tag', async (t) => {
  mockAuditLogSink(t);
  let updateDoc = null;
  patchMethod(CommunicationThreadMeta, 'findOneAndUpdate', (_filter, update) => {
    updateDoc = update;
    return {
      lean: async () => ({ tags: ['needs-follow-up'] })
    };
  }, t);

  const req = {
    params: { threadId: 'thread-234' },
    body: { action: 'add', tag: 'Needs Follow Up' },
    user: { _id: 'user-1', organizationId: 'org-1', email: 'owner@test.dev' }
  };
  const res = createRes();

  await controller.updateThreadTags(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.deepEqual(res.body?.data?.tags, ['needs-follow-up']);
  assert.deepEqual(updateDoc, {
    $addToSet: { tags: 'needs-follow-up' },
    $set: { updatedBy: 'user-1' }
  });
});

test('updateThreadTags removes normalized tag', async (t) => {
  mockAuditLogSink(t);
  let updateDoc = null;
  patchMethod(CommunicationThreadMeta, 'findOneAndUpdate', (_filter, update) => {
    updateDoc = update;
    return {
      lean: async () => ({ tags: [] })
    };
  }, t);

  const req = {
    params: { threadId: 'thread-234' },
    body: { action: 'remove', tag: 'Needs Follow Up' },
    user: { _id: 'user-1', organizationId: 'org-1', email: 'owner@test.dev' }
  };
  const res = createRes();

  await controller.updateThreadTags(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.deepEqual(res.body?.data?.tags, []);
  assert.deepEqual(updateDoc, {
    $pull: { tags: 'needs-follow-up' },
    $set: { updatedBy: 'user-1' }
  });
});
