# Subscriptions Settings - Example Walkthrough

## Scenario: Admin Managing Helpdesk Subscription

This document walks through a concrete example of how an organization admin would interact with the Subscriptions settings, using the **Helpdesk** application as the example.

---

## Step 1: Navigating to Subscriptions

**Path:** Settings → Billing & Subscription → Subscriptions

**What the admin sees:**
- List of application subscriptions
- Each app shown as a card with plan, pricing, usage
- Platform Capabilities card at bottom

---

## Step 2: Viewing Helpdesk Subscription Card

**Card Display:**
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

**What the admin understands:**
- ✅ Helpdesk is on a trial plan
- ✅ 12 days remaining
- ✅ Using 3 of 5 agents, 45 of 100 tickets
- ✅ Can click to see more details

**Admin's mental model:**
> "Helpdesk is in trial. I'm using 3 agents and 45 tickets this month. I have 12 days left to decide if I want to keep it."

---

## Step 3: Opening Helpdesk Detail View

**Admin clicks:** "View Details →"

**Detail View Header:**
```
← Back to Subscriptions

🎧 Helpdesk
Customer support and ticket management
```

**Current Plan Section:**
```
┌─────────────────────────────────────────────────────┐
│  Current Plan: Trial ⏱️                             │
│  12 days remaining                                  │
│  Upgrade to keep Helpdesk after trial ends           │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Helpdesk is on trial
- ✅ 12 days left
- ✅ Need to upgrade to keep it

**Admin's mental model:**
> "I need to upgrade Helpdesk within 12 days or it will stop working. Let me see what plans are available."

---

## Step 4: Viewing Usage & Limits

**Usage Section:**
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

**What the admin understands:**

1. **Agents:**
   - ✅ Using 3 of 5 agents (60% usage)
   - ✅ Green progress bar (under 80%)
   - ✅ 2 agents remaining

2. **Tickets:**
   - ✅ 45 of 100 tickets this month (45% usage)
   - ✅ Green progress bar
   - ✅ 55 tickets remaining this month

3. **Storage:**
   - ✅ 2.1 GB of 10 GB (21% usage)
   - ✅ Green progress bar
   - ✅ 7.9 GB remaining

**Admin's mental model:**
> "I'm using about half my limits. I have room to grow, but if I add more agents or get more tickets, I might need a bigger plan."

---

## Step 5: Viewing Available Plans

**Available Plans Section:**
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

┌─────────────────────────────────────────────────────┐
│  Professional Plan                                   │
│  $99/month                                          │
│                                                      │
│  • 25 agents                                        │
│  • 1,000 tickets/month                              │
│  • 100 GB storage                                   │
│  • Priority support                                 │
│  • Advanced reporting                               │
│                                                      │
│  [Upgrade to Professional]                          │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**

1. **Starter Plan:**
   - ✅ $29/month
   - ✅ Same limits as trial (5 agents, 100 tickets)
   - ✅ Good if current usage is enough

2. **Professional Plan:**
   - ✅ $99/month
   - ✅ Much higher limits (25 agents, 1,000 tickets)
   - ✅ Better if expecting growth

**Admin's decision process:**
> "I'm using 3 agents and 45 tickets. Starter gives me 5 agents and 100 tickets, which should be enough for now. But if I expect to grow, Professional might be better. Let me check what I get with each."

---

## Step 6: Understanding What's Included (Free)

**What's Included Section:**
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

**What the admin understands:**
- ✅ Helpdesk uses People, Organizations, Tasks, Forms
- ✅ These are free (no additional cost)
- ✅ They're shared platform capabilities
- ✅ Can view details in Core Modules

**Admin's mental model:**
> "Helpdesk uses some shared capabilities like People and Organizations. These are free - I don't pay extra for them. They're part of the platform, not part of the Helpdesk subscription."

---

## Step 7: Viewing Platform Capabilities Card

**Admin scrolls to bottom of subscriptions list**

**Platform Capabilities Card:**
```
┌─────────────────────────────────────────────────────┐
│  Platform Capabilities                                │
│  ───────────────────────────────────────────────────│
│                                                       │
│  People, Organizations, Events, Tasks, Forms, Items, │
│  and Reports are shared platform capabilities.       │
│  They are available to all applications at no         │
│  additional cost.                                    │
│                                                       │
│  [View in Core Modules →]                            │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Platform capabilities are free
- ✅ Available to all applications
- ✅ No additional cost
- ✅ These are separate from app subscriptions

**Admin's mental model:**
> "The platform capabilities like People and Organizations are free and available to all my apps. I only pay for the applications themselves (Sales, Helpdesk, etc.), not for the shared capabilities they use."

---

## Step 8: Deciding to Upgrade

**Admin's thought process:**
- Current usage: 3 agents, 45 tickets
- Starter plan: 5 agents, 100 tickets ($29/month)
- Professional plan: 25 agents, 1,000 tickets ($99/month)
- Decision: Starter is enough for now, can upgrade later if needed

**Admin clicks:** "Upgrade to Starter"

---

## Step 9: Upgrade Confirmation

