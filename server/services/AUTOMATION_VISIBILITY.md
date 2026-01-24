# AUTOMATION VISIBILITY MODEL — Implementation Summary

## Core Principle

**Build centrally. Explain locally. Execute invisibly.**

- Automation Rules, Processes, and Business Flows are authored ONLY in Control Plane
- Users see outcomes, never mechanics
- No editing outside Control

## Implementation Overview

### 1. Backend: Automation Context Service

**File:** `/server/services/automationContextService.js`

**Functions:**

- `getRecordAutomationContext(entityType, entityId, options)` - Get human-readable automation context for a record
- `hasAutomation(entityType, entityId, options)` - Check if automation applies (for badges)
- `getAppFlows(appKey, organizationId)` - Get business flows for an app
- `batchCheckAutomation(entityType, entityIds, options)` - Batch check for list views

**Key Design Decisions:**

1. **Explanations, not mechanics** - Never expose node types, conditions, or triggers
2. **Outcome-focused** - Describe what happens, not how
3. **Human language** - "Approval may be required" not "approval_gate node configured"

### 2. API Endpoints

**File:** `/server/routes/automationContextRoutes.js`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/automation/context` | GET | Get automation context for a record |
| `/api/automation/app-flows` | GET | Get business flows for an app |
| `/api/automation/batch-check` | POST | Batch check automation for list views |

**Security:**
- All endpoints require authentication
- Admin context (process/rule IDs) stripped for non-admins
- Read-only - no editing APIs

### 3. Frontend Components

#### AutomationContext.vue
**Location:** `/client/src/components/automation/AutomationContext.vue`

Collapsible section for record detail views showing:
- Active automation status badge
- Process/rule explanations with outcomes
- Admin-only "View Process" links

**Usage:**
```vue
<AutomationContext
  entity-type="deal"
  :entity-id="deal._id"
/>
```

#### AutomationBadge.vue
**Location:** `/client/src/components/automation/AutomationBadge.vue`

Subtle icon for list views indicating automation applies.

**Usage:**
```vue
<AutomationBadge :has-automation="true" />
```

#### AppFlows.vue
**Location:** `/client/src/components/automation/AppFlows.vue`

"How this app works" section for app home screens.

**Usage:**
```vue
<AppFlows app-key="SALES" />
```

### 4. Integration Points

#### Record Detail Views

Added `<AutomationContext>` to:
- `ContactDetail.vue` (People)
- `DealDetail.vue` (Deals)
- `OrganizationSurface.vue` (Organizations)

#### App Home Screens

Added `<AppFlows>` to:
- `PlatformHome.vue`

### 5. Copy & UX Rules (Enforced)

**Never say:**
- "rule", "trigger", "node", "condition"
- Technical terms or IDs

**Always say:**
- "When this happens…"
- "The system will…"
- Outcome descriptions

**Examples:**

| Bad | Good |
|-----|------|
| "approval_gate node" | "Approval may be required" |
| "notify_user action" | "Notifications are sent automatically" |
| "field_rule applied" | "Some fields are automatically managed" |

### 6. Outcome Type Explanations

| Type | Icon | Description |
|------|------|-------------|
| approval | shield-check | Approval may be required |
| field_control | lock-closed | Some fields are automatically managed |
| ownership | user-plus | Ownership is automatically assigned |
| status_control | shield-exclamation | Status changes are governed by business rules |
| action (notify) | bell | Notifications are sent automatically |
| action (task) | clipboard-list | Follow-up tasks are created automatically |
| action (record) | plus-circle | Related records are created automatically |

### 7. Safety Guarantees

1. **Server-side permission checks** - Admin context only for admins
2. **No editing APIs** - Read-only endpoints
3. **Cached lookups** - Batch API for list views
4. **Explanations only** - Never expose internals

## Files Created/Modified

### New Files
1. `/server/services/automationContextService.js`
2. `/server/controllers/automationContextController.js`
3. `/server/routes/automationContextRoutes.js`
4. `/client/src/components/automation/AutomationContext.vue`
5. `/client/src/components/automation/AutomationBadge.vue`
6. `/client/src/components/automation/AppFlows.vue`
7. `/server/services/AUTOMATION_VISIBILITY.md`

### Modified Files
1. `/server/server.js` - Added automation context routes
2. `/client/src/views/ContactDetail.vue` - Added AutomationContext
3. `/client/src/views/DealDetail.vue` - Added AutomationContext
4. `/client/src/views/OrganizationSurface.vue` - Added AutomationContext
5. `/client/src/views/platform/PlatformHome.vue` - Added AppFlows

## User Experience

### For End Users
- See "Automation" section on record details
- Understand why things happen automatically
- Never exposed to technical complexity

### For Admins
- Same view as users, plus "View Process" links
- Can navigate to Control Plane for editing
- Full visibility without clutter

## Future Enhancements (Out of Scope)

1. Automation badge column in list views (infrastructure ready)
2. Per-app home screens with AppFlows
3. Execution history in AutomationContext
4. Real-time automation status updates
