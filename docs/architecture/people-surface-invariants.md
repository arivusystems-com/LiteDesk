# People Surface — Architectural Invariants

**This document defines NON-NEGOTIABLE invariants for the People domain.**  
**These rules must never be violated, regardless of feature requests or UI preferences.**

## 1. Core Definition

### What a Person Is

A **Person** is an app-agnostic identity entity that exists independently of any application participation.

- A Person is **NOT** a Lead, Contact, Requester, or any app-specific role.
- A Person **is** a core identity record: name, email, phone, organization affiliation, source attribution.
- A Person exists even with zero app participations.
- A Person may participate in multiple apps simultaneously, each with its own lifecycle state.

**Why:** This separation ensures that identity data is never corrupted by app-specific lifecycle changes. A Lead converting to a Contact does not change the underlying person's identity. Identity is permanent; participation is ephemeral.

---

## 2. Identity vs Participation (Hard Boundary)

### Field Ownership Classification

Fields are classified by ownership, intent, and scope via `peopleFieldModel.ts`:

- **Identity Fields** (`owner: 'core'`, `fieldScope: 'CORE'`)
  - Examples: `first_name`, `last_name`, `email`, `phone`, `organization`, `source`, `tags`
  - Exist independently of any app participation
  - Always editable (subject to permissions)

- **System Fields** (`owner: 'system'`, `fieldScope: 'CORE'`)
  - Examples: `createdBy`, `assignedTo`, `createdAt`, `updatedAt`, `organizationId`
  - Managed by the platform
  - Never user-editable (except `assignedTo` which may be editable via permissions)

- **Participation Fields** (`owner: 'participation'`, `fieldScope: 'SALES' | 'HELPDESK' | ...`)
  - State fields (`intent: 'state'`): `type`, `lead_status`, `contact_status`
  - Detail fields (`intent: 'detail'`): `lead_score`, `qualification_date`, `role`, `birthday`
  - Exist only when the person participates in the owning app
  - Must never be set during identity creation

### What Is Forbidden

1. **Identity fields must never depend on app state.**
   - Reason: Identity must remain stable across lifecycle changes. Changing a Lead to Contact cannot affect `first_name` or `email`.

2. **Participation fields must never appear in Quick Create.**
   - Reason: Quick Create is for identity-only creation. Participation must be added via explicit Attach-to-App flow.

3. **Lists must never mutate participation.**
   - Reason: List views are read-only with respect to lifecycle. Lifecycle changes are explicit, modal-based actions.

4. **No field may have ambiguous ownership.**
   - Reason: `peopleFieldModel.ts` is the single source of truth. Ownership, intent, and scope are FINALIZED and never editable.

**Why:** This hard boundary prevents cross-contamination between identity and participation data. It ensures that app-specific lifecycle changes never corrupt identity data, and that identity creation remains simple and app-agnostic.

---

## 3. Lifecycle Rules

### Attach-to-App

Attach-to-App is the **only** way to create app participation for a Person.

- Must be an explicit, modal-based action.
- Requires selection of participation type (e.g., Lead vs Contact for Sales).
- May include initial participation fields (e.g., `lead_status`).
- Must never be implicit or automatic.

**Why:** Explicit attachment ensures users understand they are adding app-specific context, not changing identity. It prevents accidental participation creation and makes the data model clear.

### Convert (e.g., Lead → Contact)

Convert is an explicit lifecycle transition within an app.

- Must be a modal-based action with clear confirmation.
- Changes app-specific state (e.g., Sales `type` field: `'Lead'` → `'Contact'`).
- May clear app-specific fields that are incompatible with the new type.
- Must never change identity fields.

**Why:** Conversion is a business decision that affects app workflow. It must be deliberate and documented (activity log). Modal-based UI prevents accidental conversions and provides context.

### Detach

Detach removes app participation, but only if policy allows.

- Policy is explicit per app via `detachPolicy.js`.
- Default is **disallowed** (conservative).
- Must check for active child records (e.g., open Deals, active Tickets).
- Must preserve activity logs and audit history.
- Soft detach: clears participation fields, preserves identity and history.

**Why:** Detachment is a lifecycle change that can affect data integrity (child records). Per-app policy prevents unsafe detachment while preserving flexibility where safe.

### Lifecycle Transitions Are Explicit and Modal-Based

All lifecycle actions (Attach, Convert, Detach) must:

1. Be triggered from dedicated UI elements (buttons, menu actions).
2. Open a modal dialog with clear explanation of consequences.
3. Require explicit confirmation.
4. Be logged in the activity timeline.
5. **Never** be inline or implicit.

