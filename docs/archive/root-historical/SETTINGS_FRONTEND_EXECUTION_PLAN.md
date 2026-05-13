# Settings Frontend Execution Plan

## Overview

This document translates the finalized Settings UX, Implementation Blueprint, and API Contracts into a clear frontend execution plan. All components are registry-driven, composable, and support incremental rollout.

---

## Architecture Principles

### 1. Registry-Driven
- All app/module lists come from APIs
- No hardcoded app keys or names
- Metadata drives UI behavior

### 2. Composable Components
- Small, reusable components
- No "god components"
- Clear separation of concerns

### 3. State Management
- API state (loading, error, data)
- Permission state (can read, can write)
- UI state (modals, confirmations)

### 4. Guardrails
- Visual locks for read-only items
- Confirmation modals for high-risk actions
- Permission-based visibility

---

## Shared Components

### Base Components (Reusable Across Sections)

#### SettingsLayout
**Purpose:** Main layout wrapper for all Settings pages

**Props:**
- `title`: string
- `description`: string
- `children`: ReactNode

**Features:**
- Consistent header
- Navigation breadcrumbs
- Back button
- Loading/error states

**Usage:** Wraps all Settings pages

---

#### StatusBadge
**Purpose:** Display status with color coding

**Props:**
- `status`: "enabled" | "disabled" | "trial" | "included" | "not_connected" | "configured"
- `label`: string (optional, defaults to status)

**Features:**
- Color-coded badges
- Icon support
- Consistent styling

**Usage:** Used across all sections for status display

---

#### ScopeBadge
**Purpose:** Display scope (platform-wide vs app-specific)

**Props:**
- `scope`: "platform" | { type: "app_specific", apps: string[] }
- `apps`: AppDefinition[] (optional, for app names)

**Features:**
- Platform-wide badge (blue)
- App-specific badge (gray) with app list
- Tooltip support

**Usage:** Core Modules, Applications, Integrations sections

---

#### ConfirmationModal
**Purpose:** Confirm high-risk actions

**Props:**
- `isOpen`: boolean
- `title`: string
- `message`: string
- `impact`: string[] (list of impact items)
- `onConfirm`: () => void
- `onCancel`: () => void
- `confirmLabel`: string (default: "Confirm")
- `cancelLabel`: string (default: "Cancel")

**Features:**
- Impact explanation
- Confirmation required
- Cancel option

**Usage:** All sections for high-risk actions

---

#### LockIcon
**Purpose:** Visual indicator for read-only/locked items

**Props:**
- `reason`: string (optional, tooltip text)
- `size`: "sm" | "md" | "lg"

**Features:**
- Lock icon
- Tooltip with reason
- Consistent styling

**Usage:** Core Modules, Applications sections

---

#### PermissionGuard
**Purpose:** Hide/show content based on permissions

**Props:**
- `permission`: string (permission key)
- `children`: ReactNode
- `fallback`: ReactNode (optional)

**Features:**
- Permission check
- Fallback UI if no permission
- Hides content if no permission

**Usage:** All sections for permission-based visibility

---

#### LoadingState
**Purpose:** Display loading state

**Props:**
- `message`: string (optional)

**Features:**
- Spinner
- Optional message
- Consistent styling

**Usage:** All sections during API calls

---

#### ErrorState
**Purpose:** Display error state

**Props:**
- `error`: Error object
- `onRetry`: () => void (optional)

**Features:**
- Error message
- Retry button
- Consistent styling

**Usage:** All sections for API errors

---

#### EmptyState
**Purpose:** Display empty state

**Props:**
- `icon`: string (icon name)
- `title`: string
- `description`: string
- `action`: { label: string, onClick: () => void } (optional)

**Features:**
- Icon
- Title and description
- Optional action button

**Usage:** All sections for empty lists

---

## Section 1: Settings Landing Page

### Route
`/settings`

### Page Component
**SettingsLandingPage**

**Data Dependencies:**
- `GET /api/settings/sections` (read)

**State Management:**
- `sections`: Section[] (from API)
- `loading`: boolean
- `error`: Error | null

**Permission Handling:**
- No permissions required (all authenticated users can view)

**Components:**
- SettingsLayout
- SectionCard (for each section)
- LoadingState
- ErrorState

**SectionCard Component:**
- Displays section name, description, icon
- Clickable navigation to section detail
- No editing capabilities

**Guardrails:**
- None (read-only navigation page)

**Feature Flag:**
- `settings.landingPage.enabled`

---

## Section 2: Core Modules

### Routes
- `/settings/core-modules` (list)
- `/settings/core-modules/:moduleKey` (detail)

### Page Components

#### CoreModulesListPage
**Data Dependencies:**
- `GET /api/settings/core-modules` (read)

**State Management:**
- `modules`: CoreModule[] (from API)
- `loading`: boolean
- `error`: Error | null

**Permission Handling:**
- Read: No permission required
- Write: `manageSettings` permission

