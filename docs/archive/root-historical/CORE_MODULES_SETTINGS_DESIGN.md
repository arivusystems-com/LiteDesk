# Core Modules Settings Design

## Objective
Design a Core Modules settings experience that makes shared platform capabilities visible, understandable, and safe to manage—without exposing internal architecture or allowing destructive actions.

---

## Design Principles

### 1. **Safety First**
- Core capabilities cannot be deleted or renamed
- Required applications are locked and not toggleable
- Clear visual indicators for read-only vs configurable states
- Impact warnings before any changes

### 2. **Clarity Through Visual Language**
- Platform ownership clearly indicated
- Application usage visually represented
- Required vs optional clearly distinguished
- Locked vs configurable states obvious

### 3. **Non-Technical Language**
- "Shared capability" instead of "platform module"
- "Used by" instead of "app dependencies"
- "Required" vs "Optional" instead of technical flags
- Impact explanations in plain language

---

## Core Modules Overview

### Platform-Owned Shared Capabilities
These are the core entities shared across applications:

1. **People** - Contact and lead management
2. **Organizations** - Company and account management
3. **Events** - Calendar and event scheduling
4. **Forms** - Data collection and form builder
5. **Tasks** - Task and activity management
6. **Items** - Product and service catalog
7. **Reports** - Reporting and analytics

---

## Part 1: Modules List View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Core Modules                                                │
│  Shared capabilities used across your business applications │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Icon] People                                        │  │
│  │ Contact and lead management                          │  │
│  │                                                       │  │
│  │ Used by: [Sales] [Helpdesk] [Audit] [Portal]        │  │
│  │                                                       │  │
│  │ [View Details →]                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Icon] Organizations                                 │  │
│  │ Company and account management                        │  │
│  │                                                       │  │
│  │ Used by: [Sales] [Helpdesk] [Projects] [Portal]    │  │
│  │                                                       │  │
│  │ [View Details →]                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ... (other modules)                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Card Components

Each module card displays:

1. **Module Icon** - Visual identifier
2. **Module Name** - Clear, non-technical name
3. **Description** - One-line explanation of what it does
4. **Used By Badges** - Visual list of applications using this capability
5. **View Details Link** - Navigate to detail view

### Visual Indicators

#### Platform Ownership Badge
- Small badge: "Platform Capability"
- Color: Neutral gray/blue
- Position: Top-right of card
- Tooltip: "This is a shared platform capability that cannot be deleted"

#### Application Usage Badges
- Color-coded badges for each application
- Sales = Blue
- Helpdesk = Green
- Projects = Purple
- Audit = Orange
- Portal = Teal

#### Required vs Optional Indicator
- If all apps are required: "Required by all applications" (gray text)
- If some optional: Show toggleable apps with switches (in detail view only)

---

## Part 2: Module Detail View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Core Modules                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Icon] People                                              │
│  Contact and lead management                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Platform Capability                                   │  │
│  │ This is a shared platform capability. It cannot be   │  │
│  │ deleted or renamed, and is available to all          │  │
│  │ applications in your organization.                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Application Usage                                          │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Sales Icon] Sales                                   │  │
│  │ Required - Used for contact management and leads     │  │
│  │ [🔒 Locked]                                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Helpdesk Icon] Helpdesk                             │  │
│  │ Required - Used for customer support records         │  │
│  │ [🔒 Locked]                                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Audit Icon] Audit                                   │  │
│  │ Optional - Used for auditor contact information      │  │
│  │ [Toggle Switch: ON]                                  │  │
│  │                                                       │  │
│  │ ⚠️ Disabling will remove People access from Audit    │  │
│  │    app. This cannot be undone.                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Portal Icon] Portal                                 │  │
│  │ Optional - Used for customer profile management      │  │
│  │ [Toggle Switch: OFF]                                 │  │
│  │                                                       │  │
│  │ ℹ️ Enable to allow Portal users to manage their     │  │
│  │    contact information.                              │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Projects Icon] Projects                             │  │
│  │ Not Used - This application does not use People      │  │
│  │ [Disabled]                                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detail View Components

#### 1. Header Section
- Module icon (large)
- Module name
- Description
- Back navigation

#### 2. Platform Capability Info Box
- Explains what "platform capability" means
- States that it cannot be deleted or renamed
- Explains it's available to all applications
- Visual style: Light blue/gray background, informational icon

#### 3. Application Usage List
Each application card shows:

