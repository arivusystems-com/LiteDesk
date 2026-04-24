/**
 * ============================================================================
 * Inbound Email Controller (Phase 2)
 * ============================================================================
 *
 * Webhook: POST /api/webhooks/email/inbound
 * Parses raw MIME, resolves record from Reply-To token, creates inbound
 * Communication and activity log.
 *
 * See docs/IN_PRODUCT_EMAIL_PLAN.md Part 2.
 *
 * ============================================================================
 */

const path = require('path');
const fs = require('fs');
const { simpleParser } = require('mailparser');
const Communication = require('../models/Communication');
const People = require('../models/People');
const User = require('../models/User');
const replyToTokenService = require('../services/replyToTokenService');
const { handleInboundEmailForHelpdesk } = require('../services/helpdeskChannelIngestionService');
const { uploadsDir } = require('../middleware/uploadMiddleware');
const { MAX_ATTACHMENT_SIZE_BYTES } = require('../models/Communication');

/**
 * Collect addresses from mailparser format into array of email strings.
 */
function collectAddresses(val) {
  if (!val) return [];
  const list = Array.isArray(val) ? val : [val];
  const out = [];
  for (const item of list) {
    if (typeof item === 'string') {
      out.push(item);
    } else if (item?.value) {
      for (const a of item.value) {
        if (a?.address) out.push(a.address);
      }
    }
  }
  return out;
}

/**
 * Resolve parent Communication from In-Reply-To or References header.
 */
async function resolveParent(organizationId, inReplyTo, references) {
  const ids = [];
  if (inReplyTo) ids.push(inReplyTo.replace(/^<|>$/g, '').trim());
  if (references) {
    const refs = references.split(/\s+/).map((r) => r.replace(/^<|>$/g, '').trim()).filter(Boolean);
    ids.push(...refs);
  }
  if (ids.length === 0) return null;

  // Look up by messageId or externalMessageId
  const parent = await Communication.findOne({
    organizationId,
    $or: [
      { messageId: { $in: ids } },
      { externalMessageId: { $in: ids } }
    ]
  }).lean();
  return parent;
}

/**
 * POST /api/webhooks/email/inbound
 * Body: raw MIME (Content-Type: message/rfc822) or JSON { rawMime: "<base64>" }
 */
