# Integrations Settings Design

## Objective
Design an Integrations settings experience that allows organizations to connect external tools safely and intentionally—without making integrations feel required or risky.

---

## Design Principles

### 1. **Optional and Powerful**
- Integrations are optional enhancements
- Not required for platform to work
- Clear value proposition

### 2. **Clear Scope Communication**
- Platform-wide vs app-specific clearly indicated
- Which apps benefit from each integration
- No confusion about scope

### 3. **Transparent Data Sharing**
- What data is shared clearly explained
- Why data is shared
- How data is used

### 4. **Safe Enable/Disable**
- Confirmation before enabling
- Clear impact explanation
- Easy to disable

---

## Part 1: Integrations Catalog View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Integrations                                                │
│  Connect external tools to extend your platform             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  📧 Email Provider                                  │  │
│  │  Send emails directly from the platform             │  │
│  │                                                       │  │
│  │  Scope: Platform-wide                                │  │
│  │  Status: [Enabled ✓]                                │  │
│  │                                                       │  │
│  │  [Configure →]                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  📅 Calendar Sync                                    │  │
│  │  Sync events with Google Calendar or Outlook         │  │
│  │                                                       │  │
│  │  Scope: Sales, Helpdesk, Projects                    │  │
│  │  Status: [Not Connected]                             │  │
│  │                                                       │  │
│  │  [Connect →]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  💬 Slack                                            │  │
│  │  Get notifications in your Slack workspace          │  │
│  │                                                       │  │
│  │  Scope: Platform-wide                                │  │
│  │  Status: [Not Connected]                             │  │
│  │                                                       │  │
│  │  [Connect →]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🔔 Microsoft Teams                                  │  │
│  │  Send notifications to Teams channels                │  │
│  │                                                       │  │
│  │  Scope: Platform-wide                                │  │
│  │  Status: [Not Connected]                             │  │
│  │                                                       │  │
│  │  [Connect →]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  💳 Payment Processing                               │  │
│  │  Accept payments through Stripe                      │  │
│  │                                                       │  │
│  │  Scope: Sales, Portal                                │  │
│  │  Status: [Not Connected]                             │  │
│  │                                                       │  │
│  │  [Connect →]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🔗 Webhooks                                         │  │
│  │  Send data to external systems when events occur     │  │
│  │                                                       │  │
│  │  Scope: Platform-wide                                │  │
│  │  Status: [Not Connected]                             │  │
│  │                                                       │  │
│  │  [Connect →]                                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Card Components

Each integration card displays:

1. **Integration Icon** - Visual identifier
2. **Integration Name** - Clear name
3. **Description** - What it does (one line)
4. **Scope Badge** - "Platform-wide" or list of apps
5. **Status Badge** - "Enabled ✓", "Not Connected", "Configured"
6. **Action Button** - "Configure →" or "Connect →"

### Visual Indicators

#### Scope Badges

