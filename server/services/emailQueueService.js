/**
 * Email Queue Service (Async send)
 * Uses Bull + Redis when available. Falls back to sync send when not.
 */

const path = require('path');
const fs = require('fs');
const { classifyCommunicationFailure } = require('../platform/communication/domain/failureTaxonomy');
let emailQueue = null;

function resolveSafeReplyToAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(raw)) return undefined;
  return raw;
}

const COMMUNICATION_QUEUE_NAMES = Object.freeze({
  EMAIL_SEND: 'communication:email:send'
});

const COMMUNICATION_RETRY_PROFILES = Object.freeze({
  EMAIL_SEND: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200
  }
});

function getLegacyRedisUrl() {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || 6379;
  const pass = process.env.REDIS_PASSWORD;
  if (pass) {
    return `redis://:${encodeURIComponent(pass)}@${host}:${port}`;
  }
  return `redis://${host}:${port}`;
}

function isRedisConfigured() {
  return !!(
    process.env.REDIS_URL ||
    process.env.REDIS_HOST ||
    process.env.REDIS_PORT
  );
}

function initQueue() {
  if (emailQueue !== null) return emailQueue;
  if (!isRedisConfigured()) {
    emailQueue = false;
    return false;
  }
  try {
    const Bull = require('bull');
    const redisUrl = process.env.REDIS_URL || getLegacyRedisUrl();
    const isTls = redisUrl.startsWith('rediss://');
    /**
     * ioredis (used by Bull) + Atlas/Upstash: use TLS and disable ready check friction.
     */
    const opts = {
      defaultJobOptions: {
        ...COMMUNICATION_RETRY_PROFILES.EMAIL_SEND
      },
    };
    if (isTls) {
      opts.redis = {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: { rejectUnauthorized: true },
      };
    } else {
      opts.redis = {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      };
    }
    emailQueue = new Bull(COMMUNICATION_QUEUE_NAMES.EMAIL_SEND, redisUrl, opts);
    emailQueue.on('error', (err) => console.error('[emailQueue] Redis error:', err.message));
    return emailQueue;
  } catch (err) {
    console.error('[emailQueue] Failed to init:', err.message);
    emailQueue = false;
    return false;
  }
}

/**
 * Add send job to queue. Returns true if queued, false if queue unavailable.
 */
function enqueueSend(communicationId) {
  const queue = initQueue();
  if (!queue) return false;
  try {
    queue.add(
      { communicationId },
      {
        jobId: `email-${communicationId}`,
        ...COMMUNICATION_RETRY_PROFILES.EMAIL_SEND
      }
    );
    return true;
  } catch (err) {
    console.error('[emailQueue] Enqueue failed:', err.message);
    return false;
  }
}

async function getQueueStats() {
  const queue = initQueue();
  if (!queue) {
    return {
      queueAvailable: false,
      queueName: COMMUNICATION_QUEUE_NAMES.EMAIL_SEND,
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0
    };
  }
  try {
    const [waiting, active, delayed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getFailedCount()
    ]);
    return {
      queueAvailable: true,
      queueName: COMMUNICATION_QUEUE_NAMES.EMAIL_SEND,
      waiting,
      active,
      delayed,
      failed
    };
  } catch (error) {
    return {
      queueAvailable: true,
      queueName: COMMUNICATION_QUEUE_NAMES.EMAIL_SEND,
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0,
      error: error.message
    };
  }
}

/**
 * Process a single send job. Called by worker or for manual processing.
 */
