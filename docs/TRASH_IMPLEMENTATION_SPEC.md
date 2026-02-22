# Trash Implementation Spec — Enterprise-Grade Recycle Bin

**Status:** Draft  
**Version:** 1.0  
**Last Updated:** February 2025

---

## 1. Overview

This spec defines a world-class Trash (recycle bin) system for LiteDesk with:

- Snapshot backup layer for forensic recovery
- Formal dependency policy (no vague cascade)
- Workflow/automation isolation
- Central delete isolation (no direct `Model.deleteOne()`)
- Legal hold support
- Observability and governance metrics

---

## 2. Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTROLLERS                                     │
│  (Never call Model.deleteOne directly)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DELETION SERVICE (Single Entry Point)                │
│  moveToTrash() | restore() | purge()                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
            │ Soft Delete  │ │ TrashSnapshot │ │ DependencyPolicy  │
            │ (in-place)   │ │ (collection)  │ │ (validate)        │
            └──────────────┘ └──────────────┘ └──────────────────┘
```

---

## 3. Data Model

### 3.1 Trash Snapshot Collection (`trash_snapshots`)

```javascript
// server/models/TrashSnapshot.js

const TrashSnapshotSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  appKey: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  moduleKey: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  originalId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  snapshot: {
    type: Schema.Types.Mixed,  // Full immutable JSON
    required: true
  },
  checksum: {
    type: String,
    trim: true
    // SHA-256 of JSON.stringify(snapshot) for integrity
  },
  parentReferences: [{
    moduleKey: String,
    recordId: Schema.Types.ObjectId,
    fieldPath: String
  }],
  deletedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  deletionReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  retentionExpiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isLegalHold: {
    type: Boolean,
    default: false,
    index: true
  },
  legalHoldReason: String,
  legalHoldExpiresAt: Date,
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'trash_snapshots'
});

// Compound indexes
TrashSnapshotSchema.index({ organizationId: 1, deletedAt: -1 });
TrashSnapshotSchema.index({ organizationId: 1, moduleKey: 1, deletedAt: -1 });
TrashSnapshotSchema.index({ retentionExpiresAt: 1 });
TrashSnapshotSchema.index({ organizationId: 1, originalId: 1, moduleKey: 1 }, { unique: true });
```

### 3.2 In-Place Soft Delete Fields (Trashable Models)

Add to: People, Organization, Deal, Task, Event, Item, FormResponse (non-audit), custom modules.

```javascript
// Fields to add
deletedAt: {
  type: Date,
  default: null,
  index: true
},
deletedBy: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  default: null
},
deletionReason: {
  type: String,
  trim: true,
  maxlength: 500
}
```

### 3.3 Query Defaults

All list/read queries for trashable modules MUST exclude trashed records by default:

```javascript
// Base query filter
{ deletedAt: null }
```

Override only when explicitly requesting trash: `includeTrashed: true`.

---

## 4. Deletion Service

### 4.1 File: `server/services/deletionService.js`

```javascript
/**
 * Central deletion service. Controllers MUST use this instead of Model.deleteOne().
 *
 * moveToTrash() - Soft delete + snapshot
 * restore()     - Restore from trash
 * purge()       - Permanent delete (only from trash)
 */

