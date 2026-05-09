/**
 * ============================================================================
 * Communications Controller (In-Product Email)
 * ============================================================================
 *
 * Handles send email flow: Insert → Send → Update.
 * See docs/IN_PRODUCT_EMAIL_PLAN.md
 *
 * ============================================================================
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Communication = require('../models/Communication');
const { uploadsDir } = require('../middleware/uploadMiddleware');
const ThreadView = require('../models/ThreadView');
const People = require('../models/People');
const Task = require('../models/Task');
const Organization = require('../models/Organization');
const Deal = require('../models/Deal');
const Case = require('../models/Case');
const User = require('../models/User');
const replyToTokenService = require('../services/replyToTokenService');
const { MAX_ATTACHMENT_SIZE_BYTES, MAX_TOTAL_ATTACHMENTS_BYTES } = require('../models/Communication');
const communicationPlatformService = require('../platform/communication/api/communicationPlatformService');
const emailProviderGateway = require('../platform/communication/providers/emailProviderGateway');
const { appendCommunicationEvent } = require('../services/communicationEventWriter');
const { getCommunicationConfigForOrganization } = require('../platform/communication/config/communicationConfigService');
const {
  SUPPORTED_MODULES
} = require('../platform/communication/domain/sendEmailContract');

async function getTenantUserIds(organizationId) {
  const users = await User.find({ organizationId }).select('_id').lean();
  return users.map((u) => u._id);
}

/**
 * Generate RFC Message-ID for threading.
 */
function generateMessageId() {
  const uuid = crypto.randomUUID();
  const domain = process.env.EMAIL_REPLY_TO_DOMAIN || 'arivu.local';
  return `<${uuid}@${domain}>`;
}

function normalizeIdempotencyKey(value) {
  if (!value) return '';
  const normalized = String(value).trim();
  if (!normalized) return '';
  return normalized.slice(0, 200);
}

function hashIdempotencyKey({ organizationId, userId, key }) {
  if (!key) return '';
  return crypto
    .createHash('sha256')
    .update(`${organizationId}:${userId}:${key}`)
    .digest('hex');
}

/**
 * POST /api/communications/email
 * Send email from record context. Insert → Send → Update flow.
 */
