# PROCESS ENGINE — PHASE 3: Approvals & Escalations

## Overview

Phase 3 introduces approval and escalation semantics into the Process Engine. Processes can pause at `approval_gate` nodes until an approval decision is made. Escalations are time-based and rule-based, with no UI assumptions in the engine.

## 1. New Node Type: `approval_gate`

### Config Schema

```json
{
  "entityType": "people | organization | deal",
  "approvalType": "single | multi",
  "approvers": [
    { "type": "role | user | rule", "value": "string" }
  ],
  "onApprove": "continue",
  "onReject": "fail",
  "timeout": { "duration": "number", "unit": "hours | days" },
  "onTimeout": "escalate | fail"
}
```

### Behavior

- When reached: Process execution enters `waiting_for_approval`, execution is paused (not failed).
- No further nodes execute until resolution.
- Approval decision resumes or fails execution.
- Approvers are resolved via `approvalApproverResolver` (role | user | rule). No valid approvers → hard-fail.

## 2. ApprovalInstance Model

**Location:** `server/models/ApprovalInstance.js`

**Fields:** approvalId, processExecutionId, processId, nodeId, entityType, entityId, organizationId, approvers (resolved user IDs), status (pending | approved | rejected | timed_out | escalated), decidedBy, decidedAt, reason, escalatedApprovers, timeoutAt, configSnapshot.

Source of truth for approvals.

## 3. ProcessExecution State Extension

**Status enum:** `running` | `waiting_for_approval` | `completed` | `failed`

**New fields:**

- `dataBag`, `behaviorProposals`: Persisted when paused at approval_gate for deterministic resume.
- `approvalInstanceId`: Reference to ApprovalInstance when status is `waiting_for_approval`.

Execution persists paused state and resumes deterministically after approval.

## 4. Escalation Resolver

**Location:** `server/services/escalationResolver.js`

- **`tick()`**: Finds pending approvals with `timeoutAt <= now` and processes them.
- **On timeout + `onTimeout: fail`**: Marks approval `timed_out`, fails ProcessExecution, emits `approval.timed_out`.
- **On timeout + `onTimeout: escalate`**: Re-resolves approvers, updates ApprovalInstance (new approvers, still pending), emits `approval.escalated`.

No cron inside Process Engine. Scheduler calls `tick()` (e.g. via `scheduledJobs` — escalation job runs every minute when `ENABLE_ESCALATION_SCHEDULER` is not false).

## 5. Approval Decision API

**Routes:** `server/routes/approvalRoutes.js`  
**Base path:** `/api/admin/approvals`

- **POST `/api/admin/approvals/:id/approve`**  
  - Caller must be an authorized approver.  
  - Updates ApprovalInstance (status approved, decidedBy, decidedAt).  
  - Emits `approval.approved`.  
  - Calls `resumeProcess({ approvalInstanceId })`.  
  - Returns `{ success, data: { approvalId, executionId, resumed } }`.

- **POST `/api/admin/approvals/:id/reject`**  
  - Body: `{ reason?: string }`.  
  - Caller must be an authorized approver.  
  - Updates ApprovalInstance (status rejected, decidedBy, decidedAt, reason).  
  - Fails ProcessExecution, clears dataBag/behaviorProposals/approvalInstanceId.  
  - Emits `approval.rejected`.  
  - Returns `{ success, data: { approvalId } }`.

**Safety:** Hard-fail if approval already decided, or caller not in approvers.

## 6. Process Resumption

**Location:** `server/services/processInvocation.js` — `resumeProcess({ approvalInstanceId })`

1. Load ApprovalInstance; assert status `approved`.
2. Load ProcessExecution; assert status `waiting_for_approval` and matching approvalInstanceId.
3. Load Process; assert status `active`.
4. Build context from paused execution (dataBag, behaviorProposals, etc.).
5. Find next node after approval_gate via edges.
6. Set execution status to `running`, clear `approvalInstanceId`.
7. Log `process_resumed_after_approval`.
8. Run execution loop from next node (`runExecutionLoop`).

Idempotency preserved; no duplicate resume from same approval.

## 7. Observability

**Log events:**

- `approval_requested` — When process pauses at approval_gate (executionId, approvalId, nodeId, approverCount).
- `approval_approved` — When approval is approved (approvalId, processExecutionId, nodeId, decidedBy).
- `approval_rejected` — When approval is rejected (approvalId, processExecutionId, nodeId, decidedBy, reason).
- `approval_escalated` — When approval times out and escalates (approvalId, nodeId, newApproverCount).
- `approval_timed_out` — When approval times out and fails (approvalId, processExecutionId, nodeId).
- `process_resumed_after_approval` — When process resumes after approve (executionId, approvalId, nodeId, nextNodeId).

**Domain events emitted:** `approval.approved`, `approval.rejected`, `approval.timed_out`, `approval.escalated`.

## 8. Safety & Guardrails

- **Hard-fail** if: no valid approvers resolved, unauthorized user attempts decision, approval already decided.
- Approvals **never bypass** ownership, permissions, or system invariants.
- Approver resolution uses `approvalApproverResolver` (User/Role lookups, rule-based owner/triggeredBy).

## Files Created/Modified

### New

- `server/models/ApprovalInstance.js`
- `server/services/approvalApproverResolver.js`
- `server/services/escalationResolver.js`
- `server/controllers/approvalController.js`
- `server/routes/approvalRoutes.js`

### Modified

- `server/models/Process.js` — Added `approval_gate` to node type enum.
- `server/models/ProcessExecution.js` — Added `waiting_for_approval`, `dataBag`, `behaviorProposals`, `approvalInstanceId`.
- `server/services/processNodeHandlers.js` — `executeApprovalGate`, resolve approvers, return paused + config.
- `server/services/processInvocation.js` — `runExecutionLoop` (handles approval_gate pause), `resumeProcess`, `buildContextFromPausedExecution`.
- `server/services/processExecutor.js` — `approval_gate` in validNodeTypes.
- `server/controllers/processController.js` — `approval_gate` in NODE_TYPES.
- `server/services/scheduledJobs.js` — Escalation cron job (every minute), `ENABLE_ESCALATION_SCHEDULER`.
- `server/server.js` — Mount `/api/admin/approvals` routes.

## Out of Scope (Phase 3)

- Canvas UI changes.
- Approval UI screens (Phase 4C).
- Free-form approval chains, hardcoded approvers.
- Permission bypass, data mutation inside Process Engine.
- Loops or parallel execution.

Approvals are state machines, not workflows.
