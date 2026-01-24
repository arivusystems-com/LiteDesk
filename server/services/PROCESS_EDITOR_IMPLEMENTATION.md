# PROCESS DESIGNER — ProcessEditor Implementation

## Overview

Implemented `ProcessEditor.vue` as the primary editing experience for existing Processes, following the rule card-based approach with human-readable language throughout.

## Components Created

### 1. ProcessEditor.vue (`/client/src/components/admin/ProcessEditor.vue`)

**Primary Features:**
- **Rule Card View (Default)**: Displays process as vertical list of rule cards showing WHEN/IF/THEN structure
- **Status-Based Editing**:
  - Draft processes: Fully editable with inline edits and reordering
  - Active processes: Read-only with "Duplicate & Edit" banner
  - Archived processes: Fully read-only
- **Tab Navigation**: Rules view (default) and View Flow (placeholder for future canvas implementation)
- **Rule Management**:
  - Edit rules via side panel
  - Add new rules via "+ Add another rule" button
  - Delete rules (draft only)
  - Move rules up/down (placeholder for sequential reordering)
- **Execution Context Awareness**: Shows info section with links to execution logs and test process

**Key Implementation Details:**
- Converts Process nodes/edges to human-readable rule cards
- Handles trigger, condition, field_rule, ownership_rule, status_guard, and action nodes
- Maps technical node types to plain language descriptions
- Prevents editing active processes (shows duplicate banner instead)
- Validates changes before saving
- Integrates with backend API for save/duplicate operations

### 2. RuleEditPanel.vue (`/client/src/components/admin/process/RuleEditPanel.vue`)

**Primary Features:**
- Side panel (not modal) for editing individual rules
- Reuses same configuration forms as ProcessCreationWizard
- Supports all rule types:
  - Field Rule: Field selector, rule type (mandatory/default/visibility), value input
  - Ownership Rule: Assignment type, target input
  - Status Guard: Field selector, from/to transitions, block reason
  - Action: Action type selector, parameter forms (create_task, notify_user, start_process)
- Live preview text showing what rule will do
- Pre-fills with existing values when editing

**Key Implementation Details:**
- Uses HeadlessUI Dialog for slide-in panel animation
- Extracts entity type from existing process nodes
- Validates required fields before saving
- Emits save event with updated node configuration

## Integration

### Processes.vue Updates

- Integrated ProcessEditor component
- Removed restriction on editing active processes (editor handles read-only state)
- Added event handlers for `view-executions` and `test-process` events
- Updated `handleProcessSaved` to handle duplicated processes and auto-open for editing

## UX Principles Followed

✅ **Cards over diagrams**: Rule cards are primary view, canvas is secondary  
✅ **Editing via forms**: All editing happens through structured forms, not canvas  
✅ **Progressive disclosure**: Complex options hidden until needed  
✅ **Human-readable language**: No technical terms (nodes, edges, etc.) exposed  
✅ **Calm, enterprise-grade UI**: Clean, professional design with clear hierarchy  
✅ **Safety first**: Active processes cannot be edited directly, must duplicate  

## Status-Based Behavior

1. **Draft Process**:
   - Fully editable
   - All rule actions available (edit, delete, move, add)
   - Save button visible
   - Can activate after validation

2. **Active Process**:
   - Yellow banner: "This process is active. Duplicate it to make changes."
   - "Duplicate & Edit" primary CTA
   - All rule cards shown but read-only
   - No edit/delete/add actions visible
   - No save button

3. **Archived Process**:
   - Fully read-only
   - No banner (status badge shows archived)
   - All rule cards visible but not editable

## Rule Card Generation Logic

The editor converts Process definition (nodes + edges) into human-readable cards:

1. **WHEN**: Extracted from trigger (domain event label or "Manual trigger")
2. **IF**: Extracted from condition nodes (field + operator + value)
3. **THEN**: Extracted from behavior/action nodes:
   - Field rules: "Make 'field' mandatory" / "Set 'field' default to 'value'"
   - Ownership rules: "Assign ownership to target (assignment)"
   - Status guards: "Control field transition: from → to"
   - Actions: "Create task: 'title'" / "Notify recipient"

## Future Enhancements

1. **View Flow Tab**: Implement read-only React Flow canvas visualization
2. **Rule Reordering**: Implement actual node/edge reordering logic
3. **Test Process**: Implement dry-run execution modal
4. **Execution Logs**: Link to ProcessExecutionLogs component
5. **Conflict Detection**: Highlight conflicting rules in UI
6. **Validation Feedback**: Show backend validation errors inline

## Files Modified

- `/client/src/components/admin/ProcessEditor.vue` (created)
- `/client/src/components/admin/process/RuleEditPanel.vue` (created)
- `/client/src/views/admin/Processes.vue` (updated to integrate editor)

## Testing Checklist

- [ ] Open draft process - should be fully editable
- [ ] Open active process - should show duplicate banner
- [ ] Open archived process - should be read-only
- [ ] Edit rule - side panel should open with pre-filled values
- [ ] Add rule - menu should show 4 options, opens edit panel
- [ ] Delete rule - should remove node and edges
- [ ] Save changes - should update process via API
- [ ] Duplicate & Edit - should create duplicate and open for editing
- [ ] View Flow tab - should show placeholder (future implementation)

## Notes

- The editor maintains a local copy of process data (`processData`) to track changes
- Entity type is inferred from existing nodes (not stored on Process model)
- Rule cards are generated dynamically from nodes/edges traversal
- All technical terms are hidden from users (nodes → rules, edges → execution order)
