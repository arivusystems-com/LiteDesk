# Applications Settings - Example Walkthrough

## Scenario: Admin Managing Sales Application

This document walks through a concrete example of how an organization admin would interact with the Applications settings, using the **Sales** application as the example.

---

## Step 1: Navigating to Applications

**Path:** Settings → Applications

**What the admin sees:**
- List of 5 applications (Sales, Helpdesk, Projects, Audit, Portal)
- Each application shown as a card
- Status badges visible (Enabled, Disabled, Trial, Included)
- Dependencies shown ("Uses: ...")

---

## Step 2: Viewing Sales Application List Card

**Card Display:**
```
┌─────────────────────────────────────────────────────┐
│  💼 Sales                        [Enabled ✓]         │
│  Customer relationship management and sales pipeline  │
│                                                       │
│  Uses: People, Organizations, Events, Tasks, Forms   │
│                                                       │
│  [Configure Settings →]                              │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Sales is enabled and active
- ✅ Sales uses 5 shared platform capabilities
- ✅ Can click to see more details or configure settings

**Admin's mental model:**
> "Sales is a complete product that uses some shared capabilities. It's enabled and working."

---

## Step 3: Opening Sales Detail View

**Admin clicks:** "Configure Settings →" or card

**Detail View Header:**
```
← Back to Applications

💼 Sales
Customer relationship management and sales pipeline
```

**Status Section:**
```
┌─────────────────────────────────────────────────────┐
│  Status: Enabled ✓                                  │
│  This application is active and available to your  │
│  team                                                │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Sales is enabled and active
- ✅ Team members can use it
- ✅ Status is clear and positive

**Admin's mental model:**
> "Sales is working. My team can use it. Good."

---

## Step 4: Reading About Sales

**About Section:**
```
About This Application
───────────────────────────────────────────────────────

Sales helps you manage customer relationships, track 
deals through your sales pipeline, and close more 
business. It includes features for contact management, 
deal tracking, pipeline management, and sales reporting.
```

**What the admin understands:**
- ✅ What Sales does (product description)
- ✅ Key features and use cases
- ✅ Business value

**Admin's mental model:**
> "Sales is a complete product for managing customer relationships and sales. It's not just a feature, it's a full application."

---

## Step 5: Viewing Dependencies

**Dependencies Section:**
```
Shared Capabilities Used
───────────────────────────────────────────────────────

Sales uses the following shared platform capabilities. 
These capabilities are managed separately in Core Modules 
and cannot be modified from application settings.

┌─────────────────────────────────────────────────────┐
│  👥 People                                           │
│  Used for contact and lead management               │
│  [View in Core Modules →]                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  🏢 Organizations                                   │
│  Used for company and account management             │
│  [View in Core Modules →]                           │
└─────────────────────────────────────────────────────┘

... (other dependencies)
```

**What the admin understands:**

1. **Dependencies are visible:**
   - ✅ Sales uses People, Organizations, Events, Tasks, Forms
   - ✅ Each dependency is clearly listed

2. **Dependencies are read-only:**
   - ✅ "Cannot be modified from application settings"
   - ✅ "Managed separately in Core Modules"
   - ✅ Links to Core Modules (for reference only)

3. **Separation is clear:**
   - ✅ Platform capabilities vs app behavior
   - ✅ Cannot modify shared capabilities from app settings
   - ✅ Clear boundary

**Admin's mental model:**
> "Sales uses some shared capabilities like People and Organizations. These are managed separately in Core Modules. I can see what Sales uses, but I can't change those capabilities from here. That makes sense - they're shared across apps."

---

## Step 6: Understanding Why Dependencies Are Read-Only

**Admin's thought process:**
- Sees "Cannot be modified from application settings"
- Sees "Managed separately in Core Modules"
- Understands: These are shared, so changing them here would affect other apps

**Admin's mental model:**
> "If I could change People from Sales settings, it might break Helpdesk or other apps that also use People. It makes sense that shared capabilities are managed separately."

---

## Step 7: Accessing Sales Settings

**Settings Entry Section:**
```
┌─────────────────────────────────────────────────────┐
│  Application Settings                                │
│  ───────────────────────────────────────────────────│
│                                                       │
│  Configure Sales-specific settings and behavior:     │
│                                                       │
│  [Open Sales Settings →]                            │
└─────────────────────────────────────────────────────┘
```

**Admin clicks:** "Open Sales Settings →"

**What happens:**
1. Navigates to Sales-specific settings page
2. Sees: Schema, Pipelines, Playbooks, People (Sales-specific config)
3. Can configure Sales behavior
4. Cannot modify shared platform capabilities from here

**What the admin understands:**
- ✅ Sales has its own settings
- ✅ Can configure Sales-specific behavior
- ✅ Settings are separate from platform capabilities

**Admin's mental model:**
> "Sales has its own settings for things like pipelines and playbooks. These are Sales-specific, not shared platform capabilities. I can configure how Sales works, but I can't change the shared capabilities it uses."

---

## Step 8: Viewing Disabled Application (Projects)

**Admin navigates back to Applications list**

