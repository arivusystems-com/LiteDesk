# Security Settings Design

## Objective
Design a Security settings experience that gives admins confidence and control over organizational safety without exposing low-level or technical security mechanics.

---

## Design Principles

### 1. **Platform-Level Security**
- Security settings apply across entire organization
- Not app-specific
- Centralized, consistent protection

### 2. **Human-Friendly Language**
- No technical jargon
- Business terms
- Clear, understandable descriptions

### 3. **Confidence Through Visibility**
- Show security status clearly
- Display important activity
- Make protection visible

### 4. **Deliberate Actions**
- High-risk actions require confirmation
- Clear warnings
- Intentional changes

---

## Part 1: Security Overview Page

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Security                                                     │
│  Manage security policies and monitor activity               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Security Status                    [All Good ✓]    │  │
│  │  Your organization's security is up to date         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Security Overview                                          │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🔐 Password Rules                                   │  │
│  │  Configure how strong passwords must be              │  │
│  │                                                       │  │
│  │  [Configure →]                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  ⏱️ Session Controls                                  │  │
│  │  Control how long users stay logged in               │  │
│  │                                                       │  │
│  │  [Configure →]                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🔒 Two-Factor Authentication                        │  │
│  │  Add an extra layer of protection                    │  │
│  │                                                       │  │
│  │  Status: Not Required                                │  │
│  │  [Configure →]                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Recent Activity                                            │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  📊 Login Activity                                   │  │
│  │  See who logged in and when                          │  │
│  │                                                       │  │
│  │  Last 7 days: 45 successful logins                   │  │
│  │  2 failed login attempts                             │  │
│  │                                                       │  │
│  │  [View All Activity →]                               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  📋 Security Events                                  │  │
│  │  Important security-related activity                  │  │
│  │                                                       │  │
│  │  Last 7 days: 3 events                                │  │
│  │  • Password changed (2)                              │  │
│  │  • User suspended (1)                                │  │
│  │                                                       │  │
│  │  [View All Events →]                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Overview Components

#### 1. Security Status Card
- Overall security status
- "All Good ✓" or "Attention Needed ⚠️"
- Brief status message
- Color coding (green = good, yellow = attention, red = action needed)

#### 2. Security Controls Cards
- Password Rules
- Session Controls
- Two-Factor Authentication
- Each with brief description and "Configure →" link

#### 3. Recent Activity Cards
- Login Activity summary
- Security Events summary
- Quick stats and recent items
- "View All →" links

---

