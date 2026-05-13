# Integrations Settings - Example Walkthrough

## Scenario: Admin Exploring Calendar Sync Integration

This document walks through a concrete example of how an organization admin would interact with the Integrations settings, using the **Calendar Sync** integration as the example.

---

## Step 1: Navigating to Integrations

**Path:** Settings → Integrations

**What the admin sees:**
- List of available integrations
- Each integration shown as a card
- Scope and status visible on each card

---

## Step 2: Viewing Integrations Catalog

**Catalog Display:**
```
┌─────────────────────────────────────────────────────┐
│  📧 Email Provider                                  │
│  Send emails directly from the platform             │
│                                                       │
│  Scope: Platform-wide                                │
│  Status: [Enabled ✓]                                 │
│                                                       │
│  [Configure →]                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  📅 Calendar Sync                                    │
│  Sync events with Google Calendar or Outlook         │
│                                                       │
│  Scope: Sales, Helpdesk, Projects                    │
│  Status: [Not Connected]                             │
│                                                       │
│  [Connect →]                                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  💬 Slack                                            │
│  Get notifications in your Slack workspace          │
│                                                       │
│  Scope: Platform-wide                                │
│  Status: [Not Connected]                             │
│                                                       │
│  [Connect →]                                        │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Email Provider is enabled (platform-wide)
- ✅ Calendar Sync is not connected (works with Sales, Helpdesk, Projects)
- ✅ Slack is not connected (platform-wide)
- ✅ Can see scope and status at a glance

**Admin's mental model:**
> "I have several integrations available. Email is already working. Calendar Sync would sync events from Sales, Helpdesk, and Projects to my calendar. That could be useful. Let me learn more about it."

---

## Step 3: Opening Calendar Sync Detail View

**Admin clicks:** "Connect →" on Calendar Sync card

**Detail View Header:**
```
← Back to Integrations

📅 Calendar Sync
Sync events with Google Calendar or Outlook
```

**Status Section:**
```
┌─────────────────────────────────────────────────────┐
│  Status: Not Connected                               │
│  Connect this integration to sync events with your   │
│  calendar.                                           │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Calendar Sync is not connected yet
- ✅ Can connect to sync events
- ✅ Need to learn more before connecting

**Admin's mental model:**
> "Calendar Sync is not connected. I should understand what it does, what data it shares, and which apps it works with before connecting."

---

## Step 4: Reading "What This Integration Does"

**What This Integration Does Section:**
```
What This Integration Does
───────────────────────────────────────────────────────

Calendar Sync automatically syncs events from your
platform to your Google Calendar or Outlook calendar.
When you create or update an event in Sales, Helpdesk,
or Projects, it will appear in your calendar.
```

**What the admin understands:**
- ✅ Automatically syncs events to calendar
- ✅ Works when events are created or updated
- ✅ Works with Google Calendar or Outlook
- ✅ Clear, simple explanation

**Admin's mental model:**
> "So if I create an event in Sales, it will automatically appear in my Google Calendar. That's convenient - I won't have to manually add events. Let me see which apps this works with."

---

## Step 5: Understanding Scope

**Scope Section:**
```
Scope
───────────────────────────────────────────────────────

This integration works with:
• Sales - Syncs deal meetings and customer events
• Helpdesk - Syncs support appointments
• Projects - Syncs project milestones and deadlines

It does not work with:
• Audit - No calendar sync needed
• Portal - No calendar sync needed
```

**What the admin understands:**
- ✅ Works with Sales, Helpdesk, Projects
- ✅ Doesn't work with Audit or Portal
- ✅ Each app has specific use case explained
- ✅ Clear which apps benefit

**Admin's mental model:**
> "Calendar Sync works with Sales, Helpdesk, and Projects. It doesn't work with Audit or Portal, which makes sense - those apps don't really need calendar sync. So if I connect it, events from those three apps will sync to my calendar."

---

## Step 6: Understanding Data Sharing