const TRASHABLE_MODULES = ['people', 'organizations', 'deals', 'tasks', 'events', 'items', 'responses'];
const DEFAULT_RETENTION_DAYS = 30;
const MODEL_BY_KEY = {
  people: require('../models/People'),
  organizations: require('../models/Organization'),
  deals: require('../models/Deal'),
  tasks: require('../models/Task'),
  events: require('../models/Event'),
  items: require('../models/Item'),
  responses: require('../models/FormResponse')
};
```

### 4.2 `moveToTrash(params)`

**Params:** `{ moduleKey, recordId, organizationId, userId, appKey?, reason?, cascadePolicy? }`

**Flow:**
1. Resolve model for `moduleKey`
2. Fetch record (must exist, not already trashed)
3. Call `dependencyPolicy.validateMoveToTrash()` → structured response
4. If blocked: return `{ ok: false, blocked: true, dependencies: [...] }`
5. If `CASCADE_ASK` and dependencies exist: require explicit `cascadeConfirmed: true`
6. Create snapshot (full record JSON, checksum, parentReferences)
7. Set `deletedAt`, `deletedBy`, `deletionReason` on record
8. Save record
9. Save TrashSnapshot
10. Emit `RECORD_TRASHED` domain event (for metrics; workflows must ignore trashed records)
11. Return `{ ok: true, snapshotId }`

### 4.3 `restore(params)`

**Params:** `{ moduleKey, recordId, organizationId, userId }`

**Flow:**
1. Fetch record (must have `deletedAt` set)
2. Fetch TrashSnapshot for `originalId` + `moduleKey` + `organizationId`
3. If snapshot missing (already purged): return `{ ok: false, reason: 'ALREADY_PURGED' }`
4. Check `orphanedReferences`: parents that were purged
5. If orphans: return `{ ok: true, restored: true, orphanedReferences: [...] }` — allow restore with warning
6. Clear `deletedAt`, `deletedBy`, `deletionReason` on record
7. Save record
8. Delete TrashSnapshot (or mark as restored for audit)
9. Log "Restored from Trash" in activity
10. Optionally notify record owner
11. Return `{ ok: true, restored: true }`

### 4.4 `purge(params)`

**Params:** `{ moduleKey, recordId, organizationId, userId }`

**Flow:**
1. Fetch TrashSnapshot
2. If `isLegalHold`: return `{ ok: false, reason: 'LEGAL_HOLD' }`
3. Hard delete record from source collection
4. Delete TrashSnapshot
5. Emit metrics
6. Return `{ ok: true }`

### 4.5 Bulk Operations

**`moveToTrashBulk`** / **`restoreBulk`** / **`purgeBulk`**

**Response format:**
```json
{
  "success": [
    { "moduleKey": "deals", "recordId": "..." }
  ],
  "failed": [
    { "moduleKey": "deals", "recordId": "...", "reason": "Parent missing" }
  ]
}
```

- No full-bulk failure: process each item, collect successes and failures
- Optimistic locking: restore fails if already purged

---

## 5. Dependency Policy

### 5.1 File: `server/services/dependencyPolicy.js`

**Modes:**
- `STRICT` (default): Block if any active children exist
- `CASCADE_ASK`: Return dependencies; require explicit `cascadeConfirmed`
- `CASCADE_AUTO`: Trash children with record (audit trail)

### 5.2 `validateMoveToTrash(context)`

**Returns:**
```json
{
  "blocked": true,
  "dependencies": [
    { "module": "Tasks", "moduleKey": "tasks", "count": 18 }
  ],
  "message": "Cannot delete: 18 Tasks reference this record."
}
```

### 5.3 Dependency Definitions

| Parent Module | Child Module | Relationship |
|---------------|--------------|--------------|
| people | deals | contactId |
| organizations | deals | accountId |
| organizations | people | organization |
| deals | tasks | relatedTo.id (type=deal) |
| people | tasks | relatedTo.id (type=contact) |
| organizations | tasks | relatedTo.id (type=organization) |

Extend via config for custom modules.

---

## 6. Workflow / Automation Isolation

### 6.1 Rule: Trashed records MUST NOT trigger workflows

**Isolation points:**

| System | File | Change |
|--------|------|--------|
| Domain Events | `server/services/domainEvents.js` | Before emit: if event is for a record, check `deletedAt`; skip if trashed |
| Automation Engine | `server/services/automationEngine.js` | At start of `processEvent`: fetch record, if `deletedAt` return early |
| Notification Rules | `server/services/notificationRuleEngine.js` | Exclude trashed records from entity resolution |
| Process Executor | `server/services/processExecutor.js` | Before starting process: verify entity not trashed |

### 6.2 Central Guard

**File:** `server/utils/trashGuard.js`

```javascript
/**
 * Check if a record is trashed. Use before any workflow/automation/analytics.
 */