exports.sendEmail = async (req, res) => {
  try {
    const validation = communicationPlatformService.validateOutboundEmailPayload(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0] || 'Invalid email payload',
        errors: validation.errors
      });
    }
    const {
      relatedTo,
      to: toList,
      cc,
      bcc,
      subject,
      body,
      attachments,
      parentCommunicationId
    } = validation.value;

    const orgId = req.user.organizationId;
    const moduleKey = relatedTo.moduleKey;
    const recordId = relatedTo.recordId;
    const runtimeConfig = await getCommunicationConfigForOrganization(orgId);
    const outboundPolicy = runtimeConfig.outboundEmail || {};
    const idempotencyKey = normalizeIdempotencyKey(
      req.headers['x-idempotency-key'] || req.body?.idempotencyKey
    );
    const idempotencyKeyHash = hashIdempotencyKey({
      organizationId: String(orgId),
      userId: String(req.user._id),
      key: idempotencyKey
    });

    if (outboundPolicy.enabled === false) {
      return res.status(403).json({
        success: false,
        message: 'Outbound email is disabled by communication policy for this tenant.'
      });
    }
    if (outboundPolicy.requireIdempotencyKey && !idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: 'X-Idempotency-Key header is required by communication policy.'
      });
    }
    if (Array.isArray(outboundPolicy.allowedModuleKeys) && !outboundPolicy.allowedModuleKeys.includes(moduleKey)) {
      return res.status(403).json({
        success: false,
        message: `Module "${moduleKey}" is not allowed by tenant communication policy.`
      });
    }
    const totalRecipients =
      (Array.isArray(toList) ? toList.length : 0) +
      (Array.isArray(cc) ? cc.length : 0) +
      (Array.isArray(bcc) ? bcc.length : 0);
    if (totalRecipients > (Number(outboundPolicy.maxRecipientsPerMessage) || 50)) {
      return res.status(400).json({
        success: false,
        message: `Recipient count exceeds tenant policy limit (${outboundPolicy.maxRecipientsPerMessage}).`
      });
    }

    if (idempotencyKeyHash) {
      const existing = await Communication.findOne({
        organizationId: orgId,
        direction: 'outbound',
        kind: 'email',
        idempotencyKeyHash
      }).lean();
      if (existing) {
        await appendCommunicationEvent({
          organizationId: orgId,
          communicationId: existing._id,
          eventType: 'idempotency_replay',
          source: 'communications-api',
          idempotencyKeyHash,
          payload: {
            relatedTo: { moduleKey, recordId },
            reason: 'existing_communication_reused'
          }
        });
        return res.status(200).json({
          success: true,
          data: existing,
          queued: existing.status === 'sending',
          idempotencyReplay: true
        });
      }
    }
    // Attachment size guardrail
    if (attachments && attachments.length > 0) {
      let totalSize = 0;
      for (const att of attachments) {
        const size = att.fileSize || 0;
        if (size > MAX_ATTACHMENT_SIZE_BYTES) {
          return res.status(400).json({
            success: false,
            message: `Attachment "${att.fileName || 'file'}" exceeds ${MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024}MB per-file limit`
          });
        }
        totalSize += size;
      }
      if (totalSize > MAX_TOTAL_ATTACHMENTS_BYTES) {
        return res.status(400).json({
          success: false,
          message: `Total attachment size exceeds ${MAX_TOTAL_ATTACHMENTS_BYTES / 1024 / 1024}MB limit`
        });
      }
    }

    let record = null;
    if (moduleKey === 'people') {
      record = await People.findOne({ _id: recordId, organizationId: orgId, deletedAt: null }).lean();
    } else if (moduleKey === 'organizations') {
      const tenantUserIds = await getTenantUserIds(orgId);
      record = await Organization.findOne({
        _id: recordId,
        isTenant: false,
        deletedAt: null,
        createdBy: { $in: tenantUserIds }
      }).lean();
    } else if (moduleKey === 'deals') {
      record = await Deal.findOne({ _id: recordId, organizationId: orgId }).lean();
    } else if (moduleKey === 'tasks') {
      record = await Task.findOne({ _id: recordId, organizationId: orgId }).lean();
    } else if (moduleKey === 'cases') {
      record = await Case.findOne({ _id: recordId, organizationId: orgId, deletedAt: null }).lean();
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found or access denied'
      });
    }

    if (!(await communicationPlatformService.canSendEmailNow({ organizationId: orgId }))) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured. Configure AWS SES or SMTP in environment.'
      });
    }

    const fromAddr = req.user.email || process.env.EMAIL_FROM;
    const messageId = generateMessageId();
    let threadId = null;
    let inReplyTo = null;
    let references = null;

    if (parentCommunicationId) {
      const parent = await Communication.findOne({
        _id: parentCommunicationId,
        organizationId: orgId
      }).lean();
      if (parent) {
        threadId = parent.threadId || parent._id;
        inReplyTo = parent.messageId || parent.externalMessageId;
        references = parent.references ? `${parent.references} ${parent.messageId || parent.externalMessageId}` : (parent.messageId || parent.externalMessageId);
      }
    }

    // Step 1: Insert (status: 'sending')
    const doc = new Communication({
      organizationId: orgId,
      kind: 'email',
      direction: 'outbound',
      threadId,
      parentCommunicationId: parentCommunicationId || null,
      subject: subject.trim(),
      body: body || '',
      fromAddress: fromAddr,
      toAddresses: toList,
      ccAddresses: Array.isArray(cc) ? cc.filter(Boolean) : [],
      bccAddresses: Array.isArray(bcc) ? bcc.filter(Boolean) : [],
      messageId,
      inReplyTo,
      references,
      status: 'sending',
      relatedTo: { moduleKey, recordId },
      sentByUserId: req.user._id,
      attachments: attachments || [],
      idempotencyKey: idempotencyKey || undefined,
      idempotencyKeyHash: idempotencyKeyHash || undefined
    });

    try {
      await doc.save();
    } catch (saveErr) {
      if (saveErr?.code === 11000 && idempotencyKeyHash) {
        const existing = await Communication.findOne({
          organizationId: orgId,
          direction: 'outbound',
          kind: 'email',
          idempotencyKeyHash
        }).lean();
        if (existing) {
          return res.status(200).json({
            success: true,
            data: existing,
            queued: existing.status === 'sending',
            idempotencyReplay: true
          });
        }
      }
      throw saveErr;
    }
    await appendCommunicationEvent({
      organizationId: orgId,
      communicationId: doc._id,
      eventType: 'accepted',
      source: 'communications-api',
      idempotencyKeyHash,
      payload: {
        relatedTo: { moduleKey, recordId },
        toCount: toList.length,
        ccCount: Array.isArray(cc) ? cc.length : 0,
        bccCount: Array.isArray(bcc) ? bcc.length : 0
      }
    });

    // Set threadId for first in thread
    if (!threadId) {
      await Communication.findByIdAndUpdate(doc._id, { threadId: doc._id });
    }

    // Step 2: Send — use queue when Redis available, else sync
    if (communicationPlatformService.enqueueOutboundEmail(doc._id.toString())) {
      await appendCommunicationEvent({
        organizationId: orgId,
        communicationId: doc._id,
        eventType: 'queued',
        source: 'communications-api',
        idempotencyKeyHash,
        payload: { queue: 'email-send' }
      });
      const updated = await Communication.findById(doc._id).lean();
      return res.status(200).json({ success: true, data: updated, queued: true });
    }

    // Sync send (no Redis)
    const textBody = (body || '').replace(/<[^>]+>/g, '');
    let replyToAddr;
    try {
      replyToAddr = replyToTokenService.buildReplyToAddress({ orgId, moduleKey, recordId });
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
          console.error('[communicationsController] Failed to read attachment:', storagePath, readErr.message);
          await Communication.findByIdAndUpdate(doc._id, {
            status: 'failed',
            sentAt: new Date()
          });
          await appendCommunicationEvent({
            organizationId: orgId,
            communicationId: doc._id,
            eventType: 'failed',
            source: 'communications-api',
            idempotencyKeyHash,
            payload: {
              reason: 'attachment_read_failed',
              attachment: att.fileName || storagePath
            }
          });
          return res.status(400).json({
            success: false,
            message: `Could not read attachment "${att.fileName || storagePath}"`
          });
        }
      }
    }

    const result = await emailProviderGateway.sendEmail({
      organizationId: orgId,
      to: toList,
      subject: subject.trim(),
      text: textBody || undefined,
      html: body || undefined,
      replyTo: replyToAddr,
      attachments: emailAttachments
    });

    const finalStatus = result.success ? 'sent' : 'failed';
    await Communication.findByIdAndUpdate(doc._id, {
      status: finalStatus,
      sentAt: new Date(),
      ...(result.messageId && { externalMessageId: result.messageId }),
      ...(result.success && { 'metadata.provider': result.provider || 'unknown' })
    });
  await appendCommunicationEvent({
    organizationId: orgId,
    communicationId: doc._id,
    eventType: finalStatus,
    source: 'communications-api',
    idempotencyKeyHash,
    payload: {
      provider: result.provider || null,
      externalMessageId: result.messageId || null,
      error: result.success ? null : (result.error || 'send_failed')
    }
  });

    const user = await User.findById(req.user._id).select('firstName lastName email').lean();
    const userName = String(user?.firstName || user?.lastName || user?.email || 'User');
    const newLog = {
      user: userName,
      userId: req.user._id,
      action: 'email_sent',
      details: {
        communicationId: doc._id,
        subject: subject.trim(),
        to: toList[0],
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
      await pushActivityLog(People, { _id: recordId, organizationId: orgId, deletedAt: null });
    } else if (moduleKey === 'organizations') {
      const tenantUserIds = await getTenantUserIds(orgId);
      await pushActivityLog(Organization, {
        _id: recordId,
        isTenant: false,
        deletedAt: null,
        createdBy: { $in: tenantUserIds }
      });
    } else if (moduleKey === 'tasks') {
      await pushActivityLog(Task, { _id: recordId, organizationId: orgId });
    } else if (moduleKey === 'cases') {
      const caseActivity = {
        activityType: 'email_sent',
        message: `Email sent: ${subject.trim()}`,
        internal: true,
        metadata: {
          communicationId: doc._id,
          to: toList[0],
          status: finalStatus
        },
        actorId: req.user._id,
        actorName: userName,
        createdAt: new Date()
      };
      await Case.findOneAndUpdate(
        { _id: recordId, organizationId: orgId, deletedAt: null },
        { $push: { activities: caseActivity } },
        { runValidators: false }
      );
    }

    const updated = await Communication.findById(doc._id).lean();
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('[communicationsController] sendEmail error:', err);
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: err.message,
      ...(isDev && { stack: err.stack })
    });
  }
};

