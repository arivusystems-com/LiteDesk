/**
 * ============================================================================
 * PLATFORM CORE: App Shell Store (Phase 0D)
 * ============================================================================
 * 
 * This store manages UI composition state:
 * - Available apps for the tenant
 * - Active app context
 * - Sidebar modules
 * - Route definitions
 * 
 * Loads UI metadata once after login and caches it.
 * 
 * See PLATFORM_ARCHITECTURE.md for details.
 * ============================================================================
 */

import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

export const useAppShellStore = defineStore('appShell', {
  state: () => ({
    availableApps: [],
    activeApp: null,
    sidebarModules: [],
    routes: [],
    loading: false,
    error: null,
    lastLoaded: null
  }),

  getters: {
    /**
     * Get modules for the active app
     */
    activeAppModules: (state) => {
      if (!state.activeApp) return [];
      const app = state.availableApps.find(a => a.appKey === state.activeApp);
      return app?.modules || [];
    },

    /**
     * Get sidebar definition for the active app
     */
    sidebarDefinition: (state) => {
      if (!state.activeApp) return { modules: [] };
      const app = state.availableApps.find(a => a.appKey === state.activeApp);
      return {
        app: app,
        modules: app?.modules || []
      };
    },

    /**
     * Check if UI metadata is loaded
     */
    isLoaded: (state) => {
      return state.availableApps.length > 0 && state.lastLoaded !== null;
    }
  },

  actions: {
    /**
     * Load UI metadata from the backend
     */
    async loadUIMetadata() {
      const authStore = useAuthStore();
      
      if (!authStore.isAuthenticated) {
        console.warn('[AppShell] Cannot load UI metadata: user not authenticated');
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        // Load sidebar definition (includes apps and modules)
        const sidebarResponse = await fetch('/api/ui/sidebar', {
          headers: {
            'Authorization': `Bearer ${authStore.user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!sidebarResponse.ok) {
          throw new Error(`Failed to load sidebar: ${sidebarResponse.statusText}`);
        }

        const sidebarData = await sidebarResponse.json();
        
        console.log('[AppShell] Sidebar API response:', {
          success: sidebarData.success,
          hasData: !!sidebarData.data,
          appsCount: sidebarData.data?.apps?.length || 0,
          dataStructure: sidebarData.data ? Object.keys(sidebarData.data) : []
        });
        
        if (sidebarData.success) {
          // Phase 1A: Filter out CONTROL_PLANE - platform-only, never for tenants
          const apps = sidebarData.data?.apps || [];
          this.availableApps = apps.filter(app => {
            const appKeyUpper = app.appKey?.toUpperCase();
            return appKeyUpper !== 'CONTROL_PLANE' && appKeyUpper !== 'CONTROL PLANE';
          });
          
          console.log('[AppShell] Available apps after assignment:', this.availableApps.length);
          
          // Set active app to first app if not set (and not CONTROL_PLANE)
          if (!this.activeApp && this.availableApps.length > 0) {
            this.activeApp = this.availableApps[0].appKey;
            console.log('[AppShell] Set active app:', this.activeApp);
          }

          // Update sidebar modules for active app
          this.updateSidebarModules();
          console.log('[AppShell] Sidebar modules updated:', this.sidebarModules.length);
        } else {
          throw new Error(sidebarData.message || 'Failed to load sidebar');
        }

        // Load route definitions
        const routesResponse = await fetch('/api/ui/routes', {
          headers: {
            'Authorization': `Bearer ${authStore.user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (routesResponse.ok) {
          const routesData = await routesResponse.json();
          if (routesData.success) {
            this.routes = routesData.data || [];
          }
        }

        this.lastLoaded = new Date();
        console.log('[AppShell] ✅ UI metadata loaded successfully:', {
          apps: this.availableApps.length,
          modules: this.sidebarModules.length,
          routes: this.routes.length
        });
      } catch (error) {
        console.error('[AppShell] ❌ Error loading UI metadata:', error);
        console.error('[AppShell] Error details:', {
          message: error.message,
          stack: error.stack,
          authenticated: authStore.isAuthenticated,
          hasToken: !!authStore.user?.token,
          organizationId: authStore.user?.organizationId
        });
        this.error = error.message;
        // Don't throw - return empty arrays on failure
        this.availableApps = [];
        this.routes = [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * Set the active app
     */
    setActiveApp(appKey) {
      const authStore = useAuthStore();
      
      // Phase 1A: Block CONTROL_PLANE - platform-only, never for tenants
      const appKeyUpper = appKey?.toUpperCase();
      if (appKeyUpper === 'CONTROL_PLANE' || appKeyUpper === 'CONTROL PLANE') {
        console.warn(`[AppShell] Attempted to set CONTROL_PLANE as active app - blocked`);
        return;
      }
      
      // Verify user has access to this app
      if (!authStore.hasAppAccess(appKey)) {
        console.warn(`[AppShell] User does not have access to app: ${appKey}`);
        return;
      }

      // Verify app is available for tenant
      const app = this.availableApps.find(a => a.appKey === appKey);
      if (!app) {
        console.warn(`[AppShell] App not available: ${appKey}`);
        return;
      }

      this.activeApp = appKey;
      this.updateSidebarModules();
    },

    /**
     * Update sidebar modules based on active app
     */
    updateSidebarModules() {
      if (!this.activeApp) {
        this.sidebarModules = [];
        return;
      }

      const app = this.availableApps.find(a => a.appKey === this.activeApp);
      if (app) {
        this.sidebarModules = app.modules || [];
      } else {
        this.sidebarModules = [];
      }
    },

    /**
     * Clear UI metadata (on logout)
     */
    clear() {
      this.availableApps = [];
      this.activeApp = null;
      this.sidebarModules = [];
      this.routes = [];
      this.lastLoaded = null;
      this.error = null;
    },

    /**
     * Refresh UI metadata
     */
    async refresh() {
      await this.loadUIMetadata();
    }
  }
});

