# Event Settings Doctrine

**Version:** 1.0  
**Date:** January 2026  
**Status:** Architectural Doctrine (Locked)  
**Type:** Platform Architecture Doctrine

---

## Executive Summary

Event Settings is the **SINGLE SOURCE OF TRUTH** for event type structure, configuration, and eligibility across the LiteDesk platform. This doctrine defines the architectural principles, invariants, and boundaries that govern Event Settings.

**Key Principle:** Event Settings configure **structure only**. They do not manage scheduling, execution, workflows, or permissions.

**Canonical Reference:** People Settings (`/settings?tab=core-modules&moduleKey=people`)  
**Settings Location:** `/settings?tab=core-modules&moduleKey=events`  
**Related Documents:** `event-settings.md`, `module-settings-doctrine.md`

---

## 1. Purpose

### What Event Settings IS

Event Settings is the **SINGLE SOURCE OF TRUTH** for:

1. **Which event types exist**
   - Event type definitions (keys, labels, ownership)
   - Event type enablement/disablement
   - Event type display configuration

2. **Which apps can create them**
   - `creatableFromApps` configuration per event type
   - Command palette filtering
   - Creation surface availability

3. **Which fields are configurable**
   - Editable fields per event type
   - Field visibility and requirements
   - Field ordering and grouping

4. **Which behaviors are locked**
   - Locked fields (system-controlled, execution, workflow)
   - Geo requirement locks (audit events always require geo)
   - Execution mode locks (audit vs generic)

### What Event Settings MUST NEVER DO

Event Settings **MUST NEVER** configure:

1. **Event Scheduling**
   - Time slot allocation
   - Availability management
   - Recurrence execution
   - Calendar display

2. **Event Execution**
   - Check-in/check-out
   - Geo tracking execution
   - Time tracking
   - Execution state transitions

3. **Audit Workflows**
   - State transitions (Ready to start → checked_in → submitted → approved → closed)
   - Approval/rejection flows
   - Corrective action workflows
   - Workflow state management

4. **Permissions**
   - Role assignments
   - Permission grants
   - Access control rules

5. **Event Records**
   - Creating events
   - Editing events
   - Deleting events
   - Displaying event lists

---

## 2. EventTypeDefinition Model

### Formal Model

Event Settings uses a formal `EventTypeDefinition` model:

```typescript
interface EventTypeDefinition {
  key: EventTypeKey;                    // Internal identifier (e.g., 'INTERNAL_AUDIT')
  label: string;                        // Human-readable label (e.g., 'Internal Audit')
  owningApp: AppKey;                    // App that owns this event type
  creatableFromApps: AppKey[];          // Apps that can create this type
  editableFields: EventFieldKey[];      // Fields configurable in Settings
  lockedFields: EventFieldKey[];        // Fields that cannot be changed
  executionMode: 'generic' | 'audit-workflow';  // Execution behavior
  isAuditEvent: boolean;                // Whether this is an audit event
  geoRequired: boolean;                 // Whether geo is required
  geoConfigurable: boolean;             // Whether geo requirement can be toggled
}
```

### Ownership Rules

**INVARIANT: Audit events are owned by AUDIT app**

- `INTERNAL_AUDIT`: `owningApp: 'AUDIT'`
- `EXTERNAL_AUDIT_SINGLE`: `owningApp: 'AUDIT'`
- `EXTERNAL_AUDIT_BEAT`: `owningApp: 'AUDIT'`

**INVARIANT: Sales cannot create audit events**

- Audit events: `creatableFromApps: ['AUDIT']` (Sales excluded)
- Sales events: `creatableFromApps: ['SALES']`
- Generic events: `creatableFromApps: ['SALES', 'PLATFORM', 'CALENDAR']`

### Execution Mode Rules

**INVARIANT: Execution mode matches event type**

- Audit events: `executionMode: 'audit-workflow'`
- Non-audit events: `executionMode: 'generic'`

Execution behavior is **NOT configurable** in Event Settings. This is a structural property that determines which execution surface is used.

