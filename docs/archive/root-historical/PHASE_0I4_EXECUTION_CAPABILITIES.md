# Phase 0I.4 — Execution Capabilities Registry (Metadata Only)

**Date:** 2025  
**Status:** ✅ COMPLETE  
**Phase:** Metadata-Only (No UI, No APIs, No Workflow Logic)

---

## 🎯 Objective

Introduce a formal, platform-level Execution Capabilities Registry that declares:

- What actions exist in the system
- Which app owns execution
- Who can execute vs who can only view
- Whether actions are:
  - User-executable
  - Automation-executable
  - Read-only (inspection only)
- Which actions are discoverable by the Process Designer

**This phase teaches the platform what can be done, not how it is done.**

---

## 📋 Scope (Strict)

### ✅ Allowed

- Constants / metadata
- Registry utilities
- Guardrails
- Documentation

### ❌ Not Allowed

- UI changes
- API endpoints
- Execution logic
- Permission changes
- Workflow/state transitions
- Route blocking changes

---

## 🧩 Core Principles (Non-Negotiable)

1. **Execution ownership is explicit**
   - Every action has exactly one execution owner app

2. **Discovery ≠ Execution**
   - Apps may discover actions they cannot execute

3. **CRM remains execution engine**
   - Audit App and Portal are never execution owners

4. **Process Designer uses this registry**
   - No hardcoded action lists later

5. **Backward compatible**
   - No breaking changes to existing flows

---

## 🧩 Implementation

### 1. Execution Capability Registry

**File:** `server/constants/executionCapabilities.js`

Created a comprehensive registry of all execution capabilities in the system.

**Schema (metadata only):**

Each capability declares:
- `capabilityKey`: Unique identifier (e.g., 'RESPONSE_APPROVE')
- `domain`: Execution domain ('RESPONSE', 'EVENT', etc.)
- `action`: Action type ('APPROVE', 'REJECT', 'CLOSE', 'SUBMIT', etc.)
- `executionOwnerApp`: Which app owns execution ('CRM' only)
- `executionType`: 'USER' | 'SYSTEM' | 'AUTOMATION'
- `discoverableBy`: Array of apps that can discover ('CRM', 'AUDIT', 'PORTAL', 'PROCESS_DESIGNER')
- `executableBy`: Array of apps that can execute (always ['CRM'])
- `auditAppPolicy`: 'READ_ONLY' | 'HIDDEN'
- `portalPolicy`: 'READ_ONLY' | 'HIDDEN'
- `requiresOwnership`: Boolean (e.g., eventOwnerId / correctiveOwnerId)
- `requiresInstanceActive`: Boolean
- `uiHints`: Object with label, variant, icon, confirmationRequired

**Required Capabilities Defined:**

**RESPONSE Domain:**
- `RESPONSE_SUBMIT` - Submit a form response
- `RESPONSE_APPROVE` - Approve a response (automation-capable)
- `RESPONSE_REJECT` - Reject a response (automation-capable)
- `RESPONSE_CLOSE` - Close a response (automation-capable)

**EVENT / AUDIT Domain:**
- `AUDIT_CHECK_IN` - Check in to an audit event
- `AUDIT_SUBMIT` - Submit an audit response
- `AUDIT_APPROVE` - Approve an audit (automation-capable)
- `AUDIT_REJECT` - Reject an audit (automation-capable)

**Key Rules:**
- All capabilities declare CRM as execution owner
- All capabilities are discoverable by Audit App (metadata)
- All capabilities are executable only by CRM
- Audit App policy is always 'READ_ONLY'
- Portal policy is 'READ_ONLY' or 'HIDDEN'

---

### 2. Capability Resolver Utilities

**File:** `server/utils/executionCapabilityRegistry.js`

Pure utility functions for querying execution capabilities.

**Functions (pure, non-throwing):**

1. **`getAllExecutionCapabilities()`**
   - Returns all capabilities in the registry

2. **`getCapabilitiesByDomain(domain)`**
   - Returns capabilities for a specific domain (e.g., 'RESPONSE')

3. **`getCapability(capabilityKey)`**
   - Returns a specific capability by key

4. **`canDiscoverCapability(appKey, capabilityKey)`**
   - Checks if an app can discover a capability (metadata only)

5. **`canExecuteCapability(appKey, capabilityKey)`**
   - Checks if an app can execute a capability (metadata only)

6. **`getCapabilitiesForProcessDesigner()`**
   - Returns automation-capable capabilities for Process Designer

7. **`getCapabilitiesForRecordContext(domain, appKey)`**
   - Returns capabilities enriched with discovery/execution flags for the requesting app

8. **`getCapabilitiesForApp(appKey)`**
   - Returns all capabilities discoverable by an app, with app-specific flags

**Rules:**
- Never throw errors
- Always return empty arrays or false on invalid input
- No permission checks — metadata only
- No execution logic — pure queries

---

### 3. Record Context Enrichment (Metadata Only)

**File:** `server/services/recordContextService.js`

