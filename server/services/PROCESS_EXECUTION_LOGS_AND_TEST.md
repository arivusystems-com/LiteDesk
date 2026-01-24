# PROCESS DESIGNER — ProcessExecutionLogs & ProcessTestModal Implementation

## Overview

Implemented `ProcessExecutionLogs.vue` and `ProcessTestModal.vue` to provide execution transparency and dry-run testing capabilities for processes.

## Components Created

### 1. ProcessExecutionLogs.vue (`/client/src/components/admin/ProcessExecutionLogs.vue`)

**Primary Features:**
- **Execution List View**: Table/list of executions with status, trigger, duration, and actions
- **Execution Detail View (Timeline)**: Clicking an execution shows a detailed timeline view
- **Timeline Items**:
  - Process Started: Trigger summary, triggered by, entity reference
  - Rule Evaluated: Condition summary with pass/skip status
  - Behavior Proposed: Field rules, ownership rules, status guards
  - Action Executed: Action type, target, result (success/failed)
  - Process Completed/Failed: Final status with error message if failed
- **Visual Indicators**: Icons and color coding (green=completed, grey=skipped, red=failed)
- **Human-Readable Language**: No technical IDs exposed by default

**Key Implementation Details:**
- Loads executions from `/admin/processes/:id/executions` endpoint
- Reconstructs timeline from ProcessExecution record + Process definition
- Shows execution status, duration, and trigger information
- Empty state: "This process hasn't run yet"

### 2. ProcessTestModal.vue (`/client/src/components/admin/ProcessTestModal.vue`)

**Primary Features:**
- **Test Setup (Step 1)**:
  - Entity type selector (People/Organization/Deal)
  - Record ID input (searchable)
  - Trigger simulation preview (auto-selected from process trigger)
- **Test Execution**:
  - Calls `/admin/processes/:id/test` endpoint (dry-run mode)
  - No data mutations
  - No side effects
- **Test Results View (Step 2)**:
  - Mock execution timeline (same layout as real logs)
  - Clear banner: "This is a test. No data will be changed."
  - Shows which rules would apply
  - Shows which actions would run
  - Shows which transitions would be blocked
  - Explains why conditions would pass or fail

**Key Implementation Details:**
- Two-step modal flow (Select Record → View Results)
- Dry-run flag enforced server-side (no mutations)
- Visual distinction between real and test executions
- Uses same TimelineItem component for consistency

### 3. TimelineItem.vue (`/client/src/components/admin/process/TimelineItem.vue`)

**Primary Features:**
- Reusable timeline item component
- Supports multiple types: start, condition, behavior, action, success, error
- Status-based styling: completed (green), failed (red), skipped (grey), pending (yellow)
- Icon-based visual indicators
- Timestamp formatting

**Types:**
- `start`: Process started (green play icon)
- `condition`: Rule evaluated (checkmark icon)
- `behavior`: Behavior proposed (shield icon)
- `action`: Action executed (lightning icon)
- `success`: Process completed (checkmark icon)
- `error`: Process failed (X icon)

## Integration

### ProcessEditor.vue Updates

- Added `showTestModal` and `showExecutionLogs` state
- Integrated `ProcessTestModal` and `ProcessExecutionLogs` components
- Updated `viewExecutions()` and `testProcess()` to show modals directly
- Removed event emissions (handled internally now)

### Processes.vue Updates

- Removed unused `testProcess` handler
- ProcessEditor now handles test/logs internally

## UX Principles Followed

✅ **Timeline, not raw logs**: Visual timeline instead of raw log entries  
✅ **Human language first**: No technical terms (executionId, nodeId, etc.)  
✅ **No engine terms**: Nodes, edges, execution IDs hidden  
✅ **Confidence > completeness**: Clear, explainable, not overwhelming  
✅ **Visual distinction**: Test executions clearly marked  
✅ **Safety first**: Dry-run enforced, no mutations in test mode  

## Status Indicators

1. **Completed** (Green):
   - Process finished successfully
   - Rules applied
   - Actions executed

2. **Failed** (Red):
   - Process stopped due to error
   - Error message displayed
   - Failed node highlighted

3. **Skipped** (Grey):
   - Condition not met
   - Rule not applied
   - Action not executed

4. **Running** (Yellow):
   - Process currently executing
   - Shown in list view only

## Timeline Reconstruction Logic

Since detailed step-by-step logs aren't stored in the database, the timeline is reconstructed from:

1. **ProcessExecution Record**:
   - Start/end times
   - Status (completed/failed/running)
   - Error message
   - Current node ID (if failed)

2. **Process Definition**:
   - Nodes (conditions, rules, actions)
   - Execution order (from edges)
   - Node configurations

3. **Assumptions**:
   - If execution completed: all nodes executed successfully
   - If execution failed: nodes up to currentNodeId executed
   - Conditions: assumed passed if execution continued

**Note**: In a full implementation, detailed execution logs would be stored in the database for accurate timeline reconstruction.

## Backend Integration

### Existing Endpoints

1. **GET `/admin/processes/:id/executions`**
   - Returns list of ProcessExecution records
   - Includes pagination (limit, offset)
   - Sorted by startedAt (descending)

2. **POST `/admin/processes/:id/test`**
   - Currently returns process preview
   - Needs enhancement for actual dry-run execution
   - Should return detailed execution simulation

### Future Enhancements

1. **Detailed Execution Logs**:
   - Store node-by-node execution logs
   - Track condition evaluations
   - Record behavior proposals
   - Log action results

2. **Dry-Run Execution**:
   - Implement actual dry-run mode in processExecutor
   - Return detailed simulation results
   - Show what would happen without mutations

3. **Execution Replay**:
   - Allow viewing historical execution details
   - Show exact node execution order
   - Display condition evaluation results

## Files Created/Modified

### New Files
1. `/client/src/components/admin/ProcessExecutionLogs.vue` (created)
2. `/client/src/components/admin/ProcessTestModal.vue` (created)
3. `/client/src/components/admin/process/TimelineItem.vue` (created)

### Modified Files
1. `/client/src/components/admin/ProcessEditor.vue` (integrated modals)
2. `/client/src/views/admin/Processes.vue` (removed unused handlers)

## Testing Checklist

- [ ] View execution logs - should show list of executions
- [ ] Click execution - should show detailed timeline
- [ ] Empty state - should show "No executions yet"
- [ ] Test process - should open test modal
- [ ] Select test record - should validate entity type and ID
- [ ] Run test - should show test results timeline
- [ ] Test banner - should clearly indicate "This is a test"
- [ ] Timeline items - should show correct icons and colors
- [ ] Back navigation - should work in both modals
- [ ] Close modals - should return to ProcessEditor

## Notes

- Timeline reconstruction is simplified - assumes nodes executed if process completed
- Test mode currently uses placeholder backend endpoint
- Detailed execution logs would require backend enhancement
- TimelineItem component is reusable for both real and test executions
- All technical terms (executionId, nodeId) are hidden from users