/**
 * GET /api/communications/threads
 * Query: moduleKey, recordId
 * Returns email threads for a record, grouped by threadId.
 */
exports.getThreads = async (req, res) => {
  try {
    const { moduleKey, recordId } = req.query;
    const orgId = req.user.organizationId;

    if (!moduleKey || !recordId) {
      return res.status(400).json({
        success: false,
        message: 'moduleKey and recordId are required'
      });
    }

    if (!SUPPORTED_MODULES.has(moduleKey)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported moduleKey. Supported: people, organizations, deals, tasks, cases'
      });
    }

    let record = null;
    if (moduleKey === 'people') {
      record = await People.findOne({ _id: recordId, organizationId: orgId, deletedAt: null }).lean();
    } else if (moduleKey === 'organizations') {
      const tenantUserIds = await getTenantUserIds(orgId);
      record = await Organization.findOne({
        _id: recordId,
        isTenant: false,
        deletedAt: null,
        createdBy: { $in: tenantUserIds }
      }).lean();
    } else if (moduleKey === 'deals') {
      record = await Deal.findOne({ _id: recordId, organizationId: orgId }).lean();
    } else if (moduleKey === 'tasks') {
      record = await Task.findOne({ _id: recordId, organizationId: orgId }).lean();
    } else if (moduleKey === 'cases') {
      record = await Case.findOne({ _id: recordId, organizationId: orgId, deletedAt: null }).lean();
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    const person = moduleKey === 'people' ? record : null;

    const comms = await Communication.find({
      organizationId: orgId,
      'relatedTo.moduleKey': moduleKey,
      'relatedTo.recordId': recordId
    })
      .sort({ sentAt: 1, receivedAt: 1, createdAt: 1 })
      .lean();

    const byThread = new Map();
    for (const c of comms) {
      const tid = c.threadId ? String(c.threadId) : String(c._id);
      if (!byThread.has(tid)) {
        byThread.set(tid, []);
      }
      byThread.get(tid).push(c);
    }

    const personEmail = (person?.email || '').toLowerCase().trim();

    const threadIds = Array.from(byThread.keys());
    const viewMap = new Map();
    if (threadIds.length > 0) {
      const views = await ThreadView.find({
        userId: req.user._id,
        organizationId: orgId,
        threadId: { $in: threadIds }
      }).lean();
      for (const v of views) {
        viewMap.set(String(v.threadId), v.lastViewedAt);
      }
    }

    const threads = Array.from(byThread.entries()).map(([threadId, messages]) => {
      const sorted = [...messages].sort((a, b) => {
        const da = a.sentAt || a.receivedAt || a.createdAt || 0;
        const db = b.sentAt || b.receivedAt || b.createdAt || 0;
        return new Date(da) - new Date(db);
      });
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const subject = first?.subject || '(no subject)';
      const firstActivityAt = first?.sentAt || first?.receivedAt || first?.createdAt;
      const lastActivityAt = last?.sentAt || last?.receivedAt || last?.createdAt;

      const otherAddresses = new Set();
      for (const m of sorted) {
        if (m.direction === 'outbound' && m.toAddresses?.length) {
          m.toAddresses.forEach((a) => a && otherAddresses.add(String(a).toLowerCase().trim()));
        } else if (m.direction === 'inbound' && m.fromAddress) {
          otherAddresses.add(String(m.fromAddress).toLowerCase().trim());
        }
      }
      const others = [...otherAddresses];
      const lastDir = last?.direction;
      const otherLabel =
        others.length === 1 && others[0] === personEmail && person
          ? [(person.first_name || person.firstName), (person.last_name || person.lastName)].filter(Boolean).join(' ').trim() || others[0]
          : others.length === 1
            ? others[0]
            : others.slice(0, 2).join(', ') + (others.length > 2 ? ' +' + (others.length - 2) : '');
      const participantDisplay =
        others.length === 0
          ? 'You'
          : lastDir === 'inbound'
            ? `${otherLabel} ↔ You`
            : `You ↔ ${otherLabel}`;

      const lastViewedAt = viewMap.get(threadId) ? new Date(viewMap.get(threadId)) : null;
      const unread = lastDir === 'inbound' && lastViewedAt === null
        ? true
        : lastDir === 'inbound' && lastViewedAt && new Date(lastActivityAt) > lastViewedAt;

      return {
        threadId,
        subject,
        messageCount: sorted.length,
        participantDisplay,
        lastMessageDirection: lastDir,
        firstActivityAt,
        lastActivityAt,
        lastViewedAt: lastViewedAt || null,
        unread,
        messages: sorted.map((m) => ({
          _id: m._id,
          direction: m.direction,
          fromAddress: m.fromAddress,
          toAddresses: m.toAddresses || [],
          subject: m.subject,
          body: m.body,
          attachments: m.attachments || [],
          sentAt: m.sentAt,
          receivedAt: m.receivedAt,
          status: m.status
        }))
      };
    });

    threads.sort((a, b) => new Date(b.lastActivityAt || b.firstActivityAt) - new Date(a.lastActivityAt || a.firstActivityAt));

    return res.json({
      success: true,
      data: { threads }
    });
  } catch (err) {
    console.error('[communicationsController] getThreads error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load threads',
      error: err.message
    });
  }
};