**Components:**
- SettingsLayout
- CoreModuleCard (for each module)
- LoadingState
- ErrorState
- EmptyState

**CoreModuleCard Component:**
- Displays module name, description, icon
- Shows application usage count
- Clickable navigation to detail
- No editing capabilities

**Guardrails:**
- None (list is read-only)

---

#### CoreModuleDetailPage
**Data Dependencies:**
- `GET /api/settings/core-modules/:moduleKey` (read)
- `PATCH /api/settings/core-modules/:moduleKey/applications/:appKey` (write)

**State Management:**
- `module`: CoreModule | null (from API)
- `loading`: boolean
- `error`: Error | null
- `updating`: { appKey: string } | null (which app is being updated)

**Permission Handling:**
- Read: No permission required
- Write: `manageSettings` permission

**Components:**
- SettingsLayout
- PlatformOwnershipBox (read-only)
- ApplicationUsageList
- ApplicationUsageItem (for each app)
- ToggleSwitch (for optional apps only)
- LockIcon (for required apps)
- ConfirmationModal
- LoadingState
- ErrorState

**PlatformOwnershipBox Component:**
- Displays platform ownership message
- Read-only indicator
- No editing capabilities

**ApplicationUsageList Component:**
- Lists all applications using the module
- Groups by required vs optional
- Shows enabled/disabled state

**ApplicationUsageItem Component:**
- Displays app name, usage description
- Shows required/optional indicator
- Toggle switch (if optional and has permission)
- Lock icon (if required)
- Enabled/disabled state

**ToggleSwitch Component:**
- Props: `enabled`, `onToggle`, `disabled`, `appKey`
- Disabled if required or no permission
- Shows lock icon if required

**Guardrails:**
- Lock icon for required apps (no toggle)
- Confirmation modal before disabling optional app
- Permission check before showing toggle
- Error handling for failed updates

**Confirmation Flow:**
1. User clicks toggle for optional app
2. If disabling: ConfirmationModal appears
3. Modal shows impact explanation
4. User confirms or cancels
5. If confirmed: API call to toggle
6. Update local state on success
7. Show error if failed

**Feature Flag:**
- `settings.coreModules.enabled`

---

## Section 3: Applications

### Routes
- `/settings/applications` (list)
- `/settings/applications/:appKey` (detail)

### Page Components

#### ApplicationsListPage
**Data Dependencies:**
- `GET /api/settings/applications` (read)

**State Management:**
- `applications`: Application[] (from API)
- `loading`: boolean
- `error`: Error | null

**Permission Handling:**
- Read: No permission required
- Write: `manageSettings` permission

**Components:**
- SettingsLayout
- ApplicationCard (for each app)
- LoadingState
- ErrorState
- EmptyState

**ApplicationCard Component:**
- Displays app name, description, icon
- Shows status badge
- Shows scope badge
- Shows dependency count
- Clickable navigation to detail
- No editing capabilities

**Guardrails:**
- None (list is read-only)

---

#### ApplicationDetailPage
**Data Dependencies:**
- `GET /api/settings/applications/:appKey` (read)
- `POST /api/settings/applications/:appKey/enable` (write)
- `POST /api/settings/applications/:appKey/disable` (write)

**State Management:**
- `application`: Application | null (from API)
- `loading`: boolean
- `error`: Error | null
- `updating`: boolean (enable/disable in progress)

**Permission Handling:**
- Read: No permission required
- Write: `manageSettings` permission

**Components:**
- SettingsLayout
- StatusSection
- AboutSection
- DependenciesSection
- DependencyItem (for each dependency)
- EnableDisableButton
- ConfirmationModal
- SettingsEntryPoint (link to app-specific settings)
- LoadingState
- ErrorState

**StatusSection Component:**
- Displays current status
- Shows status badge
- Shows status reason (if any)
- Read-only

**AboutSection Component:**
- Displays extended description
- Read-only

**DependenciesSection Component:**
- Lists all dependencies
- Groups by capability
- Shows usage description
- Links to Core Modules detail

**DependencyItem Component:**
- Displays capability name, usage
- Shows required indicator
- Link to Core Modules detail
- Read-only

**EnableDisableButton Component:**
- Props: `status`, `canEnable`, `canDisable`, `onEnable`, `onDisable`
- Shows "Enable" if disabled and canEnable
- Shows "Disable" if enabled and canDisable
- Disabled if cannot enable/disable
- Shows lock icon if cannot disable

**SettingsEntryPoint Component:**
- Link to app-specific settings
- Only shown if available
- Navigates to app settings route

**Guardrails:**
- Confirmation modal before enable/disable
- Permission check before showing enable/disable button
- Lock icon if cannot disable
- Error handling for failed enable/disable

**Confirmation Flow:**
1. User clicks Enable/Disable button
2. ConfirmationModal appears
3. Modal shows impact explanation
4. User confirms or cancels
5. If confirmed: API call to enable/disable
6. Update local state on success
7. Show error if failed

**Feature Flag:**
- `settings.applications.enabled`

