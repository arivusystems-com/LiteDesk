# Integrations Settings - Visual Language Reference

## Quick Reference: Scope Badges

### Platform-Wide
- **Color:** Blue (#3B82F6)
- **Text:** "Platform-wide"
- **Meaning:** Works across all applications
- **Icon:** Platform/shield icon (optional)

### App-Specific
- **Color:** Gray (#6B7280)
- **Text:** "Sales, Helpdesk, Projects" (list of apps)
- **Meaning:** Only works with listed applications
- **Icon:** App icons (optional)

---

## Quick Reference: Status Badges

### Enabled ✓
- **Color:** Green (#10B981)
- **Text:** "Enabled"
- **Meaning:** Integration is active
- **Action:** "Configure →"

### Not Connected
- **Color:** Gray (#6B7280)
- **Text:** "Not Connected"
- **Meaning:** Integration not set up
- **Action:** "Connect →"

### Configured
- **Color:** Blue (#3B82F6)
- **Text:** "Configured"
- **Meaning:** Set up but not enabled
- **Action:** "Enable →"

---

## Integration Catalog Structure

```
Card Components:
1. Integration Icon
2. Integration Name
3. Description (one line)
4. Scope Badge (Platform-wide or app list)
5. Status Badge (Enabled, Not Connected, Configured)
6. Action Button ("Configure →" or "Connect →")
```

---

## Integration Detail View Structure

```
Header:
- Integration icon (large)
- Integration name
- Description
- Back navigation

Status Section:
- Current status
- Brief explanation
- Action available

What This Integration Does:
- Extended description
- How it works
- What it enables

Scope Section:
- Which apps it works with
- Which apps it doesn't work with
- Clear explanation

What Data Is Shared:
- List of data shared
- List of data not shared
- Clear, specific items

Why We Share This Data:
- Explanation of why data is needed
- What happens without it
- Transparency

Connect Integration:
- Provider selection (if multiple)
- Connect button
- Setup flow entry point
```

---

## Data Sharing Display Format

### What Data Is Shared
```
When you connect [Integration], we share:
• [Specific data item 1]
• [Specific data item 2]
• [Specific data item 3]
```

### What Data Is Not Shared
```
We do not share:
• [Data item 1]
• [Data item 2]
• [Data item 3]
```

### Why We Share This Data
```
This data is needed to [purpose].
Without this information, we cannot [function].
```

---

## Confirmation Modal Format

### Connecting Integration
```
┌─────────────────────────────────────────────────┐
│  Connect [Integration Name]?                    │
│                                                  │
│  You're about to connect [Integration] to       │
│  [purpose].                                     │
│                                                  │
│  What will happen:                              │
│  • [Impact 1]                                  │
│  • [Impact 2]                                  │
│  • [Impact 3]                                  │
│                                                  │
│  [Cancel]  [Continue to Setup]                 │
└─────────────────────────────────────────────────┘
```

### Disconnecting Integration
```
┌─────────────────────────────────────────────────┐
│  Disconnect [Integration Name]?                 │
│                                                  │
│  You're about to disconnect [Integration].      │
│                                                  │
│  What will happen:                              │
│  • [Impact 1]                                  │
│  • [Impact 2]                                  │
│  • [Impact 3]                                  │
│                                                  │
│  [Cancel]  [Disconnect]                        │
└─────────────────────────────────────────────────┘
```

---

## Example: Email Provider

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

### Detail View - Scope
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

---

## Example: Calendar Sync

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

### Detail View - Scope
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

## Interaction Patterns

### Connecting Integration
1. Click "Connect →" on card
2. View detail page
3. Read data sharing information
4. Click "Connect [Provider] →"
5. Confirmation modal appears
6. If confirmed: Setup flow begins
7. Integration connected

### Disconnecting Integration
1. Click "Configure →" on enabled integration
2. View detail page
3. Click "Disconnect"
4. Confirmation modal appears
5. If confirmed: Integration disconnected
6. Status changes to "Not Connected"

### Viewing Integration Details
1. Click integration card
2. Navigate to detail view
3. See all information
4. Understand scope and data sharing
5. Decide whether to connect

---

## Color Palette

- **Platform-wide:** #3B82F6 (blue)
- **App-specific:** #6B7280 (gray)
- **Enabled:** #10B981 (green)
- **Not Connected:** #6B7280 (gray)
- **Configured:** #3B82F6 (blue)
- **Action Buttons:** #3B82F6 (blue)

---

## Success Criteria

✅ **Decide without documentation** - Clear descriptions + data sharing + scope  
✅ **Clear which app/platform** - Scope badges + detailed scope section  
✅ **Powerful but non-essential** - Optional language + clear value + easy disconnect

