/**
 * Email Queue Service (Async send)
 * Uses Bull + Redis when available. Falls back to sync send when not.
 */

const path = require('path');
const fs = require('fs');
let emailQueue = null;

function getRedisUrl() {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || 6379;
  const pass = process.env.REDIS_PASSWORD;
  if (pass) {
    return `redis://:${encodeURIComponent(pass)}@${host}:${port}`;
  }
  return `redis://${host}:${port}`;
}

function isRedisConfigured() {
  return !!(process.env.REDIS_HOST || process.env.REDIS_PORT);
}

function initQueue() {
  if (emailQueue !== null) return emailQueue;
  if (!isRedisConfigured()) {
    emailQueue = false;
    return false;
  }
  try {
    const Bull = require('bull');
    emailQueue = new Bull('email-send', getRedisUrl(), {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100
      }
    });
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
    queue.add({ communicationId }, { jobId: `email-${communicationId}` });
    return true;
  } catch (err) {
    console.error('[emailQueue] Enqueue failed:', err.message);
    return false;
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
  const emailService = require('./emailService');
  const replyToTokenService = require('./replyToTokenService');
  const { uploadsDir } = require('../middleware/uploadMiddleware');

  const doc = await Communication.findById(communicationId).lean();
  if (!doc || doc.status !== 'sending') {
    return;
  }

  const { organizationId, relatedTo, toAddresses, ccAddresses, bccAddresses, subject, body, attachments } = doc;
  const moduleKey = relatedTo?.moduleKey;
  const recordId = relatedTo?.recordId;

  let replyToAddr;
  try {
    replyToAddr = replyToTokenService.buildReplyToAddress({ orgId: organizationId, moduleKey, recordId });
  } catch {
    replyToAddr = process.env.EMAIL_REPLY_TO;
  }

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
  const result = await emailService.sendEmail({
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
    ...(result.success && { 'metadata.provider': 'smtp' })
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

  if (moduleKey === 'people') {
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

module.exports = {
  initQueue,
  enqueueSend,
  processSendJob,
  startWorker,
  isQueueAvailable: () => !!initQueue()
};
