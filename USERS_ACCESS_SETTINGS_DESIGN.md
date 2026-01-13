# Users & Access Settings Design

## Objective
Design a Users & Access settings experience that makes permissions understandable, app-scoped, and safe—without exposing legacy complexity or overwhelming administrators.

---

## Design Principles

### 1. **Application-Scoped Permissions**
- Permissions grouped by application
- Users only see permissions for apps they have access to
- Clear separation: platform vs app permissions

### 2. **Human-Friendly Language**
- Business terms (not technical)
- Clear action descriptions
- Grouped logically

### 3. **Legacy Visibility Without Encouragement**
- Legacy permissions marked visibly
- Discouraged but not hidden
- Clear migration path

### 4. **Safety First**
- Cannot break system
- Clear impact of changes
- Confirmation for destructive actions

---

## Part 1: Users List View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Users & Access                                             │
│  Manage users, roles, and permissions for your organization │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [User Management] [Roles & Permissions] [Groups & Teams] │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  👤 John Smith                    [Sales Manager]    │  │
│  │  john.smith@company.com                             │  │
│  │                                                       │  │
│  │  Access: Sales, Helpdesk                             │  │
│  │  Status: Active                                      │  │
│  │                                                       │  │
│  │  [Edit User →]                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  👤 Sarah Johnson              [Platform Admin]      │  │
│  │  sarah@company.com                                   │  │
│  │                                                       │  │
│  │  Access: All Applications                            │  │
│  │  Status: Active                                      │  │
│  │                                                       │  │
│  │  [Edit User →]                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ... (other users)                                          │
│                                                             │
│  [+ Invite User]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Card Components

Each user card displays:

1. **User Avatar** - Profile picture or initials
2. **User Name** - Full name
3. **Email** - User email
4. **Role Badge** - Role name with color
5. **Access Badges** - Applications user can access
6. **Status** - Active, Inactive, Suspended
7. **Action Button** - "Edit User →"

### Visual Indicators

#### Access Badges
- Color-coded badges for each application
- Sales = Blue
- Helpdesk = Green
- Projects = Purple
- Audit = Orange
- Portal = Teal
- "All Applications" = Gold (for platform admins)

#### Status Badges
- **Active** - Green
- **Inactive** - Gray
- **Suspended** - Red

---

## Part 2: User Detail View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Users                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 John Smith                                               │
│  john.smith@company.com                                     │
│  Sales Manager                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Status: Active                                      │  │
│  │  Last login: 2 hours ago                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Application Access                                         │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  This user can access the following applications:          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Sales Icon] Sales                                  │  │
│  │  [✓ Enabled]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Helpdesk Icon] Helpdesk                            │  │
│  │  [✓ Enabled]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Projects Icon] Projects                            │  │
│  │  [✗ Not Enabled]                                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Permissions                                                │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Platform Permissions                                       │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  These permissions apply across all applications:          │
│                                                             │
│  ☐ Invite users                                            │
│  ☐ Manage organization settings                            │
│  ☐ View billing information                                │
│  ☐ Manage integrations                                     │
│                                                             │
│  Sales Application Permissions                              │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  These permissions only apply to the Sales application:    │
│                                                             │
│  Contacts                                                   │
│  ☑ View contacts                                           │
│  ☑ Create contacts                                         │
│  ☑ Edit contacts                                           │
│  ☐ Delete contacts                                         │
│  ☑ View all contacts (not just assigned)                  │
│  ☐ Export contact data                                    │
│                                                             │
│  Deals                                                      │
│  ☑ View deals                                              │
│  ☑ Create deals                                            │
│  ☑ Edit deals                                              │
│  ☐ Delete deals                                            │
│  ☑ View all deals                                         │
│  ☐ Export deal data                                        │
│                                                             │
│  Helpdesk Application Permissions                           │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  These permissions only apply to the Helpdesk application:  │
│                                                             │
│  Tickets                                                    │
│  ☑ View tickets                                            │
│  ☑ Create tickets                                          │
│  ☑ Edit tickets                                            │
│  ☐ Delete tickets                                          │
│  ☑ Assign tickets                                          │
│  ☐ Close tickets                                           │
│                                                             │
│  [Save Changes]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detail View Components

#### 1. Header Section
- User avatar (large)
- User name
- Email
- Role
- Back navigation

#### 2. Status Section
- Status badge
- Last login time
- Account creation date

#### 3. Application Access Section
- List of applications
- Enabled/Disabled toggle for each
- Clear indication of access

#### 4. Permissions Section

**Platform Permissions:**
- Grouped at top
- Clear label: "These permissions apply across all applications"
- Examples:
  - Invite users
  - Manage organization settings
  - View billing information
  - Manage integrations