### Geo Requirement Rules

**INVARIANT: Audit events always require geo**

- Audit events: `geoRequired: true`, `geoConfigurable: false`
- Other events: `geoRequired` configurable, `geoConfigurable: true`

---

## 3. Non-Goals

### Event Settings ≠ Event Scheduling

**Excluded:**
- Time slot allocation
- Availability management
- Recurrence pattern execution
- Calendar display configuration

**Rationale:** Scheduling is a separate domain concern. Event Settings configure event structure; scheduling interfaces manage when and how events are scheduled.

**Location:** Scheduling belongs in Calendar interfaces, Scheduling API, and Work interfaces.

### Event Settings ≠ Execution

**Excluded:**
- Check-in/check-out execution
- Geo tracking execution
- Time tracking execution
- Execution state management

**Rationale:** Execution belongs to Work interfaces. Event Settings configure the structure that enables execution elsewhere (geo requirements, role assignments), not execution itself.

**Location:** Event execution belongs in EventExecution components and Work interfaces.

### Event Settings ≠ Permissions

**Excluded:**
- Role assignments
- Permission grants
- Access control rules
- Security configuration

**Rationale:** Permissions belong to Security Settings. Event Settings configure which roles are required per event type, not who has those roles or what they can do.

**Location:** Permissions belong in Security Settings and Permission management interfaces.

---

## 4. Interaction with Other Surfaces

### Command Palette

**Rule:** Command palette must respect `creatableFromApps`

- Command palette filters event types by `creatableFromApps`
- Sales app context: Only shows event types where `creatableFromApps` includes `'SALES'`
- Audit app context: Only shows event types where `creatableFromApps` includes `'AUDIT'`

**Implementation:**
```typescript
const creatableTypes = getCreatableEventTypesForApp(currentAppKey, eventSettingsConfig);
```

### Event Creation Surfaces

**Rule:** Creation surfaces filter by `creatableFromApps`

- GenericEventCreateSurface: Shows only creatable event types for current app
- AuditScheduleSurface: Shows only audit event types (creatable from AUDIT app)

**Implementation:**
```typescript
const availableTypes = eventSettingsConfig.eventTypes.filter(type =>
  type.creatableFromApps.includes(currentAppKey)
);
```

### Event Execution Surface

**Rule:** Execution surface uses `executionMode` to determine behavior

- `executionMode: 'generic'`: Uses generic execution flow (start → in progress → complete)
- `executionMode: 'audit-workflow'`: Uses audit workflow flow (check-in → form → review → approval → closed)

**Implementation:**
```typescript
const eventType = getEventTypeDefinitionByKey(event.eventType);
if (eventType?.executionMode === 'audit-workflow') {
  // Use audit execution surface
} else {
  // Use generic execution surface
}
```

---

## 5. Field Configuration Rules

### Editable Fields

Editable fields are **settings-level only** (structure, visibility, requirements):

- Core event fields: `eventName`, `startDateTime`, `endDateTime`, `location`, `notes`, `relatedToId`, `recurrence`
- App participation fields: `auditorId`, `reviewerId`, `correctiveOwnerId`, `linkedFormId`, etc.
- Role fields: Visibility and requirements per event type

### Locked Fields

Locked fields **cannot be changed** (system-controlled or app-owned):

- System fields: `status`, `auditState`, `eventId`, `_id`, `organizationId`, timestamps
- Execution fields: `checkIn`, `checkOut`, `timeSpent`, `executionStartTime`, `executionEndTime`
- Workflow fields: `auditState` transitions, `auditHistory`
- Audit-required fields: `geoRequired` for audit events (always true)

### Field Locking Rules

**INVARIANT: Audit-required fields cannot be disabled**

- `geoRequired` for audit events: Always `true`, `geoConfigurable: false`
- Role requirements for audit events: Cannot be made optional
- System-controlled fields: Always locked

---

## 6. UI Organization

### Grouping by Owning App

Event Settings UI groups event types by `owningApp`:

