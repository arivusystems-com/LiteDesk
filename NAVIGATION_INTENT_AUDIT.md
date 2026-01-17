# Navigation Intent Audit

**Date:** January 12, 2026  
**Status:** ✅ Complete - All modules have explicit navigation intent  
**Total Modules:** 11  
**Errors:** 0  
**Warnings:** 0

**Notes:**
- Fixed duplicate modules with `appKey: 'crm'` - removed 5 duplicates
- Removed duplicate projection modules (tasks, events, cases from audit, helpdesk, projects) - removed 7 duplicates
- All modules now correctly use `appKey: 'sales'`, `appKey: 'audit'`, `appKey: 'projects'`, or `appKey: 'platform'`

---

## Executive Summary

This audit provides a single source of truth for navigation intent across all modules and entities in the LiteDesk platform. Every module has been explicitly classified with navigation intent flags, ensuring clear placement in the four-section sidebar:

1. **Core** - Personal/attention layer (Home, Inbox, Reports)
2. **Entities** - Shared system primitives (People, Organizations, Tasks, Events, Forms, Items)
3. **Apps** - Domain-specific workflows (Sales, Audit, Projects, Helpdesk)
4. **Platform** - Governance items (Settings, Apps, Users)

**Key Finding:** All 11 modules have explicit navigation intent flags. No inference-based placement exists.

---

## Platform Apps

The LiteDesk platform currently has the following apps defined:

| App Key | App Name | Modules | Status |
|---------|----------|---------|--------|
| **sales** | Sales | 3 modules (deals, responses, imports) | ✅ Active |
| **audit** | Audit | 1 module (audits) | ✅ Active |
| **projects** | Projects | 1 module (projects) | ✅ Active |
| **helpdesk** | Helpdesk | 0 modules | ⚠️ No modules defined |
| **platform** | Platform | 6 entities (people, organizations, tasks, events, items, forms) | ✅ Active |

**Note:** The `platform` app key is used for shared system primitives (entities) that appear in the Entities section of the sidebar, not as a business app.

---

## Navigation Intent Rules

### Classification Categories

1. **CORE** (`navigationCore: true`)
   - Personal/attention layer items
   - Virtual items, not modules
   - Examples: Home, Inbox, Reports

2. **ENTITY** (`navigationEntity: true`)
   - Shared system primitives
   - Appears in Entities section
   - Must have `excludeFromApps: true`
   - Cannot have `appKey` (except 'platform')

3. **APP_OWNED** (has `appKey` and no navigation flags)
   - Domain-specific workflows
   - Appears in Apps section under its app
   - Cannot have `navigationEntity` or `navigationCore`

4. **SETTINGS_ONLY** (no navigation flags, no appKey)
   - Settings or internal use only
   - Not visible in navigation

### Validation Rules

✅ **Rule 1:** `navigationEntity: true` and `appKey` cannot both be set (except 'platform')  
✅ **Rule 2:** `navigationCore: true` and `appKey` cannot both be set (except 'platform')  
✅ **Rule 3:** `excludeFromApps: true` should be set with `navigationEntity: true` for core entities  
✅ **Rule 4:** Platform entities (`appKey: 'platform'`) should have explicit navigation intent  
✅ **Rule 5:** App-owned modules should not have `navigationEntity` or `navigationCore` flags

---

## Complete Module Classification

### Summary by Classification

| Classification | Count | Description |
|----------------|-------|-------------|
| **ENTITY** | 6 | Shared system primitives in Entities section |
| **APP_OWNED** | 5 | Domain-specific modules in Apps section |
| **CORE** | 0 | Personal/attention layer items (none currently) |
| **SETTINGS_ONLY** | 0 | Settings-only modules (none currently) |

---

## Entity Modules (Shared System Primitives)

These modules appear in the **Entities** section of the sidebar. They are shared across all apps and must not appear under any app.

| Module | App | Route | navigationEntity | excludeFromApps | Rationale |
|--------|-----|-------|------------------|-----------------|-----------|
| **people** | platform | `/people` | ✅ | ✅ | Core entity for managing leads and contacts. Shared across all apps (Sales, Helpdesk, Audit). |
| **organizations** | platform | `/organizations` | ✅ | ✅ | Core entity for managing companies and accounts. Shared across all apps. |
| **tasks** | platform | `/tasks` | ✅ | ✅ | Core activity entity for task management. Shared across all apps (Sales, Helpdesk, Audit, Projects). |
| **events** | platform | `/events` | ✅ | ✅ | Core activity entity for calendar/event management. Shared across all apps. |
| **items** | platform | `/items` | ✅ | ✅ | Core entity for product/item catalog. Shared across all apps. |
| **forms** | platform | `/forms` | ✅ | ✅ | Core entity for form builder and data collection. Shared across all apps. |