## Part 2: Password Rules Configuration

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Security                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔐 Password Rules                                           │
│  Configure how strong passwords must be                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  These rules apply to all users in your organization │  │
│  │  and help protect your account from unauthorized     │  │
│  │  access.                                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Minimum Password Requirements                              │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Minimum Length                                             │
│  ────────────────────────────────────────────────────────  │
│  [Slider: 8 characters]                                    │
│  Passwords must be at least 8 characters long              │
│                                                             │
│  Required Characters                                        │
│  ────────────────────────────────────────────────────────  │
│  ☑ Must include uppercase letters (A-Z)                    │
│  ☑ Must include lowercase letters (a-z)                    │
│  ☑ Must include numbers (0-9)                              │
│  ☐ Must include special characters (!@#$%^&*)             │
│                                                             │
│  Password Expiration                                        │
│  ────────────────────────────────────────────────────────  │
│  ☐ Require password changes                                │
│                                                             │
│  If enabled:                                                │
│  [Dropdown: Every 90 days]                                 │
│  Users must change their password every 90 days            │
│                                                             │
│  Password History                                           │
│  ────────────────────────────────────────────────────────  │
│  ☑ Prevent reusing last 5 passwords                        │
│                                                             │
│  [Save Changes]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Password Rules Components

#### 1. Info Box
- Explains rules apply to all users
- Explains why rules matter (protection)

#### 2. Minimum Length
- Slider or input
- Range: 8-20 characters
- Default: 8
- Clear explanation

#### 3. Required Characters
- Checkboxes for:
  - Uppercase letters
  - Lowercase letters
  - Numbers
  - Special characters
- Clear examples in parentheses

#### 4. Password Expiration
- Toggle to enable/disable
- If enabled: Dropdown for frequency (30, 60, 90, 180 days)
- Clear explanation

#### 5. Password History
- Toggle to enable/disable
- If enabled: Number input for "last N passwords"
- Prevents password reuse

---

## Part 3: Session Controls Configuration

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Security                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⏱️ Session Controls                                         │
│  Control how long users stay logged in                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Sessions control how long users remain logged in   │  │
│  │  after signing in. Shorter sessions are more secure, │  │
│  │  but may require users to sign in more often.       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Session Duration                                           │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  How long should users stay logged in?                     │
│  [Dropdown: 7 days]                                        │
│                                                             │
│  Options:                                                  │
│  • 1 hour - Most secure, requires frequent sign-in         │
│  • 1 day - Secure, sign in daily                          │
│  • 7 days - Balanced (recommended)                        │
│  • 30 days - Convenient, less secure                      │
│  • Never expire - Least secure, not recommended           │
│                                                             │
│  Inactive Session Timeout                                  │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  ☑ Automatically sign out inactive users                   │
│                                                             │
│  If enabled:                                                │
│  [Dropdown: 2 hours]                                       │
│  Users will be signed out after 2 hours of inactivity     │
│                                                             │
│  Options:                                                  │
│  • 30 minutes                                              │
│  • 1 hour                                                  │
│  • 2 hours (recommended)                                   │
│  • 4 hours                                                 │
│  • 8 hours                                                 │
│                                                             │
│  [Save Changes]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Session Controls Components

#### 1. Info Box
- Explains what sessions are (human terms)
- Trade-off: security vs convenience

#### 2. Session Duration
- Dropdown with options
- Clear recommendations
- Human-friendly descriptions

#### 3. Inactive Session Timeout
- Toggle to enable/disable
- If enabled: Dropdown for timeout duration
- Clear explanation of behavior

---

## Part 4: Two-Factor Authentication

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Security                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔒 Two-Factor Authentication                                │
│  Add an extra layer of protection                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Two-factor authentication requires users to provide │  │
│  │  a second form of verification when signing in,      │  │
│  │  such as a code from their phone. This significantly │
│  │  improves security even if a password is compromised. │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Two-Factor Authentication Status                           │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  ☐ Not Required                                            │
│  Users can sign in with just their password                │
│                                                             │
│  ☑ Required for All Users                                  │
│  All users must set up two-factor authentication           │
│                                                             │
│  ☐ Required for Admins Only                                │
│  Only users with admin roles must use two-factor          │
│                                                             │
│  Setup Instructions                                        │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  When two-factor is required, users will be guided         │
│  through setup when they next sign in. They'll need:      │
│                                                             │
│  • A smartphone with an authenticator app (like Google     │
│    Authenticator or Authy)                                  │
│  • To scan a QR code                                       │
│  • To enter a verification code                            │
│                                                             │
│  [Save Changes]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Two-Factor Authentication Components

#### 1. Info Box
- Explains what two-factor authentication is
- Why it improves security
- Human-friendly language

#### 2. Status Options
- Radio buttons:
  - Not Required
  - Required for All Users
  - Required for Admins Only
- Clear descriptions

#### 3. Setup Instructions
- Explains what users need
- What the setup process looks like
- No technical details

---

## Part 5: Login Activity View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Security                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Login Activity                                           │
│  See who logged in and when                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Filter: [Last 7 days ▼] [All Users ▼] [All Status ▼] │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  👤 John Smith                    [Successful ✓]     │  │
│  │  john.smith@company.com                              │  │
│  │  Signed in from New York, US                         │  │
│  │  2 hours ago                                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  👤 Sarah Johnson                [Failed ✗]          │  │
│  │  sarah@company.com                                   │  │
│  │  Failed sign-in attempt                              │  │
│  │  From: Unknown location                              │  │
│  │  5 hours ago                                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  👤 Mike Davis                    [Successful ✓]     │  │
│  │  mike@company.com                                    │  │
│  │  Signed in from San Francisco, US                    │  │
│  │  1 day ago                                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ... (more logins)                                          │
│                                                             │
│  [Load More]                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Login Activity Components

#### 1. Filters
- Time range (Last 7 days, Last 30 days, All time)
- User filter (All users, Specific user)
- Status filter (All, Successful, Failed)

#### 2. Login Entries
Each entry shows:
- User avatar and name
- Email
- Status (Successful ✓ or Failed ✗)
- Location (if available)
- Time ago (human-friendly)

#### 3. Status Indicators
- **Successful ✓** - Green badge
- **Failed ✗** - Red badge
- Clear visual distinction

---

## Part 6: Security Events View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Security                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 Security Events                                          │
│  Important security-related activity                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Filter: [Last 7 days ▼] [All Events ▼]            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🔐 Password Changed                                 │  │
│  │  John Smith changed their password                   │  │
│  │  From: New York, US                                  │  │
│  │  2 hours ago                                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🚫 User Suspended                                   │  │
│  │  Sarah Johnson was suspended by Platform Admin       │  │
│  │  Reason: Suspicious activity                         │  │
│  │  1 day ago                                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🔒 Two-Factor Enabled                               │  │
│  │  Mike Davis enabled two-factor authentication        │  │
│  │  3 days ago                                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ... (more events)                                          │
│                                                             │
│  [Load More]                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Security Events Components

#### 1. Filters
- Time range (Last 7 days, Last 30 days, All time)
- Event type (All, Password changes, Suspensions, etc.)

#### 2. Event Entries
Each entry shows:
- Event icon and type
- Description (human-friendly)
- User involved
- Location (if available)
- Time ago

#### 3. Event Types
- Password Changed
- User Suspended
- Two-Factor Enabled/Disabled
- Role Changed
- Permission Changed
- Failed Login Attempts (multiple)

---

## Part 7: High-Risk Actions

### Confirmation Patterns

#### Changing Password Rules
**Action:** Admin changes minimum password length from 8 to 12

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

#### Requiring Two-Factor Authentication
**Action:** Admin enables "Required for All Users"

**Confirmation Modal:**
```
┌─────────────────────────────────────────────────┐
│  Require Two-Factor Authentication?              │
│                                                  │
│  You're about to require two-factor             │
│  authentication for all users.                  │
│                                                  │
│  Impact:                                        │
│  • All users will be required to set up         │
│    two-factor authentication on their next      │
│    sign-in                                      │
│  • Users who haven't set up two-factor will     │
│    be guided through setup                      │
│  • This significantly improves security         │
│                                                  │
│  [Cancel]  [Require Two-Factor]                │
└─────────────────────────────────────────────────┘
```

#### Suspending a User
**Action:** Admin suspends a user from Security Events

**Confirmation Modal:**
```
┌─────────────────────────────────────────────────┐
│  Suspend User?                                   │
│                                                  │
│  You're about to suspend John Smith.             │
│                                                  │
│  Impact:                                        │
│  • John will be immediately signed out           │
│  • John will not be able to sign in until       │
│    you reactivate their account                 │
│  • This action will be recorded in security     │
│    events                                       │
│                                                  │
│  Reason (optional):                             │
│  [Text input]                                   │
│                                                  │
│  [Cancel]  [Suspend User]                      │
└─────────────────────────────────────────────────┘
```

---

## Safety Mechanisms

### 1. Clear Warnings
- Impact explanations for high-risk actions
- What will happen if action is taken
- Who will be affected

### 2. Confirmation Required
- All high-risk actions require confirmation
- Clear "Cancel" and "Confirm" buttons
- Cannot accidentally trigger

### 3. Activity Logging
- All security changes logged
- Visible in Security Events
- Audit trail maintained

### 4. Platform-Level Protection
- Settings apply to entire organization
- Cannot be overridden per-app
- Consistent security across all applications

---

## Success Criteria Validation

### ✅ Admin understands what keeps their organization secure
- **Evidence:** Clear security status, visible controls, human-friendly explanations
- **Mechanism:** Overview page + clear descriptions + status indicators

### ✅ Sensitive actions feel protected and intentional
- **Evidence:** Confirmations for all high-risk actions, clear impact explanations
- **Mechanism:** Confirmation modals + warnings + deliberate UI

### ✅ Security feels centralized, calm, and trustworthy
- **Evidence:** Platform-level settings, organized layout, professional presentation
- **Mechanism:** Centralized design + clear organization + consistent patterns

---

## Implementation Notes

### Data Model
Security settings need:
- `passwordRules` - Password requirements
- `sessionSettings` - Session duration and timeout
- `twoFactorRequired` - Two-factor authentication requirement
- `securityEvents` - Log of security-related activity

### API Endpoints
- `GET /api/settings/security` - Get security settings
- `PUT /api/settings/security` - Update security settings
- `GET /api/settings/security/login-activity` - Get login activity
- `GET /api/settings/security/events` - Get security events

### Validation Rules
- Password rules must be reasonable (min 8 characters)
- Session duration must be within allowed range
- Two-factor changes require confirmation
- All changes logged to security events

---

## Next Steps

1. **Create SecurityOverview component** - Overview page with status and controls
2. **Create PasswordRules component** - Password rules configuration
3. **Create SessionControls component** - Session duration and timeout
4. **Create TwoFactorAuth component** - Two-factor authentication settings
5. **Create LoginActivity component** - Login activity view
6. **Create SecurityEvents component** - Security events view
7. **Add confirmation modals** - For high-risk actions
8. **User testing** - Validate clarity with non-technical admins

