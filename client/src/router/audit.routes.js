import { useAuthStore } from '@/stores/auth';

const auditRoutes = [
  {
    path: '/audit',
    component: () => import('@/layouts/AuditLayout.vue'),
    meta: { requiresAuth: true, requiresAuditApp: true, hideShell: true }, // Hide CRM shell - audit has its own layout
    redirect: '/audit/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'audit-dashboard',
        component: () => import('@/views/audit/AuditDashboard.vue'),
        meta: { requiresAuth: true, requiresAuditApp: true, hideShell: true }
      },
      {
        path: 'audits',
        name: 'audit-list',
        component: () => import('@/views/audit/AuditList.vue'),
        meta: { requiresAuth: true, requiresAuditApp: true, hideShell: true }
      },
      {
        path: 'audits/:eventId',
        name: 'audit-detail',
        component: () => import('@/views/audit/AuditDetail.vue'),
        meta: { requiresAuth: true, requiresAuditApp: true, hideShell: true }
      },
      {
        path: 'settings/notifications',
        name: 'audit-notification-preferences',
        component: () => import('@/views/settings/NotificationPreferences.vue'),
        meta: { requiresAuth: true, requiresAuditApp: true, hideShell: true }
      }
    ]
  }
];

export default auditRoutes;