**What Data Is Shared Section:**
```
What Data Is Shared
───────────────────────────────────────────────────────

When you connect Calendar Sync, we share:
• Event titles and descriptions
• Event dates and times
• Event locations (if provided)

We do not share:
• Contact information beyond names
• Deal amounts or financial data
• Internal notes or comments
```

**What the admin understands:**
- ✅ Shares event titles, descriptions, dates, times, locations
- ✅ Does not share contact details, financial data, notes
- ✅ Clear what is and isn't shared
- ✅ Specific, not vague

**Admin's mental model:**
> "Calendar Sync shares basic event information - titles, dates, times, locations. It doesn't share sensitive stuff like financial data or internal notes. That seems reasonable - it needs the event info to create calendar entries, but it doesn't need financial or private information."

---

## Step 7: Understanding Why Data Is Shared

**Why We Share This Data Section:**
```
Why We Share This Data
───────────────────────────────────────────────────────

This data is needed to create and update calendar
events in your Google Calendar or Outlook account.
Without this information, we cannot sync your events.
```

**What the admin understands:**
- ✅ Data is needed for the integration to work
- ✅ Without it, sync cannot happen
- ✅ Clear purpose for data sharing
- ✅ Transparent explanation

**Admin's mental model:**
> "The data is needed to actually create the calendar events. Without event titles and dates, there's nothing to sync. This makes sense - it's the minimum data needed for the integration to work."

---

## Step 8: Deciding to Connect

**Admin's decision process:**
- ✅ Understands what it does (syncs events to calendar)
- ✅ Understands scope (Sales, Helpdesk, Projects)
- ✅ Understands data sharing (event info only, not sensitive data)
- ✅ Understands why data is shared (needed for sync)
- ✅ Feels comfortable with the integration

**Admin clicks:** "Connect Google Calendar →"

---

## Step 9: Confirmation Modal

**Confirmation Modal:**
```
┌─────────────────────────────────────────────────┐
│  Connect Calendar Sync?                         │
│                                                  │
│  You're about to connect Calendar Sync to sync  │
│  events with Google Calendar.                   │
│                                                  │
│  What will happen:                              │
│  • Events from Sales, Helpdesk, and Projects    │
│    will sync to your Google Calendar            │
│  • Event titles, dates, and locations will be  │
│    shared with Google                           │
│  • You can disconnect at any time               │
│                                                  │
│  [Cancel]  [Continue to Setup]                 │
└─────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Exact impact explained
- ✅ What will sync (events from 3 apps)
- ✅ What data will be shared (titles, dates, locations)
- ✅ Can disconnect anytime (reassuring)

**Admin confirms:** Clicks "Continue to Setup"

**What happens:**
1. OAuth flow begins (Google Calendar authorization)
2. Admin authorizes access
3. Integration connected
4. Status changes to "Enabled ✓"
5. Success toast: "Calendar Sync connected successfully"

---

## Step 10: Viewing Enabled Integration

**Updated Catalog Card:**
```
┌─────────────────────────────────────────────────────┐
│  📅 Calendar Sync                                    │
│  Sync events with Google Calendar or Outlook         │
│                                                       │
│  Scope: Sales, Helpdesk, Projects                    │
│  Status: [Enabled ✓]                                 │
│                                                       │
│  [Configure →]                                      │
└─────────────────────────────────────────────────────┘
```

**Updated Detail View:**
```
┌─────────────────────────────────────────────────────┐
│  Status: Enabled ✓                                   │
│  Connected to Google Calendar                        │
│  [Disconnect]                                       │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Calendar Sync is now enabled
- ✅ Connected to Google Calendar
- ✅ Can configure or disconnect
- ✅ Integration is active

**Admin's mental model:**
> "Calendar Sync is now connected. Events from Sales, Helpdesk, and Projects will automatically sync to my Google Calendar. I can disconnect it anytime if I change my mind."

---

## Step 11: Understanding Platform-Wide Integration (Email Provider)