/**
 * PATCH /api/communications/threads/:threadId/view
 * Mark a thread as viewed by the current user.
 */
exports.markThreadViewed = async (req, res) => {
  try {
    const { threadId } = req.params;
    const orgId = req.user.organizationId;

    if (!threadId) {
      return res.status(400).json({ success: false, message: 'threadId is required' });
    }

    const now = new Date();
    await ThreadView.findOneAndUpdate(
      {
        userId: req.user._id,
        organizationId: orgId,
        threadId
      },
      { $set: { lastViewedAt: now } },
      { upsert: true, runValidators: true }
    );

    return res.json({ success: true, lastViewedAt: now });
  } catch (err) {
    console.error('[communicationsController] markThreadViewed error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark thread as viewed',
      error: err.message
    });
  }
};

const EMAIL_TEMPLATES = [
  {
    id: 'intro',
    name: 'Introduction',
    subject: 'Nice to meet you',
    body: '<p>Hi,</p><p>I wanted to introduce myself. I\'m excited to connect and discuss how we can work together.</p><p>Best regards</p>'
  },
  {
    id: 'follow-up',
    name: 'Follow-up',
    subject: 'Following up',
    body: '<p>Hi,</p><p>I wanted to follow up on our previous conversation. Do you have a few minutes this week to discuss?</p><p>Thanks</p>'
  },
  {
    id: 'meeting-request',
    name: 'Meeting request',
    subject: 'Meeting request',
    body: '<p>Hi,</p><p>Would you be available for a meeting sometime this week? I\'d love to connect and discuss next steps.</p><p>Best</p>'
  },
  {
    id: 'thank-you',
    name: 'Thank you',
    subject: 'Thank you',
    body: '<p>Hi,</p><p>Thank you for your time today. I appreciate the conversation and look forward to moving forward.</p><p>Best regards</p>'
  }
];