---

## Section 4: Subscriptions

### Routes
- `/settings/subscriptions` (list)
- `/settings/subscriptions/:appKey` (detail)

### Page Components

#### SubscriptionsListPage
**Data Dependencies:**
- `GET /api/settings/subscriptions` (read)

**State Management:**
- `subscriptions`: Subscription[] (from API)
- `platformCapabilities`: PlatformCapabilities (from API)
- `loading`: boolean
- `error`: Error | null

**Permission Handling:**
- Read: `viewBilling` permission
- Write: `manageBilling` permission

**Components:**
- SettingsLayout
- PermissionGuard (for viewBilling)
- SubscriptionCard (for each subscription)
- PlatformCapabilitiesCard
- LoadingState
- ErrorState
- EmptyState

**SubscriptionCard Component:**
- Displays app name, plan name, price
- Shows status badge
- Shows usage summary (current/limit for key metrics)
- Shows usage progress bars
- Clickable navigation to detail
- No editing capabilities

**PlatformCapabilitiesCard Component:**
- Displays platform capabilities message
- Lists platform capabilities
- Links to Core Modules
- Read-only

**Guardrails:**
- Permission check (viewBilling required)
- Read-only (no editing on list page)

---

#### SubscriptionDetailPage
**Data Dependencies:**
- `GET /api/settings/subscriptions/:appKey` (read)
- `POST /api/settings/subscriptions/:appKey/upgrade` (write)

**State Management:**
- `subscription`: Subscription | null (from API)
- `loading`: boolean
- `error`: Error | null
- `upgrading`: { plan: string } | null (which plan is being upgraded to)

**Permission Handling:**
- Read: `viewBilling` permission
- Write: `manageBilling` permission

**Components:**
- SettingsLayout
- PermissionGuard (for viewBilling)
- CurrentPlanSection
- UsageLimitsSection
- UsageMetric (for each metric)
- AvailablePlansSection
- PlanCard (for each available plan)
- UpgradeButton
- IncludedCapabilitiesSection
- ConfirmationModal
- LoadingState
- ErrorState

**CurrentPlanSection Component:**
- Displays current plan name, price
- Shows status badge
- Shows trial days remaining (if trial)
- Shows next billing date (if applicable)
- Read-only

**UsageLimitsSection Component:**
- Lists all usage metrics
- Shows current/limit/percentage
- Shows progress bars with color coding
- Shows status (good/warning/critical)
- Read-only

**UsageMetric Component:**
- Props: `metricKey`, `current`, `limit`, `percentage`, `status`, `unit`
- Displays metric name, current, limit
- Shows progress bar
- Color-coded by status
- Read-only

**AvailablePlansSection Component:**
- Lists all available plans
- Shows plan cards
- Highlights current plan
- Shows upgrade buttons (if can upgrade)

**PlanCard Component:**
- Displays plan name, price, billing frequency
- Lists features
- Shows limits
- Shows "Current Plan" badge if isCurrent
- Shows upgrade button if canUpgrade
- Read-only (except upgrade button)

**UpgradeButton Component:**
- Props: `plan`, `onUpgrade`, `canUpgrade`
- Disabled if cannot upgrade
- Shows lock icon if cannot upgrade
- Triggers upgrade flow

**IncludedCapabilitiesSection Component:**
- Lists included platform capabilities
- Links to Core Modules
- Read-only

**Guardrails:**
- Permission check (viewBilling for read, manageBilling for write)
- Confirmation modal before upgrading
- Lock icon if cannot upgrade
- Error handling for failed upgrade

**Confirmation Flow:**
1. User clicks Upgrade button
2. ConfirmationModal appears
3. Modal shows plan change details
4. User confirms or cancels
5. If confirmed: API call to upgrade
6. Update local state on success
7. Show error if failed

**Feature Flag:**
- `settings.subscriptions.enabled`

---

## Section 5: Users & Access

### Routes
- `/settings/users-access` (landing)
- `/settings/users-access/users` (user list)
- `/settings/users-access/users/:userId` (user detail)
- `/settings/users-access/roles` (role list)
- `/settings/users-access/roles/:roleId` (role detail)

### Page Components

#### UsersAccessLandingPage
**Data Dependencies:**
- None (static navigation)

**State Management:**
- None

**Permission Handling:**
- `manageUsers` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageUsers)
- NavigationTabs
- TabItem (Users, Roles)

**NavigationTabs Component:**
- Tabs for Users and Roles
- Active tab highlighting
- Navigation to respective pages

---

#### UsersListPage
**Data Dependencies:**
- `GET /api/settings/users` (read)

**State Management:**
- `users`: User[] (from API)
- `loading`: boolean
- `error`: Error | null
- `pagination`: { page: number, perPage: number, total: number }
- `filters`: { search: string, status: string }

**Permission Handling:**
- `manageUsers` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageUsers)
- UsersTable
- UserRow (for each user)
- SearchInput
- StatusFilter
- Pagination
- LoadingState
- ErrorState
- EmptyState

