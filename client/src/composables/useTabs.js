import { ref, computed, watch, getCurrentInstance, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  FolderIcon,
  BookOpenIcon,
  ComputerDesktopIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline';

// Tab state management
const tabs = ref([]);
const activeTabId = ref(null);
// Storage key is computed per instance+user to prevent tab leakage across instances/users.
// Design invariant: Persistent UI state must be scoped at the same granularity as access control.
// Tabs are therefore scoped strictly by instanceId + userId.
let storageKey = null;
let storageConfigured = false;
let tabsInitialized = false;

// Flag to track programmatic navigation (to avoid circular loops)
let isProgrammaticNavigation = false;
let lastProgrammaticPath = null;

// Icon mapping for serialization/deserialization
const iconMap = {
  'home': HomeIcon,
  'users': UsersIcon,
  'building': BuildingOfficeIcon,
  'briefcase': BriefcaseIcon,
  'check': CheckCircleIcon,
  'calendar': CalendarIcon,
  'download': ArrowDownTrayIcon,
  'folder': FolderIcon,
  'book': BookOpenIcon,
  'computer': ComputerDesktopIcon,
  'document': DocumentTextIcon
};

// Map emoji icons to icon identifiers
const migrateEmojiToIconId = (emojiIcon) => {
  const emojiToIconIdMap = {
    '🏠': 'home',
    '👥': 'users',
    '👤': 'users', // Contact detail icon
    '🏢': 'building',
    '💼': 'briefcase',
    '✅': 'check',
    '📅': 'calendar',
    '⬇️': 'download',
    '📁': 'folder',
    '📚': 'book',
    '🖥️': 'computer',
    '📄': 'document'
  };
  
  return emojiToIconIdMap[emojiIcon] || 'document';
};

// Convert icon identifier to component
const getIconComponent = (iconId) => {
  return iconMap[iconId] || DocumentTextIcon;
};

// Compute storage key based on instance and user identifiers
const getStorageKey = (instanceId, userId) => {
  if (!instanceId || !userId) {
    // Fail loud: tabs must never initialize without instance + user context.
    throw new Error('[Tabs] Missing instanceId or userId. Tabs storage must never initialize without both.');
  }
  return `litedesk-tabs:${instanceId}:${userId}`;
};

// Allow app bootstrap to configure per-instance, per-user storage scoping (one-time)
export const configureTabsStorage = ({ instanceId, userId }) => {
  if (storageConfigured) {
    console.warn('[Tabs] configureTabsStorage called multiple times; ignoring reconfiguration.', {
      currentKey: storageKey
    });
    return;
  }
  storageKey = getStorageKey(instanceId, userId);
  storageConfigured = true;
};

// Clear in-memory tab state (used on logout/auth reset). Does not touch persisted storage.
export const resetTabsState = () => {
  tabs.value = [];
  activeTabId.value = null;
  isProgrammaticNavigation = false;
  lastProgrammaticPath = null;
};

// Load tabs from localStorage on initialization
const loadTabsFromStorage = () => {
  try {
    if (!storageConfigured || !storageKey) {
      throw new Error('[Tabs] loadTabsFromStorage called before storage was configured.');
    }
    const stored = localStorage.getItem(storageKey);
    console.log('🔄 [loadTabsFromStorage] Loading from storage key:', storageKey, 'stored:', !!stored);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('🔄 [loadTabsFromStorage] Parsed tabs:', parsed.tabs?.length || 0);
      let loadedTabs = parsed.tabs || [];
      let loadedActiveTabId = parsed.activeTabId || null;
      
      // Filter out settings tabs (settings should not be stored as tabs)
      const settingsTabsCount = loadedTabs.filter(tab => tab.path?.startsWith('/settings')).length;
      if (settingsTabsCount > 0) {
        console.log('🔄 [loadTabsFromStorage] Filtering out', settingsTabsCount, 'settings tab(s)');
        loadedTabs = loadedTabs.filter(tab => !tab.path?.startsWith('/settings'));
        
        // If the active tab was a settings tab, clear it
        if (loadedActiveTabId) {
          const activeTab = parsed.tabs?.find(tab => tab.id === loadedActiveTabId);
          if (activeTab && activeTab.path?.startsWith('/settings')) {
            console.log('🔄 [loadTabsFromStorage] Active tab was settings, clearing it');
            loadedActiveTabId = null;
          }
        }
      }
      
      tabs.value = loadedTabs;
      activeTabId.value = loadedActiveTabId;
      
      // Convert icon identifiers back to components
      tabs.value.forEach(tab => {
        if (typeof tab.icon === 'string') {
          // Check if it's an emoji (for migration)
          if (tab.icon.match(/[\u{1F300}-\u{1F9FF}]/u)) {
            console.log('🔄 Migrating emoji icon to icon ID:', tab.icon, 'for tab:', tab.title);
            tab.icon = migrateEmojiToIconId(tab.icon);
          }
          // Convert icon ID to component
          tab.icon = getIconComponent(tab.icon);
        }
        
        // Migrate old dashboard tab to home tab
        if (tab.id === 'dashboard' || tab.path === '/dashboard') {
          console.log('🔄 Migrating dashboard tab to home tab');
          tab.id = 'home';
          tab.path = '/platform/home';
          tab.title = 'Home';
          tab.icon = getIconComponent('home');
          tab.closable = false;
        }
      });
      
      // Update activeTabId if it was 'dashboard'
      if (activeTabId.value === 'dashboard') {
        activeTabId.value = 'home';
      }
      
      // If no tabs, create home tab
      if (tabs.value.length === 0) {
        console.log('🔄 [loadTabsFromStorage] No tabs found, creating home tab');
        createDefaultTab();
        // Immediately save to localStorage
        saveTabsToStorage();
      } else {
        console.log('✅ [loadTabsFromStorage] Loaded', tabs.value.length, 'tabs from storage');
      }
    } else {
      console.log('🔄 [loadTabsFromStorage] No stored tabs, creating home tab');
      createDefaultTab();
      // Immediately save to localStorage
      saveTabsToStorage();
    }
  } catch (e) {
    console.error('❌ [loadTabsFromStorage] Error loading tabs:', e);
    createDefaultTab();
    // Immediately save to localStorage
    saveTabsToStorage();
  }
};

