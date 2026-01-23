# Module Settings Doctrine

**Version:** 1.0  
**Date:** January 2026  
**Status:** Architectural Doctrine (Locked)  
**Type:** Platform Architecture Specification

---

## Executive Summary

This document defines what "Module Settings" mean across the LiteDesk platform. Module Settings are configuration interfaces that control how modules behave, not interfaces for browsing or manipulating data. This doctrine establishes clear boundaries between Settings, Surfaces, and Work to prevent scope creep and maintain architectural integrity.

**Canonical Implementation:** People Settings (`/settings?tab=core-modules&moduleKey=people`)  
**Reference:** All future module settings implementations must align with this doctrine.

---

## 1. Core Definitions

### Settings vs Surfaces vs Work

The platform distinguishes three distinct interaction modes:

#### Settings
**Purpose:** Configure module behavior, structure, and presentation rules.

**What Settings Are:**
- Configuration interfaces for module metadata
- Field definitions, types, validation rules
- Layout configurations (list views, detail views, quick create)
- Relationship definitions between modules
- Display preferences and visibility rules
- Module enablement and app participation

**What Settings Are NOT:**
- Data browsing interfaces
- Record lists or tables
- Execution surfaces for actions
- Work management interfaces

**Location:** `/settings` with left navigation and right panel layout  
**Access:** Platform-level configuration, requires appropriate permissions

#### Surfaces
**Purpose:** User-facing interfaces for discovering, viewing, and navigating data.

**What Surfaces Are:**
- List views (People list, Organizations list)
- Detail views (Person detail, Organization detail)
- Search interfaces
- Inbox aggregation views
- Contextual navigation hubs

**What Surfaces Are NOT:**
- Configuration interfaces
- Settings panels
- Administrative controls

**Location:** App-specific routes (e.g., `/people`, `/organizations`, `/inbox`)  
**Access:** User-facing, permission-aware

#### Work
**Purpose:** Business objects and records that represent actual work being done.

**What Work Is:**
- Deals, Tickets, Audits, Projects, Events
- Records that have lifecycle states
- Objects that can be created, updated, executed, and completed
- Entities that participate in workflows

**What Work Is NOT:**
- Configuration metadata
- Settings definitions
- Structural definitions

**Location:** Module-specific routes within app contexts  
**Access:** User-facing, permission-aware

### Mental Model

```
Settings → Define structure and behavior
Surfaces → Navigate and view data
Work → Execute business processes
```

Settings configure how Surfaces display Work. Settings do not display Work directly.

---

## 2. UX Layout Rules

### Left Navigation Structure

Settings use a consistent left navigation pattern:

**Layout:**
- Collapsible sidebar (mirrors main app navigation behavior)
- Icon + label when expanded
- Icon-only when collapsed
- Hover to temporarily expand when collapsed

**Sections (in order):**
1. **Overview** (landing page)
2. **Core Modules** (People, Organizations, Events, Forms)
3. **Applications** (Sales, Helpdesk, Projects, Audit, Portal)
4. **Platform** (organization-wide settings)
5. **Security** (authentication, permissions, access)
6. **Integrations** (third-party connections)
7. **Users & Access** (user management, roles)
8. **Notifications** (notification preferences and rules)
9. **Subscriptions** (billing, plans, limits)

**Navigation Behavior:**
- Clicking a section navigates to its list/detail view
- Active section is highlighted
- Breadcrumbs show current location
- Back button returns to previous level or Overview

### Right Panel Content

The right panel displays the selected settings interface:

**Layout:**
- Full-width content area
- Scrollable when content exceeds viewport
- Consistent padding and spacing
- Card-based sections for logical grouping

**Content Structure:**
- Header with module/app name and badges (Platform-Owned, Shared, etc.)
- Tabbed interface for module settings:
  - **Module Details** (name, description, enablement, app participation)
  - **Field Configurations** (field definitions, types, validation, visibility)
  - **Relationships** (module-to-module relationships, cardinality)
  - **Quick Create** (field selection and layout for quick create forms)
  - **Pipeline Settings** (Deals only: stage definitions, automation)
  - **Playbook Configuration** (Deals only: playbook definitions)

**Panel Rules:**
- No record lists
- No data tables showing actual records
- No execution actions (create, update, delete records)
- Configuration controls only (toggles, forms, field editors)

---

## 3. What Settings Must NEVER Include

### Prohibited Content

Module Settings must **NEVER** include:

#### 1. Lists of Records
**Forbidden:**
- Tables showing actual records (People, Deals, Tickets, etc.)
- Paginated record lists
- Record search results
- Record filtering interfaces

**Why:** Lists belong in Surfaces, not Settings. Settings configure how lists are displayed, not the lists themselves.

**Example Violation:**
```vue
<!-- ❌ FORBIDDEN in Settings -->
<DataTable :records="people" />
```

**Correct Approach:**
```vue
<!-- ✅ CORRECT: Configure list structure, not show records -->
<FieldConfiguration :fields="moduleFields" />
```

#### 2. Record Execution Actions
**Forbidden:**
- Create record buttons
- Edit record forms (for actual records)
- Delete record actions
- Bulk operations on records
- Record lifecycle transitions (convert, attach, detach)

**Why:** Execution actions belong in Surfaces and Work interfaces. Settings configure the structure that enables these actions elsewhere.

**Example Violation:**
```vue
<!-- ❌ FORBIDDEN in Settings -->
<button @click="createPerson">Create Person</button>
```

**Correct Approach:**
```vue
<!-- ✅ CORRECT: Configure quick create fields, not execute creation -->
<QuickCreateConfiguration :fields="quickCreateFields" />
```

#### 3. Data Browsing Interfaces
**Forbidden:**
- Record detail views
- Record search interfaces
- Record navigation
- Related records displays

**Why:** Browsing belongs in Surfaces. Settings configure what appears in browsing interfaces, not the interfaces themselves.

**Example Violation:**
```vue
<!-- ❌ FORBIDDEN in Settings -->
<PersonDetail :person-id="personId" />
```

**Correct Approach:**
```vue
<!-- ✅ CORRECT: Configure detail view structure -->
<FieldVisibilityConfiguration :fields="detailViewFields" />
```

### Enforcement

These prohibitions are architectural invariants. Violations must be caught during code review and rejected. If a feature request requires violating these rules, the request must be refactored to:

1. Move the functionality to the appropriate Surface or Work interface
2. Keep only configuration controls in Settings
3. Update this doctrine if the architecture evolves

---

## 4. Modules That Get Settings

### Core Modules

Core modules are platform-owned capabilities shared across applications. They receive Settings interfaces:

#### People
**Settings Location:** `/settings?tab=core-modules&moduleKey=people`  
**Canonical Implementation:** Yes (reference implementation)  
**Settings Include:**
- Field definitions (identity vs participation fields)
- Field visibility and permissions
- Relationship definitions (People ↔ Organizations, People ↔ Work)
- Quick Create configuration
- App participation settings (which apps use People)

**Why Settings:** People is a foundational identity module. Its structure affects all apps. Configuration must be centralized and consistent.

#### Organizations
**Settings Location:** `/settings?tab=core-modules&moduleKey=organizations`  
**Settings Include:**
- Field definitions
- Relationship definitions
- Quick Create configuration
- App participation settings

**Why Settings:** Organizations provide context for People and Work. Structure must be configurable.

#### Events
**Settings Location:** `/settings?tab=core-modules&moduleKey=events`  
**Settings Include:**
- Field definitions
- Relationship definitions
- Quick Create configuration
- App participation settings

**Why Settings:** Events are cross-app capabilities. Structure must be consistent.

#### Forms
**Settings Location:** `/settings?tab=core-modules&moduleKey=forms`  
**Settings Include:**
- Field definitions
- Relationship definitions
- App participation settings
- Note: Forms do not have Quick Create (forms are the quick create mechanism)

**Why Settings:** Forms are platform capabilities. Structure must be configurable.

### Application Modules

Application modules are app-specific work objects. They receive Settings interfaces:

#### Deals (Sales)
**Settings Location:** `/settings?tab=applications&appKey=SALES&moduleKey=deals`  
**Settings Include:**
- Field definitions
- Relationship definitions
- Quick Create configuration
- Pipeline Settings (stages, automation rules)
- Playbook Configuration (playbook definitions)

**Why Settings:** Deals have complex workflow requirements. Pipeline and playbook configuration are essential.

#### Tickets (Helpdesk)
**Settings Location:** `/settings?tab=applications&appKey=HELPDESK&moduleKey=tickets`  
**Settings Include:**
- Field definitions
- Relationship definitions
- Quick Create configuration

**Why Settings:** Tickets need configurable structure for different support workflows.

