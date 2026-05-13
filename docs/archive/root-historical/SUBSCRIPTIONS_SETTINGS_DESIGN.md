# Subscriptions Settings Design

## Objective
Design a Subscriptions settings experience that clearly shows what the organization is paying for, how usage is measured, and where upgrades apply—without introducing confusion about shared platform capabilities.

---

## Design Principles

### 1. **Application-Specific Billing**
- Subscriptions are per application, not platform-level
- Each app has its own plan, limits, and usage
- Clear separation: platform capabilities are free

### 2. **Business-Friendly Language**
- No technical metrics (database rows, API calls)
- Business terms (agents, tickets, contacts, deals)
- Simple, understandable limits

### 3. **Transparent Usage**
- Current usage vs limits clearly shown
- Visual progress indicators
- Clear when approaching limits

### 4. **Safe Upgrade Paths**
- Scoped to specific application
- Clear what you get with upgrade
- Predictable pricing

---

## Part 1: Subscriptions List View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Subscriptions                                                │
│  Manage plans and usage for your business applications       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Sales Icon] Sales                    [Professional] │  │
│  │  $99/month • Billed monthly                           │  │
│  │                                                       │  │
│  │  Usage: 18 of 25 users • 2,450 of 10,000 contacts   │  │
│  │                                                       │  │
│  │  [View Details →]                                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Helpdesk Icon] Helpdesk              [Trial ⏱️]   │  │
│  │  Free trial • 12 days remaining                      │  │
│  │                                                       │  │
│  │  Usage: 3 of 5 agents • 45 of 100 tickets            │  │
│  │                                                       │  │
│  │  [View Details →]                                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Projects Icon] Projects            [Included]     │  │
│  │  Included in your subscription                       │  │
│  │                                                       │  │
│  │  Usage: 2 of 10 projects • Unlimited storage         │  │
│  │                                                       │  │
│  │  [View Details →]                                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Audit Icon] Audit                  [Not Subscribed] │  │
│  │  No active subscription                              │  │
│  │                                                       │  │
│  │  [Subscribe →]                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  [Portal Icon] Portal                [Included]      │  │
│  │  Included in your subscription                       │  │
│  │                                                       │  │
│  │  Usage: Unlimited users • Unlimited profiles         │  │
│  │                                                       │  │
│  │  [View Details →]                                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Platform Capabilities                                │  │
│  │  ────────────────────────────────────────────────────│  │
│  │                                                       │
│  │  People, Organizations, Events, Tasks, Forms, Items, │
│  │  and Reports are shared platform capabilities.       │
│  │  They are available to all applications at no       │
│  │  additional cost.                                    │
│  │                                                       │
│  │  [View in Core Modules →]                            │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Card Components

Each subscription card displays:

1. **Application Icon** - Visual identifier
2. **Application Name** - Product name
3. **Plan Badge** - Professional, Starter, Trial, Included, Not Subscribed
4. **Billing Info** - Price and billing frequency, or trial info
5. **Usage Summary** - Key metrics (users, contacts, tickets, etc.)
6. **Action Button** - "View Details →" or "Subscribe →"

### Visual Indicators

#### Plan Badges