- **AUDIT App**: Internal Audit, External Audit — Single Org, External Audit Beat
- **SALES App**: Field Sales Beat
- **PLATFORM App**: Meeting / Appointment

### Read-Only Badges

Locked behaviors are shown with read-only badges:

- **System-Controlled**: Badge for `status`, `auditState`, execution fields
- **Audit-Required**: Badge for `geoRequired` on audit events
- **App-Owned**: Badge for app-specific locked fields

### Inline Explanations

Disabled fields show inline explanations:

- **"This field is system-controlled and cannot be modified"** (for system fields)
- **"Audit events always require geo tracking"** (for `geoRequired` on audit events)
- **"This field is owned by [App] and cannot be modified"** (for app-owned locked fields)

---

## 7. DEV-ONLY Assertions

### Runtime Guards

Event Settings includes DEV-ONLY assertions to prevent invalid configurations:

```typescript
// Assert: Execution mode matches event type
console.assert(
  eventType.executionMode === (eventType.isAuditEvent ? 'audit-workflow' : 'generic'),
  'Execution mode mismatch'
);

// Assert: Audit events are owned by AUDIT app
if (eventType.isAuditEvent) {
  console.assert(
    eventType.owningApp === 'AUDIT',
    'Audit events must be owned by AUDIT app'
  );
}

// Assert: Sales cannot create audit events
if (eventType.isAuditEvent) {
  console.assert(
    !eventType.creatableFromApps.includes('SALES'),
    'Sales cannot create audit events'
  );
}

// Assert: Audit events always require geo
if (eventType.isAuditEvent) {
  console.assert(
    eventType.geoRequired === true && eventType.geoConfigurable === false,
    'Audit events must always require geo'
  );
}
```

### Invalid Combination Prevention

Event Settings UI prevents rendering invalid combinations:

- Cannot add audit fields to non-audit events
- Cannot disable geo requirement for audit events
- Cannot change execution mode
- Cannot modify locked fields

---

## 8. Future-Proofing

### Adding New Event Types

To add a new event type:

1. **Define EventTypeDefinition** in `eventTypes.ts`
2. **Set ownership** (`owningApp`)
3. **Set creation apps** (`creatableFromApps`)
4. **Define editable fields** (settings-level only)
5. **Define locked fields** (system, execution, workflow)
6. **Set execution mode** (`generic` or `audit-workflow`)
7. **Set geo rules** (`geoRequired`, `geoConfigurable`)

### Modifying Existing Event Types

**INVARIANT: Core properties cannot be changed**

- `key`: Immutable (used in APIs and data models)
- `owningApp`: Immutable (determines app ownership)
- `executionMode`: Immutable (determines execution behavior)
- `isAuditEvent`: Immutable (determines audit classification)

**Allowed modifications:**

- `label`: Can be configured per tenant
- `creatableFromApps`: Can be extended (but audit events cannot include SALES)
- `editableFields`: Can be extended (but cannot include locked fields)
- `geoRequired`/`geoConfigurable`: Can be modified for non-audit events

---

## 9. Summary

Event Settings is the **SINGLE SOURCE OF TRUTH** for event type structure, configuration, and eligibility. It enforces architectural invariants through:

1. **Formal EventTypeDefinition model** with explicit ownership, creation, and execution rules
2. **Clear boundaries** between Settings, Scheduling, Execution, and Permissions
3. **DEV-ONLY assertions** that prevent invalid configurations
4. **UI organization** that groups by ownership and shows locked behaviors clearly
5. **Future-proofing** through immutable core properties and extensible configuration

**Key Principles:**
- Event Settings configure structure only
- Execution behavior is NOT configurable
- Audit safety is enforced at config level
- Command palette respects creatableFromApps
- Event model becomes future-proof

**Reference:** `event-settings.md` for detailed configuration rules  
**Implementation:** `client/src/types/eventSettings.types.ts`, `client/src/metadata/eventTypes.ts`

---

**This doctrine defines NON-NEGOTIABLE invariants for Event Settings.**  
**These rules must never be violated, regardless of feature requests or UI preferences.**
