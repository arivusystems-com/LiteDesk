const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../controllers/communicationsController');
const ThreadView = require('../models/ThreadView');
const InboundDeadLetter = require('../models/InboundDeadLetter');
const inboundEmailQueueService = require('../services/inboundEmailQueueService');
const CommunicationEvent = require('../models/CommunicationEvent');

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

test('markThreadDone returns 400 when threadId is missing', async (t) => {
  let updated = false;
  patchMethod(ThreadView, 'findOneAndUpdate', () => {
    updated = true;
    return { lean: async () => ({ doneAt: new Date() }) };
  }, t);

  const req = {
    params: { threadId: '' },
    body: { done: true },
    user: { _id: 'u1', organizationId: 'org-1' }
  };
  const res = createRes();

  await controller.markThreadDone(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(String(res.body?.message || ''), /threadId is required/i);
  assert.equal(updated, false);
});

test('markThreadDone scopes ThreadView upsert to user and organization', async (t) => {
  let filter = null;
  const doneAt = new Date('2026-05-09T12:00:00.000Z');
  patchMethod(ThreadView, 'findOneAndUpdate', (match) => {
    filter = match;
    return {
      lean: async () => ({ doneAt })
    };
  }, t);

  const req = {
    params: { threadId: 'th-abc' },
    body: { done: true },
    user: { _id: 'user-me', organizationId: 'org-tenant' }
  };
  const res = createRes();

  await controller.markThreadDone(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.data?.threadId, 'th-abc');
  assert.equal(res.body?.data?.done, true);
  const gotDoneAt = res.body?.data?.doneAt;
  const gotMs = gotDoneAt instanceof Date ? gotDoneAt.getTime() : new Date(gotDoneAt).getTime();
  assert.equal(gotMs, doneAt.getTime());
  assert.deepEqual(filter, {
    userId: 'user-me',
    organizationId: 'org-tenant',
    threadId: 'th-abc'
  });
});

test('markThreadDone reopen clears done when threadView has null doneAt', async (t) => {
  patchMethod(ThreadView, 'findOneAndUpdate', () => ({
    lean: async () => ({ doneAt: null })
  }), t);

  const req = {
    params: { threadId: 'th-x' },
    body: { done: false },
    user: { _id: 'u1', organizationId: 'org-1' }
  };
  const res = createRes();

  await controller.markThreadDone(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.data?.done, false);
  assert.equal(res.body?.data?.doneAt, null);
});

test('replayInboundDeadLetter returns 403 for non-owner', async (t) => {
  patchMethod(InboundDeadLetter, 'findOne', async () => ({}), t);

  const req = {
    params: { id: 'dead-1' },
    user: { _id: 'u1', organizationId: 'org-1', isOwner: false, role: 'member' }
  };
  const res = createRes();

  await controller.replayInboundDeadLetter(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(String(res.body?.message || ''), /only workspace owner/i);
});

test('replayInboundDeadLetter returns 404 when dead-letter not found', async (t) => {
  patchMethod(InboundDeadLetter, 'findOne', async () => null, t);

  const req = {
    params: { id: 'missing-id' },
    user: {
      _id: 'u1',
      organizationId: 'org-1',
      isOwner: true,
      role: 'owner'
    }
  };
  const res = createRes();

  await controller.replayInboundDeadLetter(req, res);

  assert.equal(res.statusCode, 404);
  assert.match(String(res.body?.message || ''), /not found/i);
});

test('replayInboundDeadLetter returns 400 when raw MIME was not stored', async (t) => {
  patchMethod(InboundDeadLetter, 'findOne', async () => ({
    _id: 'dl-1',
    rawMimeBase64: null,
    replayCount: 0,
    async save() {}
  }), t);

  const req = {
    params: { id: 'dl-1' },
    user: {
      _id: 'u1',
      organizationId: 'org-1',
      isOwner: true,
      role: 'owner'
    }
  };
  const res = createRes();

  await controller.replayInboundDeadLetter(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(String(res.body?.message || ''), /no stored raw mime/i);
});

test('replayInboundDeadLetter returns 422 when processInboundJob fails', async (t) => {
  patchMethod(inboundEmailQueueService, 'processInboundJob', async () => {
    throw new Error('parse_failed');
  }, t);

  const doc = {
    _id: 'dl-2',
    rawMimeBase64: 'dGVzdA==',
    replayCount: 0,
    async save() {}
  };
  patchMethod(InboundDeadLetter, 'findOne', async () => doc, t);

  const req = {
    params: { id: 'dl-2' },
    user: {
      _id: 'u1',
      organizationId: 'org-1',
      isOwner: true,
      role: 'owner'
    }
  };
  const res = createRes();

  await controller.replayInboundDeadLetter(req, res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body?.success, false);
  assert.match(String(res.body?.message || ''), /remains open/i);
  assert.equal(res.body?.replayCount, 1);
  assert.match(String(res.body?.error || ''), /parse_failed/);
});

test('replayInboundDeadLetter returns 200 and resolves dead-letter on success', async (t) => {
  patchMethod(inboundEmailQueueService, 'processInboundJob', async () => ({
    communicationId: 'comm-99',
    threadStrategy: 'in-reply-to'
  }), t);

  patchMethod(CommunicationEvent, 'create', async () => ({ _id: 'evt-1' }), t);

  const doc = {
    _id: 'dl-3',
    rawMimeBase64: 'dGVzdA==',
    replayCount: 0,
    resolvedAt: null,
    async save() {}
  };
  patchMethod(InboundDeadLetter, 'findOne', async () => doc, t);

  const req = {
    params: { id: 'dl-3' },
    user: {
      _id: 'u1',
      organizationId: 'org-1',
      isOwner: true,
      role: 'owner'
    }
  };
  const res = createRes();

  await controller.replayInboundDeadLetter(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.body?.data?.replayed, true);
  assert.equal(res.body?.data?.communicationId, 'comm-99');
  assert.equal(res.body?.data?.threadStrategy, 'in-reply-to');
  assert.ok(doc.resolvedAt instanceof Date);
});
