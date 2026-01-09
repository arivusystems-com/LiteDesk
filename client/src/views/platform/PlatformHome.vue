<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useAppShellStore } from '@/stores/appShell';
import apiClient from '@/utils/apiClient';
import {
  BuildingOfficeIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline';

const router = useRouter();
const authStore = useAuthStore();
const appShellStore = useAppShellStore();

const loading = ref(true);
const apps = ref([]);
const instanceStatus = ref(null);
const executionFeedback = ref(null);

// Instance status badge configuration
const instanceStatusConfig = {
  DEMO: { label: 'Demo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  TRIAL: { label: 'Trial', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
};

// Severity badge configuration
const severityConfig = {
  INFO: { icon: InformationCircleIcon, color: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200' },
  WARNING: { icon: ExclamationTriangleIcon, color: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200' },
  ERROR: { icon: XCircleIcon, color: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' }
};

// App icon mapping (for Hero Icons - fallback if app.icon is not provided)
const appIcons = {
  SALES: BuildingOfficeIcon,
  SALES: BuildingOfficeIcon,
  HELPDESK: ShieldCheckIcon,
  PROJECTS: FolderIcon,
  AUDIT: ShieldCheckIcon,
  PORTAL: UserGroupIcon
};

// Determine instance status from organization subscription
const getInstanceStatus = () => {
  const org = authStore.organization;
  if (!org) return null;

  const subscription = org.subscription || {};
  const status = subscription.status || 'trial';
  
  // Map subscription status to instance status
  if (status === 'trial') {
    return {
      status: 'TRIAL',
      message: 'You are currently on a trial subscription.',
      trialEndDate: subscription.trialEndDate
    };
  } else if (status === 'active') {
    return {
      status: 'ACTIVE',
      message: 'Your subscription is active.',
      currentPeriodEnd: subscription.currentPeriodEnd
    };
  } else if (status === 'suspended' || status === 'expired') {
    return {
      status: 'SUSPENDED',
      message: 'Your subscription has been suspended.',
      suspendedAt: subscription.suspendedAt
    };
  }
  
  return {
    status: 'TRIAL',
    message: 'Subscription status unknown.'
  };
};

// Load enabled apps and resolve access
const loadApps = async () => {
  try {
    loading.value = true;
    
    // Load apps from appShell store (uses /api/ui/apps internally)
    if (!appShellStore.isLoaded) {
      await appShellStore.loadUIMetadata();
    }
    
    // Get apps from store (already filtered to exclude CONTROL_PLANE)
    const availableApps = appShellStore.availableApps || [];
    
      // Resolve access for each app using client-side logic
      // Apps from /api/ui/apps are already filtered by access, so they're accessible
      // We infer access mode from user role and app access
      const appsWithAccess = [];
      
      for (const app of availableApps) {
        // Skip CONTROL_PLANE explicitly (should already be filtered, but double-check)
        if (app.appKey?.toUpperCase() === 'CONTROL_PLANE') {
          continue;
        }
        
        // Check if user has access to this app
        const hasAppAccess = authStore.hasAppAccess(app.appKey);
        
        // Determine app status and CTA based on user role and access
        let appStatus = 'locked';
        let ctaLabel = 'Open';
        let ctaDisabled = false;
        let tooltip = null;
        
        if (hasAppAccess) {
          // User has access - determine if ADMIN or EXECUTION
          // Owner typically has ADMIN access (non-billable), others have EXECUTION
          // For platform landing, we'll allow entry and let app middleware handle enforcement
          appStatus = 'available';
          ctaLabel = 'Open';
          ctaDisabled = false;
        } else {
          // User doesn't have access
          appStatus = 'locked';
          ctaLabel = 'Open';
          ctaDisabled = true;
          tooltip = 'You do not have access to this application';
        }
        
        appsWithAccess.push({
          ...app,
          status: appStatus,
          ctaLabel,
          ctaDisabled,
          tooltip
        });
      }
    
    apps.value = appsWithAccess;
    
    // Determine instance status
    instanceStatus.value = getInstanceStatus();
    
    // Check for execution feedback (if execution is blocked)
    // This would come from Phase 0K execution feedback metadata
    // For now, we'll infer from instance status
    if (instanceStatus.value?.status === 'SUSPENDED') {
      executionFeedback.value = {
        severity: 'ERROR',
        message: 'This instance is currently suspended. Please contact support to restore access.',
        title: 'Instance Suspended'
      };
    } else if (instanceStatus.value?.status === 'TRIAL' && instanceStatus.value?.trialEndDate) {
      const trialEnd = new Date(instanceStatus.value.trialEndDate);
      const now = new Date();
      if (trialEnd < now) {
        executionFeedback.value = {
          severity: 'WARNING',
          message: 'Your trial has ended. Please subscribe to continue.',
          title: 'Trial Ended'
        };
      }
    }
    
  } catch (error) {
    console.error('[PlatformHome] Error loading apps:', error);
  } finally {
    loading.value = false;
  }
};

// Handle app click
const handleAppClick = (app) => {
  if (app.ctaDisabled) {
    return; // Do nothing if disabled
  }
  
  // Navigate to app's default route
  // Let existing middleware handle enforcement
  const defaultRoute = app.defaultRoute || getDefaultRouteForApp(app.appKey);
  router.push(defaultRoute);
};

// Get default route for app
const getDefaultRouteForApp = (appKey) => {
  const upperKey = appKey?.toUpperCase();
  switch (upperKey) {
    case 'SALES':
      return '/dashboard';
    case 'SALES':
      return '/sales/people';
    case 'HELPDESK':
      return '/helpdesk/cases';
    case 'PROJECTS':
      return '/projects/projects';
    case 'AUDIT':
      return '/audit/dashboard';
    case 'PORTAL':
      return '/portal/dashboard';
    default:
      return '/dashboard';
  }
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return null;
  }
};

onMounted(() => {
  loadApps();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to LiteDesk
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Select an application to get started
        </p>
      </div>

      <!-- Instance Status Card -->
      <div v-if="instanceStatus" class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span
              :class="[
                'px-3 py-1 rounded-full text-sm font-medium',
                instanceStatusConfig[instanceStatus.status]?.color || instanceStatusConfig.TRIAL.color
              ]"
            >
              {{ instanceStatusConfig[instanceStatus.status]?.label || 'Unknown' }}
            </span>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ instanceStatus.message }}
            </p>
          </div>
          <div v-if="instanceStatus.trialEndDate || instanceStatus.currentPeriodEnd" class="text-sm text-gray-500 dark:text-gray-500">
            <span v-if="instanceStatus.trialEndDate">
              Trial ends {{ formatDate(instanceStatus.trialEndDate) }}
            </span>
            <span v-else-if="instanceStatus.currentPeriodEnd">
              Renews {{ formatDate(instanceStatus.currentPeriodEnd) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Execution Feedback Banner -->
      <div
        v-if="executionFeedback && executionFeedback.severity !== 'NONE'"
        :class="[
          'mb-6 rounded-lg border p-4',
          severityConfig[executionFeedback.severity]?.color || severityConfig.INFO.color
        ]"
      >
        <div class="flex items-start gap-3">
          <component
            :is="severityConfig[executionFeedback.severity]?.icon || InformationCircleIcon"
            class="w-5 h-5 mt-0.5 flex-shrink-0"
          />
          <div class="flex-1">
            <h3 v-if="executionFeedback.title" class="font-medium mb-1">
              {{ executionFeedback.title }}
            </h3>
            <p class="text-sm">
              {{ executionFeedback.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- App Launcher Grid -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="i in 3"
          :key="i"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
        >
          <div class="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
          <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      <div v-else-if="apps.length === 0" class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400">No applications available.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="app in apps"
          :key="app.appKey"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <!-- App Icon -->
          <div class="mb-4">
            <!-- Use emoji icon from metadata if available, otherwise use Hero Icon -->
            <span v-if="app.icon && typeof app.icon === 'string' && !app.icon.startsWith('<')" class="text-5xl">
              {{ app.icon }}
            </span>
            <component
              v-else
              :is="appIcons[app.appKey] || BuildingOfficeIcon"
              class="w-12 h-12 text-indigo-600 dark:text-indigo-400"
            />
          </div>

          <!-- App Name -->
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {{ app.name || app.appKey }}
          </h3>

          <!-- App Description -->
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 min-h-[3rem]">
            {{ app.description || `Access the ${app.name || app.appKey} application` }}
          </p>

          <!-- Status Badge -->
          <div class="mb-4">
            <span
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                app.status === 'available'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : app.status === 'view-only'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              ]"
            >
              {{
                app.status === 'available'
                  ? 'Available'
                  : app.status === 'view-only'
                  ? 'View-only'
                  : 'Locked'
              }}
            </span>
          </div>

          <!-- CTA Button -->
          <button
            :disabled="app.ctaDisabled"
            :title="app.tooltip"
            @click="handleAppClick(app)"
            :class="[
              'w-full px-4 py-2 rounded-md text-sm font-medium transition-colors',
              app.ctaDisabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-indigo-500 dark:hover:bg-indigo-600'
            ]"
          >
            {{ app.ctaLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