Enhanced record context output to include execution capabilities metadata.

**Added to context:**
```javascript
{
  executionCapabilities: [
    {
      capabilityKey: "RESPONSE_APPROVE",
      domain: "RESPONSE",
      action: "APPROVE",
      executionOwnerApp: "CRM",
      executionType: "AUTOMATION",
      allowedToDiscover: true,  // Metadata only
      allowedToExecute: false,  // Metadata only (for Audit App)
      auditAppPolicy: "READ_ONLY",
      portalPolicy: "READ_ONLY",
      requiresOwnership: true,
      requiresInstanceActive: true,
      uiHints: {
        label: "Approve Response",
        variant: "success",
        icon: "check-circle",
        confirmationRequired: true
      }
    }
  ]
}
```

**Rules:**
- Do not evaluate permissions
- Do not check ownership
- Do not mutate anything
- This is descriptive only

---

### 4. Automation Guardrails Extension

**File:** `server/utils/automationGuardrails.js`

Added helpers for Process Designer and automation:

1. **`isCapabilityAutomationDiscoverable(capabilityKey)`**
   - Checks if Process Designer can discover a capability

2. **`isCapabilityAutomationExecutable(capabilityKey)`**
   - Checks if a capability can be automated

3. **`getAutomationCapabilitiesForProcessDesigner()`**
   - Returns all capabilities available for Process Designer

**Rules:**
- Process Designer may only list capabilities marked discoverable
- Only capabilities with `executionType !== 'USER'` can be auto-executed
- RESPONSE review actions must be discoverable but executable only by CRM

---

### 5. App Boundary Enforcement (Metadata Level)

**File:** `server/middleware/appBoundaryGuards.js`

Added metadata-level capability checks (no execution logic):

1. **`canAppDiscoverCapability(appKey, capabilityKey)`**
   - Metadata check: Can an app discover a capability?

2. **`canAppExecuteCapability(appKey, capabilityKey)`**
   - Metadata check: Can an app execute a capability?
   - **Enforced rules:**
     - Audit App: May see capabilities, Never execute
     - Portal: May see limited capabilities, Never execute
     - CRM: Full execution rights (subject to existing guards)

3. **`getCapabilitiesMetadataForApp(appKey, domain)`**
   - Returns capabilities with app-specific discovery/execution flags

**⚠️ Important:**
- No route blocking changes
- Just capability metadata validation hooks
- These are metadata checks, not permission enforcement

---

## 📚 Files Changed

### Created Files
1. ✅ `server/constants/executionCapabilities.js` - Execution capabilities registry
2. ✅ `server/utils/executionCapabilityRegistry.js` - Capability resolver utilities

### Modified Files
1. ✅ `server/services/recordContextService.js` - Enhanced with execution capabilities
2. ✅ `server/utils/automationGuardrails.js` - Added capability helpers
3. ✅ `server/middleware/appBoundaryGuards.js` - Added metadata-level capability checks

### Documentation
1. ✅ `PHASE_0I4_EXECUTION_CAPABILITIES.md` - This file

---

## 🔐 Guardrails Checklist

- ✅ No state transitions
- ✅ No UI buttons
- ✅ No APIs created
- ✅ No permission changes
- ✅ No Audit App execution
- ✅ No Portal execution
- ✅ CRM remains execution engine
- ✅ Fully backward compatible
- ✅ No route blocking changes

---

## ✅ Validation Checklist

- ✅ Capabilities registry exists
- ✅ All RESPONSE review actions declared
- ✅ All EVENT / AUDIT actions declared
- ✅ Audit App can discover but not execute
- ✅ Portal cannot execute anything
- ✅ CRM remains sole execution owner
- ✅ Record Context includes executionCapabilities
- ✅ Automation guardrails updated
- ✅ App boundary guards updated
- ✅ No behavior change anywhere
- ✅ All functions are pure and non-throwing
- ✅ Metadata-only, no execution logic

---

## 🎁 Outcome

After Phase 0I.4:

✅ **The platform speaks execution fluently**
- All execution capabilities are formally declared
- Execution ownership is explicit
- Discovery vs execution is clearly separated

✅ **UI can render actions without guessing**
- UI hints (labels, icons, colors) are included
- Available actions are computed from metadata
- No hardcoded logic needed in UI

✅ **Process Designer can list actions safely**
- Automation-capable capabilities are discoverable
- Process Designer cannot execute directly (only CRM can)
- Metadata prevents unauthorized automation

✅ **App boundaries are mathematically enforced**
- Audit App: Read-only by design
- Portal: Read-only by design
- CRM: Full execution rights
- Metadata prevents cross-app execution bugs

✅ **No future refactors needed**
- Registry is extensible
- New capabilities can be added declaratively
- No hardcoded action lists anywhere

---

## 🧠 Why Capabilities Exist

**Vocabulary, Not Behavior:**

1. **Declarative, Not Imperative**
   - We're teaching the platform what exists, not what to do
   - Capabilities are declared, not executed
   - Execution ownership is explicit

