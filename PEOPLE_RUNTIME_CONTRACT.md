# People Runtime Contract

**Version:** 1.0  
**Date:** January 2026  
**Status:** Specification Document  
**Type:** Runtime Contract (Rules, Not Implementation)

---

## Executive Summary

This document defines the **explicit, deterministic runtime contract** for the People core entity across the LiteDesk multi-application platform. The contract ensures that:

- ✅ Every People action executes with a resolved app context
- ✅ People types are declared by apps, never configured globally
- ✅ Quick Create always runs in exactly one app context
- ✅ Core fields are shared; app fields are isolated
- ✅ Permissions are evaluated per app context
- ✅ App context is additive, never duplicative

**Platform Apps:** Sales, Helpdesk, Projects, Audit, Portal  
**Core Entity:** People (platform-owned, shared across apps)  
**Navigation:** Single sidebar entry in Entities section (no app switcher)

---

## 1️⃣ App Context Resolution

### Purpose
Define how the system determines which app context applies when interacting with People.

### Resolution Rules

#### Rule 1.1: Route-Based Resolution (Primary)
**Priority:** Highest

When a People route is accessed, app context is resolved from the URL path:

| Route Pattern | Resolved App Context | Example |
|---------------|---------------------|---------|
| `/people` | **Neutral/Global** → Requires explicit selection | `/people` |
| `/people/:id` | **Neutral/Global** → Requires explicit selection | `/people/507f1f77bcf86cd799439011` |
| `/sales/people` | **Sales** | `/sales/people` |
| `/sales/people/:id` | **Sales** | `/sales/people/507f1f77bcf86cd799439011` |
| `/helpdesk/people` | **Helpdesk** | `/helpdesk/people` |
| `/helpdesk/people/:id` | **Helpdesk** | `/helpdesk/people/507f1f77bcf86cd799439011` |
| `/audit/people` | **Audit** | `/audit/people` |
| `/audit/people/:id` | **Audit** | `/audit/people/507f1f77bcf86cd799439011` |
| `/portal/people` | **Portal** | `/portal/people` |
| `/portal/people/:id` | **Portal** | `/portal/people/507f1f77bcf86cd799439011` |

**Implementation Note:** URL namespace mapping in `resolveAppContextMiddleware.js` determines app context from route prefix.

#### Rule 1.2: Navigation Intent Metadata (Secondary)
**Priority:** Medium

When navigating to People from another module, navigation intent metadata may carry app context:

```javascript
// Navigation intent structure
{
  targetModule: 'people',
  sourceApp: 'sales',        // App context from source
  sourceModule: 'deals',     // Where user came from
  targetPersonId: '...',     // Optional: specific person
  intent: 'view' | 'create' | 'edit'
}
```

**Resolution Logic:**
- If route has explicit app prefix → Use route-based resolution (Rule 1.1)
- If route is neutral (`/people`) AND navigation intent has `sourceApp` → Use `sourceApp`
- If route is neutral AND no navigation intent → Require explicit app selection (Rule 1.3)

#### Rule 1.3: Default Behavior for Neutral Routes
**Priority:** Fallback

When People is accessed from a neutral/global entry (`/people`):

**List View:**
- System MUST require user to select an app context before displaying list
- Options: Show app selector OR redirect to app-specific route
- **No default app assumption is allowed**

**Detail View:**
- System MUST determine app context from:
  1. Route parameter (if app-prefixed route)
  2. Navigation intent metadata (if present)
  3. Person's app participation history (if person exists)
  4. If ambiguous → Require explicit app selection

**Quick Create:**
- See Section 3 (Quick Create Resolution)

#### Rule 1.4: Ambiguity Detection and Handling

**Ambiguity Scenarios:**

1. **Neutral route with no navigation intent:**
   - **Detection:** Route is `/people` or `/people/:id` with no `sourceApp` in navigation intent
   - **Handling:** Require explicit app selection (show selector or redirect)

2. **Person participates in multiple apps:**
   - **Detection:** Person has app-specific data in multiple apps (e.g., Sales Contact + Helpdesk Member)
   - **Handling:** Use resolved app context to determine which app's view to show
   - **Rule:** Person profile shows ALL app sections, but editing is scoped to current app context