**Why these appear in navigation:**
- They are fundamental system primitives used by multiple apps
- They provide cross-app data consistency
- Users need direct access regardless of which app they're using
- They are explicitly marked with `navigationEntity: true` and `excludeFromApps: true`

---

## App-Owned Modules (Domain-Specific Workflows)

These modules appear in the **Apps** section under their respective apps. They are domain-specific and not shared across apps.

### Sales App (`appKey: 'sales'`)

| Module | Route | Rationale |
|--------|-------|-----------|
| **deals** | `/deals` | Sales-specific opportunity management. Appears under Sales app in sidebar. |
| **responses** | `/responses` | Sales-specific form response management. Execution domain module. |
| **imports** | `/imports` | Sales-specific data import functionality. Utility module for Sales workflows. |

**Why these appear in navigation:**
- They are Sales-specific workflows
- They belong to the Sales app domain
- They are explicitly owned by the Sales app (`appKey: 'sales'`)
- They do NOT have `navigationEntity` or `navigationCore` flags


### Audit App (`appKey: 'audit'`)

| Module | Route | Rationale |
|--------|-------|-----------|
| **audits** | `/audits` | Audit visit management. Core Audit app workflow. |

**Why this appears in navigation:**
- It is an Audit-specific workflow
- It belongs to the Audit app domain
- It is explicitly owned by the Audit app (`appKey: 'audit'`)
- Note: Tasks and events are accessed via the platform entities (shared system primitives)

### Helpdesk App (`appKey: 'helpdesk'`)

**No modules currently defined for Helpdesk app.**

**Note:** Helpdesk-specific workflows would appear here. Tasks and events are accessed via the platform entities (shared system primitives).

### Projects App (`appKey: 'projects'`)

| Module | Route | Rationale |
|--------|-------|-----------|
| **projects** | `/projects` | Project management. Core Projects app workflow. |

**Why this appears in navigation:**
- It is a Projects-specific workflow
- It belongs to the Projects app domain
- It is explicitly owned by the Projects app (`appKey: 'projects'`)
- Note: Tasks and events are accessed via the platform entities (shared system primitives)

---

## Detailed Module Table

| Module | App | Classification | Nav Visible | navigationCore | navigationEntity | excludeFromApps | Route | Rationale |
|--------|-----|----------------|-------------|-----------------|------------------|-----------------|-------|-----------|
| people | platform | ENTITY | ✅ | ❌ | ✅ | ✅ | `/people` | Shared system primitive. Core entity for leads/contacts. |
| organizations | platform | ENTITY | ✅ | ❌ | ✅ | ✅ | `/organizations` | Shared system primitive. Core entity for companies/accounts. |
| tasks | platform | ENTITY | ✅ | ❌ | ✅ | ✅ | `/tasks` | Shared system primitive. Core activity entity. |
| events | platform | ENTITY | ✅ | ❌ | ✅ | ✅ | `/events` | Shared system primitive. Core activity entity. |
| items | platform | ENTITY | ✅ | ❌ | ✅ | ✅ | `/items` | Shared system primitive. Core entity for product catalog. |
| forms | platform | ENTITY | ✅ | ❌ | ✅ | ✅ | `/forms` | Shared system primitive. Core entity for form builder. |
| audits | audit | APP_OWNED | ✅ | ❌ | ❌ | ❌ | `/audits` | Audit app workflow. Appears under Audit app. |
| projects | projects | APP_OWNED | ✅ | ❌ | ❌ | ❌ | `/projects` | Projects app workflow. Project management. |
| deals | sales | APP_OWNED | ✅ | ❌ | ❌ | ❌ | `/deals` | Sales app workflow. Deal management. |
| responses | sales | APP_OWNED | ✅ | ❌ | ❌ | ❌ | `/responses` | Sales app workflow. Form response management. |
| imports | sales | APP_OWNED | ✅ | ❌ | ❌ | ❌ | `/imports` | Sales app workflow. Data import utility. |

---

## Validation Results

### ✅ All Modules Pass Validation

