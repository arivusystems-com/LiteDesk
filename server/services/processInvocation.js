/**
 * ============================================================================
 * PLATFORM CORE: Process Invocation Service (Integration Layer)
 * ============================================================================
 *
 * Formal Process invocation API/service that provides a controlled integration
 * layer between Automation Rules and the Process Engine.
 *
 * This service:
 * - Initializes ProcessExecution
 * - Enforces Process Engine constraints
 * - Is reusable by Automation Engine, manual triggers, and Process Designer UI
 * - Supports input mapping from automation context to process dataBag
 *
 * ============================================================================
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const Process = require('../models/Process');
const ProcessExecution = require('../models/ProcessExecution');
const ApprovalInstance = require('../models/ApprovalInstance');
const { buildExecutionContext } = require('./processExecutionContext');
const { executeNode } = require('./processNodeHandlers');
const { createLogger } = require('./automationLogger');

const log = createLogger('processInvocation');

/**
 * Validate process is active and trigger matches.
 *
 * @param {Object} process - Process document
 * @param {Object} triggerContext - Trigger context (event or manual params)
 * @returns {{ valid: boolean, error?: string }}
 */
function validateProcessTrigger(process, triggerContext) {
  if (!process) {
    return { valid: false, error: 'Process not found' };
  }

  if (process.status !== 'active') {
    return { valid: false, error: `Process status is ${process.status}, must be 'active'` };
  }

  // Validate trigger match
  if (process.trigger.type === 'domain_event') {
    if (!triggerContext.event) {
      return { valid: false, error: 'Process requires domain event trigger' };
    }
    if (process.trigger.eventType && triggerContext.event.eventType !== process.trigger.eventType) {
      return { valid: false, error: `Event type mismatch: expected ${process.trigger.eventType}, got ${triggerContext.event.eventType}` };
    }
  } else if (process.trigger.type === 'manual') {
    // Manual trigger - no event validation needed
    if (!triggerContext.manualParams) {
      return { valid: false, error: 'Process requires manual trigger parameters' };
    }
  } else {
    return { valid: false, error: `Unsupported trigger type: ${process.trigger.type}` };
  }

  return { valid: true };
}

/**
 * Check if execution already exists (idempotency).
 *
 * @param {string} executionId - Execution ID
 * @returns {Promise<boolean>}
 */
async function executionExists(executionId) {
  try {
    const existing = await ProcessExecution.findOne({ executionId }).lean();
    return !!existing;
  } catch {
    return false;
  }
}

/**
 * Find the starting node for a process.
 *
 * @param {Object} process - Process document
 * @returns {Object|null} - Starting ProcessNode
 */
function findStartNode(process) {
  // For domain_event triggers, find trigger node
  if (process.trigger.type === 'domain_event') {
    return process.nodes.find(n => n.type === 'trigger') || null;
  }

  // For manual triggers, find first node (or node with order=0)
  const sortedNodes = [...process.nodes].sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    return 0;
  });

  return sortedNodes[0] || null;
}

/**
 * Find next node(s) from current node using edges.
 *
 * @param {string} currentNodeId - Current node ID
 * @param {Array} edges - ProcessEdge[]
 * @returns {string|null} - Next node ID
 */
function findNextNode(currentNodeId, edges) {
  const outgoingEdges = edges.filter(e => e.fromNodeId === currentNodeId);
  return outgoingEdges.length > 0 ? outgoingEdges[0]?.toNodeId : null;
}

/**
 * Generate unique approval ID.
 * @returns {string}
 */
function generateApprovalId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
}

/**
 * Run the execution loop from a given node. Used by startProcess and resumeProcess.
 *
 * @param {Object} process - Process document (lean)
 * @param {Object} execution - ProcessExecution document
 * @param {Object} context - ProcessExecutionContext
 * @param {{ startNode: Object, automationExecutionId?: string }} options
 * @returns {Promise<{ ok: boolean, executionId: string, paused?: boolean, approvalInstanceId?: string, error?: string }>}
 */