// Convert icon component to identifier
const getIconId = (iconComponent) => {
  for (const [id, component] of Object.entries(iconMap)) {
    if (component === iconComponent) {
      return id;
    }
  }
  return 'document'; // fallback
};

// Save tabs to localStorage
const saveTabsToStorage = () => {
  try {
    if (!storageConfigured || !storageKey) {
      throw new Error('[Tabs] saveTabsToStorage called before storage was configured.');
    }
    // Convert icon components to identifiers for serialization
    const tabsToSave = tabs.value.map(tab => ({
      ...tab,
      icon: typeof tab.icon === 'function' ? getIconId(tab.icon) : tab.icon
    }));
    
    localStorage.setItem(storageKey, JSON.stringify({
      tabs: tabsToSave,
      activeTabId: activeTabId.value
    }));
  } catch (e) {
    console.error('Error saving tabs:', e);
  }
};

// Watch for changes and save
watch([tabs, activeTabId], () => {
  saveTabsToStorage();
}, { deep: true });

// Create default home tab (platform home)
const createDefaultTab = () => {
  // Check if home tab already exists to avoid duplicates
  const existingHomeTab = tabs.value.find(tab => tab.id === 'home' || tab.path === '/platform/home');
  if (existingHomeTab) {
    console.log('🔄 [createDefaultTab] Home tab already exists, updating it');
    existingHomeTab.id = 'home';
    existingHomeTab.path = '/platform/home';
    existingHomeTab.title = 'Home';
    existingHomeTab.icon = getIconComponent('home');
    existingHomeTab.closable = false;
    activeTabId.value = 'home';
    // Force reactive update by reassigning the array
    tabs.value = [...tabs.value];
    return;
  }
  
  const homeTab = {
    id: 'home',
    title: 'Home',
    path: '/platform/home',
    icon: getIconComponent('home'), // Convert to component immediately
    closable: false // Home tab cannot be closed
  };
  
  // Add to tabs array (don't replace, in case other tabs exist)
  if (tabs.value.length === 0) {
    tabs.value = [homeTab];
  } else {
    // Insert at beginning if tabs exist
    tabs.value.unshift(homeTab);
    // Force reactive update by reassigning the array
    tabs.value = [...tabs.value];
  }
  activeTabId.value = 'home';
  
  console.log('✅ [createDefaultTab] Home tab created:', homeTab, 'Total tabs:', tabs.value.length);
  
  // Immediately save to localStorage to ensure it persists
  if (storageConfigured && storageKey) {
    try {
      saveTabsToStorage();
      console.log('✅ [createDefaultTab] Tab saved to localStorage');
    } catch (e) {
      console.error('❌ [createDefaultTab] Error saving to localStorage:', e);
    }
  } else {
    console.warn('⚠️ [createDefaultTab] Storage not configured, cannot save tab');
  }
  
  // Force Vue to recognize the change immediately
  // This ensures TabBar component sees the new tab right away
  nextTick(() => {
    console.log('✅ [createDefaultTab] After nextTick, tabs count:', tabs.value.length);
  });
};

