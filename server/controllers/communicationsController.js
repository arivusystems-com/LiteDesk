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
const emailQueueService = require('../services/emailQueueService');
const ThreadView = require('../models/ThreadView');
const People = require('../models/People');
const Task = require('../models/Task');
const Organization = require('../models/Organization');
const Deal = require('../models/Deal');
const User = require('../models/User');
const emailService = require('../services/emailService');
const replyToTokenService = require('../services/replyToTokenService');
const { MAX_ATTACHMENT_SIZE_BYTES, MAX_TOTAL_ATTACHMENTS_BYTES } = require('../models/Communication');

const SUPPORTED_MODULES = new Set(['people', 'organizations', 'deals', 'tasks']);

/**
 * Generate RFC Message-ID for threading.
 */
function generateMessageId() {
  const uuid = crypto.randomUUID();
  const domain = process.env.EMAIL_REPLY_TO_DOMAIN || 'litedesk.local';
  return `<${uuid}@${domain}>`;
}

/**
 * POST /api/communications/email
 * Send email from record context. Insert → Send → Update flow.
 */
exports.sendEmail = async (req, res) => {
  try {
    const { relatedTo, to, cc = [], bcc = [], subject, body, attachments = [], parentCommunicationId } = req.body;

    if (!relatedTo || !relatedTo.moduleKey || !relatedTo.recordId) {
      return res.status(400).json({
        success: false,
        message: 'relatedTo.moduleKey and relatedTo.recordId are required'
      });
    }

    if (!to || (Array.isArray(to) && to.length === 0) || (!Array.isArray(to) && !to.trim())) {
      return res.status(400).json({
        success: false,
        message: 'At least one recipient (to) is required'
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }

    const orgId = req.user.organizationId;
    const moduleKey = relatedTo.moduleKey;
    const recordId = relatedTo.recordId;
    const toList = Array.isArray(to) ? to.map(e => (typeof e === 'string' ? e.trim() : e)).filter(Boolean) : [String(to).trim()];

    if (toList.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid to address required' });
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

    if (!SUPPORTED_MODULES.has(moduleKey)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported moduleKey. Supported: people, organizations, deals, tasks`
      });
    }

    let record = null;
    if (moduleKey === 'people') {
      record = await People.findOne({ _id: recordId, organizationId: orgId, deletedAt: null }).lean();
    } else if (moduleKey === 'organizations') {
      record = await Organization.findOne({ _id: recordId, organizationId: orgId, isTenant: false, deletedAt: null }).lean();
    } else if (moduleKey === 'deals') {
      record = await Deal.findOne({ _id: recordId, organizationId: orgId }).lean();
    } else if (moduleKey === 'tasks') {
      record = await Task.findOne({ _id: recordId, organizationId: orgId }).lean();
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found or access denied'
      });
    }

    if (!emailService.isConfigured()) {
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
      attachments: attachments || []
    });

    await doc.save();

    // Set threadId for first in thread
    if (!threadId) {
      await Communication.findByIdAndUpdate(doc._id, { threadId: doc._id });
    }

    // Step 2: Send — use queue when Redis available, else sync
    if (emailQueueService.enqueueSend(doc._id.toString())) {
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
          return res.status(400).json({
            success: false,
            message: `Could not read attachment "${att.fileName || storagePath}"`
          });
        }
      }
    }

    const result = await emailService.sendEmail({
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
      ...(result.success && { 'metadata.provider': 'smtp' })
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
      await pushActivityLog(Organization, { _id: recordId, organizationId: orgId, isTenant: false, deletedAt: null });
    } else if (moduleKey === 'tasks') {
      await pushActivityLog(Task, { _id: recordId, organizationId: orgId });
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
        message: 'Unsupported moduleKey. Supported: people, organizations, deals, tasks'
      });
    }

    let record = null;
    if (moduleKey === 'people') {
      record = await People.findOne({ _id: recordId, organizationId: orgId, deletedAt: null }).lean();
    } else if (moduleKey === 'organizations') {
      record = await Organization.findOne({ _id: recordId, organizationId: orgId, isTenant: false, deletedAt: null }).lean();
    } else if (moduleKey === 'deals') {
      record = await Deal.findOne({ _id: recordId, organizationId: orgId }).lean();
    } else if (moduleKey === 'tasks') {
      record = await Task.findOne({ _id: recordId, organizationId: orgId }).lean();
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

    const task = await Task.create({
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
    });

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
