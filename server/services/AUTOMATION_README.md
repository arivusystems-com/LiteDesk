# Automation Engine

Backend-only automation that reacts to lifecycle and stage changes. Resolves rules, executes actions (create_task, notify_user), and persists execution for idempotency.

## Domain Events

Emitted from service/controller layer, **only on real changes**:

| Entity       | Event Types                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| People       | `people.lifecycle.changed`, `people.type.changed`                            |
| Organization | `organization.lifecycle.changed`, `organization.type.changed`                |
| Deal         | `deal.stage.changed`, `deal.pipeline.changed`, `deal.deal.won`, `deal.deal.lost` |

Payload: `eventId`, `entityType`, `entityId`, `eventType`, `previousState`, `currentState`, `appKey`, `triggeredBy`, `organizationId`, `ownerId`.

- **Non-blocking**: delivery via `setImmediate`
- **Fire only on real changes**: callers compare previous vs current before emitting

## Automation Registry

- **Model**: `AutomationRule` (DB-persisted)
- **Trigger**: `eventType` + optional `condition` (e.g. `{ 'currentState.stage': 'Closed Won' }`)
- **Action**: `{ type, params }` — see Action Types below
- **Scope**: `appKey`, optional `entityType`, optional `organizationId`
- **Enabled** / disabled per rule; only enabled rules are resolved

## Action Types

### create_task

Creates a Task record.

| Param          | Type   | Required | Description                                      |
|----------------|--------|----------|--------------------------------------------------|
| title          | string | yes      | Task title                                       |
| description    | string | no       | Task description                                 |
| dueInDays      | number | no       | Due date = now + dueInDays                       |
| assignee       | string | no       | `owner` or `triggeredBy` (default)               |
| relatedEntity  | object | no       | `{ entityType, entityId }`. Use `entityId: "__trigger__"` to link to the event entity. |

### notify_user

Creates an in-app notification (IN_APP only; no email/SMS).

| Param    | Type   | Required | Description                |
|----------|--------|----------|----------------------------|
| message  | string | yes      | Notification body          |
| recipient| string | no       | `owner` or `triggeredBy`   |

## Execution Engine

1. Listens to emitted domain events
2. Resolves matching `AutomationRule` records
3. Builds execution plan (eventId, ruleId, actionIndex, actionType, params)
4. For each action: **idempotency** check (`eventId` + `ruleId` + `actionIndex`) → skip if already executed
5. Executes action in try/catch; one failure does **not** block others
6. Persists `AutomationExecution` (completed/failed) and logs

## AutomationExecution Model

- `eventId`, `ruleId`, `actionIndex` (unique key for idempotency)
- `actionType`, `status` (`completed` | `failed`), `error` (if failed)
- `entityType`, `entityId`, timestamps

## Safety & Observability

- **Idempotent**: skip if same action already executed
- **Isolation**: each action in try/catch; failures logged and persisted
- **Respects** `AutomationRule.enabled`
- **Logs**: `automation_action_started`, `automation_action_completed`, `automation_action_failed` (include eventId, ruleId, actionType, entityType, entityId)
- Set `AUTOMATION_LOG_LEVEL=debug` for more detail