**Application Permissions:**
- Grouped by application
- Only shows apps user has access to
- Clear label: "These permissions only apply to the [App Name] application"
- Grouped by module within app:
  - Contacts (Sales)
  - Deals (Sales)
  - Tickets (Helpdesk)
  - etc.

**Legacy Permissions (if present):**
- Collapsed by default
- Warning banner: "⚠️ Legacy Permissions"
- Message: "These are old-style permissions. Consider migrating to app-scoped permissions."
- Expandable section
- Read-only (cannot edit)

---

## Part 3: Roles & Permissions View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Roles & Permissions                                        │
│  Manage roles and their permissions                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Sales Manager Icon] Sales Manager                  │  │
│  │  For users who manage sales activities               │  │
│  │                                                       │  │
│  │  Used by: 5 users                                     │  │
│  │                                                       │  │
│  │  [Edit Role →]                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Platform Admin Icon] Platform Admin                │  │
│  │  Full access to platform and all applications        │  │
│  │                                                       │  │
│  │  Used by: 2 users                                     │  │
│  │                                                       │  │
│  │  [Edit Role →]                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  [+ Create Role]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Role Card Components

1. **Role Icon** - Visual identifier
2. **Role Name** - Clear name
3. **Description** - What the role is for
4. **User Count** - How many users have this role
5. **Action Button** - "Edit Role →"

---

## Part 4: Role Detail View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Roles                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Sales Manager Icon] Sales Manager                         │
│  For users who manage sales activities                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Used by: 5 users                                    │  │
│  │  [View Users →]                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Permissions                                                │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Platform Permissions                                       │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  These permissions apply across all applications:          │
│                                                             │
│  ☐ Invite users                                            │
│  ☐ Manage organization settings                            │
│  ☐ View billing information                                │
│  ☐ Manage integrations                                     │
│                                                             │
│  Sales Application Permissions                              │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  These permissions only apply to the Sales application:    │
│                                                             │
│  Contacts                                                   │
│  ☑ View contacts                                           │
│  ☑ Create contacts                                         │
│  ☑ Edit contacts                                           │
│  ☐ Delete contacts                                         │
│  ☑ View all contacts                                       │
│  ☐ Export contact data                                     │
│                                                             │
│  Deals                                                      │
│  ☑ View deals                                              │
│  ☑ Create deals                                            │
│  ☑ Edit deals                                              │
│  ☐ Delete deals                                            │
│  ☑ View all deals                                         │
│  ☐ Export deal data                                        │
│                                                             │
│  Helpdesk Application Permissions                           │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  ⚠️ This role does not have access to Helpdesk.          │
│  Enable Helpdesk access for this role to configure         │
│  Helpdesk permissions.                                     │
│                                                             │
│  [Save Changes]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Role Detail Components

#### 1. Header Section
- Role icon
- Role name
- Description
- Back navigation

#### 2. User Count Section
- Number of users with this role
- "View Users →" link

#### 3. Permissions Section

**Platform Permissions:**
- Grouped at top
- Clear label
- Checkboxes for each permission

**Application Permissions:**
- Grouped by application
- Only shows apps that are enabled for this role
- Clear label per app
- Grouped by module within app
- If app not enabled: Warning message with explanation

**Legacy Permissions (if present):**
- Collapsed by default
- Warning banner
- Message about migration
- Expandable section
- Read-only

---

## Part 5: Permission Grouping

### Platform Permissions

**Group:** Platform Permissions

**Label:** "These permissions apply across all applications"

**Permissions:**
- Invite users
- Manage organization settings
- View billing information
- Manage integrations
- Manage core modules (advanced)

**Visual:**
- Grouped at top
- Clear separation from app permissions
- Platform icon/badge

---

### Application Permissions

**Group:** [App Name] Application Permissions

**Label:** "These permissions only apply to the [App Name] application"

**Structure:**
- Grouped by application
- Only shows apps user/role has access to
- Within each app, grouped by module:
  - Contacts (Sales)
  - Deals (Sales)
  - Tickets (Helpdesk)
  - Projects (Projects)
  - etc.

**Visual:**
- App icon/badge
- Clear app name
- Module sections within app

---

### Legacy Permissions

**Group:** Legacy Permissions (Collapsed by default)

**Warning Banner:**
```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Legacy Permissions                               │
│                                                       │
│  These are old-style permissions that are not        │
│  grouped by application. Consider migrating to      │
│  app-scoped permissions for better organization.    │
│                                                       │
│  [Expand to view] [Migrate to App Permissions]      │
└─────────────────────────────────────────────────────┘
```

**When Expanded:**
- Shows legacy permission structure
- Read-only (cannot edit)
- Migration button available

**Visual:**
- Grayed out
- Warning icon
- Discouraged but visible