**Projects Card:**
```
┌─────────────────────────────────────────────────────┐
│  📊 Projects                      [Disabled]         │
│  Project management and collaboration                │
│                                                       │
│  Uses: People, Organizations, Tasks, Events           │
│                                                       │
│  [Enable Application]                                │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Projects is disabled
- ✅ Can see what it would use (dependencies)
- ✅ Can enable it

**Admin clicks:** "Enable Application"

**Confirmation Modal:**
```
┌─────────────────────────────────────────────────┐
│  Enable Projects?                                │
│                                                  │
│  This will make Projects available to users who │
│  have access to it. You can configure its       │
│  settings after enabling.                        │
│                                                  │
│  [Cancel]  [Enable Projects]                   │
└─────────────────────────────────────────────────┘
```

**Admin confirms:** Clicks "Enable Projects"

**What happens:**
1. Projects is enabled
2. Status changes to "Enabled ✓"
3. Button changes to "Configure Settings →"
4. Success toast: "Projects has been enabled"

**Admin's mental model:**
> "I enabled Projects. Now it's available. I can see what it uses (dependencies) and can configure its settings."

---

## Step 9: Viewing Trial Application (Helpdesk)

**Helpdesk Card:**
```
┌─────────────────────────────────────────────────────┐
│  🎧 Helpdesk                    [Trial ⏱️]          │
│  Customer support and ticket management              │
│                                                       │
│  Uses: People, Organizations, Tasks, Forms            │
│                                                       │
│  [Configure Settings →]                              │
└─────────────────────────────────────────────────────┘
```

**Admin clicks:** Opens Helpdesk detail view

**Status Section:**
```
┌─────────────────────────────────────────────────────┐
│  Status: Trial ⏱️                                    │
│  Trial period: 12 days remaining                     │
│  Upgrade to keep this application after trial ends   │
└─────────────────────────────────────────────────────┘
```

**What the admin understands:**
- ✅ Helpdesk is in trial
- ✅ 12 days remaining
- ✅ Will expire if not upgraded
- ✅ Cannot disable during trial

**Admin's mental model:**
> "Helpdesk is in trial. I have 12 days to decide if I want to keep it. I can't disable it during trial, which makes sense - I'm evaluating it."

---

## Step 10: Viewing Included Application

**Example: Sales (if included in subscription)**

**Status Section:**
```
┌─────────────────────────────────────────────────────┐
│  Status: Included                                    │
│  This application is included in your subscription  │
│  and cannot be disabled                             │
└─────────────────────────────────────────────────────┘
```

**What the admin notices:**
- ✅ No "Disable" button
- ✅ Clear explanation: "Cannot be disabled"
- ✅ Reason: "Included in subscription"

**Admin's mental model:**
> "Sales is included in my subscription, so I can't disable it. That makes sense - it's part of what I'm paying for."

---

## Key Learnings from This Walkthrough

### 1. **Each App is an Independent Product**
- Product-oriented descriptions
- App-specific settings
- Complete applications, not just features

### 2. **Dependencies Are Transparent**
- Clearly shown what each app uses
- Read-only (cannot modify)
- Links to Core Modules for reference

### 3. **Status is Clear**
- Enabled, Disabled, Trial, Included
- Explanations for each status
- Clear why cannot disable (if applicable)

### 4. **Separation is Safe**
- Platform capabilities vs app behavior
- Cannot modify shared capabilities from app settings
- Clear boundaries

### 5. **Product-Oriented Language Works**
- "Uses" instead of "dependencies"
- "Shared capabilities" instead of "platform modules"
- Business value over technical details

---

## Success Criteria Validation

### ✅ Admin understands each app as an independent product
- **Evidence:** Admin correctly identifies Sales as a complete product
- **Mechanism:** Product-oriented language + app-specific settings + descriptions

### ✅ It is clear why an app cannot be disabled (if applicable)
- **Evidence:** Admin understands why Included apps cannot be disabled
- **Mechanism:** Status badges + explanations + no disable button

### ✅ Relationship between apps and shared capabilities feels transparent and safe
- **Evidence:** Admin understands dependencies are read-only and why
- **Mechanism:** Clear separation message + read-only dependencies + safe boundaries

---

## Edge Cases Handled

### What if admin tries to modify a dependency from app settings?
- ✅ Not possible (dependencies are read-only)
- ✅ Clear message: "Cannot be modified from application settings"
- ✅ Link to Core Modules (where they can be managed)

### What if admin tries to disable an Included app?
- ✅ Not possible (no disable button)
- ✅ Clear explanation: "Included in subscription and cannot be disabled"

### What if admin tries to disable a Trial app?
- ✅ Not possible (no disable button during trial)
- ✅ Clear explanation: "Trial period active"

### What if admin enables a disabled app?
- ✅ Confirmation modal appears
- ✅ Clear explanation of what enabling does
- ✅ Success feedback after enabling

---

## Conclusion

This walkthrough demonstrates that the Applications settings design successfully:

1. **Presents apps as products** - Each app feels like a complete, independent product
2. **Makes dependencies transparent** - Clear what each app uses, read-only, safe
3. **Explains status clearly** - Enabled, Disabled, Trial, Included all explained
4. **Maintains safe boundaries** - Platform capabilities vs app behavior clearly separated

The design achieves all success criteria through:
- Product-oriented language
- Transparent dependency display
- Clear status explanations
- Safe boundaries and read-only constraints