async function processSendJob(communicationId) {
  const Communication = require('../models/Communication');
  const People = require('../models/People');
  const Organization = require('../models/Organization');
  const Case = require('../models/Case');
  const User = require('../models/User');
  const emailProviderGateway = require('../platform/communication/providers/emailProviderGateway');
  const replyToTokenService = require('./replyToTokenService');
  const { appendCommunicationEvent } = require('./communicationEventWriter');
  const { uploadsDir } = require('../middleware/uploadMiddleware');

  const doc = await Communication.findById(communicationId).lean();
  if (!doc || doc.status !== 'sending') {
    return;
  }

  const { organizationId, relatedTo, toAddresses, ccAddresses, bccAddresses, subject, body, attachments } = doc;
  const moduleKey = relatedTo?.moduleKey;
  const recordId = relatedTo?.recordId;
  await appendCommunicationEvent({
    organizationId,
    communicationId: doc._id,
    eventType: 'processing',
    source: 'email-worker',
    idempotencyKeyHash: doc.idempotencyKeyHash || '',
    payload: {
      queue: COMMUNICATION_QUEUE_NAMES.EMAIL_SEND,
      retryProfile: COMMUNICATION_RETRY_PROFILES.EMAIL_SEND
    }
  });

  let replyToAddr;
  try {
    replyToAddr = replyToTokenService.buildReplyToAddress({ orgId: organizationId, moduleKey, recordId });
  } catch {
    replyToAddr = process.env.EMAIL_REPLY_TO;
  }
  replyToAddr = resolveSafeReplyToAddress(replyToAddr);

  const emailAttachments = [];
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      const storagePath = att.storagePath;
      if (!storagePath) continue;
      const fullPath = path.join(uploadsDir, storagePath);
      try {
        const content = fs.readFileSync(fullPath);
        emailAttachments.push({
          filename: att.fileName || path.basename(storagePath),
          content
        });
      } catch (readErr) {
        console.error('[emailQueue] Failed to read attachment:', storagePath, readErr.message);
      }
    }
  }

  const textBody = (body || '').replace(/<[^>]+>/g, '');
  const result = await emailProviderGateway.sendEmail({
    organizationId,
    to: toAddresses,
    subject: subject || '',
    text: textBody || undefined,
    html: body || undefined,
    replyTo: replyToAddr,
    attachments: emailAttachments.length ? emailAttachments : undefined
  });

  const finalStatus = result.success ? 'sent' : 'failed';
  await Communication.findByIdAndUpdate(communicationId, {
    status: finalStatus,
    sentAt: new Date(),
    ...(result.messageId && { externalMessageId: result.messageId }),
    ...(result.success && { 'metadata.provider': result.provider || 'unknown' })
  });
  await appendCommunicationEvent({
    organizationId,
    communicationId: doc._id,
    eventType: finalStatus,
    source: 'email-worker',
    idempotencyKeyHash: doc.idempotencyKeyHash || '',
    payload: {
      provider: result.provider || null,
      externalMessageId: result.messageId || null,
      error: result.success ? null : (result.error || 'send_failed'),
      failureCategory: result.success ? null : classifyCommunicationFailure(result.error)
    }
  });

  const user = await User.findById(doc.sentByUserId).select('firstName lastName email').lean();
  const userName = String(user?.firstName || user?.lastName || user?.email || 'User');
  const newLog = {
    user: userName,
    userId: doc.sentByUserId,
    action: 'email_sent',
    details: {
      communicationId: doc._id,
      subject: subject || '',
      to: toAddresses?.[0],
      status: finalStatus
    },
    timestamp: new Date()
  };

  const pushActivityLog = async (Model, query) => {
    const forUpdate = await Model.findOne(query).select('activityLogs').lean();
    if (!forUpdate) return;
    if (!Array.isArray(forUpdate.activityLogs)) {
      await Model.findOneAndUpdate(query, { $set: { activityLogs: [newLog] } }, { runValidators: false });
    } else {
      await Model.findOneAndUpdate(query, { $push: { activityLogs: newLog } }, { runValidators: false });
    }
  };

  if (moduleKey === 'workspace') {
    await pushActivityLog(Organization, { _id: organizationId, deletedAt: null });
  } else if (moduleKey === 'people') {
    await pushActivityLog(People, { _id: recordId, organizationId, deletedAt: null });
  } else if (moduleKey === 'organizations') {
    await pushActivityLog(Organization, { _id: recordId, organizationId, isTenant: false, deletedAt: null });
  } else if (moduleKey === 'cases') {
    const caseActivity = {
      activityType: 'email_sent',
      message: `Email sent: ${(subject || '').trim()}`,
      internal: true,
      metadata: {
        communicationId: String(doc._id),
        to: toAddresses?.[0],
        status: finalStatus
      },
      actorId: doc.sentByUserId,
      actorName: userName,
      createdAt: new Date()
    };
    await Case.findOneAndUpdate(
      { _id: recordId, organizationId, deletedAt: null },
      { $push: { activities: caseActivity } },
      { runValidators: false }
    );
  }
}

function startWorker() {
  const queue = initQueue();
  if (!queue) return;
  queue.process(async (job) => {
    const { communicationId } = job.data;
    await processSendJob(communicationId);
  });
  console.log('[emailQueue] Worker started');
}

async function closeQueue() {
  if (emailQueue && emailQueue !== false) {
    try {
      await emailQueue.close();
    } catch (e) {
      console.error('[emailQueue] close error:', e.message);
    }
  }
  emailQueue = null;
}

module.exports = {
  COMMUNICATION_QUEUE_NAMES,
  COMMUNICATION_RETRY_PROFILES,
  initQueue,
  enqueueSend,
  processSendJob,
  startWorker,
  getQueueStats,
  isQueueAvailable: () => !!initQueue(),
  closeQueue,
};