**UsersTable Component:**
- Displays users in table format
- Sortable columns
- Searchable
- Filterable by status
- Paginated

**UserRow Component:**
- Displays user name, email, role
- Shows application access badges
- Shows status badge
- Clickable navigation to detail
- No editing capabilities

**Guardrails:**
- Permission check (manageUsers required)
- Read-only (no editing on list page)

---

#### UserDetailPage
**Data Dependencies:**
- `GET /api/settings/users/:userId` (read)
- `PUT /api/settings/users/:userId` (write)

**State Management:**
- `user`: User | null (from API)
- `loading`: boolean
- `error`: Error | null
- `saving`: boolean
- `formData`: { applicationAccess: string[], appPermissions: object }

**Permission Handling:**
- `manageUsers` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageUsers)
- UserInfoSection
- ApplicationAccessSection
- ApplicationAccessItem (for each app)
- ToggleSwitch (for app access)
- PermissionsSection
- AppPermissionsGroup (for each app)
- ModulePermissions (for each module)
- PermissionCheckbox (for each action)
- PlatformPermissionsSection
- PlatformPermissionItem (read-only)
- LegacyPermissionsSection (collapsed, read-only)
- SaveButton
- ConfirmationModal
- LoadingState
- ErrorState

**UserInfoSection Component:**
- Displays user name, email, role
- Shows status badge
- Read-only (editing handled elsewhere)

**ApplicationAccessSection Component:**
- Lists all available applications
- Shows enabled/disabled state
- Toggle switches for each app
- Disabled if app not enabled for organization

**ApplicationAccessItem Component:**
- Displays app name
- Toggle switch for enable/disable
- Disabled if app not enabled for organization

**PermissionsSection Component:**
- Groups permissions by application
- Shows only apps user has access to
- Collapsible groups

**AppPermissionsGroup Component:**
- Props: `appKey`, `appName`, `permissions`
- Groups permissions by app
- Collapsible
- Shows module permissions

**ModulePermissions Component:**
- Props: `moduleKey`, `moduleName`, `permissions`
- Groups permissions by module
- Shows action checkboxes

**PermissionCheckbox Component:**
- Props: `action`, `enabled`, `onChange`, `disabled`
- Checkbox for each permission action
- Disabled if no permission to manage

**PlatformPermissionsSection Component:**
- Lists platform-level permissions
- Read-only (cannot modify from user settings)
- Clear separation from app permissions

**LegacyPermissionsSection Component:**
- Collapsed by default
- Read-only
- Shows migration path
- Discouraged from use

**Guardrails:**
- Permission check (manageUsers required)
- Cannot assign access to apps not enabled for organization
- Cannot modify platform permissions
- Cannot edit legacy permissions
- Confirmation modal before saving (if high-risk changes)
- Error handling for failed save

**Confirmation Flow:**
1. User modifies permissions
2. User clicks Save
3. If high-risk changes: ConfirmationModal appears
4. Modal shows what will change
5. User confirms or cancels
6. If confirmed: API call to update
7. Update local state on success
8. Show error if failed

**Feature Flag:**
- `settings.usersAccess.enabled`

---

#### RolesListPage
**Data Dependencies:**
- `GET /api/settings/roles` (read)

**State Management:**
- `roles`: Role[] (from API)
- `loading`: boolean
- `error`: Error | null

**Permission Handling:**
- `manageUsers` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageUsers)
- RolesGrid
- RoleCard (for each role)
- CreateRoleButton
- LoadingState
- ErrorState
- EmptyState

**RolesGrid Component:**
- Displays roles in grid format
- Responsive layout

**RoleCard Component:**
- Displays role name, description
- Shows user count
- Shows system role badge (if applicable)
- Clickable navigation to detail
- No editing capabilities

**CreateRoleButton Component:**
- Button to create new role
- Navigates to role creation page
- Disabled if no permission

**Guardrails:**
- Permission check (manageUsers required)
- Read-only (no editing on list page)

---

#### RoleDetailPage
**Data Dependencies:**
- `GET /api/settings/roles/:roleId` (read)
- `PUT /api/settings/roles/:roleId` (write)

**State Management:**
- `role`: Role | null (from API)
- `loading`: boolean
- `error`: Error | null
- `saving`: boolean
- `formData`: { appPermissions: object, applicationAccess: string[] }

**Permission Handling:**
- `manageUsers` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageUsers)
- RoleInfoSection
- UserCountSection
- PermissionsSection
- AppPermissionsGroup (for each app)
- ModulePermissions (for each module)
- PermissionCheckbox (for each action)
- PlatformPermissionsSection
- PlatformPermissionItem (read-only)
- LegacyPermissionsSection (collapsed, read-only)
- ApplicationAccessSection
- ApplicationAccessItem (for each app)
- SaveButton
- ConfirmationModal
- LoadingState
- ErrorState

