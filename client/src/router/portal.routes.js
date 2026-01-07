import { useAuthStore } from '@/stores/auth';

const portalRoutes = [
  {
    path: '/portal',
    component: () => import('@/layouts/PortalLayout.vue'),
    meta: { requiresAuth: true, requiresPortalApp: true, hideShell: true }, // Hide CRM shell - portal has its own layout
    redirect: '/portal/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'portal-dashboard',
        component: () => import('@/views/portal/PortalDashboard.vue'),
        meta: { requiresAuth: true, requiresPortalApp: true, hideShell: true }
      },
      {
        path: 'audits',
        name: 'portal-audit-list',
        component: () => import('@/views/portal/PortalAuditList.vue'),
        meta: { requiresAuth: true, requiresPortalApp: true, hideShell: true }
      },
      {
        path: 'audits/:eventId',
        name: 'portal-audit-detail',
        component: () => import('@/views/portal/PortalAuditDetail.vue'),
        meta: { requiresAuth: true, requiresPortalApp: true, hideShell: true }
      },
      {
        path: 'actions',
        name: 'portal-actions',
        component: () => import('@/views/portal/PortalActions.vue'),
        meta: { requiresAuth: true, requiresPortalApp: true, hideShell: true }
      },
      {
        path: 'profile',
        name: 'portal-profile',
        component: () => import('@/views/portal/PortalProfile.vue'),
        meta: { requiresAuth: true, requiresPortalApp: true, hideShell: true }
      },
      {
        path: 'settings/notifications',
        name: 'portal-notification-preferences',
        component: () => import('@/views/settings/NotificationPreferences.vue'),
        meta: { requiresAuth: true, requiresPortalApp: true, hideShell: true }
      }
    ]
  }
];

export default portalRoutes;

