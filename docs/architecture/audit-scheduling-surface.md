# Audit Scheduling Surface Architecture

**Version:** 1.0  
**Date:** January 2026  
**Status:** Architectural Specification (Locked)  
**Type:** Platform Architecture Specification

---

## Executive Summary

This document defines the Audit Scheduling Surface as the **exclusive creation path** for audit events in the LiteDesk platform. Audit Scheduling instantiates audit workflows by creating properly configured audit event instances. This specification establishes guardrails that prevent audit events from being created through generic event creation interfaces, ensuring compliance-grade audit workflows.

**Surface Location:** `/audit/audits` (Audit App)  
**Related Documents:** `event-settings.md`, `docs/architecture/event-settings.md`  
**Doctrine Reference:** `module-settings-doctrine.md`

---

## 1. Purpose & Scope

### Purpose

Audit Scheduling instantiates audit workflows by creating audit event instances with all required configuration (roles, forms, geo, constraints). It is the **only allowed way** to create audit events in the platform. This surface ensures that every audit event is created with proper role assignments, form linking, geo requirements, and workflow constraints.

### Scope

Audit Scheduling applies **only** to audit event creation:

- **Single-Organization Audits:** Internal Audit, External Audit — Single Org
- **Multi-Organization Audits:** External Audit Beat (route-based audits)
- **Role Assignment:** Auditor, Reviewer (conditional), Corrective Owner
- **Form Linking:** Required audit form selection and linking
- **Geo Configuration:** Geo requirements (always enforced for audit events)
- **Scheduling:** Start and end date/time assignment
- **Workflow Initialization:** Setting initial audit state and constraints

### Explicit Scope Exclusions

Audit Scheduling **does not** manage audit execution, responses, or workflows. The following belong to other domains:

#### Audit Execution
**Excluded:** Audit execution, check-in/check-out, form response submission, geo tracking execution, time tracking, and execution state management.

**Rationale:** Execution belongs to Work interfaces. Audit Scheduling creates the event instance; execution happens in EventExecution components and Audit Work interfaces.

**Location:** Audit execution belongs in EventExecution components, Audit App execution interfaces, and Work components.

#### Audit Responses and Approvals
**Excluded:** Form response submission, audit approval/rejection workflows, corrective action workflows, and audit lifecycle state transitions.

**Rationale:** Responses and approvals are execution concerns, not scheduling concerns. Audit Scheduling creates the event; responses and approvals happen during execution.

**Location:** Audit responses and approvals belong in Audit App execution interfaces and Work components.

#### Calendar Views
**Excluded:** Calendar views, calendar navigation, calendar filtering, and calendar display of audit events.

**Rationale:** Calendars are Surfaces for viewing scheduled events, not creation interfaces. Audit events appear in calendars after scheduling, but scheduling itself does not happen in calendar views.

**Location:** Calendar views belong in Calendar components and Calendar doctrine.

#### Event Editing
**Excluded:** Editing live audit events, modifying scheduled audit events after creation, and bulk editing of audit events.

**Rationale:** Audit events are immutable after scheduling. Once created, audit events can only be cancelled or executed, not edited. This ensures audit trail integrity.

**Location:** Event editing (for non-audit events) belongs in Event Surfaces and Work interfaces.

#### Bulk Scheduling
**Excluded:** Bulk creation of audit events, template-based scheduling, and automated audit scheduling.

**Rationale:** Each audit event requires individual configuration (roles, forms, organizations). Bulk scheduling would bypass required validation and role assignment, violating audit workflow integrity.

**Location:** Bulk operations belong in dedicated bulk operation interfaces (if implemented) with equivalent validation.

### Mental Model

```
Audit Scheduling → Create audit event instances with required configuration
Audit Execution → Execute scheduled audit events (check-in, forms, check-out)
Audit Workflows → Manage audit state transitions (approval, rejection, corrective)
Event Settings → Configure audit event structure and constraints (not creation)
Generic Event Creation → Create non-audit events only (meetings, sales beats)
```

---

## 2. Core Definitions

### 2.1 Audit Schedule

An Audit Schedule is the process of creating an audit event instance with all required configuration. The schedule includes:

- **Audit Type Selection:** Internal Audit, External Audit — Single Org, or External Audit Beat
- **Target Organization(s):** Single organization (for Internal/External Single Org) or multiple organizations (for Beat)
- **Role Assignments:** Auditor, Reviewer (conditional), Corrective Owner
- **Form Linking:** Required audit form selection
- **Geo Configuration:** Geo requirements (always enforced)
- **Time Assignment:** Start and end date/time
- **Workflow Initialization:** Initial audit state and constraints