3. **User lacks permission in resolved app:**
   - **Detection:** User does not have People permissions in resolved app context
   - **Handling:** Show read-only view OR redirect to app where user has permission
   - **Rule:** Never silently switch apps; always show permission error

### Contract Enforcement

**Rule:** No People action may execute without a resolved app context.

**Validation Points:**
- ✅ All People API endpoints MUST receive `req.appKey` (from `resolveAppContextMiddleware`)
- ✅ Frontend MUST pass app context in all People API calls
- ✅ Neutral routes MUST resolve to explicit app context before execution
- ✅ Ambiguity MUST be detected and handled explicitly (no silent fallbacks)

---

## 2️⃣ People Type Derivation

### Purpose
Define how visible People types (e.g., Lead, Contact, Member) are determined.

### Type Declaration Rules

#### Rule 2.1: Apps Declare Types
**Principle:** People types are declared by apps, never configured globally.

**Type Registry Structure:**
```javascript
// Platform-level metadata (moduleProjections.js)
PEOPLE: {
  platformOwned: true,
  baseModuleKey: 'people',
  types: ['LEAD', 'CONTACT', 'PARTNER', 'MEMBER'],  // All possible types
  apps: {
    SALES: {
      allowedTypes: ['LEAD', 'CONTACT'],
      defaultType: 'LEAD'
    },
    HELPDESK: {
      allowedTypes: ['CONTACT', 'MEMBER'],
      defaultType: 'CONTACT'
    },
    AUDIT: {
      allowedTypes: ['CONTACT'],
      readOnly: true
    },
    PORTAL: {
      allowedTypes: ['CONTACT'],
      readOnly: true
    }
  }
}
```

**Rule:** Types are declared in platform metadata, not in tenant data.

#### Rule 2.2: Type Visibility by App Context

When viewing People in a specific app context:

**Visible Types:**
- Only types declared in `allowedTypes` for that app are visible
- Types from other apps are hidden (not filtered, but not shown in type selector)

**Example:**
- In Sales app context: Only `LEAD` and `CONTACT` appear in type selector
- In Helpdesk app context: Only `CONTACT` and `MEMBER` appear in type selector
- In Audit app context: Only `CONTACT` appears (read-only)

**Rule:** Type visibility is filtered by resolved app context.

#### Rule 2.3: Duplicate Type Names Across Apps

**Scenario:** Multiple apps declare the same type name (e.g., `CONTACT` in Sales, Helpdesk, Audit, Portal).

**Resolution:**
- ✅ **Same type name = Same semantic meaning**
- ✅ Person with type `CONTACT` in Sales is the same type as `CONTACT` in Helpdesk
- ✅ Type is shared across apps; app-specific fields differentiate meaning
- ✅ No type name collision or namespace separation needed

**Rationale:** Type names represent platform-level semantics. Apps add meaning through app-specific fields and workflows, not through type name differentiation.

#### Rule 2.4: Type Configuration vs. Derivation

**Configuration:** Types are **declared** in platform metadata (`moduleProjections.js`)

**Derivation:** Types are **derived** at runtime based on:
1. Resolved app context
2. App's `allowedTypes` declaration
3. Person's current type assignment

**Rule:** Types are never configured per-tenant or per-organization. They are platform-level declarations.

#### Rule 2.5: Type Visibility Filtering by Permissions

**Permission Check Flow:**

1. **Resolve app context** (Section 1)
2. **Get app's allowed types** from type registry
3. **Check user permissions** in resolved app context:
   - `people.create` permission → Can create new people
   - `people.edit` permission → Can change types
   - `people.view` permission → Can view people
4. **Filter visible types** based on permissions:
   - If user lacks `people.create` → Hide type selector in create form
   - If user lacks `people.edit` → Show type as read-only in edit form
   - If user lacks `people.view` → Hide person entirely

**Rule:** Type visibility is filtered by permissions in resolved app context.

### Contract Enforcement

**Rule:** People types are declared by apps, never configured globally.

**Validation Points:**
- ✅ Type registry is platform-level metadata (not tenant data)
- ✅ Types are derived from app context, not guessed
- ✅ Duplicate type names are treated as shared semantics
- ✅ Permission checks use resolved app context