**Rule 1:** No module has both `navigationEntity: true` and `appKey` (except 'platform')  
**Rule 2:** No module has both `navigationCore: true` and `appKey` (except 'platform')  
**Rule 3:** All entities with `navigationEntity: true` have `excludeFromApps: true`  
**Rule 4:** All platform entities have explicit navigation intent flags  
**Rule 5:** No app-owned module has `navigationEntity` or `navigationCore` flags

### Registry Validation

The registry passes `validateAppRegistry` with:
- ✅ 0 errors
- ✅ 0 warnings
- ✅ All modules have explicit navigation intent
- ✅ No inference-based placement

---

## Navigation Placement Logic

### How Modules Are Placed in Sidebar

1. **Core Section** (currently empty)
   - Modules with `navigationCore: true`
   - Virtual items (Home, Inbox, Reports)
   - No modules currently classified as Core

2. **Entities Section**
   - Modules with `navigationEntity: true`
   - Must have `appKey: 'platform'` (or no appKey)
   - Must have `excludeFromApps: true`
   - **Current modules:** people, organizations, tasks, events, items, forms

3. **Apps Section**
   - Modules with `appKey` (not 'platform')
   - Must NOT have `navigationEntity: true`
   - Must NOT have `navigationCore: true`
   - Must NOT have `excludeFromApps: true`
   - Grouped by app (Sales, Audit, Helpdesk, Projects)

4. **Platform Section**
   - Governance items (Settings, Apps, Users)
   - Handled separately, not from module registry

---

## Key Decisions & Rationale

### Why Platform Entities Are in Entities Section

**Decision:** People, Organizations, Tasks, Events, Items, Forms are in Entities section, not Apps.

**Rationale:**
- These are fundamental system primitives used by multiple apps
- Users need direct access regardless of app context
- They provide cross-app data consistency
- They are explicitly marked with `navigationEntity: true` and `excludeFromApps: true`

### Why App Projections Appear Under Apps

**Decision:** App-specific projections of platform entities (e.g., `tasks` under Audit, `events` under Helpdesk) appear under their apps, not in Entities.

**Rationale:**
- They are app-specific views/contexts of shared entities
- They provide app-specific workflows and business logic
- They are explicitly owned by their apps (`appKey: 'audit'`, `appKey: 'helpdesk'`, etc.)
- They do NOT have `navigationEntity: true`, so they appear in Apps section

### Why No Core Items Currently

**Decision:** No modules are classified as Core (`navigationCore: true`).

**Rationale:**
- Core items are typically virtual (Home, Inbox, Reports)
- These are handled separately in the sidebar builder
- No module-level entities need Core classification currently

---

## Maintenance Guidelines

### Adding a New Module

1. **Determine classification:**
   - **Entity?** → Set `navigationEntity: true`, `excludeFromApps: true`, `appKey: 'platform'`
   - **App-owned?** → Set `appKey: '<app>'`, ensure no navigation flags
   - **Core?** → Set `navigationCore: true`, no `appKey` (except 'platform')
   - **Settings-only?** → No navigation flags, no `appKey`

2. **Validate:**
   - Run `validateAppRegistry` to check for violations
   - Run `auditNavigationIntent.js` to verify classification
   - Check sidebar rendering to confirm placement

3. **Document:**
   - Update this audit document
   - Add rationale for classification decision

### Changing Navigation Intent

1. **Update module definition:**
   - Modify `ModuleDefinition` in database
   - Update seed script if applicable

2. **Validate:**
   - Run `validateAppRegistry` to check for violations
   - Run `auditNavigationIntent.js` to verify changes

3. **Test:**
   - Verify sidebar placement
   - Check that module appears/disappears correctly
   - Test permissions and visibility

---

## Audit Script

To regenerate this audit:

```bash
node server/scripts/auditNavigationIntent.js
```

This will:
1. Query all modules from the database
2. Classify each module's navigation intent
3. Validate against sidebar rules
4. Generate JSON output (`NAVIGATION_INTENT_AUDIT.json`)
5. Print detailed report to console

---

## Conclusion

✅ **All modules have explicit navigation intent flags**  
✅ **No inference-based placement exists**  
✅ **Registry passes validation cleanly**  
✅ **Navigation behavior is clear and documented**

The platform registry is in a clean state with explicit navigation intent for all modules. This audit serves as the single source of truth for navigation placement decisions.

---

**Last Updated:** January 12, 2026  
**Next Review:** When adding new modules or changing navigation structure