#### Other Application Modules
All application modules receive Settings interfaces following the same pattern:
- Field definitions
- Relationship definitions
- Quick Create configuration
- Module-specific extensions (e.g., Pipeline for Deals)

**Why Settings:** Consistent configuration interface across all modules enables predictable admin experience.

### Modules That Do NOT Get Settings

Some platform capabilities do not receive Settings interfaces:

#### Inbox
**Why:** Inbox is a Surface, not a module. It aggregates data from multiple modules but does not have its own data structure to configure.

#### Search
**Why:** Search is a Surface capability. It queries across modules but does not have configurable structure.

#### Platform Home
**Why:** Platform Home is a Surface. It displays aggregated information but does not have configurable structure.

---

## 5. People Settings as Canonical Implementation

### Reference Implementation

People Settings (`/settings?tab=core-modules&moduleKey=people`) is the **canonical implementation** for all module settings. All future module settings must follow the same patterns, structure, and constraints.

### Implementation Pattern

People Settings demonstrates the correct pattern:

#### 1. Left Navigation
- Located in Settings left nav under "Core Modules"
- Clicking navigates to Core Modules list
- Selecting People navigates to People Settings detail

#### 2. Right Panel Structure
- Header with module name, badges (Platform-Owned, Shared)
- Tabbed interface:
  - **Module Details**: Name, description, app participation
  - **Field Configurations**: Field definitions, types, visibility
  - **Relationships**: Module-to-module relationships
  - **Quick Create**: Field selection and order

#### 3. Configuration Controls Only
- Field editors (not record editors)
- Toggle switches (enable/disable, not execute actions)
- Form builders (structure, not data)
- Relationship builders (definitions, not actual relationships)

#### 4. No Prohibited Content
- No People list
- No Person detail views
- No Create Person actions
- No record browsing

### Adherence Requirements

When implementing settings for other modules:

1. **Follow the same layout pattern** (left nav + right panel)
2. **Use the same tab structure** (Details, Fields, Relationships, Quick Create)
3. **Include only configuration controls** (no lists, no execution)
4. **Match the visual design** (badges, spacing, typography)
5. **Use the same permission model** (settings.edit permission required)

### Deviation Process

If a module requires settings that deviate from the People Settings pattern:

1. Document the deviation requirement
2. Propose the deviation to architecture review
3. Update this doctrine if deviation is approved
4. Update People Settings if deviation becomes the new pattern

---

## 6. Lock Statement

### Scope Lock

Module Settings are **locked in scope**. The following are **NON-NEGOTIABLE**:

1. **Settings do not display records.** Lists, tables, and record browsers belong in Surfaces.
2. **Settings do not execute actions.** Create, update, delete, and lifecycle actions belong in Surfaces and Work interfaces.
3. **Settings configure structure only.** Field definitions, layouts, relationships, and display rules are the sole domain of Settings.

### Change Process

Any proposal to add functionality to Settings that violates these locks must:

1. **Justify the violation** with clear architectural reasoning
2. **Propose alternative** that maintains the Settings/Surfaces/Work separation
3. **Update this doctrine** if the change is approved
4. **Update all existing Settings** to match the new pattern

### Enforcement

- **Code Review:** Reject PRs that violate Settings scope
- **Architecture Review:** Require architecture approval for scope changes
- **Documentation:** Update this doctrine before implementing scope changes
- **Testing:** Verify Settings do not include prohibited content

### Future-Proofing

This doctrine prevents scope creep by:

- **Explicit boundaries** between Settings, Surfaces, and Work
- **Canonical reference** (People Settings) for consistency
- **Locked prohibitions** that require explicit override
- **Change process** that prevents ad-hoc additions

**These rules must be enforced at the code level, not merely documented.**

---

## Summary

Module Settings are configuration interfaces that control module behavior. They are distinct from Surfaces (data browsing) and Work (business objects). Settings configure structure; they do not display or manipulate data.

**Key Principles:**
1. Settings configure, Surfaces navigate, Work executes
2. Settings use left nav + right panel layout
3. Settings never include lists, records, or execution actions
4. People Settings is the canonical implementation
5. Scope is locked; changes require architecture approval

**Reference:** People Settings (`/settings?tab=core-modules&moduleKey=people`)  
**Enforcement:** Code review, architecture review, documentation updates

---

**This document defines NON-NEGOTIABLE invariants for Module Settings.**  
**These rules must never be violated, regardless of feature requests or UI preferences.**