**For Required Applications:**
- Application icon and name
- Status: "Required"
- Explanation: Why it's required
- Lock icon: 🔒 (visual indicator)
- No toggle (disabled/grayed out)

**For Optional Applications (Currently Enabled):**
- Application icon and name
- Status: "Optional"
- Explanation: How it's used
- Toggle switch: ON (enabled)
- Warning message: Impact of disabling
- Confirmation required before disabling

**For Optional Applications (Currently Disabled):**
- Application icon and name
- Status: "Optional"
- Explanation: How it could be used
- Toggle switch: OFF (disabled)
- Info message: Benefit of enabling

**For Applications Not Using This Capability:**
- Application icon and name
- Status: "Not Used"
- Explanation: Why it's not used
- Disabled state (grayed out)
- No toggle available

---

## Part 3: Visual Language

### Color Coding

#### Platform Ownership
- **Color:** Neutral blue-gray (#4B5563 or similar)
- **Icon:** Shield or platform icon
- **Badge Text:** "Platform Capability"
- **Meaning:** This is owned by the platform, not by any specific app

#### Application States

**Required (Locked)**
- **Color:** Gray (#6B7280)
- **Icon:** 🔒 Lock icon
- **Visual:** Card has subtle gray border
- **Toggle:** Disabled/grayed out
- **Meaning:** This app must use this capability

**Optional (Enabled)**
- **Color:** Green (#10B981) when ON
- **Icon:** Toggle switch in ON position
- **Visual:** Card has green accent border
- **Toggle:** Active, can be toggled OFF
- **Meaning:** This app can use this capability, currently enabled

**Optional (Disabled)**
- **Color:** Gray (#9CA3AF) when OFF
- **Icon:** Toggle switch in OFF position
- **Visual:** Card has gray border
- **Toggle:** Active, can be toggled ON
- **Meaning:** This app can use this capability, currently disabled

**Not Used**
- **Color:** Light gray (#E5E7EB)
- **Icon:** None or dash icon
- **Visual:** Card is grayed out, lower opacity
- **Toggle:** Not present
- **Meaning:** This app doesn't use this capability

### Icons and Symbols

#### Lock Icon (🔒)
- **Usage:** Required applications
- **Meaning:** Cannot be changed
- **Color:** Gray
- **Size:** Small, inline with text

#### Toggle Switch
- **ON State:** Green, right position
- **OFF State:** Gray, left position
- **Disabled State:** Grayed out, cannot be clicked
- **Animation:** Smooth transition when toggling

#### Warning Icon (⚠️)
- **Usage:** Before disabling optional capability
- **Meaning:** Action has consequences
- **Color:** Amber/yellow (#F59E0B)

#### Info Icon (ℹ️)
- **Usage:** Explaining optional capabilities
- **Meaning:** Informational, not critical
- **Color:** Blue (#3B82F6)

#### Platform Badge
- **Icon:** Shield or grid icon
- **Text:** "Platform Capability"
- **Position:** Top-right of cards
- **Style:** Small, subtle badge

---

## Interaction Patterns

### Toggling Optional Applications

#### When Enabling
1. User clicks toggle switch (OFF → ON)
2. Switch animates to ON position
3. Card border changes to green accent
4. Info message appears: "People capability is now available in Portal"
5. Change is saved immediately (optimistic update)
6. Success toast: "Portal can now use People"

#### When Disabling
1. User clicks toggle switch (ON → OFF)
2. **Confirmation modal appears:**
   ```
   Disable People in Audit?
   
   This will remove People access from the Audit 
   application. Audit users will no longer be able 
   to view or manage contact information.
   
   This action cannot be undone.
   
   [Cancel] [Disable People in Audit]
   ```
3. If confirmed:
   - Switch animates to OFF position
   - Card border changes to gray
   - Warning message appears
   - Change is saved
   - Success toast: "People disabled in Audit"
4. If cancelled:
   - Switch returns to ON position
   - No changes made

### Viewing Details
1. User clicks "View Details →" on module card
2. Navigate to detail view
3. Detail view shows full application usage breakdown
4. User can toggle optional applications
5. User can see impact of changes

### Navigation
- **List → Detail:** Click "View Details →"
- **Detail → List:** Click "← Back to Core Modules"
- **Breadcrumb:** Settings > Platform > Core Modules > [Module Name]

---

## Example: People Module

### List View Card
```
┌─────────────────────────────────────────────────────┐
│  👥 People                    [Platform Capability] │
│  Contact and lead management                         │
│                                                       │
│  Used by: [Sales] [Helpdesk] [Audit] [Portal]       │
│                                                       │
│  [View Details →]                                    │
└─────────────────────────────────────────────────────┘
```

### Detail View - Required Application
```
┌─────────────────────────────────────────────────────┐
│  [Sales Icon] Sales                                  │
│  Required - Used for contact management and leads    │
│  [🔒 Locked]                                         │
└─────────────────────────────────────────────────────┘
```

### Detail View - Optional Application (Enabled)
```
┌─────────────────────────────────────────────────────┐
│  [Audit Icon] Audit                                  │
│  Optional - Used for auditor contact information     │
│  [Toggle: ON ✓]                                     │
│                                                       │
│  ⚠️ Disabling will remove People access from Audit │
│     app. This cannot be undone.                      │
└─────────────────────────────────────────────────────┘
```

### Detail View - Optional Application (Disabled)
```
┌─────────────────────────────────────────────────────┐
│  [Portal Icon] Portal                                │
│  Optional - Used for customer profile management     │
│  [Toggle: OFF]                                       │
│                                                       │
│  ℹ️ Enable to allow Portal users to manage their    │
│     contact information.                             │
└─────────────────────────────────────────────────────┘
```

### Detail View - Not Used
```
┌─────────────────────────────────────────────────────┐
│  [Projects Icon] Projects                            │
│  Not Used - This application does not use People    │
│  [Disabled]                                          │
└─────────────────────────────────────────────────────┘
```

---

## Safety Mechanisms

### 1. Confirmation for Disabling
- **Trigger:** User attempts to disable optional capability
- **Modal:** Clear explanation of impact
- **Actions:** Cancel (safe) or Confirm (destructive)
- **Style:** Destructive action button (red) for confirmation

### 2. Read-Only Indicators
- **Lock icon** for required applications
- **Disabled toggle** (visual + functional)
- **Grayed out styling** for locked states
- **Tooltip:** "This is required and cannot be changed"

### 3. Impact Warnings
- **Before disabling:** Show what will break
- **After disabling:** Show what was removed
- **Clear language:** "Users in Audit will no longer be able to..."

### 4. Platform Protection
- **No delete button** for core modules
- **No rename option** for core modules
- **Platform badge** indicates ownership
- **Info box** explains platform capabilities

---

## Success Criteria Validation

### ✅ An admin understands what a "shared capability" is without documentation
- **Platform Capability badge** is visible and labeled
- **Info box** in detail view explains platform ownership
- **Visual grouping** shows these are different from app-specific features
- **Language:** "Shared capability" used consistently

### ✅ No admin can accidentally break another application
- **Required apps are locked** (no toggle, clear lock icon)
- **Confirmation modal** before disabling optional apps
- **Impact warnings** explain consequences
- **Visual distinction** between required and optional

### ✅ The platform's core infrastructure feels intentional and protected
- **Platform badge** indicates ownership
- **Lock icons** show what cannot be changed
- **Professional styling** (not cluttered, clear hierarchy)
- **No destructive actions** visible for core modules
- **Clear explanations** of why things are locked

---

## Implementation Notes

### Data Model
Each core module needs:
- `moduleKey` - Unique identifier (e.g., "people")
- `name` - Display name (e.g., "People")
- `description` - One-line description
- `icon` - Icon identifier
- `applications` - Array of app usage:
  ```javascript
  {
    appKey: "SALES",
    required: true,  // or false
    enabled: true,   // only if required: false
    usage: "Used for contact management and leads"
  }
  ```

### API Endpoints
- `GET /api/settings/core-modules` - List all core modules
- `GET /api/settings/core-modules/:moduleKey` - Get module details
- `PATCH /api/settings/core-modules/:moduleKey/applications/:appKey` - Toggle optional app usage

### Validation Rules
- Cannot disable if `required: true`
- Cannot delete core modules
- Cannot rename core modules
- Must confirm before disabling optional apps

---

## Next Steps

1. **Create CoreModulesList component** - List view with cards
2. **Create CoreModuleDetail component** - Detail view with app usage
3. **Add confirmation modal** - For disabling optional apps
4. **Implement API endpoints** - Backend support for toggling
5. **Add visual indicators** - Icons, badges, colors
6. **Test safety mechanisms** - Ensure no accidental breaks
7. **User testing** - Validate clarity with non-technical admins