---

## Part 6: Permission Language

### Human-Friendly Terms

**Instead of:**
- "contacts.view"
- "deals.create"
- "tickets.delete"

**Use:**
- "View contacts"
- "Create deals"
- "Delete tickets"

### Grouped by Action

**View:**
- View contacts
- View deals
- View tickets

**Create:**
- Create contacts
- Create deals
- Create tickets

**Edit:**
- Edit contacts
- Edit deals
- Edit tickets

**Delete:**
- Delete contacts
- Delete deals
- Delete tickets

**Advanced:**
- View all contacts (not just assigned)
- Export contact data
- Manage pipelines
- etc.

---

## Example: Sales Manager Role

### Role Card
```
┌─────────────────────────────────────────────────────┐
│  💼 Sales Manager                                   │
│  For users who manage sales activities              │
│                                                      │
│  Used by: 5 users                                    │
│                                                      │
│  [Edit Role →]                                      │
└─────────────────────────────────────────────────────┘
```

### Role Detail - Platform Permissions
```
Platform Permissions
───────────────────────────────────────────────────────

These permissions apply across all applications:

☐ Invite users
☐ Manage organization settings
☐ View billing information
☐ Manage integrations
```

### Role Detail - Sales Permissions
```
Sales Application Permissions
───────────────────────────────────────────────────────

These permissions only apply to the Sales application:

Contacts
☑ View contacts
☑ Create contacts
☑ Edit contacts
☐ Delete contacts
☑ View all contacts
☐ Export contact data

Deals
☑ View deals
☑ Create deals
☑ Edit deals
☐ Delete deals
☑ View all deals
☐ Export deal data
```

### Role Detail - Helpdesk (Not Enabled)
```
Helpdesk Application Permissions
───────────────────────────────────────────────────────

⚠️ This role does not have access to Helpdesk.
Enable Helpdesk access for this role to configure
Helpdesk permissions.
```

---

## Safety Mechanisms

### 1. App Scoping
- Only shows permissions for apps user/role has access to
- Cannot configure permissions for apps not enabled
- Clear message when app not enabled

### 2. Platform Separation
- Platform permissions clearly separated
- Cannot accidentally modify platform permissions
- Clear labels

### 3. Legacy Handling
- Legacy permissions visible but discouraged
- Read-only (cannot edit)
- Migration path available
- Clear warnings

### 4. Confirmation for Changes
- Confirmation before saving
- Impact explanation
- Success feedback

---

## Success Criteria Validation

### ✅ Admin can confidently assign access without fear of breaking the system
- **Evidence:** Clear app scoping, platform separation, confirmations
- **Mechanism:** Only shows relevant permissions, clear labels, safe boundaries

### ✅ It is obvious which permissions affect which application
- **Evidence:** Permissions grouped by app, clear labels, app icons
- **Mechanism:** Application-scoped grouping + clear labels + visual separation

### ✅ Permission model feels consistent with the rest of Settings
- **Evidence:** Same visual language, grouping patterns, safety mechanisms
- **Mechanism:** Consistent design patterns + app-scoped structure + platform separation

---

## Implementation Notes

### Data Model
Each role needs:
- `name` - Role name
- `description` - Role description
- `appPermissions` - App-scoped permissions:
  ```javascript
  {
    'SALES': {
      'contacts': { view: true, create: true, ... },
      'deals': { view: true, create: true, ... }
    },
    'HELPDESK': {
      'tickets': { view: true, create: true, ... }
    }
  }
  ```
- `platformPermissions` - Platform-level permissions:
  ```javascript
  {
    inviteUsers: false,
    manageSettings: false,
    viewBilling: false,
    manageIntegrations: false
  }
  ```
- `legacyPermissions` - Legacy permissions (if present, deprecated)

### API Endpoints
- `GET /api/settings/users` - List all users
- `GET /api/settings/users/:userId` - Get user details
- `PUT /api/settings/users/:userId` - Update user
- `GET /api/settings/roles` - List all roles
- `GET /api/settings/roles/:roleId` - Get role details
- `PUT /api/settings/roles/:roleId` - Update role

### Validation Rules
- Cannot assign permissions for apps user doesn't have access to
- Platform permissions apply to all apps
- Legacy permissions are read-only

---

## Next Steps

1. **Create UsersList component** - List view with cards
2. **Create UserDetail component** - Detail view with permissions
3. **Create RolesList component** - List view with role cards
4. **Create RoleDetail component** - Detail view with permissions
5. **Add permission grouping** - Platform vs app permissions
6. **Add legacy permissions handling** - Warning banner, read-only
7. **Add app scoping** - Only show relevant permissions
8. **User testing** - Validate clarity with non-technical admins

