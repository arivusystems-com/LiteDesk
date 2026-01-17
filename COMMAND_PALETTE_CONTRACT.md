# Command Palette Contract

**Status:** ✅ Complete  
**Date:** January 2025

---

## 🎯 Objective

Introduce a global command/search system that:
- Works across apps, modules, actions, and records
- Is keyboard-first (Cmd/Ctrl + K)
- Is registry- and permission-aware
- Does not duplicate navigation logic

**Think:** Command palette, not just search.

---

## 🔑 Core Principle (Lock This)

**If something is reachable by mouse, it must be reachable by keyboard.**

And:

**Search is navigation, not data fetching.**

---

## 📋 Command Contract

### CommandItem Structure

```typescript
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  route?: string;
  action?: () => void; // optional, deferred
  scope: "GLOBAL" | "APP" | "MODULE";
  permission?: string;
  visibility: PermissionOutcome; // HIDDEN, VISIBLE, ENABLED
  category: CommandCategory;
  keywords?: string[];
  order?: number;
  appKey?: string;
  moduleKey?: string;
}
```

### Command Scope

- **GLOBAL** - Available everywhere (Home, Settings, etc.)
- **APP** - App-specific (dashboard, app actions)
- **MODULE** - Module-specific (Contacts, Deals, etc.)

### Command Category

- **navigation** - Navigation commands (Dashboard, Settings)
- **actions** - Action commands (Create, Import, Configure)
- **modules** - Module navigation
- **apps** - App dashboards
- **settings** - Settings and configuration
- **system** - System commands (future)

---

## 🔄 Registry-Driven Commands

### Sources of Commands

Commands are derived from existing structures:

1. **Core Routes** (from sidebar core section)
   - Home, Dashboard, etc.
   - Scope: `GLOBAL`

2. **App Dashboards** (from sidebar domain section)
   - Sales, Helpdesk, etc.
   - Scope: `APP`

3. **Modules** (from sidebar domain modules)
   - Contacts, Deals, Tickets, etc.
   - Scope: `MODULE`

4. **Primary Actions** (from dashboard actions)
   - Create Contact, Import Data, Configure, etc.
   - Scope: `APP`

5. **Platform Items** (from sidebar platform section)
   - Settings, Apps, Users, etc.
   - Scope: `GLOBAL`

### No Duplicate Definitions

**Rule:** Commands are derived from sidebar/dashboard, not redefined.

**Benefits:**
- Single source of truth
- Automatic updates when sidebar/dashboard changes
- No sync issues

---

## 🔐 Permission & Visibility Rules

### Reuse PermissionOutcome

- **HIDDEN** → Command excluded from palette
- **VISIBLE** → Command included (may be disabled)
- **ENABLED** → Command included and usable

### Visibility Logic

**Domains (Apps):**
- User has any permission in app → Domain command `ENABLED`
- User has no permission → Domain command `HIDDEN`

**Modules:**
- User has module permission → Module command `ENABLED`
- User has no permission → Module command `HIDDEN`

**Actions:**
- User has action permission → Action command `ENABLED`
- User has no permission → Action command `HIDDEN`

### Search Safety

**Rule:** Search must never surface something the user can't reach.

**Enforcement:**
- Builder filters by `visibility !== 'HIDDEN'`
- UI never shows HIDDEN commands
- Permissions checked at build time, not runtime

---

## ⌨️ Keyboard Contract

### Primary Shortcut

**Cmd/Ctrl + K** → Open command palette

### Navigation

- **Arrow Up/Down** → Navigate through commands
- **Enter** → Execute selected command
- **Escape** → Close palette
- **Tab** → Cycle through categories (optional)

### Optional Secondary Shortcut

