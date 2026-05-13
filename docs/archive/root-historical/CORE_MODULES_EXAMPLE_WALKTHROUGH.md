# Core Modules Settings - Example Walkthrough

## Scenario: Admin Managing People Capability

This document walks through a concrete example of how an organization admin would interact with the Core Modules settings, using the **People** capability as the example.

---

## Step 1: Navigating to Core Modules

**Path:** Settings → Platform → Core Modules

**What the admin sees:**
- List of 7 core modules (People, Organizations, Events, Forms, Tasks, Items, Reports)
- Each module shown as a card
- Clear indication these are "Platform Capabilities"

---

## Step 2: Viewing People Module List Card

**Card Display:**
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

**What the admin understands:**
- ✅ People is a platform capability (shared, not app-specific)
- ✅ It's used by 4 applications
- ✅ Can click to see more details

**Admin's mental model:**
> "People is something all my apps can use. It's not owned by any single app, but shared across them."

---

## Step 3: Opening People Detail View

**Admin clicks:** "View Details →"

**Detail View Header:**
```
← Back to Core Modules

👥 People
Contact and lead management
```

**Platform Capability Info Box:**
```
┌─────────────────────────────────────────────────────┐
│  Platform Capability                                 │
│  This is a shared platform capability. It cannot be │
│  deleted or renamed, and is available to all        │
│  applications in your organization.                 │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ People is owned by the platform (not by Sales or any app)
- ✅ It cannot be deleted or renamed
- ✅ It's available to all applications

**Admin's mental model:**
> "This is infrastructure-level. It's like the foundation of my building - I can't remove it, but I can control which rooms use it."

---

## Step 4: Viewing Application Usage

**Application Usage Section:**
```
Application Usage
───────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────┐
│  [Sales Icon] Sales                                  │
│  Required - Used for contact management and leads    │
│  [🔒 Locked]                                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  [Helpdesk Icon] Helpdesk                           │
│  Required - Used for customer support records       │
│  [🔒 Locked]                                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  [Audit Icon] Audit                                  │
│  Optional - Used for auditor contact information     │
│  [Toggle: ON ✓]                                      │
│                                                       │
│  ⚠️ Disabling will remove People access from Audit │
│     app. This cannot be undone.                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  [Portal Icon] Portal                                │
│  Optional - Used for customer profile management     │
│  [Toggle: OFF]                                       │
│                                                       │
│  ℹ️ Enable to allow Portal users to manage their    │
│     contact information.                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  [Projects Icon] Projects                            │
│  Not Used - This application does not use People     │
│  [Disabled]                                          │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**

1. **Sales & Helpdesk (Required):**
   - ✅ These apps MUST use People
   - ✅ Cannot be changed (locked)
   - ✅ No toggle available

2. **Audit (Optional, Enabled):**
   - ✅ This app CAN use People, currently enabled
   - ✅ Can be disabled (with warning)
   - ⚠️ Disabling has consequences

3. **Portal (Optional, Disabled):**
   - ✅ This app CAN use People, currently disabled
   - ✅ Can be enabled
   - ℹ️ Enabling has benefits

4. **Projects (Not Used):**
   - ✅ This app doesn't use People
   - ✅ No action available

**Admin's mental model:**
> "Some apps need People (Sales, Helpdesk), some can use it optionally (Audit, Portal), and some don't use it at all (Projects). I can control the optional ones."

---

## Step 5: Enabling Portal (Optional App)

**Admin's goal:** Allow Portal users to manage their contact information

**Action:** Admin clicks toggle switch for Portal (OFF → ON)

**What happens:**
1. Toggle animates to ON position (green)
2. Card border changes to green accent
3. Info message updates:
   ```
   ✅ People capability is now available in Portal
   ```
4. Success toast appears: "Portal can now use People"
5. Change saved immediately

