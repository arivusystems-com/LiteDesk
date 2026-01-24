/**
 * ============================================================================
 * PLATFORM CORE: Flow Health Analytics Service (Business Flow Health)
 * ============================================================================
 *
 * Computes health metrics from ProcessExecution and ApprovalInstance records.
 * Read-only analytics - no execution logic changes.
 *
 * ============================================================================
 */

const mongoose = require('mongoose');
const ProcessExecution = require('../models/ProcessExecution');
const ApprovalInstance = require('../models/ApprovalInstance');
const BusinessFlow = require('../models/BusinessFlow');
const Process = require('../models/Process');
const { createLogger } = require('./automationLogger');

const log = createLogger('flowHealthAnalytics');

/**
 * Get flow health summary for a Business Flow.
 */
async function getFlowHealthSummary(flowId, organizationId, options = {}) {
  const { days = 30 } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Load Business Flow
    const flow = await BusinessFlow.findById(flowId)
      .populate('processIds')
      .lean();

    if (!flow || String(flow.organizationId) !== String(organizationId)) {
      return { ok: false, error: 'Business flow not found' };
    }

    const processIds = (flow.processIds || []).map(p => p._id || p);

    // Get all executions for processes in this flow
    const executions = await ProcessExecution.find({
      processId: { $in: processIds },
      organizationId: new mongoose.Types.ObjectId(organizationId),
      startedAt: { $gte: startDate }
    }).lean();

    // Calculate summary metrics
    const totalExecutions = executions.length;
    const completedExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const waitingApproval = executions.filter(e => e.status === 'waiting_for_approval').length;
    const runningExecutions = executions.filter(e => e.status === 'running').length;

    const completionRate = totalExecutions > 0 
      ? Math.round((completedExecutions / totalExecutions) * 100) 
      : 0;
    const failureRate = totalExecutions > 0 
      ? Math.round((failedExecutions / totalExecutions) * 100) 
      : 0;
    const approvalPauseRate = totalExecutions > 0 
      ? Math.round((waitingApproval / totalExecutions) * 100) 
      : 0;

    // Calculate average time to complete (for completed executions)
    const completedWithDuration = executions.filter(e => 
      e.status === 'completed' && e.completedAt && e.startedAt
    );
    const avgCompletionTime = completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce((sum, e) => 
            sum + (new Date(e.completedAt) - new Date(e.startedAt)), 0
          ) / completedWithDuration.length / 1000 / 60 // in minutes
        )
      : 0;

    // Determine health status
    let healthStatus = 'healthy';
    if (failureRate > 20 || approvalPauseRate > 50) {
      healthStatus = 'critical';
    } else if (failureRate > 10 || approvalPauseRate > 30) {
      healthStatus = 'needs_attention';
    }

    return {
      ok: true,
      data: {
        flowId,
        flowName: flow.name,
        period: { days, startDate },
        summary: {
          totalExecutions,
          completedExecutions,
          failedExecutions,
          waitingApproval,
          runningExecutions,
          completionRate,
          failureRate,
          approvalPauseRate,
          avgCompletionTimeMinutes: avgCompletionTime,
          healthStatus
        }
      }
    };
  } catch (error) {
    log.error('get_flow_health_summary_error', { flowId, error: error.message });
    return { ok: false, error: error.message };
  }
}

/**
 * Get per-process metrics for a Business Flow.
 */
async function getProcessMetrics(flowId, organizationId, options = {}) {
  const { days = 30 } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Load Business Flow with processes
    const flow = await BusinessFlow.findById(flowId)
      .populate('processIds')
      .lean();

    if (!flow || String(flow.organizationId) !== String(organizationId)) {
      return { ok: false, error: 'Business flow not found' };
    }

    const processes = flow.processIds || [];
    const processMetrics = [];

    for (const process of processes) {
      const processId = process._id || process;

      // Get executions for this process
      const executions = await ProcessExecution.find({
        processId: new mongoose.Types.ObjectId(processId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        startedAt: { $gte: startDate }
      }).lean();

      const total = executions.length;
      const completed = executions.filter(e => e.status === 'completed').length;
      const failed = executions.filter(e => e.status === 'failed').length;
      const waiting = executions.filter(e => e.status === 'waiting_for_approval').length;

      // Calculate average duration
      const completedWithDuration = executions.filter(e => 
        e.status === 'completed' && e.completedAt && e.startedAt
      );
      const avgDurationMinutes = completedWithDuration.length > 0
        ? Math.round(
            completedWithDuration.reduce((sum, e) => 
              sum + (new Date(e.completedAt) - new Date(e.startedAt)), 0
            ) / completedWithDuration.length / 1000 / 60
          )
        : 0;

      // Get approval metrics for this process
      const approvals = await ApprovalInstance.find({
        processId: new mongoose.Types.ObjectId(processId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: startDate }
      }).lean();

      const pendingApprovals = approvals.filter(a => a.status === 'pending').length;
      const approvedCount = approvals.filter(a => a.status === 'approved').length;
      const rejectedCount = approvals.filter(a => a.status === 'rejected').length;
      const timedOutCount = approvals.filter(a => a.status === 'timed_out').length;

      // Calculate average approval wait time
      const decidedApprovals = approvals.filter(a => 
        a.decidedAt && a.createdAt && (a.status === 'approved' || a.status === 'rejected')
      );
      const avgApprovalWaitMinutes = decidedApprovals.length > 0
        ? Math.round(
            decidedApprovals.reduce((sum, a) => 
              sum + (new Date(a.decidedAt) - new Date(a.createdAt)), 0
            ) / decidedApprovals.length / 1000 / 60
          )
        : 0;

      processMetrics.push({
        processId: processId.toString(),
        processName: process.name || 'Unknown',
        trigger: process.trigger || {},
        status: process.status || 'draft',
        metrics: {
          totalExecutions: total,
          completedExecutions: completed,
          failedExecutions: failed,
          waitingApproval: waiting,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          failureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
          avgDurationMinutes
        },
        approvalMetrics: {
          totalApprovals: approvals.length,
          pendingApprovals,
          approvedCount,
          rejectedCount,
          timedOutCount,
          avgApprovalWaitMinutes
        }
      });
    }

    return {
      ok: true,
      data: {
        flowId,
        flowName: flow.name,
        period: { days, startDate },
        processes: processMetrics
      }
    };
  } catch (error) {
    log.error('get_process_metrics_error', { flowId, error: error.message });
    return { ok: false, error: error.message };
  }
}