async function runExecutionLoop(process, execution, context, options) {
  const { startNode, automationExecutionId = null } = options;
  const nodeMap = new Map(process.nodes.map(n => [n.id, n]));
  const edges = process.edges || [];
  let currentNode = startNode;
  let executionComplete = false;

  while (!executionComplete && currentNode) {
    await ProcessExecution.updateOne(
      { _id: execution._id },
      { currentNodeId: currentNode.id }
    );

    const result = await executeNode(currentNode, context, edges);

    if (!result.ok) {
      await ProcessExecution.updateOne(
        { _id: execution._id },
        {
          status: 'failed',
          error: result.error || 'Node execution failed',
          completedAt: new Date(),
          dataBag: null,
          behaviorProposals: null,
          approvalInstanceId: null
        }
      );
      log.info('process_failed', {
        executionId: context.executionId,
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        error: result.error,
        automationExecutionId: automationExecutionId?.toString()
      });
      return { ok: false, error: result.error, executionId: context.executionId };
    }

    if (result.paused && currentNode.type === 'approval_gate') {
      const approvalId = generateApprovalId();
      const approval = await ApprovalInstance.create({
        approvalId,
        processExecutionId: execution._id,
        processId: process._id,
        nodeId: currentNode.id,
        entityType: context.entityType,
        entityId: context.entityId,
        organizationId: context.organizationId ? new mongoose.Types.ObjectId(context.organizationId) : null,
        approvers: (result.approverUserIds || []).map(id => new mongoose.Types.ObjectId(id)),
        status: 'pending',
        timeoutAt: result.timeoutAt || null,
        configSnapshot: result.configSnapshot || null
      });

      await ProcessExecution.updateOne(
        { _id: execution._id },
        {
          status: 'waiting_for_approval',
          currentNodeId: currentNode.id,
          dataBag: context.dataBag || null,
          behaviorProposals: context.behaviorProposals || null,
          approvalInstanceId: approval._id
        }
      );

      log.info('approval_requested', {
        executionId: context.executionId,
        approvalId,
        processId: process._id.toString(),
        nodeId: currentNode.id,
        approverCount: (result.approverUserIds || []).length,
        automationExecutionId: automationExecutionId?.toString()
      });

      return {
        ok: true,
        executionId: context.executionId,
        paused: true,
        approvalInstanceId: approval._id.toString()
      };
    }

    if (currentNode.type === 'end' || result.terminated) {
      executionComplete = true;
      break;
    }

    let nextNodeId = result.nextNodeId ?? findNextNode(currentNode.id, edges);
    if (!nextNodeId) {
      executionComplete = true;
      break;
    }

    currentNode = nodeMap.get(nextNodeId);
    if (!currentNode) {
      await ProcessExecution.updateOne(
        { _id: execution._id },
        {
          status: 'failed',
          error: `Next node not found: ${nextNodeId}`,
          completedAt: new Date(),
          dataBag: null,
          behaviorProposals: null,
          approvalInstanceId: null
        }
      );
      return { ok: false, error: `Next node not found: ${nextNodeId}`, executionId: context.executionId };
    }
  }

  await ProcessExecution.updateOne(
    { _id: execution._id },
    {
      status: 'completed',
      currentNodeId: null,
      completedAt: new Date(),
      dataBag: null,
      behaviorProposals: null,
      approvalInstanceId: null
    }
  );

  log.info('process_completed', {
    executionId: context.executionId,
    processId: process._id.toString(),
    processName: process.name,
    automationExecutionId: automationExecutionId?.toString()
  });

  return { ok: true, executionId: context.executionId };
}

