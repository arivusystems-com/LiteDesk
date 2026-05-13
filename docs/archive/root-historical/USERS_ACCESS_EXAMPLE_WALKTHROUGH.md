# Users & Access Settings - Example Walkthrough

## Scenario: Admin Managing Sales Manager Role

This document walks through a concrete example of how an organization admin would interact with the Users & Access settings, using the **Sales Manager** role as the example.

---

## Step 1: Navigating to Users & Access

**Path:** Settings → People & Access → Roles & Permissions

**What the admin sees:**
- List of roles (Sales Manager, Platform Admin, Helpdesk Agent, etc.)
- Each role shown as a card
- User count for each role

---

## Step 2: Viewing Sales Manager Role Card

**Card Display:**
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

**What the admin understands:**
- ✅ Sales Manager is a role for sales activities
- ✅ 5 users currently have this role
- ✅ Can click to edit permissions

**Admin's mental model:**
> "Sales Manager is a role for people who manage sales. 5 users have this role. I can edit what permissions they have."

---

## Step 3: Opening Sales Manager Role Detail

**Admin clicks:** "Edit Role →"

**Detail View Header:**
```
← Back to Roles

💼 Sales Manager
For users who manage sales activities
```

**User Count Section:**
```
┌─────────────────────────────────────────────────────┐
│  Used by: 5 users                                    │
│  [View Users →]                                      │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ 5 users have this role
- ✅ Can see who has this role
- ✅ Changes will affect all 5 users

**Admin's mental model:**
> "If I change permissions for Sales Manager, it will affect all 5 users who have this role. That makes sense - roles are shared."

---

## Step 4: Viewing Platform Permissions

**Platform Permissions Section:**
```
Platform Permissions
───────────────────────────────────────────────────────

These permissions apply across all applications:

☐ Invite users
☐ Manage organization settings
☐ View billing information
☐ Manage integrations
```

**What the admin understands:**
- ✅ These permissions apply to all apps
- ✅ Sales Manager doesn't have platform permissions (all unchecked)
- ✅ Platform permissions are separate from app permissions

**Admin's mental model:**
> "Platform permissions are for things like inviting users and managing settings. These apply everywhere, not just in Sales. Sales Manager doesn't have these, which makes sense - they're focused on sales, not platform management."

---

## Step 5: Viewing Sales Application Permissions

**Sales Application Permissions Section:**
```
Sales Application Permissions
───────────────────────────────────────────────────────

These permissions only apply to the Sales application:

Contacts
☑ View contacts
☑ Create contacts
☑ Edit contacts
☐ Delete contacts
☑ View all contacts (not just assigned)
☐ Export contact data

Deals
☑ View deals
☑ Create deals
☑ Edit deals
☐ Delete deals
☑ View all deals
☐ Export deal data
```

**What the admin understands:**

1. **App Scoping:**
   - ✅ These permissions only apply to Sales
   - ✅ Clear label: "only apply to the Sales application"
   - ✅ Won't affect other apps

2. **Module Grouping:**
   - ✅ Permissions grouped by module (Contacts, Deals)
   - ✅ Easy to understand what each permission does
   - ✅ Human-friendly language

3. **Current Permissions:**
   - ✅ Can view, create, edit contacts and deals
   - ✅ Cannot delete contacts or deals
   - ✅ Can view all (not just assigned)
   - ✅ Cannot export data

**Admin's mental model:**
> "Sales Manager can do most things in Sales - view, create, edit contacts and deals. But they can't delete or export, which is good for safety. These permissions only affect Sales, not Helpdesk or other apps."

---

## Step 6: Viewing Helpdesk (Not Enabled)

**Helpdesk Application Permissions Section:**
```
Helpdesk Application Permissions
───────────────────────────────────────────────────────

⚠️ This role does not have access to Helpdesk.
Enable Helpdesk access for this role to configure
Helpdesk permissions.
```

**What the admin understands:**
- ✅ Sales Manager doesn't have Helpdesk access
- ✅ Cannot configure Helpdesk permissions without enabling access first
- ✅ Clear message explains why

**Admin's mental model:**
> "Sales Manager doesn't have Helpdesk access. If I wanted to give them Helpdesk permissions, I'd need to enable Helpdesk access first. That makes sense - you can't configure permissions for an app they don't have access to."

---

## Step 7: Understanding App Scoping

**Admin's observations:**
- ✅ Only sees Sales permissions (app they have access to)
- ✅ Doesn't see Projects or Audit permissions
- ✅ Clear separation between platform and app permissions

**Admin's mental model:**
> "I only see permissions for apps that Sales Manager has access to. I don't see Projects or Audit permissions because Sales Manager doesn't have access to those apps. This keeps things simple and focused."

---

## Step 8: Modifying Permissions

**Admin's goal:** Allow Sales Manager to export contact data

**Action:** Admin checks "☐ Export contact data" → "☑ Export contact data"

**What admin sees:**
- Checkbox changes from unchecked to checked
- Permission is now enabled
- No other permissions affected

**Admin's mental model:**
> "I enabled export permission for contacts. This only affects Sales app, and only the Contacts module. The 5 users with Sales Manager role will now be able to export contacts."

---

## Step 9: Saving Changes

**Admin clicks:** "Save Changes"

**Confirmation:**
- Success toast: "Sales Manager role updated successfully"
- Changes saved
- All 5 users with this role now have new permissions

**What the admin understands:**
- ✅ Changes applied to all users with this role
- ✅ Only affects Sales app
- ✅ Platform permissions unchanged

**Admin's mental model:**
> "I saved the changes. All 5 Sales Managers can now export contacts. This only affects Sales, not other apps. Platform permissions are still the same."

---

## Step 10: Viewing User with Sales Manager Role

**Admin navigates to:** Users → John Smith (has Sales Manager role)

**User Detail View:**
```
👤 John Smith
john.smith@company.com
Sales Manager

