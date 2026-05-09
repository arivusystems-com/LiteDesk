/**
 * HTTP integration tests for /api/communications (real Express stack, JWT, MongoDB).
 *
 * Gating (all required to run substantive tests):
 *   COMMUNICATIONS_HTTP_INTEGRATION=1
 *   JWT_SECRET                  (typically from server/.env)
 *   MONGODB_URI, MONGO_URI, or MONGO_URI_LOCAL (same resolution as scripts)
 *
 * We force DISABLE_SECURITY=false for this file so missing Bearer returns 401
 * (matching production auth semantics), even if server/.env sets DISABLE_SECURITY=true.
 *
 * Run from server/: COMMUNICATIONS_HTTP_INTEGRATION=1 npm run test:communications-http-integration
 * Do not use plain `sudo npm run …`; sudo drops COMMUNICATIONS_HTTP_INTEGRATION unless you preserve env.
 */

const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { test, before, after } = require('node:test');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function resolveMongoUri() {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGO_URI_LOCAL ||
    ''
  );
}

const GATE =
  process.env.COMMUNICATIONS_HTTP_INTEGRATION === '1' &&
  Boolean(resolveMongoUri()) &&
  Boolean(process.env.JWT_SECRET);

function integrationSkipExplanation() {
  const parts = [];
  if (process.env.COMMUNICATIONS_HTTP_INTEGRATION !== '1') {
    parts.push(
      'COMMUNICATIONS_HTTP_INTEGRATION is not "1" — if you used sudo, the flag was dropped (sudo strips env unless you preserve it: omit sudo, run `sudo -E env COMMUNICATIONS_HTTP_INTEGRATION=1 npm run …`, etc.)'
    );
  }
  if (!resolveMongoUri()) parts.push('set MONGODB_URI, MONGO_URI, or MONGO_URI_LOCAL');
  if (!process.env.JWT_SECRET) parts.push('set JWT_SECRET');
  return parts.length ? parts.join(' · ') : 'unknown gate failure';
}