**Why:** Lifecycle changes are business decisions with consequences. Explicit, modal-based UI ensures users understand what is happening and provides an audit trail.

### Inline Lifecycle Edits Are Forbidden

State fields (`type`, `lead_status`, `contact_status`) must never be editable via inline forms or dropdowns in list views.

- State fields may be editable in detail views only if explicitly allowed.
- Even then, state transitions (e.g., Lead → Contact) must use Convert action, not direct field edit.

**Why:** State fields represent workflow state, not arbitrary data. Direct editing bypasses business rules and audit trails. Convert action ensures state transitions follow app-specific rules.

---

## 4. Editing Rules

### Identity Editing

Identity fields (`owner: 'core'`) may be edited:

- In identity sections of detail views.
- In Quick Edit forms (identity-only).
- Subject to view/edit permissions.

**Why:** Identity fields are user-managed data. They must be editable where appropriate, subject to permissions.

### Participation Detail Editing

Participation detail fields (`owner: 'participation'`, `intent: 'detail'`) may be edited:

- In app-specific sections of detail views.
- Subject to app-specific edit permissions.
- Only if the person participates in the owning app.

**Why:** Detail fields provide context for app participation. They are editable data that enriches participation records.

### Participation State Editing

Participation state fields (`owner: 'participation'`, `intent: 'state'`) are **restricted**.

- State fields may be displayed but must not be directly editable via inline forms.
- State transitions must use lifecycle actions (Convert, Attach) when applicable.
- Status dropdowns (e.g., `lead_status`) may be allowed if they do not change participation type.

**Why:** State fields represent workflow state. Direct editing bypasses business logic and audit trails. Lifecycle actions ensure state changes follow app-specific rules.

### What Is Forbidden

1. **Inline lifecycle changes** (e.g., changing `type` from `'Lead'` to `'Contact'` via dropdown in a list).
2. **Bulk lifecycle changes** (e.g., bulk converting Leads to Contacts from a list).
3. **Editing state fields outside lifecycle flows** (e.g., directly editing `type` in a form instead of using Convert).

**Why:** Lifecycle changes are business decisions that require explicit confirmation and audit trails. Bulk or inline changes bypass these safeguards.

---

## 5. List View Rules

### List View Is Read-Only with Respect to Lifecycle

List views (e.g., People list) must never contain:

- Attach actions (row-level or bulk).
- Convert actions (row-level or bulk).
- Detach actions (row-level or bulk).
- Inline state field editing.

**Why:** Lists are for scanning and navigation. Lifecycle actions are explicit, modal-based decisions that belong in detail views. Preventing lifecycle actions in lists reduces cognitive load and prevents accidental changes.

### Default Columns Are Canonical and Consistent

Default visible columns for People list must be:

- `name` (locked, always visible, first position).
- `organization`.
- `type` (participation summary).
- `email`.
- `phone`.
- `assignedTo`.

These defaults apply to:
- First-time loads (no saved preferences).
- Reset-to-default actions.

**Why:** Consistent defaults ensure predictable UX across instances. Locked `name` column ensures identity is always visible.

### Participation Fields Are Opt-In and Contextual

Participation fields (`owner: 'participation'`) must:

- Be hidden by default in list views.
- Appear only if explicitly enabled via Customize View.
- Show values only if the person participates in the owning app.
- Render as `'-'` if the person does not participate.

**Why:** Participation fields are app-specific and context-dependent. Showing them by default clutters the list and implies participation that may not exist. Opt-in ensures lists remain scannable.

### Lists Never Contain Lifecycle Actions

List views must never expose:

- Row-level edit/delete/lifecycle buttons.
- Bulk lifecycle operations (Attach, Convert, Detach).
- Inline participation field editing.

Lists may contain:
- Bulk Delete (identity-level, explicit confirmation).
- Bulk Export (selected identity fields only).
- Row click navigation to detail view.

**Why:** Lists are for discovery and navigation. Lifecycle actions are explicit, context-rich decisions that require detail view context.

---

## 6. Momentum & Signals

### Signals Are Advisory, Not Blocking

Momentum signals (e.g., "Qualification overdue", "High-value lead") are:

- Informational indicators derived from participation data.
- Never block actions or edits.
- Never auto-trigger actions.

**Why:** Signals are guidance, not enforcement. Users must retain control over actions. Auto-triggering actions violates explicit confirmation requirements.

### Signals Never Mutate Data

Momentum signals must never:

- Auto-update fields.
- Auto-trigger lifecycle transitions.
- Auto-create records.

**Why:** Data mutation must be explicit and user-initiated. Signals provide guidance; they do not replace user decisions.

