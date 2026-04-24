const {
  CASE_STATUSES,
  CASE_STATUS_TRANSITIONS
} = require('../constants/caseLifecycle');

const ACTIVE_SLA_STATUSES = new Set(['New', 'Assigned', 'In Progress']);

function isValidCaseStatus(status) {
  return CASE_STATUSES.includes(status);
}

function canTransitionCaseStatus(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  const allowed = CASE_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

function createInitialSlaCycle(cycleNo = 1, now = new Date()) {
  return {
    cycleNo,
    startedAt: now,
    pausedAt: null,
    stoppedAt: null,
    status: 'running',
    responseTargetAt: null,
    resolutionTargetAt: null,
    policySnapshot: {}
  };
}

function applyStatusToSlaCycle(currentCycle, nextStatus, now = new Date()) {
  const cycle = {
    ...currentCycle
  };

  if (nextStatus === 'On Hold') {
    cycle.status = 'paused';
    if (!cycle.pausedAt) cycle.pausedAt = now;
    return cycle;
  }

  if (nextStatus === 'Resolved' || nextStatus === 'Closed') {
    cycle.status = 'stopped';
    if (!cycle.stoppedAt) cycle.stoppedAt = now;
    return cycle;
  }

  if (ACTIVE_SLA_STATUSES.has(nextStatus)) {
    cycle.status = 'running';
    cycle.pausedAt = null;
    return cycle;
  }

  return cycle;
}

function createReopenedSlaState(currentCycle, now = new Date()) {
  const previousCycle = {
    ...currentCycle,
    status: 'stopped',
    stoppedAt: currentCycle?.stoppedAt || now
  };

  const nextCycleNo = Number(currentCycle?.cycleNo || 0) + 1;
  return {
    previousCycle,
    nextCycle: createInitialSlaCycle(nextCycleNo, now)
  };
}

module.exports = {
  isValidCaseStatus,
  canTransitionCaseStatus,
  createInitialSlaCycle,
  applyStatusToSlaCycle,
  createReopenedSlaState
};
