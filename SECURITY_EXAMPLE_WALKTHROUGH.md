# Security Settings - Example Walkthrough

## Scenario: Admin Reviewing and Configuring Security

This document walks through a concrete example of how an organization admin would interact with the Security settings.

---

## Step 1: Navigating to Security

**Path:** Settings → Security

**What the admin sees:**
- Security overview page
- Security status card at top
- Security controls cards
- Recent activity cards

---

## Step 2: Viewing Security Status

**Status Card:**
```
┌─────────────────────────────────────────────────────┐
│  Security Status                    [All Good ✓]    │
│  Your organization's security is up to date         │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Security is in good shape
- ✅ No immediate action needed
- ✅ Status is clear and positive

**Admin's mental model:**
> "Security looks good. Everything is up to date. I can see what controls are available and check recent activity."

---

## Step 3: Reviewing Security Controls

**Controls Cards:**
```
┌─────────────────────────────────────────────────────┐
│  🔐 Password Rules                                   │
│  Configure how strong passwords must be              │
│                                                       │
│  [Configure →]                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ⏱️ Session Controls                                  │
│  Control how long users stay logged in               │
│                                                       │
│  [Configure →]                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  🔒 Two-Factor Authentication                        │
│  Add an extra layer of protection                    │
│                                                       │
│  Status: Not Required                                │
│  [Configure →]                                      │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Three main security controls available
- ✅ Password rules, session controls, two-factor
- ✅ Two-factor is currently not required
- ✅ Can configure each one

**Admin's mental model:**
> "I have three main security controls: password rules, session controls, and two-factor authentication. Two-factor is not required yet. I can configure each of these."

---

## Step 4: Viewing Recent Activity

**Login Activity Card:**
```
┌─────────────────────────────────────────────────────┐
│  📊 Login Activity                                   │
│  See who logged in and when                          │
│                                                       │
│  Last 7 days: 45 successful logins                   │
│  2 failed login attempts                             │
│                                                       │
│  [View All Activity →]                               │
└─────────────────────────────────────────────────────┘
```

**Security Events Card:**
```
┌─────────────────────────────────────────────────────┐
│  📋 Security Events                                  │
│  Important security-related activity                  │
│                                                       │
│  Last 7 days: 3 events                                │
│  • Password changed (2)                              │
│  • User suspended (1)                                │
│                                                       │
│  [View All Events →]                                 │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ 45 successful logins in last 7 days
- ✅ 2 failed login attempts (might need attention)
- ✅ 3 security events (password changes, suspension)
- ✅ Can view detailed activity

**Admin's mental model:**
> "Most logins are successful, which is good. There were 2 failed attempts - I should check those. There were some security events like password changes and a user suspension. I can view details if needed."

---

## Step 5: Configuring Password Rules

**Admin clicks:** "Configure →" on Password Rules card

**Password Rules Page:**
```
🔐 Password Rules
Configure how strong passwords must be

┌─────────────────────────────────────────────────────┐
│  These rules apply to all users in your organization │
│  and help protect your account from unauthorized     │
│  access.                                             │
└─────────────────────────────────────────────────────┘

Minimum Password Requirements
───────────────────────────────────────────────────────

Minimum Length
───────────────────────────────────────────────────────
[Slider: 8 characters]
Passwords must be at least 8 characters long