async function isTrashed(moduleKey, recordId, organizationId) {
  const Model = getModel(moduleKey);
  if (!Model) return false;
  const doc = await Model.findOne(
    { _id: recordId, organizationId },
    { deletedAt: 1 }
  ).lean();
  return !!doc?.deletedAt;
}
```

### 6.3 Query Exclusion

All aggregation pipelines, analytics, dashboards, search indexing MUST add:

```javascript
{ deletedAt: null }
```

(or equivalent for modules that use `deletedAt`).

### 6.4 Specific Integration Points

| Location | File | Line/Function | Change |
|----------|------|---------------|--------|
| Domain event emission | Controllers that call `emit()` | Before emit | Fetch record; if `deletedAt` skip emit |
| Automation engine | `automationEngine.js` | `processEvent()` ~line 99 | At start: `if (await isTrashed(entityType, entityId, orgId)) return { ... }` |
| Notification rules | `notificationRuleEngine.js` | `evaluateRules()` | Entity resolution: exclude trashed |
| Process executor | `processExecutor.js` | `startProcess` / manual trigger | Before start: verify entity not trashed |
| Record context | `recordContextService.js` | `getRecordContext()` | If record has `deletedAt`, return minimal context or 404 |
| App projection query | `appProjectionQuery.js` | `applyProjectionFilter()` | Ensure baseQuery includes `deletedAt: null` for trashable modules |

---

## 7. API Design

### 7.1 Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/trash/:moduleKey/:recordId` | Move to trash |
| POST | `/api/trash/:moduleKey/:recordId/restore` | Restore |
| DELETE | `/api/trash/:moduleKey/:recordId` | Purge (permanent) |
| GET | `/api/trash` | List trash (paginated, filterable) |
| DELETE | `/api/trash` | Empty trash (bulk purge) |
| GET | `/api/trash/stats` | Stats + expiring soon |

### 7.2 Move to Trash

**POST** `/api/trash/:moduleKey/:recordId`

**Body:**
```json
{
  "reason": "Optional deletion reason",
  "cascadeConfirmed": false
}
```

**Response (blocked):**
```json
{
  "success": false,
  "blocked": true,
  "dependencies": [
    { "module": "Tasks", "moduleKey": "tasks", "count": 18 }
  ],
  "message": "Cannot delete: 18 Tasks reference this record. Confirm cascade to trash them too."
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "Moved to trash",
  "retentionExpiresAt": "2025-03-23T00:00:00.000Z"
}
```

### 7.3 Restore

**POST** `/api/trash/:moduleKey/:recordId/restore`

**Response (orphans):**
```json
{
  "success": true,
  "restored": true,
  "orphanedReferences": [
    { "moduleKey": "organizations", "recordId": "...", "label": "Acme Corp" }
  ],
  "message": "Restored. Some parent records were permanently deleted."
}
```

### 7.4 List Trash