/**
 * Start a process execution (formal invocation entry point).
 *
 * This method:
 * - Validates process exists and is active
 * - Validates trigger matches
 * - Enforces idempotency
 * - Initializes ProcessExecution
 * - Executes process nodes sequentially
 *
 * @param {Object} params
 * @param {string} params.processId - Process ID
 * @param {Object} [params.event] - Domain event (if triggered by event)
 * @param {Object} [params.manualParams] - Manual invocation params (if manual)
 * @param {Object} [params.inputMapping] - Key-value mapping to populate dataBag
 * @param {string} [params.automationExecutionId] - Automation execution ID (if started from automation)
 * @returns {Promise<{ ok: boolean, executionId?: string, error?: string }>}
 */
async function startProcess(params) {
  const {
    processId,
    event = null,
    manualParams = {},
    inputMapping = {},
    automationExecutionId = null
  } = params;

  try {
    // Load process
    const process = await Process.findById(processId).lean();
    if (!process) {
      return { ok: false, error: `Process not found: ${processId}` };
    }

    // Validate process trigger
    const validation = validateProcessTrigger(process, { event, manualParams });
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    // Build execution context
    const context = buildExecutionContext({
      processId: process._id.toString(),
      appKey: process.appKey,
      event,
      entityType: manualParams.entityType,
      entityId: manualParams.entityId,
      organizationId: manualParams.organizationId || event?.organizationId,
      triggeredBy: manualParams.triggeredBy || event?.triggeredBy,
      ownerId: manualParams.ownerId || event?.ownerId
    });

    // Apply input mapping to dataBag
    if (inputMapping && typeof inputMapping === 'object') {
      Object.assign(context.dataBag, inputMapping);
    }

    // Check idempotency
    const exists = await executionExists(context.executionId);
    if (exists) {
      log.info('process_execution_skipped', {
        executionId: context.executionId,
        reason: 'already_executed',
        automationExecutionId
      });
      return { ok: true, executionId: context.executionId, skipped: true };
    }

    // Create execution record
    const execution = await ProcessExecution.create({
      executionId: context.executionId,
      processId: process._id,
      status: 'running',
      appKey: process.appKey,
      entityType: context.entityType,
      entityId: context.entityId,
      organizationId: context.organizationId ? new mongoose.Types.ObjectId(context.organizationId) : null,
      triggeredBy: context.triggeredBy ? new mongoose.Types.ObjectId(context.triggeredBy) : null,
      eventId: event?.eventId || null,
      automationExecutionId: automationExecutionId ? new mongoose.Types.ObjectId(automationExecutionId) : null,
      startedAt: new Date()
    });

    // Log process start (with automation context if applicable)
    const logData = {
      executionId: context.executionId,
      processId: process._id.toString(),
      processName: process.name,
      appKey: process.appKey,
      entityType: context.entityType,
      entityId: context.entityId
    };

    if (automationExecutionId) {
      log.info('process_started_from_automation', {
        ...logData,
        automationExecutionId: automationExecutionId.toString()
      });
    } else {
      log.info('process_started', logData);
    }

    // Find start node
    const startNode = findStartNode(process);
    if (!startNode) {
      await ProcessExecution.updateOne(
        { _id: execution._id },
        { status: 'failed', error: 'No start node found', completedAt: new Date() }
      );
      return { ok: false, error: 'No start node found' };
    }

    return await runExecutionLoop(process, execution, context, {
      startNode,
      automationExecutionId
    });
  } catch (err) {
    log.error('process_invocation_error', {
      processId,
      error: err.message,
      stack: err.stack,
      automationExecutionId: automationExecutionId?.toString()
    });

    // Try to update execution record if it exists
    try {
      const execution = await ProcessExecution.findOne({ executionId: `${processId}:${event?.eventId || 'manual'}` });
      if (execution) {
        await ProcessExecution.updateOne(
          { _id: execution._id },
          {
            status: 'failed',
            error: err.message,
            completedAt: new Date()
          }
        );
      }
    } catch {
      // Ignore update errors
    }

    return { ok: false, error: err.message };
  }
}

/**
 * Build execution context from a paused ProcessExecution (for resume).
 *
 * @param {Object} execution - ProcessExecution document (lean)
 * @param {Object} process - Process document (lean)
 * @returns {Object} ProcessExecutionContext
 */
