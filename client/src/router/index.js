import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LandingPage from '@/views/LandingPage.vue'
import auditRoutes from './audit.routes'
import portalRoutes from './portal.routes'
import { loadAndRegisterRoutes } from '@/utils/dynamicRouteLoader'
import apiClient from '@/utils/apiClient'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: LandingPage
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue')
  },
  // Phase 1G: Platform Landing (Tenant Home)
  {
    path: '/platform',
    name: 'platform-home',
    component: () => import('@/views/platform/PlatformHome.vue'),
    meta: { requiresAuth: true, hideShell: true }
  },
  // Phase 2F: App Registry (Marketplace-Ready)
  {
    path: '/platform/apps',
    name: 'platform-app-registry',
    component: () => import('@/views/platform/AppRegistry.vue'),
    meta: { requiresAuth: true, hideShell: true }
  },
  {
    path: '/demo',
    name: 'demo',
    component: () => import('@/views/Demo.vue')
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/Settings.vue'),
    meta: { requiresAuth: true, hideShell: true } // render without main nav/topbar
  },
  {
    path: '/settings/notifications',
    name: 'notification-preferences',
    component: () => import('@/views/settings/NotificationPreferences.vue'),
    meta: { requiresAuth: true, hideShell: true }
  },
  {
    path: '/settings/notifications/rules',
    name: 'notification-rules',
    component: () => import('@/views/settings/NotificationRules.vue'),
    meta: { requiresAuth: true, hideShell: true }
  },
  {
    path: '/settings/notifications/health',
    name: 'notification-health',
    component: () => import('@/views/settings/NotificationHealth.vue'),
    meta: { requiresAuth: true, hideShell: true, requiresAdmin: true }
  },
  {
    path: '/demo-requests',
    name: 'demo-requests',
    component: () => import('@/views/DemoRequests.vue'),
    meta: { requiresAuth: true, requiresMasterOrganization: true }
  },
  {
    path: '/instances',
    name: 'instances',
    component: () => import('@/views/InstanceManagement.vue'),
    meta: { requiresAuth: true, requiresMasterOrganization: true }
  },
  // Control Plane routes (Phase 0H)
  {
    path: '/control',
    name: 'control-plane',
    component: () => import('@/views/ControlPlane.vue'),
    meta: { 
      requiresAuth: true, 
      requiresPlatformAdmin: true,
      hideShell: false 
    }
  },
  {
    path: '/control/demo-requests',
    name: 'control-demo-requests',
    component: () => import('@/views/DemoRequests.vue'),
    meta: { 
      requiresAuth: true, 
      requiresPlatformAdmin: true 
    }
  },
  {
    path: '/control/instances',
    name: 'control-instances',
    component: () => import('@/views/InstanceManagement.vue'),
    meta: { 
      requiresAuth: true, 
      requiresPlatformAdmin: true 
    }
  },
  {
    path: '/people',
    name: 'people',
    component: () => import('@/views/People.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'people', action: 'view' } }
  },
  {
    path: '/people/:id',
    name: 'person-detail',
    component: () => import('@/views/PeopleDetail.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'people', action: 'view' } }
  },
  // Backward-compat redirects
  { path: '/contacts', redirect: { name: 'people' } },
  { path: '/contacts/:id', redirect: to => ({ name: 'person-detail', params: { id: to.params.id } }) },
  {
    path: '/deals',
    name: 'deals',
    component: () => import('@/views/Deals.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'deals', action: 'view' } }
  },
  {
    path: '/deals/:id',
    name: 'deal-detail',
    component: () => import('@/views/DealDetail.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'deals', action: 'view' } }
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('@/views/Tasks.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'tasks', action: 'view' } }
  },
  {
    path: '/events',
    name: 'events',
    component: () => import('@/views/Events.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'events', action: 'view' } }
  },
  // Backward-compat redirect
  { path: '/calendar', redirect: { name: 'events' } },
  {
    path: '/events/:id',
    name: 'event-detail',
    component: () => import('@/views/EventDetail.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'events', action: 'view' } }
  },
  {
    path: '/items',
    name: 'items',
    component: () => import('@/views/Items.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'items', action: 'view' } }
  },
  {
    path: '/items/:id',
    name: 'item-detail',
    component: () => import('@/views/ItemDetail.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'items', action: 'view' } }
  },
  {
    path: '/imports',
    name: 'imports',
    component: () => import('@/views/Imports.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'imports', action: 'view' } }
  },
  {
    path: '/imports/:id',
    name: 'import-detail',
    component: () => import('@/views/ImportDetail.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'imports', action: 'view' } }
  },
  {
    path: '/organizations',
    name: 'organizations',
    component: () => import('@/views/Organizations.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'organizations', action: 'view' } }
  },
  {
    path: '/organizations/:id',
    name: 'organization-detail',
    component: () => import('@/views/OrganizationDetail.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'organizations', action: 'view' } }
  },
  {
    path: '/groups',
    name: 'groups',
    component: () => import('@/views/Groups.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/groups/:id',
    name: 'group-detail',
    component: () => import('@/views/GroupDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/forms',
    name: 'forms',
    component: () => import('@/views/Forms.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'view' } }
  },
  {
    path: '/forms/create',
    name: 'form-create',
    component: () => import('@/views/FormCreate.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'create' } }
  },
  {
    path: '/forms/builder',
    name: 'form-builder-new',
    component: () => import('@/views/FormBuilder.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'create' } }
  },
  {
    path: '/forms/builder/:id',
    name: 'form-builder',
    component: () => import('@/views/FormBuilder.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'edit' } }
  },
  {
    path: '/forms/public/:slug',
    name: 'public-form',
    component: () => import('@/views/PublicFormView.vue'),
    meta: { requiresAuth: false, hideShell: true } // Public route - render without app shell (sidebar/tabbar)
  },
  {
    path: '/forms/:id/detail',
    name: 'form-detail',
    component: () => import('@/views/FormDetail.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'view' } }
  },
  {
    path: '/forms/:id/responses',
    name: 'form-responses',
    component: () => import('@/views/FormResponses.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'view' } }
  },
  {
    path: '/forms/:id/responses/:responseId',
    name: 'form-response-detail',
    component: () => import('@/views/FormResponseDetail.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'view' } }
  },
  {
    path: '/forms/:id/fill',
    name: 'form-fill',
    component: () => import('@/views/FormFill.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'create' } }
  },
  {
    path: '/responses',
    name: 'responses',
    component: () => import('@/views/Responses.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'view' } }
  },
  // Phase 0I.2: Response Detail (Read-Only)
  {
    path: '/responses/:id',
    name: 'response-detail',
    component: () => import('@/views/ResponseDetail.vue'),
    meta: { requiresAuth: true, requiresPermission: { module: 'forms', action: 'view' } }
  },
  // Audit App routes
  ...auditRoutes,
  // Portal App routes
  ...portalRoutes
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Helper function to determine the correct dashboard based on user's app access
const getDefaultRoute = (authStore) => {
  if (!authStore.isAuthenticated) {
    return { name: 'landing' };
  }
  
  // Phase 1G: Default to platform landing
  console.log('Default route: platform-home');
  return { name: 'platform-home' };
};

// Add debug logging and permission checks
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  console.log('Navigation guard:', {
    to: to.path,
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user,
    permissions: authStore.user?.permissions,
    allowedApps: authStore.user?.allowedApps
  })

  // Check authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.log('Blocked: Authentication required')
    next({ name: 'landing' })
    return
  }
  
  // Redirect authenticated users from landing page
  if (to.name === 'landing' && authStore.isAuthenticated) {
    console.log('Redirecting: Already authenticated')
    next(getDefaultRoute(authStore))
    return
  }
  
  // Redirect authenticated users from login page (prevents going back to login)
  if (to.name === 'login' && authStore.isAuthenticated) {
    console.log('Redirecting: Already authenticated, cannot access login')
    next(getDefaultRoute(authStore))
    return
  }
  
  // Phase 1G: Platform landing route guard
  // /platform is accessible if:
  // - User is authenticated
  // - Instance is not TERMINATED (check organization status)
  if (to.name === 'platform-home') {
    if (!authStore.isAuthenticated) {
      console.log('Blocked: Authentication required for platform landing')
      next({ name: 'landing' })
      return
    }
    
    // Check if instance is terminated (via organization status)
    const org = authStore.organization;
    if (org && org.subscription?.status === 'terminated') {
      console.log('Blocked: Instance is terminated')
      alert('This instance has been terminated. Please contact support.')
      next({ name: 'landing' })
      return
    }
    
    // Allow access
    next()
    return
  }
  
  // Block audit-only and portal-only users from accessing Sales module routes
  if (to.meta.requiresAuth && !to.meta.requiresAuditApp && !to.meta.requiresPortalApp && to.meta.requiresPermission) {
    // Use hasAppAccess getter which checks enabledApps for owners
    const hasSalesAccess = authStore.hasAppAccess('SALES');
    const hasAuditAccess = authStore.hasAppAccess('AUDIT');
    const hasPortalAccess = authStore.hasAppAccess('PORTAL');
    const hasOnlyAuditAccess = hasAuditAccess && !hasSalesAccess;
    const hasOnlyPortalAccess = hasPortalAccess && !hasSalesAccess && !hasAuditAccess;
    
    // Sales modules that should be blocked for audit-only and portal-only users
    const salesModules = ['people', 'contacts', 'deals', 'tasks', 'events', 'forms', 'items', 'organizations', 'imports'];
    const { module } = to.meta.requiresPermission;
    const normalizedModule = module === 'people' ? 'contacts' : module;
    
    // If user only has AUDIT access, block Sales module routes
    if (hasOnlyAuditAccess && salesModules.includes(normalizedModule)) {
      console.log('Blocked: Sales route accessed by audit-only user', { route: to.path, module })
      alert('You do not have access to Sales features. Redirecting to Audit App.')
      next({ name: 'audit-dashboard' })
      return
    }
    
    // If user only has PORTAL access, block Sales module routes
    if (hasOnlyPortalAccess && salesModules.includes(normalizedModule)) {
      console.log('Blocked: Sales route accessed by portal-only user', { route: to.path, module })
      alert('You do not have access to Sales features. Redirecting to Portal.')
      next({ name: 'portal-dashboard' })
      return
    }
  }
  
  // Also block direct access to Sales dashboard for audit-only and portal-only users
  if (to.name === 'dashboard') {
    // Use hasAppAccess getter which checks enabledApps for owners
    const hasSalesAccess = authStore.hasAppAccess('SALES');
    const hasAuditAccess = authStore.hasAppAccess('AUDIT');
    const hasPortalAccess = authStore.hasAppAccess('PORTAL');
    const hasOnlyAuditAccess = hasAuditAccess && !hasSalesAccess;
    const hasOnlyPortalAccess = hasPortalAccess && !hasSalesAccess && !hasAuditAccess;
    
    if (hasOnlyAuditAccess) {
      console.log('Blocked: Sales dashboard accessed by audit-only user')
      next({ name: 'audit-dashboard' })
      return
    }
    
    if (hasOnlyPortalAccess) {
      console.log('Blocked: Sales dashboard accessed by portal-only user')
      next({ name: 'portal-dashboard' })
      return
    }
  }
  
  // Check if route requires master organization
  if (to.meta.requiresMasterOrganization && !authStore.isMasterOrganization) {
    console.log('Blocked: Master organization required')
    alert('This feature is only available to the application owner.')
    next(getDefaultRoute(authStore))
    return
  }
  
  // Check if route requires platform admin (Phase 0H - Control Plane)
  if (to.meta.requiresPlatformAdmin && !authStore.isPlatformAdmin) {
    console.log('Blocked: Platform admin access required')
    alert('This feature is only available to platform administrators.')
    next(getDefaultRoute(authStore))
    return
  }
  
  // Check if route requires admin (Phase 15)
  if (to.meta.requiresAdmin && !authStore.isAdminLike) {
    console.log('Blocked: Admin access required')
    alert('This feature is only available to administrators.')
    next(getDefaultRoute(authStore))
    return
  }
  
  // Check audit app access if required
  if (to.meta.requiresAuditApp) {
    const hasAuditAccess = authStore.hasAppAccess('AUDIT');
    
    console.log('Audit app access check:', {
      hasAuditAccess,
      allowedApps: authStore.user?.allowedApps,
      isOwner: authStore.isOwner,
      enabledApps: authStore.organization?.enabledApps,
      user: authStore.user,
      route: to.path
    })
    
    if (!hasAuditAccess) {
      console.log('Blocked: AUDIT app access required')
      alert('You do not have access to the Audit App. Please contact your administrator.')
      next(getDefaultRoute(authStore))
      return
    }
  }
  
  // Check portal app access if required
  if (to.meta.requiresPortalApp) {
    const hasPortalAccess = authStore.hasAppAccess('PORTAL');
    
    console.log('Portal app access check:', {
      hasPortalAccess,
      allowedApps: authStore.user?.allowedApps,
      isOwner: authStore.isOwner,
      enabledApps: authStore.organization?.enabledApps,
      user: authStore.user,
      route: to.path
    })
    
    if (!hasPortalAccess) {
      console.log('Blocked: PORTAL app access required')
      alert('You do not have access to the Portal. Please contact your administrator.')
      next(getDefaultRoute(authStore))
      return
    }
  }
  
  // Check permissions if required
  if (to.meta.requiresPermission) {
    const { module, action } = to.meta.requiresPermission
    const hasPermission = authStore.can(module, action)
    
    console.log('Permission check:', {
      module,
      action,
      hasPermission,
      isOwner: authStore.isOwner
    })
    
    if (!hasPermission) {
      console.log('Blocked: Insufficient permissions')
      alert(`You don't have permission to access ${module}. Please contact your administrator.`)
      next(getDefaultRoute(authStore))
      return
    }
  }
  
  // Note: Tab initialization is handled in App.vue onMounted after storage is configured.
  // Do not call initTabs() here as it requires instanceId + userId context.
  
  console.log('Allowed: Normal navigation')
  next()
})

// Phase 1A: Load and register dynamic routes after router is created
// This will be called from App.vue after UI metadata is loaded
export async function initializeDynamicRoutes() {
  const authStore = useAuthStore();
  if (authStore.isAuthenticated) {
    try {
      await loadAndRegisterRoutes(router, apiClient);
    } catch (error) {
      console.error('[Router] Error initializing dynamic routes:', error);
    }
  }
}

export default router