### 2.2 Audit Event Instance

An Audit Event Instance is the created Event record with `eventType` set to an audit type (`Internal Audit`, `External Audit — Single Org`, `External Audit Beat`). The instance includes:

- **Audit-Specific Fields:** `auditorId`, `reviewerId` (conditional), `correctiveOwnerId`, `auditState`, `linkedFormId`
- **Geo Enforcement:** `geoRequired: true` (immutable for audit events)
- **Organization Linkage:** `relatedToId` (single org) or `orgList` (beat)
- **Workflow State:** Initial `auditState` set to `'Ready to start'` or equivalent

### 2.3 Single-Organization Audit

A Single-Organization Audit targets one organization:

- **Internal Audit:** Targets the requester's organization (`relatedToId` locked to requester's `organizationId`)
- **External Audit — Single Org:** Targets a single external organization (`relatedToId` required, can be any organization)

**Required Roles:**
- Auditor (`auditorId`) — required
- Reviewer (`reviewerId`) — required for External Audit — Single Org only
- Corrective Owner (`correctiveOwnerId`) — required

**Required Configuration:**
- Linked form (`linkedFormId`) — required
- Geo required (`geoRequired: true`) — immutable
- Organization (`relatedToId`) — required

### 2.4 Multi-Organization (Beat) Audit

A Multi-Organization Audit targets multiple organizations in a route:

- **External Audit Beat:** Targets multiple organizations (`orgList` array, `routeSequence` array)

**Required Roles:**
- Auditor (`auditorId`) — required
- Corrective Owner (`correctiveOwnerId`) — required
- Reviewer (`reviewerId`) — not required (beat audits use single reviewer for entire route)

**Required Configuration:**
- Linked form (`linkedFormId`) — required
- Geo required (`geoRequired: true`) — immutable
- Organization list (`orgList`) — required (minimum 2 organizations)
- Route sequence (`routeSequence`) — optional (defaults to `orgList` order)

---

## 3. Entry Points

### 3.1 Allowed Entry Points

Audit Scheduling has **exactly three** entry points. All entry points route to the same surface (`/audit/audits`):

#### 3.1.1 Audit App → "Schedule Audit"

**Location:** Audit App dashboard or navigation  
**Route:** `/audit/audits`  
**Context:** User is in Audit App context  
**Action:** Opens Audit Scheduling Surface

#### 3.1.2 Organization Surface → "Schedule Audit"

**Location:** Organization detail surface, action menu or contextual actions  
**Route:** `/audit/audits` with `relatedToId` pre-filled  
**Context:** User is viewing an organization  
**Action:** Opens Audit Scheduling Surface with organization pre-selected

#### 3.1.3 Command Palette → "Schedule Audit"

**Location:** Global command palette (`/schedule audit` or `/plan audit beat`)  
**Route:** `/audit/audits`  
**Context:** User initiates from any context  
**Action:** Opens Audit Scheduling Surface

### 3.2 Entry Point Unification

**All entry points route to the same surface.** This ensures:

- Consistent validation rules
- Consistent UX patterns
- Single source of truth for audit event creation
- No duplicate creation paths

**Implementation Note:** Entry points may pre-fill context (e.g., organization from Organization Surface), but the surface itself is unified.

### 3.3 Prohibited Entry Points

The following are **explicitly prohibited**:

- **Generic Event Creation:** `/events/create`, `EventFormModal`, `CreateRecordDrawer` with `moduleKey: 'events'`
- **Calendar:** Calendar "Create Event" actions
- **Quick Create:** Any Quick Create flow for events
- **Command Palette → "Create Event":** Routes to GenericEventCreateSurface (non-audit only)

**Rationale:** These entry points are for non-audit events only. Audit events require specialized configuration that generic event creation cannot provide.

---

## 4. Required Inputs

### 4.1 Audit Type

**Field:** `eventType`  
**Type:** Picklist (constrained to audit types)  
**Options:**
- `Internal Audit`
- `External Audit — Single Org`
- `External Audit Beat`

**Validation:**
- Required
- Must be an audit event type (validated against `EVENT_TYPES` metadata)
- Cannot be changed after scheduling (immutable)

### 4.2 Target Organization(s)

**Fields:** `relatedToId` (single org) or `orgList` (beat)  
**Type:** Organization reference(s)  
**Validation:**
- **Single-Org Audits:** `relatedToId` required
  - Internal Audit: Locked to requester's organization
  - External Audit — Single Org: Can be any organization
- **Beat Audits:** `orgList` required (minimum 2 organizations)
- Cannot be changed after scheduling (immutable)

### 4.3 Auditor