Required Characters
───────────────────────────────────────────────────────
☑ Must include uppercase letters (A-Z)
☑ Must include lowercase letters (a-z)
☑ Must include numbers (0-9)
☐ Must include special characters (!@#$%^&*)
```

**What the admin understands:**
- ✅ Rules apply to all users
- ✅ Current minimum is 8 characters
- ✅ Must include uppercase, lowercase, numbers
- ✅ Special characters are optional
- ✅ Clear, human-friendly language

**Admin's mental model:**
> "Password rules are clear. Users need at least 8 characters with uppercase, lowercase, and numbers. Special characters are optional. These rules apply to everyone, which makes sense for security."

**Admin's action:** Changes minimum length to 12 characters

**Confirmation Modal:**
```
┌─────────────────────────────────────────────────┐
│  Change Password Rules?                          │
│                                                  │
│  You're about to change the minimum password    │
│  length from 8 to 12 characters.                │
│                                                  │
│  Impact:                                        │
│  • All users will need to update their          │
│    passwords if they don't meet the new         │
│    requirements                                 │
│  • Users with passwords shorter than 12         │
│    characters will be prompted to change        │
│    their password on next sign-in               │
│                                                  │
│  [Cancel]  [Save Changes]                      │
└─────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Exact change shown (8 → 12)
- ✅ Impact clearly explained
- ✅ Users will be prompted to update passwords
- ✅ Can cancel if not ready

**Admin confirms:** Clicks "Save Changes"

**Result:**
- Password rules updated
- Success toast: "Password rules updated successfully"
- Change logged to security events

---

## Step 6: Configuring Session Controls

**Admin clicks:** "Configure →" on Session Controls card

**Session Controls Page:**
```
⏱️ Session Controls
Control how long users stay logged in

┌─────────────────────────────────────────────────────┐
│  Sessions control how long users remain logged in   │
│  after signing in. Shorter sessions are more secure, │
│  but may require users to sign in more often.       │
│  └─────────────────────────────────────────────────────┘

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

Inactive Session Timeout
───────────────────────────────────────────────────────
☑ Automatically sign out inactive users

If enabled:
[Dropdown: 2 hours]
Users will be signed out after 2 hours of inactivity
```

**What the admin understands:**
- ✅ Current setting: 7 days (recommended)
- ✅ Trade-off: security vs convenience
- ✅ Inactive timeout is enabled (2 hours)
- ✅ Clear recommendations provided

**Admin's mental model:**
> "Sessions are set to 7 days, which is the recommended balance. Users get signed out after 2 hours of inactivity, which is good for security. I understand the trade-offs."

**Admin's decision:** Keeps current settings (no changes)

---

## Step 7: Reviewing Two-Factor Authentication

**Admin clicks:** "Configure →" on Two-Factor Authentication card

**Two-Factor Authentication Page:**
```
🔒 Two-Factor Authentication
Add an extra layer of protection

┌─────────────────────────────────────────────────────┐
│  Two-factor authentication requires users to provide │
│  a second form of verification when signing in,      │
│  such as a code from their phone. This significantly │
│  improves security even if a password is compromised. │
└─────────────────────────────────────────────────────┘

Two-Factor Authentication Status
───────────────────────────────────────────────────────

☐ Not Required
Users can sign in with just their password

☑ Required for All Users
All users must set up two-factor authentication

☐ Required for Admins Only
Only users with admin roles must use two-factor
```

**What the admin understands:**
- ✅ Two-factor adds extra security layer
- ✅ Currently not required
- ✅ Can require for all users or just admins
- ✅ Clear explanation of what it does

**Admin's mental model:**
> "Two-factor authentication adds an extra security step - users need a code from their phone. It's not required yet, but I could require it for all users or just admins. This would significantly improve security."

**Admin's decision:** Considers requiring for admins only (but doesn't change yet)

---

## Step 8: Viewing Login Activity

**Admin clicks:** "View All Activity →" on Login Activity card

**Login Activity Page:**
```
📊 Login Activity
See who logged in and when

[Filter: Last 7 days ▼] [All Users ▼] [All Status ▼]

┌─────────────────────────────────────────────────────┐
│  👤 John Smith                    [Successful ✓]     │
│  john.smith@company.com                              │
│  Signed in from New York, US                         │
│  2 hours ago                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  👤 Sarah Johnson                [Failed ✗]          │
│  sarah@company.com                                   │
│  Failed sign-in attempt                              │
│  From: Unknown location                              │
│  5 hours ago                                          │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Most logins are successful
- ✅ One failed attempt (Sarah Johnson)
- ✅ Can see location and time
- ✅ Failed attempt might need investigation

**Admin's mental model:**
> "Most logins are successful. Sarah had a failed attempt 5 hours ago from an unknown location. This might be suspicious - I should check if she's aware of it or if there's a security concern."

---

## Step 9: Viewing Security Events

**Admin clicks:** "View All Events →" on Security Events card

**Security Events Page:**
```
📋 Security Events
Important security-related activity

