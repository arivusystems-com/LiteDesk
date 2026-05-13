# Settings Frontend Quick Reference

## Component Inventory

### Shared Components (Use Across All Sections)
- `SettingsLayout` - Main layout wrapper
- `StatusBadge` - Status display with color coding
- `ScopeBadge` - Platform-wide vs app-specific badge
- `ConfirmationModal` - High-risk action confirmation
- `LockIcon` - Read-only/locked indicator
- `PermissionGuard` - Permission-based visibility
- `LoadingState` - Loading spinner
- `ErrorState` - Error display
- `EmptyState` - Empty list display

---

## Routes by Section

### Settings Landing Page
- `/settings` - Landing page

### Core Modules
- `/settings/core-modules` - List
- `/settings/core-modules/:moduleKey` - Detail

### Applications
- `/settings/applications` - List
- `/settings/applications/:appKey` - Detail

### Subscriptions
- `/settings/subscriptions` - List
- `/settings/subscriptions/:appKey` - Detail

### Users & Access
- `/settings/users-access` - Landing
- `/settings/users-access/users` - User list
- `/settings/users-access/users/:userId` - User detail
- `/settings/users-access/roles` - Role list
- `/settings/users-access/roles/:roleId` - Role detail

### Security
- `/settings/security` - Overview
- `/settings/security/password-rules` - Password rules config
- `/settings/security/session-controls` - Session controls config
- `/settings/security/two-factor-auth` - 2FA config
- `/settings/security/login-activity` - Login activity view
- `/settings/security/events` - Security events view

### Integrations
- `/settings/integrations` - Catalog
- `/settings/integrations/:integrationKey` - Detail

---

## API Hooks Pattern

### Pattern
```typescript
function use[Section]() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    fetch[Section]()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  
  return { data, loading, error };
}
```

### Hooks Needed
- `useCoreModules()` - GET /api/settings/core-modules
- `useCoreModule(moduleKey)` - GET /api/settings/core-modules/:moduleKey
- `useApplications()` - GET /api/settings/applications
- `useApplication(appKey)` - GET /api/settings/applications/:appKey
- `useSubscriptions()` - GET /api/settings/subscriptions
- `useSubscription(appKey)` - GET /api/settings/subscriptions/:appKey
- `useUsers()` - GET /api/settings/users
- `useUser(userId)` - GET /api/settings/users/:userId
- `useRoles()` - GET /api/settings/roles
- `useRole(roleId)` - GET /api/settings/roles/:roleId
- `useSecurity()` - GET /api/settings/security
- `useLoginActivity()` - GET /api/settings/security/login-activity
- `useSecurityEvents()` - GET /api/settings/security/events
- `useIntegrations()` - GET /api/settings/integrations
- `useIntegration(integrationKey)` - GET /api/settings/integrations/:integrationKey

---

## Permission Requirements

| Section | Read Permission | Write Permission |
|---------|----------------|-----------------|
| Landing Page | None | N/A |
| Core Modules | None | `manageSettings` |
| Applications | None | `manageSettings` |
| Subscriptions | `viewBilling` | `manageBilling` |
| Users & Access | `manageUsers` | `manageUsers` |
| Security | `manageSettings` | `manageSettings` |
| Integrations | `manageIntegrations` | `manageIntegrations` |

---

## Guardrails Checklist

### Visual Locks
- [ ] Lock icon for required apps (Core Modules)
- [ ] Lock icon for required apps (Applications)
- [ ] Lock icon for included subscriptions
- [ ] Lock icon for platform permissions (Users & Access)
- [ ] Lock icon for legacy permissions (Users & Access)

### Confirmation Modals
- [ ] Disable optional app (Core Modules)
- [ ] Enable application (Applications)
- [ ] Disable application (Applications)
- [ ] Upgrade subscription (Subscriptions)
- [ ] Modify user permissions (Users & Access)
- [ ] Modify role permissions (Users & Access)
- [ ] Change password rules (Security)
- [ ] Change session controls (Security)
- [ ] Require 2FA for all (Security)
- [ ] Connect integration (Integrations)
- [ ] Disconnect integration (Integrations)

### Permission Guards
- [ ] All sections check read permissions
- [ ] All write actions check write permissions
- [ ] Fallback UI if no permission

### Validation
- [ ] Cannot toggle required apps
- [ ] Cannot disable included apps
- [ ] Cannot disable during trial
- [ ] Cannot assign access to disabled apps
- [ ] Cannot modify platform permissions
- [ ] Cannot edit legacy permissions
- [ ] Password rules validation (8-20 chars)
- [ ] Session duration validation
- [ ] Cannot connect if app disabled (app-specific integrations)

---

## State Management Patterns