/**
 * GET /api/communications/templates
 * Returns predefined email templates (Phase 3.5).
 */
exports.getTemplates = (req, res) => {
  return res.json({ success: true, data: { templates: EMAIL_TEMPLATES } });
};

/**
 * POST /api/communications/:communicationId/create-task
 * Create a task from an email (Phase 4: Email-to-Task).
 */
exports.createTaskFromEmail = async (req, res) => {
  try {
    const { communicationId } = req.params;
    const orgId = req.user.organizationId;

    const comm = await Communication.findOne({
      _id: communicationId,
      organizationId: orgId
    }).lean();

    if (!comm) {
      return res.status(404).json({ success: false, message: 'Communication not found' });
    }

    const title = (comm.subject || 'Email').trim().slice(0, 200);
    const body = (comm.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const description = body
      ? `Created from email:\n\nFrom: ${comm.fromAddress || ''}\nTo: ${(comm.toAddresses || []).join(', ')}\n\n${body}`
      : `Created from email: ${comm.subject || ''}`;

    let relatedTo = { type: 'none' };
    if (comm.relatedTo?.moduleKey === 'people') {
      relatedTo = { type: 'contact', id: comm.relatedTo.recordId };
    } else if (comm.relatedTo?.moduleKey === 'organizations') {
      relatedTo = { type: 'organization', id: comm.relatedTo.recordId };
    }

    const { assignResolvedSource } = require('../services/sourceResolver');
    const taskPayload = {
      organizationId: orgId,
      title: title ? `Email: ${title}` : 'Task from email',
      description,
      relatedTo,
      assignedTo: req.user._id,
      assignedBy: req.user._id,
      status: 'todo',
      priority: 'medium',
      createdBy: req.user._id,
      activityLogs: [{
        user: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
        userId: req.user._id,
        action: 'created',
        details: { sourceCommunicationId: comm._id },
        timestamp: new Date()
      }]
    };
    assignResolvedSource(taskPayload, 'email');
    const task = await Task.create(taskPayload);

    return res.status(201).json({
      success: true,
      data: { taskId: task._id, task }
    });
  } catch (err) {
    console.error('[communicationsController] createTaskFromEmail error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: err.message
    });
  }
};