**Admin navigates back to catalog**

**Email Provider Card:**
```
┌─────────────────────────────────────────────────────┐
│  📧 Email Provider                                  │
│  Send emails directly from the platform             │
│                                                       │
│  Scope: Platform-wide                                │
│  Status: [Enabled ✓]                                 │
│                                                       │
│  [Configure →]                                      │
└─────────────────────────────────────────────────────┘
```

**Admin clicks:** "Configure →"

**Detail View - Scope:**
```
Scope
───────────────────────────────────────────────────────

This integration works across all applications:
• Sales
• Helpdesk
• Projects
• Audit
• Portal

All apps can use this integration once connected.
```

**What the admin understands:**
- ✅ Email Provider works with all apps
- ✅ Platform-wide integration
- ✅ Single configuration for all apps
- ✅ Different from app-specific integrations

**Admin's mental model:**
> "Email Provider is platform-wide - it works with all apps. Calendar Sync is app-specific - it only works with Sales, Helpdesk, and Projects. I understand the difference now."

---

## Step 12: Understanding Optional Nature

**Admin's observations:**
- ✅ Integrations are optional (not required)
- ✅ Platform works without them
- ✅ Can enable/disable anytime
- ✅ Clear value but not essential

**Admin's mental model:**
> "Integrations are enhancements - they make the platform more powerful, but the platform works fine without them. I can connect what I need and ignore what I don't. They're optional but valuable."

---

## Key Learnings from This Walkthrough

### 1. **Integrations Are Optional**
- Not required for platform to work
- Can enable/disable anytime
- Clear value but non-essential

### 2. **Scope Is Clear**
- Platform-wide vs app-specific clearly indicated
- Which apps benefit explained
- No confusion about scope

### 3. **Data Sharing Is Transparent**
- What data is shared clearly listed
- What data is not shared clearly listed
- Why data is shared explained

### 4. **Safe Enable/Disable**
- Confirmation before connecting
- Clear impact explanation
- Easy to disconnect

### 5. **Business-Friendly Language**
- "Sync events" not "API integration"
- "Share data" not "transmit payloads"
- "Connect" not "authenticate"

---

## Success Criteria Validation

### ✅ Admin can decide whether to enable an integration without documentation
- **Evidence:** Admin understands Calendar Sync from detail view alone
- **Mechanism:** Comprehensive detail view + clear language + transparent data sharing

### ✅ It is clear which app (or the platform) an integration affects
- **Evidence:** Admin clearly sees Calendar Sync works with Sales, Helpdesk, Projects
- **Mechanism:** Scope badges + detailed scope section + visual indicators

### ✅ Integrations feel powerful but non-essential
- **Evidence:** Admin understands integrations are optional enhancements
- **Mechanism:** "Connect" language (not "Required") + clear value + easy disconnect

---

## Edge Cases Handled

### What if admin tries to connect without understanding data sharing?
- ✅ Data sharing section is prominent
- ✅ Must read before connecting
- ✅ Confirmation modal reinforces data sharing

### What if admin wants to disconnect?
- ✅ Easy disconnect option
- ✅ Confirmation before disconnecting
- ✅ Clear what happens when disconnected

### What if integration fails to connect?
- ✅ Error message in human-friendly language
- ✅ Can retry connection
- ✅ Support information available

### What if admin doesn't have access to an app?
- ✅ Only sees integrations for apps they have access to
- ✅ Scope reflects available apps
- ✅ No confusion about unavailable apps

---

## Conclusion

This walkthrough demonstrates that the Integrations settings design successfully:

1. **Makes integrations understandable** - Clear descriptions, scope, data sharing
2. **Communicates scope clearly** - Platform-wide vs app-specific, which apps benefit
3. **Feels optional but powerful** - Not required, but valuable enhancements

The design achieves all success criteria through:
- Comprehensive detail views
- Transparent data sharing
- Clear scope communication
- Safe enable/disable flows
- Business-friendly language