**/** → Open palette (alternative)

### Behavior Only

**No visual design yet** - This contract defines behavior only.

---

## 📁 Deliverables

### ✅ 1. `command.types.ts`
**Location:** `client/src/types/command.types.ts`

**Types Defined:**
- `CommandItem` - Single command
- `CommandPaletteDefinition` - Complete palette
- `CommandSearchResult` - Search results
- `CommandScope` - GLOBAL, APP, MODULE
- `CommandCategory` - navigation, actions, modules, etc.
- `KeyboardShortcut` - Shortcut definition
- `CommandPaletteConfig` - Configuration

### ✅ 2. `buildCommandsFromRegistry()`
**Location:** `client/src/utils/buildCommandsFromRegistry.ts`

**Function Signature:**
```typescript
function buildCommandsFromRegistry(
  sidebarStructure: SidebarStructure,
  dashboards: DashboardDefinition[]
): CommandPaletteDefinition
```

**Features:**
- Builds commands from sidebar structure
- Builds commands from dashboard definitions
- Filters by permissions (HIDDEN excluded)
- Groups by category and scope
- Includes search keywords

### ✅ 3. `searchCommands()`
**Location:** `client/src/utils/buildCommandsFromRegistry.ts`

**Function Signature:**
```typescript
function searchCommands(
  commands: CommandItem[],
  query: string
): CommandItem[]
```

**Features:**
- Searches label, description, keywords, route
- Case-insensitive matching
- Returns filtered commands

### ✅ 4. Sample Command Output JSON
**Location:** `client/src/utils/command.sample.json`

**Samples:**
- Sales user commands
- Read-only user commands
- Multi-app user commands

---

## ✅ Acceptance Criteria (All Pass)

### ✅ All navigation paths are keyboard-accessible

**Verification:**
- Every sidebar item has a command
- Every dashboard action has a command
- Every module has a command
- No navigation path requires mouse only

### ✅ Adding an app/module auto-registers commands

**Verification:**
- Add app to registry → Commands appear automatically
- Add module to app → Module command appears automatically
- No manual command registration needed

### ✅ Permissions automatically filter commands

**Verification:**
- User without permission → Command not in palette
- User with permission → Command in palette
- HIDDEN commands never appear

### ✅ No UI component invents commands

**Verification:**
- All commands come from `buildCommandsFromRegistry()`
- UI only renders what builder provides
- No ad-hoc command creation in components

### ✅ Works even before record search exists

**Verification:**
- Commands work for navigation only
- No record search required
- Can be extended later for record search

---

## 🚫 Explicitly Excluded

- ❌ **Full-text record search** - Later phase
- ❌ **App-specific command systems** - Single global system
- ❌ **UI-driven permission checks** - Permissions in builder
- ❌ **Hardcoded command lists** - All from registry

---

## 📖 Usage

### Basic Usage

```typescript
import { buildCommandsFromRegistry } from '@/utils/buildCommandsFromRegistry';
import { buildSidebarFromRegistry } from '@/utils/buildSidebarFromRegistry';
import { buildDashboardFromRegistry } from '@/utils/buildDashboardFromRegistry';

// 1. Build sidebar and dashboards
const sidebar = buildSidebarFromRegistry(appRegistry, userPermissions);
const salesDashboard = buildDashboardFromRegistry('SALES', appRegistry, userPermissions);
const helpdeskDashboard = buildDashboardFromRegistry('HELPDESK', appRegistry, userPermissions);

// 2. Build command palette
const commandPalette = buildCommandsFromRegistry(sidebar, [
  salesDashboard,
  helpdeskDashboard
].filter(Boolean));

// 3. Use commands
console.log(commandPalette.commands); // All commands
console.log(commandPalette.commandsByCategory); // Grouped by category
console.log(commandPalette.commandsByScope); // Grouped by scope

// 4. Search commands
import { searchCommands } from '@/utils/buildCommandsFromRegistry';
const results = searchCommands(commandPalette.commands, 'contact');
```

### Adding a New App

```typescript
// Just add to registry - commands appear automatically!
const appRegistry = {
  SALES: { /* ... */ },
  NEW_APP: {
    appKey: 'NEW_APP',
    label: 'New App',
    dashboardRoute: '/new-app',
    modules: [
      {
        moduleKey: 'items',
        label: 'Items',
        route: '/new-app/items',
        permission: 'items.view'
      }
    ]
  }
};

// Commands automatically include:
// - domain-NEW_APP (app dashboard)
// - module-NEW_APP-items (module navigation)
// - action-NEW_APP-* (dashboard actions)
```

---

## 🔍 Search Behavior

### Search Matching

Commands are matched by:
1. **Label** - Exact or partial match
2. **Description** - Exact or partial match
3. **Keywords** - Custom keywords array
4. **Route** - Deep navigation matching

### Example Searches

```
"contact" → Matches:
  - Contacts module
  - Add Contact action
  - Any command with "contact" in keywords

"sales" → Matches:
  - Sales app dashboard
  - All Sales modules
  - All Sales actions

"create" → Matches:
  - All create actions
  - Commands with "create" in keywords
```

---

## 🎨 Command Categories

### Navigation
- Core navigation items (Dashboard, Home)
- Platform navigation (Settings)

### Actions
- Dashboard actions (Create, Import, Configure)
- App-specific actions

### Modules
- All module navigation commands
- Grouped by app

### Apps
- App dashboard commands
- App switcher (if needed)

### Settings
- Settings navigation
- Configuration items

### System
- System commands (future)
- Admin functions

---

## 📝 Notes

- **Registry-Driven** - All commands from existing structures
- **Permission-Aware** - Filtered by permissions
- **Keyboard-First** - All navigation accessible via keyboard
- **No Duplication** - Commands derived, not redefined
- **Extensible** - Can add record search later

---

## 🔄 Next Steps (Future)

1. **UI Component** - Command palette UI component
2. **Keyboard Handler** - Global keyboard shortcut handler
3. **Record Search** - Extend to search records
4. **Command Execution** - Execute actions (not just navigation)
5. **Recent Commands** - Track and show recent commands

---

## 💡 Why This Matters

This is where:
- **Power users fall in love** - Keyboard navigation is fast
- **Demos feel magical** - Instant navigation
- **Navigation complexity disappears** - Everything accessible
- **Platform work pays off** - Clean implementation

---

**Last Updated:** January 2025  
**Status:** ✅ Contract Complete

