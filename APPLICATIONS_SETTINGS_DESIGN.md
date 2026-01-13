# Applications Settings Design

## Objective
Design an Applications settings experience that treats each application as a first-class product while making its dependencies, status, and scope clear—without exposing platform internals.

---

## Design Principles

### 1. **Product-Oriented Language**
- Each app is presented as a complete product
- Focus on what the app does, not how it's built
- Business value over technical details

### 2. **Transparent Dependencies**
- Show which shared capabilities each app uses
- Dependencies are read-only (cannot be modified)
- Clear separation: platform capabilities vs app behavior

### 3. **Status Clarity**
- Clear visual indicators for Enabled, Disabled, Trial, Included
- Explain why an app cannot be disabled (if applicable)
- Status badges are informative, not technical

### 4. **Safe Configuration**
- Entry point to app-specific settings
- Cannot modify shared platform capabilities from app settings
- Clear boundaries between platform and app

---

## Applications Overview

### Available Applications
1. **Sales** - Customer relationship management and sales pipeline
2. **Helpdesk** - Customer support and ticket management
3. **Projects** - Project management and collaboration
4. **Audit** - Audit execution and compliance tracking
5. **Portal** - Customer self-service portal

---

## Part 1: Applications List View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Applications                                                │
│  Manage your business applications and their settings        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Sales Icon] Sales                    [Enabled ✓]   │  │
│  │  Customer relationship management and sales pipeline │  │
│  │                                                       │  │
│  │  Uses: People, Organizations, Events, Tasks, Forms  │  │
│  │                                                       │  │
│  │  [Configure Settings →]                              │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Helpdesk Icon] Helpdesk            [Trial ⏱️]     │  │
│  │  Customer support and ticket management              │  │
│  │                                                       │  │
│  │  Uses: People, Organizations, Tasks, Forms          │  │
│  │                                                       │  │
│  │  [Configure Settings →]                              │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Projects Icon] Projects              [Disabled]    │  │
│  │  Project management and collaboration                 │  │
│  │                                                       │  │
│  │  Uses: People, Organizations, Tasks, Events          │  │
│  │                                                       │  │
│  │  [Enable Application]                                │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ... (other applications)                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Card Components

Each application card displays:

1. **Application Icon** - Visual identifier (large, prominent)
2. **Application Name** - Product name
3. **Status Badge** - Enabled, Disabled, Trial, Included
4. **Description** - One-line explanation of what the app does
5. **Dependencies** - List of shared platform capabilities used
6. **Action Button** - "Configure Settings →" or "Enable Application"

### Visual Indicators

#### Status Badges