/**
 * Detect bottlenecks in a Business Flow.
 */
async function detectBottlenecks(flowId, organizationId, options = {}) {
  const { days = 30 } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Get process metrics first
    const metricsResult = await getProcessMetrics(flowId, organizationId, options);
    if (!metricsResult.ok) {
      return metricsResult;
    }

    const { processes } = metricsResult.data;
    const bottlenecks = [];

    for (const proc of processes) {
      const { metrics, approvalMetrics, processName, processId } = proc;

      // High failure rate bottleneck
      if (metrics.failureRate > 10) {
        bottlenecks.push({
          type: 'high_failure_rate',
          severity: metrics.failureRate > 20 ? 'critical' : 'warning',
          processId,
          processName,
          metric: metrics.failureRate,
          message: `${metrics.failureRate}% of executions fail`,
          recommendation: 'Review process configuration and error logs'
        });
      }

      // Long approval wait time bottleneck
      if (approvalMetrics.avgApprovalWaitMinutes > 60 * 24) { // > 24 hours
        bottlenecks.push({
          type: 'long_approval_wait',
          severity: approvalMetrics.avgApprovalWaitMinutes > 60 * 48 ? 'critical' : 'warning',
          processId,
          processName,
          metric: approvalMetrics.avgApprovalWaitMinutes,
          message: `Average approval wait time is ${formatDuration(approvalMetrics.avgApprovalWaitMinutes)}`,
          recommendation: 'Consider adding more approvers or reducing approval threshold'
        });
      }

      // High pending approval count
      if (approvalMetrics.pendingApprovals > 5) {
        bottlenecks.push({
          type: 'pending_approvals_backlog',
          severity: approvalMetrics.pendingApprovals > 10 ? 'critical' : 'warning',
          processId,
          processName,
          metric: approvalMetrics.pendingApprovals,
          message: `${approvalMetrics.pendingApprovals} approvals pending`,
          recommendation: 'Review pending approvals in Approval Inbox'
        });
      }

      // High rejection rate
      const totalDecisions = approvalMetrics.approvedCount + approvalMetrics.rejectedCount;
      const rejectionRate = totalDecisions > 0 
        ? Math.round((approvalMetrics.rejectedCount / totalDecisions) * 100) 
        : 0;
      if (rejectionRate > 30 && totalDecisions >= 5) {
        bottlenecks.push({
          type: 'high_rejection_rate',
          severity: rejectionRate > 50 ? 'critical' : 'warning',
          processId,
          processName,
          metric: rejectionRate,
          message: `${rejectionRate}% of approvals are rejected`,
          recommendation: 'Review approval criteria or process conditions'
        });
      }

      // High timeout rate
      const timeoutRate = approvalMetrics.totalApprovals > 0
        ? Math.round((approvalMetrics.timedOutCount / approvalMetrics.totalApprovals) * 100)
        : 0;
      if (timeoutRate > 10 && approvalMetrics.totalApprovals >= 5) {
        bottlenecks.push({
          type: 'high_timeout_rate',
          severity: timeoutRate > 25 ? 'critical' : 'warning',
          processId,
          processName,
          metric: timeoutRate,
          message: `${timeoutRate}% of approvals time out`,
          recommendation: 'Increase timeout duration or add escalation approvers'
        });
      }
    }

    // Sort by severity (critical first)
    bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return {
      ok: true,
      data: {
        flowId,
        period: { days, startDate },
        bottlenecks,
        bottleneckCount: bottlenecks.length,
        criticalCount: bottlenecks.filter(b => b.severity === 'critical').length,
        warningCount: bottlenecks.filter(b => b.severity === 'warning').length
      }
    };
  } catch (error) {
    log.error('detect_bottlenecks_error', { flowId, error: error.message });
    return { ok: false, error: error.message };
  }
}

/**
 * Format duration in minutes to human-readable string.
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  } else if (minutes < 60 * 24) {
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.round(minutes / (60 * 24));
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}

module.exports = {
  getFlowHealthSummary,
  getProcessMetrics,
  detectBottlenecks
};