**RoleInfoSection Component:**
- Displays role name, description
- Shows system role badge (if applicable)
- Read-only (editing handled elsewhere)

**UserCountSection Component:**
- Displays number of users with this role
- Link to view users
- Read-only

**PermissionsSection Component:**
- Same structure as UserDetailPage
- Groups permissions by application
- Shows only apps enabled for organization

**Guardrails:**
- Permission check (manageUsers required)
- Cannot assign permissions for apps not enabled for organization
- Cannot modify platform permissions
- Cannot edit legacy permissions
- Confirmation modal before saving (if high-risk changes)
- Error handling for failed save

**Confirmation Flow:**
1. User modifies permissions
2. User clicks Save
3. If high-risk changes: ConfirmationModal appears
4. Modal shows what will change
5. User confirms or cancels
6. If confirmed: API call to update
7. Update local state on success
8. Show error if failed

**Feature Flag:**
- `settings.usersAccess.enabled`

---

## Section 6: Security

### Routes
- `/settings/security` (overview)
- `/settings/security/password-rules` (password rules config)
- `/settings/security/session-controls` (session controls config)
- `/settings/security/two-factor-auth` (2FA config)
- `/settings/security/login-activity` (login activity view)
- `/settings/security/events` (security events view)

### Page Components

#### SecurityOverviewPage
**Data Dependencies:**
- `GET /api/settings/security` (read)

**State Management:**
- `security`: SecuritySettings | null (from API)
- `loading`: boolean
- `error`: Error | null

**Permission Handling:**
- `manageSettings` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageSettings)
- SecurityStatusCard
- SecurityControlsGrid
- ControlCard (for each control)
- RecentActivitySection
- ActivityCard (for login activity)
- ActivityCard (for security events)
- LoadingState
- ErrorState

**SecurityStatusCard Component:**
- Displays security status
- Shows status badge (all good, attention needed, action required)
- Shows status message
- Read-only

**SecurityControlsGrid Component:**
- Grid of control cards
- Links to configuration pages

**ControlCard Component:**
- Displays control name, description, icon
- Shows current status (if applicable)
- Link to configuration page
- Read-only (navigation only)

**RecentActivitySection Component:**
- Shows recent login activity summary
- Shows recent security events summary
- Links to detailed views

**ActivityCard Component:**
- Props: `type`, `summary`, `link`
- Displays activity summary
- Link to detailed view

**Guardrails:**
- Permission check (manageSettings required)
- Read-only (overview only)

---

#### PasswordRulesPage
**Data Dependencies:**
- `GET /api/settings/security` (read)
- `PUT /api/settings/security/password-rules` (write)

**State Management:**
- `passwordRules`: PasswordRules | null (from API)
- `loading`: boolean
- `error`: Error | null
- `saving`: boolean
- `formData`: PasswordRules

**Permission Handling:**
- `manageSettings` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageSettings)
- PasswordRulesForm
- MinLengthSlider
- RequiredCharactersCheckboxes
- PasswordExpirationToggle
- PasswordHistoryToggle
- SaveButton
- ConfirmationModal
- LoadingState
- ErrorState

**PasswordRulesForm Component:**
- Form for password rules
- All form fields
- Validation
- Save button

**MinLengthSlider Component:**
- Props: `value`, `onChange`, `min`, `max`
- Slider for minimum length
- Shows current value

**RequiredCharactersCheckboxes Component:**
- Checkboxes for required character types
- Uppercase, lowercase, numbers, special chars

**PasswordExpirationToggle Component:**
- Toggle for expiration
- Dropdown for expiration days (if enabled)

**PasswordHistoryToggle Component:**
- Toggle for prevent reuse
- Input for history count (if enabled)

**Guardrails:**
- Permission check (manageSettings required)
- Validation (minLength 8-20)
- Confirmation modal before saving (if minLength increased)
- Impact explanation in confirmation modal
- Error handling for failed save

**Confirmation Flow:**
1. User modifies password rules
2. User clicks Save
3. If minLength increased: ConfirmationModal appears
4. Modal shows impact explanation
5. User confirms or cancels
6. If confirmed: API call to update
7. Update local state on success
8. Show error if failed

**Feature Flag:**
- `settings.security.enabled`

---

#### SessionControlsPage
**Data Dependencies:**
- `GET /api/settings/security` (read)
- `PUT /api/settings/security/session-controls` (write)

**State Management:**
- `sessionControls`: SessionControls | null (from API)
- `loading`: boolean
- `error`: Error | null
- `saving`: boolean
- `formData`: SessionControls

**Permission Handling:**
- `manageSettings` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageSettings)
- SessionControlsForm
- DurationDropdown
- InactiveTimeoutToggle
- InactiveTimeoutInput
- SaveButton
- ConfirmationModal
- LoadingState
- ErrorState

**SessionControlsForm Component:**
- Form for session controls
- All form fields
- Validation
- Save button

**DurationDropdown Component:**
- Props: `value`, `onChange`, `options`
- Dropdown for session duration
- Options: 1 hour, 1 day, 7 days, 30 days, never

