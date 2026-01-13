# Security Settings - Visual Language Reference

## Quick Reference: Security Status

### All Good ✓
- **Color:** Green (#10B981)
- **Icon:** Checkmark
- **Text:** "All Good"
- **Meaning:** Security is up to date, no action needed

### Attention Needed ⚠️
- **Color:** Yellow/Amber (#F59E0B)
- **Icon:** Warning
- **Text:** "Attention Needed"
- **Meaning:** Some security settings need review

### Action Required
- **Color:** Red (#EF4444)
- **Icon:** Alert
- **Text:** "Action Required"
- **Meaning:** Immediate security action needed

---

## Security Overview Structure

```
Components:
1. Security Status Card (top)
2. Security Controls Cards (Password Rules, Sessions, 2FA)
3. Recent Activity Cards (Login Activity, Security Events)
```

---

## Security Controls Cards

### Password Rules
- **Icon:** 🔐 Lock
- **Title:** "Password Rules"
- **Description:** "Configure how strong passwords must be"
- **Action:** "Configure →"

### Session Controls
- **Icon:** ⏱️ Timer
- **Title:** "Session Controls"
- **Description:** "Control how long users stay logged in"
- **Action:** "Configure →"

### Two-Factor Authentication
- **Icon:** 🔒 Shield
- **Title:** "Two-Factor Authentication"
- **Description:** "Add an extra layer of protection"
- **Status:** "Not Required" / "Required for All" / "Required for Admins"
- **Action:** "Configure →"

---

## Activity Cards

### Login Activity
- **Icon:** 📊 Chart
- **Title:** "Login Activity"
- **Description:** "See who logged in and when"
- **Stats:** "Last 7 days: X successful logins, Y failed attempts"
- **Action:** "View All Activity →"

### Security Events
- **Icon:** 📋 List
- **Title:** "Security Events"
- **Description:** "Important security-related activity"
- **Stats:** "Last 7 days: X events"
- **Recent Items:** List of recent events
- **Action:** "View All Events →"

---

## Password Rules Display

### Minimum Length
```
Minimum Length
───────────────────────────────────────────────────────
[Slider: 8 characters]
Passwords must be at least 8 characters long
```

### Required Characters
```
Required Characters
───────────────────────────────────────────────────────
☑ Must include uppercase letters (A-Z)
☑ Must include lowercase letters (a-z)
☑ Must include numbers (0-9)
☐ Must include special characters (!@#$%^&*)
```

### Password Expiration
```
Password Expiration
───────────────────────────────────────────────────────
☐ Require password changes

If enabled:
[Dropdown: Every 90 days]
Users must change their password every 90 days
```

---

## Session Controls Display

### Session Duration
```
Session Duration
───────────────────────────────────────────────────────
How long should users stay logged in?
[Dropdown: 7 days]

Options:
• 1 hour - Most secure, requires frequent sign-in
• 1 day - Secure, sign in daily
• 7 days - Balanced (recommended)
• 30 days - Convenient, less secure
• Never expire - Least secure, not recommended
```

### Inactive Timeout
```
Inactive Session Timeout
───────────────────────────────────────────────────────
☑ Automatically sign out inactive users

If enabled:
[Dropdown: 2 hours]
Users will be signed out after 2 hours of inactivity
```

---

## Two-Factor Authentication Display

### Status Options
```
Two-Factor Authentication Status
───────────────────────────────────────────────────────
☐ Not Required
Users can sign in with just their password

☑ Required for All Users
All users must set up two-factor authentication

☐ Required for Admins Only
Only users with admin roles must use two-factor
```

---

## Login Activity Display

### Entry Format
```
┌─────────────────────────────────────────────────────┐
│  👤 John Smith                    [Successful ✓]     │
│  john.smith@company.com                              │
│  Signed in from New York, US                         │
│  2 hours ago                                          │
└─────────────────────────────────────────────────────┘
```

### Status Indicators
- **Successful ✓** - Green badge
- **Failed ✗** - Red badge

---

## Security Events Display

### Entry Format
```
┌─────────────────────────────────────────────────────┐
│  🔐 Password Changed                                 │
│  John Smith changed their password                   │
│  From: New York, US                                  │
│  2 hours ago                                          │
└─────────────────────────────────────────────────────┘
```

### Event Types
- 🔐 Password Changed
- 🚫 User Suspended
- 🔒 Two-Factor Enabled/Disabled
- 👤 Role Changed
- 🔑 Permission Changed
- ⚠️ Failed Login Attempts

---

## Confirmation Modals

### High-Risk Actions
- **Password Rules Changes** - Impact explanation
- **Two-Factor Requirement** - Impact explanation
- **User Suspension** - Impact + reason input

### Modal Structure
```
┌─────────────────────────────────────────────────┐
│  [Action Title]?                                │
│                                                  │
│  [Description of what's changing]                │
│                                                  │
│  Impact:                                        │
│  • [What will happen]                          │
│  • [Who will be affected]                       │
│                                                  │
│  [Cancel]  [Confirm Action]                    │
└─────────────────────────────────────────────────┘
```

---

## Interaction Patterns

### Configuring Security Settings
1. Click "Configure →" on control card
2. Navigate to configuration page
3. Modify settings
4. See confirmation modal (if high-risk)
5. Save changes

### Viewing Activity
1. Click "View All Activity →" on activity card
2. Navigate to activity view
3. See detailed list
4. Filter by time, user, status

### High-Risk Actions
1. Attempt to change high-risk setting
2. Confirmation modal appears
3. Read impact explanation
4. Confirm or cancel
5. If confirmed: Change saved, logged to events

---

## Color Palette

- **All Good:** #10B981 (green)
- **Attention:** #F59E0B (amber)
- **Action Required:** #EF4444 (red)
- **Successful:** #10B981 (green)
- **Failed:** #EF4444 (red)
- **Info:** #3B82F6 (blue)
- **Warning:** #F59E0B (amber)

---

## Success Criteria

✅ **Understands what keeps secure** - Clear status + controls + explanations  
✅ **Sensitive actions protected** - Confirmations + warnings + deliberate UI  
✅ **Centralized and trustworthy** - Platform-level + organized + consistent

