# Arivu Design Laws (v1.0)

> **Clarity at Scale. Intelligence Without Noise.**

Arivu is intelligence software.  
Its interface must feel inevitable, calm, and structurally correct at scale.

This document is the design constitution of Arivu.  
**Violations are bugs, not opinions.**

---

## 1. Intelligence Over Ornament (Foundational)

Arivu does not look "pretty first."  
It looks inevitable.

**Laws:**

- No visual element without semantic meaning
- No decorative UI
- Every color, spacing, and interaction communicates intent
- If a design cannot explain itself in one sentence, it does not belong

Visual novelty without meaning is noise.

---

## 2. Clarity Is Law

Every interface element must answer, without ambiguity:

- What is this?
- Who owns it?
- What can I do next?

If any answer is unclear, the UI is incorrect.

- No hidden functionality
- No implied behavior
- No surprise actions

Clarity always beats cleverness.

---

## 3. Identity-First Mental Model

Arivu is identity-first by design.

UI must never blur identity boundaries.

Every surface, component, and action must clearly express:

- Identity
- Ownership
- Intent

If identity is unclear, trust is lost.

---

## 4. Identity & Ownership Law (Platform Physics)

Arivu recognizes four distinct layers:

| Layer | Meaning | Visual Tone |
|-------|---------|-------------|
| Platform | Governance, navigation | Quiet, stable |
| App | Workflow, productivity | Focused, confident |
| Entity | Data & identity | Dense, precise |
| Person | Independent identity | Neutral, portable |

**Laws:**

- Platform ≠ App ≠ Entity ≠ Person
- Ownership must be visually encoded
- No surface may mix ownership boundaries

Violations are UX bugs.

---

## 5. Participation Is Not Duplication

A person:

- Exists independently of apps
- Can participate in multiple apps without duplication

**Laws:**

- Participation ≠ ownership
- Participation must never feel like creation
- A person is never "created" by an app

This mental model must be felt before it is understood.

---

## 6. Attach vs Convert Law (Sacred Contract)

This distinction is non-negotiable.

### Attach

- Non-destructive
- Reversible
- Quiet visual treatment
- Minimal confirmation friction

### Convert

- State-changing
- Irreversible or semantically heavy
- Requires confirmation
- Visually weighty and explicit

Users must feel the difference before reading text.

---

## 7. Intent-Based Token Law

Arivu uses intent, never appearance.

**Valid color intents:**

- **Primary** — intelligence, trust
- **Secondary** — growth, motion
- **Neutral** — structure, calm
- **Success** — completion
- **Warning** — risk, attention
- **Danger** — irreversible change

**Laws:**

- No hex colors in components
- No direct color names (green, blue, red)
- Components reference tokens by intent only
- Light/Dark preserve intent, not brightness

If a new color intent is introduced, it is rejected.

---

## 8. Light & Dark Mode Law

We do not invert colors.

- Light mode = clarity
- Dark mode = focus

Each token has paired intent, not mirrored brightness.

**Example:**

- Neutral (Light) ≠ Neutral (Dark)
- Both mean "background calm"

---

## 9. Spacing Is a Cognitive Rhythm

Arivu uses a strict 8-based spacing system:

**8, 16, 24, 32, 48, 64**

**Usage rules:**

- 8–16 → within components
- 24–32 → between components
- 48–64 → between sections

No arbitrary margins. Ever.

---

## 10. Density Is a Mode (Not Chaos)

Every screen declares a density mode:

| Density | Use Case |
|---------|----------|
| Comfortable | Dashboards, overview |
| Balanced | Forms, entity detail |
| Dense | Tables, CRM views |

**Laws:**

- Density is a screen-level decision
- Components never self-adjust density
- Mixed densities on one surface are forbidden

---

## 11. Typography Expresses Certainty

Typography defines information hierarchy, not decoration.

**Text roles:**

| Role | Meaning |
|------|---------|
| Page Title | Where am I |
| Section Title | What am I doing |
| Label | What is this |
| Value | The truth |
| Helper | Guidance |
| Meta | Secondary truth |

**Laws:**

- No visual hierarchy without semantic hierarchy
- Labels are never bold
- Values are never ambiguous

---

## 12. Surface Model Law

Every element lives on a surface with meaning.

| Surface | Purpose |
|---------|---------|
| App Background | Context holder |
| Primary Surface | Main work area |
| Secondary Surface | Supporting information |
| Interactive Surface | Clickable elements |
| Elevated Surface | Temporary focus |

**Laws:**

- If it looks clickable, it must be clickable
- Elevated surfaces are temporary and focused
- Backgrounds never carry actions

---

## 13. Cards Are Responsibility Boundaries

A card answers one question:

**Who owns this information?**

**Laws:**

- One card = one owner
- App, Entity, and Platform data must never mix
- Cards define responsibility, not decoration

---

## 14. Buttons Are Intent, Not Style

Buttons are defined by what they do.

| Intent | Meaning |
|--------|---------|
| Primary | Advance state |
| Secondary | Assist |
| Tertiary | Optional |
| Destructive | Irreversible |

**Laws:**

- Color follows intent
- Destructive actions are never subtle
- No custom button variants outside the system

---

## 15. Forms Are Contracts

A form is a promise between system and user.

**Laws:**

- Required fields are obvious
- Disabled fields explain why
- Permission-locked fields show authority context
- No silent failures

---

## 16. State Transparency Law

Every component must handle:

- **Default**
- **Hover / Focus**
- **Loading** (structure, not spinners)
- **Empty** (why + next step)
- **Error** (human explanation + recovery)

Dead ends are forbidden.

---

## 17. Navigation Is Calm and Predictable

Navigation exists to answer:

**Where can I go?**

**Laws:**

- No unexpected movement
- No duplicated destinations
- Sidebar reflects ownership hierarchy
- Navigation never steals focus from work

---

## 18. Accessibility Is Structural

Accessibility is not a feature.

**Laws:**

- Keyboard navigation is first-class
- Contrast is non-negotiable
- Focus is always visible
- Color is never the sole carrier of meaning
- Click targets ≥ 40px

If it's inaccessible, it's unfinished.

---

## 19. Performance Is Trust

Speed communicates competence.

**Laws:**

- Immediate feedback for every action
- Optimistic updates where safe
- Skeletons over spinners
- No blocking UI without explanation

---

## 20. Design Debt = Product Debt

Any violation of these laws:

- Is a bug
- Must be refactored
- Cannot be justified by speed or deadlines

There are no temporary violations.

---

## 21. Single Source of Truth

**Laws:**

- Tokens live in one place
- Components consume tokens
- Pages consume components
- No overrides, no shortcuts

---

## 22. Enforcement Rule (Final)

Before any UI change, answer:

- Which surface is this?
- Who owns it?
- What intent does it express?
- Which law permits it?

If the answer is unclear, the change is rejected.

---

**Version:** 1.0  
**Status:** Canonical  
**Overrides all previous design documentation**
