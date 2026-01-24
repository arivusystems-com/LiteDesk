# Execution Boundary Rules

**Version:** 1.0  
**Date:** January 2026  
**Status:** Contract-Locked (Frozen)  
**Type:** Platform Doctrine

---

## Purpose

This document defines the **execution boundary rules** that govern the relationship between Automation Rules and Processes. These rules are **LOCKED** and must be enforced in code and documentation.

---

## Core Principles

### 1. Automation Rules

**Characteristics:**
- ✅ **Single-step** - One action per rule execution
- ✅ **Reactive** - Triggered by domain events
- ✅ **Stateless** - No persistent execution state

**Capabilities:**
- Can execute actions: `create_task`, `notify_user`, `start_process`
- Can start Processes (escalation)
- Cannot define nested Automation Rules

### 2. Processes

**Characteristics:**
- ✅ **Multi-step** - Graph of nodes executed sequentially
- ✅ **Orchestrated** - Controlled flow with conditions and branching
- ✅ **Stateful** - Maintains execution state (ProcessExecution)

**Capabilities:**
- Can execute action nodes (delegates to Automation Action Handlers)
- Can use data mapping, conditions, and branching
- **Cannot** define Automation Rules (one-way integration only)

---

## Integration Rules (LOCKED)

### Rule 1: Automation → Process (Allowed)

**Automation Rules CAN start Processes**

- Automation action `start_process` invokes Process Engine
- Process receives:
  - Triggering domain event context
  - Triggering entity context
  - Automation execution context (for linking)
  - Input mapping (optional key-value pairs → dataBag)

**Implementation:**
```javascript
// Automation Rule action
{
  "type": "start_process",
  "params": {
    "processId": "process_123",
    "inputMapping": {
      "customField": "{{event.currentState.stage}}"
    }
  }
}
```

### Rule 2: Process → Automation Actions (Delegation Only)

**Processes CAN execute Automation Actions**

- Process action nodes delegate to Automation Action Handlers
- **No reimplementation** - One source of truth for action logic
- Guarantees: No drift between automation and processes

**Implementation:**
```javascript
// Process action node
{
  "type": "action",
  "config": {
    "actionType": "create_task",
    "params": {
      "title": "Follow up",
      "assignee": "owner"
    }
  }
}
```

### Rule 3: Process → Automation Rules (FORBIDDEN)

**Processes CANNOT define Automation Rules**

- Processes are consumers of automation actions, not producers
- One-way integration: Automation → Process (only)
- Prevents circular dependencies and complexity

---

## Safety & Validation

### Hard-Fail Conditions

The system **MUST** hard-fail when:

1. **Target process is not active**
   - Process status must be `active`
   - Error: `Process status is {status}, must be 'active'`

2. **Process trigger does not match initiating event**
   - Domain event type must match process trigger
   - Error: `Event type mismatch: expected {expected}, got {actual}`

3. **Duplicate execution detected**
   - Execution ID already exists (idempotency check)
   - Error: Execution skipped (logged, not failed)

### Idempotency

- **Automation Rules**: `eventId + ruleId + actionIndex` (unique)
- **Process Executions**: `processId + eventId` (unique)
- **Automation → Process**: Linked via `automationExecutionId` field

---

## Observability

### Logging Events

**Automation → Process Links:**
- `process_started_from_automation`
  - Fields: `executionId`, `processId`, `automationExecutionId`, `entityType`, `entityId`

**Process Execution:**
- `process_started` - When execution begins
- `node_executed` - When each node executes
- `process_completed` - When execution succeeds
- `process_failed` - When execution fails

### Linking Fields

**ProcessExecution Model:**
- `automationExecutionId` - Links to AutomationExecution (if started from automation)
- `eventId` - Links to domain event
- `processId` - Links to Process definition

**Trace Path:**
```
Domain Event → Automation Rule → Automation Execution → Process Execution
```

---

## Implementation Notes

### Process Invocation Service

The `processInvocation.startProcess()` method is the **formal entry point** for:
- Automation Engine (via `start_process` action)
- Manual triggers (future)
- Process Designer UI (future)

This ensures:
- Consistent validation
- Consistent idempotency
- Consistent observability

### Action Delegation

Process action nodes **MUST** delegate to `automationActionHandlers.execute()`:
- No reimplementation of action logic
- One source of truth
- Guaranteed consistency

---

## Examples

### Example 1: Automation Starts Process

**Domain Event:** `deal.stage.changed` → `Closed Won`

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

**Process Execution:**
- Receives domain event context
- Receives input mapping in `dataBag`
- Executes multi-step workflow
- Linked to AutomationExecution via `automationExecutionId`

### Example 2: Process Uses Automation Actions

**Process Node:**
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

**Execution:**
- Delegates to `automationActionHandlers.execute('create_task', ...)`
- Uses same logic as Automation Rules
- No duplication

---

## Change Policy

These rules are **contract-locked**. Changes require:
1. Architecture review
2. Code updates
3. Documentation updates
4. Migration plan (if breaking)

---

## Summary

✅ **Automation Rules** → Can start Processes  
✅ **Processes** → Can use Automation Actions (delegation)  
❌ **Processes** → Cannot define Automation Rules  

**Result:** Clean integration, no duplication, one-way escalation, shared action logic.