**InactiveTimeoutToggle Component:**
- Toggle for inactive timeout
- Input for timeout minutes (if enabled)

**Guardrails:**
- Permission check (manageSettings required)
- Validation (duration valid enum, timeout 30-480 minutes)
- Confirmation modal before saving
- Error handling for failed save

**Confirmation Flow:**
1. User modifies session controls
2. User clicks Save
3. ConfirmationModal appears
4. Modal shows impact explanation
5. User confirms or cancels
6. If confirmed: API call to update
7. Update local state on success
8. Show error if failed

**Feature Flag:**
- `settings.security.enabled`

---

#### TwoFactorAuthPage
**Data Dependencies:**
- `GET /api/settings/security` (read)
- `PUT /api/settings/security/two-factor-auth` (write)

**State Management:**
- `twoFactorAuth`: TwoFactorAuth | null (from API)
- `loading`: boolean
- `error`: Error | null
- `saving`: boolean
- `formData`: TwoFactorAuth

**Permission Handling:**
- `manageSettings` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageSettings)
- TwoFactorAuthForm
- RequiredRadioGroup
- SaveButton
- ConfirmationModal
- LoadingState
- ErrorState

**TwoFactorAuthForm Component:**
- Form for 2FA settings
- Radio group for required options
- Save button

**RequiredRadioGroup Component:**
- Props: `value`, `onChange`, `options`
- Radio buttons: Not Required, Required for All, Required for Admins

**Guardrails:**
- Permission check (manageSettings required)
- Confirmation modal before saving (if requiring for all users)
- Impact explanation in confirmation modal
- Error handling for failed save

**Confirmation Flow:**
1. User modifies 2FA settings
2. User clicks Save
3. If requiring for all users: ConfirmationModal appears
4. Modal shows impact explanation
5. User confirms or cancels
6. If confirmed: API call to update
7. Update local state on success
8. Show error if failed

**Feature Flag:**
- `settings.security.enabled`

---

#### LoginActivityPage
**Data Dependencies:**
- `GET /api/settings/security/login-activity` (read)

**State Management:**
- `loginActivity`: LoginActivity[] (from API)
- `loading`: boolean
- `error`: Error | null
- `pagination`: { page: number, perPage: number, total: number }
- `filters`: { timeRange: string, userId: string, status: string }

**Permission Handling:**
- `manageSettings` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageSettings)
- LoginActivityTable
- LoginActivityRow (for each activity)
- TimeRangeFilter
- UserFilter
- StatusFilter
- Pagination
- LoadingState
- ErrorState
- EmptyState

**LoginActivityTable Component:**
- Table of login activities
- Sortable columns
- Filterable
- Paginated

**LoginActivityRow Component:**
- Displays user, status, location, timestamp
- Status badge (successful/failed)
- Read-only

**Guardrails:**
- Permission check (manageSettings required)
- Read-only (no editing)

**Feature Flag:**
- `settings.security.enabled`

---

#### SecurityEventsPage
**Data Dependencies:**
- `GET /api/settings/security/events` (read)

**State Management:**
- `securityEvents`: SecurityEvent[] (from API)
- `loading`: boolean
- `error`: Error | null
- `pagination`: { page: number, perPage: number, total: number }
- `filters`: { timeRange: string, eventType: string }

**Permission Handling:**
- `manageSettings` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageSettings)
- SecurityEventsTable
- SecurityEventRow (for each event)
- TimeRangeFilter
- EventTypeFilter
- Pagination
- LoadingState
- ErrorState
- EmptyState

**SecurityEventsTable Component:**
- Table of security events
- Sortable columns
- Filterable
- Paginated

**SecurityEventRow Component:**
- Displays event type, description, user, timestamp
- Event type badge
- Read-only

**Guardrails:**
- Permission check (manageSettings required)
- Read-only (no editing)

**Feature Flag:**
- `settings.security.enabled`

---

## Section 7: Integrations

### Routes
- `/settings/integrations` (catalog)
- `/settings/integrations/:integrationKey` (detail)

### Page Components

#### IntegrationsCatalogPage
**Data Dependencies:**
- `GET /api/settings/integrations` (read)

**State Management:**
- `integrations`: Integration[] (from API)
- `loading`: boolean
- `error`: Error | null

**Permission Handling:**
- `manageIntegrations` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageIntegrations)
- IntegrationsGrid
- IntegrationCard (for each integration)
- LoadingState
- ErrorState
- EmptyState

**IntegrationsGrid Component:**
- Grid of integration cards
- Responsive layout

**IntegrationCard Component:**
- Displays integration name, description, icon
- Shows scope badge
- Shows status badge
- Link to detail or connect button
- No editing capabilities

**Guardrails:**
- Permission check (manageIntegrations required)
- Read-only (no editing on catalog page)

---

