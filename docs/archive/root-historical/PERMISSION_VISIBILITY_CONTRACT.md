# Permission → UI Visibility Contract

**Status:** ✅ Complete  
**Date:** January 2025

---

## 🎯 Objective

Define a single, explicit contract for how permissions influence:
- Sidebar visibility
- Dashboard sections (KPIs, actions, modules, widgets)
- Empty states
- Disabled vs hidden UI

Visibility and access are different — and must be intentionally designed.

---

## 📌 Permission Outcomes

`PermissionOutcome`:
- `HIDDEN`  — Not visible at all
- `VISIBLE` — Visible but disabled (used only when explicitly desired, e.g., upsell/admin hint)
- `ENABLED` — Visible and usable

---

## 🌐 Global Visibility Rules

### Domains (Apps)
- User has **any permission in app** → domain `VISIBLE/ENABLED`
- User has **no permission** → domain `HIDDEN`
- Dashboard still renders even if no modules are enabled

### Modules (Sidebar & Dashboard)
- No permission → `HIDDEN`
- Read-only permission → `ENABLED` (view-only)
- Write permission → `ENABLED`

### Dashboard Actions
- Missing permission → `HIDDEN`
- Optional: could be `VISIBLE` (disabled) only for explicit upsell/admin hint

### KPIs / Widgets
- Missing permission → `HIDDEN`
- With permission → `ENABLED`

---

## 🧭 Empty State Contract

| Scenario | Expected UI |
| --- | --- |
| App visible, no modules enabled | Dashboard shows onboarding/activation (no silent blanks) |
| Module visible, no data | Contextual empty state |
| Permission removed | Graceful fallback (no crashes) |

No silent blanks. Ever.

---

## 🛠️ Builder-Level Enforcement

### Sidebar
- `buildSidebarFromRegistry` returns `visibility` per domain/module/core/platform item.
- Hidden items are filtered out; UI does not guess.

### Dashboard
- `buildDashboardFromRegistry` returns `visibility` per action/KPI/module/widget.
- Hidden items are filtered out; UI does not guess.

UI must not infer permissions. It only renders what builders return.

---

## 🚫 Explicitly Excluded
- Ad-hoc permission checks in components
- “Hide sometimes, disable sometimes” logic
- Per-app permission semantics
- UI-driven permission interpretation

---

## 🧪 Examples

### Sales User (standard access)
- Sidebar: Sales domain `ENABLED`; modules with view perms `ENABLED`.
- Dashboard: Sales actions/KPIs/modules `ENABLED`.

### Read-only User
- Sidebar: Domains with read perms `ENABLED`; write-only modules are `HIDDEN`.
- Dashboard: Actions requiring write are `HIDDEN`; KPIs/modules with view perms `ENABLED`.

### Admin User
- Sidebar: All domains/modules `ENABLED`.
- Dashboard: All actions/KPIs/modules/widgets `ENABLED`.

---

## 🔄 Routing & Alignment

- Sidebar modules and dashboard module links use the same `moduleKey` and `route`.
- Deep links auto-align; removing permissions never breaks navigation.

---

## ✅ Acceptance

- Permissions affect UI predictably.
- Same permission behaves the same everywhere.
- No component checks permissions directly.
- Removing permissions never breaks navigation.
- UX remains explainable to users & admins.

---

**Last Updated:** January 2025  
**Status:** ✅ Contract Implemented

