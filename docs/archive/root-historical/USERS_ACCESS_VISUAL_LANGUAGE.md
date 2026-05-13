# Users & Access Settings - Visual Language Reference

## Quick Reference: Permission Grouping

### Platform Permissions
- **Group:** Platform Permissions
- **Label:** "These permissions apply across all applications"
- **Location:** Top of permissions section
- **Icon:** Platform/shield icon
- **Examples:** Invite users, Manage settings, View billing

### Application Permissions
- **Group:** [App Name] Application Permissions
- **Label:** "These permissions only apply to the [App Name] application"
- **Location:** Below platform permissions
- **Icon:** App-specific icon
- **Structure:** Grouped by app, then by module within app

### Legacy Permissions
- **Group:** Legacy Permissions (Collapsed)
- **Warning:** "⚠️ Legacy Permissions"
- **Status:** Read-only, discouraged
- **Visual:** Grayed out, warning banner

---

## User List View Structure

```
Card Components:
1. User Avatar
2. User Name
3. Email
4. Role Badge
5. Access Badges (apps)
6. Status Badge
7. Action Button ("Edit User →")
```

---

## User Detail View Structure

```
Header:
- User avatar (large)
- User name
- Email
- Role
- Back navigation

Status Section:
- Status badge
- Last login
- Account creation

Application Access Section:
- List of applications
- Enabled/Disabled toggle
- Access indicators

Permissions Section:
- Platform Permissions (top)
- Application Permissions (grouped by app)
- Legacy Permissions (collapsed, if present)
```

---

## Role List View Structure

```
Card Components:
1. Role Icon
2. Role Name
3. Description
4. User Count
5. Action Button ("Edit Role →")
```

---

## Role Detail View Structure

```
Header:
- Role icon
- Role name
- Description
- Back navigation

User Count Section:
- Number of users
- "View Users →" link

Permissions Section:
- Platform Permissions (top)
- Application Permissions (grouped by app)
- Legacy Permissions (collapsed, if present)
```

---

## Permission Display Format

### Platform Permissions
```
Platform Permissions
───────────────────────────────────────────────────────

These permissions apply across all applications:

☐ Invite users
☐ Manage organization settings
☐ View billing information
☐ Manage integrations
```

### Application Permissions
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

### App Not Enabled
```
Helpdesk Application Permissions
───────────────────────────────────────────────────────

⚠️ This role does not have access to Helpdesk.
Enable Helpdesk access for this role to configure
Helpdesk permissions.
```

---

## Legacy Permissions Warning

### Collapsed State
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

### Expanded State
```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Legacy Permissions (Read-Only)                  │
│                                                       │
│  These permissions are deprecated. They are not     │
│  grouped by application and may cause confusion.    │
│  Please migrate to app-scoped permissions.          │
│                                                       │
│  [Legacy permission structure shown here]           │
│                                                       │
│  [Migrate to App Permissions]                      │
└─────────────────────────────────────────────────────┘
```

---

## Access Badges

### Application Access
- **Sales:** Blue badge
- **Helpdesk:** Green badge
- **Projects:** Purple badge
- **Audit:** Orange badge
- **Portal:** Teal badge
- **All Applications:** Gold badge (platform admin)

### Status Badges
- **Active:** Green
- **Inactive:** Gray
- **Suspended:** Red

---

## Permission Checkboxes

### Checked (Enabled)
- **Visual:** ☑ Green checkmark
- **Meaning:** Permission is enabled

### Unchecked (Disabled)
- **Visual:** ☐ Empty checkbox
- **Meaning:** Permission is disabled

### Read-Only (Legacy)
- **Visual:** ☐ Grayed out
- **Meaning:** Cannot be edited (legacy)

---

## Interaction Patterns

### Editing User Permissions
1. Click "Edit User →" on user card
2. Navigate to user detail view
3. See current permissions
4. Modify permissions
5. Save changes

### Editing Role Permissions
1. Click "Edit Role →" on role card
2. Navigate to role detail view
3. See current permissions
4. Modify permissions
5. Save changes (affects all users with this role)

### Enabling App Access
1. In user/role detail view
2. Find application in "Application Access" section
3. Toggle to enable
4. App permissions section appears
5. Configure permissions

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

1. **App Scoping** - Only shows relevant permissions
2. **Platform Separation** - Clear separation from app permissions
3. **Legacy Handling** - Visible but discouraged, read-only
4. **Confirmation** - Before saving changes

---

## Color Palette

- **Sales:** #3B82F6 (blue)
- **Helpdesk:** #10B981 (green)
- **Projects:** #8B5CF6 (purple)
- **Audit:** #F59E0B (orange)
- **Portal:** #14B8A6 (teal)
- **Platform:** #6366F1 (indigo)
- **Active:** #10B981 (green)
- **Inactive:** #6B7280 (gray)
- **Suspended:** #EF4444 (red)
- **Warning:** #F59E0B (amber)

---

## Success Criteria

✅ **Confidently assign access** - Clear scoping + platform separation + confirmations  
✅ **Obvious which permissions affect which app** - App grouping + clear labels + icons  
✅ **Consistent with Settings** - Same patterns + app-scoped structure + safety

