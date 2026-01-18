# Notifications — UX & Architecture Hardening Contract

## 1. Purpose

Notifications are **signals**, not workflows.
They surface awareness, not authority.

## 2. What Notifications DO

- Surface system- and user-triggered events
- Provide contextual, assistive actions
- Support grouping, snooze, and acknowledgement
- Respect user preferences and app isolation

## 3. What Notifications DO NOT DO (Very Important)

- Do NOT mutate domain state
- Do NOT auto-resolve records
- Do NOT replace task or workflow systems
- Do NOT perform destructive actions
- Do NOT enforce business logic
- Do NOT persist UI-only actions (snooze, grouping)

## 4. Action Semantics

- **Open** → Navigate to the source record/context
- **Mark as read** → Read-state only
- **Acknowledge (Resolve)** → User has seen/handled the signal (no domain impact)
- **Snooze** → Temporary UI suppression only

## 5. Grouping Contract

- Grouping is visual-only
- Grouping never hides data permanently
- Entity-first, time-second
- No persistence of expanded/collapsed state

## 6. Snooze Contract

- Time-based, temporary
- No backend persistence
- No cross-device guarantees
- Never mutates notification state

## 7. Extension Rules (Future Contributors)

- New actions that change domain state require domain APIs
- Domain mutations require explicit design review
- Filters, dismissals, and resolve APIs are Phase 2+
- Violations of this contract are architectural regressions
