# Phase 0I.3 — Response Review Actions Metadata (No UI)

**Date:** 2025  
**Status:** ✅ COMPLETE  
**Phase:** Metadata-Only (No UI, No APIs, No Workflow Logic)

---

## 🎯 Objective

Formally declare Response review actions as metadata so that:

- Audit flow remains CRM-owned
- Audit App and Portal stay read-only
- Process Designer can later discover actions
- No UI, no mutations, no new workflows are introduced

**This phase is about vocabulary, not behavior.**

---

## 📋 Scope (Strict)

### ✅ Allowed

- Constants / metadata
- Guardrails
- Registry updates
- Documentation

### ❌ Not Allowed

- UI changes
- API endpoints
- Workflow logic
- State transitions
- Button rendering
- Permissions changes

---

## 🧩 Implementation

### 1. Review Actions Metadata Registry

**File:** `server/constants/reviewActions.js`

Created a declarative metadata registry for Response review actions:

```javascript
export const RESPONSE_REVIEW_ACTIONS = {
  APPROVE: {
    key: 'APPROVE',
    label: 'Approve Response',
    description: 'Auditor approves the submitted response after review',
    allowedFrom: ['Needs Auditor Review'],
    resultsIn: 'Approved',
    requiresOwnership: true,
    executionDomain: 'CRM',
    exposedToApps: ['CRM'],
    automationAllowed: true,
    ui: {
      icon: 'check-circle',
      color: 'green',
      variant: 'success',
      requiresConfirmation: true
    }
  },
  // ... REJECT, CLOSE
};
```

**Key Functions:**
- `getAvailableReviewActions(currentReviewStatus)` - Returns metadata for actions allowed from current state
- `isReviewActionAllowed(actionKey, currentReviewStatus)` - Validates if action is allowed (metadata only)
- `getReviewAction(actionKey)` - Gets action metadata by key

**⚠️ Important:**
- These are declarative only
- No logic is executed here
- No state mutation happens here
- All actions are CRM-owned
- Audit App and Portal are read-only

---

### 2. Execution Domain Registration

**File:** `server/constants/executionDomains.js`

Extended the RESPONSE domain with review actions metadata:

```javascript
// Phase 0I.3: Review actions metadata
reviewActions: RESPONSE_REVIEW_ACTIONS,

// Phase 0I.3: Execution ownership metadata
executionOwnedBy: 'CRM',
allowsDirectExecution: false,
auditAppReadOnly: true,
portalReadOnly: true,
```

**What This Declares:**
- Responses are reviewed, not executed
- Only CRM executes review actions
- Other apps can only observe
- Process Designer can discover but not execute

---

### 3. Automation Guardrails Update

**File:** `server/utils/automationGuardrails.js`

Added safeguards for Response review actions:

```javascript
/**
 * Phase 0I.3: Check if a Response review action is allowed
 * 
 * ⚠️ SAFETY: This is a guardrail function. It checks metadata only.
 * Actual execution must occur via CRM execution controllers.
 * 
 * Rules enforced:
 * - Process Designer may discover actions (metadata)
 * - Only CRM can ever execute them
 * - Audit App / Portal cannot invoke
 */
function isResponseReviewActionAllowed(context, actionKey) {
  if (!context || !actionKey) {
    return false;
  }

  const { executionDomain, appKey, intent } = context;

  // Must be RESPONSE execution domain
  if (executionDomain !== 'RESPONSE') {
    return false;
  }

  // For discovery (Process Designer), allow from any app (metadata access)
  if (intent === 'DISCOVER') {
    return true;
  }

  // For execution, ONLY CRM can execute
  if (intent === 'EXECUTE') {
    return appKey === 'CRM';
  }

  // Unknown intent, deny by default
  return false;
}
```

**Rules Enforced:**
- Process Designer may discover actions (metadata)
- Only CRM can ever execute them
- Audit App / Portal cannot invoke

---

### 4. Record Context Enrichment (Metadata Only)

**File:** `server/services/recordContextService.js`

For Response records, the service now appends:

```javascript
// Phase 0I.3: Include review actions metadata for Response records
// ⚠️ SAFETY: This is descriptive metadata only, not actionable.
// All actions are CRM-owned. Audit App and Portal are read-only.
if (appKey.toLowerCase() === 'crm' && moduleKey.toLowerCase() === 'responses') {
  const response = await FormResponse.findOne({
    _id: recordId,
    organizationId
  }).select('executionStatus reviewStatus').lean();

  if (response) {
    // Compute review status safely
    let computedReviewStatus = response.reviewStatus;
    // ... compute if needed ...

    // Get available review actions for current state (metadata only)
    const availableActions = getAvailableReviewActions(computedReviewStatus || null);

    context.reviewActions = RESPONSE_REVIEW_ACTIONS;
    context.availableReviewActions = availableActions;
    context.reviewStatus = computedReviewStatus || null;
    context.executionStatus = response.executionStatus || 'Not Started';
  }
}
```

