# InboxSurface Invariants

## Purpose

Define Inbox as a calm, global surface for attention-worthy work across the platform.

## 1. Core Definition

Inbox is a cross-app surface that aggregates work requiring user attention.
It answers: "What do I need to act on now?"

## 2. What Belongs in Inbox

- Tasks assigned to the user
- Events that require preparation, response, or follow-up
- Approvals or submissions awaiting action
- Overdue or time-bound responsibilities

## 3. What Does NOT Belong in Inbox

- Historical activity logs
- Passive events with no required action
- Raw entities (People, Organizations, Deals)
- Configuration or admin items

## 4. UX Principles

- Inbox must feel calm, not busy
- Items must be scannable in under 3 seconds
- Each item must clearly answer:
  - Why am I seeing this?
  - What happens if I click it?

## 5. Interaction Rules

- Inbox items link to their owning surface (Sales, Helpdesk, Audit, etc.)
- Inbox does not allow full editing
- Completion or dismissal routes back to context

## 6. Visual Hierarchy (Important)

- Time & urgency first
- Source/app second
- Metadata last
- No dense tables

## 7. Tasks vs Events (Conceptual Distinction)

- **Tasks** = explicit responsibility assigned to a user
- **Events** = time-bound or system-triggered moments that may require attention
- Events appear only if they require user action

## 8. Navigation Rules

- Inbox is a Shell surface
- Always global
- Never app-scoped
- Never filtered by app by default

## Lock Statement

Inbox must remain an attention surface, not a task manager or activity feed.
Any change requires updating this document first.