**Platform-wide:**
- **Color:** Blue (#3B82F6)
- **Text:** "Platform-wide"
- **Meaning:** Works across all applications

**App-Specific:**
- **Color:** Gray (#6B7280)
- **Text:** "Sales, Helpdesk, Projects" (list of apps)
- **Meaning:** Only works with listed applications

#### Status Badges

**Enabled ✓**
- **Color:** Green (#10B981)
- **Text:** "Enabled"
- **Meaning:** Integration is active

**Not Connected**
- **Color:** Gray (#6B7280)
- **Text:** "Not Connected"
- **Meaning:** Integration not set up

**Configured**
- **Color:** Blue (#3B82F6)
- **Text:** "Configured"
- **Meaning:** Set up but not enabled

---

## Part 2: Integration Detail View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Integrations                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 Calendar Sync                                            │
│  Sync events with Google Calendar or Outlook                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Status: Not Connected                                │  │
│  │  Connect this integration to sync events with your   │  │
│  │  calendar.                                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  What This Integration Does                                │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Calendar Sync automatically syncs events from your        │
│  platform to your Google Calendar or Outlook calendar.     │
│  When you create or update an event in Sales, Helpdesk,    │
│  or Projects, it will appear in your calendar.            │
│                                                             │
│  Scope                                                      │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  This integration works with:                               │
│  • Sales - Syncs deal meetings and customer events        │
│  • Helpdesk - Syncs support appointments                   │
│  • Projects - Syncs project milestones and deadlines      │
│                                                             │
│  It does not work with:                                    │
│  • Audit - No calendar sync needed                         │
│  • Portal - No calendar sync needed                        │
│                                                             │
│  What Data Is Shared                                        │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  When you connect Calendar Sync, we share:                 │
│  • Event titles and descriptions                          │
│  • Event dates and times                                  │
│  • Event locations (if provided)                          │
│                                                             │
│  We do not share:                                          │
│  • Contact information beyond names                        │
│  • Deal amounts or financial data                          │
│  • Internal notes or comments                              │
│                                                             │
│  Why We Share This Data                                    │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  This data is needed to create and update calendar         │
│  events in your Google Calendar or Outlook account.        │
│  Without this information, we cannot sync your events.    │
│                                                             │
│  Connect Integration                                        │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Choose your calendar provider:                            │
│                                                             │
│  [Google Calendar]  [Outlook]                             │
│                                                             │
│  [Connect Google Calendar →]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detail View Components

#### 1. Header Section
- Integration icon (large)
- Integration name
- Description
- Back navigation

#### 2. Status Section
- Current status
- Brief explanation
- Action available

#### 3. What This Integration Does
- Extended description
- How it works
- What it enables

#### 4. Scope Section
- Which apps it works with
- Which apps it doesn't work with
- Clear explanation

#### 5. What Data Is Shared
- List of data shared
- List of data not shared
- Clear, specific items

#### 6. Why We Share This Data
- Explanation of why data is needed
- What happens without it
- Transparency

#### 7. Connect Integration
- Provider selection (if multiple)
- Connect button
- Setup flow entry point

---

## Part 3: Enable/Disable Flow

### Enabling an Integration

**Step 1: Click "Connect →"**

**Step 2: Confirmation Modal**
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

**Step 3: Setup Flow**
- OAuth flow (if applicable)
- Configuration steps
- Test connection
- Success confirmation

**Step 4: Enabled State**
- Status changes to "Enabled ✓"
- Integration card shows enabled
- Can configure or disconnect

---

### Disabling an Integration

**Step 1: Click "Configure →" on enabled integration**

**Step 2: Disconnect Option**
- "Disconnect" button in detail view
- Or toggle switch

**Step 3: Confirmation Modal**
```
┌─────────────────────────────────────────────────┐
│  Disconnect Calendar Sync?                      │
│                                                  │
│  You're about to disconnect Calendar Sync.      │
│                                                  │
│  What will happen:                              │
│  • Events will no longer sync to your calendar  │
│  • Existing calendar events will not be removed │
│  • You can reconnect at any time                │
│                                                  │
│  [Cancel]  [Disconnect]                        │
└─────────────────────────────────────────────────┘
```

**Step 4: Disconnected State**
- Status changes to "Not Connected"
- Integration card shows not connected
- Can reconnect anytime

---

## Part 4: Scope Communication

### Platform-Wide Integrations

**Visual:**
```
Scope: Platform-wide
```

**Explanation:**
- Works across all applications
- Available to all apps
- Single configuration

**Examples:**
- Email Provider
- Slack
- Microsoft Teams
- Webhooks

---

### App-Specific Integrations

**Visual:**
```
Scope: Sales, Helpdesk, Projects
```

**Explanation:**
- Only works with listed applications
- Other apps don't benefit
- May need per-app configuration

**Examples:**
- Calendar Sync (Sales, Helpdesk, Projects)
- Payment Processing (Sales, Portal)

---

### Scope in Detail View

**Platform-Wide:**
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

**App-Specific:**
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

---

## Part 5: Data Sharing Transparency

### Data Sharing Section Format

**What Data Is Shared:**
```
When you connect Calendar Sync, we share:
• Event titles and descriptions
• Event dates and times
• Event locations (if provided)
```

**What Data Is Not Shared:**
```
We do not share:
• Contact information beyond names
• Deal amounts or financial data
• Internal notes or comments
```

**Why We Share This Data:**
```
This data is needed to create and update calendar
events in your Google Calendar or Outlook account.
Without this information, we cannot sync your events.
```

---

## Example: Email Provider Integration

### Catalog Card
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

### Detail View - Enabled
```
📧 Email Provider
Send emails directly from the platform

┌─────────────────────────────────────────────────────┐
│  Status: Enabled ✓                                  │
│  Connected to AWS SES                               │
│  [Disconnect]                                       │
└─────────────────────────────────────────────────────┘

What This Integration Does
───────────────────────────────────────────────────────

Email Provider allows you to send emails directly from
the platform. You can send emails to contacts, customers,
and team members without leaving the platform.

Scope
───────────────────────────────────────────────────────

This integration works across all applications:
• Sales - Send emails to contacts and customers
• Helpdesk - Send support emails
• Projects - Send project updates
• Audit - Send audit notifications
• Portal - Send portal notifications

All apps can use this integration.

What Data Is Shared
───────────────────────────────────────────────────────

When you use Email Provider, we share:
• Email addresses (recipients)
• Email content (subject, body)
• Email metadata (timestamps, status)

We do not share:
• Contact details beyond email addresses
• Financial information
• Internal notes

Why We Share This Data
───────────────────────────────────────────────────────

This data is needed to send emails through AWS SES.
Without this information, we cannot deliver emails
to your recipients.

[Configure Settings →]
```

---

## Example: Calendar Sync Integration

### Catalog Card
```
┌─────────────────────────────────────────────────────┐
│  📅 Calendar Sync                                    │
│  Sync events with Google Calendar or Outlook         │
│                                                       │
│  Scope: Sales, Helpdesk, Projects                    │
│  Status: [Not Connected]                             │
│                                                       │
│  [Connect →]                                        │
└─────────────────────────────────────────────────────┘
```

### Detail View - Not Connected
```
📅 Calendar Sync
Sync events with Google Calendar or Outlook

┌─────────────────────────────────────────────────────┐
│  Status: Not Connected                               │
│  Connect this integration to sync events with your   │
│  calendar.                                           │
└─────────────────────────────────────────────────────┘

What This Integration Does
───────────────────────────────────────────────────────

Calendar Sync automatically syncs events from your
platform to your Google Calendar or Outlook calendar.
When you create or update an event in Sales, Helpdesk,
or Projects, it will appear in your calendar.

Scope
───────────────────────────────────────────────────────

This integration works with:
• Sales - Syncs deal meetings and customer events
• Helpdesk - Syncs support appointments
• Projects - Syncs project milestones and deadlines

It does not work with:
• Audit - No calendar sync needed
• Portal - No calendar sync needed

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

Why We Share This Data
───────────────────────────────────────────────────────

This data is needed to create and update calendar
events in your Google Calendar or Outlook account.
Without this information, we cannot sync your events.

Connect Integration
───────────────────────────────────────────────────────

Choose your calendar provider:

[Google Calendar]  [Outlook]

[Connect Google Calendar →]
```

---

## Example: Webhooks Integration

### Catalog Card
```
┌─────────────────────────────────────────────────────┐
│  🔗 Webhooks                                        │
│  Send data to external systems when events occur    │
│                                                       │
│  Scope: Platform-wide                                │
│  Status: [Not Connected]                             │
│                                                       │
│  [Connect →]                                        │
└─────────────────────────────────────────────────────┘
```

### Detail View
```
🔗 Webhooks
Send data to external systems when events occur

What This Integration Does
───────────────────────────────────────────────────────

Webhooks allow you to send data to external systems
when specific events occur in your platform. For example,
you can send a notification to your custom system when
a deal is won, a contact is created, or a ticket is
resolved.

Scope
───────────────────────────────────────────────────────

This integration works across all applications:
• Sales - Send data when deals change
• Helpdesk - Send data when tickets are updated
• Projects - Send data when projects are completed
• Audit - Send data when audits are executed
• Portal - Send data when portal events occur

All apps can trigger webhooks.

What Data Is Shared
───────────────────────────────────────────────────────

When you configure webhooks, you choose what data to
send. You can send:
• Event type (what happened)
• Record data (contact, deal, ticket, etc.)
• User information (who performed the action)
• Timestamps (when it happened)

You control exactly what data is sent to each webhook.

Why We Share This Data
───────────────────────────────────────────────────────

This data is needed to notify your external systems
about events in your platform. You configure what data
to send for each webhook.

[Create Webhook →]
```

---

## Safety Mechanisms

### 1. Clear Data Sharing
- What data is shared clearly listed
- What data is not shared clearly listed
- Why data is shared explained

### 2. Confirmation Before Connecting
- Modal explains what will happen
- Impact clearly described
- Can cancel easily

### 3. Easy Disconnect
- Can disconnect anytime
- Clear what happens when disconnected
- Confirmation before disconnecting

### 4. Scope Clarity
- Platform-wide vs app-specific clearly indicated
- Which apps benefit explained
- No confusion about scope

---

## Success Criteria Validation

### ✅ Admin can decide whether to enable an integration without documentation
- **Evidence:** Clear descriptions, data sharing transparency, scope explanation
- **Mechanism:** Comprehensive detail view + clear language + transparent data sharing

### ✅ It is clear which app (or the platform) an integration affects
- **Evidence:** Scope badges, detailed scope section, clear app lists
- **Mechanism:** Scope badges + detailed scope section + visual indicators

### ✅ Integrations feel powerful but non-essential
- **Evidence:** Optional nature clear, value proposition clear, easy to disable
- **Mechanism:** "Connect" language (not "Required") + clear value + easy disconnect

---

## Implementation Notes

### Data Model
Each integration needs:
- `integrationKey` - Unique identifier
- `name` - Display name
- `description` - What it does
- `scope` - "platform" or array of app keys
- `status` - "not_connected", "configured", "enabled"
- `dataShared` - Array of what data is shared
- `dataNotShared` - Array of what data is not shared
- `whyShared` - Explanation

### API Endpoints
- `GET /api/settings/integrations` - List all integrations
- `GET /api/settings/integrations/:key` - Get integration details
- `POST /api/settings/integrations/:key/connect` - Connect integration
- `POST /api/settings/integrations/:key/disconnect` - Disconnect integration

### Validation Rules
- Cannot connect without understanding data sharing
- Confirmation required before connecting
- Confirmation required before disconnecting

---

## Next Steps

1. **Create IntegrationsCatalog component** - List view with cards
2. **Create IntegrationDetail component** - Detail view with all sections
3. **Add scope badges** - Platform-wide vs app-specific
4. **Add data sharing transparency** - What is shared, what is not, why
5. **Implement connect/disconnect flows** - With confirmations
6. **Add setup wizards** - For OAuth and configuration
7. **User testing** - Validate clarity with non-technical admins

