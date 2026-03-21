# People Module: Using ModuleRecordPage — Plan

## Current state

### People record detail today
- **Route:** `GET /people/:id` → name `person-detail`
- **Component:** `PeopleSurface.vue` (custom surface)
- **Behavior:** Read-only profile with IdentityLayer, ParticipationLayer, MomentumLayer, HistoryLayer. No inline edit; mutations redirect to `PeopleQuickCreateDrawer`.

### ModuleRecordPage and generic path
- **ModuleRecordPage** (`client/src/pages/ModuleRecordPage.vue`):
  - Resolves `moduleKey` from route (meta or path; e.g. `/people/123` → `people`).
  - Uses `getRecordAdapterKey(moduleKey)` from `adapterRegistry.js`:
    - `deals` → `deal` → **DealRecordPage**
    - `tasks` → `task` → **TaskRecordPage**
    - **All others (including `people`)** → `generic` → **GenericRecordContent**
- **GenericRecordContent** is module-agnostic: it takes `moduleKey` and `recordId`, fetches record + module definition + activity + neighbors, and renders:
  - **RecordPageShell** with header (prev/next, edit/copy/delete)
  - **EditableTitle** (with optional save)
  - **RecordStateSection** (“Key fields”) from generic adapter state fields
  - **SectionStack** (sections from generic adapter: Details, Description, Related)
  - **RecordRightPane**: Activity tab, Related tab
  - **CreateRecordDrawer** for edit (opens on Edit)
  - **DeleteConfirmationModal** for delete

### Backend support for people
- **moduleRecordController.js** already includes `people`:
  - `MODEL_BY_KEY.people`, `LIST_HANDLERS.people` → prev/next neighbors
  - Activity/comments use the same unified module-record API (`/modules/:moduleKey/records/:recordId/activity`, etc.).
- **Record CRUD** remains on existing routes: `GET/PUT/DELETE /people/:id` (peopleController).

So the **backend is already aligned** with ModuleRecordPage for people; only the front-end route and component need to change.

---

## Plan: Switch people detail to ModuleRecordPage

### 1. Route change (single source of truth)

**File:** `client/src/router/index.js`

- **Current:**  
  `path: '/people/:id'`, `name: 'person-detail'`, `component: () => import('@/views/PeopleSurface.vue')`
- **New:**  
  Use **ModuleRecordPage** and set **meta.moduleKey** so ModuleRecordPage resolves `moduleKey` correctly (path segment `people` already gives `people`; meta makes it explicit and consistent with deals/tasks/events):

```js
{
  path: '/people/:id',
  name: 'person-detail',
  component: () => import('@/pages/ModuleRecordPage.vue'),
  meta: {
    requiresAuth: true,
    requiresPermission: { module: 'people', action: 'view' },
    moduleKey: 'people'
  }
}
```

- **Redirects** (`/contacts/:id`, `/sales/people/:id` → `person-detail`) stay as-is; they already point to the same route name.

Result: Visiting `/people/:id` (or redirects) will render **ModuleRecordPage** → **GenericRecordContent** for `people` with the same `recordId`.

### 2. No change to adapterRegistry

- `getRecordAdapterKey('people')` already returns `'generic'`. No change needed.

### 3. GenericRecordContent behavior for people

- **recordTitle:** Already supports people: `first_name` + `last_name` → name, else `name` / `title` / `email` / id slice.
- **Data:** Fetches `GET /people/:id`, `GET /modules`, `GET /modules/people/records/:id/activity`, `GET /modules/people/records/:id/neighbors` — all already supported.
- **Sections/state:** `genericRecordAdapter` builds state fields and sections from the **people** module definition (from `/modules`); no code change required for people specifically.
- **Edit:** Opens `CreateRecordDrawer` with `module-key="people"` and current record — already correct.
- **Delete:** Calls `DELETE /people/:id`; ensure people delete goes through **deletionService** (trash) per project rules; peopleController should already do that.

### 4. Optional: title save for people

- **GenericRecordContent** `handleTitleSave` does `PUT /:moduleKey/:recordId` with `{ name: value }`.
- People typically use `first_name` + `last_name`, not a single `name`. Options:
  - **A.** If the people API accepts `name` and maps it to first/last (e.g. split on first space), no client change.
  - **B.** If not: add a small people-specific branch in GenericRecordContent (or in the generic adapter) to send `first_name`/`last_name` when `moduleKey === 'people'` (e.g. split display name into first/last). This can be a follow-up.

Recommendation: Ship the route change first; if title edit for people is important, implement B when needed.

### 5. What we intentionally replace

- **PeopleSurface.vue** will no longer be used for `/people/:id`. Its unique behavior (Identity/Participation/Momentum/History layers) is replaced by the generic record page (header, editable title, key fields, details/description/related sections, activity + related tabs, edit drawer, delete).
- If any of those layers are still required, they can be reintroduced later as **people-specific sections or a people adapter** (e.g. `getRecordAdapterKey('people')` → `'people'` and a small `PeopleRecordPage` or people sections in the generic adapter). For a first step, the plan is to use the generic experience only.

### 6. References to PeopleSurface / person-detail

- **dynamicRoutes.js** has `'person-detail': () => import('@/views/PeopleSurface.vue')`. If your app uses dynamic route definitions that override the static router, update that mapping to use `ModuleRecordPage.vue` (or remove the override so the static route wins). Prefer a single source of truth in `router/index.js` as above.
- **People.vue** navigates with `openTab(\`/people/${contactId}\`, ...)` and list row click → `/people/:id`. No change needed; same URL, new component.

---

## Summary checklist

| Step | Action |
|------|--------|
| 1 | In `router/index.js`, change `/people/:id` component from `PeopleSurface.vue` to `ModuleRecordPage.vue` and add `meta: { ..., moduleKey: 'people' }`. |
| 2 | If using `dynamicRoutes.js` for person-detail, point it to `ModuleRecordPage.vue` or rely on static route only. |
| 3 | (Optional) Implement people-specific title save (first_name/last_name) in GenericRecordContent or adapter if needed. |
| 4 | Manually test: open a person from People list → confirm record page loads (header, key fields, details, activity, related, edit drawer, delete). |

After this, the people module record view is driven by **ModuleRecordPage** like events and other generic modules, with one route change and no backend changes.