### API State
```typescript
const { data, loading, error } = use[Section]();
```

### Permission State
```typescript
const hasPermission = usePermission('manageSettings');
```

### UI State
```typescript
const [showModal, setShowModal] = useState(false);
const [pendingAction, setPendingAction] = useState(null);
```

---

## Component Props Quick Reference

### StatusBadge
```typescript
<StatusBadge 
  status="enabled" | "disabled" | "trial" | "included" | "not_connected" | "configured"
  label?: string
/>
```

### ScopeBadge
```typescript
<ScopeBadge 
  scope="platform" | { type: "app_specific", apps: string[] }
  apps?: AppDefinition[]
/>
```

### ConfirmationModal
```typescript
<ConfirmationModal
  isOpen={boolean}
  title={string}
  message={string}
  impact={string[]}
  onConfirm={() => void}
  onCancel={() => void}
  confirmLabel?: string
  cancelLabel?: string
/>
```

### PermissionGuard
```typescript
<PermissionGuard 
  permission={string}
  fallback?: ReactNode
>
  {children}
</PermissionGuard>
```

### LockIcon
```typescript
<LockIcon 
  reason?: string
  size?: "sm" | "md" | "lg"
/>
```

---

## Feature Flags

### Flag Names
- `settings.landingPage.enabled`
- `settings.coreModules.enabled`
- `settings.applications.enabled`
- `settings.subscriptions.enabled`
- `settings.usersAccess.enabled`
- `settings.security.enabled`
- `settings.integrations.enabled`

### Usage Pattern
```typescript
{featureFlags.settings.coreModules.enabled && (
  <Route path="/settings/core-modules" element={<CoreModulesListPage />} />
)}
```

---

## Testing Checklist

### Unit Tests
- [ ] Component renders correctly
- [ ] State management works
- [ ] Guardrails enforced
- [ ] Permission checks work
- [ ] Confirmation modals appear

### Integration Tests
- [ ] API calls work
- [ ] Error handling works
- [ ] Permission checks enforced
- [ ] Confirmation flows work

### E2E Tests
- [ ] User can navigate sections
- [ ] User can enable/disable apps
- [ ] User can modify permissions
- [ ] User cannot violate rules
- [ ] Confirmation modals appear

---

## Common Patterns

### List Page Pattern
```typescript
function [Section]ListPage() {
  const { data, loading, error } = use[Section]();
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (data.length === 0) return <EmptyState />;
  
  return (
    <SettingsLayout>
      {data.map(item => (
        <[Section]Card key={item.id} item={item} />
      ))}
    </SettingsLayout>
  );
}
```

### Detail Page Pattern
```typescript
function [Section]DetailPage({ id }) {
  const { data, loading, error } = use[Section](id);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  const handleSave = () => {
    setShowConfirm(true);
  };
  
  const handleConfirm = async () => {
    setSaving(true);
    try {
      await update[Section](id, formData);
      setShowConfirm(false);
      refetch();
    } catch (error) {
      // Handle error
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <SettingsLayout>
      {/* Detail content */}
      <ConfirmationModal
        isOpen={showConfirm}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </SettingsLayout>
  );
}
```

### Permission Guard Pattern
```typescript
<PermissionGuard permission="manageSettings">
  <EnableDisableButton />
</PermissionGuard>
```

### Confirmation Modal Pattern
```typescript
const [showConfirm, setShowConfirm] = useState(false);
const [pendingAction, setPendingAction] = useState(null);

const handleAction = () => {
  setPendingAction({ type: 'disable' });
  setShowConfirm(true);
};

<ConfirmationModal
  isOpen={showConfirm}
  title="Confirm Action?"
  message="You're about to perform this action."
  impact={["Impact 1", "Impact 2"]}
  onConfirm={handleConfirm}
  onCancel={() => setShowConfirm(false)}
/>
```

---

## Implementation Order

1. **Foundation** - Shared components, permission system, API hooks
2. **Core Sections** - Landing page, Core Modules, Applications
3. **Extended Sections** - Subscriptions, Users & Access, Security
4. **Integrations** - Integrations catalog and detail
5. **Polish** - Feature flags, testing, error handling

---

## Key Principles

1. **Registry-Driven** - All data from APIs, no hardcoded lists
2. **Composable** - Small, reusable components
3. **Guardrails** - Visual locks, confirmations, permissions
4. **Incremental** - Feature flags for rollout
5. **Testable** - Unit, integration, E2E tests

---

## Success Criteria

✅ **Can start coding without questions** - Complete specs, patterns, examples  
✅ **Components reusable** - Shared components, consistent patterns  
✅ **Cannot violate rules** - Guardrails, permissions, confirmations