[Filter: Last 7 days ▼] [All Events ▼]

┌─────────────────────────────────────────────────────┐
│  🔐 Password Changed                                 │
│  John Smith changed their password                   │
│  From: New York, US                                  │
│  2 hours ago                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  🚫 User Suspended                                   │
│  Sarah Johnson was suspended by Platform Admin       │
│  Reason: Suspicious activity                         │
│  1 day ago                                            │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Password changes are logged
- ✅ User suspensions are logged
- ✅ Can see who did what and when
- ✅ Clear audit trail

**Admin's mental model:**
> "I can see all security events. John changed his password recently, which is normal. Sarah was suspended yesterday due to suspicious activity - that explains the failed login attempt I saw. Everything is being tracked."

---

## Step 10: Understanding Platform-Level Security

**Admin's observations:**
- ✅ All security settings apply to entire organization
- ✅ Not app-specific (applies to Sales, Helpdesk, etc.)
- ✅ Centralized security management
- ✅ Consistent protection across all applications

**Admin's mental model:**
> "Security settings apply to the whole organization, not just one app. This makes sense - security should be consistent across all applications. I manage it in one place, and it protects everything."

---

## Key Learnings from This Walkthrough

### 1. **Security is Platform-Level**
- Settings apply to entire organization
- Not app-specific
- Centralized management

### 2. **Human-Friendly Language Works**
- "Password rules" not "password policies"
- "Stay logged in" not "session duration"
- "Extra layer of protection" not "2FA"

### 3. **Visibility Builds Confidence**
- Can see login activity
- Can see security events
- Clear audit trail

### 4. **High-Risk Actions Are Protected**
- Confirmations for important changes
- Impact explanations
- Cannot accidentally trigger

### 5. **Status is Clear**
- "All Good" status is reassuring
- Can see what needs attention
- Professional, trustworthy presentation

---

## Success Criteria Validation

### ✅ Admin understands what keeps their organization secure
- **Evidence:** Admin understands password rules, sessions, two-factor, and activity monitoring
- **Mechanism:** Clear descriptions + status indicators + visible controls

### ✅ Sensitive actions feel protected and intentional
- **Evidence:** Admin sees confirmation modal with impact explanation before changing password rules
- **Mechanism:** Confirmation modals + warnings + deliberate UI

### ✅ Security feels centralized, calm, and trustworthy
- **Evidence:** Admin recognizes platform-level security, organized layout, professional presentation
- **Mechanism:** Centralized design + clear organization + consistent patterns + calm color scheme

---

## Edge Cases Handled

### What if admin tries to set password length too short?
- ✅ Minimum validation (8 characters)
- ✅ Warning if below recommended

### What if admin tries to disable all security?
- ✅ Confirmation required
- ✅ Warning about security implications
- ✅ Cannot accidentally disable

### What if there are many failed login attempts?
- ✅ Shown in login activity
- ✅ Can filter by failed attempts
- ✅ May trigger security alert

### What if admin views activity from suspicious location?
- ✅ Location shown in activity
- ✅ Can identify suspicious patterns
- ✅ Can take action (suspend user)

---

## Conclusion

This walkthrough demonstrates that the Security settings design successfully:

1. **Makes security understandable** - Human-friendly language, clear controls, visible status
2. **Protects sensitive actions** - Confirmations, warnings, impact explanations
3. **Feels trustworthy** - Centralized, organized, professional, calm presentation

The design achieves all success criteria through:
- Platform-level security
- Human-friendly language
- Visible activity monitoring
- Protected high-risk actions
- Clear status indicators

