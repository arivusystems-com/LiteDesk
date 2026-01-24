# PROCESS DESIGNER — PHASE 4C: Approval UI Implementation

## Overview

Implemented the Approval User Experience (Phase 4C) to provide a human-friendly interface for approval decisions. Approvers see clear context, impact previews, and can make decisions in one click without seeing process complexity.

## Components Created

### 1. ApprovalInbox.vue (`/client/src/views/ApprovalInbox.vue`)

**Primary Features:**
- **Inbox List**: Shows pending approvals for current user
- **Each row displays**:
  - Entity reference (Deal/People/Org) with human-readable format
  - Approval reason (generated from context)
  - Requested by (process name)
  - Requested at (timestamp)
  - SLA/due time (hours remaining)
  - Status badge (Pending/Escalated)
- **Row Actions**: View Details, Approve, Reject (inline)
- **Reject Modal**: Requires mandatory reason (textarea)
- **Empty State**: "No approvals pending"

**Key Implementation Details:**
- Loads from `/api/approvals` (GET)
- Filters by user's organization and approver status
- Enriches with entity snapshots (Deal value, People name, etc.)
- Calculates `dueIn` hours from `timeoutAt`
- Quick approve/reject actions directly from list

### 2. ApprovalDetail.vue (`/client/src/views/ApprovalDetail.vue`)

**Primary Features:**
- **Context Summary**:
  - Entity snapshot (read-only, formatted)
  - Why approval is required (human-readable reason)
  - Process name (subtle, not technical)
- **Impact Preview** (Critical):
  - **If Approved**: What will happen (generated from process nodes after approval_gate)
  - **If Rejected**: What gets blocked
  - Visual distinction (green/red cards)
- **Decision Panel**:
  - Approve/Reject buttons (only if user is authorized approver)
  - Reject requires reason (modal)
  - Read-only view for resolved approvals
- **Escalation Visibility**:
  - Shows escalation badge if escalated
  - Explains escalation reason
  - Highlights new approver role

**Key Implementation Details:**
- Loads from `/api/approvals/:id` (GET)
- Checks authorization (`canDecide` computed)
- Generates impact preview from process definition
- Prevents double decisions (checks status)
- Shows decision history for resolved approvals

### 3. ApprovalHistory.vue (`/client/src/components/approvals/ApprovalHistory.vue`)

**Primary Features:**
- **History Timeline**: Shows all approvals for an entity
- **Each item shows**:
  - Status badge (Approved/Rejected/Timed Out)
  - Decided by (user name)
  - Decided at (timestamp)
  - Reason (if rejected)
  - Process name
  - Escalation indicator (if escalated)

**Usage**: Embedded in entity detail views (DealDetail, PeopleDetail, etc.)

## API Endpoints

### GET `/api/approvals`
- Returns pending approvals for current user
- Filters by organization and approver status
- Populates process, execution, approvers
- Enriches with entity snapshots
- Calculates `dueIn` hours

### GET `/api/approvals/:id`
- Returns single approval with full context
- Populates process, execution, approvers, decider
- Generates impact preview from process nodes
- Includes entity snapshot
- Calculates `dueIn` hours

### POST `/api/approvals/:id/approve`
- Approves and resumes process
- Authorization checked (must be approver)
- Prevents double decisions
- Emits domain events

### POST `/api/approvals/:id/reject`
- Rejects and fails process
- Requires reason (body: `{ reason: string }`)
- Authorization checked
- Prevents double decisions
- Emits domain events

## Routes

- `/approvals` → ApprovalInbox.vue (list)
- `/approvals/:id` → ApprovalDetail.vue (detail)

Both require authentication (`requiresAuth: true`).

## Navigation Integration

- **Sidebar**: Added "Approvals" to shell navigation (via `buildSidebarFromRegistry.ts`)
- **Icon**: Uses `check-circle` icon (already exists in AppSidebar)
- **Position**: After Inbox, before Search

## Impact Preview Generation

**Location**: `server/controllers/approvalController.js` — `generateImpactPreview()`

**Logic**:
1. Finds next node after approval_gate via edges
2. Analyzes node type:
   - `action` → "Task will be created" / "Notification will be sent"
   - `field_rule` → "Field will become mandatory" / "Field will be set to default"
   - `status_guard` → "Status transition will be controlled"
   - Default → "Process will continue"
3. If rejected: "Action will be blocked" + "Process will stop"

**Human-readable**: No technical terms (nodes, edges, execution IDs).

## Safety & Guardrails (UI Level)

✅ **Authorization checks**: Disable approve/reject if user not in approvers  
✅ **Double decision prevention**: Check status before allowing decision  
✅ **Read-only for resolved**: Show decision history, no actions  
✅ **Clear labeling**: "Decision already made" for resolved approvals  
✅ **Mandatory reason**: Reject requires reason textarea  

## UX Principles Followed

✅ **No workflow language**: "Approval required" not "approval_gate node"  
✅ **No process terminology**: Process name shown subtly, not prominently  
✅ **Decisions in one click**: Approve button directly in list  
✅ **Consequences clearly explained**: Impact preview shows what happens  
✅ **Calm, authoritative tone**: Professional, enterprise-grade UI  

## Files Created/Modified

### New Files
1. `/client/src/views/ApprovalInbox.vue` (created)
2. `/client/src/views/ApprovalDetail.vue` (created)
3. `/client/src/components/approvals/ApprovalHistory.vue` (created)

### Modified Files
1. `/server/controllers/approvalController.js` (added `getMyApprovals`, `getApprovalById`, `getEntitySnapshot`, `generateImpactPreview`)
2. `/server/routes/approvalRoutes.js` (added GET routes)
3. `/server/server.js` (mounted `/api/approvals` route)
4. `/client/src/router/index.js` (added `/approvals` and `/approvals/:id` routes)
5. `/client/src/utils/buildSidebarFromRegistry.ts` (added Approvals to shell navigation)

## Testing Checklist

- [ ] View approvals inbox - should show pending approvals for user
- [ ] Empty state - should show "No approvals pending"
- [ ] View approval detail - should show context, impact preview
- [ ] Approve from inbox - should approve and remove from list
- [ ] Approve from detail - should approve and show success
- [ ] Reject from inbox - should open modal, require reason
- [ ] Reject from detail - should open modal, require reason
- [ ] Authorization check - should disable buttons if not approver
- [ ] Double decision prevention - should prevent approving twice
- [ ] Read-only resolved - should show decision history, no actions
- [ ] Escalation badge - should show if escalated
- [ ] Entity snapshot - should show Deal value, People name, etc.
- [ ] Impact preview - should show what happens if approved/rejected
- [ ] Navigation link - should appear in sidebar

## Notes

- Impact preview is generated from process definition (next node after approval_gate)
- Entity snapshots are fetched on-demand (Deal, People, Organization)
- Approvals are scoped to user's organization
- All decisions are logged and emit domain events
- UI never exposes process internals (nodes, edges, execution IDs)