Application Access
───────────────────────────────────────────────────────

[Sales Icon] Sales
[✓ Enabled]

[Helpdesk Icon] Helpdesk
[✗ Not Enabled]

Permissions
───────────────────────────────────────────────────────

Platform Permissions
───────────────────────────────────────────────────────

☐ Invite users
☐ Manage organization settings

Sales Application Permissions
───────────────────────────────────────────────────────

Contacts
☑ View contacts
☑ Create contacts
☑ Edit contacts
☐ Delete contacts
☑ View all contacts
☑ Export contact data  ← (Newly enabled)
```

**What the admin understands:**
- ✅ John has Sales Manager role
- ✅ Has access to Sales (enabled)
- ✅ Doesn't have access to Helpdesk
- ✅ Permissions match the Sales Manager role
- ✅ Export permission is now enabled (from role change)

**Admin's mental model:**
> "John has Sales Manager role, so he has the permissions I just set. He can export contacts now. He only has access to Sales, not Helpdesk. His permissions come from the role, which makes management easier."

---

## Step 11: Understanding Legacy Permissions (If Present)

**Admin sees:** Legacy Permissions section (collapsed)

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

**What the admin understands:**
- ✅ There are legacy permissions
- ✅ They're not grouped by application
- ✅ Should migrate to app-scoped permissions
- ✅ Not encouraged to use them

**Admin's decision:**
- Sees warning
- Understands legacy permissions are discouraged
- Chooses not to expand (focuses on app-scoped permissions)

**Admin's mental model:**
> "There are legacy permissions, but they're not recommended. The warning says to migrate to app-scoped permissions. I'll stick with the app-scoped permissions I just configured - they're clearer and better organized."

---

## Key Learnings from This Walkthrough

### 1. **Permissions Are App-Scoped**
- Permissions grouped by application
- Only see permissions for apps user/role has access to
- Clear labels: "only apply to the [App Name] application"

### 2. **Platform Permissions Are Separate**
- Platform permissions at top
- Apply to all applications
- Clear separation from app permissions

### 3. **Legacy Permissions Are Visible But Discouraged**
- Warning banner explains they're legacy
- Read-only (cannot edit)
- Migration path available
- Not hidden, but not encouraged

### 4. **Role-Based Management Works**
- Changes to role affect all users with that role
- Easy to manage permissions for multiple users
- Consistent permissions across users

### 5. **App Scoping Prevents Confusion**
- Only see relevant permissions
- Cannot configure permissions for apps not enabled
- Clear messages when app not enabled

---

## Success Criteria Validation

### ✅ Admin can confidently assign access without fear of breaking the system
- **Evidence:** Admin understands app scoping, platform separation, role-based management
- **Mechanism:** Clear labels + app scoping + platform separation + confirmations

### ✅ It is obvious which permissions affect which application
- **Evidence:** Admin clearly sees "Sales Application Permissions" vs "Platform Permissions"
- **Mechanism:** App grouping + clear labels + app icons + visual separation

### ✅ Permission model feels consistent with the rest of Settings
- **Evidence:** Admin recognizes same patterns (app-scoped, platform separation)
- **Mechanism:** Consistent design patterns + app-scoped structure + same visual language

---

## Edge Cases Handled

### What if admin tries to configure permissions for app not enabled?
- ✅ Not possible (app not shown in permissions)
- ✅ Clear message: "This role does not have access to Helpdesk"
- ✅ Must enable app access first

### What if admin tries to edit legacy permissions?
- ✅ Not possible (read-only)
- ✅ Warning banner explains why
- ✅ Migration path available

### What if admin modifies role permissions?
- ✅ Confirmation before saving
- ✅ Changes affect all users with that role
- ✅ Clear feedback

### What if user has multiple roles?
- ✅ Permissions combined (union)
- ✅ Clear indication of all roles
- ✅ All permissions visible

---

## Conclusion

This walkthrough demonstrates that the Users & Access settings design successfully:

1. **Makes permissions understandable** - App-scoped, human-friendly language, clear grouping
2. **Prevents confusion** - Platform vs app separation, app scoping, clear labels
3. **Feels safe** - Cannot break system, confirmations, clear impact

The design achieves all success criteria through:
- Application-scoped permissions
- Platform separation
- Legacy handling (visible but discouraged)
- Role-based management
- Clear visual language