**Professional**
- **Color:** Blue (#3B82F6)
- **Text:** "Professional"
- **Meaning:** Full-featured paid plan

**Starter**
- **Color:** Green (#10B981)
- **Text:** "Starter"
- **Meaning:** Basic paid plan

**Trial ⏱️**
- **Color:** Orange (#F59E0B)
- **Icon:** Clock
- **Text:** "Trial" or "Trial - X days left"
- **Meaning:** Free trial period

**Included**
- **Color:** Purple (#8B5CF6)
- **Text:** "Included"
- **Meaning:** Part of subscription, no separate charge

**Not Subscribed**
- **Color:** Gray (#6B7280)
- **Text:** "Not Subscribed"
- **Meaning:** No active subscription

#### Usage Display

**Format:** "Usage: X of Y [metric] • X of Y [metric]"

**Examples:**
- "Usage: 18 of 25 users • 2,450 of 10,000 contacts"
- "Usage: 3 of 5 agents • 45 of 100 tickets"
- "Usage: 2 of 10 projects • Unlimited storage"

**Visual Style:**
- Progress bars (optional, subtle)
- Color coding:
  - Green: Under 80% usage
  - Yellow: 80-95% usage
  - Red: Over 95% usage

---

## Part 2: Subscription Detail View

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Subscriptions                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Helpdesk Icon] Helpdesk                                   │
│  Customer support and ticket management                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Current Plan: Trial ⏱️                               │  │
│  │  12 days remaining                                   │  │
│  │  Upgrade to keep Helpdesk after trial ends           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Usage & Limits                                             │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Agents                                                     │
│  ────────────────────────────────────────────────────────  │
│  [████████░░] 3 of 5 agents                                 │
│                                                             │
│  Tickets (This Month)                                       │
│  ────────────────────────────────────────────────────────  │
│  [████████████████████░░] 45 of 100 tickets                │
│                                                             │
│  Storage                                                    │
│  ────────────────────────────────────────────────────────  │
│  [████░░░░░░] 2.1 GB of 10 GB                               │
│                                                             │
│  Available Plans                                            │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Starter Plan                                        │  │
│  │  $29/month                                            │  │
│  │                                                       │  │
│  │  • 5 agents                                           │  │
│  │  • 100 tickets/month                                  │  │
│  │  • 10 GB storage                                      │  │
│  │  • Email support                                      │  │
│  │                                                       │  │
│  │  [Upgrade to Starter]                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Professional Plan                                    │  │
│  │  $99/month                                            │  │
│  │                                                       │  │
│  │  • 25 agents                                          │  │
│  │  • 1,000 tickets/month                                │  │
│  │  • 100 GB storage                                     │  │
│  │  • Priority support                                   │  │
│  │  • Advanced reporting                                 │  │
│  │                                                       │  │
│  │  [Upgrade to Professional]                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Enterprise Plan                                      │  │
│  │  Custom pricing                                       │  │
│  │                                                       │  │
│  │  • Unlimited agents                                   │  │
│  │  • Unlimited tickets                                 │  │
│  │  • Unlimited storage                                  │  │
│  │  • Dedicated support                                  │  │
│  │  • Custom integrations                                │  │
│  │                                                       │  │
│  │  [Contact Sales]                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  What's Included                                           │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Helpdesk uses the following shared platform capabilities │
│  at no additional cost:                                    │
│                                                             │
│  • People - For customer contact information              │
│  • Organizations - For company records                    │
│  • Tasks - For follow-up activities                      │
│  • Forms - For customer feedback collection              │
│                                                             │
│  [View in Core Modules →]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detail View Components

#### 1. Header Section
- Application icon (large)
- Application name
- Description
- Back navigation

#### 2. Current Plan Section
- Plan badge (Trial, Starter, Professional, Included)
- Billing info (price, frequency, trial days)
- Status message

#### 3. Usage & Limits Section
- Progress bars for each metric
- Current usage vs limit
- Color coding (green/yellow/red)
- Business-friendly metrics:
  - Agents (not "users")
  - Tickets (not "records")
  - Contacts (not "database rows")
  - Storage (GB, not bytes)

#### 4. Available Plans Section
- All available plans shown
- Current plan highlighted
- Features list for each plan
- Upgrade buttons
- "Contact Sales" for Enterprise

#### 5. What's Included Section
- Lists shared platform capabilities used
- Clear message: "at no additional cost"
- Link to Core Modules (for reference)

---

## Part 3: Usage Metrics (Business-Friendly)

### Sales Application

**Metrics:**
- **Users** - Team members who can access Sales
- **Contacts** - Customer and lead records
- **Deals** - Active deals in pipeline
- **Storage** - File and document storage

**Example:**
```
Users: 18 of 25
Contacts: 2,450 of 10,000
Deals: 127 of 5,000
Storage: 8.5 GB of 100 GB
```

---

### Helpdesk Application

**Metrics:**
- **Agents** - Support team members
- **Tickets** - Support tickets (monthly)
- **Storage** - File attachments and documents

**Example:**
```
Agents: 3 of 5
Tickets (This Month): 45 of 100
Storage: 2.1 GB of 10 GB
```

---

### Projects Application

**Metrics:**
- **Projects** - Active projects
- **Team Members** - Project collaborators
- **Storage** - Project files and documents

**Example:**
```
Projects: 2 of 10
Team Members: 8 of 15
Storage: 5.2 GB of 50 GB
```

---

### Audit Application

**Metrics:**
- **Auditors** - Users with audit access
- **Assignments** - Active audit assignments
- **Storage** - Audit documents and evidence

**Example:**
```
Auditors: 5 of 10
Assignments: 12 of 50
Storage: 1.8 GB of 20 GB
```

---

### Portal Application

**Metrics:**
- **Users** - Portal users (customers/partners)
- **Profiles** - Active user profiles
- **Storage** - User-uploaded files

**Example:**
```
Users: Unlimited
Profiles: 234 active
Storage: 3.5 GB of 50 GB
```

---

## Part 4: Upgrade Flow

### Upgrade Button Click

**User clicks:** "Upgrade to Professional"

**Upgrade Modal:**
```
┌─────────────────────────────────────────────────┐
│  Upgrade Helpdesk to Professional?               │
│                                                  │
│  Current Plan: Trial                            │
│  New Plan: Professional                         │
│                                                  │
│  What Changes:                                   │
│  • Agents: 5 → 25                               │
│  • Tickets: 100/month → 1,000/month            │
│  • Storage: 10 GB → 100 GB                      │
│  • Support: Email → Priority                    │
│  • New: Advanced reporting                      │
│                                                  │
│  Billing:                                       │
│  • Price: $99/month                             │
│  • Billed: Monthly                              │
│  • Next billing: [Date]                         │
│                                                  │
│  [Cancel]  [Upgrade to Professional]           │
└─────────────────────────────────────────────────┘
```

**If confirmed:**
1. Subscription upgraded
2. Limits updated immediately
3. Success toast: "Helpdesk upgraded to Professional"
4. Detail view updates with new plan

---

## Part 5: Platform Capabilities (Free)

### Platform Capabilities Card

**Location:** Bottom of subscriptions list

**Visual:**
```
┌─────────────────────────────────────────────────────┐
│  Platform Capabilities                                │
│  ───────────────────────────────────────────────────│
│                                                       │
│  People, Organizations, Events, Tasks, Forms, Items, │
│  and Reports are shared platform capabilities.       │
│  They are available to all applications at no       │
│  additional cost.                                    │
│                                                       │
│  [View in Core Modules →]                            │
└─────────────────────────────────────────────────────┘
```

**Purpose:**
- Clearly states platform capabilities are free
- Prevents confusion about billing
- Links to Core Modules for reference

**Key Message:**
- "Available to all applications at no additional cost"
- Reinforces: platform = free, apps = billable

---

## Example: Helpdesk Subscription

### List View Card
```
┌─────────────────────────────────────────────────────┐
│  🎧 Helpdesk                        [Trial ⏱️]      │
│  Free trial • 12 days remaining                     │
│                                                       │
│  Usage: 3 of 5 agents • 45 of 100 tickets           │
│                                                       │
│  [View Details →]                                    │
└─────────────────────────────────────────────────────┘
```

### Detail View - Current Plan
```
┌─────────────────────────────────────────────────────┐
│  Current Plan: Trial ⏱️                             │
│  12 days remaining                                  │
│  Upgrade to keep Helpdesk after trial ends           │
└─────────────────────────────────────────────────────┘
```

### Detail View - Usage
```
Usage & Limits
───────────────────────────────────────────────────────

Agents
───────────────────────────────────────────────────────
[████████░░] 3 of 5 agents

Tickets (This Month)
───────────────────────────────────────────────────────
[████████████████████░░] 45 of 100 tickets

Storage
───────────────────────────────────────────────────────
[████░░░░░░] 2.1 GB of 10 GB
```

### Detail View - Available Plans
```
┌─────────────────────────────────────────────────────┐
│  Starter Plan                                       │
│  $29/month                                          │
│                                                      │
│  • 5 agents                                         │
│  • 100 tickets/month                                │
│  • 10 GB storage                                    │
│  • Email support                                    │
│                                                      │
│  [Upgrade to Starter]                               │
└─────────────────────────────────────────────────────┘
```

### Detail View - What's Included
```
What's Included
───────────────────────────────────────────────────────

Helpdesk uses the following shared platform capabilities 
at no additional cost:

• People - For customer contact information
• Organizations - For company records
• Tasks - For follow-up activities
• Forms - For customer feedback collection

[View in Core Modules →]
```

---

## Safety Mechanisms

### 1. Clear Separation
- Platform capabilities card at bottom
- "At no additional cost" message
- Link to Core Modules (read-only)

### 2. Read-Only for Included
- Included apps show "Included" badge
- No upgrade/downgrade options
- Clear explanation: "Part of subscription"

### 3. Upgrade Confirmation
- Modal shows what changes
- Clear pricing
- Confirmation required

### 4. Usage Warnings
- Color coding (green/yellow/red)
- Visual progress bars
- Clear when approaching limits

---

## Success Criteria Validation

### ✅ Admin can quickly explain what they are paying for
- **Evidence:** Clear plan badges, pricing, usage per app
- **Mechanism:** Application-specific subscriptions + clear pricing

### ✅ No confusion between platform infrastructure and apps
- **Evidence:** Platform capabilities card clearly states "free"
- **Mechanism:** Clear separation + "at no additional cost" message

### ✅ Upgrade paths feel safe, scoped, and predictable
- **Evidence:** Upgrade modal shows exact changes, pricing, billing
- **Mechanism:** Scoped to specific app + clear what you get + confirmation

---

## Implementation Notes

### Data Model
Each application subscription needs:
- `appKey` - Application identifier
- `plan` - "trial", "starter", "professional", "enterprise", "included"
- `price` - Monthly price (or "included")
- `billingFrequency` - "monthly", "annual", "included"
- `trialDaysRemaining` - If plan is "trial"
- `limits` - App-specific limits:
  ```javascript
  {
    agents: 5,
    tickets: 100,
    storageGB: 10
  }
  ```
- `usage` - Current usage:
  ```javascript
  {
    agents: 3,
    tickets: 45,
    storageGB: 2.1
  }
  ```

### API Endpoints
- `GET /api/settings/subscriptions` - List all subscriptions
- `GET /api/settings/subscriptions/:appKey` - Get subscription details
- `POST /api/settings/subscriptions/:appKey/upgrade` - Upgrade subscription
- `GET /api/settings/subscriptions/:appKey/usage` - Get current usage

### Validation Rules
- Cannot downgrade Included apps
- Cannot upgrade during Trial (must wait for trial end or cancel)
- Usage cannot exceed limits (enforced at creation/update)

---

## Next Steps

1. **Create SubscriptionsList component** - List view with cards
2. **Create SubscriptionDetail component** - Detail view with usage, plans
3. **Add usage progress bars** - Visual indicators
4. **Implement upgrade flow** - Modal + confirmation
5. **Add platform capabilities card** - Free capabilities section
6. **Link to Core Modules** - From "What's Included" section
7. **User testing** - Validate clarity with non-technical admins

