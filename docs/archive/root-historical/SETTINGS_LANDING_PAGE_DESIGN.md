# Settings Landing Page Design

## Objective
Design a Settings landing page that helps an organization admin immediately understand what can be configured and how the platform is structured, without exposing technical details.

## Design Principles
- **Clear separation** between platform-level configuration, application management, and billing
- **Implicit communication** of shared platform capabilities vs individual applications
- **Non-technical language** understandable by organization admins
- **Orientation-focused** - helps users understand structure, not configure details
- **Maximum 7 sections** for clarity and focus

---

## Top-Level Settings Sections

### 1. Organization
**Description:** Manage your company information, branding, and organization-wide preferences

**Purpose:** Platform-level configuration that affects the entire organization regardless of which applications are installed.

**What it communicates:**
- The platform is organization-centric
- Basic company settings are separate from app-specific settings
- Branding and preferences apply across all applications

---

### 2. People & Access
**Description:** Control who can use the platform and what they're allowed to do

**Purpose:** Platform-level user management, roles, and permissions that apply across all applications.

**What it communicates:**
- User management is a shared platform capability
- Access control is centralized, not per-application
- Teams and roles work across all installed apps

---

### 3. Applications
**Description:** Install and configure the business applications your organization uses

**Purpose:** Application management - shows which apps are available (Sales, Helpdesk, Projects, Audit, Portal) and allows configuration of app-specific settings.

**What it communicates:**
- Applications are separate, installable components
- Each application has its own configuration
- The platform supports multiple business applications
- Apps can be enabled/disabled independently

---

### 4. Billing & Subscription
**Description:** Manage your subscription plan, payment method, and usage limits

**Purpose:** Billing and subscription management separate from configuration.

**What it communicates:**
- Billing is a platform-level concern
- Subscription affects the entire organization
- Usage limits apply across all applications

---

### 5. Security
**Description:** Configure authentication, password policies, and security settings

**Purpose:** Platform-level security configuration that protects all applications.

**What it communicates:**
- Security is a shared platform responsibility
- Authentication and policies apply to all apps
- Security settings are centralized for consistency

---

### 6. Notifications
**Description:** Set up how your team receives alerts and updates across all applications

**Purpose:** Platform-level notification preferences and delivery channels.

**What it communicates:**
- Notifications are a shared capability
- Preferences apply across all applications
- Centralized notification management

---

### 7. Integrations
**Description:** Connect external services and tools to extend platform capabilities

**Purpose:** Platform-level integrations that can be used by multiple applications.

**What it communicates:**
- Integrations are shared resources
- External connections work across apps
- Platform can be extended with third-party services

---

## Section Organization Logic

### Platform-Level (Shared Capabilities)
These sections represent capabilities that work across all applications:
- **Organization** - Company-wide settings
- **People & Access** - User management across apps
- **Billing & Subscription** - Organization-level billing
- **Security** - Platform-wide security
- **Notifications** - Cross-app notification system
- **Integrations** - Shared external connections

### Application Management
This section represents installable applications:
- **Applications** - Install and configure Sales, Helpdesk, Projects, Audit, Portal

### Billing
This section is separate because it's transactional, not configuration:
- **Billing & Subscription** - Payment and subscription management

---

## Visual Hierarchy

The landing page should visually group sections to reinforce the platform structure:

```
┌─────────────────────────────────────────────────┐
│  Organization Settings                           │
│  └─ Company info, branding, preferences         │
├─────────────────────────────────────────────────┤
│  People & Access                                │
│  └─ Users, roles, permissions, teams           │
├─────────────────────────────────────────────────┤
│  Applications                                   │
│  └─ Sales, Helpdesk, Projects, Audit, Portal   │
├─────────────────────────────────────────────────┤
│  Billing & Subscription                         │
│  └─ Plans, payment, usage                      │
├─────────────────────────────────────────────────┤
│  Security                                       │
│  └─ Authentication, policies                    │
├─────────────────────────────────────────────────┤
│  Notifications                                  │
│  └─ Alerts, preferences, channels              │
├─────────────────────────────────────────────────┤
│  Integrations                                   │
│  └─ External service connections                │
└─────────────────────────────────────────────────┘
```

---

## Success Criteria Validation

### ✅ A first-time admin can explain how the platform is organized
- **Organization** clearly indicates company-level settings
- **People & Access** shows user management is centralized
- **Applications** makes it obvious apps are separate installable components
- **Billing & Subscription** is clearly transactional
- **Security, Notifications, Integrations** show shared platform capabilities

### ✅ It is obvious where to manage apps vs users vs billing
- **Applications** section is clearly labeled and separate
- **People & Access** is distinct from app configuration
- **Billing & Subscription** is in its own section, separate from configuration

### ✅ The platform feels structured, safe, and intentional
- Clear categorization (platform vs apps vs billing)
- Logical grouping (shared capabilities together)
- Professional, organized presentation
- No overwhelming technical details
- Each section has a clear purpose

---

## Implementation Notes

### Landing Page Behavior
- **Read-only orientation** - Shows sections and descriptions
- **Click to navigate** - Each section links to its detailed settings page
- **Visual cards** - Each section presented as a card with icon, name, and description
- **No inline editing** - Landing page is for discovery, not configuration

### Section Icons
- **Organization** - Building/Company icon
- **People & Access** - Users/Team icon
- **Applications** - Grid/Apps icon
- **Billing & Subscription** - Credit Card/Receipt icon
- **Security** - Shield/Lock icon
- **Notifications** - Bell icon
- **Integrations** - Plug/Connection icon

### Section Descriptions
Each section card should display:
1. **Section name** (large, prominent)
2. **One-line description** (simple, human language)
3. **Visual indicator** (icon or illustration)
4. **Action** (e.g., "Manage →" or "Configure →")

---

## Example Section Card

```
┌─────────────────────────────────────────┐
│  [Icon]  Applications                   │
│                                         │
│  Install and configure the business     │
│  applications your organization uses    │
│                                         │
│  [Manage Applications →]               │
└─────────────────────────────────────────┘
```

---

## Language Guidelines

### ✅ Use
- "Manage", "Configure", "Set up"
- "Your organization", "Your team"
- "Business applications"
- "Who can use", "What they can do"
- Simple, action-oriented language

### ❌ Avoid
- Technical jargon (JWT, multi-tenancy, modules, entitlements)
- Implementation details (database, API, middleware)
- Developer terminology (endpoints, routes, controllers)
- Configuration specifics (field names, data structures)

---

## Next Steps

1. **Create landing page component** - Visual card-based layout
2. **Update Settings.vue** - Add landing page as default view
3. **Add navigation** - Link each card to its detailed settings page
4. **Implement section pages** - Ensure each section has a detailed settings page
5. **Test with non-technical users** - Validate clarity and understanding