function buildContextFromPausedExecution(execution, process) {
  const orgId = execution.organizationId?.toString?.() || execution.organizationId;
  const event = execution.eventId
    ? {
        eventId: execution.eventId,
        entityType: execution.entityType,
        entityId: execution.entityId,
        organizationId: orgId,
        triggeredBy: execution.triggeredBy
      }
    : null;

  return {
    executionId: execution.executionId,
    processId: execution.processId?.toString?.() || execution.processId,
    appKey: execution.appKey || process.appKey,
    entityType: execution.entityType,
    entityId: execution.entityId,
    organizationId: orgId,
    triggeredBy: execution.triggeredBy,
    ownerId: null,
    event,
    dataBag: execution.dataBag || {},
    behaviorProposals: execution.behaviorProposals || {
      fieldRules: [],
      ownershipRules: [],
      statusGuards: []
    }
  };
}

/**
 * Resume a process after approval (Phase 3).
 * Loads paused execution, continues from node after approval_gate.
 *
 * @param {Object} params
 * @param {string} params.approvalInstanceId - ApprovalInstance _id
 * @returns {Promise<{ ok: boolean, executionId?: string, error?: string }>}
 */
async function resumeProcess(params) {
  const { approvalInstanceId } = params;

  try {
    const approval = await ApprovalInstance.findById(approvalInstanceId).lean();
    if (!approval) {
      return { ok: false, error: 'Approval not found' };
    }
    if (approval.status !== 'approved') {
      return { ok: false, error: `Approval status is ${approval.status}, cannot resume` };
    }

    const execution = await ProcessExecution.findById(approval.processExecutionId).lean();
    if (!execution) {
      return { ok: false, error: 'Process execution not found' };
    }
    if (execution.status !== 'waiting_for_approval') {
      return { ok: false, error: `Execution status is ${execution.status}, cannot resume` };
    }
    if (String(execution.approvalInstanceId) !== String(approvalInstanceId)) {
      return { ok: false, error: 'Approval does not match execution' };
    }

    const process = await Process.findById(execution.processId).lean();
    if (!process) {
      return { ok: false, error: 'Process not found' };
    }
    if (process.status !== 'active') {
      return { ok: false, error: `Process status is ${process.status}, cannot resume` };
    }

    const context = buildContextFromPausedExecution(execution, process);
    const nodeMap = new Map(process.nodes.map(n => [n.id, n]));
    const nextNodeId = findNextNode(approval.nodeId, process.edges || []);
    if (!nextNodeId) {
      await ProcessExecution.updateOne(
        { _id: execution._id },
        {
          status: 'completed',
          currentNodeId: null,
          completedAt: new Date(),
          dataBag: null,
          behaviorProposals: null,
          approvalInstanceId: null
        }
      );
      log.info('process_completed', {
        executionId: execution.executionId,
        processId: process._id.toString(),
        processName: process.name,
        note: 'resumed after approval; no next node'
      });
      return { ok: true, executionId: execution.executionId };
    }

    const nextNode = nodeMap.get(nextNodeId);
    if (!nextNode) {
      return { ok: false, error: `Next node not found: ${nextNodeId}` };
    }

    await ProcessExecution.updateOne(
      { _id: execution._id },
      { status: 'running', approvalInstanceId: null }
    );

    log.info('process_resumed_after_approval', {
      executionId: execution.executionId,
      processId: process._id.toString(),
      approvalId: approval.approvalId,
      nodeId: approval.nodeId,
      nextNodeId
    });

    return await runExecutionLoop(process, execution, context, {
      startNode: nextNode,
      automationExecutionId: null
    });
  } catch (err) {
    log.error('resume_process_error', {
      approvalInstanceId,
      error: err.message,
      stack: err.stack
    });
    return { ok: false, error: err.message };
  }
}

module.exports = {
  startProcess,
  resumeProcess,
  validateProcessTrigger,
  findNextNode,
  runExecutionLoop
};
