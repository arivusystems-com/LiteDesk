/**
 * ============================================================================
 * PLATFORM CORE: Escalation Resolver (Process Engine Phase 3)
 * ============================================================================
 *
 * Watches pending approvals and triggers when timeout is reached.
 * On escalation: re-resolve approvers (e.g. manager's manager), update
 * ApprovalInstance, emit approval.escalated.
 *
 * Uses scheduler infrastructure — no cron inside Process Engine.
 * This module exports the check function; a scheduler (e.g. node-cron,
 * bull, or external) should call tick() at interval.
 *
 * ============================================================================
 */

const mongoose = require('mongoose');
const ApprovalInstance = require('../models/ApprovalInstance');
const ProcessExecution = require('../models/ProcessExecution');
const { resolveApprovers } = require('./approvalApproverResolver');
const { createLogger } = require('./automationLogger');
const { emit: emitDomainEvent } = require('./domainEvents');

const log = createLogger('escalationResolver');

/**
 * Process a single pending approval that has timed out.
 * Re-resolve approvers per configSnapshot.onTimeout (escalate | fail).
 *
 * @param {Object} approval - ApprovalInstance (lean)
 * @returns {Promise<{ ok: boolean, escalated?: boolean, failed?: boolean, error?: string }>}
 */
async function processTimedOutApproval(approval) {
  const config = approval.configSnapshot || {};
  const onTimeout = config.onTimeout || 'fail';

  if (onTimeout === 'fail') {
    await ApprovalInstance.updateOne(
      { _id: approval._id },
      {
        status: 'timed_out',
        decidedAt: new Date(),
        reason: 'Approval timed out'
      }
    );

    const exec = await ProcessExecution.findById(approval.processExecutionId);
    if (exec && exec.status === 'waiting_for_approval') {
      await ProcessExecution.updateOne(
        { _id: exec._id },
        {
          status: 'failed',
          error: 'Approval timed out',
          completedAt: new Date(),
          dataBag: null,
          behaviorProposals: null,
          approvalInstanceId: null
        }
      );
    }

    log.info('approval_timed_out', {
      approvalId: approval.approvalId,
      processExecutionId: approval.processExecutionId?.toString(),
      nodeId: approval.nodeId
    });

    emitDomainEvent({
      entityType: 'approval',
      entityId: approval.approvalId,
      eventType: 'approval.timed_out',
      previousState: { status: 'pending' },
      currentState: { status: 'timed_out', reason: 'Approval timed out' },
      organizationId: approval.organizationId,
      triggeredBy: null
    });

    return { ok: true, failed: true };
  }

  if (onTimeout === 'escalate') {
    const orgId = approval.organizationId?.toString?.() || approval.organizationId;
    if (!orgId) {
      await ApprovalInstance.updateOne(
        { _id: approval._id },
        { status: 'timed_out', decidedAt: new Date(), reason: 'Escalation failed: no organization' }
      );
      return { ok: false, error: 'No organization for escalation' };
    }

    const approvers = config.approvers || [];
    const escalated = await resolveApprovers({
      approvers,
      organizationId: orgId,
      entityType: approval.entityType,
      entityId: approval.entityId
    });

    const newApproverIds = escalated.ok && escalated.userIds ? escalated.userIds : [];
    if (newApproverIds.length === 0) {
      await ApprovalInstance.updateOne(
        { _id: approval._id },
        { status: 'timed_out', decidedAt: new Date(), reason: 'Escalation failed: no approvers resolved' }
      );
      return { ok: false, error: 'No approvers resolved on escalation' };
    }

    await ApprovalInstance.updateOne(
      { _id: approval._id },
      {
        approvers: newApproverIds.map(id => new mongoose.Types.ObjectId(id)),
        escalatedApprovers: newApproverIds.map(id => new mongoose.Types.ObjectId(id)),
        timeoutAt: null,
        reason: null
      }
    );

    log.info('approval_escalated', {
      approvalId: approval.approvalId,
      processExecutionId: approval.processExecutionId?.toString(),
      nodeId: approval.nodeId,
      newApproverCount: newApproverIds.length
    });

    emitDomainEvent({
      entityType: 'approval',
      entityId: approval.approvalId,
      eventType: 'approval.escalated',
      previousState: { status: 'pending' },
      currentState: { status: 'pending', escalated: true, newApproverCount: newApproverIds.length },
      organizationId: approval.organizationId,
      triggeredBy: null
    });

    return { ok: true, escalated: true };
  }

  return { ok: false, error: `Unknown onTimeout: ${onTimeout}` };
}

/**
 * Tick: find pending approvals past timeout and process them.
 * Call at interval from scheduler infrastructure.
 *
 * @returns {Promise<{ processed: number, escalated: number, failed: number }>}
 */
async function tick() {
  const now = new Date();
  const pending = await ApprovalInstance.find({
    status: 'pending',
    timeoutAt: { $lte: now, $ne: null }
  }).lean();

  let processed = 0;
  let escalated = 0;
  let failed = 0;

  for (const a of pending) {
    try {
      const r = await processTimedOutApproval(a);
      if (r.ok) {
        processed++;
        if (r.escalated) escalated++;
        if (r.failed) failed++;
      }
    } catch (e) {
      log.error('escalation_tick_error', { approvalId: a.approvalId, error: e.message });
    }
  }

  return { processed, escalated, failed };
}

module.exports = {
  tick,
  processTimedOutApproval
};