2. **Discovery vs Execution**
   - Apps can discover capabilities they cannot execute
   - Audit App can see actions but never execute
   - Portal can see actions but never execute
   - Only CRM can execute

3. **Process Designer Safety**
   - Process Designer can discover automation-capable actions
   - Process Designer cannot execute directly
   - Process Designer triggers CRM execution

4. **UI Rendering Without Guessing**
   - UI can query capabilities for a record
   - UI can render buttons based on metadata
   - No hardcoded action lists in UI

5. **Prevents Future Permission Bugs**
   - Execution ownership is explicit
   - App boundaries are enforced at metadata level
   - Cannot accidentally grant execution rights

---

## 🎯 How Process Designer Will Consume This Later

**Phase 0I.4 enables (does not implement):**

1. **Action Discovery**
   ```javascript
   // Process Designer can query:
   const capabilities = getAutomationCapabilitiesForProcessDesigner();
   // Result: [{ capabilityKey: 'RESPONSE_APPROVE', ... }, ...]
   ```

2. **Action Validation**
   ```javascript
   // Process Designer can validate:
   const canDiscover = isCapabilityAutomationDiscoverable('RESPONSE_APPROVE');
   const canExecute = isCapabilityAutomationExecutable('RESPONSE_APPROVE');
   // Result: canDiscover = true, canExecute = true (but only via CRM)
   ```

3. **Record Context Integration**
   ```javascript
   // UI can discover what actions are available:
   const context = await getRecordContext(orgId, 'CRM', 'responses', responseId);
   const capabilities = context.executionCapabilities;
   // Result: [{ capabilityKey: 'RESPONSE_APPROVE', allowedToExecute: true }, ...]
   ```

**But Process Designer cannot:**
- Execute actions directly (only CRM controllers can)
- Bypass ownership checks (guardrails enforce)
- Mutate state (read-only metadata only)

---

## 🎯 How UI Will Consume This Later

**Phase 0I.4 enables (does not implement):**

1. **Dynamic Button Rendering**
   ```javascript
   // UI can discover what buttons to show:
   const context = await getRecordContext(orgId, 'CRM', 'responses', responseId);
   const capabilities = context.executionCapabilities;
   
   capabilities.forEach(cap => {
     if (cap.allowedToExecute) {
       // Render button with cap.uiHints.label, cap.uiHints.icon, etc.
     }
   });
   ```

2. **Conditional Action Visibility**
   ```javascript
   // UI can check discovery rights:
   const canDiscover = canAppDiscoverCapability(appKey, 'RESPONSE_APPROVE');
   if (canDiscover) {
     // Show action in menu (but may be disabled if not executable)
   }
   ```

3. **App-Specific UI**
   ```javascript
   // Audit App can see actions but buttons are disabled:
   const capabilities = getCapabilitiesMetadataForApp('AUDIT', 'RESPONSE');
   capabilities.forEach(cap => {
     // Show action but disable button (cap.allowedToExecute = false)
   });
   ```

**But UI cannot:**
- Execute actions without going through CRM controllers
- Bypass metadata-level checks
- Show actions that aren't discoverable

---

## 🛡️ How This Prevents Future Permission Bugs

**Before Phase 0I.4:**
- Execution ownership was implicit
- Hardcoded action lists in UI
- No way to query "what can this app do?"
- Easy to accidentally grant execution rights

**After Phase 0I.4:**
- Execution ownership is explicit (one owner per capability)
- Metadata-driven action discovery
- Can query "what can this app do?" at metadata level
- Cannot accidentally grant execution (enforced at metadata level)

**Example Bug Prevention:**

**Before:** UI might render "Approve" button in Audit App
**After:** Metadata says `allowedToExecute = false` for Audit App, UI disables button

**Before:** Process Designer might try to execute directly
**After:** Metadata says only CRM can execute, Process Designer triggers CRM

**Before:** Portal might try to access responses directly
**After:** Metadata says Portal policy is 'HIDDEN' or 'READ_ONLY', access is blocked

---

## 📖 Final Note

**This phase is about vocabulary, not behavior.**

We are teaching the platform:
- What execution capabilities exist
- Who owns execution (CRM)
- Who can discover vs execute
- What actions are automation-capable
- How actions should be displayed (future)

We are NOT implementing:
- State transitions
- Workflow logic
- UI buttons
- API endpoints
- Permission enforcement
- Execution wiring

**This is purely declarative metadata for future consumption.**

---

## ✅ Completion Status

- ✅ Execution Capabilities Registry created
- ✅ Capability resolver utilities implemented
- ✅ Record Context enriched with capabilities
- ✅ Automation guardrails extended
- ✅ App boundary guards updated
- ✅ Documentation created
- ✅ All guardrails verified
- ✅ Backward compatibility maintained
- ✅ All functions are pure and non-throwing

**Phase 0I.4 is complete.** ✅

**This is the last metadata phase before UI and automation.**