#### IntegrationDetailPage
**Data Dependencies:**
- `GET /api/settings/integrations/:integrationKey` (read)
- `POST /api/settings/integrations/:integrationKey/connect` (write)
- `POST /api/settings/integrations/:integrationKey/disconnect` (write)

**State Management:**
- `integration`: Integration | null (from API)
- `loading`: boolean
- `error`: Error | null
- `connecting`: boolean
- `disconnecting`: boolean

**Permission Handling:**
- `manageIntegrations` permission

**Components:**
- SettingsLayout
- PermissionGuard (for manageIntegrations)
- StatusSection
- WhatItDoesSection
- ScopeSection
- ScopeAppList (if app-specific)
- DataSharingSection
- DataSharedList
- DataNotSharedList
- WhySharedSection
- ConnectSection
- ProviderSelector (if multiple providers)
- ConnectButton
- DisconnectButton
- ConfirmationModal
- LoadingState
- ErrorState

**StatusSection Component:**
- Displays current status
- Shows status badge
- Shows provider (if connected)
- Disconnect button (if connected)

**WhatItDoesSection Component:**
- Displays extended description
- Read-only

**ScopeSection Component:**
- Displays scope type
- Shows platform-wide badge or app list
- Read-only

**ScopeAppList Component:**
- Lists apps integration works with
- Shows usage for each app
- Read-only

**DataSharingSection Component:**
- Lists what data is shared
- Lists what data is not shared
- Explains why data is shared
- Read-only

**DataSharedList Component:**
- Bullet list of shared data items
- Read-only

**DataNotSharedList Component:**
- Bullet list of not shared data items
- Read-only

**WhySharedSection Component:**
- Explanation of why data is shared
- Read-only

**ConnectSection Component:**
- Provider selection (if multiple)
- Connect button
- OAuth flow initiation

**ProviderSelector Component:**
- Props: `providers`, `selected`, `onSelect`
- Radio buttons or buttons for provider selection
- Only shown if multiple providers

**ConnectButton Component:**
- Props: `provider`, `onConnect`, `canConnect`
- Button to connect integration
- Disabled if cannot connect
- Triggers OAuth flow

**DisconnectButton Component:**
- Props: `onDisconnect`
- Button to disconnect integration
- Triggers confirmation modal

**Guardrails:**
- Permission check (manageIntegrations required)
- Cannot connect if app not enabled (for app-specific integrations)
- Confirmation modal before connecting/disconnecting
- Error handling for failed connect/disconnect
- OAuth flow handled securely

**Confirmation Flow (Connect):**
1. User clicks Connect button
2. ConfirmationModal appears
3. Modal shows what will happen
4. User confirms or cancels
5. If confirmed: API call to initiate OAuth
6. Redirect to OAuth URL
7. Handle callback on return

**Confirmation Flow (Disconnect):**
1. User clicks Disconnect button
2. ConfirmationModal appears
3. Modal shows what will happen
4. User confirms or cancels
5. If confirmed: API call to disconnect
6. Update local state on success
7. Show error if failed

**Feature Flag:**
- `settings.integrations.enabled`

---

## State Management Strategy

### API State
**Pattern:** Custom hooks for each API endpoint

**Example:**
```typescript
// useCoreModules.ts
function useCoreModules() {
  const [modules, setModules] = useState<CoreModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    fetchCoreModules()
      .then(setModules)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  
  return { modules, loading, error };
}
```

**Benefits:**
- Reusable across components
- Consistent error handling
- Loading state management

---

### Permission State
**Pattern:** Permission context + hooks

**Example:**
```typescript
// PermissionContext.tsx
const PermissionContext = createContext<Permissions>({});

function PermissionProvider({ children }) {
  const [permissions, setPermissions] = useState<Permissions>({});
  
  useEffect(() => {
    fetchPermissions().then(setPermissions);
  }, []);
  
  return (
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  );
}

// usePermission.ts
function usePermission(permission: string): boolean {
  const permissions = useContext(PermissionContext);
  return permissions[permission] === true;
}
```

**Benefits:**
- Centralized permission checks
- Consistent permission handling
- Easy to test

---

### UI State
**Pattern:** Local component state for UI-specific state

**Example:**
```typescript
function CoreModuleDetailPage() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  
  // ... component logic
}
```

**Benefits:**
- Isolated to component
- Easy to manage
- No global state pollution

---

## Guardrails Implementation

### Visual Locks
**Pattern:** LockIcon component + disabled state

**Example:**
```typescript
<ToggleSwitch
  enabled={app.enabled}
  onToggle={handleToggle}
  disabled={app.required || !hasPermission}
>
  {app.required && <LockIcon reason="This application is required" />}
</ToggleSwitch>
```

**Enforcement:**
- Lock icon shown for required items
- Toggle disabled if required or no permission
- Tooltip explains why locked

---

### Confirmation Modals
**Pattern:** ConfirmationModal component + state management

