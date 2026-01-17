# Phase 0K — Execution Feedback Metadata

## 🎯 Purpose

Introduce a pure metadata layer that explains why an execution action is available or blocked — without adding UI, logic, or permissions.

This enables:
- ✅ Consistent UX across all apps
- ✅ Clear error messages and tooltips
- ✅ Safe reuse by Platform UI, Audit App, Portal, and Process Designer
- ✅ Disabled buttons with explanatory tooltips
- ✅ Inline banners ("Trial expired", "Seat required")
- ✅ Process Designer validation messages

## 🏗️ Architecture

### Components

1. **Execution Feedback Registry** (`server/constants/executionFeedbackRegistry.js`)
   - Maps execution entitlement reason codes → UX-safe explanations
   - Contains all feedback objects with severity, title, and message

2. **Feedback Resolver** (`server/utils/executionFeedbackResolver.js`)
   - Transforms execution entitlement results → normalized feedback objects
   - Never throws
   - No permissions logic
   - Pure metadata transformation

3. **Access Resolution Integration** (`server/services/accessResolutionService.js`)
   - Attaches feedback metadata to all access resolution results
   - Non-breaking addition
   - Preserves existing allow/deny behavior

4. **Middleware Exposure** (`server/middleware/requireAppEntitlementMiddleware.js`)
   - Includes feedback in error responses
   - Preserves existing status codes
   - Enables UI to display appropriate feedback

## 📋 Registry Design

### Feedback Structure

Each feedback object contains:

```javascript
{
  code: 'REASON_CODE',           // Unique identifier matching reason code
  severity: 'NONE|INFO|WARNING|ERROR',  // Feedback severity level
  title: 'Short Title',          // Short title for UI (null if no title)
  message: 'User-friendly message' // Detailed explanation
}
```

### Severity Levels

- **NONE**: No message (execution allowed)
- **INFO**: Informational (trial active, etc.)
- **WARNING**: Warning (trial expired, etc.)
- **ERROR**: Error (blocked, seat required, etc.)

### Feedback Categories

#### Allowed States
- `ALLOWED` - Generic allowed state
- `TRIAL_EXECUTION_ALLOWED` - Trial execution (non-billable)
- `INTERNAL_INSTANCE_OVERRIDE` - Internal instance override
- `PLATFORM_ADMIN_ACCESS` - Platform admin access
- `ADMIN_VISIBILITY_ALLOWED` - Admin visibility access
- `ADMIN_CONFIGURE_ALLOWED` - Admin configuration access
- `OWNER_IMPLICIT_ADMIN` - Owner implicit admin access
- `EXPLICIT_EXECUTION_ACCESS` - Explicit execution access
- `LEGACY_EXECUTION_ACCESS` - Legacy execution access
- `EXPLICIT_EXECUTION_SEAT` - Explicit execution seat
- `LEGACY_EXECUTION_SEAT` - Legacy execution seat

#### Blocked States
- `TRIAL_EXPIRED` - Trial has ended
- `SUBSCRIPTION_REQUIRED` - Active subscription required
- `EXECUTION_SEAT_REQUIRED` - Execution seat required
- `INSTANCE_BLOCKED` - Instance suspended or terminated
- `APP_NOT_FOUND` - Application not found
- `APP_NOT_ENABLED_FOR_TENANT` - Application not enabled for tenant
- `PLATFORM_ONLY_APP` - Platform-only application
- `NO_EXPLICIT_APP_ACCESS` - No explicit app access
- `ADMIN_CANNOT_EXECUTE` - Admin cannot execute
- `EXECUTION_CANNOT_CONFIGURE` - Execution cannot configure
- `CONTROL_PLANE_ACCESS_DENIED` - Control plane access denied
- `CONTROL_PLANE_NO_EXECUTION` - Control plane doesn't support execution
- `ORGANIZATION_NOT_FOUND` - Organization not found
- `INVALID_ROLE_FOR_APP` - Invalid role for app
- `NO_DEFAULT_ROLE_FOR_APP` - No default role for app
- `EXECUTION_NOT_ALLOWED` - Execution not allowed (generic)
- `UNKNOWN` - Unknown error

## 📦 Example Payloads

### Successful Access Resolution

```json
{
  "allowed": true,
  "mode": "EXECUTION",
  "billable": true,
  "reason": "EXPLICIT_EXECUTION_ACCESS",
  "roleKey": "USER",
  "feedback": {
    "code": "EXPLICIT_EXECUTION_ACCESS",
    "severity": "NONE",
    "title": null,
    "message": null
  }
}
```

### Trial Execution

```json
{
  "allowed": true,
  "mode": "EXECUTION",
  "billable": false,
  "reason": "TRIAL_EXECUTION_ALLOWED",
  "feedback": {
    "code": "TRIAL_EXECUTION_ALLOWED",
    "severity": "INFO",
    "title": "Trial Active",
    "message": "You can execute actions during your trial period."
  }
}
```

### Trial Expired