if (!GATE) {
  test(`communications HTTP integration skipped — ${integrationSkipExplanation()}`, () => {
    assert.ok(true);
  });
} else {
  process.env.DISABLE_SECURITY = 'false';

  const express = require('express');
  const jwt = require('jsonwebtoken');
  const mongoose = require('mongoose');

  const communicationsRoutes = require('../routes/communicationsRoutes');
  const Organization = require('../models/Organization');
  const User = require('../models/User');
  const CommunicationThreadMeta = require('../models/CommunicationThreadMeta');
  const ThreadView = require('../models/ThreadView');
  const InboundDeadLetter = require('../models/InboundDeadLetter');

  const mongoUri = resolveMongoUri();

  let server;
  let port;
  let app;
  let token;
  let tokenMember;
  let orgId;
  let userId;
  const threadId = `http-int-thread-${randomUUID()}`;
  let createdOrgDoc;
  let createdUserDoc;
  let createdMemberUserDoc;

  function requestJson(opts) {
    return new Promise((resolve, reject) => {
      const bodyStr =
        opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: opts.path,
          method: opts.method || 'GET',
          headers: {
            ...(opts.token
              ? { Authorization: `Bearer ${opts.token}` }
              : {}),
            ...(bodyStr
              ? {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(bodyStr)
                }
              : {})
          }
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            let body;
            if (raw) {
              try {
                body = JSON.parse(raw);
              } catch {
                body = { _parseError: true, raw };
              }
            } else body = undefined;
            resolve({ status: res.statusCode, body, raw });
          });
        }
      );
      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  before(async () => {
    await mongoose.connect(mongoUri);

    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const slug = `comm-http-int-${suffix}`;

    createdOrgDoc = await Organization.create({
      name: `Communications HTTP Int (${suffix})`,
      slug,
      isTenant: true,
      isActive: true,
      timezone: 'UTC'
    });
    orgId = createdOrgDoc._id;

    createdUserDoc = await User.create({
      organizationId: orgId,
      username: `comm-http-u-${suffix}`,
      email: `comm-http-${suffix}@comm-http-integration.test`,
      password: 'integration-placeholder',
      role: 'owner',
      isOwner: true,
      userType: 'INTERNAL'
    });
    userId = createdUserDoc._id;

    token = jwt.sign(
      { id: userId.toString(), organizationId: orgId.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    createdMemberUserDoc = await User.create({
      organizationId: orgId,
      username: `comm-http-member-${suffix}`,
      email: `comm-http-member-${suffix}@comm-http-integration.test`,
      password: 'integration-placeholder',
      role: 'user',
      isOwner: false,
      userType: 'INTERNAL'
    });

    tokenMember = jwt.sign(
      {
        id: createdMemberUserDoc._id.toString(),
        organizationId: orgId.toString()
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    app = express();
    app.use(express.json());
    app.use('/api/communications', communicationsRoutes);

    await new Promise((resolve, reject) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
      server.once('error', reject);
    });
  });

  after(async () => {
    try {
      if (orgId) {
        await Promise.all([
          CommunicationThreadMeta.deleteMany({ organizationId: orgId }),
          ThreadView.deleteMany({ organizationId: orgId }),
          InboundDeadLetter.deleteMany({ organizationId: orgId })
        ]);
      }
      if (createdMemberUserDoc?._id) {
        await User.deleteOne({ _id: createdMemberUserDoc._id });
      }
      if (createdUserDoc?._id) {
        await User.deleteOne({ _id: createdUserDoc._id });
      }
      if (createdOrgDoc?._id) {
        await Organization.deleteOne({ _id: createdOrgDoc._id });
      }
    } catch (e) {
      console.error('[communications.http.integration] cleanup error:', e.message);
    }

    await new Promise((resolve) => {
      if (server) server.close(() => resolve());
      else resolve();
    });
    await mongoose.disconnect();
  });

  test('PATCH assign without token returns 401', async () => {
    const res = await requestJson({
      method: 'PATCH',
      path: `/api/communications/threads/${encodeURIComponent(threadId)}/assign`,
      body: {}
    });
    assert.equal(res.status, 401);
  });

  test('PATCH assign with token defaults assignee to current user (200)', async () => {
    const res = await requestJson({
      method: 'PATCH',
      path: `/api/communications/threads/${encodeURIComponent(threadId)}/assign`,
      body: {},
      token
    });
    assert.equal(res.status, 200);
    assert.equal(res.body?.success, true);
    assert.equal(
      String(res.body?.data?.assignedToUserId),
      String(userId)
    );
  });

  test('PATCH tags adds tag (200)', async () => {
    const res = await requestJson({
      method: 'PATCH',
      path: `/api/communications/threads/${encodeURIComponent(threadId)}/tags`,
      body: { action: 'add', tag: 'integration-tag' },
      token
    });
    assert.equal(res.status, 200);
    assert.equal(res.body?.success, true);
    assert.ok(Array.isArray(res.body?.data?.tags));
    assert.ok(res.body.data.tags.includes('integration-tag'));
  });

  test('PATCH done marks done then reopen (200)', async () => {
    const doneRes = await requestJson({
      method: 'PATCH',
      path: `/api/communications/threads/${encodeURIComponent(threadId)}/done`,
      body: { done: true },
      token
    });
    assert.equal(doneRes.status, 200);
    assert.equal(doneRes.body?.success, true);
    assert.equal(doneRes.body?.data?.done, true);

    const openRes = await requestJson({
      method: 'PATCH',
      path: `/api/communications/threads/${encodeURIComponent(threadId)}/done`,
      body: { done: false },
      token
    });
    assert.equal(openRes.status, 200);
    assert.equal(openRes.body?.success, true);
    assert.equal(openRes.body?.data?.done, false);
  });

  test('GET inbound dead-letter returns 200', async () => {
    const res = await requestJson({
      method: 'GET',
      path: '/api/communications/inbound/dead-letter?limit=5',
      token
    });
    assert.equal(res.status, 200);
    assert.equal(res.body?.success, true);
    assert.ok(Array.isArray(res.body?.data?.items));
    assert.ok(typeof res.body?.data?.count === 'number');
  });

  test('POST inbound dead-letter replay as non-owner returns 403 (before loading record)', async () => {
    const arbitraryId = new mongoose.Types.ObjectId().toString();
    const res = await requestJson({
      method: 'POST',
      path: `/api/communications/inbound/dead-letter/${arbitraryId}/replay`,
      body: {},
      token: tokenMember
    });
    assert.equal(res.status, 403);
    assert.equal(res.body?.success, false);
    assert.match(
      String(res.body?.message || ''),
      /only workspace owner can replay/i
    );
  });
}