**Field:** `auditorId`  
**Type:** User reference  
**Validation:**
- Required for all audit types
- Must be a valid user in the system
- Cannot be changed after scheduling (immutable)

### 4.4 Reviewer (Conditional)

**Field:** `reviewerId`  
**Type:** User reference  
**Validation:**
- **Required** for External Audit — Single Org
- **Not required** for Internal Audit or External Audit Beat
- Must be a valid user in the system
- Cannot be changed after scheduling (immutable)

### 4.5 Corrective Owner

**Field:** `correctiveOwnerId`  
**Type:** User reference  
**Validation:**
- Required for all audit types
- Must be a valid user in the system
- Cannot be changed after scheduling (immutable)

### 4.6 Start & End Date/Time

**Fields:** `startDateTime`, `endDateTime`  
**Type:** ISO 8601 datetime strings  
**Validation:**
- Both required
- `endDateTime` must be after `startDateTime`
- Cannot be changed after scheduling (immutable)

### 4.7 Linked Form

**Field:** `linkedFormId`  
**Type:** Form reference  
**Validation:**
- Required for all audit types
- Must be an audit form (`formType: 'Audit'`)
- Form must be active/published
- Cannot be changed after scheduling (immutable)

### 4.8 Event Name

**Field:** `eventName`  
**Type:** String (max 255 characters)  
**Validation:**
- Required
- Auto-generated from audit type and organization(s) if not provided
- Can be customized by user

---

## 5. Validation Rules

### 5.1 Role Requirements per Audit Type

#### Internal Audit
- **Auditor:** Required
- **Reviewer:** Not required (self-review allowed via `allowSelfReview`)
- **Corrective Owner:** Required

#### External Audit — Single Org
- **Auditor:** Required
- **Reviewer:** Required (cannot be same as auditor)
- **Corrective Owner:** Required

#### External Audit Beat
- **Auditor:** Required
- **Reviewer:** Not required (single reviewer for entire route)
- **Corrective Owner:** Required

### 5.2 Geo Enforcement

**Rule:** Geo is **always required** for audit events.

**Implementation:**
- `geoRequired: true` — immutable, cannot be disabled
- UI shows geo requirement as read-only, always enabled
- Backend enforces geo requirement (cannot be overridden)

**Rationale:** Audit events require location verification for compliance. Geo tracking is mandatory for audit trail integrity.

### 5.3 Form Requirements

**Rule:** Audit form linking is **required** for all audit events.

**Validation:**
- `linkedFormId` must be provided
- Form must be an audit form (`formType: 'Audit'`)
- Form must be active/published
- Form cannot be changed after scheduling (immutable)

**Rationale:** Audit events require structured data collection via forms. Form linking ensures consistent audit data capture.

### 5.4 Self-Review Constraints

**Rule:** Self-review is **only allowed** for Internal Audit events.

**Implementation:**
- `allowSelfReview: true` — only for Internal Audit
- `allowSelfReview: false` — for External Audit — Single Org and External Audit Beat
- Cannot be changed after scheduling (immutable)

**Rationale:** Internal audits may allow self-review for efficiency. External audits require independent review for compliance.

### 5.5 Immutable Constraints After Scheduling

**Rule:** Once an audit event is scheduled, the following fields are **immutable**:

- `eventType` — cannot change audit type
- `auditorId` — cannot change auditor
- `reviewerId` — cannot change reviewer
- `correctiveOwnerId` — cannot change corrective owner
- `relatedToId` / `orgList` — cannot change target organization(s)
- `linkedFormId` — cannot change linked form
- `geoRequired` — cannot disable geo requirement
- `startDateTime` / `endDateTime` — cannot change schedule
- `allowSelfReview` — cannot change self-review setting

**Rationale:** Audit events are compliance records. Immutability ensures audit trail integrity and prevents tampering.

**Exception:** Audit events can be **cancelled** (not edited). Cancellation sets `status: 'Cancelled'` and records cancellation reason, but does not modify immutable fields.

---

## 6. UX Rules

### 6.1 Guided, Step-Based Flow

**Rule:** Audit Scheduling uses a **guided, step-based flow**, not a raw form.

**Implementation:**
- Multi-step wizard or progressive disclosure
- Each step focuses on one aspect (type selection, organization selection, role assignment, form selection, scheduling)
- Clear progress indicators
- Step validation before proceeding

**Rationale:** Audit scheduling requires careful configuration. A guided flow ensures all required fields are completed correctly and reduces errors.

### 6.2 Clear Explanations for Required Roles

**Rule:** Each role assignment must include **clear explanations** of why the role is required and what responsibilities it entails.

