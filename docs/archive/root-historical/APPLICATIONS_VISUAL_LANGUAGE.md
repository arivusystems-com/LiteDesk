# Applications Settings - Visual Language Reference

## Quick Reference: Status Indicators

### Enabled Status ✓
- **Color:** Green (#10B981)
- **Icon:** Checkmark
- **Text:** "Enabled"
- **Meaning:** App is active and available
- **Actions:** Configure Settings, Disable (if optional)

### Disabled Status
- **Color:** Gray (#6B7280)
- **Icon:** None or dash
- **Text:** "Disabled"
- **Meaning:** App is not active, can be enabled
- **Actions:** Enable Application

### Trial Status ⏱️
- **Color:** Blue (#3B82F6)
- **Icon:** Clock or timer
- **Text:** "Trial" or "Trial - X days left"
- **Meaning:** App is in trial period
- **Actions:** Configure Settings, Upgrade (links to billing)

### Included Status
- **Color:** Purple (#8B5CF6)
- **Icon:** Star or included icon
- **Text:** "Included"
- **Meaning:** App is included in subscription, cannot be disabled
- **Actions:** Configure Settings only

---

## Application List View Structure

```
Card Components:
1. Application Icon (large, prominent)
2. Application Name
3. Status Badge (top-right)
4. Description (one line)
5. Dependencies ("Uses: ...")
6. Action Button ("Configure Settings →" or "Enable Application")
```

---

## Application Detail View Structure

```
Header:
- Application icon (large)
- Application name
- Description
- Back navigation

Status Section:
- Status badge
- Status explanation
- Enable/Disable button (if applicable)
- Trial days remaining (if trial)

About Section:
- Extended description
- Key features
- Use cases

Dependencies Section:
- Explanation message
- Dependency cards (read-only)
- "View in Core Modules →" links

Settings Entry:
- "Open [App Name] Settings →" button
- Explanation text
```

---

## Dependency Display

### Format
```
Uses: [Capability 1], [Capability 2], [Capability 3]
```

### Visual Style
- Small, subtle text
- Gray color (#6B7280)
- Icons for each capability (optional)
- Read-only (not clickable)

### Detail View Cards
```
┌─────────────────────────────────────────┐
│ [Icon] Capability Name                    │
│ Used for [how app uses it]                │
│ [View in Core Modules →]                 │
└─────────────────────────────────────────┘
```

---

## Interaction Patterns

### Enabling Disabled App
1. Click "Enable Application"
2. Confirmation modal appears
3. If confirmed: App enabled, status changes
4. Success toast

### Disabling Enabled App
1. Click "Disable" (if allowed)
2. Confirmation modal appears
3. If confirmed: App disabled, status changes
4. Success toast

### Opening App Settings
1. Click "Open [App Name] Settings →"
2. Navigate to app-specific settings page
3. Configure app behavior (not platform capabilities)

### Viewing Dependencies
1. See dependencies in list view ("Uses: ...")
2. See detailed dependencies in detail view
3. Click "View in Core Modules →" to see capability details
4. Dependencies are read-only

---

## Example: Sales Application

### List View
```
┌─────────────────────────────────────────┐
│ 💼 Sales              [Enabled ✓]      │
│ Customer relationship management        │
│                                          │
│ Uses: People, Organizations, Events    │
│                                          │
│ [Configure Settings →]                 │
└─────────────────────────────────────────┘
```

### Detail View - Status
```
┌─────────────────────────────────────────┐
│ Status: Enabled ✓                       │
│ This application is active and available │
└─────────────────────────────────────────┘
```

### Detail View - Dependencies
```
Shared Capabilities Used
───────────────────────────────────────────

Sales uses the following shared platform capabilities. 
These capabilities are managed separately in Core Modules 
and cannot be modified from application settings.

┌─────────────────────────────────────────┐
│ 👥 People                                 │
│ Used for contact and lead management     │
│ [View in Core Modules →]                │
└─────────────────────────────────────────┘
```

### Detail View - Settings Entry
```
┌─────────────────────────────────────────┐
│ Application Settings                    │
│ ───────────────────────────────────────│
│                                          │
│ Configure Sales-specific settings:      │
│                                          │
│ [Open Sales Settings →]                │
└─────────────────────────────────────────┘
```

---

## Safety Mechanisms

1. **Read-Only Dependencies** - Cannot modify from app settings
2. **Status Protection** - Included/Required apps cannot be disabled
3. **Clear Boundaries** - App settings vs platform capabilities
4. **Confirmation Modals** - Before enable/disable actions

---

## Color Palette

- **Enabled:** #10B981 (green)
- **Disabled:** #6B7280 (gray)
- **Trial:** #3B82F6 (blue)
- **Included:** #8B5CF6 (purple)
- **Dependencies Text:** #6B7280 (gray)
- **Action Buttons:** #3B82F6 (blue)

---

## Success Criteria

✅ **Each app as independent product** - Product-oriented language + app settings  
✅ **Clear why cannot disable** - Status badges + explanations + no disable button  
✅ **Transparent and safe** - Dependencies shown + read-only + clear separation

