# Field Ownership, Intent & Editing Model

This document is written to be:
- Clear to future engineers
- Defensible in design reviews
- Stable for years
- Aligned with everything you've already built

**No fluff. No UI mechanics. No ambiguity.**

## Purpose

This document defines the **canonical model** for how fields are classified, owned, edited, and permissioned across the platform.

The goal is to:
- Prevent UX drift
- Enforce clear ownership boundaries
- Enable multi-app scalability
- Simplify RBAC and permissions
- Avoid future "Details page" rewrites

This model is **authoritative**.  
All UI, APIs, and future schema changes must conform to it.

---

## Core Principle

> **Schemas store data.  
> Metadata defines meaning.  
> UI derives behavior.**

We do **not** encode UI mechanics (inline, drawer, modal) into schemas or field definitions.

---

## The Three Axes (Final & Locked)

Every field in the system is defined using **exactly three axes**:

```typescript
{
  owner: 'core' | 'participation' | 'system',
  intent: 'identity' | 'state' | 'detail',
  fieldScope?: '<APP_KEY>'
}
```

**No other field-level UX metadata is allowed.**

---

## Axis 1 — owner

### Definition

`owner` defines who owns the field logically, not where it is stored.

### Allowed Values

| owner | Meaning |
|-------|---------|
| `core` | Platform identity (exists without any app) |
| `participation` | Exists only because of app participation |
| `system` | Platform-managed, never user-edited |

### owner: core

**Definition:** Fields that exist even if no apps are attached. Describe who the entity is.

**Examples:**
- `first_name`
- `last_name`
- `email`
- `phone`
- `tags`
- `do_not_contact`
- `primary organization`

**Rules:**
- Editable only via Edit Profile
- App-agnostic
- Global permissions apply

### owner: participation

**Definition:** Fields that exist only because the entity participates in an app. App-scoped by definition.

**Examples:**
- `lead_status` (Sales)
- `contact_status` (Sales)
- `lead_score` (Sales)
- `requester_priority` (Helpdesk)

**Rules:**
- Must declare `fieldScope`
- Edited only within participation context
- Never shown in Edit Profile

### owner: system

**Definition:** Infrastructure, audit, or system-managed fields.

**Examples:**
- `createdBy`
- `timestamps`
- `activityLogs`
- `legacy IDs`

**Rules:**
- Never editable
- Rendered read-only if at all
- No UI affordances

---

## Axis 2 — intent

### Definition

`intent` defines what kind of field this is, not how it is edited. It answers: **"What does changing this field mean?"**

### Allowed Values

| intent | Meaning |
|--------|---------|
| `identity` | Describes who this entity is |
| `state` | Lifecycle / workflow state |
| `detail` | Supporting contextual information |

### intent: identity

**Definition:** Stable attributes with global meaning. Low-frequency edits.

**Rules:**
- Editable via Edit Profile
- Never app-scoped
- Never inline by default

### intent: state

**Definition:** Workflow or lifecycle state. High-frequency. Drives prioritization and Momentum.

**Examples:**
- `lead_status`
- `contact_status`
- `lifecycle_stage`

**Rules:**
- Editable quickly (fast-path UX derived by UI)
- Scoped to participation
- Primary input to Momentum

### intent: detail

**Definition:** Contextual, supporting information. Not lifecycle-defining.

**Examples:**
- `lead_score`
- `qualification_date`
- `role`
- `preferences`

**Rules:**
- Edited contextually within participation
- Never inline by default
- Never shown in Edit Profile

---

## Axis 3 — fieldScope

### Definition

`fieldScope` defines which app owns the field.

### Rules (Strict)

- `fieldScope` is **required** if `owner === 'participation'`
- `fieldScope` is **forbidden** for:
  - `owner: core`
  - `owner: system`

### Examples

```typescript
// Participation field
lead_status: {
  owner: 'participation',
  fieldScope: 'SALES',
  intent: 'state'
}

// Core field
email: {
  owner: 'core',
  intent: 'identity'
  // No fieldScope (forbidden for core)
}
```

---

## Derived UX Rules (Do NOT encode in schema)

UI behavior is **derived**, not declared.

