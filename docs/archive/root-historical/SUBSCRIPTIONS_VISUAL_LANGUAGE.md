# Subscriptions Settings - Visual Language Reference

## Quick Reference: Plan Badges

### Professional Plan
- **Color:** Blue (#3B82F6)
- **Text:** "Professional"
- **Meaning:** Full-featured paid plan
- **Actions:** View details, upgrade/downgrade

### Starter Plan
- **Color:** Green (#10B981)
- **Text:** "Starter"
- **Meaning:** Basic paid plan
- **Actions:** View details, upgrade/downgrade

### Trial ⏱️
- **Color:** Orange (#F59E0B)
- **Icon:** Clock
- **Text:** "Trial" or "Trial - X days left"
- **Meaning:** Free trial period
- **Actions:** View details, upgrade

### Included
- **Color:** Purple (#8B5CF6)
- **Text:** "Included"
- **Meaning:** Part of subscription, no separate charge
- **Actions:** View details only (read-only)

### Not Subscribed
- **Color:** Gray (#6B7280)
- **Text:** "Not Subscribed"
- **Meaning:** No active subscription
- **Actions:** Subscribe

---

## Subscription List View Structure

```
Card Components:
1. Application Icon
2. Application Name
3. Plan Badge (top-right)
4. Billing Info (price/frequency or trial info)
5. Usage Summary (key metrics)
6. Action Button ("View Details →" or "Subscribe →")
```

---

## Subscription Detail View Structure

```
Header:
- Application icon (large)
- Application name
- Description
- Back navigation

Current Plan Section:
- Plan badge
- Billing info
- Status message

Usage & Limits Section:
- Progress bars for each metric
- Current usage vs limit
- Color coding (green/yellow/red)

Available Plans Section:
- All plans shown
- Current plan highlighted
- Features list
- Upgrade buttons

What's Included Section:
- Shared platform capabilities
- "At no additional cost" message
- Link to Core Modules
```

---

## Usage Display Format

### Format
```
Usage: X of Y [metric] • X of Y [metric]
```

### Examples
- "Usage: 18 of 25 users • 2,450 of 10,000 contacts"
- "Usage: 3 of 5 agents • 45 of 100 tickets"
- "Usage: 2 of 10 projects • Unlimited storage"

### Progress Bar Colors
- **Green:** Under 80% usage
- **Yellow:** 80-95% usage
- **Red:** Over 95% usage

---

## Business-Friendly Metrics

### Sales
- Users (not "user accounts")
- Contacts (not "contact records")
- Deals (not "deal records")
- Storage (GB, not bytes)

### Helpdesk
- Agents (not "users")
- Tickets (not "ticket records")
- Storage (GB)

### Projects
- Projects (not "project records")
- Team Members (not "users")
- Storage (GB)

### Audit
- Auditors (not "users")
- Assignments (not "assignment records")
- Storage (GB)

### Portal
- Users (unlimited)
- Profiles (not "profile records")
- Storage (GB)

---

## Interaction Patterns

### Viewing Subscription Details
1. Click "View Details →" on card
2. Navigate to detail view
3. See usage, limits, available plans
4. Upgrade if needed

### Upgrading Subscription
1. Click "Upgrade to [Plan]"
2. Upgrade modal appears
3. Shows what changes, pricing, billing
4. Confirm upgrade
5. Subscription updated

### Viewing Platform Capabilities
1. See "Platform Capabilities" card at bottom
2. Understand these are free
3. Click "View in Core Modules →" for details

---

## Example: Helpdesk Subscription

### List View
```
┌─────────────────────────────────────────┐
│ 🎧 Helpdesk          [Trial ⏱️]         │
│ Free trial • 12 days remaining          │
│                                          │
│ Usage: 3 of 5 agents • 45 of 100 tickets│
│                                          │
│ [View Details →]                        │
└─────────────────────────────────────────┘
```

### Detail View - Usage
```
Usage & Limits
───────────────────────────────────────────

Agents
───────────────────────────────────────────
[████████░░] 3 of 5 agents

Tickets (This Month)
───────────────────────────────────────────
[████████████████████░░] 45 of 100 tickets
```

### Detail View - Plans
```
┌─────────────────────────────────────────┐
│ Starter Plan                            │
│ $29/month                                │
│                                          │
│ • 5 agents                              │
│ • 100 tickets/month                     │
│ • 10 GB storage                         │
│                                          │
│ [Upgrade to Starter]                    │
└─────────────────────────────────────────┘
```

### Detail View - What's Included
```
What's Included
───────────────────────────────────────────

Helpdesk uses the following shared platform 
capabilities at no additional cost:

• People - For customer contact information
• Organizations - For company records
• Tasks - For follow-up activities

[View in Core Modules →]
```

---

## Platform Capabilities Card

### Location
Bottom of subscriptions list

### Visual
```
┌─────────────────────────────────────────┐
│ Platform Capabilities                    │
│ ────────────────────────────────────────│
│                                          │
│ People, Organizations, Events, Tasks,   │
│ Forms, Items, and Reports are shared    │
│ platform capabilities. They are        │
│ available to all applications at no     │
│ additional cost.                        │
│                                          │
│ [View in Core Modules →]               │
└─────────────────────────────────────────┘
```

### Purpose
- Clearly states platform capabilities are free
- Prevents confusion about billing
- Links to Core Modules

---

## Safety Mechanisms

1. **Clear Separation** - Platform capabilities card shows "free"
2. **Read-Only for Included** - No upgrade/downgrade options
3. **Upgrade Confirmation** - Modal shows exact changes
4. **Usage Warnings** - Color coding for approaching limits

---

## Color Palette

- **Professional:** #3B82F6 (blue)
- **Starter:** #10B981 (green)
- **Trial:** #F59E0B (orange)
- **Included:** #8B5CF6 (purple)
- **Not Subscribed:** #6B7280 (gray)
- **Usage Green:** #10B981
- **Usage Yellow:** #F59E0B
- **Usage Red:** #EF4444

---

## Success Criteria

✅ **Quickly explain what paying for** - Clear plan badges + pricing + usage  
✅ **No confusion platform vs apps** - Platform capabilities card + "free" message  
✅ **Safe upgrade paths** - Scoped to app + clear changes + confirmation