// Generate unique tab ID
const generateTabId = () => {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get icon for route
const getIconForPath = (path) => {
  const icons = {
    '/platform/home': 'home',
    '/contacts': 'users',
    '/people': 'users',
    '/organizations': 'building',
    '/deals': 'briefcase',
    '/tasks': 'check',
    '/events': 'calendar',
    '/calendar': 'calendar', // backward compat
    '/imports': 'download',
    '/items': 'folder',
    '/demo-requests': 'book',
    '/instances': 'computer'
  };
  
  // Check for base path
  const basePath = '/' + path.split('/')[1];
  return icons[basePath] || icons[path] || 'document';
};

// Get title for route
const getTitleForPath = (path, params = {}) => {
  const titles = {
    '/platform/home': 'Home',
    '/contacts': 'Contacts',
    '/organizations': 'Organizations',
    '/deals': 'Deals',
    '/tasks': 'Tasks',
    '/events': 'Events',
    '/calendar': 'Events', // backward compat
    '/imports': 'Imports',
    '/items': 'Projects',
    '/demo-requests': 'Demo Requests',
    '/instances': 'Instances',
    // Audit app routes
    '/audit/dashboard': 'Audit Dashboard',
    '/audit/audits': 'My Audits'
  };
  
  // Check for base path
  const basePath = '/' + path.split('/')[1];
  
  // Special case: Audit app routes (should not use tabs system)
  if (path.startsWith('/audit/')) {
    // Return specific titles for audit routes
    if (path === '/audit/dashboard' || path.startsWith('/audit/dashboard')) {
      return 'Audit Dashboard';
    } else if (path === '/audit/audits' || path.startsWith('/audit/audits')) {
      const segments = path.split('/');
      if (segments.length > 3) {
        // Detail page: /audit/audits/:eventId
        return 'Audit Detail';
      }
      return 'My Audits';
    }
    return 'Audit';
  }
  
  // Special case: Form Response detail view
  // Route shape: /forms/:formId/responses/:responseId
  const segments = path.split('/');
  if (segments[1] === 'forms' && segments[3] === 'responses' && segments[4]) {
    return `(${segments[4]}) Details`;
  }

  // If it's a detail page (has ID), customize title
  // But skip if it's an audit route (handled above)
  if (path.split('/').length > 2 && !path.startsWith('/audit/')) {
    const module = segments[1];
    const id = segments[2];
    
    // Capitalize module name
    const moduleName = module.charAt(0).toUpperCase() + module.slice(1);
    
    // If we have a name in params, use it
    if (params.name) {
      return `${moduleName}: ${params.name}`;
    }
    
    return `${moduleName} Detail`;
  }
  
  return titles[basePath] || titles[path] || 'Page';
};

export function useTabs() {
  // Initialize router/route immediately in setup context
  let router = null;
  let route = null;
  
  // Try to get router immediately when useTabs is called (in setup context)
  try {
    const instance = getCurrentInstance();
    if (instance) {
      router = useRouter();
      route = useRoute();
      console.log('[useTabs] Router initialized successfully');
    }
  } catch (e) {
    // Not in setup context, will try lazily
    console.warn('[useTabs] Not in setup context, router will be lazy-loaded:', e.message);
  }
  
  const getRouter = () => {
    if (!router) {
      try {
        // Try to get router if not already initialized
        const instance = getCurrentInstance();
        if (instance) {
          router = useRouter();
          console.log('[useTabs] Router lazy-loaded successfully');
        } else {
          // Cannot get router without Vue instance context
          console.warn('[useTabs] Cannot get router: No Vue instance available');
            return null;
        }
      } catch (e) {
        console.error('[useTabs] Error getting router:', e);
        return null;
      }
    }
    return router;
  };
  
  // Navigate using router (replace to avoid history entries)
  const navigateToPath = (path) => {
    const currentRouter = getRouter();
    if (currentRouter) {
      // Use replace instead of push to avoid adding history entries
      // This prevents page reloads and keeps navigation smooth
      return currentRouter.replace(path).catch((err) => {
        // Ignore duplicate navigation errors (same route)
        if (err.name !== 'NavigationDuplicated') {
          console.log('⚠️ Navigation error (ignored):', err.message);
        }
      });
    } else {
      // Router should always be available in setup context
      // If not, log error but don't use window.location (causes reload)
      console.error('⚠️ Router not available in navigateToPath, cannot navigate to:', path);
      return Promise.resolve();
    }
  };
  
  const getRoute = () => {
    if (!route) {
      try {
        route = useRoute();
      } catch (e) {
        // Not in setup context, return null
        return null;
      }
    }
    return route;
  };

  // Find tab by ID
  const findTabById = (id) => {
    return tabs.value.find(tab => tab.id === id);
  };

  // Find tab by path (exact match or path without query params)
  const findTabByPath = (path) => {
    // First try exact match
    const exactMatch = tabs.value.find(tab => tab.path === path);
    if (exactMatch) return exactMatch;
    
    // If path has query params, try matching without them
    const pathWithoutQuery = path.split('?')[0];
    return tabs.value.find(tab => {
      const tabPathWithoutQuery = tab.path.split('?')[0];
      return tabPathWithoutQuery === pathWithoutQuery;
    });
  };

  // Sync active tab with current route (for browser navigation ONLY)
  const syncTabWithRoute = (path) => {
    console.log('🔄 syncTabWithRoute called with path:', path);
    
    // Skip on mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      return;
    }
    
    // Skip if path is login, landing, settings, or audit app (no tabs)
    // Audit app has its own layout and doesn't use the CRM tabs system
    if (path === '/login' || path === '/' || path.startsWith('/settings') || path.startsWith('/audit/')) {
      console.log('⏭️ Skipping sync for path:', path);
      return;
    }
    
    // Double-check programmatic navigation flag (safety check)
    if (isProgrammaticNavigation) {
      console.log('🔒 syncTabWithRoute: Programmatic navigation detected, skipping');
      return;
    }
    
    // Find existing tab for this path (with or without query params)
    const existingTab = findTabByPath(path);
    
    if (existingTab) {
      // Tab exists, switch to it ONLY if we're not already on it
      if (activeTabId.value !== existingTab.id) {
        console.log('🔄 Syncing tab for browser navigation:', existingTab.title, 'from', activeTabId.value, 'to', existingTab.id);
        activeTabId.value = existingTab.id;
      } else {
        console.log('✅ Already on correct tab, no sync needed');
      }

      // Keep titles fresh for routes with dynamic IDs (e.g. form response details)
      const newTitle = getTitleForPath(path, existingTab.params || {});
      if (newTitle && existingTab.title !== newTitle) {
        existingTab.title = newTitle;
      }
    } else {
      // Tab doesn't exist, create one
      // This handles cases where user navigates via browser back/forward to a route
      // that doesn't have a tab yet (e.g., direct URL entry, bookmark, etc.)
      console.log('✨ Creating tab for browser navigation:', path);
      // Home tab should not be closable
      const isHome = path === '/platform/home';
      const newTab = {
        id: isHome ? 'home' : generateTabId(),
        title: getTitleForPath(path),
        path: path,
        icon: getIconComponent(getIconForPath(path)),
        closable: !isHome,
        params: {}
      };
      tabs.value.push(newTab);
      activeTabId.value = newTab.id;
    }
  };

  // Initialize tabs (can be called from router guard - no route access)
  const initTabs = () => {
    // Don't initialize tabs on mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      console.log('📱 Mobile detected, skipping tab initialization');
      return;
    }
    if (!storageConfigured || !storageKey) {
      console.error('[Tabs] initTabs called before storage was configured. Tabs will not initialize.');
      return;
    }
    
    console.log('🔄 [initTabs] Starting tab initialization...');
    loadTabsFromStorage();
    
    // Ensure home tab exists immediately after loading (synchronously)
    // This handles the case where tabs are empty or don't have a home tab
    if (tabs.value.length === 0) {
      console.log('🔄 [initTabs] No tabs found after load, creating home tab immediately');
      createDefaultTab();
      console.log('✅ [initTabs] Home tab created, tabs count:', tabs.value.length);
    } else {
      // Check if home tab exists, if not create it
      const homeTab = tabs.value.find(tab => tab.id === 'home' || tab.path === '/platform/home');
      if (!homeTab) {
        console.log('🔄 [initTabs] Home tab missing, creating it');
        createDefaultTab();
        console.log('✅ [initTabs] Home tab created, tabs count:', tabs.value.length);
      } else {
        // Ensure home tab is properly configured
        if (homeTab.path !== '/platform/home' || homeTab.id !== 'home') {
          console.log('🔄 [initTabs] Migrating existing tab to home tab');
          homeTab.id = 'home';
          homeTab.path = '/platform/home';
          homeTab.title = 'Home';
          homeTab.icon = getIconComponent('home');
          homeTab.closable = false;
          // Force reactive update
          tabs.value = [...tabs.value];
          // Save immediately
          if (storageConfigured && storageKey) {
            saveTabsToStorage();
          }
        }
        // Only set home as active if no tab is currently active
        if (!activeTabId.value) {
          activeTabId.value = 'home';
        }
        console.log('✅ [initTabs] Home tab exists and configured, tabs count:', tabs.value.length);
      }
    }
    
    // Mark as initialized
    tabsInitialized = true;
    
    // Log final state for debugging
    console.log('✅ [initTabs] Tab initialization complete:', {
      tabsCount: tabs.value.length,
      tabs: tabs.value.map(t => ({ id: t.id, title: t.title, path: t.path })),
      activeTabId: activeTabId.value,
      tabsInitialized: true
    });
    
    // Note: Route syncing is handled by setupRouteWatcher() in App.vue
  };

  // Setup route watcher (route must be passed from setup context)
  const setupRouteWatcher = (route) => {
    if (!route) {
      console.warn('⚠️ setupRouteWatcher called without route parameter');
      return;
    }
    
    // Skip audit and settings routes - they don't use tabs (have their own layout)
    if (route.path.startsWith('/audit/') || route.path.startsWith('/settings')) {
      console.log('⏭️ Audit/Settings route detected, skipping tab watcher setup');
      return;
    }
    
    // Ensure home tab exists (should have been created in initTabs, but double-check)
    const homeTab = tabs.value.find(tab => tab.id === 'home' || tab.path === '/platform/home');
    if (!homeTab) {
      console.log('🔄 [setupRouteWatcher] Home tab missing, creating it');
      createDefaultTab();
    }
    
    // Sync active tab with current route on initialization
    const currentPath = route.path;
    
    // First, check if we have an active tab from storage - restore it
    // Skip restoration if the active tab is a settings route (settings shouldn't be tabs)
    if (activeTabId.value) {
      const activeTab = tabs.value.find(tab => tab.id === activeTabId.value);
      if (activeTab) {
        // Don't restore settings tabs - they should open in new tabs, not be restored
        if (activeTab.path?.startsWith('/settings')) {
          console.log('⏭️ [setupRouteWatcher] Skipping restoration of settings tab:', activeTab.id);
          activeTabId.value = null;
          // Continue to default navigation below
        } else {
          console.log('🔄 [setupRouteWatcher] Restoring active tab from storage:', activeTab.id, activeTab.path);
          // Navigate to the active tab's path if we're not already there
          if (currentPath !== activeTab.path) {
            const currentRouter = getRouter();
            if (currentRouter) {
              isProgrammaticNavigation = true;
              lastProgrammaticPath = activeTab.path;
              currentRouter.replace(activeTab.path).then(() => {
                setTimeout(() => {
                  isProgrammaticNavigation = false;
                  lastProgrammaticPath = null;
                }, 100);
              }).catch(() => {
                setTimeout(() => {
                  isProgrammaticNavigation = false;
                  lastProgrammaticPath = null;
                }, 100);
              });
            }
          }
          return; // Don't continue with default home navigation
        }
      } else {
        // Active tab ID exists but tab not found - clear it
        console.warn('⚠️ [setupRouteWatcher] Active tab ID not found in tabs, clearing:', activeTabId.value);
        activeTabId.value = null;
      }
    }
    
    // If we're on root, login, or any non-excluded path, navigate to platform home
    if (currentPath === '/' || (currentPath !== '/platform/home' && currentPath !== '/login' && !currentPath.startsWith('/settings') && !currentPath.startsWith('/audit/') && !currentPath.startsWith('/portal/'))) {
      console.log('🔄 [setupRouteWatcher] Navigating to platform home from', currentPath);
      // Navigate to platform home to show it by default (without page refresh)
      const currentRouter = getRouter();
      if (currentRouter) {
        // Ensure home tab exists BEFORE navigation (so it's visible immediately)
        const homeTab = tabs.value.find(tab => tab.id === 'home' || tab.path === '/platform/home');
        if (!homeTab) {
          console.log('🔄 [setupRouteWatcher] Creating home tab before navigation');
          createDefaultTab();
        } else {
          // Only set active if no tab is currently active
          if (!activeTabId.value) {
            activeTabId.value = 'home';
          }
        }
        
        isProgrammaticNavigation = true;
        currentRouter.replace('/platform/home').then(() => {
          // Double-check home tab exists after navigation
          if (!tabs.value.find(tab => tab.id === 'home')) {
            console.log('🔄 [setupRouteWatcher] Home tab missing after navigation, creating it');
            createDefaultTab();
          }
          // Only set active if no tab is currently active
          if (!activeTabId.value) {
            activeTabId.value = 'home';
          }
          setTimeout(() => {
            isProgrammaticNavigation = false;
          }, 100);
        }).catch(() => {
          setTimeout(() => {
            isProgrammaticNavigation = false;
          }, 100);
        });
      }
    } else if (currentPath === '/platform/home') {
      // Already on platform home, ensure home tab exists
      const homeTab = tabs.value.find(tab => tab.id === 'home' || tab.path === '/platform/home');
      if (!homeTab) {
        console.log('🔄 [setupRouteWatcher] On platform home but no home tab, creating it');
        createDefaultTab();
        // Only set active if no other tab is active or if we just created it
        if (!activeTabId.value) {
          activeTabId.value = 'home';
        }
      } else {
        // Only set active to home if no tab is currently active
        // Don't force it if user has another tab open
        if (!activeTabId.value) {
          activeTabId.value = 'home';
        }
      }
    } else {
      // On a different route, sync tabs with route
      // Tabs exist - check if active tab matches current route
      const activeTab = tabs.value.find(tab => tab.id === activeTabId.value);
      if (activeTab && activeTab.path !== route.path) {
        console.log('🔄 Initial sync: active tab path', activeTab.path, 'does not match route', route.path);
        // Check if a tab exists for the current route
        const routeTab = findTabByPath(route.path);
        if (routeTab) {
          // Switch to existing tab for this route
          activeTabId.value = routeTab.id;
        } else {
          // Create a new tab for the current route
          const wasProgrammatic = isProgrammaticNavigation;
          isProgrammaticNavigation = false;
          syncTabWithRoute(route.path);
          isProgrammaticNavigation = wasProgrammatic;
        }
      } else if (!activeTab) {
        console.log('🔄 Initial sync: no active tab found, syncing to route', route.path);
        const wasProgrammatic = isProgrammaticNavigation;
        isProgrammaticNavigation = false;
        syncTabWithRoute(route.path);
        isProgrammaticNavigation = wasProgrammatic;
      } else {
        console.log('✅ Initial sync: active tab matches route, no sync needed');
      }
    }
    
    // Watch for route changes (browser navigation)
    // Only sync tabs when route changes from browser back/forward buttons
    watch(() => route.fullPath, (newFullPath, oldFullPath) => {
      const newPath = route.path; // Path without query
      const oldPath = oldFullPath ? oldFullPath.split('?')[0] : '';
      
      // Skip if paths are the same
      if (newPath === oldPath) {
        return;
      }
      
      // Ensure home tab exists when navigating to platform home
      if (newPath === '/platform/home') {
        const homeTab = tabs.value.find(tab => tab.id === 'home' || tab.path === '/platform/home');
        if (!homeTab) {
          console.log('🔄 [Route watcher] On platform home but no home tab, creating it');
          createDefaultTab();
        } else {
          // Ensure home tab is active
          activeTabId.value = 'home';
        }
      }
      
      // Skip routes that don't use tabs (login, landing, settings, audit app)
      // These routes should be handled by the router, not by tab syncing
      // Audit app has its own layout and doesn't use the CRM tabs system
      if (newPath === '/login' || newPath === '/' || newPath.startsWith('/settings') || newPath.startsWith('/audit/')) {
        console.log('⏭️ Route watcher: skipping tab sync for non-tab route:', newPath);
        return;
      }
      
      console.log('🔍 Route watcher triggered:', {
        oldPath,
        newPath,
        newFullPath,
        isProgrammaticNavigation,
        activeTabId: activeTabId.value,
        lastProgrammaticPath
      });
      
      // Check if this route change matches a programmatic navigation we just did
      // Compare both path and fullPath to catch query parameter changes
      if (isProgrammaticNavigation) {
        console.log('🔒 Programmatic navigation flag is set, skipping route sync');
        return;
      }
      
      // Check if this matches the last programmatic path (with or without query)
      if (lastProgrammaticPath) {
        const lastPathWithoutQuery = lastProgrammaticPath.split('?')[0];
        const newPathWithoutQuery = newPath.split('?')[0];
        if (lastPathWithoutQuery === newPathWithoutQuery || newFullPath === lastProgrammaticPath) {
          console.log('🔒 Programmatic navigation path matches, skipping route sync');
          lastProgrammaticPath = null; // Reset after use
          return;
        }
      }
      
      // Check if active tab already matches this route (with or without query params)
      const currentActiveTab = tabs.value.find(tab => tab.id === activeTabId.value);
      if (currentActiveTab) {
        const currentPathWithoutQuery = currentActiveTab.path.split('?')[0];
        const newPathWithoutQuery = newPath.split('?')[0];
        if (currentPathWithoutQuery === newPathWithoutQuery) {
          console.log('✅ Active tab already matches route, skipping sync');
          return;
        }
      }
      
      // Check if a tab already exists for this route (to prevent duplicates)
      // Check both with and without query params
      const existingTabForRoute = findTabByPath(newFullPath) || findTabByPath(newPath);
      if (existingTabForRoute) {
        console.log('✅ Tab already exists for route, switching to it instead of creating duplicate');
        if (activeTabId.value !== existingTabForRoute.id) {
          activeTabId.value = existingTabForRoute.id;
        }
        return;
      }
      
      // This must be browser navigation (back/forward button)
      console.log('🌐 Browser navigation detected - syncing tabs:', oldPath, '→', newPath);
      syncTabWithRoute(newPath);
    });
  };

  // Get active tab
  const activeTab = computed(() => {
    return tabs.value.find(tab => tab.id === activeTabId.value);
  });

  // Create or focus tab
  const openTab = (path, options = {}) => {
    const isBackground = options.background || false;
    console.log('🔵 openTab called:', path, 'background:', isBackground);
    
    // On mobile (< md breakpoint), just navigate without creating tabs
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      console.log('📱 Mobile detected, navigating without tab creation');
      isProgrammaticNavigation = true;
      navigateToPath(path).then(() => {
        setTimeout(() => {
          isProgrammaticNavigation = false;
        }, 50);
      });
      return null;
    }
    
    // Check if tab already exists
    const existingTab = findTabByPath(path);
    
    if (existingTab) {
      console.log('📍 Tab already exists:', existingTab.id);

      // Update title for dynamic routes if the title is outdated
      const newTitle = options.title || getTitleForPath(path, options.params);
      if (newTitle && existingTab.title !== newTitle) {
        existingTab.title = newTitle;
      }
      
      // If not background mode, focus the tab
      if (!isBackground) {
        activeTabId.value = existingTab.id;
        // Mark as programmatic navigation to prevent route watcher from syncing
        isProgrammaticNavigation = true;
        lastProgrammaticPath = path;
        // Always navigate to ensure the route is loaded
        navigateToPath(path).then(() => {
          setTimeout(() => {
            isProgrammaticNavigation = false;
            lastProgrammaticPath = null;
          }, 300); // Increased timeout to prevent route watcher from creating duplicate tabs
        }).catch(() => {
          setTimeout(() => {
            isProgrammaticNavigation = false;
            lastProgrammaticPath = null;
          }, 300);
        });
      } else {
        console.log('🔕 Background mode: tab exists but not switching to it');
      }
      return existingTab;
    }
    
    // Create new tab
    const newTab = {
      id: options.id || generateTabId(),
      title: options.title || getTitleForPath(path, options.params),
      path: path,
      icon: options.icon ? getIconComponent(options.icon) : getIconComponent(getIconForPath(path)),
      closable: options.closable !== false, // Default to closable
      params: options.params || {}
    };
    
    console.log('✨ Creating new tab:', newTab.id, newTab.title);
    tabs.value.push(newTab);
    
    // Only switch to tab and navigate if NOT background mode
    if (!isBackground) {
      activeTabId.value = newTab.id;
      // Mark as programmatic navigation BEFORE navigating to prevent route watcher from syncing
      isProgrammaticNavigation = true;
      lastProgrammaticPath = path;
      
      // Always navigate to show the new tab content
      navigateToPath(path).then(() => {
        setTimeout(() => {
          isProgrammaticNavigation = false;
          lastProgrammaticPath = null;
        }, 500); // Increased timeout to prevent route watcher from creating duplicate tabs
      }).catch(() => {
        setTimeout(() => {
          isProgrammaticNavigation = false;
          lastProgrammaticPath = null;
        }, 500);
      });
      console.log('✅ openTab complete (foreground), activeTabId:', activeTabId.value);
    } else {
      console.log('✅ openTab complete (background), tab created but not active');
    }
    
    return newTab;
  };

  // Close tab
  const closeTab = async (tabId) => {
    const index = tabs.value.findIndex(tab => tab.id === tabId);
    
    if (index === -1) return;
    
    const tab = tabs.value[index];
    
    // Don't close non-closable tabs
    if (!tab.closable) return;
    
    // Check for beforeClose callback (can be async)
    console.log('🔵 closeTab: Checking beforeClose for tab:', tab.id, 'has callback:', !!tab.beforeClose);
    if (tab.beforeClose && typeof tab.beforeClose === 'function') {
      console.log('🔵 closeTab: Calling beforeClose for tab:', tab.id);
      try {
        const shouldClose = await tab.beforeClose();
        console.log('🔵 closeTab: beforeClose returned:', shouldClose);
        if (shouldClose === false) {
          console.log('🔵 closeTab: beforeClose returned false, not closing');
          return; // Don't close if beforeClose returns false
        }
      } catch (error) {
        console.error('🔵 closeTab: Error in beforeClose:', error);
        // Continue with close even if beforeClose errors
      }
    } else {
      console.log('🔵 closeTab: No beforeClose callback for tab:', tab.id);
    }
    
    // Remove tab
    tabs.value.splice(index, 1);
    
    // If closing active tab, switch to another tab
    if (tabId === activeTabId.value) {
      if (tabs.value.length > 0) {
        // Switch to previous tab, or next tab, or first tab
        const newActiveTab = tabs.value[Math.max(0, index - 1)];
        activeTabId.value = newActiveTab.id;
        // Mark as programmatic navigation
        isProgrammaticNavigation = true;
        lastProgrammaticPath = newActiveTab.path;
        // Always navigate to the new tab
        navigateToPath(newActiveTab.path).then(() => {
          setTimeout(() => {
            isProgrammaticNavigation = false;
            lastProgrammaticPath = null;
          }, 100);
        }).catch(() => {
          setTimeout(() => {
            isProgrammaticNavigation = false;
            lastProgrammaticPath = null;
          }, 100);
        });
      }
    }
  };

  // Close all tabs except one
  const closeOtherTabs = (keepTabId) => {
    tabs.value = tabs.value.filter(tab => 
      tab.id === keepTabId || !tab.closable
    );
    
    if (activeTabId.value !== keepTabId) {
      const keepTab = findTabById(keepTabId);
      if (keepTab) {
        activeTabId.value = keepTabId;
        // Mark as programmatic navigation
        isProgrammaticNavigation = true;
        lastProgrammaticPath = keepTab.path;
        // Always navigate to the kept tab
        navigateToPath(keepTab.path).then(() => {
          setTimeout(() => {
            isProgrammaticNavigation = false;
            lastProgrammaticPath = null;
          }, 100);
        }).catch(() => {
          setTimeout(() => {
            isProgrammaticNavigation = false;
            lastProgrammaticPath = null;
          }, 100);
        });
      }
    }
  };

  // Close all closable tabs
  const closeAllTabs = () => {
    tabs.value = tabs.value.filter(tab => !tab.closable);
    
    // Switch to first non-closable tab (should be home)
    if (tabs.value.length > 0) {
      const firstTab = tabs.value[0];
      activeTabId.value = firstTab.id;
      // Mark as programmatic navigation
      isProgrammaticNavigation = true;
      lastProgrammaticPath = firstTab.path;
      // Always navigate to the first tab
      navigateToPath(firstTab.path).then(() => {
        setTimeout(() => {
          isProgrammaticNavigation = false;
          lastProgrammaticPath = null;
        }, 100);
      }).catch(() => {
        setTimeout(() => {
          isProgrammaticNavigation = false;
          lastProgrammaticPath = null;
        }, 100);
      });
    }
  };

  // Switch to tab
  const switchToTab = (tabId) => {
    console.log('🔄 switchToTab called:', tabId);
    const tab = findTabById(tabId);
    if (tab) {
      console.log('📍 Switching to tab:', tab.title, 'path:', tab.path);
      
      // Mark as programmatic navigation FIRST, before any navigation
      isProgrammaticNavigation = true;
      lastProgrammaticPath = tab.path; // Track this path
      
      // Update active tab ID
      activeTabId.value = tabId;
      
      // Always navigate to ensure the route is loaded
      navigateToPath(tab.path).then(() => {
        console.log('✅ Navigation complete to:', tab.path);
        // Reset flag after navigation completes
        setTimeout(() => {
          isProgrammaticNavigation = false;
          lastProgrammaticPath = null;
        }, 100);
      }).catch((err) => {
        console.log('⚠️ Navigation error (ignored):', err.message);
        // Reset flag even on error
        setTimeout(() => {
          isProgrammaticNavigation = false;
          lastProgrammaticPath = null;
        }, 100);
      });
      console.log('✅ switchToTab complete, activeTabId:', activeTabId.value);
    } else {
      console.error('❌ Tab not found:', tabId);
    }
  };

  // Update tab title
  const updateTabTitle = (tabId, newTitle) => {
    const tab = findTabById(tabId);
    if (tab) {
      tab.title = newTitle;
    }
  };

  // Reorder tabs
  const reorderTabs = (fromIndex, toIndex) => {
    const movedTab = tabs.value.splice(fromIndex, 1)[0];
    tabs.value.splice(toIndex, 0, movedTab);
  };

  // Note: handleNavigation removed as it caused circular loops with router.beforeEach
  // Tab creation is now handled explicitly by click handlers only

  return {
    // State - Return refs directly for better reactivity in templates
    tabs,
    activeTabId,
    activeTab,
    
    // Methods
    initTabs,
    setupRouteWatcher,
    openTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    switchToTab,
    updateTabTitle,
    reorderTabs,
    findTabById,
    findTabByPath
  };
}

