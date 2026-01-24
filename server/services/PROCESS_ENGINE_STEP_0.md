# Process Engine Step 0 - Implementation Summary

## Overview

This document summarizes the implementation of the **Headless Process Runtime Kernel** (Step 0) for the LiteDesk platform. This is the authoritative foundation that defines what a process is and how it executes, independent of UI, drag-and-drop, or vertical behavior.

## Implementation Status: ✅ COMPLETE

All core components have been implemented according to the specification.

## Core Components

### 1. Core Models

#### Process Model (`server/models/Process.js`)
- **Fields**: id, name, description, appKey, trigger (type, eventType), status, version, nodes, edges, createdBy, timestamps
- **Node Types**: trigger, condition, action, data_mapping, end (strict enum validation)
- **Trigger Types**: domain_event, manual
- **Status**: draft, active, archived
- **Indexes**: Optimized for querying by appKey, status, and trigger type

#### ProcessExecution Model (`server/models/ProcessExecution.js`)
- **Fields**: executionId (unique), processId, status (running/completed/failed), currentNodeId, error, appKey, entityType, entityId, organizationId, triggeredBy, eventId, timestamps
- **Purpose**: Observability and auditability
- **Indexes**: Optimized for querying by processId, eventId, organizationId

### 2. Process Execution Context

#### ProcessExecutionContext (`server/services/processExecutionContext.js`)
- **Purpose**: Execution context object created per execution
- **Fields**: executionId, processId, appKey, entityType, entityId, organizationId, triggeredBy, ownerId, event, dataBag
- **Alignment**: Compatible with Domain Events and Automation Engine context
- **Idempotency**: Execution ID format: `processId:eventId` (domain events) or `processId:manual:timestamp:random` (manual)

### 3. Process Executor

#### Process Executor Service (`server/services/processExecutor.js`)
- **Capabilities**:
  - Accepts domain event or manual invocation triggers
  - Loads active Process definition
  - Initializes ProcessExecutionContext
  - Executes nodes sequentially
  - Traverses graph using edges
  - Stops execution at end node

- **Execution Rules (ENFORCED)**:
  - ✅ Sequential execution only
  - ✅ One node executes at a time
  - ✅ Deterministic replay from logs
  - ✅ Failure stops the process immediately

- **Functions**:
  - `executeProcess()` - Core execution logic
  - `executeByEvent()` - Execute processes triggered by domain events
  - `executeManually()` - Execute processes manually
  - `validateProcess()` - Constraint validation
  - `init()` - Initialize and subscribe to domain events

### 4. Node Execution Strategy

#### Node Handlers (`server/services/processNodeHandlers.js`)

**Trigger Node**:
- Validates trigger match
- Does NOT mutate data
- Does NOT advance state

**Condition Node**:
- Evaluates boolean logic using `context.event` and `context.dataBag`
- Supports operators: equals, not_equals, contains, exists
- Chooses outgoing edge based on result
- Field resolution: `event.*`, `dataBag.*`, or direct field access

**Action Node**:
- Delegates execution to existing Automation Action Handlers
- Respects permissions, ownership, and system invariants
- Compatible with `automationActionHandlers.execute()`

**Data Mapping Node**:
- Maps values between event payload, entity data, and dataBag
- Supports transforms: toString, toNumber, toBoolean
- Source/target format: `event.*`, `dataBag.*`, or direct field

**End Node**:
- Terminates execution cleanly

### 5. Safety, Authority & Identity

#### Authority Rules (LOCKED)
- ✅ Process Engine may propose actions
- ✅ System Invariants and Permissions validate and may block
- ✅ Process Engine NEVER bypasses:
  - Permissions
  - Ownership
  - Integrity rules

#### Idempotency
- ✅ Each execution uniquely identified
- ✅ Prevents duplicate execution for:
  - Same processId + same triggering eventId
- ✅ Execution ID format ensures uniqueness

### 6. Observability & Auditability

#### ProcessExecution Persistence
- ✅ Tracks execution state (running/completed/failed)
- ✅ Records current node during execution
- ✅ Captures errors with full context
- ✅ Timestamps: startedAt, completedAt

#### Structured Logging
- ✅ `process_started` - When execution begins
- ✅ `node_executed` - When each node executes
- ✅ `process_completed` - When execution succeeds
- ✅ `process_failed` - When execution fails
- ✅ Uses `automationLogger` for consistent logging format

### 7. Constraint Validation

#### Hard-Fail Validation
- ✅ Node type unsupported → Execution fails
- ✅ Edge references invalid nodes → Execution fails
- ✅ Trigger does not match → Execution fails
- ✅ Process status not active → Execution fails
- ✅ Missing required fields → Execution fails

## Integration Points

### Domain Events Integration
- ✅ Subscribes to domain events via `domainEvents.subscribe()`
- ✅ Automatically executes matching processes on event emission
- ✅ Initialized in `server.js` alongside automation engine

### Automation Action Handlers Integration
- ✅ Action nodes delegate to `automationActionHandlers.execute()`
- ✅ Compatible context format
- ✅ Respects existing permission and invariant checks

## Files Created/Modified

### New Files
1. `server/models/Process.js` - Process model (replaced existing)
2. `server/models/ProcessExecution.js` - Process execution model
3. `server/services/processExecutionContext.js` - Execution context builder
4. `server/services/processExecutor.js` - Main executor service
5. `server/services/processNodeHandlers.js` - Node type handlers

### Modified Files
1. `server/server.js` - Added process executor initialization

## Out of Scope (As Specified)

The following features are **explicitly NOT implemented** (as per Step 0 requirements):

- ❌ Drag & drop UI
- ❌ Visual designer
- ❌ Loops or parallel execution
- ❌ Time-based delays (only stubs allowed)
- ❌ Approval semantics
- ❌ Schema or field mutation
- ❌ Permission overrides
- ❌ Bypassing system invariants
- ❌ Vertical or app-specific logic

## Testing Recommendations

1. **Unit Tests**: Test each node handler independently
2. **Integration Tests**: Test full process execution flows
3. **Idempotency Tests**: Verify duplicate execution prevention
4. **Error Handling Tests**: Verify failure stops execution immediately
5. **Edge Cases**: Test invalid processes, missing nodes, circular references

## Next Steps

After Step 0 is validated:

1. **Step 1**: Process Designer UI (drag-and-drop)
2. **Step 2**: Advanced node types (loops, parallel execution)
3. **Step 3**: Time-based delays and scheduling
4. **Step 4**: Approval workflows
5. **Step 5**: Vertical-specific process templates

## Notes

- Process Engine shares execution semantics with Automation Engine
- Process Designer UI can be built later without rework
- Vertical flows become configuration, not code
- This is the execution kernel, not the designer