**Implementation:**
- Tooltips or inline help text for each role
- Role descriptions: "Auditor conducts the audit", "Reviewer approves audit results", "Corrective Owner addresses findings"
- Conditional role visibility (show Reviewer only for External Audit — Single Org)

**Rationale:** Users may not understand audit role requirements. Clear explanations improve compliance and reduce configuration errors.

### 6.3 Warnings for Irreversible Choices

**Rule:** Irreversible choices must display **clear warnings** before confirmation.

**Implementation:**
- Warning messages for immutable fields: "This cannot be changed after scheduling"
- Confirmation dialogs for critical choices (e.g., form selection, organization selection)
- Visual indicators (lock icons, disabled states) for immutable fields

**Rationale:** Users must understand that audit events are immutable after scheduling. Warnings prevent accidental misconfiguration.

### 6.4 Calm, Compliance-Grade Tone

**Rule:** The surface must use a **calm, compliance-grade tone**, not a casual or rushed tone.

**Implementation:**
- Professional language: "Schedule Audit" not "Create Audit"
- Clear, formal labels: "Target Organization" not "Org"
- No urgency language: "Schedule" not "Quick Schedule"
- Compliance-focused messaging: "Audit events require..." not "You need to..."

**Rationale:** Audit scheduling is a compliance activity. The tone must reflect the seriousness and precision required.

### 6.5 No "Advanced" Toggles

**Rule:** The surface must **not** include "advanced" toggles or hidden options.

**Implementation:**
- All required fields are visible by default
- No collapsible "Advanced" sections
- No hidden configuration options
- All options are explained inline

**Rationale:** Audit scheduling requires explicit configuration. Hidden options increase risk of misconfiguration and reduce compliance.

---

## 7. Explicit Exclusions (with Rationale)

### 7.1 No Audit Execution

**Excluded:** Audit execution, check-in/check-out, form response submission, geo tracking execution, time tracking, and execution state management.

**Rationale:** Execution belongs to Work interfaces. Audit Scheduling creates the event instance; execution happens separately in EventExecution components and Audit Work interfaces.

**Location:** Audit execution belongs in EventExecution components, Audit App execution interfaces, and Work components.

### 7.2 No Responses or Approvals

**Excluded:** Form response submission, audit approval/rejection workflows, corrective action workflows, and audit lifecycle state transitions.

**Rationale:** Responses and approvals are execution concerns, not scheduling concerns. Audit Scheduling creates the event; responses and approvals happen during execution.

**Location:** Audit responses and approvals belong in Audit App execution interfaces and Work components.

### 7.3 No Check-In / Check-Out

**Excluded:** Check-in/check-out functionality, geo tracking execution, and execution state management.

**Rationale:** Check-in/check-out are execution actions, not scheduling actions. Audit Scheduling creates the event; check-in/check-out happen during execution.

**Location:** Check-in/check-out belong in EventExecution components and Work interfaces.

### 7.4 No Calendar View

**Excluded:** Calendar views, calendar navigation, calendar filtering, and calendar display of audit events.

**Rationale:** Calendars are Surfaces for viewing scheduled events, not creation interfaces. Audit events appear in calendars after scheduling, but scheduling itself does not happen in calendar views.

**Location:** Calendar views belong in Calendar components and Calendar doctrine.

### 7.5 No Bulk Scheduling

**Excluded:** Bulk creation of audit events, template-based scheduling, and automated audit scheduling.

**Rationale:** Each audit event requires individual configuration (roles, forms, organizations). Bulk scheduling would bypass required validation and role assignment, violating audit workflow integrity.

**Location:** Bulk operations belong in dedicated bulk operation interfaces (if implemented) with equivalent validation.

### 7.6 No Editing Live Events

**Excluded:** Editing scheduled audit events, modifying audit events after creation, and changing immutable fields.

**Rationale:** Audit events are immutable after scheduling to ensure audit trail integrity. Once created, audit events can only be cancelled or executed, not edited.

**Location:** Event editing (for non-audit events) belongs in Event Surfaces and Work interfaces.

---

## 8. Relationship to Other Surfaces

### 8.1 Event Execution

**Relationship:** Audit Scheduling creates audit event instances that are executed in Event Execution interfaces.

**Flow:**
1. Audit Scheduling creates audit event with `auditState: 'Ready to start'`
2. Event appears in Auditor's Inbox or Event Execution interface
3. Auditor checks in, completes form, checks out
4. Event transitions through audit workflow states

**Boundary:** Audit Scheduling creates; Event Execution executes.

### 8.2 Inbox

**Relationship:** Scheduled audit events appear in Inbox for assigned users (Auditor, Reviewer, Corrective Owner).