---

## 3️⃣ Quick Create Resolution

### Purpose
Define how Add Person / Quick Create behaves.

### Quick Create Rules

#### Rule 3.1: App Context Requirement
**Principle:** Quick Create always runs in exactly one app context.

**Resolution Priority:**

1. **Explicit app context from route:**
   - Route: `/sales/people/new` → App context: **Sales**
   - Route: `/helpdesk/people/new` → App context: **Helpdesk**

2. **Navigation intent metadata:**
   - Source: Deal detail page → App context: **Sales**
   - Source: Ticket detail page → App context: **Helpdesk**

3. **Current page context:**
   - User is on `/sales/deals` → App context: **Sales**
   - User is on `/helpdesk/tickets` → App context: **Helpdesk**

4. **Explicit selection required:**
   - If no app context can be determined → Show app selector dialog
   - **No default app assumption is allowed**

#### Rule 3.2: Auto-Selection vs. User Choice

**Auto-Selection (Allowed):**
- ✅ User is in Sales app context → Auto-select Sales
- ✅ User navigates from Deal → Auto-select Sales
- ✅ User navigates from Ticket → Auto-select Helpdesk
- ✅ Route has explicit app prefix → Auto-select that app

**User Choice Required:**
- ❌ User clicks "Add Person" from neutral `/people` route
- ❌ User clicks "Add Person" from global sidebar entry
- ❌ No app context can be determined from route or navigation intent

**Rule:** Auto-selection is allowed only when app context is unambiguous. Otherwise, require explicit user selection.

#### Rule 3.3: Quick Create Fields, Defaults, and Validation

**Field Selection:**

Fields shown in quick create form are determined by:

1. **Core fields (always shown):**
   - `firstName` (required)
   - `lastName` (required)
   - `email` (optional, validated if provided)
   - `phone` (optional)