**Upgrade Modal:**
```
┌─────────────────────────────────────────────────┐
│  Upgrade Helpdesk to Starter?                    │
│                                                  │
│  Current Plan: Trial                            │
│  New Plan: Starter                               │
│                                                  │
│  What Changes:                                  │
│  • Agents: 5 → 5 (no change)                    │
│  • Tickets: 100/month → 100/month (no change)  │
│  • Storage: 10 GB → 10 GB (no change)            │
│  • Support: Trial → Email support                │
│  • Trial ends → Active subscription               │
│                                                  │
│  Billing:                                       │
│  • Price: $29/month                             │
│  • Billed: Monthly                              │
│  • Next billing: [Date]                         │
│                                                  │
│  [Cancel]  [Upgrade to Starter]                │
└─────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Exact changes shown
- ✅ Pricing clear ($29/month)
- ✅ Billing frequency (monthly)
- ✅ Next billing date

**Admin confirms:** Clicks "Upgrade to Starter"

**What happens:**
1. Subscription upgraded
2. Limits remain the same (trial = starter limits)
3. Status changes from "Trial" to "Starter"
4. Success toast: "Helpdesk upgraded to Starter"
5. Detail view updates

---

## Step 10: Viewing Updated Subscription

**Updated Detail View:**
```
┌─────────────────────────────────────────────────────┐
│  Current Plan: Starter                               │
│  $29/month • Billed monthly                         │
│  Next billing: [Date]                               │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Helpdesk is now on Starter plan
- ✅ Paying $29/month
- ✅ Subscription is active
- ✅ No longer in trial

**Admin's mental model:**
> "Helpdesk is now a paid subscription. I'm paying $29/month for Starter plan. The trial is over, but I'm keeping the same limits. I can upgrade to Professional later if I need more."

---

## Step 11: Understanding Sales Subscription (Different App)

**Admin navigates back to subscriptions list**

**Sales Card:**
```
┌─────────────────────────────────────────────────────┐
│  💼 Sales                        [Professional]       │
│  $99/month • Billed monthly                          │
│                                                       │
│  Usage: 18 of 25 users • 2,450 of 10,000 contacts  │
│                                                       │
│  [View Details →]                                    │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Sales is on Professional plan
- ✅ Paying $99/month
- ✅ Using 18 of 25 users, 2,450 of 10,000 contacts
- ✅ Different subscription from Helpdesk

**Admin's mental model:**
> "Sales and Helpdesk have separate subscriptions. Sales is $99/month, Helpdesk is $29/month. They're independent - I can upgrade one without affecting the other."

---

## Step 12: Understanding Included App (Portal)

**Portal Card:**
```
┌─────────────────────────────────────────────────────┐
│  🌐 Portal                        [Included]         │
│  Included in your subscription                       │
│                                                       │
│  Usage: Unlimited users • 234 active profiles       │
│                                                       │
│  [View Details →]                                    │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Portal is included (not a separate charge)
- ✅ Part of subscription
- ✅ Unlimited users
- ✅ No upgrade/downgrade options

**Admin's mental model:**
> "Portal is included in my subscription. I don't pay extra for it. It's part of what I'm already paying for."

---

## Key Learnings from This Walkthrough

### 1. **Subscriptions Are Application-Specific**
- Each app has its own subscription
- Sales = $99/month, Helpdesk = $29/month
- Independent billing and limits

### 2. **Platform Capabilities Are Free**
- People, Organizations, etc. are free
- Available to all apps at no cost
- Clear separation from app subscriptions

### 3. **Usage is Business-Friendly**
- Agents, tickets, contacts (not technical terms)
- Visual progress bars
- Clear limits and current usage

### 4. **Upgrade Paths Are Clear**
- Exact changes shown
- Clear pricing
- Scoped to specific app

### 5. **No Confusion About Billing**
- Platform capabilities clearly marked as free
- App subscriptions clearly marked as paid
- Included apps clearly marked

---

## Success Criteria Validation

### ✅ Admin can quickly explain what they are paying for
- **Evidence:** Admin can list: "Sales $99/month, Helpdesk $29/month, Portal included"
- **Mechanism:** Clear plan badges + pricing + per-app subscriptions

### ✅ No confusion between platform infrastructure and apps
- **Evidence:** Admin understands platform capabilities are free, apps are paid
- **Mechanism:** Platform capabilities card + "at no additional cost" message

### ✅ Upgrade paths feel safe, scoped, and predictable
- **Evidence:** Admin understands upgrade is scoped to Helpdesk, knows exact changes
- **Mechanism:** Scoped to specific app + clear changes + confirmation modal

---

## Edge Cases Handled

### What if admin tries to upgrade Included app?
- ✅ Not possible (no upgrade button)
- ✅ Clear explanation: "Included in subscription"

### What if admin is at 95% usage?
- ✅ Progress bar turns red
- ✅ Warning message appears
- ✅ Upgrade suggestion shown

### What if admin tries to downgrade?
- ✅ Confirmation modal shows what will be lost
- ✅ Clear impact explanation
- ✅ Confirmation required

### What if admin views platform capabilities?
- ✅ Card clearly states "free"
- ✅ Link to Core Modules for details
- ✅ No billing information shown

---

## Conclusion

This walkthrough demonstrates that the Subscriptions settings design successfully:

1. **Shows what you're paying for** - Clear per-app subscriptions with pricing
2. **Separates platform from apps** - Platform capabilities clearly marked as free
3. **Provides safe upgrade paths** - Scoped to specific app, clear changes, confirmation

The design achieves all success criteria through:
- Application-specific subscriptions
- Clear platform capabilities section
- Business-friendly metrics
- Safe upgrade flows