**Enabled ✓**
- **Color:** Green (#10B981)
- **Icon:** Checkmark
- **Text:** "Enabled"
- **Meaning:** App is active and available

**Disabled**
- **Color:** Gray (#6B7280)
- **Icon:** None or dash
- **Text:** "Disabled"
- **Meaning:** App is not active, can be enabled

**Trial ⏱️**
- **Color:** Blue (#3B82F6)
- **Icon:** Clock or timer
- **Text:** "Trial" or "Trial - X days left"
- **Meaning:** App is in trial period

**Included**
- **Color:** Purple (#8B5CF6)
- **Icon:** Star or included icon
- **Text:** "Included"
- **Meaning:** App is included in subscription, cannot be disabled

#### Dependencies Display

**Format:** "Uses: [Capability 1], [Capability 2], [Capability 3]"

**Visual Style:**
- Small, subtle text
- Gray color (#6B7280)
- Icons for each capability (optional)
- Read-only (not clickable)

**Example:**
```
Uses: 👥 People, 🏢 Organizations, 📅 Events, ✅ Tasks, 📋 Forms
```

---

## Part 2: Application Detail View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Applications                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Sales Icon] Sales                                         │
│  Customer relationship management and sales pipeline          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Status: Enabled ✓                                    │  │
│  │  This application is active and available to your team │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  About This Application                                      │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Sales helps you manage customer relationships, track       │
│  deals through your sales pipeline, and close more          │
│  business. It includes features for contact management,    │
│  deal tracking, pipeline management, and sales reporting. │
│                                                             │
│  Shared Capabilities Used                                    │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Sales uses the following shared platform capabilities:   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  👥 People                                            │  │
│  │  Used for contact and lead management                │  │
│  │  [View in Core Modules →]                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🏢 Organizations                                     │  │
│  │  Used for company and account management              │  │
│  │  [View in Core Modules →]                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  📅 Events                                            │  │
│  │  Used for calendar and event scheduling               │  │
│  │  [View in Core Modules →]                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  ✅ Tasks                                             │  │
│  │  Used for task and activity management                │  │
│  │  [View in Core Modules →]                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  📋 Forms                                             │  │
│  │  Used for data collection and form builder            │  │
│  │  [View in Core Modules →]                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Application Settings                                       │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Configure Sales-specific settings and behavior:             │
│                                                             │
│  [Open Sales Settings →]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detail View Components

#### 1. Header Section
- Application icon (large)
- Application name
- Description
- Back navigation

#### 2. Status Section
- Status badge (Enabled, Disabled, Trial, Included)
- Status explanation (one-line description)
- If disabled: "Enable Application" button
- If trial: Days remaining display

#### 3. About This Application
- Extended description
- Key features list
- Use cases
- Product-oriented language

#### 4. Shared Capabilities Used
- List of dependencies
- Each dependency shown as a card with:
  - Capability icon
  - Capability name
  - How it's used by this app
  - "View in Core Modules →" link (read-only)
- Clear message: "These are shared platform capabilities. They cannot be modified from application settings."

#### 5. Application Settings
- Entry point to app-specific settings
- Button: "Open [App Name] Settings →"
- Explanation: "Configure [App Name]-specific settings and behavior"
- Navigates to app's settings page (e.g., Sales Schema, Pipelines, etc.)

---

## Part 3: Status Explanations

### Enabled Status

**Visual:**
```
┌─────────────────────────────────────────────────────┐
│  Status: Enabled ✓                                  │
│  This application is active and available to your   │
│  team                                                │
└─────────────────────────────────────────────────────┘
```

**Explanation:**
- App is fully functional
- Users with access can use it
- Can be disabled (if not required)

**Actions Available:**
- Configure Settings
- Disable Application (if optional)

---

### Disabled Status

**Visual:**
```
┌─────────────────────────────────────────────────────┐
│  Status: Disabled                                    │
│  This application is not currently active            │
└─────────────────────────────────────────────────────┘
```

**Explanation:**
- App is not available
- Users cannot access it
- Can be enabled

**Actions Available:**
- Enable Application button

**Enable Flow:**
1. User clicks "Enable Application"
2. Confirmation modal:
   ```
   Enable Projects?
   
   This will make Projects available to users who have
   access to it. You can configure its settings after
   enabling.
   
   [Cancel] [Enable Projects]
   ```
3. If confirmed: App enabled, status changes to "Enabled"
4. Success toast: "Projects has been enabled"

---

### Trial Status

**Visual:**
```
┌─────────────────────────────────────────────────────┐
│  Status: Trial ⏱️                                    │
│  Trial period: 12 days remaining                     │
│  Upgrade to keep this application after trial ends   │
└─────────────────────────────────────────────────────┘
```

**Explanation:**
- App is in trial period
- Shows days remaining
- Will expire if not upgraded
- Cannot be disabled during trial

**Actions Available:**
- Configure Settings
- Upgrade to Full Version (links to billing)

**Note:** Upgrade link goes to Billing & Subscription (not shown in this screen per constraints)

---

### Included Status

**Visual:**
```
┌─────────────────────────────────────────────────────┐
│  Status: Included                                    │
│  This application is included in your subscription   │
│  and cannot be disabled                              │
└─────────────────────────────────────────────────────┘
```

**Explanation:**
- App is part of subscription
- Cannot be disabled
- Always available

**Actions Available:**
- Configure Settings only
- No disable option

**Why Cannot Disable:**
- Clear message: "This application is included in your subscription and cannot be disabled"
- Visual indicator: No disable button, or disabled button with explanation

---

## Part 4: Dependencies Presentation

### Non-Technical Language

**Instead of:**
- "Dependencies"
- "Module dependencies"
- "Platform modules"
- "Required capabilities"

**Use:**
- "Uses"
- "Shared capabilities used"
- "Platform capabilities"
- "Built on"

### Dependency Cards

Each dependency card shows:

1. **Capability Icon** - Visual identifier
2. **Capability Name** - Clear name (People, Organizations, etc.)
3. **Usage Description** - How this app uses the capability
4. **Link to Core Modules** - "View in Core Modules →" (read-only)

**Example:**
```
┌─────────────────────────────────────────────────────┐
│  👥 People                                           │
│  Used for contact and lead management                │
│  [View in Core Modules →]                            │
└─────────────────────────────────────────────────────┘
```

**Visual Style:**
- Light background
- Subtle border
- Read-only (cannot edit)
- Link to Core Modules (for reference only)

### Dependency Explanation

**Message at top of dependencies section:**
```
Sales uses the following shared platform capabilities. 
These capabilities are managed separately in Core Modules 
and cannot be modified from application settings.
```

**Purpose:**
- Explains why dependencies are read-only
- Points to where they can be managed (Core Modules)
- Reinforces separation: platform vs app

---

## Part 5: Application Settings Entry Point

### Settings Button

**Location:** Bottom of detail view

**Visual:**
```
┌─────────────────────────────────────────────────────┐
│  Application Settings                                │
│  ───────────────────────────────────────────────────│
│                                                       │
│  Configure Sales-specific settings and behavior:     │
│                                                       │
│  [Open Sales Settings →]                            │
└─────────────────────────────────────────────────────┘
```

**Behavior:**
- Navigates to app-specific settings page
- For Sales: Opens Sales settings (Schema, Pipelines, Playbooks, etc.)
- For Helpdesk: Opens Helpdesk settings
- For Projects: Opens Projects settings
- etc.

**Separation:**
- App settings are separate from platform capabilities
- Cannot modify shared capabilities from app settings
- Clear boundary: app behavior vs platform infrastructure

---

## Example: Sales Application

### List View Card
```
┌─────────────────────────────────────────────────────┐
│  💼 Sales                        [Enabled ✓]         │
│  Customer relationship management and sales pipeline  │
│                                                       │
│  Uses: People, Organizations, Events, Tasks, Forms  │
│                                                       │
│  [Configure Settings →]                              │
└─────────────────────────────────────────────────────┘
```

### Detail View - Status
```
┌─────────────────────────────────────────────────────┐
│  Status: Enabled ✓                                   │
│  This application is active and available to your    │
│  team                                                │
└─────────────────────────────────────────────────────┘
```

### Detail View - Dependencies
```
Shared Capabilities Used
───────────────────────────────────────────────────────

Sales uses the following shared platform capabilities. 
These capabilities are managed separately in Core Modules 
and cannot be modified from application settings.

┌─────────────────────────────────────────────────────┐
│  👥 People                                            │
│  Used for contact and lead management                 │
│  [View in Core Modules →]                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  🏢 Organizations                                     │
│  Used for company and account management              │
│  [View in Core Modules →]                            │
└─────────────────────────────────────────────────────┘

... (other dependencies)
```

### Detail View - Settings Entry
```
┌─────────────────────────────────────────────────────┐
│  Application Settings                                │
│  ───────────────────────────────────────────────────│
│                                                       │
│  Configure Sales-specific settings and behavior:     │
│                                                       │
│  [Open Sales Settings →]                            │
└─────────────────────────────────────────────────────┘
```

---

## Example: Projects Application (Disabled)

### List View Card
```
┌─────────────────────────────────────────────────────┐
│  📊 Projects                      [Disabled]         │
│  Project management and collaboration                │
│                                                       │
│  Uses: People, Organizations, Tasks, Events           │
│                                                       │
│  [Enable Application]                                │
└─────────────────────────────────────────────────────┘
```

### Detail View - Status
```
┌─────────────────────────────────────────────────────┐
│  Status: Disabled                                    │
│  This application is not currently active            │
│                                                       │
│  [Enable Application]                                │
└─────────────────────────────────────────────────────┘
```

### Enable Flow
1. User clicks "Enable Application"
2. Confirmation modal appears
3. If confirmed: App enabled, status changes to "Enabled"
4. Success toast: "Projects has been enabled"

---

## Example: Helpdesk Application (Trial)

### List View Card
```
┌─────────────────────────────────────────────────────┐
│  🎧 Helpdesk                    [Trial ⏱️]          │
│  Customer support and ticket management              │
│                                                       │
│  Uses: People, Organizations, Tasks, Forms           │
│                                                       │
│  [Configure Settings →]                              │
└─────────────────────────────────────────────────────┘
```

### Detail View - Status
```
┌─────────────────────────────────────────────────────┐
│  Status: Trial ⏱️                                    │
│  Trial period: 12 days remaining                     │
│  Upgrade to keep this application after trial ends   │
└─────────────────────────────────────────────────────┘
```

---

## Safety Mechanisms

### 1. Read-Only Dependencies
- Dependencies are displayed but not editable
- "View in Core Modules →" links for reference
- Clear message: "Cannot be modified from application settings"

### 2. Status Protection
- Included apps cannot be disabled (no button)
- Required apps cannot be disabled (explanation shown)
- Trial apps cannot be disabled during trial

### 3. Clear Boundaries
- App settings are separate from platform capabilities
- Cannot modify shared capabilities from app settings
- Clear separation: "Application Settings" vs "Core Modules"

### 4. Confirmation for Enable/Disable
- Confirmation modal before enabling disabled apps
- Confirmation modal before disabling enabled apps (if allowed)
- Clear impact explanation

---

## Success Criteria Validation

### ✅ Admin understands each app as an independent product
- **Evidence:** Each app presented as complete product with description
- **Mechanism:** Product-oriented language, app-specific settings entry point

### ✅ It is clear why an app cannot be disabled (if applicable)
- **Evidence:** Status section explains why (Included, Required, Trial)
- **Mechanism:** Status badges + explanations + no disable button

### ✅ Relationship between apps and shared capabilities feels transparent and safe
- **Evidence:** Dependencies clearly shown, read-only, link to Core Modules
- **Mechanism:** Clear separation message + read-only dependencies + safe boundaries

---

## Implementation Notes

### Data Model
Each application needs:
- `appKey` - Unique identifier (e.g., "SALES")
- `name` - Display name (e.g., "Sales")
- `description` - One-line description
- `extendedDescription` - Full description for detail view
- `icon` - Icon identifier
- `status` - "enabled", "disabled", "trial", "included"
- `trialDaysRemaining` - If status is "trial"
- `dependencies` - Array of capability keys:
  ```javascript
  {
    capabilityKey: "people",
    usage: "Used for contact and lead management"
  }
  ```

### API Endpoints
- `GET /api/settings/applications` - List all applications
- `GET /api/settings/applications/:appKey` - Get application details
- `POST /api/settings/applications/:appKey/enable` - Enable application
- `POST /api/settings/applications/:appKey/disable` - Disable application (if allowed)

### Validation Rules
- Cannot disable if `status: "included"`
- Cannot disable if `status: "trial"`
- Cannot disable if `required: true`
- Must confirm before enable/disable

---

## Next Steps

1. **Create ApplicationsList component** - List view with cards
2. **Create ApplicationDetail component** - Detail view with status, dependencies, settings
3. **Add status badges** - Enabled, Disabled, Trial, Included
4. **Implement dependency display** - Read-only capability cards
5. **Add enable/disable flows** - With confirmations
6. **Link to app-specific settings** - Entry point to app settings
7. **Link to Core Modules** - From dependency cards
8. **User testing** - Validate clarity with non-technical admins