2. **App-specific fields (shown based on app context):**
   - **Sales app context:**
     - `type`: Default `LEAD` (from app's `defaultType`)
     - `source`: Sales-specific source options
     - `assignedTo`: Sales user assignment
   - **Helpdesk app context:**
     - `type`: Default `CONTACT` (from app's `defaultType`)
     - `department`: Helpdesk-specific field
     - `assignedTo`: Helpdesk user assignment

3. **Validation rules:**
   - Core field validation: Platform-level (email format, phone format)
   - App field validation: App-specific (e.g., Sales requires `source`)

**Rule:** Fields are selected based on resolved app context. No merged forms across apps.

#### Rule 3.4: Conflict Resolution (Contact in Sales + Helpdesk)

**Scenario:** User creates a Person as "Contact" in Sales app. Later, user wants to add same person as "Contact" in Helpdesk app.

**Resolution:**

1. **Duplicate Detection:**
   - System checks for existing Person by email (primary key)
   - If Person exists → Show "Person already exists" message

2. **App Context Attachment (See Section 6):**
   - If Person exists but lacks Helpdesk app context → Attach Helpdesk app context
   - If Person exists and has Helpdesk app context → Show existing person (no duplicate)

3. **Type Conflict:**
   - Person is `CONTACT` in Sales
   - User wants to create `CONTACT` in Helpdesk
   - **Resolution:** Same type name = No conflict. Attach Helpdesk app context.

4. **Data Initialization:**
   - Core fields: Already exist (no duplication)
   - Helpdesk-specific fields: Initialize with defaults or empty
   - Sales-specific fields: Unchanged (isolated)

**Rule:** Conflicts are resolved by app context attachment, never by duplication.

### Contract Enforcement

**Rule:** Quick Create always runs in exactly one app context.

**Validation Points:**
- ✅ Quick create form shows fields for resolved app context only
- ✅ Default type comes from app's `defaultType` declaration
- ✅ Validation rules are app-specific
- ✅ Duplicate detection prevents record duplication
- ✅ App context attachment handles cross-app creation

---

## 4️⃣ Person Profile Composition

### Purpose
Define how the Person profile screen is composed.

### Profile Composition Rules

#### Rule 4.1: Core Information Section (Shared Fields)

**Core fields are shared and consistent across all app contexts:**

```javascript
// Core Information (always visible)
{
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  mobile: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  avatar: String,
  notes: String,  // Platform-level notes
  tags: [String],  // Platform-level tags
  status: String, // 'active' | 'inactive' | 'do_not_contact'
  createdAt: Date,
  updatedAt: Date
}
```

**Visibility:** Always visible, regardless of app context  
**Editability:** Controlled by permissions (Section 5)  
**Consistency:** Same fields, same values, same validation across all apps

#### Rule 4.2: App-Specific Sections

**App-specific sections are isolated and shown based on app participation:**

```javascript
// Sales App Section (shown if person participates in Sales)
{
  type: 'LEAD' | 'CONTACT',
  source: String,
  assignedTo: ObjectId,  // Sales user
  salesNotes: String,
  deals: [ObjectId],     // Related deals
  // ... Sales-specific fields
}

// Helpdesk App Section (shown if person participates in Helpdesk)
{
  type: 'CONTACT' | 'MEMBER',
  department: String,
  assignedTo: ObjectId,  // Helpdesk user
  tickets: [ObjectId],   // Related tickets
  // ... Helpdesk-specific fields
}

// Audit App Section (shown if person participates in Audit)
{
  type: 'CONTACT',
  auditAssignments: [ObjectId],
  // ... Audit-specific fields (read-only)
}
```

**Visibility Rules:**
- Section is shown if Person has app context attached (Section 6)
- Section is hidden if Person lacks app context for that app
- Multiple app sections can be shown simultaneously

**Isolation Rules:**
- Sales fields are isolated from Helpdesk fields
- Editing Sales fields does not affect Helpdesk fields
- Each app section has its own validation and business rules

#### Rule 4.3: Ordering and Visibility Rules

**Section Order (Top to Bottom):**

1. **Core Information** (always first)
2. **App-Specific Sections** (ordered by app participation):
   - Sales section (if person participates in Sales)
   - Helpdesk section (if person participates in Helpdesk)
   - Projects section (if person participates in Projects)
   - Audit section (if person participates in Audit)
   - Portal section (if person participates in Portal)
3. **Related Records** (ordered by app context)
4. **Activity Timeline** (platform-level, shows all activities)

**Visibility Rules:**
- Core Information: Always visible
- App sections: Visible if person participates in that app
- Related Records: Filtered by resolved app context (if viewing from Sales, show Sales-related records)
- Activity Timeline: Shows all activities across all apps (platform-level)

#### Rule 4.4: Read/Write Behavior Per Section

**Core Information Section:**
- **Read:** Always readable (if user has `people.view` permission in any app)
- **Write:** Requires `people.edit` permission in resolved app context
- **Rule:** Core fields can be edited from any app context (if user has permission)

**App-Specific Sections:**
- **Read:** Requires `people.view` permission in that app's context
- **Write:** Requires `people.edit` permission in that app's context
- **Rule:** App fields can only be edited when viewing in that app's context

**Example:**
- User viewing Person from Sales app context:
  - ✅ Can edit Core Information (if has Sales `people.edit` permission)
  - ✅ Can edit Sales section (if has Sales `people.edit` permission)
  - ❌ Cannot edit Helpdesk section (not in Helpdesk app context)
  - ✅ Can view Helpdesk section (if has Helpdesk `people.view` permission)

#### Rule 4.5: Entering from Different App Contexts

**Scenario:** Same Person, viewed from different app contexts.

**Sales App Context (`/sales/people/:id`):**
- Core Information: Shown (editable if permission allows)
- Sales Section: Shown (editable if permission allows)
- Helpdesk Section: Shown if person participates in Helpdesk (read-only)
- Related Records: Filtered to Sales-related (deals, etc.)
- Activity Timeline: Shows all activities (Sales + Helpdesk + other apps)

**Helpdesk App Context (`/helpdesk/people/:id`):**
- Core Information: Shown (editable if permission allows)
- Sales Section: Shown if person participates in Sales (read-only)
- Helpdesk Section: Shown (editable if permission allows)
- Related Records: Filtered to Helpdesk-related (tickets, etc.)
- Activity Timeline: Shows all activities (Sales + Helpdesk + other apps)

**Neutral Context (`/people/:id`):**
- Core Information: Shown (editable if permission allows in any app)
- All App Sections: Shown if person participates (read-only unless in that app's context)
- Related Records: Show all (not filtered)
- Activity Timeline: Shows all activities

**Rule:** Profile composition adapts to app context, but all sections are visible (with appropriate read/write restrictions).

### Contract Enforcement

**Rule:** Core fields are shared and consistent; app fields are isolated.

**Validation Points:**
- ✅ Core Information section is always first and always visible
- ✅ App sections are shown based on app participation
- ✅ Editing is scoped to resolved app context
- ✅ Read access is determined by permissions per app
- ✅ Profile adapts to app context but shows all relevant sections

---

## 5️⃣ Editing & Permissions

### Purpose
Define how updates are handled.

### Permission Rules

#### Rule 5.1: Core Field Editing Permissions

**Which permissions allow editing Core fields:**

Core fields can be edited if user has `people.edit` permission in **any app context** where the person participates.

**Permission Check Flow:**

1. **Resolve app context** (Section 1)
2. **Check if person participates in resolved app context** (Section 6)
3. **Check user permission:**
   - User has `people.edit` in resolved app context → ✅ Can edit Core fields
   - User lacks `people.edit` in resolved app context → ❌ Cannot edit Core fields
4. **Fallback (if person participates in multiple apps):**
   - If user lacks permission in resolved app context, check other app contexts
   - If user has `people.edit` in any app context → ✅ Can edit Core fields (but app-specific fields still restricted)

**Rule:** Core field editing requires `people.edit` permission in at least one app context where person participates.

#### Rule 5.2: App Field Editing Permissions

**Which permissions allow editing App fields:**

App fields can only be edited when:
1. User is viewing in that app's context (resolved app context matches)
2. User has `people.edit` permission in that app's context

**Permission Check Flow:**

1. **Resolve app context** (Section 1)
2. **Check if resolved app context matches app section:**
   - Sales section → Requires Sales app context
   - Helpdesk section → Requires Helpdesk app context
3. **Check user permission:**
   - User has `people.edit` in matching app context → ✅ Can edit app section
   - User lacks `people.edit` in matching app context → ❌ Cannot edit app section

**Rule:** App field editing requires `people.edit` permission in the matching app context.

#### Rule 5.3: Permission Evaluation with Multiple App Contexts

**Scenario:** Person participates in Sales and Helpdesk. User has `people.edit` in Sales but not in Helpdesk.

**Viewing from Sales app context:**
- ✅ Can edit Core Information (has Sales `people.edit`)
- ✅ Can edit Sales section (has Sales `people.edit` + in Sales context)
- ❌ Cannot edit Helpdesk section (not in Helpdesk context)
- ✅ Can view Helpdesk section (if has Helpdesk `people.view`)

**Viewing from Helpdesk app context:**
- ❌ Cannot edit Core Information (lacks Helpdesk `people.edit`)
- ❌ Cannot edit Sales section (not in Sales context)
- ❌ Cannot edit Helpdesk section (lacks Helpdesk `people.edit`)
- ✅ Can view all sections (if has `people.view` in respective apps)

**Rule:** Permissions are evaluated per app context. No global permission assumption.

#### Rule 5.4: Handling Lack of Permission in Current App

**Scenario:** User views Person from Sales app context but lacks `people.edit` permission in Sales.

**Behavior:**

1. **Core Information:**
   - Check if user has `people.edit` in any app context where person participates
   - If yes → Show editable (but note: "Editing from Sales context")
   - If no → Show read-only

2. **Sales Section:**
   - Show read-only (user lacks Sales `people.edit`)

3. **Other App Sections:**
   - Show read-only (not in those app contexts)

4. **Error Handling:**
   - If user attempts to edit without permission → Show permission error
   - Error message: "You do not have permission to edit people in the Sales application"
   - **Never silently switch apps or grant access**

**Rule:** When user lacks permission in current app context, show read-only view and explicit permission error on edit attempt.

### Contract Enforcement

**Rule:** Permissions are evaluated per app context, never globally guessed.

**Validation Points:**
- ✅ Core field editing checks permissions in resolved app context (with fallback)
- ✅ App field editing requires matching app context + permission
- ✅ Permission checks use resolved app context, not global assumptions
- ✅ Permission errors are explicit and never silent

---

## 6️⃣ App Context Attachment

### Purpose
Define how a Person gains participation in a new app.

### Attachment Rules

#### Rule 6.1: How App Context is Attached

**Scenario:** Person exists in Sales app. User wants to add same person to Helpdesk app.

**Attachment Process:**

1. **Duplicate Detection:**
   - System checks for existing Person by email (primary identifier)
   - If Person exists → Proceed to attachment
   - If Person does not exist → Create new Person (Section 3)

2. **App Context Attachment:**
   - Add app context to Person's `appContexts` array (or equivalent structure)
   - Initialize app-specific fields with defaults
   - **Do not duplicate core fields**

3. **Data Initialization:**
   - Core fields: Use existing values (no duplication)
   - App-specific fields: Initialize with defaults from app's type registry
   - Type assignment: Use app's `defaultType` if not specified

**Rule:** App context is attached to existing Person, never creates duplicate Person record.

#### Rule 6.2: What Data is Initialized

**Core Data (Never Initialized):**
- `firstName`, `lastName`, `email`, `phone` → Use existing values
- `address`, `avatar`, `notes` → Use existing values
- `createdAt`, `updatedAt` → Preserve original timestamps

**App-Specific Data (Initialized):**
- `type`: Use app's `defaultType` (e.g., Sales → `LEAD`, Helpdesk → `CONTACT`)
- `assignedTo`: Use current user (if has permission) or null
- App-specific fields: Initialize with empty values or app defaults
- `appContextAddedAt`: Timestamp when app context was attached

**Rule:** Only app-specific data is initialized. Core data is never duplicated.

#### Rule 6.3: What is Explicitly NOT Auto-Created

**Not Auto-Created:**

1. **Related Records:**
   - ❌ Do not auto-create tickets in Helpdesk
   - ❌ Do not auto-create deals in Sales
   - ❌ Do not auto-create projects in Projects
   - ✅ Only attach app context to Person

2. **App-Specific Workflows:**
   - ❌ Do not trigger onboarding workflows
   - ❌ Do not send welcome emails
   - ❌ Do not create default assignments
   - ✅ Only initialize app-specific fields

3. **Permissions:**
   - ❌ Do not grant app permissions to the person
   - ❌ Do not change person's role
   - ✅ Person remains a data record, not a user

**Rule:** App context attachment is minimal: only Person record is modified, no side effects.

#### Rule 6.4: Duplicate Creation Prevention

**Prevention Mechanisms:**

1. **Email-Based Deduplication:**
   - Primary identifier: `email` (case-insensitive)
   - Before creating: Check for existing Person with same email
   - If exists → Attach app context instead of creating

2. **User Confirmation (Optional):**
   - If duplicate detected → Show confirmation: "Person already exists. Add to Helpdesk app?"
   - User confirms → Attach app context
   - User cancels → Abort operation

3. **Automatic Attachment (If Configured):**
   - If duplicate detected and auto-attach enabled → Automatically attach app context
   - Log attachment for audit trail

**Rule:** Duplicate creation is prevented by email-based deduplication and app context attachment.

### Contract Enforcement

**Rule:** App context is additive, never duplicative.

**Validation Points:**
- ✅ App context attachment does not duplicate Person record
- ✅ Core fields are preserved, not reinitialized
- ✅ Only app-specific fields are initialized
- ✅ No side effects (related records, workflows, permissions)
- ✅ Duplicate detection prevents record duplication

---

## 7️⃣ Non-Goals & Explicit Exclusions

### Purpose
Explicitly state what this contract does not allow.

### Explicit Exclusions

#### Exclusion 1: No Global People Type Configuration
**What is Excluded:**
- ❌ Tenant-level type configuration
- ❌ Organization-level type customization
- ❌ User-defined type creation
- ❌ Type configuration UI in settings

**What is Allowed:**
- ✅ Platform-level type declarations (in `moduleProjections.js`)
- ✅ App-level type declarations (in app metadata)
- ✅ Type visibility filtering by app context

**Rationale:** Types are platform-level semantics. Apps declare how they see types, but types themselves are not configurable per-tenant.

#### Exclusion 2: No Merged Quick Create Forms
**What is Excluded:**
- ❌ Single form showing fields from multiple apps
- ❌ "Create in all apps" option
- ❌ Merged validation across apps
- ❌ App-agnostic quick create

**What is Allowed:**
- ✅ App-specific quick create forms
- ✅ App context selection before form display
- ✅ App-specific field sets and validation

**Rationale:** Quick create must run in exactly one app context. Merged forms would violate app isolation.

#### Exclusion 3: No App-Agnostic Creation
**What is Excluded:**
- ❌ Creating Person without app context
- ❌ "Global" Person creation
- ❌ Default app assumption
- ❌ Silent app selection

**What is Allowed:**
- ✅ Explicit app context selection
- ✅ App context from route or navigation intent
- ✅ User choice when ambiguous

**Rationale:** Every People action requires resolved app context. App-agnostic creation would violate this requirement.

#### Exclusion 4: No Silent App Selection
**What is Excluded:**
- ❌ Automatically selecting app without user awareness
- ❌ Defaulting to "most common" app
- ❌ Guessing app from user's recent activity
- ❌ Silent fallback to default app

**What is Allowed:**
- ✅ Explicit app selection dialog
- ✅ App context from unambiguous route
- ✅ App context from navigation intent metadata
- ✅ User confirmation for app selection

**Rationale:** App context must be explicit and deterministic. Silent selection would violate user intent and create ambiguity.

#### Exclusion 5: No Duplication of People Records
**What is Excluded:**
- ❌ Creating duplicate Person records for same email
- ❌ App-specific Person records (one per app)
- ❌ Merging Person records after creation
- ❌ Duplicate Person records in database

**What is Allowed:**
- ✅ Single Person record per email
- ✅ App context attachment to existing Person
- ✅ App-specific fields on same Person record
- ✅ Email-based deduplication

**Rationale:** People is a core entity with shared identity. Duplication would break data consistency and violate the single-source-of-truth principle.

### Contract Enforcement

**Validation Points:**
- ✅ No global type configuration exists
- ✅ No merged quick create forms exist
- ✅ No app-agnostic creation exists
- ✅ No silent app selection exists
- ✅ No duplicate Person records exist

---

## Success Criteria

The contract is complete if:

1. ✅ **Every People action has deterministic behavior**
   - No action executes without resolved app context
   - No action relies on implicit assumptions
   - All edge cases are handled explicitly

2. ✅ **Frontend and backend can implement without guessing**
   - All rules are explicit and testable
   - No "magical" behavior or hidden logic
   - All validation points are clear

3. ✅ **New apps can plug into People without changing existing logic**
   - New app declares types in type registry
   - New app declares allowed types in app metadata
   - Existing apps unaffected by new app addition

4. ✅ **No future developer needs to "interpret intent"**
   - All behavior is specified in this contract
   - No ambiguity in implementation
   - All edge cases are covered

---

## Implementation Notes

### Platform Metadata Files

**Type Registry:**
- File: `server/constants/moduleProjections.js`
- Structure: `PEOPLE.types` and `PEOPLE.apps[appKey].allowedTypes`

**App Context Resolution:**
- File: `server/middleware/resolveAppContextMiddleware.js`
- Logic: URL namespace mapping → `req.appKey`

**Permission Checking:**
- File: `server/middleware/checkPermissionMiddleware.js`
- Logic: App-aware permission checks using `req.appKey`

### Database Schema Implications

**People Model:**
- Core fields: Shared across all apps
- App-specific fields: Isolated per app (or stored in separate collection)
- App context tracking: `appContexts` array or equivalent

**Deduplication:**
- Email field: Unique index (case-insensitive)
- Primary identifier: Email address

### Frontend Implications

**Route Structure:**
- App-prefixed routes: `/sales/people`, `/helpdesk/people`
- Neutral routes: `/people` (requires app selection)

**Component Structure:**
- Core Information component: Shared
- App-specific sections: Isolated components per app
- App selector component: For ambiguous contexts

---

## Contract Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial contract definition |

---

**Last Updated:** January 2026  
**Status:** Specification Complete  
**Next Steps:** Implementation based on this contract