**GET** `/api/trash?moduleKey=deals&page=1&limit=20&sort=deletedAt&order=desc`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "moduleKey": "deals",
      "recordId": "...",
      "displayName": "Acme Deal",
      "deletedAt": "...",
      "deletedBy": { "firstName": "...", "lastName": "..." },
      "retentionExpiresAt": "...",
      "isLegalHold": false
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 47 }
}
```

### 7.5 Stats

**GET** `/api/trash/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 47,
    "byModule": { "deals": 12, "tasks": 35 },
    "expiringIn7Days": 12,
    "oldestDeletedAt": "2025-01-15T10:00:00.000Z",
    "restoreRate": 0.23
  }
}
```

---

## 8. Central Delete Isolation

### 8.1 Hard Rule

**Controllers MUST NEVER call:**
- `Model.deleteOne()`
- `Model.findByIdAndDelete()`
- `Model.remove()`

**Controllers MUST use:**
- `deletionService.moveToTrash()` for user-initiated "delete"
- `deletionService.purge()` only from Trash UI or admin purge flow

### 8.2 Enforcement

1. **ESLint rule** (custom): Flag `deleteOne`, `findByIdAndDelete`, `remove` on trashable models
2. **Code review checklist**: "No direct delete calls on trashable modules"
3. **Document** in `CONTRIBUTING.md` or `docs/`

### 8.3 Exceptions (Non-Trashable)

- Users (deactivate only)
- Audit form responses (archive/invalidate)
- Automation rules (soft delete via enabled=false)
- System/config: ModuleDefinition, Role, etc. (hard delete allowed)

---

## 9. Indexes

### 9.1 TrashSnapshot

```javascript
{ organizationId: 1, deletedAt: -1 }
{ organizationId: 1, moduleKey: 1, deletedAt: -1 }
{ retentionExpiresAt: 1 }
{ organizationId: 1, originalId: 1, moduleKey: 1 }  // unique
{ isLegalHold: 1 }
```

### 9.2 Trashable Models

```javascript
{ organizationId: 1, deletedAt: 1 }
{ deletedAt: 1 }  // for global "exclude trashed" queries
```

---

## 10. Legal Hold

- `isLegalHold: true` → Cannot purge, retention ignored
- Requires special admin override to clear hold
- Audit log for hold/unhold actions
- Schema fields: `isLegalHold`, `legalHoldReason`, `legalHoldExpiresAt`

---

## 11. Observability & Metrics

**Track:**
- Delete rate per module
- Restore rate
- Purge rate
- Auto-purge failures
- Dependency-block frequency

**Storage:** In-memory counters or external metrics (Prometheus, etc.). Emit events for future Data Governance Dashboard.

---

## 12. Restore Activity Logging

- On restore: Add "Restored from Trash" to record activity timeline
- Optionally notify record owner
- Reattach activity timeline correctly (no orphaned activity)

---

## 13. No Permanent Delete at Initial Delete

- User "Delete" → Always `moveToTrash()`
- Permanent delete only from Trash UI with strong confirmation
- Prevents rage-click data loss

---

## 14. Migration Plan

### Phase 0: Foundation (Week 1)
1. Create `TrashSnapshot` model
2. Add `deletedAt`, `deletedBy`, `deletionReason` to core models (People, Organization, Deal, Task, Event, Item)
3. Create `deletionService.js` (moveToTrash, restore, purge)
4. Create `dependencyPolicy.js`
5. Add indexes

### Phase 1: Controller Integration (Week 2)
1. Replace hard deletes in dealController, peopleController, organizationV2Controller, taskController, eventController, itemController with `deletionService.moveToTrash()`
2. Add trash routes and controller
3. Implement central delete isolation (document + ESLint)

### Phase 2: Workflow Isolation (Week 2)
1. Add `trashGuard.isTrashed()` 
2. Guard domain event emission (skip if record trashed)
3. Guard automation engine processEvent
4. Guard notification rule entity resolution
5. Add `deletedAt: null` to aggregation/analytics queries

### Phase 3: UI (Week 3)
1. Trash list view (`/trash`)
2. Sidebar link + badge count
3. Restore/Purge actions
4. Empty Trash with confirmation
5. Expiring-soon banner

### Phase 4: Polish (Week 4)
1. Retention job (auto-purge)
2. Legal hold fields + admin override
3. Restore activity logging
4. Observability metrics
5. Orphan warning UI

### Phase 5: FormResponse Integration (Optional)
- FormResponse: Only non-audit, non-submitted responses go to trash
- Audit responses: Keep archive/invalidate (no trash)

---

## 15. File Checklist

| File | Action |
|------|--------|
| `server/models/TrashSnapshot.js` | Create |
| `server/services/deletionService.js` | Create |
| `server/services/dependencyPolicy.js` | Create |
| `server/utils/trashGuard.js` | Create |
| `server/controllers/trashController.js` | Create |
| `server/routes/trashRoutes.js` | Create |
| `server/models/People.js` | Add deletedAt, deletedBy, deletionReason |
| `server/models/Organization.js` | Add deletedAt, deletedBy, deletionReason |
| `server/models/Deal.js` | Add deletedAt, deletedBy, deletionReason |
| `server/models/Task.js` | Add deletedAt, deletedBy, deletionReason |
| `server/models/Event.js` | Add deletedAt, deletedBy, deletionReason |
| `server/models/Item.js` | Add deletedAt, deletedBy, deletionReason |
| `server/services/domainEvents.js` | Add trash guard (optional; prefer guard at emit source) |
| `server/services/automationEngine.js` | Add isTrashed check at processEvent start |
| `server/controllers/dealController.js` | Replace deleteDeal with deletionService.moveToTrash |
| `server/controllers/peopleController.js` | Replace remove with deletionService.moveToTrash |
| `server/controllers/organizationV2Controller.js` | Replace remove with deletionService.moveToTrash |
| `server/controllers/taskController.js` | Replace deleteTask with deletionService.moveToTrash |
| `server/controllers/eventController.js` | Replace deleteEvent with deletionService.moveToTrash |
| `server/controllers/itemController.js` | Replace deleteItem with deletionService.moveToTrash |
| `client/src/views/Trash.vue` | Create |
| `client/src/router/index.js` | Add /trash route |

---

## 16. Domain Events

**New event:** `RECORD_TRASHED` — For metrics only. Workflow subscribers must NOT act on trashed records.

**New event:** `RECORD_RESTORED` — For activity log and optional notifications.

---

## 17. Environment / Config

```env
# Optional
TRASH_RETENTION_DAYS=30
TRASH_AUTO_PURGE_ENABLED=true
TRASH_LEGAL_HOLD_ENABLED=true
```

---

*End of spec.*