```json
{
  "allowed": false,
  "mode": null,
  "billable": false,
  "reason": "TRIAL_EXPIRED",
  "feedback": {
    "code": "TRIAL_EXPIRED",
    "severity": "WARNING",
    "title": "Trial Ended",
    "message": "Your trial has ended. Please subscribe to continue execution."
  }
}
```

### Seat Required

```json
{
  "allowed": false,
  "mode": null,
  "billable": false,
  "reason": "EXECUTION_SEAT_REQUIRED",
  "feedback": {
    "code": "EXECUTION_SEAT_REQUIRED",
    "severity": "ERROR",
    "title": "Seat Required",
    "message": "This action requires an active execution seat."
  }
}
```

### Middleware Error Response

```json
{
  "success": false,
  "message": "This action requires an active execution seat.",
  "code": "EXECUTION_SEAT_REQUIRED",
  "currentApp": "CRM",
  "reason": "EXECUTION_SEAT_REQUIRED",
  "feedback": {
    "code": "EXECUTION_SEAT_REQUIRED",
    "severity": "ERROR",
    "title": "Seat Required",
    "message": "This action requires an active execution seat."
  },
  "error": "This action requires an active execution seat."
}
```

## 🎨 Future UI Usage

### Disabled Buttons with Tooltips

```vue
<template>
  <button
    :disabled="!accessResult.allowed"
    :title="accessResult.feedback?.message"
    :class="{ 'tooltip-warning': accessResult.feedback?.severity === 'WARNING' }"
  >
    Execute Action
  </button>
</template>
```

### Inline Banners

```vue
<template>
  <div v-if="accessResult.feedback && accessResult.feedback.severity !== 'NONE'">
    <div
      :class="`banner-${accessResult.feedback.severity.toLowerCase()}`"
    >
      <strong>{{ accessResult.feedback.title }}</strong>
      <p>{{ accessResult.feedback.message }}</p>
    </div>
  </div>
</template>
```

### Process Designer Validation

```javascript
// Process Designer can validate flows before publishing
function validateProcess(process, accessResult) {
  if (!accessResult.allowed) {
    return {
      valid: false,
      feedback: accessResult.feedback,
      error: `${accessResult.feedback.title}: ${accessResult.feedback.message}`
    };
  }
  return { valid: true };
}
```

## 🔧 Process Designer Integration Notes

The feedback metadata enables Process Designer to:

1. **Pre-publish Validation**: Check if users can execute processes before publishing
2. **Clear Error Messages**: Display user-friendly messages when validation fails
3. **Conditional Flow Branching**: Branch flows based on execution entitlement state
4. **Warning Banners**: Show warnings (e.g., "Trial expiring soon") during design

### Example Integration

```javascript
async function validateProcessForUser(process, user, organization) {
  // Resolve access for each app in the process
  for (const appKey of process.requiredApps) {
    const accessResult = await resolveAppAccess({
      user,
      organization,
      appKey,
      intent: 'EXECUTE'
    });

    if (!accessResult.allowed) {
      return {
        valid: false,
        feedback: accessResult.feedback,
        blockingApp: appKey
      };
    }
  }

  return { valid: true };
}
```

## 🔒 Guardrails

### Must Never

- ❌ **Grant Access**: Feedback must never grant access. Only `allowed` field grants access.
- ❌ **Mutate State**: Feedback is read-only metadata.
- ❌ **Infer Logic**: UI must not infer execution logic from feedback alone.
- ❌ **Bypass Permissions**: CRM remains the execution engine.

### Always

- ✅ **Preserve Behavior**: Feedback does not change existing allow/deny behavior.
- ✅ **Safe for All Apps**: Works uniformly across CRM, Audit, Portal, and Process Designer.
- ✅ **Non-Breaking**: Existing code continues to work without feedback.

## 📚 Design Rules

### Implementation Rules

- ❌ No UI components
- ❌ No new permissions
- ❌ No execution logic
- ❌ No role checks
- ❌ No app-specific branching
- ✅ Metadata only
- ✅ Reusable everywhere
- ✅ Safe for Audit & Portal
- ✅ Ready for Process Designer

## ✅ Outcome

After Phase 0K:

- ✅ Platform can explain why execution is blocked
- ✅ UI buttons can show correct disabled tooltips
- ✅ Audit & Portal stay read-only
- ✅ Process Designer can validate flows pre-publish
- ✅ No future refactor needed
- ✅ Consistent UX across all apps
- ✅ Clear, user-friendly error messages

## 🔄 Migration Notes

### Backward Compatibility

- All existing code continues to work
- Feedback is additive metadata only
- No breaking changes to access resolution logic
- Middleware error responses include feedback but preserve existing structure

### Testing

When testing Phase 0K:

1. Verify feedback is attached to all access resolution results
2. Verify feedback is included in middleware error responses
3. Verify feedback never changes allow/deny behavior
4. Verify all reason codes have corresponding feedback entries
5. Verify feedback resolver never throws errors

## 📖 Related Documentation

- **Phase 0J**: Subscription & Execution Entitlement Gate
- **Phase 0I**: Instance Status & Lifecycle
- **Phase 0F**: Unified Access Resolution Engine