**Example:**
```typescript
function ApplicationDetailPage() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  
  const handleDisable = () => {
    setPendingAction({ type: 'disable' });
    setShowConfirm(true);
  };
  
  const handleConfirm = () => {
    if (pendingAction?.type === 'disable') {
      disableApplication(appKey).then(() => {
        setShowConfirm(false);
        setPendingAction(null);
        refetch();
      });
    }
  };
  
  return (
    <>
      <DisableButton onClick={handleDisable} />
      <ConfirmationModal
        isOpen={showConfirm}
        title="Disable Application?"
        message="You're about to disable this application."
        impact={[
          "Users will lose access to this application",
          "Data will remain but cannot be accessed"
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
```

**Enforcement:**
- Modal shown before high-risk actions
- Impact explanation required
- Confirmation required before proceeding

---

### Permission Guards
**Pattern:** PermissionGuard component + permission checks

**Example:**
```typescript
<PermissionGuard permission="manageSettings">
  <EnableDisableButton />
</PermissionGuard>
```

**Enforcement:**
- Component hidden if no permission
- Fallback UI shown if no permission
- Consistent across all sections

---

## Testing Strategy

### Unit Tests
**Focus:** Component logic, state management, guardrails

**Example:**
```typescript
describe('CoreModuleDetailPage', () => {
  it('shows lock icon for required apps', () => {
    const module = { applications: [{ required: true }] };
    render(<CoreModuleDetailPage module={module} />);
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });
  
  it('requires confirmation before disabling optional app', () => {
    // ... test confirmation flow
  });
});
```

---

### Integration Tests
**Focus:** API integration, permission checks, guardrails

**Example:**
```typescript
describe('ApplicationDetailPage Integration', () => {
  it('disables application after confirmation', async () => {
    // ... test full flow
  });
  
  it('shows error if disable fails', async () => {
    // ... test error handling
  });
});
```

---

### E2E Tests
**Focus:** User flows, guardrails, permissions

**Example:**
```typescript
describe('Settings E2E', () => {
  it('user can enable application with confirmation', () => {
    // ... test full user flow
  });
  
  it('user cannot disable required app', () => {
    // ... test guardrail
  });
});
```

---

## Feature Flags

### Flag Structure
```typescript
const featureFlags = {
  settings: {
    landingPage: { enabled: true },
    coreModules: { enabled: true },
    applications: { enabled: true },
    subscriptions: { enabled: true },
    usersAccess: { enabled: true },
    security: { enabled: true },
    integrations: { enabled: true }
  }
};
```

### Usage
```typescript
function SettingsRouter() {
  return (
    <Routes>
      {featureFlags.settings.landingPage.enabled && (
        <Route path="/settings" element={<SettingsLandingPage />} />
      )}
      {featureFlags.settings.coreModules.enabled && (
        <Route path="/settings/core-modules" element={<CoreModulesListPage />} />
      )}
      {/* ... other routes */}
    </Routes>
  );
}
```

**Benefits:**
- Incremental rollout
- Easy to disable sections
- A/B testing support

---

## Success Criteria Validation

### ✅ Frontend engineer can start coding without asking product questions
- **Evidence:** Complete component specifications, data dependencies, state management, guardrails
- **Mechanism:** Detailed execution plan + component specs + API contracts

### ✅ Components can be reused across Settings sections
- **Evidence:** Shared components defined, composable structure, consistent patterns
- **Mechanism:** Base components + reusable patterns + consistent APIs

### ✅ UI behavior cannot violate platform rules even accidentally
- **Evidence:** Guardrails defined, permission checks, confirmation modals, visual locks
- **Mechanism:** Permission guards + confirmation modals + visual locks + validation

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Shared components (SettingsLayout, StatusBadge, etc.)
- [ ] Permission system (PermissionContext, usePermission)
- [ ] API hooks (useCoreModules, useApplications, etc.)
- [ ] Error handling (ErrorState, error boundaries)
- [ ] Loading states (LoadingState)

### Phase 2: Core Sections
- [ ] Settings Landing Page
- [ ] Core Modules (list + detail)
- [ ] Applications (list + detail)

### Phase 3: Extended Sections
- [ ] Subscriptions (list + detail)
- [ ] Users & Access (users + roles)
- [ ] Security (overview + config pages)

### Phase 4: Integrations
- [ ] Integrations (catalog + detail)
- [ ] OAuth flow handling

### Phase 5: Polish
- [ ] Feature flags
- [ ] Testing
- [ ] Error handling improvements
- [ ] Performance optimization

---

## Conclusion

This execution plan provides:
1. **Complete component specifications** - All components defined with props and behavior
2. **Clear data dependencies** - Which APIs to call, when, and how
3. **State management strategy** - How to manage API state, permissions, UI state
4. **Guardrails implementation** - Visual locks, confirmations, permission checks
5. **Testing strategy** - Unit, integration, E2E tests
6. **Feature flag support** - Incremental rollout capability

Frontend engineers can start coding immediately without asking product questions. All components are composable, reusable, and registry-driven. UI behavior cannot violate platform rules due to comprehensive guardrails.

