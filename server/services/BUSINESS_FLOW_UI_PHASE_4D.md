# BUSINESS FLOW UI — Phase 4D Implementation

## Overview

Implemented BusinessFlow UI to visually group multiple Processes into end-to-end business stories. Business Flows are read-only lenses that explain how the system behaves, without introducing new execution logic.

## Key Principles

✅ **Read-only visualization** - No execution, no rules, no editing of processes  
✅ **Timeline storytelling** - Visual causality, not canvas  
✅ **Human language** - No technical terms (nodes, edges, BPMN)  
✅ **Causality inference** - Order inferred dynamically from trigger events  
✅ **Zero duplication** - Processes run the platform, Flows explain it  

## Backend Implementation

### 1. BusinessFlow Model (`/server/models/BusinessFlow.js`)

**Fields:**
- `name` (required)
- `description` (optional)
- `appKey` (required)
- `processIds` (array of Process ObjectIds)
- `createdBy` (User reference)
- `organizationId` (Organization reference)
- `createdAt`, `updatedAt` (timestamps)

**Indexes:**
- `organizationId + appKey`
- `organizationId + createdAt`

### 2. BusinessFlow Controller (`/server/controllers/businessFlowController.js`)

**Endpoints:**
- `GET /api/admin/business-flows` - List all flows for organization
- `GET /api/admin/business-flows/:id` - Get single flow with enriched process details
- `POST /api/admin/business-flows` - Create new flow
- `PUT /api/admin/business-flows/:id` - Update flow
- `DELETE /api/admin/business-flows/:id` - Delete flow

**Key Functions:**
- `enrichProcessesWithCausality()` - Orders processes by trigger event priority
- `inferEntityType()` - Extracts entity type from process nodes

**Causality Inference Logic:**
1. Sort by trigger event type priority:
   - `record.created` (priority 1)
   - `record.updated` (priority 2)
   - `status.changed` (priority 3)
   - `stage.changed` (priority 4)
   - `manual` (priority 5)
2. Then sort by process name (alphabetical)

### 3. BusinessFlow Routes (`/server/routes/businessFlowRoutes.js`)

All routes require authentication (`protect` middleware). Admin checks handled in controller.

## Frontend Implementation

### 1. BusinessFlows.vue (`/client/src/views/admin/BusinessFlows.vue`)

**List View Features:**
- Header with "Create Business Flow" CTA
- Each row shows:
  - Flow name
  - App badge
  - Number of processes
  - Last updated timestamp
- Actions: View, Edit, Delete
- Empty state with helpful message
- Delete confirmation modal

### 2. BusinessFlowForm.vue (`/client/src/views/admin/BusinessFlowForm.vue`)

**Form Fields:**
- Flow Name (required)
- Description (optional)
- App (required dropdown: SALES, AUDIT, PORTAL)
- Process Selector (multi-select checkbox list)

**Process Selector:**
- Shows process name
- Shows trigger summary (human-readable)
- Shows status badge (Active/Draft/Archived)
- Filters by selected app
- Read-only preview (no editing)

**Validation:**
- Name required
- App required
- At least one process required

### 3. BusinessFlowDetail.vue (`/client/src/views/admin/BusinessFlowDetail.vue`)

**Core UX - Timeline Visualization:**

**Timeline Structure:**
- Vertical timeline with connecting line
- Three types of items:
  - 🟣 **Domain Events** (purple) - Trigger events
  - 🟦 **Processes** (blue cards) - Process execution
  - 🟢 **Outcomes** (green) - Flow completion

**Process Cards Show:**
- Process name
- Status badge (Active/Draft)
- Trigger summary (human-readable)
- Action preview (up to 3 actions):
  - "Create task: ..."
  - "Send notification"
  - "Make field mandatory"
  - "Request approval"
  - etc.

**Interactions:**
- Click Process → Opens ProcessEditor (read-only if active)
- Click Event → Opens drawer with event details
- Edit button → Opens BusinessFlowForm

**Event Drawer:**
- Event name
- Description
- Entity type (if inferred)

### 4. Routes (`/client/src/router/index.js`)

- `/control/flows` → BusinessFlows.vue (list)
- `/control/flows/create` → BusinessFlowForm.vue (create)
- `/control/flows/:id` → BusinessFlowDetail.vue (detail)
- `/control/flows/:id/edit` → BusinessFlowForm.vue (edit)

All routes require `requiresAuth: true, requiresAdmin: true`.

### 5. ControlPlane Integration (`/client/src/views/ControlPlane.vue`)

Added "Business Flows" card to Control Plane grid:
- Orange gradient icon
- Description: "Visual grouping of multiple processes into end-to-end business stories"
- Links to `/control/flows`

## Causality Inference Details

**Ordering Rules:**
1. **Trigger Priority**: Creation events come before update events
2. **Entity Lifecycle**: Status changes come after updates
3. **Manual Triggers**: Always last
4. **Alphabetical**: Within same priority, sort by name

**Example Timeline:**
```
🟣 Record Created
│
├─ 🟦 Lead Intake Process
│   • Assign owner
│   • Send welcome WhatsApp
│
🟣 Status Changed
│
├─ 🟦 Qualification Process
│   • Create Organization
│   • Create Deal
│
🟢 Flow Complete
```

## Safety & Validation

✅ **Backend Validation:**
- All referenced processes must exist
- All processes must belong to organization
- Process IDs validated on create/update

✅ **Frontend Validation:**
- Required fields enforced
- Process selection validated
- Delete confirmation required

✅ **Read-Only by Design:**
- Processes cannot be edited from Flow view
- Flow timeline is visualization only
- No execution logic in Flows

## UX Principles Followed

✅ **Timeline, not canvas** - Vertical storytelling  
✅ **Storytelling, not configuration** - Human-readable summaries  
✅ **Read-only by default** - Visualization only  
✅ **Human language everywhere** - No technical terms  
✅ **Calm, enterprise-grade visuals** - Professional UI  

## Files Created/Modified

### New Files
1. `/server/models/BusinessFlow.js`
2. `/server/controllers/businessFlowController.js`
3. `/server/routes/businessFlowRoutes.js`
4. `/client/src/views/admin/BusinessFlows.vue`
5. `/client/src/views/admin/BusinessFlowForm.vue`
6. `/client/src/views/admin/BusinessFlowDetail.vue`

### Modified Files
1. `/server/server.js` (added business flow routes)
2. `/client/src/router/index.js` (added business flow routes)
3. `/client/src/views/ControlPlane.vue` (added Business Flows card)

## Testing Checklist

- [ ] List flows - should show all flows for organization
- [ ] Create flow - should validate and create
- [ ] Edit flow - should load existing data
- [ ] Delete flow - should confirm and delete
- [ ] Timeline visualization - should show events → processes → outcomes
- [ ] Process cards - should show trigger summary and actions
- [ ] Click process - should open ProcessEditor
- [ ] Click event - should open event drawer
- [ ] Causality inference - should order processes correctly
- [ ] Empty state - should show helpful message
- [ ] Process selector - should filter by app
- [ ] Validation - should prevent invalid submissions

## Notes

- **No execution logic**: Business Flows are purely visual/documentation
- **No order storage**: Order is inferred dynamically, not stored
- **No process editing**: Processes must be edited via ProcessEditor
- **Causality is best-effort**: Ordering is inferred from triggers, may not be perfect
- **Future enhancement**: Execution overlay to show real executions (optional)

## Future Enhancements (Out of Scope)

- Execution overlay toggle ("View real execution")
- Select record to highlight which processes ran
- Show approval pauses in timeline
- Show skipped processes
- Link to ProcessExecution logs