**Flow:**
1. Audit Scheduling creates audit event with role assignments
2. Event appears in Inbox for assigned users based on `auditState` and role
3. Users click Inbox item → navigate to Event Execution or Audit Detail
4. Users complete their role responsibilities

**Boundary:** Audit Scheduling creates; Inbox aggregates attention-worthy work.

### 8.3 Audit App Dashboards

**Relationship:** Scheduled audit events appear in Audit App dashboards and lists.

**Flow:**
1. Audit Scheduling creates audit event
2. Event appears in Audit App dashboard (`/audit/dashboard`)
3. Event appears in Audit list (`/audit/audits`)
4. Users can view audit details, execution status, and workflow state

**Boundary:** Audit Scheduling creates; Dashboards display and aggregate.

### 8.4 Event Settings

**Relationship:** Event Settings configure the structure and constraints that Audit Scheduling enforces.

**Flow:**
1. Event Settings configure role requirements per audit type
2. Event Settings configure geo rules (always required for audit events)
3. Event Settings configure form linking rules
4. Audit Scheduling enforces these constraints during creation

**Boundary:** Event Settings configure structure; Audit Scheduling instantiates with that structure.

### 8.5 Generic Event Creation

**Relationship:** Generic Event Creation is **explicitly excluded** from creating audit events.

**Flow:**
1. Generic Event Creation (`/events/create`, `GenericEventCreateSurface`) filters out audit event types
2. Users attempting to create audit events via generic creation are redirected to Audit Scheduling
3. Command Palette `/create event` routes to GenericEventCreateSurface (non-audit only)
4. Command Palette `/schedule audit` routes to Audit Scheduling

**Boundary:** Generic Event Creation creates non-audit events only; Audit Scheduling creates audit events only.

---

## 9. Lock Statement

### 9.1 Exclusive Creation Path

Audit events **must NEVER** be created outside the Audit Scheduling Surface. This is a **hard architectural constraint**, not a recommendation.

**Prohibited Creation Paths:**
- Generic Event Creation (`/events/create`, `GenericEventCreateSurface`, `EventFormModal`, `CreateRecordDrawer`)
- Calendar "Create Event" actions
- Quick Create flows for events
- Command Palette `/create event` (routes to non-audit creation)
- Direct API calls bypassing validation (backend enforces this)

**Enforcement:**
- Backend API rejects audit event creation unless `req.appKey === 'AUDIT'`
- Frontend filters audit event types from generic creation interfaces
- Command Palette routes audit intent to Audit Scheduling Surface

### 9.2 New Entry Point Requirements

Any proposal to add a new entry point to Audit Scheduling must:

1. **Reference this document** in the proposal
2. **Justify the entry point** with clear use case
3. **Ensure routing to unified surface** (not duplicate surface)
4. **Update this document** if the entry point is approved
5. **Update command registry** if command palette entry point

### 9.3 Violation Process

Any violation of this lock (creating audit events outside Audit Scheduling Surface) must:

1. **Be rejected in code review** (PR rejection)
2. **Require architecture review** before reconsideration
3. **Update this document** if exception is approved
4. **Update backend guardrails** if exception is approved

### 9.4 Change Process

Any proposal to modify Audit Scheduling Surface scope must:

1. **Justify the change** with clear architectural reasoning
2. **Propose alternative** that maintains the exclusive creation path
3. **Update this document** if the change is approved
4. **Update related documents** (`event-settings.md`, command registry) if needed
5. **Update backend guardrails** if needed

### 9.5 Enforcement Mechanisms

**Code-Level Enforcement:**
- Backend API validates `req.appKey === 'AUDIT'` for audit event creation
- Frontend filters audit event types from generic creation interfaces
- Command Palette routes audit intent to Audit Scheduling Surface

**Documentation Enforcement:**
- This document serves as the architectural guardrail
- Code comments reference this document
- Architecture reviews check compliance with this document

**Process Enforcement:**
- Code reviews reject violations
- Architecture reviews required for exceptions
- Documentation updates required for approved changes

---

## Appendix: Related Documents

- **Event Settings:** `docs/architecture/event-settings.md` — Configures audit event structure and constraints
- **Module Settings Doctrine:** `docs/architecture/module-settings-doctrine.md` — Settings/Surfaces/Work separation
- **Inbox Surface Invariants:** `docs/architecture/inbox-surface-invariants.md` — How audit events appear in Inbox
- **Organization Surface Invariants:** `docs/architecture/organization-surface-invariants.md` — Organization context for audit scheduling

---

**Document Status:** Locked  
**Last Updated:** January 2026  
**Next Review:** When audit scheduling requirements change