| owner | intent | Derived UX |
|-------|--------|------------|
| `core` | `identity` | Edit Profile |
| `participation` | `state` | Fast update (e.g. inline / quick control) |
| `participation` | `detail` | Contextual editor (drawer/modal) |
| `system` | `any` | Read-only |

**These rules may evolve without schema changes.**

---

## Creation-Time Field Visibility (`allowOnCreate`)

### Problem This Solves

In a multi-app platform, **editability is not the same as creation intent**.

A field may be:
- editable later
- but inappropriate to ask at record creation time

Inferring creation behavior from `editable` leads to:
- cluttered Quick Create flows
- accidental leakage of system fields
- hardcoded UI exceptions
- long-term UX debt

### Design Principle

> **Creation is a distinct moment in time and must have an explicit contract.**

Therefore, creation-time visibility must be declared,
not inferred.

---

### `allowOnCreate` (Declarative Signal)

`allowOnCreate` explicitly declares whether a field
should be shown and editable **at record creation time**.

```ts
allowOnCreate?: boolean;
```

#### Key Characteristics

- Declarative only
- Platform-owned (not configurable by admins)
- Does NOT imply:
  - required
  - validation
  - enforcement
- Applies ONLY to creation flows

#### Ownership Rules

| Field Owner | `allowOnCreate` Usage |
|-------------|----------------------|
| core | Implicit (identity fields are always creation-relevant) |
| system | Explicit opt-in required |
| participation | Never allowed |

#### Example — Correct Usage

```ts
assignedTo: {
  owner: 'system',
  intent: 'system',
  fieldScope: 'CORE',
  editable: true,
  allowOnCreate: true
}
```

**Reason:**
- Assignment is a legitimate creation-time decision
- System still owns the field
- Creation intent is explicit

#### What `allowOnCreate` Is NOT

❌ Not a replacement for `editable`  
❌ Not a validation rule  
❌ Not a requirement flag  
❌ Not a UI configuration option  
❌ Not admin-editable

#### Quick Create Consumption Rule (Canonical)

```ts
includeField =
  (
    owner === 'core' &&
    intent === 'identity' &&
    editable === true
  )
  ||
  (
    owner === 'system' &&
    editable === true &&
    allowOnCreate === true
  )
```

This rule is final and must not be bypassed.

#### Architectural Guarantee

By introducing `allowOnCreate`:

- Creation flows remain minimal and predictable
- System fields never leak accidentally
- New fields can be added safely without UI regressions
- Identity and intent remain cleanly separated

This decision is mandatory for a scalable, multi-app platform.

---

## Permissions & RBAC Alignment

This model aligns cleanly with RBAC.

### Permission Mapping

| Field type | Permission scope |
|------------|------------------|
| `core` + `identity` | `people.edit` |
| `participation` + `state` | `<app>.edit` or `<app>.state.update` |
| `participation` + `detail` | `<app>.edit` |
| `system` | none (always read-only) |

### Key Rule

- **Permissions** answer "who can do what"
- **Ownership + intent** answer "what kind of change this is"

They are **orthogonal and complementary**.

---

## What This Model Explicitly Prevents

❌ Giant "Details" forms  
❌ Mixed core + app editing  
❌ Inline edits for the wrong fields  
❌ App fields leaking into identity  
❌ Permission confusion  
❌ UX drift over time

---

## Storage vs Ownership (Important)

**Physical storage** (e.g., fields living in People schema) does **NOT** define ownership.

**Ownership is defined only by metadata.**

### Storage shape ≠ semantic ownership

This allows:
- Future schema splits
- API evolution
- Zero UX rewrites

---

## Non-Negotiable Rules

1. Every field **must** declare `owner`
2. Every non-system field **must** declare `intent`
3. Every participation field **must** declare `fieldScope`
4. **No UI mechanics** in field metadata
5. **UI derives behavior**, never the schema

---

## Final Statement

This model is:
- **Minimal**
- **Defensible**
- **Scalable**
- **RBAC-safe**
- **Platform-grade**

It is intentionally boring — **because boring systems last**.

**Any deviation must be treated as an architectural change and reviewed explicitly.**