**Result:**
```
┌─────────────────────────────────────────────────────┐
│  [Portal Icon] Portal                                │
│  Optional - Used for customer profile management     │
│  [Toggle: ON ✓]                                      │
│                                                       │
│  ⚠️ Disabling will remove People access from Portal│
│     app. This cannot be undone.                      │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Portal now has access to People
- ✅ Portal users can manage contact information
- ✅ Can disable later if needed (with confirmation)

---

## Step 6: Attempting to Disable Audit (Optional App)

**Admin's goal:** Remove People access from Audit (maybe to simplify)

**Action:** Admin clicks toggle switch for Audit (ON → OFF)

**What happens:**
1. Toggle starts to move to OFF position
2. **Confirmation modal appears:**
   ```
   ┌─────────────────────────────────────────────────┐
   │  Disable People in Audit?                       │
   │                                                  │
   │  This will remove People access from the Audit │
   │  application. Audit users will no longer be     │
   │  able to view or manage contact information.   │
   │                                                  │
   │  This action cannot be undone.                  │
   │                                                  │
   │  [Cancel]  [Disable People in Audit]           │
   └─────────────────────────────────────────────────┘
   ```

**Admin's decision process:**
- Reads the warning
- Understands impact: "Audit users lose contact access"
- Sees "cannot be undone"
- Decides: Cancel (safe choice)

**Action:** Admin clicks "Cancel"

**What happens:**
1. Modal closes
2. Toggle returns to ON position
3. No changes made
4. Audit still has People access

**Admin's mental model:**
> "The system protected me from accidentally breaking Audit. I got a clear warning and could cancel safely."

---

## Step 7: Attempting to Disable Required App (Sales)

**Admin's goal:** (Hypothetical) Try to remove People from Sales

**Action:** Admin looks at Sales card

**What admin sees:**
```
┌─────────────────────────────────────────────────────┐
│  [Sales Icon] Sales                                  │
│  Required - Used for contact management and leads    │
│  [🔒 Locked]                                         │
└─────────────────────────────────────────────────────┘
```

**What admin notices:**
- ✅ Lock icon visible
- ✅ No toggle switch (or toggle is grayed out/disabled)
- ✅ "Required" status clearly shown
- ✅ Cannot click to change

**Admin's mental model:**
> "Sales needs People - it's locked. I can't change this, and that's intentional. The platform is protecting me from breaking Sales."

---

## Step 8: Understanding Platform Protection

**Admin's observations:**
1. ✅ Cannot delete People module (no delete button)
2. ✅ Cannot rename People module (no edit button)
3. ✅ Cannot disable required apps (locked)
4. ✅ Can only toggle optional apps (with confirmation)

**Admin's mental model:**
> "The platform is protecting the core infrastructure. I can customize which apps use shared capabilities, but I can't break the foundation. This feels safe and intentional."

---

## Key Learnings from This Walkthrough

### 1. **Platform Ownership is Clear**
- Badge + info box explain platform capabilities
- Admin understands these are infrastructure-level

### 2. **Required vs Optional is Obvious**
- Lock icons for required apps
- Toggles only for optional apps
- Clear visual distinction

### 3. **Safety Mechanisms Work**
- Confirmation before disabling
- Clear impact warnings
- Easy cancellation
- Required apps are truly locked

### 4. **Non-Technical Language Works**
- "Shared capability" instead of "platform module"
- "Used by" instead of "dependencies"
- "Required" vs "Optional" instead of technical flags
- Impact explained in plain language

### 5. **Visual Language is Intuitive**
- Colors indicate state (green = enabled, gray = disabled)
- Icons convey meaning (lock = protected, toggle = changeable)
- Layout groups related information

---

## Success Criteria Validation

### ✅ Admin understands "shared capability" without documentation
- **Evidence:** Admin correctly identifies People as platform-owned
- **Mechanism:** Platform badge + info box + clear language

### ✅ No admin can accidentally break another application
- **Evidence:** Confirmation modal prevents accidental disabling
- **Mechanism:** Locks for required apps + confirmations for optional

### ✅ Platform feels intentional and protected
- **Evidence:** Admin recognizes protection mechanisms
- **Mechanism:** Professional styling + clear ownership + safety guards

---

## Edge Cases Handled

### What if admin tries to disable all optional apps?
- ✅ Allowed (if truly optional)
- ✅ Each requires confirmation
- ✅ Impact warnings shown

### What if admin tries to enable a "Not Used" app?
- ✅ Not possible (no toggle available)
- ✅ Card shows "Not Used" status
- ✅ Clear explanation why

### What if admin tries to delete People module?
- ✅ Not possible (no delete button)
- ✅ Platform badge indicates ownership
- ✅ Info box explains cannot be deleted

### What if admin tries to rename People module?
- ✅ Not possible (no edit button)
- ✅ Platform capability cannot be renamed
- ✅ Clear in info box

---

## Conclusion

This walkthrough demonstrates that the Core Modules settings design successfully:

1. **Communicates platform structure** - Admin understands shared vs app-specific
2. **Prevents accidental breaks** - Locks, confirmations, warnings all work
3. **Feels safe and intentional** - Professional, protected, clear ownership

The design achieves all success criteria through:
- Clear visual language
- Safety mechanisms
- Non-technical explanations
- Professional presentation

