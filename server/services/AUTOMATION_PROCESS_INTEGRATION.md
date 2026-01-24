# Automation-Process Integration Layer - Implementation Summary

## Overview

This document summarizes the implementation of the controlled integration layer between Automation Rules and the Process Engine. This integration allows Automation Rules to start Processes and Processes to reuse Automation Actions, **without merging the two systems or duplicating logic**.

## Implementation Status: ✅ COMPLETE

All integration components have been implemented according to the specification.

## Components Implemented

### 1. New Automation Action: `start_process`

**Location:** `server/services/automationActionHandlers.js`

**Action Type:**
```javascript
{
  "type": "start_process",
  "params": {
    "processId": "string",
    "inputMapping": { "optional": "key-value mapping" }
  }
}
```

**Behavior:**
- ✅ Validates target Process exists and is active
- ✅ Starts Process Execution using triggering domain event and entity context
- ✅ Passes mapped values into ProcessExecutionContext.dataBag
- ✅ Respects idempotency (eventId + ruleId)
- ✅ Fails gracefully if process cannot start
- ✅ Links to AutomationExecution via `automationExecutionId`

### 2. Process Invocation Entry Point

**Location:** `server/services/processInvocation.js`

**Service:** `startProcess({ processId, triggerContext, inputMapping, automationExecutionId })`

**Capabilities:**
- ✅ Initializes ProcessExecution
- ✅ Enforces Process Engine constraints
- ✅ Reusable by:
  - Automation Engine (via `start_process` action)
  - Manual triggers (via `processExecutor.executeManually()`)
  - Future Process Designer UI

**Validation:**
- ✅ Process exists and is active
- ✅ Trigger matches initiating event
- ✅ Idempotency check (prevents duplicate execution)

### 3. Action Delegation (Formalized)

**Location:** `server/services/processNodeHandlers.js`

**Implementation:**
- ✅ Process action nodes delegate exclusively to `automationActionHandlers.execute()`
- ✅ No reimplementation of action logic
- ✅ One source of truth for side effects
- ✅ No drift between automation and processes

**Example:**
```javascript
// Process action node delegates to automation handler
const result = await executeAction(actionType, actionContext, actionParams);
```

### 4. Execution Boundary Rules (LOCKED)

**Location:** `server/services/EXECUTION_BOUNDARY_RULES.md`

**Rules Enforced:**

**Automation Rules:**
- ✅ Single-step
- ✅ Reactive
- ✅ Stateless
- ✅ **CAN** start Processes

**Processes:**
- ✅ Multi-step
- ✅ Orchestrated
- ✅ Stateful
- ✅ **CAN** use Automation Actions (delegation)
- ✅ **CANNOT** define Automation Rules

**Integration Direction:**
- ✅ Automation → Process (allowed)
- ✅ Process → Automation Actions (delegation only)
- ❌ Process → Automation Rules (forbidden)

### 5. Observability

**Logging Events:**

**New Event:** `process_started_from_automation`
- Links automation execution to process execution
- Fields: `executionId`, `processId`, `automationExecutionId`, `entityType`, `entityId`

**Existing Events Enhanced:**
- `process_started` - Includes `automationExecutionId` if started from automation
- `process_completed` - Includes `automationExecutionId` if started from automation
- `process_failed` - Includes `automationExecutionId` if started from automation
- `automation_action_completed` - Includes `processExecutionId` for `start_process` actions

**Linking Fields:**

**ProcessExecution Model:**
- ✅ `automationExecutionId` - Links to AutomationExecution (if started from automation)
- ✅ `eventId` - Links to domain event
- ✅ `processId` - Links to Process definition

**Trace Path:**
```
Domain Event → Automation Rule → Automation Execution → Process Execution
```

### 6. Safety & Validation

**Hard-Fail Conditions:**

1. ✅ **Target process is not active**
   - Error: `Process status is {status}, must be 'active'`

2. ✅ **Process trigger does not match initiating event**
   - Error: `Event type mismatch: expected {expected}, got {actual}`

3. ✅ **Duplicate execution detected**
   - Execution skipped (logged, not failed)
   - Idempotency: `processId + eventId` (unique)

**Idempotency:**
- ✅ Automation Rules: `eventId + ruleId + actionIndex` (unique)
- ✅ Process Executions: `processId + eventId` (unique)
- ✅ Automation → Process: Linked via `automationExecutionId` field

## Files Created/Modified

### New Files
1. `server/services/processInvocation.js` - Formal process invocation service
2. `server/services/EXECUTION_BOUNDARY_RULES.md` - Execution boundary rules documentation

### Modified Files
1. `server/models/ProcessExecution.js` - Added `automationExecutionId` field
2. `server/services/automationActionHandlers.js` - Added `start_process` handler
3. `server/services/automationEngine.js` - Updated to pass `automationExecutionId` to actions
4. `server/services/processExecutor.js` - Updated to use `processInvocation.startProcess()`

## Integration Flow

### Flow 1: Automation Starts Process

```
Domain Event Emitted
  ↓
Automation Engine resolves matching rules
  ↓
Automation Rule with start_process action executes
  ↓
start_process handler calls processInvocation.startProcess()
  ↓
Process Execution created and linked via automationExecutionId
  ↓
Process nodes execute sequentially
  ↓
Process action nodes delegate to automationActionHandlers
```

### Flow 2: Process Uses Automation Actions

```
Process Execution running
  ↓
Process action node executes
  ↓
Delegates to automationActionHandlers.execute()
  ↓
Same logic as Automation Rules (no duplication)
```

## Examples

### Example 1: Automation Rule Starts Process

**Automation Rule:**
```json
{
  "name": "Start Win Process",
  "trigger": {
    "eventType": "deal.stage.changed",
    "condition": {
      "currentState.stage": "Closed Won"
    }
  },
  "action": {
    "type": "start_process",
    "params": {
      "processId": "win_process_123",
      "inputMapping": {
        "dealValue": "{{currentState.amount}}",
        "customerName": "{{currentState.accountName}}"
      }
    }
  }
}
```

**Result:**
- Process Execution created
- Linked to AutomationExecution via `automationExecutionId`
- Input mapping populated in `dataBag`
- Process executes multi-step workflow

### Example 2: Process Uses Automation Action

**Process Action Node:**
```json
{
  "id": "node_1",
  "type": "action",
  "config": {
    "actionType": "create_task",
    "params": {
      "title": "Send contract",
      "assignee": "owner",
      "dueInDays": 3
    }
  }
}
```

**Result:**
- Delegates to `automationActionHandlers.execute('create_task', ...)`
- Uses same logic as Automation Rules
- No duplication

## Testing Recommendations

1. **Integration Tests:**
   - Test automation rule starting a process
   - Test process using automation actions
   - Test idempotency (duplicate execution prevention)
   - Test error handling (inactive process, trigger mismatch)

2. **Observability Tests:**
   - Verify `process_started_from_automation` logging
   - Verify linking fields (`automationExecutionId`, `processExecutionId`)
   - Verify trace path (domain event → automation → process)

3. **Boundary Tests:**
   - Verify processes cannot define automation rules
   - Verify one-way integration (automation → process only)

## Outcome

✅ **Automation Rules can escalate into Processes**  
✅ **Processes reuse Automation Actions cleanly**  
✅ **No overlap or duplication of responsibility**  
✅ **System remains deterministic, auditable, and safe**  

This establishes the **final behavioral spine of the platform**.