**What This Provides:**
- `reviewActions` - All review actions metadata (for Process Designer discovery)
- `availableReviewActions` - Actions allowed from current state (for UI rendering future)
- `reviewStatus` - Current review status (computed safely)
- `executionStatus` - Current execution status

**⚠️ Important:**
- This is descriptive, not actionable
- No execution logic here
- No state mutations here
- Just metadata for discovery and rendering

---

## 📚 Files Changed

### Created Files
1. ✅ `server/constants/reviewActions.js` - Review actions metadata registry

### Modified Files
1. ✅ `server/constants/executionDomains.js` - Extended RESPONSE domain with review actions
2. ✅ `server/utils/automationGuardrails.js` - Added `isResponseReviewActionAllowed` guardrail
3. ✅ `server/services/recordContextService.js` - Enriched Response records with review actions metadata

### Documentation
1. ✅ `PHASE_0I3_IMPLEMENTATION.md` - This file

---

## 🔐 Guardrails Checklist

- ✅ No state transitions
- ✅ No UI buttons
- ✅ No APIs
- ✅ No permission changes
- ✅ No Audit App execution
- ✅ No Portal execution
- ✅ CRM remains execution engine
- ✅ Fully backward compatible

---

## ✅ Validation Checklist

- ✅ Existing audit flows continue unchanged
- ✅ No new routes appear
- ✅ No new permissions required
- ✅ No UI changes visible
- ✅ No workflow behavior changes
- ✅ Review actions metadata is discoverable
- ✅ Execution ownership is clearly declared
- ✅ Guardrails prevent unauthorized execution

---

## 🎁 Outcome

After Phase 0I.3:

✅ **Responses declare what review actions exist**
- All review actions are formally declared in `reviewActions.js`
- Actions are associated with their allowed states
- UI hints (icons, colors) are included for future use

✅ **Platform knows who owns execution**
- Execution ownership is explicitly declared (CRM)
- Guardrails prevent unauthorized execution
- Process Designer can discover but not execute

✅ **Audit App and Portal stay safe and read-only**
- Access rules are clearly defined
- Guardrails enforce read-only access
- No execution paths are exposed

✅ **Process Designer can later discover actions**
- Metadata is available via Record Context API
- Actions are discoverable but not executable
- Future UI can render buttons without guessing

✅ **UI can later render buttons without guessing**
- UI hints (icons, colors, variants) are included
- Available actions are computed from current state
- No hardcoded logic needed in UI

---

## 🧠 Why Review Actions Are Metadata

**Vocabulary, Not Behavior:**

1. **Declarative, Not Imperative**
   - We're teaching the platform what exists, not what to do
   - Actions are declared, not executed
   - State transitions are described, not implemented

2. **Discovery, Not Execution**
   - Process Designer can discover actions (metadata)
   - Process Designer cannot execute actions (only CRM can)
   - UI can discover what buttons to show (future)

3. **Ownership, Not Permissions**
   - CRM owns execution, not permissions
   - Audit App can discover, not execute
   - Portal can discover, not execute

4. **Future-Proof**
   - UI rendering can be automated from metadata
   - Process Designer can introspect actions
   - No hardcoded logic needed

---

## 🎯 How Process Designer Will Consume This Later

**Phase 0I.3 enables (does not implement):**

1. **Action Discovery**
   ```javascript
   // Process Designer can query:
   const context = await getRecordContext(orgId, 'CRM', 'responses', responseId);
   const availableActions = context.availableReviewActions;
   // Result: [{ key: 'APPROVE', label: 'Approve Response', ... }]
   ```

2. **Action Validation**
   ```javascript
   // Process Designer can validate:
   const isAllowed = isResponseReviewActionAllowed({
     executionDomain: 'RESPONSE',
     appKey: 'CRM',
     intent: 'EXECUTE'
   }, 'APPROVE');
   // Result: true (only if CRM and EXECUTE)
   ```

3. **UI Rendering (Future)**
   ```javascript
   // UI can discover what to render:
   const actions = context.availableReviewActions;
   actions.forEach(action => {
     // Render button with action.ui.icon, action.ui.color, etc.
   });
   ```

**But Process Designer cannot:**
- Execute actions directly (only CRM controllers can)
- Bypass ownership checks (guardrails enforce)
- Mutate state (read-only metadata only)

---

## 📖 Final Note

**This phase is about vocabulary, not behavior.**

We are teaching the platform:
- What review actions exist
- Who owns execution
- What states allow which actions
- How actions should be displayed (future)

We are NOT implementing:
- State transitions
- Workflow logic
- UI buttons
- API endpoints
- Permission checks

**This is purely declarative metadata for future consumption.**

---

## ✅ Completion Status

- ✅ Review Actions Metadata Registry created
- ✅ Execution Domain registration updated
- ✅ Automation guardrails updated
- ✅ Record Context enrichment implemented
- ✅ Documentation created
- ✅ All guardrails verified
- ✅ Backward compatibility maintained

**Phase 0I.3 is complete.** ✅