exports.handleInbound = async (req, res) => {
  try {
    let rawBuffer = null;
    if (Buffer.isBuffer(req.body)) {
      rawBuffer = req.body;
    } else if (req.body?.rawMime) {
      rawBuffer = Buffer.from(req.body.rawMime, typeof req.body.rawMime === 'string' ? 'base64' : undefined);
    }
    if (!rawBuffer || !Buffer.isBuffer(rawBuffer)) {
      return res.status(400).json({ success: false, message: 'Missing raw MIME body. Send as Content-Type: message/rfc822 or JSON { rawMime: "<base64>" }' });
    }

    const parsed = await simpleParser(rawBuffer);
    const fromAddr = parsed.from?.value?.[0]?.address || parsed.from?.text || '';
    const toAddresses = collectAddresses(parsed.to);
    const ccAddresses = collectAddresses(parsed.cc);
    const bccAddresses = collectAddresses(parsed.bcc);
    const allRecipients = [...toAddresses, ...ccAddresses, ...bccAddresses];

    const tokenPayload = replyToTokenService.extractFromAddresses(allRecipients);
    const orgHeaderId = req.headers['x-litedesk-organization-id'] || req.headers['x-organization-id'];

    if (!tokenPayload && !orgHeaderId) {
      return res.status(400).json({
        success: false,
        message: 'No valid Reply-To token or organization header found'
      });
    }

    const orgId = tokenPayload?.orgId || orgHeaderId;
    const moduleKey = tokenPayload?.moduleKey || 'cases';
    const recordId = tokenPayload?.recordId || null;

    // Auto-create Person from new inbound sender (Phase 4)
    const fromEmail = (fromAddr || '').toLowerCase().trim();
    if (fromEmail) {
      const existing = await People.findOne({
        organizationId: orgId,
        email: fromEmail,
        deletedAt: null
      }).lean();
      if (!existing) {
        const orgUser = await User.findOne({ organizationId: orgId, status: { $ne: 'inactive' } }).select('_id').lean();
        if (orgUser) {
          const fromObj = parsed.from?.value?.[0];
          const displayName = (fromObj?.name || fromObj?.address || '').trim();
          const nameParts = displayName ? displayName.split(/\s+/) : [];
          const firstName = nameParts[0] || fromEmail.split('@')[0] || 'Inbound';
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          const { assignResolvedSource } = require('../services/sourceResolver');
          const personPayload = {
            organizationId: orgId,
            createdBy: orgUser._id,
            first_name: firstName,
            last_name: lastName || firstName,
            email: fromEmail
          };
          assignResolvedSource(personPayload, 'email');
          await People.create(personPayload);
        }
      }
    }

    // Validate/resolve target record and module behavior
    let relatedTo = null;
    let helpdeskCaseResult = null;
    if (moduleKey === 'people') {
      const person = await People.findOne({
        _id: recordId,
        organizationId: orgId,
        deletedAt: null
      }).lean();
      if (!person) {
        return res.status(404).json({ success: false, message: 'Record not found or access denied' });
      }
      relatedTo = { moduleKey, recordId };
    } else if (moduleKey === 'cases' || (!tokenPayload && moduleKey === 'cases')) {
      helpdeskCaseResult = await handleInboundEmailForHelpdesk({
        organizationId: orgId,
        explicitCaseId: recordId,
        parsedEmail: {
          fromAddress: fromAddr,
          subject: parsed.subject || '(no subject)',
          body: parsed.html || parsed.text || ''
        },
        communicationDraft: {}
      });
      relatedTo = { moduleKey: 'cases', recordId: helpdeskCaseResult.caseRecord._id };
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported moduleKey for inbound' });
    }

    const parent = await resolveParent(orgId, parsed.inReplyTo, parsed.references);
    const threadId = parent ? (parent.threadId || parent._id) : null;

    const body = parsed.html || parsed.text || '';

    // Store inbound attachments (Phase 4)
    const inboundAttachments = [];
    const rawOrgId = orgId.toString();
    const safeOrgId = String(rawOrgId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const orgDir = path.join(uploadsDir, safeOrgId);
    if (parsed.attachments && parsed.attachments.length > 0) {
      try {
        if (!fs.existsSync(orgDir)) {
          fs.mkdirSync(orgDir, { recursive: true });
        }
        for (const att of parsed.attachments) {
          if (!att.content || !Buffer.isBuffer(att.content)) continue;
          if (att.content.length > MAX_ATTACHMENT_SIZE_BYTES) continue;
          const baseName = (att.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
          const ext = path.extname(baseName) || '';
          const name = path.basename(baseName, ext) || 'attachment';
          const storedName = `${name}-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
          const storagePath = `${safeOrgId}/${storedName}`;
          const fullPath = path.join(uploadsDir, storagePath);
          fs.writeFileSync(fullPath, att.content);
          inboundAttachments.push({
            fileName: att.filename || storedName,
            fileType: att.contentType || 'application/octet-stream',
            fileSize: att.content.length,
            storagePath
          });
        }
      } catch (writeErr) {
        console.error('[inboundEmailController] Failed to save attachment:', writeErr.message);
      }
    }

    const doc = new Communication({
      organizationId: orgId,
      kind: 'email',
      direction: 'inbound',
      threadId,
      parentCommunicationId: parent?._id || null,
      subject: parsed.subject || '(no subject)',
      body,
      fromAddress: fromAddr,
      toAddresses,
      ccAddresses,
      bccAddresses,
      messageId: parsed.messageId?.replace(/^<|>$/g, '') || null,
      inReplyTo: parsed.inReplyTo?.replace(/^<|>$/g, '') || null,
      references: parsed.references || null,
      receivedAt: new Date(),
      status: 'delivered',
      relatedTo,
      sentByUserId: null,
      attachments: inboundAttachments
    });
    await doc.save();

    if (!threadId) {
      await Communication.findByIdAndUpdate(doc._id, { threadId: doc._id });
    }

    // Add activity log
    const newLog = {
      user: fromAddr || 'Unknown',
      userId: null,
      action: 'email_received',
      details: {
        communicationId: doc._id,
        subject: doc.subject,
        from: fromAddr,
        status: 'delivered'
      },
      timestamp: new Date()
    };

    if (moduleKey === 'people') {
      const personForUpdate = await People.findOne(
        { _id: recordId, organizationId: orgId, deletedAt: null }
      ).select('activityLogs').lean();

      if (personForUpdate) {
        if (!Array.isArray(personForUpdate.activityLogs)) {
          await People.findOneAndUpdate(
            { _id: recordId, organizationId: orgId, deletedAt: null },
            { $set: { activityLogs: [newLog] } },
            { runValidators: false }
          );
        } else {
          await People.findOneAndUpdate(
            { _id: recordId, organizationId: orgId, deletedAt: null },
            { $push: { activityLogs: newLog } },
            { runValidators: false }
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        communicationId: doc._id,
        relatedTo,
        ...(helpdeskCaseResult && {
          helpdesk: {
            caseId: helpdeskCaseResult.caseRecord._id,
            action: helpdeskCaseResult.action
          }
        })
      }
    });
  } catch (err) {
    console.error('[inboundEmailController] Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process inbound email',
      error: err.message
    });
  }
};