### Signals Exist to Guide, Not Enforce

Momentum signals are derived indicators that help users:

- Identify high-value records.
- Surface workflow bottlenecks.
- Highlight data quality issues.

They do not enforce rules or block actions.

**Why:** Signals are a visibility tool. Enforcement belongs in validation rules and business logic, not signals.

---

## 7. Settings & Field Model Authority

### `peopleFieldModel.ts` Is the Single Source of Truth

Field metadata (ownership, intent, scope) must be defined in `peopleFieldModel.ts` and nowhere else.

- Field ownership (`'core' | 'participation' | 'system'`) is FINALIZED.
- Field intent (`'identity' | 'state' | 'detail' | 'system'`) is FINALIZED.
- Field scope (`'CORE' | 'SALES' | ...`) is FINALIZED.
- These properties are never editable via Settings UI.

**Why:** Field metadata encodes data meaning, not UI preferences. Decentralized metadata leads to inconsistency and bugs. Single source of truth ensures all components interpret fields consistently.

### Settings Only Reflect Metadata

Settings UI (e.g., field visibility, column order) may:

- Show/hide fields based on metadata.
- Reorder columns for display.
- Configure field-level permissions.

Settings UI must never:

- Change field ownership.
- Change field intent.
- Change field scope.
- Reinterpret field meaning.

**Why:** Settings control UI behavior, not data meaning. Data meaning is encoded in metadata and must remain stable.

### Ownership, Intent, Scope Are Never Editable

These properties are architectural decisions, not user preferences:

- Ownership determines data lifecycle (identity vs participation vs system).
- Intent determines field purpose (identity vs state vs detail).
- Scope determines field applicability (CORE vs app-specific).

These must never be changed via UI or settings.

**Why:** These properties are foundational to data architecture. Changing them breaks invariants and corrupts data semantics.

### UI Must Never Reinterpret Field Meaning

UI components must never:

- Infer field ownership from field name.
- Infer field intent from field value.
- Infer field scope from field usage.

UI components must always:

- Use `getFieldMetadata(fieldKey)` from `peopleFieldModel.ts`.
- Respect ownership, intent, and scope as defined.
- Fail fast if field metadata is missing.

**Why:** Reinterpreting field meaning breaks invariants. Metadata is the source of truth; UI must consume it, not recreate it.

---

## 8. Explicit Non-Goals

This architecture intentionally does **NOT** support:

### Global "Person Type"

There is no global `type` field that applies across all apps.

- The Sales `type` field (`'Lead' | 'Contact'`) is Sales-participation-scoped.
- Other apps may define their own `type` fields independently.
- Shared labels do not imply shared semantics.

**Why:** Apps have independent lifecycles. A "Lead" in Sales is not the same as a "Lead" in Marketing. Global types would force artificial coupling.

### Cross-App Lifecycle Shortcuts

There are no shortcuts that combine lifecycle actions across apps (e.g., "Attach to Sales and Helpdesk in one action").

- Each app must be attached separately.
- Each lifecycle transition is app-specific.

**Why:** Lifecycle transitions are app-specific business decisions. Combining them obscures what is happening and complicates audit trails.

### Magic Conversions

There is no automatic conversion between app types (e.g., Sales Lead → Helpdesk Requester).

- Conversions are explicit, modal-based actions.
- Conversions are app-specific (e.g., Sales Lead → Sales Contact).
- Cross-app conversions do not exist.

**Why:** Conversions are business decisions with consequences. Automatic conversion obscures these decisions and can corrupt data.

### Implicit App Attachment

App participation is never created implicitly (e.g., by viewing a person in an app context or by creating a related record).

- App participation must be explicitly created via Attach-to-App.
- Viewing a person in an app context does not create participation.

**Why:** Participation is a business decision. Implicit creation obscures this decision and can create unwanted participations.

### AI-Driven Mutations

AI suggestions or automations must never:

- Auto-update identity or participation fields.
- Auto-trigger lifecycle transitions.
- Auto-create app participations.

AI may suggest actions, but actions must be user-initiated and explicitly confirmed.

**Why:** Data mutations are business decisions. AI suggestions are guidance, not enforcement. Users must retain control.

---

## Summary

These invariants ensure that:

1. **Identity remains stable** across lifecycle changes.
2. **Participation is explicit** and never accidental.
3. **Lifecycle changes are documented** and auditable.
4. **Field meaning is unambiguous** via single source of truth.
5. **Lists remain scannable** and mutation-safe.
6. **Signals guide, never enforce**.

**Violation of any invariant is a breaking change.**  
**These rules must be enforced at the code level, not merely documented.**
