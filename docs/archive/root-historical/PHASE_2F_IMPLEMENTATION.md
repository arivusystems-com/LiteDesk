# Phase 2F — App Registry UI (Marketplace-Ready) Implementation

**Status:** ✅ COMPLETED  
**Date:** Implementation Complete

---

## Overview

Phase 2F introduces a dedicated App Registry UI that lists all available apps (Sales, Helpdesk, Projects, Audit, Portal, future apps) in a marketplace-style view — without enabling install/uninstall or billing yet.

---

## Implementation Summary

### ✅ Backend Changes (Minimal)

#### 1. AppDefinition Model Enhancement
**File:** `server/models/AppDefinition.js`

Added optional marketplace metadata fields (non-breaking):
```javascript
marketplace: {
  category: String,           // Sales, Operations, Support, Audit, Platform
  comingSoon: Boolean,        // Default: false
  beta: Boolean,              // Default: false
  shortDescription: String,
  docsUrl: String
}
```

#### 2. New Read-Only Endpoint
**File:** `server/controllers/uiCompositionController.js`
**File:** `server/routes/uiCompositionRoutes.js`

Added `GET /api/ui/app-definitions` endpoint:
- Returns all enabled BUSINESS category apps
- Explicitly excludes CONTROL_PLANE (platform-only)
- Read-only, no mutations
- Used for marketplace discovery

---

### ✅ Frontend Implementation

#### 1. AppRegistry Component
**File:** `client/src/views/platform/AppRegistry.vue`

**Features:**
- Marketplace-style card grid layout
- Responsive design (1/2/3 columns)
- App cards display:
  - App icon (emoji or Hero Icon fallback)
  - App name
  - Short description
  - Category badge (Sales, Operations, Support, Audit, Platform)
  - Status badge (Enabled, Available, Coming Soon, Beta)
  - CTA button (Open/View/Coming Soon)

**Status Logic:**
- **Enabled**: App is enabled for tenant → Shows "Open" button
- **Available**: App exists but not enabled → Shows "View" button
- **Coming Soon**: `marketplace.comingSoon === true` → Shows disabled "Coming Soon" button
- **Beta**: `marketplace.beta === true` AND enabled → Shows "Beta" badge

**Navigation:**
- "Open" → Routes to `app.defaultRoute`
- "View" → Opens app detail modal (read-only)
- "Coming Soon" → Disabled, no action

#### 2. App Detail Modal
**File:** `client/src/views/platform/AppRegistry.vue` (included)

**Features:**
- App name, description, icon
- Category and status badges
- Capabilities list (People, Organizations, Transactions, Automation)
- Read-only warning: "Installation coming soon"

**No mutations:**
- No enable/disable buttons
- No billing information
- No install logic

#### 3. Route Configuration
**File:** `client/src/router/index.js`

Added route:
```javascript
{
  path: '/platform/apps',
  name: 'platform-app-registry',
  component: () => import('@/views/platform/AppRegistry.vue'),
  meta: { requiresAuth: true, hideShell: true }
}
```

**Layout:**
- Uses `hideShell: true` meta (no sidebar, no app switcher)
- Same layout pattern as PlatformHome
- Full-width marketplace view

---

## Data Flow

### 1. Enabled Apps
- Source: `GET /api/ui/apps` (via `appShellStore`)
- Filtered: Excludes CONTROL_PLANE
- Contains: App metadata, defaultRoute, icon

### 2. All App Definitions
- Source: `GET /api/ui/app-definitions` (new endpoint)
- Filtered: Only BUSINESS category, excludes CONTROL_PLANE
- Contains: Full AppDefinition metadata including marketplace fields

### 3. Merged View
- Client-side merge of enabled apps + all definitions
- Enabled apps take precedence
- Marketplace metadata merged into enabled apps
- Apps in definitions but not enabled show as "Available"

---

## Security & Filtering Rules

### ✅ Tenant-Safe Filtering

1. **CONTROL_PLANE Exclusion:**
   - Backend: Explicitly excluded in `getAllAppDefinitions`
   - Frontend: Double-checked in `allApps` computed property
   - Never appears in App Registry

2. **Category Filtering:**
   - Only BUSINESS category apps shown
   - SYSTEM category apps (like CONTROL_PLANE) excluded

3. **Tenant Visibility:**
   - Implicit via BUSINESS category filter
   - All returned apps are tenant-visible by design

---

## UX Rules (As Specified)

✅ **No execution buttons**  
✅ **No permissions language**  
✅ **No pricing language**  
✅ **No install flows**  
✅ **No feature gating logic**

**This is discovery only.**

---

## Acceptance Criteria

✅ App Registry page renders for all authenticated users  
✅ Platform-only apps (CONTROL_PLANE) never appear  
✅ Enabled apps show "Open" button  
✅ Disabled but available apps show "View" button  
✅ Coming-soon apps are clearly marked  
✅ Fully metadata-driven  
✅ No backend changes required to business logic  
✅ No breaking changes to Phase 1 or Phase 2  

---

## Explicit Non-Goals (Not Implemented)

❌ Billing  
❌ App installation  
❌ App enable/disable  
❌ Subscription checks  
❌ Marketplace payments  
❌ Automation integration  

---

## Files Modified/Created

### Backend
- `server/models/AppDefinition.js` - Added marketplace fields
- `server/controllers/uiCompositionController.js` - Added `getAllAppDefinitions`
- `server/routes/uiCompositionRoutes.js` - Added `/app-definitions` route

### Frontend
- `client/src/views/platform/AppRegistry.vue` - New component
- `client/src/router/index.js` - Added `/platform/apps` route

---

## Testing Checklist

- [ ] App Registry page loads at `/platform/apps`
- [ ] CONTROL_PLANE never appears
- [ ] Enabled apps show "Open" button
- [ ] Available apps show "View" button
- [ ] Coming-soon apps show disabled "Coming Soon" button
- [ ] Beta apps show "Beta" badge when enabled
- [ ] Category badges display correctly
- [ ] App detail modal opens on "View" click
- [ ] "Open" button navigates to app defaultRoute
- [ ] Responsive grid layout works (mobile/tablet/desktop)
- [ ] No shell/sidebar appears (hideShell: true)

---

## Future Enhancements (Out of Scope)

When implementing Phase 2G+ (Marketplace with Installation):
- Add install/uninstall buttons
- Add billing integration
- Add subscription checks
- Add app configuration flows
- Add marketplace search/filtering

---

## Notes

- All marketplace metadata is optional and non-breaking
- Existing apps without marketplace fields work fine (fallback to defaults)
- Category inferred from appKey if not specified in marketplace.category
- Order determined by AppDefinition.order or ui.sidebarOrder

